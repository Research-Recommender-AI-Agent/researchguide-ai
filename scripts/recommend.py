"""
CLI 질의 → 추천 결과 CSV로 저장.
"""
import argparse, pandas as pd
from pipeline import load_df, get_backend, multistage_recommend  # ← 노트북 함수 모듈화

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--desc",  default="")
    ap.add_argument("--topk",  type=int, default=5)
    args = ap.parse_args()

    backend = get_backend()
    papers   = load_df("papers_clean.prep.csv")
    datasets = load_df("datasets_clean_prep.csv")

    df = multistage_recommend(
        title_ko=args.title, desc_ko=args.desc,
        papers_df=papers, datasets_df=datasets,
        backend=backend, en_title=None, en_desc=None, topk=args.topk
    )
    out = "추천_결과.csv"
    df.to_csv(out, index=False, encoding="utf-8-sig")
    print(df[["구분","제목","점수","Level"]])
    print(f"[OK] saved -> {out}")

if __name__ == "__main__":
    main()
