-- ============================================
-- 사용자 접속 기록 테이블
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- access_logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,                -- 세션 식별자 (같은 방문 그룹화)
  action TEXT NOT NULL,           -- 'visit', 'login', 'logout', 'view_restaurant', etc.
  page TEXT,                      -- 방문 페이지
  metadata JSONB DEFAULT '{}',    -- 추가 정보
  user_agent TEXT,                -- 브라우저/기기 정보
  referrer TEXT,                  -- 유입 경로
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON public.access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_session_id ON public.access_logs(session_id);

-- RLS 활성화 (보안)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 로그인한 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view own logs"
ON public.access_logs FOR SELECT
USING (user_id = auth.uid());

-- 모든 인증된 사용자가 로그 생성 가능
CREATE POLICY "Authenticated users can insert logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 관리자는 모든 로그 조회 가능
CREATE POLICY "Admins can view all logs"
ON public.access_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================
-- 유용한 분석 쿼리 예시
-- ============================================

-- 일별 순 방문자 수 (DAU)
-- SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as dau
-- FROM access_logs WHERE action = 'visit'
-- GROUP BY DATE(created_at) ORDER BY date DESC;

-- 주별 순 방문자 수 (WAU)
-- SELECT DATE_TRUNC('week', created_at) as week, COUNT(DISTINCT user_id) as wau
-- FROM access_logs WHERE action = 'visit'
-- GROUP BY week ORDER BY week DESC;

-- 시간대별 접속 패턴
-- SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as visits
-- FROM access_logs WHERE action = 'visit'
-- GROUP BY hour ORDER BY hour;

-- 사용자별 방문 횟수
-- SELECT user_id, COUNT(*) as visit_count
-- FROM access_logs WHERE action = 'visit'
-- GROUP BY user_id ORDER BY visit_count DESC;

-- 인기 맛집 (조회수)
-- SELECT metadata->>'restaurant_name' as name, COUNT(*) as views
-- FROM access_logs WHERE action = 'view_restaurant'
-- GROUP BY metadata->>'restaurant_name' ORDER BY views DESC LIMIT 10;

-- 기기별 접속 통계
-- SELECT
--   CASE
--     WHEN user_agent ILIKE '%mobile%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%iphone%' THEN 'Mobile'
--     ELSE 'Desktop'
--   END as device_type,
--   COUNT(*) as count
-- FROM access_logs WHERE action = 'visit'
-- GROUP BY device_type;

SELECT 'access_logs 테이블 생성 완료!' as message;
