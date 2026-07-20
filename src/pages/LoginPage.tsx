// ============================================================
// Página de Login — Al Tokepay
// Diseño Fintech Premium con Supabase Auth
// ============================================================

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { pageVariants, cardVariants } from '../animations/variants'

// ── Schema de validación ───────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

// ── Componente principal ───────────────────────────────────
export const LoginPage = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setErrorMsg(null)

    const { error } = await signIn(data.email, data.password)

    if (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : 'Error al iniciar sesión. Intenta nuevamente.'
      )
      setIsLoading(false)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#020617' }}>
      {/* ── Panel Izquierdo — Branding ─────────────────────── */}
      <motion.div
        className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden p-12"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Fondo degradado */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          }}
        />

        {/* Glow orbs */}
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)' }}
        />

        {/* Contenido */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                boxShadow: '0 0 24px -4px rgba(99,102,241,0.5)',
              }}
            >
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Préstamos<span style={{ color: '#818cf8' }}>PRO</span>
            </span>
          </div>
        </div>

        {/* Central hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Gestión de{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #818cf8, #34d399)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                préstamos
              </span>{' '}
              sin fricciones.
            </h1>
            <p className="text-lg" style={{ color: '#94a3b8' }}>
              Registra clientes, genera préstamos y cobra cuotas con la
              precisión de un sistema bancario y la agilidad de una startup.
            </p>
          </motion.div>

          {/* Stats decorativas */}
          <motion.div
            className="grid grid-cols-3 gap-4 mt-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              { label: 'Capital gestionado', value: 'S/ 2.4M' },
              { label: 'Tasa de recuperación', value: '98.2%' },
              { label: 'Cobranzas hoy', value: '47' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(30,41,59,0.5)',
                  border: '1px solid rgba(71,85,105,0.3)',
                }}
              >
                <div
                  className="text-2xl font-bold font-financial tabular-nums"
                  style={{ color: '#818cf8' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs mt-1" style={{ color: '#64748b' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm" style={{ color: '#475569' }}>
          © 2025 Al Tokepay. Sistema financiero seguro.
        </div>
      </motion.div>

      {/* ── Panel Derecho — Formulario ─────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: '#0f172a' }}
      >
        <motion.div
          className="w-full max-w-md"
          variants={pageVariants}
          initial="initial"
          animate="animate"
        >
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}
            >
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">
              Préstamos<span style={{ color: '#818cf8' }}>PRO</span>
            </span>
          </div>

          <motion.div variants={cardVariants}>
            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido</h2>
            <p className="mb-8" style={{ color: '#64748b' }}>
              Ingresa tus credenciales para acceder al sistema
            </p>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: '#cbd5e1' }}
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: errors.email
                      ? '1px solid rgba(244, 63, 94, 0.6)'
                      : '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                  onFocus={(e) => {
                    if (!errors.email) {
                      e.target.style.border = '1px solid rgba(99, 102, 241, 0.6)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.border = errors.email
                      ? '1px solid rgba(244, 63, 94, 0.6)'
                      : '1px solid rgba(51, 65, 85, 0.8)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs mt-1.5 flex items-center gap-1"
                    style={{ color: '#fb7185' }}
                  >
                    <AlertCircle size={12} /> {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: '#cbd5e1' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569' }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-white placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: errors.password
                      ? '1px solid rgba(244, 63, 94, 0.6)'
                      : '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                  onFocus={(e) => {
                    if (!errors.password) {
                      e.target.style.border = '1px solid rgba(99, 102, 241, 0.6)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.border = errors.password
                      ? '1px solid rgba(244, 63, 94, 0.6)'
                      : '1px solid rgba(51, 65, 85, 0.8)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs mt-1.5 flex items-center gap-1"
                    style={{ color: '#fb7185' }}
                  >
                    <AlertCircle size={12} /> {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    color: '#fb7185',
                  }}
                >
                  <AlertCircle size={14} className="shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? 'rgba(99, 102, 241, 0.6)'
                  : 'linear-gradient(135deg, #6366f1, #4338ca)',
                boxShadow: isLoading ? 'none' : '0 0 24px -4px rgba(99, 102, 241, 0.5)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </motion.button>

            {/* Registro */}
            <p className="text-center text-sm" style={{ color: '#64748b' }}>
              ¿No tienes cuenta?{' '}
              <Link
                to="/registro"
                className="font-medium transition-colors"
                style={{ color: '#818cf8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a5b4fc')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#818cf8')}
              >
                Regístrate aquí
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
