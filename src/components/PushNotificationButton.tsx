'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)

    // Cek apakah sudah subscribe
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub)
        })
      }).catch(() => {})
    }
  }, [])

  // Hanya tampil di production dan browser yang support
  if (process.env.NODE_ENV !== 'production') return null
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null
  if (!VAPID_PUBLIC_KEY) return null
  if (permission === 'denied') return null
  if (subscribed) return null

  async function subscribe() {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys }),
      })
      setSubscribed(true)
    } catch {
      // Gagal subscribe — diam saja, tidak ganggu UX
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={loading}
      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition disabled:opacity-50"
      title="Aktifkan notifikasi pengingat kegiatan"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />
      </svg>
      {loading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
    </button>
  )
}
