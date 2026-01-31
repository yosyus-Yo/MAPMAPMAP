-- ============================================
-- MapMapMap RLS (Row Level Security) 정책
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. RLS 활성화
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 기존 정책 삭제 (있으면)
-- ============================================

-- users 테이블
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;

-- restaurants 테이블
DROP POLICY IF EXISTS "Restaurants are viewable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated users can insert restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;

-- reviews 테이블
DROP POLICY IF EXISTS "Reviews viewable by owner, admin, or if approved" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own pending reviews, admins can delete any" ON public.reviews;

-- favorites 테이블
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;

-- rewards 테이블
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.rewards;

-- ============================================
-- 3. users 테이블 정책
-- ============================================

-- 모든 사용자가 다른 사용자 정보 조회 가능 (닉네임, 레벨 표시용)
CREATE POLICY "Users are viewable by everyone"
ON public.users FOR SELECT
USING (true);

-- 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 회원가입 시 자신의 레코드 생성 (auth.uid()와 일치해야 함)
CREATE POLICY "Users can insert own record"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. restaurants 테이블 정책
-- ============================================

-- 모든 사용자가 식당 정보 조회 가능
CREATE POLICY "Restaurants are viewable by everyone"
ON public.restaurants FOR SELECT
USING (true);

-- 로그인한 사용자만 식당 추가 가능 (리뷰 작성 시)
CREATE POLICY "Authenticated users can insert restaurants"
ON public.restaurants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 관리자만 식당 정보 수정 가능
CREATE POLICY "Admins can update restaurants"
ON public.restaurants FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 관리자만 식당 삭제 가능
CREATE POLICY "Admins can delete restaurants"
ON public.restaurants FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================
-- 5. reviews 테이블 정책
-- ============================================

-- 승인된 리뷰는 모두가 볼 수 있음
-- 자신의 리뷰는 상태와 관계없이 볼 수 있음
-- 관리자는 모든 리뷰를 볼 수 있음
CREATE POLICY "Reviews viewable by owner, admin, or if approved"
ON public.reviews FOR SELECT
USING (
  status = 'approved'
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 로그인한 사용자만 리뷰 작성 가능
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 자신의 대기 중인 리뷰만 수정 가능
CREATE POLICY "Users can update own pending reviews"
ON public.reviews FOR UPDATE
USING (
  (user_id = auth.uid() AND status = 'pending')
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  (user_id = auth.uid() AND status = 'pending')
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 자신의 대기 중인 리뷰만 삭제 가능, 관리자는 모두 삭제 가능
CREATE POLICY "Users can delete own pending reviews, admins can delete any"
ON public.reviews FOR DELETE
USING (
  (user_id = auth.uid() AND status = 'pending')
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================
-- 6. favorites 테이블 정책
-- ============================================

-- 자신의 즐겨찾기만 조회 가능
CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
USING (user_id = auth.uid());

-- 자신의 즐겨찾기만 추가 가능
CREATE POLICY "Users can add own favorites"
ON public.favorites FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 자신의 즐겨찾기만 삭제 가능
CREATE POLICY "Users can delete own favorites"
ON public.favorites FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- 7. rewards 테이블 정책
-- ============================================

-- 자신의 리워드만 조회 가능
CREATE POLICY "Users can view own rewards"
ON public.rewards FOR SELECT
USING (user_id = auth.uid());

-- 리워드 생성은 서버에서만 (service key 필요하지만, 프론트에서는 막음)
-- 관리자만 리워드 생성/수정 가능
CREATE POLICY "Admins can manage rewards"
ON public.rewards FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================
-- 8. Storage 버킷 정책 (Dashboard에서 설정)
-- ============================================
-- food-images 버킷:
--   SELECT: 모두 허용 (public.buckets에서 public으로 설정)
--   INSERT: authenticated users만 (auth.uid() IS NOT NULL)
--
-- receipt-images 버킷:
--   SELECT: owner만 (auth.uid() = owner)
--   INSERT: authenticated users만

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'RLS 정책 설정 완료!' as message;
