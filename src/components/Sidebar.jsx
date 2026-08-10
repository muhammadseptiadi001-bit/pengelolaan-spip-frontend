import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  History,
  BarChart3,
  Menu,
  Plus,
  X,
  Moon,
  Sun,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Wrench,
  ShieldAlert,
  UserCog,
  FileSearch,
} from 'lucide-react'
import { ambilUser, logout } from '../utils/auth'
import { ambilTema, toggleTema } from '../utils/theme'
import logoSicool from '../assets/logo-sicool.png'

// ===== STRUKTUR MENU BERDASARKAN 5 ASPEK TUGAS & TANGGUNG JAWAB KO =====
// "Input SPIP" berdiri sendiri di luar grup karena sifatnya general — datanya dipakai
// lintas aspek (jadi pintu masuk untuk Aspek 1, 2, 3). Aspek 4 (Kompetensi Tenaga Teknik)
// datanya BERDIRI SENDIRI, tidak berasal dari Input SPIP, jadi sekarang jadi grup aktif
// juga (sebelumnya placeholder). Aspek 5 masih placeholder "Segera Hadir".

const MENU_TUNGGAL = { path: "/input", label: "Input SPIP", icon: FilePlus }

const GRUP_KELAYAKAN = {
  key: "aspek3",
  label: "Kelayakan SPIP",
  labelTab: "Kelayakan SPIP",
  icon: ShieldCheck,
  nomor: "4.4.3",
  items: [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { path: "/data", label: "Data SPIP", icon: ClipboardList },
    { path: "/evaluasi", label: "Evaluasi", icon: BarChart3 },
    { path: "/riwayat", label: "Riwayat", icon: History },
  ],
}

const GRUP_PEMELIHARAAN = {
  key: "aspek1",
  label: "Sistem & Pelaksanaan Pemeliharaan SPIP",
  labelTab: "Pemeliharaan",
  icon: Wrench,
  nomor: "4.4.1",
  items: [
    { path: "/pemeliharaan", label: "Pemeliharaan", icon: Wrench },
  ],
}

const GRUP_PENGAMANAN = {
  key: "aspek2",
  label: "Pengamanan Instalasi",
  labelTab: "Pengamanan Instalasi",
  icon: ShieldAlert,
  nomor: "4.4.2",
  items: [
    { path: "/pengamanan-instalasi", label: "Pengamanan Instalasi", icon: ShieldAlert },
  ],
}

// Aspek 4 — SEKARANG SUDAH AKTIF (sebelumnya placeholder).
const GRUP_KOMPETENSI = {
  key: "aspek4",
  label: "Kompetensi Tenaga Teknik",
  labelTab: "Kompetensi",
  icon: UserCog,
  nomor: "4.4.4",
  items: [
    { path: "/kompetensi-teknik", label: "Kompetensi Tenaga Teknik", icon: UserCog },
  ],
}

const PLACEHOLDER_EVALUASI_KAJIAN = { key: "aspek5", label: "Evaluasi Laporan Hasil Kajian Teknis", icon: FileSearch, nomor: "4.4.5" }

// Urutan tampil, DIURUTKAN SESUAI URUTAN TUGAS 1 → 5 di diagram. Dipakai untuk render
// desktop MAUPUN sheet "Menu" di mobile — satu sumber kebenaran struktur.
const URUTAN_ASPEK_DESKTOP = [
  { tipe: "grup", data: GRUP_PEMELIHARAAN },
  { tipe: "grup", data: GRUP_PENGAMANAN },
  { tipe: "grup", data: GRUP_KELAYAKAN },
  { tipe: "grup", data: GRUP_KOMPETENSI },
  { tipe: "placeholder", data: PLACEHOLDER_EVALUASI_KAJIAN },
]

// Aspek yang tampil sebagai TAB di bottom nav mobile (dibatasi 3 slot supaya FAB "+" di
// tengah tetap presisi). Aspek 4 yang baru aktif TIDAK ditambah ke bottom nav — tetap bisa
// diakses lewat sheet "Menu" di mobile, sama seperti Aspek 1/2/3 lewat sidebar desktop.
const ASPEK_TAB_MOBILE = [GRUP_PEMELIHARAAN, GRUP_PENGAMANAN, GRUP_KELAYAKAN]

function itemAktif(item, pathname) {
  return item.end ? pathname === item.path : pathname.startsWith(item.path)
}

function grupAktif(grup, pathname) {
  return grup.items.some((it) => itemAktif(it, pathname))
}

// Cari grup (dari ASPEK_TAB_MOBILE) yang sedang aktif berdasarkan pathname, dan yang
// punya lebih dari 1 sub-halaman — dipakai untuk menentukan apakah strip sub-tab
// perlu ditampilkan.
export function cariGrupUntukSubTab(pathname) {
  return ASPEK_TAB_MOBILE.find((grup) => grup.items.length > 1 && grupAktif(grup, pathname))
}

// ===== INDIKATOR ITEM AKTIF (sliding pill pakai layoutId Framer Motion) =====
function ItemMenu({ item, indent = false, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
          indent ? "pl-4 pr-3" : "px-3"
        } ${
          isActive
            ? "text-white"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="indikator-aktif-desktop"
              className="absolute inset-0 bg-blue-600 rounded-lg -z-10"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <Icon size={16} className="flex-shrink-0" />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

// Kop nomor regulasi (mis. "4.4.3") — bold + warna aksen biru karena info penting.
function NomorRegulasi({ nomor, size = "text-xs" }) {
  if (!nomor) return null
  return (
    <span className={`block ${size} font-bold tracking-wide text-blue-600 dark:text-blue-400 leading-none mb-1`}>
      {nomor}
    </span>
  )
}

function GrupMenuDesktop({ grup, terbuka, onToggle, pathname }) {
  const Icon = grup.icon
  const adaAktif = grupAktif(grup, pathname)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-start justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
          adaAktif ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <span className="flex items-start gap-2 text-left">
          <Icon size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <NomorRegulasi nomor={grup.nomor} />
            <span className="block">{grup.label}</span>
          </span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 mt-0.5 transition-transform ${terbuka ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {terbuka && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pt-1 pb-1 pl-3 ml-[9px] border-l-2 border-gray-100 dark:border-gray-800">
              {grup.items.map((item) => (
                <ItemMenu key={item.path} item={item} indent />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GrupPlaceholder({ label, icon: Icon, nomor }) {
  return (
    <div
      title="Belum tersedia"
      className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-350 dark:text-gray-600 opacity-60 cursor-not-allowed select-none"
    >
      <span className="flex items-start gap-2 text-left">
        <Icon size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          <NomorRegulasi nomor={nomor} />
          <span className="block">{label}</span>
        </span>
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 mt-0.5">
        Segera Hadir
      </span>
    </div>
  )
}

// ===== VERSI MOBILE untuk sheet "Menu" =====
function GrupMenuMobile({ grup, terbuka, onToggle, pathname, onNavigate }) {
  const Icon = grup.icon
  const adaAktif = grupAktif(grup, pathname)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
          adaAktif ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <span className="flex items-start gap-2 text-left">
          <Icon size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <NomorRegulasi nomor={grup.nomor} />
            <span className="block">{grup.label}</span>
          </span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 mt-0.5 transition-transform ${terbuka ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {terbuka && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pt-1 pb-1 pl-3 ml-[9px] border-l-2 border-gray-100 dark:border-gray-800">
              {grup.items.map((item) => {
                const ItemIcon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`
                    }
                  >
                    <ItemIcon size={16} />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlaceholderMobile({ label, icon: Icon, nomor }) {
  return (
    <div className="flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-400 dark:text-gray-600 mb-1 opacity-60 select-none">
      <span className="flex items-start gap-2 text-left">
        <Icon size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          <NomorRegulasi nomor={nomor} />
          <span className="block">{label}</span>
        </span>
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 whitespace-nowrap flex-shrink-0 mt-0.5">
        Segera Hadir
      </span>
    </div>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = ambilUser()
  const [tema, setTemaState] = useState(ambilTema())
  const [menuTerbuka, setMenuTerbuka] = useState(false)
  const [grupTerbuka, setGrupTerbuka] = useState({ aspek3: true, aspek1: true, aspek2: true, aspek4: true })
  const [grupTerbukaMobile, setGrupTerbukaMobile] = useState({ aspek3: true, aspek1: false, aspek2: false, aspek4: false })

  function toggleGrup(key) {
    setGrupTerbuka((sebelumnya) => ({ ...sebelumnya, [key]: !sebelumnya[key] }))
  }

  function toggleGrupMobile(key) {
    setGrupTerbukaMobile((sebelumnya) => ({ ...sebelumnya, [key]: !sebelumnya[key] }))
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function handleToggleTema() {
    const temaBaru = toggleTema()
    setTemaState(temaBaru)
  }

  function tutupMenu() {
    setMenuTerbuka(false)
  }

  const grupSubTab = cariGrupUntukSubTab(location.pathname)

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (md ke atas) ===== */}
      <div className="hidden md:flex w-64 bg-white dark:bg-gray-900 min-h-screen p-4 flex-shrink-0 flex-col border-r-2 border-blue-500 sticky top-0 h-screen transition-colors overflow-y-auto">
        <div className="flex flex-col items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-white rounded-full p-2 mb-2 shadow-sm">
            <img src={logoSicool} alt="Logo SICOOL" className="w-40 h-40 object-contain" />
          </div>
          <h1 className="text-gray-900 dark:text-white text-sm font-bold text-center">Pengelolaan SPIP</h1>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <ItemMenu item={MENU_TUNGGAL} />

          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>

          {URUTAN_ASPEK_DESKTOP.map((entri, idx) => (
            <div
              key={entri.data.key}
              className={idx > 0 ? "pt-2 mt-1 border-t border-gray-100 dark:border-gray-800" : ""}
            >
              {entri.tipe === "grup" ? (
                <GrupMenuDesktop
                  grup={entri.data}
                  terbuka={grupTerbuka[entri.data.key]}
                  onToggle={() => toggleGrup(entri.data.key)}
                  pathname={location.pathname}
                />
              ) : (
                <GrupPlaceholder label={entri.data.label} icon={entri.data.icon} nomor={entri.data.nomor} />
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <button
            onClick={handleToggleTema}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 mb-2 flex items-center gap-2"
          >
            {tema === "light" ? <Moon size={16} /> : <Sun size={16} />}
            {tema === "light" ? "Mode Gelap" : "Mode Terang"}
          </button>

          <p className="text-gray-600 dark:text-gray-300 text-sm px-2 mb-2 flex items-center gap-2">
            <User size={16} /> {user?.nama}
          </p>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* ===== MOBILE TOP BAR (di bawah md) ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b-2 border-blue-500 px-4 py-3 flex items-center gap-2 transition-colors">
        <div className="bg-white rounded-full p-1 flex items-center justify-center shadow-sm">
          <img src={logoSicool} alt="Logo SICOOL" className="w-6 h-6 object-contain" />
        </div>
        <span className="text-gray-900 dark:text-white text-sm font-bold">Pengelolaan SPIP</span>
      </div>

      {/* ===== MOBILE SUB-TAB (hanya muncul saat berada di aspek dengan >1 sub-halaman) ===== */}
      {grupSubTab && (
        <div className="md:hidden fixed top-[52px] left-0 right-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-1 py-2">
            {grupSubTab.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM NAVIGATION BAR ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="relative bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center">
            {/* Kelompok kiri: tab per aspek — flex-1 supaya lebar SELALU sama dengan kelompok kanan */}
            <div className="flex-1 flex items-center justify-around">
              {ASPEK_TAB_MOBILE.map((grup) => {
                const Icon = grup.icon
                const aktif = grupAktif(grup, location.pathname)
                return (
                  <NavLink
                    key={grup.key}
                    to={grup.items[0].path}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium"
                  >
                    <span className={`relative p-1.5 rounded-full transition-colors duration-150 ${aktif ? "bg-blue-50 dark:bg-blue-950" : ""}`}>
                      {aktif && (
                        <motion.div
                          layoutId="indikator-aktif-mobile"
                          className="absolute inset-0 rounded-full bg-blue-50 dark:bg-blue-950 -z-10"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon size={20} className={aktif ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"} />
                    </span>
                    <span className={aktif ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                      {grup.labelTab}
                    </span>
                  </NavLink>
                )
              })}
            </div>

            {/* Celah tengah kosong — lebar tetap, ini tempat FAB "+" duduk di atasnya */}
            <div className="w-16 flex-shrink-0" aria-hidden="true"></div>

            {/* Kelompok kanan: flex-1 juga, supaya celah tengah presisi di titik tengah bar */}
            <div className="flex-1 flex items-center justify-around">
              <button
                onClick={() => setMenuTerbuka(true)}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium text-gray-500 dark:text-gray-400"
              >
                <span className="p-1.5 rounded-full">
                  <Menu size={20} />
                </span>
                Menu
              </button>
            </div>
          </div>

          {/* Tombol "+" Input SPIP — bulat navy, terangkat di tengah bar */}
          <button
            onClick={() => navigate('/input')}
            aria-label="Input SPIP"
            className="absolute left-1/2 -translate-x-1/2 -top-4 w-14 h-14 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      {/* ===== SHEET: Menu (struktur lengkap 5 poin regulasi + Input SPIP + pengaturan) ===== */}
      <AnimatePresence>
        {menuTerbuka && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={tutupMenu}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Menu</h2>
                <button onClick={tutupMenu} className="text-gray-500 dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <ItemMenu item={MENU_TUNGGAL} onNavigate={tutupMenu} />

              <div className="h-px bg-gray-200 dark:bg-gray-800 my-3"></div>

              {URUTAN_ASPEK_DESKTOP.map((entri, idx) => (
                <div
                  key={entri.data.key}
                  className={idx > 0 ? "pt-2 mt-1 border-t border-gray-100 dark:border-gray-800" : ""}
                >
                  {entri.tipe === "grup" ? (
                    <GrupMenuMobile
                      grup={entri.data}
                      terbuka={grupTerbukaMobile[entri.data.key]}
                      onToggle={() => toggleGrupMobile(entri.data.key)}
                      pathname={location.pathname}
                      onNavigate={tutupMenu}
                    />
                  ) : (
                    <PlaceholderMobile label={entri.data.label} icon={entri.data.icon} nomor={entri.data.nomor} />
                  )}
                </div>
              ))}

              <div className="h-px bg-gray-200 dark:bg-gray-800 my-3"></div>

              <button
                onClick={handleToggleTema}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 mb-1 flex items-center gap-2"
              >
                {tema === "light" ? <Moon size={16} /> : <Sun size={16} />}
                {tema === "light" ? "Mode Gelap" : "Mode Terang"}
              </button>

              <p className="text-gray-600 dark:text-gray-300 text-sm px-3 py-2.5 flex items-center gap-2">
                <User size={16} /> {user?.nama}
              </p>

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 dark:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar