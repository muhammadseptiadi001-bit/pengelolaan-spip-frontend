export const API_URL = "https://pengelolaan-spip-backend-production.up.railway.app/api/unit"

export const PILIHAN_JANGKA_WAKTU = [
  { label: "5 Tahun", bulan: 60 },
  { label: "3 Tahun", bulan: 36 },
  { label: "1 Tahun", bulan: 12 },
  { label: "6 Bulan", bulan: 6 },
  { label: "3 Bulan", bulan: 3 },
]

export const PILIHAN_JENIS_SPIP = ["Sarana", "Prasarana", "Instalasi", "Peralatan Pertambangan"]

export const PILIHAN_JENIS_ALAT = {
  "Sarana": [
    "Light Vehicle (LV)",
    "Manhaul (Bus)",
    "Lowboy (pengangkut alat berat)",
    "Kendaraan operasional",
    "Ambulance",
    "Kendaraan tanggap darurat",
    "Peralatan komunikasi (Handy Talky/Radio)",
    "Peralatan keselamatan kerja (APD)",
    "Peralatan tanggap darurat",
    "Peralatan kerja portabel",
  ],
  "Prasarana": [
    "Bangunan kantor",
    "Bengkel (Workshop)",
    "Gudang penyimpanan (Warehouse)",
    "Bangunan genset",
    "Bangunan tempat pembuangan sampah",
    "Tangki timbun",
    "Bangunan tempat ibadah",
    "Bangunan klinik",
    "Mess (Camp) dan bangunan pendukung",
    "Ruang kendali (Control Room)",
    "Jalan tambang (Haul Road)",
    "Jembatan",
    "Drainase",
    "Menara telekomunikasi",
    "Menara penyalur petir",
    "Fuel Station",
    "Washing Plant",
    "Stockpile",
    "Kolam pengendap (Settling Pond)",
    "Kolam pengelolaan air limbah",
    "Pelabuhan/Jetty",
    "Fasilitas air bersih dan sanitasi",
  ],
  "Instalasi": [
    "Instalasi ban berjalan (Conveyor System)",
    "Instalasi listrik",
    "Instalasi pneumatic dan/atau hydraulic",
    "Instalasi bahan bakar cair (Fuel Station, tangki BBM, jaringan perpipaan)",
    "Instalasi air",
    "Instalasi komunikasi",
    "Instalasi proteksi kebakaran",
    "Instalasi gas",
    "Instalasi pengolahan air limbah (IPAL)",
    "Instalasi pengolahan dan/atau pemurnian",
    "Sistem perpompaan dan perpipaan (Pumping & Piping System)",
    "Sistem ventilasi (khusus tambang bawah tanah)",
    "Crusher beserta sistem instalasinya",
  ],
  "Peralatan Pertambangan": [
    "Excavator",
    "Bulldozer",
    "Wheel Loader",
    "Motor Grader",
    "Dump Truck",
    "High Dump (HD)",
    "Compact",
    "Alat penunjang pertambangan",
    "Alat pemetaan dan pemantauan kestabilan lereng",
    "Alat bor (Drill Rig)",
    "Crane",
    "Compressor",
    "Genset",
    "Pompa",
    "Pesawat angkat dan/atau angkut (Lifting Equipment)",
    "Peralatan perkakas tangan (Hand Tools)",
    "Peralatan listrik",
    "Peralatan mekanik",
  ],
}

export const SEMUA_JENIS_ALAT = Object.values(PILIHAN_JENIS_ALAT).flat()

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