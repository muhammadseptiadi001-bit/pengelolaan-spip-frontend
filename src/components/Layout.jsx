import { Outlet, useLocation } from 'react-router-dom'
import Sidebar, { cariGrupUntukSubTab } from './Sidebar'
import ToastContainer from './ToastContainer'

function Layout() {
  const location = useLocation()
  const adaSubTab = Boolean(cariGrupUntukSubTab(location.pathname))

  return (
    <div className="min-h-screen bg-[#f3f5f9] text-slate-900 transition-colors dark:bg-[#07111f] dark:text-white">
      <Sidebar />
      <ToastContainer />

      <main
        className={`min-w-0 md:ml-72 p-4 pb-28 pt-20 md:p-8 md:pt-8 ${
          adaSubTab ? 'pt-32' : ''
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default Layout