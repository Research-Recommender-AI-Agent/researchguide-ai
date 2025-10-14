READ ME

### 한영 통합 논문/데이터셋 추천 시스템 (LLM + TF-IDF 기반)

### 1. OverView
이 프로젝트는 사용자의 질의(Query)를 자동으로 명확화(Clarify) 한 뒤,

TF-IDF 기반 추천 모델을 통해 가장 관련성 높은 논문/데이터셋을 추천하는 시스템이다.

[주요 특징]
- 한국어 질의도 자동 번역 후 영어로 명확화
- Flan-T5 기반 LLM Clarify 수행
- TF-IDF / SBERT 등 다양한 벡터 모델과 호환 가능

### 2. PipeLine
```text
[사용자 질의]
     ↓
[ClarifyModule]
 ├─ 언어 감지 (Korean / English)
 ├─ 한국어 → 영어 번역 (Opus-MT)
 └─ 영어 Clarify (Flan-T5)
     ↓
[TextRecommender]
 ├─ TF-IDF 기반 벡터화
 └─ 코사인 유사도 계산 및 상위 K개 추천
     ↓
[결과 출력 및 CSV 저장]

```

### 3. Directory Structures

### 4. How to Run


### 5. Clarify Module Details
clarify_utils.py
1. 한국어 → 영어 자동 번역 (Helsinki-NLP/opus-mt-ko-en)
2. 영어 문장 명확화 (google/flan-t5-base)
3. 불필요 요청 표현 제거 및 연구 토픽 형태로 재작성
   
예시:
|index| 입력 질의 | Output |
|------------|------------|------------|
| 1   | 딥러닝 모델 성능 검증 논문을 추천해주세요 | Performance evaluation of deep learning models |
| 2 | AI 기반 의료 데이터 분석 연구 | AI-based analysis of medical data |
