import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { History, ArrowRight } from 'lucide-react'
import { API_URL } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

function warnaBadgeStatus(status) {
  if (status === "Layak") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (status === "Tidak Layak") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
}

function formatTanggalWaktu(tanggal) {
  return new Date(tanggal).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

function Riwayat() {
  const [daftarRiwayat, setDaftarRiwayat] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)

  useEffect(() => {
    ambilRiwayat()
  }, [])

  async function ambilRiwayat() {
    setSedangMuat(true)
    try {
      const res = await apiFetch(`${API_URL.replace('/api/unit', '')}/api/riwayat`)
      const data = await res.json()
      setDaftarRiwayat(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Riwayat Perubahan Status</h1>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-700 dark:to-black shadow-md">
            <History size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Log Perubahan Status Kelayakan</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{daftarRiwayat.length} perubahan tercatat</p>
          </div>
        </div>

        {sedangMuat ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : daftarRiwayat.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Belum ada perubahan status yang tercatat.</p>
        ) : (
          <div className="space-y-2">
            {daftarRiwayat.map((riwayat, index) => (
              <motion.div
                key={riwayat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
                className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{riwayat.namaUnit} ({riwayat.nomorUnit})</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Diubah oleh <span className="font-medium text-gray-600 dark:text-gray-300">{riwayat.diubahOleh}</span> · {formatTanggalWaktu(riwayat.diubahPada)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${warnaBadgeStatus(riwayat.statusLama)}`}>{riwayat.statusLama}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${warnaBadgeStatus(riwayat.statusBaru)}`}>{riwayat.statusBaru}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Riwayat