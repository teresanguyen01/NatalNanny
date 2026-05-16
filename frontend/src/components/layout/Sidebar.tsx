import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/messaging', label: 'Messaging', icon: '✉' },
  { to: '/checkup', label: 'Checkup', icon: '♡' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-white shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-6 py-5">
        <span className="text-2xl">🌸</span>
        <span className="text-lg font-semibold tracking-tight text-brand-700">
          NatalNanny
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              ].join(' ')
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-neutral-100 px-4 py-4">
        <p className="truncate text-xs text-neutral-400">{user?.email}</p>
        <button
          onClick={() => void signOut()}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
