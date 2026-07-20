// ============================================================
// DashboardPage — Vista Principal del Panel
// Utiliza StatCard, DataGrid, Button y Badge para mostrar KPIs
// y actividades recientes con una estética premium.
// ============================================================

import { motion } from 'framer-motion'
import {
  Users,
  Coins,
  CalendarCheck,
  Percent,
  Plus,
  ArrowRight,
  UserPlus,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { pageVariants } from '../animations/variants'
import { StatCard } from '../components/StatCard'
import { DataGrid, ColumnDef } from '../components/DataGrid'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { EstadoPrestamoBadge } from '../components/Badge'
import { formatCurrency, formatPercent } from '../utils/financiero'
import type { EstadoPrestamo, FrecuenciaPago } from '../types/database'

// Interfaz para la tabla simulada de préstamos recientes
interface PrestamoReciente {
  id: string
  cliente: string
  monto: number
  interes: number
  cuotas: number
  frecuencia: FrecuenciaPago
  estado: EstadoPrestamo
  fecha: string
}

export const DashboardPage = () => {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()

  // Datos simulados para demostrar la excelencia visual de la Fase 1
  const kpis = [
    {
      title: 'Capital Activo',
      value: formatCurrency(12500),
      trend: '+12.4%',
      trendType: 'up' as const,
      subtext: 'este mes',
      icon: <Coins size={20} />,
      glow: 'brand' as const,
    },
    {
      title: 'Recuperado',
      value: formatCurrency(4200),
      trend: '+8.2%',
      trendType: 'up' as const,
      subtext: 'este mes',
      icon: <CalendarCheck size={20} />,
      glow: 'success' as const,
    },
    {
      title: 'Porcentaje en Mora',
      value: formatPercent(2.5, 1),
      trend: '-0.8%',
      trendType: 'down' as const,
      subtext: 'vs semana anterior',
      icon: <Percent size={20} />,
      glow: 'danger' as const,
    },
    {
      title: 'Clientes Activos',
      value: '24',
      trend: '+3',
      trendType: 'up' as const,
      subtext: 'últimos 7 días',
      icon: <Users size={20} />,
      glow: 'none' as const,
    },
  ]

  const prestamosRecientes: PrestamoReciente[] = [
    {
      id: 'P-001',
      cliente: 'Juan Pérez Quiroga',
      monto: 1500,
      interes: 10,
      cuotas: 5,
      frecuencia: 'diario',
      estado: 'activo',
      fecha: '2026-06-08',
    },
    {
      id: 'P-002',
      cliente: 'María Gómez Flores',
      monto: 3000,
      interes: 15,
      cuotas: 12,
      frecuencia: 'semanal',
      estado: 'en_mora',
      fecha: '2026-06-05',
    },
    {
      id: 'P-003',
      cliente: 'Carlos Rodríguez Ruiz',
      monto: 800,
      interes: 12,
      cuotas: 4,
      frecuencia: 'quincenal',
      estado: 'pagado',
      fecha: '2026-06-01',
    },
    {
      id: 'P-004',
      cliente: 'Ana Lía Bustamante',
      monto: 2000,
      interes: 10,
      cuotas: 10,
      frecuencia: 'diario',
      estado: 'pendiente',
      fecha: '2026-06-09',
    },
  ]

  const columns: ColumnDef<PrestamoReciente>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-white">{row.cliente}</p>
          <p className="text-[10px] text-slate-500 font-mono">{row.id}</p>
        </div>
      ),
    },
    {
      key: 'monto',
      header: 'Monto Principal',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-financial font-medium text-white">
          {formatCurrency(row.monto)}
        </span>
      ),
    },
    {
      key: 'interes',
      header: 'Tasa (Mensual)',
      align: 'center',
      render: (row) => <span className="font-financial">{formatPercent(row.interes, 0)}</span>,
    },
    {
      key: 'cuotas',
      header: 'Plazo / Frecuencia',
      render: (row) => (
        <span className="text-slate-400 capitalize">
          {row.cuotas} cuotas · {row.frecuencia}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (row) => <EstadoPrestamoBadge estado={row.estado} />,
    },
  ]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6 md:gap-8"
    >
      {/* ── BIENVENIDA PREMIUM ─────────────────────────────────── */}
      <motion.div
        className="relative rounded-2xl p-6 md:p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(67,56,202,0.03))',
          border: '1px solid rgba(99,102,241,0.18)',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-indigo-500/10">
              {(perfil?.nombre || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                Hola, {perfil?.nombre || user?.email?.split('@')[0]} 👋
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Aquí tienes el resumen financiero y de cobranzas para el día de hoy.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus size={14} />}
              onClick={() => navigate('/clientes')}
            >
              Registrar Cliente
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => navigate('/prestamos')}
            >
              Nuevo Préstamo
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── SECCIÓN DE KPIS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            trendType={kpi.trendType}
            subtext={kpi.subtext}
            icon={kpi.icon}
            glow={kpi.glow}
          />
        ))}
      </div>

      {/* ── ÚLTIMOS MOVIMIENTOS & ACCESOS DIRECTOS ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de préstamos recientes (ocupa 2 columnas) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card padding="lg" variant="glass">
            <CardHeader
              title="Préstamos Recientes"
              subtitle="Últimos créditos otorgados o en proceso de aprobación"
              icon={<TrendingUp size={16} className="text-indigo-400" />}
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  rightIcon={<ArrowRight size={12} />}
                  onClick={() => navigate('/prestamos')}
                >
                  Ver todos
                </Button>
              }
            />
            <DataGrid
              data={prestamosRecientes}
              columns={columns}
              searchKey="cliente"
              searchPlaceholder="Buscar por cliente..."
              pageSize={5}
              onRowClick={(row) => navigate(`/prestamos?id=${row.id}`)}
            />
          </Card>
        </div>

        {/* Módulo de accesos rápidos y estado del cobrador (ocupa 1 columna) */}
        <div className="flex flex-col gap-6">
          <Card padding="lg" variant="elevated" className="h-full">
            <CardHeader
              title="Operaciones en Calle"
              subtitle="Herramientas rápidas para cobradores"
              icon={<CircleDollarSign size={16} className="text-indigo-400" />}
            />

            <div className="flex flex-col gap-3.5 mt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ruta de Cobro
                </span>
                <p className="text-sm text-slate-200 font-medium">
                  Tienes <span className="text-amber-400 font-semibold">5 cuotas vencidas</span> pendientes de cobro hoy.
                </p>
                <Button
                  variant="success"
                  size="sm"
                  fullWidth
                  className="mt-2.5"
                  onClick={() => navigate('/cobranzas')}
                >
                  Iniciar Ruta de Cobro
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/40 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado del Sistema
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Conexión Supabase</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sesión Activa</span>
                  <span className="text-indigo-400 font-mono font-medium truncate max-w-[130px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
