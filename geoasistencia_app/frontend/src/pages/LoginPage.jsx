import React, { useState } from 'react'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Badge from '../components/Badge.jsx'
import { api, setSession } from '../lib/api.js'

export default function LoginPage() {
  const [mode, setMode] = useState('employee')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function onLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      if (mode === 'employee') {
        const res = await api('/auth/login', { method: 'POST', body: { email, password } })
        localStorage.setItem('ga_token', res.token)
        setSession({ token: res.token, usuario_id: res.usuario_id, rol: res.rol, sede: res.sede, scope: 'employee' })
        window.location.href = '/employee'
      } else {
        const res = await api('/admin/login', { method: 'POST', body: { email, password } })
        localStorage.setItem('ga_token', res.token)
        setSession({ token: res.token, usuario_id: res.usuario_id, rol: res.rol, sede_id: res.sede_id, scope: 'admin' })
        window.location.href = '/admin'
      }
    } catch (e2) {
      setErr(e2.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 items-stretch">
        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-glow p-6 flex flex-col justify-between">
          <div>
            <div className="text-3xl font-black text-white tracking-tight">GeoAsistencia Web</div>
            <div className="text-white/70 mt-2">Panel de asistencia con <b>Privacidad por Diseño</b> (LOPDP). Por defecto: <b>solo códigos</b>. PII solo con motivo + contraseña + 60s.</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="fuchsia">Dashboard</Badge>
              <Badge tone="sky">Roles</Badge>
              <Badge tone="emerald">Geocerca</Badge>
              <Badge tone="amber">Auditoría</Badge>
            </div>
          </div>

          <div className="mt-8 text-xs text-white/60">
            Demo seed:
            <div className="mt-2 space-y-1">
              <div><b>SUPERADMIN</b> superadmin@geoasistencia.com · SuperAdmin12345</div>
              <div><b>ADMIN</b> admin@geoasistencia.com · Admin12345</div>
              <div><b>EMPLEADO</b> empleado@empresa.com · Empleado12345</div>
            </div>
          </div>
        </div>

        <Card
          title="Iniciar sesión"
          subtitle="Elige tu tipo de acceso"
          right={
            <div className="flex gap-2">
              <button
                onClick={() => setMode('employee')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ring-1 transition ${mode === 'employee' ? 'bg-emerald-400/20 text-emerald-200 ring-emerald-300/30' : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10'}`}
              >
                Empleado
              </button>
              <button
                onClick={() => setMode('admin')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ring-1 transition ${mode === 'admin' ? 'bg-sky-400/20 text-sky-200 ring-sky-300/30' : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10'}`}
              >
                Admin
              </button>
            </div>
          }
        >
          <form onSubmit={onLogin} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
            <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />

            {err && <div className="rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 p-3 text-rose-200 text-sm">{err}</div>}

            <Button disabled={loading} className="w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <div className="text-xs text-white/60">
              {mode === 'employee'
                ? 'Acceso para marcaciones y consulta de tu jornada.'
                : 'Acceso para gestión (usuarios/sedes/auditoría) con privacidad por defecto.'}
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
