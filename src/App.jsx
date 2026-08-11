import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'

// Pembungkus khusus untuk React.lazy(): kalau import gagal karena file chunk lama
// sudah tidak ada di server (biasanya karena ada deploy baru sementara tab ini masih
// terbuka), otomatis reload halaman SATU KALI supaya browser ambil daftar chunk
// terbaru. Pakai sessionStorage sebagai penanda supaya tidak reload berulang-ulang
// kalau ternyata errornya bukan soal chunk basi (mencegah infinite reload loop).
function lazyDenganAutoReload(fungsiImport) {
  return lazy(() =>
    fungsiImport().catch((error) => {
      const kunciPenanda = 'spip-sudah-reload-karena-chunk-error'
      const sudahPernahReload = sessionStorage.getItem(kunciPenanda)

      if (!sudahPernahReload) {
        sessionStorage.setItem(kunciPenanda, '1')
        window.location.reload()
        // Promise sengaja tidak pernah resolve/reject karena halaman akan reload
        return new Promise(() => {})
      }

      // Sudah pernah dicoba reload sekali tapi tetap gagal — berarti errornya
      // bukan soal chunk basi, lempar error aslinya supaya tidak diam-diam gagal.
      throw error
    })
  )
}

const Dashboard = lazyDenganAutoReload(() => import('./pages/Dashboard'))
const InputData = lazyDenganAutoReload(() => import('./pages/InputData'))
const DataSPIP = lazyDenganAutoReload(() => import('./pages/DataSPIP'))
const Riwayat = lazyDenganAutoReload(() => import('./pages/Riwayat'))
const Evaluasi = lazyDenganAutoReload(() => import('./pages/Evaluasi'))
const Pemeliharaan = lazyDenganAutoReload(() => import('./pages/Pemeliharaan'))
const PengamananInstalasi = lazyDenganAutoReload(() => import('./pages/PengamananInstalasi'))
const KompetensiTeknik = lazyDenganAutoReload(() => import('./pages/KompetensiTeknik'))
const KajianTeknis = lazyDenganAutoReload(() => import('./pages/KajianTeknis'))

function LoadingHalaman() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Memuat halaman...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="input"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <InputData />
              </Suspense>
            }
          />
          <Route
            path="data"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <DataSPIP />
              </Suspense>
            }
          />
          <Route
            path="evaluasi"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <Evaluasi />
              </Suspense>
            }
          />
          <Route
            path="riwayat"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <Riwayat />
              </Suspense>
            }
          />
          <Route
            path="pemeliharaan"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <Pemeliharaan />
              </Suspense>
            }
          />
          <Route
            path="pengamanan-instalasi"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <PengamananInstalasi />
              </Suspense>
            }
          />
          <Route
            path="kompetensi-teknik"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <KompetensiTeknik />
              </Suspense>
            }
          />
          <Route
            path="kajian-teknis"
            element={
              <Suspense fallback={<LoadingHalaman />}>
                <KajianTeknis />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App