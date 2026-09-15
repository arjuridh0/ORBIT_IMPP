'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'

export default function Navbar() {
  const { loading, profile } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setOpen(false)
    setTipsOpen(false)
  }, [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false)
        setTipsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const linkCls = (active: boolean) =>
    `relative text-[15px] font-medium px-3 py-2 rounded-lg transition ${
      active
        ? 'text-blue-700 font-semibold after:absolute after:content-[\'\'] after:left-3 after:right-3 after:-bottom-px after:h-[2px] after:rounded-full after:bg-blue-600'
        : 'text-gray-600 hover:text-gray-900'
    }`

  const itemCls = (active: boolean) =>
    `block text-sm font-medium px-3 py-2 rounded-lg ${
      active ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
    }`

  const drawerCls = (active: boolean) =>
    `block text-[15px] font-medium px-4 py-4 rounded-lg ${
      active ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
    }`

  const Kalender = (
    <Link href="/" className={linkCls(pathname === '/')}>
      Kalender
    </Link>
  )

  const VisiMisi = (
    <Link href="/tentang/visi-misi" className={itemCls(pathname.startsWith('/tentang/visi-misi'))}>
      Visi Misi
    </Link>
  )

  const Struktur = (
    <Link href="/tentang/struktur" className={itemCls(pathname.startsWith('/tentang/struktur'))}>
      Profil Kepengurusan
    </Link>
  )

  const KelolaUser = (
    <Link href="/admin/users" className={linkCls(pathname.startsWith('/admin'))}>
      Kelola User
    </Link>
  )

  const showKelola = !loading && (profile?.role === 'admin' || profile?.role === 'ketua' || profile?.role === 'superadmin')
  const showMasuk = !loading && !profile

  const Masuk = (
    <Link
      href="/login"
      className="flex items-center gap-2 text-[15px] font-medium px-4 py-4 rounded-lg text-gray-700 hover:bg-gray-50"
    >
      <Icon name="key" cls="w-5 h-5" />
      Masuk
    </Link>
  )

  return (
    <nav ref={navRef} className="relative flex items-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
      {/* Hamburger mobile & tablet */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
        aria-expanded={open}
        className="lg:hidden size-11 inline-flex items-center justify-center -ml-1 text-gray-600 hover:text-gray-900 transition"
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>

      {/* Desktop nav tengah */}
      <ul className="hidden lg:flex items-center gap-0.5">
        <li>{Kalender}</li>
        <li className="relative">
          <button
            type="button"
            onClick={() => setTipsOpen(!tipsOpen)}
            aria-haspopup="true"
            aria-expanded={tipsOpen}
            className={`flex items-center gap-1 ${linkCls(pathname.startsWith('/tentang'))}`}
          >
            Tentang IMPP
            <Icon name="chevron" cls={`w-3.5 h-3.5 transition-transform ${tipsOpen ? 'rotate-180' : ''}`} />
          </button>
          {tipsOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg p-1.5 z-50">
              {VisiMisi}
              {Struktur}
            </div>
          )}
        </li>
        {showKelola && <li>{KelolaUser}</li>}
      </ul>

      {/* Drawer mobile & tablet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/25"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed rounded-2xl left-3 right-3 top-[72px] bg-white border border-gray-100 shadow-xl p-2 space-y-0.5 z-50">
            {showMasuk && Masuk}
            <Link href="/" className={drawerCls(pathname === '/')}>
              Kalender
            </Link>
            <Link href="/tentang/visi-misi" className={drawerCls(pathname.startsWith('/tentang/visi-misi'))}>
              Visi Misi
            </Link>
            <Link href="/tentang/struktur" className={drawerCls(pathname.startsWith('/tentang/struktur'))}>
              Profil Kepengurusan
            </Link>
            {showKelola && (
              <Link href="/admin/users" className={drawerCls(pathname.startsWith('/admin'))}>
                Kelola User
              </Link>
            )}
            {/* Logo strip bawah drawer */}
            <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-center gap-3 pb-1">
              <img src="/logo-orbit-impp.png" alt="ORBIT" className="h-5 w-auto object-contain opacity-60" />
              <span className="text-gray-300 text-xs">×</span>
              <img src="/logo impp.png" alt="IMPP" className="h-5 w-auto object-contain opacity-60" />
            </div>
          </div>
        </>
      )}
    </nav>
  )
}