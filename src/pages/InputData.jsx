import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { API_URL, PILIHAN_JANGKA_WAKTU, PILIHAN_JENIS_SPIP, PILIHAN_JENIS_ALAT } from '../utils/spipHelpers'
import { ambilUser } from '../utils/auth'

// Komponen Toast Notification
function Toast({ toast, onClose }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
        >
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
            ${toast.tipe === "sukses"
              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }
          `}>
            {toast.tipe === "sukses" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <p className="text-sm font-medium flex-1">{toast.pesan}</p>
            <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
              <XCircle size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const [toast, setToast] = useState(null)

  function tampilkanToast(pesan, tipe = "sukses") {
    setToast({ pesan, tipe })
    setTimeout(() => setToast(null), 3000)
  }

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

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitBaru),
      })

      if (!res.ok) throw new Error("Gagal menyimpan data")

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
      console.error(err)
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Input Data</h1>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tambah Unit Alat</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Nama Perusahaan</label>
            <input
              type="text"
              placeholder="Nama Perusahaan Anda"
              value={namaPerusahaan}
              onChange={(e) => setNamaPerusahaan(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Kategori SPIP</label>
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
            <label className={labelClass}>Nama/Model Unit</label>
            <input
              type="text"
              placeholder="Contoh: PC200"
              value={namaUnit}
              onChange={(e) => setNamaUnit(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Jenis Alat</label>
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
            <label className={labelClass}>Nomor Unit</label>
            <input
              type="text"
              placeholder="Contoh: EXC-001"
              value={nomorUnit}
              onChange={(e) => setNomorUnit(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tanggal Uji Terakhir</label>
            <input
              type="date"
              value={tanggalUji}
              onChange={(e) => setTanggalUji(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Jangka Waktu Uji Kelayakan</label>
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
            <label className={labelClass}>Status Kelayakan</label>
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
            <label className={labelClass}>Temuan (jika ada)</label>
            <textarea
              placeholder="Contoh: Kebocoran oli hidrolik pada silinder boom"
              value={temuan}
              onChange={(e) => setTemuan(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Tindak Lanjut Perbaikan (jika ada)</label>
            <textarea
              placeholder="Contoh: Sudah dilakukan penggantian seal hidrolik"
              value={tindakLanjut}
              onChange={(e) => setTindakLanjut(e.target.value)}
              className={inputClass}
              rows="3"
            />
          </div>

          <div>
            <label className={labelClass}>Foto Temuan (opsional)</label>
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
            <label className={labelClass}>Upload File PDF (opsional)</label>
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
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded font-semibold"
        >
          Tambah Unit
        </motion.button>
      </div>
    </div>
  )
}

export default InputData