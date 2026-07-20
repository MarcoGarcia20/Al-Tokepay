import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ParametroSistema } from '../types/database'

export const useParametros = () => {
  const queryClient = useQueryClient()

  const useGetParametros = () => {
    return useQuery({
      queryKey: ['parametros_sistema'],
      queryFn: async (): Promise<ParametroSistema[]> => {
        const data = await api.get<ParametroSistema[]>('/parametros')
        return data || []
      },
    })
  }

  const useUpdateParametro = () => {
    return useMutation({
      mutationFn: async ({ clave, valor }: { clave: string; valor: string }) => {
        return api.put<ParametroSistema>(`/parametros/${clave}`, { valor })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['parametros_sistema'] })
      },
    })
  }

  const useEjecutarCronMora = () => {
    return useMutation({
      mutationFn: async (): Promise<any> => {
        return api.post('/mora/procesar')
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['prestamos'] })
        queryClient.invalidateQueries({ queryKey: ['v_cuotas_detalle'] })
      },
    })
  }

  return {
    useGetParametros,
    useUpdateParametro,
    useEjecutarCronMora,
  }
}
