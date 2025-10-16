"""
원본 CSV을 읽어 기본 컬럼 보정/결측치 처리 후 *.prep.csv 로 저장
"""
import pandas as pd
from pathlib import Path

SRC_P = Path("papers_clean.csv")
SRC_D = Path("datasets_clean.csv")
DST_P = Path("papers_clean.prep.csv")
DST_D = Path("datasets_clean_prep.csv")

def sanitize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns={c: c.lower() for c in df.columns})
    for c in ["title","description","url"]:
        if c not in df.columns: df[c] = ""
        df[c] = df[c].fillna("").astype(str).str.strip()
    return df[["title","description","url"]]

for src, dst in [(SRC_P,DST_P),(SRC_D,DST_D)]:
    if src.exists():
        df = sanitize(pd.read_csv(src))
        df.to_csv(dst, index=False)
        print(f"[OK] {dst}")
    else:
        print(f"[SKIP] {src} not found")
