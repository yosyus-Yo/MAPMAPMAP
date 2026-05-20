# 맵맵맵 API Documentation

> **작성일**: 2026-05-01
> **데이터 계층**: Supabase (PostgreSQL + Storage + Auth) — 클라이언트 직결 (backend-less)
> **클라이언트 라이브러리**: `public/js/api.js` (전역 `API` 객체)
> **백엔드**: `server/src/routes/` (legacy, 현재 미사용 — Vercel serverless 백업 옵션)

본 문서는 **새 디자인(`public/v2/`) wiring 시 단일 진실 출처(SSOT)**입니다. 클라이언트 메서드와 Supabase 테이블 스키마, 에러 응답을 모두 정리합니다.

---

## 0. 공통 규약

### 0-1. 인증 (Supabase Auth)

```javascript
// 모든 인증된 요청은 supabaseClient가 자동으로 Authorization 헤더 추가
const sb = initSupabase();  // public/js/api.js의 초기화 함수
const { data: { user: authUser } } = await sb.auth.getUser();
if (!authUser) throw new Error('로그인이 필요합니다');
```

세션은 LocalStorage에 자동 저장 (`AppState.setUser`). 페이지 reload 시에도 유지.

### 0-2. 에러 응답 패턴

```typescript
// 성공
{ success: true, ...data }

// 실패
{ success: false, error: "사용자 친화적 한국어 메시지" }
```

또는 클라이언트 함수가 `throw new Error(...)`로 던집니다 (캐치 후 toast 표시).

### 0-3. 환경 변수

| 변수 | 위치 | 용도 |
|---|---|---|
| `KAKAO_MAP_KEY` | server `.env` → `/api/config` 경유 | 카카오맵 SDK 로드 |
| `SUPABASE_URL` | `api.js` 하드코딩 | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | `api.js` 하드코딩 | RLS 보호된 anon key (공개 안전) |
| `SESSION_SECRET` | server `.env` | (현재 미사용, server route 활성화 시 필요) |

---

## 1. Supabase 테이블 스키마

### 1-1. `users`

```sql
CREATE TABLE users (
  id              uuid PRIMARY KEY,           -- Supabase Auth user id와 동기화
  email           text UNIQUE NOT NULL,
  nickname        text NOT NULL,
  phone           text,
  spicy_level     integer DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
  points          integer DEFAULT 0,
  is_admin        boolean DEFAULT false,
  is_beta_tester  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
```

### 1-2. `restaurants`

```sql
CREATE TABLE restaurants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  address       text NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  phone         text,
  category      text,                          -- 한식/중식/분식 등
  avg_level     double precision DEFAULT 0,    -- 승인된 리뷰 평균 맵기
  review_count  integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (name, lat, lng)                       -- 동일 가게 중복 방지
);
```

### 1-3. `reviews`

```sql
CREATE TABLE reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) NOT NULL,
  restaurant_id       uuid REFERENCES restaurants(id) NOT NULL,
  menu_name           text NOT NULL,
  spicy_level         integer NOT NULL CHECK (spicy_level BETWEEN 0 AND 5),
  food_image_url      text NOT NULL,            -- JSON 배열 문자열 (최대 5장)
  receipt_image_url   text NOT NULL,            -- 단일 URL
  comment             text,
  status              text DEFAULT 'pending'    -- 'pending' | 'approved' | 'rejected'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason       text,
  points_given        integer DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);
```

### 1-4. `favorites`

```sql
CREATE TABLE favorites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) NOT NULL,
  restaurant_id   uuid REFERENCES restaurants(id) NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
```

### 1-5. `rewards` (베타테스터 리워드)

```sql
CREATE TABLE rewards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id) NOT NULL,
  reward_type       text NOT NULL,              -- 'review_milestone'
  milestone_count   integer,                     -- 3, 6, 9, ...
  status            text DEFAULT 'pending',      -- 'pending' | 'fulfilled'
  created_at        timestamptz DEFAULT now()
);
```

### 1-6. `access_logs`

```sql
CREATE TABLE access_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id),       -- NULL이면 익명 방문
  session_id    uuid NOT NULL,                    -- 브라우저 탭 단위
  action        text NOT NULL,                    -- 'login' | 'logout' | 'view_restaurant' | ...
  page          text NOT NULL,                    -- window.location.pathname
  metadata      jsonb,                            -- { restaurant_id, query, etc. }
  user_agent    text,
  referrer      text,
  created_at    timestamptz DEFAULT now()
);
```

### 1-7. Storage Buckets

| Bucket | 공개 여부 | 용도 |
|---|---|---|
| `food-images` | Public | 음식 사진 (5장까지) |
| `receipt-images` | Public (또는 Signed URL) | 영수증 사진 |

---

## 2. 클라이언트 API (`public/js/api.js` 전역 `API` 객체)

### 2-1. `API.auth`

#### `signup(email, password, nickname, spicy_level=0, phone=null)`

```javascript
const result = await API.auth.signup('user@example.com', 'pw1234!@', '맵친자', 3, '010-1234-5678');
// → { success: true, user: { id, email, nickname, spicy_level, points, is_admin, is_beta_tester } }
```

**예외**: `이미 등록된 이메일입니다`, `사용자 정보 저장에 실패했습니다`

#### `login(email, password)`

```javascript
const result = await API.auth.login('user@example.com', 'pw1234!@');
// → { success: true, user: {...} }
```

**예외**: `이메일 또는 비밀번호가 올바르지 않습니다`

`users` 테이블에 row가 없으면 자동 생성 (auth-only 사용자 마이그레이션 케이스).

#### `logout()`

```javascript
await API.auth.logout();
// → { success: true }
```

LocalStorage `mapmap_user` 키 삭제 + Supabase 세션 종료 + `access_logs`에 'logout' 기록.

#### `me()`

```javascript
const result = await API.auth.me();
// → { success: true, user: {...} }
```

**예외**: `로그인이 필요합니다`, `사용자를 찾을 수 없습니다`

페이지 mount 시 `AppState.syncWithServer()`에서 호출.

#### `setSpicyLevel(spicy_level)`

```javascript
await API.auth.setSpicyLevel(4);
// → { success: true, spicy_level: 4 }
```

**검증**: `spicy_level ∈ [0, 5]`. 위반 시 RLS/CHECK 위반 에러.

---

### 2-2. `API.restaurants`

#### `list()`

```javascript
const result = await API.restaurants.list();
// → {
//     success: true,
//     restaurants: [
//       { id, name, address, lat, lng, phone, category,
//         avg_level, review_count, created_at,
//         marker_status: 'safe' | 'warning' | 'danger'  // 클라이언트 계산
//       },
//       ...
//     ]
//   }
```

**필터**: `review_count > 0` (승인된 리뷰가 1개 이상인 가게만)
**정렬**: `review_count DESC` (인기순)
**marker_status 계산**:
```javascript
restaurantLevel <= userLevel       → 'safe'    (🟢)
restaurantLevel <= userLevel + 1   → 'warning' (🟡)
otherwise                          → 'danger'  (🔴)
```

#### `get(id)`

```javascript
const result = await API.restaurants.get('uuid-here');
// → {
//     success: true,
//     restaurant: {...},
//     reviews: [
//       { id, menu_name, spicy_level, food_image_url, receipt_image_url, comment,
//         user_nickname, user_level, created_at },
//       ...
//     ],
//     level_stats: { '1': '2.0', '2': '2.5', '3': '3.2', ... }  // user_level별 평균 spicy_level
//   }
```

**부수 효과**: `access_logs`에 `view_restaurant` 기록.

#### `create({ name, address, lat, lng, phone?, category? })`

```javascript
const result = await API.restaurants.create({
  name: '불맛탱탱 짬뽕집',
  address: '서울 종로구 ...',
  lat: 37.5712,
  lng: 126.9810,
  phone: '02-1234-5678',
  category: '중식'
});
// → { success: true, restaurant: {...}, existed: boolean }
```

**중복 처리**: `(name, lat, lng)`이 같으면 기존 row 반환 (`existed: true`).

---

### 2-3. `API.reviews`

#### `create(formData)` 🔴 핵심

```javascript
const formData = new FormData();
formData.append('restaurant_id', 'uuid');     // 또는 restaurant_name + address + lat + lng
formData.append('menu_name', '불맛 짬뽕');
formData.append('spicy_level', 3);
formData.append('comment', '진짜 매운데...');
formData.append('food_images', file1);          // 다중 가능
formData.append('food_images', file2);
formData.append('receipt_image', receiptFile);

const result = await API.reviews.create(formData);
// → {
//     success: true,
//     review: { id, status: 'pending' },
//     message: '제보가 접수되었습니다. 검수 후 포인트가 적립됩니다.'
//   }
```

**제약**:
- 음식 사진: 1~5장 (필수)
- 영수증 사진: 1장 (필수)
- 파일 크기: 각 5MB 이하 (multer limit)
- 포맷: JPG/PNG/GIF/WEBP/HEIC

**플로우**:
1. 음식 이미지 → `food-images` 버킷 업로드 → public URL 획득
2. 영수증 이미지 → `receipt-images` 버킷 업로드
3. (`restaurant_id` 없으면) `restaurants` insert (또는 기존 매칭)
4. `reviews` insert (`status='pending'`, `food_image_url=JSON.stringify(urls)`)
5. `access_logs`에 `submit_review` 기록

#### `myList()`

```javascript
const result = await API.reviews.myList();
// → { success: true, reviews: [
//      { ...review, restaurant_name: '...' },  // JOIN으로 가게명 포함
//      ...
//    ]}
```

#### `delete(id)`

```javascript
await API.reviews.delete('review-uuid');
// → { success: true, message: '리뷰가 삭제되었습니다' }
```

**권한**: 본인 리뷰만 삭제 가능. 위반 시 `본인의 리뷰만 삭제할 수 있습니다`.
**부수 효과**: 승인된 리뷰 삭제 시 `restaurants.avg_level`/`review_count` 재계산.

---

### 2-4. `API.admin` (관리자 전용)

모든 메서드 사전에 `users.is_admin = true` 확인. 위반 시 `관리자 권한이 필요합니다`.

#### `getReviews(status='')`

```javascript
const result = await API.admin.getReviews('pending');
// → {
//     success: true,
//     reviews: [
//       { ...review, user_nickname, user_email, is_beta_tester,
//         restaurant_name, restaurant_address },
//       ...
//     ],
//     stats: { pending: 12, approved: 348, rejected: 7 }
//   }
```

**status 필터**: `'pending' | 'approved' | 'rejected'` 또는 빈 문자열(=전체).

#### `getStats()`

```javascript
const result = await API.admin.getStats();
// → {
//     success: true,
//     stats: {
//       users: 1247, betaTesters: 32, restaurants: 215,
//       reviews: { pending: 12, approved: 348, rejected: 7 }
//     }
//   }
```

#### `approve(id)`

```javascript
await API.admin.approve('review-uuid');
// → { success: true, message: '승인 완료' }
```

**부수 효과**:
1. `reviews.status = 'approved'` + `points_given = POINTS_REWARD` (현재 0)
2. (포인트 > 0이면) `users.points` 증액
3. `restaurants.avg_level` + `review_count` 재계산
4. (베타테스터인 경우) 승인 카운트가 3의 배수면 `rewards` insert

#### `reject(id, reason)`

```javascript
await API.admin.reject('review-uuid', '영수증 식별 불가');
// → { success: true, message: '반려 완료' }
```

#### `deleteReview(id)`

```javascript
await API.admin.deleteReview('review-uuid');
// → { success: true, message: '리뷰가 삭제되었습니다' }
```

본인 제약 없음 (관리자는 모든 리뷰 삭제 가능).

---

### 2-5. `API.favorites`

#### `list()`

```javascript
const result = await API.favorites.list();
// → { success: true, favorites: [
//      { id, restaurant_id, name, address, lat, lng, category,
//        avg_level, review_count, created_at },
//      ...
//    ]}
```

#### `check(restaurantId)`

```javascript
const result = await API.favorites.check('uuid');
// → { success: true, isFavorite: boolean }
```

비로그인 시 `isFavorite: false`.

#### `add(restaurantId)`

```javascript
await API.favorites.add('uuid');
// → { success: true, message: '찜 목록에 추가되었습니다' }
```

**예외**: `이미 찜한 맛집입니다`.
**부수 효과**: `access_logs.action='add_favorite'`.

#### `remove(restaurantId)`

```javascript
await API.favorites.remove('uuid');
// → { success: true, message: '찜 목록에서 제거되었습니다' }
```

---

## 3. 카카오맵 통합 (Step 2 추출 모듈)

### 3-1. `MapModule.load()` — SDK 로드

```javascript
await MapModule.load();
// 내부:
// 1. fetch('/api/config') → { kakaoMapKey: '...' }
// 2. <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&libraries=services&autoload=false"> 동적 추가
// 3. kakao.maps.load(callback)으로 SDK 초기화 대기
```

### 3-2. `MapModule.initMap(containerId, opts?)`

```javascript
const map = MapModule.initMap('kakao-map', { lat: 37.5665, lng: 126.9780, level: 5 });
// → kakao.maps.Map 인스턴스, ZoomControl 자동 추가
```

### 3-3. `MapModule.addMarker(map, restaurant, onClick?)`

```javascript
restaurants.forEach(r => {
  MapModule.addMarker(map, r, (clicked) => {
    showDetailSheet(clicked.id);
  });
});
// CustomOverlay로 가격 라벨 마커 + 클릭 이벤트
```

### 3-4. `MapModule.moveToMyLocation(map)`

```javascript
try {
  const { lat, lng } = await MapModule.moveToMyLocation(map);
  console.log('내 위치:', lat, lng);
} catch (e) {
  alert('위치 권한을 허용해주세요');
}
```

### 3-5. `MapModule.searchByKeyword(keyword, map)`

```javascript
const results = await MapModule.searchByKeyword('짬뽕', map);
// → kakao.maps.services.Places 결과 배열:
//   [{ place_name, address_name, x: lng, y: lat, distance, ... }, ...]
```

`map.getCenter()` 기준 5km 반경 검색. 사용 예: 검색바 input → 결과를 좌측 panel에 렌더링.

---

## 4. 백엔드 Express 라우트 (현재 미사용, legacy 참고용)

> 클라이언트는 `api.js`의 Supabase 직결을 사용하므로 아래 라우트는 **호출되지 않습니다**.
> 다만 `/api/config`는 Step 2의 `MapModule.load()`에서 사용.

### 4-1. 활성 라우트 (사용 중)

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/config` | `{ kakaoMapKey }` 반환 (Step 2 카카오맵 로드용) |
| GET | `/api/health` | 헬스체크 (`{ success, status: 'healthy', timestamp }`) |

### 4-2. Legacy 라우트 (미사용 — 참고용)

`server/src/routes/`에 23개 엔드포인트 존재하지만 프론트는 supabase-js 직결 사용. 향후 RLS 우회가 필요하거나 서버사이드 검증 강화 시 활성화 가능.

| 그룹 | 엔드포인트 |
|---|---|
| auth | POST signup / POST login / POST logout / GET me / PUT spicy-level |
| restaurants | GET / / GET /:id / POST / |
| reviews | POST / / GET /my / GET /my/stats / DELETE /:id |
| admin | GET /reviews / GET /stats / PUT /reviews/:id/approve / PUT /reviews/:id/reject / PUT /users/:id/beta-tester / GET /beta-testers / DELETE /reviews/:id |
| favorites | GET / / GET /check/:id / POST /:id / DELETE /:id |

스키마는 `api.js`의 클라이언트 함수와 1:1 매핑.

---

## 5. RLS (Row Level Security) 핵심 정책

> 자세한 SQL은 프로젝트 루트의 `supabase-rls-policies.sql` 참조.

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | 본인만 | (Auth가 처리) | 본인만 (`spicy_level`, `nickname` 등) | ✗ |
| `restaurants` | 모두 | 인증 사용자 | 관리자만 (avg_level/review_count는 함수로) | ✗ |
| `reviews` | `status='approved'` 모두 + 본인 모두 | 본인 (status='pending' 강제) | 관리자 (status 변경) | 본인 또는 관리자 |
| `favorites` | 본인만 | 본인 | ✗ | 본인 |
| `rewards` | 본인만 | 시스템 함수 | 관리자 (status='fulfilled') | ✗ |
| `access_logs` | 관리자만 | 모두 (anonymous 포함) | ✗ | ✗ |

**핵심**: `auth.uid() = user_id` 조건 + `is_admin` 체크.

---

## 6. 새 디자인(v2) 통합 시 매핑 표

각 view가 사용해야 할 API와 카카오맵 메서드:

| View | 사용할 API | 카카오맵 |
|---|---|---|
| 1. 온보딩 | `API.auth.signup` / `API.auth.login` | — |
| 2. 맵레벨 | `API.auth.setSpicyLevel` | — |
| 3. 메인 지도 | `API.restaurants.list` | `MapModule.load`, `initMap`, `addMarker`, `moveToMyLocation`, `searchByKeyword` |
| 4. 맛집 상세 | `API.restaurants.get(id)` + `API.favorites.check/add/remove` | `MapModule.initMap` (미니맵) |
| 5. 리뷰 작성 | `API.reviews.create(formData)` | `MapModule.searchByKeyword` (가게 검색) |
| 6. 마이페이지 | `API.reviews.myList`, `API.reviews.myStats` (베타), `API.favorites.list` | — |
| 7. 관리자 | `API.admin.getReviews`, `getStats`, `approve`, `reject`, `deleteReview` | — |

---

## 7. 확장 — 향후 추가 가능 기능

본 리뉴얼 범위 밖이지만 명시:

- **마커 클러스터링**: `kakao.maps.MarkerClusterer` 또는 `MarkerClustering.js` (50+ 마커 시 권장)
- **카테고리 필터**: `restaurants.category` 컬럼 활용 (한식/중식/분식)
- **실시간 알림**: Supabase Realtime으로 리뷰 승인 시 푸시
- **검색 자동완성**: `kakao.maps.services.Geocoder` 또는 자체 trigram 인덱스
- **이미지 최적화**: Supabase Storage Transform (`/render/image/...`)
- **OAuth 소셜 로그인**: 카카오/네이버 (Supabase Auth providers 활성)

---

## 8. 참고 파일

| 파일 | 설명 |
|---|---|
| `public/index.html` | 원본 (5,466줄) |
| `public/js/api.js` | 클라이언트 API 라이브러리 (1,113줄) |
| `public/v2/index.html` | 신 디자인 (계획서 Step 3 결과) |
| `server/src/routes/*.js` | Legacy 백엔드 라우트 (미사용) |
| `server/src/app.js` | Express 앱 설정 (`/api/config`만 활성) |
| `supabase-schema.sql` | 테이블 DDL |
| `supabase-rls-policies.sql` | RLS 정책 |
| `supabase-access-logs.sql` | access_logs 테이블 |
| `docs/renewal/RENEWAL_PLAN.md` | 본 문서 자매편 — 마이그레이션 계획 |

---

**문서 끝**. 추가 명세나 누락된 메서드가 있으면 알려주세요.
