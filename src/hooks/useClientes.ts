import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from './useAuth'
import type { Cliente, ClienteInsert, ClienteUpdate } from '../types/database'

export const useClientes = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const useGetClientes = () => {
    return useQuery({
      queryKey: ['clientes', user?.id],
      queryFn: async (): Promise<Cliente[]> => {
        if (!user?.id) return []
        const data = await api.get<Cliente[]>('/clientes')
        return data || []
      },
      enabled: !!user?.id,
    })
  }

  const useGetCliente = (id: string | null) => {
    return useQuery({
      queryKey: ['clientes', 'detalle', id],
      queryFn: async (): Promise<Cliente | null> => {
        if (!id) return null
        return api.get<Cliente>(`/clientes/${id}`)
      },
      enabled: !!id,
    })
  }

  const useCreateCliente = () => {
    return useMutation({
      mutationFn: async (nuevoCliente: Omit<ClienteInsert, 'user_id' | 'estado'>): Promise<Cliente> => {
        if (!user?.id) throw new Error('Usuario no autenticado')
        const dataToInsert = { ...nuevoCliente, estado: 'activo' }
        return api.post<Cliente>('/clientes', dataToInsert)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
      },
    })
  }

  const useUpdateCliente = () => {
    return useMutation({
      mutationFn: async ({ id, cambios }: { id: string; cambios: ClienteUpdate }): Promise<Cliente> => {
        return api.put<Cliente>(`/clientes/${id}`, cambios)
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
        queryClient.invalidateQueries({ queryKey: ['clientes', 'detalle', data.id] })
      },
    })
  }

  const useToggleEstadoCliente = () => {
    return useMutation({
      mutationFn: async ({ id, estadoActual }: { id: string; estadoActual: Cliente['estado'] }): Promise<Cliente> => {
        const nuevoEstado: Cliente['estado'] = estadoActual === 'activo' ? 'bloqueado' : 'activo'
        return api.put<Cliente>(`/clientes/${id}`, { estado: nuevoEstado })
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
        queryClient.invalidateQueries({ queryKey: ['clientes', 'detalle', data.id] })
      },
    })
  }

  return {
    useGetClientes,
    useGetCliente,
    useCreateCliente,
    useUpdateCliente,
    useToggleEstadoCliente,
  }
}
