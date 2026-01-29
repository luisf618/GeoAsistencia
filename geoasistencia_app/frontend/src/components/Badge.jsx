export default function Badge({ children, tone = 'sky' }) {
  const tones = {
    sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
    fuchsia: 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/25',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
    rose: 'bg-rose-500/15 text-rose-200 ring-rose-400/25'
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tones[tone] || tones.sky}`}>
      {children}
    </span>
  )
}
