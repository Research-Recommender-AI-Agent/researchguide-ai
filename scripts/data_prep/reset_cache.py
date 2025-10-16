"""
메모리 캐시/디스크 캐시 모두 초기화
"""
import shutil
from pipeline import reset_retrieval_cache

if __name__ == "__main__":
    reset_retrieval_cache()
    shutil.rmtree("cache", ignore_errors=True)
    print("[OK] caches cleared")
