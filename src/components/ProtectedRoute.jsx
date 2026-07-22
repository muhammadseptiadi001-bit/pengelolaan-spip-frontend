import { Navigate } from 'react-router-dom'
import { sudahLogin } from '../utils/auth'

function ProtectedRoute({ children }) {
  if (!sudahLogin()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoute