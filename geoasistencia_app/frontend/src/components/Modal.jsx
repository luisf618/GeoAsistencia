import { useEffect } from 'react'

// size: 'sm' | 'md' | 'lg' | 'xl'
const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export default function Modal({
  open,
  title,
  subtitle = 'Acceso temporal con auditoría (LOPDP).',
  size = 'lg',
  children,
  onClose
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sizeCls = sizeMap[size] || sizeMap.lg

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onClose?.()}
      />

      <div className={`relative w-full ${sizeCls} card p-5 sm:p-6 shadow-xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold text-slate-900">{title}</div>
            <div className="text-xs text-slate-600 mt-1">{subtitle}</div>
          </div>
          <button className="btn-ghost" onClick={() => onClose?.()}>
            Cerrar
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
