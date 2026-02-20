import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      login: (token, admin) => {
        localStorage.setItem('adminToken', token)
        if (admin?.role) localStorage.setItem('role', admin.role)
        set({ token, admin, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('role')
        set({ token: null, admin: null, isAuthenticated: false })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, admin: state.admin, isAuthenticated: state.isAuthenticated })
    }
  )
)

export default useAuthStore
