// ============================================================
// CobranzasPage — Gestión de Cobros en Calle y Escritorio
// Muestra cuotas pendientes/vencidas, permite buscar por
// deudor y registrar abonos con amortización FIFO automática.
// ============================================================

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck,
  Coins,
  FileUp,
  X,
  FileCheck,
  Wallet,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

import { usePrestamos } from '../hooks/usePrestamos'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { DataGrid, ColumnDef } from '../components/DataGrid'
import { Input } from '../components/Input'
import { EstadoCuotaBadge } from '../components/Badge'
import { springSmooth } from '../animations/variants'
import { formatCurrency } from '../utils/financiero'

// ── Schema de Validación del Pago ───────────────────────────
const pagoSchema = z.object({
  monto: z
    .number({ message: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0')
    .min(0.5, 'El monto mínimo de abono es S/. 0.50'),
  metodoPago: z.enum(['efectivo', 'transferencia', 'billetera_digital'] as const),
  notas: z.string().optional(),
})

type PagoFormValues = z.infer<typeof pagoSchema>

export const CobranzasPage = () => {
  const { user } = useAuth()
  const { useGetCuotasPendientes, useRegistrarPago, useGetPrestamoDetalle } = usePrestamos()

  // Queries y Mutations
  const { data: cuotas = [], isLoading } = useGetCuotasPendientes()
  const registrarPagoMutation = useRegistrarPago()

  // Estados locales de UI
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPrestamoId, setSelectedPrestamoId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'parcial' | 'vencido'>('todos')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Carga del comprobante físico
  const [uploadingFile, setUploadingFile] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      metodoPago: 'efectivo',
    },
  })

  // Watcher para simulación de abonos en tiempo real
  const watchMonto = watch('monto')

  // Cargar el detalle del préstamo seleccionado para ver todas sus cuotas pendientes
  const { data: prestamoDetalle, isLoading: loadingDetalle } = useGetPrestamoDetalle(selectedPrestamoId)

  // Cuotas pendientes del préstamo en orden cronológico (para el FIFO)
  const cuotasPendientesPrestamo = useMemo(() => {
    if (!prestamoDetalle || !prestamoDetalle.cuotas) return []
    return prestamoDetalle.cuotas.filter((c) => c.estado !== 'pagado')
  }, [prestamoDetalle])

  // Simulación de distribución del abono (FIFO) en la UI
  const simulacionDistribucion = useMemo(() => {
    const monto = Number(watchMonto)
    if (!monto || isNaN(monto) || monto <= 0 || cuotasPendientesPrestamo.length === 0) {
      return []
    }

    let restante = monto
    const items = []

    for (const cuota of cuotasPendientesPrestamo) {
      if (restante <= 0) break

      const penalidades = Number(cuota.penalidad_fija_acumulada || 0) + Number(cuota.interes_moratorio_acumulado || 0)
      const baseCuota = Number(cuota.monto_cuota) - Number(cuota.monto_pagado)
      const totalCuota = baseCuota + penalidades

      if (restante >= totalCuota) {
        items.push({
          numCuota: cuota.num_cuota,
          aplicado: totalCuota,
          estado: 'pagado',
          detalle: `Cancela cuota base (S/. ${baseCuota.toFixed(2)}) y mora (S/. ${penalidades.toFixed(2)})`,
        })
        restante -= totalCuota
      } else {
        items.push({
          numCuota: cuota.num_cuota,
          aplicado: restante,
          estado: 'parcial',
          detalle: restante >= penalidades
            ? `Cubre mora (S/. ${penalidades.toFixed(2)}) y abona S/. ${(restante - penalidades).toFixed(2)} al capital`
            : `Abona S/. ${restante.toFixed(2)} a la mora acumulada`,
        })
        restante = 0
      }
    }

    if (restante > 0) {
      items.push({
        numCuota: null,
        aplicado: restante,
        estado: 'saldo_favor',
        detalle: 'Excedente: se guardará como saldo a favor del cliente',
      })
    }

    return items
  }, [watchMonto, cuotasPendientesPrestamo])

  // Abrir Drawer de Cobro
  const handleOpenCobro = (prestamoId: string) => {
    setSelectedPrestamoId(prestamoId)
    setErrorMsg(null)
    setSuccessMsg(null)
    setComprobanteUrl(null)
    setFileName(null)
    reset({
      monto: undefined,
      metodoPago: 'efectivo',
      notas: '',
    })
    setDrawerOpen(true)
  }

  // Manejador de archivo
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setUploadingFile(true)
    setErrorMsg(null)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('comprobante', file)

      const result = await api.upload<{ url: string }>('/comprobantes', formData)
      setComprobanteUrl(result.url)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al subir el archivo.')
      setFileName(null)
      setComprobanteUrl(null)
    } finally {
      setUploadingFile(false)
    }
  }

  // Guardar abono
  const onSubmit = async (values: PagoFormValues) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!selectedPrestamoId) return

    try {
      await registrarPagoMutation.mutateAsync({
        prestamoId: selectedPrestamoId,
        monto: values.monto,
        metodoPago: values.metodoPago,
        notas: values.notas || null,
        comprobanteUrl: comprobanteUrl,
      })

      setSuccessMsg('El pago se ha procesado y amortizado correctamente.')

      setTimeout(() => {
        setDrawerOpen(false)
        reset()
      }, 1200)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el pago')
    }
  }

  // Filtrar cuotas localmente
  const cuotasFiltradas = useMemo(() => {
    return cuotas.filter((c) => {
      if (filtroEstado === 'todos') return true
      return c.estado === filtroEstado
    })
  }, [cuotas, filtroEstado])

  // KPIs de Cobranzas del día de hoy
  const stats = useMemo(() => {
    // Cuotas vencidas
    const vencidas = cuotas.filter(c => c.estado === 'vencido')
    const totalMora = vencidas.reduce((acc, c) => acc + Number(c.penalidad_fija_acumulada || 0) + Number(c.interes_moratorio_acumulado || 0), 0)
    const baseVencido = vencidas.reduce((acc, c) => acc + (Number(c.monto_cuota) - Number(c.monto_pagado)), 0)
    const deudaExigible = baseVencido + totalMora

    // Cuotas pendientes totales
    const totalPendiente = cuotas.length

    return {
      totalMora,
      deudaExigible,
      totalPendiente,
    }
  }, [cuotas])

  // Definición de columnas de la tabla de cobranzas
  const columns: ColumnDef<any>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-white">
            {row.cliente_nombres} {row.cliente_apellidos}
          </span>
          <p className="text-[10px] text-slate-500 font-mono">DNI/RUC: {row.documento_identidad}</p>
        </div>
      ),
    },
    {
      key: 'cuota',
      header: 'Cuota',
      align: 'center',
      render: (row) => (
        <span className="font-semibold text-slate-300">
          {row.num_cuota}
        </span>
      ),
    },
    {
      key: 'monto_cuota',
      header: 'Monto Base',
      align: 'right',
      render: (row) => (
        <span className="font-financial text-slate-400">
          {formatCurrency(Number(row.monto_cuota))}
        </span>
      ),
    },
    {
      key: 'mora',
      header: 'Mora/Penalidades',
      align: 'right',
      render: (row) => {
        const totalMora = Number(row.penalidad_fija_acumulada || 0) + Number(row.interes_moratorio_acumulado || 0)
        return (
          <span className={`font-financial ${totalMora > 0 ? 'text-rose-400 font-medium' : 'text-slate-600'}`}>
            {totalMora > 0 ? formatCurrency(totalMora) : '—'}
          </span>
        )
      },
    },
    {
      key: 'fecha_vencimiento',
      header: 'Vencimiento',
      sortable: true,
      render: (row) => {
        const date = new Date(row.fecha_vencimiento + 'T12:00:00')
        const isOverdue = row.estado === 'vencido'
        return (
          <span className={`text-xs ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
            {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )
      },
    },
    {
      key: 'restante',
      header: 'Deuda Exigible',
      align: 'right',
      render: (row) => {
        const pen = Number(row.penalidad_fija_acumulada || 0)
        const mor = Number(row.interes_moratorio_acumulado || 0)
        const total = (Number(row.monto_cuota) - Number(row.monto_pagado)) + pen + mor
        return (
          <span className="font-financial font-bold text-white">
            {formatCurrency(total)}
          </span>
        )
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (row) => <EstadoCuotaBadge estado={row.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acción',
      align: 'right',
      render: (row) => (
        <Button
          variant="success"
          size="xs"
          onClick={() => handleOpenCobro(row.prestamo_id)}
        >
          Cobrar
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Módulo de Cobranzas
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            Gestión y Ruta de Cobros
          </h2>
        </div>
      </div>

      {/* ── KPIs FINANCIEROS DE COBRANZA ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarCheck size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cuotas Pendientes
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5">
              {stats.totalPendiente}
            </h3>
          </div>
        </Card>

        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mora Acumulada
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5 text-rose-400">
              {formatCurrency(stats.totalMora)}
            </h3>
          </div>
        </Card>

        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Cartera Exigible
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5 text-amber-400">
              {formatCurrency(stats.deudaExigible)}
            </h3>
          </div>
        </Card>
      </div>

      {/* ── LISTADO CON DATAGRID ── */}
      <Card padding="lg" variant="glass">
        <CardHeader
          title="Planilla de Cobros"
          subtitle="Lista de cuotas vencidas y pendientes en orden cronológico"
          icon={<Coins size={16} className="text-indigo-400" />}
        />

        <DataGrid
          data={cuotasFiltradas}
          columns={columns}
          isLoading={isLoading}
          searchKey={(row) => `${row.cliente_nombres} ${row.cliente_apellidos} ${row.documento_identidad}`}
          searchPlaceholder="Buscar por cliente o identificación..."
          onRowClick={(row) => handleOpenCobro(row.prestamo_id)}
          filtersSlot={
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase shrink-0">
                Filtro Estado:
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="h-9 px-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
          }
        />
      </Card>

      {/* ── DRAWER MOBILE-FIRST REGISTRO DE COBRO ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.aside
              variants={{
                hidden: { x: '100%' },
                visible: { x: 0, transition: springSmooth },
                exit: { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800/80 shadow-2xl flex flex-col"
            >
              {/* Header Drawer */}
              <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">
                    Registrar Cobro de Cuota
                  </h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulario */}
              {loadingDetalle ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-indigo-400" size={24} />
                  <span className="text-xs">Cargando cuentas del préstamo...</span>
                </div>
              ) : !prestamoDetalle ? (
                <div className="p-8 text-center text-slate-500">
                  Error al cargar el préstamo.
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    
                    {/* Tarjeta de Resumen Deudor */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Deudor</span>
                          <span className="text-sm font-semibold text-white block mt-0.5">
                            {prestamoDetalle.clientes?.nombres} {prestamoDetalle.clientes?.apellidos}
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">
                          Tasa: {prestamoDetalle.tasa_interes}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1 pt-2 border-t border-slate-900 text-xs">
                        <div>
                          <span className="text-slate-500 block">Deuda Total:</span>
                          <span className="font-financial font-medium text-slate-300">{formatCurrency(Number(prestamoDetalle.monto_total))}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Saldo Pendiente:</span>
                          <span className="font-financial font-bold text-amber-400">{formatCurrency(Number(prestamoDetalle.saldo_pendiente))}</span>
                        </div>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-start gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {successMsg && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* Monto a Registrar */}
                    <Input
                      type="number"
                      step="any"
                      label="Monto Abonado (S/.) *"
                      prefixText="S/."
                      placeholder="Monto"
                      error={errors.monto?.message}
                      {...register('monto', { valueAsNumber: true })}
                    />

                    {/* Método de Pago */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Método de Pago *
                      </label>
                      <select
                        {...register('metodoPago')}
                        className="h-10 px-3 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="efectivo" className="bg-slate-950">Efectivo</option>
                        <option value="transferencia" className="bg-slate-950">Transferencia Bancaria</option>
                        <option value="billetera_digital" className="bg-slate-950">Yape / Plin / Billetera Digital</option>
                      </select>
                    </div>

                    {/* Comprobante de Pago */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <FileUp size={13} className="text-indigo-400" />
                        Comprobante / Captura
                      </label>
                      
                      <div className="relative h-10 w-full rounded-xl border border-slate-800 bg-slate-900/60 flex items-center px-3 hover:border-slate-700 transition-colors overflow-hidden">
                        <input
                          type="file"
                          id="comprobante"
                          accept="image/*,application/pdf"
                          onChange={handleUploadFile}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        {uploadingFile ? (
                          <span className="text-xs text-indigo-400 flex items-center gap-2">
                            <Loader2 className="animate-spin" size={13} />
                            Subiendo comprobante...
                          </span>
                        ) : fileName ? (
                          <span className="text-xs text-white flex items-center gap-1.5 truncate max-w-[90%]">
                            <FileCheck size={14} className="text-emerald-400" />
                            {fileName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Seleccionar archivo (Foto o PDF)</span>
                        )}
                      </div>
                    </div>

                    {/* Simulación visual de amortización (FIFO) */}
                    {simulacionDistribucion.length > 0 && (
                      <div className="mt-2 p-4 rounded-xl bg-slate-950/30 border border-slate-850">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                          Distribución Estimada (Método FIFO)
                        </span>
                        
                        <div className="flex flex-col gap-2">
                          {simulacionDistribucion.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
                              <div>
                                <span className="font-semibold text-slate-200">
                                  {item.numCuota ? `Cuota ${item.numCuota}` : 'Excedente'}
                                </span>
                                <p className="text-[10px] text-slate-500 leading-normal">{item.detalle}</p>
                              </div>
                              <span className={`font-financial font-medium ${item.estado === 'pagado' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                + {formatCurrency(item.aplicado)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notas */}
                    <Input
                      as="textarea"
                      label="Notas del Recibo"
                      placeholder="Ej. Pagado en efectivo, entrega de recibo físico..."
                      rows={2}
                      {...register('notas')}
                    />
                  </div>

                  {/* Footer Drawer */}
                  <div className="p-6 border-t border-slate-800/60 bg-slate-950/20 flex items-center gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setDrawerOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      isLoading={isSubmitting}
                    >
                      Registrar Cobro
                    </Button>
                  </div>
                </form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
