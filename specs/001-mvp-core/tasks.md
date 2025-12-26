# MapMapMap MVP Core - Task Breakdown

> Feature: 001-mvp-core
> Version: 1.0.0
> Status: Ready for Implementation
> Created: 2025-12-26

---

## Progress Tracking

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1: 프로젝트 설정 | 5 | 0 | ⏳ Pending |
| Phase 2: 인증 시스템 | 8 | 0 | ⏳ Pending |
| Phase 3: 가게/리뷰 | 8 | 0 | ⏳ Pending |
| Phase 4: 관리자 | 6 | 0 | ⏳ Pending |
| Phase 5: 프론트엔드 | 4 | 0 | ⏳ Pending |
| **Total** | **31** | **0** | **0%** |

---

## Phase 1: 프로젝트 설정

### Task 1.1: 프로젝트 초기화
**Type**: Setup
**Dependencies**: None

**Actions**:
```bash
cd /Users/seohun/Documents/에이전트/infiniteAgent/mapmadmap_complete
mkdir -p server/src/{config,lib,routes,middleware}
mkdir -p server/{database,uploads,tests}
cd server && npm init -y
```

**Validation**:
- [ ] package.json 생성됨
- [ ] 폴더 구조 생성됨

---

### Task 1.2: 의존성 설치
**Type**: Setup
**Dependencies**: Task 1.1

**Actions**:
```bash
npm install express better-sqlite3 express-session connect-sqlite3 bcrypt multer uuid express-validator cors
npm install -D jest supertest nodemon
```

**Validation**:
- [ ] node_modules 설치됨
- [ ] package.json에 의존성 기록됨

---

### Task 1.3: Express 앱 설정
**Type**: Implementation
**Dependencies**: Task 1.2
**File**: `server/src/app.js`

**Implementation**:
```javascript
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Session
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './database' }),
  secret: process.env.SESSION_SECRET || 'mapmap-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// Routes (추후 추가)
// app.use('/api/auth', require('./routes/auth'));

module.exports = app;
```

**Validation**:
- [ ] app.js 생성됨
- [ ] 미들웨어 설정됨

---

### Task 1.4: SQLite 데이터베이스 설정
**Type**: Implementation
**Dependencies**: Task 1.2
**File**: `server/src/config/database.js`, `server/database/schema.sql`

**schema.sql**:
```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  spicy_level INTEGER DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
  points INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
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

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  spicy_level INTEGER NOT NULL CHECK (spicy_level BETWEEN 0 AND 5),
  food_image_url TEXT NOT NULL,
  receipt_image_url TEXT NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  points_given INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
```

**database.js**:
```javascript
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database/mapmap.db');
const db = new Database(dbPath);

// 스키마 적용
const schema = fs.readFileSync(
  path.join(__dirname, '../../database/schema.sql'),
  'utf-8'
);
db.exec(schema);

module.exports = db;
```

**Validation**:
- [ ] mapmap.db 파일 생성됨
- [ ] 테이블 3개 생성됨

---

### Task 1.5: 테스트 환경 설정
**Type**: Setup
**Dependencies**: Task 1.4
**File**: `server/jest.config.js`, `server/tests/setup.js`

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/*.test.js'],
  verbose: true
};
```

**tests/setup.js**:
```javascript
const Database = require('better-sqlite3');
const path = require('path');

// 테스트용 인메모리 DB
beforeEach(() => {
  // 테스트 전 DB 초기화 로직
});

afterAll(() => {
  // 정리 작업
});
```

**Validation**:
- [ ] `npm test` 실행 가능
- [ ] 테스트 환경 설정됨

---

## Phase 2: 인증 시스템 (TDD)

### Task 2.1: 인증 테스트 작성 (RED)
**Type**: Test
**Dependencies**: Task 1.5
**File**: `server/tests/auth.test.js`

**Test Cases**:
```javascript
describe('Auth API', () => {
  describe('POST /api/auth/signup', () => {
    test('유효한 데이터로 회원가입 성공', async () => {});
    test('중복 이메일로 400 에러', async () => {});
    test('비밀번호 8자 미만 시 400 에러', async () => {});
  });

  describe('POST /api/auth/login', () => {
    test('올바른 credentials로 로그인 성공', async () => {});
    test('잘못된 비밀번호로 401 에러', async () => {});
  });

  describe('GET /api/auth/me', () => {
    test('로그인 상태에서 사용자 정보 반환', async () => {});
    test('비로그인 상태에서 401 에러', async () => {});
  });

  describe('PUT /api/auth/spicy-level', () => {
    test('맵레벨 0-5 사이 값 설정 성공', async () => {});
    test('범위 초과 시 400 에러', async () => {});
  });
});
```

**User Approval Required**:
- [ ] 테스트 시나리오 검토
- [ ] 구현 진행 승인

**Validation** (RED Phase):
- [ ] 테스트 작성 완료
- [ ] 테스트 실행 시 FAIL

---

### Task 2.2: Auth Library 구현 (GREEN)
**Type**: Implementation
**Dependencies**: Task 2.1 (User Approved)
**File**: `server/src/lib/auth.js`

**Implementation**:
```javascript
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const SALT_ROUNDS = 10;

const authLib = {
  async createUser({ email, password, nickname }) {
    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, nickname)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, email, password_hash, nickname);
    return { id, email, nickname, spicy_level: 0 };
  },

  async validateCredentials(email, password) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      spicy_level: user.spicy_level,
      is_admin: !!user.is_admin
    };
  },

  updateSpicyLevel(userId, level) {
    db.prepare('UPDATE users SET spicy_level = ? WHERE id = ?')
      .run(level, userId);
  },

  getUser(userId) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }
};

module.exports = authLib;
```

**Validation** (GREEN Phase):
- [ ] 모든 테스트 통과
- [ ] 코드 커버리지 > 80%

---

### Task 2.3: Auth Routes 구현 (GREEN)
**Type**: Implementation
**Dependencies**: Task 2.2
**File**: `server/src/routes/auth.js`

**Constitutional Check**:
- [ ] 라우터는 라우팅만 담당
- [ ] 비즈니스 로직은 lib/auth.js에 위임

**Validation**:
- [ ] 모든 API 테스트 통과

---

### Task 2.4: Auth Middleware 구현
**Type**: Implementation
**Dependencies**: Task 2.3
**File**: `server/src/middleware/auth.js`

```javascript
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다'
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
```

**Validation**:
- [ ] 인증 미들웨어 동작 확인

---

## Phase 3: 가게 및 리뷰 시스템 (TDD)

### Task 3.1: Restaurant 테스트 작성 (RED)
**Type**: Test
**Dependencies**: Phase 2 완료
**File**: `server/tests/restaurant.test.js`

**Test Cases**:
- GET /api/restaurants - 위치 기반 가게 목록
- GET /api/restaurants/:id - 가게 상세 + 리뷰
- POST /api/restaurants - 가게 등록

**User Approval Required**:
- [ ] 테스트 시나리오 검토

---

### Task 3.2: Restaurant Library 구현 (GREEN)
**Type**: Implementation
**Dependencies**: Task 3.1 (User Approved)
**File**: `server/src/lib/restaurant.js`

---

### Task 3.3: Smart Filtering 구현
**Type**: Implementation
**Dependencies**: Task 3.2
**File**: `server/src/lib/smartFilter.js`

```javascript
function getMarkerStatus(restaurantLevel, userLevel) {
  if (restaurantLevel <= userLevel) {
    return 'safe';     // 맛있게 먹을 수 있어요
  } else if (restaurantLevel <= userLevel + 1) {
    return 'warning';  // 조금 매울 수 있어요
  } else {
    return 'danger';   // 도전이 필요해요
  }
}

module.exports = { getMarkerStatus };
```

---

### Task 3.4: Review 테스트 작성 (RED)
**Type**: Test
**File**: `server/tests/review.test.js`

**Test Cases**:
- POST /api/reviews - 리뷰 작성 (이미지 포함)
- GET /api/reviews/my - 내 리뷰 목록
- 영수증 없이 제출 시 에러

**User Approval Required**:
- [ ] 테스트 시나리오 검토

---

### Task 3.5: Review Library 구현 (GREEN)
**Type**: Implementation
**Dependencies**: Task 3.4 (User Approved)
**File**: `server/src/lib/review.js`

---

### Task 3.6: 이미지 업로드 Middleware 구현
**Type**: Implementation
**File**: `server/src/middleware/upload.js`

```javascript
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다'));
  }
});

module.exports = upload;
```

---

## Phase 4: 관리자 시스템 (TDD)

### Task 4.1: Admin 테스트 작성 (RED)
**Type**: Test
**File**: `server/tests/admin.test.js`

**Test Cases**:
- GET /api/admin/reviews - 대기중 리뷰 목록
- GET /api/admin/stats - 통계
- PUT /api/admin/reviews/:id/approve - 승인
- PUT /api/admin/reviews/:id/reject - 반려
- 비관리자 접근 시 403 에러

**User Approval Required**:
- [ ] 테스트 시나리오 검토

---

### Task 4.2: Admin Library 구현 (GREEN)
**Type**: Implementation
**Dependencies**: Task 4.1 (User Approved)
**File**: `server/src/lib/admin.js`

**핵심 로직**:
- 리뷰 승인 시: status='approved', 포인트 +500, 가게 avg_level 재계산
- 리뷰 반려 시: status='rejected', reject_reason 저장

---

### Task 4.3: 가게 평균 레벨 계산 로직
**Type**: Implementation
**File**: `server/src/lib/restaurant.js` (추가)

```javascript
function recalculateAvgLevel(restaurantId) {
  const result = db.prepare(`
    SELECT AVG(spicy_level) as avg, COUNT(*) as count
    FROM reviews
    WHERE restaurant_id = ? AND status = 'approved'
  `).get(restaurantId);

  db.prepare(`
    UPDATE restaurants
    SET avg_level = ?, review_count = ?
    WHERE id = ?
  `).run(result.avg || 0, result.count, restaurantId);
}
```

---

## Phase 5: 프론트엔드 연동

### Task 5.1: 기존 HTML API 연결
**Type**: Implementation
**Files**: `public/index.html`, `public/js/api.js`

**Actions**:
- localStorage 기반 로직 → fetch API 호출로 변경
- 세션 인증 처리
- 에러 핸들링 UI

---

### Task 5.2: 인증 UI 구현
**Type**: Implementation

**Actions**:
- 로그인/회원가입 모달 추가
- 세션 상태에 따른 UI 분기
- 맵레벨 설정 화면 연결

---

### Task 5.3: 관리자 페이지 연동
**Type**: Implementation
**File**: `public/admin.html`

**Actions**:
- 하드코딩된 데이터 → API 호출로 변경
- 승인/반려 버튼 API 연결
- 실시간 통계 표시

---

### Task 5.4: 통합 테스트 및 마무리
**Type**: Testing

**Checklist**:
- [ ] 회원가입 → 로그인 플로우
- [ ] 맵레벨 설정 → 지도 필터링
- [ ] 리뷰 작성 → 관리자 승인 → 지도 노출
- [ ] 반려 처리 플로우
- [ ] 모바일 반응형 확인

---

## Quick Start Commands

```bash
# 프로젝트 설정
cd /Users/seohun/Documents/에이전트/infiniteAgent/mapmadmap_complete
mkdir -p server && cd server
npm init -y

# 의존성 설치
npm install express better-sqlite3 express-session connect-sqlite3 bcrypt multer uuid express-validator cors
npm install -D jest supertest nodemon

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test
```

---

## Estimated Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1 | 0.5 day | Day 1 AM | Day 1 PM |
| Phase 2 | 1 day | Day 1 PM | Day 2 PM |
| Phase 3 | 1.5 days | Day 2 PM | Day 4 AM |
| Phase 4 | 1 day | Day 4 AM | Day 5 AM |
| Phase 5 | 1 day | Day 5 AM | Day 5 PM |
| **Total** | **5 days** | | |

---

**Ready for Implementation**: 이 tasks.md를 기반으로 TDD 방식으로 구현을 진행합니다.
