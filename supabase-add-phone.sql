-- 사용자 테이블에 전화번호 컬럼 추가
-- Supabase Dashboard > SQL Editor에서 실행하세요

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 전화번호 컬럼에 코멘트 추가
COMMENT ON COLUMN public.users.phone IS '리워드 지급용 전화번호';
