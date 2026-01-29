import React, { useEffect, useMemo, useState } from 'react'
import Nav from '../components/Nav.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import Input from '../components/Input.jsx'
import { api, getSession } from '../lib/api.js'
import { formatDateTimeEC } from "../utils/dates";

function toneForRole(role) {
  role = (role || '').toUpperCase()
  if (role === 'SUPERADMIN') return 'amber'
  if (role === 'ADMIN') return 'sky'
  return 'emerald'
}

export default function AdminDashboard() {
  const s = getSession()
  const role = (s.rol || '').toUpperCase()

  const [usuarios, setUsuarios] = useState([])
  const [audit, setAudit] = useState([])
  const [selected, setSelected] = useState(null)

  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const [pii, setPii] = useState(null)
  const [count, setCount] = useState(0)

  async function load() {
    const u = await api('/admin/usuarios')
    setUsuarios(u)
    const a = await api('/admin/audit?limit=30')
    setAudit(a)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  // contador 60s
  useEffect(() => {
    if (count <= 0) return
    const t = setInterval(() => setCount((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [count])

  useEffect(() => {
    if (count === 0) setPii(null)
  }, [count])

  const topStats = useMemo(() => {
    const total = usuarios.length
    const empleados = usuarios.filter(u => (u.rol || '').toUpperCase() === 'EMPLEADO').length
    const admins = usuarios.filter(u => ['ADMIN','SUPERADMIN'].includes((u.rol || '').toUpperCase())).length
    return { total, empleados, admins }
  }, [usuarios])

  function openReveal(u) {
    setSelected(u)
    setMotivo('')
    setPassword('')
    setErr('')
    setOpen(true)
  }

  async function doReveal() {
    setErr('')
    if (!selected) return
    if ((motivo || '').trim().length < 15) {
      setErr('La justificación debe tener al menos 15 caracteres.')
      return
    }
    try {
      const r = await api('/admin/privacy/reveal', {
        method: 'POST',
        body: { target_usuario_id: selected.usuario_id, motivo, password }
      })
      const piiData = await api(`/admin/privacy/usuarios/${selected.usuario_id}/pii`, {
        token: r.reveal_token
      })

      setPii(piiData)
      setCount(60)
      setOpen(false)

      // refrescar auditoría
      const a = await api('/admin/audit?limit=30')
      setAudit(a)
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
            <div className="text-2xl font-extrabold text-white">Dashboard</div>
            <div className="text-white/60 text-sm">Privacidad por defecto. PII solo con motivo + contraseña + 60s.</div>
          </div>
          <div className="flex gap-2">
            <Badge tone={toneForRole(role)}>{role}</Badge>
            <Badge tone="fuchsia">LOPDP</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card title="Usuarios" subtitle="Total en tu alcance">
            <div className="text-4xl font-black text-white">{topStats.total}</div>
            <div className="text-white/60 text-sm mt-1">empleados + admins</div>
          </Card>
          <Card title="Empleados" subtitle="En tu sede / alcance">
            <div className="text-4xl font-black text-emerald-200">{topStats.empleados}</div>
            <div className="text-white/60 text-sm mt-1">rol EMPLEADO</div>
          </Card>
          <Card title="Administración" subtitle="Admin y SuperAdmin">
            <div className="text-4xl font-black text-sky-200">{topStats.admins}</div>
            <div className="text-white/60 text-sm mt-1">gestión del sistema</div>
          </Card>
        </div>

        <Card
          title="Empleados (vista segura)"
          subtitle="Solo códigos y email enmascarado. Para ver PII: solicitar acceso por empleado."
        >
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
                      <Button variant="soft" onClick={() => openReveal(u)}>Solicitar acceso (PII)</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pii && (
            <div className="mt-5 rounded-3xl bg-gradient-to-r from-fuchsia-500/10 via-sky-500/10 to-emerald-500/10 ring-1 ring-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-white font-extrabold">PII Revelada (temporal)</div>
                  <div className="text-white/70 text-sm">Se ocultará automáticamente en <b>{count}s</b>.</div>
                </div>
                <Button variant="ghost" onClick={() => { setCount(0); setPii(null) }}>Ocultar ahora</Button>
              </div>
              <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-white/60">Código</div>
                  <div className="text-white font-semibold">{pii.codigo}</div>
                </div>
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-white/60">Nombre</div>
                  <div className="text-white font-semibold">{pii.nombre_real}</div>
                </div>
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-white/60">Email</div>
                  <div className="text-white font-semibold">{pii.email}</div>
                </div>
                <divdiv className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-white/60">Teléfono</div>
                  <div className="text-white font-semibold">{pii.telefono}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Auditoría (últimas 30)" subtitle="Transparencia: cada revelado de PII queda registrado.">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr className="text-left">
                  <th className="py-2">Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.audit_id} className="border-t border-white/10">
                    <td className="py-2 text-white/85">{formatDateTimeEC(a.timestamp, { hour12: false })}</td>
                    <td className="text-white/85 font-semibold">{a.accion}</td>
                    <td className="text-white/70">{a.entidad}</td>
                    <td className="text-white/70">
                      <span className="line-clamp-1">{JSON.stringify(a.detalle)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={open} title={`Solicitar acceso PII · ${selected?.codigo || ''}`} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-500/10 ring-1 ring-amber-400/20 p-3 text-amber-200 text-sm">
              Para cumplir LOPDP: debes justificar el motivo y reingresar tu contraseña. El acceso se otorgará por 60s y quedará auditado.
            </div>
            <label className="block">
              <div className="text-sm font-semibold text-white/90 mb-1">Justificación (obligatoria)</div>
              <textarea
                className="w-full min-h-[110px] rounded-xl bg-slate-950/50 ring-1 ring-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Necesito validar datos para corregir un error de nómina reportado por RRHH..."
              />
              <div className="text-xs text-white/60 mt-1">Mínimo 15 caracteres. Empleado por empleado.</div>
            </label>
            <Input label="Contraseña (reautenticación)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {err && <div className="rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 p-3 text-rose-200 text-sm">{err}</div>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={doReveal}>Confirmar (60s)</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
