import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const API_URL = "http://localhost:3000/api/unit"

const PILIHAN_JANGKA_WAKTU = [
  { label: "5 Tahun", bulan: 60 },
  { label: "3 Tahun", bulan: 36 },
  { label: "1 Tahun", bulan: 12 },
  { label: "6 Bulan", bulan: 6 },
  { label: "3 Bulan", bulan: 3 },
]

const PILIHAN_JENIS_SPIP = ["Sarana Prasarana", "Instalasi", "Peralatan Pertambangan"]

function PengelolaanSPIP() {
  const [daftarUnit, setDaftarUnit] = useState([])

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [jenisSpip, setJenisSpip] = useState(PILIHAN_JENIS_SPIP[0])
  const [namaUnit, setNamaUnit] = useState("")
  const [jenisAlat, setJenisAlat] = useState("")
  const [nomorUnit, setNomorUnit] = useState("")
  const [tanggalUji, setTanggalUji] = useState("")
  const [jangkaWaktuBulan, setJangkaWaktuBulan] = useState(24)
  const [statusKelayakan, setStatusKelayakan] = useState("Layak")
  const [temuan, setTemuan] = useState("")
  const [fotoBase64, setFotoBase64] = useState(null)
  const [pdfNama, setPdfNama] = useState("")
  const [pdfData, setPdfData] = useState(null)

  const [fotoDipilih, setFotoDipilih] = useState(null)

  // State untuk filter per kolom
  const [filter, setFilter] = useState({
    perusahaan: "",
    jenisSpip: "Semua",
    namaUnit: "",
    jenisAlat: "",
    nomorUnit: "",
    statusKelayakan: "Semua",
  })

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    const response = await fetch(API_URL)
    const data = await response.json()
    setDaftarUnit(data)
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
      foto: fotoBase64,
      pdfNama,
      pdfData,
    }

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unitBaru),
    })

    ambilData()

    setNamaPerusahaan("")
    setJenisSpip(PILIHAN_JENIS_SPIP[0])
    setNamaUnit("")
    setJenisAlat("")
    setNomorUnit("")
    setTanggalUji("")
    setJangkaWaktuBulan(24)
    setStatusKelayakan("Layak")
    setTemuan("")
    setFotoBase64(null)
    setPdfNama("")
    setPdfData(null)
  }

  function hitungJatuhTempo(tanggalUjiTerakhir, bulan) {
    const tanggal = new Date(tanggalUjiTerakhir)
    tanggal.setMonth(tanggal.getMonth() + Number(bulan))
    return tanggal
  }

  function hitungStatusWaktu(jatuhTempo) {
    const sekarang = new Date()
    const selisihHari = (jatuhTempo - sekarang) / (1000 * 60 * 60 * 24)

    if (selisihHari < 0) return { label: "Sudah Lewat", warna: "bg-red-100 text-red-700" }
    if (selisihHari <= 30) return { label: "Mendekati Jatuh Tempo", warna: "bg-yellow-100 text-yellow-700" }
    return { label: "Aman", warna: "bg-green-100 text-green-700" }
  }

  function hitungSisaDetail(jatuhTempo) {
    const sekarang = new Date()
    if (jatuhTempo < sekarang) return "Sudah lewat tempo"

    let bulan = (jatuhTempo.getFullYear() - sekarang.getFullYear()) * 12 + (jatuhTempo.getMonth() - sekarang.getMonth())
    let hari = jatuhTempo.getDate() - sekarang.getDate()

    if (hari < 0) {
      bulan -= 1
      const hariDiBulanSebelumnya = new Date(jatuhTempo.getFullYear(), jatuhTempo.getMonth(), 0).getDate()
      hari += hariDiBulanSebelumnya
    }

    return `${hari} hari ${bulan} bulan`
  }

  function warnaKelayakan(status) {
    if (status === "Layak") return "bg-green-100 text-green-700"
    if (status === "Tidak Layak") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  function formatTanggal(tanggal) {
    return tanggal.toLocaleDateString("id-ID")
  }

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
  }

  // Data yang sudah difilter berdasarkan semua kolom filter aktif
  const dataTerfilter = useMemo(() => {
    return daftarUnit.filter((unit) => {
      const cocokPerusahaan = unit.namaPerusahaan?.toLowerCase().includes(filter.perusahaan.toLowerCase())
      const cocokJenisSpip = filter.jenisSpip === "Semua" || unit.jenisSpip === filter.jenisSpip
      const cocokNamaUnit = unit.namaUnit?.toLowerCase().includes(filter.namaUnit.toLowerCase())
      const cocokJenisAlat = unit.jenisAlat?.toLowerCase().includes(filter.jenisAlat.toLowerCase())
      const cocokNomorUnit = unit.nomorUnit?.toLowerCase().includes(filter.nomorUnit.toLowerCase())
      const cocokStatusKelayakan = filter.statusKelayakan === "Semua" || unit.statusKelayakan === filter.statusKelayakan

      return cocokPerusahaan && cocokJenisSpip && cocokNamaUnit && cocokJenisAlat && cocokNomorUnit && cocokStatusKelayakan
    })
  }, [daftarUnit, filter])

  const dataGrafik = useMemo(() => {
    const hitung = { "Layak": 0, "Tidak Layak": 0, "Layak Dengan Catatan": 0 }
    dataTerfilter.forEach((unit) => {
      if (hitung[unit.statusKelayakan] !== undefined) {
        hitung[unit.statusKelayakan] += 1
      }
    })
    return Object.entries(hitung).map(([nama, jumlah]) => ({ nama, jumlah }))
  }, [dataTerfilter])

  function exportExcel() {
    const dataUntukExcel = dataTerfilter.map((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      return {
        "Nama Perusahaan": unit.namaPerusahaan,
        "Jenis SPIP": unit.jenisSpip,
        "Nama Unit": unit.namaUnit,
        "Jenis Alat": unit.jenisAlat,
        "Nomor Unit": unit.nomorUnit,
        "Tanggal Uji Terakhir": formatTanggal(new Date(unit.tanggalUjiTerakhir)),
        "Jangka Waktu (Bulan)": unit.jangkaWaktuBulan,
        "Jatuh Tempo": formatTanggal(jatuhTempo),
        "Sisa Waktu": hitungSisaDetail(jatuhTempo),
        "Status Kelayakan": unit.statusKelayakan,
        "Temuan": unit.temuan || "-",
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data SPIP")
    XLSX.writeFile(workbook, "data-pengelolaan-spip.xlsx")
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pengelolaan SPIP</h1>

      {/* Form Input */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tambah Unit Alat</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
            <input
              type="text"
              placeholder="Contoh: PT Mitra Bor Nusantara"
              value={namaPerusahaan}
              onChange={(e) => setNamaPerusahaan(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis SPIP</label>
            <select
              value={jenisSpip}
              onChange={(e) => setJenisSpip(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {PILIHAN_JENIS_SPIP.map((jenis) => (
                <option key={jenis} value={jenis}>{jenis}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama/Model Unit</label>
            <input
              type="text"
              placeholder="Contoh: PC200"
              value={namaUnit}
              onChange={(e) => setNamaUnit(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Alat</label>
            <input
              type="text"
              placeholder="Contoh: Excavator"
              value={jenisAlat}
              onChange={(e) => setJenisAlat(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Unit</label>
            <input
              type="text"
              placeholder="Contoh: EXC-001"
              value={nomorUnit}
              onChange={(e) => setNomorUnit(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Uji Terakhir</label>
            <input
              type="date"
              value={tanggalUji}
              onChange={(e) => setTanggalUji(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jangka Waktu Uji Kelayakan</label>
            <select
              value={jangkaWaktuBulan}
              onChange={(e) => setJangkaWaktuBulan(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {PILIHAN_JANGKA_WAKTU.map((item) => (
                <option key={item.bulan} value={item.bulan}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Kelayakan</label>
            <select
              value={statusKelayakan}
              onChange={(e) => setStatusKelayakan(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="Layak">Layak</option>
              <option value="Tidak Layak">Tidak Layak</option>
              <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Temuan (jika ada)</label>
            <textarea
              placeholder="Contoh: Kebocoran oli hidrolik pada silinder boom"
              value={temuan}
              onChange={(e) => setTemuan(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto Temuan (opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {fotoBase64 && (
              <img src={fotoBase64} alt="Preview" className="mt-2 h-24 rounded border border-gray-300" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload File PDF (opsional)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {pdfNama && <p className="mt-1 text-sm text-gray-600">📄 {pdfNama}</p>}
          </div>
        </div>

        <button
          onClick={tambahUnit}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold"
        >
          Tambah Unit
        </button>
      </div>

      {/* Grafik */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Grafik Status Kelayakan</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataGrafik}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nama" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daftar SPIP */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Daftar SPIP</h2>

          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
          >
            ⬇️ Download Excel
          </button>
        </div>

        {daftarUnit.length === 0 ? (
          <p className="text-gray-500">Belum ada unit yang diinput.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2 pr-3">Perusahaan</th>
                <th className="py-2 pr-3">Jenis SPIP</th>
                <th className="py-2 pr-3">Nama Unit</th>
                <th className="py-2 pr-3">Jenis Alat</th>
                <th className="py-2 pr-3">Nomor Unit</th>
                <th className="py-2 pr-3">Tanggal Uji</th>
                <th className="py-2 pr-3">Jatuh Tempo</th>
                <th className="py-2 pr-3">Sisa Waktu</th>
                <th className="py-2 pr-3">Status Waktu</th>
                <th className="py-2 pr-3">Status Kelayakan</th>
                <th className="py-2 pr-3">Temuan</th>
                <th className="py-2 pr-3">Foto</th>
                <th className="py-2 pr-3">PDF</th>
              </tr>
              {/* Baris filter */}
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="py-2 pr-3">
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={filter.perusahaan}
                    onChange={(e) => updateFilter("perusahaan", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  />
                </th>
                <th className="py-2 pr-3">
                  <select
                    value={filter.jenisSpip}
                    onChange={(e) => updateFilter("jenisSpip", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  >
                    <option value="Semua">Semua</option>
                    {PILIHAN_JENIS_SPIP.map((jenis) => (
                      <option key={jenis} value={jenis}>{jenis}</option>
                    ))}
                  </select>
                </th>
                <th className="py-2 pr-3">
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={filter.namaUnit}
                    onChange={(e) => updateFilter("namaUnit", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  />
                </th>
                <th className="py-2 pr-3">
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={filter.jenisAlat}
                    onChange={(e) => updateFilter("jenisAlat", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  />
                </th>
                <th className="py-2 pr-3">
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={filter.nomorUnit}
                    onChange={(e) => updateFilter("nomorUnit", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  />
                </th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3">
                  <select
                    value={filter.statusKelayakan}
                    onChange={(e) => updateFilter("statusKelayakan", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-normal"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Layak">Layak</option>
                    <option value="Tidak Layak">Tidak Layak</option>
                    <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                  </select>
                </th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {dataTerfilter.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-4 text-center text-gray-500">
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                dataTerfilter.map((unit) => {
                  const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
                  const statusWaktu = hitungStatusWaktu(jatuhTempo)

                  return (
                    <tr key={unit.id} className="border-b border-gray-200 align-top">
                      <td className="py-2 pr-3">{unit.namaPerusahaan}</td>
                      <td className="py-2 pr-3">{unit.jenisSpip}</td>
                      <td className="py-2 pr-3">{unit.namaUnit}</td>
                      <td className="py-2 pr-3">{unit.jenisAlat}</td>
                      <td className="py-2 pr-3">{unit.nomorUnit}</td>
                      <td className="py-2 pr-3">{formatTanggal(new Date(unit.tanggalUjiTerakhir))}</td>
                      <td className="py-2 pr-3">{formatTanggal(jatuhTempo)}</td>
                      <td className="py-2 pr-3">{hitungSisaDetail(jatuhTempo)}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${statusWaktu.warna}`}>
                          {statusWaktu.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${warnaKelayakan(unit.statusKelayakan)}`}>
                          {unit.statusKelayakan}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-xs">
                        {unit.temuan ? unit.temuan : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 pr-3">
                        {unit.foto ? (
                          <span onClick={() => setFotoDipilih(unit.foto)} className="text-2xl cursor-pointer">🖼️</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {unit.pdfData ? (
                          <a href={unit.pdfData} download={unit.pdfNama} className="text-2xl" title={unit.pdfNama}>
                            📄
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Foto */}
      {fotoDipilih && (
        <div
          onClick={() => setFotoDipilih(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer"
        >
          <img
            src={fotoDipilih}
            alt="Foto Temuan"
            className="max-w-2xl max-h-[80vh] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

export default PengelolaanSPIP