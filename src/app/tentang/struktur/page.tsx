'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase/client'
import { useDivisi } from '@/hooks/useDivisi'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import Swal from 'sweetalert2'

interface Pengurus {
  id: string
  full_name: string
  role: string
  jabatan: string | null
  divisi: string
  avatar_url: string | null
}

interface Point {
  x: number
  top: number
  bottom: number
  width: number
  height: number
}

function initial(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}

export default function StrukturPage() {
  const { divisi } = useDivisi()
  const { profile } = useAuth()
  const [pengurus, setPengurus] = useState<Pengurus[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Modal State for Photo Management
  const [editTarget, setEditTarget] = useState<Pengurus | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFullChart, setShowFullChart] = useState(false)
  const [openDivisi, setOpenDivisi] = useState<string | null>(null)

  // Layout Canvas Ref & Measurement State
  const canvasRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{
    ketua?: Point
    sekre?: Point
    bendahara?: Point
    koors: Point[]
    canvasWidth: number
    canvasHeight: number
  } | null>(null)

  const isBph = profile?.role === 'admin'

  const canEdit = useCallback(
    (target: Pengurus) => {
      if (!profile) return false
      if (isBph) return true
      return profile.id === target.id
    },
    [profile, isBph]
  )

  const loadPengurus = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, jabatan, divisi, avatar_url')
        .order('full_name')
      setPengurus((data as Pengurus[]) || [])
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadPengurus()
  }, [loadPengurus])

  // Role categorizations
  const ketua = useMemo(
    () =>
      pengurus.find((p) => {
        if (p.role !== 'admin') return false
        const text = `${p.full_name} ${p.jabatan || ''}`.toLowerCase()
        return text.includes('ketua')
      }) || pengurus.find((p) => p.role === 'admin'),
    [pengurus]
  )

  const bphMembers = useMemo(
    () => pengurus.filter((p) => p.role === 'admin' && p.id !== ketua?.id),
    [pengurus, ketua]
  )

  const sekretaris = useMemo(
    () =>
      bphMembers.find((p) => {
        const text = `${p.full_name} ${p.jabatan || ''}`.toLowerCase()
        return text.includes('sekretaris') || text.includes('sekre')
      }) || bphMembers[0],
    [bphMembers]
  )

  const bendahara = useMemo(
    () =>
      bphMembers.find((p) => {
        if (p.id === sekretaris?.id) return false
        const text = `${p.full_name} ${p.jabatan || ''}`.toLowerCase()
        return text.includes('bendahara')
      }) || bphMembers.find((p) => p.id !== sekretaris?.id),
    [bphMembers, sekretaris]
  )

  const byDivisi = useMemo(() => {
    const m = new Map<string, Pengurus[]>()
    pengurus.forEach((p) => {
      const list = m.get(p.divisi) || []
      list.push(p)
      m.set(p.divisi, list)
    })
    return m
  }, [pengurus])

  const divisionsWithKoor = useMemo(() => {
    return divisi
      .filter((d) => d.key !== 'bph')
      .map((d) => {
        const list = byDivisi.get(d.key) || []
        const koor =
          list.find((x) => (x.jabatan || '').toLowerCase().includes('koor')) ||
          list[0] || {
            id: `empty-${d.key}`,
            full_name: `Koor ${d.label}`,
            role: 'editor',
            jabatan: 'Koordinator Divisi',
            divisi: d.key,
            avatar_url: null,
          }
        const anggota = list.filter((x) => x.id !== koor.id)
        return { divisi: d, koor, anggota }
      })
  }, [divisi, byDivisi])

  // Measure DOM Elements to calculate SVG line coordinates
  const updateLines = useCallback(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current
    const cRect = container.getBoundingClientRect()

    const elKetuaAvatar = container.querySelector('#avatar-ketua')
    const elKetuaNode = container.querySelector('#node-ketua')
    const elSekreAvatar = container.querySelector('#avatar-sekre')
    const elSekreNode = container.querySelector('#node-sekre')
    const elBendaharaAvatar = container.querySelector('#avatar-bendahara')
    const elBendaharaNode = container.querySelector('#node-bendahara')
    const elKoors = container.querySelectorAll('.avatar-koor')

    if (!elKetuaAvatar || !elKetuaNode || !elSekreAvatar || !elSekreNode || !elBendaharaAvatar || !elBendaharaNode || elKoors.length === 0) return

    const measure = (el: Element): Point => {
      const r = el.getBoundingClientRect()
      return {
        x: r.left - cRect.left + r.width / 2,
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
        width: r.width,
        height: r.height,
      }
    }

    const kAvatar = measure(elKetuaAvatar)
    const kNode = measure(elKetuaNode)
    const sAvatar = measure(elSekreAvatar)
    const sNode = measure(elSekreNode)
    const bAvatar = measure(elBendaharaAvatar)
    const bNode = measure(elBendaharaNode)
    const koors = Array.from(elKoors).map(measure)

    // Sort koors from left to right by x
    koors.sort((a, b) => a.x - b.x)

    // Garis ketua mulai DARI BAWAH teks / kartu Ketua Umum
    const k: Point = {
      x: kAvatar.x,
      top: kAvatar.top,
      bottom: kNode.bottom + 8,
      width: kAvatar.width,
      height: kAvatar.height,
    }

    // Target garis masuk ke atas avatar Sekre & Bendahara, batas bawah di bawah teks
    const s: Point = {
      x: sAvatar.x,
      top: sAvatar.top - 2,
      bottom: sNode.bottom + 14,
      width: sAvatar.width,
      height: sAvatar.height,
    }

    const b: Point = {
      x: bAvatar.x,
      top: bAvatar.top - 2,
      bottom: bNode.bottom + 14,
      width: bAvatar.width,
      height: bAvatar.height,
    }

    setCoords({
      ketua: k,
      sekre: s,
      bendahara: b,
      koors,
      canvasWidth: cRect.width,
      canvasHeight: cRect.height,
    })
  }, [])

  useEffect(() => {
    // Initial measurement and on resize
    const timer = setTimeout(updateLines, 100)
    const ro = new ResizeObserver(() => updateLines())
    if (canvasRef.current) ro.observe(canvasRef.current)
    window.addEventListener('resize', updateLines)

    return () => {
      clearTimeout(timer)
      ro.disconnect()
      window.removeEventListener('resize', updateLines)
    }
  }, [updateLines, divisionsWithKoor, pengurus])

  // Open modal to manage photo
  function openEditPhoto(target: Pengurus) {
    setEditTarget(target)
    setPreviewUrl(target.avatar_url)
    setSelectedFile(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  async function handleSavePhoto() {
    if (!editTarget || !selectedFile) return
    setSavingPhoto(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`/api/admin/users/${editTarget.id}/avatar`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan foto')
      }

      setPengurus((prev) =>
        prev.map((p) => (p.id === editTarget.id ? { ...p, avatar_url: data.avatar_url } : p))
      )

      Swal.fire({
        icon: 'success',
        title: 'Foto Berhasil Diperbarui',
        text: `Foto profil ${editTarget.full_name} berhasil disimpan.`,
        timer: 1800,
        showConfirmButton: false,
      })

      setEditTarget(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat upload'
      Swal.fire('Gagal Upload', msg, 'error')
    } finally {
      setSavingPhoto(false)
    }
  }

  async function handleDeletePhoto() {
    if (!editTarget) return

    const result = await Swal.fire({
      title: 'Hapus foto profil?',
      text: `Foto profil ${editTarget.full_name} akan dihapus dan kembali menggunakan inisial nama.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
    })

    if (!result.isConfirmed) return

    setSavingPhoto(true)
    try {
      const res = await fetch(`/api/admin/users/${editTarget.id}/avatar`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus foto')

      setPengurus((prev) =>
        prev.map((p) => (p.id === editTarget.id ? { ...p, avatar_url: null } : p))
      )

      Swal.fire({
        icon: 'success',
        title: 'Foto Dihapus',
        text: 'Foto profil telah dihapus.',
        timer: 1600,
        showConfirmButton: false,
      })

      setEditTarget(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus foto'
      Swal.fire('Gagal', msg, 'error')
    } finally {
      setSavingPhoto(false)
    }
  }

  // Generate SVG Path for Lines
  const svgContent = useMemo(() => {
    if (!coords || !coords.ketua || !coords.sekre || !coords.bendahara || coords.koors.length === 0) {
      return null
    }

    const { ketua: k, sekre: s, bendahara: b, koors } = coords
    const r = 12 // corner radius

    // Level 1 Fork (Under Ketua, above BPH)
    const yFork1 = k.bottom + (Math.min(s.top, b.top) - k.bottom) * 0.5

    // Level 2 Fork (Below BPH, above Koors)
    const bphBottom = Math.max(s.bottom, b.bottom)
    const koorTop = Math.min(...koors.map((c) => c.top))
    const yFork2 = bphBottom + (koorTop - bphBottom) * 0.45

    // 1. Line from Ketua straight down to Junction 1
    const pathKetua = `M ${k.x} ${k.bottom} L ${k.x} ${yFork1}`

    // 2. Branch to Sekretaris (Left) with rounded turn down
    const pathSekre =
      s.x < k.x
        ? `M ${k.x} ${yFork1} L ${s.x + r} ${yFork1} Q ${s.x} ${yFork1} ${s.x} ${yFork1 + r} L ${s.x} ${s.top}`
        : `M ${k.x} ${yFork1} L ${s.x} ${s.top}`

    // 3. Branch to Bendahara (Right) with rounded turn down
    const pathBendahara =
      b.x > k.x
        ? `M ${k.x} ${yFork1} L ${b.x - r} ${yFork1} Q ${b.x} ${yFork1} ${b.x} ${yFork1 + r} L ${b.x} ${b.top}`
        : `M ${k.x} ${yFork1} L ${b.x} ${b.top}`

    // 4. Branch to Koor Divisi:
    // IMPORTANT: It travels to the SIDE (outside Bendahara) and NEVER cuts through between Sekretaris and Bendahara!
    const lastKoor = koors[koors.length - 1]
    const xSide = Math.min(Math.max(b.x + 80, (b.x + lastKoor.x) / 2), lastKoor.x - 8)

    const pathSideToKoor = `M ${b.x} ${yFork1} L ${xSide - r} ${yFork1} Q ${xSide} ${yFork1} ${xSide} ${yFork1 + r} L ${xSide} ${yFork2 - r} Q ${xSide} ${yFork2} ${xSide - r} ${yFork2}`

    // 5. Horizontal distributor bar for Koors:
    // Strictly bounded between the first koor and the last koor!
    const firstKoor = koors[0]
    const pathKoorDistributor = `M ${firstKoor.x + r} ${yFork2} Q ${firstKoor.x} ${yFork2} ${firstKoor.x} ${yFork2 + r} L ${firstKoor.x} ${firstKoor.top} M ${firstKoor.x + r} ${yFork2} L ${lastKoor.x - r} ${yFork2} Q ${lastKoor.x} ${yFork2} ${lastKoor.x} ${yFork2 + r} L ${lastKoor.x} ${lastKoor.top}`

    // 6. Drops for intermediate koors
    const intermediateDrops = koors
      .slice(1, -1)
      .map((item) => `M ${item.x} ${yFork2} L ${item.x} ${item.top}`)
      .join(' ')

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ width: coords.canvasWidth, height: coords.canvasHeight }}
      >
        <g stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={pathKetua} />
          <path d={pathSekre} />
          <path d={pathBendahara} />
          <path d={pathSideToKoor} />
          <path d={pathKoorDistributor} />
          {intermediateDrops && <path d={intermediateDrops} />}
        </g>

        {/* Junction Dots (Aksen lingkaran konektor rapi seperti referensi) */}
        {/* Junction A (Di bawah Ketua) */}
        <circle cx={k.x} cy={yFork1} r={4.5} fill="#ffffff" stroke="#475569" strokeWidth="2.5" />

        {/* Junction B (Di atas Koor, sambungan dari garis samping) */}
        <circle cx={xSide} cy={yFork2} r={4.5} fill="#ffffff" stroke="#475569" strokeWidth="2.5" />
      </svg>
    )
  }, [coords])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-blue-700 to-blue-600 text-white shadow-sm">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Tentang IMPP</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Struktur Organisasi</h1>
          <p className="text-blue-100 mt-2 max-w-xl mx-auto text-sm sm:text-base">
            Bagan kepengurusan ORBIT IMPP periode berjalan.
          </p>

          {isBph && (
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 bg-blue-800/60 border border-blue-400/40 rounded-full text-xs text-blue-100 font-medium">
              <Icon name="info" cls="w-3.5 h-3.5 text-blue-300" />
              <span>Mode BPH: Kamu dapat mengganti foto profil pengurus dengan menekan ikon kamera.</span>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1180px] mx-auto w-full px-3 sm:px-6 py-8 flex-1">
        {/* Mobile: toggle bagan penuh */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">Tampilan struktur kepengurusan</p>
          <button
            type="button"
            onClick={() => setShowFullChart((v) => !v)}
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs"
          >
            <Icon name="cursor" cls="w-3.5 h-3.5" />
            {showFullChart ? 'Sembunyikan Bagan' : 'Lihat Bagan Penuh'}
          </button>
        </div>

        {loadingData ? (
          <div className="py-20 text-center text-gray-500 text-sm">Memuat bagan struktur...</div>
        ) : !ketua ? (
          <div className="py-20 text-center text-gray-400 text-sm">Data pengurus belum tersedia.</div>
        ) : (
          <>
            {/* MOBILE: Accordion Card List */}
            {!showFullChart && (
              <div className="lg:hidden space-y-4 pb-8">
                {/* Ketua Umum */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 flex-shrink-0">
                    {ketua.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ketua.avatar_url} alt={ketua.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {initial(ketua.full_name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">
                      {ketua.jabatan || 'Ketua Umum'}
                    </p>
                    <p className="text-base font-bold text-gray-900">{ketua.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ketua Umum IMPP</p>
                  </div>
                </div>

                {/* BPH */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Badan Pengurus Harian</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[sekretaris, bendahara].filter(Boolean).map((bph) => bph && (
                      <div key={bph.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center shadow-sm">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 p-0.5 mb-2">
                          {bph.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={bph.avatar_url} alt={bph.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold">
                              {initial(bph.full_name)}
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{bph.full_name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{bph.jabatan || 'BPH'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divisi accordion */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Koordinator Divisi</p>
                  <div className="space-y-2">
                    {divisionsWithKoor.map(({ divisi: d, koor, anggota }) => (
                      <div key={d.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDivisi(openDivisi === d.key ? null : d.key)}
                          className="w-full flex items-center gap-3 p-4"
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-gray-900">{koor.full_name}</p>
                            <p className="text-xs text-gray-500">{d.label}</p>
                          </div>
                          {koor.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={koor.avatar_url} alt={koor.full_name} className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: d.color }}>
                              {initial(koor.full_name)}
                            </div>
                          )}
                          <Icon name="chevron" cls={`w-4 h-4 text-gray-400 transition-transform ml-1 ${openDivisi === d.key ? 'rotate-180' : ''}`} />
                        </button>
                        {openDivisi === d.key && anggota.length > 0 && (
                          <div className="px-4 pb-4 border-t border-gray-50">
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-3 mb-2">Anggota</p>
                            <div className="space-y-2">
                              {anggota.map((a) => (
                                <div key={a.id} className="flex items-center gap-3">
                                  {a.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.avatar_url} alt={a.full_name} className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: d.color }}>
                                      {initial(a.full_name)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{a.full_name}</p>
                                    {a.jabatan && <p className="text-xs text-gray-500">{a.jabatan}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {openDivisi === d.key && anggota.length === 0 && (
                          <div className="px-4 pb-4 border-t border-gray-50">
                            <p className="text-xs text-gray-400 mt-3">Belum ada anggota terdaftar</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DESKTOP: SVG Org Chart (always shown on lg+) */}
            {/* MOBILE: SVG Org Chart (only when showFullChart=true) */}
            <div className={`${!showFullChart ? 'hidden lg:block' : 'block'} w-full overflow-x-auto pb-10 pt-2`}>
              <div
                ref={canvasRef}
                className="relative mx-auto min-w-[920px] max-w-[1060px] px-6 py-6"
              >
              {/* SVG Connector Lines Layer */}
              {svgContent}

              {/* TIER 1: KETUA UMUM */}
              <div className="flex flex-col items-center relative z-10">
                <div id="node-ketua" className="flex flex-col items-center text-center">
                  <div id="avatar-ketua" className="relative group">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                        {ketua.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ketua.avatar_url}
                            alt={ketua.full_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                            {initial(ketua.full_name)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit photo button */}
                    {canEdit(ketua) && (
                      <button
                        type="button"
                        onClick={() => openEditPhoto(ketua)}
                        title="Ganti Foto Profil"
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Icon name="camera" cls="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Position Badge */}
                  <div className="mt-2.5">
                    <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                      Ketua Umum
                    </span>
                  </div>

                  {ketua.full_name && ketua.full_name.toLowerCase() !== 'ketua umum' && (
                    <p className="mt-1.5 text-base font-bold text-gray-900 leading-tight">
                      {ketua.full_name}
                    </p>
                  )}
                  {ketua.jabatan &&
                    ketua.jabatan.toLowerCase() !== 'ketua umum' &&
                    ketua.jabatan.toLowerCase() !== ketua.full_name.toLowerCase() && (
                      <p className="text-xs text-gray-500 mt-0.5">{ketua.jabatan}</p>
                    )}
                </div>
              </div>

              {/* TIER 2: BPH (SEKRETARIS & BENDAHARA) - Kompak & Berdampingan, Tidak Terbelah Garis Tengah */}
              <div className="flex items-start justify-center gap-16 sm:gap-24 mt-14 mb-18 relative z-10">
                {/* Sekretaris */}
                {sekretaris && (
                  <div id="node-sekre" className="flex flex-col items-center text-center">
                    <div id="avatar-sekre" className="relative group">
                      <div className="w-18 h-18 rounded-full p-1 bg-blue-500 shadow-sm flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                          {sekretaris.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sekretaris.avatar_url}
                              alt={sekretaris.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                              {initial(sekretaris.full_name)}
                            </div>
                          )}
                        </div>
                      </div>

                      {canEdit(sekretaris) && (
                        <button
                          type="button"
                          onClick={() => openEditPhoto(sekretaris)}
                          title="Ganti Foto Profil"
                          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110"
                        >
                          <Icon name="camera" cls="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        Sekretaris Umum
                      </span>
                    </div>

                    {sekretaris.full_name && sekretaris.full_name.toLowerCase() !== 'sekretaris umum' && (
                      <p className="mt-1 text-sm font-bold text-gray-900 leading-tight">
                        {sekretaris.full_name}
                      </p>
                    )}
                  </div>
                )}

                {/* Bendahara */}
                {bendahara && (
                  <div id="node-bendahara" className="flex flex-col items-center text-center">
                    <div id="avatar-bendahara" className="relative group">
                      <div className="w-18 h-18 rounded-full p-1 bg-blue-500 shadow-sm flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                          {bendahara.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={bendahara.avatar_url}
                              alt={bendahara.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                              {initial(bendahara.full_name)}
                            </div>
                          )}
                        </div>
                      </div>

                      {canEdit(bendahara) && (
                        <button
                          type="button"
                          onClick={() => openEditPhoto(bendahara)}
                          title="Ganti Foto Profil"
                          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110"
                        >
                          <Icon name="camera" cls="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        Bendahara
                      </span>
                    </div>

                    {bendahara.full_name && bendahara.full_name.toLowerCase() !== 'bendahara' && (
                      <p className="mt-1 text-sm font-bold text-gray-900 leading-tight">
                        {bendahara.full_name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* TIER 3: KOORDINATOR DIVISI (Sejajar dalam 1 Garis Horizontal Presisi) */}
              <div className="flex items-start justify-center gap-5 sm:gap-6 mt-18 relative z-10">
                {divisionsWithKoor.map(({ divisi: d, koor, anggota }) => {
                  return (
                    <div
                      key={d.key}
                      className="node-koor flex flex-col items-center text-center w-[125px] sm:w-[135px]"
                    >
                      {/* Avatar Circle with Division Color Ring */}
                      <div className="avatar-koor relative group">
                        <div
                          className="w-14 h-14 rounded-full p-0.5 shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: d.color }}
                        >
                          <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                            {koor.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={koor.avatar_url}
                                alt={koor.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center text-white text-base font-bold"
                                style={{ backgroundColor: d.color }}
                              >
                                {initial(koor.full_name)}
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit(koor) && (
                          <button
                            type="button"
                            onClick={() => openEditPhoto(koor)}
                            title={`Ganti Foto ${koor.full_name}`}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-gray-700 border border-gray-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110"
                          >
                            <Icon name="camera" cls="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>

                      {/* Division Tag & Name */}
                      <div className="mt-2">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${d.color}15`,
                            color: d.color,
                            border: `1px solid ${d.color}40`,
                          }}
                        >
                          {d.label}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold text-gray-900 leading-tight">
                        {koor.full_name}
                      </p>

                      <p className="text-[10px] text-gray-500 leading-tight">
                        {koor.jabatan || `Koor ${d.label}`}
                      </p>

                      {/* Anggota Divisi (Jika Ada) */}
                      {anggota.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200/60 w-full flex flex-col items-center">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Anggota
                          </p>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {anggota.map((x) => (
                              <div key={x.id} className="relative group" title={x.full_name}>
                                <div className="w-7 h-7 rounded-full p-0.5 bg-gray-200">
                                  {x.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={x.avatar_url}
                                      alt={x.full_name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-gray-400 flex items-center justify-center text-white text-[9px] font-bold">
                                      {initial(x.full_name)}
                                    </div>
                                  )}
                                </div>
                                {canEdit(x) && (
                                  <button
                                    type="button"
                                    onClick={() => openEditPhoto(x)}
                                    title={`Ganti Foto ${x.full_name}`}
                                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-blue-600 shadow border border-gray-200 flex items-center justify-center"
                                  >
                                    <Icon name="camera" cls="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAL GANTI FOTO PROFIL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-scaleUp">
            <h3 className="text-lg font-bold text-gray-900">Kelola Foto Profil</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {editTarget.full_name} ({editTarget.jabatan || editTarget.divisi})
            </p>

            {/* Avatar Preview */}
            <div className="my-6 flex justify-center">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {initial(editTarget.full_name)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingPhoto}
                className="w-full btn btn-outline btn-sm py-2 flex items-center justify-center gap-1.5"
              >
                <Icon name="camera" cls="w-4 h-4 text-blue-600" />
                <span>{previewUrl ? 'Pilih Foto Lain' : 'Pilih Foto (JPG/PNG)'}</span>
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={savingPhoto}
                  className="w-full btn btn-primary btn-sm py-2 flex items-center justify-center gap-1.5"
                >
                  {savingPhoto ? 'Menyimpan...' : 'Simpan Foto Baru'}
                </button>
              )}

              {editTarget.avatar_url && !selectedFile && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={savingPhoto}
                  className="w-full btn btn-danger btn-sm py-2"
                >
                  Hapus Foto Profil
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditTarget(null)
                  setSelectedFile(null)
                }}
                disabled={savingPhoto}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 font-medium"
              >
                Tutup / Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}