'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import Header from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import { useDivisi } from '@/hooks/useDivisi'
import { Icon } from '@/components/icons'
import { DIVISI_COLORS } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'

const COLOR_PRESETS = Object.values(DIVISI_COLORS).filter((c, i, arr) => arr.indexOf(c) === i)

export default function ProfilPage() {
  const { profile, user, loading, refreshProfile, logout } = useAuth()
  const { divisi, refreshDivisi } = useDivisi()

  const [fullName, setFullName] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [editKey, setEditKey] = useState('')
  const [color, setColor] = useState<string>(DIVISI_COLORS.bph)
  const [savingColor, setSavingColor] = useState(false)

  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name)
    setJabatan(profile.jabatan ?? '')
  }, [profile])

  // Refresh profile on mount so photo edited via Kelola User is immediately visible
  useEffect(() => {
    refreshProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (divisi.length === 0) return
    const initial = profile?.role === 'admin' ? divisi[0].key : (profile?.divisi as string) || divisi[0].key
    setEditKey(initial)
    const row = divisi.find((d) => d.key === initial)
    if (row) setColor(row.color)
  }, [divisi, profile])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Memuat...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="card-soft bg-white rounded-2xl p-8 max-w-md text-center">
            <p className="text-gray-600 mb-5">Kamu belum masuk. Silakan masuk dulu untuk mengelola profil.</p>
            <Link href="/login" className="btn btn-primary">Masuk</Link>
          </div>
        </div>
      </div>
    )
  }

  const allowedKeys = profile.role === 'admin'
    ? divisi
    : divisi.filter((d) => d.key === profile.divisi)

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !supabase) return
    if (!fullName.trim()) {
      Swal.fire('Perhatian', 'Nama tidak boleh kosong.', 'warning')
      return
    }
    setSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), jabatan: jabatan.trim() || null })
      .eq('id', profile.id)
    setSavingProfile(false)
    if (error) {
      Swal.fire('Gagal', error.message, 'error')
      return
    }
    await refreshProfile()
    Swal.fire({
      icon: 'success',
      title: 'Tersimpan',
      text: 'Profil berhasil diperbarui.',
      confirmButtonColor: '#2563eb',
      timer: 1800,
      showConfirmButton: false,
    })
  }

  async function handleColorSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editKey) return
    setSavingColor(true)
    const res = await fetch('/api/divisi', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: editKey, color }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingColor(false)
    if (!res.ok) {
      Swal.fire('Gagal', data.error || 'Gagal mengubah warna divisi.', 'error')
      return
    }
    await refreshDivisi()
    Swal.fire({
      icon: 'success',
      title: 'Warna Diperbarui',
      text: `Warna ${editKey} dan event yang memakainya sudah ikut berubah.`,
      confirmButtonColor: '#2563eb',
      timer: 2000,
      showConfirmButton: false,
    })
  }

  async function handleAvatar(file: File | null) {
    if (!file || !supabase || !profile) return
    if (file.size > 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal 1MB. Pilih foto yang lebih kecil.', 'warning')
      return
    }
    if (!file.type.startsWith('image/')) {
      Swal.fire('Format Tidak Didukung', 'Pilih file gambar (jpg/png/webp).', 'warning')
      return
    }
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) {
      setUploading(false)
      Swal.fire('Gagal Upload', error.message, 'error')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updErr } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
    setUploading(false)
    if (updErr) {
      Swal.fire('Gagal', updErr.message, 'error')
      return
    }
    await refreshProfile()
    Swal.fire({
      icon: 'success',
      title: 'Foto Diperbarui',
      text: 'Foto profil sudah diganti.',
      confirmButtonColor: '#2563eb',
      timer: 1800,
      showConfirmButton: false,
    })
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) {
      Swal.fire('Tidak Cocok', 'Konfirmasi password baru tidak sama.', 'warning')
      return
    }
    if (newPw.length < 6) {
      Swal.fire('Terlalu Pendek', 'Password minimal 6 karakter.', 'warning')
      return
    }
    const client = supabase
    if (!client) return
    setSavingPw(true)
    if (user?.email) {
      const verify = await client.auth.signInWithPassword({ email: user.email, password: oldPw })
      if (verify.error) {
        setSavingPw(false)
        Swal.fire('Password Lama Salah', verify.error.message, 'error')
        return
      }
    }
    const { error } = await client.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) {
      Swal.fire('Gagal', error.message, 'error')
      return
    }
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
    Swal.fire({
      icon: 'success',
      title: 'Password Diubah',
      text: 'Gunakan password baru pada login berikutnya.',
      confirmButtonColor: '#2563eb',
      timer: 1800,
      showConfirmButton: false,
    })
  }

  const initials = profile.full_name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero Banner */}
      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Akun</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Edit Profil</h1>
          <p className="text-blue-100 mt-2 text-sm">{user?.email}</p>
        </div>
      </section>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="max-w-3xl space-y-6">

        <div className="card-soft bg-white rounded-2xl p-5 sm:p-7">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Foto Profil</h2>
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-100" />
            ) : (
              <span className="avatar-circle" style={{ width: 80, height: 80, fontSize: '1.5rem' }}>{initials}</span>
            )}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleAvatar(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn btn-primary btn-sm min-h-[38px]" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? 'Mengunggah...' : 'Ganti Foto'}
              </button>
              <p className="text-xs text-gray-400">JPG/PNG/WebP, maksimal 1MB.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="card-soft bg-white rounded-2xl p-5 sm:p-7 space-y-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Data Diri</h2>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="ds-input" />
          </div>
          <div>
            <label htmlFor="jabatan" className="block text-sm font-medium text-gray-700 mb-1.5">Jabatan</label>
            <input id="jabatan" type="text" value={jabatan} onChange={(e) => setJabatan(e.target.value)} className="ds-input" placeholder="cth: Ketua Umum / Koordinator Sosma" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Menyimpan...' : 'Simpan Data'}</button>
        </form>

        {allowedKeys.length > 0 && (
          <form onSubmit={handleColorSubmit} className="card-soft bg-white rounded-2xl p-5 sm:p-7 space-y-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Warna Divisi</h2>
            {profile.role === 'admin' && (
              <div>
                <label htmlFor="editKey" className="block text-sm font-medium text-gray-700 mb-1.5">Pilih Divisi</label>
                <select
                  id="editKey"
                  value={editKey}
                  onChange={(e) => {
                    setEditKey(e.target.value)
                    const row = divisi.find((d) => d.key === e.target.value)
                    if (row) setColor(row.color)
                  }}
                  className="ds-input"
                >
                  {divisi.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
            {profile.role !== 'admin' && (
              <p className="text-sm text-gray-600">
                Warna divisi <span className="font-semibold">{divisi.find((d) => d.key === profile.divisi)?.label ?? profile.divisi}</span> milikmu.
              </p>
            )}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Pilih Warna</span>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Pilih warna ${c}`}
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  Warna lain
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Warna lama dipakai event divisi ini akan ikut diperbarui.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingColor}>{savingColor ? 'Menyimpan...' : 'Simpan Warna'}</button>
          </form>
        )}

        <form onSubmit={handlePasswordSubmit} className="card-soft bg-white rounded-2xl p-5 sm:p-7 space-y-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ganti Password</h2>
          <div>
            <label htmlFor="oldPw" className="block text-sm font-medium text-gray-700 mb-1.5">Password Lama</label>
            <div className="relative">
              <input id="oldPw" type={showOldPw ? 'text' : 'password'} required autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="ds-input pr-10" />
              <button type="button" onClick={() => setShowOldPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" aria-label="Toggle password lama">
                <Icon name={showOldPw ? 'eye-off' : 'eye'} cls="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="newPw" className="block text-sm font-medium text-gray-700 mb-1.5">Password Baru</label>
            <div className="relative">
              <input id="newPw" type={showNewPw ? 'text' : 'password'} required autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="ds-input pr-10" />
              <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" aria-label="Toggle password baru">
                <Icon name={showNewPw ? 'eye-off' : 'eye'} cls="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPw" className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Password Baru</label>
            <div className="relative">
              <input id="confirmPw" type={showConfirmPw ? 'text' : 'password'} required autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="ds-input pr-10" />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" aria-label="Toggle konfirmasi password">
                <Icon name={showConfirmPw ? 'eye-off' : 'eye'} cls="w-4 h-4" />
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? 'Menyimpan...' : 'Ganti Password'}</button>
        </form>

        <div className="text-center">
          <button type="button" className="btn btn-outline btn-sm min-h-[38px]" onClick={async () => { await refreshProfile(); await logout() }}>
            Keluar
          </button>
          <p className="text-sm text-gray-400 mt-2">
            <Link href="/" className="text-blue-600 font-semibold hover:underline">Kembali ke kalender</Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}