import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import {
  ShieldCheck, AlertTriangle, XCircle, TrendingUp, ClipboardList,
  CheckCircle2, Circle, Info
} from 'lucide-react'
import { API_URL, hitungJatuhTempo, hitungStatusWaktu, formatTanggal, cariKelompokUntukAlat } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function kunciBulan(tanggalString) {
  const d = new Date(tanggalString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function labelBulan(kunci) {
  const [tahun, bulan] = kunci.split("-")
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`
}

// Checklist manual berdasarkan kriteria penilaian Kepmen ESDM soal Kelayakan Sarana/Prasarana/
// Instalasi/Peralatan dan Pengelolaan Keselamatan Operasi Pertambangan. Item ini belum bisa
// dihitung otomatis dari data aplikasi (butuh field tambahan seperti "Tenaga Teknis Penguji").
const CHECKLIST_MANUAL = [
  "Prosedur pengujian kelayakan sarana, prasarana, instalasi, dan peralatan sudah disusun dan ditetapkan",
  "Pengujian kelayakan dilakukan oleh Tenaga Teknis Pertambangan yang Berkompeten",
  "Prosedur pemantauan, pengukuran kinerja, evaluasi, dan tindak lanjut pengelolaan Keselamatan Operasi Pertambangan sudah ada",
  "Pemantauan dan evaluasi pengelolaan Keselamatan Operasi Pertambangan dilaksanakan sesuai prosedur",
  "Pemantauan dilakukan oleh Tenaga Teknis Pertambangan yang Berkompeten di bidang Keselamatan Operasi",
  "Rencana tindak lanjut dan perbaikan ditetapkan berdasarkan hasil evaluasi",
]

function KartuRingkasan({ label, nilai, sub, warna, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${warna}`}></div>
      <div className="pl-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800 dark:text-white mt-1">{nilai}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && <Icon size={20} className="text-gray-300 dark:text-gray-600" />}
      </div>
    </div>
  )
}

function Evaluasi() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [bulanTerpilih, setBulanTerpilih] = useState("Semua")

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const response = await apiFetch(`${API_URL}?semua=true`)
      const hasil = await response.json()
      let daftar = []
      if (Array.isArray(hasil)) daftar = hasil
      else if (Array.isArray(hasil?.data)) daftar = hasil.data
      setDaftarUnit(daftar)
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  // Daftar bulan (berdasarkan Tanggal Uji Terakhir) yang tersedia di data, terbaru dulu
  const daftarBulanTersedia = useMemo(() => {
    const set = new Set(daftarUnit.map((u) => kunciBulan(u.tanggalUjiTerakhir)))
    return Array.from(set).sort().reverse()
  }, [daftarUnit])

  const dataUnitTerfilter = useMemo(() => {
    if (bulanTerpilih === "Semua") return daftarUnit
    return daftarUnit.filter((u) => kunciBulan(u.tanggalUjiTerakhir) === bulanTerpilih)
  }, [daftarUnit, bulanTerpilih])

  // === 1. Tingkat kepatuhan uji kelayakan ===
  const kepatuhan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0
    dataUnitTerfilter.forEach((u) => {
      const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
      const label = hitungStatusWaktu(jatuhTempo).label
      if (label === "Aman") aman++
      else if (label === "Mendekati Jatuh Tempo") mendekati++
      else lewat++
    })
    const total = dataUnitTerfilter.length
    const persentase = total === 0 ? 0 : Math.round(((total - lewat) / total) * 100)
    return { aman, mendekati, lewat, total, persentase }
  }, [dataUnitTerfilter])

  // === 2. Tren status kelayakan per bulan uji terakhir (6 bulan terbaru yang ada datanya) ===
  const trenStatusKelayakan = useMemo(() => {
    const perBulan = {}
    daftarUnit.forEach((u) => {
      const kunci = kunciBulan(u.tanggalUjiTerakhir)
      if (!perBulan[kunci]) perBulan[kunci] = { Layak: 0, "Tidak Layak": 0, "Layak Dengan Catatan": 0 }
      if (perBulan[kunci][u.statusKelayakan] !== undefined) perBulan[kunci][u.statusKelayakan] += 1
    })
    return Object.entries(perBulan)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([kunci, jumlah]) => ({ bulan: labelBulan(kunci), ...jumlah }))
  }, [daftarUnit])

  // === 3. Backlog unit sudah lewat jatuh tempo, diurutkan paling lama menunggak ===
  const backlogLewatTempo = useMemo(() => {
    return daftarUnit
      .map((u) => {
        const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
        return { ...u, jatuhTempo, statusWaktu: hitungStatusWaktu(jatuhTempo).label }
      })
      .filter((u) => u.statusWaktu === "Sudah Lewat")
      .sort((a, b) => a.jatuhTempo - b.jatuhTempo)
  }, [daftarUnit])

  // === 4. Distribusi temuan per kelompok alat/instalasi/bangunan ===
  const distribusiTemuan = useMemo(() => {
    const perKelompok = {}
    daftarUnit
      .filter((u) => u.temuan && u.temuan.trim() !== "")
      .forEach((u) => {
        const kelompok = cariKelompokUntukAlat(u.jenisSpip, u.jenisAlat) || "Lainnya"
        perKelompok[kelompok] = (perKelompok[kelompok] || 0) + 1
      })
    return Object.entries(perKelompok)
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
  }, [daftarUnit])

  // === Checklist otomatis (3 item bisa dihitung dari data yang ada) ===
  const checklistOtomatis = useMemo(() => {
    const totalData = daftarUnit.length
    const jumlahLewat = daftarUnit.filter((u) => {
      const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
      return hitungStatusWaktu(jatuhTempo).label === "Sudah Lewat"
    }).length
    const unitBermasalahBelumTindakLanjut = daftarUnit.filter(
      (u) => (u.statusKelayakan === "Tidak Layak" || u.statusKelayakan === "Layak Dengan Catatan") && !u.tindakLanjut
    ).length

    return [
      {
        teks: "Daftar sarana, prasarana, instalasi, dan peralatan pertambangan sudah dibuat",
        terpenuhi: totalData > 0,
        keterangan: `${totalData} unit terdaftar di aplikasi`,
      },
      {
        teks: "Pelaksanaan pengujian kelayakan sesuai jadwal yang ditetapkan (tidak ada yang lewat jatuh tempo)",
        terpenuhi: jumlahLewat === 0,
        keterangan: jumlahLewat === 0 ? "Semua unit masih dalam jadwal" : `${jumlahLewat} unit sudah lewat jatuh tempo`,
      },
      {
        teks: "Seluruh tindak lanjut dan perbaikan atas temuan sudah dilaksanakan",
        terpenuhi: unitBermasalahBelumTindakLanjut === 0,
        keterangan: unitBermasalahBelumTindakLanjut === 0
          ? "Tidak ada unit bermasalah yang belum ditindaklanjuti"
          : `${unitBermasalahBelumTindakLanjut} unit bermasalah belum ada catatan tindak lanjut`,
      },
    ]
  }, [daftarUnit])

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Evaluasi</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Evaluasi kepatuhan dan kinerja program SPIP secara berkala</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bulan Uji Terakhir</label>
          <select
            value={bulanTerpilih}
            onChange={(e) => setBulanTerpilih(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2"
          >
            <option value="Semua">Semua Waktu</option>
            {daftarBulanTersedia.map((kunci) => (
              <option key={kunci} value={kunci}>{labelBulan(kunci)}</option>
            ))}
          </select>
        </div>
      </div>

      {sedangMuat ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse h-24"></div>
          ))}
        </div>
      ) : (
        <>
          {/* === Ringkasan Kepatuhan === */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KartuRingkasan
              label="Tingkat Kepatuhan"
              nilai={`${kepatuhan.persentase}%`}
              sub={`dari ${kepatuhan.total} unit ${bulanTerpilih === "Semua" ? "" : "pada bulan ini"}`}
              warna="bg-blue-500"
              icon={ShieldCheck}
            />
            <KartuRingkasan
              label="Aman"
              nilai={kepatuhan.aman}
              warna="bg-green-500"
              icon={CheckCircle2}
            />
            <KartuRingkasan
              label="Mendekati Jatuh Tempo"
              nilai={kepatuhan.mendekati}
              warna="bg-yellow-500"
              icon={AlertTriangle}
            />
            <KartuRingkasan
              label="Sudah Lewat"
              nilai={kepatuhan.lewat}
              warna="bg-red-500"
              icon={XCircle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* === Tren Status Kelayakan === */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tren Status Kelayakan</h2>
              </div>
              {trenStatusKelayakan.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data untuk ditampilkan.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trenStatusKelayakan} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Layak" stackId="a" fill={WARNA_KELAYAKAN["Layak"]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Tidak Layak" stackId="a" fill={WARNA_KELAYAKAN["Tidak Layak"]} />
                    <Bar dataKey="Layak Dengan Catatan" stackId="a" fill={WARNA_KELAYAKAN["Layak Dengan Catatan"]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* === Distribusi Temuan per Kelompok === */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={18} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Distribusi Temuan per Kelompok</h2>
              </div>
              {distribusiTemuan.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada unit dengan catatan temuan.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={distribusiTemuan} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nama" width={180} tick={{ fontSize: 10.5 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="jumlah" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* === Backlog Unit Lewat Jatuh Tempo === */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Backlog Unit Sudah Lewat Jatuh Tempo</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold">
                {backlogLewatTempo.length} unit
              </span>
            </div>

            {backlogLewatTempo.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada unit yang menunggak. Semua sudah sesuai jadwal.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama Unit</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nomor Unit</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jatuh Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backlogLewatTempo.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200">
                        <td className="py-2.5 px-3">{u.namaPerusahaan}</td>
                        <td className="py-2.5 px-3">{u.namaUnit}</td>
                        <td className="py-2.5 px-3">{u.nomorUnit}</td>
                        <td className="py-2.5 px-3 text-red-600 dark:text-red-400 font-medium">{formatTanggal(u.jatuhTempo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* === Checklist Kepatuhan Regulasi === */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Checklist Kepatuhan Regulasi</h2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Berdasarkan kriteria penilaian Kepmen ESDM soal kelayakan sarana/prasarana/instalasi/peralatan dan pengelolaan Keselamatan Operasi Pertambangan.
            </p>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Dihitung otomatis dari data</p>
            <div className="flex flex-col gap-2 mb-5">
              {checklistOtomatis.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  {item.terpenuhi ? (
                    <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{item.teks}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.keterangan}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Perlu verifikasi manual</p>
            <div className="flex flex-col gap-2">
              {CHECKLIST_MANUAL.map((teks, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Circle size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">{teks}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <p>Item "Perlu verifikasi manual" belum bisa dihitung otomatis karena aplikasi belum mencatat data Tenaga Teknis Penguji/prosedur tertulis. Bisa ditambahkan sebagai field baru kalau diperlukan.</p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

export default Evaluasi