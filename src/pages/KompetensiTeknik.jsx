import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  UserCog, CheckCircle2, AlertTriangle, XCircle, PackagePlus, Trash2, CalendarDays,
  BadgeCheck, Building2, Briefcase, Hash, FileText, ImagePlus, Loader2, Users
} from 'lucide-react'
import { API_URL, UPLOAD_URL, hitungStatusWaktu, formatTanggal } from '../utils/spipHelpers'
import { apiFetch } from '../utils/apiFetch'
import { ambilUser } from '../utils/auth'
import { tampilkanToast } from '../utils/toast'

const TENAGA_TEKNIK_URL = API_URL.replace('/unit', '/tenaga-teknik')

// Daftar jenis kompetensi/sertifikasi tenaga teknik pertambangan. "Lainnya" selalu di
// paling bawah — kalau dipilih, muncul kotak teks tambahan untuk diisi manual.
const PILIHAN_JENIS_KOMPETENSI = [
  "Juru Ledak",
  "Juru Ukur",
  "Juru Las / Welder",
  "Juru Bor",
  "Juru Derek / Crane Operator",
  "Juru Rawat / Paramedis",
  "Juru Langsir",
  "Petugas Proteksi Radiasi",
  "Ahli Listrik",
  "Petugas/Juru Ventilasi (tambang bawah tanah)",
  "Petugas P3K / First Aider",
  "Petugas Pemadam Kebakaran",
  "Anggota Tim Tanggap Darurat / ERT",
  "Petugas Industrial Hygiene",
  "Berthing Master / Loading",
  "Petugas Bahan Kimia",
  "Rigger / Juru Ikat",
  "Operator Pesawat Angkat dan/atau Angkut",
  "Petugas Gudang Bahan Peledak",
  "Lainnya",
]

function tanggalHariIni() {
  const sekarang = new Date()
  return `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}-${String(sekarang.getDate()).padStart(2, "0")}`
}

// Mapping label status waktu generik (Aman/Mendekati Jatuh Tempo/Sudah Lewat) ke istilah
// yang lebih pas untuk sertifikat kompetensi.
function labelStatusSertifikat(masaBerlaku) {
  if (!masaBerlaku) return "Belum Diisi"
  const label = hitungStatusWaktu(new Date(masaBerlaku)).label
  if (label === "Aman") return "Aktif"
  if (label === "Mendekati Jatuh Tempo") return "Akan Kedaluwarsa"
  return "Kedaluwarsa"
}

function badgeStatus(label) {
  if (label === "Aktif") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
  if (label === "Akan Kedaluwarsa") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
  if (label === "Kedaluwarsa") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
}

async function uploadFileKeServer(file, tipe) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("tipe", tipe)
  const res = await apiFetch(UPLOAD_URL, { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Gagal mengupload file")
  }
  return res.json()
}

function AngkaCountUp({ nilai, durasi = 800 }) {
  const [tampil, setTampil] = useState(0)
  useEffect(() => {
    let mulai = null
    let frameId
    function animasikan(waktuSekarang) {
      if (mulai === null) mulai = waktuSekarang
      const progres = Math.min((waktuSekarang - mulai) / durasi, 1)
      setTampil(Math.floor(progres * nilai))
      if (progres < 1) frameId = requestAnimationFrame(animasikan)
      else setTampil(nilai)
    }
    frameId = requestAnimationFrame(animasikan)
    return () => cancelAnimationFrame(frameId)
  }, [nilai, durasi])
  return <>{tampil}</>
}

function KartuRingkasan({ label, nilai, sub, warna, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${warna}`}></div>
      <div className="pl-2 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800 dark:text-white mt-1"><AngkaCountUp nilai={nilai} /></p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && <Icon size={20} className="text-gray-300 dark:text-gray-600" />}
      </div>
    </div>
  )
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

function KompetensiTeknik() {
  const user = ambilUser()
  const [daftar, setDaftar] = useState([])
  const [sedangMuat, setSedangMuat] = useState(true)
  const [filterStatus, setFilterStatus] = useState("Semua")

  const [namaPerusahaan, setNamaPerusahaan] = useState("")
  const [nama, setNama] = useState("")
  const [idKaryawan, setIdKaryawan] = useState("")
  const [jabatan, setJabatan] = useState("")
  const [departemen, setDepartemen] = useState("")
  const [kompetensi, setKompetensi] = useState(PILIHAN_JENIS_KOMPETENSI[0])
  const [kompetensiLainnya, setKompetensiLainnya] = useState("")
  const [noSertifikat, setNoSertifikat] = useState("")
  const [instansiPenerbit, setInstansiPenerbit] = useState("")
  const [tanggalTerbitSertifikat, setTanggalTerbitSertifikat] = useState("")
  const [masaBerlakuSertifikat, setMasaBerlakuSertifikat] = useState("")
  const [berkasSertifikat, setBerkasSertifikat] = useState(null)
  const [namaBerkas, setNamaBerkas] = useState("")
  const [sedangUploadBerkas, setSedangUploadBerkas] = useState(false)
  const [sedangSimpan, setSedangSimpan] = useState(false)

  useEffect(() => {
    ambilData()
  }, [])

  async function ambilData() {
    setSedangMuat(true)
    try {
      const res = await apiFetch(TENAGA_TEKNIK_URL)
      const hasil = await res.json()
      setDaftar(Array.isArray(hasil) ? hasil : [])
    } catch (err) {
      console.error(err)
    } finally {
      setSedangMuat(false)
    }
  }

  const ringkasan = useMemo(() => {
    let aktif = 0, akanKedaluwarsa = 0, kedaluwarsa = 0, belumDiisi = 0
    daftar.forEach((t) => {
      const label = labelStatusSertifikat(t.masaBerlakuSertifikat)
      if (label === "Aktif") aktif++
      else if (label === "Akan Kedaluwarsa") akanKedaluwarsa++
      else if (label === "Kedaluwarsa") kedaluwarsa++
      else belumDiisi++
    })
    return { total: daftar.length, aktif, akanKedaluwarsa, kedaluwarsa, belumDiisi }
  }, [daftar])

  const daftarTerfilter = useMemo(() => {
    if (filterStatus === "Semua") return daftar
    return daftar.filter((t) => labelStatusSertifikat(t.masaBerlakuSertifikat) === filterStatus)
  }, [daftar, filterStatus])

  async function handleBerkasChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setSedangUploadBerkas(true)
    try {
      const tipe = file.type === 'application/pdf' ? 'pdf' : 'foto'
      const hasil = await uploadFileKeServer(file, tipe)
      setBerkasSertifikat(hasil.url)
      setNamaBerkas(file.name)
    } catch (err) {
      tampilkanToast(err.message || "Gagal mengupload berkas.", "gagal")
    } finally {
      setSedangUploadBerkas(false)
      e.target.value = ""
    }
  }

  async function tambahTenagaTeknik() {
    const kompetensiFinal = kompetensi === "Lainnya" ? kompetensiLainnya.trim() : kompetensi

    if (!namaPerusahaan || !nama || !idKaryawan || !jabatan || !kompetensiFinal || !noSertifikat) {
      tampilkanToast("Nama Perusahaan, Nama, ID Karyawan, Jabatan, Kompetensi, dan No Sertifikat wajib diisi!", "gagal")
      return
    }
    if (kompetensi === "Lainnya" && !kompetensiLainnya.trim()) {
      tampilkanToast("Isi jenis kompetensi pada kolom \"Lainnya\" terlebih dahulu.", "gagal")
      return
    }
    if (tanggalTerbitSertifikat && tanggalTerbitSertifikat > tanggalHariIni()) {
      tampilkanToast("Tanggal Terbit Sertifikat tidak boleh di masa depan.", "gagal")
      return
    }
    if (sedangUploadBerkas) {
      tampilkanToast("Tunggu proses upload berkas selesai terlebih dahulu.", "gagal")
      return
    }

    setSedangSimpan(true)
    try {
      const res = await apiFetch(TENAGA_TEKNIK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaPerusahaan, nama, idKaryawan, jabatan, departemen, kompetensi: kompetensiFinal, noSertifikat,
          instansiPenerbit, tanggalTerbitSertifikat: tanggalTerbitSertifikat || null,
          masaBerlakuSertifikat: masaBerlakuSertifikat || null,
          berkasSertifikat,
        }),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")

      tampilkanToast("Data tenaga teknik berhasil ditambahkan!", "sukses")
      setNamaPerusahaan(""); setNama(""); setIdKaryawan(""); setJabatan(""); setDepartemen("")
      setKompetensi(PILIHAN_JENIS_KOMPETENSI[0]); setKompetensiLainnya(""); setNoSertifikat(""); setInstansiPenerbit("")
      setTanggalTerbitSertifikat(""); setMasaBerlakuSertifikat("")
      setBerkasSertifikat(null); setNamaBerkas("")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menambahkan data. Pastikan server backend sedang berjalan.", "gagal")
    } finally {
      setSedangSimpan(false)
    }
  }

  async function hapusTenagaTeknik(id) {
    try {
      const res = await apiFetch(`${TENAGA_TEKNIK_URL}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Gagal menghapus")
      tampilkanToast("Data tenaga teknik dihapus.", "sukses")
      ambilData()
    } catch (err) {
      tampilkanToast("Gagal menghapus data.", "gagal")
    }
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kompetensi Tenaga Teknik</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Aspek 4 — Kompetensi tenaga teknik pertambangan dan sertifikasinya</p>
      </div>

      {sedangMuat ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm dark:border dark:border-gray-800 animate-pulse h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KartuRingkasan label="Total Tenaga Teknik" nilai={ringkasan.total} warna="bg-blue-500" icon={Users} />
          <KartuRingkasan label="Aktif" nilai={ringkasan.aktif} warna="bg-green-500" icon={CheckCircle2} />
          <KartuRingkasan label="Akan Kedaluwarsa" nilai={ringkasan.akanKedaluwarsa} warna="bg-yellow-500" icon={AlertTriangle} />
          <KartuRingkasan label="Kedaluwarsa" nilai={ringkasan.kedaluwarsa} warna="bg-red-500" icon={XCircle} />
          <KartuRingkasan label="Belum Diisi Masa Berlaku" nilai={ringkasan.belumDiisi} warna="bg-gray-400" icon={FileText} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm dark:border dark:border-gray-800 mb-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/20">
            <PackagePlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tambah Tenaga Teknik</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Data personel dan sertifikasi kompetensinya</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelIkon icon={Building2}>Nama Perusahaan</LabelIkon>
            <input type="text" placeholder="Nama Perusahaan" value={namaPerusahaan} onChange={(e) => setNamaPerusahaan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={UserCog}>Nama</LabelIkon>
            <input type="text" placeholder="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={Hash}>ID Karyawan</LabelIkon>
            <input type="text" placeholder="Contoh: EMP-0021" value={idKaryawan} onChange={(e) => setIdKaryawan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={Briefcase}>Jabatan</LabelIkon>
            <input type="text" placeholder="Contoh: Kepala Teknik Tambang" value={jabatan} onChange={(e) => setJabatan(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={Building2}>Departemen</LabelIkon>
            <input type="text" placeholder="Ketik nama departemen" value={departemen} onChange={(e) => setDepartemen(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={BadgeCheck}>Kompetensi</LabelIkon>
            <select value={kompetensi} onChange={(e) => setKompetensi(e.target.value)} className={inputClass}>
              {PILIHAN_JENIS_KOMPETENSI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {kompetensi === "Lainnya" && (
            <div className="md:col-span-2">
              <LabelIkon icon={BadgeCheck}>Jenis Kompetensi Lainnya</LabelIkon>
              <input
                type="text"
                placeholder="Ketik jenis kompetensi/sertifikasi"
                value={kompetensiLainnya}
                onChange={(e) => setKompetensiLainnya(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <LabelIkon icon={Hash}>No Sertifikat</LabelIkon>
            <input type="text" placeholder="Nomor sertifikat" value={noSertifikat} onChange={(e) => setNoSertifikat(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={Building2}>Instansi Penerbit Sertifikat</LabelIkon>
            <input type="text" placeholder="Contoh: Kementerian ESDM" value={instansiPenerbit} onChange={(e) => setInstansiPenerbit(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Tanggal Terbit Sertifikat</LabelIkon>
            <input type="date" value={tanggalTerbitSertifikat} max={tanggalHariIni()} onChange={(e) => setTanggalTerbitSertifikat(e.target.value)} className={inputClass} />
          </div>

          <div>
            <LabelIkon icon={CalendarDays}>Masa Berlaku (Tanggal Kedaluwarsa)</LabelIkon>
            <input type="date" value={masaBerlakuSertifikat} onChange={(e) => setMasaBerlakuSertifikat(e.target.value)} className={inputClass} />
          </div>

          <div className="md:col-span-2">
            <LabelIkon icon={ImagePlus}>Berkas Sertifikat (opsional — foto atau PDF)</LabelIkon>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-5 transition-colors ${sedangUploadBerkas ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"}`}>
              {sedangUploadBerkas ? (
                <Loader2 size={22} className="text-blue-500 animate-spin" />
              ) : (
                <ImagePlus size={22} className="text-gray-400" />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {sedangUploadBerkas ? "Mengupload..." : namaBerkas ? `Terpilih: ${namaBerkas}` : "Klik untuk pilih foto atau PDF sertifikat"}
              </span>
              <input type="file" accept="image/*,application/pdf" onChange={handleBerkasChange} disabled={sedangUploadBerkas} className="hidden" />
            </label>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={tambahTenagaTeknik}
          disabled={sedangSimpan || sedangUploadBerkas}
          className="mt-6 w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {sedangSimpan ? <Loader2 size={18} className="animate-spin" /> : <PackagePlus size={18} />}
          {sedangSimpan ? "Menyimpan..." : "Tambah Tenaga Teknik"}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm dark:border dark:border-gray-800"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Daftar Tenaga Teknik</h2>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm">
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Akan Kedaluwarsa">Akan Kedaluwarsa</option>
            <option value="Kedaluwarsa">Kedaluwarsa</option>
            <option value="Belum Diisi">Belum Diisi</option>
          </select>
        </div>

        {daftarTerfilter.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data tenaga teknik.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Perusahaan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nama</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">ID Karyawan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Jabatan</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Departemen</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kompetensi</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">No Sertifikat</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Masa Berlaku</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Berkas</th>
                  <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarTerfilter.map((t) => {
                  const statusLabel = labelStatusSertifikat(t.masaBerlakuSertifikat)
                  return (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800/60 text-gray-800 dark:text-gray-200">
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.namaPerusahaan || "-"}</td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">{t.nama}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.idKaryawan}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.jabatan}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.departemen || "-"}</td>
                      <td className="py-2.5 px-3">{t.kompetensi}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.noSertifikat}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{t.masaBerlakuSertifikat ? formatTanggal(new Date(t.masaBerlakuSertifikat)) : "-"}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeStatus(statusLabel)}`}>{statusLabel}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {t.berkasSertifikat ? (
                          <a href={t.berkasSertifikat} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold">Lihat</a>
                        ) : "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => hapusTenagaTeknik(t.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default KompetensiTeknik