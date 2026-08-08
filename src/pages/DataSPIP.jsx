import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ExcelJS from 'exceljs'
import {
  Download, Upload, CheckCircle2, XCircle, AlertCircle, Clock, ImageIcon, FileText, Trash2,
  ClipboardList, ChevronLeft, ChevronRight, Printer, Tag, MoveHorizontal, History, X, ArrowRight
} from 'lucide-react'
import {
  API_URL, PILIHAN_JENIS_SPIP, PILIHAN_JENIS_ALAT, SEMUA_JENIS_ALAT,
  hitungJatuhTempo, hitungStatusWaktu, hitungSisaDetail, warnaKelayakan, formatTanggal
} from '../utils/spipHelpers'
import { tampilkanToast } from '../utils/toast'
import { apiFetch } from '../utils/apiFetch'

const ITEM_PER_HALAMAN = 10

const FILTER_AWAL = {
  perusahaan: "",
  jenisSpip: "Semua",
  namaUnit: "",
  jenisAlat: "Semua",
  nomorUnit: "",
  statusWaktu: "Semua",
  statusKelayakan: "Semua",
}

// Sama dengan pilihan status kompetensi yang dipakai di InputData.jsx, supaya konsisten
// saat unit diedit langsung dari tabel Data SPIP.
const PILIHAN_STATUS_KOMPETENSI = ["Bersertifikat / Kompeten", "Belum Bersertifikat"]

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

function warnaBadgeStatus(status) {
  if (status === "Layak") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (status === "Tidak Layak") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
}

function formatTanggalWaktu(tanggal) {
  return new Date(tanggal).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

function parseTanggalIndo(teks) {
  if (!teks) return null
  const bagian = String(teks).trim().split('/')
  if (bagian.length !== 3) return null
  const [hari, bulan, tahun] = bagian
  const hariPad = hari.padStart(2, "0")
  const bulanPad = bulan.padStart(2, "0")
  return `${tahun}-${bulanPad}-${hariPad}`
}

// Susun query string dari filter aktif untuk dikirim ke backend
function bangunQueryFilter(filter) {
  const params = new URLSearchParams()
  if (filter.perusahaan) params.set("perusahaan", filter.perusahaan)
  if (filter.jenisSpip !== "Semua") params.set("jenisSpip", filter.jenisSpip)
  if (filter.namaUnit) params.set("namaUnit", filter.namaUnit)
  if (filter.jenisAlat !== "Semua") params.set("jenisAlat", filter.jenisAlat)
  if (filter.nomorUnit) params.set("nomorUnit", filter.nomorUnit)
  if (filter.statusWaktu !== "Semua") params.set("statusWaktu", filter.statusWaktu)
  if (filter.statusKelayakan !== "Semua") params.set("statusKelayakan", filter.statusKelayakan)
  return params
}

function DataSPIP() {
  // Baca parameter URL "nomorUnit" (misal ?nomorUnit=EXC-001) supaya kalau user datang
  // dari tombol "Tindak Lanjuti" di halaman Evaluasi, filter tabel langsung terisi
  // dan baris unit yang bermasalah langsung kelihatan tanpa perlu dicari manual.
  const [searchParams] = useSearchParams()

  const [daftarUnit, setDaftarUnit] = useState([])
  const [totalData, setTotalData] = useState(0)
  const [totalHalaman, setTotalHalaman] = useState(1)
  const [sedangMuatData, setSedangMuatData] = useState(true)

  const [fotoDipilih, setFotoDipilih] = useState(null)
  const [halaman, setHalaman] = useState(1)
  const [bisaScrollKanan, setBisaScrollKanan] = useState(true)
  const [sedangExport, setSedangExport] = useState(false)
  const [sedangImport, setSedangImport] = useState(false)
  const scrollRef = useRef(null)
  const inputFileRef = useRef(null)
  const belumPernahMuat = useRef(true)

  const [unitRiwayatDipilih, setUnitRiwayatDipilih] = useState(null)
  const [daftarRiwayatUnit, setDaftarRiwayatUnit] = useState([])
  const [sedangMuatRiwayat, setSedangMuatRiwayat] = useState(false)

  const [filter, setFilter] = useState(() => {
    const nomorUnitDariUrl = searchParams.get("nomorUnit")
    return nomorUnitDariUrl ? { ...FILTER_AWAL, nomorUnit: nomorUnitDariUrl } : FILTER_AWAL
  })

  const ambilData = useCallback(async () => {
    setSedangMuatData(true)
    try {
      const params = bangunQueryFilter(filter)
      params.set("halaman", halaman)
      params.set("batas", ITEM_PER_HALAMAN)

      const response = await apiFetch(`${API_URL}?${params.toString()}`)
      const hasil = await response.json()
      setDaftarUnit(hasil.data || [])
      setTotalData(hasil.totalData || 0)
      setTotalHalaman(hasil.totalHalaman || 1)
    } catch (err) {
      console.error(err)
      tampilkanToast("Gagal mengambil data. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangMuatData(false)
    }
  }, [filter, halaman])

  // Ambil data dari backend tiap filter atau halaman berubah.
  // Request pertama langsung jalan; perubahan berikutnya di-debounce 400ms
  // supaya tidak nembak request tiap kali user mengetik di kolom filter.
  useEffect(() => {
    if (belumPernahMuat.current) {
      belumPernahMuat.current = false
      ambilData()
      return
    }
    const timer = setTimeout(() => {
      ambilData()
    }, 400)
    return () => clearTimeout(timer)
  }, [ambilData])

  useEffect(() => {
    cekScroll()
  }, [daftarUnit])

  function cekScroll() {
    const el = scrollRef.current
    if (!el) return
    const bisaDigeser = el.scrollWidth > el.clientWidth + 4
    const sudahMentok = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setBisaScrollKanan(bisaDigeser && !sudahMentok)
  }

  // Ambil SEMUA data yang cocok filter (tanpa pagination), khusus untuk export Excel
  async function ambilSemuaUntukExport() {
    const params = bangunQueryFilter(filter)
    params.set("semua", "true")
    const response = await apiFetch(`${API_URL}?${params.toString()}`)
    if (!response.ok) throw new Error("Gagal mengambil data untuk export")
    const hasil = await response.json()
    return hasil.data || []
  }

  function updateFilter(kolom, nilai) {
    setFilter((prev) => ({ ...prev, [kolom]: nilai }))
    setHalaman(1)
  }

  function updateFilterJenisSpip(kategoriBaru) {
    setFilter((prev) => ({ ...prev, jenisSpip: kategoriBaru, jenisAlat: "Semua" }))
    setHalaman(1)
  }

  const pilihanJenisAlatFilter = filter.jenisSpip === "Semua"
    ? SEMUA_JENIS_ALAT
    : PILIHAN_JENIS_ALAT[filter.jenisSpip]

  // Fungsi umum untuk update unit lewat PUT /api/unit/:id. Backend meng-update
  // 4 kolom sekaligus (statusKelayakan, tindakLanjut, namaPetugas, statusKompetensi),
  // jadi setiap pemanggilan wajib mengirim nilai TERBARU untuk keempatnya —
  // "perubahan" hanya berisi field yang benar-benar diubah, sisanya diambil dari data unit saat ini
  // supaya field lain tidak ikut ke-reset jadi kosong/null.
  async function perbaruiUnit(unit, perubahan, pesanSukses, pesanGagal) {
    const payload = {
      statusKelayakan: unit.statusKelayakan,
      tindakLanjut: unit.tindakLanjut || "",
      namaPetugas: unit.namaPetugas || "",
      statusKompetensi: unit.statusKompetensi || "Belum Bersertifikat",
      ...perubahan,
    }

    try {
      const res = await apiFetch(`${API_URL}/${unit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Gagal update")
      tampilkanToast(pesanSukses, "sukses")
      ambilData()
    } catch (err) {
      console.error(err)
      tampilkanToast(pesanGagal, "gagal")
    }
  }

  async function updateStatusKelayakan(unit, statusBaru) {
    if (statusBaru === unit.statusKelayakan) return

    const konfirmasi = window.confirm(
      `Ubah status kelayakan "${unit.namaUnit} (${unit.nomorUnit})" dari "${unit.statusKelayakan}" menjadi "${statusBaru}"?`
    )
    if (!konfirmasi) return

    perbaruiUnit(
      unit,
      { statusKelayakan: statusBaru },
      "Status kelayakan berhasil diubah.",
      "Gagal mengubah status. Pastikan server backend sedang berjalan."
    )
  }

  async function updateTindakLanjut(unit, tindakLanjutBaru) {
    perbaruiUnit(
      unit,
      { tindakLanjut: tindakLanjutBaru },
      "Tindak lanjut berhasil disimpan.",
      "Gagal menyimpan tindak lanjut. Pastikan server backend sedang berjalan."
    )
  }

  async function updateNamaPetugas(unit, namaPetugasBaru) {
    if (namaPetugasBaru === (unit.namaPetugas || "")) return
    perbaruiUnit(
      unit,
      { namaPetugas: namaPetugasBaru },
      "Nama petugas berhasil disimpan.",
      "Gagal menyimpan nama petugas. Pastikan server backend sedang berjalan."
    )
  }

  async function updateStatusKompetensi(unit, statusBaru) {
    if (statusBaru === (unit.statusKompetensi || "Belum Bersertifikat")) return
    perbaruiUnit(
      unit,
      { statusKompetensi: statusBaru },
      "Status kompetensi berhasil diubah.",
      "Gagal mengubah status kompetensi. Pastikan server backend sedang berjalan."
    )
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
      console.error(err)
      tampilkanToast("Gagal menghapus data. Pastikan server backend sedang berjalan.", "gagal")
    }
  }

  async function lihatRiwayat(unit) {
    setUnitRiwayatDipilih(unit)
    setSedangMuatRiwayat(true)
    setDaftarRiwayatUnit([])
    try {
      const res = await apiFetch(`${API_URL.replace('/api/unit', '')}/api/riwayat/unit/${unit.id}`)
      const data = await res.json()
      setDaftarRiwayatUnit(data)
    } catch (err) {
      console.error(err)
      tampilkanToast("Gagal mengambil riwayat unit.", "gagal")
    } finally {
      setSedangMuatRiwayat(false)
    }
  }

  function tutupRiwayat() {
    setUnitRiwayatDipilih(null)
    setDaftarRiwayatUnit([])
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
          <tr><td class="label">Nama Petugas</td><td>${unit.namaPetugas || "-"}</td></tr>
          <tr><td class="label">Status Kompetensi</td><td>${unit.statusKompetensi || "-"}</td></tr>
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

  function keHalamanSebelumnya() {
    setHalaman((h) => Math.max(1, h - 1))
  }

  function keHalamanBerikutnya() {
    setHalaman((h) => Math.min(totalHalaman, h + 1))
  }

  async function exportExcel() {
    setSedangExport(true)
    try {
      const dataUntukExport = await ambilSemuaUntukExport()

      const workbook = new ExcelJS.Workbook()
      workbook.creator = "Pengelolaan SPIP"
      workbook.created = new Date()

      const sheet = workbook.addWorksheet("Data SPIP", {
        views: [{ state: "frozen", ySplit: 1 }],
      })

      sheet.columns = [
        { header: "Nama Perusahaan", key: "namaPerusahaan", width: 24 },
        { header: "Kategori SPIP", key: "jenisSpip", width: 18 },
        { header: "Nama Unit", key: "namaUnit", width: 20 },
        { header: "Jenis Alat", key: "jenisAlat", width: 24 },
        { header: "Nomor Unit", key: "nomorUnit", width: 16 },
        { header: "Tanggal Uji Terakhir", key: "tanggalUji", width: 18 },
        { header: "Jangka Waktu (Bulan)", key: "jangkaWaktu", width: 16 },
        { header: "Jatuh Tempo", key: "jatuhTempo", width: 18 },
        { header: "Sisa Waktu", key: "sisaWaktu", width: 22 },
        { header: "Status Kelayakan", key: "statusKelayakan", width: 18 },
        { header: "Nama Petugas", key: "namaPetugas", width: 22 },
        { header: "Status Kompetensi", key: "statusKompetensi", width: 20 },
        { header: "Temuan", key: "temuan", width: 32 },
        { header: "Tindak Lanjut Perbaikan", key: "tindakLanjut", width: 32 },
      ]

      dataUntukExport.forEach((unit) => {
        const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
        sheet.addRow({
          namaPerusahaan: unit.namaPerusahaan,
          jenisSpip: unit.jenisSpip,
          namaUnit: unit.namaUnit,
          jenisAlat: unit.jenisAlat,
          nomorUnit: unit.nomorUnit,
          tanggalUji: formatTanggal(new Date(unit.tanggalUjiTerakhir)),
          jangkaWaktu: unit.jangkaWaktuBulan,
          jatuhTempo: formatTanggal(jatuhTempo),
          sisaWaktu: hitungSisaDetail(jatuhTempo),
          statusKelayakan: unit.statusKelayakan,
          namaPetugas: unit.namaPetugas || "-",
          statusKompetensi: unit.statusKompetensi || "-",
          temuan: unit.temuan || "-",
          tindakLanjut: unit.tindakLanjut || "-",
        })
      })

      const headerRow = sheet.getRow(1)
      headerRow.height = 24
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } }
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
        cell.border = {
          top: { style: "thin", color: { argb: "FF374151" } },
          left: { style: "thin", color: { argb: "FF374151" } },
          bottom: { style: "thin", color: { argb: "FF374151" } },
          right: { style: "thin", color: { argb: "FF374151" } },
        }
      })

      const warnaStatus = {
        "Layak": "FFDCFCE7",
        "Tidak Layak": "FFFEE2E2",
        "Layak Dengan Catatan": "FFFEF9C3",
      }
      const warnaTeksStatus = {
        "Layak": "FF15803D",
        "Tidak Layak": "FFB91C1C",
        "Layak Dengan Catatan": "FFA16207",
      }

      sheet.eachRow((row, nomorBaris) => {
        if (nomorBaris === 1) return
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          }
          cell.alignment = { vertical: "middle", wrapText: true }
        })

        const selStatus = row.getCell("statusKelayakan")
        const status = selStatus.value
        if (warnaStatus[status]) {
          selStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: warnaStatus[status] } }
          selStatus.font = { bold: true, color: { argb: warnaTeksStatus[status] } }
          selStatus.alignment = { vertical: "middle", horizontal: "center" }
        }

        if (nomorBaris % 2 === 0) {
          row.eachCell((cell) => {
            if (cell.address !== selStatus.address) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } }
            }
          })
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `data-pengelolaan-spip-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)

      tampilkanToast("File Excel berhasil diunduh.", "sukses")
    } catch (err) {
      console.error(err)
      tampilkanToast("Gagal membuat file Excel.", "gagal")
    } finally {
      setSedangExport(false)
    }
  }

  function klikTombolUpload() {
    inputFileRef.current?.click()
  }

  async function handleFileExcel(e) {
    const file = e.target.files[0]
    if (!file) return

    setSedangImport(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.worksheets[0]

      if (!sheet) throw new Error("File Excel tidak punya sheet data")

      const daftarUnitBaru = []

      sheet.eachRow({ includeEmpty: false }, (row, nomorBaris) => {
        if (nomorBaris === 1) return

        const namaPerusahaan = row.getCell(1).value?.toString().trim()
        const jenisSpip = row.getCell(2).value?.toString().trim()
        const namaUnit = row.getCell(3).value?.toString().trim()
        const jenisAlat = row.getCell(4).value?.toString().trim()
        const nomorUnit = row.getCell(5).value?.toString().trim()
        const tanggalMentah = row.getCell(6).value
        const jangkaWaktuMentah = row.getCell(7).value
        const statusKelayakan = row.getCell(10).value?.toString().trim()
        const temuan = row.getCell(11).value?.toString().trim()
        const tindakLanjut = row.getCell(12).value?.toString().trim()

        if (!namaPerusahaan && !nomorUnit) return

        let tanggalUjiTerakhir = null
        if (tanggalMentah instanceof Date) {
          tanggalUjiTerakhir = tanggalMentah.toISOString().slice(0, 10)
        } else if (typeof tanggalMentah === "string") {
          tanggalUjiTerakhir = parseTanggalIndo(tanggalMentah)
        }

        daftarUnitBaru.push({
          namaPerusahaan,
          jenisSpip,
          namaUnit,
          jenisAlat,
          nomorUnit,
          tanggalUjiTerakhir,
          jangkaWaktuBulan: Number(jangkaWaktuMentah),
          statusKelayakan,
          temuan: temuan === "-" ? "" : temuan,
          tindakLanjut: tindakLanjut === "-" ? "" : tindakLanjut,
        })
      })

      if (daftarUnitBaru.length === 0) {
        tampilkanToast("Tidak ada baris data yang bisa dibaca dari file ini.", "gagal")
        return
      }

      const res = await apiFetch(`${API_URL}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daftarUnit: daftarUnitBaru }),
      })

      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil.error || "Gagal mengimpor data")

      tampilkanToast(hasil.pesan, hasil.gagal.length > 0 ? "gagal" : "sukses")
      if (hasil.gagal.length > 0) {
        console.warn("Baris yang gagal diimpor:", hasil.gagal)
      }

      ambilData()
    } catch (err) {
      console.error(err)
      tampilkanToast("Gagal membaca atau mengimpor file Excel. Pastikan format kolomnya sesuai hasil Download Excel.", "gagal")
    } finally {
      setSedangImport(false)
      e.target.value = ""
    }
  }

  const filterInputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400/50"

  const tidakAdaDataSamaSekali = totalData === 0 && JSON.stringify(filter) === JSON.stringify(FILTER_AWAL) && !sedangMuatData

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
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {sedangMuatData ? "Memuat data..." : `${totalData} unit terdaftar`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={inputFileRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileExcel}
              className="hidden"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={klikTombolUpload}
              disabled={sedangImport}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Upload size={16} /> {sedangImport ? "Mengimpor..." : "Upload Excel"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportExcel}
              disabled={sedangExport}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-md shadow-green-500/20"
            >
              <Download size={16} /> {sedangExport ? "Membuat file..." : "Download Excel"}
            </motion.button>
          </div>
        </div>

        {tidakAdaDataSamaSekali ? (
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
                      <th className="py-2.5 px-3 min-w-[180px] text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama Petugas</th>
                      <th className="py-2.5 px-3 min-w-[190px] text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status Kompetensi</th>
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
                      <th className="py-2 px-3"></th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftarUnit.length === 0 ? (
                      <tr>
                        <td colSpan="17" className="py-6 text-center text-gray-500 dark:text-gray-400">
                          {sedangMuatData ? "Memuat data..." : "Tidak ada data yang cocok dengan filter."}
                        </td>
                      </tr>
                    ) : (
                      daftarUnit.map((unit, index) => {
                        const jatuhTempo = hitungJatuhTempo(unit.tanggalUjiTerakhir, unit.jangkaWaktuBulan)
                        const statusWaktu = hitungStatusWaktu(jatuhTempo)

                        return (
                          <motion.tr
                            key={unit.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.6) }}
                            className="border-b border-gray-100 dark:border-gray-800/60 align-top text-gray-800 dark:text-gray-200 transition-colors duration-150 hover:bg-yellow-500/5"
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
                            <td className="py-2.5 px-3 min-w-[180px]">
                              <input
                                type="text"
                                defaultValue={unit.namaPetugas || ""}
                                placeholder="Nama petugas..."
                                onBlur={(e) => updateNamaPetugas(unit, e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                              />
                            </td>
                            <td className="py-2.5 px-3 min-w-[190px]">
                              <select
                                value={unit.statusKompetensi || "Belum Bersertifikat"}
                                onChange={(e) => updateStatusKompetensi(unit, e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 ${unit.statusKompetensi === "Bersertifikat / Kompeten" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                              >
                                {PILIHAN_STATUS_KOMPETENSI.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
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
                                  onClick={() => lihatRiwayat(unit)}
                                  title="Lihat riwayat perubahan status unit ini"
                                  className="bg-gray-100 hover:bg-gray-700 text-gray-600 hover:text-white dark:bg-gray-800 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <History size={13} /> Riwayat
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => cetakUnit(unit)}
                                  title="Cetak laporan unit ini"
                                  className="bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white dark:bg-blue-950 dark:hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Printer size={13} /> Cetak
                                </motion.button>
                                {unit.statusKelayakan === "Layak" && (
                                  <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => cetakStiker(unit)}
                                    title="Cetak stiker QR untuk ditempel di unit"
                                    className="bg-purple-50 hover:bg-purple-500 text-purple-600 hover:text-white dark:bg-purple-950 dark:hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Tag size={13} /> Stiker
                                  </motion.button>
                                )}
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
                Menampilkan <span className="font-semibold text-gray-700 dark:text-gray-300">{totalData === 0 ? 0 : (halaman - 1) * ITEM_PER_HALAMAN + 1}–{Math.min(halaman * ITEM_PER_HALAMAN, totalData)}</span> dari <span className="font-semibold text-gray-700 dark:text-gray-300">{totalData}</span> data
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

      <AnimatePresence>
        {unitRiwayatDipilih && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={tutupRiwayat}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <History size={18} /> Riwayat Status
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {unitRiwayatDipilih.namaUnit} ({unitRiwayatDipilih.nomorUnit})
                  </p>
                </div>
                <button onClick={tutupRiwayat} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {sedangMuatRiwayat ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : daftarRiwayatUnit.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada perubahan status yang tercatat untuk unit ini.</p>
              ) : (
                <div className="space-y-2">
                  {daftarRiwayatUnit.map((riwayat) => (
                    <div key={riwayat.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                        Diubah oleh <span className="font-medium text-gray-600 dark:text-gray-300">{riwayat.diubahOleh}</span> · {formatTanggalWaktu(riwayat.diubahPada)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${warnaBadgeStatus(riwayat.statusLama)}`}>{riwayat.statusLama}</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${warnaBadgeStatus(riwayat.statusBaru)}`}>{riwayat.statusBaru}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DataSPIP