import { useEffect } from 'react'
import { api, setToken, clearToken } from '../lib/api'
import { useAuthStore } from '../stores'

export const useAuth = () => {
  const { token, user, perfil, isLoading, setToken: storeSetToken, setUser, setPerfil, setLoading, reset } =
    useAuthStore()

  useEffect(() => {
    const savedToken = localStorage.getItem('prestamos-token')
    if (savedToken) {
      storeSetToken(savedToken)
      api.get<{ id: string; name: string; email: string; rol: string }>('/me')
        .then((data) => {
          setUser({ id: data.id, email: data.email, name: data.name })
          setPerfil({ id: data.id, rol: data.rol as 'administrador' | 'cobrador', nombre: data.name, avatar_url: null, created_at: '', updated_at: '' })
          setLoading(false)
        })
        .catch(() => {
          clearToken()
          reset()
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<{ token: string; user: { id: string; name: string; email: string; rol: string } }>('/login', { email, password })
      setToken(data.token)
      storeSetToken(data.token)
      setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
      setPerfil({ id: data.user.id, rol: data.user.rol as 'administrador' | 'cobrador', nombre: data.user.name, avatar_url: null, created_at: '', updated_at: '' })
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const data = await api.post<{ token: string; user: { id: string; name: string; email: string; rol: string } }>('/register', { name, email, password })
      setToken(data.token)
      storeSetToken(data.token)
      setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
      setPerfil({ id: data.user.id, rol: data.user.rol as 'administrador' | 'cobrador', nombre: data.user.name, avatar_url: null, created_at: '', updated_at: '' })
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }

  const signOut = async () => {
    try { await api.post('/logout') } catch { /* ignore */ }
    clearToken()
    reset()
  }

  const isAdmin = perfil?.rol === 'administrador'
  const isCobrador = perfil?.rol === 'cobrador'

  return {
    user,
    session: null,
    perfil,
    isLoading,
    isAdmin,
    isCobrador,
    isAuthenticated: !!token,
    signIn,
    signUp,
    signOut,
  }
}
