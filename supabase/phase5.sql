-- ============================================================
-- ORBIT FASE 5: info kabinet + KWU + push subscriptions
-- Jalankan di Supabase Dashboard > SQL Editor.
-- Prasyarat: phase3.sql sudah dijalankan (tabel konten & divisi ada).
-- ============================================================

-- 1. Tambah konten keys untuk info kabinet (upsert aman)
insert into public.konten (key, value) values
  ('kabinet_nama',    ''),
  ('kabinet_periode', ''),
  ('kabinet_desc',    'Bagan kepengurusan IMPP periode berjalan.')
on conflict (key) do nothing;

-- 2. Tambah kolom sort_order ke tabel divisi (untuk urutan tampil di bagan & filter)
alter table public.divisi add column if not exists sort_order int default 99;
update public.divisi set sort_order = case key
  when 'bph'        then 0
  when 'kaderisasi' then 1
  when 'sosma'      then 2
  when 'bakmi'      then 3
  when 'dpw'        then 4
  when 'inforsi'    then 5
  when 'deplu'      then 6
  when 'kwu'        then 7
  else 99 end;

-- 3. Tambah divisi KWU
insert into public.divisi (key, label, color, sort_order) values
  ('kwu', 'KWU', '#16a34a', 7)
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

-- 4. Izinkan admin INSERT ke konten (untuk upsert key baru dari Kelola IMPP)
-- (RLS saat ini hanya allow update — tambahkan insert policy)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'konten' and policyname = 'konten insert admin'
  ) then
    create policy "konten insert admin" on public.konten
      for insert with check (public.is_admin());
  end if;
end $$;

-- 5. Tabel push_subscriptions (siapapun yang install PWA bisa subscribe)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;

-- Siapapun bisa subscribe (insert)
create policy "push_subscribe" on public.push_subscriptions
  for insert with check (true);

-- Hanya admin yang bisa lihat daftar subscriber
create policy "push_read_admin" on public.push_subscriptions
  for select using (public.is_admin());

-- Siapapun bisa hapus subscription miliknya (berdasarkan endpoint yang diketahui browser)
create policy "push_delete" on public.push_subscriptions
  for delete using (true);

-- 6. Tabel reminder_log (anti-duplikat notif)
create table if not exists public.reminder_log (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  sent_at  timestamptz default now()
);
alter table public.reminder_log enable row level security;

-- Hanya service role yang bisa insert/select (via SUPABASE_SERVICE_ROLE_KEY di server)
-- RLS dibiarkan aktif tapi tanpa policy agar hanya service role yang bisa akses
