# 데이터 파이프라인 구축 및 정제
## 1. 개요
이 프로젝트는 DataON 및 ScienceON API를 활용해 대규모 데이터 코퍼스를 구축하고 정제하는 파이프라인입니다. 기존의 단순 키워드 검색 방식의 한계를 넘어, 소규모 언어모델(SLLM) 기반의 고도화된 논문·데이터셋 추천 에이전트 개발을 위한 견고한 데이터 기반을 마련하는 것이 목표입니다.

## 2. 파이프라인
프로젝트는 크게 두 단계로 구성됩니다.

단계	주요 작업
1. 데이터 수집	**harvest_dataon.py**를 활용해 가능한 모든 2글자 조합을 쿼리로 생성하여 데이터셋을 전방위적으로 확보합니다. 이후, 수집된 데이터셋의 빈출 키워드를 harvest_papers.py 검색에 활용하여 의미적으로 연관된 논문을 수집합니다.
2. 데이터 정제	수집된 데이터를 통합하고, HTML 태그 및 불필요한 공백을 제거합니다. 또한, **preprocess.py**를 활용해 langdetect로 언어 정보를 추가하고, 제목 및 설명이 없는 불완전한 데이터를 필터링합니다.


## 3. 디렉터리 구조
```text
.
├── harvest_dataon.py           # DataON 데이터셋 수집 스크립트
├── harvest_papers.py           # ScienceON 논문 수집 스크립트
├── preprocess.py               # 수집된 데이터 정제 스크립트
├── dataon_dumps/               # (생성) 수집된 원본 DataON 데이터
│   ├── datasets_part1.jsonl
│   └── ...
├── papers_raws.jsonl           # (생성) 수집된 원본 논문 데이터
├── dataon_clean.jsonl          # (생성) 정제된 DataON 데이터
└── papers_clean.jsonl          # (생성) 정제된 논문 데이터
```

# 4. 실행 방법
## 4.1. 환경 설정
필요한 라이브러리를 설치합니다.
```text
(Bash) pip install requests orjson tqdm langdetect glob
```

## 4.2. 데이터 수집
먼저 **harvest_dataon.py**와 **harvest_papers.py**를 순서대로 실행해 DataON 및 ScienceON 데이터를 수집합니다.
```text
Bash
python harvest_dataon.py
python harvest_papers.py
```
이 스크립트들은 dataon_dumps 폴더와 papers_raws.jsonl 파일을 생성합니다.

## 4.3. 데이터 정제
다음으로 **preprocess.py**를 실행해 수집된 데이터를 정제합니다.
``` text
Bash
python preprocess.py
```
이 스크립트는 dataon_dumps 폴더와 papers_raws.jsonl의 데이터를 읽어 dataon_clean.jsonl과 papers_clean.jsonl 파일을 생성합니다.
