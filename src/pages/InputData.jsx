import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, PackagePlus, Building2, Tags, Wrench, Hash,
  CalendarDays, Timer, ShieldCheck, ClipboardList, Wrench as WrenchAlt,
  ImagePlus, FileUp
} from 'lucide-react'
import { API_URL, PILIHAN_JANGKA_WAKTU, PILIHAN_JENIS_SPIP, PILIHAN_JENIS_ALAT } from '../utils/spipHelpers'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

function LabelIkon({ icon: Icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      <Icon size={14} className="text-yellow-500" />
      {children}
    </label>
  )
}

function InputData() {
  const user = ambilUser()

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [jenisSpip, setJenisSpip] = useState(PILIHAN_JENIS_SPIP[0])
  const [namaUnit, setNamaUnit] = useState("")
  const [jenisAlat, setJenisAlat] = useState(PILIHAN_JENIS_ALAT[PILIHAN_JENIS_SPIP[0]][0])
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

  function handleJenisSpipChange(e) {
    const kategoriBaru = e.target.value
    setJenisSpip(kategoriBaru)
    setJenisAlat(PILIHAN_JENIS_ALAT[kategoriBaru][0])
  }

  function handleFotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setFotoBase64(reader.result)
    reader.readAsDataURL(file)
  }

  function handlePdfChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setPdfData(reader.result)
      setPdfNama(file.name)
    }
    reader.readAsDataURL(file)
  }

  async function tambahUnit() {
    if (namaUnit === "" || jenisAlat === "" || nomorUnit === "" || tanggalUji === "" || namaPerusahaan === "") {
      tampilkanToast("Kolom Nama Perusahaan, Nama Unit, Jenis Alat, Nomor Unit, dan Tanggal Uji wajib diisi!", "gagal")
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

      setNamaPerusahaan("")
      setJenisSpip(PILIHAN_JENIS_SPIP[0])
      setNamaUnit("")
      setJenisAlat(PILIHAN_JENIS_ALAT[PILIHAN_JENIS_SPIP[0]][0])
      setNomorUnit("")
      setTanggalUji("")
      setJangkaWaktuBulan(24)
      setStatusKelayakan("Layak")
      setTemuan("")
      setTindakLanjut("")
      setFotoBase64(null)
      setPdfNama("")
      setPdfData(null)
    } catch (err) {
      tampilkanToast("Gagal menambahkan unit. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangSimpan(false)
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-3 py-2"

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Input Data</h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tambah Unit Alat</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            <LabelIkon icon={WrenchAlt}>Jenis Alat</LabelIkon>
            <AnimatePresence mode="wait">
              <motion.div
                key={jenisSpip}
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
                  {PILIHAN_JENIS_ALAT[jenisSpip].map((alat) => (
                    <option key={alat} value={alat}>{alat}</option>
                  ))}
                </select>
              </motion.div>
            </AnimatePresence>
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

          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Uji Terakhir</LabelIkon>
            <input
              type="date"
              value={tanggalUji}
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

          <div>
            <LabelIkon icon={ShieldCheck}>Status Kelayakan</LabelIkon>
            <select
              value={statusKelayakan}
              onChange={(e) => setStatusKelayakan(e.target.value)}
              className={inputClass}
            >
              <option value="Layak">Layak</option>
              <option value="Tidak Layak">Tidak Layak</option>
              <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ClipboardList}>Temuan (jika ada)</LabelIkon>
            <textarea
              placeholder="Contoh: Kebocoran oli hidrolik pada silinder boom"
              value={temuan}
              onChange={(e) => setTemuan(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ClipboardList}>Tindak Lanjut Perbaikan (jika ada)</LabelIkon>
            <textarea
              placeholder="Contoh: Sudah dilakukan penggantian seal hidrolik"
              value={tindakLanjut}
              onChange={(e) => setTindakLanjut(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>

          <div>
            <LabelIkon icon={ImagePlus}>Foto Temuan (opsional)</LabelIkon>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className={`${inputClass} dark:file:text-white`}
            />
            {fotoBase64 && (
              <img src={fotoBase64} alt="Preview" className="mt-2 h-24 rounded border border-gray-300 dark:border-gray-700" />
            )}
          </div>

          <div>
            <LabelIkon icon={FileUp}>Upload File PDF (opsional)</LabelIkon>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className={`${inputClass} dark:file:text-white`}
            />
            {pdfNama && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <FileText size={14} /> {pdfNama}
              </p>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahUnit}
          disabled={sedangSimpan}
          className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-gray-900 px-4 py-2 rounded font-semibold flex items-center gap-2"
        >
          <PackagePlus size={18} />
          {sedangSimpan ? "Menyimpan..." : "Tambah Unit"}
        </motion.button>
      </motion.div>
    </div>
  )
}

export default InputData