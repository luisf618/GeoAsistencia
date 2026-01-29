import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatDateEC, formatTimeEC } from "../utils/dates";
import AdminShell from '../components/AdminShell'
import { apiGet, apiPost, getSession } from '../lib/api'

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-xl px-3 py-2 text-sm font-semibold border transition ' +
        (active
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')
      }
    >
      {children}
    </button>
  )
}

function groupByDate(items) {
  const map = new Map()
  for (const it of items) {
    const key = it.local_date || (it.timestamp_registro ? it.timestamp_registro.slice(0, 10) : 'Sin fecha')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(it)
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="text-lg font-extrabold text-slate-900">{title}</div>
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function VerifyBox({ actionLabel, onSubmit, error, motivo, setMotivo, pass, setPass }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
        <b>Verificación requerida</b> (LOPDP): para {actionLabel}, escribe un motivo y reingresa tu contraseña. El acceso dura <b>60s</b>.
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div>
        <label className="text-sm font-semibold text-slate-700">Motivo / justificación (mín. 15)</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="Ej: Verificar evidencia del registro por reclamo del empleado…"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700">Contraseña</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="Tu contraseña"
        />
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" type="submit">Confirmar</button>
      </div>
    </form>
  )
}

function CountdownPill({ expiresAt }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 250)
    return () => clearInterval(t)
  }, [expiresAt])
  return (
    <span className="badge">Se ocultará en {left}s</span>
  )
}

export default function AdminAsistencias() {
  const s = getSession()
  const role = (s?.rol || '').toUpperCase()
  const location = useLocation()
  const initialTab = useMemo(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return t === 'manuales' ? 'manuales' : 'registros'
  }, [location.search])

  const todayIso = useMemo(() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }, [])

  const thisMonthIso = useMemo(() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${mm}`
  }, [])

  const [tab, setTab] = useState(initialTab) // registros | manuales

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  // filtros comunes
  const [range, setRange] = useState('week')
  const [date, setDate] = useState(todayIso)
  const [documento, setDocumento] = useState('')

  // superadmin: filtro sede
  const [sedes, setSedes] = useState([])
  const [sedeId, setSedeId] = useState('')

  // listado registros
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState({ items: [], total: 0, offset: 0, limit: 200, from: '', to: '' })
  const [grouped, setGrouped] = useState(true)

  // manuales
  const [mStatus, setMStatus] = useState('pendiente')
  const [pendingManualCount, setPendingManualCount] = useState(0)
  const [mData, setMData] = useState({ items: [], total: 0, offset: 0, limit: 200, from: '', to: '' })
  const [mLoading, setMLoading] = useState(false)
  const [mErr, setMErr] = useState('')

  // detalle + verificación
  const [openVerify, setOpenVerify] = useState(false)
  const [verifyAction, setVerifyAction] = useState('ATTENDANCE_VIEW')
  const [verifyMotivo, setVerifyMotivo] = useState('')
  const [verifyPass, setVerifyPass] = useState('')
  const [verifyErr, setVerifyErr] = useState('')
  const [actionToken, setActionToken] = useState(null)
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null)

  const [openDetail, setOpenDetail] = useState(false)
  const [detailTitle, setDetailTitle] = useState('Detalle')
  const [detailData, setDetailData] = useState(null)

  const [pending, setPending] = useState(null) // { kind, id, decision? }
  // Para revisión manual, reutilizamos el mismo "motivo/justificación" (LOPDP) como comentario de decisión.

  const [openReport, setOpenReport] = useState(false)
  const [reportMonth, setReportMonth] = useState(thisMonthIso)
  const [reportData, setReportData] = useState(null)
  const [reportErr, setReportErr] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (role !== 'SUPERADMIN') return
    apiGet('/admin/sedes')
      .then((x) => setSedes(x || []))
      .catch(() => {})
  }, [role])

  useEffect(() => {
    refreshPendingCount()
    const t = setInterval(() => refreshPendingCount(), 15000)
    return () => clearInterval(t)
  }, [role, sedeId])

  async function refreshPendingCount() {
    if (!(role === 'ADMIN' || role === 'SUPERADMIN')) return
    try {
      const r = await apiGet('/admin/manual-asistencias/count?status=pendiente')
      setPendingManualCount(Number(r?.count || 0))
    } catch {
      // ignore
    }
  }

  async function loadRegistros(offset = 0) {
    setLoading(true)
    setErr('')
    try {
      const qs = new URLSearchParams()
      qs.set('range', range)
      qs.set('date', date)
      qs.set('offset', String(offset))
      qs.set('limit', String(data.limit || 200))
      if (documento.trim()) qs.set('documento', documento.trim())
      if (role === 'SUPERADMIN' && sedeId) qs.set('sede_id', sedeId)
      const res = await apiGet(`/admin/asistencias/list?${qs.toString()}`)
      setData(res)
    } catch (e) {
      console.error(e)
      setErr('No se pudo cargar el listado de asistencias.')
    } finally {
      setLoading(false)
    }
  }

  async function loadManuales(offset = 0) {
    setMLoading(true)
    setMErr('')
    try {
      const qs = new URLSearchParams()
      qs.set('status', mStatus)
      qs.set('range', range)
      qs.set('date', date)
      qs.set('offset', String(offset))
      qs.set('limit', String(mData.limit || 200))
      if (documento.trim()) qs.set('documento', documento.trim())
      if (role === 'SUPERADMIN' && sedeId) qs.set('sede_id', sedeId)
      const res = await apiGet(`/admin/manual-asistencias?${qs.toString()}`)
      setMData(res)
    } catch (e) {
      console.error(e)
      setMErr('No se pudieron cargar las solicitudes manuales.')
    } finally {
      setMLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'registros') loadRegistros(0)
    if (tab === 'manuales') loadManuales(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range, date, sedeId, role, mStatus])

  // autocierre del token y el detalle
  useEffect(() => {
    if (!tokenExpiresAt) return
    const t = setInterval(() => {
      if (Date.now() >= tokenExpiresAt) {
        setActionToken(null)
        setTokenExpiresAt(null)
        setDetailData(null)
        setOpenDetail(false)
        clearInterval(t)
      }
    }, 250)
    return () => clearInterval(t)
  }, [tokenExpiresAt])

  function startVerify(action, payload) {
    setVerifyAction(action)
    setPending(payload)
    setVerifyMotivo('')
    setVerifyPass('')
    setVerifyErr('')
    setOpenVerify(true)
  }

  async function submitVerify(e) {
    e.preventDefault()
    setVerifyErr('')
    try {
      if (!verifyMotivo || verifyMotivo.trim().length < 15) {
        setVerifyErr('La justificación debe tener al menos 15 caracteres.')
        return
      }
      const v = await apiPost('/admin/actions/verify', {
        action: verifyAction,
        motivo: verifyMotivo,
        password: verifyPass
      })
      setActionToken(v.action_token)
      setTokenExpiresAt(Date.now() + 60 * 1000)
      setOpenVerify(false)

      // ejecutar la acción pendiente
      if (!pending) return

      if (pending.kind === 'asistencia_detail') {
        const det = await apiGet(`/admin/asistencias/${pending.id}/detalle`, {
          headers: { 'X-Action-Token': v.action_token }
        })
        setDetailTitle(`Detalle asistencia · ${det.usuario_codigo}`)
        setDetailData(det)
        setOpenDetail(true)
      }

      if (pending.kind === 'manual_detail') {
        const det = await apiGet(`/admin/manual-asistencias/${pending.id}/detalle`, {
          headers: { 'X-Action-Token': v.action_token }
        })
        setDetailTitle(`Detalle solicitud manual · ${det.usuario_codigo}`)
        setDetailData(det)
        setOpenDetail(true)
      }

      if (pending.kind === 'manual_decide') {
        await apiPost(`/admin/manual-asistencias/${pending.id}/decide`, {
          decision: pending.decision,
          comentario: verifyMotivo?.trim() ? verifyMotivo.trim() : null
        }, {
          headers: { 'X-Action-Token': v.action_token }
        })
        await loadManuales(mData.offset || 0)
        await refreshPendingCount()
      }
    } catch (e2) {
      setVerifyErr(String(e2.message || e2))
    }
  }

  const items = data?.items || []
  const sections = useMemo(() => groupByDate(items), [items])
  const pages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 200)))
  const currentPage = Math.floor((data.offset || 0) / (data.limit || 200)) + 1

  const mItems = mData?.items || []
  const mPages = Math.max(1, Math.ceil((mData.total || 0) / (mData.limit || 200)))
  const mCurrentPage = Math.floor((mData.offset || 0) / (mData.limit || 200)) + 1

  async function openReportModal() {
    setReportErr('')
    setReportData(null)
    setOpenReport(true)
  }

  async function runReport() {
    setReportErr('')
    setReportLoading(true)
    try {
      const code = documento.trim()
      if (!code) {
        setReportErr('Escribe un código para generar el reporte.')
        return
      }
      const qs = new URLSearchParams()
      qs.set('documento', code)
      qs.set('month', reportMonth)
      if (role === 'SUPERADMIN' && sedeId) qs.set('sede_id', sedeId)
      const res = await apiGet(`/admin/asistencias/reporte?${qs.toString()}`)
      setReportData(res)
    } catch (e) {
      setReportErr(String(e.message || e))
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <AdminShell title="Asistencias">
      <div className="card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold text-slate-900">Asistencias</div>
              <div className="mt-2 text-slate-600">
                Registros por rango (día/semana/mes). También puedes ver <b>solicitudes manuales</b> y aprobar/rechazar.
              </div>
              <div className="mt-1 text-xs text-slate-500">Por privacidad se trabaja por <b>código</b> (no se muestran datos personales en listados).</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill active={tab === 'registros'} onClick={() => setTab('registros')}>Registros</Pill>
              <Pill active={tab === 'manuales'} onClick={() => setTab('manuales')}>
                Manuales
                {pendingManualCount > 0 ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-indigo-600 text-white text-xs font-bold px-2 py-0.5">
                    {pendingManualCount}
                  </span>
                ) : null}
              </Pill>

              <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

              <Pill active={range === 'day'} onClick={() => setRange('day')}>Día</Pill>
              <Pill active={range === 'week'} onClick={() => setRange('week')}>Semana</Pill>
              <Pill active={range === 'month'} onClick={() => setRange('month')}>Mes</Pill>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              />

              {role === 'SUPERADMIN' ? (
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((sd) => (
                    <option key={sd.sede_id} value={sd.sede_id}>{sd.nombre}</option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-700">Buscar por documento (código interno)</label>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                placeholder="Ej: EMP-LOJ-4F8C"
              />
              <div className="mt-1 text-xs text-slate-500">Esto filtra listados y también sirve para generar el reporte mensual.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-ghost" onClick={() => (tab === 'registros' ? loadRegistros(0) : loadManuales(0))}>Aplicar filtro</button>
              <button className="btn-primary" onClick={openReportModal}>Reporte mensual</button>
              {tab === 'registros' ? (
                <button
                  className={'rounded-xl px-3 py-2 text-sm font-semibold border transition ' + (grouped ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
                  onClick={() => setGrouped(v => !v)}
                  title="Agrupar por día"
                >
                  {grouped ? 'Agrupado' : 'Sin agrupar'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* TAB: REGISTROS */}
        {tab === 'registros' ? (
          <div className="mt-5">
            {err ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Período: <b className="text-slate-900">{data.from || '—'}</b> → <b className="text-slate-900">{data.to || '—'}</b>
                <span className="mx-2 text-slate-300">•</span>
                Registros: <b className="text-slate-900">{data.total ?? 0}</b>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost"
                  disabled={loading || currentPage <= 1}
                  onClick={() => loadRegistros(Math.max(0, (data.offset || 0) - (data.limit || 200)))}
                >
                  ← Anterior
                </button>
                <span className="text-sm text-slate-600">Página <b className="text-slate-900">{currentPage}</b> / {pages}</span>
                <button
                  className="btn-ghost"
                  disabled={loading || currentPage >= pages}
                  onClick={() => loadRegistros((data.offset || 0) + (data.limit || 200))}
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <div className="mt-4">
              {loading && items.length === 0 ? <div className="text-sm text-slate-500">Cargando…</div> : null}
              {items.length === 0 && !loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No hay registros en este período.</div>
              ) : null}

              {!grouped ? (
                <div className="mt-3 overflow-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Documento</th>
                        <th>Tipo</th>
                        <th>Geocerca</th>
                        <th>Sede</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.registro_id}>
                          <td className="text-slate-600">{r.local_date || formatDateEC(r.timestamp_registro)}</td>
                          <td className="text-slate-600">{r.local_time || formatTimeEC(r.timestamp_registro)}</td>
                          <td className="text-slate-900 font-semibold">{r.usuario_codigo}</td>
                          <td><span className="badge">{r.tipo}</span></td>
                          <td className={r.dentro_geocerca ? 'text-emerald-700' : 'text-amber-700'}>
                            {r.dentro_geocerca ? 'Dentro' : 'Fuera'}
                          </td>
                          <td className="text-slate-600">{r.sede_nombre || '—'}</td>
                          <td>
                            <button
                              className="btn-ghost"
                              onClick={() => startVerify('ATTENDANCE_VIEW', { kind: 'asistencia_detail', id: r.registro_id })}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {sections.map(([day, list]) => (
                    <div key={day} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="font-extrabold text-slate-900">{day}</div>
                        <div className="text-sm text-slate-600">{list.length} registros</div>
                      </div>
                      <div className="overflow-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Hora</th>
                              <th>Documento</th>
                              <th>Tipo</th>
                              <th>Geocerca</th>
                              <th>Sede</th>
                              <th>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((r) => (
                              <tr key={r.registro_id}>
                                <td className="text-slate-600">{r.local_time || formatTimeEC(r.timestamp_registro)}</td>
                                <td className="text-slate-900 font-semibold">{r.usuario_codigo}</td>
                                <td><span className="badge">{r.tipo}</span></td>
                                <td className={r.dentro_geocerca ? 'text-emerald-700' : 'text-amber-700'}>
                                  {r.dentro_geocerca ? 'Dentro' : 'Fuera'}
                                </td>
                                <td className="text-slate-600">{r.sede_nombre || '—'}</td>
                                <td>
                                  <button
                                    className="btn-ghost"
                                    onClick={() => startVerify('ATTENDANCE_VIEW', { kind: 'asistencia_detail', id: r.registro_id })}
                                  >
                                    Ver detalle
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB: MANUALES */}
        {tab === 'manuales' ? (
          <div className="mt-5">
            {mErr ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{mErr}</div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Estado:</span>
                <Pill active={mStatus === 'pendiente'} onClick={() => setMStatus('pendiente')}>Pendientes</Pill>
                <Pill active={mStatus === 'aprobada'} onClick={() => setMStatus('aprobada')}>Aprobadas</Pill>
                <Pill active={mStatus === 'rechazada'} onClick={() => setMStatus('rechazada')}>Rechazadas</Pill>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost"
                  disabled={mLoading || mCurrentPage <= 1}
                  onClick={() => loadManuales(Math.max(0, (mData.offset || 0) - (mData.limit || 200)))}
                >
                  ← Anterior
                </button>
                <span className="text-sm text-slate-600">Página <b className="text-slate-900">{mCurrentPage}</b> / {mPages}</span>
                <button
                  className="btn-ghost"
                  disabled={mLoading || mCurrentPage >= mPages}
                  onClick={() => loadManuales((mData.offset || 0) + (mData.limit || 200))}
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              {mLoading && mItems.length === 0 ? <div className="text-sm text-slate-500">Cargando…</div> : null}
              {mItems.length === 0 && !mLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No hay solicitudes en este período.</div>
              ) : null}

              {mItems.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Documento</th>
                      <th>Tipo</th>
                      <th>Sede</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mItems.map((r) => (
                      <tr key={r.solicitud_id}>
                        <td className="text-slate-600">{r.local_date || '—'}</td>
                        <td className="text-slate-600">{r.local_time || '—'}</td>
                        <td className="text-slate-900 font-semibold">{r.usuario_codigo}</td>
                        <td><span className="badge">{r.tipo}</span></td>
                        <td className="text-slate-600">{r.sede_nombre || '—'}</td>
                        <td><span className="badge">{(r.estado || '').toLowerCase()}</span></td>
                        <td className="flex flex-wrap gap-2">
                          <button
                            className="btn-ghost"
                            onClick={() => startVerify('ATTENDANCE_VIEW', { kind: 'manual_detail', id: r.solicitud_id })}
                          >
                            Ver detalle
                          </button>
                          {mStatus === 'pendiente' ? (
                            <>
                              <button
                                className="btn-primary"
                                onClick={() => startVerify('MANUAL_REVIEW', { kind: 'manual_decide', id: r.solicitud_id, decision: 'approve' })}
                              >
                                Aprobar
                              </button>
                              <button
                                className="btn-ghost"
                                onClick={() => startVerify('MANUAL_REVIEW', { kind: 'manual_decide', id: r.solicitud_id, decision: 'reject' })}
                              >
                                Rechazar
                              </button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Privacidad (LOPDP)</div>
          <div className="mt-1 text-sm text-slate-600">
            Listados por <b>código</b>. El <b>detalle</b> de asistencias y solicitudes manuales requiere motivo + contraseña y dura <b>60s</b> (auditado).
          </div>
        </div>
      </div>

      {/* Verificación */}
      <Modal
        open={openVerify}
        title={verifyAction === 'MANUAL_REVIEW' ? 'Verificar para revisar solicitud' : 'Verificar para ver detalle'}
        onClose={() => setOpenVerify(false)}
      >
        <VerifyBox
          actionLabel={verifyAction === 'MANUAL_REVIEW' ? 'aprobar/rechazar una asistencia manual' : 'ver el detalle de una asistencia'}
          onSubmit={submitVerify}
          error={verifyErr}
          motivo={verifyMotivo}
          setMotivo={setVerifyMotivo}
          pass={verifyPass}
          setPass={setVerifyPass}
        />
      </Modal>

      {/* Detalle */}
      <Modal
        open={openDetail}
        title={detailTitle}
        onClose={() => {
          setOpenDetail(false)
          setDetailData(null)
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-slate-600">Vista protegida · auditada</div>
          {tokenExpiresAt ? <CountdownPill expiresAt={tokenExpiresAt} /> : null}
        </div>

        {detailData ? (
          <div className="mt-4 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Documento</div>
                <div className="text-lg font-extrabold text-slate-900">{detailData.usuario_codigo}</div>
                <div className="mt-2 text-xs text-slate-500">Sede</div>
                <div className="text-sm font-semibold text-slate-800">{detailData.sede?.nombre || '—'}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Tipo</div>
                <div className="text-lg font-extrabold text-slate-900">{detailData.tipo}</div>
                <div className="mt-2 text-xs text-slate-500">Fecha / hora</div>
                <div className="text-sm font-semibold text-slate-800">{detailData.local_date || '—'} · {detailData.local_time || '—'}</div>
              </div>
            </div>

            {detailData.detalle ? (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="text-sm font-semibold text-indigo-900">Detalle del empleado</div>
                <div className="mt-1 text-sm text-indigo-900/80 whitespace-pre-wrap">{detailData.detalle}</div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Datos técnicos</div>
              <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <div className="text-xs text-slate-500">Lat</div>
                  <div className="font-mono">{detailData.geo?.latitud ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Lng</div>
                  <div className="font-mono">{detailData.geo?.longitud ?? '—'}</div>
                </div>
                {'dentro_geocerca' in (detailData.geo || {}) ? (
                  <div>
                    <div className="text-xs text-slate-500">Geocerca</div>
                    <div className={detailData.geo?.dentro_geocerca ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                      {detailData.geo?.dentro_geocerca ? 'Dentro' : 'Fuera'}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-xs text-slate-500">IP detectada</div>
                  <div className="font-mono">{detailData.ip_detectada ?? '—'}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-500">Device info</div>
                <pre className="mt-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">{JSON.stringify(detailData.device_info ?? null, null, 2)}</pre>
              </div>
              <div className="mt-3">
                <div className="text-xs text-slate-500">Evidence</div>
                <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{detailData.evidence ?? '—'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">Sin datos.</div>
        )}
      </Modal>

      {/* Reporte mensual */}
      <Modal
        open={openReport}
        title="Reporte mensual por documento"
        onClose={() => {
          setOpenReport(false)
          setReportData(null)
          setReportErr('')
        }}
      >
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Documento (código interno)</label>
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              placeholder="EMP-LOJ-4F8C"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Mes</label>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </div>
        </div>

        {reportErr ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{reportErr}</div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={runReport} disabled={reportLoading}>
            {reportLoading ? 'Generando…' : 'Generar'}
          </button>
        </div>

        {reportData ? (
          <div className="mt-5">
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="text-xs text-slate-600">Días con registro</div>
                <div className="text-3xl font-extrabold text-slate-900">{reportData.total_dias_con_registro}</div>
              </div>
              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                <div className="text-xs text-slate-600">Entradas</div>
                <div className="text-3xl font-extrabold text-slate-900">{reportData.entradas}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="text-xs text-slate-600">Salidas</div>
                <div className="text-3xl font-extrabold text-slate-900">{reportData.salidas}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-600">Total registros</div>
                <div className="text-3xl font-extrabold text-slate-900">{reportData.total_registros}</div>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Geocerca</th>
                    <th>Sede</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.items || []).map((r) => (
                    <tr key={r.registro_id}>
                      <td className="text-slate-600">{r.local_date}</td>
                      <td className="text-slate-600">{r.local_time}</td>
                      <td><span className="badge">{r.tipo}</span></td>
                      <td className={r.dentro_geocerca ? 'text-emerald-700' : 'text-amber-700'}>
                        {r.dentro_geocerca ? 'Dentro' : 'Fuera'}
                      </td>
                      <td className="text-slate-600">{r.sede_nombre || '—'}</td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => startVerify('ATTENDANCE_VIEW', { kind: 'asistencia_detail', id: r.registro_id })}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  )
}