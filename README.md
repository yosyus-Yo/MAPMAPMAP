# MapMapMap 🌶️

**매운맛 맛집 지도 서비스** — 나만의 맵기 레벨에 맞는 맛집을 찾아보세요!

## 소개

MapMapMap은 매운 음식을 좋아하는 사람들을 위한 맛집 공유 서비스입니다. 사용자의 매운맛 내성 레벨(0~5)을 설정하고, 다른 사용자들의 인증 리뷰로 나에게 맞는 매운맛 맛집을 찾을 수 있습니다.

### 주요 기능

- **맵핵 레벨 시스템**: 0(안 매움) ~ 5(극한) 단계로 매운맛 레벨 설정
- **스마트 필터링**: Safe(안전) / Warning(주의) / Danger(위험) 표시
- **인증 리뷰**: 음식 사진 + 영수증 인증으로 신뢰성 확보
- **카카오맵 연동**: 지도에서 맛집 위치/마커 확인
- **찜하기**: 마음에 드는 맛집 저장
- **관리자 승인**: 리뷰 품질 관리를 위한 승인 워크플로우
- **인터랙티브 UX**: 슬라임 물리 매운맛 레벨 박스, 리뷰 슬라이드 패널

## 기술 스택 (v2, 2026-05)

| 구분 | 기술 |
|------|------|
| Frontend | HTML/CSS/JavaScript (vanilla, SPA) |
| 지도 | Kakao Maps API (JavaScript SDK + Places) |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| 호스팅 | Vercel (정적 배포, build step 없음) |
| 인증 | Supabase Auth (email/password) |
| 추가 | marked.js + DOMPurify (markdown), heic2any (HEIC → JPEG) |

> **v1과의 차이**: 과거 Node.js/Express/SQLite 백엔드(`server/`)는 deprecated. 현재는 Supabase 기반 v2 (`public/v2/`)가 주력. v1은 호환용으로 유지.

## 시작하기 (개발자용)

### 1. 사전 요구사항

- **Node.js** 18+ (선택사항, 로컬 정적 서버용)
- **Vercel CLI** (선택사항, `vercel dev`)
- **Kakao 개발자 계정** ([developers.kakao.com](https://developers.kakao.com/))
- **Supabase 프로젝트** ([supabase.com](https://supabase.com/))

### 2. 프로젝트 클론

```bash
git clone https://github.com/yosyus-Yo/MAPMAPMAP.git
cd MAPMAPMAP
```

### 3. Kakao Maps API 키 발급

1. [Kakao Developers](https://developers.kakao.com/) → 내 애플리케이션 → 새 애플리케이션
2. **앱 키 → JavaScript 키** 복사
3. **플랫폼 → Web** 추가: `http://localhost:3000`, 프로덕션 도메인 등록
4. `public/v2/index.html` 상단의 카카오맵 SDK 스크립트 키 교체:
   ```html
   <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=여기에_JS_키&libraries=services"></script>
   ```

### 4. Supabase 셋업

#### 4-1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) → New Project
2. **Project URL**, **Anon Public Key** 두 값을 복사

#### 4-2. 스키마 생성

Supabase Dashboard → SQL Editor에서 다음 SQL 순차 실행:

```sql
-- users (Supabase Auth 연결)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  spicy_level INTEGER CHECK (spicy_level BETWEEN 0 AND 5),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  kakao_place_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  spicy_level INTEGER CHECK (spicy_level BETWEEN 0 AND 5),
  content TEXT,
  food_image_url JSONB,
  receipt_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- review_likes
CREATE TABLE public.review_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, review_id)
);

-- favorites
CREATE TABLE public.favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

-- announcements (관리자 공지 — 1개만 사용, id=1 fixed)
CREATE TABLE public.announcements (
  id BIGINT PRIMARY KEY,
  title TEXT,
  notice_text TEXT,
  howto_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.announcements (id, title, notice_text, howto_text, version)
VALUES (1, '🌶 맵맵맵', '환영합니다!', '1. 회원가입\n2. 매운맛 레벨 설정\n3. 마커 클릭 → 리뷰 확인', 1);
```

#### 4-3. RLS 정책 (필수)

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 데이터)
CREATE POLICY "public read restaurants" ON public.restaurants FOR SELECT USING (TRUE);
CREATE POLICY "public read approved reviews" ON public.reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT USING (TRUE);

-- 로그인 사용자만 본인 데이터 CRUD
CREATE POLICY "own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own likes" ON public.review_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- 관리자만 announcements 수정
CREATE POLICY "admin update announcements" ON public.announcements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE));
```

#### 4-4. Storage 버킷 (리뷰 이미지)

Supabase Dashboard → Storage → New bucket:
- **review-photos** (public read, authenticated write)
- **receipts** (private)

#### 4-5. 클라이언트 키 입력

`public/v2/js/api.js` 상단:

```js
const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const SUPABASE_ANON_KEY = '<your-anon-public-key>';
```

### 5. 로컬 실행

```bash
# 옵션 A: npm script (정적 파일 서버 필요 시)
npx http-server public -p 3000

# 옵션 B: Vercel CLI (권장)
npx vercel dev
```

브라우저: `http://localhost:3000/v2/` (v2 페이지) 또는 `http://localhost:3000/` (v1 호환 페이지)

### 6. 네이버 지도 링크 (선택, Edge Function 필요)

각 음식점의 reviewPanel에 **🗺️ 카카오맵** + **📍 네이버지도** 외부 링크가 표시됩니다.

| 링크 | 기본 동작 | 정확한 가게 URL |
|---|---|---|
| 카카오맵 | `kakao_place_id` 있으면 정확한 deeplink, 없으면 검색 URL | ✅ 키 불필요 |
| 네이버지도 | 검색 URL (가게 검색 결과 페이지) | ✅ Edge Function 배포 시 정확한 URL |

#### 6-1. 네이버 Open API 등록 (선택)

1. [Naver Developers](https://developers.naver.com/) 회원가입 → 애플리케이션 등록
2. 사용 API: **검색 → 지역**
3. 발급된 **Client ID** + **Client Secret** 복사
4. 무료 quota: 일 25,000회 (2025년 초 기준)

#### 6-2. Supabase Edge Function 배포

```bash
# Supabase CLI 설치 (미설치 시)
npm install -g supabase

# 프로젝트 연결 (한 번만)
supabase link --project-ref <YOUR_PROJECT_REF>

# 환경변수 설정 (Secret)
supabase secrets set NAVER_CLIENT_ID=<발급받은_Client_ID>
supabase secrets set NAVER_CLIENT_SECRET=<발급받은_Client_Secret>

# Edge Function 배포
supabase functions deploy naver-place
```

배포 후 클라이언트가 자동으로 정확한 네이버 가게 URL 사용. 미배포 상태에선 검색 URL fallback.

#### 6-3. 동작 검증

```bash
# Edge Function 호출 테스트 (curl)
curl -X POST 'https://<YOUR_REF>.supabase.co/functions/v1/naver-place' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"홍대 김밥천국","address":"서울 마포구"}'
# 기대: {"link":"https://map.naver.com/...","title":"...","address":"..."}
```

### 7. 관리자 계정 설정

회원가입 후 Supabase Dashboard → Table Editor → `users` → 해당 row의 `is_admin = TRUE`로 수동 변경.

관리자 페이지: `/v2/#admin` (로그인 + is_admin=TRUE 필요)

## 배포

### Vercel (권장)

1. Vercel에 GitHub 저장소 연결
2. **빌드 설정**: `vercel.json`에 정의됨 (build step 없음, `public/` 정적 배포)
3. **환경변수**: 없음 (모든 키는 `public/v2/js/api.js`에 하드코딩 — Anon 키이라 클라이언트 노출 안전. RLS 정책으로 보호)
4. **자동 배포**: main 브랜치 push 시

### 카카오 도메인 등록

배포 후 Vercel 도메인을 Kakao Developers → Web 플랫폼에 추가 필요:
```
https://<your-vercel-domain>
```

## 프로젝트 구조 (v2)

```
mapmadmap_complete/
├── public/
│   ├── v2/                    # 🌶 메인 v2 페이지 (Supabase 기반)
│   │   ├── index.html         # 메인 SPA (834줄, 2026-05-20 분리 후)
│   │   ├── css/
│   │   │   ├── main.css       # 메인 스타일 (2,094줄)
│   │   │   └── announce.css   # 공지 모달 스타일
│   │   └── js/
│   │       ├── api.js         # Supabase API 클라이언트 (auth/restaurants/reviews/likes/favorites/announcements)
│   │       ├── app.js         # SPA routing + 지도 + 사이드바 + 리뷰 모달 (1,447줄)
│   │       ├── app-handlers.js # 폼 핸들러 + 회원가입/로그인 + 매운맛 레벨 설정 (1,736줄)
│   │       ├── slime-physics.js # 매운맛 레벨 박스 슬라임 물리 (334줄)
│   │       ├── announce.js    # 공지 모달 markdown 렌더 (178줄)
│   │       ├── image-viewer.js # 이미지 풀스크린 뷰어
│   │       └── version-toggle.js # v1/v2 토글
│   ├── index.html             # v1 (deprecated, server/ 의존)
│   └── ...
├── server/                    # v1 백엔드 (deprecated)
│   └── src/                   # Express + SQLite
├── vercel.json                # 배포 설정
└── README.md
```

## 환경변수

본 프로젝트는 **환경변수가 필요 없습니다** — 모든 키(Supabase Anon, Kakao JS)는 클라이언트에 노출 안전. 단:

- Supabase **Service Role 키는 절대 클라이언트에 노출하지 말 것** (RLS 우회 가능)
- 관리자 권한 변경은 Supabase Dashboard에서 수동으로만

## 알려진 제약

- **카카오 OAuth 로그인 미구현** (이메일/비밀번호만 지원, 2026-05 기준)
- **음식점 검색 기능 미구현** (지도 + 마커로만 탐색)
- **README의 SQL 스키마는 최소 셋업** — 실제 운영 시 인덱스/트리거 추가 권장
- 모바일 풀스크린 reviewPanel은 큰 화면에서만 좌측 슬라이드

## 라이선스

MIT License

## 기여

버그 리포트나 기능 제안은 [Issues](https://github.com/yosyus-Yo/MAPMAPMAP/issues)에 등록해주세요.

---

Made with ❤️ and 🌶️
