import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Shield,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  Settings,
  ShieldCheck,
  Ban,
  Activity,
  Radio,
  ClipboardList,
  ShieldAlert,
  Tags,
  UserRound
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const SidebarContent = ({ admin, location, handleLogout }) => (
  <>
    {/* Logo */}
    <div className="border-b border-indigo-50 p-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold text-ink tracking-tight">
            Apni Pathshala
          </h1>
          <p className="text-xs font-medium text-indigo-400">Student Safety System</p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto p-4">
      <div className="space-y-1">
        {navItems
          .filter((item) => {
            if (!item.roles) return true
            return item.roles.includes(admin?.role)
          })
          .map(({ path, icon: Icon, label, description }) => {
          const isActive = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              className={`
                nav-item group flex items-center gap-3 rounded-xl px-4 py-3.5
                transition-all duration-200 relative
                ${isActive
                  ? 'active bg-gradient-to-r from-indigo-50 to-purple-50/50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <div className={`
                flex h-10 w-10 items-center justify-center rounded-lg transition-all
                ${isActive
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                }
              `}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-indigo-700' : ''}`}>
                  {label}
                </p>
                <p className={`truncate text-xs ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {description}
                </p>
              </div>
              <ChevronRight className={`
                h-4 w-4 transition-all
                ${isActive
                  ? 'opacity-100 text-indigo-400'
                  : 'opacity-0 group-hover:opacity-100 text-slate-400'
                }
              `} />
            </NavLink>
          )
        })}
        {(admin?.role === 'admin' || admin?.role === 'super_admin') && (
          <NavLink
            to="/admins"
            className={`nav-item group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 ${location.pathname === '/admins' ? 'active bg-gradient-to-r from-indigo-50 to-purple-50/50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${location.pathname === '/admins' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Admin Management</p>
              <p className="text-xs text-slate-400">Admins & roles</p>
            </div>
          </NavLink>
        )}
      </div>
    </nav>

    {/* User section */}
    <div className="border-t border-indigo-50 p-4">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <Avatar className="h-9 w-9 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <AvatarFallback className="bg-transparent font-semibold text-white">
            {admin?.name?.charAt(0) || 'A'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {admin?.name || 'Admin'}
          </p>
          <p className="truncate text-xs text-slate-400">
            {admin?.email || 'admin@apnipathshala.org'}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={handleLogout}
        className="group w-full justify-start gap-3 text-slate-500 hover:text-rose-600"
      >
        <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        <span className="text-sm font-medium">Sign out</span>
      </Button>
    </div>
  </>
)

import useAuthStore from '../store/authStore'
import useWebSocket from '../hooks/useWebSocket'
import useNotifications from '../hooks/useNotifications'
import useActivityStore from '../store/activityStore'
import useNotificationStore from '../store/notificationStore'
import { getCenters } from '../services/api'
import { universalSearch } from '../services/searchService'


const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview & stats' },
  { path: '/live', icon: Radio, label: 'Live', description: 'Active sessions' },
  { path: '/centers', icon: Building2, label: 'Centers', description: 'Manage locations' },
  { path: '/students', icon: Users, label: 'Students', description: 'Student accounts' },
  { path: '/parents', icon: UserRound, label: 'Parents', description: 'Parent accounts', roles: ['pod_admin', 'admin', 'super_admin'] },
  { path: '/activity', icon: Activity, label: 'Activity', description: 'Browsing history' },
  { path: '/activity-categories', icon: Tags, label: 'Categories', description: 'Activity categorization' },
  { path: '/blocking', icon: Ban, label: 'Blocking', description: 'Website blocklist' },
  { path: '/policies', icon: ShieldAlert, label: 'Policies', description: 'Policy management' },
  { path: '/commands', icon: ClipboardList, label: 'Commands', description: 'Admin controls' },
  { path: '/settings', icon: Settings, label: 'Settings', description: 'Account & security' }
]

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const admin = useAuthStore((state) => state.admin)

  const searchWrapRef = useRef(null)
  const searchInputRef = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { joinCenter, joinAlerts, on } = useWebSocket()
  useNotifications({ enabled: true })
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const setStudentOnline = useActivityStore((state) => state.setStudentOnline)
  const setStudentOffline = useActivityStore((state) => state.setStudentOffline)
  const setHeartbeat = useActivityStore((state) => state.setHeartbeat)
  const setOnlineStudents = useActivityStore((state) => state.setOnlineStudents)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data),
    enabled: admin?.role === 'super_admin'
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentPage = navItems.find((item) => {
    if (location.pathname === item.path) return true
    if (item.path !== '/' && location.pathname.startsWith(item.path + '/')) return true
    return false
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!searchWrapRef.current) return
      if (!searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable)

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select?.()
        })
      }

      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  const searchQuery = useQuery({
    queryKey: ['universal-search', debouncedSearch],
    queryFn: () => universalSearch(debouncedSearch, 6).then((r) => r.data),
    enabled: debouncedSearch.length >= 2,
    staleTime: 30 * 1000
  })

  const searchResults = searchQuery.data?.data?.results

  const flattenedResults = useMemo(() => {
    const out = []
    const students = searchResults?.students || []
    const centers = searchResults?.centers || []
    const parents = searchResults?.parents || []
    const admins = searchResults?.admins || []

    students.forEach((s) => out.push({ type: 'student', item: s }))
    centers.forEach((c) => out.push({ type: 'center', item: c }))
    parents.forEach((p) => out.push({ type: 'parent', item: p }))
    admins.forEach((a) => out.push({ type: 'admin', item: a }))
    return out
  }, [searchResults])

  const handleSelectSearchResult = (result) => {
    if (!result) return

    const { type, item } = result
    if (type === 'student') navigate(`/students/${item._id}`)
    if (type === 'center') navigate(`/centers/${item._id}`)
    if (type === 'parent') navigate(`/parents/${item._id}`)
    if (type === 'admin') navigate(`/admins/${item._id}`)

    setSearchOpen(false)
    setSearchTerm('')
  }

  useEffect(() => {
    if (!admin) return

    joinAlerts()
    if (admin.center) {
      const centerId = admin.center?._id || admin.center
      if (centerId) {
        joinCenter(centerId)
      }
    }

    if (admin.role === 'super_admin') {
      const centers = centersData?.data || []
      centers.forEach((center) => {
        if (center?._id) {
          joinCenter(center._id)
        }
      })
    }
  }, [admin, centersData, joinAlerts, joinCenter])

  useEffect(() => {
    const unsubscribeOnline = on('student_online', (payload) => {
      setStudentOnline({
        studentId: payload.studentId,
        studentName: payload.studentName,
        lastSeen: payload.timestamp
      })
    })
    const unsubscribeOffline = on('student_offline', (payload) => {
      if (payload?.studentId) {
        setStudentOffline(payload.studentId)
      }
    })
    const unsubscribeHeartbeat = on('student_heartbeat', (payload) => {
      if (payload?.studentId) {
        setHeartbeat(payload)
      }
    })
    const unsubscribeOnlineList = on('online_students', (payload = []) => {
      setOnlineStudents(payload)
    })

    return () => {
      unsubscribeOnline()
      unsubscribeOffline()
      unsubscribeHeartbeat()
      unsubscribeOnlineList()
    }
  }, [on, setHeartbeat, setOnlineStudents, setStudentOffline, setStudentOnline])

  return (
    <div className="min-h-screen bg-paper-warm">
      <Sheet>
        {/* Sidebar */}
        <SheetContent
          side="left"
          className="flex w-72 flex-col border-r border-indigo-100/50 bg-paper-elevated p-0"
        >
          <SidebarContent admin={admin} location={location} handleLogout={handleLogout} />
        </SheetContent>

        {/* Main content */}
        <div className="lg:pl-72">
          <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-indigo-100/50 bg-paper-elevated lg:flex lg:flex-col">
            <SidebarContent admin={admin} location={location} handleLogout={handleLogout} />
          </aside>
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-indigo-100/50 bg-paper-warm/80 backdrop-blur-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {currentPage?.label || 'Dashboard'}
                  </h2>
                  <p className="hidden text-sm text-slate-500 sm:block">
                    {currentPage?.description || 'Overview & stats'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div ref={searchWrapRef} className="relative hidden w-72 items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 shadow-sm md:flex">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && flattenedResults.length > 0) {
                        e.preventDefault()
                        handleSelectSearchResult(flattenedResults[0])
                      }
                    }}
                    placeholder="Universal search..."
                    className="h-8 border-0 p-0 text-sm text-slate-600 shadow-none focus-visible:ring-0"
                  />
                  <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400 lg:block">
                    /
                  </kbd>

                  {searchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                        <p className="text-xs font-medium text-slate-500">Universal search</p>
                        <p className="text-[11px] text-slate-400">Enter to open first result</p>
                      </div>

                      <div className="max-h-96 overflow-y-auto p-2">
                        {debouncedSearch.length < 2 ? (
                          <div className="px-3 py-3 text-sm text-slate-500">Type at least 2 characters to search.</div>
                        ) : searchQuery.isLoading ? (
                          <div className="px-3 py-3 text-sm text-slate-500">Searching...</div>
                        ) : flattenedResults.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-slate-500">No results found.</div>
                        ) : (
                          <div className="space-y-1">
                            {flattenedResults.slice(0, 12).map((r) => {
                              const item = r.item
                              const isInactive = item?.isActive === false

                              const title =
                                r.type === 'student'
                                  ? item.name
                                  : r.type === 'center'
                                    ? item.name
                                    : r.type === 'parent'
                                      ? item.name
                                      : item.name

                              const subtitle =
                                r.type === 'student'
                                  ? `Student • ${item.studentId || '—'} • ${item.center?.name || '—'}`
                                  : r.type === 'center'
                                    ? `Center • ${item.code || '—'} • ${item.city || item.state || '—'}`
                                    : r.type === 'parent'
                                      ? `Parent • ${item.parentId || '—'} • ${item.center?.name || '—'}`
                                      : `Admin • ${item.email || '—'} • ${item.role || '—'}`

                              return (
                                <button
                                  key={`${r.type}-${item._id}`}
                                  type="button"
                                  className="group flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectSearchResult(r)}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink group-hover:text-slate-900">{title || '—'}</p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
                                  </div>
                                  {isInactive && (
                                    <span className="mt-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                      Inactive
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-10 w-10 border-slate-200/60 bg-white"
                >
                  <Bell className="h-5 w-5 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Settings */}
                <Button
                  variant="outline"
                  size="icon"
                  className="group h-10 w-10 border-slate-200/60 bg-white"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-5 w-5 text-slate-500 transition-transform duration-300 group-hover:rotate-45" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6 lg:p-8">
            <div className="animate-fadeIn">
              <Outlet />
            </div>
          </main>
      </div>
      </Sheet>
    </div>
  )

}

export default Layout
