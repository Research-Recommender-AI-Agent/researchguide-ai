"""
검증용 쿼리/정답(qrels)을 입력받아 nDCG@10, MRR@10, Recall@10 계산.
포맷 예) queries.csv: id,title,desc / qrels.csv: id,doc_id,rel
"""
import argparse, pandas as pd, numpy as np
from pipeline import load_df, get_backend, multistage_recommend

def ndcg_at_k(rel, k=10):
    rel = np.array(rel[:k], dtype=float)
    dcg = (rel / np.log2(np.arange(2, len(rel)+2))).sum()
    idcg = (sorted(rel, reverse=True) / np.log2(np.arange(2, len(rel)+2))).sum()
    return dcg / idcg if idcg > 0 else 0.0

def mrr_at_k(rel, k=10):
    for i, r in enumerate(rel[:k], 1):
        if r > 0: return 1.0 / i
    return 0.0

def recall_at_k(rel, k=10):
    rel = np.array(rel)
    return (rel[:k] > 0).sum() / max(1, (rel > 0).sum())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--queries", default="queries.csv")
    ap.add_argument("--qrels",   default="qrels.csv")
    args = ap.parse_args()

    qdf = pd.read_csv(args.queries)
    rdf = pd.read_csv(args.qrels)

    backend = get_backend()
    papers   = load_df("papers_clean.prep.csv")
    datasets = load_df("datasets_clean_prep.csv")

    rows = []
    for _, q in qdf.iterrows():
        df = multistage_recommend(q["title"], q.get("desc",""), papers, datasets, backend, topk=10)
        # 정답 매핑
        truth = rdf[rdf["id"] == q["id"]]
        rel = [(1 if any(str(t) in r["URL"] or str(t) in r["제목"] for t in truth["doc_id"]) else 0)
               for _, r in df.iterrows()]
        rows.append((ndcg_at_k(rel,10), mrr_at_k(rel,10), recall_at_k(rel,10)))

    arr = np.array(rows)
    print(f"nDCG@10={arr[:,0].mean():.3f}  MRR@10={arr[:,1].mean():.3f}  Recall@10={arr[:,2].mean():.3f}")

if __name__ == "__main__":
    main()
