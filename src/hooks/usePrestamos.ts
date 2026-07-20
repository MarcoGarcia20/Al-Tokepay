import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from './useAuth'
import type { Prestamo, PrestamoConCliente, Cuota, Cliente } from '../types/database'

interface DetallePrestamo extends Prestamo {
  clientes: Cliente
  cuotas: Cuota[]
}

function mapPrestamo(p: any): any {
  if (!p) return p
  const { cliente, ...rest } = p
  return { ...rest, clientes: cliente || null }
}

function mapCuotaPendiente(c: any): any {
  if (!c) return c
  const p = c.prestamo
  const cl = p?.cliente
  return {
    ...c,
    prestamo: undefined,
    cliente_nombres: cl?.nombres,
    cliente_apellidos: cl?.apellidos,
    cliente_celular: cl?.celular,
    cliente_documento_identidad: cl?.documento_identidad,
    documento_identidad: cl?.documento_identidad,
    prestamo_monto: p?.monto_principal,
    frecuencia_pago: p?.frecuencia_pago,
    excluir_domingos: p?.excluir_domingos,
    user_id: p?.user_id,
    cliente_id: cl?.id,
  }
}

export const usePrestamos = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const useGetPrestamos = () => {
    return useQuery({
      queryKey: ['prestamos', user?.id],
      queryFn: async (): Promise<PrestamoConCliente[]> => {
        if (!user?.id) return []
        const res = await api.get<any>('/prestamos?per_page=500')
        const list = Array.isArray(res) ? res : res?.data || []
        return list.map(mapPrestamo)
      },
      enabled: !!user?.id,
    })
  }

  const useGetPrestamoDetalle = (id: string | null) => {
    return useQuery({
      queryKey: ['prestamos', 'detalle', id],
      queryFn: async (): Promise<DetallePrestamo | null> => {
        if (!id) return null
        const data = await api.get<any>(`/prestamos/${id}`)
        if (!data) return null
        const mapped = mapPrestamo(data)
        if (mapped.cuotas) {
          mapped.cuotas.sort((a: any, b: any) => a.num_cuota - b.num_cuota)
        }
        return mapped
      },
      enabled: !!id,
    })
  }

  const useCrearPrestamo = () => {
    return useMutation({
      mutationFn: async ({
        clienteId,
        montoPrincipal,
        tasaInteres,
        numCuotas,
        frecuenciaPago,
        fechaInicio,
        montoTotal,
        notas,
        excluirDomingos = false,
        cobradorId = null,
      }: {
        clienteId: string
        montoPrincipal: number
        tasaInteres: number
        numCuotas: number
        frecuenciaPago: string
        fechaInicio: string
        montoTotal: number
        notas: string | null
        cuotas: any[]
        excluirDomingos?: boolean
        cobradorId?: string | null
      }): Promise<string> => {
        if (!user?.id) throw new Error('Usuario no autenticado')

        const prestamo = await api.post<any>('/prestamos', {
          cliente_id: clienteId,
          monto_principal: montoPrincipal,
          tasa_interes: tasaInteres,
          num_cuotas: numCuotas,
          frecuencia_pago: frecuenciaPago,
          fecha_inicio: fechaInicio,
          monto_total: montoTotal,
          notas: notas,
          excluir_domingos: excluirDomingos,
          cobrador_id: cobradorId || null,
        })

        return prestamo.id as string
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['prestamos'] })
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
      },
    })
  }

  const useRegistrarPago = () => {
    return useMutation({
      mutationFn: async ({
        prestamoId,
        monto,
        metodoPago,
        notas,
        comprobanteUrl,
      }: {
        prestamoId: string
        monto: number
        metodoPago: string
        notas: string | null
        comprobanteUrl: string | null
      }): Promise<any> => {
        if (!user?.id) throw new Error('Usuario no autenticado')

        return api.post('/pagos', {
          prestamo_id: prestamoId,
          monto,
          metodo_pago: metodoPago,
          notas,
          comprobante_url: comprobanteUrl,
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['prestamos'] })
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
        queryClient.invalidateQueries({ queryKey: ['v_cuotas_detalle'] })
      },
    })
  }

  const useGetCuotasPendientes = () => {
    return useQuery({
      queryKey: ['v_cuotas_detalle', 'pendientes', user?.id],
      queryFn: async (): Promise<any[]> => {
        if (!user?.id) return []
        const raw = await api.get<any[]>('/cuotas/pendientes')
        return (raw || []).map(mapCuotaPendiente)
      },
      enabled: !!user?.id,
    })
  }

  return {
    useGetPrestamos,
    useGetPrestamoDetalle,
    useCrearPrestamo,
    useRegistrarPago,
    useGetCuotasPendientes,
  }
}
