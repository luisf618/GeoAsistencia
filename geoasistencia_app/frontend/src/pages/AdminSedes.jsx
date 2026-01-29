import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import Modal from '../components/Modal'
import MapPicker from '../components/MapPicker'
import { apiGet, apiPost, apiPut } from '../lib/api'

export default function AdminSedes() {
  const [sedes, setSedes] = useState([])
  const [err, setErr] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ nombre: '', latitud: '', longitud: '', radio_metros: 120, direccion: '' })

  async function refresh() {
    setErr('')
    try {
      const s = await apiGet('/admin/sedes')
      setSedes(s)
    } catch (e) {
      setErr(String(e.message || e))
    }
  }

  useEffect(() => { refresh() }, [])

  function startCreate() {
    setEditing(null)
    setF({ nombre: '', latitud: '-3.993130', longitud: '-79.204220', radio_metros: 120, direccion: '' })
    setOpen(true)
  }

  function startEdit(s) {
    setEditing(s)
    setF({
      nombre: s.nombre,
      latitud: String(s.latitud),
      longitud: String(s.longitud),
      radio_metros: Number(s.radio_metros),
      direccion: s.direccion || ''
    })
    setOpen(true)
  }

  const latNum = useMemo(() => {
    const n = Number(f.latitud)
    return Number.isFinite(n) ? n : -3.99313
  }, [f.latitud])

  const lngNum = useMemo(() => {
    const n = Number(f.longitud)
    return Number.isFinite(n) ? n : -79.20422
  }, [f.longitud])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      const payload = {
        nombre: f.nombre,
        latitud: Number(latNum),
        longitud: Number(lngNum),
        radio_metros: Number(f.radio_metros),
        direccion: f.direccion
      }
      if (!editing) {
        await apiPost('/admin/sedes', payload)
      } else {
        await apiPut(`/admin/sedes/${editing.sede_id}`, payload)
      }
      setOpen(false)
      await refresh()
    } catch (e2) {
      setErr(String(e2.message || e2))
    }
  }

  return (
    <AdminShell title="Sedes">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="section-title">Sedes</div>
            <div className="mt-2 muted">
              Configura las sedes y su geocerca (pin + radio). Para definir coordenadas usa el mapa.
            </div>
          </div>
          <button className="btn-primary" onClick={startCreate}>+ Crear sede</button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        ) : null}

        <div className="mt-5 overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Lat</th>
                <th>Lng</th>
                <th>Radio (m)</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sedes.map(s => (
                <tr key={s.sede_id}>
                  <td className="text-slate-900 font-semibold">{s.nombre}</td>
                  <td className="text-slate-700">{s.latitud}</td>
                  <td className="text-slate-700">{s.longitud}</td>
                  <td className="text-slate-700">{s.radio_metros}</td>
                  <td>
                    <button className="btn-ghost" onClick={() => startEdit(s)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? 'Editar sede' : 'Crear sede'}
        subtitle="Define el punto (clic en el mapa) y ajusta el radio."
        size="xl"
        onClose={() => setOpen(false)}
      >
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <MapPicker
                lat={latNum}
                lng={lngNum}
                radius={Number(f.radio_metros) || 120}
                onChange={({ lat, lng }) => setF({ ...f, latitud: String(lat.toFixed(6)), longitud: String(lng.toFixed(6)) })}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Datos de la sede</div>

              <div className="mt-3 grid gap-3">
                <div>
                  <label className="text-xs text-slate-600">Nombre</label>
                  <input className="input mt-1" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} required />
                </div>

                <div>
                  <label className="text-xs text-slate-600">Dirección (referencia)</label>
                  <input className="input mt-1" value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} placeholder="Ej: Loja - Centro" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600">Latitud</label>
                    <input className="input mt-1" value={f.latitud} onChange={e => setF({ ...f, latitud: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Longitud</label>
                    <input className="input mt-1" value={f.longitud} onChange={e => setF({ ...f, longitud: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600">Radio (metros)</label>
                  <input
                    className="input mt-1"
                    type="number"
                    min={10}
                    max={2000}
                    value={f.radio_metros}
                    onChange={e => setF({ ...f, radio_metros: Number(e.target.value) })}
                    required
                  />
                  <input
                    className="mt-2 w-full"
                    type="range"
                    min={10}
                    max={2000}
                    value={f.radio_metros}
                    onChange={e => setF({ ...f, radio_metros: Number(e.target.value) })}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Consejo: usa un radio que cubra el acceso real al edificio para evitar falsos negativos.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  )
}
