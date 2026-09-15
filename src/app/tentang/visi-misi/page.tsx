'use client'

import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import Header from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import { escapeHtml, paragraphs } from '@/lib/konten'

export default function VisiMisiPage() {
  const { profile, loading } = useAuth()
  const [konten, setKonten] = useState<Record<string, string>>({})

  async function load() {
    try {
      const res = await fetch('/api/konten')
      if (!res.ok) return
      const data = await res.json()
      setKonten(data.konten || {})
    } catch {
      // konten default kosong
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function openEdit() {
    const { value } = await Swal.fire({
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
      preConfirm: async () => {
        const visi = (document.getElementById('sw-visi') as HTMLTextAreaElement).value.trim()
        const misi = (document.getElementById('sw-misi') as HTMLTextAreaElement).value.trim()
        if (!visi || !misi) {
          Swal.showValidationMessage('Visi dan misi tidak boleh kosong')
          return false
        }
        const res = await fetch('/api/konten', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ konten: { visi, misi } }),
        })
        const data = await res.json()
        if (!res.ok) {
          Swal.showValidationMessage(data.error || 'Gagal menyimpan')
          return false
        }
        return { visi, misi }
      },
    })
    if (!value) return
    await load()
    Swal.fire({
      icon: 'success',
      title: 'Tersimpan',
      timer: 1500,
      showConfirmButton: false,
      confirmButtonColor: '#2563eb',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="hero-banner pb-12 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          {/* Logo Organisasi: IMPP UIN Walisongo Semarang */}
          <div className="inline-flex items-center justify-center bg-white/95 backdrop-blur-md px-6 py-2.5 sm:px-7 sm:py-3 rounded-2xl shadow-sm border border-white/80 mb-4 transition-transform hover:scale-105 duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-impp.webp"
              alt="Logo IMPP UIN Walisongo"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Tentang IMPP</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">Visi &amp; Misi</h1>
          <p className="text-blue-100 mt-3 max-w-xl mx-auto">Landasan gerak dan arah organisasi.</p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="space-y-6">
          <section className="bg-white rounded-xl card-soft p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600"><Icon name="bulb" /></span>
              Visi
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{konten.visi || 'Belum ada konten'}</p>
          </section>

          <section className="bg-white rounded-xl card-soft p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600"><Icon name="note" /></span>
              Misi
            </h2>
            <ul className="list-decimal list-outside pl-5 space-y-1.5 text-gray-700">
              {paragraphs(konten.misi || '').map((t, i) => (
                <li key={i}>{t}</li>
              ))}
              {paragraphs(konten.misi || '').length === 0 && (
                <li className="text-gray-400">Belum ada konten</li>
              )}
            </ul>
          </section>

          {/* Edit button desktop */}
          {!loading && profile && ['admin', 'ketua', 'superadmin'].includes(profile.role) && (
            <div className="hidden sm:flex justify-end">
              <button type="button" onClick={openEdit} className="btn btn-primary flex items-center gap-2">
                <Icon name="pencil" cls="w-4 h-4" />
                Edit Konten
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FAB admin — mobile only */}
      {!loading && profile && ['admin', 'ketua', 'superadmin'].includes(profile.role) && (
        <button
          type="button"
          onClick={openEdit}
          className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
          aria-label="Edit konten visi misi"
        >
          <Icon name="pencil" cls="w-5 h-5" />
        </button>
      )}
    </div>
  )
}