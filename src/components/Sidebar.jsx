import { NavLink, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { ambilUser, logout } from '../utils/auth'
import { ambilTema, toggleTema } from '../utils/theme'
import logoSicool from '../assets/logo-sicool.png'

function Sidebar() {
  const navigate = useNavigate()
  const user = ambilUser()
  const [tema, setTemaState] = useState(ambilTema())
  const [menuLainnyaTerbuka, setMenuLainnyaTerbuka] = useState(false)

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/input", label: "Input Data", icon: FilePlus },
    { path: "/data", label: "Data SPIP", icon: ClipboardList },
    { path: "/evaluasi", label: "Evaluasi", icon: BarChart3 },
    { path: "/riwayat", label: "Riwayat", icon: History },
  ]

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
      <div className="hidden md:flex w-56 bg-white dark:bg-gray-900 min-h-screen p-4 flex-shrink-0 flex-col border-r-2 border-blue-500 sticky top-0 h-screen transition-colors">
        <div className="flex flex-col items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-white rounded-full p-2 mb-2 shadow-sm">
            <img src={logoSicool} alt="Logo SICOOL" className="w-40 h-40 object-contain" />
          </div>
          <h1 className="text-gray-900 dark:text-white text-sm font-bold text-center">Pengelolaan SPIP</h1>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
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
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
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

      {/* ===== BOTTOM SHEET: Menu Lainnya (Riwayat, Mode Gelap, User, Logout) ===== */}
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
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Menu Lainnya</h2>
                <button onClick={tutupMenuLainnya} className="text-gray-500 dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>

              {menuItems.slice(4).map((item) => {
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