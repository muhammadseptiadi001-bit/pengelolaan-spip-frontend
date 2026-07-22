import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { simpanLogin } from '../utils/auth'
import logoEsdm from '../assets/logo-esdm.png'

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login gagal")
        return
      }

      simpanLogin(data.token, data.user)
      navigate("/")
    } catch (err) {
      setError("Tidak bisa terhubung ke server. Pastikan backend berjalan.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gray-900 py-8 flex flex-col items-center border-b-4 border-yellow-400">
          <img src={logoEsdm} alt="Logo ESDM" className="w-20 h-20 object-contain mb-3" />
          <h1 className="text-white text-lg font-bold text-center px-4">Pengelolaan SPIP</h1>
          <p className="text-yellow-400 text-xs mt-1">Sistem Pemeriksaan & Pengujian Alat Berat</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-gray-900 hover:bg-black text-yellow-400 px-4 py-2.5 rounded font-semibold transition"
            >
              Login
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-4 text-center">
            Belum punya akun? <Link to="/register" className="text-gray-900 font-semibold underline">Daftar di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login