"""
HF 허브/로컬 경로 모두 지원: 미리 받아두면 오프라인에서도 사용 가능.
"""
import os
from sentence_transformers import SentenceTransformer, CrossEncoder

SBERT_ID = os.getenv("SBERT_ID", "models/paraphrase-multilingual-MiniLM-L12-v2")
CE_ID    = os.getenv("CE_ID",    "models/bge-reranker-v2-m3")  # 또는 "BAAI/bge-reranker-v2-m3"

def main():
    print(f"Downloading/Checking: {SBERT_ID}")
    SentenceTransformer(SBERT_ID)
    print(f"Downloading/Checking: {CE_ID}")
    CrossEncoder(CE_ID)
    print("[OK] models cached")

if __name__ == "__main__":
    main()
