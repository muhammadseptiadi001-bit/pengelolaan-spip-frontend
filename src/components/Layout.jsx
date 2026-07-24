import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ToastContainer from './ToastContainer'

function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <Sidebar />
      <ToastContainer />
      <div className="flex-1 min-w-0 p-4 md:p-6 pt-20 md:pt-6 overflow-x-auto w-full">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout