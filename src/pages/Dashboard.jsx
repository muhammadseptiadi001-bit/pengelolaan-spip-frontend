import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts'
import { Boxes, CheckCircle2, AlertTriangle, XCircle, Send } from 'lucide-react'
import { API_URL, PILIHAN_JENIS_SPIP, hitungJatuhTempo, hitungStatusWaktu } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const WARNA_WAKTU = { "Aman": "#22c55e", "Mendekati Jatuh Tempo": "#eab308", "Sudah Lewat": "#ef4444" }

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

function KartuSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
      <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  )
}

function GrafikSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse">
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="h-[260px] bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
    </div>
  )
}

function TooltipModern({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-gray-900/95 dark:bg-black/90 backdrop-blur-sm text-white rounded-xl shadow-2xl px-4 py-2.5 border border-white/10">
      <p className="text-xs text-gray-300 mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: payload[0].payload.fill || "#eab308" }}>
        {payload[0].value} unit
      </p>
    </div>
  )
}

const varianKontainer = {
  tersembunyi: {},
  tampil: { transition: { staggerChildren: 0.12 } }
}

const varianKartu = {
  tersembunyi: { opacity: 0, y: 16 },
  tampil: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

function Dashboard() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filterJenisSpip, setFilterJenisSpip] = useState("Semua")
  const [statusKirim, setStatusKirim] = useState("")
  const [sedangKirim, setSedangKirim] = useState(false)

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const response = await apiFetch(API_URL)
      const data = await response.json()
      setDaftarUnit(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  async function tesKirimNotifikasi() {
    setSedangKirim(true)
    setStatusKirim("")
    try {
      const res = await apiFetch("https://pengelolaan-spip-backend-production.up.railway.app/api/kirim-notifikasi", { method: "POST" })
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
    { label: "Total Unit", nilai: ringkasan.total, icon: Boxes, warna: "text-gray-800 dark:text-white", aksen: "from-gray-400 to-gray-600", bgIkon: "bg-gradient-to-br from-gray-500 to-gray-700" },
    { label: "Aman", nilai: ringkasan.aman, icon: CheckCircle2, warna: "text-green-600 dark:text-green-400", aksen: "from-green-400 to-emerald-600", bgIkon: "bg-gradient-to-br from-green-400 to-emerald-600" },
    { label: "Mendekati Jatuh Tempo", nilai: ringkasan.mendekati, icon: AlertTriangle, warna: "text-yellow-600 dark:text-yellow-400", aksen: "from-yellow-400 to-amber-600", bgIkon: "bg-gradient-to-br from-yellow-400 to-amber-600" },
    { label: "Sudah Lewat", nilai: ringkasan.lewat, icon: XCircle, warna: "text-red-600 dark:text-red-400", aksen: "from-red-400 to-rose-600", bgIkon: "bg-gradient-to-br from-red-400 to-rose-600" },
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
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2"
            >
              <option value="Semua">Semua</option>
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={tesKirimNotifikasi}
            disabled={sedangKirim}
            className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 text-gray-900 px-4 py-2 rounded-lg font-semibold h-fit flex items-center gap-2 shadow-md shadow-yellow-400/20"
          >
            <Send size={16} />
            {sedangKirim ? "Mengirim..." : "Tes Kirim Notifikasi Email"}
          </motion.button>
        </div>
      </div>

      {statusKirim && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-xl mb-6 text-sm"
        >
          {statusKirim}
        </motion.div>
      )}

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KartuSkeleton />
          <KartuSkeleton />
          <KartuSkeleton />
          <KartuSkeleton />
        </div>
      ) : (
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
                whileHover={{ scale: 1.03, boxShadow: "0px 12px 28px rgba(0,0,0,0.14)" }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 flex items-start justify-between"
              >
                <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${kartu.aksen}`}></div>
                <div className="pl-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{kartu.label}</p>
                  <p className={`text-3xl font-extrabold tracking-tight ${kartu.warna}`}>
                    <AngkaCountUp nilai={kartu.nilai} />
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${kartu.bgIkon} shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {sedangMuat ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GrafikSkeleton />
          <GrafikSkeleton />
          <div className="md:col-span-2"><GrafikSkeleton /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.008, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Status Kelayakan</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {dataStatusKelayakan.reduce((a, b) => a + b.jumlah, 0)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataStatusKelayakan} barCategoryGap="30%">
                <defs>
                  {dataStatusKelayakan.map((entry, index) => (
                    <linearGradient key={index} id={`gradKelayakan${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_KELAYAKAN[entry.nama]} stopOpacity={1} />
                      <stop offset="100%" stopColor={WARNA_KELAYAKAN[entry.nama]} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} maxBarSize={70}>
                  {dataStatusKelayakan.map((entry, index) => (
                    <Cell key={index} fill={`url(#gradKelayakan${index})`} />
                  ))}
                  <LabelList dataKey="jumlah" position="top" style={{ fontSize: 13, fontWeight: 700 }} className="fill-gray-700 dark:fill-gray-200" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.008, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Status Waktu Uji</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {dataStatusWaktu.reduce((a, b) => a + b.jumlah, 0)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataStatusWaktu} barCategoryGap="30%">
                <defs>
                  {dataStatusWaktu.map((entry, index) => (
                    <linearGradient key={index} id={`gradWaktu${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_WAKTU[entry.nama]} stopOpacity={1} />
                      <stop offset="100%" stopColor={WARNA_WAKTU[entry.nama]} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} maxBarSize={70}>
                  {dataStatusWaktu.map((entry, index) => (
                    <Cell key={index} fill={`url(#gradWaktu${index})`} />
                  ))}
                  <LabelList dataKey="jumlah" position="top" style={{ fontSize: 13, fontWeight: 700 }} className="fill-gray-700 dark:fill-gray-200" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.004, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800 md:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Jumlah Unit per Kategori SPIP</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {dataPerJenisSpip.reduce((a, b) => a + b.jumlah, 0)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataPerJenisSpip} barCategoryGap="30%">
                <defs>
                  <linearGradient id="gradKuning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="jumlah" fill="url(#gradKuning)" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="jumlah" position="top" style={{ fontSize: 13, fontWeight: 700 }} className="fill-gray-700 dark:fill-gray-200" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Dashboard