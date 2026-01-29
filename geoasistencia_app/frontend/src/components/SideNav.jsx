import { NavLink } from 'react-router-dom'

const base = "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition"

export default function SideNav({ items }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            `${base} ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'}`
          }
        >
          <span className="text-lg">{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
