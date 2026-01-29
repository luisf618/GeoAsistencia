import { Link } from 'react-router-dom'
import { getSession } from '../lib/api'

export default function Home() {
  const s = getSession()
  const role = (s?.rol || '').toUpperCase()

  const dashboardTo = !s?.token
    ? '/login'
    : role === 'EMPLEADO'
      ? '/employee'
      : '/admin'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-6 items-center">
        <div className="card p-8">
          <div className="section-title">GeoAsistencia</div>
          <div className="mt-2 muted text-base">
            Control de asistencia con <b>geocerca</b> + panel web por roles, aplicando <b>LOPDP</b> con <b>privacidad por diseño</b>.
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link className="btn-primary" to={dashboardTo}>Ir al dashboard</Link>
            <Link className="btn-ghost" to="/login">Iniciar sesión</Link>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Privacidad por defecto</div>
              <div className="mt-1 text-slate-600">Listas por <b>código</b>. PII se muestra solo bajo solicitud.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Auditoría</div>
              <div className="mt-1 text-slate-600">Toda acción sensible queda registrada con motivo.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Geocerca</div>
              <div className="mt-1 text-slate-600">Validación por lat/lng/radio, editable con mapa.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Roles</div>
              <div className="mt-1 text-slate-600">Empleado · Admin (solo su sede) · SuperAdmin.</div>
            </div>
          </div>
        </div>

        <div className="card p-8">
          <div className="text-lg font-extrabold text-slate-900">¿Qué vas a ver en el panel?</div>
          <div className="mt-2 text-sm text-slate-600">
            Un dashboard útil, con métricas de asistencia y control de sedes/usuarios, cuidando los datos personales.
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="font-semibold text-slate-900">1) Asistencias</div>
              <div className="mt-1 text-sm text-slate-700">Entradas/salidas del día, fuera de geocerca y recientes.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">2) Usuarios por código</div>
              <div className="mt-1 text-sm text-slate-700">Los admins trabajan con códigos; revelar PII requiere verificación.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">3) Sedes y geocercas</div>
              <div className="mt-1 text-sm text-slate-700">SuperAdmin crea sedes con mapa. Admin edita solo su sede.</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <b>LOPDP:</b> la información sensible se revela solo cuando existe justificación y reingreso de contraseña.
            El acceso expira automáticamente a los <b>60 segundos</b>.
          </div>
        </div>
      </div>

      {/* Sección: Privacidad */}
      <div className="mt-10">
        <div className="section-title">Privacidad por diseño (LOPDP)</div>
        <div className="mt-2 muted">
          El sistema minimiza la exposición de datos personales y deja evidencia de accesos sensibles.
        </div>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-900">Datos ocultos por defecto</div>
            <div className="mt-2 text-sm text-slate-600">Listados con <b>código</b> y máscara (email/telefono).</div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-900">Revelado controlado</div>
            <div className="mt-2 text-sm text-slate-600">Justificación + contraseña, válido <b>60s</b>, empleado por empleado.</div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-900">Auditoría</div>
            <div className="mt-2 text-sm text-slate-600">Se registra quién accedió, cuándo, y por qué.</div>
          </div>
        </div>
      </div>

      {/* Sección: Roles */}
      <div className="mt-10">
        <div className="section-title">Roles y alcance</div>
        <div className="mt-2 muted">Cada rol ve y administra únicamente lo que le corresponde.</div>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="badge border-emerald-200 bg-emerald-50 text-emerald-800">EMPLEADO</div>
            <div className="mt-3 text-sm text-slate-700">
              Marca asistencia con geolocalización. Visualiza su historial.
            </div>
          </div>
          <div className="card p-6">
            <div className="badge border-indigo-200 bg-indigo-50 text-indigo-800">ADMIN</div>
            <div className="mt-3 text-sm text-slate-700">
              Administra <b>solo usuarios de su sede</b> y ajusta la geocerca de su sede (con verificación).
            </div>
          </div>
          <div className="card p-6">
            <div className="badge border-amber-200 bg-amber-50 text-amber-800">SUPERADMIN</div>
            <div className="mt-3 text-sm text-slate-700">
              Gestiona sedes, admins y métricas globales. Define geocercas con mapa.
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-10 card p-8">
        <div className="section-title">Preguntas frecuentes</div>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">¿Por qué no veo nombres en la lista?</div>
            <div className="mt-2 text-sm text-slate-700">Por LOPDP: se trabaja con códigos y máscaras para minimizar exposición de PII.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">¿Cómo se revela un dato personal?</div>
            <div className="mt-2 text-sm text-slate-700">Solo por usuario, con motivo + reingreso de contraseña. Se oculta en 60s.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">¿El admin puede ver a todos?</div>
            <div className="mt-2 text-sm text-slate-700">No. Admin está restringido a su sede. SuperAdmin tiene alcance global.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">¿Cómo se define la geocerca?</div>
            <div className="mt-2 text-sm text-slate-700">Con mapa: clic para ubicar el punto y ajuste de radio en metros.</div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-700">
            ¿Listo para probar el panel?
          </div>
          <div className="flex gap-2">
            <Link className="btn-ghost" to="/login">Iniciar sesión</Link>
            <Link className="btn-primary" to={dashboardTo}>Abrir dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
