export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 shadow-sm grid place-items-center overflow-hidden">
        <img
          src="/logo.png"
          alt="GeoAsistencia"
          className="h-9 w-9 object-contain"
          draggable={false}
        />
      </div>
      {!compact ? (
        <div>
          <div className="text-lg font-extrabold tracking-tight text-slate-900">GeoAsistencia</div>
          <div className="text-xs text-slate-500 -mt-0.5">Panel Web · Privacidad por diseño</div>
        </div>
      ) : null}
    </div>
  )
}
