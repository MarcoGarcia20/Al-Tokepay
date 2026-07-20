// ============================================================
// ConfiguracionPage — Panel de Ajustes y Parámetros del Sistema
// Disponible únicamente para administradores del negocio.
// ============================================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  AlertCircle,
  CalendarClock,
  Save,
  Loader2,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useParametros } from '../hooks/useParametros'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { Input } from '../components/Input'
import { formatCurrency } from '../utils/financiero'

// ── Schema de Validación ───────────────────────────────────
const configSchema = z.object({
  penalidadDiaria: z
    .number({ message: 'Ingresa un valor válido' })
    .min(0, 'La penalidad no puede ser negativa'),
  tasaMoraPorcentaje: z
    .number({ message: 'Ingresa un porcentaje válido' })
    .min(0, 'La tasa no puede ser negativa')
    .max(100, 'La tasa no puede exceder el 100%'),
})

type ConfigFormValues = z.infer<typeof configSchema>

export const ConfiguracionPage = () => {
  const { isAdmin } = useAuth()
  const { useGetParametros, useUpdateParametro, useEjecutarCronMora } = useParametros()

  // Queries
  const { data: parametros = [], isLoading: loadingParametros } = useGetParametros()
  const updateMutation = useUpdateParametro()
  const cronMutation = useEjecutarCronMora()

  // Estados locales de feedback
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [cronResult, setCronResult] = useState<any | null>(null)

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
  })

  // Cargar parámetros en los inputs del formulario
  useEffect(() => {
    if (parametros.length > 0) {
      const pen = parametros.find((p) => p.clave === 'penalidad_diaria_mora')
      const tasa = parametros.find((p) => p.clave === 'tasa_mora_porcentaje')
      if (pen) setValue('penalidadDiaria', Number(pen.valor))
      if (tasa) setValue('tasaMoraPorcentaje', Number(tasa.valor))
    }
  }, [parametros, setValue])

  // Si no es admin, denegar acceso
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <AlertCircle className="text-rose-500 mb-3" size={36} />
        <h3 className="text-lg font-bold text-white">Acceso Denegado</h3>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">
          Este módulo está restringido únicamente para cuentas con perfil de Administrador del sistema.
        </p>
      </div>
    )
  }

  // Guardar configuración
  const onSubmit = async (values: ConfigFormValues) => {
    setFormError(null)
    setFormSuccess(null)

    try {
      // Guardar penalidad
      await updateMutation.mutateAsync({
        clave: 'penalidad_diaria_mora',
        valor: values.penalidadDiaria.toFixed(2),
      })

      // Guardar tasa de mora
      await updateMutation.mutateAsync({
        clave: 'tasa_mora_porcentaje',
        valor: values.tasaMoraPorcentaje.toFixed(2),
      })

      setFormSuccess('Parámetros actualizados exitosamente en la base de datos.')
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar los parámetros.')
    }
  }

  // Ejecución manual de simulación de cron mora
  const handleEjecutarCron = async () => {
    setCronResult(null)
    try {
      const result = await cronMutation.mutateAsync()
      setCronResult(result)
    } catch (err: any) {
      alert(`Error al ejecutar el cálculo de mora: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Panel de Control
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            Configuración del Sistema
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulario de Configuración (3/5 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card padding="lg" variant="glass" className="h-full">
            <CardHeader
              title="Ajustes de Mora y Penalidades"
              subtitle="Define las penalidades automáticas aplicadas a cuotas vencidas"
              icon={<Settings size={16} className="text-indigo-400" />}
            />

            {loadingParametros ? (
              <div className="p-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-indigo-400" />
                <span className="text-xs text-slate-500">Cargando parámetros...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    {formSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Penalidad diaria */}
                  <Input
                    type="number"
                    step="0.01"
                    label="Penalidad Fija Diaria (S/.) *"
                    prefixText="S/."
                    placeholder="Ej. 5.00"
                    error={errors.penalidadDiaria?.message}
                    {...register('penalidadDiaria', { valueAsNumber: true })}
                  />

                  {/* Tasa moratoria mensual */}
                  <Input
                    type="number"
                    step="0.01"
                    label="Tasa Moratoria Mensual (%) *"
                    suffixText="%"
                    placeholder="Ej. 1.50"
                    error={errors.tasaMoraPorcentaje?.message}
                    {...register('tasaMoraPorcentaje', { valueAsNumber: true })}
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 text-xs text-slate-400 leading-normal flex flex-col gap-2">
                  <span className="font-semibold text-slate-300">Nota sobre la Liquidación:</span>
                  <p>
                    Las penalidades y mora acumulada se calculan a prorrata diaria a medianoche. 
                    El cobro al cliente liquidará primero las penalidades totales acumuladas de la cuota 
                    y posteriormente el saldo base (capital + interés ordinario).
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={<Save size={14} />}
                    isLoading={isSubmitting}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Simulador manual del Cron Job (2/5 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card padding="lg" variant="elevated" className="h-full">
            <CardHeader
              title="Procesos en Segundo Plano"
              subtitle="Ejecución y monitorización manual de tareas diarias"
              icon={<Activity size={16} className="text-indigo-400" />}
            />

            <div className="space-y-5 mt-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                  <CalendarClock size={15} className="text-amber-400" />
                  Mora Automática Diaria
                </div>
                
                <p className="text-xs text-slate-400 leading-normal">
                  El cron job corre a medianoche (hora Perú) de forma automatizada sobre todas las cuotas vencidas y no pagadas. 
                  Puedes disparar el proceso manualmente desde aquí para fines de pruebas o recalcular la mora actual.
                </p>

                <Button
                  variant="warning"
                  size="sm"
                  fullWidth
                  className="mt-1"
                  onClick={handleEjecutarCron}
                  isLoading={cronMutation.isPending}
                >
                  Ejecutar Proceso de Mora
                </Button>
              </div>

              {/* Resultado del cron manual */}
              {cronResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-2.5"
                >
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    Proceso Ejecutado Exitosamente
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-900">
                    <div className="flex flex-col">
                      <span className="text-slate-500">Cuotas Procesadas:</span>
                      <span className="text-slate-200 font-bold font-financial mt-0.5">
                        {cronResult.cuotas_procesadas || 0} cuotas
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-slate-500">Mora Acumulada:</span>
                      <span className="text-emerald-400 font-bold font-financial mt-0.5">
                        {formatCurrency(cronResult.mora_total_acumulada || 0)}
                      </span>
                    </div>

                    <div className="flex flex-col mt-2">
                      <span className="text-slate-500">Penalidad fija sumada:</span>
                      <span className="text-slate-200 font-bold font-financial mt-0.5">
                        {formatCurrency(cronResult.penalidad_total_acumulada || 0)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
