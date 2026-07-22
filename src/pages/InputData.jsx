import { useState } from 'react'
import { API_URL, PILIHAN_JANGKA_WAKTU, PILIHAN_JENIS_SPIP } from '../utils/spipHelpers'
import { ambilUser } from '../utils/auth'

function InputData() {
  const user = ambilUser()

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [jenisSpip, setJenisSpip] = useState(PILIHAN_JENIS_SPIP[0])
  const [namaUnit, setNamaUnit] = useState("")
  const [jenisAlat, setJenisAlat] = useState("")
  const [nomorUnit, setNomorUnit] = useState("")
  const [tanggalUji, setTanggalUji] = useState("")
  const [jangkaWaktuBulan, setJangkaWaktuBulan] = useState(24)
  const [statusKelayakan, setStatusKelayakan] = useState("Layak")
  const [temuan, setTemuan] = useState("")
  const [tindakLanjut, setTindakLanjut] = useState("")
  const [fotoBase64, setFotoBase64] = useState(null)
  const [pdfNama, setPdfNama] = useState("")
  const [pdfData, setPdfData] = useState(null)

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
      alert("Kolom Nama Perusahaan, Nama Unit, Jenis Alat, Nomor Unit, dan Tanggal Uji wajib diisi!")
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

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unitBaru),
    })

    alert("Unit berhasil ditambahkan!")

    setNamaPerusahaan("")
    setJenisSpip(PILIHAN_JENIS_SPIP[0])
    setNamaUnit("")
    setJenisAlat("")
    setNomorUnit("")
    setTanggalUji("")
    setJangkaWaktuBulan(24)
    setStatusKelayakan("Layak")
    setTemuan("")
    setTindakLanjut("")
    setFotoBase64(null)
    setPdfNama("")
    setPdfData(null)
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

  return (
    <div>
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
              onChange={(e) => setJenisSpip(e.target.value)}
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
            <input
              type="text"
              placeholder="Contoh: Excavator"
              value={jenisAlat}
              onChange={(e) => setJenisAlat(e.target.value)}
              className={inputClass}
            />
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
            {pdfNama && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">📄 {pdfNama}</p>}
          </div>
        </div>

        <button
          onClick={tambahUnit}
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded font-semibold"
        >
          Tambah Unit
        </button>
      </div>
    </div>
  )
}

export default InputData