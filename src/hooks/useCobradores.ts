import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Perfil } from '../types/database'

export const useCobradores = () => {
  const useGetCobradores = () => {
    return useQuery({
      queryKey: ['perfiles', 'cobradores'],
      queryFn: async (): Promise<Perfil[]> => {
        const raw = await api.get<any[]>('/cobradores')
        return (raw || []).map((c: any) => ({
          id: c.id,
          rol: 'cobrador' as const,
          nombre: c.nombre,
          avatar_url: null,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString(),
        }))
      },
    })
  }

  return {
    useGetCobradores,
  }
}
