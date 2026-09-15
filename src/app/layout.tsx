import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://orbit-impp.id'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ORBIT IMPP - Kalender Kegiatan Organisasi',
    template: '%s | ORBIT IMPP',
  },
  description: 'Satu papan agenda resmi untuk seluruh divisi Ikatan Mahasiswa Pelajar Pemalang (IMPP). Pantau jadwal rabul & kegiatan tahunan real-time tanpa tanya di grup chat.',
  keywords: [
    'ORBIT IMPP',
    'IMPP',
    'Ikatan Mahasiswa Pelajar Pemalang',
    'Kalender Kegiatan',
    'Agenda IMPP',
    'Pemalang',
    'Jadwal Organisasi',
  ],
  authors: [{ name: 'ORBIT IMPP Team' }],
  creator: 'ORBIT IMPP',
  publisher: 'ORBIT IMPP',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/logo-orbit-impp.png',
    apple: '/logo-orbit-impp.png',
  },
  openGraph: {
    title: 'ORBIT IMPP - Kalender Kegiatan Organisasi',
    description: 'Satu papan agenda resmi untuk seluruh divisi Ikatan Mahasiswa Pelajar Pemalang (IMPP). Pantau jadwal rabul & kegiatan tahunan real-time.',
    url: siteUrl,
    siteName: 'ORBIT IMPP',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ORBIT IMPP - Kalender Kegiatan Organisasi',
    description: 'Satu papan agenda resmi untuk seluruh divisi Ikatan Mahasiswa Pelajar Pemalang (IMPP). Pantau jadwal rabul & kegiatan tahunan real-time.',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {/* FullCalendar — vendored lokal, tanpa dependensi CDN runtime */}
        <Script src="/vendor/fullcalendar.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/fullcalendar-locale-id.min.js" strategy="beforeInteractive" />
        <AuthProvider>
          {children}
          <footer className="footer-polish py-8">
            <div className="max-w-[1400px] mx-auto px-4 text-center">
              {/* Dual logo: ORBIT + IMPP */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <img src="/logo-orbit-impp.png" alt="Logo ORBIT" className="h-8 w-auto object-contain" />
                <span className="text-gray-300 font-light text-lg">×</span>
                <img src="/logo impp.png" alt="Logo IMPP" className="h-8 w-auto object-contain" />
              </div>
              <p className="text-sm font-bold text-[#031b46]">
                ORBIT <span className="text-[#1d75ae]">·</span> IMPP
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Organisasi, Rekapitulasi, Birokrasi, &amp; Informasi Terpadu
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ikatan Mahasiswa Pelajar Pemalang
              </p>
              <p className="text-xs text-gray-500/70 mt-3">
                &copy; {new Date().getFullYear()} ORBIT IMPP
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
