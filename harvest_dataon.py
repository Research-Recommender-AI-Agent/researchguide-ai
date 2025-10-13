import requests
import orjson
import time
import os
from tqdm import tqdm
import string
import itertools
import glob

# [1] API 인증 관련 설정
SEARCH_KEY = "5494BC49983EF849F14BD95428E97132"  # KISTI DataON API key
SEARCH_URL = "http://dataon.kisti.re.kr/rest/api/search/dataset"  # 검색 endpoint

# [2] 저장 관련 파라미터
SPLIT_SIZE = 100_000  # 파일 하나당 저장할 최대 데이터 수 (너무 커지지 않게 분할)
STEP = 100             # 한 번의 요청당 가져올 데이터 개수 (API size 파라미터)

# [3] 쿼리 문자 조합 생성 (2글자씩)
# DataON 검색 API는 검색어(query)가 있어야 결과를 반환하므로,
# 가능한 모든 문자 조합으로 검색을 시도하여 전체 데이터를 커버함.

# 추가로 포함할 특수문자 및 다국어 문자 (일본어·중국어·한글 혼합)
EXTRA_CHARS = list("日本中国データ数据학습연구과학기술")

# 기본 문자 집합: 영어 대소문자 + 숫자 + 한글 일부 + 특수문자
BASE_CHARS = (
    list(string.ascii_lowercase) +  # a-z
    list(string.ascii_uppercase) +  # A-Z
    list(string.digits) +           # 0-9
    list("가나다라마바사아자차카타파하") +  # 주요 한글 초성
    EXTRA_CHARS +                   # 다국어 문자
    ["-", "_", ".", "@", "#", "&"]  # 자주 등장하는 특수문자
)

# itertools.product을 이용해 모든 가능한 2글자 조합 생성
# 예: "aa", "ab", "ac", ..., "가a", "A1" 등
QUERIES = ["".join(p) for p in itertools.product(BASE_CHARS, repeat=2)]
print(f"[INFO] 총 {len(QUERIES)} 개 쿼리 생성됨")

#  [4] 데이터 저장 디렉터리
SAVE_DIR = "dataon_dumps"
os.makedirs(SAVE_DIR, exist_ok=True)


# =======================
# [5] API 요청 함수
# =======================
def fetch_search(query="", start=0, size=100):
    """DataON API에서 query 검색 결과를 JSON 형태로 반환"""
    params = {"key": SEARCH_KEY, "query": query, "from": start, "size": size}
    r = requests.get(SEARCH_URL, params=params, timeout=20)
    r.raise_for_status()  # HTTP 오류 발생 시 예외 발생
    return r.json()


# =======================
# [6] JSONL 저장 함수
# =======================
def save_jsonl(records, file_path):
    """리스트 형태의 레코드를 JSON Lines 포맷으로 파일에 append"""
    with open(file_path, "ab") as f:
        for rec in records:
            f.write(orjson.dumps(rec, option=orjson.OPT_APPEND_NEWLINE))


# =======================
#  [7] 중복 방지용 ID 로드
# =======================
def load_seen_ids():
    """
    이미 저장된 파일(datasets_part*.jsonl)에서 'id' 필드를 읽어 중복 방지용 Set 생성
    → 프로그램 중단 후 재실행 시, 이전에 저장한 데이터는 건너뜀
    """
    seen = set()
    files = glob.glob(os.path.join(SAVE_DIR, "datasets_part*.jsonl"))
    for file in files:
        with open(file, "rb") as f:
            for line in f:
                try:
                    obj = orjson.loads(line)
                    if "id" in obj:
                        seen.add(obj["id"])
                except Exception:
                    continue
    print(f"[INFO] 기존 파일에서 {len(seen)} 개 svc_id 로드됨")
    return seen


# =======================
#  [8] 메인 로직
# =======================
def main():
    # 기존에 저장된 데이터 ID 불러오기
    seen_ids = load_seen_ids()
    total_saved = len(seen_ids)  # 이미 저장된 데이터 수

    # 현재 파일 번호 계산 (ex: datasets_part1.jsonl, datasets_part2.jsonl)
    part_num = (total_saved // SPLIT_SIZE) + 1
    current_file = os.path.join(SAVE_DIR, f"datasets_part{part_num}.jsonl")

    # 생성된 모든 2글자 쿼리를 순회하며 수집
    for query in QUERIES:
        print(f"\n=== Query: {query} ===")
        try:
            # 전체 건수 확인 (total count)
            first = fetch_search(query=query, start=0, size=1)
            total = first.get("response", {}).get("total count", 0)
            print(f"  ▶ {query} 검색 → {total} 건 발견")
        except Exception as e:
            print(f"[!] {query} 검색 total count 확인 실패:", e)
            continue

        # STEP 단위로 페이지네이션하며 데이터 수집
        for start in tqdm(range(0, total, STEP), desc=f"{query} 검색"):
            try:
                result = fetch_search(query=query, start=start, size=STEP)
            except Exception as e:
                print(f"[!] API 오류 at query={query}, start={start}:", e)
                time.sleep(3)
                continue

            items = result.get("records", [])
            if not items:
                break

            detailed_records = []
            for it in items:
                dataset_id = it.get("svc_id")
                # 중복 제거
                if not dataset_id or dataset_id in seen_ids:
                    continue
                seen_ids.add(dataset_id)

                # 필요한 필드만 정리하여 저장
                record = {
                    "id": dataset_id,
                    "title": it.get("dataset_title_kor") or it.get("dataset_title_etc_main"),
                    "description": it.get("dataset_expl_kor") or it.get("dataset_expl_etc_main"),
                    "keywords": [it.get("dataset_kywd_kor"), it.get("dataset_kywd_etc_main")],
                    "org": it.get("cltfm_kor") or it.get("cltfm_etc"),
                    "year": it.get("dataset_pub_dt_pc"),
                    "url": it.get("dataset_lndgpg"),
                    "doi": it.get("dataset_doi"),
                }
                detailed_records.append(record)

            # 파일 크기가 SPLIT_SIZE를 넘으면 다음 파일로 전환
            if total_saved >= part_num * SPLIT_SIZE:
                part_num += 1
                current_file = os.path.join(SAVE_DIR, f"datasets_part{part_num}.jsonl")
                print(f"\n[INFO] 새로운 파일 시작 → {current_file}")

            # 저장
            save_jsonl(detailed_records, current_file)
            total_saved += len(detailed_records)

            # 진행상황 주기적으로 출력
            if start % 10_000 == 0:
                print(f"[INFO] {query} - {start} ~ {start+STEP} 저장 (누적 {total_saved})")

            # API 과부하 방지용 대기 시간
            time.sleep(0.2)

    print(f"\n[DONE] 총 {total_saved} 건 데이터 저장 완료")


# 프로그램 진입점
if __name__ == "__main__":

    main()
