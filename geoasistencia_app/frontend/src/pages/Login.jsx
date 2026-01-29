import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiPost, setSession } from '../lib/api'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Login automático: el backend retorna el rol.
      const data = await apiPost('/auth/login', { email, password })
      const role = String(data.rol || '').toUpperCase()
      setSession({
        token: data.token,
        usuario_id: data.usuario_id,
        rol: role,
        sede_id: data.sede_id,
        sede: data.sede
      })
      nav(role === 'EMPLEADO' ? '/employee' : '/admin')
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
        <div className="card p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="section-title">Iniciar sesión</div>
              <div className="mt-2 muted">
                No necesitas elegir rol: el acceso es automático según tu usuario.
              </div>
            </div>
            <Link to="/" className="btn-ghost">Volver</Link>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            <div>
              <label className="text-xs text-slate-700 font-semibold">Email</label>
              <input
                className="input mt-1"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@geoasistencia.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-700 font-semibold">Contraseña</label>
              <input
                className="input mt-1"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button disabled={loading} className="btn-primary">
              {loading ? 'Ingresando…' : 'Entrar'}
            </button>

            <div className="text-xs text-slate-500">
              Por LOPDP, el panel oculta datos personales por defecto. El revelado exige justificación + reingreso de contraseña y dura 60s.
            </div>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Seguridad</div>
            <ul className="mt-2 text-sm text-slate-600 space-y-1">
              <li>• Acceso por roles (Empleado / Admin / SuperAdmin).</li>
              <li>• PII solo con solicitud + auditoría + expiración automática.</li>
              <li>• Admin limitado a su sede (usuarios y geocerca).</li>
            </ul>
          </div>
        </div>

        <div className="card p-7">
          <div className="text-lg font-extrabold text-slate-900">Consejos de uso</div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-800">🔒 Listados por código</div>
              <div className="text-slate-600 mt-0.5">En Admin/SuperAdmin se muestran códigos y máscaras por defecto.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-800">⏱️ PII por 60 segundos</div>
              <div className="text-slate-600 mt-0.5">Revelar datos personales se oculta solo al expirar el tiempo.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-800">🧾 Auditoría obligatoria</div>
              <div className="text-slate-600 mt-0.5">Toda acción sensible requiere motivo y queda registrada.</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-slate-800">🗺️ Geocerca con mapa</div>
              <div className="text-slate-600 mt-0.5">Las sedes y su radio se definen visualmente con un pin.</div>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-slate-500">¿Necesitas acceso?</div>
            <Link className="btn-ghost" to="/">Ver información</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
