import Card from './Card.jsx'
import Badge from './Badge.jsx'

export default function PrivacyNotice() {
  return (
    <Card
      title="Privacidad por diseño (LOPDP)"
      subtitle="En esta app, los datos personales se ocultan por defecto y solo se revelan por necesidad justificada y por tiempo limitado."
      right={<Badge tone="fuchsia">60s · Justificación · Reautenticación</Badge>}
    >
      <ul className="list-disc pl-5 space-y-2 text-white/80 text-sm">
        <li>En los listados, verás <b>códigos</b> (ej. DOC-001) y campos enmascarados.</li>
        <li>Para ver PII (nombre, email, teléfono) debes ingresar <b>motivo</b> y <b>contraseña</b> otra vez.</li>
        <li>El acceso es <b>empleado por empleado</b>, y se registra en <b>auditoría</b>.</li>
        <li>Tras <b>60 segundos</b>, la app oculta automáticamente los datos de nuevo.</li>
      </ul>
    </Card>
  )
}
