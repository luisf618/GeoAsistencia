import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { apiGet, getSession } from '../lib/api'
import { formatDateTimeEC } from "../utils/dates";

export default function AdminSummary() {
  const s = getSession()
  const [users, setUsers] = useState([])
  const [audit, setAudit] = useState([])
  const [dash, setDash] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    Promise.all([
      apiGet('/admin/usuarios'),
      apiGet('/admin/audit?limit=20'),
      apiGet('/admin/dashboard'),
      apiGet('/admin/asistencias?limit=20')
    ]).then(([u, a, d, r]) => {
      setUsers(u)
      setAudit(a)
      setDash(d)
      setRecent(r)
    }).catch(() => {})
  }, [])

  const role = (s?.rol || '').toUpperCase()

  const scopeLabel = useMemo(() => {
    if (!dash) return ''
    return dash.scope === 'global' ? 'Global' : 'Mi sede'
  }, [dash])

  return (
    <AdminShell title="Panel Admin">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Resumen</div>
            <div className="mt-2 text-slate-600">
              Gestión por roles: <b>Admin</b> (solo su sede) y <b>SuperAdmin</b> (todas las sedes).{' '}
              Vista: <b>{scopeLabel || '—'}</b>
            </div>
          </div>
          <div className="badge">Rol: {role}</div>
        </div>

        <div className="mt-6 grid sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4">
            <div className="text-xs text-slate-600">Empleados (alcance)</div>
            <div className="text-3xl font-extrabold text-slate-900">{dash?.total_empleados ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs text-slate-600">Entradas hoy</div>
            <div className="text-3xl font-extrabold text-slate-900">{dash?.entradas_hoy ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
            <div className="text-xs text-slate-600">Salidas hoy</div>
            <div className="text-3xl font-extrabold text-slate-900">{dash?.salidas_hoy ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="text-xs text-slate-600">Fuera de geocerca</div>
            <div className="text-3xl font-extrabold text-slate-900">{dash?.fuera_geocerca_hoy ?? '—'}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Privacidad (LOPDP)</div>
          <div className="mt-1 text-sm text-slate-600">
            Los listados muestran <b>solo códigos</b>. Para revelar datos personales: <b>justificación</b> + <b>contraseña</b> y se oculta automáticamente en <b>60s</b> (queda auditado).
          </div>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="text-lg font-extrabold">Asistencias recientes (20)</div>
        <div className="mt-3 overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Geocerca</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.registro_id}>
                  <td className="text-slate-600">{r.timestamp_registro ? formatDateTimeEC(r.timestamp_registro) : '—'}</td>
                  <td className="text-slate-900 font-semibold">{r.usuario_codigo}</td>
                  <td><span className="badge">{r.tipo}</span></td>
                  <td className={r.dentro_geocerca ? 'text-emerald-700' : 'text-amber-700'}>
                    {r.dentro_geocerca ? 'Dentro' : 'Fuera'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="text-lg font-extrabold">Última auditoría (20)</div>
        <div className="mt-3 overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.audit_id}>
                  <td className="text-slate-600">{formatDateTimeEC(a.timestamp, { hour12: true })}</td>
                  <td><span className="badge">{a.accion}</span></td>
                  <td className="text-slate-600">{a.entidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
