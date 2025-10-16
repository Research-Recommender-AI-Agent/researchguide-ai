"""
BM25 인덱스 및 SBERT 임베딩을 미리 계산해 cache/ 에 저장.
"""
import os, pickle, json, numpy as np, pandas as pd
from pathlib import Path
from pipeline import load_df, compose_dense_text, WeightedBM25, FIELD_WEIGHTS, SBERTBackend  # ← 노트북 함수 복사해 둔 모듈

CACHE = Path("cache"); CACHE.mkdir(exist_ok=True)

def build(name: str, csv_path: str, sbert_path: str):
    df = load_df(csv_path)
    bm25 = WeightedBM25(df, FIELD_WEIGHTS)
    texts = [compose_dense_text(r) for _, r in df.iterrows()]
    sbert = SBERTBackend(sbert_path)
    vecs = sbert.encode(texts)

    with open(CACHE/f"{name}.bm25.pkl","wb") as f: pickle.dump(bm25, f)
    np.save(CACHE/f"{name}.dense.npy", vecs)
    json.dump(texts, open(CACHE/f"{name}.texts.json","w",encoding="utf-8"), ensure_ascii=False)

    print(f"[OK] {name} cached: {len(df)} rows")

if __name__ == "__main__":
    SBERT = os.getenv("SBERT_ID","models/paraphrase-multilingual-MiniLM-L12-v2")
    build("papers",   "papers_clean.prep.csv",   SBERT)
    build("datasets", "datasets_clean_prep.csv", SBERT)
