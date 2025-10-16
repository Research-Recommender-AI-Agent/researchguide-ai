#!/usr/bin/env bash
set -euo pipefail

# 사용: bash scripts/setup_env.sh recsys
ENV_NAME="${1:-recsys}"
PYVER="3.10"

# 1) conda 있으면 conda 환경 생성/활성화
if command -v conda >/dev/null 2>&1; then
  source "$(conda info --base)/etc/profile.d/conda.sh"
  conda create -y -n "$ENV_NAME" python=$PYVER
  conda activate "$ENV_NAME"
else
  # 2) conda 없으면 venv로 대체
  echo "[WARN] conda not found. Using python venv."
  python3 -m venv "$ENV_NAME"
  source "$ENV_NAME/bin/activate"
fi

# 공통 패키지 설치(CPU/GPU 공용)
pip install -U pip
pip install sentence-transformers==2.7.0 transformers==4.44.2             scikit-learn==1.5.1 rank-bm25==0.2.2             numpy==1.26.4 pandas==2.2.2 matplotlib==3.8.4

echo "[OK] 환경 준비 완료: $ENV_NAME"
