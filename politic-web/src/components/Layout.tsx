import { useState, useCallback, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardCheck, UserSquare2, Truck, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/candidates', label: 'Candidatos', icon: UserSquare2 },
  { to: '/voters', label: 'Votantes', icon: Users },
  { to: '/scrutiny', label: 'Escrutinio', icon: ClipboardCheck },
  { to: '/logistics', label: 'Logistica', icon: Truck },
]

const styles = {
  sidebar:
    'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
  sidebarOpen: 'translate-x-0',
  sidebarClosed: '-translate-x-full',
  overlay:
    'fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300',
  overlayVisible: 'opacity-100',
  overlayHidden: 'opacity-0 pointer-events-none',
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
    'bg-white border-b border-slate-100 sticky top-0 z-30',
  headerInner:
    'h-16 flex items-center justify-between px-4 sm:px-6',
  userBadge:
    'text-xs text-slate-400 bg-slate-50 rounded-full px-3 py-1 font-medium hidden sm:block',
  main:
    'flex-1 bg-slate-50 min-h-screen',
  mobileHeaderBtn:
    'p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  const handleLogout = useCallback(() => {
    closeSidebar()
    logout()
    navigate('/login')
  }, [logout, navigate, closeSidebar])

  useEffect(() => {
    closeSidebar()
  }, [location.pathname, closeSidebar])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [closeSidebar])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : styles.overlayHidden}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        <div className={styles.brand}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
              <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className={styles.brandTitle}>SaaS Politico</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Campana</p>
          </div>
          <button
            onClick={closeSidebar}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X size={18} />
          </button>
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

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className={styles.mobileHeaderBtn} aria-label="Abrir menu">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-slate-700">Panel de Campana</h1>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Gestiona tu equipo y territorio</p>
              </div>
            </div>
            {user && (
              <span className={styles.userBadge}>
                {user.role} &middot; {user.campaign_id.slice(0, 8)}&hellip;
              </span>
            )}
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
