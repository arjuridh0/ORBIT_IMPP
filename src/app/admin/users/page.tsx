'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import Header from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import { useDivisi } from '@/hooks/useDivisi'
import { DIVISI_COLORS, DIVISI_LABELS, type Divisi } from '@/lib/constants'

interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  jabatan: string | null
  divisi: string
  avatar_url: string | null
}

const emptyForm = { full_name: '', email: '', password: '', jabatan: '', role: 'editor', divisi: 'bph' }

export default function AdminUsersPage() {
  const { profile, loading } = useAuth()
  const { divisi } = useDivisi()
  const items = divisi.length > 0
    ? divisi
    : (Object.keys(DIVISI_COLORS) as Divisi[]).map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] }))
  const [users, setUsers] = useState<AdminUser[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFormPw, setShowFormPw] = useState(false)

  // Avatar Management for BPH
  const [avatarTarget, setAvatarTarget] = useState<AdminUser | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  function openAvatar(u: AdminUser) {
    setAvatarTarget(u)
    setAvatarPreview(u.avatar_url)
    setAvatarFile(null)
  }

  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran foto adalah 2MB.', 'warning')
      return
    }
    if (!file.type.startsWith('image/')) {
      Swal.fire('Format Tidak Didukung', 'Harap pilih file gambar (JPG, PNG, atau WEBP).', 'warning')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveAvatar() {
    if (!avatarTarget || !avatarFile) return
    setSavingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', avatarFile)
      const res = await fetch(`/api/admin/users/${avatarTarget.id}/avatar`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan foto')
      Swal.fire({
        icon: 'success',
        title: 'Foto Tersimpan',
        text: `Foto profil ${avatarTarget.full_name} berhasil diperbarui.`,
        timer: 1600,
        showConfirmButton: false,
      })
      setAvatarTarget(null)
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto'
      Swal.fire('Gagal', msg, 'error')
    } finally {
      setSavingAvatar(false)
    }
  }

  async function handleDeleteAvatar() {
    if (!avatarTarget) return
    const result = await Swal.fire({
      title: 'Hapus foto profil?',
      text: `Foto profil ${avatarTarget.full_name} akan dihapus.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
    })
    if (!result.isConfirmed) return
    setSavingAvatar(true)
    try {
      const res = await fetch(`/api/admin/users/${avatarTarget.id}/avatar`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus foto')
      Swal.fire({
        icon: 'success',
        title: 'Foto Dihapus',
        text: 'Foto profil telah dihapus.',
        timer: 1600,
        showConfirmButton: false,
      })
      setAvatarTarget(null)
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus foto'
      Swal.fire('Gagal', msg, 'error')
    } finally {
      setSavingAvatar(false)
    }
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (!res.ok) return
    const data = await res.json()
    setUsers(data.users || [])
  }, [])

  const canDelete = useCallback((target: AdminUser): boolean => {
    if (!profile) return false
    if (profile.id === target.id) return false
    const cr = profile.role
    const tr = target.role
    if (cr === 'superadmin') return true
    if (cr === 'ketua') return tr !== 'superadmin'
    if (cr === 'admin') return tr === 'editor'
    return false
  }, [profile])

  useEffect(() => {
    if (profile && ['admin', 'ketua', 'superadmin'].includes(profile.role)) load()
  }, [profile, load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      Swal.fire('Gagal', data.error || 'Gagal membuat user', 'error')
      return
    }
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: `Akun ${form.full_name} berhasil dibuat.`,
      confirmButtonColor: '#2563eb',
      timer: 2000,
      showConfirmButton: false,
    })
    setForm(emptyForm)
    load()
  }

  function openEdit(u: AdminUser) {
    const divisiOptions = items
      .map((d) => `<option value="${d.key}" ${d.key === u.divisi ? 'selected' : ''}>${d.label}</option>`)
      .join('')
    Swal.fire({
      title: 'Edit Profil',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input id="sw-name" type="text" class="ds-input" value="${u.full_name}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
            <input id="sw-jabatan" type="text" class="ds-input" value="${u.jabatan || ''}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select id="sw-role" class="ds-input">
                <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Divisi</label>
              <select id="sw-divisi" class="ds-input">${divisiOptions}</select>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: async () => {
        const name = (document.getElementById('sw-name') as HTMLInputElement).value.trim()
        const jabatan = (document.getElementById('sw-jabatan') as HTMLInputElement).value.trim()
        const role = (document.getElementById('sw-role') as HTMLSelectElement).value
        const divisi = (document.getElementById('sw-divisi') as HTMLSelectElement).value
        if (!name) {
          Swal.showValidationMessage('Nama wajib diisi')
          return false
        }
        const res = await fetch(`/api/admin/users/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: name, jabatan, role, divisi }),
        })
        const data = await res.json()
        if (!res.ok) {
          Swal.showValidationMessage(data.error || 'Gagal menyimpan')
          return false
        }
        return { name, jabatan, role, divisi }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Tersimpan',
          text: `Profil ${result.value.name} diperbarui.`,
          confirmButtonColor: '#2563eb',
          timer: 1800,
          showConfirmButton: false,
        })
        load()
      }
    })
  }

  function openResetPassword(u: AdminUser) {
    Swal.fire({
      title: 'Reset Password',
      html: `
        <div class="space-y-3 text-left">
          <p class="text-sm text-gray-500">Password baru untuk <span class="font-semibold text-gray-800">${u.full_name}</span> (${u.email})</p>
          <div class="relative">
            <input id="sw-pass" type="password" class="ds-input pr-10" placeholder="Minimal 6 karakter">
            <button type="button" id="sw-pass-toggle" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" aria-label="Toggle password">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      `,
      didOpen: () => {
        const inp = document.getElementById('sw-pass') as HTMLInputElement
        const btn = document.getElementById('sw-pass-toggle') as HTMLButtonElement
        if (btn && inp) {
          btn.addEventListener('click', () => {
            const isText = inp.type === 'text'
            inp.type = isText ? 'password' : 'text'
            btn.innerHTML = isText
              ? `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
              : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 01-4.24-4.24"/></svg>`
          })
        }
      },
      confirmButtonText: 'Reset',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: async () => {
        const password = (document.getElementById('sw-pass') as HTMLInputElement).value
        if (password.length < 6) {
          Swal.showValidationMessage('Password minimal 6 karakter')
          return false
        }
        const res = await fetch(`/api/admin/users/${u.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()
        if (!res.ok) {
          Swal.showValidationMessage(data.error || 'Gagal reset password')
          return false
        }
        return password
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: `Password ${u.full_name} berhasil direset.`,
          confirmButtonColor: '#2563eb',
          timer: 1800,
          showConfirmButton: false,
        })
      }
    })
  }

  function openDelete(u: AdminUser) {
    Swal.fire({
      title: 'Hapus user?',
      html: `<p class="text-sm text-gray-600">Akun <span class="font-semibold">${u.full_name}</span> (${u.email}) akan dihapus beserta kegiatan yang ia buat. Tindakan ini tidak bisa dibatalkan.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Hapus',
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Batal',
    }).then(async (result) => {
      if (!result.isConfirmed) return
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        Swal.fire('Gagal', data.error || 'Gagal menghapus user', 'error')
        return
      }
      Swal.fire({
        icon: 'success',
        title: 'Terhapus',
        text: `Akun ${u.full_name} dihapus.`,
        confirmButtonColor: '#2563eb',
        timer: 1800,
        showConfirmButton: false,
      })
      load()
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
          <p className="text-sm text-gray-700">Silakan masuk terlebih dahulu.</p>
          <Link href="/login" className="text-sm font-semibold text-blue-600 hover:underline">Halaman Masuk</Link>
        </div>
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
          <p className="text-sm text-gray-700">Akses ditolak. Halaman ini hanya untuk admin.</p>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">Kembali ke kalender</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Banner */}
      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Admin</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Kelola User</h1>
          <p className="text-blue-100 mt-2 text-sm">Daftarkan akun BPH dan koor divisi</p>
        </div>
      </section>

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 pb-10">
        {/* Tombol Tambah User */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <span className="text-blue-600"><Icon name="users" /></span>
            Daftar User ({users.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <Icon name="plus" cls="w-3.5 h-3.5" />
            Tambah User
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <section className="bg-white rounded-xl card-soft p-4">
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-3">
              {users.map((u) => (
                <div key={u.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                        {(u.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      {u.jabatan && <p className="text-xs text-gray-400">{u.jabatan}</p>}
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.role === 'ketua' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'ketua' ? 'Ketua' : u.role === 'admin' ? 'Admin' : 'Editor'}
                      </span>
                      {items.some((d) => d.key === u.divisi) && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: items.find((d) => d.key === u.divisi)?.color }} />
                          {items.find((d) => d.key === u.divisi)?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" onClick={() => openAvatar(u)} className="btn btn-outline btn-sm">Foto</button>
                      <button type="button" onClick={() => openEdit(u)} className="btn btn-outline btn-sm">Edit</button>
                      <button type="button" onClick={() => openResetPassword(u)} className="btn btn-outline btn-sm">Reset PW</button>
                      {canDelete(u) && (
                        <button type="button" onClick={() => openDelete(u)} className="btn btn-danger btn-sm">Hapus</button>
                      )}
                    </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">Belum ada user terdaftar</p>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-3 font-bold">Nama</th>
                    <th className="py-2 pr-3 font-bold">Email</th>
                    <th className="py-2 pr-3 font-bold">Jabatan</th>
                    <th className="py-2 pr-3 font-bold">Role</th>
                    <th className="py-2 pr-3 font-bold">Divisi</th>
                    <th className="py-2 font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 row-zebra hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt={u.full_name} className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {(u.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{u.full_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">{u.email}</td>
                      <td className="py-2.5 pr-3 text-gray-600">{u.jabatan || '-'}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs font-semibold ${u.role === 'admin' ? 'text-blue-700' : 'text-gray-600'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Editor'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {items.some((d) => d.key === u.divisi) ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: items.find((d) => d.key === u.divisi)?.color }} />
                            {items.find((d) => d.key === u.divisi)?.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{u.divisi}</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => openAvatar(u)} className="btn btn-outline btn-sm min-h-[38px]" title="Kelola foto profil">Foto</button>
                          <button type="button" onClick={() => openEdit(u)} className="btn btn-outline btn-sm min-h-[38px]">Edit</button>
                          <button type="button" onClick={() => openResetPassword(u)} className="btn btn-outline btn-sm min-h-[38px]">Reset PW</button>
                          {canDelete(u) && (
                            <button type="button" onClick={() => openDelete(u)} className="btn btn-danger btn-sm min-h-[38px]">Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-gray-400">Belum ada user terdaftar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>


      {/* Modal Kelola Foto Profil */}
      {avatarTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900">Kelola Foto Profil</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {avatarTarget.full_name} ({avatarTarget.jabatan || avatarTarget.divisi})
            </p>

            <div className="my-6 flex justify-center">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {(avatarTarget.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={savingAvatar}
                className="w-full btn btn-outline btn-sm py-2 flex items-center justify-center gap-1.5"
              >
                <Icon name="camera" cls="w-4 h-4 text-blue-600" />
                <span>{avatarPreview ? 'Pilih Foto Lain' : 'Pilih Foto (JPG/PNG)'}</span>
              </button>

              {avatarFile && (
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={savingAvatar}
                  className="w-full btn btn-primary btn-sm py-2"
                >
                  {savingAvatar ? 'Menyimpan...' : 'Simpan Foto Baru'}
                </button>
              )}

              {avatarTarget.avatar_url && !avatarFile && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={savingAvatar}
                  className="w-full btn btn-danger btn-sm py-2"
                >
                  Hapus Foto Profil
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setAvatarTarget(null)
                  setAvatarFile(null)
                }}
                disabled={savingAvatar}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 font-medium"
              >
                Tutup / Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scaleUp">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Tambah User</h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setForm(emptyForm) }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
              >
                <Icon name="close" cls="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={async (e) => { await handleSubmit(e); if (!saving) setShowAddModal(false) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="ds-input" placeholder="Nama anggota" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ds-input" placeholder="nama@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showFormPw ? 'text' : 'password'} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="ds-input pr-10" placeholder="Minimal 6 karakter" />
                  <button type="button" onClick={() => setShowFormPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition" aria-label="Toggle password">
                    <Icon name={showFormPw ? 'eye-off' : 'eye'} cls="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="ds-input">
                    <option value="editor">Editor (Koor/Sekjen)</option>
                    <option value="admin">Admin (BPH)</option>
                    <option value="ketua">Ketua</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Divisi</label>
                  <select value={form.divisi} onChange={(e) => setForm({ ...form, divisi: e.target.value })} className="ds-input">
                    {items.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input type="text" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} className="ds-input" placeholder="cth: Koor Kaderisasi" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAddModal(false); setForm(emptyForm) }} className="btn btn-outline flex-1">Batal</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Menyimpan...' : 'Daftarkan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
