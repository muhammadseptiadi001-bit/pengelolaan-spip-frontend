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
import logoEsdm from '../assets/logo-esdm.png'

// ===== STRUKTUR MENU BERDASARKAN 5 ASPEK TUGAS & TANGGUNG JAWAB KO =====
// Semua 5 aspek AKTIF. Aspek dengan HANYA 1 sub-halaman dirender sebagai link langsung
// (flat, highlight solid saat aktif) — bukan dropdown.
//
// BOTTOM NAV MOBILE (revisi ke-2): FAB "+" Input SPIP sebelumnya melayang di TENGAH atas
// bar dan menutupi label tab tengah (Kelayakan). Sekarang FAB dipindah ke POJOK KIRI
// BAWAH — supaya tidak menutupi tab pertama (Pemeliharaan), bar diberi padding-kiri
// (pl-16) sebagai "ruang khusus" untuk FAB, dan kelima tab digeser mulai setelah ruang
// itu. FAB sendiri absolute di pojok kiri, terangkat di atas garis bar (-top-4).
//
// REVISI VISUAL (redesign): tampilan disamakan dengan identitas warna halaman Login
// (navy #0B1E33 + emas #F2A93B + biru #3B82C4). Setiap aspek diberi warna aksen
// berbeda (chip ikon & badge nomor regulasi) supaya menu tidak terasa monoton/kaku,
// indikator aktif memakai gradient navy + garis aksen emas, dan ditambah animasi
// halus (glow logo berdenyut, ring FAB berdenyut, hover lift). Struktur & logic
// TIDAK berubah sama sekali dari versi sebelumnya.

const MENU_TUNGGAL = { path: "/input", label: "Input SPIP", icon: FilePlus }

const GRUP_KELAYAKAN = {
  key: "aspek3",
  label: "Kelayakan SPIP",
  labelTab: "Kelayakan",
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
  labelTab: "Pengamanan",
  icon: ShieldAlert,
  nomor: "4.4.2",
  items: [
    { path: "/pengamanan-instalasi", label: "Pengamanan Instalasi", icon: ShieldAlert },
  ],
}

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

const GRUP_KAJIAN_TEKNIS = {
  key: "aspek5",
  label: "Evaluasi Laporan Hasil Kajian Teknis",
  labelTab: "Kajian",
  icon: FileSearch,
  nomor: "4.4.5",
  items: [
    { path: "/kajian-teknis", label: "Evaluasi Laporan Hasil Kajian Teknis", icon: FileSearch },
  ],
}

// Urutan tampil, DIURUTKAN SESUAI URUTAN TUGAS 1 → 5. Dipakai untuk render desktop
// MAUPUN sheet "Menu" di mobile — satu sumber kebenaran struktur.
const URUTAN_ASPEK_DESKTOP = [
  { tipe: "grup", data: GRUP_PEMELIHARAAN },
  { tipe: "grup", data: GRUP_PENGAMANAN },
  { tipe: "grup", data: GRUP_KELAYAKAN },
  { tipe: "grup", data: GRUP_KOMPETENSI },
  { tipe: "grup", data: GRUP_KAJIAN_TEKNIS },
]

// Kelima aspek tampil di bottom nav mobile, dalam satu baris rata.
const ASPEK_TAB_MOBILE = [GRUP_PEMELIHARAAN, GRUP_PENGAMANAN, GRUP_KELAYAKAN, GRUP_KOMPETENSI, GRUP_KAJIAN_TEKNIS]

// ===== TOKEN WARNA (redesign) =====
// Aksen berbeda per aspek supaya menu terasa lebih hidup & mudah dibedakan sekilas,
// tanpa mengubah identitas utama (navy + emas) yang dipakai di halaman Login.
const AKSEN = {
  aspek1: { chip: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400", badge: "bg-gradient-to-br from-teal-400 to-teal-600" },
  aspek2: { chip: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400", badge: "bg-gradient-to-br from-rose-400 to-rose-600" },
  aspek3: { chip: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400", badge: "bg-gradient-to-br from-amber-400 to-amber-600" },
  aspek4: { chip: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400", badge: "bg-gradient-to-br from-purple-400 to-purple-600" },
  aspek5: { chip: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400", badge: "bg-gradient-to-br from-sky-400 to-sky-600" },
}

// Gradient navy khas Login, dipakai untuk semua state "aktif" supaya identitas warna konsisten.
const AKTIF_GRADIENT = "bg-gradient-to-r from-[#0B1E33] to-[#1B3A5C] shadow-md shadow-[#0B1E33]/25"

function itemAktif(item, pathname) {
  return item.end ? pathname === item.path : pathname.startsWith(item.path)
}

function grupAktif(grup, pathname) {
  return grup.items.some((it) => itemAktif(it, pathname))
}

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
        `relative flex items-center gap-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          indent ? "pl-4 pr-3" : "px-3"
        } ${
          isActive
            ? "text-white"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-0.5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="indikator-aktif-desktop"
              className={`absolute inset-0 rounded-xl -z-10 ${AKTIF_GRADIENT}`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            >
              <span className="absolute right-0 top-0 bottom-0 w-1 rounded-r-xl bg-[#F2A93B]" />
            </motion.div>
          )}
          <Icon size={16} className="flex-shrink-0" />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

// Kop nomor regulasi (mis. "4.4.3"). Sekarang ditampilkan sebagai pill bergradasi warna
// aksen aspek — saat item aktif, pill jadi putih transparan supaya kontras di atas navy.
function NomorRegulasi({ nomor, aktif = false, badgeClass = "bg-gradient-to-br from-blue-400 to-blue-600", size = "text-[10px]" }) {
  if (!nomor) return null
  return (
    <span
      className={`inline-block ${size} font-bold tracking-wide leading-none mb-1 px-1.5 py-0.5 rounded-full text-white ${
        aktif ? "bg-white/20" : badgeClass
      }`}
    >
      {nomor}
    </span>
  )
}

function GrupMenuDesktop({ grup, terbuka, onToggle, pathname }) {
  const Icon = grup.icon
  const adaAktif = grupAktif(grup, pathname)
  const aksen = AKSEN[grup.key]

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-start justify-between gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
          adaAktif ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <span className="flex items-start gap-2.5 text-left">
          <span className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${aksen.chip}`}>
            <Icon size={14} />
          </span>
          <span>
            <NomorRegulasi nomor={grup.nomor} badgeClass={aksen.badge} />
            <span className="block">{grup.label}</span>
          </span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 mt-2 transition-transform duration-200 ${terbuka ? "rotate-180" : ""}`} />
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

// ===== VERSI "TEGAS": untuk aspek yang cuma punya 1 sub-halaman. Link langsung, tanpa
// panah/expand, dengan highlight gradient navy + garis aksen emas saat aktif. =====
function ItemMenuTegas({ grup }) {
  const item = grup.items[0]
  const Icon = grup.icon
  const aksen = AKSEN[grup.key]
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        `relative flex items-start gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
          isActive
            ? "text-white"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 hover:translate-x-0.5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="indikator-aktif-desktop"
              className={`absolute inset-0 rounded-xl -z-10 ${AKTIF_GRADIENT}`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            >
              <span className="absolute right-0 top-0 bottom-0 w-1 rounded-r-xl bg-[#F2A93B]" />
            </motion.div>
          )}
          <span className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${isActive ? "bg-white/15" : aksen.chip}`}>
            <Icon size={14} className={isActive ? "text-white" : ""} />
          </span>
          <span>
            <NomorRegulasi nomor={grup.nomor} aktif={isActive} badgeClass={aksen.badge} />
            <span className="block">{grup.label}</span>
          </span>
        </>
      )}
    </NavLink>
  )
}

// ===== VERSI MOBILE untuk sheet "Menu" =====
function GrupMenuMobile({ grup, terbuka, onToggle, pathname, onNavigate }) {
  const Icon = grup.icon
  const adaAktif = grupAktif(grup, pathname)
  const aksen = AKSEN[grup.key]

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          adaAktif ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <span className="flex items-start gap-2.5 text-left">
          <span className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${aksen.chip}`}>
            <Icon size={14} />
          </span>
          <span>
            <NomorRegulasi nomor={grup.nomor} badgeClass={aksen.badge} />
            <span className="block">{grup.label}</span>
          </span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 mt-2 transition-transform duration-200 ${terbuka ? "rotate-180" : ""}`} />
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
                      `relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? `text-white ${AKTIF_GRADIENT}`
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute right-0 top-0 bottom-0 w-1 rounded-r-xl bg-[#F2A93B]" />}
                        <ItemIcon size={16} />
                        {item.label}
                      </>
                    )}
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

// Versi mobile dari ItemMenuTegas — untuk aspek 1 sub-halaman di sheet "Menu".
function ItemMenuTegasMobile({ grup, onNavigate }) {
  const item = grup.items[0]
  const Icon = grup.icon
  const aksen = AKSEN[grup.key]
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-1 ${
          isActive
            ? `text-white ${AKTIF_GRADIENT}`
            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute right-0 top-0 bottom-0 w-1 rounded-r-xl bg-[#F2A93B]" />}
          <span className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${isActive ? "bg-white/15" : aksen.chip}`}>
            <Icon size={14} className={isActive ? "text-white" : ""} />
          </span>
          <span>
            <NomorRegulasi nomor={grup.nomor} aktif={isActive} badgeClass={aksen.badge} />
            <span className="block">{grup.label}</span>
          </span>
        </>
      )}
    </NavLink>
  )
}

// Tab bottom nav mobile untuk satu aspek — flex-1 supaya kelima tab lebar rata.
function TabAspekMobile({ grup, pathname }) {
  const Icon = grup.icon
  const aktif = grupAktif(grup, pathname)
  const aksen = AKSEN[grup.key]
  return (
    <NavLink
      to={grup.items[0].path}
      className="flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl text-[10px] font-medium leading-tight min-w-0"
    >
      <motion.span whileTap={{ scale: 0.88 }} className={`relative p-1.5 rounded-full transition-colors duration-200 ${aktif ? aksen.chip : ""}`}>
        {aktif && (
          <motion.div
            layoutId="indikator-aktif-mobile"
            className={`absolute inset-0 rounded-full -z-10 ${aksen.chip}`}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <Icon size={18} className={aktif ? aksen.chip.match(/text-\S+/g)?.join(" ") : "text-gray-500 dark:text-gray-400"} />
      </motion.span>
      <span className={`text-center truncate w-full ${aktif ? aksen.chip.match(/text-\S+/g)?.join(" ") : "text-gray-500 dark:text-gray-400"}`}>
        {grup.labelTab}
      </span>
    </NavLink>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = ambilUser()
  const [tema, setTemaState] = useState(ambilTema())
  const [menuTerbuka, setMenuTerbuka] = useState(false)
  const [grupTerbuka, setGrupTerbuka] = useState({ aspek3: true })
  const [grupTerbukaMobile, setGrupTerbukaMobile] = useState({ aspek3: true })

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
      <div className="hidden md:flex relative w-64 bg-white dark:bg-gray-900 min-h-screen p-4 flex-shrink-0 flex-col sticky top-0 h-screen transition-colors overflow-y-auto">
        {/* garis aksen gradient di tepi kanan, menggantikan border solid biru */}
        <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#F2A93B] via-[#3B82C4] to-[#0B1E33]" />

        <div className="flex flex-col items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative mb-2"
          >
            <motion.div
              animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400/40 via-blue-400/25 to-amber-400/40 blur-lg"
            />
            <div className="relative bg-white rounded-full p-2 shadow-md">
              <img src={logoEsdm} alt="Logo Kementerian ESDM" className="w-40 h-40 object-contain" />
            </div>
          </motion.div>
          <h1 className="text-gray-900 dark:text-white text-sm font-bold text-center">Pengelolaan SPIP</h1>
          <div className="w-14 h-[3px] rounded-full mt-2 bg-gradient-to-r from-[#3B82C4] via-[#5FA8D3] to-[#F2A93B]" />
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <NavLink
            to={MENU_TUNGGAL.path}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "text-white shadow-md shadow-[#F2A93B]/25 bg-gradient-to-r from-[#F2A93B] to-[#E0932A]"
                  : "text-[#0B1E33] dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:translate-x-0.5"
              }`
            }
          >
            <FilePlus size={16} className="flex-shrink-0" />
            {MENU_TUNGGAL.label}
          </NavLink>

          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>

          {URUTAN_ASPEK_DESKTOP.map((entri, idx) => (
            <motion.div
              key={entri.data.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={idx > 0 ? "pt-2 mt-1 border-t border-gray-100 dark:border-gray-800" : ""}
            >
              {entri.data.items.length > 1 ? (
                <GrupMenuDesktop
                  grup={entri.data}
                  terbuka={grupTerbuka[entri.data.key]}
                  onToggle={() => toggleGrup(entri.data.key)}
                  pathname={location.pathname}
                />
              ) : (
                <ItemMenuTegas grup={entri.data} />
              )}
            </motion.div>
          ))}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <button
            onClick={handleToggleTema}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 mb-2 flex items-center gap-2 transition-colors duration-200"
          >
            {tema === "light" ? <Moon size={16} /> : <Sun size={16} />}
            {tema === "light" ? "Mode Gelap" : "Mode Terang"}
          </button>

          <p className="text-gray-600 dark:text-gray-300 text-sm px-2 mb-2 flex items-center gap-2">
            <User size={16} /> {user?.nama}
          </p>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-red-500 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors duration-200"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* ===== MOBILE TOP BAR (di bawah md) — tombol "Menu" di kanan ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between transition-colors">
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F2A93B] via-[#3B82C4] to-[#0B1E33]" />
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-full p-1 flex items-center justify-center shadow-sm">
            <img src={logoEsdm} alt="Logo Kementerian ESDM" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-gray-900 dark:text-white text-sm font-bold">Pengelolaan SPIP</span>
        </div>

        <button
          onClick={() => setMenuTerbuka(true)}
          aria-label="Buka menu"
          className="p-2 -mr-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu size={20} />
        </button>
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
                  `flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? `text-white ${AKTIF_GRADIENT}`
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
      {/* FAB "+" Input SPIP di POJOK KIRI, melayang di atas bar (-top-4). Bar diberi
          pl-16 (ruang kosong seukuran FAB) supaya kelima tab mulai SETELAH ruang itu —
          jadi FAB tidak menutupi tab pertama (Pemeliharaan) atau tab manapun. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="relative bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pl-16 pr-1 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center">
            {ASPEK_TAB_MOBILE.map((grup) => (
              <TabAspekMobile key={grup.key} grup={grup} pathname={location.pathname} />
            ))}
          </div>

          <button
            onClick={() => navigate('/input')}
            aria-label="Input SPIP"
            className="absolute left-2 -top-4 w-14 h-14 rounded-full flex items-center justify-center"
          >
            <motion.span
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-[#F2A93B]/40"
            />
            <span className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#0B1E33] to-[#1B3A5C] text-white flex items-center justify-center shadow-lg shadow-[#0B1E33]/40 active:scale-95 transition-transform ring-2 ring-[#F2A93B]">
              <Plus size={26} />
            </span>
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

              <NavLink
                to={MENU_TUNGGAL.path}
                onClick={tutupMenu}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "text-white shadow-md shadow-[#F2A93B]/25 bg-gradient-to-r from-[#F2A93B] to-[#E0932A]"
                      : "text-[#0B1E33] dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30"
                  }`
                }
              >
                <FilePlus size={16} className="flex-shrink-0" />
                {MENU_TUNGGAL.label}
              </NavLink>

              <div className="h-px bg-gray-200 dark:bg-gray-800 my-3"></div>

              {URUTAN_ASPEK_DESKTOP.map((entri, idx) => (
                <div
                  key={entri.data.key}
                  className={idx > 0 ? "pt-2 mt-1 border-t border-gray-100 dark:border-gray-800" : ""}
                >
                  {entri.data.items.length > 1 ? (
                    <GrupMenuMobile
                      grup={entri.data}
                      terbuka={grupTerbukaMobile[entri.data.key]}
                      onToggle={() => toggleGrupMobile(entri.data.key)}
                      pathname={location.pathname}
                      onNavigate={tutupMenu}
                    />
                  ) : (
                    <ItemMenuTegasMobile grup={entri.data} onNavigate={tutupMenu} />
                  )}
                </div>
              ))}

              <div className="h-px bg-gray-200 dark:bg-gray-800 my-3"></div>

              <button
                onClick={handleToggleTema}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 mb-1 flex items-center gap-2 transition-colors duration-200"
              >
                {tema === "light" ? <Moon size={16} /> : <Sun size={16} />}
                {tema === "light" ? "Mode Gelap" : "Mode Terang"}
              </button>

              <p className="text-gray-600 dark:text-gray-300 text-sm px-3 py-2.5 flex items-center gap-2">
                <User size={16} /> {user?.nama}
              </p>

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors duration-200"
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