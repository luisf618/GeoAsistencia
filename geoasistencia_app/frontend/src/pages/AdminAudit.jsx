import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { apiGet } from '../lib/api'

function tryParseJson(v) {
  if (v == null) return null
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

function fmtValue(v) {
  if (v == null) return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v.trim() ? v : '—'
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function DetailBox({ value }) {
  const parsed = tryParseJson(value)

  if (parsed == null) {
    return <span className="text-sm text-slate-400">—</span>
  }

  // Texto simple
  if (typeof parsed !== 'object') {
    return <span className="text-sm text-slate-700 break-all">{String(parsed)}</span>
  }

  const entries = Object.entries(parsed).filter(([_, v]) => v !== undefined)
  const first = entries.slice(0, 6)
  const rest = entries.slice(6)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-1">
        {first.length ? first.map(([k, v]) => (
          <div key={k} className="flex gap-2 items-start">
            <div className="min-w-[120px] text-xs font-semibold text-slate-600">{k}</div>
            <div className="text-xs text-slate-800 break-all">{fmtValue(v)}</div>
          </div>
        )) : (
          <div className="text-xs text-slate-500">—</div>
        )}
      </div>

      {(rest.length > 0) ? (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-700">Ver más</summary>
          <div className="mt-2 grid gap-1">
            {rest.map(([k, v]) => (
              <div key={k} className="flex gap-2 items-start">
                <div className="min-w-[120px] text-xs font-semibold text-slate-600">{k}</div>
                <div className="text-xs text-slate-800 break-all">{fmtValue(v)}</div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-700">Ver JSON</summary>
        <pre className="mt-2 text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
      </details>
    </div>
  )
}

function chipClass(action) {
  const base = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold'
  const map = {
    MANUAL_APPROVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MANUAL_REJECT: 'bg-rose-50 text-rose-700 border-rose-200',
    VIEW_DETAIL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ACTION_VERIFY: 'bg-amber-50 text-amber-800 border-amber-200',
    USER_EDIT: 'bg-sky-50 text-sky-700 border-sky-200',
    SEDE_EDIT: 'bg-sky-50 text-sky-700 border-sky-200',
  }
  return base + ' ' + (map[action] || 'bg-slate-50 text-slate-700 border-slate-200')
}

export default function AdminAudit() {
  const [audit, setAudit] = useState([])
  const [err, setErr] = useState('')

  const dtFmt = useMemo(() => new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }), [])

  function fmt(ts) {
    try {
      return dtFmt.format(new Date(ts))
    } catch {
      return ts || '—'
    }
  }

  async function refresh() {
    setErr('')
    try {
      const a = await apiGet('/admin/audit?limit=200')
      setAudit(a)
    } catch (e) {
      setErr(String(e.message || e))
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <AdminShell title="Auditoría">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="section-title">Auditoría</div>
            <div className="mt-2 muted">
              Registro de acciones: creación/edición y revelado de datos personales (con motivo y tiempo de expiración).
            </div>
          </div>
          <button className="btn-ghost" onClick={refresh}>Actualizar</button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        ) : null}

        <div className="mt-5 overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="min-w-[180px]">Fecha (EC)</th>
                <th>Acción</th>
                <th className="min-w-[220px]">Entidad</th>
                <th className="min-w-[520px]">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.audit_id} className="hover:bg-slate-50/60">
                  <td className="text-slate-800">
                    <div className="font-medium">{fmt(a.timestamp)}</div>
                    <div className="text-xs text-slate-500">America/Guayaquil</div>
                  </td>
                  <td><span className={chipClass(a.accion)}>{a.accion}</span></td>
                  <td className="text-slate-700">{a.entidad}{a.entidad_id ? <span className="text-xs text-slate-400"> · {String(a.entidad_id).slice(0,8)}…</span> : null}</td>
                  <td>
                    <div className="max-w-[760px]">
                      <DetailBox value={a.detalle} />
                    </div>
                  </td>
                </tr>
              ))}
              {audit.length === 0 ? (
                <tr><td colSpan={4} className="text-slate-500 text-sm py-6 text-center">No hay registros.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  )
}
