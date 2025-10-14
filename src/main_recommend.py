# -*- coding: utf-8 -*-
"""
main_recommend.py
-----------------
질의 입력 → Clarify (LLM) → Recommend → 출력
"""

import os
import pandas as pd
from src.recommend_model import TextRecommender
# Clarify 모듈 (v3 버전)
from src.clarify_utils import ClarifyModule

# ------------------------------------------------------------
# 경로 설정
# ------------------------------------------------------------
DATA_PATH = os.path.join("data", "papers_clean.prep.csv")
OUTPUT_PATH = os.path.join("outputs", "recommendations.csv")

# ------------------------------------------------------------
# 메인 실행
# ------------------------------------------------------------
def main():
    print("------------------------------------------------------------")
    print(" 📘 논문/데이터셋 추천 시스템")
    print("------------------------------------------------------------")

    # 데이터 로드
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    print(f"[INFO] 데이터 로드 완료 ({len(df)}개 항목)\n")

    # ------------------------------------------------------------
    # Clarify 단계
    # ------------------------------------------------------------
    print("------------------------------------------------------------")
    print(" 🧠 Clarify 단계 (LLM 기반 질의 정제)")
    print("------------------------------------------------------------")

    try:
        print("[INFO] Clarify 모델 로드 중...")
        clarify = ClarifyModule()
        print("[INFO] Clarify 모델 로드 완료.\n")
    except Exception as e:
        print(f"[경고] Clarify 모듈 초기화 실패: {e}")
        clarify = None

    # ------------------------------------------------------------
    # 사용자 질의 입력
    # ------------------------------------------------------------
    query = input("[INPUT] 질의를 입력하세요:\n> ").strip()
    if not query:
        print("빈 질의입니다. 종료합니다.")
        return

    # ------------------------------------------------------------
    # Clarify 수행
    # ------------------------------------------------------------
    if clarify:
        try:
            clarified = clarify.clarify(query)
            print(f"\n[Clarified Query] {clarified}\n")
        except Exception as e:
            print(f"[경고] Clarify 수행 중 오류 발생: {e}")
            clarified = query
    else:
        clarified = query
        print("[INFO] Clarify 단계 건너뜀 (원문 질의 사용)\n")

    # ------------------------------------------------------------
    # 추천 단계
    # ------------------------------------------------------------
    print("[INFO] TF-IDF 모델 학습 중...")
    recommender = TextRecommender(df, backend="tfidf")
    recommender.fit()
    print("[INFO] TF-IDF 모델 학습 완료.\n")

    print("------------------------------------------------------------")
    print(" 🏆 추천 결과")
    print("------------------------------------------------------------")

    result_df = recommender.recommend(clarified, topk=5)

    if result_df.empty:
        print("추천 결과가 없습니다. Clarified Query를 확인하세요.")
        return

    for _, row in result_df.iterrows():
        print(f"{row['rank']}. {row['title']}")
        print(f"   설명: {row['description'][:180]}...")
        print(f"   URL: {row['url']}")
        print(f"   점수: {row['score']} | 근거: {row['reason']} | 등급: {row['level']}\n")

    # ------------------------------------------------------------
    # 결과 저장
    # ------------------------------------------------------------
    os.makedirs("outputs", exist_ok=True)
    result_df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")
    print(f"[INFO] 결과가 '{OUTPUT_PATH}'에 저장되었습니다.")


# ------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[종료됨] 사용자가 실행을 중단했습니다.")
    except Exception as e:
        print(f"[오류] {e}")
