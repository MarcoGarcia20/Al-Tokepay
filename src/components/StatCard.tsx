// ============================================================
// StatCard — Tarjeta de estadísticas financieras (KPIs)
// Con micro-interacciones, indicador de tendencia y glow opcional
// ============================================================

import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from './Card'
import { kpiVariants } from '../animations/variants'

type TrendType = 'up' | 'down' | 'neutral'

interface StatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: string | number
  trendType?: TrendType
  subtext?: string
  glow?: 'none' | 'brand' | 'success' | 'danger'
  className?: string
  isCurrency?: boolean
}

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral',
  subtext,
  glow = 'none',
  className = '',
  isCurrency = false,
}: StatCardProps) => {
  const getTrendColorAndIcon = () => {
    switch (trendType) {
      case 'up':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          text: 'text-emerald-400',
          icon: <ArrowUpRight size={14} className="shrink-0" />,
        }
      case 'down':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20',
          text: 'text-rose-400',
          icon: <ArrowDownRight size={14} className="shrink-0" />,
        }
      case 'neutral':
      default:
        return {
          bg: 'bg-slate-800/60 border-slate-700/40',
          text: 'text-slate-400',
          icon: <Minus size={14} className="shrink-0" />,
        }
    }
  }

  const trendStyles = getTrendColorAndIcon()

  return (
    <Card
      variant="glass"
      glow={glow}
      className={`relative overflow-hidden group select-none hover:border-slate-600/45 transition-colors duration-300 ${className}`}
    >
      {/* Background decoration glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/5 to-transparent blur-2xl group-hover:from-indigo-500/10 transition-colors duration-300" />

      <div className="flex items-start justify-between">
        {/* Title and Icon */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {title}
          </span>
        </div>

        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900/50 border border-slate-800/80 text-indigo-400 shrink-0 group-hover:text-indigo-300 transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>

      {/* Main KPI Value */}
      <div className="mt-4 flex flex-col gap-1.5">
        <motion.h2
          variants={kpiVariants}
          initial="initial"
          animate="animate"
          className={`text-2xl md:text-3xl font-bold text-white tracking-tight select-all leading-none ${
            isCurrency ? 'font-financial' : 'font-sans'
          }`}
        >
          {value}
        </motion.h2>

        {/* Trend and Subtext */}
        {(trend !== undefined || subtext) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${trendStyles.bg} ${trendStyles.text}`}
              >
                {trendStyles.icon}
                {trend}
              </span>
            )}
            {subtext && (
              <span className="text-xs text-slate-500 truncate font-medium">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
