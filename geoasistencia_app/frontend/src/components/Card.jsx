export default function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-glow overflow-hidden">
      {(title || right || subtitle) && (
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
          <div>
            {title && <div className="text-lg font-bold text-white">{title}</div>}
            {subtitle && <div className="text-sm text-white/70 mt-0.5">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}
