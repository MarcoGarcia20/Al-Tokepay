// ============================================================
// Página de Registro — Al Tokepay
// ============================================================

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, User, TrendingUp, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { pageVariants } from '../animations/variants'

const registroSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegistroForm = z.infer<typeof registroSchema>

export const RegistroPage = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  })

  const onSubmit = async (data: RegistroForm) => {
    setIsLoading(true)
    setErrorMsg(null)

    const { error } = await signUp(data.email, data.password, data.nombre)

    if (error) {
      setErrorMsg(
        error.message.includes('already registered')
          ? 'Este correo ya está registrado.'
          : 'Error al crear la cuenta. Intenta nuevamente.'
      )
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 3000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(5, 150, 105, 0.2)', border: '2px solid #34d399' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <CheckCircle2 size={36} style={{ color: '#34d399' }} />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h2>
          <p style={{ color: '#94a3b8' }}>
            Revisa tu correo para verificar tu cuenta. Redirigiendo...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f172a' }}>
      <motion.div className="w-full max-w-md" variants={pageVariants} initial="initial" animate="animate">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', boxShadow: '0 0 24px -4px rgba(99,102,241,0.4)' }}>
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">Préstamos<span style={{ color: '#818cf8' }}>PRO</span></span>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.5)' }}>
          <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Comienza a gestionar tus préstamos hoy</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Nombre completo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  id="nombre"
                  {...register('nombre')}
                  placeholder="Juan Pérez"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(15,23,42,0.8)', border: errors.nombre ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(51,65,85,0.8)' }}
                />
              </div>
              {errors.nombre && <p className="text-xs mt-1" style={{ color: '#fb7185' }}>{errors.nombre.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Correo electrónico</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  id="email-registro"
                  type="email"
                  {...register('email')}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(15,23,42,0.8)', border: errors.email ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(51,65,85,0.8)' }}
                />
              </div>
              {errors.email && <p className="text-xs mt-1" style={{ color: '#fb7185' }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  id="password-registro"
                  type={showPass ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(15,23,42,0.8)', border: errors.password ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(51,65,85,0.8)' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs mt-1" style={{ color: '#fb7185' }}>{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#cbd5e1' }}>Confirmar contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  id="confirm-password"
                  type={showPass ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(15,23,42,0.8)', border: errors.confirmPassword ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(51,65,85,0.8)' }}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs mt-1" style={{ color: '#fb7185' }}>{errors.confirmPassword.message}</p>}
            </div>

            {/* Error */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}>
                  <AlertCircle size={14} /> {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              id="btn-registro"
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)', boxShadow: '0 0 20px -4px rgba(99,102,241,0.4)' }}
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" />Creando cuenta...</> : 'Crear cuenta'}
            </motion.button>

            <p className="text-center text-sm" style={{ color: '#64748b' }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>Inicia sesión</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
