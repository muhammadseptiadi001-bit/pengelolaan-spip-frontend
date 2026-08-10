import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileSearch, CheckCircle2, AlertTriangle, XCircle, Circle, PackagePlus, Trash2,
  CalendarDays, UserCheck, ClipboardList, ImagePlus, Loader2, FileText, Send, Building2, X, Plus
} from 'lucide-react'
import { API_URL, UPLOAD_URL, formatTanggal } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'

const KAJIAN_URL = API_URL.replace('/unit', '/kajian-teknis')
const PENGATURAN_URL = API_URL.replace('/unit', '/pengaturan-evaluasi-kajian')

const JENIS_KAJIAN_AWAL = "Awal/Sebelum Kegiatan Pertambangan"
const JENIS_KAJIAN_PERUBAHAN = "Perubahan/Modifikasi Proses, Sarana, Prasarana, Instalasi, atau Peralatan"
const PILIHAN_JENIS_KAJIAN = [JENIS_KAJIAN_AWAL, JENIS_KAJIAN_PERUBAHAN]
const PILIHAN_STATUS_KEMEMADAIAN = ["Belum Direview", "Memadai", "Tidak Memadai"]

function tanggalHariIni() {
  const sekarang = new Date()
  return `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}-${String(sekarang.getDate()).padStart(2, "0")}`
}

function badgeKememadaian(status) {
  if (status === "Memadai") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (status === "Tidak Memadai") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
}

async function uploadFileKeServer(file, tipe) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("tipe", tipe)
  const res = await apiFetch(UPLOAD_URL, { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Gagal mengupload file")
  }
  return res.json()
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

function KajianTeknis() {
  const user = ambilUser()
  const [daftar, setDaftar] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filterStatus, setFilterStatus] = useState("Semua")

  const [pengaturan, setPengaturan] = useState({ prosedurEvaluasiKajianTeknis: false })
  const [sedangSimpanPengaturan, setSedangSimpanPengaturan] = useState(false)

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [departemen, setDepartemen] = useState("")
  const [judulKajian, setJudulKajian] = useState("")
  const [jenisKajian, setJenisKajian] = useState(PILIHAN_JENIS_KAJIAN[0])
  const [keteranganPerubahan, setKeteranganPerubahan] = useState("")

  // Penyusun/Konsultan sekarang bisa lebih dari satu orang — daftarPenyusun menyimpan
  // nama-nama yang sudah "ditambahkan" sebagai chip, inputPenyusun cuma teks yang lagi diketik.
  const [daftarPenyusun, setDaftarPenyusun] = useState([])
  const [inputPenyusun, setInputPenyusun] = useState("")

  const [tanggalKajian, setTanggalKajian] = useState("")
  const [fileLaporan, setFileLaporan] = useState(null)
  const [namaFile, setNamaFile] = useState("")
  const [statusKememadaian, setStatusKememadaian] = useState(PILIHAN_STATUS_KEMEMADAIAN[0])
  const [disampaikanKeKait, setDisampaikanKeKait] = useState(false)
  const [tanggalPenyampaian, setTanggalPenyampaian] = useState("")
  const [namaPenerima, setNamaPenerima] = useState("")
  const [catatanEvaluasi, setCatatanEvaluasi] = useState("")
  const [sedangUploadFile, setSedangUploadFile] = useState(false)
  const [sedangSimpan, setSedangSimpan] = useState(false)

  useEffect(() => {
    ambilData()
    ambilPengaturan()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const res = await apiFetch(KAJIAN_URL)
      const hasil = await res.json()
      setDaftar(Array.isArray(hasil) ? hasil : [])
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  async function ambilPengaturan() {
    try {
      const res = await apiFetch(PENGATURAN_URL)
      const hasil = await res.json()
      setPengaturan({ prosedurEvaluasiKajianTeknis: !!hasil.prosedurEvaluasiKajianTeknis })
    } catch (err) {
      console.error(err)
    }
  }

  async function ubahPengaturan() {
    setSedangSimpanPengaturan(true)
    try {
      const res = await apiFetch(PENGATURAN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prosedurEvaluasiKajianTeknis: !pengaturan.prosedurEvaluasiKajianTeknis }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      const hasil = await res.json()
      setPengaturan({ prosedurEvaluasiKajianTeknis: !!hasil.prosedurEvaluasiKajianTeknis })
    } catch (err) {
      console.error(err)
    } finally {
      setSedangSimpanPengaturan(false)
    }
  }

  const ringkasan = useMemo(() => {
    let memadai = 0, tidakMemadai = 0, belumDireview = 0, belumDisampaikan = 0
    daftar.forEach((k) => {
      if (k.statusKememadaian === "Memadai") memadai++
      else if (k.statusKememadaian === "Tidak Memadai") tidakMemadai++
      else belumDireview++
      if (!k.disampaikanKeKait) belumDisampaikan++
    })
    return { total: daftar.length, memadai, tidakMemadai, belumDireview, belumDisampaikan }
  }, [daftar])

  const daftarTerfilter = useMemo(() => {
    if (filterStatus === "Semua") return daftar
    return daftar.filter((k) => k.statusKememadaian === filterStatus)
  }, [daftar, filterStatus])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setSedangUploadFile(true)
    try {
      const hasil = await uploadFileKeServer(file, 'pdf')
      setFileLaporan(hasil.url)
      setNamaFile(file.name)
    } catch (err) {
      tampilkanToast(err.message || "Gagal mengupload file laporan.", "gagal")
    } finally {
      setSedangUploadFile(false)
      e.target.value = ""
    }
  }

  function tambahPenyusun() {
    const nama = inputPenyusun.trim()
    if (!nama) return
    if (daftarPenyusun.includes(nama)) {
      setInputPenyusun("")
      return
    }
    setDaftarPenyusun((prev) => [...prev, nama])
    setInputPenyusun("")
  }

  function hapusPenyusun(nama) {
    setDaftarPenyusun((prev) => prev.filter((n) => n !== nama))
  }

  function handleKeyDownPenyusun(e) {
    if (e.key === "Enter") {
      e.preventDefault()
      tambahPenyusun()
    }
  }

  async function tambahKajian() {
    if (!namaPerusahaan || !judulKajian || !jenisKajian || !tanggalKajian) {
      tampilkanToast("Nama Perusahaan, Judul Kajian, Jenis Kajian, dan Tanggal Kajian wajib diisi!", "gagal")
      return
    }
    if (tanggalKajian > tanggalHariIni()) {
      tampilkanToast("Tanggal Kajian tidak boleh di masa depan.", "gagal")
      return
    }
    if (sedangUploadFile) {
      tampilkanToast("Tunggu proses upload file selesai terlebih dahulu.", "gagal")
      return
    }

    // Kalau masih ada nama yang diketik di kolom tapi belum diklik "Tambah",
    // ikutkan juga supaya tidak hilang begitu saja saat disimpan.
    const semuaPenyusun = inputPenyusun.trim()
      ? [...daftarPenyusun, inputPenyusun.trim()]
      : daftarPenyusun
    const penyusunGabungan = semuaPenyusun.join(", ")

    setSedangSimpan(true)
    try {
      const res = await apiFetch(KAJIAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaPerusahaan, departemen, judulKajian, jenisKajian,
          keteranganPerubahan: jenisKajian === JENIS_KAJIAN_PERUBAHAN ? keteranganPerubahan : "",
          penyusun: penyusunGabungan, tanggalKajian, fileLaporan, statusKememadaian,
          disampaikanKeKait,
          tanggalPenyampaian: disampaikanKeKait ? (tanggalPenyampaian || null) : null,
          namaPenerima: disampaikanKeKait ? namaPenerima : "",
          catatanEvaluasi,
        }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")

      tampilkanToast("Kajian teknis berhasil ditambahkan!", "sukses")
      setNamaPerusahaan(""); setDepartemen("")
      setJudulKajian(""); setJenisKajian(PILIHAN_JENIS_KAJIAN[0]); setKeteranganPerubahan("")
      setDaftarPenyusun([]); setInputPenyusun("")
      setTanggalKajian(""); setFileLaporan(null); setNamaFile("")
      setStatusKememadaian(PILIHAN_STATUS_KEMEMADAIAN[0]); setDisampaikanKeKait(false)
      setTanggalPenyampaian(""); setNamaPenerima(""); setCatatanEvaluasi("")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menambahkan data. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangSimpan(false)
    }
  }

  async function hapusKajian(id) {
    try {
      const res = await apiFetch(`${KAJIAN_URL}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Gagal menghapus")
      tampilkanToast("Kajian teknis dihapus.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menghapus data.", "gagal")
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Evaluasi Laporan Hasil Kajian Teknis</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Aspek 5 — Evaluasi laporan hasil kajian teknis pertambangan</p>
      </div>

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KartuRingkasan label="Total Kajian" nilai={ringkasan.total} warna="bg-blue-500" icon={FileSearch} />
          <KartuRingkasan label="Memadai" nilai={ringkasan.memadai} warna="bg-green-500" icon={CheckCircle2} />
          <KartuRingkasan label="Tidak Memadai" nilai={ringkasan.tidakMemadai} warna="bg-red-500" icon={XCircle} />
          <KartuRingkasan label="Belum Direview" nilai={ringkasan.belumDireview} warna="bg-yellow-500" icon={AlertTriangle} />
          <KartuRingkasan label="Belum Disampaikan ke KaIT" nilai={ringkasan.belumDisampaikan} warna="bg-gray-400" icon={Send} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <button
          type="button"
          onClick={ubahPengaturan}
          disabled={sedangSimpanPengaturan}
          className="w-full flex items-start gap-3 text-left disabled:opacity-60 disabled:cursor-wait"
        >
          {sedangSimpanPengaturan ? (
            <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
          ) : pengaturan.prosedurEvaluasiKajianTeknis ? (
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Circle size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-200">Prosedur evaluasi laporan hasil kajian teknis pertambangan sudah disusun dan ditetapkan</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {pengaturan.prosedurEvaluasiKajianTeknis ? "Sudah ditetapkan — klik untuk batalkan" : "Belum ditetapkan — klik untuk tandai sudah ditetapkan"}
            </p>
          </div>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/20">
            <PackagePlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tambah Kajian Teknis</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Catat laporan kajian teknis dan hasil evaluasinya</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={Building2}>Nama Perusahaan</LabelIkon>
            <input type="text" placeholder="Nama Perusahaan" value={namaPerusahaan} onChange={(e) => setNamaPerusahaan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={Building2}>Departemen</LabelIkon>
            <input type="text" placeholder="Contoh: Teknik & Perencanaan" value={departemen} onChange={(e) => setDepartemen(e.target.value)} className={inputClass} />
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={FileSearch}>Judul Kajian</LabelIkon>
            <input type="text" placeholder="Contoh: Kajian Geoteknik Lereng Tambang Blok A" value={judulKajian} onChange={(e) => setJudulKajian(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={ClipboardList}>Jenis Kajian</LabelIkon>
            <select value={jenisKajian} onChange={(e) => setJenisKajian(e.target.value)} className={inputClass}>
              {PILIHAN_JENIS_KAJIAN.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Kajian</LabelIkon>
            <input type="date" value={tanggalKajian} max={tanggalHariIni()} onChange={(e) => setTanggalKajian(e.target.value)} className={inputClass} />
          </div>

          {jenisKajian === JENIS_KAJIAN_PERUBAHAN && (
            <div className="md:col-span-2">
              <LabelIkon icon={ClipboardList}>Keterangan Perubahan</LabelIkon>
              <textarea placeholder="Jelaskan perubahan/modifikasi proses, sarana, prasarana, instalasi, atau peralatan yang melatarbelakangi kajian ini" value={keteranganPerubahan} onChange={(e) => setKeteranganPerubahan(e.target.value)} className={inputClass} rows="2" />
            </div>
          )}

          <div className="md:col-span-2">
            <LabelIkon icon={UserCheck}>Penyusun / Konsultan</LabelIkon>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ketik nama, lalu klik Tambah (bisa lebih dari satu orang)"
                value={inputPenyusun}
                onChange={(e) => setInputPenyusun(e.target.value)}
                onKeyDown={handleKeyDownPenyusun}
                className={inputClass}
              />
              <button
                type="button"
                onClick={tambahPenyusun}
                className="flex-shrink-0 px-4 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold text-sm flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>
            {daftarPenyusun.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {daftarPenyusun.map((namaOrang) => (
                  <span
                    key={namaOrang}
                    className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    {namaOrang}
                    <button
                      type="button"
                      onClick={() => hapusPenyusun(namaOrang)}
                      className="p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <LabelIkon icon={CheckCircle2}>Status</LabelIkon>
            <select value={statusKememadaian} onChange={(e) => setStatusKememadaian(e.target.value)} className={inputClass}>
              {PILIHAN_STATUS_KEMEMADAIAN.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ImagePlus}>File Laporan (PDF, opsional)</LabelIkon>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-5 transition-colors ${sedangUploadFile ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"}`}>
              {sedangUploadFile ? (
                <Loader2 size={22} className="text-blue-500 animate-spin" />
              ) : (
                <FileText size={22} className="text-gray-400" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {sedangUploadFile ? "Mengupload..." : namaFile ? `Terpilih: ${namaFile}` : "Klik untuk pilih file PDF laporan"}
              </span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={sedangUploadFile} className="hidden" />
            </label>
          </div>

          <div className="md:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
            <input
              type="checkbox"
              id="disampaikanKeKait"
              checked={disampaikanKeKait}
              onChange={(e) => setDisampaikanKeKait(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="disampaikanKeKait" className="text-sm text-gray-700 dark:text-gray-200">
              Sudah disampaikan kepada KaIT / Kepala Dinas atas nama KaIT
            </label>
          </div>

          {disampaikanKeKait && (
            <>
              <div>
                <LabelIkon icon={CalendarDays}>Tanggal Penyampaian</LabelIkon>
                <input type="date" value={tanggalPenyampaian} max={tanggalHariIni()} onChange={(e) => setTanggalPenyampaian(e.target.value)} className={inputClass} />
              </div>
              <div>
                <LabelIkon icon={UserCheck}>Nama Penerima</LabelIkon>
                <input type="text" placeholder="Nama KaIT / Kepala Dinas a.n. KaIT" value={namaPenerima} onChange={(e) => setNamaPenerima(e.target.value)} className={inputClass} />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <LabelIkon icon={ClipboardList}>Catatan Evaluasi</LabelIkon>
            <textarea placeholder="Catatan hasil evaluasi kajian (opsional)" value={catatanEvaluasi} onChange={(e) => setCatatanEvaluasi(e.target.value)} className={inputClass} rows="3" />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahKajian}
          disabled={sedangSimpan || sedangUploadFile}
          className="mt-6 w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {sedangSimpan ? <Loader2 size={18} className="animate-spin" /> : <PackagePlus size={18} />}
          {sedangSimpan ? "Menyimpan..." : "Tambah Kajian Teknis"}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Daftar Kajian Teknis</h2>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm">
            <option value="Semua">Semua Status</option>
            {PILIHAN_STATUS_KEMEMADAIAN.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {daftarTerfilter.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data kajian teknis.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Departemen</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Judul Kajian</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jenis Kajian</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal Kajian</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Penyusun</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Disampaikan ke KaIT</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">File</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarTerfilter.map((k) => (
                  <tr key={k.id} className="border-b border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200">
                    <td className="py-2.5 px-3 whitespace-nowrap">{k.namaPerusahaan || "-"}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{k.departemen || "-"}</td>
                    <td className="py-2.5 px-3 font-medium">{k.judulKajian}</td>
                    <td className="py-2.5 px-3 max-w-[220px]">{k.jenisKajian}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{formatTanggal(k.tanggalKajian)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{k.penyusun || "-"}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeKememadaian(k.statusKememadaian)}`}>{k.statusKememadaian}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {k.disampaikanKeKait ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                          Sudah{k.tanggalPenyampaian ? ` — ${formatTanggal(k.tanggalPenyampaian)}` : ""}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Belum</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {k.fileLaporan ? (
                        <a href={k.fileLaporan} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold">Lihat</a>
                      ) : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => hapusKajian(k.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default KajianTeknis