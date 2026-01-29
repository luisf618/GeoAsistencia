export default function Button({ children, variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-slate-950 shadow-glow hover:brightness-110',
    soft: 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15',
    danger: 'bg-rose-500/90 text-white hover:bg-rose-500',
    ghost: 'bg-transparent text-white ring-1 ring-white/10 hover:bg-white/10'
  }
  return (
    <button className={`${base} ${variants[variant] || variants.primary}`} {...props}>
      {children}
    </button>
  )
}
