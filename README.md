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
3. 노트북 상단 **Config** 섹션에서 CSV/모델 경로 확인  
4. 전체 셀 실행 → 입력(제목/설명) → 결과 테이블/CSV 저장

**예시**

| 구분 | 제목 | 설명 | 점수 | 추천 사유 | Level | URL |
|---|---|---|---|---|---|---|
| thesis/dataset | … | … | 0.9123 | … | 강추 | https://… |

# 6. 검증 및 성능 평가
- 효율: Latency (입력~결과 저장)
- 정확도: Precision@K, nDCG@K, MRR 기반 평가

| 모델                 | nDCG@10 | MRR@10 | Recall@10 |
|----------------------|:-------:|:------:|:---------:|
| BM25                 | 0.477   | 0.403  | 0.245     |
| Dense                | 0.421   | 0.313  | 0.208     |
| BM25+Dense           | 0.599   | 0.524  | 0.410     |
| Recall++(Union)      | 0.525   | 0.421  | 0.338     |
| BM25+Dense+CE(최종)  | 0.649   | 0.473  | 0.538     |


# 7. Tech Stack Summary
| Layer | Stack |
| --- | --- |
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Backend** | Python + Supabase Functions |
| **AI Models** | Flan-T5, SBERT, BGE-Reranker |
| **Data** | JSONL corpus (`dataon_clean`, `datasets_part1~12`) |


# 8. License
- FLAN-T5 (google/flan-t5-base): Apache-2.0  https://huggingface.co/google/flan-t5-base
- Opus-MT (Helsinki-NLP/opus-mt-ko-en): Apache-2.0 https://huggingface.co/Helsinki-NLP/opus-mt-ko-en
- Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2): Apache-2.0 https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 
- BGE Reranker (bge-reranker-v2-m3): Apache-2.0 https://huggingface.co/BAAI/bge-reranker-v2-m3
- (Lib) rank-bm25: Apache-2.0
