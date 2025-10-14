# Modeling.ipynb — 논문·데이터셋 추천 시스템 README

본 저장소의 `Modeling.ipynb`는 **BM25 → SBERT Dense → Cross‑Encoder**의 다단계 재랭킹 파이프라인으로
사용자 입력(제목·설명)에 맞는 **논문/데이터셋**을 통합 추천합니다.  
추가로, 후보 설명에서 **가장 유사한 한 문장**을 추출하여 추천 사유를 간결히 제공합니다.

---

## 1) 데이터

- 입력 파일
  - `papers_clean.prep.csv` : 논문 코퍼스 (필수)
  - `datasets_clean_prep.csv` : 데이터셋 코퍼스 (필수)
- 컬럼 스키마(권장)
  - **필수**: `title`, `description`, `url`
  - **선택**: `keywords`, `org`, `doi` (BM25 가중치에 반영 가능)
- 출력 파일
  - `추천_통합_다단계.csv` : 최종 Top‑K 추천 결과

> CSV는 UTF‑8 권장, 헤더 반드시 포함. 결측은 빈 문자열로 처리됩니다.

---

## 2) 모델 & 리소스

- **Dense Retriever (SBERT)**: `models/paraphrase-multilingual-MiniLM-L12-v2`
  - 다국어 임베딩, `sentence-transformers`로 로드
- **Re-ranker (Cross‑Encoder, 옵션)**: `models/bge-reranker-v2-m3`
  - 입력 쿼리–문서 쌍에 점수를 부여하는 재랭커
- **BM25**: `rank_bm25` 라이브러리 기반 필드 가중 BM25

> 두 모델은 **로컬 경로**로 사용(사전 다운로드 필요). 경로는 노트북 상단의 설정에서 변경 가능합니다.

---

## 3) 방법론(요약)

1. **입력 정규화**
   - 사용자 입력(제목/설명) → 공백/결측 처리
   - (옵션) ko/en 결합 가중 `W_LANG`로 쿼리 임베딩 합성

2. **1차 검색 — BM25**
   - `lite_tokens`로 가벼운 토큰화 후, 필드 가중(`title>keywords>description`) BM25 점수 계산
   - 상위 `TOPN_BM25` 문서 후보를 생성

3. **2차 재점수 — SBERT Dense**
   - 문서 표현: `title [SEP] keywords_top8 [SEP] description<=300자`
   - SBERT 임베딩과 쿼리 임베딩 내적 → 상위 `M_DENSE` 선별
   - 점수 정규화 후 `s_base = ALPHA*bm25_n + BETA*dense_n` 결합

4. **3차 재랭킹 — Cross‑Encoder (옵션)**
   - 상위 `L_CE`에 한해 CE 점수 산출 → 정규화
   - `final = GAMMA*s_base + (1-GAMMA)*ce_n`로 최종 점수

5. **등급화(Level)**
   - 상위 L 구간의 퍼센타일(p50/p75/p90) 기준으로 `강추/추천/참고/보류` 라벨링

6. **추천 사유(추출형)**
   - 후보 설명을 문장 단위로 분할 → 쿼리와 임베딩 유사도 최대 문장 1개 선택
   - 괄호문구 제거·경량 치환·문장부호 정리 → **100자 이내 한 문장**으로 출력

7. **캐싱**
   - 세션 내 1회만 BM25 인덱스·문서 임베딩을 구축하여 재사용
   - 함수: `_ensure_indexes_and_dense`, `reset_retrieval_cache`

---

## 4) 실행 환경

- Python 3.9+ (권장 3.10~3.11)
- CUDA가속(옵션): NVIDIA GPU + 최신 PyTorch
- 필수 패키지
  ```bash
  pip install -U numpy pandas scikit-learn sentence-transformers rank-bm25
  pip install -U torch  # CUDA 환경에 맞는 버전 선택
  ```
- (옵션) CE 재랭킹을 사용할 경우 동일 환경에서 동작

> 인터넷 접속 없이 사용하려면 `models/` 디렉토리에 SBERT/CE 가중치를 미리 배치하세요.

---

## 5) 사용 방법 (Jupyter)

1. `Modeling.ipynb`를 열고 상단 **설정 섹션**에서 경로/파라미터 확인
   - `PAPERS_CSV`, `DATASETS_CSV`
   - `SBERT_MODEL_NAME_OR_PATH`, `CE_MODEL`
   - 단계별 후보 수: `TOPN_BM25`, `M_DENSE`, `L_CE`, 최종 `K_FINAL`
   - 가중치: `ALPHA`, `BETA`, `GAMMA`
2. 모든 셀을 실행 → 프롬프트에 **제목/설명** 입력
3. 노트북 말미에서 결과 테이블과 `추천_통합_다단계.csv` 생성

---

## 6) 주요 하이퍼파라미터

- 검색 폭: `TOPN_BM25` (기본 200)
- Dense 선택: `M_DENSE` (기본 60)
- CE 대상: `L_CE` (기본 15), `USE_CE=True/False`
- 점수 결합: `ALPHA/BETA/GAMMA`
- 사유 길이: `MAX_REASON_CHARS=100`

> **지연 시간 단축 팁**
> - `USE_CE=False` 또는 `L_CE` 축소
> - `TOPN_BM25`, `M_DENSE` 축소
> - `description`을 300자 내 요약 유지(기본 로직대로)
> - 모델을 GPU에 상주시켜 반복 질의 시 재사용

---

## 7) 산출물(예시 컬럼)

| 구분 | 제목 | 설명 | 점수 | 추천 사유 | Level | URL |
|---|---|---|---|---|---|---|
| thesis/dataset | … | … | 0.9123 | … | 강추 | https://… |

---

## 8) 재현성 & 한계

- 무작위성 거의 없음(CE가 고정이면 결정적).
- 코퍼스 업데이트/모델 버전 변경 시 결과 달라질 수 있음.
- 긴 설명 텍스트는 임베딩/CE 비용 증가 → 상위 K만 요약 권장.

---

## 9) 디렉토리 구조(권장)

```
.
├── Modeling.ipynb
├── papers_clean.prep.csv
├── datasets_clean_prep.csv
├── models/
│   ├── paraphrase-multilingual-MiniLM-L12-v2/
│   └── bge-reranker-v2-m3/
└── 추천_통합_다단계.csv
```

---

