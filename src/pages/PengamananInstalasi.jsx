import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert, CheckCircle2, AlertTriangle, XCircle, PackagePlus, Trash2, CalendarDays,
  ClipboardList, UserCheck, BadgeCheck, Boxes, Loader2, Filter, RotateCcw, Circle, Info
} from 'lucide-react'
import { API_URL, hitungStatusWaktu, formatTanggal } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

const PENGATURAN_URL = API_URL.replace('/unit', '/pengaturan-pengamanan-instalasi')
const PEMERIKSAAN_URL = API_URL.replace('/unit', '/pemeriksaan-instalasi')

const PILIHAN_HASIL = ["Aman", "Perlu Perbaikan", "Tidak Aman"]
const PILIHAN_STATUS_KOMPETENSI = ["Bersertifikat / Kompeten", "Belum Bersertifikat"]
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

const FILTER_AWAL = {
  perusahaan: "",
  unitId: "Semua",
  hasil: "Semua",
  bulan: "Semua",
  status: "Semua",
}

// 6 item pengaturan tingkat perusahaan (poin 2-7 dari kriteria Kepmen 4.4.2), masing-masing
// dipetakan ke nama kolom di backend.
const DAFTAR_ITEM_PENGATURAN = [
  { field: "identifikasiKebutuhanPengaman", teks: "Mengidentifikasi kebutuhan pengaman atas instalasi" },
  { field: "prosedurPengamananInstalasi", teks: "Menyusun dan menetapkan prosedur pengamanan instalasi" },
  { field: "desainPengamananInstalasi", teks: "Menyusun dan menetapkan desain pengamanan instalasi" },
  { field: "prosedurPemasanganInstalasi", teks: "Menyusun dan menetapkan prosedur proses pemasangan instalasi" },
  { field: "prosedurPemeliharaanPengamanan", teks: "Menyusun dan menetapkan prosedur pemeliharaan pengamanan instalasi" },
  { field: "programJadwalPemeriksaan", teks: "Menetapkan program dan jadwal pemeriksaan pengamanan instalasi" },
]

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

function badgeStatusWaktu(label) {
  if (label === "Aman") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (label === "Mendekati Jatuh Tempo") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
  if (label === "Sudah Lewat") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
}

function badgeHasil(hasil) {
  if (hasil === "Aman") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (hasil === "Tidak Aman") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
}

function ItemPengaturan({ teks, terpenuhi, sedangSimpan, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={sedangSimpan}
      className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left disabled:opacity-60 disabled:cursor-wait"
    >
      {sedangSimpan ? (
        <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
      ) : terpenuhi ? (
        <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-200">{teks}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {terpenuhi ? "Sudah ditetapkan — klik untuk batalkan" : "Belum ditetapkan — klik untuk tandai sudah ditetapkan"}
        </p>
      </div>
    </button>
  )
}

function PengamananInstalasi() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [daftarPemeriksaan, setDaftarPemeriksaan] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filter, setFilter] = useState(FILTER_AWAL)

  const [pengaturan, setPengaturan] = useState({
    identifikasiKebutuhanPengaman: false,
    prosedurPengamananInstalasi: false,
    desainPengamananInstalasi: false,
    prosedurPemasanganInstalasi: false,
    prosedurPemeliharaanPengamanan: false,
    programJadwalPemeriksaan: false,
  })
  const [sedangSimpanPengaturan, setSedangSimpanPengaturan] = useState(null)

  const [unitTerpilih, setUnitTerpilih] = useState("")
  const [tanggalPemeriksaan, setTanggalPemeriksaan] = useState("")
  const [hasil, setHasil] = useState(PILIHAN_HASIL[0])
  const [temuan, setTemuan] = useState("")
  const [petugas, setPetugas] = useState("")
  const [statusKompetensi, setStatusKompetensi] = useState(PILIHAN_STATUS_KOMPETENSI[0])
  const [jadwalBerikutnya, setJadwalBerikutnya] = useState("")
  const [sedangSimpan, setSedangSimpan] = useState(false)

  useEffect(() => {
    ambilData()
    ambilPengaturan()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const [resUnit, resPemeriksaan] = await Promise.all([
        apiFetch(`${API_URL}?semua=true`),
        apiFetch(PEMERIKSAAN_URL),
      ])
      const hasilUnit = await resUnit.json()
      const daftar = Array.isArray(hasilUnit) ? hasilUnit : (hasilUnit?.data || [])
      // Halaman ini KHUSUS Aspek 2 (Pengamanan Instalasi) — hanya unit berkategori
      // "Instalasi Pertambangan" yang relevan di sini, bukan seluruh unit SPIP.
      setDaftarUnit(daftar.filter((u) => u.jenisSpip === "Instalasi Pertambangan"))

      const hasilPemeriksaan = await resPemeriksaan.json()
      setDaftarPemeriksaan(Array.isArray(hasilPemeriksaan) ? hasilPemeriksaan : [])
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  async function ambilPengaturan() {
    try {
      const res = await apiFetch(PENGATURAN_URL)
      const data = await res.json()
      setPengaturan({
        identifikasiKebutuhanPengaman: !!data.identifikasiKebutuhanPengaman,
        prosedurPengamananInstalasi: !!data.prosedurPengamananInstalasi,
        desainPengamananInstalasi: !!data.desainPengamananInstalasi,
        prosedurPemasanganInstalasi: !!data.prosedurPemasanganInstalasi,
        prosedurPemeliharaanPengamanan: !!data.prosedurPemeliharaanPengamanan,
        programJadwalPemeriksaan: !!data.programJadwalPemeriksaan,
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function ubahPengaturan(field) {
    const payload = { ...pengaturan, [field]: !pengaturan[field] }
    setSedangSimpanPengaturan(field)
    try {
      const res = await apiFetch(PENGATURAN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      const data = await res.json()
      setPengaturan({
        identifikasiKebutuhanPengaman: !!data.identifikasiKebutuhanPengaman,
        prosedurPengamananInstalasi: !!data.prosedurPengamananInstalasi,
        desainPengamananInstalasi: !!data.desainPengamananInstalasi,
        prosedurPemasanganInstalasi: !!data.prosedurPemasanganInstalasi,
        prosedurPemeliharaanPengamanan: !!data.prosedurPemeliharaanPengamanan,
        programJadwalPemeriksaan: !!data.programJadwalPemeriksaan,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSedangSimpanPengaturan(null)
    }
  }

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
  }

  function resetFilter() {
    setFilter(FILTER_AWAL)
  }

  const petaUnitById = useMemo(() => {
    const peta = {}
    daftarUnit.forEach((u) => { peta[u.id] = u })
    return peta
  }, [daftarUnit])

  // Pemeriksaan terkini per unit (satu instalasi bisa punya banyak riwayat pemeriksaan,
  // yang dipakai untuk status Aman/Mendekati/Lewat adalah jadwal dari catatan terakhir).
  const pemeriksaanTerkiniPerUnit = useMemo(() => {
    const peta = {}
    daftarPemeriksaan.forEach((p) => {
      const ada = peta[p.unitId]
      if (!ada || new Date(p.tanggalPemeriksaan) > new Date(ada.tanggalPemeriksaan)) {
        peta[p.unitId] = p
      }
    })
    return peta
  }, [daftarPemeriksaan])

  const ringkasan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0
    Object.values(pemeriksaanTerkiniPerUnit).forEach((p) => {
      if (!p.jadwalBerikutnya) return
      const label = hitungStatusWaktu(new Date(p.jadwalBerikutnya)).label
      if (label === "Aman") aman++
      else if (label === "Mendekati Jatuh Tempo") mendekati++
      else lewat++
    })
    return { aman, mendekati, lewat, instalasiTercatat: Object.keys(pemeriksaanTerkiniPerUnit).length }
  }, [pemeriksaanTerkiniPerUnit])

  const daftarBulanTersedia = useMemo(() => {
    const set = new Set(daftarPemeriksaan.map((p) => kunciBulan(p.tanggalPemeriksaan)))
    return Array.from(set).sort().reverse()
  }, [daftarPemeriksaan])

  const riwayatTerfilter = useMemo(() => {
    return daftarPemeriksaan.filter((p) => {
      if (filter.unitId !== "Semua" && String(p.unitId) !== String(filter.unitId)) return false

      const unit = petaUnitById[p.unitId]
      if (filter.perusahaan && !(unit?.namaPerusahaan || "").toLowerCase().includes(filter.perusahaan.toLowerCase())) return false
      if (filter.hasil !== "Semua" && p.hasil !== filter.hasil) return false
      if (filter.bulan !== "Semua" && kunciBulan(p.tanggalPemeriksaan) !== filter.bulan) return false

      if (filter.status !== "Semua") {
        const statusLabel = p.jadwalBerikutnya ? hitungStatusWaktu(new Date(p.jadwalBerikutnya)).label : "Belum Dijadwalkan"
        if (statusLabel !== filter.status) return false
      }

      return true
    })
  }, [daftarPemeriksaan, filter, petaUnitById])

  async function tambahPemeriksaan() {
    if (!unitTerpilih || !tanggalPemeriksaan || !hasil) {
      alert("Unit, Tanggal Pemeriksaan, dan Hasil Pemeriksaan wajib diisi!")
      return
    }
    if (tanggalPemeriksaan > tanggalHariIni()) {
      alert("Tanggal Pemeriksaan tidak boleh di masa depan.")
      return
    }

    const unit = daftarUnit.find((u) => String(u.id) === String(unitTerpilih))
    if (!unit) {
      alert("Unit tidak ditemukan.")
      return
    }

    setSedangSimpan(true)
    try {
      const res = await apiFetch(PEMERIKSAAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          namaUnit: unit.namaUnit,
          nomorUnit: unit.nomorUnit,
          tanggalPemeriksaan,
          hasil,
          temuan,
          petugas,
          statusKompetensi,
          jadwalBerikutnya: jadwalBerikutnya || null,
        }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")

      setUnitTerpilih("")
      setTanggalPemeriksaan("")
      setHasil(PILIHAN_HASIL[0])
      setTemuan("")
      setPetugas("")
      setStatusKompetensi(PILIHAN_STATUS_KOMPETENSI[0])
      setJadwalBerikutnya("")
      ambilData()
    } catch (err) {
      alert("Gagal mencatat pemeriksaan. Pastikan server backend sedang berjalan.")
    } finally {
      setSedangSimpan(false)
    }
  }

  async function hapusPemeriksaan(id) {
    try {
      const res = await apiFetch(`${PEMERIKSAAN_URL}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Gagal menghapus")
      ambilData()
    } catch (err) {
      alert("Gagal menghapus catatan.")
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"
  const filterInputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400/50"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pengamanan Instalasi</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Aspek 2 — Pengamanan instalasi sesuai Kepmen 4.4.2</p>
      </div>

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KartuRingkasan label="Instalasi Terdaftar" nilai={daftarUnit.length} sub="dari Input SPIP" warna="bg-blue-500" icon={Boxes} />
          <KartuRingkasan label="Aman" nilai={ringkasan.aman} warna="bg-green-500" icon={CheckCircle2} />
          <KartuRingkasan label="Mendekati Jadwal" nilai={ringkasan.mendekati} warna="bg-yellow-500" icon={AlertTriangle} />
          <KartuRingkasan label="Sudah Lewat" nilai={ringkasan.lewat} warna="bg-red-500" icon={XCircle} />
        </div>
      )}

      {/* Poin 2-7 kriteria Kepmen 4.4.2 — pengaturan tingkat perusahaan */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pengaturan Pengamanan Instalasi</h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Poin 1 (daftar instalasi) otomatis terpenuhi dari data Input SPIP — {daftarUnit.length} instalasi terdaftar. Poin 2-7 di bawah berlaku untuk seluruh perusahaan (bukan per unit).
        </p>

        <div className="flex flex-col gap-2">
          {DAFTAR_ITEM_PENGATURAN.map((item) => (
            <ItemPengaturan
              key={item.field}
              teks={item.teks}
              terpenuhi={pengaturan[item.field]}
              sedangSimpan={sedangSimpanPengaturan === item.field}
              onToggle={() => ubahPengaturan(item.field)}
            />
          ))}
        </div>

        <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <p>Klik tiap item untuk menandai sudah/belum ditetapkan.</p>
        </div>
      </motion.div>

      {/* Poin 8 kriteria Kepmen 4.4.2 — pemeriksaan berkala per instalasi */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/20">
            <PackagePlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Catat Pemeriksaan Pengamanan Instalasi</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Pemeriksaan berkala oleh Tenaga Teknis Pertambangan yang Berkompeten</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={ShieldAlert}>Instalasi</LabelIkon>
            <select value={unitTerpilih} onChange={(e) => setUnitTerpilih(e.target.value)} className={inputClass}>
              <option value="">Pilih instalasi...</option>
              {daftarUnit.map((u) => (
                <option key={u.id} value={u.id}>{u.namaUnit} — {u.nomorUnit}</option>
              ))}
            </select>
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Pemeriksaan</LabelIkon>
            <input type="date" value={tanggalPemeriksaan} max={tanggalHariIni()} onChange={(e) => setTanggalPemeriksaan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={CheckCircle2}>Hasil Pemeriksaan</LabelIkon>
            <select value={hasil} onChange={(e) => setHasil(e.target.value)} className={inputClass}>
              {PILIHAN_HASIL.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Jadwal Pemeriksaan Berikutnya (opsional)</LabelIkon>
            <input type="date" value={jadwalBerikutnya} onChange={(e) => setJadwalBerikutnya(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={UserCheck}>Nama Tenaga Teknis Pemeriksa</LabelIkon>
            <input type="text" placeholder="Nama petugas yang memeriksa" value={petugas} onChange={(e) => setPetugas(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={BadgeCheck}>Status Kompetensi</LabelIkon>
            <select value={statusKompetensi} onChange={(e) => setStatusKompetensi(e.target.value)} className={inputClass}>
              {PILIHAN_STATUS_KOMPETENSI.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ClipboardList}>Temuan (jika ada)</LabelIkon>
            <textarea placeholder="Contoh: Pagar pengaman berkarat, perlu perbaikan" value={temuan} onChange={(e) => setTemuan(e.target.value)} className={inputClass} rows="3" />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahPemeriksaan}
          disabled={sedangSimpan}
          className="mt-6 w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {sedangSimpan ? <Loader2 size={18} className="animate-spin" /> : <PackagePlus size={18} />}
          {sedangSimpan ? "Menyimpan..." : "Catat Pemeriksaan"}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Riwayat Pemeriksaan Instalasi</h2>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Instalasi</label>
            <select value={filter.unitId} onChange={(e) => updateFilter("unitId", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua Instalasi</option>
              {daftarUnit.map((u) => (
                <option key={u.id} value={u.id}>{u.namaUnit} — {u.nomorUnit}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasil Pemeriksaan</label>
            <select value={filter.hasil} onChange={(e) => updateFilter("hasil", e.target.value)} className={filterInputClass}>
              <option value="Semua">Semua</option>
              {PILIHAN_HASIL.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bulan Pemeriksaan</label>
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
            {daftarPemeriksaan.length === 0 ? "Belum ada catatan pemeriksaan." : "Tidak ada data yang cocok dengan filter."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Instalasi</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Hasil</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Petugas</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kompetensi</th>
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
                      <td className="py-2.5 px-3">{formatTanggal(new Date(p.tanggalPemeriksaan))}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeHasil(p.hasil)}`}>{p.hasil}</span>
                      </td>
                      <td className="py-2.5 px-3">{p.petugas || "-"}</td>
                      <td className="py-2.5 px-3">{p.statusKompetensi || "-"}</td>
                      <td className="py-2.5 px-3">{p.jadwalBerikutnya ? formatTanggal(new Date(p.jadwalBerikutnya)) : "-"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeStatusWaktu(statusLabel)}`}>
                          {statusLabel || "Belum Dijadwalkan"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => hapusPemeriksaan(p.id)} className="text-red-500 hover:text-red-700">
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

export default PengamananInstalasi