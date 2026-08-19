import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts'
import {
  ShieldCheck, AlertTriangle, XCircle, TrendingUp, ClipboardList,
  CheckCircle2, Circle, Info, Loader2, ChevronDown, ListChecks
} from 'lucide-react'
import { API_URL, PILIHAN_JENIS_SPIP, hitungJatuhTempo, hitungStatusWaktu, formatTanggal, cariKelompokUntukAlat } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

// Endpoint pengaturan tingkat perusahaan diturunkan dari API_URL (mengganti /unit menjadi /pengaturan-perusahaan).
// Kalau API_URL tidak diakhiri "/unit", ganti baris ini dengan URL endpoint yang benar.
const PENGATURAN_URL = API_URL.replace('/unit', '/pengaturan-perusahaan')

// Daftar 7 kriteria checklist evaluasi — dipakai untuk header tabel (angka 1-7) DAN legenda
// di atasnya, supaya kalau suatu saat kriteria berubah, cukup edit array ini di satu tempat.
const DAFTAR_KRITERIA = [
  { kode: "daftarOk", labelSingkat: "Daftar Alat", labelPenuh: "Daftar sarana, prasarana, instalasi, dan peralatan pertambangan sudah dibuat" },
  { kode: "jadwalOk", labelSingkat: "Jadwal Uji", labelPenuh: "Pelaksanaan pengujian dan pemantauan sesuai jadwal yang ditetapkan" },
  { kode: "petugasOk", labelSingkat: "Petugas", labelPenuh: "Pengujian dan pemantauan dilakukan oleh Tenaga Teknis Pertambangan yang Berkompeten" },
  { kode: "tindakLanjutOk", labelSingkat: "Tindak Lanjut", labelPenuh: "Seluruh tindak lanjut dan perbaikan atas temuan sudah dilaksanakan" },
  { kode: "statusKelayakanOk", labelSingkat: "Layak Penuh", labelPenuh: "Status kelayakan Layak sepenuhnya (tanpa catatan)" },
  { kode: "prosedurPengujianOk", labelSingkat: "Prosedur Uji", labelPenuh: "Prosedur pengujian kelayakan sarana, prasarana, instalasi, dan peralatan sudah disusun dan ditetapkan" },
  { kode: "prosedurPemantauanOk", labelSingkat: "Prosedur Pantau", labelPenuh: "Prosedur pemantauan, pengukuran kinerja, evaluasi, dan tindak lanjut pengelolaan Keselamatan Operasi Pertambangan sudah ada" },
]

function kunciBulan(tanggalString) {
  const d = new Date(tanggalString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function labelBulan(kunci) {
  const [tahun, bulan] = kunci.split("-")
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`
}

// ===== SUMBER TUNGGAL PERHITUNGAN EVALUASI PER UNIT =====
// Dipakai baik untuk kartu ringkasan "Tingkat Kepatuhan" MAUPUN tabel "Detail Evaluasi per Unit",
// supaya kedua tempat itu SELALU menampilkan angka yang sinkron.
//
// 7 kriteria yang dinilai (lihat DAFTAR_KRITERIA di atas untuk urutan & labelnya):
//  1. daftarOk             -> selalu true (unit ini memang sudah terdaftar)
//  2. jadwalOk              -> status waktu bukan "Sudah Lewat"
//  3. petugasOk             -> statusKompetensi === "Bersertifikat / Kompeten"
//  4. tindakLanjutOk        -> tidak ada temuan bermasalah (Tidak Layak / Layak Dengan Catatan)
//                              yang belum diisi kolom Tindak Lanjut
//  5. statusKelayakanOk     -> statusKelayakan PERSIS "Layak" (tanpa catatan). "Layak Dengan
//                              Catatan" TETAP dianggap belum sepenuhnya patuh walau tindak
//                              lanjutnya sudah diisi — karena "catatan" itu sendiri berarti
//                              belum sempurna.
//  6. prosedurPengujianOk   -> Pengaturan Tingkat Perusahaan: prosedur pengujian kelayakan
//  7. prosedurPemantauanOk  -> Pengaturan Tingkat Perusahaan: prosedur pemantauan & evaluasi
// persentase = (jumlah kriteria terpenuhi / 7) x 100%
function hitungEvaluasiUnit(u, pengaturanPerusahaan) {
  const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
  const statusWaktu = hitungStatusWaktu(jatuhTempo).label

  const daftarOk = true
  const jadwalOk = statusWaktu !== "Sudah Lewat"
  const petugasOk = u.statusKompetensi === "Bersertifikat / Kompeten"
  const tindakLanjutOk = !(
    (u.statusKelayakan === "Tidak Layak" || u.statusKelayakan === "Layak Dengan Catatan") && !u.tindakLanjut
  )
  const statusKelayakanOk = u.statusKelayakan === "Layak"
  const prosedurPengujianOk = pengaturanPerusahaan.prosedurPengujianKelayakan
  const prosedurPemantauanOk = pengaturanPerusahaan.prosedurPemantauanEvaluasi

  const kriteria = [daftarOk, jadwalOk, petugasOk, tindakLanjutOk, statusKelayakanOk, prosedurPengujianOk, prosedurPemantauanOk]
  const jumlahTerpenuhi = kriteria.filter(Boolean).length
  const persentase = Math.round((jumlahTerpenuhi / kriteria.length) * 100)

  return {
    jatuhTempo, statusWaktu,
    daftarOk, jadwalOk, petugasOk, tindakLanjutOk, statusKelayakanOk, prosedurPengujianOk, prosedurPemantauanOk,
    persentase,
  }
}

// ===== KOMPONEN BERGAYA SAMA DENGAN DASHBOARD =====

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
      <p className="text-xs text-gray-300 mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: payload[0].payload.fill || "#3b82f6" }}>
        {payload[0].value} unit
      </p>
    </div>
  )
}

function TooltipModernBertumpuk({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-gray-900/95 dark:bg-black/90 backdrop-blur-sm text-white rounded-xl shadow-2xl px-4 py-2.5 border border-white/10">
      <p className="text-xs text-gray-300 mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <p key={p.dataKey} className="text-sm font-bold flex items-center gap-1.5" style={{ color: WARNA_KELAYAKAN[p.dataKey] }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: WARNA_KELAYAKAN[p.dataKey] }}></span>
          {p.dataKey}: {p.value} unit
        </p>
      ))}
    </div>
  )
}

// Badge ikon header gradasi — dipindah dari Dashboard.jsx supaya gaya header tiap panel
// (Analisis Tren, Backlog, Evaluasi Kriteria, Detail per Unit) seragam dengan Dashboard.
function IkonHeaderGrafik({ Icon, gradasi }) {
  return (
    <div className={`p-2 rounded-xl bg-gradient-to-br ${gradasi} shadow-md`}>
      <Icon size={16} className="text-white" />
    </div>
  )
}

// Label angka di ATAS tiap segmen bar bertumpuk (Tren Status Kelayakan) — DI LUAR batang,
// bukan di tengah/dalam, supaya gaya labelnya konsisten dengan grafik Distribusi Temuan
// (yang juga menampilkan angka di luar/samping batangnya). Cuma dirender kalau nilainya > 0.
function LabelJumlahBarBertumpuk(props) {
  const { x, y, width, value } = props
  if (!value) return null
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      textAnchor="middle"
      style={{ fontSize: 11, fontWeight: 700 }}
      className="fill-gray-700 dark:fill-gray-200"
    >
      {value}
    </text>
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

// Label kelompok kecil (kicker) untuk memisahkan halaman jadi blok-blok visual yang jelas:
// Ringkasan -> Analisis -> Tindak Lanjut & Detail. Sebelumnya semua section berbaris rata
// tanpa penanda, jadi terasa "menyatu" dan sulit dipetakan sekilas.
function LabelKelompokSection({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">{children}</h3>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800"></div>
    </div>
  )
}

// ===== EVALUASI KRITERIA KEPATUHAN — VERSI RINGKAS (GRID KARTU KECIL) =====
// Sebelumnya tiap item checklist adalah baris penuh lebar dengan expand sendiri-sendiri,
// jadi section ini jadi sangat panjang dan mendorong tabel "Detail Evaluasi per Unit" ke bawah.
// Sekarang: 4 item otomatis + 2 item pengaturan perusahaan ditampilkan sebagai kartu kecil
// dalam satu grid (seperti kartu ringkasan di atas). Kartu yang belum terpenuhi tetap kelihatan
// jelas (border merah + ikon silang). Detail unit bermasalah tidak lagi expand per-kartu,
// tapi tampil di SATU panel bersama di bawah grid — jadi tinggi section jauh lebih hemat.

function KartuKriteriaOtomatis({ item, labelSingkat, aktif, onPilih }) {
  const punyaDetail = item.unitBermasalah && item.unitBermasalah.length > 0

  return (
    <button
      type="button"
      onClick={punyaDetail ? onPilih : undefined}
      title={item.teks}
      className={`flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-colors ${
        aktif
          ? "border-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-900"
          : item.terpenuhi
            ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600"
            : "border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700"
      } ${punyaDetail ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        {item.terpenuhi ? (
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        ) : (
          <XCircle size={16} className="text-red-500 flex-shrink-0" />
        )}
        {punyaDetail && (
          <span className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-red-500 dark:text-red-400">{item.unitBermasalah.length}</span>
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${aktif ? "rotate-180" : ""}`} />
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-snug">{labelSingkat}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-2">{item.keterangan}</p>
    </button>
  )
}

function KartuPengaturan({ teks, labelSingkat, terpenuhi, sedangSimpan, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={sedangSimpan}
      title={teks}
      className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-600 text-left transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      <div className="flex items-center justify-between">
        {sedangSimpan ? (
          <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
        ) : terpenuhi ? (
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        ) : (
          <Circle size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wide text-blue-400 dark:text-blue-500">Perusahaan</span>
      </div>
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-snug">{labelSingkat}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">
        {terpenuhi ? "Sudah ditetapkan — klik untuk batalkan" : "Klik untuk tandai sudah ditetapkan"}
      </p>
    </button>
  )
}

// Panel detail TUNGGAL yang dipakai bersama oleh semua kartu kriteria otomatis — hanya satu
// yang bisa terbuka dalam satu waktu, jadi tidak ada lagi tumpukan tabel expand di bawah tiap kartu.
function PanelDetailKriteria({ item, onTindakLanjuti }) {
  return (
    <AnimatePresence initial={false}>
      {item && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-xl border border-red-100 dark:border-red-900/40 overflow-hidden">
            <div className="px-3 py-2 bg-red-50/70 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/40">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.teks}</p>
              <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">Perlu ditindaklanjuti — {item.unitBermasalah.length} unit</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama Unit</th>
                    <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nomor Unit</th>
                    <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Alasan Belum Memenuhi</th>
                    <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {item.unitBermasalah.map((u, i) => (
                    <tr key={i} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                      <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">{u.namaUnit}</td>
                      <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">{u.nomorUnit}</td>
                      <td className="py-2 px-3 text-sm text-red-600 dark:text-red-400">{u.alasan}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => onTindakLanjuti(u.nomorUnit)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                        >
                          Tindak Lanjuti →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Tanda centang/silang kecil untuk sel tabel "Detail Evaluasi per Unit"
function TandaKriteria({ terpenuhi, judul }) {
  return (
    <div title={judul} className="flex justify-center">
      {terpenuhi ? (
        <CheckCircle2 size={16} className="text-green-500" />
      ) : (
        <XCircle size={16} className="text-red-400" />
      )}
    </div>
  )
}

function warnaPersentase(persen) {
  if (persen >= 80) return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (persen >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
  return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
}

function Evaluasi() {
  const navigate = useNavigate()
  const [daftarUnit, setDaftarUnit] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filterPerusahaan, setFilterPerusahaan] = useState("Semua")
  const [filterJenisSpip, setFilterJenisSpip] = useState("Semua")
  const [bulanTerpilih, setBulanTerpilih] = useState("Semua")
  const [kriteriaAktif, setKriteriaAktif] = useState(null)

  const [pengaturanPerusahaan, setPengaturanPerusahaan] = useState({
    prosedurPengujianKelayakan: false,
    prosedurPemantauanEvaluasi: false,
  })
  const [sedangSimpanPengaturan, setSedangSimpanPengaturan] = useState(null)

  useEffect(() => {
    ambilData()
    ambilPengaturan()
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

  async function ambilPengaturan() {
    try {
      const response = await apiFetch(PENGATURAN_URL)
      const hasil = await response.json()
      setPengaturanPerusahaan({
        prosedurPengujianKelayakan: !!hasil.prosedurPengujianKelayakan,
        prosedurPemantauanEvaluasi: !!hasil.prosedurPemantauanEvaluasi,
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function ubahPengaturan(field) {
    const payload = { ...pengaturanPerusahaan, [field]: !pengaturanPerusahaan[field] }

    setSedangSimpanPengaturan(field)
    try {
      const response = await apiFetch(PENGATURAN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Gagal menyimpan pengaturan")
      const hasil = await response.json()
      setPengaturanPerusahaan({
        prosedurPengujianKelayakan: !!hasil.prosedurPengujianKelayakan,
        prosedurPemantauanEvaluasi: !!hasil.prosedurPemantauanEvaluasi,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSedangSimpanPengaturan(null)
    }
  }

  // Daftar nama perusahaan diambil dari SELURUH data (tidak ikut kefilter Kategori SPIP/Bulan),
  // supaya pilihan di dropdown Filter Perusahaan tetap lengkap apa pun filter lain yang aktif.
  const daftarPerusahaan = useMemo(() => {
    const nama = new Set()
    daftarUnit.forEach((u) => {
      if (u.namaPerusahaan) nama.add(u.namaPerusahaan)
    })
    return Array.from(nama).sort()
  }, [daftarUnit])

  // Data dasar: sudah kefilter Perusahaan + Kategori SPIP, TAPI BELUM kefilter Bulan.
  const dataDasarTerfilter = useMemo(() => {
    return daftarUnit.filter((u) => {
      const cocokPerusahaan = filterPerusahaan === "Semua" || u.namaPerusahaan === filterPerusahaan
      const cocokJenisSpip = filterJenisSpip === "Semua" || u.jenisSpip === filterJenisSpip
      return cocokPerusahaan && cocokJenisSpip
    })
  }, [daftarUnit, filterPerusahaan, filterJenisSpip])

  const daftarBulanTersedia = useMemo(() => {
    const set = new Set(dataDasarTerfilter.map((u) => kunciBulan(u.tanggalUjiTerakhir)))
    return Array.from(set).sort().reverse()
  }, [dataDasarTerfilter])

  // Data untuk kartu ringkasan kepatuhan: dataDasarTerfilter + filter Bulan
  const dataUnitTerfilter = useMemo(() => {
    if (bulanTerpilih === "Semua") return dataDasarTerfilter
    return dataDasarTerfilter.filter((u) => kunciBulan(u.tanggalUjiTerakhir) === bulanTerpilih)
  }, [dataDasarTerfilter, bulanTerpilih])

  const kepatuhan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0
    let totalPersentase = 0
    let jumlahJadwalOk = 0, jumlahPetugasOk = 0, jumlahTindakLanjutOk = 0, jumlahStatusKelayakanOk = 0

    dataUnitTerfilter.forEach((u) => {
      const evalUnit = hitungEvaluasiUnit(u, pengaturanPerusahaan)

      if (evalUnit.statusWaktu === "Aman") aman++
      else if (evalUnit.statusWaktu === "Mendekati Jatuh Tempo") mendekati++
      else lewat++

      if (evalUnit.jadwalOk) jumlahJadwalOk++
      if (evalUnit.petugasOk) jumlahPetugasOk++
      if (evalUnit.tindakLanjutOk) jumlahTindakLanjutOk++
      if (evalUnit.statusKelayakanOk) jumlahStatusKelayakanOk++

      totalPersentase += evalUnit.persentase
    })

    const total = dataUnitTerfilter.length
    const persentase = total === 0 ? 0 : Math.round(totalPersentase / total)
    const persentaseJadwal = total === 0 ? 0 : Math.round((jumlahJadwalOk / total) * 100)
    const persentasePetugas = total === 0 ? 0 : Math.round((jumlahPetugasOk / total) * 100)
    const persentaseTindakLanjut = total === 0 ? 0 : Math.round((jumlahTindakLanjutOk / total) * 100)
    const persentaseStatusKelayakan = total === 0 ? 0 : Math.round((jumlahStatusKelayakanOk / total) * 100)

    return {
      aman, mendekati, lewat, total, persentase,
      persentaseJadwal, persentasePetugas, persentaseTindakLanjut, persentaseStatusKelayakan,
    }
  }, [dataUnitTerfilter, pengaturanPerusahaan])

  const trenStatusKelayakan = useMemo(() => {
    const perBulan = {}
    dataDasarTerfilter.forEach((u) => {
      const kunci = kunciBulan(u.tanggalUjiTerakhir)
      if (!perBulan[kunci]) perBulan[kunci] = { Layak: 0, "Tidak Layak": 0, "Layak Dengan Catatan": 0 }
      if (perBulan[kunci][u.statusKelayakan] !== undefined) perBulan[kunci][u.statusKelayakan] += 1
    })
    return Object.entries(perBulan)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([kunci, jumlah]) => ({ bulan: labelBulan(kunci), ...jumlah }))
  }, [dataDasarTerfilter])

  const backlogLewatTempo = useMemo(() => {
    return dataDasarTerfilter
      .map((u) => {
        const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
        return { ...u, jatuhTempo, statusWaktu: hitungStatusWaktu(jatuhTempo).label }
      })
      .filter((u) => u.statusWaktu === "Sudah Lewat")
      .sort((a, b) => a.jatuhTempo - b.jatuhTempo)
  }, [dataDasarTerfilter])

  const distribusiTemuan = useMemo(() => {
    const perKelompok = {}
    dataDasarTerfilter
      .filter((u) => u.temuan && u.temuan.trim() !== "")
      .forEach((u) => {
        const kelompok = cariKelompokUntukAlat(u.jenisSpip, u.jenisAlat) || "Lainnya"
        perKelompok[kelompok] = (perKelompok[kelompok] || 0) + 1
      })
    return Object.entries(perKelompok)
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
  }, [dataDasarTerfilter])

  const checklistOtomatis = useMemo(() => {
    const totalData = dataDasarTerfilter.length

    const unitLewatTempo = dataDasarTerfilter
      .map((u) => {
        const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
        return { ...u, jatuhTempo, statusWaktu: hitungStatusWaktu(jatuhTempo).label }
      })
      .filter((u) => u.statusWaktu === "Sudah Lewat")

    const unitPetugasBelumKompeten = dataDasarTerfilter.filter(
      (u) => u.statusKompetensi !== "Bersertifikat / Kompeten"
    )
    const unitDenganPetugasTercatat = dataDasarTerfilter.filter((u) => u.namaPetugas && u.namaPetugas.trim() !== "").length
    const unitPetugasKompeten = dataDasarTerfilter.filter((u) => u.statusKompetensi === "Bersertifikat / Kompeten").length

    const unitBermasalahBelumTindakLanjut = dataDasarTerfilter.filter(
      (u) => (u.statusKelayakan === "Tidak Layak" || u.statusKelayakan === "Layak Dengan Catatan") && !u.tindakLanjut
    )

    return [
      {
        teks: "Daftar sarana, prasarana, instalasi, dan peralatan pertambangan sudah dibuat",
        terpenuhi: totalData > 0,
        keterangan: `${totalData} unit terdaftar`,
        unitBermasalah: [],
      },
      {
        teks: "Pelaksanaan pengujian dan pemantauan sesuai jadwal yang ditetapkan (tidak ada yang lewat jatuh tempo)",
        terpenuhi: totalData > 0 && unitLewatTempo.length === 0,
        keterangan: unitLewatTempo.length === 0 ? "Semua unit masih dalam jadwal" : `${unitLewatTempo.length} unit lewat jatuh tempo`,
        unitBermasalah: unitLewatTempo.map((u) => ({
          namaUnit: u.namaUnit,
          nomorUnit: u.nomorUnit,
          alasan: `Lewat jatuh tempo sejak ${formatTanggal(u.jatuhTempo)}`,
        })),
      },
      {
        teks: "Pengujian dan pemantauan dilakukan oleh Tenaga Teknis Pertambangan yang Berkompeten",
        terpenuhi: totalData > 0 && unitPetugasKompeten === totalData,
        keterangan: unitDenganPetugasTercatat === 0
          ? "Belum ada petugas tercatat"
          : `${unitPetugasKompeten} dari ${totalData} unit kompeten`,
        unitBermasalah: unitPetugasBelumKompeten.map((u) => ({
          namaUnit: u.namaUnit,
          nomorUnit: u.nomorUnit,
          alasan: !u.namaPetugas || u.namaPetugas.trim() === ""
            ? "Belum ada petugas tercatat"
            : "Status kompetensi: Belum Bersertifikat",
        })),
      },
      {
        teks: "Seluruh tindak lanjut dan perbaikan atas temuan sudah dilaksanakan",
        terpenuhi: unitBermasalahBelumTindakLanjut.length === 0,
        keterangan: unitBermasalahBelumTindakLanjut.length === 0
          ? "Tidak ada temuan tertunda"
          : `${unitBermasalahBelumTindakLanjut.length} unit belum ditindaklanjuti`,
        unitBermasalah: unitBermasalahBelumTindakLanjut.map((u) => ({
          namaUnit: u.namaUnit,
          nomorUnit: u.nomorUnit,
          alasan: `Status: ${u.statusKelayakan}, belum ada tindak lanjut`,
        })),
      },
    ]
  }, [dataDasarTerfilter])

  // Default: buka otomatis panel detail untuk kriteria BERMASALAH pertama saat data pertama kali termuat,
  // supaya masalah tetap langsung kelihatan tanpa harus klik dulu. Setelah itu terserah pilihan user.
  useEffect(() => {
    if (kriteriaAktif === null && checklistOtomatis.length > 0) {
      const idx = checklistOtomatis.findIndex((it) => it.unitBermasalah.length > 0)
      if (idx !== -1) setKriteriaAktif(idx)
    }
  }, [checklistOtomatis, kriteriaAktif])

  function pilihKriteria(index) {
    setKriteriaAktif((sebelumnya) => (sebelumnya === index ? -1 : index))
  }

  const detailEvaluasiPerUnit = useMemo(() => {
    return dataDasarTerfilter
      .map((u) => {
        const evalUnit = hitungEvaluasiUnit(u, pengaturanPerusahaan)
        return {
          id: u.id,
          namaUnit: u.namaUnit,
          nomorUnit: u.nomorUnit,
          statusKelayakan: u.statusKelayakan,
          ...evalUnit,
        }
      })
      .sort((a, b) => a.persentase - b.persentase)
  }, [dataDasarTerfilter, pengaturanPerusahaan])

  function tindakLanjutiUnit(nomorUnit) {
    navigate(`/data?nomorUnit=${encodeURIComponent(nomorUnit)}`)
  }

  // Kartu ringkasan sekarang mengikuti gaya Dashboard: "Tingkat Kepatuhan" jadi kartu hero
  // navy gradient (setara "Total Unit" di Dashboard), sedangkan Aman/Mendekati/Sudah Lewat
  // memakai warna lembut + lingkaran dekoratif — SAMA PERSIS dengan kartu Aman/Mendekati/
  // Sudah Lewat di Dashboard, karena memang kategori yang sama.
  const kartuRingkasan = [
    {
      key: "kepatuhan",
      hero: true,
      label: "Tingkat Kepatuhan",
      nilai: kepatuhan.persentase,
      satuan: "%",
      icon: ShieldCheck,
      breakdown: [
        { label: "Jadwal", nilai: kepatuhan.persentaseJadwal },
        { label: "Petugas", nilai: kepatuhan.persentasePetugas },
        { label: "Tindak Lanjut", nilai: kepatuhan.persentaseTindakLanjut },
        { label: "Layak Penuh", nilai: kepatuhan.persentaseStatusKelayakan },
      ],
    },
    {
      key: "aman",
      label: "Aman",
      nilai: kepatuhan.aman,
      icon: CheckCircle2,
      bgKartu: "bg-green-50 dark:bg-green-950/40",
      border: "border border-green-100 dark:border-green-900/60",
      bgIkon: "bg-green-100 dark:bg-green-900/50",
      warnaIkon: "text-green-600 dark:text-green-400",
      warnaNilai: "text-green-700 dark:text-green-400",
      warnaLabel: "text-green-700/70 dark:text-green-400/70",
      warnaDekor: "bg-green-400/10",
    },
    {
      key: "mendekati",
      label: "Mendekati Jatuh Tempo",
      nilai: kepatuhan.mendekati,
      icon: AlertTriangle,
      bgKartu: "bg-amber-50 dark:bg-amber-950/40",
      border: "border border-amber-100 dark:border-amber-900/60",
      bgIkon: "bg-amber-100 dark:bg-amber-900/50",
      warnaIkon: "text-amber-600 dark:text-amber-400",
      warnaNilai: "text-amber-700 dark:text-amber-400",
      warnaLabel: "text-amber-700/70 dark:text-amber-400/70",
      warnaDekor: "bg-amber-400/10",
    },
    {
      key: "lewat",
      label: "Sudah Lewat",
      nilai: kepatuhan.lewat,
      icon: XCircle,
      bgKartu: "bg-red-50 dark:bg-red-950/40",
      border: "border border-red-100 dark:border-red-900/60",
      bgIkon: "bg-red-100 dark:bg-red-900/50",
      warnaIkon: "text-red-600 dark:text-red-400",
      warnaNilai: "text-red-700 dark:text-red-400",
      warnaLabel: "text-red-700/70 dark:text-red-400/70",
      warnaDekor: "bg-red-400/10",
    },
  ]

  const itemAktif = kriteriaAktif !== null && kriteriaAktif >= 0 ? checklistOtomatis[kriteriaAktif] : null

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Evaluasi</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Evaluasi kepatuhan dan kinerja program SPIP secara berkala</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Perusahaan</label>
            <select
              value={filterPerusahaan}
              onChange={(e) => setFilterPerusahaan(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 w-full"
            >
              <option value="Semua">Semua</option>
              {daftarPerusahaan.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Kategori SPIP</label>
            <select
              value={filterJenisSpip}
              onChange={(e) => setFilterJenisSpip(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 w-full"
            >
              <option value="Semua">Semua</option>
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bulan Uji Terakhir</label>
            <select
              value={bulanTerpilih}
              onChange={(e) => setBulanTerpilih(e.target.value)}
              className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 w-full"
            >
              <option value="Semua">Semua Waktu</option>
              {daftarBulanTersedia.map((kunci) => (
                <option key={kunci} value={kunci}>{labelBulan(kunci)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== BLOK 1: RINGKASAN — gaya kartu disamakan dengan Dashboard ===== */}
      <LabelKelompokSection>Ringkasan Kepatuhan</LabelKelompokSection>

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {kartuRingkasan.map((kartu) => {
            const Icon = kartu.icon

            if (kartu.hero) {
              return (
                <motion.div
                  key={kartu.key}
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
                    <AngkaCountUp nilai={kartu.nilai} />{kartu.satuan}
                  </p>
                  {kartu.breakdown && (
                    <div className="flex flex-wrap gap-1.5 mt-3 relative">
                      {kartu.breakdown.map((b) => (
                        <span
                          key={b.label}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                        >
                          {b.label}: {b.nilai}%
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            }

            return (
              <motion.div
                key={kartu.key}
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

      {/* ===== BLOK 2: ANALISIS ===== */}
      <LabelKelompokSection>Analisis Tren & Temuan</LabelKelompokSection>

      {sedangMuat ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GrafikSkeleton />
          <GrafikSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.008, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={TrendingUp} gradasi="from-blue-400 to-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tren Status Kelayakan</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                6 bulan terakhir
              </span>
            </div>
            {trenStatusKelayakan.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data untuk ditampilkan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trenStatusKelayakan} barCategoryGap="25%" margin={{ top: 20 }}>
                  <defs>
                    <linearGradient id="gradLayak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_KELAYAKAN["Layak"]} stopOpacity={1} />
                      <stop offset="100%" stopColor={WARNA_KELAYAKAN["Layak"]} stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradTidakLayak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_KELAYAKAN["Tidak Layak"]} stopOpacity={1} />
                      <stop offset="100%" stopColor={WARNA_KELAYAKAN["Tidak Layak"]} stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradLayakCatatan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WARNA_KELAYAKAN["Layak Dengan Catatan"]} stopOpacity={1} />
                      <stop offset="100%" stopColor={WARNA_KELAYAKAN["Layak Dengan Catatan"]} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipModernBertumpuk />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Layak" stackId="a" fill="url(#gradLayak)" radius={[0, 0, 0, 0]}>
                    <LabelList dataKey="Layak" content={<LabelJumlahBarBertumpuk />} />
                  </Bar>
                  <Bar dataKey="Tidak Layak" stackId="a" fill="url(#gradTidakLayak)">
                    <LabelList dataKey="Tidak Layak" content={<LabelJumlahBarBertumpuk />} />
                  </Bar>
                  <Bar dataKey="Layak Dengan Catatan" stackId="a" fill="url(#gradLayakCatatan)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="Layak Dengan Catatan" content={<LabelJumlahBarBertumpuk />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
                <IkonHeaderGrafik Icon={ClipboardList} gradasi="from-sky-400 to-sky-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Distribusi Temuan per Kelompok</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {distribusiTemuan.reduce((a, b) => a + b.jumlah, 0)} total
              </span>
            </div>
            {distribusiTemuan.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada unit dengan catatan temuan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={distribusiTemuan} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <defs>
                    <linearGradient id="gradTemuan" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nama" width={180} tick={{ fontSize: 10.5 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipModern />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="jumlah" fill="url(#gradTemuan)" radius={[0, 8, 8, 0]} maxBarSize={22}>
                    <LabelList dataKey="jumlah" position="right" style={{ fontSize: 12, fontWeight: 700 }} className="fill-gray-700 dark:fill-gray-200" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>
      )}

      {!sedangMuat && (
        <>
          {/* ===== BLOK 3: TINDAK LANJUT & DETAIL ===== */}
          <LabelKelompokSection>Tindak Lanjut &amp; Kepatuhan Regulasi</LabelKelompokSection>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={XCircle} gradasi="from-red-400 to-rose-600" />
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800 mb-6"
          >
            <div className="flex items-center gap-3 mb-1">
              <IkonHeaderGrafik Icon={ShieldCheck} gradasi="from-indigo-400 to-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Evaluasi Kriteria Kepatuhan</h2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Klik kartu bertanda ✗ untuk melihat unit mana saja yang belum memenuhi kriteria itu.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {checklistOtomatis.map((item, i) => (
                <KartuKriteriaOtomatis
                  key={i}
                  item={item}
                  labelSingkat={DAFTAR_KRITERIA[i].labelSingkat}
                  aktif={kriteriaAktif === i}
                  onPilih={() => pilihKriteria(i)}
                />
              ))}
              <KartuPengaturan
                teks="Prosedur pengujian kelayakan sarana, prasarana, instalasi, dan peralatan sudah disusun dan ditetapkan"
                labelSingkat="Prosedur Uji"
                terpenuhi={pengaturanPerusahaan.prosedurPengujianKelayakan}
                sedangSimpan={sedangSimpanPengaturan === "prosedurPengujianKelayakan"}
                onToggle={() => ubahPengaturan("prosedurPengujianKelayakan")}
              />
              <KartuPengaturan
                teks="Prosedur pemantauan, pengukuran kinerja, evaluasi, dan tindak lanjut pengelolaan Keselamatan Operasi Pertambangan sudah ada"
                labelSingkat="Prosedur Pantau"
                terpenuhi={pengaturanPerusahaan.prosedurPemantauanEvaluasi}
                sedangSimpan={sedangSimpanPengaturan === "prosedurPemantauanEvaluasi"}
                onToggle={() => ubahPengaturan("prosedurPemantauanEvaluasi")}
              />
            </div>

            <PanelDetailKriteria item={itemAktif} onTindakLanjuti={tindakLanjutiUnit} />
          </motion.div>

          {/* === Detail Evaluasi per Unit === */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <IkonHeaderGrafik Icon={ListChecks} gradasi="from-blue-400 to-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Detail Evaluasi per Unit</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {detailEvaluasiPerUnit.length} unit, diurutkan dari persentase terendah
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Rincian pemenuhan tiap kriteria per unit SPIP yang terdaftar. Arahkan kursor ke tanda ✓/✗ untuk lihat nama kriteria lengkap. Klik "Tindak Lanjuti" untuk langsung membuka unit itu di halaman Data SPIP.
            </p>

            {/* Legenda kriteria — dipakai supaya header tabel di bawah cukup ditulis angka
                1-7, tidak perlu kalimat panjang berulang di tiap kolom. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mb-4">
              {DAFTAR_KRITERIA.map((k, i) => (
                <div
                  key={k.kode}
                  title={k.labelPenuh}
                  className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2 py-1.5 leading-snug"
                >
                  <span className="font-bold text-gray-600 dark:text-gray-300">{i + 1}.</span> {k.labelSingkat}
                </div>
              ))}
            </div>

            {detailEvaluasiPerUnit.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada unit yang cocok dengan filter aktif.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Data SPIP</th>
                      {DAFTAR_KRITERIA.map((k, i) => (
                        <th
                          key={k.kode}
                          title={k.labelPenuh}
                          className="py-2.5 px-2 text-xs font-bold text-gray-500 dark:text-gray-400 text-center w-10 cursor-help"
                        >
                          {i + 1}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Status Kelayakan</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Jatuh Tempo</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-center whitespace-nowrap">Persentase</th>
                      <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEvaluasiPerUnit.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200">
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">{u.nomorUnit}</td>
                        {DAFTAR_KRITERIA.map((k) => (
                          <td key={k.kode} className="py-2.5 px-2">
                            <TandaKriteria terpenuhi={u[k.kode]} judul={k.labelPenuh} />
                          </td>
                        ))}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.statusKelayakan === "Layak" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : u.statusKelayakan === "Tidak Layak" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                          }`}>
                            {u.statusKelayakan}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatTanggal(u.jatuhTempo)}</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${warnaPersentase(u.persentase)}`}>
                            {u.persentase}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => tindakLanjutiUnit(u.nomorUnit)}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Tindak Lanjuti →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}

export default Evaluasi