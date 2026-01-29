import React, { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Badge from '../components/Badge.jsx'
import Modal from '../components/Modal.jsx'
import { api, getSession } from '../lib/api.js'

export default function UsuariosPage() {
  const s = getSession()
  const role = (s.rol || '').toUpperCase()

  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')

  const emptyForm = {
    documento: '',
    nombre_real: '',
    email: '',
    telefono: '',
    password: '',
    rol: role === 'ADMIN' ? 'EMPLEADO' : 'EMPLEADO',
    sede_id: ''
  }
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const u = await api('/admin/usuarios')
    setUsuarios(u)
    if (role === 'SUPERADMIN') {
      const sds = await api('/admin/sedes')
      setSedes(sds)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const canPickSede = role === 'SUPERADMIN'

  function openCreate() {
    setEdit(null)
    setForm({ ...emptyForm })
    setErr('')
    setOpen(true)
  }

  function openEdit(u) {
    setEdit(u)
    setForm({ ...emptyForm, documento: u.codigo, rol: (u.rol || '').toUpperCase(), sede_id: u.sede_id || '' })
    setErr('')
    setOpen(true)
  }

  async function save() {
    setErr('')
    try {
      if (!form.documento.trim()) throw new Error('Documento/código requerido')
      if (!edit) {
        if (!form.email.trim()) throw new Error('Email requerido')
        if (!form.password.trim()) throw new Error('Password requerido')
        if (canPickSede && !form.sede_id) throw new Error('sede_id requerido')

        await api('/admin/usuarios', {
          method: 'POST',
          body: {
            documento: form.documento,
            nombre_real: form.nombre_real || '—',
            email: form.email,
            telefono: form.telefono || '—',
            password: form.password,
            rol: canPickSede ? form.rol : 'EMPLEADO',
            sede_id: canPickSede ? form.sede_id : undefined
          }
        })
      } else {
        await api(`/admin/usuarios/${edit.usuario_id}`, {
          method: 'PUT',
          body: {
            documento: form.documento,
            rol: canPickSede ? form.rol : undefined,
            sede_id: canPickSede ? form.sede_id : undefined,
            password: form.password || undefined
          }
        })
      }

      setOpen(false)
      await load()
    } catch (e) {
      setErr(e.message || 'Error')
    }
  }

  const roleBadge = useMemo(() => (role === 'SUPERADMIN' ? 'amber' : 'sky'), [role])

  return (
    <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[280px_1fr] gap-6">
      <Nav mode="admin" />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold text-white">Usuarios</div>
            <div className="text-white/60 text-sm">Vista segura: listados sin PII. Gestión según rol.</div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge tone={roleBadge}>{role}</Badge>
            <Button onClick={openCreate}>Crear usuario</Button>
          </div>
        </div>

        <Card title="Listado" subtitle="Enmascarado por defecto (LOPDP)">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr className="text-left">
                  <th className="py-2">Código</th>
                  <th>Rol</th>
                  <th>Email (mask)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.usuario_id} className="border-t border-white/10">
                    <td className="py-2 text-white/85 font-semibold">{u.codigo}</td>
                    <td className="text-white/85">{u.rol}</td>
                    <td className="text-white/70">{u.email_mask}</td>
                    <td className="text-right">
                      <Button variant="soft" onClick={() => openEdit(u)}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={open} title={edit ? `Editar · ${edit.codigo}` : 'Crear usuario'} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <Input label="Código / Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="DOC-100" />

            {!edit && (
              <>
                <Input label="Nombre real (PII)" value={form.nombre_real} onChange={(e) => setForm({ ...form, nombre_real: e.target.value })} placeholder="(solo se revelará con solicitud)" />
                <Input label="Email (PII)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="persona@empresa.com" />
                <Input label="Teléfono (PII)" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="099..." />
              </>
            )}

            <Input label={edit ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

            {role === 'SUPERADMIN' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-sm font-semibold text-white/90 mb-1">Rol</div>
                  <select
                    className="w-full rounded-xl bg-slate-950/50 ring-1 ring-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  >
                    <option value="EMPLEADO">EMPLEADO</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-white/90 mb-1">Sede</div>
                  <select
                    className="w-full rounded-xl bg-slate-950/50 ring-1 ring-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                    value={form.sede_id}
                    onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
                  >
                    <option value="">Selecciona…</option>
                    {sedes.map((sd) => (
                      <option key={sd.sede_id} value={sd.sede_id}>{sd.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {role === 'ADMIN' && (
              <div className="rounded-2xl bg-sky-500/10 ring-1 ring-sky-400/20 p-3 text-sky-200 text-sm">
                Como <b>ADMIN</b>, solo puedes crear/editar empleados de tu sede. El rol y sede se controlan automáticamente en backend.
              </div>
            )}

            {err && <div className="rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 p-3 text-rose-200 text-sm">{err}</div>}

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>{edit ? 'Guardar cambios' : 'Crear'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
