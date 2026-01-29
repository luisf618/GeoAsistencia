import { useEffect, useState } from 'react'
import Logo from './Logo'
import { Link, NavLink } from 'react-router-dom'
import { apiGet, getSession, logout as doLogout } from '../lib/api'

export default function Topbar({ onLogout }) {
  const s = getSession()
  const rol = (s?.rol || '').toUpperCase()
  const dashboardTo = rol === 'EMPLEADO' ? '/employee' : '/admin'

  const [pendingManual, setPendingManual] = useState(0)

  useEffect(() => {
    if (!s?.token) return
    if (!(rol === 'ADMIN' || rol === 'SUPERADMIN')) return

    let alive = true
    const load = async () => {
      try {
        const r = await apiGet('/admin/manual-asistencias/count?status=pendiente')
        if (alive) setPendingManual(Number(r?.count || 0))
      } catch {
        // ignore
      }
    }

    load()
    const t = setInterval(load, 15000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [s?.token, rol])

  const linkBase = "rounded-xl px-3 py-2 text-sm font-semibold transition"
  const navCls = ({ isActive }) =>
    `${linkBase} ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-700 hover:bg-slate-50 border border-transparent'}`

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <Logo />

        <div className="flex items-center gap-2">
          {s?.token ? (
            <>
              <NavLink to={dashboardTo} className={navCls}>Dashboard</NavLink>
              <NavLink to="/" className={navCls}>Inicio</NavLink>
              {(rol === 'ADMIN' || rol === 'SUPERADMIN') ? (
                <Link to="/admin/asistencias?tab=manuales" className="relative rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-transparent">
                  🔔
                  {pendingManual > 0 ? (
                    <span className="absolute -top-1 -right-1 rounded-full bg-indigo-600 text-white text-xs leading-none px-2 py-0.5">
                      {pendingManual}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              <span className="badge hidden sm:inline-flex">{rol}</span>
              <button
                className="btn-primary"
                onClick={() => {
                  doLogout()
                  onLogout?.()
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/" className={navCls}>Inicio</NavLink>
              <Link to="/login" className="btn-primary">Entrar</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
