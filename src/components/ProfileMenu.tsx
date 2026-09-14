'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Icon } from '@/components/icons'
import { DIVISI_LABELS, type Divisi } from '@/lib/constants'

export default function ProfileMenu() {
  const { profile, user, logout, loading } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (loading || !profile) return null

  const displayName = profile.full_name || user?.email || ''
  const divisiLabel = DIVISI_LABELS[profile.divisi as Divisi] || profile.divisi

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu profil"
        className="flex items-center gap-2 p-1.5"
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={displayName}
            aria-hidden
            className="w-9 h-9 rounded-full object-cover ring-2 ring-offset-1 ring-gray-200 flex-shrink-0"
          />
        ) : (
          <span
            className="avatar-circle flex-shrink-0"
            style={{ width: 36, height: 36, fontSize: '0.875rem' }}
            aria-hidden
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <Icon name="chevron" cls={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg p-1.5 z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {divisiLabel}
              {profile.jabatan ? ` · ${profile.jabatan}` : ''}
            </p>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Edit Profil
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await logout()
              router.push('/')
            }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}