export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <img
        src="/logo-orbit-impp.webp"
        alt="Logo ORBIT IMPP"
        className="h-14 w-auto mb-4 object-contain"
      />
      <h1 className="text-xl font-bold text-[#031b46] mb-2">Kamu sedang offline</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Periksa koneksi internetmu. Kalender dan agenda akan kembali tampil saat
        online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
      >
        Coba lagi
      </button>
    </div>
  )
}