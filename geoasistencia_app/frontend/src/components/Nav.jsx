import { Link, useLocation } from 'react-router-dom'
import Badge from './Badge.jsx'
import Button from './Button.jsx'
import { clearSession, getSession } from '../lib/api.js'

function Item({ to, children }) {
  const loc = useLocation()
  const active = loc.pathname === to
  return (
    <Link
      to={to}
      className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ring-1 ${active ? 'bg-white/10 ring-white/20 text-white' : 'bg-white/5 ring-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </Link>
  )
}

export default function Nav({ mode = 'admin' }) {
  const s = getSession()
  const role = (s.rol || '').toUpperCase()

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-glow p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-white font-extrabold text-lg">GeoAsistencia</div>
          <div className="text-white/60 text-xs">Privacidad por diseño · LOPDP</div>
        </div>
        <Badge tone={role === 'SUPERADMIN' ? 'amber' : role === 'ADMIN' ? 'sky' : 'emerald'}>
          {role || '—'}
        </Badge>
      </div>

      <div className="space-y-2">
        {mode === 'employee' ? (
          <>
            <Item to="/employee">Mi jornada</Item>
            <Item to="/privacy">Privacidad</Item>
          </>
        ) : (
          <>
            <Item to="/admin">Dashboard</Item>
            <Item to="/admin/usuarios">Usuarios</Item>
            {role === 'SUPERADMIN' && <Item to="/admin/sedes">Sedes</Item>}
            <Item to="/admin/audit">Auditoría</Item>
            <Item to="/privacy">Privacidad</Item>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            clearSession()
            window.location.href = '/login'
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
