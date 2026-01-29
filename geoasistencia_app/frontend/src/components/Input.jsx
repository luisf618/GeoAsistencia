export default function Input({ label, hint, ...props }) {
  return (
    <label className="block">
      {label && <div className="text-sm font-semibold text-white/90 mb-1">{label}</div>}
      <input
        className="w-full rounded-xl bg-slate-950/50 ring-1 ring-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60"
        {...props}
      />
      {hint && <div className="text-xs text-white/60 mt-1">{hint}</div>}
    </label>
  )
}
