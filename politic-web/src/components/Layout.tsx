import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardCheck, LogOut, ChevronLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCallback } from 'react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/voters', label: 'Votantes', icon: Users },
  { to: '/scrutiny', label: 'Escrutinio', icon: ClipboardCheck },
]

const styles = {
  sidebar:
    'bg-slate-900 w-64 h-screen sticky top-0 flex flex-col shrink-0',
  brand:
    'flex items-center gap-3 px-6 py-5 border-b border-slate-800',
  brandTitle:
    'text-lg font-bold text-slate-100 tracking-tight',
  navItemBase:
    'flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg mx-3 transition-all duration-200',
  navItemIdle:
    'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70',
  navItemActive:
    'text-white bg-indigo-600 shadow-lg shadow-indigo-900/30',
  logoutBtn:
    'flex items-center gap-3 w-full px-6 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/50 transition-all duration-200',
  header:
    'bg-white border-b border-slate-100 sticky top-0 z-40',
  headerInner:
    'h-16 flex items-center justify-between px-6',
  userBadge:
    'text-xs text-slate-400 bg-slate-50 rounded-full px-3 py-1 font-medium',
  main:
    'flex-1 bg-slate-50 min-h-screen',
}

function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <ChevronLeft size={16} className="text-white rotate-180" />
        </div>
        <div>
          <p className={styles.brandTitle}>SaaS Politico</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Campana</p>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.navItemBase} ${isActive ? styles.navItemActive : styles.navItemIdle}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={17} />
          <span>Cerrar Sesion</span>
        </button>
      </div>
    </aside>
  )
}

function TopHeader() {
  const { user } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div>
          <h1 className="text-sm font-semibold text-slate-700">Panel de Campana</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gestiona tu equipo y territorio</p>
        </div>
        {user && (
          <span className={styles.userBadge}>
            {user.role} · {user.campaign_id.slice(0, 8)}&hellip;
          </span>
        )}
      </div>
    </header>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
