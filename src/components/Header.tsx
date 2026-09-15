'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import Navbar from '@/components/Navbar'
import ProfileMenu from '@/components/ProfileMenu'

export default function Header() {
  const { loading, profile } = useAuth()
  const isLoggedIn = !!profile

  return (
    <header className="bg-white header-depth sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 relative flex items-center">
        <Navbar />

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 min-w-0 lg:static lg:translate-x-0 lg:translate-y-0 flex-shrink-0"
        >
          <img
            src="/logo-orbit-impp.webp"
            alt="Logo ORBIT IMPP"
            className="h-9 w-auto object-contain hidden lg:block"
          />
          <div className="flex items-center gap-1.5 lg:hidden whitespace-nowrap">
            <span className="text-lg font-black text-[#031b46] tracking-wide">ORBIT</span>
            <img
              src="/logo-orbit-impp.webp"
              alt="Logo ORBIT IMPP"
              className="h-7 w-auto object-contain"
            />
            <span className="text-lg font-black text-[#1d75ae] tracking-wide">IMPP</span>
          </div>
          <div className="leading-none min-w-0 hidden lg:block">
            <h1 className="text-lg font-black text-[#031b46] tracking-wide leading-tight">ORBIT</h1>
            <p className="text-[10px] font-bold text-[#1d75ae] leading-none mt-1">Ikatan Mahasiswa Pelajar Pemalang</p>
          </div>
        </Link>

        <div className="flex items-center flex-shrink-0 ml-auto">
          {loading ? null : isLoggedIn ? (
            <ProfileMenu />
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 mr-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dot-breathe"></span>
                <span className="text-xs font-medium text-gray-500">Realtime</span>
              </div>
              <Link
                href="/login"
                aria-label="Masuk"
                title="Masuk"
                className="btn btn-primary rounded-lg !p-0 w-11 h-11"
              >
                <Icon name="key" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}