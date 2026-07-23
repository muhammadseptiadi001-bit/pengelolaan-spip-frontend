import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import {
  Download, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, Trash2
} from 'lucide-react'
import {
  API_URL, PILIHAN_JENIS_SPIP, PILIHAN_JENIS_ALAT, SEMUA_JENIS_ALAT,
  hitungJatuhTempo, hitungStatusWaktu, hitungSisaDetail, warnaKelayakan, formatTanggal
} from '../utils/spipHelpers'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

const ITEM_PER_HALAMAN = 10

function ikonStatusWaktu(label) {
  if (label === "Aman") return <CheckCircle2 size={14} />
  if (label === "Mendekati Jatuh Tempo") return <Clock size={14} />
  return <XCircle size={14} />
}

function ikonStatusKelayakan(status) {
  if (status === "Layak") return <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
  if (status === "Tidak Layak") return <XCircle size={16} className="text-red-600 dark:text-red-400" />
  return <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
}

function DataSPIP() {
  const [daftarUnit, setDaftarUnit] = useState([])
  const [fotoDipilih, setFotoDipilih] = useState(null)
  const [halaman, setHalaman] = useState(1)

  const [filter, setFilter] = useState({
    perusahaan: "",
    jenisSpip: "Semua",
    namaUnit: "",
    jenisAlat: "Semua",
    nomorUnit: "",
    statusWaktu: "Semua",
    statusKelayakan: "Semua",
  })

  useEffect(() => {
    ambilData()
  }, [])

  useEffect(() => {
    setHalaman(1)
  }, [filter])

  async function ambilData() {
    try {
      const response = await apiFetch(API_URL)
      const data = await response.json()
      setDaftarUnit(data)
    } catch (err) {
      console.error(err)
    }
  }

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
  }

  function updateFilterJenisSpip(kategoriBaru) {
    setFilter((prev) => ({ ...prev, jenisSpip: kategoriBaru, jenisAlat: "Semua" }))
  }

  const pilihanJenisAlatFilter = filter.jenisSpip === "Semua"
    ? SEMUA_JENIS_ALAT
    : PILIHAN_JENIS_ALAT[filter.jenisSpip]

  async function updateStatusKelayakan(unit, statusBaru) {
    try {
      const res = await apiFetch(`${API_URL}/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKelayakan: statusBaru, tindakLanjut: unit.tindakLanjut || "" }),
      })
      if (!res.ok) throw new Error("Gagal update status")
      tampilkanToast("Status kelayakan berhasil diubah.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal mengubah status. Pastikan server backend sedang berjalan.", "gagal")
    }
  }

  async function updateTindakLanjut(unit, tindakLanjutBaru) {
    try {
      const res = await apiFetch(`${API_URL}/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKelayakan: unit.statusKelayakan, tindakLanjut: tindakLanjutBaru }),
      })
      if (!res.ok) throw new Error("Gagal update tindak lanjut")
      tampilkanToast("Tindak lanjut berhasil disimpan.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menyimpan tindak lanjut. Pastikan server backend sedang berjalan.", "gagal")
    }
  }

  async function hapusUnit(unit) {
    const konfirmasi = window.confirm(
      `Yakin mau hapus data unit "${unit.namaUnit} (${unit.nomorUnit})"?\n\nData yang sudah dihapus tidak bisa dikembalikan.`
    )
    if (!konfirmasi) return

    try {
      const res = await apiFetch(`${API_URL}/${unit.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
      tampilkanToast("Unit berhasil dihapus.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menghapus data. Pastikan server backend sedang berjalan.", "gagal")
    }
  }

  const dataTerfilter = useMemo(() => {
    return daftarUnit.filter((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      const statusWaktuUnit = hitungStatusWaktu(jatuhTempo).label

      const cocokPerusahaan = unit.namaPerusahaan?.toLowerCase().includes(filter.perusahaan.toLowerCase())
      const cocokJenisSpip = filter.jenisSpip === "Semua" || unit.jenisSpip === filter.jenisSpip
      const cocokNamaUnit = unit.namaUnit?.toLowerCase().includes(filter.namaUnit.toLowerCase())
      const cocokJenisAlat = filter.jenisAlat === "Semua" || unit.jenisAlat === filter.jenisAlat
      const cocokNomorUnit = unit.nomorUnit?.toLowerCase().includes(filter.nomorUnit.toLowerCase())
      const cocokStatusWaktu = filter.statusWaktu === "Semua" || statusWaktuUnit === filter.statusWaktu
      const cocokStatusKelayakan = filter.statusKelayakan === "Semua" || unit.statusKelayakan === filter.statusKelayakan

      return cocokPerusahaan && cocokJenisSpip && cocokNamaUnit && cocokJenisAlat && cocokNomorUnit && cocokStatusWaktu && cocokStatusKelayakan
    })
  }, [daftarUnit, filter])

  const totalHalaman = Math.max(1, Math.ceil(dataTerfilter.length / ITEM_PER_HALAMAN))

  const dataHalamanIni = useMemo(() => {
    const mulai = (halaman - 1) * ITEM_PER_HALAMAN
    return dataTerfilter.slice(mulai, mulai + ITEM_PER_HALAMAN)
  }, [dataTerfilter, halaman])

  function keHalamanSebelumnya() {
    setHalaman((h) => Math.max(1, h - 1))
  }

  function keHalamanBerikutnya() {
    setHalaman((h) => Math.min(totalHalaman, h + 1))
  }

  function exportExcel() {
    const dataUntukExcel = dataTerfilter.map((unit) => {
      const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
      return {
        "Nama Perusahaan": unit.namaPerusahaan,
        "Kategori SPIP": unit.jenisSpip,
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

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold flex items-center gap-2"
          >
            <Download size={16} /> Download Excel
          </motion.button>
        </div>

        {daftarUnit.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Belum ada unit yang diinput.</p>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700">
                  <th className="py-2 pr-3 text-gray-800 dark:text-white">Perusahaan</th>
                  <th className="py-2 pr-3 text-gray-800 dark:text-white">Kategori SPIP</th>
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
                    <select value={filter.jenisSpip} onChange={(e) => updateFilterJenisSpip(e.target.value)}
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
                    <select value={filter.jenisAlat} onChange={(e) => updateFilter("jenisAlat", e.target.value)}
                      className={filterInputClass}>
                      <option value="Semua">Semua</option>
                      {pilihanJenisAlatFilter.map((alat) => (
                        <option key={alat} value={alat}>{alat}</option>
                      ))}
                    </select>
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
                {dataHalamanIni.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="py-4 text-center text-gray-500 dark:text-gray-400">Tidak ada data yang cocok dengan filter.</td>
                  </tr>
                ) : (
                  dataHalamanIni.map((unit, index) => {
                    const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
                    const statusWaktu = hitungStatusWaktu(jatuhTempo)

                    return (
                      <motion.tr
                        key={unit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ backgroundColor: "rgba(234, 179, 8, 0.05)" }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.6) }}
                        className="border-b border-gray-200 dark:border-gray-800 align-top text-gray-800 dark:text-gray-200"
                      >
                        <td className="py-2 pr-3">{unit.namaPerusahaan}</td>
                        <td className="py-2 pr-3">{unit.jenisSpip}</td>
                        <td className="py-2 pr-3">{unit.namaUnit}</td>
                        <td className="py-2 pr-3">{unit.jenisAlat}</td>
                        <td className="py-2 pr-3">{unit.nomorUnit}</td>
                        <td className="py-2 pr-3">{formatTanggal(new Date(unit.tanggalUjiTerakhir))}</td>
                        <td className="py-2 pr-3">{formatTanggal(jatuhTempo)}</td>
                        <td className="py-2 pr-3">{hitungSisaDetail(jatuhTempo)}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${statusWaktu.warna}`}>
                            {ikonStatusWaktu(statusWaktu.label)}
                            {statusWaktu.label}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            {ikonStatusKelayakan(unit.statusKelayakan)}
                            <select
                              value={unit.statusKelayakan}
                              onChange={(e) => updateStatusKelayakan(unit, e.target.value)}
                              className={`px-2 py-1 rounded text-sm font-medium border-0 ${warnaKelayakan(unit.statusKelayakan)}`}
                            >
                              <option value="Layak">Layak</option>
                              <option value="Tidak Layak">Tidak Layak</option>
                              <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                            </select>
                          </div>
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
                            <button onClick={() => setFotoDipilih(unit.foto)} className="text-gray-600 dark:text-gray-300 hover:text-yellow-500">
                              <ImageIcon size={20} />
                            </button>
                          ) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                        </td>
                        <td className="py-2 pr-3">
                          {unit.pdfData ? (
                            <a href={unit.pdfData} download={unit.pdfNama} title={unit.pdfNama} className="text-gray-600 dark:text-gray-300 hover:text-yellow-500 inline-block">
                              <FileText size={20} />
                            </a>
                          ) : <span className="text-gray-400 dark:text-gray-500">-</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => hapusUnit(unit)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Hapus
                          </motion.button>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {dataTerfilter.length === 0 ? 0 : (halaman - 1) * ITEM_PER_HALAMAN + 1}–{Math.min(halaman * ITEM_PER_HALAMAN, dataTerfilter.length)} dari {dataTerfilter.length} data
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={keHalamanSebelumnya}
                  disabled={halaman === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed dark:text-white"
                >
                  ← Sebelumnya
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">Halaman {halaman} dari {totalHalaman}</span>
                <button
                  onClick={keHalamanBerikutnya}
                  disabled={halaman === totalHalaman}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed dark:text-white"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          </>
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