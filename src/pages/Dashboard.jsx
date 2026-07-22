import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { API_URL, PILIHAN_JENIS_SPIP, hitungJatuhTempo, hitungStatusWaktu } from '../utils/spipHelpers'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const WARNA_WAKTU = { "Aman": "#22c55e", "Mendekati Jatuh Tempo": "#eab308", "Sudah Lewat": "#ef4444" }

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
            className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-gray-900 px-4 py-2 rounded font-semibold h-fit"
          >
            {sedangKirim ? "Mengirim..." : "📧 Tes Kirim Notifikasi Email"}
          </button>
        </div>
      </div>

      {statusKirim && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg mb-6 text-sm">
          {statusKirim}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Unit</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{ringkasan.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Aman</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{ringkasan.aman}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Mendekati Jatuh Tempo</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{ringkasan.mendekati}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sudah Lewat</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{ringkasan.lewat}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status Kelayakan</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataStatusKelayakan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                {dataStatusKelayakan.map((entry, index) => (
                  <Cell key={index} fill={WARNA_KELAYAKAN[entry.nama]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status Waktu Uji</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataStatusWaktu}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                {dataStatusWaktu.map((entry, index) => (
                  <Cell key={index} fill={WARNA_WAKTU[entry.nama]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Jumlah Unit per Kategori SPIP</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataPerJenisSpip}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
              <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard