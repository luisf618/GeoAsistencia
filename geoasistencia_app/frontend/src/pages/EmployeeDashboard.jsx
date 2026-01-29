import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, getSession } from '../lib/api'
import { formatDateTimeEC } from "../utils/dates";

function fmt(dt) {
  try {
    return formatDateTimeEC(dt)
  } catch {
    return dt
  }
}

export default function EmployeeDashboard() {
  const s = getSession()
  const [geo, setGeo] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [regs, setRegs] = useState([])
  const [dash, setDash] = useState(null)

  // solicitud manual
  const [openManual, setOpenManual] = useState(false)
  const [manualTipo, setManualTipo] = useState('entrada')
  const [manualFechaHora, setManualFechaHora] = useState('')
  const [manualDetalle, setManualDetalle] = useState('')
  const [manualMsg, setManualMsg] = useState('')

  const sede = s?.sede
  const usuarioId = s?.usuario_id

  const canUseGeo = !!navigator.geolocation

  async function refreshRegs() {
    try {
      const data = await apiGet(`/asistencia/mis-registros?limit=10&usuario_id=${encodeURIComponent(usuarioId)}`)
      setRegs(data)
    } catch {
      // si el endpoint no existe, simplemente no mostramos histórico
    }
  }

  async function refreshDash() {
    try {
      const d = await apiGet('/asistencia/dashboard')
      setDash(d)
    } catch {
      // optional
    }
  }

  useEffect(() => {
    refreshRegs()
    refreshDash()
  }, [])

  function requestGeo() {
    setStatus('Obteniendo ubicación…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy })
        setStatus('Ubicación lista ✅')
      },
      err => setStatus(`No se pudo obtener ubicación: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const deviceInfo = useMemo(() => ({
    ua: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  }), [])

  async function marcar(tipo) {
    if (!geo) {
      requestGeo()
      return
    }
    setLoading(true)
    setStatus('Registrando…')
    try {
      const payload = {
        usuario_id: usuarioId,
        tipo,
        latitud: geo.lat,
        longitud: geo.lng,
        modo: 'app',
        device_info: deviceInfo
      }
      const resp = await apiPost('/asistencia/registro', payload)
      setStatus(resp.dentro_geocerca ? 'Registro OK ✅ (dentro de geocerca)' : 'Registro OK ⚠️ (fuera de geocerca)')
      await refreshRegs()
      await refreshDash()
    } catch (e) {
      setStatus(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  async function enviarSolicitudManual() {
    setLoading(true)
    setManualMsg('')
    try {
      const dt = manualFechaHora ? new Date(manualFechaHora) : null
      const payload = {
        usuario_id: usuarioId,
        tipo: manualTipo,
        latitud: geo?.lat ?? null,
        longitud: geo?.lng ?? null,
        modo: 'manual',
        timestamp_registro: dt ? dt.toISOString() : null,
        detalle: manualDetalle,
        device_info: deviceInfo,
      }
      const resp = await apiPost('/asistencia/registro', payload)
      if (resp?.status === 'PENDIENTE') {
        setManualMsg(`Solicitud enviada ✅ (PENDIENTE). Código: ${resp.solicitud_id}`)
      } else {
        setManualMsg('Solicitud enviada ✅')
      }
      setOpenManual(false)
      setManualDetalle('')
      setManualFechaHora('')
      await refreshRegs()
      await refreshDash()
    } catch (e) {
      setManualMsg(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="text-2xl font-extrabold text-slate-900">Empleado · Registro de asistencia</div>
          <div className="mt-2 text-slate-600">
            Se registra tu ubicación para validar la <b>geocerca</b>. (Consentimiento: {String(true)})
          </div>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
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

          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Tu sesión</div>
              <div className="mt-2 text-sm text-slate-600">
                <div><span className="text-slate-500">Usuario ID:</span> {usuarioId}</div>
                <div><span className="text-slate-500">Rol:</span> EMPLEADO</div>
              </div>
              {sede ? (
                <div className="mt-3 text-sm text-slate-600">
                  <div className="text-slate-500">Sede (geocerca)</div>
                  <div>Lat: {sede.latitud} · Lng: {sede.longitud}</div>
                  <div>Radio: {sede.radio_metros} m</div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Ubicación</div>
              <div className="mt-2 text-sm text-slate-600">
                {canUseGeo ? (
                  geo ? (
                    <>
                      <div>Lat: {geo.lat.toFixed(6)} · Lng: {geo.lng.toFixed(6)}</div>
                      <div className="text-slate-500">Precisión aprox: {Math.round(geo.acc)} m</div>
                    </>
                  ) : (
                    <div className="text-slate-500">Aún no se ha obtenido ubicación.</div>
                  )
                ) : (
                  <div className="text-rose-700">Tu navegador no soporta geolocalización.</div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={requestGeo}>Actualizar ubicación</button>
                <button disabled={loading} className="btn-primary" onClick={() => marcar('entrada')}>Marcar Entrada</button>
                <button disabled={loading} className="btn-primary" onClick={() => marcar('salida')}>Marcar Salida</button>
                <button disabled={loading} className="btn-ghost" onClick={() => setOpenManual(true)}>Solicitud manual</button>
              </div>
            </div>
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              {status}
            </div>
          ) : null}
        </div>

        <div className="card p-6">
          <div className="text-lg font-extrabold">Historial (últimos 10)</div>
          <div className="mt-3">
            {regs?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Geocerca</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map(r => (
                    <tr key={r.registro_id}>
                      <td className="text-slate-600">{fmt(r.timestamp_registro)}</td>
                      <td><span className="badge">{r.tipo}</span></td>
                      <td className={r.dentro_geocerca ? 'text-emerald-700' : 'text-amber-700'}>
                        {r.dentro_geocerca ? 'Dentro' : 'Fuera'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-slate-500">No hay registros (o el endpoint aún no está activo).</div>
            )}
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Nota: si estás fuera de la geocerca, el registro se guarda igual (auditable) pero queda marcado como fuera.
          </div>
        </div>

        {/* Modal solicitud manual */}
        {openManual ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="text-lg font-extrabold text-slate-900">Solicitud de asistencia manual</div>
                <button className="btn-ghost" onClick={() => setOpenManual(false)}>Cerrar</button>
              </div>
              <div className="p-6">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-slate-700">
                  Si no pudiste registrar por geolocalización, fallas del dispositivo o una situación justificada, envía una solicitud.
                  El <b>ADMIN</b> la revisa y decide (auditado).
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Tipo</label>
                    <select
                      value={manualTipo}
                      onChange={(e) => setManualTipo(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Fecha y hora del evento</label>
                    <input
                      type="datetime-local"
                      value={manualFechaHora}
                      onChange={(e) => setManualFechaHora(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <div className="mt-1 text-xs text-slate-500">Si lo dejas vacío, se usará la hora actual.</div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold text-slate-700">Detalle / justificación (mín. 15)</label>
                  <textarea
                    rows={4}
                    value={manualDetalle}
                    onChange={(e) => setManualDetalle(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Ej: El GPS no funcionó y estaba en la sede desde las 08:00..."
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setOpenManual(false)}>Cancelar</button>
                  <button
                    className="btn-primary"
                    disabled={loading || manualDetalle.trim().length < 15}
                    onClick={enviarSolicitudManual}
                  >
                    Enviar solicitud
                  </button>
                </div>

                {manualMsg ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">{manualMsg}</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
