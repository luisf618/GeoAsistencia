import React, { useEffect, useState } from 'react'
import Nav from '../components/Nav.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { api } from '../lib/api.js'
import { formatDateTimeEC } from "../utils/dates";

export default function AuditPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    setLoading(true)
    try {
      const r = await api('/admin/audit?limit=200')
      setRows(r)
    } catch (e) {
      setErr(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-[280px_1fr] gap-6">
      <Nav mode="admin" />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold text-white">Auditoría</div>
            <div className="text-white/60 text-sm">Bitácora de acciones críticas (incluye revelados de PII).</div>
          </div>
          <Button variant="soft" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</Button>
        </div>

        <Card title="Logs" subtitle="Hasta 200 registros">
          {err && <div className="rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 p-3 text-rose-200 text-sm mb-4">{err}</div>}
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
                {rows.map((a) => (
                  <tr key={a.audit_id} className="border-t border-white/10">
                    <td className="py-2 text-white/85">{formatDateTimeEC(a.timestamp, { hour12: false })}</td>
                    <td className="text-white/85 font-semibold">{a.accion}</td>
                    <td className="text-white/70">{a.entidad}</td>
                    <td className="text-white/70">
                      <pre className="whitespace-pre-wrap break-words text-xs bg-black/20 rounded-xl p-2 ring-1 ring-white/10">{JSON.stringify(a.detalle, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
