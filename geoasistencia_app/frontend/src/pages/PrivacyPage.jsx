import Nav from '../components/Nav.jsx'
import PrivacyNotice from '../components/PrivacyNotice.jsx'
import Card from '../components/Card.jsx'

export default function PrivacyPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[280px_1fr] gap-6">
      <Nav mode="admin" />
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-extrabold text-white">Privacidad</div>
          <div className="text-white/60 text-sm">Resumen de controles aplicados en la aplicación.</div>
        </div>

        <PrivacyNotice />

        <Card title="Buenas prácticas implementadas" subtitle="Enfocado a exposición/defensa del proyecto">
          <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm">
            <li><b>Minimización:</b> listados muestran solo códigos y máscaras.</li>
            <li><b>Necesidad:</b> revelado PII únicamente con motivo explícito por empleado.</li>
            <li><b>Reautenticación:</b> se solicita contraseña nuevamente antes de revelar.</li>
            <li><b>Tiempo limitado:</b> token temporal de 60 segundos y auto-ocultado.</li>
            <li><b>Trazabilidad:</b> auditoría de acciones (quién, qué, cuándo, por qué).</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
