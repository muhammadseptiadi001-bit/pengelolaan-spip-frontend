import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Boxes, CheckCircle2, AlertTriangle, XCircle, Send } from 'lucide-react'
import { API_URL, PILIHAN_JENIS_SPIP, hitungJatuhTempo, hitungStatusWaktu } from '../utils/spipHelpers'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const WARNA_WAKTU = { "Aman": "#22c55e", "Mendekati Jatuh Tempo": "#eab308", "Sudah Lewat": "#ef4444" }

// Komponen angka dengan efek count-up
function AngkaCountUp({ nilai, durasi = 800 }) {
  const [tampil, setTampil] = useState(0)

  useEffect(() => {
    let mulai = null
    let frameId

    function animasikan(waktuSekarang) {
      if (mulai === null) mulai = waktuSekarang
      const progres = Math.min((waktuSekarang - mulai) / durasi, 1)
      setTampil(Math.floor(progres * nilai))
      if (progres < 1) {
        frameId = requestAnimationFrame(animasikan)
      } else {
        setTampil(nilai)
      }
    }

    frameId = requestAnimationFrame(animasikan)
    return () => cancelAnimationFrame(frameId)
  }, [nilai, durasi])

  return <>{tampil}</>
}

// Tooltip custom untuk grafik recharts
function TooltipKustom({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
      <p className="text-gray-600 dark:text-gray-300">Jumlah: {payload[0].value}</p>
    </div>
  )
}

const varianKontainer = {
  tersembunyi: {},
  tampil: {
    transition: { staggerChildren: 0.12 }
  }
}

const varianKartu = {
  tersembunyi: { opacity: 0, y: 16 },
  tampil: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

function Dashboard() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [filterJenisSpip, setFilterJenisSpip] = useState("Semua")
  const [statusKirim, setStatusKirim] = useState("")
  const [sedangKirim, setSedangKirim] = useState(false)

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    const response = await fetch(API_URL)
    const data = await response.json()
    setDaftarUnit(data)
  }

  async function tesKirimNotifikasi() {
    setSedangKirim(true)
    setStatusKirim("")
    try {
      const res = await fetch("https://pengelolaan-spip-backend-production.up.railway.app/api/kirim-notifikasi", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mengirim")
      setStatusKirim(data.pesan)
    } catch (err) {
      setStatusKirim("Gagal mengirim notifikasi: " + err.message)
    } finally {
      setSedangKirim(false)
    }
  }

  const dataTerfilter = useMemo(() => {
    if (filterJenisSpip === "Semua") return daftarUnit
    return daftarUnit.filter((unit) => unit.jenisSpip === filterJenisSpip)
  }, [daftarUnit, filterJenisSpip])

  const dataStatusKelayakan = useMemo(() => {
    const hitung = { "Layak": 0, "Tidak Layak": 0, "Layak Dengan Catatan": 0 }
    dataTerfilter.forEach((unit) => {
      if (hitung[unit.statusKelayakan] !== undefined) hitung[unit.statusKelayakan] += 1
    })
    return Object.entries(hitung).map(([nama, jumlah]) => ({ nama, jumlah }))
  }, [dataTerfilter])

  const dataStatusWaktu = useMemo(() => {
    const hitung = { "Aman": 0, "Mendekati Jatuh Tempo": 0, "Sudah Lewat": 0 }
    dataTerfilter.forEach((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      const label = hitungStatusWaktu(jatuhTempo).label
      if (hitung[label] !== undefined) hitung[label] += 1
    })
    return Object.entries(hitung).map(([nama, jumlah]) => ({ nama, jumlah }))
  }, [dataTerfilter])

  const dataPerJenisSpip = useMemo(() => {
    const hitung = {}
    PILIHAN_JENIS_SPIP.forEach((jenis) => { hitung[jenis] = 0 })
    dataTerfilter.forEach((unit) => {
      if (hitung[unit.jenisSpip] !== undefined) hitung[unit.jenisSpip] += 1
    })
    return Object.entries(hitung).map(([nama, jumlah]) => ({ nama, jumlah }))
  }, [dataTerfilter])

  const ringkasan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0
    dataTerfilter.forEach((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      const status = hitungStatusWaktu(jatuhTempo).label
      if (status === "Aman") aman++
      else if (status === "Mendekati Jatuh Tempo") mendekati++
      else lewat++
    })
    return { total: dataTerfilter.length, aman, mendekati, lewat }
  }, [dataTerfilter])

  const kartuRingkasan = [
    { label: "Total Unit", nilai: ringkasan.total, icon: Boxes, warna: "text-gray-800 dark:text-white", bgIkon: "bg-gray-100 dark:bg-gray-800" },
    { label: "Aman", nilai: ringkasan.aman, icon: CheckCircle2, warna: "text-green-600 dark:text-green-400", bgIkon: "bg-green-50 dark:bg-green-950" },
    { label: "Mendekati Jatuh Tempo", nilai: ringkasan.mendekati, icon: AlertTriangle, warna: "text-yellow-600 dark:text-yellow-400", bgIkon: "bg-yellow-50 dark:bg-yellow-950" },
    { label: "Sudah Lewat", nilai: ringkasan.lewat, icon: XCircle, warna: "text-red-600 dark:text-red-400", bgIkon: "bg-red-50 dark:bg-red-950" },
  ]

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>

        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Kategori SPIP</label>
            <select
              value={filterJenisSpip}
              onChange={(e) => setFilterJenisSpip(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
            >
              <option value="Semua">Semua</option>
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <button
            onClick={tesKirimNotifikasi}
            disabled={sedangKirim}
            className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-gray-900 px-4 py-2 rounded font-semibold h-fit flex items-center gap-2"
          >
            <Send size={16} />
            {sedangKirim ? "Mengirim..." : "Tes Kirim Notifikasi Email"}
          </button>
        </div>
      </div>

      {statusKirim && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg mb-6 text-sm"
        >
          {statusKirim}
        </motion.div>
      )}

      <motion.div
        variants={varianKontainer}
        initial="tersembunyi"
        animate="tampil"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {kartuRingkasan.map((kartu) => {
          const Icon = kartu.icon
          return (
            <motion.div
              key={kartu.label}
              variants={varianKartu}
              className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800 flex items-start justify-between"
            >
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{kartu.label}</p>
                <p className={`text-2xl font-bold ${kartu.warna}`}>
                  <AngkaCountUp nilai={kartu.nilai} />
                </p>
              </div>
              <div className={`p-2 rounded-lg ${kartu.bgIkon}`}>
                <Icon size={20} className={kartu.warna} />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow dark:shadow-none dark:border dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status Kelayakan</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataStatusKelayakan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<TooltipKustom />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                {dataStatusKelayakan.map((entry, index) => (
                  <Cell key={index} fill={WARNA_KELAYAKAN[entry.nama]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow dark:shadow-none dark:border dark:border-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status Waktu Uji</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataStatusWaktu}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<TooltipKustom />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                {dataStatusWaktu.map((entry, index) => (
                  <Cell key={index} fill={WARNA_WAKTU[entry.nama]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow dark:shadow-none dark:border dark:border-gray-800 md:col-span-2"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Jumlah Unit per Kategori SPIP</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataPerJenisSpip}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<TooltipKustom />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="jumlah" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard