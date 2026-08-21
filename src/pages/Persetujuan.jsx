import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ClipboardCheck, Building2, Wrench, ShieldCheck, Loader2 } from 'lucide-react'
import { API_URL } from '../utils/spipHelpers'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

function warnaKelayakanRingkas(status) {
  if (status === "Layak") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (status === "Tidak Layak") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
}

function labelTahap(role) {
  if (role === "ko") return "Menunggu Pemeriksaan KO"
  if (role === "ktt") return "Menunggu Persetujuan KTT"
  return ""
}

function Persetujuan() {
  const user = ambilUser()
  const role = user?.role
  const bolehAkses = role === "ko" || role === "ktt"

  const [daftarUnit, setDaftarUnit] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [unitDiproses, setUnitDiproses] = useState(null)

  const ambilData = useCallback(async () => {
    if (!bolehAkses) {
      setSedangMuat(false)
      return
    }
    setSedangMuat(true)
    try {
      const res = await apiFetch(`${API_URL}/persetujuan`)
      if (!res.ok) throw new Error("Gagal mengambil data")
      const data = await res.json()
      setDaftarUnit(data)
    } catch (err) {
      console.error(err)
      tampilkanToast("Gagal mengambil daftar persetujuan. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangMuat(false)
    }
  }, [bolehAkses])

  useEffect(() => {
    ambilData()
  }, [ambilData])

  async function setujuiUnit(unit) {
    const konfirmasi = window.confirm(`Setujui unit "${unit.namaUnit} (${unit.nomorUnit})"?`)
    if (!konfirmasi) return

    setUnitDiproses(unit.id)
    try {
      const res = await apiFetch(`${API_URL}/${unit.id}/setujui`, { method: "PUT" })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil.error || "Gagal menyetujui")
      tampilkanToast("Unit berhasil disetujui.", "sukses")
      ambilData()
    } catch (err) {
      console.error(err)
      tampilkanToast(err.message || "Gagal menyetujui unit.", "gagal")
    } finally {
      setUnitDiproses(null)
    }
  }

  async function tolakUnit(unit) {
    const catatan = window.prompt(`Alasan penolakan untuk unit "${unit.namaUnit} (${unit.nomorUnit})":`)
    if (catatan === null) return
    if (catatan.trim() === "") {
      tampilkanToast("Alasan penolakan wajib diisi.", "gagal")
      return
    }

    setUnitDiproses(unit.id)
    try {
      const res = await apiFetch(`${API_URL}/${unit.id}/tolak`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil.error || "Gagal menolak")
      tampilkanToast("Unit berhasil ditolak dan dikembalikan untuk revisi.", "sukses")
      ambilData()
    } catch (err) {
      console.error(err)
      tampilkanToast(err.message || "Gagal menolak unit.", "gagal")
    } finally {
      setUnitDiproses(null)
    }
  }

  if (!bolehAkses) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Persetujuan</h1>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Halaman ini hanya bisa diakses oleh KO atau KTT.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Persetujuan</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{labelTahap(role)}</p>

      {sedangMuat ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : daftarUnit.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Tidak ada unit yang menunggu persetujuan Anda saat ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {daftarUnit.map((unit) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardCheck size={16} className="text-blue-500" />
                      <h3 className="font-bold text-gray-800 dark:text-white">{unit.namaUnit} ({unit.nomorUnit})</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {unit.namaPerusahaan}</span>
                      <span className="flex items-center gap-1"><Wrench size={12} /> {unit.jenisAlat}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${warnaKelayakanRingkas(unit.statusKelayakan)}`}>
                        <ShieldCheck size={12} /> {unit.statusKelayakan}
                      </span>
                    </div>
                    {unit.temuan && (
                      <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-semibold">Temuan:</span> {unit.temuan}</p>
                    )}
                    {unit.catatanPenolakan && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        <span className="font-semibold">Catatan penolakan sebelumnya ({unit.ditolakOleh}):</span> {unit.catatanPenolakan}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setujuiUnit(unit)}
                      disabled={unitDiproses === unit.id}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm shadow-md shadow-green-500/20"
                    >
                      {unitDiproses === unit.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Setujui
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => tolakUnit(unit)}
                      disabled={unitDiproses === unit.id}
                      className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-950 dark:hover:bg-red-600 disabled:opacity-60 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm transition-colors"
                    >
                      <XCircle size={15} /> Tolak
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default Persetujuan