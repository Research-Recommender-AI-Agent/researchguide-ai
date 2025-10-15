# Clarify Module
본 모듈(`clarify_utils.py`)은 사용자의 **자연어 질의(Query)**를 자동으로 감지·번역·명확화하여 추천 모델(`TextRecommender`)에 전달하는 **전처리 LLM 파이프라인**입니다.


## 1. 개요 (Overview)

Clarify 모듈은 다음 과정을 자동으로 수행합니다.
1. **언어 감지 (Language Detection)** — 입력이 한국어인지 영어인지 판별
2. **자동 번역 (Translation)** — 한국어라면 영어로 변환 (**Helsinki-NLP/opus-mt-ko-en**)
3. **문장 명확화 (Clarification)** — 영어 질의를 **Flan-T5**로 학술적·간결한 형태로 재작성
4. **텍스트 정제 (Post-processing)** — 요청형 문구 제거, 공백·괄호·구두점 정리

## 2. 실행 방법 (How to Run)
1. **Jupyter / VS Code**에서 `clarify_utils.py` 열기
2. 터미널 또는 노트북 셀에서 실행

```bash
python clarify_utils.py
```
실행하면 콘솔 입력창이 표시됩니다.
- 한국어 입력 시: 자동 번역 후 명확화
- 영어 입력 시: 바로 명확화

## 3. Examples
| 입력 질의 | Clarify 결과 |
|------------|--------------|
| 딥러닝 모델 성능 검증 논문을 추천해주세요 | Performance evaluation of deep learning models |
| AI 기반 의료 데이터 분석 연구 | AI-based analysis of medical data |
| 최신 LLM 파인튜닝 방법론 | Recent fine-tuning methods for large language models |

## 4. Pipeline
```text
[User Query]
     ↓
[Language Detector]
 ├─ Korean → [Opus-MT Translator] → English
 └─ English → 그대로 진행
     ↓
[Clarifier (Flan-T5)]
 ├─ 연구/논문 제목에 적합한 형태로 재작성
 └─ 요청 문구 및 불필요 구 제거
     ↓
[Cleaner]
 ├─ 괄호, 불필요 기호 제거
 └─ 텍스트 정돈 후 반환
```

## 5. 실행 환경

| 구성 | 버전 / 모델 |
|------|---------------|
| **Python** | 3.9 이상 (권장 3.10+) |
| **Transformers** | 4.41.2 |
| **Torch** | 2.3.1+ |
| **Model 1** | `Helsinki-NLP/opus-mt-ko-en` |
| **Model 2** | `google/flan-t5-base` |
| **GPU (선택)** | CUDA 11.8 이상 |
