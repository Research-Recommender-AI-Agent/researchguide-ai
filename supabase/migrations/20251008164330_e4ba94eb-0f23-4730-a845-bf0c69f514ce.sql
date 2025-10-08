-- 존재하지 않는 논문들 삭제하고 실제 논문으로 교체
DELETE FROM bookmarks WHERE url LIKE '%scienceon.kisti.re.kr%' OR url LIKE '%dataon.kisti.re.kr%';

-- 실제 존재하는 논문만 남김 (Dropout 논문)
-- 나머지는 사용자가 직접 추가하도록 함