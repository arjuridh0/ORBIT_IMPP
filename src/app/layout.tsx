import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'ORBIT IMPP',
  description: 'Kalender Kegiatan Organisasi IMPP',
  icons: { icon: '/logo-orbit-impp.png' },
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
