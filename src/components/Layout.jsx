import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <Sidebar />
      <div className="flex-1 p-6 overflow-x-auto">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout