// ============================================================
// Badge — Etiquetas de estado financiero
// ============================================================

import type { ReactNode } from 'react'
import type { EstadoCuota, EstadoPrestamo, EstadoCliente } from '../types/database'

type BadgeVariant =
  | 'pagado'
  | 'pendiente'
  | 'vencido'
  | 'parcial'
  | 'activo'
  | 'en_mora'
  | 'bloqueado'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantMap: Record<BadgeVariant, string> = {
  pagado:    'badge-pagado',
  pendiente: 'badge-pendiente',
  parcial:   'badge-parcial',
  vencido:   'badge-vencido',
  activo:    'badge-activo',
  en_mora:   'badge-en-mora',
  bloqueado: 'badge-bloqueado',
  default:   'bg-slate-800 text-slate-400 border border-slate-700/50',
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export const Badge = ({ variant = 'default', children, size = 'sm', dot = false }: BadgeProps) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        variantMap[variant],
        sizeMap[size],
      ].join(' ')}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: 'currentColor',
            opacity: 0.8,
          }}
        />
      )}
      {children}
    </span>
  )
}

// ── Helpers para tipos de DB ───────────────────────────────

const estadoCuotaLabels: Record<EstadoCuota, string> = {
  pendiente: 'Pendiente',
  pagado:    'Pagado',
  vencido:   'Vencido',
  parcial:   'Pago Parcial',
}

const estadoPrestamoLabels: Record<EstadoPrestamo, string> = {
  pendiente: 'Pendiente',
  activo:    'Activo',
  pagado:    'Pagado',
  en_mora:   'En mora',
}

const estadoClienteLabels: Record<EstadoCliente, string> = {
  activo:    'Activo',
  bloqueado: 'Bloqueado',
}

export const EstadoCuotaBadge = ({ estado }: { estado: EstadoCuota }) => (
  <Badge variant={estado} dot>{estadoCuotaLabels[estado]}</Badge>
)

export const EstadoPrestamoBadge = ({ estado }: { estado: EstadoPrestamo }) => (
  <Badge variant={estado === 'en_mora' ? 'en_mora' : estado} dot>
    {estadoPrestamoLabels[estado]}
  </Badge>
)

export const EstadoClienteBadge = ({ estado }: { estado: EstadoCliente }) => (
  <Badge variant={estado} dot>{estadoClienteLabels[estado]}</Badge>
)
