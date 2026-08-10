import { Outlet, useLocation } from 'react-router-dom'
import Sidebar, { cariGrupUntukSubTab } from './Sidebar'
import ToastContainer from './ToastContainer'

function Layout() {
  const location = useLocation()
  // Saat berada di aspek dengan sub-tab (mis. Kelayakan SPIP), strip sub-tab mobile
  // menambah ±44px tinggi di bawah top bar, jadi konten butuh padding-top ekstra
  // supaya judul halaman tidak ketutup.
  const adaSubTab = Boolean(cariGrupUntukSubTab(location.pathname))

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <Sidebar />
      <ToastContainer />
      <div
        className={`flex-1 min-w-0 p-4 md:p-6 ${adaSubTab ? "pt-32" : "pt-20"} md:pt-6 pb-28 md:pb-6 overflow-x-auto w-full`}
      >
        <Outlet />
      </div>
    </div>
  )
}

export default Layout