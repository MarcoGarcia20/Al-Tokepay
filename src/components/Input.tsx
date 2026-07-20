// ============================================================
// Input — Componente base para formularios premium
// Soporta input de texto, select, textarea, iconos y estados de error
// ============================================================

import { forwardRef } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface BaseInputProps {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  prefixText?: string
  suffixText?: string
  fullWidth?: boolean
  className?: string
}

// Props para input normal
export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>, BaseInputProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'date' | 'url'
  as?: 'input'
}

// Props para select
export interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'prefix'>, BaseInputProps {
  as: 'select'
  options?: { value: string | number; label: string }[]
  children?: ReactNode
}

// Props para textarea
export interface TextareaInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix'>, BaseInputProps {
  as: 'textarea'
  rows?: number
}

export type InputProps = TextInputProps | SelectInputProps | TextareaInputProps

export const Input = forwardRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, InputProps>(
  (props, ref) => {
    const {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      prefixText,
      suffixText,
      fullWidth = true,
      className = '',
      as = 'input',
      ...restProps
    } = props

    const hasError = !!error
    const widthClass = fullWidth ? 'w-full' : ''

    const inputBaseStyles = [
      'flex h-10 w-full rounded-xl bg-slate-900/60 border text-sm text-slate-200 placeholder:text-slate-500',
      'focus:outline-none focus:ring-1 focus:ring-indigo-500/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-all duration-150',
      hasError
        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30'
        : 'border-slate-800/80 hover:border-slate-700/60 focus:border-indigo-500/80',
      leftIcon || prefixText ? 'pl-10' : 'pl-3',
      rightIcon || suffixText ? 'pr-10' : 'pr-3',
    ].join(' ')

    const selectBaseStyles = [
      'flex h-10 w-full rounded-xl bg-slate-900/60 border text-sm text-slate-200',
      'focus:outline-none focus:ring-1 focus:ring-indigo-500/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-all duration-150 appearance-none',
      hasError
        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30'
        : 'border-slate-800/80 hover:border-slate-700/60 focus:border-indigo-500/80',
      leftIcon || prefixText ? 'pl-10' : 'pl-3',
      'pr-10', // Always make room for the dropdown arrow
    ].join(' ')

    const textareaBaseStyles = [
      'flex w-full rounded-xl bg-slate-900/60 border text-sm text-slate-200 placeholder:text-slate-500 py-2.5',
      'focus:outline-none focus:ring-1 focus:ring-indigo-500/50',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-all duration-150 resize-y',
      hasError
        ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30'
        : 'border-slate-800/80 hover:border-slate-700/60 focus:border-indigo-500/80',
      leftIcon || prefixText ? 'pl-10' : 'pl-3',
      rightIcon || suffixText ? 'pr-10' : 'pr-3',
    ].join(' ')

    return (
      <div className={`flex flex-col gap-1.5 ${widthClass} ${className}`}>
        {label && (
          <label className="text-xs font-semibold text-slate-400 select-none">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {/* Left Icon or Prefix */}
          {(leftIcon || prefixText) && (
            <div className="absolute left-3 flex items-center justify-center text-slate-500 select-none">
              {leftIcon ? (
                <span className="shrink-0">{leftIcon}</span>
              ) : (
                <span className="text-xs font-mono font-medium">{prefixText}</span>
              )}
            </div>
          )}

          {/* Render target elements based on 'as' prop */}
          {as === 'input' && (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              className={inputBaseStyles}
              {...(restProps as InputHTMLAttributes<HTMLInputElement>)}
            />
          )}

          {as === 'select' && (
            <div className="relative w-full">
              <select
                ref={ref as React.Ref<HTMLSelectElement>}
                className={selectBaseStyles}
                {...(restProps as SelectHTMLAttributes<HTMLSelectElement>)}
              >
                {(props as SelectInputProps).options?.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-300">
                    {opt.label}
                  </option>
                )) || props.children}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          )}

          {as === 'textarea' && (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={textareaBaseStyles}
              {...(restProps as TextareaInputProps)}
            />
          )}

          {/* Right Icon or Suffix */}
          {as !== 'select' && (rightIcon || suffixText) && (
            <div className="absolute right-3 flex items-center justify-center text-slate-500 select-none">
              {rightIcon ? (
                <span className="shrink-0">{rightIcon}</span>
              ) : (
                <span className="text-xs font-mono font-medium">{suffixText}</span>
              )}
            </div>
          )}
        </div>

        {/* Error or helper text */}
        {error ? (
          <span className="text-xs text-rose-400 font-medium">{error}</span>
        ) : (
          helperText && <span className="text-xs text-slate-500">{helperText}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
