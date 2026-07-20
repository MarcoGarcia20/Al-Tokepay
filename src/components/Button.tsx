// ============================================================
// Button — Componente base reutilizable
// Variantes: primary, secondary, ghost, danger, success
// ============================================================

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, { base: string; hover: string; shadow?: string }> = {
  primary: {
    base: 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white border border-indigo-600/50',
    hover: 'hover:from-indigo-400 hover:to-indigo-600',
    shadow: '0 0 20px -4px rgba(99,102,241,0.4)',
  },
  secondary: {
    base: 'bg-slate-800 text-slate-200 border border-slate-700/80',
    hover: 'hover:bg-slate-700 hover:border-slate-600',
  },
  ghost: {
    base: 'bg-transparent text-slate-300 border border-transparent',
    hover: 'hover:bg-slate-800/60 hover:text-white hover:border-slate-700/50',
  },
  danger: {
    base: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    hover: 'hover:bg-rose-500/20 hover:border-rose-500/50',
  },
  success: {
    base: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    hover: 'hover:bg-emerald-500/20 hover:border-emerald-500/50',
  },
  warning: {
    base: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    hover: 'hover:bg-amber-500/20 hover:border-amber-500/50',
  },
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-2',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const v = variantStyles[variant]
    const isDisabled = disabled || isLoading

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? {} : { scale: 1.01 }}
        whileTap={isDisabled ? {} : { scale: 0.97 }}
        disabled={isDisabled}
        style={{ boxShadow: v.shadow, ...style }}
        className={[
          'inline-flex items-center justify-center font-medium rounded-xl',
          'transition-colors duration-150 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
          v.base,
          v.hover,
          sizeStyles[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...(props as object)}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
