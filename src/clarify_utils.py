# -*- coding: utf-8 -*-
"""
clarify_utils.py
----------------
Clarify Module (Korean + English unified)
- 한국어 질의 자동 번역 (ko→en)
- 영어 Clarify (Flan-T5)
- TF-IDF/SBERT 추천모델 호환
- 외부 API 미사용, 오픈 모델만 사용
"""

import os
import re
import torch
import logging
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# ------------------------------------------------------------
# 설정
# ------------------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_TRANSLATE = "Helsinki-NLP/opus-mt-ko-en"
MODEL_CLARIFY_EN = "google/flan-t5-base"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Clarify")


# ------------------------------------------------------------
# 언어 감지
# ------------------------------------------------------------
def _detect_lang(text: str) -> str:
    """간단한 한글 포함 여부 기반 언어 감지"""
    return "ko" if re.search(r"[가-힣]", text) else "en"


# ------------------------------------------------------------
# 요청형 표현 및 불필요 단어 제거
# ------------------------------------------------------------
def _clean_query(text: str) -> str:
    """불필요한 요청/명령 표현 제거"""
    text = re.sub(
        r"\b(i\s*(want|need|search|looking|am looking)\b.*?\b(for|about)\b)",
        "",
        text,
        flags=re.I,
    )
    text = re.sub(r"\b(research|study|paper|thesis|article|find|recommend)\b", "", text, flags=re.I)
    text = re.sub(r"(논문\s*추천|연구\s*해줘|연구\s*관련|찾아줘|주세요|해줘|을\s*위한)", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ------------------------------------------------------------
# 번역기 (ko → en)
# ------------------------------------------------------------
class Translator:
    def __init__(self):
        logger.info("Loading translation model (ko→en)...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_TRANSLATE)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_TRANSLATE).to(device)
        logger.info("Translation model loaded.")

    def translate(self, text: str) -> str:
        """한국어 → 영어 번역"""
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=256).to(device)
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=128)
        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return result.strip()


# ------------------------------------------------------------
# Clarify (English)
# ------------------------------------------------------------
class ClarifierEN:
    def __init__(self):
        logger.info("Loading English Clarify model (Flan-T5-Base)...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_CLARIFY_EN)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_CLARIFY_EN).to(device)
        logger.info("English Clarify model loaded.")

    def clarify(self, text: str) -> str:
        """Flan-T5 기반 Clarify"""
        prompt = (
            "You are an academic research assistant. "
            "Rewrite the following query into a concise and professional research topic title. "
            "Remove informal or request-like expressions, and clarify ambiguous words "
            "such as 'model', 'system', or 'analysis' based on context.\n\n"
            f"Query: {text}\n"
            "Clarified research topic:"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
        if "token_type_ids" in inputs:
            inputs.pop("token_type_ids")

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=80,
                temperature=0.7,
                top_p=0.9,
                num_beams=3,
                do_sample=True,
                repetition_penalty=1.5,
                early_stopping=True,
            )

        clarified = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        clarified = re.sub(r"(^[-–: ]+|[.]+$)", "", clarified)
        clarified = re.sub(r"\s+", " ", clarified).strip()
        return clarified or text


# ------------------------------------------------------------
# 통합 Clarify Module
# ------------------------------------------------------------
class ClarifyModule:
    """한영 통합 Clarify 모듈"""

    def __init__(self):
        logger.info(f"Initializing ClarifyModule on device: {device}")
        self.translator = Translator()
        self.clarifier_en = ClarifierEN()

    def clarify(self, query: str) -> str:
        """입력 질의를 정제 및 명확화"""
        if not query.strip():
            return ""

        query_clean = _clean_query(query)
        lang = _detect_lang(query_clean)

        # --- 번역 (한국어 → 영어) ---
        if lang == "ko":
            logger.info("Detected Korean query → translating to English before Clarify...")
            query_clean = self.translator.translate(query_clean)
            logger.info(f"Translated Query (ko→en): {query_clean}")

        # --- 영어 Clarify 수행 ---
        clarified = self.clarifier_en.clarify(query_clean)
        logger.info(f"Clarified English Output: {clarified}")

        return clarified


# ------------------------------------------------------------
# 테스트
# ------------------------------------------------------------
if __name__ == "__main__":
    clarifier = ClarifyModule()
    test_queries = [
        "딥러닝 모델 성능 검증 논문 추천해주세요",
        "AI 기반 의료 데이터 분석 연구",
        "암과 관련된 AI 기반 의료 데이터 연구 관련 논문",
        "자율주행 로봇 제어 관련 논문",
        "Research about semiconductor defect analysis",
    ]

    for q in test_queries:
        result = clarifier.clarify(q)
        print(f"[Input] {q}\n[Clarified] {result}\n")
