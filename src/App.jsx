import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'

// Halaman-halaman berat dimuat "lazy" - kodenya baru diambil saat dibuka
const Dashboard = lazy(() => import('./pages/Dashboard'))
const InputData = lazy(() => import('./pages/InputData'))
const DataSPIP = lazy(() => import('./pages/DataSPIP'))
const Riwayat = lazy(() => import('./pages/Riwayat'))
const Evaluasi = lazy(() => import('./pages/Evaluasi'))
const Pemeliharaan = lazy(() => import('./pages/Pemeliharaan'))
const PengamananInstalasi = lazy(() => import('./pages/PengamananInstalasi'))
const KompetensiTeknik = lazy(() => import('./pages/KompetensiTeknik'))

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App