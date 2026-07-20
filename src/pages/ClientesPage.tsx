// ============================================================
// ClientesPage — Módulo de Gestión de Clientes (CRUD)
// Panel lateral deslizable, validación Zod y conexión Supabase
// ============================================================

import { useState, useMemo } from 'react'
import { motion as motionFramer, AnimatePresence as AnimatePresenceFramer } from 'framer-motion'
import {
  UserPlus,
  Edit2,
  Lock,
  Unlock,
  X,
  User,
  Phone,
  FileCheck,
  UserCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useClientes } from '../hooks/useClientes'
import { useCobradores } from '../hooks/useCobradores'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { DataGrid, ColumnDef } from '../components/DataGrid'
import { Input } from '../components/Input'
import { EstadoClienteBadge } from '../components/Badge'
import { springSmooth } from '../animations/variants'
import type { Cliente } from '../types/database'

// ── Esquema de Validación Zod ───────────────────────────────
const clienteSchema = z.object({
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  documento_identidad: z
    .string()
    .min(8, 'El documento debe tener al menos 8 dígitos')
    .max(12, 'El documento no debe exceder los 12 dígitos')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo se permiten letras y números'),
  celular: z.string().min(9, 'El celular debe tener al menos 9 dígitos'),
  correo: z
    .string()
    .email('Correo electrónico inválido')
    .optional()
    .or(z.literal('')),
  direccion: z.string().optional(),
  notas: z.string().optional(),
  cobrador_id: z.string().optional().nullable().or(z.literal('')),
})

type ClienteFormValues = z.infer<typeof clienteSchema>

export const ClientesPage = () => {
  const {
    useGetClientes,
    useCreateCliente,
    useUpdateCliente,
    useToggleEstadoCliente,
  } = useClientes()

  const { useGetCobradores } = useCobradores()

  // Queries y Mutations
  const { data: clientes = [], isLoading } = useGetClientes()
  const { data: cobradores = [] } = useGetCobradores()
  
  const createClienteMutation = useCreateCliente()
  const updateClienteMutation = useUpdateCliente()
  const toggleEstadoMutation = useToggleEstadoCliente()

  // Estados locales para UI
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'bloqueado'>('todos')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Mapa local para obtener los nombres de los cobradores
  const cobradoresMap = useMemo(() => {
    return new Map(cobradores.map((c) => [c.id, c.nombre || '']))
  }, [cobradores])

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
  })

  // Abrir panel para Crear
  const handleOpenCreate = () => {
    setSelectedCliente(null)
    setFormError(null)
    setFormSuccess(null)
    reset({
      nombres: '',
      apellidos: '',
      documento_identidad: '',
      celular: '',
      correo: '',
      direccion: '',
      notas: '',
      cobrador_id: '',
    })
    setPanelOpen(true)
  }

  // Abrir panel para Editar
  const handleOpenEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setFormError(null)
    setFormSuccess(null)
    reset({
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      documento_identidad: cliente.documento_identidad,
      celular: cliente.celular,
      correo: cliente.correo ?? '',
      direccion: cliente.direccion ?? '',
      notas: cliente.notas ?? '',
      cobrador_id: cliente.cobrador_id ?? '',
    })
    setPanelOpen(true)
  }

  // Manejar Submit de Formulario (Crear o Editar)
  const onSubmit = async (values: ClienteFormValues) => {
    setFormError(null)
    setFormSuccess(null)

    // Formatear campos vacíos o undefined a null
    const cleanedValues = {
      nombres: values.nombres,
      apellidos: values.apellidos,
      documento_identidad: values.documento_identidad,
      celular: values.celular,
      correo: values.correo || null,
      direccion: values.direccion || null,
      notas: values.notas || null,
      cobrador_id: values.cobrador_id || null,
    }

    try {
      if (selectedCliente) {
        // Editar
        await updateClienteMutation.mutateAsync({
          id: selectedCliente.id,
          cambios: cleanedValues,
        })
        setFormSuccess('Cliente actualizado exitosamente.')
      } else {
        // Crear
        await createClienteMutation.mutateAsync(cleanedValues)
        setFormSuccess('Cliente registrado exitosamente.')
      }

      // Cerrar panel tras breve delay para feedback visual
      setTimeout(() => {
        setPanelOpen(false)
        reset()
      }, 1000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Ocurrió un error inesperado al guardar.')
      }
    }
  }

  // Cambiar estado del cliente (Bloquear/Activar)
  const handleToggleEstado = async (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation() // Evitar click en la fila
    try {
      await toggleEstadoMutation.mutateAsync({
        id: cliente.id,
        estadoActual: cliente.estado,
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al cambiar estado: ${err.message}`)
      }
    }
  }

  // Filtrar clientes por estado localmente
  const clientesFiltrados = clientes.filter((c) => {
    if (filtroEstado === 'todos') return true
    return c.estado === filtroEstado
  })

  // Definición de columnas de la tabla
  const columns: ColumnDef<Cliente>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-white">
            {row.nombres} {row.apellidos}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">ID: {row.documento_identidad}</span>
        </div>
      ),
    },
    {
      key: 'celular',
      header: 'Celular',
      sortable: true,
      render: (row) => (
        <a
          href={`tel:${row.celular}`}
          className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 font-financial transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone size={12} className="text-slate-500" />
          {row.celular}
        </a>
      ),
    },
    {
      key: 'cobrador',
      header: 'Cobrador Asignado',
      render: (row) => {
        const name = row.cobrador_id ? cobradoresMap.get(row.cobrador_id) : null
        return name ? (
          <span className="text-[11px] text-indigo-300 font-medium bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full">
            {name}
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 italic">No asignado</span>
        )
      },
    },
    {
      key: 'saldo_favor',
      header: 'Saldo Favor',
      align: 'right',
      render: (row) => (
        <span className={`font-financial ${Number(row.saldo_favor) > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
          S/. {Number(row.saldo_favor).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (row) => <EstadoClienteBadge estado={row.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Editar cliente"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => handleToggleEstado(row, e)}
            title={row.estado === 'activo' ? 'Bloquear cliente' : 'Activar cliente'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              row.estado === 'activo'
                ? 'border-rose-950 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                : 'border-emerald-950 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            } transition-colors`}
          >
            {row.estado === 'activo' ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <motionFramer.div
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Cartera de Clientes
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white mt-1">
            Gestión de Deudores
          </h2>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus size={16} />}
          onClick={handleOpenCreate}
        >
          Nuevo Cliente
        </Button>
      </div>

      {/* ── LISTADO CON DATAGRID ── */}
      <Card padding="lg" variant="glass">
        <CardHeader
          title="Listado de Clientes"
          subtitle={`Total: ${clientesFiltrados.length} clientes`}
          icon={<User size={16} className="text-indigo-400" />}
        />

        <DataGrid
          data={clientesFiltrados}
          columns={columns}
          isLoading={isLoading}
          searchKey={(row) => `${row.nombres} ${row.apellidos} ${row.documento_identidad}`}
          searchPlaceholder="Buscar por nombre o documento..."
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
                <option value="activo">Activo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>
          }
        />
      </Card>

      {/* ── PANEL SLIDE-OVER DERECHO (CREAR / EDITAR) ── */}
      <AnimatePresenceFramer>
        {panelOpen && (
          <>
            {/* Backdrop */}
            <motionFramer.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Panel de Formulario */}
            <motionFramer.aside
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
              {/* Header Panel */}
              <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">
                    {selectedCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
              <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div className="p-6 flex flex-col gap-5">
                  {/* Mensajes de Estado */}
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                      <FileCheck size={14} />
                      {formSuccess}
                    </div>
                  )}

                  {/* Campos de Nombre y Apellido */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nombres *"
                      placeholder="Ej. Juan"
                      error={errors.nombres?.message}
                      {...register('nombres')}
                    />
                    <Input
                      label="Apellidos *"
                      placeholder="Ej. Pérez"
                      error={errors.apellidos?.message}
                      {...register('apellidos')}
                    />
                  </div>

                  {/* Identificación y Teléfono */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="DNI o RUC *"
                      placeholder="Identificación"
                      error={errors.documento_identidad?.message}
                      {...register('documento_identidad')}
                    />
                    <Input
                      label="N° Celular *"
                      placeholder="Ej. 987654321"
                      error={errors.celular?.message}
                      {...register('celular')}
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <Input
                    label="Correo Electrónico"
                    placeholder="correo@ejemplo.com"
                    error={errors.correo?.message}
                    {...register('correo')}
                  />

                  {/* Asignación de Cobrador */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <UserCheck size={13} className="text-indigo-400" />
                      Cobrador Asignado
                    </label>
                    <select
                      {...register('cobrador_id')}
                      className="h-10 px-3 w-full bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- No asignar cobrador (Sin cobrador) --</option>
                      {cobradores.map((cobrador) => (
                        <option key={cobrador.id} value={cobrador.id} className="bg-slate-950">
                          {cobrador.nombre}
                        </option>
                      ))}
                    </select>
                    {errors.cobrador_id && (
                      <span className="text-xs text-rose-400">{errors.cobrador_id.message}</span>
                    )}
                  </div>

                  {/* Dirección */}
                  <Input
                    as="textarea"
                    label="Dirección de Domicilio"
                    placeholder="Ej. Av. Larco 123, Miraflores, Lima"
                    rows={2}
                    error={errors.direccion?.message}
                    {...register('direccion')}
                  />

                  {/* Notas Adicionales */}
                  <Input
                    as="textarea"
                    label="Notas / Referencias"
                    placeholder="Ej. Casa de rejas blancas, llamar antes de visitar..."
                    rows={2}
                    error={errors.notas?.message}
                    {...register('notas')}
                  />
                </div>

                {/* Footer Botones */}
                <div className="p-6 border-t border-slate-800/60 bg-slate-950/20 flex items-center gap-3">
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
                  >
                    {selectedCliente ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </motionFramer.aside>
          </>
        )}
      </AnimatePresenceFramer>
    </motionFramer.div>
  )
}
