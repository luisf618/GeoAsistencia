import { useEffect, useMemo, useState } from 'react'
import AdminShell from '../components/AdminShell'
import Modal from '../components/Modal'
import { apiGet, apiPost, apiPut, apiGetWithToken, getSession } from '../lib/api'

function RolePill({ role }) {
  const r = (role || '').toUpperCase()
  const cls = r === 'SUPERADMIN'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : r === 'ADMIN'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return <span className={`badge ${cls}`}>{r}</span>
}

export default function AdminUsuarios() {
  const s = getSession()
  const actorRole = (s?.rol || '').toUpperCase()

  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [err, setErr] = useState('')

  // create/edit modal
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre_real: '', email: '', telefono: '', password: '', rol: 'EMPLEADO', sede_id: '' })

  // verify modal for sensitive actions (edit user)
  const [openVerify, setOpenVerify] = useState(false)
  const [verifyMotivo, setVerifyMotivo] = useState('')
  const [verifyPass, setVerifyPass] = useState('')
  const [pendingUpdate, setPendingUpdate] = useState(null)

  // reveal modal
  const [openReveal, setOpenReveal] = useState(false)
  const [target, setTarget] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [reauthPass, setReauthPass] = useState('')
  const [pii, setPii] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [now, setNow] = useState(Date.now())

  const remaining = useMemo(() => {
    if (!expiresAt) return 0
    return Math.max(0, Math.ceil((expiresAt - now) / 1000))
  }, [expiresAt, now])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (expiresAt && remaining === 0) {
      setPii(null)
      setExpiresAt(null)
    }
  }, [remaining, expiresAt])

  async function refresh() {
    setErr('')
    try {
      const u = await apiGet('/admin/usuarios')
      setUsuarios(u)
      if (actorRole === 'SUPERADMIN') {
        const ss = await apiGet('/admin/sedes')
        setSedes(ss)
      }
    } catch (e) {
      setErr(String(e.message || e))
    }
  }

  useEffect(() => { refresh() }, [])

  function startCreate() {
    setEditing(null)
    setForm({
      nombre_real: '',
      email: '',
      telefono: '',
      password: '',
      rol: actorRole === 'ADMIN' ? 'EMPLEADO' : 'EMPLEADO',
      sede_id: actorRole === 'ADMIN' ? (s?.sede_id || '') : ''
    })
    setOpenEdit(true)
  }

  function startEdit(u) {
    setEditing(u)
    setForm({
      nombre_real: '',
      email: '',
      telefono: '',
      password: '',
      rol: u.rol || 'EMPLEADO',
      sede_id: u.sede_id || ''
    })
    setOpenEdit(true)
  }

  async function submitUser(e) {
    e.preventDefault()
    setErr('')
    try {
      if (!editing) {
        await apiPost('/admin/usuarios', {
          // Para EMPLEADO el backend autogenera el código (EMP-XXX-XXXX)
          nombre_real: form.nombre_real,
          email: form.email,
          telefono: form.telefono,
          password: form.password,
          rol: actorRole === 'ADMIN' ? 'EMPLEADO' : form.rol,
          sede_id: actorRole === 'ADMIN' ? undefined : (form.sede_id || undefined)
        })
        setOpenEdit(false)
        await refresh()
        return
      }

      // EDITAR = acción sensible -> pedir verificación
      const body = {
        nombre_real: form.nombre_real || undefined,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        password: form.password || undefined,
        rol: actorRole === 'ADMIN' ? undefined : (form.rol || undefined),
        sede_id: actorRole === 'ADMIN' ? undefined : (form.sede_id || undefined)
      }
      setPendingUpdate({ usuario_id: editing.usuario_id, body })
      setVerifyMotivo('')
      setVerifyPass('')
      setOpenVerify(true)
    } catch (e2) {
      setErr(String(e2.message || e2))
    }
  }

  async function submitVerify(e) {
    e.preventDefault()
    setErr('')
    try {
      if (!pendingUpdate) return
      if (!verifyMotivo || verifyMotivo.trim().length < 15) {
        setErr('La justificación debe tener al menos 15 caracteres.')
        return
      }
      const v = await apiPost('/admin/actions/verify', {
        action: 'USER_EDIT',
        motivo: verifyMotivo,
        password: verifyPass
      })
      await apiPut(`/admin/usuarios/${pendingUpdate.usuario_id}`, pendingUpdate.body, {
        headers: { 'X-Action-Token': v.action_token }
      })
      setOpenVerify(false)
      setOpenEdit(false)
      setPendingUpdate(null)
      await refresh()
    } catch (e3) {
      setErr(String(e3.message || e3))
    }
  }

  function startReveal(u) {
    setTarget(u)
    setMotivo('')
    setReauthPass('')
    setPii(null)
    setExpiresAt(null)
    setOpenReveal(true)
  }

  async function submitReveal(e) {
    e.preventDefault()
    setErr('')
    try {
      if (!motivo || motivo.trim().length < 15) {
        setErr('La justificación debe tener al menos 15 caracteres.')
        return
      }
      const r = await apiPost('/admin/privacy/reveal', {
        target_usuario_id: target.usuario_id,
        motivo,
        password: reauthPass
      })
      const token = r.reveal_token
      const p = await apiGetWithToken(`/admin/privacy/usuarios/${target.usuario_id}/pii`, token)
      setPii(p)
      setExpiresAt(Date.now() + 60 * 1000)
    } catch (e) {
      setErr(String(e.message || e))
    }
  }

  return (
    <AdminShell title="Usuarios">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Usuarios (por código)</div>
            <div className="mt-2 text-slate-600">
              Por LOPDP, la lista muestra <b>código</b> y <b>máscara</b>. Para ver datos personales: motivo + contraseña + 60s.
            </div>
          </div>
          <button className="btn-primary" onClick={startCreate}>+ Crear usuario</button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Rol</th>
                <th>Email (máscara)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.usuario_id}>
                  <td className="text-slate-900 font-semibold">{u.codigo}</td>
                  <td><RolePill role={u.rol} /></td>
                  <td className="text-slate-600">{u.email_mask}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost" onClick={() => startReveal(u)}>Solicitar acceso (PII)</button>
                      <button className="btn-ghost" onClick={() => startEdit(u)}>Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT */}
      <Modal
        open={openEdit}
        title={editing ? `Editar usuario (${editing.codigo || editing.usuario_id})` : 'Crear usuario'}
        onClose={() => setOpenEdit(false)}
      >
        <form onSubmit={submitUser} className="grid gap-3">
          {!editing ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <b>Código de empleado:</b> se autogenera al crear un EMPLEADO (ej. <span className="font-mono">EMP-LOJ-4F8C</span>),
              para que no dependa del usuario.
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Nombre real (PII)</label>
              <input className="input mt-1" value={form.nombre_real} onChange={e => setForm({ ...form, nombre_real: e.target.value })} placeholder={editing ? 'Opcional (deja vacío si no cambia)' : 'Nombre y apellido'} required={!editing} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Email (PII)</label>
              <input className="input mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" required={!editing} placeholder={editing ? 'Opcional' : 'correo@empresa.com'} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Teléfono (PII)</label>
              <input className="input mt-1" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder={editing ? 'Opcional' : '0999999999'} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Contraseña</label>
              <input className="input mt-1" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder={editing ? 'Deja vacío para no cambiar' : ''} required={!editing} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Rol</label>
              <select
                className="input mt-1"
                value={actorRole === 'ADMIN' ? 'EMPLEADO' : form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
                disabled={actorRole === 'ADMIN'}
              >
                <option value="EMPLEADO">EMPLEADO</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
              {actorRole === 'ADMIN' ? <div className="mt-1 text-xs text-slate-500">ADMIN solo puede crear/editar EMPLEADOS de su sede.</div> : null}
            </div>

            {actorRole === 'SUPERADMIN' ? (
              <div>
                <label className="text-xs text-slate-600">Sede</label>
                <select className="input mt-1" value={form.sede_id} onChange={e => setForm({ ...form, sede_id: e.target.value })} required={!editing}>
                  <option value="">Selecciona sede…</option>
                  {sedes.map(ss => (
                    <option key={ss.sede_id} value={ss.sede_id}>{ss.nombre}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-slate-500">ADMIN asigna usuarios solo a su sede.</div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpenEdit(false)}>Cancelar</button>
            <button className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* VERIFY (USER_EDIT) */}
      <Modal open={openVerify} title="Verificación requerida" onClose={() => setOpenVerify(false)}>
        <div className="text-sm text-slate-600">
          Para editar usuarios, por LOPDP pedimos <b>justificación</b> + <b>reingreso de contraseña</b>. Esta verificación dura <b>60s</b> y queda auditada.
        </div>
        <form onSubmit={submitVerify} className="mt-4 grid gap-3">
          <div>
            <label className="text-xs text-slate-600">Justificación</label>
            <textarea className="input mt-1 min-h-[90px]" value={verifyMotivo} onChange={e => setVerifyMotivo(e.target.value)} placeholder="Ej: Actualizar datos por cambio de área / corrección de contacto..." required />
            <div className="mt-1 text-xs text-slate-500">Mínimo 15 caracteres.</div>
          </div>
          <div>
            <label className="text-xs text-slate-600">Contraseña</label>
            <input className="input mt-1" value={verifyPass} onChange={e => setVerifyPass(e.target.value)} type="password" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpenVerify(false)}>Cancelar</button>
            <button className="btn-primary">Verificar y guardar</button>
          </div>
        </form>
      </Modal>

      {/* REVEAL */}
      <Modal open={openReveal} title="Revelar datos personales (60s)" onClose={() => setOpenReveal(false)}>
        {target ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Empleado objetivo: <b className="text-slate-900">{target.codigo}</b> · Rol: <b>{target.rol}</b>
          </div>
        ) : null}

        {pii ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-emerald-800">PII visible temporalmente</div>
              <div className="badge">⏱️ {remaining}s</div>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">Nombre</div><div>{pii.nombre_real}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">Email</div><div>{pii.email}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">Teléfono</div><div>{pii.telefono}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">Código</div><div>{pii.codigo}</div></div>
            </div>
            <div className="mt-3 text-xs text-slate-600">Al terminar el contador se oculta automáticamente.</div>
          </div>
        ) : (
          <form onSubmit={submitReveal} className="mt-4 grid gap-3">
            <div>
              <label className="text-xs text-slate-600">Justificación (obligatoria)</label>
              <textarea className="input mt-1 min-h-[90px]" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Necesito validar el correo para contactarlo por una incidencia de asistencia..." required />
              <div className="mt-1 text-xs text-slate-500">Mínimo 15 caracteres. Queda en auditoría.</div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Reingresa tu contraseña</label>
              <input className="input mt-1" value={reauthPass} onChange={e => setReauthPass(e.target.value)} type="password" required />
            </div>
            <div className="flex justify-end">
              <button className="btn-primary">Solicitar acceso (60s)</button>
            </div>
          </form>
        )}
      </Modal>
    </AdminShell>
  )
}
