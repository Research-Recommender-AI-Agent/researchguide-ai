# ================================================================
#  DataON 데이터 정제 스크립트
# ------------------------------------------------
# 역할:
# - dataon_dumps 폴더 내 datasets_part*.jsonl 파일들을 모두 병합
# - HTML 엔티티 및 공백 제거
# - title/description 없는 항목 제외
# - 언어 감지(langdetect) 추가
# - 최종적으로 dataon_clean.jsonl에 저장
# ================================================================

import orjson
import glob
import re
from tqdm import tqdm
from langdetect import detect, DetectorFactory

# ================================================================
# 언어 감지 초기 설정
# ------------------------------------------------
# langdetect의 비결정성(random seed 문제)을 방지하기 위해
# seed를 고정시켜 항상 동일한 언어 감지 결과가 나오도록 설정
# ================================================================
DetectorFactory.seed = 0

# ------------------------------------------------
# 입력 / 출력 파일 설정
# ------------------------------------------------
# dataon_dumps 폴더 내에 있는 datasets_part1.jsonl, datasets_part2.jsonl … 파일들을 모두 읽음
INPUT_FILES = sorted(glob.glob("dataon_dumps/datasets_part*.jsonl"))
# 정제된 통합 파일 출력 경로
OUTPUT_FILE = "dataon_clean.jsonl"


# ================================================================
# clean_text()
# ------------------------------------------------
# 텍스트 전처리 함수
# - HTML 엔티티 제거 (&amp;, &lt;, 등)
# - 개행/탭/중복 공백 제거
# ================================================================
def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"&[a-z]+;", " ", text)  # HTML 엔티티 제거
    text = re.sub(r"\s+", " ", text)       # 연속된 공백 → 하나로 축소
    return text.strip()                    # 앞뒤 공백 제거 후 반환


# ================================================================
# main()
# ------------------------------------------------
# 메인 처리 파이프라인
# 1️⃣ 각 datasets_part*.jsonl 파일 순회
# 2️⃣ JSON 파싱 후 필드 정제
# 3️⃣ 언어 감지(langdetect)
# 4️⃣ dataon_clean.jsonl로 저장
# ================================================================
def main():
    total_in, total_out = 0, 0  # 전체 입력/출력 카운트

    # 출력 파일 열기 (wb: 바이너리 모드로 한 줄씩 쓰기)
    with open(OUTPUT_FILE, "wb") as out_f:
        # dataon_dumps의 모든 파트 파일 순회
        for file in INPUT_FILES:
            print(f"[INFO] 처리 중: {file}")

            # tqdm으로 진행률 표시
            with open(file, "rb") as f:
                for line in tqdm(f, desc=f"{file}"):
                    total_in += 1
                    try:
                        obj = orjson.loads(line)  # JSON 파싱
                        # ------------------------------------------------
                        # 1️⃣ 텍스트 정제
                        # ------------------------------------------------
                        title = clean_text(obj.get("title", ""))
                        desc = clean_text(obj.get("description", ""))
                        url = obj.get("url", "")

                        # title/description이 비어 있으면 제외
                        if not title or not desc:
                            continue

                        # ------------------------------------------------
                        # 2️⃣ 언어 감지
                        # ------------------------------------------------
                        try:
                            # title + description을 결합해 감지 정확도 향상
                            lang = detect(title + " " + desc)
                        except Exception:
                            lang = "unknown"

                        # ------------------------------------------------
                        # 3️⃣ 정제된 레코드 구성
                        # ------------------------------------------------
                        record = {
                            "id": obj.get("id"),
                            "title": title,
                            "description": desc,
                            "keywords": obj.get("keywords", []),
                            "org": obj.get("org", ""),
                            "year": obj.get("year", ""),
                            "url": url,
                            "doi": obj.get("doi", ""),
                            "lang": lang  # 감지된 언어 저장 (예: 'ko', 'en', 'ja' 등)
                        }

                        # ------------------------------------------------
                        # 4️⃣ JSONL로 한 줄씩 저장
                        # ------------------------------------------------
                        out_f.write(orjson.dumps(record, option=orjson.OPT_APPEND_NEWLINE))
                        total_out += 1
                    except Exception:
                        # JSON 파싱 오류나 필드 누락 등은 건너뜀
                        continue

    # ================================================================
    # 처리 완료 로그
    # ================================================================
    print(f"\n[완료] 총 {total_in}개 중 {total_out}개 정제됨 → {OUTPUT_FILE}")


# ================================================================
# 실행 진입점
# ================================================================
if __name__ == "__main__":
    main()
