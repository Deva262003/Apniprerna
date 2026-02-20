import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { LogOut, ShieldCheck, KeyRound, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useParentAuthStore from '../store/parentAuthStore'

function ParentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const parent = useParentAuthStore((s) => s.parent)
  const logout = useParentAuthStore((s) => s.logout)

  useEffect(() => {
    if (!parent) return
    if (parent.mustChangePassword && location.pathname !== '/parent/change-password') {
      navigate('/parent/change-password', { replace: true })
    }
  }, [location.pathname, navigate, parent])

  const handleLogout = () => {
    logout()
    navigate('/parent/login')
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="sticky top-0 z-40 border-b border-indigo-100/50 bg-paper-warm/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink tracking-tight">Parent Portal</p>
              <p className="text-xs font-medium text-indigo-400">Apni Pathshala</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink to="/parent" end>
              {({ isActive }) => (
                <Button variant={isActive ? 'default' : 'outline'} className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              )}
            </NavLink>
            <NavLink to="/parent/change-password">
              {({ isActive }) => (
                <Button variant={isActive ? 'default' : 'outline'} className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </Button>
              )}
            </NavLink>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
        <div className="px-6 pb-4">
          <p className="text-sm text-slate-500">Signed in as {parent?.name || 'Parent'}</p>
        </div>
      </header>

      <main className="p-6 lg:p-8">
        <div className="animate-fadeIn">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default ParentLayout
