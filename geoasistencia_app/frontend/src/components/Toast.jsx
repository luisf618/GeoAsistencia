import { createContext, useContext, useMemo, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const api = useMemo(() => ({
    push: (type, message) => {
      const id = crypto.randomUUID()
      setItems((p) => [...p, { id, type, message }])
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3500)
    }
  }), [])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[340px] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="card p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">
                  {t.type === 'ok' ? '✅ Listo' : t.type === 'warn' ? '⚠️ Atención' : '❌ Error'}
                </div>
                <div className="text-sm text-slate-700">{t.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider faltante')
  return ctx
}
