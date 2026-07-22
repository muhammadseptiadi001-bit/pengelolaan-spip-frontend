import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ambilUser, logout } from '../utils/auth'
import { ambilTema, toggleTema } from '../utils/theme'
import logoEsdm from '../assets/logo-esdm.png'

function Sidebar() {
  const navigate = useNavigate()
  const user = ambilUser()
  const [tema, setTemaState] = useState(ambilTema())

  const menuItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/input", label: "Input Data", icon: "📝" },
    { path: "/data", label: "Data SPIP", icon: "📋" },
  ]

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function handleToggleTema() {
    const temaBaru = toggleTema()
    setTemaState(temaBaru)
  }

  return (
    <div className="w-56 bg-gray-900 min-h-screen p-4 flex-shrink-0 flex flex-col border-r-2 border-yellow-400">
      <div className="flex flex-col items-center mb-6 pb-4 border-b border-gray-700">
        <img src={logoEsdm} alt="Logo ESDM" className="w-12 h-12 object-contain mb-2" />
        <h1 className="text-white text-sm font-bold text-center">Pengelolaan SPIP</h1>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-yellow-400 text-gray-900"
                  : "text-gray-300 hover:bg-gray-800 hover:text-yellow-400"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 pt-4 mt-4">
        <button
          onClick={handleToggleTema}
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-yellow-400 mb-2 flex items-center gap-2"
        >
          {tema === "light" ? "🌙 Mode Gelap" : "☀️ Mode Terang"}
        </button>

        <p className="text-gray-300 text-sm px-2 mb-2">👤 {user?.nama}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-gray-800"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar