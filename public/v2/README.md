# public/v2/ — 신버전 (Stage B 진입, 토글 배포)

> **상태**: 🚀 Stage B (병행 운영 — 구버전과 토글)
> **배포 여부**: ✅ Vercel 배포 포함 — `https://<domain>/v2/`로 접근
> **이전 단계**: Stage A (public-v2/ 로컬 전용) → 2026-05-18에 Stage B 진입
> **생성일**: 2026-05-18

## 목적

기존 `public/index.html` (구버전, 프로덕션) 옆에 `public/v2/`를 두고, 헤더 토글 버튼으로 구버전 ↔ 신버전 전환 가능. 사용자 피드백 수집 후 Stage C (신버전 확정)로 승격.

## 접근 경로

- 구버전: `https://<domain>/` (변경 없음, 기존 그대로)
- 신버전: `https://<domain>/v2/` (Stage B에 추가)

## 토글 동작

- 구버전 헤더 상단 중앙: 🆕 **신버전 체험** 버튼 → 클릭 시 `localStorage['mmm_version_pref']='v2'` + `/v2/`로 이동
- 신버전 상단 중앙: 📜 **구버전** 버튼 → 클릭 시 `localStorage['mmm_version_pref']='v1'` + `/`로 이동
- 자동 redirect: 사용자가 `/`로 접근했을 때 `mmm_version_pref==='v2'`이면 `/v2/`로 자동 이동 (구버전 index.html에 inline script 있음)

## 디렉토리 구조

```
public/v2/
├── index.html      # 신버전 SPA (7-view: 온보딩/레벨/지도/상세/리뷰/마이/관리자)
├── css/
│   ├── tokens.css        # 디자인 토큰
│   ├── announce.css      # 환영 팝업
│   ├── sidebar-reviews.css # 사이드바 카드
│   ├── image-viewer.css  # 큰 이미지 viewer
│   └── version-toggle.css # 구버전 토글 버튼
├── js/
│   ├── api.js            # Supabase 직접 호출 + reviews.recentApproved 메서드
│   ├── announce.js       # 환영 팝업 + localStorage hide
│   ├── image-viewer.js   # 사진 클릭 fullscreen viewer
│   └── version-toggle.js # 구버전으로 토글
├── img/
├── logo.svg
└── README.md
```

## 로컬 실행

```bash
# 프로젝트 루트에서
bash scripts/dev-v2.sh
# → http://localhost:8080 접속
```

또는 직접:
```bash
cd public/v2 && python3 -m http.server 8080
```

## 통합 작업 진행 현황

| Phase | 작업 | 상태 |
|:-:|---|:-:|
| 0a | server/ → server-archive/ | ✅ |
| 0b | api/ → api-archive/ | ✅ |
| 1a | .vercelignore 생성 | ✅ |
| 1b | public-v2/ 디렉토리 + 시안 복사 | ✅ |
| 1c | README + dev-v2.sh | 🔄 (현재) |
| 2 | 시안 CSS 변수 → css/tokens.css 분리 | ⏸ |
| 3 | api.js에 reviews.recentApproved() 추가 | ⏸ |
| 4 | 시안 mock 데이터 → 실 API 연동 | ⏸ |
| 5 | 환영 팝업 (announce.js + 버전 키) | ⏸ |
| 6 | 로컬 smoke test | ⏸ |
| --- | **Stage B 진입** (public-v2 → public/v2 + 토글) | ⏸ |
| 7 | public/v2/ 이동 + 헤더 토글 버튼 | ⏸ |
| 8 | Vercel rewrites 설정 | ⏸ |
| 9 | 사용자 피드백 1-2주 수집 | ⏸ |
| --- | **Stage C 진입** (신버전 확정) | ⏸ |
| 10 | public/index.html을 신버전으로 교체, legacy/ 보관 | ⏸ |

## 환경 정책 (사용자 결정 2026-05-18)

### Supabase: prod 그대로 사용

신버전과 구버전이 **같은 데이터를 read/write** 하는 것이 본 통합의 목적이므로 별도 dev 프로젝트를 만들지 않습니다.
- Read: RLS가 권한을 보호하므로 무해.
- Write: 사용자 본인이 하는 행위는 구버전과 본질적으로 동일.

### 운영 가이드 (선택, 정리 편의용)

개발 중 본인이 만드는 테스트성 데이터에 prefix를 붙이면 나중에 일괄 정리가 쉽습니다 (의무 아님):

| 대상 | prefix 예시 |
|---|---|
| 테스트 리뷰 menu_name | `[TEST_V2] 짬뽕` |
| 테스트 맛집 name | `[V2_DEV] 가게이름` |

정리할 때:
```sql
-- admin.html 또는 Supabase SQL Editor
SELECT id, menu_name FROM reviews WHERE menu_name LIKE '[TEST_V2]%';
DELETE FROM reviews WHERE menu_name LIKE '[TEST_V2]%';
```

### 카카오맵 API 키
`public/index.html` line 5264 `KAKAO_MAP_KEY = '80397851...'` 하드코딩. 신버전도 동일 키 사용.
**도메인 제한 없음** (사용자 확인 2026-05-18) — localhost에서 그대로 작동.

## 디자인 통합 계획 (시안 ↔ 신버전)

### 시안에서 가져올 것
- ✅ `data-view` SPA 구조 (7-view 토글)
- ✅ CSS 변수 체계 (`--spice`, `--gradient`, `--r-md`)
- ✅ 좌측 지도 + 우측 사이드바 레이아웃
- ✅ 모바일 peek bottom-sheet
- 🔄 Floating pill nav (모바일만, 데스크탑은 헤더 유지)

### 시안에서 변경할 것
- ❌ "매운맛 랭킹" 사이드바 → ✅ "최신 리뷰" 사이드바
- ❌ 정적 mock 데이터 (`.pin`, `<div class="sb-row">`) → ✅ Supabase 실데이터
- ❌ 이메일/비밀번호 placeholder `inhiyu@gmail.com` 등 → ✅ 빈 값

### 신규 추가
- ✅ 첫 진입 시 환영 팝업 (사용방법 + 공지)
  - "1일간 보지 않기" → `localStorage['mmm_announce_hide_v1']`
  - 공지 갱신 시 `ANNOUNCE_VERSION` bump → 자동 재표시

## 신규 API 메서드 (Phase 3에서 추가 예정)

`js/api.js`에 추가할 메서드:

```js
API.reviews.recentApproved(limit = 20) {
  // reviews 테이블 status='approved' + users + restaurants join
  // created_at desc, limit 적용
  // 우측 사이드바에서 사용
}
```

## 관련 문서

- 원본 통합 계획 (turn 1-3): self-evolving-agent-system 세션 기록
- 시안 원본: `../design-preview/variants/linear-blaze-v2.html` (수정 금지 — 디자인 참조용)
- archive 사유: `../server-archive/README.md`

## 이 폴더의 라이프사이클

- **Stage A (현재)**: `public-v2/` 위치, git 추적 O, Vercel 배포 X
- **Stage B (안정화 후)**: `public/v2/`로 이동, Vercel 배포 O, 토글 버튼으로 접근
- **Stage C (확정 후)**: `public/index.html`로 승격, 구버전은 `public/legacy/`로 한 달 보관
