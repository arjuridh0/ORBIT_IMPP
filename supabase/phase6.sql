-- ============================================================
-- ORBIT FASE 6: perketat RLS members + events + catatan push_subscriptions
-- Jalankan di Supabase Dashboard > SQL Editor.
-- Prasyarat: phase4.sql & phase5.sql sudah dijalankan.
-- ============================================================

-- 1. Perketat insert_members: harus punya profil + elevated ATAU divisi sama
-- (sebelumnya hanya cek auth.uid() is not null -> siapa pun yang login bisa
--  insert anggota ke divisi mana pun lewat anon client, melewati validasi API)
drop policy if exists "insert_members" on public.members;
create policy "insert_members" on public.members
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role in ('admin', 'ketua', 'superadmin')
          or p.divisi = public.members.divisi
        )
    )
  );

-- 2. Perketat insert events: cegah spoofing created_by
-- User harus mengisi created_by = auth.uid()-nya sendiri; tidak boleh UUID orang lain.
drop policy if exists "events authenticated insert" on public.events;
create policy "events authenticated insert" on public.events
  for insert with check (
    auth.role() = 'authenticated'
    and exists (select 1 from public.profiles where id = auth.uid())
    and created_by = auth.uid()
  );

-- 3. Catatan push_subscriptions (TIDAK perlu policy UPDATE):
--    Route subscribe/delete memakai service client (bypass RLS), sehingga
--    upsert dengan onConflict='endpoint' tidak terhalang policy.
--    Service key hanya dipakai di server route (server-only), bukan di client.