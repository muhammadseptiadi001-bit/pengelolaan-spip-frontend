import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  History,
  BarChart3,
  MoreHorizontal,
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
// lintas aspek (jadi pintu masuk untuk Aspek 1, 2, 3). Halaman-halaman yang sudah ada
// (Dashboard, Data SPIP, Evaluasi, Riwayat) semuanya berputar di sekitar kelayakan,
// jadi dibungkus sebagai Aspek 3. Aspek 1 (Pemeliharaan) baru mulai dikerjakan.
// Aspek 2, 4, 5 masih placeholder "Segera Hadir" sampai mulai dikerjakan.

const MENU_TUNGGAL = { path: "/input", label: "Input SPIP", icon: FilePlus }

const GRUP_ASPEK3 = {
  key: "aspek3",
  label: "Aspek 3 — Kelayakan",
  icon: ShieldCheck,
  items: [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { path: "/data", label: "Data SPIP", icon: ClipboardList },
    { path: "/evaluasi", label: "Evaluasi", icon: BarChart3 },
    { path: "/riwayat", label: "Riwayat", icon: History },
  ],
}

const GRUP_ASPEK1 = {
  key: "aspek1",
  label: "Aspek 1 — Pemeliharaan",
  icon: Wrench,
  items: [
    { path: "/pemeliharaan", label: "Pemeliharaan", icon: Wrench },
  ],
}

const ASPEK_PLACEHOLDER = [
  { key: "aspek2", label: "Aspek 2 — Pengamanan Instalasi", icon: ShieldAlert },
  { key: "aspek4", label: "Aspek 4 — Kompetensi Tenaga Teknik", icon: UserCog },
  { key: "aspek5", label: "Aspek 5 — Evaluasi Kajian Teknis", icon: FileSearch },
]

// Item cepat untuk bottom nav mobile (dipilih manual, bukan diturunkan dari struktur di atas,
// supaya Pemeliharaan yang baru tetap mudah dijangkau tanpa harus buka "Lainnya" dulu).
const MENU_CEPAT_MOBILE = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/input", label: "Input SPIP", icon: FilePlus },
  { path: "/data", label: "Data SPIP", icon: ClipboardList },
  { path: "/pemeliharaan", label: "Pemeliharaan", icon: Wrench },
]

function itemAktif(item, pathname) {
  return item.end ? pathname === item.path : pathname.startsWith(item.path)
}

function GrupMenuDesktop({ grup, terbuka, onToggle, pathname }) {
  const Icon = grup.icon
  const adaAktif = grup.items.some((it) => itemAktif(it, pathname))

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
          adaAktif ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon size={16} />
          {grup.label}
        </span>
        <ChevronDown size={14} className={`transition-transform ${terbuka ? "rotate-180" : ""}`} />
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
            <div className="flex flex-col gap-1 pl-2 pt-1 pb-1">
              {grup.items.map((item) => {
                const ItemIcon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
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

function GrupPlaceholder({ label, icon: Icon }) {
  return (
    <div
      title="Belum tersedia"
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-350 dark:text-gray-600 opacity-60 cursor-not-allowed select-none"
    >
      <span className="flex items-center gap-2">
        <Icon size={16} />
        {label}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 whitespace-nowrap">
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
  const [menuLainnyaTerbuka, setMenuLainnyaTerbuka] = useState(false)
  const [grupTerbuka, setGrupTerbuka] = useState({ aspek3: true, aspek1: true })

  function toggleGrup(key) {
    setGrupTerbuka((sebelumnya) => ({ ...sebelumnya, [key]: !sebelumnya[key] }))
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function handleToggleTema() {
    const temaBaru = toggleTema()
    setTemaState(temaBaru)
  }

  function tutupMenuLainnya() {
    setMenuLainnyaTerbuka(false)
  }

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
          <NavLink
            to={MENU_TUNGGAL.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              }`
            }
          >
            <MENU_TUNGGAL.icon size={18} />
            {MENU_TUNGGAL.label}
          </NavLink>

          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>

          <GrupMenuDesktop grup={GRUP_ASPEK3} terbuka={grupTerbuka.aspek3} onToggle={() => toggleGrup("aspek3")} pathname={location.pathname} />
          <GrupMenuDesktop grup={GRUP_ASPEK1} terbuka={grupTerbuka.aspek1} onToggle={() => toggleGrup("aspek1")} pathname={location.pathname} />

          {ASPEK_PLACEHOLDER.map((aspek) => (
            <GrupPlaceholder key={aspek.key} label={aspek.label} icon={aspek.icon} />
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

      {/* ===== MOBILE BOTTOM NAVIGATION BAR ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-2 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around">
          {MENU_CEPAT_MOBILE.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium transition min-w-[60px] ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`p-1.5 rounded-full transition ${isActive ? "bg-blue-50 dark:bg-blue-950" : ""}`}>
                      <Icon size={20} />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            )
          })}

          <button
            onClick={() => setMenuLainnyaTerbuka(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium text-gray-500 dark:text-gray-400 min-w-[60px]"
          >
            <span className="p-1.5 rounded-full">
              <MoreHorizontal size={20} />
            </span>
            Lainnya
          </button>
        </div>
      </div>

      {/* ===== BOTTOM SHEET: Menu Lainnya ===== */}
      <AnimatePresence>
        {menuLainnyaTerbuka && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={tutupMenuLainnya}
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
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Menu Lainnya</h2>
                <button onClick={tutupMenuLainnya} className="text-gray-500 dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1 mb-1.5">Aspek 3 — Kelayakan</p>
              {GRUP_ASPEK3.items.filter((it) => it.path !== "/" && it.path !== "/data").map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={tutupMenuLainnya}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 mb-1 flex items-center gap-2"
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                )
              })}

              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1 mb-1.5 mt-3">Aspek Lainnya</p>
              {ASPEK_PLACEHOLDER.map((aspek) => {
                const Icon = aspek.icon
                return (
                  <div
                    key={aspek.key}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-600 mb-1 flex items-center justify-between gap-2 opacity-60"
                  >
                    <span className="flex items-center gap-2"><Icon size={16} />{aspek.label}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 whitespace-nowrap">Segera Hadir</span>
                  </div>
                )
              })}

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