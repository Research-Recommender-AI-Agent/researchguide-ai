# Modeling.ipynb — 논문·데이터셋 추천 시스템 README

본 저장소의 `Modeling.ipynb`는 **BM25 → SBERT Dense → Cross‑Encoder**의 다단계 재랭킹 파이프라인으로
사용자 입력(제목·설명)에 맞는 **논문/데이터셋**을 통합 추천.  
추가로, 후보 설명에서 **가장 유사한 한 문장**을 추출하여 추천 사유를 간결히 제공함.

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

> CSV는 UTF‑8 권장, 헤더 반드시 포함. 결측은 빈 문자열로 처리.

---

## 2) 모델 & 리소스

- **Dense Retriever (SBERT)**: `models/paraphrase-multilingual-MiniLM-L12-v2`
  - 다국어 임베딩, `sentence-transformers`로 로드
- **Re-ranker (Cross‑Encoder, 옵션)**: `models/bge-reranker-v2-m3`
  - 입력 쿼리–문서 쌍에 점수를 부여하는 재랭커
- **BM25**: `rank_bm25` 라이브러리 기반 필드 가중 BM25

> 두 모델은 **로컬 경로**로 사용(사전 다운로드 필요). 경로는 노트북 상단의 설정에서 변경 가능.

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
   - 점수 정규화 후 `s_base = ALPHA*bm25_n + BETA*dense_n` 결합함.

\[
\text{cos\_sim}(q, d) = \frac{q \cdot d}{\|q\|\|d\|} \;\;\xrightarrow{\text{normalize}}\;\; q \cdot d
\]

### 파이프라인 요약
1. **전처리**: (제목 + 설명) 결합 → 불필요 공백/제어문자 정리  
2. **임베딩 백엔드**  
   - 기본: `Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2)`  
   - 대안: TF-IDF(char 2–4그램)  
3. **코퍼스 임베딩 캐싱**: 코퍼스 전체를 한 번 임베딩해 메모리에 보관(속도 최적화)  
4. **질의 임베딩**: 입력 제목/설명을 가중합(예: `w_title=1.0`, `w_desc=2.0`) 후 임베딩  
5. **유사도 계산**: `scores = D @ q` (정규화된 경우) 또는 `cosine_similarity(q, D)`  
6. **Top-K 추출**: 유사도 상위 문서 선택  
7. **추천 사유(선택)**: 후보 설명을 문장 단위로 분할 → 질의와 가장 유사한 문장 1개를 추출 → 경량 패러프레이즈/맞춤법 정돈

### 의사 코드
```python
from sentence_transformers import SentenceTransformer
import numpy as np

# 1) 모델 로드
model = SentenceTransformer("models/paraphrase-multilingual-MiniLM-L12-v2")

# 2) 코퍼스 임베딩 (사전 계산 및 캐시)
corpus_texts = [f"{t} [SEP] {kws} [SEP] {desc[:300]} " for (t, kws, desc) in corpus]  # 예시 포맷
D = model.encode(corpus_texts, normalize_embeddings=True)  # (N, d)

# 3) 질의 임베딩
q_text = f"{title} {desc}".strip()
q = model.encode([q_text], normalize_embeddings=True)      # (1, d)

# 4) 유사도 계산 (정규화 → 내적 == 코사인)
scores = D @ q[0]                                          # (N,)

# 5) 상위 K 추천
K = 5
topk_idx = np.argsort(-scores)[:K]
recommendations = [corpus[i] for i in topk_idx]
```
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

> 인터넷 접속 없이 사용하려면 `models/` 디렉토리에 SBERT/CE 가중치를 미리 배치.

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

<img width="1756" height="624" alt="image" src="https://github.com/user-attachments/assets/48a347ec-0d33-49fa-92a3-1f33a01c37e8" />


## 8) 재현성 & 한계

- 무작위성 거의 없음(CE가 고정이면 결정적).
- 코퍼스 업데이트/모델 버전 변경 시 결과 달라질 수 있음.
- 긴 설명 텍스트는 임베딩/CE 비용 증가 → 상위 K만 요약 권장.

---

## 9) 디렉토리 구조

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

## 10) 검증(Validation)

### 10.1 측정 대상
- **효율**: 총 지연(latency) — *입력 → 최종 CSV 저장*까지의 경과시간  
  - Cold/Warm 분리(캐시/모델 로드 전후)
- **품질**: Top‑K 정밀도/랭킹 품질  
  - Precision@K, nDCG@K(기본 K=5), MRR  
  - 오프라인 수작업 라벨(관련성 0/1/2) 기반

### 10.2 재현 방법(간단 오프라인 평가)
1) 아래 템플릿으로 **골드 라벨** 작성(샘플)
```csv
# gold_labels.csv
query_title,query_desc,doc_title,doc_url,label
"예: 생성형 AI 수업","학습성과 영향 분석","대학 강의에서 생성형 AI 도입의 학습 효과",https://...,2
"예: 코로나 IP 이슈","온라인 소비 전환","Illicit Trade in Fakes under COVID-19",https://...,2
```

2) 노트북을 실행해 `추천_통합_다단계.csv`를 생성한 뒤, 아래 코드를
노트북의 새 셀 또는 별도 파이썬 스크립트로 실행.
```python
import pandas as pd, numpy as np

gold = pd.read_csv("gold_labels.csv")            # label ∈ {0,1,2}
pred = pd.read_csv("추천_통합_다단계.csv")        # 열: 구분,제목,설명,점수,추천 사유,Level,URL

# 질의 단위(제목+설명)로 그룹핑할 수 있도록 키 구성 (상황에 맞게 정제)
gold["qkey"] = gold["query_title"].fillna("") + " || " + gold["query_desc"].fillna("")
pred["dkey"] = pred["제목"].fillna("")           # 간단 매칭: 제목 기준

# Top‑K 후보에 해당 문서가 포함되면 hit, label을 가중치로 사용(2>1>0)
K = 5
pred["rank"] = np.arange(1, len(pred)+1)  # 노트북 출력이 이미 Top‑K면 그대로 사용

# Precision@K
hits = []
for _, row in gold.iterrows():
    g = row["doc_title"]
    in_topk = (pred["제목"].head(K) == g)
    hits.append(1 if in_topk.any() and row["label"]>0 else 0)
p_at_k = np.mean(hits) if hits else 0.0

# nDCG@K (label 0/1/2 사용)
def dcg(labels):
    return np.sum([(lab)/np.log2(i+2) for i,lab in enumerate(labels)])
def ndcg_at_k(gold_rows, pred_titles, K=5):
    rel = [gold_rows.get(t, 0) for t in pred_titles[:K]]
    ideal = sorted(gold_rows.values(), reverse=True)[:K]
    return (dcg(rel) / (dcg(ideal) or 1.0)) if rel else 0.0

# 간단 nDCG@K 계산(질의 1개 시나리오)
gold_map = dict(zip(gold["doc_title"], gold["label"]))
ndcg5 = ndcg_at_k(gold_map, pred["제목"].tolist(), K)

print(f"Precision@{K}: {p_at_k:.3f}")
print(f"nDCG@{K}: {ndcg5:.3f}")
```

> 여러 질의를 한꺼번에 평가하려면 질의 키(`qkey`)별로 Top‑K 추천을 생성하여 매칭/집계를 반복.

### 10.3 성능/정확도 가이드라인(예시 지표 정의)
- **Latency**(warm): SBERT 임베딩 + CE 15쌍 재랭킹 기준 *X*–*Y*초(머신 사양에 따라 다름)  
- **Precision@5 / nDCG@5**: 프로젝트 골 기준(예: P@5 ≥ 0.60, nDCG@5 ≥ 0.70)

### 10.4 어블레이션(권장)
- `USE_CE=False` : CE 제거 시 품질/속도 변화
- `TOPN_BM25, M_DENSE, L_CE` 축소/확대
- `W_LANG`(ko/en 가중) 조정

### 10.5 결과
- nDCG@10 ≈ 0.65: 상위 랭킹 품질이 꽤 괜찮은 편(상위 결과에 관련 문서가 잘 올라옴).

- MRR@10 ≈ 0.47: 평균적으로 첫 관련 문서가 2위쯤에 등장(1위면 1.0, 2위면 0.5이므로). 초반 정밀도가 괜찮음.

- Recall@10 ≈ 0.54: 쿼리당 정답(긍정) 중 절반 조금 넘게 Top-10에 포착.

## 오프라인 검증 결과

| 모델                 | nDCG@10 | MRR@10 | Recall@10 |
|----------------------|:-------:|:------:|:---------:|
| BM25                 | 0.477   | 0.403  | 0.245     |
| Dense                | 0.421   | 0.313  | 0.208     |
| BM25+Dense           | 0.599   | 0.524  | 0.410     |
| Recall++(Union)      | 0.525   | 0.421  | 0.338     |
| BM25+Dense+CE(최종)  | 0.649   | 0.473  | 0.538     |

- 부연 설명 : CE를 넣으면 Recall이 많이 오르고 nDCG도 상승. MRR이 다소 내려간 건, CE가 “첫 관련 문서의 위치”를 항상 더 위로 올려주진 않기 때문(대신 Top-10 안에 관련 문서를 많이 넣어줌).

---

## 11) 문제 해결
- **속도**: 캐시가 없으면 최초 로드가 느릴 수 있음 → 동일 세션에서 반복 실행 권장  
- **메모리**: 대형 코퍼스는 SBERT 임베딩 메모리 사용량이 큼 → 배치 인코딩/절단  
- **오류**: 로컬 모델 경로 불일치/누락 확인, CPU‑only 환경에서 CE를 꺼서 시간 절약
- **LLM prompting 대신 추출적 근거를 사용하여 추천 사유 생성**
   - Multi-Agent를 사용할 목적이었으나 모델을 3개나 사용하기 때문에 응답시간 길어지고(성능을 올릴려면 불가피) 중저사양 H/W에서는 힘들 것으로 판단함	
- 쿼리와 문서(제목·설명)를 문장 단위로 쪼개서 Cross-Encoder(지금 쓰는 BGE reranker)로 쿼리–문장 점수를 계산 → 상위 1–2개 문장을 근거로 뽑아 자연어 문장으로 조립했음.

---

