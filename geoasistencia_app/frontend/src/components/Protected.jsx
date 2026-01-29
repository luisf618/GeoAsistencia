import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/api'

export default function Protected({ allowRoles, children }) {
  const s = getSession()
  if (!s?.token) return <Navigate to="/login" replace />
  if (allowRoles?.length && !allowRoles.includes((s.rol || '').toUpperCase())) {
    return <Navigate to="/" replace />
  }
  return children
}
