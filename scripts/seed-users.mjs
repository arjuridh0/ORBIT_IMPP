// Membuat akun BPH + koor divisi ORBIT sekaligus.
// Cara pakai:
//   1. Edit array USERS di bawah: ganti email (dan nama) sesuai orang aslinya
//   2. $env:ORBIT_USER_PASSWORD='<password>'   (satu password awal untuk semua akun)
//   3. node scripts/seed-users.mjs           -> dry-run, hanya menampilkan rencana
//   4. node scripts/seed-users.mjs --commit  -> benar-benar membuat akun
//
// Password awal TIDAK boleh ditulis di file ini. Diambil dari env ORBIT_USER_PASSWORD
// supaya tidak bocor ke repo publik. Bagikan via WhatsApp pribadi, bukan grup.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Email: JABATAN@orbit.id (internal, bisa diganti ke email asli lewat Kelola User nanti).
// full_name & jabatan = data real kepengurusan IMPP 2026.
const USERS = [
  { full_name: 'Hafid Triasnoko', jabatan: 'Ketua Umum', role: 'ketua', divisi: 'bph', email: 'ketum@orbit.id' },
  { full_name: 'Nizar Dwi Nugroho', jabatan: 'Wakil Ketua', role: 'admin', divisi: 'bph', email: 'waketum@orbit.id' },
  { full_name: 'Siska Isrotun Nisa', jabatan: 'Sekretaris 1', role: 'admin', divisi: 'bph', email: 'sekre@orbit.id' },
  { full_name: 'Nabilatul Jinan', jabatan: 'Sekretaris 2', role: 'admin', divisi: 'bph', email: 'sekre2@orbit.id' },
  { full_name: 'Sabila Shinta Ayu Indrifiatin', jabatan: 'Bendahara 1', role: 'admin', divisi: 'bph', email: 'bendahara@orbit.id' },
  { full_name: 'Resti Sasi Kirana', jabatan: 'Bendahara 2', role: 'admin', divisi: 'bph', email: 'bendahara2@orbit.id' },
  { full_name: 'Rita Wulan Sari', jabatan: 'Koor Kaderisasi', role: 'editor', divisi: 'kaderisasi', email: 'kaderisasi@orbit.id' },
  { full_name: 'Mailan Malik Masobih', jabatan: 'Sekjen Kaderisasi', role: 'editor', divisi: 'kaderisasi', email: 'sekjen.kaderisasi@orbit.id' },
  { full_name: 'Khaedar Syah At-Taufiqi', jabatan: 'Koor Sosma', role: 'editor', divisi: 'sosma', email: 'sosma@orbit.id' },
  { full_name: 'Rafi Ahmad Syafik', jabatan: 'Sekjen Sosma', role: 'editor', divisi: 'sosma', email: 'sekjen.sosma@orbit.id' },
  { full_name: 'Ahmad Ashari Anhar', jabatan: 'Koor Bakmi', role: 'editor', divisi: 'bakmi', email: 'bakmi@orbit.id' },
  { full_name: 'Putra Azidna Moovic', jabatan: 'Sekjen Bakmi', role: 'editor', divisi: 'bakmi', email: 'sekjen.bakmi@orbit.id' },
  { full_name: 'Lutfi Ardiansyah', jabatan: 'Koor DPW', role: 'editor', divisi: 'dpw', email: 'dpw@orbit.id' },
  { full_name: 'Anggun Desiana', jabatan: 'Sekjen DPW', role: 'editor', divisi: 'dpw', email: 'sekjen.dpw@orbit.id' },
  { full_name: 'Fryzaino Arya Gumilang', jabatan: 'Koor Inforsi', role: 'editor', divisi: 'inforsi', email: 'inforsi@orbit.id' },
  { full_name: 'Hawa Mutiara Rahmah', jabatan: 'Sekjen Inforsi', role: 'editor', divisi: 'inforsi', email: 'sekjen.inforsi@orbit.id' },
  { full_name: 'M. Alfin Nizar', jabatan: 'Koor Deplu', role: 'editor', divisi: 'deplu', email: 'deplu@orbit.id' },
  { full_name: 'Desylia Widyasari', jabatan: 'Sekjen Deplu', role: 'editor', divisi: 'deplu', email: 'sekjen.deplu@orbit.id' },
  { full_name: 'Muhammad Rosyid Ridho', jabatan: 'Koor KWU', role: 'editor', divisi: 'kwu', email: 'kwu@orbit.id' },
  { full_name: 'Ghifari Zaka Wali', jabatan: 'Sekjen KWU', role: 'editor', divisi: 'kwu', email: 'sekjen.kwu@orbit.id' },
]

const VALID_DIVISI = ['bph', 'kaderisasi', 'sosma', 'bakmi', 'dpw', 'inforsi', 'deplu', 'kwu']

function loadEnv() {
  const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = {}
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

function validate() {
  const problems = []
  const emails = new Set()
  for (const u of USERS) {
    if (u.email.toUpperCase().includes('GANTI') || !/^\S+@\S+\.\S+$/.test(u.email)) {
      problems.push(`Email belum diisi/valid: ${u.full_name} (${u.email})`)
    }
    if (emails.has(u.email)) problems.push(`Email duplikat: ${u.email}`)
    emails.add(u.email)
    if (!VALID_DIVISI.includes(u.divisi)) problems.push(`Divisi tidak valid: ${u.divisi}`)
    if (!['admin', 'editor', 'ketua'].includes(u.role)) problems.push(`Role tidak valid: ${u.role}`)
  }
  return problems
}

const commit = process.argv.includes('--commit')
const password = process.env.ORBIT_USER_PASSWORD

if (commit && !password) {
  console.log('Set ORBIT_USER_PASSWORD dulu sebelum --commit (satu password awal untuk semua akun).')
  process.exit(1)
}

const problems = validate()
if (problems.length) {
  console.log('MASALAH pada data user, perbaiki dulu:')
  problems.forEach((p) => console.log('  - ' + p))
  process.exit(1)
}

console.log(`Rencana membuat ${USERS.length} akun:\n`)
for (const u of USERS) {
  console.log(`  ${u.role === 'admin' ? 'ADMIN ' : 'EDITOR'} | ${u.full_name.padEnd(20)} | ${u.divisi.padEnd(12)} | ${u.email}`)
}

if (!commit) {
  console.log('\nDry-run saja. Jalankan dengan --commit untuk benar-benar membuat akun.')
  process.exit(0)
}

const env = loadEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let ok = 0
let skip = 0
let fail = 0

for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  })

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      console.log(`SKIP (sudah ada): ${u.email}`)
      skip++
    } else {
      console.log(`GAGAL ${u.email}: ${error.message}`)
      fail++
    }
    continue
  }

  const { error: perr } = await admin
    .from('profiles')
    .insert({ id: data.user.id, full_name: u.full_name, role: u.role, jabatan: u.jabatan, divisi: u.divisi })

  if (perr) {
    await admin.auth.admin.deleteUser(data.user.id)
    console.log(`GAGAL profile ${u.email}: ${perr.message} (user dibatalkan)`)
    fail++
    continue
  }

  console.log(`OK: ${u.email} (${u.role}/${u.divisi})`)
  ok++
}

console.log(`\nSelesai. Berhasil: ${ok}, Skip: ${skip}, Gagal: ${fail}`)
console.log('Login coba: http://localhost:3000/login')
