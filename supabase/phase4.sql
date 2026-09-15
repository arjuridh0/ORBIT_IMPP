-- ============================================================
-- ORBIT FASE 4: location pada events & tabel members organisasi
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tambah kolom location pada tabel events (jika belum ada)
alter table public.events add column if not exists location text;

-- 2. Buat tabel members (anggota pengurus tanpa akun login auth)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  divisi text not null,
  koor_id uuid references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. RLS untuk tabel members
alter table public.members enable row level security;

-- Baca publik (siapa saja boleh melihat anggota di bagan struktur)
create policy "read_members" on public.members
  for select using (true);

-- Insert: pengguna terautentikasi (ada baris profiles)
create policy "insert_members" on public.members
  for insert with check (auth.uid() is not null);

-- Delete: pemilik OTAU admin/ketua/superadmin OTAU editor divisi yang sama
-- (koor boleh menghapus semua anggota divisinya, bukan hanya yang ia buat)
drop policy if exists "delete_members" on public.members;
create policy "delete_members" on public.members
  for delete using (
    auth.uid() = created_by
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('admin', 'ketua', 'superadmin')
          or p.divisi = public.members.divisi
        )
    )
  );
