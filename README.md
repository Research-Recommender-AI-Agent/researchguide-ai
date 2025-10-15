# 한영 통합 논문/데이터셋 추천 시스템 (LLM + TF-IDF 기반)


# 1. OverView
이 프로젝트는 사용자의 질의(Query)를 자동으로 명확화(Clarify) 한 뒤,
TF-IDF 기반 추천 모델을 통해 가장 관련성 높은 논문/데이터셋을 추천하는 시스템이다. <br>
✅ 웹에서 별도의 설치 없이 이용할 수 있습니다. [knowledgeodyssey.lovable.app](https://knowledgeodyssey.lovable.app/) <br>

[주요 기능]
- 한·영 자동 질의 인식 및 번역 (Opus-MT)
- Flan-T5 기반 질의 명확화 (Clarify)
- BM25/SVERT/Cross-Encoder 기반 다단계 추천 <br>

# 2. 데이터 및 모델
## 데이터 구성 <br>
| 데이터셋 | 내용 | 비고 |
|-----------|------|------|
| `dataon_clean.jsonl` | Dataon 연구 메타데이터 (논문·데이터셋 통합) | 전체 1차 원본 |
| `datasets_part1~12.jsonl` | JSONL 분할 데이터셋 (BM25 인덱싱용) | 약 1GB 단위로 분리 |
| `papers_clean.prep.csv` | 전처리된 문헌 메타데이터 | TF-IDF/SBERT 학습용 |
- **컬럼 스키마 (권장)**
  - **필수:** `title`, `description`, `url`
  - **선택:** `keywords`, `org`, `doi` (BM25 가중치 반영 가능) <br>
## 사용 모델 <br>
| 단계 | 모델명 | 역할 |
|------|---------|------|
| Clarify | `google/flan-t5-base` | 질의 명확화 (연구주제형 변환) |
| Translation | `Helsinki-NLP/opus-mt-ko-en` | 한국어 → 영어 번역 |
| BM25 Retriever | `rank-bm25` | 필드별 토큰 기반 1차 검색 |
| Dense Retrieval (SBERT) | `models/paraphrase-multilingual-MiniLM-L12-v2` | SBERT 임베딩 |
| Cross-Encoder (옵션) |`models/bge-reranker-v2-m3` | 다국어 임베딩, Sentence-BERT |
> 두 모델은 **로컬 경로**를 사용하며, 노트북 상단 설정에서 변경 가능합니다.

# 3. 모델 실행환경 (HW/SW)
## 하드웨어 요구사항 <br>
| 항목 | 권장 사양 | 비고 |
|------|------------|------|
| **GPU** |NVIDIA 8GB VRAM 이상 | CPU도 가능하지만 속도 저하 |
| **CPU** | 8코어 이상 | 멀티스레드 임베딩 |
| **RAM** | 16GB 이상 | SBERT·CE 임베딩 처리용 |
| **Storage** | 10GB 이상 | 모델 가중치 및 데이터셋 포함 |

## 소프트웨어 환경 요구사항
| 항목 | 권장 버전 | 비고 |
|------|-----------|------|
| **OS** | Ubuntu 22.04 / macOS 14 / Windows 11 | |
| **Python** | 3.10.x | Conda 권장 |
| **Node.js** | v20.x | Vite + React |
| **npm** | v10.x | 프론트엔드 패키지 관리 |
| **Conda** | 24.5.x | 가상환경 및 의존성 관리 |
| **CUDA Toolkit** | 12.1 | GPU 가속용 |
| **NVIDIA Driver** | ≥ 530.x | CUDA 12.1 이상 대응 |
> Conda 환경 구성 (권장)
> A. 새 환경 만들기
>  ```bash
>  # Miniconda/Anaconda 설치 후 실행
>  conda create -n recsys-llm python=3.10 -y
>  conda activate recsys-llm
>  ```
>  B. 핵심 파이썬 패키지 설치 (GPU 또는 CPU 중 한 가지 선택)
> **[GPU – CUDA 12.1]**
> ```bash
> # PyTorch (cu121)
> pip install --index-url
> https://download.pytorch.org/whl/cu121
> torch==2.3.1 torchvision==0.18.1
> torchaudio==2.3.1
> ```
> **[CPU 전용]**
> ```bash
> pip install torch==2.3.1 torchvision==0.18.1
> torchaudio==2.3.1
> ```

## 필수 라이브러리 (requirements.txt)
```yaml
sentence-transformers==2.7.0
transformers==4.41.2
rank-bm25==0.2.2
scikit-learn==1.4.2
numpy==1.26.4
scipy==1.11.4
pandas==2.2.2
tqdm==4.66.4
huggingface-hub==0.23.4
torch==2.8.0
torchvision==0.22.2
torchaudio==2.8.0
sentencepiece==0.2.1
safetensors==0.4.5
accelerate==0.33.0
regex==2025.9.18
requests==2.32.3
pyyaml==6.0.2
colorama==0.4.6
packaging==25.0
filelock==3.15.4
typing-extensions>=4.10.0
```


# 4. PipeLine
```text
[사용자 질의]
     ↓
[ClarifyModule]
 ├─ 언어 감지 (Korean / English)
 ├─ 한국어 → 영어 번역 (Opus-MT)
 └─ 영어 Clarify (Flan-T5)
     ↓
[TextRecommender]
 ├─ BM25 다필드 검색
 ├─ SBERT Dense 재스코어링
 ├─ Cross-Encoder 재랭킹
 ├─ 점수 결합 (α·BM25 + β·Dense + γ·CE) 
 └─ 상위 K개 추천 및 등급화, 사유 생성
     ↓
[결과 출력 및 CSV 저장]

```


# 5. 학습/추론 수행방법
## 1. Clarify 단계
1. Jupyter/VS Code에서 `clarify_utils.py` 열기
2. python clarify_utils.py를 통해 실행
  - 한국어 입력을 감지 → 영어로 번역 (**Helsinki-NLP/opus-mt-ko-en**)  
  - **Flan-T5** 모델을 통해 문장을 명확화  <br>

**예시**

| 입력 질의 | Clarify 결과 |
|------------|--------------|
| 딥러닝 모델 성능 검증 논문을 추천해주세요 | Performance evaluation of deep learning models |
| AI 기반 의료 데이터 분석 연구 | AI-based analysis of medical data |

## 2) Modeling 단계
1. 콘다 활성화: `conda activate recsys-llm`  
2. Jupyter/VS Code에서 **Modeling.ipynb** 열기  
3. 노트북 상단 **Config** 섹션에서 경로/파라미터 확인
   - `PAPERS_CSV`, `DATASETS_CSV`
   - `SBERT_MODEL_NAME_OR_PATH`, `CE_MODEL`
   - 단계별 후보 수: `TOPN_BM25`, `M_DENSE`, `L_CE`, 최종 `K_FINAL`
   - 가중치: `ALPHA`, `BETA`, `GAMMA`
4. 전체 셀 실행 → 입력(제목/설명) → 결과 테이블/CSV 저장
```text
주요 하이퍼파라미터
- 검색 폭: `TOPN_BM25` (기본 200)
- Dense 선택: `M_DENSE` (기본 60)
- CE 대상: `L_CE` (기본 15), `USE_CE=True/False`
- 점수 결합: `ALPHA/BETA/GAMMA`
- 사유 길이: `MAX_REASON_CHARS=100`
```

**예시**

| 구분 | 제목 | 설명 | 점수 | 추천 사유 | Level | URL |
|---|---|---|---|---|---|---|
| thesis/dataset | … | … | 0.9123 | … | 강추 | https://… |

# 6. 검증 및 성능 평가
- **효율**: Latency (입력~결과 저장까지의 시간)
  - Cold/Warm 분리 (캐시/모델 로드 전후)
- **품질**: Top‑K 정밀도/랭킹 품질  
  - Precision@K, nDCG@K(기본 K=5), MRR  
  - 오프라인 수작업 라벨(관련성 0/1/2) 기반
### 6.1 재현 방법(간단 오프라인 평가)
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

### 6.2 성능/정확도 가이드라인(예시 지표 정의)
- **Latency**(warm): SBERT 임베딩 + CE 15쌍 재랭킹 기준 *X*–*Y*초(머신 사양에 따라 다름)  
- **Precision@5 / nDCG@5**: 프로젝트 골 기준(예: P@5 ≥ 0.60, nDCG@5 ≥ 0.70)

### 6.3 어블레이션(권장)
- `USE_CE=False` : CE 제거 시 품질/속도 변화
- `TOPN_BM25, M_DENSE, L_CE` 축소/확대
- `W_LANG`(ko/en 가중) 조정

### 6.4 결과
- nDCG@10 ≈ 0.65: 상위 랭킹 품질이 꽤 괜찮은 편(상위 결과에 관련 문서가 잘 올라옴).

- MRR@10 ≈ 0.47: 평균적으로 첫 관련 문서가 2위쯤에 등장(1위면 1.0, 2위면 0.5이므로). 초반 정밀도가 괜찮음.

- Recall@10 ≈ 0.54: 쿼리당 정답(긍정) 중 절반 조금 넘게 Top-10에 포착.

### 6.5 오프라인 검증 결과

| 모델                 | nDCG@10 | MRR@10 | Recall@10 |
|----------------------|:-------:|:------:|:---------:|
| BM25                 | 0.477   | 0.403  | 0.245     |
| Dense                | 0.421   | 0.313  | 0.208     |
| BM25+Dense           | 0.599   | 0.524  | 0.410     |
| Recall++(Union)      | 0.525   | 0.421  | 0.338     |
| BM25+Dense+CE(최종)  | 0.649   | 0.473  | 0.538     |

- 부연 설명 : CE를 넣으면 Recall이 많이 오르고 nDCG도 상승. MRR이 다소 내려간 건, CE가 “첫 관련 문서의 위치”를 항상 더 위로 올려주진 않기 때문(대신 Top-10 안에 관련 문서를 많이 넣어줌).


# 7. Tech Stack Summary
| Layer | Stack |
| --- | --- |
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | Python + Supabase Functions |
| **AI Models** | Flan-T5, SBERT, BGE-Reranker |
| **Data** | JSONL corpus (`dataon_clean`, `datasets_part1~12`) |

# 8. 문제 해결
- **속도**: 캐시가 없으면 최초 로드가 느릴 수 있음 → 동일 세션에서 반복 실행 권장  
- **메모리**: 대형 코퍼스는 SBERT 임베딩 메모리 사용량이 큼 → 배치 인코딩/절단  
- **오류**: 로컬 모델 경로 불일치/누락 확인, CPU‑only 환경에서 CE를 꺼서 시간 절약
- **LLM prompting 대신 추출적 근거를 사용하여 추천 사유 생성**
   - Multi-Agent를 사용할 목적이었으나 모델을 3개나 사용하기 때문에 응답시간 길어지고(성능을 올릴려면 불가피) 중저사양 H/W에서는 힘들 것으로 판단함
   - 쿼리와 문서(제목·설명)를 문장 단위로 쪼개서 Cross-Encoder(지금 쓰는 BGE reranker)로 쿼리–문장 점수를 계산 → 상위 1–2개 문장을 근거로 뽑아 자연어 문장으로 조립했음.

# 9. License
- FLAN-T5 (google/flan-t5-base): Apache-2.0  https://huggingface.co/google/flan-t5-base
- Opus-MT (Helsinki-NLP/opus-mt-ko-en): Apache-2.0 https://huggingface.co/Helsinki-NLP/opus-mt-ko-en
- Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2): Apache-2.0 https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 
- BGE Reranker (bge-reranker-v2-m3): Apache-2.0 https://huggingface.co/BAAI/bge-reranker-v2-m3
- (Lib) rank-bm25: Apache-2.0
