export const API_URL = "https://pengelolaan-spip-backend-production.up.railway.app/api/unit"

export const PILIHAN_JANGKA_WAKTU = [
  { label: "5 Tahun", bulan: 60 },
  { label: "3 Tahun", bulan: 36 },
  { label: "1 Tahun", bulan: 12 },
  { label: "6 Bulan", bulan: 6 },
  { label: "3 Bulan", bulan: 3 },
]

export const PILIHAN_JENIS_SPIP = ["Sarana Prasarana", "Instalasi", "Peralatan Pertambangan"]

export function hitungJatuhTempo(tanggalUjiTerakhir, bulan) {
  const tanggal = new Date(tanggalUjiTerakhir)
  tanggal.setMonth(tanggal.getMonth() + Number(bulan))
  return tanggal
}

export function hitungStatusWaktu(jatuhTempo) {
  const sekarang = new Date()
  const selisihHari = (jatuhTempo - sekarang) / (1000 * 60 * 60 * 24)

  if (selisihHari < 0) return { label: "Sudah Lewat", warna: "bg-red-100 text-red-700" }
  if (selisihHari <= 30) return { label: "Mendekati Jatuh Tempo", warna: "bg-yellow-100 text-yellow-700" }
  return { label: "Aman", warna: "bg-green-100 text-green-700" }
}

export function hitungSisaDetail(jatuhTempo) {
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

export function warnaKelayakan(status) {
  if (status === "Layak") return "bg-green-100 text-green-700"
  if (status === "Tidak Layak") return "bg-red-100 text-red-700"
  return "bg-yellow-100 text-yellow-700"
}

export function formatTanggal(tanggal) {
  return tanggal.toLocaleDateString("id-ID")
}