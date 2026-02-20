import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useParentAuthStore = create(
  persist(
    (set) => ({
      token: null,
      parent: null,
      isAuthenticated: false,

      login: (token, parent) => {
        localStorage.setItem('parentToken', token)
        set({ token, parent, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('parentToken')
        set({ token: null, parent: null, isAuthenticated: false })
      }
    }),
    {
      name: 'parent-auth-storage',
      partialize: (state) => ({ token: state.token, parent: state.parent, isAuthenticated: state.isAuthenticated })
    }
  )
)

export default useParentAuthStore
