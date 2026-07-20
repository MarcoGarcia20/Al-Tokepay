// ============================================================
// DashboardLayout — Contenedor principal del sistema
// Sidebar colapsable en desktop, cajón deslizante en móvil y
// barra de navegación superior con perfil de usuario
// ============================================================

import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Coins,
  CalendarCheck,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Settings,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useUIStore } from '../stores'
import { Badge } from '../components/Badge'
import { sidebarVariants, sidebarLabelVariants } from '../animations/variants'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: ('administrador' | 'cobrador')[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: TrendingUp,
  },
  {
    label: 'Clientes',
    path: '/clientes',
    icon: Users,
  },
  {
    label: 'Préstamos',
    path: '/prestamos',
    icon: Coins,
  },
  {
    label: 'Cobranzas',
    path: '/cobranzas',
    icon: CalendarCheck,
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: Settings,
    roles: ['administrador'],
  },
]

export const DashboardLayout = () => {
  const { perfil, user, signOut } = useAuth()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const userRole = perfil?.rol || 'cobrador'

  // Filtrar ítems de navegación según el rol del usuario
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  // Alternar sidebar en móvil
  const toggleMobile = () => setMobileOpen(!mobileOpen)

  // Determinar el título de la página activa
  const activeTitle = navItems.find((item) => item.path === location.pathname)?.label || 'Al Tokepay'

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300">
      {/* ── BACKDROP DE MÓVIL ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobile}
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── DRAWER DE MÓVIL (IZQUIERDA) ───────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col md:hidden"
          >
            {/* Header del drawer */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  Al Toke<span className="text-indigo-400">pay</span>
                </span>
              </div>
              <button
                onClick={toggleMobile}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-850 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navegación móvil */}
            <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3.5 px-4 h-11 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Info usuario móvil */}
            <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-sm font-bold text-white uppercase">
                  {(perfil?.nombre || user?.email || 'U')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {perfil?.nombre || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer transition-all"
              >
                <LogOut size={13} />
                Cerrar sesión
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR DESKTOP (FIJA) ────────────────────────────── */}
      <motion.aside
        variants={sidebarVariants}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        className="hidden md:flex flex-col shrink-0 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md relative z-30"
      >
        {/* Header de Sidebar */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <TrendingUp size={16} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-bold text-white whitespace-nowrap"
              >
                Al Toke<span className="text-indigo-400">pay</span>
              </motion.span>
            )}
          </div>

          {/* Botón colapsador */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white shadow-lg cursor-pointer transition-all z-40 hover:scale-105"
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Navegación Desktop */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 h-10 rounded-xl text-sm font-medium transition-all gap-3 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 shrink-0'} />
                {!sidebarCollapsed && (
                  <motion.span
                    variants={sidebarLabelVariants}
                    animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Info usuario Desktop */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/60 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
              {(perfil?.nombre || user?.email || 'U')[0]}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {perfil?.nombre || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>

          {!sidebarCollapsed ? (
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer transition-all"
            >
              <LogOut size={12} />
              Cerrar sesión
            </button>
          ) : (
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors mx-auto shrink-0"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* BARRA DE NAVEGACIÓN SUPERIOR (HEADER) */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger para móvil */}
            <button
              onClick={toggleMobile}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden cursor-pointer"
            >
              <Menu size={18} />
            </button>

            <h1 className="text-base font-bold text-white md:text-lg">{activeTitle}</h1>
          </div>

          {/* Acciones y Perfil */}
          <div className="flex items-center gap-3">
            {/* Rol Badge */}
            <div className="hidden sm:block">
              <Badge variant={userRole === 'administrador' ? 'activo' : 'default'} dot>
                {userRole === 'administrador' ? 'Administrador' : 'Cobrador'}
              </Badge>
            </div>

            {/* Divisor */}
            <div className="hidden sm:block w-px h-5 bg-slate-900" />

            {/* Perfil Trigger */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <UserCheck size={14} />
              </div>
              <span className="text-xs font-semibold text-slate-300 hidden md:block">
                {perfil?.nombre || user?.email?.split('@')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* CONTAINER DEL CONTENIDO */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
