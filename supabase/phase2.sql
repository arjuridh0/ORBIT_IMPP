-- ============================================================
-- ORBIT FASE 2: profiles + helper + RLS events
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor.
-- Setelah menjalankan ini, TAMBAHKAN SUPABASE_SERVICE_ROLE_KEY
-- ke .env.local, lalu buat akun admin pertama (lihat checklist).
-- ============================================================

-- 1. Tabel profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'editor'
    check (role in ('admin', 'editor')),
  jabatan text,
  divisi text not null
    check (divisi in ('bph','kaderisasi','sosma','bakmi','dpw','inforsi','deplu')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Helper: cek admin (SECURITY DEFINER menghindari recursion RLS)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. Helper: boleh edit event? (admin = semua, editor = miliknya)
create or replace function public.can_edit_event(event_created_by uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin() or event_created_by = auth.uid();
$$;

-- 4. RLS profiles
create policy "profiles read" on public.profiles
  for select using (true);

create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- PENTING (perbaikan keamanan): user hanya boleh mengubah nama/jabatan
-- sendiri, TIDAK role atau divisi (tanpa ini, editor bisa menaikkan
-- dirinya jadi admin).
revoke update on public.profiles from authenticated;
grant update (full_name, jabatan) on public.profiles to authenticated;

-- 5. Perketat RLS events (ganti policy allow-all)
drop policy if exists "Allow all" on public.events;
drop policy if exists "Allow all on events" on public.events;

-- Publik bisa lihat kalender tanpa login
create policy "events public read" on public.events
  for select using (true);

-- Hanya user terdaftar (ada baris profiles) yang bisa tambah event
create policy "events authenticated insert" on public.events
  for insert with check (
    auth.role() = 'authenticated' and
    exists (select 1 from public.profiles where id = auth.uid())
  );

-- Admin edit semua, editor hanya miliknya
create policy "events update" on public.events
  for update using (public.can_edit_event(created_by))
  with check (public.can_edit_event(created_by));

-- Admin hapus semua, editor hanya miliknya
create policy "events delete" on public.events
  for delete using (public.can_edit_event(created_by));
