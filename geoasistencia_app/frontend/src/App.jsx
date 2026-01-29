import { Routes, Route, useNavigate } from 'react-router-dom'
import Topbar from './components/Topbar'
import Protected from './components/Protected'
import Home from './pages/Home'
import Login from './pages/Login'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdminSummary from './pages/AdminSummary'
import AdminUsuarios from './pages/AdminUsuarios'
import AdminSedes from './pages/AdminSedes'
import AdminAudit from './pages/AdminAudit'
import AdminMiSede from './pages/AdminMiSede'
import AdminAsistencias from './pages/AdminAsistencias'

export default function App() {
  const nav = useNavigate()

  return (
    <div className="min-h-screen gradient-bg">
      <Topbar onLogout={() => nav('/')} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/employee"
          element={(
            <Protected allowRoles={["EMPLEADO"]}>
              <EmployeeDashboard />
            </Protected>
          )}
        />

        <Route
          path="/admin"
          element={(
            <Protected allowRoles={["ADMIN", "SUPERADMIN"]}>
              <AdminSummary />
            </Protected>
          )}
        />

        <Route
          path="/admin/usuarios"
          element={(
            <Protected allowRoles={["ADMIN", "SUPERADMIN"]}>
              <AdminUsuarios />
            </Protected>
          )}
        />

        <Route
          path="/admin/asistencias"
          element={(
            <Protected allowRoles={["ADMIN", "SUPERADMIN"]}>
              <AdminAsistencias />
            </Protected>
          )}
        />

        <Route
          path="/admin/sedes"
          element={(
            <Protected allowRoles={["SUPERADMIN"]}>
              <AdminSedes />
            </Protected>
          )}
        />

        <Route
          path="/admin/mi-sede"
          element={(
            <Protected allowRoles={["ADMIN", "SUPERADMIN"]}>
              <AdminMiSede />
            </Protected>
          )}
        />

        <Route
          path="/admin/audit"
          element={(
            <Protected allowRoles={["ADMIN", "SUPERADMIN"]}>
              <AdminAudit />
            </Protected>
          )}
        />

        <Route path="*" element={<Home />} />
      </Routes>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-500">
        GeoAsistencia · Demo Web · Privacidad por diseño (LOPDP) · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
