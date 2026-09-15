import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'ORBIT IMPP - Kalender Kegiatan Organisasi'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 50%, #1d4ed8 100%)',
          padding: '70px 80px',
          position: 'relative',
        }}
      >
        {/* Glow circle */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Card Box */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '28px',
            padding: '48px 56px',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Badge */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 20px',
                borderRadius: '999px',
                background: 'rgba(37, 99, 235, 0.45)',
                border: '1px solid rgba(96, 165, 250, 0.6)',
                color: '#bfdbfe',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '1.5px',
              }}
            >
              AGENDA RESMI ORGANISASI
            </div>
          </div>

          {/* Main Title & Subtitle */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-1px',
                lineHeight: 1.1,
              }}
            >
              ORBIT <span style={{ color: '#60a5fa', margin: '0 8px' }}>·</span> IMPP
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#93c5fd',
                marginTop: '12px',
              }}
            >
              Organisasi, Rekapitulasi, Birokrasi &amp; Informasi Terpadu
            </div>
            <div
              style={{
                fontSize: '17px',
                color: '#cbd5e1',
                marginTop: '6px',
              }}
            >
              Ikatan Mahasiswa Pelajar Pemalang
            </div>
          </div>

          {/* Bottom Tags */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              📅 Kalender 4 Tampilan
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              🎨 Filter 6 Divisi
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              ⚡ Sinkron Realtime
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              👥 Bagan Struktur
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
