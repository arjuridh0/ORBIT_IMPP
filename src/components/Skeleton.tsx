import Header from '@/components/Header'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200/80 rounded-lg ${className}`} />
}

export function SkeletonAvatar({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/**
 * Skeleton khusus halaman Struktur Organisasi
 */
export function StrukturSkeleton() {
  return (
    <div className="py-8 space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Tier 1: Ketua & Wakil */}
      <div className="flex justify-center gap-6 sm:gap-12">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 w-48 sm:w-56 shadow-xs flex flex-col items-center gap-2">
          <SkeletonAvatar size={64} />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 w-48 sm:w-56 shadow-xs flex flex-col items-center gap-2">
          <SkeletonAvatar size={64} />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Tier 2: BPH (2 baris x 2 kolom) */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-xs flex items-center gap-3">
            <SkeletonAvatar size={40} />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Tier 3: Divisi cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonAvatar size={28} />
              <Skeleton className="h-3 w-20 flex-1" />
            </div>
            <Skeleton className="h-2 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton khusus tabel Kelola User
 */
export function AdminUsersSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      <Header />
      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Admin</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Kelola User</h1>
          <p className="text-blue-100 mt-2 text-sm">Memuat data user...</p>
        </div>
      </section>

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 pb-10">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl card-soft p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <SkeletonAvatar size={32} />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
              <Skeleton className="h-5 w-20 hidden sm:block" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-12 rounded-lg" />
                <Skeleton className="h-8 w-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Skeleton khusus halaman Kelola IMPP
 */
export function AdminImppSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      <Header />
      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Pengaturan Organisasi</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Kelola IMPP</h1>
          <p className="text-blue-100 mt-2 text-sm">Memuat data organisasi...</p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-10 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl card-soft p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </main>
    </div>
  )
}

/**
 * Skeleton khusus halaman Profil
 */
export function ProfilSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-fadeIn">
      <Header />
      <section className="hero-banner pb-10 pt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Akun</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Edit Profil</h1>
          <p className="text-blue-100 mt-2 text-sm">Memuat profil...</p>
        </div>
      </section>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <div className="max-w-3xl space-y-6">
          <div className="card-soft bg-white rounded-2xl p-5 sm:p-7 space-y-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-5">
              <SkeletonAvatar size={80} />
              <div className="space-y-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
          <div className="card-soft bg-white rounded-2xl p-5 sm:p-7 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
