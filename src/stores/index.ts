import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Perfil } from '../types/database'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  perfil: Perfil | null
  isLoading: boolean
  setToken: (token: string | null) => void
  setUser: (user: AuthUser | null) => void
  setPerfil: (perfil: Perfil | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      perfil: null,
      isLoading: true,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setPerfil: (perfil) => set({ perfil }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () =>
        set({
          token: null,
          user: null,
          perfil: null,
          isLoading: false,
        }),
    }),
    {
      name: 'prestamos-auth',
      partialize: (state) => ({
        perfil: state.perfil,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

interface UIState {
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'dark',
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'prestamos-ui',
    }
  )
)

interface FiltrosState {
  filtroClientesTexto: string
  filtroPrestamosEstado: string
  filtroCuotasEstado: string
  setFiltroClientesTexto: (texto: string) => void
  setFiltroPrestamosEstado: (estado: string) => void
  setFiltroCuotasEstado: (estado: string) => void
  resetFiltros: () => void
}

export const useFiltrosStore = create<FiltrosState>()((set) => ({
  filtroClientesTexto: '',
  filtroPrestamosEstado: 'todos',
  filtroCuotasEstado: 'todos',
  setFiltroClientesTexto: (filtroClientesTexto) => set({ filtroClientesTexto }),
  setFiltroPrestamosEstado: (filtroPrestamosEstado) => set({ filtroPrestamosEstado }),
  setFiltroCuotasEstado: (filtroCuotasEstado) => set({ filtroCuotasEstado }),
  resetFiltros: () =>
    set({
      filtroClientesTexto: '',
      filtroPrestamosEstado: 'todos',
      filtroCuotasEstado: 'todos',
    }),
}))
