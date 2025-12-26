# MapMapMap 🌶️

**매운맛 맛집 지도 서비스** - 나만의 맵기 레벨에 맞는 맛집을 찾아보세요!

## 소개

MapMapMap은 매운 음식을 좋아하는 사람들을 위한 맛집 공유 서비스입니다. 사용자의 매운맛 내성 레벨(0~5)을 설정하고, 다른 사용자들의 리뷰를 통해 나에게 맞는 매운맛 맛집을 찾을 수 있습니다.

### 주요 기능

- **맵핵 레벨 시스템**: 0(안 매움) ~ 5(극한) 단계로 매운맛 레벨 설정
- **스마트 필터링**: Safe(안전) / Warning(주의) / Danger(위험) 표시
- **리뷰 시스템**: 음식 사진 + 영수증 인증 리뷰
- **관리자 승인**: 리뷰 품질 관리를 위한 승인 워크플로우
- **찜하기**: 마음에 드는 맛집 저장
- **카카오맵 연동**: 실시간 지도에서 맛집 위치 확인

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | HTML, CSS, JavaScript, Kakao Maps API |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | express-session, bcrypt |
| File Upload | multer |

## 시작하기

### 1. 사전 요구사항

- **Node.js** 18.x 이상
- **npm** 또는 **yarn**
- **카카오 개발자 계정** (지도 API 사용)

### 2. 프로젝트 클론

```bash
git clone https://github.com/yosyus-Yo/MAPMAPMAP.git
cd MAPMAPMAP
```

### 3. 카카오맵 API 키 발급

1. [카카오 개발자 사이트](https://developers.kakao.com/) 접속
2. 애플리케이션 추가하기
3. **JavaScript 키** 복사
4. `public/index.html` 파일에서 API 키 수정:

```html
<!-- 라인 2672 근처 -->
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=여기에_API_키_입력&libraries=services"></script>
```

### 4. 서버 설치 및 실행

```bash
# 서버 디렉토리로 이동
cd server

# 의존성 설치
npm install

# 서버 실행
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 5. 브라우저에서 접속

```
http://localhost:3000
```

## 프로젝트 구조

```
MAPMAPMAP/
├── public/                 # 프론트엔드 정적 파일
│   ├── index.html         # 메인 페이지 (SPA)
│   ├── admin.html         # 관리자 페이지
│   ├── js/
│   │   └── api.js         # API 클라이언트
│   └── img/
│       └── logo.svg       # 로고
│
├── server/                 # 백엔드 서버
│   ├── src/
│   │   ├── app.js         # Express 앱 설정
│   │   ├── server.js      # 서버 진입점
│   │   ├── config/
│   │   │   ├── database.js # SQLite 설정
│   │   │   └── seed.js    # 초기 데이터
│   │   └── routes/
│   │       ├── auth.js    # 인증 API
│   │       ├── restaurants.js # 맛집 API
│   │       ├── reviews.js # 리뷰 API
│   │       ├── favorites.js # 찜하기 API
│   │       └── admin.js   # 관리자 API
│   ├── database/
│   │   └── schema.sql     # DB 스키마
│   ├── uploads/           # 업로드된 이미지 (자동 생성)
│   └── sessions/          # 세션 파일 (자동 생성)
│
└── specs/                  # 기획 문서
    └── 001-mvp-core/
        ├── spec.md        # 요구사항 명세
        ├── plan.md        # 구현 계획
        └── tasks.md       # 작업 목록
```

## API 엔드포인트

### 인증 (Auth)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |
| PUT | `/api/auth/spicy-level` | 맵기 레벨 설정 |

### 맛집 (Restaurants)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/restaurants` | 맛집 목록 |
| GET | `/api/restaurants/:id` | 맛집 상세 (리뷰 포함) |
| POST | `/api/restaurants` | 맛집 등록 |

### 리뷰 (Reviews)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/reviews` | 리뷰 작성 (FormData) |
| GET | `/api/reviews/my` | 내 리뷰 목록 |

### 찜하기 (Favorites)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/favorites` | 찜 목록 |
| GET | `/api/favorites/check/:id` | 찜 여부 확인 |
| POST | `/api/favorites/:id` | 찜하기 추가 |
| DELETE | `/api/favorites/:id` | 찜하기 제거 |

### 관리자 (Admin)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/admin/reviews` | 리뷰 목록 (상태별) |
| GET | `/api/admin/stats` | 통계 |
| PUT | `/api/admin/reviews/:id/approve` | 리뷰 승인 |
| PUT | `/api/admin/reviews/:id/reject` | 리뷰 거절 |

## 사용 방법

### 일반 사용자

1. **회원가입**: 이메일, 비밀번호, 닉네임 입력
2. **맵핵 레벨 설정**: 로그인 후 0~5 단계 중 선택
3. **맛집 찾기**: 지도에서 맛집 확인 (색상으로 안전도 표시)
   - 🟢 Safe: 내 레벨 이하
   - 🟡 Warning: 내 레벨 +1
   - 🔴 Danger: 내 레벨 +2 이상
4. **리뷰 작성**: 메뉴명, 맵기 평가, 음식 사진, 영수증 첨부
5. **찜하기**: 마음에 드는 맛집 저장

### 관리자

1. **관리자 계정**: 초기 시드 데이터에 관리자 계정 포함
   - 이메일: `admin@mapmapmap.com`
   - 비밀번호: `admin1234`
2. **관리자 페이지**: `/admin.html` 접속
3. **리뷰 관리**: 대기 중인 리뷰 승인/거절

## 개발 모드

```bash
cd server

# 개발 모드 실행 (nodemon 사용)
npm run dev
```

## 환경 변수 (선택사항)

`.env` 파일을 `server/` 디렉토리에 생성:

```env
PORT=3000
SESSION_SECRET=your-secret-key
NODE_ENV=development
```

## 데이터베이스 초기화

서버 첫 실행 시 자동으로 초기화됩니다. 수동 초기화가 필요한 경우:

```bash
cd server
rm -f mapmap.db
npm start
```

초기 데이터:
- 관리자 계정 1개
- 샘플 맛집 5개
- 샘플 리뷰 10개

## 스크린샷

### 메인 지도
- 카카오맵 기반 맛집 위치 표시
- 레벨별 색상 마커
- 안전 필터링 토글

### 맛집 상세
- 이미지 캐러셀 (카테고리 기본 이미지 + 리뷰 사진)
- 미니맵
- 리뷰 목록 (클릭하여 상세 보기)

### 관리자 대시보드
- 대기/승인/거절 리뷰 관리
- 통계 대시보드

## 라이선스

MIT License

## 기여

버그 리포트나 기능 제안은 [Issues](https://github.com/yosyus-Yo/MAPMAPMAP/issues)에 등록해주세요.

---

Made with ❤️ and 🌶️
