export const API_URL = "https://pengelolaan-spip-backend-production.up.railway.app/api/unit"
export const UPLOAD_URL = "https://pengelolaan-spip-backend-production.up.railway.app/api/upload"

export const PILIHAN_JANGKA_WAKTU = [
  { label: "5 Tahun", bulan: 60 },
  { label: "3 Tahun", bulan: 36 },
  { label: "1 Tahun", bulan: 12 },
  { label: "6 Bulan", bulan: 6 },
  { label: "3 Bulan", bulan: 3 },
]

export const PILIHAN_JENIS_SPIP = ["Peralatan Pertambangan", "Instalasi Pertambangan", "Bangunan"]

// Struktur 3 tingkat: Kategori SPIP -> Kelompok Alat -> daftar Jenis Alat
export const KELOMPOK_ALAT = {
  "Peralatan Pertambangan": {
    "Alat Berat Pemindah Tanah Mekanis": [
      "Excavator",
      "Hydraulic Excavator",
      "Backhoe",
      "Bulldozer",
      "Wheel Loader",
      "Motor Grader",
      "Scraper",
      "Compactor",
      "Dump Truck",
      "Articulated Dump Truck (ADT)",
    ],
    "Alat Penunjang Pertambangan": [
      "Drill Rig",
      "Rock Breaker",
      "Crusher Mobile",
      "Screening Plant",
      "Compressor",
      "Generator Set (Portable)",
      "Welding Machine",
      "Lighting Tower",
      "Water Truck",
      "Fuel Truck",
      "Lubrication Truck",
      "Service Truck",
    ],
    "Alat Pemetaan dan Pemantauan Kestabilan Lereng": [
      "Total Station",
      "GPS Geodetik",
      "Drone/UAV",
      "Laser Scanner",
      "Prism Monitoring",
      "Inclinometer",
      "Extensometer",
      "Radar Slope Monitoring",
      "Piezometer",
    ],
    "Kendaraan Mobilisasi Karyawan dan Barang": [
      "Light Vehicle (LV)",
      "Double Cabin",
      "Bus",
      "Manhaul",
      "Ambulance",
      "Lowboy",
      "Trailer",
      "Pickup",
      "Minibus",
    ],
    "Pesawat Angkat dan/atau Angkut": [
      "Crane",
      "Forklift",
      "Overhead Crane",
      "Gantry Crane",
      "Hoist",
      "Mobile Crane",
      "Truck Crane",
    ],
    "Peralatan Perkakas Tangan": [
      "Hand Tools",
      "Power Tools",
      "Torque Wrench",
      "Impact Wrench",
      "Grinder",
      "Drill Machine",
      "Cutting Machine",
      "Chain Saw",
    ],
    "Peralatan Listrik": [
      "Panel Listrik",
      "Portable Generator",
      "Kabel Listrik",
      "Transformator Portable",
      "Distribution Box",
      "Earth Tester",
      "Multimeter",
      "Megger",
    ],
  },
  "Instalasi Pertambangan": {
    "Instalasi Ban Berjalan": [
      "Conveyor System",
      "Belt Conveyor",
      "Tripper Conveyor",
      "Stacker Conveyor",
    ],
    "Instalasi Listrik": [
      "Gardu Listrik",
      "Transformator",
      "Panel Distribusi",
      "Jaringan Listrik",
      "MCC (Motor Control Center)",
    ],
    "Instalasi Pneumatic dan/atau Hydraulic": [
      "Hydraulic Power Pack",
      "Hydraulic System",
      "Pneumatic Line",
      "Air Compressor System",
    ],
    "Instalasi Bahan Bakar Cair": [
      "Fuel Station",
      "Tangki BBM",
      "Pipa BBM",
      "Fuel Dispensing System",
    ],
    "Instalasi Air": [
      "Water Treatment Plant",
      "Water Supply System",
      "Pipa Air",
      "Pompa Air",
      "Reservoir",
    ],
    "Instalasi Komunikasi": [
      "Repeater Radio",
      "Base Station Radio",
      "Fiber Optic",
      "CCTV",
      "Jaringan Internet",
      "Server Komunikasi",
    ],
    "Instalasi Proteksi Kebakaran": [
      "Fire Hydrant",
      "Fire Alarm System",
      "Sprinkler",
      "Foam System",
      "Fire Pump",
    ],
    "Instalasi Gas": [
      "Gas Pipeline",
      "Gas Storage",
      "Gas Regulator",
      "Gas Detection System",
    ],
    "Instalasi Lainnya": [
      "Instalasi Pengolahan Air Limbah (IPAL)",
      "Instalasi Pengolahan Air Tambang",
      "Instalasi Pengolahan dan/atau Pemurnian",
      "Sistem Ventilasi Tambang Bawah Tanah",
      "Sistem Dewatering",
      "Sistem Perpipaan Slurry",
    ],
  },
  "Bangunan": {
    "Bangunan Perkantoran dan Fasilitas Umum": [
      "Bangunan Kantor",
      "Mess (Camp) dan Bangunan Pendukung",
      "Bangunan Tempat Ibadah",
      "Mushola/Masjid",
      "Kantin",
      "Training Center",
      "Pos Security",
      "Pos Jaga",
      "Laboratorium",
      "Bangunan Klinik",
    ],
    "Bangunan Operasional dan Produksi": [
      "Bengkel (Workshop)",
      "Ruang Kendali (Control Room)",
      "Washing Plant",
      "Crushing Plant Building",
      "Weighbridge (Jembatan Timbang)",
      "Garasi Kendaraan",
      "Bangunan Genset",
    ],
    "Bangunan Penyimpanan dan Distribusi": [
      "Gudang Penyimpanan (Warehouse)",
      "Tangki Timbun",
      "Fuel Station",
      "Stockpile",
      "Jetty/Pelabuhan",
      "Explosive Magazine (Gudang Bahan Peledak)",
    ],
    "Bangunan Keselamatan dan Lingkungan": [
      "Bangunan Tempat Pembuangan Sampah",
      "TPS Limbah B3",
      "Kolam Pengendap (Settling Pond)",
      "Kolam Pengelolaan Air Limbah",
      "Menara Penyalur Petir",
      "ERT Station",
    ],
    "Infrastruktur dan Akses": [
      "Jembatan",
      "Menara Telekomunikasi",
      "Jalan Tambang",
      "Park Area",
    ],
  },
}

// Daftar nama kelompok per kategori SPIP, untuk mengisi dropdown "Kelompok Alat"
export function daftarKelompok(jenisSpip) {
  return Object.keys(KELOMPOK_ALAT[jenisSpip] || {})
}

// Daftar jenis alat untuk satu kelompok tertentu
export function daftarAlatDalamKelompok(jenisSpip, kelompok) {
  return KELOMPOK_ALAT[jenisSpip]?.[kelompok] || []
}

// Versi flat (semua jenis alat digabung per kategori) - dipakai untuk filter "Semua Kelompok"
// dan supaya file lain yang masih pakai PILIHAN_JENIS_ALAT tetap jalan
export const PILIHAN_JENIS_ALAT = Object.fromEntries(
  Object.entries(KELOMPOK_ALAT).map(([kategori, kelompokObj]) => [
    kategori,
    Object.values(kelompokObj).flat(),
  ])
)

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