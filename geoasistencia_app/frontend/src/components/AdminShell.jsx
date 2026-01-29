import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet, getSession } from "../lib/api";

function Item({ to, label, emoji, badge }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-2 rounded-xl px-3 py-2 border transition " +
        (active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")
      }
    >
      <span>{emoji}</span>
      <span className="font-semibold">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-indigo-600 text-white text-xs font-bold px-2 py-0.5">{badge}</span>
      ) : null}
    </Link>
  );
}

export default function AdminShell({ title, children }) {
  const s = getSession();
  const role = (s?.rol || "").toUpperCase();

  const [pendingManual, setPendingManual] = useState(0);

  useEffect(() => {
    if (!s?.token) return;
    if (!(role === "ADMIN" || role === "SUPERADMIN")) return;

    let alive = true;
    const load = async () => {
      try {
        const r = await apiGet("/admin/manual-asistencias/count?status=pendiente");
        if (alive) setPendingManual(Number(r?.count || 0));
      } catch {
        // ignore
      }
    };

    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [s?.token, role]);


  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid lg:grid-cols-4 gap-6 items-start">
        <aside className="card p-4 lg:sticky lg:top-20 h-fit">
          <div className="text-lg font-extrabold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">
            Rol: <b className="text-slate-800">{role}</b>
          </div>

          <div className="mt-4 grid gap-2">
            <Item to="/admin" label="Resumen" emoji="📊" />
            <Item to="/admin/asistencias" label="Asistencias" emoji="🕒" badge={pendingManual > 0 ? pendingManual : null} />
            <Item to="/admin/usuarios" label="Usuarios" emoji="👥" />
            {role === "ADMIN" ? <Item to="/admin/mi-sede" label="Mi sede" emoji="📍" /> : null}
            {role === "SUPERADMIN" ? <Item to="/admin/sedes" label="Sedes" emoji="🏢" /> : null}
            <Item to="/admin/audit" label="Auditoría" emoji="🧾" />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <b className="text-slate-800">LOPDP:</b> el panel lista por código. Mostrar PII requiere motivo + contraseña y dura 60s.
          </div>
        </aside>

        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  );
}
