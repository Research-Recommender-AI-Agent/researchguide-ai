# -*- coding: utf-8 -*-
"""
recommend_model.py (개선형)
- 기존 Modeling.ipynb 구조를 유지하면서 LLM 기반 요약 및 논리적 추천 근거(reason) 추가
"""

from __future__ import annotations
from typing import Optional, Tuple, List, Dict

import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import hstack, csr_matrix

# SBERT는 선택적 의존성
_HAS_SBERT = True
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    _HAS_SBERT = False

# LLM 요약기
from transformers import pipeline


# =========================
# Backend Base
# =========================
class _BaseBackend:
    def fit(self, titles: List[str], descs: List[str]):
        raise NotImplementedError

    def encode_query(self, query: str):
        raise NotImplementedError

    def corpus_matrix(self):
        raise NotImplementedError

    def kind(self) -> str:
        raise NotImplementedError


# =========================
# TF-IDF Backend (char n-gram)
# =========================
class TFIDFBackend(_BaseBackend):
    def __init__(
        self,
        ngram_range: Tuple[int, int] = (2, 4),
        analyzer: str = "char",
        w_title: float = 0.6,
        w_desc: float = 0.4,
        max_features_title: Optional[int] = None,
        max_features_desc: Optional[int] = None,
        dtype=np.float32,
    ):
        self.ngram_range = ngram_range
        self.analyzer = analyzer
        self.w_title = float(w_title)
        self.w_desc = float(w_desc)
        self.max_features_title = max_features_title
        self.max_features_desc = max_features_desc
        self.dtype = dtype
        self._vec_title = None
        self._vec_desc = None
        self._X_corpus = None

    def fit(self, titles: List[str], descs: List[str]):
        self._vec_title = TfidfVectorizer(
            analyzer=self.analyzer, ngram_range=self.ngram_range, max_features=self.max_features_title, dtype=self.dtype
        )
        self._vec_desc = TfidfVectorizer(
            analyzer=self.analyzer, ngram_range=self.ngram_range, max_features=self.max_features_desc, dtype=self.dtype
        )
        X_t = self._vec_title.fit_transform(titles)
        X_d = self._vec_desc.fit_transform(descs)
        self._X_corpus = hstack([self.w_title * X_t, self.w_desc * X_d], format="csr", dtype=self.dtype)
        return self

    def encode_query(self, query: str):
        q_t = self._vec_title.transform([query])
        q_d = self._vec_desc.transform([query])
        return hstack([self.w_title * q_t, self.w_desc * q_d], format="csr", dtype=self.dtype)

    def corpus_matrix(self):
        return self._X_corpus

    def kind(self) -> str:
        return "tfidf"

    def explain_top_ngrams(self, query_vec: csr_matrix, doc_vec: csr_matrix, topn: int = 5) -> List[str]:
        prod = query_vec.multiply(doc_vec)
        if prod.nnz == 0:
            return []
        idxs = prod.indices
        data = prod.data
        topk_idx = np.argsort(data)[::-1][:topn]
        selected = idxs[topk_idx]
        names_title = np.array(sorted(self._vec_title.vocabulary_, key=self._vec_title.vocabulary_.get))
        names_desc = np.array(sorted(self._vec_desc.vocabulary_, key=self._vec_desc.vocabulary_.get))
        boundary = names_title.shape[0]
        result = []
        for feat_idx in selected:
            token = names_title[feat_idx] if feat_idx < boundary else names_desc[feat_idx - boundary]
            result.append(token)
        return result


# =========================
# SBERT Backend
# =========================
class SBERTBackend(_BaseBackend):
    def __init__(self, model_name="sentence-transformers/all-MiniLM-L6-v2", normalize=True, dtype=np.float32):
        if not _HAS_SBERT:
            raise ImportError("sentence-transformers 미설치. pip install sentence-transformers")
        self.model_name = model_name
        self.normalize = normalize
        self.dtype = dtype
        self._model = None
        self._X_corpus = None

    def _ensure_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)

    def fit(self, titles: List[str], descs: List[str]):
        self._ensure_model()
        texts = [f"{t}. {d}".strip() for t, d in zip(titles, descs)]
        emb = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=self.normalize).astype(self.dtype)
        self._X_corpus = emb
        return self

    def encode_query(self, query: str):
        self._ensure_model()
        q = self._model.encode([query], convert_to_numpy=True, normalize_embeddings=self.normalize).astype(self.dtype)
        return q

    def corpus_matrix(self):
        return self._X_corpus

    def kind(self) -> str:
        return "sbert"


# =========================
# Main Recommender
# =========================
class TextRecommender:
    def __init__(
        self,
        df: pd.DataFrame,
        title_col: str = "title",
        desc_col: str = "description",
        url_col: Optional[str] = "url",
        backend: str = "tfidf",
        ngram_range=(2, 4),
        analyzer="char",
        w_title=0.6,
        w_desc=0.4,
        max_features_title=None,
        max_features_desc=None,
        sbert_model_name="sentence-transformers/all-MiniLM-L6-v2",
        hybrid_alpha=0.5,
    ):
        self.df = df.reset_index(drop=True).copy()
        self.title_col = title_col
        self.desc_col = desc_col
        self.url_col = url_col if url_col in df.columns else None
        self.backend = backend.lower()
        assert self.backend in {"tfidf", "sbert", "hybrid"}

        # 백엔드 설정
        self._tfidf = None
        self._sbert = None
        self._X_tfidf = None
        self._X_sbert = None
        self.ngram_range = ngram_range
        self.analyzer = analyzer
        self.w_title = w_title
        self.w_desc = w_desc
        self.hybrid_alpha = float(hybrid_alpha)
        self.sbert_model_name = sbert_model_name

        # LLM summarizer 추가
        print("[INFO] LLM 요약 모델 로드 중...")
        self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        print("[INFO] LLM 요약 모델 로드 완료")

    # -----------------------
    def fit(self):
        titles = self.df[self.title_col].fillna("").tolist()
        descs = self.df[self.desc_col].fillna("").tolist()

        if self.backend in {"tfidf", "hybrid"}:
            self._tfidf = TFIDFBackend(
                ngram_range=self.ngram_range, analyzer=self.analyzer, w_title=self.w_title, w_desc=self.w_desc
            ).fit(titles, descs)
            self._X_tfidf = self._tfidf.corpus_matrix()

        if self.backend in {"sbert", "hybrid"}:
            self._sbert = SBERTBackend(model_name=self.sbert_model_name).fit(titles, descs)
            self._X_sbert = self._sbert.corpus_matrix()
        return self

    # -----------------------
    def _cosine_sparse_dense(self, q_sparse, X_sparse):
        return cosine_similarity(q_sparse, X_sparse).ravel()

    def _cosine_dense_dense(self, q_dense, X_dense):
        return (q_dense @ X_dense.T).ravel()

    # -----------------------
    def _summarize_llm(self, text: str) -> str:
        """LLM을 이용한 추상적 요약"""
        try:
            summary = self.summarizer(text, max_length=60, min_length=15, do_sample=False)[0]["summary_text"]
            return summary.strip()
        except Exception:
            return text[:150] + "..."

    # -----------------------
    def recommend(self, query: str, topk: int = 5) -> pd.DataFrame:
        query = str(query or "").strip()
        if not query:
            raise ValueError("빈 질의입니다.")

        sims_tfidf = sims_sbert = None
        if self._tfidf is not None:
            sims_tfidf = self._cosine_sparse_dense(self._tfidf.encode_query(query), self._X_tfidf)
        if self._sbert is not None:
            sims_sbert = self._cosine_dense_dense(self._sbert.encode_query(query), self._X_sbert)

        # 결합
        if self.backend == "tfidf":
            sims = sims_tfidf
        elif self.backend == "sbert":
            sims = sims_sbert
        else:
            a = self.hybrid_alpha
            sims = a * sims_tfidf + (1 - a) * sims_sbert

        sims = np.clip(sims, 0.0, 1.0)
        order = np.argsort(sims)[::-1][:topk]
        p60, p90 = np.percentile(sims, [60, 90])

        results = []
        for rank, idx in enumerate(order, 1):
            title = self.df.at[idx, self.title_col]
            desc = self.df.at[idx, self.desc_col]
            url = self.df.at[idx, self.url_col] if self.url_col else ""
            score = round(float(sims[idx]), 4)

            # LLM 요약 생성
            summary = self._summarize_llm(desc)

            # 공통 키워드 추출 (TF-IDF 기반)
            shared_terms = []
            if self._tfidf is not None:
                q_vec = self._tfidf.encode_query(query)
                doc_vec = self._X_tfidf[idx]
                shared_terms = self._tfidf.explain_top_ngrams(q_vec, doc_vec, topn=3)

            shared_str = ", ".join(shared_terms) if shared_terms else "핵심 개념"

            # LLM + 논리형 reason
            reason = (
                f"이 논문은 {summary}을(를) 중심으로 논의하며, "
                f"질의에서 제시된 ‘{shared_str}’과(와) 높은 관련성을 가집니다. "
                f"특히 본 연구는 사용자가 제시한 ‘{query}’에 대한 실증적·방법론적 통찰을 제공하여 "
                f"해당 주제의 이해와 문제 해결에 기여할 수 있습니다."
            )

            level = "강력추천" if score >= p90 else "추천" if score >= p60 else "관심"

            results.append(
                {"rank": rank, "title": title, "description": desc, "url": url, "score": score, "reason": reason, "level": level}
            )

        return pd.DataFrame(results)
