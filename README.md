# ORBIT IMPP

Kalender kegiatan organisasi IMPP. Satu papan agenda untuk semua divisi: jadwal rabul, kegiatan tahunan (ETP, baksos, harlah, HBH, murgasii), dan semua agenda divisi terlihat real-time tanpa perlu tanya-tanya di grup chat.

## Fitur

- Kalender 4 tampilan (bulan, minggu, hari, daftar) dengan agenda hari ini di sidebar.
- CRUD kegiatan, kegiatan berulang (harian/mingguan), jam TBD, drag & drop dan resize.
- Realtime sync via Supabase tanpa refresh.
- Warna per divisi sebagai identitas data, bukan dekorasi.
- Dual branding: Logo ORBIT dan Logo IMPP di footer, drawer mobile, dan login.
- Login multi-role berhirarki:
  - **Pengunjung**: melihat kalender tanpa login.
  - **Editor (Koor Divisi & Sekjen)**: mengelola kegiatan divisinya & mendaftarkan nama anggota.
  - **Admin (BPH)**: mengelola semua kegiatan, BPH, dan user editor.
  - **Ketua (Ketua Umum)**: mengelola semua kegiatan dan user (kecuali superadmin).
  - **Superadmin (Developer)**: otoritas tertinggi (tersembunyi dari daftar user umum).
- Kelola user (daftar, edit, reset password, role/divisi) dengan proteksi hirarki dan show/hide password toggle.
- Profil mandiri (foto, nama, jabatan, warna divisi) dan ganti password dengan show/hide toggle.
- Halaman Tentang IMPP: visi-misi dan struktur organisasi interaktif (Ketua & Wakil sejajar, Sekre 1&2, Bendahara 1&2, Koor, Sekjen, dan Anggota dari tabel `members` tanpa akun).
- Header navbar tengah + hamburger + avatar dropdown.

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Data & Auth | Supabase (Postgres, Auth, RLS, Storage) |
| Kalender | FullCalendar v6 (di-vendor lokal, tanpa CDN runtime) |

## Struktur folder

```
src/
  app/                 # Halaman & API routes (App Router)
  components/          # Komponen UI (calendar, header, sidebar, auth)
  hooks/               # useEvents (CRUD + realtime), useDivisi
  lib/                 # Supabase client/server, tipe, konstanta
  middleware.ts        # Proteksi route /admin & /api/admin
public/                # Aset statis (logo, favicon, vendor FullCalendar)
scripts/               # Utilitas (seed user)
supabase/              # SQL fase (schema, USER_ACCOUNTS.md)
```

## Persyaratan

- Node.js 20+
- Akun Supabase (proyek gratis)

## Setup lokal

1. Install dependency: `npm install`
2. Salin `.env.example` menjadi `.env.local` dan isi:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, jangan bocor ke client)
3. Jalankan SQL di Supabase Dashboard > SQL Editor, urut:
   - `supabase/phase2.sql` (tabel profiles, helper, RLS events)
   - `supabase/phase3.sql` (tabel divisi/konten, avatar_url, bucket avatars)
4. Jalankan dev server: `npm run dev`, buka `http://localhost:3000`

> Catatan: jangan commit `.env.local`. File itu tercakup `.gitignore`.

## Akun & seed user

Buat akun awal lewat halaman `/admin/users` (login sebagai admin) atau script:
`scripts/seed-users.mjs`. Password awal diambil dari env `ORBIT_USER_PASSWORD`, tidak boleh ditulis di kode:

```bash
$env:ORBIT_USER_PASSWORD='<password-awal>'; node scripts/seed-users.mjs            # dry-run
$env:ORBIT_USER_PASSWORD='<password-awal>'; node scripts/seed-users.mjs --commit   # beneran buat
```

## Perintah verifikasi

```bash
npx tsc --noEmit    # typecheck (wajib sebelum selesai)
npm run build       # build produksi (jangan saat dev server jalan)
```

## Deploy (Vercel)

1. Konekkan repo ke Vercel (framework auto-detect: Next.js).
2. Tambahkan 3 environment variable yang sama seperti `.env.local` di Project Settings.
3. Deploy. Setiap push ke branch utama otomatis membangun versi baru.

## Roadmap

- PWA (install + offline) dan in-app push notification (reminder H-3, H-1, H-3 jam).
- LPJ (tunggu contoh dari pengurus), modul keuangan bulanan, kalkulator RAB.
- Notifikasi grup WhatsApp via gateway (Fonnte/Wablas) untuk roadmap berikutnya.

## Lisensi

Belum ditetapkan. Internal divisi IMPP.