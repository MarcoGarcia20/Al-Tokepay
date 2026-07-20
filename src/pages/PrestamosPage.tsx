// ============================================================
// PrestamosPage — Módulo de Gestión de Préstamos
// Calculadora interactiva (Sistema Francés), previsualización
// con stagger, e inserción atómica de préstamos y cuotas.
// ============================================================

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  Plus,
  AlertCircle,
  Eye,
  TrendingUp,
  X,
  FileCheck,
  Info,
  UserCheck,
} from 'lucide-react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import { money } from '../lib/money'

import { usePrestamos } from '../hooks/usePrestamos'
import { useClientes } from '../hooks/useClientes'
import { useCobradores } from '../hooks/useCobradores'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { DataGrid, ColumnDef } from '../components/DataGrid'
import { Input } from '../components/Input'
import { EstadoPrestamoBadge, EstadoCuotaBadge } from '../components/Badge'
import { springSmooth, listContainerVariants, listItemVariants } from '../animations/variants'
import {
  formatCurrency,
  formatAmount,
  formatPercent,
  simularPrestamo,
  nombreFrecuencia,
} from '../utils/financiero'
import type { PrestamoConCliente, FrecuenciaPago } from '../types/database'


// ── Esquema de Validación Zod ───────────────────────────────
const prestamoSchema = z.object({
  clienteId: z.string().min(1, 'El cliente es requerido'),
  montoPrincipal: z
    .number({ message: 'Ingresa un monto válido' })
    .min(10, 'El monto mínimo es S/. 10.00'),
  tasaInteres: z
    .number({ message: 'Ingresa una tasa válida' })
    .min(0, 'La tasa no puede ser negativa')
    .max(100, 'La tasa no puede exceder el 100%'),
  numCuotas: z
    .number({ message: 'Ingresa el número de cuotas' })
    .min(1, 'Mínimo 1 cuota')
    .max(120, 'Máximo 120 cuotas'),
  frecuenciaPago: z.enum(['diario', 'semanal', 'quincenal', 'mensual'] as const),
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  excluirDomingos: z.boolean(),
  cobradorId: z.string().optional().nullable().or(z.literal('')),
  notas: z.string().optional(),
})


type PrestamoFormValues = z.infer<typeof prestamoSchema>

export const PrestamosPage = () => {
  const { useGetPrestamos, useGetPrestamoDetalle, useCrearPrestamo } = usePrestamos()
  const { useGetClientes } = useClientes()
  const { useGetCobradores } = useCobradores()

  // Queries
  const { data: prestamos = [], isLoading: loadingPrestamos } = useGetPrestamos()
  const { data: clientes = [], isLoading: loadingClientes } = useGetClientes()
  const { data: cobradores = [] } = useGetCobradores()
  const crearMutation = useCrearPrestamo()

  // Estados locales
  const [panelOpen, setPanelOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPrestamoId, setSelectedPrestamoId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'pendiente' | 'en_mora' | 'pagado'>('todos')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Query de detalle del préstamo
  const { data: detallePrestamo, isLoading: loadingDetalle } = useGetPrestamoDetalle(selectedPrestamoId)

  // Mapa local de cobradores
  const cobradoresMap = useMemo(() => {
    return new Map(cobradores.map((c) => [c.id, c.nombre || '']))
  }, [cobradores])

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrestamoFormValues>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: {
      frecuenciaPago: 'mensual',
      fechaInicio: new Date().toISOString().split('T')[0],
      excluirDomingos: false,
      cobradorId: '',
    },
  })


  // Watchers para simulación en tiempo real
  const watchMonto = watch('montoPrincipal')
  const watchTasa = watch('tasaInteres')
  const watchCuotas = watch('numCuotas')
  const watchFrecuencia = watch('frecuenciaPago')
  const watchFecha = watch('fechaInicio')
  const watchExcluirDomingos = watch('excluirDomingos')

  // Generar simulación en tiempo real basada en inputs
  const simulacion = useMemo(() => {
    if (!watchMonto || isNaN(watchMonto) || !watchTasa || isNaN(watchTasa) || !watchCuotas || isNaN(watchCuotas)) {
      return null
    }

    try {
      const fechaBase = watchFecha ? new Date(watchFecha + 'T12:00:00') : new Date()
      return simularPrestamo(
        watchMonto,
        watchTasa,
        watchCuotas,
        watchFrecuencia as FrecuenciaPago,
        fechaBase,
        watchExcluirDomingos
      )
    } catch (e) {
      return null
    }
  }, [watchMonto, watchTasa, watchCuotas, watchFrecuencia, watchFecha, watchExcluirDomingos])

  // Solo mostrar clientes activos para otorgar préstamos
  const clientesActivos = useMemo(() => {
    return clientes.filter((c) => c.estado === 'activo')
  }, [clientes])

  // Abrir panel creación
  const handleOpenCreate = () => {
    setFormError(null)
    setFormSuccess(null)
    reset({
      clienteId: '',
      montoPrincipal: undefined,
      tasaInteres: undefined,
      numCuotas: undefined,
      frecuenciaPago: 'mensual',
      fechaInicio: new Date().toISOString().split('T')[0],
      excluirDomingos: false,
      cobradorId: '',
      notas: '',
    })
    setPanelOpen(true)
  }

  // Guardar Préstamo
  const onSubmit = async (values: PrestamoFormValues) => {
    setFormError(null)
    setFormSuccess(null)

    if (!simulacion) {
      setFormError('Completa los datos del simulador antes de guardar.')
      return
    }

    try {
      await crearMutation.mutateAsync({
        clienteId: values.clienteId,
        montoPrincipal: values.montoPrincipal,
        tasaInteres: values.tasaInteres,
        numCuotas: values.numCuotas,
        frecuenciaPago: values.frecuenciaPago,
        fechaInicio: values.fechaInicio,
        montoTotal: simulacion.totalPagar,
        notas: values.notas || null,
        cuotas: simulacion.tabla,
        excluirDomingos: values.excluirDomingos,
        cobradorId: values.cobradorId || null,
      })

      setFormSuccess('Préstamo y cronograma de cuotas creados exitosamente.')

      setTimeout(() => {
        setPanelOpen(false)
        reset()
      }, 1000)
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el préstamo')
    }
  }

  // Ver detalles
  const handleOpenDetails = (prestamoId: string) => {
    setSelectedPrestamoId(prestamoId)
    setModalOpen(true)
  }

  // Filtrar préstamos localmente
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter((p) => {
      if (filtroEstado === 'todos') return true
      return p.estado === filtroEstado
    })
  }, [prestamos, filtroEstado])

  // KPIs del Dashboard de préstamos usando Decimal.js
  const stats = useMemo(() => {
    const totalPrincipal = prestamos.reduce((acc, p) => money.sum(acc, p.monto_principal), new Decimal(0))
    const totalPendiente = prestamos.reduce((acc, p) => money.sum(acc, p.saldo_pendiente), new Decimal(0))
    const totalMontoTotal = prestamos.reduce((acc, p) => money.sum(acc, p.monto_total), new Decimal(0))
    const totalRecuperado = money.sub(totalMontoTotal, totalPendiente)

    return {
      totalPrincipal: totalPrincipal.toNumber(),
      totalPendiente: totalPendiente.toNumber(),
      totalRecuperado: totalRecuperado.toNumber(),
      cantidad: prestamos.length,
    }
  }, [prestamos])

  // Definición de columnas de la tabla de préstamos
  const columns: ColumnDef<PrestamoConCliente>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      render: (row) => {
        const cobradorName = row.cobrador_id ? cobradoresMap.get(row.cobrador_id) : null
        return (
          <div>
            <span className="font-semibold text-white">
              {row.clientes?.nombres} {row.clientes?.apellidos}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500 font-mono">Doc: {row.clientes?.documento_identidad}</span>
              {cobradorName && (
                <span className="text-[9px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded font-medium border border-indigo-500/15">
                  Cobrador: {cobradorName}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'monto_principal',
      header: 'Capital',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-financial font-semibold text-white">
          {formatCurrency(Number(row.monto_principal))}
        </span>
      ),
    },
    {
      key: 'monto_total',
      header: 'Total a Pagar',
      align: 'right',
      render: (row) => (
        <span className="font-financial text-slate-400">
          {formatCurrency(Number(row.monto_total))}
        </span>
      ),
    },
    {
      key: 'saldo_pendiente',
      header: 'Saldo Pendiente',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={`font-financial font-semibold ${Number(row.saldo_pendiente) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {formatCurrency(Number(row.saldo_pendiente))}
        </span>
      ),
    },
    {
      key: 'plazo',
      header: 'Plazo',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-slate-300 capitalize text-xs">
            {row.num_cuotas} {row.num_cuotas === 1 ? 'cuota' : 'cuotas'} · {nombreFrecuencia(row.frecuencia_pago)}
          </span>
          {row.excluir_domingos && (
            <span className="text-[9px] text-slate-500 italic mt-0.5">Sin domingos</span>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (row) => <EstadoPrestamoBadge estado={row.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => handleOpenDetails(row.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          title="Ver cronograma"
        >
          <Eye size={13} />
        </button>
      ),
    },
  ]

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6 md:gap-8"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Operaciones de Crédito
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            Gestión de Préstamos
          </h2>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          Otorgar Préstamo
        </Button>
      </div>

      {/* ── KPIS RESUMEN FINANCIERO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Capital Colocado
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5">
              {formatCurrency(stats.totalPrincipal)}
            </h3>
          </div>
        </Card>

        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Capital Recuperado
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5">
              {formatCurrency(stats.totalRecuperado)}
            </h3>
          </div>
        </Card>

        <Card variant="glass" padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Pendiente
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white font-financial mt-0.5">
              {formatCurrency(stats.totalPendiente)}
            </h3>
          </div>
        </Card>
      </div>

      {/* ── LISTADO CON DATAGRID ── */}
      <Card padding="lg" variant="glass">
        <CardHeader
          title="Cartera de Créditos"
          subtitle={`Total: ${prestamosFiltrados.length} préstamos activos / cerrados`}
          icon={<Coins size={16} className="text-indigo-400" />}
        />

        <DataGrid
          data={prestamosFiltrados}
          columns={columns}
          isLoading={loadingPrestamos}
          searchKey={(row) => `${row.clientes?.nombres} ${row.clientes?.apellidos} ${row.clientes?.documento_identidad}`}
          searchPlaceholder="Buscar por cliente o identificación..."
          onRowClick={(row) => handleOpenDetails(row.id)}
          filtersSlot={
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase shrink-0">
                Estado:
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="h-9 px-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="activo">Activo</option>
                <option value="en_mora">En Mora</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
          }
        />
      </Card>

      {/* ── PANEL SLIDE-OVER CALCULADORA DE PRÉSTAMOS ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.aside
              variants={{
                hidden: { x: '100%' },
                visible: { x: 0, transition: springSmooth },
                exit: { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 bottom-0 right-0 z-50 w-full max-w-2xl bg-slate-900 border-l border-slate-800/80 shadow-2xl flex flex-col"
            >
              {/* Header Panel */}
              <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">
                    Otorgar Préstamo & Simular Cuotas
                  </h3>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Inputs del Préstamo (2/5 cols) */}
                  <div className="md:col-span-2 flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Info size={13} className="text-indigo-400" /> Parámetros del Crédito
                    </h4>

                    {formError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <FileCheck size={14} />
                        {formSuccess}
                      </div>
                    )}

                    {/* Cliente */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Cliente Deudor *
                      </label>
                      {loadingClientes ? (
                        <div className="h-10 skeleton rounded-xl" />
                      ) : clientesActivos.length === 0 ? (
                        <span className="text-xs text-rose-400 font-semibold bg-rose-500/5 p-2 border border-rose-500/15 rounded-xl">
                          ⚠️ No hay clientes activos registrados.
                        </span>
                      ) : (
                        <select
                          {...register('clienteId')}
                          className="h-10 px-3 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Seleccionar cliente --</option>
                          {clientesActivos.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-950">
                              {c.nombres} {c.apellidos} ({c.documento_identidad})
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.clienteId && (
                        <span className="text-xs text-rose-400">{errors.clienteId.message}</span>
                      )}
                    </div>

                    {/* Capital */}
                    <Input
                      type="number"
                      step="any"
                      label="Monto Principal (S/.) *"
                      prefixText="S/."
                      placeholder="Monto"
                      error={errors.montoPrincipal?.message}
                      {...register('montoPrincipal', { valueAsNumber: true })}
                    />

                    {/* Tasa Interés */}
                    <Input
                      type="number"
                      step="any"
                      label="Tasa de Interés Mensual (%) *"
                      suffixText="%"
                      placeholder="Ej. 10"
                      error={errors.tasaInteres?.message}
                      {...register('tasaInteres', { valueAsNumber: true })}
                    />

                    {/* Número de Cuotas */}
                    <Input
                      type="number"
                      label="Número de Cuotas (Plazo) *"
                      placeholder="Ej. 12"
                      error={errors.numCuotas?.message}
                      {...register('numCuotas', { valueAsNumber: true })}
                    />

                    {/* Frecuencia */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">
                        Frecuencia de Pago *
                      </label>
                      <select
                        {...register('frecuenciaPago')}
                        className="h-10 px-3 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="diario" className="bg-slate-950">Diario</option>
                        <option value="semanal" className="bg-slate-950">Semanal</option>
                        <option value="quincenal" className="bg-slate-950">Quincenal</option>
                        <option value="mensual" className="bg-slate-950">Mensual</option>
                      </select>
                    </div>

                    {/* Excluir Domingos (Condicional para frecuencia diaria) */}
                    {watchFrecuencia === 'diario' && (
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/40">
                        <input
                          type="checkbox"
                          id="excluirDomingos"
                          {...register('excluirDomingos')}
                          className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label
                          htmlFor="excluirDomingos"
                          className="text-xs font-semibold text-slate-300 cursor-pointer select-none"
                        >
                          Excluir domingos del calendario
                        </label>
                      </div>
                    )}

                    {/* Asignación de Cobrador */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <UserCheck size={13} className="text-indigo-400" />
                        Cobrador Responsable
                      </label>
                      <select
                        {...register('cobradorId')}
                        className="h-10 px-3 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- No asignar cobrador --</option>
                        {cobradores.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-950">
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fecha de Inicio */}
                    <Input
                      type="date"
                      label="Fecha de Desembolso / Inicio *"
                      error={errors.fechaInicio?.message}
                      {...register('fechaInicio')}
                    />

                    {/* Notas */}
                    <Input
                      as="textarea"
                      label="Notas Adicionales"
                      placeholder="Observaciones de cobranza..."
                      rows={2}
                      {...register('notas')}
                    />
                  </div>

                  {/* Simulador / Preview (3/5 cols) */}
                  <div className="md:col-span-3 flex flex-col gap-4 bg-slate-950/20 border border-slate-800/40 p-4 rounded-2xl overflow-hidden h-[calc(100vh-120px)] md:h-auto">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={13} /> Tabla de Amortización (Sistema Francés)
                    </h4>

                    {simulacion ? (
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        {/* Resumen de Simulación */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-900/80 mb-3">
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Cuota Fija</span>
                            <span className="text-xs font-financial font-bold text-white block">
                              {formatCurrency(simulacion.tabla[0]?.cuotaTotal || 0)}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Total Interés</span>
                            <span className="text-xs font-financial font-bold text-indigo-400 block">
                              {formatCurrency(simulacion.totalIntereses)}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Total a Pagar</span>
                            <span className="text-xs font-financial font-bold text-emerald-400 block">
                              {formatCurrency(simulacion.totalPagar)}
                            </span>
                          </div>
                        </div>

                        {/* Listado de Cuotas */}
                        <div className="flex-1 overflow-y-auto border border-slate-900 bg-slate-950/40 rounded-xl">
                          <motion.div
                            variants={listContainerVariants}
                            initial="initial"
                            animate="animate"
                            className="flex flex-col divide-y divide-slate-900"
                          >
                            {simulacion.tabla.map((c) => (
                              <motion.div
                                key={c.numCuota}
                                variants={listItemVariants}
                                className="flex items-center justify-between p-2.5 hover:bg-slate-900/40 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                                    {c.numCuota}
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500">Vence</span>
                                    <span className="text-xs text-slate-300 font-medium">
                                      {c.fechaVencimiento.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col text-right hidden sm:flex">
                                    <span className="text-[8px] text-slate-500 uppercase">Cap / Int</span>
                                    <span className="text-[10px] text-slate-400 font-financial">
                                      {formatAmount(c.capital)} / {formatAmount(c.interes)}
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[8px] text-slate-500 uppercase block">Total</span>
                                    <span className="text-xs font-financial font-bold text-white">
                                      {formatCurrency(c.cuotaTotal)}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-xl">
                        <Coins size={32} className="opacity-20 mb-2" />
                        <p className="text-xs text-center">
                          Ingresa el monto, tasa y número de cuotas para calcular la tabla de amortización.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Botones */}
                <div className="p-6 border-t border-slate-800/60 bg-slate-950/20 flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setPanelOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isLoading={isSubmitting}
                    disabled={clientesActivos.length === 0}
                  >
                    Guardar Préstamo
                  </Button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL DETALLE DE PRÉSTAMO Y CRONOGRAMA ── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                variants={{
                  initial: { scale: 0.95, opacity: 0 },
                  animate: { scale: 1, opacity: 1, transition: springSmooth },
                  exit: { scale: 0.97, opacity: 0 },
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
              >
                {/* Header Modal */}
                <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                      <Coins size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Cronograma y Estado de Cuotas</h3>
                      <p className="text-[10px] text-slate-500">Detalles e historial del crédito deudor</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Contenido Modal */}
                {loadingDetalle ? (
                  <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-indigo-950/20 animate-spin" />
                    <span className="text-xs">Cargando cronograma del préstamo...</span>
                  </div>
                ) : !detallePrestamo ? (
                  <div className="p-8 text-center text-slate-500">
                    Ocurrió un error al cargar los datos del préstamo.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Resumen Préstamo / Cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Deudor</span>
                        <span className="text-sm font-semibold text-white block mt-0.5">
                          {detallePrestamo.clientes?.nombres} {detallePrestamo.clientes?.apellidos}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">DNI/RUC: {detallePrestamo.clientes?.documento_identidad}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Parámetros</span>
                        <span className="text-xs font-semibold text-slate-200 block mt-0.5">
                          {formatCurrency(Number(detallePrestamo.monto_principal))} a {formatPercent(Number(detallePrestamo.tasa_interes), 1)}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {detallePrestamo.num_cuotas} cuotas · {detallePrestamo.frecuencia_pago}
                          {detallePrestamo.excluir_domingos && ' (Sin domingos)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Cobrador Asignado</span>
                        <span className="text-xs font-semibold text-indigo-300 block mt-0.5">
                          {detallePrestamo.cobrador_id ? (cobradoresMap.get(detallePrestamo.cobrador_id) || 'Asignado') : 'No asignado'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Deuda Total / Saldo</span>
                        <span className="text-xs font-semibold text-white block mt-0.5 font-financial">
                          {formatCurrency(Number(detallePrestamo.monto_total))}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Inicio: {detallePrestamo.fecha_inicio}</span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Saldo Restante</span>
                        <span className={`text-sm font-bold block mt-0.5 font-financial ${Number(detallePrestamo.saldo_pendiente) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {formatCurrency(Number(detallePrestamo.saldo_pendiente))}
                        </span>
                        <div className="mt-1">
                          <EstadoPrestamoBadge estado={detallePrestamo.estado} />
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Cuotas del Préstamo */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Calendario de Pagos de este Préstamo
                      </h4>

                      <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950/20">
                        <div className="overflow-x-auto">
                          <table className="financial-table">
                            <thead>
                              <tr>
                                <th>N°</th>
                                <th>Vencimiento</th>
                                <th className="text-right">Monto Cuota</th>
                                <th className="text-right flex-row gap-1 items-center justify-end"><span className="text-red-400">Mora Acum.</span></th>
                                <th className="text-right"><span className="text-red-400">Penalidad</span></th>
                                <th className="text-right">Abonado</th>
                                <th className="text-right">Restante</th>
                                <th className="text-center">Días Retr.</th>
                                <th className="text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detallePrestamo.cuotas.map((c) => {
                                const pen = Number(c.penalidad_fija_acumulada || 0)
                                const mor = Number(c.interes_moratorio_acumulado || 0)
                                const basePendiente = Number(c.monto_cuota) - Number(c.monto_pagado)
                                const totalPendiente = basePendiente + pen + mor

                                return (
                                  <tr key={c.id}>
                                    <td className="font-semibold">{c.num_cuota}</td>
                                    <td>{c.fecha_vencimiento}</td>
                                    <td className="text-right font-financial text-white">{formatCurrency(Number(c.monto_cuota))}</td>
                                    <td className="text-right font-financial text-rose-400">{mor > 0 ? formatCurrency(mor) : '—'}</td>
                                    <td className="text-right font-financial text-rose-400">{pen > 0 ? formatCurrency(pen) : '—'}</td>
                                    <td className="text-right font-financial text-emerald-400">{Number(c.monto_pagado) > 0 ? formatCurrency(Number(c.monto_pagado)) : '—'}</td>
                                    <td className="text-right font-financial text-slate-300 font-bold">{formatCurrency(totalPendiente)}</td>
                                    <td className="text-center font-financial text-xs">{c.dias_retraso > 0 ? (
                                      <span className="text-rose-400 font-semibold">{c.dias_retraso} d</span>
                                    ) : '0'}</td>
                                    <td className="text-center">
                                      <EstadoCuotaBadge estado={c.estado} />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Modal */}
                <div className="h-16 px-6 border-t border-slate-800/60 bg-slate-950/20 flex items-center justify-end shrink-0">
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>
                    Cerrar Ventana
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
