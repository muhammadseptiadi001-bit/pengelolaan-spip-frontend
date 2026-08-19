import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Menangkap error saat render halaman (termasuk kegagalan lazy-load chunk yang
// gagal di-reload otomatis). Tanpa ini, error di satu halaman bikin seluruh area
// konten jadi blank putih tanpa penjelasan apa pun ke pengguna.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error tertangkap ErrorBoundary:', error, info)
  }

  handleMuatUlang = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
              Halaman gagal dimuat
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Terjadi kesalahan saat menampilkan halaman ini. Coba muat ulang halaman.
            </p>
            <button
              onClick={this.handleMuatUlang}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0B1E33] to-[#1B3A5C] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md shadow-[#0B1E33]/25"
            >
              <RefreshCw size={15} />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary