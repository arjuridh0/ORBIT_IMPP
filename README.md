# ORBIT IMPP

Kalender kegiatan organisasi IMPP. Satu papan agenda untuk semua divisi: jadwal rabul, kegiatan tahunan (ETP, baksos, harlah, HBH, murgasii), dan semua agenda divisi terlihat real-time tanpa perlu tanya-tanya di grup chat.

## Fitur

- Kalender 4 tampilan (bulan, minggu, hari, daftar) dengan agenda hari ini di sidebar.
- CRUD kegiatan, kegiatan berulang (harian/mingguan), jam TBD, drag & drop dan resize.
- Realtime sync via Supabase tanpa refresh.
- Warna per divisi sebagai identitas data, bukan dekorasi.
- Login multi-role: pengunjung bisa lihat kalender tanpa akun, editor mengelola kegiatan divisinya, admin mengelola semua kegiatan dan user.
- Kelola user (daftar, edit, reset password, role/divisi) khusus admin.
- Profil mandiri (foto, nama, jabatan, warna divisi) dan ganti password.
- Halaman Tentang IMPP: visi-misi (editable admin) dan struktur organisasi dari data user.
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
app/                 # Halaman & API routes (App Router)
components/          # Komponen UI (calendar, header, sidebar, auth)
hooks/               # useEvents (CRUD + realtime), useDivisi
lib/                 # Supabase client/server, tipe, konstanta
public/              # Aset statis (logo, favicon, vendor FullCalendar, ikon PWA)
scripts/             # Utilitas (seed user, ikon PWA)
supabase/            # SQL fase (RLS + schema) 
middleware.ts        # Proteksi route /admin & /api/admin
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