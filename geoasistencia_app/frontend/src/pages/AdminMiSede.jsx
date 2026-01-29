import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import Modal from '../components/Modal'
import MapPicker from '../components/MapPicker'
import { apiGet, apiPost, apiPut, getSession } from '../lib/api'

export default function AdminMiSede() {
  const s = getSession()
  const role = (s?.rol || '').toUpperCase()

  const [sede, setSede] = useState(null)
  const [form, setForm] = useState({ nombre: '', latitud: '', longitud: '', radio_metros: 100, direccion: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // verify modal for sensitive action (geofence update)
  const [openVerify, setOpenVerify] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pass, setPass] = useState('')

  useEffect(() => {
    apiGet('/admin/mi-sede').then((d) => {
      setSede(d)
      setForm({
        nombre: d.nombre || '',
        latitud: String(d.latitud ?? ''),
        longitud: String(d.longitud ?? ''),
        radio_metros: Number(d.radio_metros ?? 100),
        direccion: d.direccion || ''
      })
    }).catch((e) => setErr(String(e.message || e)))
  }, [])

  const latNum = useMemo(() => {
    const n = Number(form.latitud)
    return Number.isFinite(n) ? n : -0.1807 // fallback
  }, [form.latitud])
  const lngNum = useMemo(() => {
    const n = Number(form.longitud)
    return Number.isFinite(n) ? n : -78.4678
  }, [form.longitud])

  function openSave() {
    setErr('')
    setMotivo('')
    setPass('')
    setOpenVerify(true)
  }

  async function submitVerify(e) {
    e.preventDefault()
    setErr('')
    try {
      if (!motivo || motivo.trim().length < 15) {
        setErr('La justificación debe tener al menos 15 caracteres.')
        return
      }
      setSaving(true)
      const v = await apiPost('/admin/actions/verify', {
        action: 'SEDE_EDIT',
        motivo,
        password: pass
      })

      await apiPut('/admin/mi-sede', {
        nombre: role === 'SUPERADMIN' ? (form.nombre || undefined) : undefined,
        latitud: String(latNum),
        longitud: String(lngNum),
        radio_metros: Number(form.radio_metros),
        direccion: form.direccion || undefined
      }, {
        headers: { 'X-Action-Token': v.action_token }
      })

      setOpenVerify(false)
      const d = await apiGet('/admin/mi-sede')
      setSede(d)
    } catch (e2) {
      setErr(String(e2.message || e2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="Mi sede">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Geocerca de mi sede</div>
            <div className="mt-2 text-slate-600">
              Ajusta la geocerca con el mapa (clic para mover el pin) y el radio.
              Por LOPDP, estos cambios requieren verificación (motivo + contraseña) y quedan auditados.
            </div>
          </div>
          <button className="btn-primary" onClick={openSave} disabled={!sede || saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        ) : null}

        <div className="mt-5 grid gap-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600">Nombre de sede</label>
              <input
                className="input mt-1"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                disabled={role !== 'SUPERADMIN'}
              />
              {role !== 'SUPERADMIN' ? (
                <div className="mt-1 text-xs text-slate-500">ADMIN no puede renombrar la sede.</div>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-slate-600">Dirección (referencia)</label>
              <input
                className="input mt-1"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Ej: Loja - Centro"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <MapPicker
                lat={latNum}
                lng={lngNum}
                radius={Number(form.radio_metros) || 100}
                onChange={({ lat, lng }) => setForm({ ...form, latitud: String(lat.toFixed(6)), longitud: String(lng.toFixed(6)) })}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-800">Detalles</div>
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="text-xs text-slate-600">Latitud</label>
                  <input className="input mt-1" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Longitud</label>
                  <input className="input mt-1" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Radio (metros)</label>
                  <input
                    className="input mt-1"
                    type="number"
                    min={10}
                    max={2000}
                    value={form.radio_metros}
                    onChange={(e) => setForm({ ...form, radio_metros: Number(e.target.value) })}
                  />
                  <input
                    className="mt-2 w-full"
                    type="range"
                    min={10}
                    max={2000}
                    value={form.radio_metros}
                    onChange={(e) => setForm({ ...form, radio_metros: Number(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Recomendación: define el radio para cubrir el acceso real al edificio y evitar falsos negativos.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={openVerify} title="Verificación requerida" onClose={() => setOpenVerify(false)}>
        <form onSubmit={submitVerify} className="grid gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Para editar geocerca, explica el motivo y reingresa tu contraseña. El evento quedará en auditoría.
          </div>

          <div>
            <label className="text-xs text-slate-600">Justificación (obligatoria)</label>
            <textarea
              className="input mt-1 min-h-[100px]"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Ajuste por reubicación del punto de control en la entrada principal..."
              required
            />
            <div className="mt-1 text-xs text-slate-500">Mínimo 15 caracteres.</div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Contraseña</label>
            <input className="input mt-1" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpenVerify(false)}>Cancelar</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Verificando…' : 'Confirmar y guardar'}</button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  )
}
