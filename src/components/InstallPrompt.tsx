'use client'

import { useEffect, useState } from 'react'
import PushNotificationButton from '@/components/PushNotificationButton'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setDismissed(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function onInstall() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setDeferred(null)
      setDismissed(true)
    }
  }

  if (!deferred || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="Logo ORBIT IMPP" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">Pasang ORBIT IMPP</p>
          <p className="text-xs text-gray-500 truncate">Akses kalender lebih cepat dari layar utama.</p>
        </div>
        <button type="button" onClick={onInstall} className="btn btn-primary btn-sm shrink-0 min-h-[34px]">Install</button>
        <button type="button" aria-label="Tutup" onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
      <div className="pl-[52px]">
        <PushNotificationButton />
      </div>
    </div>
  )
}