import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts'
import { Boxes, CheckCircle2, AlertTriangle, XCircle, Send, ShieldCheck, Clock, BarChart3 } from 'lucide-react'
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

function KartuSkeleton({ hero = false }) {
  return (
    <div className={`rounded-3xl animate-pulse ${hero ? "bg-[#0B1E33]/80 p-6" : "bg-white dark:bg-gray-900 p-5 shadow-sm dark:border dark:border-gray-800"}`}>
      <div className={`h-3 w-20 rounded mb-3 ${hero ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`}></div>
      <div className={`h-7 w-12 rounded ${hero ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`}></div>
    </div>
  )
}

function GrafikSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800 animate-pulse">
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="h-[260px] bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
    </div>
  )
}

function TooltipModern({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-gray-900/95 dark:bg-black/90 backdrop-blur-sm text-white rounded-xl shadow-2xl px-4 py-2.5 border border-white/10">
      <p className="text-xs text-gray-300 mb-0.5">{payload[0].name || label}</p>
      <p className="text-sm font-bold" style={{ color: payload[0].payload.fill || payload[0].color || "#3b82f6" }}>
        {payload[0].value} unit
      </p>
    </div>
  )
}

function IkonHeaderGrafik({ Icon, gradasi }) {
  return (
    <div className={`p-2 rounded-xl bg-gradient-to-br ${gradasi} shadow-md`}>
      <Icon size={16} className="text-white" />
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
  const [filterPerusahaan, setFilterPerusahaan] = useState("Semua")
  const [statusKirim, setStatusKirim] = useState("")
  const [sedangKirim, setSedangKirim] = useState(false)

  async function ambilData() {
    try {
      const response = await apiFetch(API_URL)
      const data = await response.json()

      let daftar = []
      if (Array.isArray(data)) {
        daftar = data
      } else if (Array.isArray(data?.data)) {
        daftar = data.data
      } else if (Array.isArray(data?.items)) {
        daftar = data.items
      } else if (Array.isArray(data?.result)) {
        daftar = data.result
      } else {
        console.warn('Bentuk response tidak dikenali:', data)
      }

      setDaftarUnit(daftar)
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  useEffect(() => {
    ambilData()
  }, [])

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

  const daftarPerusahaan = useMemo(() => {
    const nama = new Set()
    daftarUnit.forEach((unit) => {
      if (unit.namaPerusahaan) nama.add(unit.namaPerusahaan)
    })
    return Array.from(nama).sort()
  }, [daftarUnit])

  const dataTerfilter = useMemo(() => {
    return daftarUnit.filter((unit) => {
      const cocokJenisSpip = filterJenisSpip === "Semua" || unit.jenisSpip === filterJenisSpip
      const cocokPerusahaan = filterPerusahaan === "Semua" || unit.namaPerusahaan === filterPerusahaan
      return cocokJenisSpip && cocokPerusahaan
    })
  }, [daftarUnit, filterJenisSpip, filterPerusahaan])

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

  const totalStatusWaktu = dataStatusWaktu.reduce((a, b) => a + b.jumlah, 0)

  const kartuRingkasan = [
    { label: "Total Unit", nilai: ringkasan.total, icon: Boxes, hero: true },
    {
      label: "Aman",
      nilai: ringkasan.aman,
      icon: CheckCircle2,
      soft: true,
      bgKartu: "bg-green-50 dark:bg-green-950/40",
      border: "border border-green-100 dark:border-green-900/60",
      bgIkon: "bg-green-100 dark:bg-green-900/50",
      warnaIkon: "text-green-600 dark:text-green-400",
      warnaNilai: "text-green-700 dark:text-green-400",
      warnaLabel: "text-green-700/70 dark:text-green-400/70",
      warnaDekor: "bg-green-400/10"
    },
    {
      label: "Mendekati Jatuh Tempo",
      nilai: ringkasan.mendekati,
      icon: AlertTriangle,
      soft: true,
      bgKartu: "bg-amber-50 dark:bg-amber-950/40",
      border: "border border-amber-100 dark:border-amber-900/60",
      bgIkon: "bg-amber-100 dark:bg-amber-900/50",
      warnaIkon: "text-amber-600 dark:text-amber-400",
      warnaNilai: "text-amber-700 dark:text-amber-400",
      warnaLabel: "text-amber-700/70 dark:text-amber-400/70",
      warnaDekor: "bg-amber-400/10"
    },
    {
      label: "Sudah Lewat",
      nilai: ringkasan.lewat,
      icon: XCircle,
      soft: true,
      bgKartu: "bg-red-50 dark:bg-red-950/40",
      border: "border border-red-100 dark:border-red-900/60",
      bgIkon: "bg-red-100 dark:bg-red-900/50",
      warnaIkon: "text-red-600 dark:text-red-400",
      warnaNilai: "text-red-700 dark:text-red-400",
      warnaLabel: "text-red-700/70 dark:text-red-400/70",
      warnaDekor: "bg-red-400/10"
    },
  ]

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>

        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Filter Perusahaan</label>
            <select
              value={filterPerusahaan}
              onChange={(e) => setFilterPerusahaan(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82C4]/40 transition-shadow"
            >
              <option value="Semua">Semua</option>
              {daftarPerusahaan.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Filter Kategori SPIP</label>
            <select
              value={filterJenisSpip}
              onChange={(e) => setFilterJenisSpip(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3B82C4]/40 transition-shadow"
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
            className="bg-gradient-to-r from-[#0B1E33] to-[#1B3A5C] hover:opacity-90 disabled:opacity-50 text-white px-4 py-2.5 rounded-full font-semibold h-fit flex items-center gap-2 shadow-md shadow-[#0B1E33]/25 text-sm"
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
          <KartuSkeleton hero />
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

            if (kartu.hero) {
              return (
                <motion.div
                  key={kartu.label}
                  variants={varianKartu}
                  whileHover={{ scale: 1.03, boxShadow: "0px 16px 32px rgba(11,30,51,0.35)" }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden bg-gradient-to-br from-[#0B1E33] to-[#1B3A5C] p-5 rounded-3xl shadow-lg shadow-[#0B1E33]/25 flex flex-col justify-between"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#F2A93B]/10"></div>
                  <div className="absolute -right-2 top-8 w-14 h-14 rounded-full bg-[#3B82C4]/10"></div>
                  <div className="flex items-center justify-between relative">
                    <p className="text-sm text-white/70">{kartu.label}</p>
                    <div className="p-2 rounded-xl bg-white/10">
                      <Icon size={18} className="text-[#F2A93B]" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight text-white relative">
                    <AngkaCountUp nilai={kartu.nilai} />
                  </p>
                </motion.div>
              )
            }

            return (
              <motion.div
                key={kartu.label}
                variants={varianKartu}
                whileHover={{ scale: 1.03, boxShadow: "0px 12px 28px rgba(0,0,0,0.08)" }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden ${kartu.bgKartu} ${kartu.border} p-5 rounded-3xl flex flex-col justify-between`}
              >
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${kartu.warnaDekor}`}></div>
                <div className={`absolute -right-2 top-8 w-14 h-14 rounded-full ${kartu.warnaDekor}`}></div>
                <div className="flex items-center justify-between relative">
                  <p className={`text-sm ${kartu.warnaLabel}`}>{kartu.label}</p>
                  <div className={`p-2 rounded-xl ${kartu.bgIkon}`}>
                    <Icon size={16} className={kartu.warnaIkon} />
                  </div>
                </div>
                <p className={`text-3xl font-extrabold tracking-tight relative ${kartu.warnaNilai}`}>
                  <AngkaCountUp nilai={kartu.nilai} />
                </p>
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
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={ShieldCheck} gradasi="from-indigo-400 to-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Status Kelayakan</h2>
              </div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="jumlah" radius={[10, 10, 0, 0]} maxBarSize={70}>
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
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={Clock} gradasi="from-amber-400 to-amber-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Status Waktu Uji</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {totalStatusWaktu} total
              </span>
            </div>
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={dataStatusWaktu}
                    dataKey="jumlah"
                    nameKey="nama"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={4}
                    cornerRadius={8}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {dataStatusWaktu.map((entry, index) => (
                      <Cell key={index} fill={WARNA_WAKTU[entry.nama]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipModern />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-3xl font-extrabold text-gray-800 dark:text-white">
                  <AngkaCountUp nilai={totalStatusWaktu} />
                </span>
                <span className="text-xs text-gray-400">unit</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {dataStatusWaktu.map((entry) => (
                <div key={entry.nama} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: WARNA_WAKTU[entry.nama] }}></span>
                  {entry.nama} ({entry.jumlah})
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.004, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800 md:col-span-2"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={BarChart3} gradasi="from-sky-400 to-sky-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Jumlah Unit per Kategori SPIP</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {dataPerJenisSpip.reduce((a, b) => a + b.jumlah, 0)} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataPerJenisSpip} barCategoryGap="30%" margin={{ top: 24 }}>
                <defs>
                  <linearGradient id="gradBiru" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82C4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3B82C4" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="jumlah" fill="url(#gradBiru)" radius={[10, 10, 0, 0]} maxBarSize={60}>
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