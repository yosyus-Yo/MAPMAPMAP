-- 사용자 문의/피드백 테이블 (2026-06-09)
-- Supabase SQL Editor에서 1회 실행하세요. 실행 전엔 문의 제출/관리자 조회가 동작하지 않습니다.
-- 전제: public.users 테이블에 id(uuid PK) + is_admin(boolean) 컬럼이 이미 존재.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  email      text,
  category   text not null default 'etc',          -- 'suggestion' | 'bug' | 'etc'
  user_id    uuid references public.users(id) on delete set null,  -- 비회원은 null
  status     text not null default 'new',           -- 'new' | 'resolved'
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

-- RLS 활성화
alter table public.feedback enable row level security;

-- PostgREST(supabase-js) 접근 권한 보강 (RLS 정책과 별개로 table GRANT 필요)
grant insert on public.feedback to anon, authenticated;
grant select, update on public.feedback to authenticated;

-- 1) 누구나(비회원 포함) 문의 제출 가능
drop policy if exists "feedback_insert_anyone" on public.feedback;
create policy "feedback_insert_anyone"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

-- 2) 관리자만 조회 가능
drop policy if exists "feedback_select_admin" on public.feedback;
create policy "feedback_select_admin"
  on public.feedback for select
  to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_admin = true
  ));

-- 3) 관리자만 상태 변경(처리완료 토글) 가능
drop policy if exists "feedback_update_admin" on public.feedback;
create policy "feedback_update_admin"
  on public.feedback for update
  to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_admin = true
  ));
