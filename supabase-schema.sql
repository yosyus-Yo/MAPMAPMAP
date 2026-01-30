-- ============================================
-- MapMapMap 완전 초기화 및 스키마 생성
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 기존 테이블 삭제 (순서 중요: FK 의존성 역순)
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Authentication에서 기존 사용자 삭제 (선택사항)
-- 주의: 이 명령은 모든 Auth 사용자를 삭제합니다
-- DELETE FROM auth.users;

-- ============================================
-- 테이블 생성
-- ============================================

-- 3. users 테이블 (Supabase Auth와 연동)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  spicy_level INTEGER DEFAULT 0 CHECK (spicy_level >= 0 AND spicy_level <= 5),
  points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  is_beta_tester BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. restaurants 테이블
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT,
  category TEXT,
  avg_level DOUBLE PRECISION DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. reviews 테이블
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_name TEXT NOT NULL,
  spicy_level INTEGER NOT NULL CHECK (spicy_level >= 0 AND spicy_level <= 5),
  food_image_url TEXT,
  receipt_image_url TEXT,
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  points_given INTEGER DEFAULT 0,
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. favorites 테이블
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- 7. rewards 테이블 (베타테스터 리워드)
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  milestone_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security) 비활성화
-- 서버에서 Service Role Key 사용하므로 불필요
-- ============================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_restaurant_id ON public.reviews(restaurant_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);

-- ============================================
-- Storage 버킷 설정 (Supabase Dashboard에서 수동 생성 필요)
-- ============================================
-- 1. food-images (Public)
-- 2. receipt-images (Public 또는 Private)

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'MapMapMap 스키마 생성 완료!' as message;
