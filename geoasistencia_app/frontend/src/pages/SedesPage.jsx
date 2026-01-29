import React, { useEffect, useState } from 'react'
import Nav from '../components/Nav.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Modal from '../components/Modal.jsx'
import Badge from '../components/Badge.jsx'
import { api } from '../lib/api.js'

export default function SedesPage() {
  const [sedes, setSedes] = useState([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ nombre: '', latitud: '', longitud: '', radio_metros: 120, direccion: '' })

  async function load() {
    const s = await api('/admin/sedes')
    setSedes(s)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  function openCreate() {
    setEdit(null)
    setForm({ nombre: '', latitud: '', longitud: '', radio_metros: 120, direccion: '' })
    setErr('')
    setOpen(true)
  }

  function openEdit(sd) {
    setEdit(sd)
    setForm({
      nombre: sd.nombre,
      latitud: sd.latitud,
      longitud: sd.longitud,
      radio_metros: sd.radio_metros,
      direccion: sd.direccion || ''
    })
    setErr('')
    setOpen(true)
  }

  async function save() {
    setErr('')
    try {
      if (!form.nombre.trim()) throw new Error('Nombre requerido')
      const payload = {
        nombre: form.nombre,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud),
        radio_metros: Number(form.radio_metros),
        direccion: form.direccion
      }

      if (!Number.isFinite(payload.latitud) || !Number.isFinite(payload.longitud)) {
        throw new Error('Latitud/Longitud deben ser números')
      }

      if (!edit) {
        await api('/admin/sedes', { method: 'POST', body: payload })
      } else {
        await api(`/admin/sedes/${edit.sede_id}`, { method: 'PUT', body: payload })
      }

      setOpen(false)
      await load()
    } catch (e) {
      setErr(e.message || 'Error')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[280px_1fr] gap-6">
      <Nav mode="admin" />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold text-white">Sedes</div>
            <div className="text-white/60 text-sm">Solo SUPERADMIN puede crear/editar sedes (geocerca).</div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge tone="amber">SUPERADMIN</Badge>
            <Button onClick={openCreate}>Crear sede</Button>
          </div>
        </div>

        <Card title="Listado de sedes" subtitle="Geocerca por sede (lat/lng/radio)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr className="text-left">
                  <th className="py-2">Nombre</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Radio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sedes.map((sd) => (
                  <tr key={sd.sede_id} className="border-t border-white/10">
                    <td className="py-2 text-white/85 font-semibold">{sd.nombre}</td>
                    <td className="text-white/70">{sd.latitud}</td>
                    <td className="text-white/70">{sd.longitud}</td>
                    <td className="text-white/70">{sd.radio_metros}m</td>
                    <td className="text-right">
                      <Button variant="soft" onClick={() => openEdit(sd)}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={open} title={edit ? `Editar sede · ${edit.nombre}` : 'Crear sede'} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Latitud" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} placeholder="-3.99" />
              <Input label="Longitud" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} placeholder="-79.20" />
            </div>
            <Input label="Radio (metros)" type="number" value={form.radio_metros} onChange={(e) => setForm({ ...form, radio_metros: e.target.value })} />
            <Input label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />

            {err && <div className="rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 p-3 text-rose-200 text-sm">{err}</div>}

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>{edit ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
