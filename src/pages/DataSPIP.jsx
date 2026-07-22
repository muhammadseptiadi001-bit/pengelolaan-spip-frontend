import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  API_URL, PILIHAN_JENIS_SPIP,
  hitungJatuhTempo, hitungStatusWaktu, hitungSisaDetail, warnaKelayakan, formatTanggal
} from '../utils/spipHelpers'

function DataSPIP() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [fotoDipilih, setFotoDipilih] = useState(null)

  const [filter, setFilter] = useState({
    perusahaan: "",
    jenisSpip: "Semua",
    namaUnit: "",
    jenisAlat: "",
    nomorUnit: "",
    statusWaktu: "Semua",
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

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
  }

  async function updateStatusKelayakan(unit, statusBaru) {
    try {
      const res = await fetch(`${API_URL}/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKelayakan: statusBaru, tindakLanjut: unit.tindakLanjut || "" }),
      })
      if (!res.ok) throw new Error("Gagal update status")
      ambilData()
    } catch (err) {
      alert("Gagal mengubah status. Pastikan server backend sedang berjalan.")
      console.error(err)
    }
  }

  async function updateTindakLanjut(unit, tindakLanjutBaru) {
    try {
      const res = await fetch(`${API_URL}/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKelayakan: unit.statusKelayakan, tindakLanjut: tindakLanjutBaru }),
      })
      if (!res.ok) throw new Error("Gagal update tindak lanjut")
      ambilData()
    } catch (err) {
      alert("Gagal menyimpan tindak lanjut. Pastikan server backend sedang berjalan.")
      console.error(err)
    }
  }

  async function hapusUnit(unit) {
    const konfirmasi = window.confirm(
      `Yakin mau hapus data unit "${unit.namaUnit} (${unit.nomorUnit})"?\n\nData yang sudah dihapus tidak bisa dikembalikan.`
    )
    if (!konfirmasi) return

    try {
      const res = await fetch(`${API_URL}/${unit.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
      ambilData()
    } catch (err) {
      alert("Gagal menghapus data. Pastikan server backend sedang berjalan.")
      console.error(err)
    }
  }

  const dataTerfilter = useMemo(() => {
    return daftarUnit.filter((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      const statusWaktuUnit = hitungStatusWaktu(jatuhTempo).label

      const cocokPerusahaan = unit.namaPerusahaan?.toLowerCase().includes(filter.perusahaan.toLowerCase())
      const cocokJenisSpip = filter.jenisSpip === "Semua" || unit.jenisSpip === filter.jenisSpip
      const cocokNamaUnit = unit.namaUnit?.toLowerCase().includes(filter.namaUnit.toLowerCase())
      const cocokJenisAlat = unit.jenisAlat?.toLowerCase().includes(filter.jenisAlat.toLowerCase())
      const cocokNomorUnit = unit.nomorUnit?.toLowerCase().includes(filter.nomorUnit.toLowerCase())
      const cocokStatusWaktu = filter.statusWaktu === "Semua" || statusWaktuUnit === filter.statusWaktu
      const cocokStatusKelayakan = filter.statusKelayakan === "Semua" || unit.statusKelayakan === filter.statusKelayakan

      return cocokPerusahaan && cocokJenisSpip && cocokNamaUnit && cocokJenisAlat && cocokNomorUnit && cocokStatusWaktu && cocokStatusKelayakan
    })
  }, [daftarUnit, filter])

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
        "Tindak Lanjut Perbaikan": unit.tindakLanjut || "-",
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data SPIP")
    XLSX.writeFile(workbook, "data-pengelolaan-spip.xlsx")
  }

  const filterInputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-2 py-1 text-sm font-normal"

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Data SPIP</h1>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md dark:shadow-none dark:border dark:border-gray-800 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Daftar SPIP</h2>

          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
          >
            ⬇️ Download Excel
          </button>
        </div>

        {daftarUnit.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Belum ada unit yang diinput.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Perusahaan</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Jenis SPIP</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Nama Unit</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Jenis Alat</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Nomor Unit</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Tanggal Uji</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Jatuh Tempo</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Sisa Waktu</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Status Waktu</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Status Kelayakan</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Temuan</th>
                <th className="py-2 pr-3 min-w-[220px] text-gray-800 dark:text-white">Tindak Lanjut Perbaikan</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Foto</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">PDF</th>
                <th className="py-2 pr-3 text-gray-800 dark:text-white">Aksi</th>
              </tr>
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="py-2 pr-3">
                  <input type="text" placeholder="Cari..." value={filter.perusahaan}
                    onChange={(e) => updateFilter("perusahaan", e.target.value)}
                    className={filterInputClass} />
                </th>
                <th className="py-2 pr-3">
                  <select value={filter.jenisSpip} onChange={(e) => updateFilter("jenisSpip", e.target.value)}
                    className={filterInputClass}>
                    <option value="Semua">Semua</option>
                    {PILIHAN_JENIS_SPIP.map((jenis) => (
                      <option key={jenis} value={jenis}>{jenis}</option>
                    ))}
                  </select>
                </th>
                <th className="py-2 pr-3">
                  <input type="text" placeholder="Cari..." value={filter.namaUnit}
                    onChange={(e) => updateFilter("namaUnit", e.target.value)}
                    className={filterInputClass} />
                </th>
                <th className="py-2 pr-3">
                  <input type="text" placeholder="Cari..." value={filter.jenisAlat}
                    onChange={(e) => updateFilter("jenisAlat", e.target.value)}
                    className={filterInputClass} />
                </th>
                <th className="py-2 pr-3">
                  <input type="text" placeholder="Cari..." value={filter.nomorUnit}
                    onChange={(e) => updateFilter("nomorUnit", e.target.value)}
                    className={filterInputClass} />
                </th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3">
                  <select value={filter.statusWaktu} onChange={(e) => updateFilter("statusWaktu", e.target.value)}
                    className={filterInputClass}>
                    <option value="Semua">Semua</option>
                    <option value="Aman">Aman</option>
                    <option value="Mendekati Jatuh Tempo">Mendekati Jatuh Tempo</option>
                    <option value="Sudah Lewat">Sudah Lewat</option>
                  </select>
                </th>
                <th className="py-2 pr-3">
                  <select value={filter.statusKelayakan} onChange={(e) => updateFilter("statusKelayakan", e.target.value)}
                    className={filterInputClass}>
                    <option value="Semua">Semua</option>
                    <option value="Layak">Layak</option>
                    <option value="Tidak Layak">Tidak Layak</option>
                    <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                  </select>
                </th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {dataTerfilter.length === 0 ? (
                <tr>
                  <td colSpan="15" className="py-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data yang cocok dengan filter.</td>
                </tr>
              ) : (
                dataTerfilter.map((unit) => {
                  const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
                  const statusWaktu = hitungStatusWaktu(jatuhTempo)

                  return (
                    <tr key={unit.id} className="border-b border-gray-200 dark:border-gray-800 align-top text-gray-800 dark:text-gray-200">
                      <td className="py-2 pr-3">{unit.namaPerusahaan}</td>
                      <td className="py-2 pr-3">{unit.jenisSpip}</td>
                      <td className="py-2 pr-3">{unit.namaUnit}</td>
                      <td className="py-2 pr-3">{unit.jenisAlat}</td>
                      <td className="py-2 pr-3">{unit.nomorUnit}</td>
                      <td className="py-2 pr-3">{formatTanggal(new Date(unit.tanggalUjiTerakhir))}</td>
                      <td className="py-2 pr-3">{formatTanggal(jatuhTempo)}</td>
                      <td className="py-2 pr-3">{hitungSisaDetail(jatuhTempo)}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${statusWaktu.warna}`}>{statusWaktu.label}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={unit.statusKelayakan}
                          onChange={(e) => updateStatusKelayakan(unit, e.target.value)}
                          className={`px-2 py-1 rounded text-sm font-medium border-0 ${warnaKelayakan(unit.statusKelayakan)}`}
                        >
                          <option value="Layak">Layak</option>
                          <option value="Tidak Layak">Tidak Layak</option>
                          <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3 max-w-xs">{unit.temuan ? unit.temuan : <span className="text-gray-400 dark:text-gray-500">-</span>}</td>
                      <td className="py-2 pr-3 min-w-[220px]">
                        <textarea
                          defaultValue={unit.tindakLanjut || ""}
                          placeholder="Belum ada tindak lanjut..."
                          onBlur={(e) => updateTindakLanjut(unit, e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded px-2 py-1 text-sm"
                          rows="2"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        {unit.foto ? (
                          <span onClick={() => setFotoDipilih(unit.foto)} className="text-2xl cursor-pointer">🖼️</span>
                        ) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </td>
                      <td className="py-2 pr-3">
                        {unit.pdfData ? (
                          <a href={unit.pdfData} download={unit.pdfNama} className="text-2xl" title={unit.pdfNama}>📄</a>
                        ) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => hapusUnit(unit)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {fotoDipilih && (
        <div
          onClick={() => setFotoDipilih(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer"
        >
          <img src={fotoDipilih} alt="Foto Temuan" className="max-w-2xl max-h-[80vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  )
}

export default DataSPIP