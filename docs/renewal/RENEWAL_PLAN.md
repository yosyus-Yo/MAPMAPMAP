# 맵맵맵 리뉴얼 구현 계획서

> **작성일**: 2026-05-01
> **대상**: `public/index.html` (5,466줄, 원본) → `design-preview/index.html` (2,013줄, 새 디자인) 마이그레이션
> **원칙**: **원본은 변경하지 않음** (롤백 가능). 신구 버전 토글로 점진 전환.

---

## 1. TL;DR — 결론부터

| 질문 | 답 | 비고 |
|---|---|---|
| 원본에 "리뉴얼 페이지" 버튼 만들 수 있나? | ✅ 가능 (10줄 추가) | `?ui=v2` 쿼리 또는 `/v2/` 경로 |
| 새 디자인이 백엔드와 연결될 수 있나? | ✅ 가능 | 기존 `public/js/api.js`를 그대로 import만 하면 됨 (Supabase 직결, backend-less) |
| 카카오맵·줌·검색 다 붙일 수 있나? | ✅ 가능 | 기존 코드(`public/index.html` L4234~L5410)를 함수로 추출해 `public/js/map.js`로 분리 후 v2에서 재사용 |
| 예상 작업량 | **3~5일** | Step 1(버튼) 30분 / Step 2(JS 추출) 1일 / Step 3(v2 통합) 2~3일 / Step 4(QA) 1일 |
| 리스크 | **중간** | 단일 5,466줄 HTML의 의존성 그래프가 암묵적 — 추출 시 누락 리스크 |

---

## 2. 현재 아키텍처 (실측)

### 2-1. 핵심 발견: **Backend-Less 구조**

`server/` 디렉토리는 존재하지만, **프론트엔드는 백엔드를 거의 사용하지 않습니다**:

```
public/index.html  ──>  public/js/api.js  ──>  Supabase (직결)
                          (supabase-js SDK)         │
                                                    ├─ Auth (signUp/signIn)
                                                    ├─ DB (users/restaurants/reviews/favorites)
                                                    └─ Storage (food-images/receipt-images)

server/src/  →  사실상 dead code (또는 Vercel serverless 백업용)
              유일한 활용: GET /api/config (KAKAO_MAP_KEY 환경변수 노출용)
```

**근거** (`public/js/api.js`):
- L6-7: `SUPABASE_URL`, `SUPABASE_ANON_KEY` 하드코딩 (브라우저 직결, RLS로 보안)
- L25-862: 모든 `API.auth/restaurants/reviews/admin/favorites`가 `supabaseClient.from(...)` 직접 호출
- 백엔드 `/api/auth/*`, `/api/restaurants/*` 등은 **호출되지 않음**

**의미**: 새 디자인도 `api.js`를 그대로 import하면 백엔드 추가 작업 **0**. Supabase RLS만 잘 설정돼 있으면 끝.

### 2-2. 기존 기능 인벤토리 (`public/index.html` 기준)

| 기능 | 위치 | 카카오맵 의존 |
|---|---|:---:|
| 카카오맵 SDK 로드 | L5366: `dapi.kakao.com/v2/maps/sdk.js?...&libraries=services` | ✓ |
| 지도 초기화 + 줌 컨트롤 | L4234-4241: `kakao.maps.Map`, `ZoomControl` | ✓ |
| 내 위치 가져오기 + 이동 | L4251-4354: `navigator.geolocation` + `setCenter`/`setLevel` | ✓ |
| 가게 마커 (가격 라벨) | L4339-4392: `kakao.maps.CustomOverlay` | ✓ |
| 가게 상세 모달 + 미니맵 | L4633-4643: `Map` + `Marker` | ✓ |
| **가게 이름 검색** | L5271-5301: `kakao.maps.services.Places.keywordSearch` | ✓ |
| Smart Filtering (Safe/Warning/Danger) | `api.js` L221-229: 클라이언트 계산 | — |
| 리뷰 작성 (사진 5장 + 영수증) | `api.js` L323-462: Supabase Storage 업로드 | — |
| 회원가입/로그인 | `api.js` L28-192: Supabase Auth | — |
| 마이페이지 (베타테스터 리워드) | `api.js` L464-487 + 추가 통계 | — |
| 관리자 대시보드 | `api.js` L539-758: 리뷰 승인/반려/베타테스터 관리 | — |
| 접속 로깅 | `api.js` L1013-1102: `access_logs` 테이블 자동 기록 | — |

### 2-3. 새 디자인 (design-preview) 인벤토리

7개 view, 가짜 데이터, 가짜 지도(회색 그리드):

| View | 현재 상태 | 백엔드 연결 후 필요 작업 |
|---|---|---|
| 1. 온보딩 | UI만 완성, form submit 로직 없음 | `API.auth.signup/login` wire |
| 2. 맵레벨 설정 | UI만, click 핸들러는 selected만 토글 | `API.auth.setSpicyLevel` wire |
| 3. 메인 지도 | 가짜 회색 지도 + 가짜 마커 8개 | **카카오맵 통합 (핵심)** + `API.restaurants.list` |
| 4. 맛집 상세 | 가짜 데이터 시트 | `API.restaurants.get(id)` + 미니맵 |
| 5. 리뷰 작성 | UI만, 사진 업로드 동작 안 함 | `API.reviews.create(formData)` wire |
| 6. 마이페이지 | 가짜 통계 + 리뷰 3개 | `API.reviews.myList` + `API.reviews.myStats` |
| 7. 관리자 | 가짜 대기 5건 + 활동 5건 | `API.admin.getReviews/getStats/approve/reject` |

---

## 3. 마이그레이션 전략 — 4단계

### Step 1. **버튼 + 라우팅** (30분)

원본 `public/index.html`의 헤더에 "🆕 새 디자인 체험하기" 버튼 추가:

```html
<!-- public/index.html, header 영역 (L2912 근처) 우측 끝에 추가 -->
<a href="/v2/" class="renewal-cta-btn" target="_self">
  🆕 새 디자인 체험
</a>
<style>
  .renewal-cta-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 8px 14px; border-radius: 999px;
    background: linear-gradient(135deg, #c5171e 0%, #ff6b35 100%);
    color: white; font-weight: 700; font-size: 13px;
    text-decoration: none; box-shadow: 0 2px 8px rgba(197,23,30,.25);
    transition: transform 0.15s;
  }
  .renewal-cta-btn:hover { transform: translateY(-1px); }
</style>
```

**되돌리기 버튼**도 v2에 추가:
```html
<!-- design-preview/index.html (이후 public/v2/index.html), 헤더 우측 -->
<a href="/" class="back-to-classic">← 기존 버전으로</a>
```

**라우팅**: `public/v2/index.html`로 design-preview를 복사 → 정적 파일이므로 별도 라우터 불필요. Vercel/Express 둘 다 자동 처리.

### Step 2. **공통 JS 추출** (1일)

`public/index.html`의 카카오맵·검색·내 위치 로직을 `public/js/map.js`로 분리:

```javascript
// public/js/map.js (신규, ~400줄 예상)
export const MapModule = {
  // 카카오맵 SDK 동적 로드 (Promise 반환)
  async load() {
    const config = await fetch('/api/config').then(r => r.json());
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${config.kakaoMapKey}&libraries=services&autoload=false`;
      script.onload = () => kakao.maps.load(resolve);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  // 지도 초기화
  initMap(containerId, opts = {}) {
    const container = document.getElementById(containerId);
    const map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(opts.lat ?? 37.5665, opts.lng ?? 126.9780),
      level: opts.level ?? 5,
    });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    return map;
  },

  // 마커 (가격 라벨 스타일)
  addMarker(map, restaurant, onClick) {
    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(restaurant.lat, restaurant.lng),
      content: `<div class="pin pin-${restaurant.marker_status}">
        <span class="lvl">${restaurant.avg_level}</span>${restaurant.menu_price.toLocaleString()}원
      </div>`,
      yAnchor: 1,
      clickable: true
    });
    overlay.setMap(map);
    if (onClick) {
      // CustomOverlay는 click 이벤트가 없어 DOM에서 처리
      setTimeout(() => {
        overlay.getContent().querySelector('.pin').addEventListener('click', () => onClick(restaurant));
      }, 0);
    }
    return overlay;
  },

  // 내 위치
  async moveToMyLocation(map) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation 미지원'));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latLng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          map.setCenter(latLng);
          map.setLevel(4);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        reject,
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  },

  // 가게 이름 검색
  async searchByKeyword(keyword, map) {
    return new Promise((resolve, reject) => {
      const places = new kakao.maps.services.Places();
      places.keywordSearch(keyword, (result, status) => {
        if (status === kakao.maps.services.Status.OK) resolve(result);
        else if (status === kakao.maps.services.Status.ZERO_RESULT) resolve([]);
        else reject(new Error(`검색 실패: ${status}`));
      }, { location: map.getCenter(), radius: 5000 });
    });
  }
};
```

**원본도 이 모듈을 점진적으로 사용하도록** 리팩터 가능 (옵션 — 즉시 안 해도 됨, v2만 사용해도 충분).

### Step 3. **v2 통합** (2~3일)

`design-preview/index.html` → `public/v2/index.html`로 복사 후 7개 view를 실제 API로 wire:

#### 3-1. 공통 wire (모든 view 공통)

```html
<!-- public/v2/index.html <head> 끝부분 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/js/api.js"></script>
<script type="module" src="/js/map.js"></script>
```

#### 3-2. View별 wiring 작업

| View | 변경 내용 | 예상 시간 |
|---|---|:---:|
| 1. 온보딩 | `<form id="form-login">`에 `submit` → `API.auth.login` | 30분 |
| 2. 맵레벨 | `.level-option` 클릭 → 선택 + "설정 완료" → `API.auth.setSpicyLevel` | 20분 |
| 3. **메인 지도** | `<div class="map-stage">` 내부 가짜 grid 제거, 그 자리에 `<div id="kakao-map">` + `MapModule.load()` + `API.restaurants.list()` + `MapModule.addMarker` for each | **3~4시간** |
| 3-1. 검색 | `.search-input` `input` 이벤트 → `MapModule.searchByKeyword` → 결과를 panel 좌측 list에 표시 | 1시간 |
| 3-2. 내 위치 | `.cta-icon[title="내 위치"]` click → `MapModule.moveToMyLocation` | 10분 |
| 3-3. 줌 | `kakao.maps.ZoomControl` 자동 추가 (MapModule에서) — 추가 작업 없음 | — |
| 3-4. Smart Filter | `.pill` 클릭 → 마커 색상 (CSS class 토글) | 30분 |
| 4. 맛집 상세 | `.rest-card` click → `API.restaurants.get(id)` → 시트에 reviews 렌더링 + 미니맵 | 1.5시간 |
| 5. 리뷰 작성 | `<form>` 5단계 → `FormData` 조립 → `API.reviews.create` | 1시간 |
| 6. 마이페이지 | mount 시 `API.reviews.myList` + `myStats` → 카드 동적 렌더 | 1시간 |
| 7. 관리자 | mount 시 `API.admin.getReviews('pending')` + `getStats` → 테이블 렌더 + approve/reject 버튼 wire | 2시간 |

**총 예상**: 11~13시간 ≈ 1.5일 집중 작업

### Step 4. **QA + 배포** (1일)

- [ ] 7 view 모두 데스크톱(1440)/태블릿(900)/모바일(390)에서 시각 검증 (playwright)
- [ ] Supabase 실제 데이터로 e2e (회원가입 → 레벨 설정 → 지도 → 리뷰 → 마이 → 관리자)
- [ ] 카카오맵: 줌 in/out, 마커 클릭 → 상세, 검색 키워드 ≥ 5건 테스트
- [ ] 모바일: 하단 탭 nav, 시트 collapse, 터치 인터랙션
- [ ] Vercel deploy: 기존 `vercel.json`은 SPA fallback이라 `/v2/` 정적 파일이 그대로 서빙됨 (별도 설정 불필요)
- [ ] A/B: 헤더 버튼으로 신구 버전 토글 가능한지 확인

---

## 4. 기술적 고려사항

### 4-1. Supabase RLS (Row Level Security)

`api.js`의 backend-less 구조는 **RLS에 100% 의존**합니다. 새 디자인이 같은 RLS 정책 아래 동작하므로 **추가 작업 없음**. 다만 신규 view에서 새 쿼리(예: `access_logs` 일별 집계)를 추가할 경우 RLS 정책 점검 필요.

확인 명령:
```sql
-- supabase-rls-policies.sql 참조
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 4-2. 카카오맵 API 키

- 현재: 백엔드 `/api/config`가 환경변수에서 노출 (좋은 패턴)
- 새 디자인도 같은 endpoint 사용 권장
- 키 도메인 등록 필수: 카카오 개발자 사이트 > 플랫폼 > Web > 사이트 도메인에 `localhost:3000`, `xn--v69ak0xskm.com` 등 등록

### 4-3. Smart Filtering 로직 (보존)

```javascript
// 클라이언트 계산 (api.js L221-229)
function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) return 'safe';      // 🟢
  if (restaurantLevel <= userLevel + 1) return 'warning'; // 🟡
  return 'danger';                                        // 🔴
}
```

새 디자인에서도 **그대로 사용**. design-preview의 마커 색상 클래스(`.map-marker.safe/warning/danger`)와 1:1 매핑됨.

### 4-4. 베타테스터 리워드 시스템

`api.js`에 이미 구현된 "3개 승인 시 리워드" 로직 그대로 사용. 마이페이지 view에 reward 진행률 위젯 추가 (선택):

```html
<div class="reward-progress-card">
  <h4>🎁 다음 리워드까지</h4>
  <div class="progress-bar"><div class="fill" style="width: 67%"></div></div>
  <p>승인 2/3 — 1개 더 승인되면 리워드!</p>
</div>
```

### 4-5. 접속 로깅 (자동 적용)

`api.js`의 `logAccess` 함수가 Supabase로 직접 기록 — 새 디자인 어떤 페이지에서든 자동 작동. 추가 작업 0.

---

## 5. 디렉토리 구조 (After)

```
mapmadmap_complete/
├── public/
│   ├── index.html                  ← 원본 (변경 없음)
│   ├── admin.html                  ← 원본 (변경 없음)
│   ├── js/
│   │   ├── api.js                  ← 기존 (재사용)
│   │   └── map.js                  ← 🆕 추출된 카카오맵 모듈
│   └── v2/
│       └── index.html              ← 🆕 design-preview에서 마이그레이션 + 실 API wired
├── design-preview/
│   └── index.html                  ← 디자인 mockup (참조용 보존, 또는 제거)
├── server/                         ← 기존 (변경 없음, /api/config만 사용)
└── docs/renewal/
    ├── RENEWAL_PLAN.md             ← 본 문서
    └── API_DOCS.md                 ← API 명세서
```

---

## 6. 작업 순서 (체크리스트)

### Phase 1: 준비 (Day 0)
- [ ] git branch `feature/renewal-v2` 생성
- [ ] `docs/renewal/` 디렉토리에 본 계획서 + API_DOCS 커밋
- [ ] Supabase RLS 정책 백업 (`pg_dump --schema-only`)

### Phase 2: 신구 라우팅 + JS 추출 (Day 1)
- [ ] `public/index.html` 헤더에 "🆕 새 디자인" 버튼 추가
- [ ] `public/v2/index.html`로 design-preview 복사
- [ ] `public/js/map.js` 추출 (위 Step 2 코드 기반)
- [ ] v2에 `<script src="/js/api.js"></script>` 추가, 동작 확인 (콘솔 에러 0)

### Phase 3: View Wiring (Day 2-3)
- [ ] V1 (온보딩): `API.auth.login/signup` wire
- [ ] V2 (맵레벨): `API.auth.setSpicyLevel` wire
- [ ] V3 (메인 지도): `MapModule.load` + `API.restaurants.list` + 마커 + 검색 + 내 위치 + 줌
- [ ] V4 (맛집 상세): `API.restaurants.get` + 시트 렌더링
- [ ] V5 (리뷰 작성): `FormData` 조립 + `API.reviews.create`
- [ ] V6 (마이페이지): `API.reviews.myList` + 동적 카드
- [ ] V7 (관리자): `API.admin.*` wire (관리자 권한 가드 포함)

### Phase 4: QA + 배포 (Day 4)
- [ ] 7 view × 3 viewport playwright 스크린샷
- [ ] e2e 시나리오 1: 회원가입 → 레벨 → 리뷰 작성 → 마이페이지 (실 Supabase)
- [ ] e2e 시나리오 2: 관리자 로그인 → 리뷰 승인 → 베타테스터 리워드 트리거
- [ ] Vercel preview deploy → 사용자 베타 테스트
- [ ] 이슈 수집 + 수정
- [ ] main merge + production deploy

### Phase 5: 모니터링 (Day 5+)
- [ ] `access_logs.action='visit_authenticated'` 중 v2 path 비율 모니터
- [ ] 사용자 피드백 수집 (디자인/UX)
- [ ] 1주 후 v1 deprecate 결정

---

## 7. 리스크 + 완화책

| 리스크 | 가능성 | 영향 | 완화책 |
|---|:---:|:---:|---|
| 5,466줄 단일 HTML의 암묵적 의존성 누락 | 높음 | 중간 | 신구 버전 **공존**으로 v2 깨져도 v1로 fallback. 헤더 버튼이 양쪽에서 작동 |
| 카카오맵 API 키 도메인 미등록 | 중간 | 중간 | Step 4 QA 첫 항목에 포함, Vercel preview URL도 미리 등록 |
| Supabase RLS가 v2의 새 쿼리 패턴 차단 | 낮음 | 높음 | Step 1에서 RLS 백업, Day 2에 v2 read 시나리오 모두 supabase studio에서 SQL 직접 테스트 |
| design-preview의 가짜 데이터 일부가 실 데이터 스키마와 안 맞음 | 중간 | 낮음 | API_DOCS.md의 스키마를 **단일 진실 출처**로 삼고, view 작업 시 매번 대조 |
| 모바일 viewport에서 카카오맵 터치 제스처 충돌 (하단 시트 swipe와) | 중간 | 중간 | 시트의 `overflow: auto` 영역과 지도 영역 분리 + `touch-action: pan-y`로 명시 |

---

## 8. 그 외 — 결정 필요한 사항

다음 항목들은 **사용자 결정 필요**:

1. **v2를 영구 신버전으로 할 것인가, A/B 테스트 후 결정할 것인가?**
   - 권장: 2주 A/B → access_logs 분석 후 v1 deprecate
2. **design-preview/ 디렉토리는 보존할 것인가?**
   - 권장: `archive/design-mockup/`로 이동 + README에 "초기 디자인 검토용"
3. **카카오맵에 진짜 가게 마커 클러스터링 적용할 것인가?**
   - 거지맵은 사용 중 (`MarkerClustering.js`). 마커 50개+ 시 권장. 본 계획서에는 미포함 (Phase 5 옵션)
4. **관리자 페이지에 별도 인증 추가할 것인가?**
   - 현재: `users.is_admin` 플래그 + 클라이언트 가드. 보안 강화 시 RLS 정책에 admin role 추가 필요

---

## 9. 다음 단계

**즉시 실행 가능한 첫 작업**: Phase 2의 첫 항목 — 원본 헤더에 버튼 추가 (30분).

```bash
# 작업 시작
cd /Users/seohun/Documents/에이전트/infiniteAgent/mapmadmap_complete
git checkout -b feature/renewal-v2
# public/index.html 편집 시작
```

진행 의사를 알려주시면 단계별로 실제 구현에 들어갑니다.

---

## 참고 — API 명세서

상세 API 스키마는 `API_DOCS.md` 별도 파일 참조.
