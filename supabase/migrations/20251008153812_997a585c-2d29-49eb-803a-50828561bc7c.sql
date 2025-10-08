-- Storage 버킷 생성: papers_clean.jsonl 파일을 저장할 public 버킷
INSERT INTO storage.buckets (id, name, public) 
VALUES ('papers', 'papers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 모든 사용자가 papers 버킷의 파일을 읽을 수 있도록 설정
CREATE POLICY "Public Access for papers bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'papers');

-- Storage 정책: 인증된 사용자가 papers 버킷에 파일을 업로드할 수 있도록 설정
CREATE POLICY "Authenticated users can upload to papers bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'papers' AND auth.role() = 'authenticated');

-- Storage 정책: 인증된 사용자가 papers 버킷의 파일을 삭제할 수 있도록 설정
CREATE POLICY "Authenticated users can delete from papers bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'papers' AND auth.role() = 'authenticated');