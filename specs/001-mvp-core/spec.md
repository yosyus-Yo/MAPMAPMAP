# MapMapMap MVP Core - Specification

> Feature: 001-mvp-core
> Version: 1.0.0
> Status: Draft
> Created: 2025-12-26

---

## Overview

매운맛 맛집 지도 서비스 "맵맵맵(MapMapMap)" MVP 핵심 기능 구현

**Goal**: 기존 HTML 프로토타입을 실제 동작하는 웹 서비스로 전환

---

## User Scenarios & Testing

### P1: Critical Path (Must-Have)

#### US-01: 회원가입 및 로그인
**As a** 새로운 사용자
**I want to** 이메일/비밀번호로 회원가입하고 로그인
**So that** 서비스를 이용할 수 있다

**Acceptance Criteria**:
```gherkin
Given 회원가입 페이지에서
When 이메일, 비밀번호, 닉네임을 입력하고 가입 버튼 클릭
Then 계정이 생성되고 로그인 상태가 된다
  And 맵레벨 설정 화면으로 이동한다

Given 로그인 페이지에서
When 올바른 이메일/비밀번호 입력
Then 로그인 성공, 메인 지도 화면으로 이동

Given 잘못된 비밀번호 입력 시
When 로그인 시도
Then "이메일 또는 비밀번호가 올바르지 않습니다" 에러 표시
```

#### US-02: 맵레벨 설정
**As a** 로그인한 사용자
**I want to** 나의 매운맛 내성 레벨(0-5) 설정
**So that** 맞춤형 필터링을 받을 수 있다

**Acceptance Criteria**:
```gherkin
Given 맵레벨 설정 화면에서
When 레벨 0~5 중 하나 선택
Then 선택한 레벨이 저장되고 지도 화면으로 이동

Given 설정된 맵레벨이 있을 때
When 마이페이지에서 레벨 변경
Then 새 레벨로 업데이트되고 필터링 즉시 적용
```

#### US-03: 지도 뷰 및 Smart Filtering
**As a** 로그인한 사용자
**I want to** 내 맵레벨 기준 Safe/Warning/Danger 표시된 지도
**So that** 나에게 맞는 가게를 쉽게 찾을 수 있다

**Acceptance Criteria**:
```gherkin
Given 지도 화면에서
When 가게 마커가 표시될 때
Then 내 레벨 대비 Safe(🟢)/Warning(🟡)/Danger(🔴) 색상 표시
  And 가게 평균 맵레벨 표시

Given "안전 필터" 토글 활성화 시
When 지도 새로고침
Then 내 레벨 이하(Safe) 가게만 표시
```

#### US-04: 리뷰(제보) 작성
**As a** 로그인한 사용자
**I want to** 가게/메뉴/맵기/사진/영수증을 등록
**So that** 다른 사용자에게 정보를 공유하고 포인트를 받을 수 있다

**Acceptance Criteria**:
```gherkin
Given 제보하기 화면에서
When 가게명, 메뉴명, 맵기레벨, 음식사진, 영수증사진 입력 후 제출
Then 리뷰가 "pending" 상태로 저장
  And "심사중" 안내 메시지 표시

Given 영수증 사진 없이 제출 시도
When 제출 버튼 클릭
Then "영수증 사진은 필수입니다" 에러 표시
  And 제출 차단
```

#### US-05: 관리자 리뷰 승인/반려
**As a** 관리자
**I want to** 제보된 리뷰를 검수하고 승인/반려
**So that** 품질 높은 데이터만 서비스에 노출된다

**Acceptance Criteria**:
```gherkin
Given 관리자 페이지에서 대기중 리뷰 목록 조회
When "승인" 버튼 클릭
Then 리뷰 상태가 "approved"로 변경
  And 사용자에게 포인트 500P 적립
  And 가게 평균 맵레벨 재계산

Given 관리자가 "반려" 버튼 클릭
When 반려 사유 선택 후 확인
Then 리뷰 상태가 "rejected"로 변경
  And 반려 사유 저장
```

### P2: Important (Should-Have)

#### US-06: 가게 상세 보기
**As a** 사용자
**I want to** 가게의 상세 정보와 리뷰 목록 조회
**So that** 방문 여부를 결정할 수 있다

#### US-07: 내 리뷰 목록
**As a** 사용자
**I want to** 내가 작성한 리뷰의 상태(심사중/승인/반려) 확인
**So that** 리뷰 처리 현황을 알 수 있다

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority | User Story |
|----|-------------|----------|------------|
| FR-001 | 이메일/비밀번호 회원가입 | P1 | US-01 |
| FR-002 | 세션 기반 로그인/로그아웃 | P1 | US-01 |
| FR-003 | 맵레벨(0-5) 설정 및 변경 | P1 | US-02 |
| FR-004 | 지도에 가게 마커 표시 | P1 | US-03 |
| FR-005 | Smart Filtering (Safe/Warning/Danger) | P1 | US-03 |
| FR-006 | 안전 필터 토글 | P1 | US-03 |
| FR-007 | 리뷰 작성 (이미지 업로드) | P1 | US-04 |
| FR-008 | 영수증 필수 검증 | P1 | US-04 |
| FR-009 | 관리자 리뷰 목록 조회 | P1 | US-05 |
| FR-010 | 관리자 승인/반려 처리 | P1 | US-05 |
| FR-011 | 승인 시 포인트 적립 | P1 | US-05 |
| FR-012 | 가게 평균 맵레벨 자동 계산 | P1 | US-05 |
| FR-013 | 가게 상세 페이지 | P2 | US-06 |
| FR-014 | 내 리뷰 목록 조회 | P2 | US-07 |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | 페이지 로드 시간 | < 2초 |
| NFR-002 | 이미지 업로드 크기 | 최대 5MB |
| NFR-003 | 동시 접속자 | 100명 |
| NFR-004 | 비밀번호 암호화 | bcrypt (salt 10) |
| NFR-005 | 세션 유지 시간 | 24시간 |

---

## Success Criteria

### Business Metrics
- [ ] 회원가입 후 첫 리뷰 작성률 > 30%
- [ ] 관리자 리뷰 처리 평균 시간 < 24시간

### Technical Metrics
- [ ] 모든 API 응답 시간 < 500ms
- [ ] 이미지 업로드 성공률 > 99%
- [ ] 세션 인증 오류율 < 0.1%

### UX Metrics
- [ ] 리뷰 작성 완료율 > 80% (시작한 사용자 중)
- [ ] 모바일 뷰 정상 표시 (반응형)

---

## Core Entities

### User
```yaml
id: UUID (PK)
email: string (unique, required)
password_hash: string (required)
nickname: string (required, 2-20자)
spicy_level: integer (0-5, default: 0)
points: integer (default: 0)
is_admin: boolean (default: false)
created_at: timestamp
```

### Restaurant
```yaml
id: UUID (PK)
name: string (required)
address: string (required)
lat: decimal (required)
lng: decimal (required)
phone: string (optional)
category: string (optional)
avg_level: decimal (0.0-5.0, computed)
review_count: integer (computed)
created_at: timestamp
```

### Review
```yaml
id: UUID (PK)
user_id: UUID (FK -> User)
restaurant_id: UUID (FK -> Restaurant)
menu_name: string (required)
spicy_level: integer (0-5, required)
food_image_url: string (required)
receipt_image_url: string (required)
comment: string (optional, max 200자)
status: enum (pending/approved/rejected)
reject_reason: string (optional)
points_given: integer (default: 0)
created_at: timestamp
```

---

## Validation Checklist

- [x] 모든 User Scenario에 Given-When-Then 정의
- [x] 모든 Requirement에 Priority 지정
- [x] Success Criteria 정량화
- [x] Core Entity 속성 정의
- [x] 카카오 로그인 → 이메일/비밀번호로 변경 확인
- [ ] User Approval Required

---

**Next Step**: plan.md 생성 (기술 스택 및 구현 계획)
