-- ============================================================
-- ORBIT FASE 3 (v6): divisi + konten + avatar_url + storage
-- Jalankan SEKALI di Supabase Dashboard > SQL Editor.
-- Prasyarat: phase2.sql sudah dijalankan (helper is_admin ada).
-- ============================================================

-- 1. Tabel divisi (sumber warna divisi — pengganti constants.ts)
create table public.divisi (
  key text primary key,
  label text not null,
  color text not null
);

insert into public.divisi (key, label, color) values
  ('bph','BPH','#2563eb'),
  ('kaderisasi','Kaderisasi','#7c3aed'),
  ('sosma','Sosma','#059669'),
  ('bakmi','Bakmi','#d97706'),
  ('dpw','DPW','#dc2626'),
  ('inforsi','Inforsi','#0891b2'),
  ('deplu','Deplu','#db2777')
on conflict (key) do update set label = excluded.label, color = excluded.color;

alter table public.divisi enable row level security;

-- 2. Tabel konten (visi misi halaman Tentang — editable admin)
create table public.konten (
  key text primary key,
  value text not null
);

insert into public.konten (key, value) values
  ('visi', 'Terwujudnya organisasi IMPP yang solid, progresif, dan bermanfaat bagi anggota serta masyarakat.'),
  ('misi', '1) Meningkatkan kapasitas anggota\n2) Menjaga solidaritas lintas divisi\n3) Menjalankan program kerja yang berkelanjutan dan berdampak.')
on conflict (key) do update set value = excluded.value;

alter table public.konten enable row level security;

-- 3. Kolom foto profil (nullable = pakai avatar inisial)
alter table public.profiles add column if not exists avatar_url text;

-- 4. RLS divisi: siapa boleh baca & ubah
--    baca: semua orang (agar warna divisi tampil di kalender publik)
--    ubah: admin semua divisi ATAU user yang profilnya di divisi tsb
create policy "divisi read" on public.divisi
  for select using (true);

create policy "divisi update" on public.divisi
  for update using (
    public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.divisi = divisi.key)
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.divisi = divisi.key)
  );

-- 5. RLS konten: baca publik, tulis hanya admin
create policy "konten read" on public.konten
  for select using (true);

create policy "konten update" on public.konten
  for update using (public.is_admin())
  with check (public.is_admin());

-- 6. Perluas grant update profil: nama, jabatan, avatar_url (tidak pernah role/divisi)
revoke update on public.profiles from authenticated;
grant update (full_name, jabatan, avatar_url) on public.profiles to authenticated;

-- 7. Storage bucket avatars (public), path {userId}/{file}
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars insert own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars delete own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );