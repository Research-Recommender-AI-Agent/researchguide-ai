# -*- coding: utf-8 -*-
"""
clarify_utils.py
- 한영 혼합 질의에서도 자연스럽게 작동하도록 설계된 Clarify 모듈
- 주요 기능:
    1. 한국어 질의 자동 감지 및 영어 번역 (ko → en)
    2. 영어 질의 명확화 (Flan-T5 모델 기반)
    3. TF-IDF / SBERT 추천모델 입력과 호환되도록 정제
- 외부 유료 API 없이, Hugging Face의 공개 모델만 사용
"""

import os
import re
import torch
import logging
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# 설정 (모델 경로 및 실행 환경)
# GPU가 있으면 CUDA, 없으면 CPU 사용
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 사용할 사전학습 모델 이름 정의
MODEL_TRANSLATE = "Helsinki-NLP/opus-mt-ko-en"  # 한국어 → 영어 번역기
MODEL_CLARIFY_EN = "google/flan-t5-base"        # 영어 문장 명확화 모델

# 로깅 설정 (INFO 레벨: 주요 이벤트만 출력)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Clarify")


# 언어 감지 함수
def _detect_lang(text: str) -> str:
    """입력된 텍스트가 한국어인지 영어인지 간단히 판별"""
    # 한글 문자(가-힣)가 포함되어 있으면 한국어로 인식
    return "ko" if re.search(r"[가-힣]", text) else "en"


# 질의 정제 (명령어 표현/불필요 단어 제거)
def _clean_query(text: str) -> str:
    """
    불필요한 요청형 표현 제거 및 텍스트 정제
    - 예: '논문 추천해주세요' → '논문'
    - 목적: 모델 입력 시 의미 있는 핵심 단어만 남기기
    """
    # 영어 요청문 패턴 제거
    text = re.sub(
        r"\b(i\s*(want|need|search|looking|am looking)\b.*?\b(for|about)\b)",
        "",
        text,
        flags=re.I,
    )
    # 논문/연구 관련 일반 단어 제거
    text = re.sub(r"\b(research|study|paper|thesis|article|find|recommend)\b", "", text, flags=re.I)
    # 한국어 요청형 표현 제거
    text = re.sub(r"(논문\s*추천|연구\s*해줘|연구\s*관련|찾아줘|주세요|해줘|을\s*위한)", "", text)
    # 공백 정리
    text = re.sub(r"\s+", " ", text).strip()
    return text


# 번역기 (ko → en)
class Translator:
    """한국어 질의를 영어로 변환하는 번역기 클래스"""

    def __init__(self):
        logger.info("Loading translation model (ko→en)...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_TRANSLATE)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_TRANSLATE).to(device)
        logger.info("Translation model loaded.")

    def translate(self, text: str) -> str:
        """입력된 문장을 영어로 번역"""
        # 입력 문장을 토크나이징 및 텐서화
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=256).to(device)
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=128)
        # 번역된 토큰을 문자열로 디코딩
        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return result.strip()


# 영어 Clarify (Flan-T5)
class ClarifierEN:
    """Flan-T5 기반 영어 질의 명확화 모델"""

    def __init__(self):
        logger.info("Loading English Clarify model (Flan-T5-Base)...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_CLARIFY_EN)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_CLARIFY_EN).to(device)
        logger.info("English Clarify model loaded.")

    def clarify(self, text: str) -> str:
        """
        Flan-T5를 이용해 영어 질의를 논문 제목 수준으로 명확화
        - 'AI model research' → 'Deep learning-based medical imaging model evaluation'
        - 명령형 표현/모호한 단어 제거
        """
        # Flan-T5용 프롬프트 설계: '연구 도우미' 역할 지시
        prompt = (
            "You are an academic research assistant. "
            "Rewrite the following query into a concise and professional research topic title. "
            "Remove informal or request-like expressions, and clarify ambiguous words "
            "such as 'model', 'system', or 'analysis' based on context.\n\n"
            f"Query: {text}\n"
            "Clarified research topic:"
        )

        # 입력 인코딩
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
        # 일부 모델에서는 token_type_ids가 필요하지 않아 제거
        if "token_type_ids" in inputs:
            inputs.pop("token_type_ids")

        # 생성 파라미터: 다양성 + 일관성 균형 조정
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

        # 결과 후처리: 불필요한 특수문자/공백 정리
        clarified = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        clarified = re.sub(r"(^[-–: ]+|[.]+$)", "", clarified)
        clarified = re.sub(r"\s+", " ", clarified).strip()
        return clarified or text


# 한영 통합 Clarify Module
class ClarifyModule:
    """
    한국어 → 영어 번역 + 영어 Clarify 단계를 통합 관리
    - 질의 언어 자동 감지
    - 한국어면 번역 후 Clarify 수행
    - 영어면 바로 Clarify 수행
    """

    def __init__(self):
        logger.info(f"Initializing ClarifyModule on device: {device}")
        self.translator = Translator()
        self.clarifier_en = ClarifierEN()

    def clarify(self, query: str) -> str:
        """입력 질의를 정제(clean) → 번역(ko→en) → 명확화(Clarify)"""
        if not query.strip():
            return ""

        # 불필요 표현 제거
        query_clean = _clean_query(query)

        # 언어 감지
        lang = _detect_lang(query_clean)

        # 한국어 → 영어 번역 (필요시)
        if lang == "ko":
            logger.info("Detected Korean query → translating to English before Clarify...")
            query_clean = self.translator.translate(query_clean)
            logger.info(f"Translated Query (ko→en): {query_clean}")

        # Clarify (Flan-T5)
        clarified = self.clarifier_en.clarify(query_clean)
        logger.info(f"Clarified English Output: {clarified}")

        return clarified


# 테스트 실행 (단독 실행 시)
if __name__ == "__main__":
    clarifier = ClarifyModule()

    # 예시 질의 집합 (한국어 + 영어 혼합)
    test_queries = [
        "딥러닝 모델 성능 검증 논문 추천해주세요",
        "AI 기반 의료 데이터 분석 연구",
        "암과 관련된 AI 기반 의료 데이터 연구 관련 논문",
        "자율주행 로봇 제어 관련 논문",
        "Research about semiconductor defect analysis",
    ]

    # 각 질의 Clarify 결과 출력
    for q in test_queries:
        result = clarifier.clarify(q)
        print(f"[Input] {q}\n[Clarified] {result}\n")
