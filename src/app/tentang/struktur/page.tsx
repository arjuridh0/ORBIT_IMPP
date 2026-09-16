'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase/client'
import { useDivisi } from '@/hooks/useDivisi'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import Swal from 'sweetalert2'
import { StrukturSkeleton } from '@/components/Skeleton'
import MatrixLoader from '@/components/MatrixLoader'

interface Pengurus {
  id: string
  full_name: string
  role: string
  jabatan: string | null
  divisi: string
  avatar_url: string | null
}

interface Member {
  id: string
  full_name: string
  divisi: string
  koor_id: string | null
  created_by: string | null
}

function jab(p: Pengurus) {
  return `${p.full_name} ${p.jabatan || ''}`.toLowerCase()
}

function initial(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}

function AvatarImg({ person, size, color, textSize }: {
  person: { full_name: string; avatar_url: string | null }
  size: number; color?: string; textSize?: string
}) {
  if (person.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={person.avatar_url} alt={person.full_name}
      className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white ${textSize || 'text-base'}`}
      style={{ width: size, height: size, background: color || '#2563eb' }}>
      {initial(person.full_name)}
    </div>
  )
}

export default function StrukturPage() {
  const { divisi } = useDivisi()
  const { profile } = useAuth()
  const [pengurus, setPengurus] = useState<Pengurus[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [konten, setKonten] = useState<Record<string, string>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [editTarget, setEditTarget] = useState<Pengurus | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [showFullChart, setShowFullChart] = useState(false)
  const [openDivisi, setOpenDivisi] = useState<string | null>(null)
  const [addMemberDivisi, setAddMemberDivisi] = useState<string | null>(null)
  const [addMemberName, setAddMemberName] = useState('')
  const [savingMember, setSavingMember] = useState(false)
  const [svgPaths, setSvgPaths] = useState('')
  const [svgDots, setSvgDots] = useState<Array<{ cx: number; cy: number }>>([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })

  const isBph = ['admin', 'ketua', 'superadmin'].includes(profile?.role || '')

  const canEdit = useCallback((target: Pengurus) => {
    if (!profile) return false
    if (isBph) return true
    return profile.id === target.id
  }, [profile, isBph])

  const canManageMembers = useCallback((divisiKey: string) => {
    if (!profile) return false
    if (isBph) return true
    if (profile.role === 'editor' && profile.divisi === divisiKey) return true
    return false
  }, [profile, isBph])

  const loadAll = useCallback(async () => {
    if (!supabase) return
    try {
      const [pResult, mRes, kRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role, jabatan, divisi, avatar_url').order('full_name'),
        fetch('/api/members'),
        fetch('/api/konten'),
      ])
      const mData = await mRes.json()
      const kData = await kRes.json()
      setPengurus((pResult.data as Pengurus[]) || [])
      setMembers(mData.members || [])
      setKonten(kData.konten || {})
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])


  // Role categorizations
  const ketua = useMemo(() =>
    pengurus.find(p => p.role === 'ketua') ||
    pengurus.find(p => p.role === 'admin' && jab(p).includes('ketua umum')) ||
    pengurus.find(p => p.role === 'admin' && jab(p).includes('ketua')) ||
    pengurus.find(p => p.role === 'admin'),
    [pengurus])

  const wakil = useMemo(() =>
    pengurus.find(p => p.role === 'admin' && p.id !== ketua?.id && jab(p).includes('wakil')),
    [pengurus, ketua])

  const bphMembers = useMemo(() =>
    pengurus.filter(p => p.role === 'admin' && p.id !== ketua?.id && p.id !== wakil?.id),
    [pengurus, ketua, wakil])

  const sekre1 = useMemo(() =>
    bphMembers.find(p => jab(p).includes('sekretaris 1')) ||
    bphMembers.find(p => jab(p).includes('sekretaris') || jab(p).includes('sekre')),
    [bphMembers])

  const sekre2 = useMemo(() =>
    bphMembers.find(p => p.id !== sekre1?.id && jab(p).includes('sekretaris 2')),
    [bphMembers, sekre1])

  const bend1 = useMemo(() =>
    bphMembers.find(p => jab(p).includes('bendahara 1')) ||
    bphMembers.find(p => p.id !== sekre1?.id && p.id !== sekre2?.id && jab(p).includes('bendahara')),
    [bphMembers, sekre1, sekre2])

  const bend2 = useMemo(() =>
    bphMembers.find(p => p.id !== bend1?.id && jab(p).includes('bendahara 2')),
    [bphMembers, bend1])

  const byDivisi = useMemo(() => {
    const m = new Map<string, Pengurus[]>()
    pengurus.forEach(p => { const l = m.get(p.divisi) || []; l.push(p); m.set(p.divisi, l) })
    return m
  }, [pengurus])

  const divisionsWithKoor = useMemo(() =>
    divisi.filter(d => d.key !== 'bph').map(d => {
      const list = byDivisi.get(d.key) || []
      const koor =
        list.find(x => (x.jabatan || '').toLowerCase().includes('koor')) ||
        list[0] || { id: `empty-${d.key}`, full_name: `Koor ${d.label}`, role: 'editor', jabatan: 'Koordinator', divisi: d.key, avatar_url: null }
      const sekjen = list.find(x => x.id !== koor.id && (jab(x).includes('sekjen') || jab(x).includes('sekretaris')))
      const anggotaProfiles = list.filter(x => x.id !== koor.id && x.id !== sekjen?.id)
      const anggotaMembers = members.filter(m => m.divisi === d.key)
      return { divisi: d, koor, sekjen, anggotaProfiles, anggotaMembers }
    }),
    [divisi, byDivisi, members])

  // ── SVG Connector Lines ────────────────────────────────────────────────────
  const updateLines = useCallback(() => {
    const ctr = canvasRef.current
    if (!ctr) return
    const cRect = ctr.getBoundingClientRect()
    if (cRect.width === 0) return

    function get(el: Element | null) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        cx: r.left - cRect.left + r.width / 2,
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
      }
    }

    const nodeKetua  = get(ctr.querySelector('#node-ketua'))
    const nodeWakil  = get(ctr.querySelector('#node-wakil'))
    const nodeSekre1 = get(ctr.querySelector('#node-sekre1'))
    const nodeSekre2 = get(ctr.querySelector('#node-sekre2'))
    const nodeBend1  = get(ctr.querySelector('#node-bend1'))
    const nodeBend2  = get(ctr.querySelector('#node-bend2'))
    const koorEls    = Array.from(ctr.querySelectorAll('.koor-node')).map(get).filter(Boolean) as NonNullable<ReturnType<typeof get>>[]

    if (!nodeKetua) return

    const paths: string[] = []
    const dots: { cx: number; cy: number }[] = []

    // 1. TIER 1: Ketua Umum & Wakil Ketua
    const leadersBottom = Math.max(nodeKetua.bottom, nodeWakil?.bottom ?? 0)
    const bphTop = Math.min(nodeSekre1?.top ?? 9999, nodeBend1?.top ?? 9999)
    const yBridgeTop = leadersBottom + 16
    const yForkBph = yBridgeTop + (bphTop - yBridgeTop) * 0.5

    // Midpoint between BPH columns (Sekre & Bendahara) — guarantees trunk runs down the empty center hallway!
    const centerTrunkX = (nodeSekre1 && nodeBend1)
      ? (nodeSekre1.cx + nodeBend1.cx) / 2
      : (nodeWakil ? (nodeKetua.cx + nodeWakil.cx) / 2 : nodeKetua.cx)

    if (nodeWakil) {
      // Drop from Ketua to bridge
      paths.push(`M ${nodeKetua.cx} ${nodeKetua.bottom} V ${yBridgeTop}`)
      // Drop from Wakil to bridge
      paths.push(`M ${nodeWakil.cx} ${nodeWakil.bottom} V ${yBridgeTop}`)
      // Horizontal bridge line connecting Ketua and Wakil
      paths.push(`M ${nodeKetua.cx} ${yBridgeTop} H ${nodeWakil.cx}`)
      dots.push({ cx: nodeKetua.cx, cy: yBridgeTop })
      dots.push({ cx: nodeWakil.cx, cy: yBridgeTop })
    } else {
      // Only Ketua
      paths.push(`M ${nodeKetua.cx} ${nodeKetua.bottom} V ${yBridgeTop}`)
      dots.push({ cx: nodeKetua.cx, cy: yBridgeTop })
    }

    // Drop from bridge center down to BPH fork
    paths.push(`M ${centerTrunkX} ${yBridgeTop} V ${yForkBph}`)
    dots.push({ cx: centerTrunkX, cy: yBridgeTop })
    dots.push({ cx: centerTrunkX, cy: yForkBph })

    // 2. TIER 2: BPH (Sekretaris & Bendahara)
    // Branch left to Sekretaris 1
    if (nodeSekre1) {
      paths.push(`M ${centerTrunkX} ${yForkBph} H ${nodeSekre1.cx} V ${nodeSekre1.top}`)
      dots.push({ cx: nodeSekre1.cx, cy: yForkBph })
      if (nodeSekre2) {
        paths.push(`M ${nodeSekre1.cx} ${nodeSekre1.bottom} V ${nodeSekre2.top}`)
        dots.push({ cx: nodeSekre1.cx, cy: (nodeSekre1.bottom + nodeSekre2.top) / 2 })
      }
    }

    // Branch right to Bendahara 1
    if (nodeBend1) {
      paths.push(`M ${centerTrunkX} ${yForkBph} H ${nodeBend1.cx} V ${nodeBend1.top}`)
      dots.push({ cx: nodeBend1.cx, cy: yForkBph })
      if (nodeBend2) {
        paths.push(`M ${nodeBend1.cx} ${nodeBend1.bottom} V ${nodeBend2.top}`)
        dots.push({ cx: nodeBend1.cx, cy: (nodeBend1.bottom + nodeBend2.top) / 2 })
      }
    }

    // 3. TIER 3: Trunk down to Koordinator Rail
    if (koorEls.length > 0) {
      const bphBottom = Math.max(
        nodeSekre2?.bottom ?? nodeSekre1?.bottom ?? leadersBottom,
        nodeBend2?.bottom ?? nodeBend1?.bottom ?? leadersBottom,
      )
      const yRailKoor = bphBottom + (koorEls[0].top - bphBottom) * 0.5

      // Center trunk drops down between Sekre & Bendahara to the koor rail
      paths.push(`M ${centerTrunkX} ${yForkBph} V ${yRailKoor}`)
      dots.push({ cx: centerTrunkX, cy: yRailKoor })

      // Horizontal rail connecting all koordinator nodes
      const x0 = koorEls[0].cx
      const x1 = koorEls[koorEls.length - 1].cx
      paths.push(`M ${x0} ${yRailKoor} H ${x1}`)

      // Vertical drop from rail into each koor
      koorEls.forEach(k => {
        paths.push(`M ${k.cx} ${yRailKoor} V ${k.top}`)
        dots.push({ cx: k.cx, cy: yRailKoor })
      })
    }

    setSvgPaths(paths.join(' '))
    setSvgDots(dots)
    setSvgSize({ w: ctr.scrollWidth, h: ctr.scrollHeight })
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    updateLines()
    const ro = new ResizeObserver(() => updateLines())
    ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [updateLines, pengurus, members, showFullChart])

  function openEditPhoto(target: Pengurus) {
    setEditTarget(target); setPreviewUrl(target.avatar_url); setSelectedFile(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { Swal.fire('File Terlalu Besar', 'Maksimal 5MB.', 'warning'); return }
    if (!file.type.startsWith('image/')) { Swal.fire('Format Tidak Didukung', 'Pilih JPG/PNG/WEBP/HEIC.', 'warning'); return }
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSavePhoto() {
    if (!editTarget || !selectedFile) return
    setSavingPhoto(true)
    try {
      const fd = new FormData(); fd.append('file', selectedFile)
      const res = await fetch(`/api/admin/users/${editTarget.id}/avatar`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      setPengurus(prev => prev.map(p => p.id === editTarget.id ? { ...p, avatar_url: data.avatar_url } : p))
      Swal.fire({ icon: 'success', title: 'Foto Diperbarui', timer: 1600, showConfirmButton: false })
      setEditTarget(null)
    } catch (err: unknown) {
      Swal.fire('Gagal', err instanceof Error ? err.message : 'Error', 'error')
    } finally { setSavingPhoto(false) }
  }

  async function handleDeletePhoto() {
    if (!editTarget) return
    const r = await Swal.fire({ title: 'Hapus foto?', icon: 'question', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Hapus', cancelButtonText: 'Batal' })
    if (!r.isConfirmed) return
    setSavingPhoto(true)
    try {
      const res = await fetch(`/api/admin/users/${editTarget.id}/avatar`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      setPengurus(prev => prev.map(p => p.id === editTarget.id ? { ...p, avatar_url: null } : p))
      Swal.fire({ icon: 'success', title: 'Foto Dihapus', timer: 1400, showConfirmButton: false })
      setEditTarget(null)
    } catch (err: unknown) {
      Swal.fire('Gagal', err instanceof Error ? err.message : 'Error', 'error')
    } finally { setSavingPhoto(false) }
  }

  async function handleAddMember(divisiKey: string, koorId: string | null) {
    if (!addMemberName.trim()) return
    setSavingMember(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: addMemberName.trim(), divisi: divisiKey, koor_id: koorId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(prev => [...prev, data.member])
      setAddMemberName(''); setAddMemberDivisi(null)
    } catch (err: unknown) {
      Swal.fire('Gagal', err instanceof Error ? err.message : 'Error', 'error')
    } finally { setSavingMember(false) }
  }

  async function handleDeleteMember(id: string) {
    const r = await Swal.fire({ title: 'Hapus anggota?', icon: 'question', showCancelButton: true, confirmButtonColor: '#e11d48', confirmButtonText: 'Hapus', cancelButtonText: 'Batal' })
    if (!r.isConfirmed) return
    const res = await fetch('/api/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id))
    else { const d = await res.json(); Swal.fire('Gagal', d.error, 'error') }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 text-center relative z-10">
          {/* Logo Organisasi: IMPP UIN Walisongo Semarang */}
          <div className="inline-flex items-center justify-center bg-white/95 backdrop-blur-md px-6 py-2.5 sm:px-7 sm:py-3 rounded-2xl shadow-sm border border-white/80 mb-4 transition-transform hover:scale-105 duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-impp.webp"
              alt="Logo IMPP UIN Walisongo"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Struktur Organisasi</h1>
          <p className="text-blue-100 mt-2 max-w-xl mx-auto text-sm">
            {konten.kabinet_nama && konten.kabinet_periode
              ? `Kepengurusan IMPP Kabinet ${konten.kabinet_nama} Periode ${konten.kabinet_periode}`
              : (konten.kabinet_desc || 'Bagan kepengurusan IMPP periode berjalan.')}
          </p>
          {isBph && (
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 bg-blue-800/60 border border-blue-400/40 rounded-full text-xs text-blue-100 font-medium">
              <Icon name="info" cls="w-3.5 h-3.5 text-blue-300" />
              <span>Mode BPH: Tekan kamera untuk ganti foto, tekan + untuk tambah anggota.</span>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-[1280px] mx-auto w-full px-3 sm:px-6 py-8 flex-1">
        <div className="lg:hidden flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">Tampilan struktur kepengurusan</p>
          <button type="button" onClick={() => setShowFullChart(v => !v)}
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs">
            <Icon name="cursor" cls="w-3.5 h-3.5" />
            {showFullChart ? 'Sembunyikan Bagan' : 'Lihat Bagan Penuh'}
          </button>
        </div>

        {loadingData ? (
          <StrukturSkeleton />
        ) : !ketua ? (
          <div className="py-20 text-center text-gray-400 text-sm">Data pengurus belum tersedia.</div>
        ) : (
          <>
            {/* ─── MOBILE ACCORDION (< lg) ───────────────────────────── */}
            {!showFullChart && (
              <div className="lg:hidden space-y-4 pb-8">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
                  <AvatarImg person={ketua} size={64} color="#2563eb" textSize="text-2xl" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">{ketua.jabatan || 'Ketua Umum'}</p>
                    <p className="text-base font-bold text-gray-900">{ketua.full_name}</p>
                  </div>
                </div>
                {wakil && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
                    <AvatarImg person={wakil} size={56} color="#3b82f6" textSize="text-xl" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">{wakil.jabatan || 'Wakil Ketua'}</p>
                      <p className="text-sm font-bold text-gray-900">{wakil.full_name}</p>
                    </div>
                  </div>
                )}
                {(sekre1 || bend1) && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Badan Pengurus Harian</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        sekre1 && { p: sekre1, lbl: sekre1.jabatan || 'Sekretaris 1' },
                        bend1 && { p: bend1, lbl: bend1.jabatan || 'Bendahara 1' },
                        sekre2 && { p: sekre2, lbl: sekre2.jabatan || 'Sekretaris 2' },
                        bend2 && { p: bend2, lbl: bend2.jabatan || 'Bendahara 2' },
                      ].filter(Boolean).map((item, i) => item && (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center shadow-sm">
                          <AvatarImg person={item.p} size={52} color="#3b82f6" textSize="text-lg" />
                          <p className="text-xs font-bold text-gray-900 mt-2 leading-tight">{item.p.full_name}</p>
                          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">{item.lbl}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Koordinator & Divisi</p>
                  <div className="space-y-2">
                    {divisionsWithKoor.map(({ divisi: d, koor, sekjen, anggotaProfiles, anggotaMembers }) => (
                      <div key={d.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setOpenDivisi(openDivisi === d.key ? null : d.key)}
                          className="w-full flex items-center gap-3 p-4">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-gray-900">{koor.full_name}</p>
                            <p className="text-xs text-gray-500">{d.label}</p>
                          </div>
                          <AvatarImg person={koor} size={36} color={d.color} textSize="text-sm" />
                          <Icon name="chevron" cls={`w-4 h-4 text-gray-400 transition-transform ml-1 ${openDivisi === d.key ? 'rotate-180' : ''}`} />
                        </button>
                        {openDivisi === d.key && (
                          <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                            {sekjen && (
                              <div className="pt-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1.5">Sekretaris Jendral</p>
                                <div className="flex items-center gap-2">
                                  <AvatarImg person={sekjen} size={28} color={d.color} textSize="text-xs" />
                                  <div>
                                    <p className="text-xs font-bold text-gray-800">{sekjen.full_name}</p>
                                    <p className="text-[10px] text-gray-500">{sekjen.jabatan || 'Sekjen'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Anggota</p>
                                {canManageMembers(d.key) && (
                                  <button type="button" onClick={() => { setAddMemberDivisi(d.key); setAddMemberName('') }}
                                    className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                                    <Icon name="plus" cls="w-3 h-3" /> Tambah
                                  </button>
                                )}
                              </div>
                              {addMemberDivisi === d.key && (
                                <div className="flex gap-1.5 mb-2">
                                  <input type="text" value={addMemberName} onChange={e => setAddMemberName(e.target.value)}
                                    placeholder="Nama anggota" className="ds-input text-xs flex-1 py-1" />
                                  <button type="button" disabled={savingMember}
                                    onClick={() => handleAddMember(d.key, koor.id.startsWith('empty') ? null : koor.id)}
                                    className="btn btn-primary btn-sm text-xs px-2 flex items-center justify-center gap-1">{savingMember ? <MatrixLoader size="sm" /> : 'OK'}</button>
                                  <button type="button" onClick={() => setAddMemberDivisi(null)} className="btn btn-outline btn-sm text-xs px-2">✕</button>
                                </div>
                              )}
                              <div className="space-y-1">
                                {anggotaProfiles.map(a => (
                                  <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-700 font-medium">{a.full_name}</p>
                                  </div>
                                ))}
                                {anggotaMembers.map(m => (
                                  <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-700 font-medium">{m.full_name}</p>
                                    {canManageMembers(d.key) && (
                                      <button type="button" onClick={() => handleDeleteMember(m.id)} className="text-red-400 hover:text-red-600">
                                        <Icon name="trash" cls="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {anggotaProfiles.length === 0 && anggotaMembers.length === 0 && !addMemberDivisi && (
                                  <p className="text-xs text-gray-400 pt-1">Belum ada anggota</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── DESKTOP BAGAN ─────────────────────────────────────── */}
            <div className={`${!showFullChart ? 'hidden lg:block' : 'block'} w-full overflow-x-auto pb-10 pt-2`}>
              <div
                ref={canvasRef}
                className="relative mx-auto min-w-[960px] max-w-[1240px] px-6 py-8"
              >
                {/* SVG Connector Layer */}
                {svgSize.w > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    style={{ width: svgSize.w, height: svgSize.h }}
                  >
                    <g stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      {svgPaths && <path d={svgPaths} />}
                    </g>
                    {svgDots.map((dot, i) => (
                      <circle key={i} cx={dot.cx} cy={dot.cy} r={4.5} fill="#ffffff" stroke="#475569" strokeWidth="2.5" />
                    ))}
                  </svg>
                )}

                {/* TIER 1: Ketua Umum & Wakil Ketua sejajar */}
                <div className="flex items-end justify-center gap-16 mb-0 relative z-10">
                  {/* Ketua Umum */}
                  <div id="node-ketua" className="flex flex-col items-center text-center pb-2">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                          <AvatarImg person={ketua} size={84} color="#2563eb" textSize="text-3xl" />
                        </div>
                      </div>
                      {canEdit(ketua) && (
                        <button type="button" onClick={() => openEditPhoto(ketua)} title="Ganti Foto"
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                          <Icon name="camera" cls="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <span className="mt-2.5 inline-block px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow-sm">Ketua Umum</span>
                    <p className="mt-1.5 text-sm font-bold text-gray-900">{ketua.full_name}</p>
                  </div>

                  {/* Wakil Ketua */}
                  {wakil && (
                    <div id="node-wakil" className="flex flex-col items-center text-center pb-2">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-blue-400 to-indigo-400 shadow-sm flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                            <AvatarImg person={wakil} size={72} color="#3b82f6" textSize="text-2xl" />
                          </div>
                        </div>
                        {canEdit(wakil) && (
                          <button type="button" onClick={() => openEditPhoto(wakil)} title="Ganti Foto"
                            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                            <Icon name="camera" cls="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">Wakil Ketua</span>
                      <p className="mt-1 text-xs font-bold text-gray-900">{wakil.full_name}</p>
                    </div>
                  )}
                </div>

                {/* TIER 2: BPH (Sekretaris kiri, Bendahara kanan) */}
                <div className="mt-16 flex items-start justify-center gap-28 relative z-10">
                  {/* Kolom Kiri: Sekretaris */}
                  <div className="flex flex-col items-center gap-5">
                    {sekre1 && (
                      <div id="node-sekre1" className="flex flex-col items-center text-center">
                        <div className="relative group">
                          <div className="w-[72px] h-[72px] rounded-full p-1 bg-blue-500 shadow-sm flex items-center justify-center">
                            <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                              <AvatarImg person={sekre1} size={62} color="#3b82f6" textSize="text-xl" />
                            </div>
                          </div>
                          {canEdit(sekre1) && (
                            <button type="button" onClick={() => openEditPhoto(sekre1)} title="Ganti Foto"
                              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                              <Icon name="camera" cls="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                          {sekre1.jabatan || 'Sekretaris 1'}
                        </span>
                        <p className="mt-0.5 text-xs font-bold text-gray-900 max-w-[90px] leading-tight">{sekre1.full_name}</p>
                      </div>
                    )}
                    {sekre2 && (
                      <div id="node-sekre2" className="flex flex-col items-center text-center">
                        <div className="relative group">
                          <div className="w-[64px] h-[64px] rounded-full p-1 bg-blue-400 shadow-sm flex items-center justify-center">
                            <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                              <AvatarImg person={sekre2} size={54} color="#60a5fa" textSize="text-lg" />
                            </div>
                          </div>
                          {canEdit(sekre2) && (
                            <button type="button" onClick={() => openEditPhoto(sekre2)} title="Ganti Foto"
                              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                              <Icon name="camera" cls="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          {sekre2.jabatan || 'Sekretaris 2'}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-gray-900 max-w-[90px] leading-tight">{sekre2.full_name}</p>
                      </div>
                    )}
                    {!sekre1 && <div className="w-[90px]" />}
                  </div>

                  {/* Kolom Kanan: Bendahara */}
                  <div className="flex flex-col items-center gap-5">
                    {bend1 && (
                      <div id="node-bend1" className="flex flex-col items-center text-center">
                        <div className="relative group">
                          <div className="w-[72px] h-[72px] rounded-full p-1 bg-blue-500 shadow-sm flex items-center justify-center">
                            <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                              <AvatarImg person={bend1} size={62} color="#3b82f6" textSize="text-xl" />
                            </div>
                          </div>
                          {canEdit(bend1) && (
                            <button type="button" onClick={() => openEditPhoto(bend1)} title="Ganti Foto"
                              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                              <Icon name="camera" cls="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                          {bend1.jabatan || 'Bendahara 1'}
                        </span>
                        <p className="mt-0.5 text-xs font-bold text-gray-900 max-w-[90px] leading-tight">{bend1.full_name}</p>
                      </div>
                    )}
                    {bend2 && (
                      <div id="node-bend2" className="flex flex-col items-center text-center">
                        <div className="relative group">
                          <div className="w-[64px] h-[64px] rounded-full p-1 bg-blue-400 shadow-sm flex items-center justify-center">
                            <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                              <AvatarImg person={bend2} size={54} color="#60a5fa" textSize="text-lg" />
                            </div>
                          </div>
                          {canEdit(bend2) && (
                            <button type="button" onClick={() => openEditPhoto(bend2)} title="Ganti Foto"
                              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white text-blue-600 border border-blue-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                              <Icon name="camera" cls="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          {bend2.jabatan || 'Bendahara 2'}
                        </span>
                        <p className="mt-0.5 text-xs font-semibold text-gray-900 max-w-[90px] leading-tight">{bend2.full_name}</p>
                      </div>
                    )}
                    {!bend1 && <div className="w-[90px]" />}
                  </div>
                </div>

                {/* TIER 3: Koordinator & Divisi */}
                <div className="mt-16 flex items-start justify-center gap-4 sm:gap-5 flex-wrap relative z-10">
                  {divisionsWithKoor.map(({ divisi: d, koor, sekjen, anggotaProfiles, anggotaMembers }) => (
                    <div key={d.key} className="koor-node flex flex-col items-center text-center w-[140px] sm:w-[150px]">
                      {/* Koor Avatar */}
                      <div className="relative group">
                        <div className="w-[60px] h-[60px] rounded-full p-0.5 shadow-sm" style={{ backgroundColor: d.color }}>
                          <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                            <AvatarImg person={koor} size={50} color={d.color} textSize="text-base" />
                          </div>
                        </div>
                        {canEdit(koor) && (
                          <button type="button" onClick={() => openEditPhoto(koor)} title="Ganti Foto"
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white text-gray-700 border border-gray-200 shadow hover:bg-blue-50 flex items-center justify-center transition-transform hover:scale-110">
                            <Icon name="camera" cls="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                      <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
                        style={{ backgroundColor: `${d.color}18`, color: d.color, border: `1px solid ${d.color}40` }}>{d.label}</span>
                      <p className="mt-0.5 text-[11px] font-semibold text-gray-900 leading-tight">{koor.full_name}</p>
                      <p className="text-[9px] text-gray-500">{koor.jabatan || `Koor ${d.label}`}</p>

                      {/* Sekjen */}
                      {sekjen && (
                        <div className="mt-3 w-full flex flex-col items-center">
                          <div className="w-[1.5px] h-5 bg-slate-400 mx-auto"></div>
                          <div className="relative group">
                            <AvatarImg person={sekjen} size={34} color={d.color} textSize="text-xs" />
                            {canEdit(sekjen) && (
                              <button type="button" onClick={() => openEditPhoto(sekjen)} title="Ganti Foto"
                                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center">
                                <Icon name="camera" cls="w-2.5 h-2.5 text-blue-600" />
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-gray-700 mt-0.5 leading-tight max-w-[90px]">{sekjen.full_name}</p>
                          <p className="text-[8px] text-gray-400">{sekjen.jabatan || 'Sekjen'}</p>
                        </div>
                      )}

                      {/* Anggota (Tampilan Kotak) */}
                      {(anggotaProfiles.length > 0 || anggotaMembers.length > 0 || canManageMembers(d.key)) && (
                        <div className="mt-3 w-full flex flex-col items-center">
                          <div className="w-[1.5px] h-4 bg-slate-300 mx-auto"></div>
                          <div className="w-full bg-white border border-gray-200 rounded-lg p-2 shadow-xs">
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Anggota</span>
                              {canManageMembers(d.key) && (
                                <button
                                  type="button"
                                  onClick={() => { setAddMemberDivisi(d.key); setAddMemberName('') }}
                                  title="Tambah Anggota"
                                  className="text-[8px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                >
                                  <Icon name="plus" cls="w-2.5 h-2.5" />
                                  <span>Tambah</span>
                                </button>
                              )}
                            </div>

                            {/* Input Form Tambah Anggota */}
                            {addMemberDivisi === d.key && (
                              <div className="mb-2 p-1.5 bg-blue-50/60 border border-blue-200 rounded-md space-y-1 text-left">
                                <input
                                  type="text"
                                  value={addMemberName}
                                  onChange={(e) => setAddMemberName(e.target.value)}
                                  placeholder="Nama anggota..."
                                  className="ds-input text-[10px] py-1 px-1.5 w-full rounded bg-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddMember(d.key, koor.id.startsWith('empty') ? null : koor.id)
                                  }}
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={savingMember}
                                    onClick={() => handleAddMember(d.key, koor.id.startsWith('empty') ? null : koor.id)}
                                    className="flex-1 text-[9px] bg-blue-600 text-white rounded py-0.5 font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                  >
                                    {savingMember ? <MatrixLoader size="sm" /> : 'Simpan'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddMemberDivisi(null)}
                                    className="text-[9px] bg-gray-200 text-gray-600 rounded py-0.5 px-1.5 hover:bg-gray-300"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* List Kartu Kotak Anggota */}
                            <div className="space-y-1 max-h-[140px] overflow-y-auto">
                              {anggotaProfiles.map((x) => (
                                <div key={x.id} className="flex items-center justify-between px-1.5 py-1 bg-gray-50 border border-gray-100 rounded text-left">
                                  <span className="text-[10px] font-medium text-gray-800 truncate" title={x.full_name}>{x.full_name}</span>
                                </div>
                              ))}
                              {anggotaMembers.map((m) => (
                                <div key={m.id} className="group/item flex items-center justify-between px-1.5 py-1 bg-gray-50 border border-gray-100 rounded text-left hover:border-red-200 hover:bg-red-50/30 transition-colors">
                                  <span className="text-[10px] font-medium text-gray-800 truncate" title={m.full_name}>{m.full_name}</span>
                                  {canManageMembers(d.key) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMember(m.id)}
                                      title="Hapus Anggota"
                                      className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                                    >
                                      <Icon name="trash" cls="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {anggotaProfiles.length === 0 && anggotaMembers.length === 0 && !addMemberDivisi && (
                                <p className="text-[9px] text-gray-400 italic py-1 text-center">Belum ada anggota</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Ganti Foto */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-scaleUp">
            <h3 className="text-lg font-bold text-gray-900">Kelola Foto Profil</h3>
            <p className="text-xs text-gray-500 mt-0.5">{editTarget.full_name}</p>
            <div className="my-6 flex justify-center">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                  {previewUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={previewUrl} alt="Preview" className="w-full h-full rounded-full object-cover" />
                    : <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">{initial(editTarget.full_name)}</div>
                  }
                </div>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="hidden" />
            <div className="space-y-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={savingPhoto}
                className="w-full btn btn-outline btn-sm py-2 flex items-center justify-center gap-1.5">
                <Icon name="camera" cls="w-4 h-4 text-blue-600" />
                <span>{previewUrl ? 'Pilih Foto Lain' : 'Pilih Foto (JPG/PNG)'}</span>
              </button>
              {selectedFile && (
                <button type="button" onClick={handleSavePhoto} disabled={savingPhoto} className="w-full btn btn-primary btn-sm py-2 flex items-center justify-center gap-2">
                  {savingPhoto && <MatrixLoader size="sm" />}
                  <span>{savingPhoto ? 'Menyimpan...' : 'Simpan Foto Baru'}</span>
                </button>
              )}
              {editTarget.avatar_url && !selectedFile && (
                <button type="button" onClick={handleDeletePhoto} disabled={savingPhoto} className="w-full btn btn-danger btn-sm py-2 flex items-center justify-center gap-2">
                  {savingPhoto && <MatrixLoader size="sm" />}
                  <span>{savingPhoto ? 'Menghapus...' : 'Hapus Foto Profil'}</span>
                </button>
              )}
              <button type="button" onClick={() => { setEditTarget(null); setSelectedFile(null) }} disabled={savingPhoto}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 font-medium">Tutup / Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
