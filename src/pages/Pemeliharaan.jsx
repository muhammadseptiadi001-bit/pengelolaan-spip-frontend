import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench, CheckCircle2, AlertTriangle, XCircle, PackagePlus, Trash2, CalendarDays,
  ClipboardList, UserCheck, Boxes, Loader2, Filter, RotateCcw
} from 'lucide-react'
import { API_URL, PILIHAN_JENIS_SPIP, hitungStatusWaktu, formatTanggal } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'

const PEMELIHARAAN_URL = API_URL.replace('/unit', '/pemeliharaan')
const JENIS_PEMELIHARAAN = ["Servis Rutin", "Perbaikan", "Pergantian Komponen", "Lainnya"]
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

const FILTER_AWAL = {
  perusahaan: "",
  jenisSpip: "Semua",
  unitId: "Semua",
  jenisPemeliharaan: "Semua",
  bulan: "Semua",
  status: "Semua",
}

function tanggalHariIni() {
  const sekarang = new Date()
  return `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}-${String(sekarang.getDate()).padStart(2, "0")}`
}

function kunciBulan(tanggalString) {
  const d = new Date(tanggalString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function labelBulan(kunci) {
  const [tahun, bulan] = kunci.split("-")
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`
}

function AngkaCountUp({ nilai, durasi = 800 }) {
  const [tampil, setTampil] = useState(0)
  useEffect(() => {
    let mulai = null
    let frameId
    function animasikan(waktuSekarang) {
      if (mulai === null) mulai = waktuSekarang
      const progres = Math.min((waktuSekarang - mulai) / durasi, 1)
      setTampil(Math.floor(progres * nilai))
      if (progres < 1) frameId = requestAnimationFrame(animasikan)
      else setTampil(nilai)
    }
    frameId = requestAnimationFrame(animasikan)
    return () => cancelAnimationFrame(frameId)
  }, [nilai, durasi])
  return <>{tampil}</>
}

function KartuRingkasan({ label, nilai, sub, warna, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${warna}`}></div>
      <div className="pl-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800 dark:text-white mt-1"><AngkaCountUp nilai={nilai} /></p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && <Icon size={20} className="text-gray-300 dark:text-gray-600" />}
      </div>
    </div>
  )
}

function LabelIkon({ icon: Icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950">
        <Icon size={13} className="text-blue-600 dark:text-blue-400" />
      </span>
      {children}
    </label>
  )
}

function badgeStatus(label) {
  if (label === "Aman") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (label === "Mendekati Jatuh Tempo") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
  if (label === "Sudah Lewat") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
}

function Pemeliharaan() {
  const user = ambilUser()
  const [daftarUnit, setDaftarUnit] = useState([])
  const [daftarPemeliharaan, setDaftarPemeliharaan] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filter, setFilter] = useState(FILTER_AWAL)

  const [unitTerpilih, setUnitTerpilih] = useState("")
  const [jenisPemeliharaan, setJenisPemeliharaan] = useState(JENIS_PEMELIHARAAN[0])
  const [tanggalPelaksanaan, setTanggalPelaksanaan] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [petugas, setPetugas] = useState("")
  const [jadwalBerikutnya, setJadwalBerikutnya] = useState("")
  const [sedangSimpan, setSedangSimpan] = useState(false)

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const [resUnit, resPemeliharaan] = await Promise.all([
        apiFetch(`${API_URL}?semua=true`),
        apiFetch(PEMELIHARAAN_URL),
      ])
      const hasilUnit = await resUnit.json()
      const daftar = Array.isArray(hasilUnit) ? hasilUnit : (hasilUnit?.data || [])
      setDaftarUnit(daftar)

      const hasilPemeliharaan = await resPemeliharaan.json()
      setDaftarPemeliharaan(Array.isArray(hasilPemeliharaan) ? hasilPemeliharaan : [])
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
  }

  function resetFilter() {
    setFilter(FILTER_AWAL)
  }

  // Lookup cepat unitId -> data unit (namaPerusahaan, jenisSpip), karena tabel pemeliharaan
  // sendiri tidak menyimpan dua kolom itu — datanya diambil dari tabel unit lewat unitId.
  const petaUnitById = useMemo(() => {
    const peta = {}
    daftarUnit.forEach((u) => { peta[u.id] = u })
    return peta
  }, [daftarUnit])

  // Jadwal berikutnya PALING BARU per unit (satu unit bisa punya banyak riwayat pemeliharaan,
  // yang dipakai untuk status Aman/Mendekati/Lewat adalah jadwal dari catatan pemeliharaan terakhir).
  const jadwalTerkiniPerUnit = useMemo(() => {
    const peta = {}
    daftarPemeliharaan.forEach((p) => {
      const ada = peta[p.unitId]
      if (!ada || new Date(p.tanggalPelaksanaan) > new Date(ada.tanggalPelaksanaan)) {
        peta[p.unitId] = p
      }
    })
    return peta
  }, [daftarPemeliharaan])

  const ringkasan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0, belumDijadwalkan = 0
    Object.values(jadwalTerkiniPerUnit).forEach((p) => {
      if (!p.jadwalBerikutnya) { belumDijadwalkan++; return }
      const label = hitungStatusWaktu(new Date(p.jadwalBerikutnya)).label
      if (label === "Aman") aman++
      else if (label === "Mendekati Jatuh Tempo") mendekati++
      else lewat++
    })
    return { aman, mendekati, lewat, belumDijadwalkan, totalTercatat: Object.keys(jadwalTerkiniPerUnit).length }
  }, [jadwalTerkiniPerUnit])

  const daftarBulanTersedia = useMemo(() => {
    const set = new Set(daftarPemeliharaan.map((p) => kunciBulan(p.tanggalPelaksanaan)))
    return Array.from(set).sort().reverse()
  }, [daftarPemeliharaan])

  const riwayatTerfilter = useMemo(() => {
    return daftarPemeliharaan.filter((p) => {
      if (filter.unitId !== "Semua" && String(p.unitId) !== String(filter.unitId)) return false

      const unit = petaUnitById[p.unitId]

      if (filter.perusahaan && !(unit?.namaPerusahaan || "").toLowerCase().includes(filter.perusahaan.toLowerCase())) return false
      if (filter.jenisSpip !== "Semua" && unit?.jenisSpip !== filter.jenisSpip) return false
      if (filter.jenisPemeliharaan !== "Semua" && p.jenisPemeliharaan !== filter.jenisPemeliharaan) return false
      if (filter.bulan !== "Semua" && kunciBulan(p.tanggalPelaksanaan) !== filter.bulan) return false

      if (filter.status !== "Semua") {
        const statusLabel = p.jadwalBerikutnya ? hitungStatusWaktu(new Date(p.jadwalBerikutnya)).label : "Belum Dijadwalkan"
        if (statusLabel !== filter.status) return false
      }

      return true
    })
  }, [daftarPemeliharaan, filter, petaUnitById])

  async function tambahPemeliharaan() {
    if (!unitTerpilih || !jenisPemeliharaan || !tanggalPelaksanaan) {
      tampilkanToast("Unit, Jenis Pemeliharaan, dan Tanggal Pelaksanaan wajib diisi!", "gagal")
      return
    }
    if (tanggalPelaksanaan > tanggalHariIni()) {
      tampilkanToast("Tanggal Pelaksanaan tidak boleh di masa depan.", "gagal")
      return
    }

    const unit = daftarUnit.find((u) => String(u.id) === String(unitTerpilih))
    if (!unit) {
      tampilkanToast("Unit tidak ditemukan.", "gagal")
      return
    }

    setSedangSimpan(true)
    try {
      const res = await apiFetch(PEMELIHARAAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          namaUnit: unit.namaUnit,
          nomorUnit: unit.nomorUnit,
          jenisPemeliharaan,
          tanggalPelaksanaan,
          deskripsi,
          petugas,
          jadwalBerikutnya: jadwalBerikutnya || null,
        }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")

      tampilkanToast("Pemeliharaan berhasil dicatat!", "sukses")
      setUnitTerpilih("")
      setJenisPemeliharaan(JENIS_PEMELIHARAAN[0])
      setTanggalPelaksanaan("")
      setDeskripsi("")
      setPetugas("")
      setJadwalBerikutnya("")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal mencatat pemeliharaan. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangSimpan(false)
    }
  }

  async function hapusPemeliharaan(id) {
    try {
      const res = await apiFetch(`${PEMELIHARAAN_URL}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Gagal menghapus")
      tampilkanToast("Catatan pemeliharaan dihapus.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menghapus catatan.", "gagal")
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
  const filterInputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400/50"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pemeliharaan</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Aspek 1 — Sistem dan pelaksanaan pemeliharaan/perawatan sarana, prasarana, instalasi, dan peralatan pertambangan</p>
      </div>

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KartuRingkasan label="Unit Tercatat" nilai={ringkasan.totalTercatat} sub="punya riwayat pemeliharaan" warna="bg-blue-500" icon={Boxes} />
          <KartuRingkasan label="Aman" nilai={ringkasan.aman} warna="bg-green-500" icon={CheckCircle2} />
          <KartuRingkasan label="Mendekati Jadwal" nilai={ringkasan.mendekati} warna="bg-yellow-500" icon={AlertTriangle} />
          <KartuRingkasan label="Sudah Lewat" nilai={ringkasan.lewat} warna="bg-red-500" icon={XCircle} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/20">
            <PackagePlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catat Pemeliharaan</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Jadwal berikutnya diinput manual sesuai kondisi unit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={Wrench}>Unit</LabelIkon>
            <select value={unitTerpilih} onChange={(e) => setUnitTerpilih(e.target.value)} className={inputClass}>
              <option value="">Pilih unit...</option>
              {daftarUnit.map((u) => (
                <option key={u.id} value={u.id}>{u.namaUnit} — {u.nomorUnit}</option>
              ))}
            </select>
          </div>

          <div>
            <LabelIkon icon={ClipboardList}>Jenis Pemeliharaan</LabelIkon>
            <select value={jenisPemeliharaan} onChange={(e) => setJenisPemeliharaan(e.target.value)} className={inputClass}>
              {JENIS_PEMELIHARAAN.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Pelaksanaan</LabelIkon>
            <input type="date" value={tanggalPelaksanaan} max={tanggalHariIni()} onChange={(e) => setTanggalPelaksanaan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Jadwal Pemeliharaan Berikutnya (opsional)</LabelIkon>
            <input type="date" value={jadwalBerikutnya} onChange={(e) => setJadwalBerikutnya(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={UserCheck}>Petugas</LabelIkon>
            <input type="text" placeholder="Nama petugas yang mengerjakan" value={petugas} onChange={(e) => setPetugas(e.target.value)} className={inputClass} />
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ClipboardList}>Deskripsi Pekerjaan</LabelIkon>
            <textarea placeholder="Contoh: Ganti oli hidrolik, cek kondisi baut pengaman" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className={inputClass} rows="3" />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahPemeliharaan}
          disabled={sedangSimpan}
          className="mt-6 w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {sedangSimpan ? <Loader2 size={18} className="animate-spin" /> : <PackagePlus size={18} />}
          {sedangSimpan ? "Menyimpan..." : "Catat Pemeliharaan"}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Riwayat Pemeliharaan</h2>
          <button
            onClick={resetFilter}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
          >
            <RotateCcw size={12} /> Reset Filter
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-3 text-gray-400 dark:text-gray-500">
          <Filter size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Perusahaan</label>
            <input
              type="text"
              placeholder="Cari perusahaan..."
              value={filter.perusahaan}
              onChange={(e) => updateFilter("perusahaan", e.target.value)}
              className={filterInputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Kategori SPIP</label>
            <select value={filter.jenisSpip} onChange={(e) => updateFilter("jenisSpip", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua</option>
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit</label>
            <select value={filter.unitId} onChange={(e) => updateFilter("unitId", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua Unit</option>
              {daftarUnit.map((u) => (
                <option key={u.id} value={u.id}>{u.namaUnit} — {u.nomorUnit}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Jenis Pemeliharaan</label>
            <select value={filter.jenisPemeliharaan} onChange={(e) => updateFilter("jenisPemeliharaan", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua</option>
              {JENIS_PEMELIHARAAN.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bulan Pelaksanaan</label>
            <select value={filter.bulan} onChange={(e) => updateFilter("bulan", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua Waktu</option>
              {daftarBulanTersedia.map((kunci) => (
                <option key={kunci} value={kunci}>{labelBulan(kunci)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status Jadwal</label>
            <select value={filter.status} onChange={(e) => updateFilter("status", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua</option>
              <option value="Aman">Aman</option>
              <option value="Mendekati Jatuh Tempo">Mendekati Jatuh Tempo</option>
              <option value="Sudah Lewat">Sudah Lewat</option>
              <option value="Belum Dijadwalkan">Belum Dijadwalkan</option>
            </select>
          </div>
        </div>

        {riwayatTerfilter.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {daftarPemeliharaan.length === 0 ? "Belum ada catatan pemeliharaan." : "Tidak ada data yang cocok dengan filter."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unit</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jenis</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Petugas</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jadwal Berikutnya</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayatTerfilter.map((p) => {
                  const statusLabel = p.jadwalBerikutnya ? hitungStatusWaktu(new Date(p.jadwalBerikutnya)).label : null
                  const unit = petaUnitById[p.unitId]
                  return (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200">
                      <td className="py-2.5 px-3">{unit?.namaPerusahaan || "-"}</td>
                      <td className="py-2.5 px-3">{p.namaUnit} <span className="text-gray-400">({p.nomorUnit})</span></td>
                      <td className="py-2.5 px-3">{p.jenisPemeliharaan}</td>
                      <td className="py-2.5 px-3">{formatTanggal(new Date(p.tanggalPelaksanaan))}</td>
                      <td className="py-2.5 px-3">{p.petugas || "-"}</td>
                      <td className="py-2.5 px-3">{p.jadwalBerikutnya ? formatTanggal(new Date(p.jadwalBerikutnya)) : "-"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeStatus(statusLabel)}`}>
                          {statusLabel || "Belum Dijadwalkan"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => hapusPemeliharaan(p.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Pemeliharaan