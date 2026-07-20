// ============================================================
// Card — Contenedor premium con glassmorphism
// ============================================================

import { motion } from 'framer-motion'
import type { ReactNode, HTMLAttributes } from 'react'
import { cardVariants } from '../animations/variants'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  animate?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'elevated' | 'glass' | 'bordered'
  glow?: 'none' | 'brand' | 'success' | 'danger'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const variantStyles: Record<
  'default' | 'elevated' | 'glass' | 'bordered',
  {
    background: string
    border: string
    boxShadow?: string
    backdropFilter?: string
    WebkitBackdropFilter?: string
  }
> = {
  default: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(30, 41, 59, 0.9)',
  },
  elevated: {
    background: 'rgba(22, 33, 54, 0.9)',
    border: '1px solid rgba(51, 65, 85, 0.4)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  glass: {
    background: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(71, 85, 105, 0.25)',
  },
  bordered: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(51, 65, 85, 0.7)',
  },
}


const glowMap = {
  none: '',
  brand: '0 0 24px -8px rgba(99,102,241,0.35)',
  success: '0 0 24px -8px rgba(16,185,129,0.35)',
  danger: '0 0 24px -8px rgba(244,63,94,0.35)',
}

export const Card = ({
  children,
  animate = false,
  padding = 'md',
  variant = 'elevated',
  glow = 'none',
  className = '',
  style,
  ...props
}: CardProps) => {
  const baseStyle = {
    ...variantStyles[variant],
    borderRadius: '16px',
    boxShadow: glow !== 'none' ? glowMap[glow] : variantStyles[variant].boxShadow,
    ...style,
  }

  if (animate) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className={`${paddingMap[padding]} ${className}`}
        style={baseStyle}
        {...(props as object)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={`${paddingMap[padding]} ${className}`}
      style={baseStyle}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Card Header ────────────────────────────────────────────

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}

export const CardHeader = ({ title, subtitle, action, icon }: CardHeaderProps) => (
  <div className="flex items-start justify-between mb-5">
    <div className="flex items-center gap-3">
      {icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)
