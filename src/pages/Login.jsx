import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { simpanLogin } from '../utils/auth'
import logoSicool from '../assets/logo-sicool.png'

const TUGAS_KO = [
  "Sistem dan pelaksanaan pemeliharaan/perawatan sarana, prasarana, instalasi, dan peralatan pertambangan",
  "Pengamanan instalasi",
  "Kelayakan sarana, prasarana, instalasi, dan peralatan pertambangan",
  "Kompetensi tenaga teknik",
  "Evaluasi laporan hasil kajian teknis pertambangan",
]

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    alert("DEBUG 1: mulai login, kode terbaru sudah jalan")

    try {
      const res = await fetch("https://pengelolaan-spip-backend-production.up.railway.app/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert("DEBUG 4a: res.ok FALSE, error: " + (data.error || "tidak diketahui"))
        setError(data.error || "Login gagal")
        setLoading(false)
        return
      }

      simpanLogin(data.token, data.user)
      alert("DEBUG 6: sebelum navigate('/'), token tersimpan? " + (localStorage.getItem("spipToken") ? "YA" : "TIDAK"))

      navigate("/")
    } catch (err) {
      alert("DEBUG X: MASUK CATCH BLOCK, error: " + err.message)
      setError("Tidak bisa terhubung ke server. Pastikan backend berjalan.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Sora', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* PANEL KIRI - Brand / Hero */}
      <div className="relative md:w-1/2 min-h-[420px] md:min-h-screen md:max-h-screen bg-[#0B1E33] overflow-hidden md:overflow-y-auto flex flex-col items-center px-8 md:px-14 py-10 md:py-12">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
          viewBox="0 0 800 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M-50 120 C 150 60, 300 180, 500 100 S 850 40, 900 130" stroke="#3B6E91" strokeWidth="2" />
          <path d="M-50 260 C 180 200, 320 320, 520 240 S 860 180, 900 270" stroke="#3B6E91" strokeWidth="2" />
          <path d="M-50 420 C 160 360, 340 470, 540 400 S 870 350, 900 430" stroke="#F2A93B" strokeWidth="2" />
          <path d="M-50 600 C 200 540, 330 650, 540 580 S 860 530, 900 610" stroke="#3B6E91" strokeWidth="2" />
          <path d="M-50 760 C 180 700, 340 820, 540 750 S 870 700, 900 780" stroke="#3B6E91" strokeWidth="2" />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center mt-2 md:mt-4">
          <div className="bg-white rounded-full p-4 md:p-5 shadow-xl">
            <img
              src={logoSicool}
              alt="Logo SICOOL"
              className="w-28 h-28 md:w-36 md:h-36 object-contain"
            />
          </div>
          <h1 className="font-display text-white text-2xl md:text-3xl font-extrabold mt-5">
            Pengelolaan SPIP
          </h1>
          <p className="font-body text-[#7FA6C4] text-xs md:text-sm mt-1.5 max-w-xs">
            Sistem Pemeriksaan &amp; Pengujian Alat Berat
          </p>
          <div className="w-32 h-[3px] rounded-full mt-5 bg-gradient-to-r from-[#3B82C4] via-[#5FA8D3] to-[#F2A93B]" />
        </div>

        <div className="relative z-10 hidden md:block w-full max-w-sm mt-10">
          <p className="font-display text-white text-sm font-bold tracking-wide mb-3">
            Tugas &amp; Tanggung Jawab KO
          </p>
          <ol className="space-y-2.5">
            {TUGAS_KO.map((item, i) => (
              <li key={i} className="flex items-start gap-3 font-body text-[#9FB7CC] text-[13px] leading-snug">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-[#F2A93B] text-[11px] font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative z-10 mt-auto pt-8 text-[#5D7C93] font-body text-xs text-center">
          © {new Date().getFullYear()} SICOOL — Safety is Culture of Our Life
        </div>
      </div>

      {/* PANEL KANAN - Form Login */}
      <div className="md:w-1/2 flex-1 flex items-center justify-center bg-[#F5F7FA] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="w-10 h-10 rounded-lg bg-[#0B1E33] flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-[#F2A93B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="font-display text-xl font-bold text-gray-900">Masuk ke Akun</h2>
            <p className="font-body text-sm text-gray-500 mt-1">
              Gunakan username dan password akun SPIP Anda.
            </p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-100 text-red-600 px-3 py-2.5 rounded-lg text-sm font-body">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-6">
              <div>
                <label className="block text-xs font-semibold font-body text-gray-600 mb-1.5 tracking-wide">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm font-body text-gray-900 focus:ring-2 focus:ring-[#3B82C4]/40 focus:border-[#3B82C4] outline-none transition"
                  placeholder="Masukkan username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold font-body text-gray-600 mb-1.5 tracking-wide">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm font-body text-gray-900 focus:ring-2 focus:ring-[#3B82C4]/40 focus:border-[#3B82C4] outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#0B1E33] hover:bg-[#12283F] disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-semibold font-body text-sm transition flex items-center justify-center gap-2"
              >
                {loading ? "Memproses..." : "Login"}
              </button>
            </form>

            <p className="font-body text-sm text-gray-500 mt-5 text-center">
              Belum punya akun?{" "}
              <Link to="/register" className="text-[#0B1E33] font-semibold underline underline-offset-2">
                Daftar di sini
              </Link>
            </p>
          </div>

          <p className="font-body text-xs text-gray-400 text-center mt-6">
            © {new Date().getFullYear()} SICOOL — Pengelolaan SPIP
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login