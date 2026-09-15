'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { supabase } from '@/lib/supabase/client'
import { Icon } from '@/components/icons'

const STARS = [
  { top: '13%', left: '16%', size: 9, delay: '0s' },
  { top: '21%', left: '79%', size: 6, delay: '1.2s' },
  { top: '36%', left: '7%', size: 5, delay: '2.1s' },
  { top: '9%', left: '49%', size: 7, delay: '0.6s' },
  { top: '57%', left: '89%', size: 6, delay: '1.8s' },
  { top: '69%', left: '11%', size: 8, delay: '0.9s' },
  { top: '83%', left: '63%', size: 5, delay: '2.6s' },
  { top: '44%', left: '93%', size: 7, delay: '0.3s' },
]

function IllustrasiKalender() {
  const cell = (x: number, y: number, key: string) => (
    <rect key={key} x={x} y={y} width="20" height="20" rx="7" fill="#e2e9f4" />
  )
  return (
    <svg viewBox="0 0 400 380" role="img" aria-label="Ilustrasi kalender kegiatan" className="login-illus">
      <defs>
        <filter id="lsSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="-6" dy="-6" stdDeviation="7" floodColor="#ffffff" floodOpacity="0.45" />
          <feDropShadow dx="7" dy="7" stdDeviation="9" floodColor="#1e3a8a" floodOpacity="0.5" />
        </filter>
      </defs>
      <circle cx="70" cy="52" r="7" fill="#93c5fd" opacity="0.8" />
      <circle cx="200" cy="180" r="158" fill="#dbeafe" opacity="0.28" />
      <rect x="78" y="70" width="244" height="228" rx="26" fill="#eef2f9" filter="url(#lsSoft)" />
      <rect x="102" y="96" width="70" height="12" rx="6" fill="#2563eb" />
      <circle cx="300" cy="102" r="3.5" fill="#93a6c8" />
      <circle cx="286" cy="102" r="3.5" fill="#b3c2dd" />
      <circle cx="272" cy="102" r="3.5" fill="#c9d5ea" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`wd-${i}`} x={102 + i * 30} y="126" width="20" height="6" rx="3" fill="#c9d5ea" />
      ))}
      {[0, 1, 2, 4, 5, 6].map((i) => cell(102 + i * 30, 148, `baris1-${i}`))}
      <circle cx="202" cy="158" r="13" fill="#2563eb" />
      <text x="202" y="162" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff" fontFamily="Inter, sans-serif">15</text>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => cell(102 + i * 30, 182, `baris2-${i}`))}
      <rect x="102" y="185.5" width="20" height="13" rx="4" fill="#60a5fa" />
      <rect x="222" y="185.5" width="20" height="13" rx="4" fill="#2563eb" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => cell(102 + i * 30, 216, `baris3-${i}`))}
      <rect x="132" y="219.5" width="20" height="13" rx="4" fill="#93c5fd" />
      <g transform="rotate(8 330 60)">
        <rect x="292" y="40" width="80" height="36" rx="12" fill="#ffffff" filter="url(#lsSoft)" />
        <circle cx="308" cy="58" r="6" fill="#2563eb" />
        <rect x="320" y="52" width="40" height="5" rx="2.5" fill="#c9d5ea" />
        <rect x="320" y="61" width="28" height="5" rx="2.5" fill="#dbe4f2" />
      </g>
      <g transform="rotate(-6 90 290)">
        <rect x="46" y="268" width="96" height="38" rx="12" fill="#ffffff" filter="url(#lsSoft)" />
        <circle cx="64" cy="287" r="8" fill="#059669" />
        <path d="M60.5 287l2.5 2.5 4.5-5" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="80" y="280" width="48" height="5" rx="2.5" fill="#c9d5ea" />
        <rect x="80" y="289" width="34" height="5" rx="2.5" fill="#dbe4f2" />
      </g>
      <g>
        <circle cx="330" cy="300" r="10" fill="#ffffff" filter="url(#lsSoft)" />
        <circle cx="330" cy="300" r="4" fill="#60a5fa" />
      </g>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPw, setShowPw] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget
    el.classList.remove('login-sweep')
    void el.offsetWidth
    el.classList.add('login-sweep')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      Swal.fire('Gagal', 'Supabase belum dikonfigurasi.', 'error')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      Swal.fire('Gagal Masuk', error.message, 'error')
      return
    }
    router.replace('/')
  }

  return (
    <div className="login-bg min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="login-orb login-orb-1" aria-hidden></div>
      <div className="login-orb login-orb-2" aria-hidden></div>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="login-star"
          aria-hidden
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        ></span>
      ))}

      <div className="relative z-10 w-full max-w-4xl login-panel rounded-3xl overflow-hidden shadow-2xl">
        <div className="login-visual-wrap login-visual">
          <IllustrasiKalender />
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold leading-snug">
              Semua jadwal IMPP,<br />satu papan agenda.
            </h2>
            <p className="text-blue-100 text-sm mt-2">Realtime, per divisi, untuk semua anggota.</p>
          </div>
        </div>

        <div
          className="login-card p-6 sm:p-10 flex flex-col justify-center"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
        >
          {/* Header: dual logo ORBIT + IMPP */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <img src="/logo-orbit-impp.png" alt="ORBIT" className="h-9 w-auto object-contain" />
              <span className="text-gray-300 text-sm">×</span>
              <img src="/logo impp.png" alt="IMPP" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">ORBIT IMPP</h1>
              <p className="text-xs text-gray-500">Masuk untuk mengelola kegiatan</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neu-input"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neu-input pr-10"
                  placeholder="Password akun"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <Icon name={showPw ? 'eye-off' : 'eye'} cls="w-4 h-4" />
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="neu-btn">
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Hanya BPH dan koor divisi yang memiliki akun.{' '}
            <Link href="/" className="text-blue-600 font-semibold hover:underline">Kembali ke kalender</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
