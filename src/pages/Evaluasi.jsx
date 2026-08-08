import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts'
import {
  ShieldCheck, AlertTriangle, XCircle, TrendingUp, ClipboardList,
  CheckCircle2, Circle, Info, Loader2, ChevronDown
} from 'lucide-react'
import { API_URL, hitungJatuhTempo, hitungStatusWaktu, formatTanggal, cariKelompokUntukAlat } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'

const WARNA_KELAYAKAN = { "Layak": "#22c55e", "Tidak Layak": "#ef4444", "Layak Dengan Catatan": "#eab308" }
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

// Endpoint pengaturan tingkat perusahaan diturunkan dari API_URL (mengganti /unit menjadi /pengaturan-perusahaan).
// Kalau API_URL tidak diakhiri "/unit", ganti baris ini dengan URL endpoint yang benar.
const PENGATURAN_URL = API_URL.replace('/unit', '/pengaturan-perusahaan')

function kunciBulan(tanggalString) {
  const d = new Date(tanggalString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function labelBulan(kunci) {
  const [tahun, bulan] = kunci.split("-")
  return `${NAMA_BULAN[Number(bulan) - 1]} ${tahun}`
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

const varianKontainer = {
  tersembunyi: {},
  tampil: { transition: { staggerChildren: 0.12 } }
}

const varianKartu = {
  tersembunyi: { opacity: 0, y: 16 },
  tampil: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

// ===== KOMPONEN CHECKLIST DENGAN DETAIL UNIT BERMASALAH (default terbuka kalau ada masalah) =====

function ItemChecklistOtomatis({ item, terbuka, onToggle }) {
  const punyaDetail = item.unitBermasalah && item.unitBermasalah.length > 0

  return (
    <div className={`rounded-xl overflow-hidden ${item.terpenuhi ? "bg-gray-50 dark:bg-gray-800/60" : "bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40"}`}>
      <button
        type="button"
        onClick={punyaDetail ? onToggle : undefined}
        className={`w-full flex items-start gap-3 p-3 text-left ${punyaDetail ? "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors" : "cursor-default"}`}
      >
        {item.terpenuhi ? (
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-200">{item.teks}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.keterangan}</p>
        </div>
        {punyaDetail && (
          <ChevronDown
            size={16}
            className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${terbuka ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {terbuka && punyaDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-400 mb-2 mt-1">
                Perlu ditindaklanjuti — {item.unitBermasalah.length} unit
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama Unit</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nomor Unit</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Alasan Belum Memenuhi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.unitBermasalah.map((u, i) => (
                      <tr key={i} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">{u.namaUnit}</td>
                        <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">{u.nomorUnit}</td>
                        <td className="py-2 px-3 text-sm text-red-600 dark:text-red-400">{u.alasan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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

function Evaluasi() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [bulanTerpilih, setBulanTerpilih] = useState("Semua")
  const [itemDitutupManual, setItemDitutupManual] = useState(() => new Set())

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

  function toggleItemTerbuka(index) {
    setItemDitutupManual((sebelumnya) => {
      const baru = new Set(sebelumnya)
      if (baru.has(index)) baru.delete(index)
      else baru.add(index)
      return baru
    })
  }

  const daftarBulanTersedia = useMemo(() => {
    const set = new Set(daftarUnit.map((u) => kunciBulan(u.tanggalUjiTerakhir)))
    return Array.from(set).sort().reverse()
  }, [daftarUnit])

  const dataUnitTerfilter = useMemo(() => {
    if (bulanTerpilih === "Semua") return daftarUnit
    return daftarUnit.filter((u) => kunciBulan(u.tanggalUjiTerakhir) === bulanTerpilih)
  }, [daftarUnit, bulanTerpilih])

  // Tingkat Kepatuhan sekarang mencakup 3 kriteria sekaligus: jadwal (tidak lewat tempo),
  // kompetensi petugas, dan tindak lanjut temuan — bukan cuma status jatuh tempo saja.
  const kepatuhan = useMemo(() => {
    let aman = 0, mendekati = 0, lewat = 0, compliant = 0
    dataUnitTerfilter.forEach((u) => {
      const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
      const label = hitungStatusWaktu(jatuhTempo).label
      if (label === "Aman") aman++
      else if (label === "Mendekati Jatuh Tempo") mendekati++
      else lewat++

      const jadwalOk = label !== "Sudah Lewat"
      const petugasOk = u.statusKompetensi === "Bersertifikat / Kompeten"
      const tindakLanjutOk = !((u.statusKelayakan === "Tidak Layak" || u.statusKelayakan === "Layak Dengan Catatan") && !u.tindakLanjut)
      if (jadwalOk && petugasOk && tindakLanjutOk) compliant++
    })
    const total = dataUnitTerfilter.length
    const persentase = total === 0 ? 0 : Math.round((compliant / total) * 100)
    return { aman, mendekati, lewat, total, compliant, persentase }
  }, [dataUnitTerfilter])

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

  const backlogLewatTempo = useMemo(() => {
    return daftarUnit
      .map((u) => {
        const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
        return { ...u, jatuhTempo, statusWaktu: hitungStatusWaktu(jatuhTempo).label }
      })
      .filter((u) => u.statusWaktu === "Sudah Lewat")
      .sort((a, b) => a.jatuhTempo - b.jatuhTempo)
  }, [daftarUnit])

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

  const checklistOtomatis = useMemo(() => {
    const totalData = daftarUnit.length

    const unitLewatTempo = daftarUnit
      .map((u) => {
        const jatuhTempo = hitungJatuhTempo(u.tanggalUjiTerakhir, u.jangkaWaktuBulan)
        return { ...u, jatuhTempo, statusWaktu: hitungStatusWaktu(jatuhTempo).label }
      })
      .filter((u) => u.statusWaktu === "Sudah Lewat")

    const unitPetugasBelumKompeten = daftarUnit.filter(
      (u) => u.statusKompetensi !== "Bersertifikat / Kompeten"
    )
    const unitDenganPetugasTercatat = daftarUnit.filter((u) => u.namaPetugas && u.namaPetugas.trim() !== "").length
    const unitPetugasKompeten = daftarUnit.filter((u) => u.statusKompetensi === "Bersertifikat / Kompeten").length

    const unitBermasalahBelumTindakLanjut = daftarUnit.filter(
      (u) => (u.statusKelayakan === "Tidak Layak" || u.statusKelayakan === "Layak Dengan Catatan") && !u.tindakLanjut
    )

    return [
      {
        teks: "Daftar sarana, prasarana, instalasi, dan peralatan pertambangan sudah dibuat",
        terpenuhi: totalData > 0,
        keterangan: `${totalData} unit terdaftar di aplikasi`,
        unitBermasalah: [],
      },
      {
        teks: "Pelaksanaan pengujian dan pemantauan sesuai jadwal yang ditetapkan (tidak ada yang lewat jatuh tempo)",
        terpenuhi: totalData > 0 && unitLewatTempo.length === 0,
        keterangan: unitLewatTempo.length === 0 ? "Semua unit masih dalam jadwal" : `${unitLewatTempo.length} unit sudah lewat jatuh tempo`,
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
          ? "Belum ada unit yang mencatat nama & status kompetensi petugas"
          : `${unitPetugasKompeten} dari ${totalData} unit tercatat diperiksa petugas berkompeten (${unitDenganPetugasTercatat} unit sudah mencatat data petugas)`,
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
          ? "Tidak ada unit bermasalah yang belum ditindaklanjuti"
          : `${unitBermasalahBelumTindakLanjut.length} unit bermasalah belum ada catatan tindak lanjut`,
        unitBermasalah: unitBermasalahBelumTindakLanjut.map((u) => ({
          namaUnit: u.namaUnit,
          nomorUnit: u.nomorUnit,
          alasan: `Status: ${u.statusKelayakan}, belum ada tindak lanjut`,
        })),
      },
    ]
  }, [daftarUnit])

  const kartuRingkasan = [
    { label: "Tingkat Kepatuhan", nilai: kepatuhan.persentase, satuan: "%", sub: `${kepatuhan.compliant} dari ${kepatuhan.total} unit memenuhi jadwal, kompetensi petugas & tindak lanjut`, icon: ShieldCheck, warna: "text-blue-600 dark:text-blue-400", aksen: "from-blue-400 to-blue-600", bgIkon: "bg-gradient-to-br from-blue-400 to-blue-600" },
    { label: "Aman", nilai: kepatuhan.aman, satuan: "", sub: null, icon: CheckCircle2, warna: "text-green-600 dark:text-green-400", aksen: "from-green-400 to-emerald-600", bgIkon: "bg-gradient-to-br from-green-400 to-emerald-600" },
    { label: "Mendekati Jatuh Tempo", nilai: kepatuhan.mendekati, satuan: "", sub: null, icon: AlertTriangle, warna: "text-yellow-600 dark:text-yellow-400", aksen: "from-yellow-400 to-amber-600", bgIkon: "bg-gradient-to-br from-yellow-400 to-amber-600" },
    { label: "Sudah Lewat", nilai: kepatuhan.lewat, satuan: "", sub: null, icon: XCircle, warna: "text-red-600 dark:text-red-400", aksen: "from-red-400 to-rose-600", bgIkon: "bg-gradient-to-br from-red-400 to-rose-600" },
  ]

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
                    <AngkaCountUp nilai={kartu.nilai} />{kartu.satuan}
                  </p>
                  {kartu.sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{kartu.sub}</p>}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GrafikSkeleton />
          <GrafikSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.008, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tren Status Kelayakan</h2>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                6 bulan terakhir
              </span>
            </div>
            {trenStatusKelayakan.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data untuk ditampilkan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trenStatusKelayakan} barCategoryGap="25%">
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
                  <Bar dataKey="Layak" stackId="a" fill="url(#gradLayak)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Tidak Layak" stackId="a" fill="url(#gradTidakLayak)" />
                  <Bar dataKey="Layak Dengan Catatan" stackId="a" fill="url(#gradLayakCatatan)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.008, boxShadow: "0px 16px 32px rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-500" />
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Checklist Kepatuhan Regulasi</h2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Berdasarkan kriteria penilaian Kepmen ESDM soal kelayakan sarana/prasarana/instalasi/peralatan dan pengelolaan Keselamatan Operasi Pertambangan. Item yang belum terpenuhi otomatis menampilkan daftar unit yang perlu ditindaklanjuti.
            </p>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Dihitung otomatis dari data</p>
            <div className="flex flex-col gap-2 mb-5">
              {checklistOtomatis.map((item, i) => (
                <ItemChecklistOtomatis
                  key={i}
                  item={item}
                  terbuka={!item.terpenuhi && !itemDitutupManual.has(i)}
                  onToggle={() => toggleItemTerbuka(i)}
                />
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Pengaturan Tingkat Perusahaan</p>
            <div className="flex flex-col gap-2">
              <ItemPengaturan
                teks="Prosedur pengujian kelayakan sarana, prasarana, instalasi, dan peralatan sudah disusun dan ditetapkan"
                terpenuhi={pengaturanPerusahaan.prosedurPengujianKelayakan}
                sedangSimpan={sedangSimpanPengaturan === "prosedurPengujianKelayakan"}
                onToggle={() => ubahPengaturan("prosedurPengujianKelayakan")}
              />
              <ItemPengaturan
                teks="Prosedur pemantauan, pengukuran kinerja, evaluasi, dan tindak lanjut pengelolaan Keselamatan Operasi Pertambangan sudah ada"
                terpenuhi={pengaturanPerusahaan.prosedurPemantauanEvaluasi}
                sedangSimpan={sedangSimpanPengaturan === "prosedurPemantauanEvaluasi"}
                onToggle={() => ubahPengaturan("prosedurPemantauanEvaluasi")}
              />
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <p>Kedua item di atas berlaku untuk seluruh perusahaan (bukan per unit). Klik item untuk menandai sudah/belum ditetapkan.</p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

export default Evaluasi