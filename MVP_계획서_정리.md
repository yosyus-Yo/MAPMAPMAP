# 맵맵맵(MapMapMap) MVP 프로젝트 정리 문서

> 생성일: 2025-12-26
> 버전: v2.0
> 상태: MVP 기획 및 프로토타입 완료

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [핵심 가치 제안](#2-핵심-가치-제안)
3. [MVP 기능 요약](#3-mvp-기능-요약)
4. [기술 스택](#4-기술-스택)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [API 설계](#6-api-설계)
7. [UI/UX 설계](#7-uiux-설계)
8. [프로토타입 현황](#8-프로토타입-현황)
9. [개발 마일스톤](#9-개발-마일스톤)
10. [핵심 비즈니스 로직](#10-핵심-비즈니스-로직)

---

## 1. 프로젝트 개요

### 1-1. 서비스 정보

| 항목 | 내용 |
|------|------|
| **서비스명** | 맵맵맵 (MapMapMap) |
| **슬로건** | 매운맛 실패 없는 맛집 지도 |
| **플랫폼** | 모바일 웹 (Mobile Web View) → 추후 앱 전환 |
| **타겟 유저** | 매운 음식을 좋아하지만 "이 집이 나한테 맞을까?" 고민하는 사람들 |

### 1-2. 핵심 컨셉

```
"내 맵레벨에 맞는 맛집을 찾자"

- 데이터 기반 매운맛 표준화
- 영수증 인증을 통한 고품질 데이터 확보
- 베타테스터(맵고수)를 통한 큐레이션 제공
```

---

## 2. 핵심 가치 제안

### 2-1. 문제 정의

- 매운맛 표현이 주관적 → "살짝 매워요"가 누군가에겐 "죽을맛"
- 기존 리뷰는 맵기 수준을 객관화하지 못함
- 나와 비슷한 맵기 내성을 가진 사람의 의견을 찾기 어려움

### 2-2. 솔루션

| 기능 | 해결하는 문제 |
|------|-------------|
| **맵레벨 시스템 (0~5)** | 맵기 표현 표준화 |
| **영수증 인증 제보** | 허위/광고 리뷰 방지, 신뢰성 확보 |
| **Smart Filtering** | 유저 맵레벨 기준 Safe/Warning/Danger 표시 |
| **동일 레벨 통계** | "나와 같은 Lv.3 유저들의 평가" 제공 |

---

## 3. MVP 기능 요약

### 3-1. 필수 기능 (Phase 1)

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|----------|------|
| USR-01 | 카카오 로그인 | 🔴 High | REST API, 닉네임/프로필 수집 |
| USR-02 | 맵레벨 설정 | 🔴 High | 0~5 레벨 선택 |
| MAP-01 | 지도 뷰 | 🔴 High | 카카오맵 API 연동 |
| MAP-02 | Smart Filtering | 🔴 High | 유저/가게 레벨 비교 마커 분기 |
| REV-01 | **제보하기** | 🔴🔴 Highest | 이미지 업로드, 영수증 필수 |
| ADM-01 | 어드민 승인/반려 | 🔴 High | 관리자 검수 시스템 |

### 3-2. 보완 기능 (Phase 2)

| 기능 ID | 기능명 | 우선순위 |
|---------|--------|----------|
| STR-01 | 가게 검색 | 🟡 Mid |
| REV-02 | 리뷰 리스트 | 🟡 Mid |
| USR-03 | 마이페이지 | 🟡 Mid |
| NTF-01 | 알림 기능 | 🟡 Mid |

### 3-3. 고도화 기능 (Phase 3)

| 기능 ID | 기능명 | 우선순위 |
|---------|--------|----------|
| SRC-01 | 고급 검색 | 🟢 Low |
| FLT-01 | 필터링 고도화 | 🟢 Low |
| PNT-02 | 포인트 내역 | 🟢 Low |

---

## 4. 기술 스택

### 4-1. 권장 스택 (Option A - 빠른 개발)

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  React + Vite + TypeScript                          │
│  - 빠른 개발, 풍부한 생태계                          │
├─────────────────────────────────────────────────────┤
│                    Backend                           │
│  Node.js + Express + TypeScript                     │
│  - JavaScript 통일, 빠른 API 개발                   │
├─────────────────────────────────────────────────────┤
│                   Database                           │
│  PostgreSQL + PostGIS                               │
│  - 관계형 데이터, 위치 기반 쿼리 최적화             │
├─────────────────────────────────────────────────────┤
│                   Storage                            │
│  AWS S3 (이미지 저장)                               │
│  - 안정성, 확장성                                   │
├─────────────────────────────────────────────────────┤
│                   Deployment                         │
│  Vercel (FE) + AWS EC2 or Railway (BE)              │
└─────────────────────────────────────────────────────┘
```

### 4-2. 외부 API

| API | 용도 | 비고 |
|-----|------|------|
| 카카오 로그인 | 소셜 로그인 | REST API |
| 카카오맵 | 지도 표시, 마커 | JavaScript API |
| 카카오 로컬 | 가게 검색 | 키워드/좌표 기반 |

---

## 5. 데이터베이스 설계

### 5-1. ERD 개요

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │ restaurants │       │   reviews   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │───┐   │ id (PK)     │
│ kakao_id    │   │   │ kakao_place │   │   │ user_id(FK) │──┐
│ nickname    │   │   │ name        │   │   │ restaurant  │──┤
│ spicy_level │   │   │ address     │   │   │ menu_name   │  │
│ points      │   │   │ lat, lng    │   │   │ spicy_level │  │
│ created_at  │   │   │ avg_level   │   │   │ food_image  │  │
└─────────────┘   │   │ review_count│   │   │ receipt_img │  │
                  │   └─────────────┘   │   │ status      │  │
                  └─────────────────────┴───│ points_given│  │
                                            └─────────────┘  │
                                                    ▲        │
                                                    └────────┘
```

### 5-2. 핵심 테이블 정의

#### users (유저)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  kakao_id VARCHAR(50) UNIQUE NOT NULL,
  nickname VARCHAR(30) NOT NULL,
  profile_image VARCHAR(500),
  spicy_level INTEGER DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### restaurants (가게)
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  kakao_place_id VARCHAR(50) UNIQUE,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200) NOT NULL,
  road_address VARCHAR(200),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  category VARCHAR(50),
  avg_level DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### reviews (리뷰/제보)
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  menu_name VARCHAR(100) NOT NULL,
  spicy_level INTEGER NOT NULL CHECK (spicy_level BETWEEN 0 AND 5),
  food_image_url VARCHAR(500) NOT NULL,
  receipt_image_url VARCHAR(500) NOT NULL,  -- 핵심! 필수
  comment VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
  reject_reason VARCHAR(200),
  admin_memo VARCHAR(500),
  points_given INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5-3. 인덱스 권장

```sql
-- 위치 기반 검색 최적화
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);

-- 리뷰 상태별 조회 (어드민)
CREATE INDEX idx_reviews_status ON reviews(status, created_at DESC);

-- 유저별 리뷰 조회
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC);
```

---

## 6. API 설계

### 6-1. 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/kakao` | 카카오 로그인 처리 |
| PUT | `/api/auth/spicy-level` | 맵레벨 설정/변경 |

### 6-2. 가게 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/restaurants` | 주변 가게 목록 (위치 기반) |
| GET | `/api/restaurants/:id` | 가게 상세 + 리뷰 |
| GET | `/api/restaurants/search` | 가게 검색 (카카오 연동) |

### 6-3. 리뷰 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/reviews` | 제보 등록 (multipart/form-data) |
| GET | `/api/reviews/my` | 내 제보 목록 |

### 6-4. 어드민 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/admin/reviews` | 제보 목록 (관리자) |
| PUT | `/api/admin/reviews/:id/approve` | 제보 승인 |
| PUT | `/api/admin/reviews/:id/reject` | 제보 반려 |

---

## 7. UI/UX 설계

### 7-1. 맵레벨 기준표

| 레벨 | 명칭 | 기준 음식 | 마커 색상 |
|------|------|-----------|-----------|
| Lv.0 | 맵알못 | 진라면 순한맛도 매움 | - |
| Lv.1 | 맵린이 | 신라면 정도 가능 | 🟢 |
| Lv.2 | 맵중수 | 불닭볶음면 가능 | 🟡 |
| Lv.3 | 맵고수 | 엽떡 오리지널 거뜬 | 🟠 |
| Lv.4 | 맵부심 | 핵불닭 도전 가능 | 🔴 |
| Lv.5 | 맵신 | 디진다 돈까스 클리어 | ⚫ |

### 7-2. Smart Filtering 로직

```javascript
// 마커 색상 결정 로직
function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) {
    return 'safe';     // 🟢 Safe - 맛있게 먹을 수 있어요
  } else if (restaurantLevel === userLevel + 1) {
    return 'warning';  // 🟡 Warning - 조금 매울 수 있어요
  } else {
    return 'danger';   // 🔴 Danger - 도전이 필요해요
  }
}
```

### 7-3. IA (Information Architecture)

```
맵맵맵 App
├── 🏠 홈 (Main)
│   ├── 상단 GNB (로고, 검색, 알림)
│   ├── 큐레이션 배너
│   └── (+) 제보하기 FAB
│
├── 🗺️ 지도 (Map)
│   ├── 지도 뷰 (내 위치 중심)
│   ├── 필터 (Safe/Warning/Danger)
│   └── 가게 요약 바텀시트
│
├── 📍 가게 상세
│   ├── 가게 정보
│   ├── 맵기 통계
│   └── 리뷰 리스트
│
├── ✍️ 제보하기
│   ├── 가게 검색 (카카오 연동)
│   ├── 메뉴/맵기/사진 입력
│   └── 영수증 업로드 (필수!)
│
└── 👤 마이페이지
    ├── 내 정보 (맵레벨, 포인트)
    └── 활동 내역 (심사중/승인/반려)
```

---

## 8. 프로토타입 현황

### 8-1. 구현 완료된 프로토타입

| 파일명 | 설명 | 상태 |
|--------|------|------|
| `mapmapmap-mvp-web.html` | 사용자 웹 프로토타입 | ✅ 완료 |
| `mapmapmap-admin.html` | 관리자 페이지 프로토타입 | ✅ 완료 |
| `img/logo.svg` | 로고 이미지 | ✅ 완료 |

### 8-2. 사용자 웹 프로토타입 기능

```
✅ 온보딩 (닉네임 + 맵레벨 설정)
✅ 지도 뷰 (Leaflet.js 사용)
✅ Smart Filtering (Safe/Warning/Danger 마커)
✅ 안전 필터 토글 (내 레벨 이하만 보기)
✅ 가게 카드 리스트
✅ 가게 상세 모달
✅ 리뷰 작성 폼
✅ 동일 레벨 통계 표시
✅ LocalStorage 데이터 저장
```

### 8-3. 관리자 프로토타입 기능

```
✅ 대시보드 통계 (회원 수, 대기/승인/반려)
✅ 탭 네비게이션 (대기중/승인됨/반려됨)
✅ 제보 카드 (음식 사진, 영수증, 정보)
✅ 이미지 확대 모달
✅ 승인/반려 버튼
✅ 반려 사유 선택
✅ 관리자 메모 입력
```

---

## 9. 개발 마일스톤

### Phase 1: 핵심 기능 (2주)

- [ ] 카카오 로그인 연동
- [ ] 맵레벨 설정 시스템
- [ ] 지도 뷰 + 마커 렌더링
- [ ] **제보하기 (영수증 포함)** ← 핵심!
- [ ] 어드민 승인/반려 시스템
- [ ] 포인트 적립 로직

### Phase 2: 보완 기능 (1주)

- [ ] 가게 상세 페이지
- [ ] 리뷰 리스트
- [ ] 마이페이지
- [ ] 알림 기능

### Phase 3: 고도화 (1주)

- [ ] 검색 기능 고도화
- [ ] 필터링 확장
- [ ] 포인트 내역
- [ ] 성능 최적화

---

## 10. 핵심 비즈니스 로직

### 10-1. 제보 → 승인 플로우

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ① 유저: 제보 등록                                  │
│     └─→ 메뉴 + 맵기평가 + 음식사진 + 영수증(필수)   │
│                                                     │
│  ② 시스템: 제보 상태 = 'pending'                    │
│     └─→ 어드민 대기열에 추가                        │
│                                                     │
│  ③ 어드민: 검수                                     │
│     ├─→ 영수증 확인                                 │
│     ├─→ 음식 사진 확인                              │
│     └─→ 가게/메뉴 일치 확인                         │
│                                                     │
│  ④-A 승인:                                          │
│     ├─→ 제보 상태 = 'approved'                      │
│     ├─→ 유저 포인트 +500P                           │
│     ├─→ 가게 평균 맵기 재계산                       │
│     └─→ 지도에 데이터 노출                          │
│                                                     │
│  ④-B 반려:                                          │
│     ├─→ 제보 상태 = 'rejected'                      │
│     ├─→ 반려 사유 저장                              │
│     └─→ 유저에게 알림                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 10-2. 포인트 시스템

| 행동 | 포인트 | 비고 |
|------|--------|------|
| 제보 승인 | +500P | 영수증 인증 완료 시 |
| 포인트 사용 | TBD | MVP 이후 기획 |

### 10-3. 반려 사유 프리셋

1. 영수증 식별 불가
2. 음식 사진 불량
3. 가게/메뉴 불일치
4. 중복 제보
5. 부적절한 내용
6. 기타 (직접 입력)

---

## 📌 개발자 전달 사항

> **🔥 핵심 포인트**
>
> 1. **영수증 인증이 가장 중요합니다.** 영수증 없이는 제보 불가능하게 해주세요.
>
> 2. **어드민 승인/반려 프로세스가 서비스의 핵심입니다.** 영수증 확인 후 버튼 하나로 포인트 지급 + 지도 노출되는 로직이 우선입니다.
>
> 3. **디자인은 빠르게 가도 됩니다.** Bootstrap, MUI, Tailwind 등 아무거나 사용 가능합니다.
>
> 4. **초기에는 가게 데이터가 없습니다.** 유저가 제보할 때 카카오 로컬 API로 가게를 검색하고, 없으면 새로 등록되는 구조입니다.
>
> 5. **포인트는 일단 적립만 됩니다.** 사용처는 MVP 이후에 기획할 예정입니다.

---

## 📚 참고 자료

- [카카오 로그인 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [카카오맵 API 문서](https://apis.map.kakao.com/web/guide/)
- [카카오 로컬 API 문서](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

---

## 🗂️ 프로젝트 파일 구조

```
mapmadmap_complete/
├── mapmapmap-기획서-v2.md      # 상세 기획서 (원본)
├── mapmapmap-mvp-web.html      # 사용자 웹 프로토타입
├── mapmapmap-admin.html        # 관리자 페이지 프로토타입
├── MVP_계획서_정리.md          # 이 문서 (정리본)
└── img/
    └── logo.svg                # 로고 이미지
```
