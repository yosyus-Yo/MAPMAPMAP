# Supabase Storage 설정 가이드

## 1. Storage 버킷 생성

Supabase 대시보드에서:

1. **Storage** 메뉴 클릭
2. **New bucket** 버튼 클릭
3. 다음 설정으로 생성:
   - **Name**: `images`
   - **Public bucket**: ✅ 체크 (공개 접근 허용)
   - **File size limit**: 5MB

## 2. Storage Policies 설정

버킷 생성 후, **Policies** 탭에서 다음 정책 추가:

### 업로드 정책 (INSERT)
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');
```

### 읽기 정책 (SELECT)
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

또는 대시보드에서:
1. **Policies** 탭 클릭
2. **New Policy** → **For full customization** 선택
3. 위 SQL을 각각 추가

## 3. 간편 설정 (대시보드 UI)

대시보드에서 더 쉽게:
1. Storage → images 버킷 선택
2. **Policies** 탭
3. **Other policies under storage.objects**
4. **New Policy** 클릭
5. **Allow access to JPG files in a public folder to anonymous users** 템플릿 선택
6. 조건을 `bucket_id = 'images'`로 수정

## 4. 폴더 구조

업로드 시 자동 생성되는 폴더:
```
images/
├── food/           # 음식 사진
│   └── uuid.jpg
└── receipts/       # 영수증 사진
    └── uuid.jpg
```

## 5. URL 형식

업로드된 이미지 URL:
```
https://[project-id].supabase.co/storage/v1/object/public/images/food/[uuid].jpg
https://[project-id].supabase.co/storage/v1/object/public/images/receipts/[uuid].jpg
```

## 6. 확인 방법

서버 시작 후 이미지 업로드 테스트:
1. 맛집 제보하기 또는 리뷰 작성
2. 이미지 첨부 후 제출
3. Supabase Dashboard → Storage → images 에서 확인
