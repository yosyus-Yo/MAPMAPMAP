# server-archive/

## 상태: 사용되지 않음 (Archived 2026-05-18)

이 폴더는 과거 Express REST API 구현체입니다. **현재 프로덕션 배포에서 사용되지 않습니다.**

## 사용 안 함 사유

`public/js/api.js`가 Supabase 클라이언트 SDK를 직접 사용하여 다음을 모두 처리합니다:
- 인증 (Supabase Auth)
- 리뷰/맛집/즐겨찾기 CRUD (RLS 정책으로 보호)
- 이미지 업로드 (Supabase Storage)
- 관리자 기능

`public/index.html` / `public/js/api.js`에서 `/api/*` 엔드포인트 호출은 **0건**으로 확인됨 (2026-05-18).
카카오맵 API 키도 `public/index.html` line 5264에 하드코딩되어 서버 호출 불필요.

## 왜 삭제하지 않고 보관하는가

- 향후 Supabase RLS만으로 처리하기 어려운 로직(서버 측 결제 검증, 이메일 발송, OCR 영수증 검증 등)이 필요할 때 참고용
- 인증/세션 처리, multer 업로드 패턴 등 코드 자산 보존
- git history 보존

## 재활성화 시 주의

부활시키려면:
1. 이 폴더를 `server/`로 이동
2. `../api-archive/`를 `../api/`로 이동
3. `api/index.js`의 `require('../server/src/app')` 경로 검증
4. Vercel 환경변수에 `SESSION_SECRET`, `KAKAO_MAP_KEY` 등 재등록
5. 프론트의 Supabase 직접 호출을 fetch로 점진 교체

## 관련

- 통합 작업 계획: `../public-v2/README.md`
- 본 archive 결정의 사용자 승인: 2026-05-18 turn
