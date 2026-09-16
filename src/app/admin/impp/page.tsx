'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import Header from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import { escapeHtml } from '@/lib/konten'
import PushNotificationButton from '@/components/PushNotificationButton'
import type { DivisiInfo } from '@/hooks/useDivisi'
import { AdminImppSkeleton } from '@/components/Skeleton'
import MatrixLoader from '@/components/MatrixLoader'

const ALLOWED_ROLES = ['admin', 'ketua', 'superadmin']

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-3 h-3 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: color }} />
}

export default function KelolaImppPage() {
  const { profile, loading } = useAuth()
  const [konten, setKonten] = useState<Record<string, string>>({})
  const [divisi, setDivisi] = useState<DivisiInfo[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [kRes, dRes] = await Promise.all([
      fetch('/api/konten'),
      fetch('/api/divisi'),
    ])
    const kData = await kRes.json()
    const dData = await dRes.json()
    setKonten(kData.konten || {})
    setDivisi(dData.divisi || [])
    setLoadingData(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveKonten(updates: Record<string, string>) {
    setSaving(true)
    try {
      const res = await fetch('/api/konten', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ konten: updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
      await load()
      Swal.fire({ icon: 'success', title: 'Tersimpan', timer: 1400, showConfirmButton: false })
    } catch (err: unknown) {
      Swal.fire('Gagal', err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openEditKabinet() {
    Swal.fire({
      title: 'Edit Info Kabinet',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Kabinet</label>
            <input id="sw-nama" type="text" class="ds-input" value="${escapeHtml(konten.kabinet_nama || '')}" placeholder="cth: Gemilang">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Periode</label>
            <input id="sw-periode" type="text" class="ds-input" value="${escapeHtml(konten.kabinet_periode || '')}" placeholder="cth: 2026/2027">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Bagan <span class="text-gray-400 font-normal">(opsional)</span></label>
            <input id="sw-desc" type="text" class="ds-input" value="${escapeHtml(konten.kabinet_desc || '')}" placeholder="Teks kecil di halaman Struktur Organisasi">
          </div>
        </div>
      `,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: () => {
        const nama = (document.getElementById('sw-nama') as HTMLInputElement).value.trim()
        const periode = (document.getElementById('sw-periode') as HTMLInputElement).value.trim()
        const desc = (document.getElementById('sw-desc') as HTMLInputElement).value.trim()
        return { nama, periode, desc }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      const { nama, periode, desc } = result.value
      await saveKonten({
        kabinet_nama: nama,
        kabinet_periode: periode,
        kabinet_desc: desc || 'Bagan kepengurusan IMPP periode berjalan.',
      })
    })
  }

  function openEditVisiMisi() {
    Swal.fire({
      title: 'Edit Visi & Misi',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Visi</label>
            <textarea id="sw-visi" class="ds-input resize-y" rows="3">${escapeHtml(konten.visi || '')}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Misi</label>
            <textarea id="sw-misi" class="ds-input resize-y" rows="5">${escapeHtml(konten.misi || '')}</textarea>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">Tulis setiap poin misi pada baris baru.</p>
      `,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: () => {
        const visi = (document.getElementById('sw-visi') as HTMLTextAreaElement).value.trim()
        const misi = (document.getElementById('sw-misi') as HTMLTextAreaElement).value.trim()
        if (!visi || !misi) {
          Swal.showValidationMessage('Visi dan misi tidak boleh kosong')
          return false
        }
        return { visi, misi }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      await saveKonten(result.value)
    })
  }

  async function openAddDivisi() {
    const { value } = await Swal.fire({
      title: 'Tambah Divisi',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Key <span class="text-gray-400 font-normal">(lowercase, tanpa spasi, misal: kwu)</span></label>
            <input id="sw-key" type="text" class="ds-input" placeholder="kwu">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Divisi</label>
            <input id="sw-label" type="text" class="ds-input" placeholder="Kewirausahaan">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Warna</label>
            <input id="sw-color" type="color" class="h-10 w-full rounded cursor-pointer" value="#64748b">
          </div>
        </div>
      `,
      confirmButtonText: 'Tambah',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: async () => {
        const key = (document.getElementById('sw-key') as HTMLInputElement).value.trim()
        const label = (document.getElementById('sw-label') as HTMLInputElement).value.trim()
        const color = (document.getElementById('sw-color') as HTMLInputElement).value.trim()
        if (!key || !label) { Swal.showValidationMessage('Key dan nama wajib diisi'); return false }
        if (!/^[a-z0-9_]+$/.test(key)) { Swal.showValidationMessage('Key hanya boleh huruf kecil, angka, dan underscore'); return false }
        const res = await fetch('/api/divisi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, label, color }),
        })
        const data = await res.json()
        if (!res.ok) { Swal.showValidationMessage(data.error || 'Gagal'); return false }
        return true
      },
    })
    if (value) { await load(); Swal.fire({ icon: 'success', title: 'Divisi ditambahkan', timer: 1400, showConfirmButton: false }) }
  }

  async function openEditDivisi(d: DivisiInfo) {
    const { isConfirmed } = await Swal.fire({
      title: `Edit Divisi — ${d.label}`,
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Divisi</label>
            <input id="sw-label" type="text" class="ds-input" value="${escapeHtml(d.label)}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Warna</label>
            <input id="sw-color" type="color" class="h-10 w-full rounded cursor-pointer" value="${d.color}">
          </div>
        </div>
      `,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#2563eb',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: async () => {
        const label = (document.getElementById('sw-label') as HTMLInputElement).value.trim()
        const color = (document.getElementById('sw-color') as HTMLInputElement).value.trim()
        if (!label) { Swal.showValidationMessage('Nama wajib diisi'); return false }
        const res = await fetch('/api/divisi', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: d.key, label, color }),
        })
        const data = await res.json()
        if (!res.ok) { Swal.showValidationMessage(data.error || 'Gagal'); return false }
        return true
      },
    })
    if (isConfirmed) { await load(); Swal.fire({ icon: 'success', title: 'Divisi diperbarui', timer: 1400, showConfirmButton: false }) }
  }

  async function deleteDivisi(d: DivisiInfo) {
    const result = await Swal.fire({
      title: `Hapus divisi ${d.label}?`,
      text: 'Semua data kegiatan dengan warna divisi ini tetap ada, hanya data divisi yang dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal',
    })
    if (!result.isConfirmed) return
    const res = await fetch('/api/divisi', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: d.key }),
    })
    const data = await res.json()
    if (!res.ok) { Swal.fire('Tidak bisa dihapus', data.error, 'error'); return }
    await load()
    Swal.fire({ icon: 'success', title: 'Divisi dihapus', timer: 1400, showConfirmButton: false })
  }

  if (loading) {
    return <AdminImppSkeleton />
  }

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
          <p className="text-sm text-gray-700">Akses ditolak. Halaman ini hanya untuk pengurus inti.</p>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">Kembali ke kalender</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Admin</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Kelola IMPP</h1>
          <p className="text-blue-100 mt-2 text-sm">Atur info kabinet, visi misi, dan divisi organisasi</p>
        </div>
      </section>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 pb-16 space-y-6">
        {loadingData ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl card-soft p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-40 bg-gray-200/80 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200/80 rounded-lg animate-pulse" />
                </div>
                <div className="h-4 w-full max-w-md bg-gray-200/80 rounded animate-pulse" />
                <div className="h-16 w-full bg-gray-200/80 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Seksi 1: Info Kabinet */}
            <section className="bg-white rounded-xl card-soft p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Icon name="info" cls="w-4 h-4 text-blue-600" />
                  Info Kabinet
                </h2>
                <button type="button" onClick={openEditKabinet} disabled={saving}
                  className="btn btn-outline btn-sm flex items-center gap-1.5">
                  {saving ? <MatrixLoader size="sm" /> : <Icon name="pencil" cls="w-3.5 h-3.5" />}
                  <span>Edit</span>
                </button>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Nama Kabinet</dt>
                  <dd className="font-semibold text-gray-900">{konten.kabinet_nama || <span className="text-gray-400 font-normal italic">Belum diisi</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Periode</dt>
                  <dd className="font-semibold text-gray-900">{konten.kabinet_periode || <span className="text-gray-400 font-normal italic">Belum diisi</span>}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Deskripsi Bagan</dt>
                  <dd className="text-gray-700">{konten.kabinet_desc || <span className="text-gray-400 italic">Belum diisi</span>}</dd>
                </div>
              </dl>
            </section>

            {/* Seksi 2: Visi Misi */}
            <section className="bg-white rounded-xl card-soft p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Icon name="bulb" cls="w-4 h-4 text-blue-600" />
                  Visi &amp; Misi
                </h2>
                <button type="button" onClick={openEditVisiMisi} disabled={saving}
                  className="btn btn-outline btn-sm flex items-center gap-1.5">
                  {saving ? <MatrixLoader size="sm" /> : <Icon name="pencil" cls="w-3.5 h-3.5" />}
                  <span>Edit</span>
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Visi</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{konten.visi || <span className="text-gray-400 italic">Belum ada</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Misi</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">{konten.misi || <span className="text-gray-400 italic">Belum ada</span>}</p>
                </div>
              </div>
            </section>

            {/* Seksi 3: Kelola Divisi */}
            <section className="bg-white rounded-xl card-soft p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Icon name="palette" cls="w-4 h-4 text-blue-600" />
                  Kelola Divisi ({divisi.length})
                </h2>
                <button type="button" onClick={openAddDivisi}
                  className="btn btn-primary btn-sm flex items-center gap-1.5">
                  <Icon name="plus" cls="w-3.5 h-3.5" /> Tambah Divisi
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Divisi tersimpan di database — otomatis muncul di kalender, filter, dan bagan struktur.</p>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="py-2 pr-3 font-bold">Key</th>
                      <th className="py-2 pr-3 font-bold">Nama</th>
                      <th className="py-2 pr-3 font-bold">Warna</th>
                      <th className="py-2 font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisi.map((d) => (
                      <tr key={d.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="py-2.5 pr-3 font-mono text-xs text-gray-500">{d.key}</td>
                        <td className="py-2.5 pr-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <ColorDot color={d.color} />
                            {d.label}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-gray-500">{d.color}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => openEditDivisi(d)} className="btn btn-outline btn-sm">Edit</button>
                            <button type="button" onClick={() => deleteDivisi(d)} className="btn btn-danger btn-sm">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-2">
                {divisi.map((d) => (
                  <div key={d.key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <ColorDot color={d.color} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{d.label}</p>
                        <p className="text-xs text-gray-400 font-mono">{d.key} · {d.color}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <button type="button" onClick={() => openEditDivisi(d)} className="btn btn-outline btn-sm">Edit</button>
                      <button type="button" onClick={() => deleteDivisi(d)} className="btn btn-danger btn-sm">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            {/* Seksi 4: Notifikasi */}
            <section className="bg-white rounded-xl card-soft p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-4">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                  <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />
                </svg>
                Notifikasi Push
              </h2>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Kirim notifikasi ke semua pengguna yang sudah mengaktifkan notifikasi di aplikasi ini.</p>
                <button
                  type="button"
                  onClick={async () => {
                    const { value } = await Swal.fire({
                      title: 'Broadcast Notifikasi',
                      html: `
                        <div class="space-y-3 text-left">
                          <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                            <input id="sw-btitle" type="text" class="ds-input" placeholder="Pengumuman penting" value="ORBIT IMPP">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                            <textarea id="sw-bbody" class="ds-input" rows="3" placeholder="Tulis pesan di sini..."></textarea>
                          </div>
                        </div>
                      `,
                      confirmButtonText: 'Kirim ke Semua',
                      confirmButtonColor: '#2563eb',
                      showCancelButton: true,
                      cancelButtonText: 'Batal',
                      preConfirm: async () => {
                        const title = (document.getElementById('sw-btitle') as HTMLInputElement).value.trim()
                        const body = (document.getElementById('sw-bbody') as HTMLTextAreaElement).value.trim()
                        if (!title || !body) { Swal.showValidationMessage('Judul dan isi pesan wajib diisi'); return false }
                        const res = await fetch('/api/push/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title, body }),
                        })
                        const data = await res.json()
                        if (!res.ok) { Swal.showValidationMessage(data.error || 'Gagal kirim'); return false }
                        return data
                      },
                    })
                    if (value) {
                      Swal.fire({ icon: 'success', title: `Terkirim ke ${value.sent} subscriber`, timer: 2000, showConfirmButton: false })
                    }
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />
                  </svg>
                  Broadcast Notifikasi
                </button>
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1.5">Status notifikasi di perangkat ini:</p>
                  <PushNotificationButton />
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
