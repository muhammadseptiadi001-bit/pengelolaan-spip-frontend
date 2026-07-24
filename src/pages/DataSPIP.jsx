import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import {
  Download, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, Trash2,
  ClipboardList, ChevronLeft, ChevronRight
} from 'lucide-react'
import {
  API_URL, PILIHAN_JENIS_SPIP, PILIHAN_JENIS_ALAT, SEMUA_JENIS_ALAT,
  hitungJatuhTempo, hitungStatusWaktu, hitungSisaDetail, warnaKelayakan, formatTanggal
} from '../utils/spipHelpers'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

const ITEM_PER_HALAMAN = 10

function ikonStatusWaktu(label) {
  if (label === "Aman") return <CheckCircle2 size={13} />
  if (label === "Mendekati Jatuh Tempo") return <Clock size={13} />
  return <XCircle size={13} />
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
    if (statusBaru === unit.statusKelayakan) return

    const konfirmasi = window.confirm(
      `Ubah status kelayakan "${unit.namaUnit} (${unit.nomorUnit})" dari "${unit.statusKelayakan}" menjadi "${statusBaru}"?`
    )
    if (!konfirmasi) return

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

  const filterInputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400/50"

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Data SPIP</h1>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-700 dark:to-black shadow-md">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Daftar SPIP</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">{dataTerfilter.length} unit terdaftar</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={exportExcel}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-md shadow-green-500/20"
          >
            <Download size={16} /> Download Excel
          </motion.button>
        </div>

        {daftarUnit.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Belum ada unit yang diinput.</p>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kategori SPIP</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama Unit</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jenis Alat</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nomor Unit</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal Uji</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sisa Waktu</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status Waktu</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status Kelayakan</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Temuan</th>
                    <th className="py-2.5 px-3 min-w-[220px] text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tindak Lanjut</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Foto</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">PDF</th>
                    <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <th className="py-2 px-3">
                      <input type="text" placeholder="Cari..." value={filter.perusahaan}
                        onChange={(e) => updateFilter("perusahaan", e.target.value)}
                        className={filterInputClass} />
                    </th>
                    <th className="py-2 px-3">
                      <select value={filter.jenisSpip} onChange={(e) => updateFilterJenisSpip(e.target.value)}
                        className={filterInputClass}>
                        <option value="Semua">Semua</option>
                        {PILIHAN_JENIS_SPIP.map((jenis) => (
                          <option key={jenis} value={jenis}>{jenis}</option>
                        ))}
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input type="text" placeholder="Cari..." value={filter.namaUnit}
                        onChange={(e) => updateFilter("namaUnit", e.target.value)}
                        className={filterInputClass} />
                    </th>
                    <th className="py-2 px-3">
                      <select value={filter.jenisAlat} onChange={(e) => updateFilter("jenisAlat", e.target.value)}
                        className={filterInputClass}>
                        <option value="Semua">Semua</option>
                        {pilihanJenisAlatFilter.map((alat) => (
                          <option key={alat} value={alat}>{alat}</option>
                        ))}
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input type="text" placeholder="Cari..." value={filter.nomorUnit}
                        onChange={(e) => updateFilter("nomorUnit", e.target.value)}
                        className={filterInputClass} />
                    </th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3">
                      <select value={filter.statusWaktu} onChange={(e) => updateFilter("statusWaktu", e.target.value)}
                        className={filterInputClass}>
                        <option value="Semua">Semua</option>
                        <option value="Aman">Aman</option>
                        <option value="Mendekati Jatuh Tempo">Mendekati Jatuh Tempo</option>
                        <option value="Sudah Lewat">Sudah Lewat</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <select value={filter.statusKelayakan} onChange={(e) => updateFilter("statusKelayakan", e.target.value)}
                        className={filterInputClass}>
                        <option value="Semua">Semua</option>
                        <option value="Layak">Layak</option>
                        <option value="Tidak Layak">Tidak Layak</option>
                        <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                      </select>
                    </th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {dataHalamanIni.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="py-6 text-center text-gray-500 dark:text-gray-400">Tidak ada data yang cocok dengan filter.</td>
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
                          className="border-b border-gray-100 dark:border-gray-800/60 align-top text-gray-800 dark:text-gray-200"
                        >
                          <td className="py-2.5 px-3">{unit.namaPerusahaan}</td>
                          <td className="py-2.5 px-3">{unit.jenisSpip}</td>
                          <td className="py-2.5 px-3">{unit.namaUnit}</td>
                          <td className="py-2.5 px-3">{unit.jenisAlat}</td>
                          <td className="py-2.5 px-3">{unit.nomorUnit}</td>
                          <td className="py-2.5 px-3">{formatTanggal(new Date(unit.tanggalUjiTerakhir))}</td>
                          <td className="py-2.5 px-3">{formatTanggal(jatuhTempo)}</td>
                          <td className="py-2.5 px-3">{hitungSisaDetail(jatuhTempo)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusWaktu.warna}`}>
                              {ikonStatusWaktu(statusWaktu.label)}
                              {statusWaktu.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {ikonStatusKelayakan(unit.statusKelayakan)}
                              <select
                                value={unit.statusKelayakan}
                                onChange={(e) => updateStatusKelayakan(unit, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 ${warnaKelayakan(unit.statusKelayakan)}`}
                              >
                                <option value="Layak">Layak</option>
                                <option value="Tidak Layak">Tidak Layak</option>
                                <option value="Layak Dengan Catatan">Layak Dengan Catatan</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">{unit.temuan ? unit.temuan : <span className="text-gray-400 dark:text-gray-500">-</span>}</td>
                          <td className="py-2.5 px-3 min-w-[220px]">
                            <textarea
                              defaultValue={unit.tindakLanjut || ""}
                              placeholder="Belum ada tindak lanjut..."
                              onBlur={(e) => updateTindakLanjut(unit, e.target.value)}
                              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                              rows="2"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            {unit.foto ? (
                              <button onClick={() => setFotoDipilih(unit.foto)} className="text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors">
                                <ImageIcon size={19} />
                              </button>
                            ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            {unit.pdfData ? (
                              <a href={unit.pdfData} download={unit.pdfNama} title={unit.pdfNama} className="text-gray-500 dark:text-gray-400 hover:text-yellow-500 inline-block transition-colors">
                                <FileText size={19} />
                              </a>
                            ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => hapusUnit(unit)}
                              className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-950 dark:hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={13} /> Hapus
                            </motion.button>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-300">{dataTerfilter.length === 0 ? 0 : (halaman - 1) * ITEM_PER_HALAMAN + 1}–{Math.min(halaman * ITEM_PER_HALAMAN, dataTerfilter.length)}</span> dari <span className="font-semibold text-gray-700 dark:text-gray-300">{dataTerfilter.length}</span> data
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: halaman === 1 ? 1 : 1.05 }}
                  whileTap={{ scale: halaman === 1 ? 1 : 0.95 }}
                  onClick={keHalamanSebelumnya}
                  disabled={halaman === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ChevronLeft size={16} />
                </motion.button>
                <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                  Halaman <span className="font-semibold">{halaman}</span> dari {totalHalaman}
                </span>
                <motion.button
                  whileHover={{ scale: halaman === totalHalaman ? 1 : 1.05 }}
                  whileTap={{ scale: halaman === totalHalaman ? 1 : 0.95 }}
                  onClick={keHalamanBerikutnya}
                  disabled={halaman === totalHalaman}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>

      {fotoDipilih && (
        <div
          onClick={() => setFotoDipilih(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
        >
          <img src={fotoDipilih} alt="Foto Temuan" className="max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}

export default DataSPIP