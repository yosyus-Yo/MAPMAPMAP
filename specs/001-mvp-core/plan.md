# MapMapMap MVP Core - Implementation Plan

> Feature: 001-mvp-core
> Version: 1.0.0
> Status: Ready for Implementation
> Created: 2025-12-26

---

## Constitutional Pre-Flight Check

### Article I: Library-First Principle ✅
- 비즈니스 로직을 `src/lib/` 폴더에 분리
- 컨트롤러는 라우팅만 담당

### Article II: CLI Interface Mandate ⏭️ (MVP 스킵)
- MVP에서는 웹 인터페이스만 구현
- CLI는 Phase 2에서 고려

### Article III: Test-First Imperative ✅
- 모든 구현 전 테스트 작성
- Jest로 단위/통합 테스트

### Article VII: Simplicity Gate ✅
- 단일 프로젝트 (모놀리스)
- 미래 대비 over-engineering 없음

### Article VIII: Anti-Abstraction Gate ✅
- Express 직접 사용
- ORM 없이 SQLite3 직접 쿼리
- 불필요한 추상화 계층 없음

### Article IX: Integration-First Testing ✅
- 실제 SQLite DB로 통합 테스트
- Mock 최소화

---

## Technology Stack

### Backend
| Category | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js 20 LTS | 안정성, 기존 HTML과 통합 용이 |
| Framework | Express.js 4.x | 가볍고 빠른 개발, 풍부한 미들웨어 |
| Database | SQLite3 | 파일 기반, 별도 서버 불필요, MVP에 적합 |
| Session | express-session + SQLite store | 서버 재시작 후에도 세션 유지 |
| Password | bcrypt | 안전한 비밀번호 해싱 |
| File Upload | multer | 이미지 업로드 처리 |
| Validation | express-validator | 입력 검증 |

### Frontend
| Category | Choice | Rationale |
|----------|--------|-----------|
| Template | 기존 HTML 재사용 | 개발 시간 단축 |
| Map | Leaflet.js (기존) | 이미 프로토타입에 구현됨 |
| Styling | 기존 CSS 유지 | 추가 학습 불필요 |

### Infrastructure
| Category | Choice | Rationale |
|----------|--------|-----------|
| Hosting | 로컬 개발 → Render/Railway | 무료 티어, 간편 배포 |
| Image Storage | 로컬 `/uploads` | MVP 단계, 추후 S3 전환 |

---

## Project Structure

```
mapmadmap_complete/
├── server/
│   ├── src/
│   │   ├── app.js              # Express 앱 설정
│   │   ├── server.js           # 서버 진입점
│   │   ├── config/
│   │   │   └── database.js     # SQLite 연결
│   │   ├── lib/                # 비즈니스 로직
│   │   │   ├── auth.js         # 인증 로직
│   │   │   ├── review.js       # 리뷰 로직
│   │   │   ├── restaurant.js   # 가게 로직
│   │   │   └── smartFilter.js  # 필터링 로직
│   │   ├── routes/
│   │   │   ├── auth.js         # /api/auth/*
│   │   │   ├── restaurants.js  # /api/restaurants/*
│   │   │   ├── reviews.js      # /api/reviews/*
│   │   │   └── admin.js        # /api/admin/*
│   │   └── middleware/
│   │       ├── auth.js         # 인증 미들웨어
│   │       └── upload.js       # 파일 업로드
│   ├── database/
│   │   ├── schema.sql          # 테이블 생성
│   │   ├── seed.sql            # 초기 데이터
│   │   └── mapmap.db           # SQLite 파일
│   ├── uploads/                # 이미지 저장
│   ├── tests/
│   │   ├── auth.test.js
│   │   ├── review.test.js
│   │   └── admin.test.js
│   └── package.json
├── public/                     # 정적 파일 (기존 HTML)
│   ├── index.html              # 메인 (기존 mvp-web.html 수정)
│   ├── admin.html              # 관리자 (기존 admin.html 수정)
│   ├── css/
│   ├── js/
│   └── img/
└── specs/                      # 스펙 문서
```

---

## Data Model

### SQLite Schema

```sql
-- users 테이블
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  spicy_level INTEGER DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
  points INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- restaurants 테이블
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  phone TEXT,
  category TEXT,
  avg_level REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- reviews 테이블
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  menu_name TEXT NOT NULL,
  spicy_level INTEGER NOT NULL CHECK (spicy_level BETWEEN 0 AND 5),
  food_image_url TEXT NOT NULL,
  receipt_image_url TEXT NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  points_given INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 인덱스
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);
```

---

## API Contracts

### Authentication APIs

#### POST /api/auth/signup
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "맵부심"
}

Response 201:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "맵부심",
    "spicy_level": 0
  }
}

Response 400:
{
  "success": false,
  "error": "이미 등록된 이메일입니다"
}
```

#### POST /api/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "user": { ... }
}
```

#### POST /api/auth/logout
```json
Response 200:
{
  "success": true
}
```

#### GET /api/auth/me
```json
Response 200:
{
  "success": true,
  "user": { ... }
}

Response 401:
{
  "success": false,
  "error": "로그인이 필요합니다"
}
```

#### PUT /api/auth/spicy-level
```json
Request:
{
  "spicy_level": 3
}

Response 200:
{
  "success": true,
  "spicy_level": 3
}
```

### Restaurant APIs

#### GET /api/restaurants
```json
Query: ?lat=37.5&lng=127.0&radius=1000

Response 200:
{
  "success": true,
  "restaurants": [
    {
      "id": "uuid",
      "name": "불닭발",
      "address": "서울시 강남구...",
      "lat": 37.5,
      "lng": 127.0,
      "avg_level": 3.5,
      "review_count": 10,
      "marker_status": "warning"  // 사용자 레벨 기준
    }
  ]
}
```

#### GET /api/restaurants/:id
```json
Response 200:
{
  "success": true,
  "restaurant": { ... },
  "reviews": [
    {
      "id": "uuid",
      "user_nickname": "맵부심",
      "user_level": 3,
      "menu_name": "불닭발",
      "spicy_level": 4,
      "food_image_url": "/uploads/food_xxx.jpg",
      "comment": "진짜 맵다",
      "created_at": "2025-01-01"
    }
  ]
}
```

#### POST /api/restaurants
```json
Request:
{
  "name": "불닭발",
  "address": "서울시 강남구...",
  "lat": 37.5,
  "lng": 127.0
}

Response 201:
{
  "success": true,
  "restaurant": { ... }
}
```

### Review APIs

#### POST /api/reviews
```
Content-Type: multipart/form-data

Fields:
- restaurant_id: uuid
- restaurant_name: string (신규 가게일 경우)
- restaurant_address: string (신규 가게일 경우)
- restaurant_lat: number (신규 가게일 경우)
- restaurant_lng: number (신규 가게일 경우)
- menu_name: string
- spicy_level: number (0-5)
- comment: string (optional)
- food_image: file (required)
- receipt_image: file (required)

Response 201:
{
  "success": true,
  "review": {
    "id": "uuid",
    "status": "pending"
  },
  "message": "제보가 접수되었습니다. 검수 후 포인트가 적립됩니다."
}
```

#### GET /api/reviews/my
```json
Response 200:
{
  "success": true,
  "reviews": [
    {
      "id": "uuid",
      "restaurant_name": "불닭발",
      "menu_name": "불닭발",
      "status": "pending",
      "created_at": "2025-01-01"
    }
  ]
}
```

### Admin APIs

#### GET /api/admin/reviews
```json
Query: ?status=pending

Response 200:
{
  "success": true,
  "reviews": [ ... ],
  "stats": {
    "pending": 5,
    "approved": 100,
    "rejected": 10
  }
}
```

#### PUT /api/admin/reviews/:id/approve
```json
Response 200:
{
  "success": true,
  "review": { ... },
  "message": "승인 완료. 사용자에게 500P 적립"
}
```

#### PUT /api/admin/reviews/:id/reject
```json
Request:
{
  "reason": "영수증 식별 불가"
}

Response 200:
{
  "success": true,
  "review": { ... }
}
```

---

## Implementation Sequence

### Phase 1: 프로젝트 설정 (Day 1)
1. 프로젝트 초기화 (npm init)
2. 의존성 설치
3. Express 앱 구조 생성
4. SQLite 데이터베이스 설정
5. 테스트 환경 구성 (Jest)

### Phase 2: 인증 시스템 (Day 1-2)
1. 회원가입 API
2. 로그인/로그아웃 API
3. 세션 관리
4. 맵레벨 설정 API
5. 인증 미들웨어

### Phase 3: 가게 및 리뷰 (Day 2-3)
1. 가게 CRUD API
2. 리뷰 작성 API (이미지 업로드)
3. Smart Filtering 로직
4. 가게 평균 레벨 계산

### Phase 4: 관리자 기능 (Day 3-4)
1. 관리자 인증
2. 리뷰 목록 조회
3. 승인/반려 처리
4. 포인트 적립 로직

### Phase 5: 프론트엔드 연동 (Day 4-5)
1. 기존 HTML을 API와 연결
2. fetch 호출로 localStorage 대체
3. 세션 기반 인증 UI
4. 관리자 페이지 연동

### Phase 6: 테스트 및 마무리 (Day 5)
1. 통합 테스트
2. 버그 수정
3. 배포 준비

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 이미지 업로드 실패 | Medium | High | 파일 크기 제한, 에러 핸들링 |
| 세션 손실 | Low | Medium | SQLite session store 사용 |
| SQL Injection | Medium | Critical | Parameterized queries 필수 |
| XSS 공격 | Medium | High | 입력값 sanitization |

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.0",
    "express-session": "^1.17.3",
    "connect-sqlite3": "^0.9.13",
    "bcrypt": "^5.1.1",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0",
    "express-validator": "^7.0.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.0"
  }
}
```

---

## Validation Checklist

- [x] Constitutional gates 통과
- [x] 기술 스택 선정 완료
- [x] 프로젝트 구조 정의
- [x] 데이터 모델 설계
- [x] API 계약 정의
- [x] 구현 순서 정의
- [x] 리스크 분석
- [ ] User Approval Required

---

**Next Step**: tasks.md 생성 (TDD 기반 태스크 분해)
