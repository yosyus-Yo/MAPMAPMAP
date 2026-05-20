# Supabase Storage 설정 가이드

## 버킷 구조

| 버킷명 | 용도 | 공개 여부 |
|--------|------|----------|
| `food-images` | 음식 사진 | Public |
| `receipt-images` | 영수증 사진 | Private |

## Policies 설정

### food-images (Public 버킷)

```sql
-- 업로드 허용 (모든 사용자 - anon key 사용)
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'food-images');

-- 읽기 허용 (모든 사용자)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'food-images');
```

### receipt-images (Private 버킷)

```sql
-- 업로드 허용 (모든 사용자 - anon key 사용)
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipt-images');

-- 읽기 허용 (서비스 역할만 - signed URL 사용)
-- Private 버킷은 별도 SELECT 정책 불필요 (signed URL로 접근)
```

## URL 형식

### food-images (Public)
```
https://[project-id].supabase.co/storage/v1/object/public/food-images/[uuid].jpg
```

### receipt-images (Private - Signed URL)
```
https://[project-id].supabase.co/storage/v1/object/sign/receipt-images/[uuid].jpg?token=xxx
```
- Signed URL은 1년간 유효
- 영수증은 관리자만 확인하므로 private 유지

## 확인 방법

1. 서버 재시작
2. 맛집 제보 또는 리뷰 작성
3. Supabase Dashboard → Storage에서 확인:
   - `food-images` 버킷에 음식 사진
   - `receipt-images` 버킷에 영수증 사진
