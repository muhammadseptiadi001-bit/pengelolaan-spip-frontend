import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, PackagePlus, Building2, Tags, Layers, Wrench, Hash,
  CalendarDays, Timer, ShieldCheck, ClipboardList,
  ImagePlus, FileUp, X, Loader2
} from 'lucide-react'
import { API_URL, UPLOAD_URL, PILIHAN_JANGKA_WAKTU, PILIHAN_JENIS_SPIP, daftarKelompok, daftarAlatDalamKelompok } from '../utils/spipHelpers'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

// Label kelompok & item disesuaikan per Kategori SPIP supaya tidak selalu terbaca "Alat"
const LABEL_PER_KATEGORI = {
  "Peralatan Pertambangan": { kelompok: "Kelompok Alat", item: "Jenis Alat" },
  "Instalasi Pertambangan": { kelompok: "Kelompok Instalasi", item: "Jenis Instalasi" },
  "Bangunan": { kelompok: "Kelompok Bangunan", item: "Jenis Bangunan" },
}

function labelKelompok(jenisSpip) {
  return LABEL_PER_KATEGORI[jenisSpip]?.kelompok || "Kelompok"
}

function labelItem(jenisSpip) {
  return LABEL_PER_KATEGORI[jenisSpip]?.item || "Jenis"
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

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <div className="h-4 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{children}</h3>
    </div>
  )
}

function tanggalHariIni() {
  const sekarang = new Date()
  const tahun = sekarang.getFullYear()
  const bulan = String(sekarang.getMonth() + 1).padStart(2, "0")
  const tanggal = String(sekarang.getDate()).padStart(2, "0")
  return `${tahun}-${bulan}-${tanggal}`
}

async function uploadFileKeServer(file, tipe) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("tipe", tipe)

  const res = await apiFetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Gagal mengupload file")
  }

  return res.json()
}

function InputData() {
  const user = ambilUser()

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [jenisSpip, setJenisSpip] = useState(PILIHAN_JENIS_SPIP[0])
  const [kelompokAlat, setKelompokAlat] = useState(daftarKelompok(PILIHAN_JENIS_SPIP[0])[0])
  const [namaUnit, setNamaUnit] = useState("")
  const [jenisAlat, setJenisAlat] = useState(daftarAlatDalamKelompok(PILIHAN_JENIS_SPIP[0], daftarKelompok(PILIHAN_JENIS_SPIP[0])[0])[0])
  const [nomorUnit, setNomorUnit] = useState("")
  const [tanggalUji, setTanggalUji] = useState("")
  const [jangkaWaktuBulan, setJangkaWaktuBulan] = useState(24)
  const [statusKelayakan, setStatusKelayakan] = useState("Layak")
  const [temuan, setTemuan] = useState("")
  const [tindakLanjut, setTindakLanjut] = useState("")
  const [fotoBase64, setFotoBase64] = useState(null)
  const [pdfNama, setPdfNama] = useState("")
  const [pdfData, setPdfData] = useState(null)
  const [sedangSimpan, setSedangSimpan] = useState(false)
  const [sedangUploadFoto, setSedangUploadFoto] = useState(false)
  const [sedangUploadPdf, setSedangUploadPdf] = useState(false)
  const [daftarNomorUnitAda, setDaftarNomorUnitAda] = useState([])

  useEffect(() => {
    ambilDaftarNomorUnit()
  }, [])

  async function ambilDaftarNomorUnit() {
    try {
      const res = await apiFetch(API_URL)
      const data = await res.json()
      setDaftarNomorUnitAda(data.map((unit) => unit.nomorUnit?.toLowerCase().trim()))
    } catch (err) {
      console.error(err)
    }
  }

  function handleJenisSpipChange(e) {
    const kategoriBaru = e.target.value
    const kelompokPertama = daftarKelompok(kategoriBaru)[0]
    setJenisSpip(kategoriBaru)
    setKelompokAlat(kelompokPertama)
    setJenisAlat(daftarAlatDalamKelompok(kategoriBaru, kelompokPertama)[0])
  }

  function handleKelompokChange(e) {
    const kelompokBaru = e.target.value
    setKelompokAlat(kelompokBaru)
    setJenisAlat(daftarAlatDalamKelompok(jenisSpip, kelompokBaru)[0])
  }

  async function handleFotoChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setSedangUploadFoto(true)
    try {
      const hasil = await uploadFileKeServer(file, "foto")
      setFotoBase64(hasil.url)
    } catch (err) {
      tampilkanToast(err.message || "Gagal mengupload foto.", "gagal")
    } finally {
      setSedangUploadFoto(false)
      e.target.value = ""
    }
  }

  async function handlePdfChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setSedangUploadPdf(true)
    try {
      const hasil = await uploadFileKeServer(file, "pdf")
      setPdfData(hasil.url)
      setPdfNama(file.name)
    } catch (err) {
      tampilkanToast(err.message || "Gagal mengupload PDF.", "gagal")
    } finally {
      setSedangUploadPdf(false)
      e.target.value = ""
    }
  }

  async function tambahUnit() {
    if (namaUnit === "" || jenisAlat === "" || nomorUnit === "" || tanggalUji === "" || namaPerusahaan === "") {
      tampilkanToast("Kolom Nama Perusahaan, Nama Unit, Jenis Alat, Nomor Unit, dan Tanggal Uji wajib diisi!", "gagal")
      return
    }

    if (tanggalUji > tanggalHariIni()) {
      tampilkanToast("Tanggal Uji Terakhir tidak boleh di masa depan.", "gagal")
      return
    }

    if (daftarNomorUnitAda.includes(nomorUnit.toLowerCase().trim())) {
      tampilkanToast(`Nomor Unit "${nomorUnit}" sudah terdaftar. Gunakan nomor unit yang berbeda.`, "gagal")
      return
    }

    if (sedangUploadFoto || sedangUploadPdf) {
      tampilkanToast("Tunggu proses upload file selesai terlebih dahulu.", "gagal")
      return
    }

    const unitBaru = {
      namaPerusahaan,
      jenisSpip,
      namaUnit,
      jenisAlat,
      nomorUnit,
      tanggalUjiTerakhir: tanggalUji,
      jangkaWaktuBulan,
      statusKelayakan,
      temuan,
      tindakLanjut,
      foto: fotoBase64,
      pdfNama,
      pdfData,
      dibuatOleh: user?.nama || "Tidak diketahui",
    }

    setSedangSimpan(true)
    try {
      const res = await apiFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitBaru),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")

      tampilkanToast("Unit berhasil ditambahkan!", "sukses")

      const kelompokPertama = daftarKelompok(PILIHAN_JENIS_SPIP[0])[0]
      setNamaPerusahaan("")
      setJenisSpip(PILIHAN_JENIS_SPIP[0])
      setKelompokAlat(kelompokPertama)
      setNamaUnit("")
      setJenisAlat(daftarAlatDalamKelompok(PILIHAN_JENIS_SPIP[0], kelompokPertama)[0])
      setNomorUnit("")
      setTanggalUji("")
      setJangkaWaktuBulan(24)
      setStatusKelayakan("Layak")
      setTemuan("")
      setTindakLanjut("")
      setFotoBase64(null)
      setPdfNama("")
      setPdfData(null)
      ambilDaftarNomorUnit()
    } catch (err) {
      tampilkanToast("Gagal menambahkan unit. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangSimpan(false)
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Input Data</h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm dark:border dark:border-gray-800"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/20">
            <PackagePlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tambah Unit Alat</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Lengkapi data unit yang akan didaftarkan</p>
          </div>
        </div>

        <SectionTitle>Identitas Unit</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={Building2}>Nama Perusahaan</LabelIkon>
            <input
              type="text"
              placeholder="Nama Perusahaan Anda"
              value={namaPerusahaan}
              onChange={(e) => setNamaPerusahaan(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <LabelIkon icon={Tags}>Kategori SPIP</LabelIkon>
            <select
              value={jenisSpip}
              onChange={handleJenisSpipChange}
              className={inputClass}
            >
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <div>
            <LabelIkon icon={Layers}>{labelKelompok(jenisSpip)}</LabelIkon>
            <AnimatePresence mode="wait">
              <motion.div
                key={jenisSpip}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <select
                  value={kelompokAlat}
                  onChange={handleKelompokChange}
                  className={inputClass}
                >
                  {daftarKelompok(jenisSpip).map((kelompok) => (
                    <option key={kelompok} value={kelompok}>{kelompok}</option>
                  ))}
                </select>
              </motion.div>
            </AnimatePresence>
          </div>

          <div>
            <LabelIkon icon={Wrench}>{labelItem(jenisSpip)}</LabelIkon>
            <AnimatePresence mode="wait">
              <motion.div
                key={kelompokAlat}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <select
                  value={jenisAlat}
                  onChange={(e) => setJenisAlat(e.target.value)}
                  className={inputClass}
                >
                  {daftarAlatDalamKelompok(jenisSpip, kelompokAlat).map((alat) => (
                    <option key={alat} value={alat}>{alat}</option>
                  ))}
                </select>
              </motion.div>
            </AnimatePresence>
          </div>

          <div>
            <LabelIkon icon={Wrench}>Nama/Model Unit</LabelIkon>
            <input
              type="text"
              placeholder="Contoh: PC200"
              value={namaUnit}
              onChange={(e) => setNamaUnit(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <LabelIkon icon={Hash}>Nomor Unit</LabelIkon>
            <input
              type="text"
              placeholder="Contoh: EXC-001"
              value={nomorUnit}
              onChange={(e) => setNomorUnit(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <SectionTitle>Jadwal Uji Kelayakan</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Uji Terakhir</LabelIkon>
            <input
              type="date"
              value={tanggalUji}
              max={tanggalHariIni()}
              onChange={(e) => setTanggalUji(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <LabelIkon icon={Timer}>Jangka Waktu Uji Kelayakan</LabelIkon>
            <select
              value={jangkaWaktuBulan}
              onChange={(e) => setJangkaWaktuBulan(Number(e.target.value))}
              className={inputClass}
            >
              {PILIHAN_JANGKA_WAKTU.map((item) => (
                <option key={item.bulan} value={item.bulan}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ShieldCheck}>Status Kelayakan</LabelIkon>
            <select
              value={statusKelayakan}
              onChange={(e) => setStatusKelayakan(e.target.value)}
              className={`${inputClass} md:w-1/2`}
            >
              <option value="Layak">Layak</option>
              <option value="Tidak Layak">Tidak Layak</option>
              <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
            </select>
          </div>
        </div>

        <SectionTitle>Catatan Pemeriksaan</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={ClipboardList}>Temuan (jika ada)</LabelIkon>
            <textarea
              placeholder="Contoh: Kebocoran oli hidrolik pada silinder boom"
              value={temuan}
              onChange={(e) => setTemuan(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>

          <div>
            <LabelIkon icon={ClipboardList}>Tindak Lanjut Perbaikan (jika ada)</LabelIkon>
            <textarea
              placeholder="Contoh: Sudah dilakukan penggantian seal hidrolik"
              value={tindakLanjut}
              onChange={(e) => setTindakLanjut(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>
        </div>

        <SectionTitle>Lampiran</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={ImagePlus}>Foto Temuan (opsional)</LabelIkon>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-5 transition-colors ${sedangUploadFoto ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"}`}>
              {sedangUploadFoto ? (
                <Loader2 size={22} className="text-blue-500 animate-spin" />
              ) : (
                <ImagePlus size={22} className="text-gray-400" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {sedangUploadFoto ? "Mengupload foto..." : fotoBase64 ? "Klik untuk ganti foto" : "Klik untuk pilih foto"}
              </span>
              <input type="file" accept="image/*" onChange={handleFotoChange} disabled={sedangUploadFoto} className="hidden" />
            </label>
            {fotoBase64 && !sedangUploadFoto && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative mt-2 inline-block"
              >
                <img src={fotoBase64} alt="Preview" className="h-24 rounded-xl border border-gray-300 dark:border-gray-700" />
                <button
                  onClick={() => setFotoBase64(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </div>

          <div>
            <LabelIkon icon={FileUp}>Upload File PDF (opsional)</LabelIkon>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-5 transition-colors ${sedangUploadPdf ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"}`}>
              {sedangUploadPdf ? (
                <Loader2 size={22} className="text-blue-500 animate-spin" />
              ) : (
                <FileUp size={22} className="text-gray-400" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {sedangUploadPdf ? "Mengupload PDF..." : pdfNama ? "Klik untuk ganti PDF" : "Klik untuk pilih PDF"}
              </span>
              <input type="file" accept="application/pdf" onChange={handlePdfChange} disabled={sedangUploadPdf} className="hidden" />
            </label>
            {pdfNama && !sedangUploadPdf && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 w-fit"
              >
                <FileText size={14} className="text-blue-500" /> {pdfNama}
              </motion.p>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahUnit}
          disabled={sedangSimpan || sedangUploadFoto || sedangUploadPdf}
          className="mt-8 w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          <PackagePlus size={18} />
          {sedangSimpan ? "Menyimpan..." : "Tambah Unit"}
        </motion.button>
      </motion.div>
    </div>
  )
}

export default InputData