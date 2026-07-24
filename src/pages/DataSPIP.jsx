import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import {
  Download, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, Trash2,
  ClipboardList, ChevronLeft, ChevronRight, Printer, Tag, MoveHorizontal
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
  const [bisaScrollKanan, setBisaScrollKanan] = useState(true)
  const scrollRef = useRef(null)

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

  useEffect(() => {
    cekScroll()
  }, [daftarUnit, halaman])

  function cekScroll() {
    const el = scrollRef.current
    if (!el) return
    const bisaDigeser = el.scrollWidth > el.clientWidth + 4
    const sudahMentok = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setBisaScrollKanan(bisaDigeser && !sudahMentok)
  }

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

  function cetakUnit(unit) {
    const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
    const statusWaktu = hitungStatusWaktu(jatuhTempo)

    const jendelaCetak = window.open('', '_blank', 'width=850,height=1100')
    if (!jendelaCetak) {
      tampilkanToast("Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir browser.", "gagal")
      return
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Laporan Uji Kelayakan - ${unit.namaUnit} (${unit.nomorUnit})</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 32px; }
          .kop { text-align: center; border-bottom: 3px solid #1f2937; padding-bottom: 12px; margin-bottom: 20px; }
          .kop h1 { font-size: 18px; letter-spacing: 0.5px; }
          .kop p { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .info-cetak { font-size: 11px; color: #9ca3af; text-align: right; margin-bottom: 16px; }
          table.detail { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table.detail td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 13px; vertical-align: top; }
          table.detail td.label { width: 200px; font-weight: bold; background: #f9fafb; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; }
          .badge-layak { background: #dcfce7; color: #15803d; }
          .badge-tidak { background: #fee2e2; color: #b91c1c; }
          .badge-catatan { background: #fef9c3; color: #a16207; }
          .foto-temuan { max-width: 260px; border-radius: 6px; margin-top: 8px; border: 1px solid #d1d5db; }
          .ttd { display: flex; justify-content: space-between; margin-top: 60px; }
          .ttd div { text-align: center; width: 220px; }
          .ttd .garis { margin-top: 60px; border-top: 1px solid #1f2937; padding-top: 6px; font-size: 12px; }
          @media print {
            body { padding: 0 24px; }
          }
        </style>
      </head>
      <body>
        <div class="kop">
          <h1>LAPORAN UJI KELAYAKAN SISTEM PENGAMANAN INSTALASI PERTAMBANGAN (SPIP)</h1>
          <p>${unit.namaPerusahaan}</p>
        </div>
        <div class="info-cetak">Dicetak pada: ${new Date().toLocaleString("id-ID")}</div>

        <table class="detail">
          <tr><td class="label">Kategori SPIP</td><td>${unit.jenisSpip}</td></tr>
          <tr><td class="label">Jenis Alat</td><td>${unit.jenisAlat}</td></tr>
          <tr><td class="label">Nama/Model Unit</td><td>${unit.namaUnit}</td></tr>
          <tr><td class="label">Nomor Unit</td><td>${unit.nomorUnit}</td></tr>
          <tr><td class="label">Tanggal Uji Terakhir</td><td>${formatTanggal(new Date(unit.tanggalUjiTerakhir))}</td></tr>
          <tr><td class="label">Jangka Waktu Uji</td><td>${unit.jangkaWaktuBulan} bulan</td></tr>
          <tr><td class="label">Jatuh Tempo Berikutnya</td><td>${formatTanggal(jatuhTempo)}</td></tr>
          <tr><td class="label">Sisa Waktu</td><td>${hitungSisaDetail(jatuhTempo)}</td></tr>
          <tr><td class="label">Status Waktu</td><td>${statusWaktu.label}</td></tr>
          <tr><td class="label">Status Kelayakan</td><td>
            <span class="badge ${unit.statusKelayakan === "Layak" ? "badge-layak" : unit.statusKelayakan === "Tidak Layak" ? "badge-tidak" : "badge-catatan"}">${unit.statusKelayakan}</span>
          </td></tr>
          <tr><td class="label">Temuan</td><td>${unit.temuan ? unit.temuan.replace(/</g, "&lt;") : "-"}</td></tr>
          <tr><td class="label">Tindak Lanjut Perbaikan</td><td>${unit.tindakLanjut ? unit.tindakLanjut.replace(/</g, "&lt;") : "-"}</td></tr>
          <tr><td class="label">Dibuat Oleh</td><td>${unit.dibuatOleh || "-"}</td></tr>
          ${unit.foto ? `<tr><td class="label">Foto Temuan</td><td><img class="foto-temuan" src="${unit.foto}" /></td></tr>` : ""}
        </table>

        <div class="ttd">
          <div><div class="garis">Diperiksa Oleh</div></div>
          <div><div class="garis">Disetujui Oleh</div></div>
        </div>
      </body>
      </html>
    `

    jendelaCetak.document.write(html)
    jendelaCetak.document.close()
    jendelaCetak.onload = () => {
      jendelaCetak.focus()
      jendelaCetak.print()
    }
  }

  function cetakStiker(unit) {
    const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
    const statusWaktu = hitungStatusWaktu(jatuhTempo)

    const isiQr = `Nomor Unit: ${unit.nomorUnit} | Jatuh Tempo: ${formatTanggal(jatuhTempo)}`
    const urlQr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(isiQr)}`

    const jendelaCetak = window.open('', '_blank', 'width=500,height=650')
    if (!jendelaCetak) {
      tampilkanToast("Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir browser.", "gagal")
      return
    }

    const warnaBadge =
      statusWaktu.label === "Aman" ? "#15803d" :
      statusWaktu.label === "Mendekati Jatuh Tempo" ? "#a16207" : "#b91c1c"

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Stiker QR - ${unit.namaUnit} (${unit.nomorUnit})</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; display: flex; justify-content: center; padding: 20px; }
          .stiker {
            width: 8cm;
            border: 2px solid #1f2937;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
          }
          .stiker h2 { font-size: 12px; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
          .stiker img { width: 130px; height: 130px; margin: 6px auto; display: block; }
          .stiker .nomor { font-size: 15px; font-weight: bold; margin-top: 4px; }
          .stiker .tempo { font-size: 11px; color: #4b5563; margin-top: 2px; }
          .stiker .status {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: bold;
            color: #fff;
            background: ${warnaBadge};
          }
          .stiker .perusahaan { font-size: 9px; color: #9ca3af; margin-top: 6px; }
          @media print {
            body { padding: 0; }
            .stiker { border: 1px dashed #9ca3af; }
          }
        </style>
      </head>
      <body>
        <div class="stiker">
          <h2>Kartu Uji Kelayakan SPIP</h2>
          <img src="${urlQr}" alt="QR Code" />
          <div class="nomor">${unit.nomorUnit}</div>
          <div class="tempo">Jatuh Tempo: ${formatTanggal(jatuhTempo)}</div>
          <div class="status">${statusWaktu.label}</div>
          <div class="perusahaan">${unit.namaPerusahaan}</div>
        </div>
      </body>
      </html>
    `

    jendelaCetak.document.write(html)
    jendelaCetak.document.close()
    jendelaCetak.onload = () => {
      setTimeout(() => {
        jendelaCetak.focus()
        jendelaCetak.print()
      }, 300)
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

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800">
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
            <div className="flex items-center gap-1.5 mb-2 md:hidden text-gray-400 dark:text-gray-500">
              <MoveHorizontal size={13} />
              <span className="text-xs">Geser tabel ke kiri untuk lihat kolom lainnya</span>
            </div>

            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={cekScroll}
                className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto"
              >
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => cetakUnit(unit)}
                                  title="Cetak laporan unit ini"
                                  className="bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white dark:bg-blue-950 dark:hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Printer size={13} /> Cetak
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => cetakStiker(unit)}
                                  title="Cetak stiker QR untuk ditempel di unit"
                                  className="bg-purple-50 hover:bg-purple-500 text-purple-600 hover:text-white dark:bg-purple-950 dark:hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Tag size={13} /> Stiker
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => hapusUnit(unit)}
                                  className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-950 dark:hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 size={13} /> Hapus
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {bisaScrollKanan && (
                <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent rounded-r-xl"></div>
              )}
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