import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  Globe,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  Timer,
  Search,
  Filter,
  MapPin
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  getCenters,
  getStudents,
  getRecentActivity,
  getActivityStats,
  getActivityCategories,
  getActivityStateSummary
} from '../services/api'
import useActivity from '../hooks/useActivity'
import { filterCentersByStateAndSearch, filterStudentsByScopeAndSearch } from '../lib/dashboardFilters'
import { filterQuickActionsByRole } from '../lib/quickActions'
import useAuthStore from '../store/authStore'

// Animated counter component
function AnimatedNumber({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setDisplayValue(Math.floor(progress * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span className="counter">{displayValue}</span>
}

function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '< 1s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

function StatCard({ icon: Icon, label, value, displayValue, trend, trendUp, color, delay }) {
  const colorStyles = {
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/25',
      light: 'bg-indigo-50',
      text: 'text-indigo-600'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/25',
      light: 'bg-emerald-50',
      text: 'text-emerald-600'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/25',
      light: 'bg-amber-50',
      text: 'text-amber-600'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/25',
      light: 'bg-purple-50',
      text: 'text-purple-600'
    },
    rose: {
      bg: 'bg-gradient-to-br from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/25',
      light: 'bg-rose-50',
      text: 'text-rose-600'
    }
  }

  const style = colorStyles[color] || colorStyles.indigo
  const display = displayValue !== undefined ? displayValue : <AnimatedNumber value={value} />

  return (
    <Card
      className="p-6 opacity-0 animate-fadeIn"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${style.bg} ${style.shadow}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <TrendingUp className={`h-3 w-3 ${!trendUp && 'rotate-180'}`} />
            {trend}
          </div>
        )}
      </div>
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="font-display text-3xl font-bold text-ink">
        {display}
      </p>
    </Card>
  )
}

function QuickAction({ icon: Icon, label, description, to, color }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200"
    >
      <div className={`w-11 h-11 rounded-lg ${color} flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-ink group-hover:text-indigo-700 transition-colors">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}

const quickActionItems = [
  {
    id: 'add-center',
    icon: Building2,
    label: 'Add New Center',
    description: 'Create a learning center',
    to: '/centers',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    roles: ['super_admin']
  },
  {
    id: 'add-student',
    icon: Users,
    label: 'Add New Student',
    description: 'Register a student account',
    to: '/students',
    color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    roles: ['super_admin', 'admin', 'pod_admin']
  },
  {
    id: 'manage-blocklist',
    icon: Shield,
    label: 'Manage Blocklist',
    description: 'Configure blocked websites',
    to: '/blocking',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    roles: ['super_admin', 'admin', 'pod_admin']
  }
]

function ActivityItem({ activity, index }) {
  const isBlocked = activity.wasBlocked

  return (
    <div
      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 opacity-0 animate-slideIn"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isBlocked ? 'bg-rose-50' : 'bg-slate-100'
      }`}>
        {isBlocked ? (
          <XCircle className="w-5 h-5 text-rose-500" />
        ) : (
          <Globe className="w-5 h-5 text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-ink truncate">
          {activity.domain || 'Unknown domain'}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {activity.title || activity.url}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400">
          {new Date(activity.visitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {isBlocked && (
          <Badge variant="destructive" className="px-2 py-0.5 text-[10px]">Blocked</Badge>
        )}
      </div>
    </div>
  )
}

function TopWebsitesTable({ domains }) {
  if (!domains || domains.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        No website activity for this range
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Active Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain, i) => (
            <TableRow key={domain._id || i}>
              <TableCell className="text-sm text-slate-400">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-ink">{domain._id || 'Unknown'}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-600">{domain.count} visits</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Timer className="h-4 w-4" />
                  <span>{formatDuration(domain.totalDuration)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TopPodsTable({ pods }) {
  if (!pods || pods.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        No pod activity for this range
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Pod</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Active Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pods.map((pod, i) => (
            <TableRow key={pod._id || i}>
              <TableCell className="text-sm text-slate-400">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-sm font-medium text-ink">{pod.name || 'Unknown pod'}</span>
                    {pod.code && <p className="text-xs text-slate-400">{pod.code}</p>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-600">{pod.totalVisits} visits</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Timer className="h-4 w-4" />
                  <span>{formatDuration(pod.totalDuration)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StateMap({ states, selectedState, onSelect, svgMarkup }) {
  const containerRef = useRef(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const svgElement = containerRef.current.querySelector('svg')
    if (!svgElement) return

    svgElement.setAttribute('width', '100%')
    svgElement.setAttribute('height', '100%')
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    svgElement.querySelectorAll('path[name]').forEach((path) => {
      const stateName = path.getAttribute('name')?.trim() || ''
      const isActive = states.some((state) => state.state === stateName)
      const isSelected = selectedState === stateName

      path.style.cursor = 'pointer'
      path.style.transition = 'all 0.2s ease'
      path.style.fill = isSelected ? '#f97316' : isActive ? '#fdba74' : '#e2e8f0'
      path.style.stroke = isSelected ? '#c2410c' : '#cbd5f5'
      path.style.strokeWidth = isSelected ? '1.2' : '0.6'

      path.onmouseenter = (event) => {
        setHoveredState(stateName)
        const bounds = containerRef.current.getBoundingClientRect()
        setHoverPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        if (!isSelected) {
          path.style.fill = '#3b82f6'
        }
      }
      path.onmousemove = (event) => {
        const bounds = containerRef.current.getBoundingClientRect()
        setHoverPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
      }
      path.onmouseleave = () => {
        setHoveredState(null)
        path.style.fill = isSelected ? '#f97316' : isActive ? '#fdba74' : '#e2e8f0'
      }
      path.onclick = () => onSelect(stateName)
    })
  }, [states, selectedState, onSelect, svgMarkup])

  const hoveredSummary = states.find((state) => state.state === hoveredState)

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-slate-200/70 bg-white overflow-hidden h-[420px] sm:h-[520px]"
    >
      <div
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      {hoveredSummary && (
        <div
          className="absolute z-10 bg-white/95 border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs text-slate-700 pointer-events-none"
          style={{ left: hoverPosition.x + 12, top: hoverPosition.y + 12 }}
        >
          <p className="font-semibold text-slate-900">{hoveredSummary.state}</p>
          <p>Visits: {hoveredSummary.totalVisits}</p>
          <p>Active: {formatDuration(hoveredSummary.totalDuration)}</p>
          <p>Total: {formatDuration(hoveredSummary.totalTimeSeconds)}</p>
        </div>
      )}
    </div>
  )
}

function Dashboard() {
  const { activities: liveActivities } = useActivity({ enabled: true })
  const adminRole = useAuthStore((state) => state.admin?.role || '')
  const [websiteRankBy, setWebsiteRankBy] = useState('visits')
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' })
  const [filters, setFilters] = useState({
    state: '',
    center: [],
    student: [],
    category: '',
    stateSearch: '',
    centerSearch: '',
    studentSearch: '',
    categorySearch: ''
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then((res) => res.data)
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['activityCategories'],
    queryFn: () => getActivityCategories({ isActive: true }).then((res) => res.data)
  })

  const { data: activityData } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: () => getRecentActivity({ limit: 10 }).then((res) => res.data),
    refetchInterval: 30000
  })

  const statsParams = {
    ...(dateRange.startDate && { startDate: dateRange.startDate }),
    ...(dateRange.endDate && { endDate: dateRange.endDate }),
    ...(filters.state && { state: filters.state }),
    ...(filters.center.length > 0 && { center: filters.center.join(',') }),
    ...(filters.student.length > 0 && { student: filters.student.join(',') }),
    ...(filters.category && { category: filters.category }),
    websiteRankBy
  }

  const { data: statsData } = useQuery({
    queryKey: ['activityStats', statsParams],
    queryFn: () => getActivityStats(statsParams).then((res) => res.data),
    refetchInterval: 30000
  })

  const { data: stateSummaryData } = useQuery({
    queryKey: ['activityStateSummary', statsParams],
    queryFn: () => getActivityStateSummary(statsParams).then((res) => res.data),
    refetchInterval: 30000
  })

  const centers = centersData?.data || []
  const students = studentsData?.data || []
  const categories = categoriesData?.data || []
  const activities = activityData?.data || []
  const activityFeed = (() => {
    const merged = [...liveActivities, ...activities]
    const seen = new Set()
    const unique = []
    for (const activity of merged) {
      const key = activity._id || `${activity.url}-${activity.visitTime}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(activity)
      }
    }
    return unique
  })()
  const stats = statsData?.data || {}
  const [stateSummaries, setStateSummaries] = useState([])

  useEffect(() => {
    if (stateSummaryData?.data) {
      setStateSummaries(stateSummaryData.data)
    }
  }, [stateSummaryData])

  const centerCount = centers.length
  const studentCount = students.length
  const totalActivityToday = stats.totalToday || 0
  const blockedToday = stats.blockedToday || 0
  const totalTimeSeconds = stats.totalTimeSeconds || 0
  const totalActiveSeconds = stats.totalActiveSeconds || 0
  const totalIdleSeconds = stats.totalIdleSeconds || 0
  const totalUsers = stats.totalUsers ?? studentCount
  const totalActiveUsers = stats.totalActiveUsers || 0
  const totalInactiveUsers = stats.totalInactiveUsers || 0
  const topDomains = stats.topDomains || []
  const topPods = stats.topPods || []

  const hasCustomRange = Boolean(dateRange.startDate || dateRange.endDate)
  const hasFilters = Boolean(filters.state || filters.center.length > 0 || filters.student.length > 0 || filters.category)

  const handleDateChange = (key, value) => {
    setDateRange((prev) => ({ ...prev, [key]: value }))
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      if (key === 'state') {
        return {
          ...prev,
          state: value,
          center: [],
          student: []
        }
      }

      return { ...prev, [key]: value }
    })
  }

  const toggleCenterSelection = (centerId) => {
    setFilters((prev) => {
      const exists = prev.center.includes(centerId)
      const nextCenters = exists
        ? prev.center.filter((id) => id !== centerId)
        : [...prev.center, centerId]

      const allowedCenterSet = new Set(nextCenters)
      const nextStudents = prev.student.filter((studentId) => {
        const student = students.find((item) => item._id === studentId)
        if (!student) return false
        const studentCenterId = student.center?._id || student.center
        return nextCenters.length === 0 || allowedCenterSet.has(studentCenterId)
      })

      return {
        ...prev,
        center: nextCenters,
        student: nextStudents
      }
    })
  }

  const toggleStudentSelection = (studentId) => {
    setFilters((prev) => {
      const exists = prev.student.includes(studentId)
      return {
        ...prev,
        student: exists
          ? prev.student.filter((id) => id !== studentId)
          : [...prev.student, studentId]
      }
    })
  }

  const clearRange = () => {
    setDateRange({ startDate: '', endDate: '' })
  }

  const clearFilters = () => {
    setFilters({
      state: '',
      center: [],
      student: [],
      category: '',
      stateSearch: '',
      centerSearch: '',
      studentSearch: '',
      categorySearch: ''
    })
  }

  const handleStateClick = (state) => {
    setFilters((prev) => ({
      ...prev,
      state: prev.state === state ? '' : state,
      center: [],
      student: []
    }))
  }

  const buildCsvRow = (values) =>
    values
      .map((value) => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(',')

  const handleExportCsv = () => {
    const filterSummary = {
      state: filters.state || 'All',
      pod: filters.center.length > 0 ? filters.center.join('|') : 'All',
      student: filters.student.length > 0 ? filters.student.join('|') : 'All',
      category: filters.category || 'All'
    }

    const csvSections = []
    csvSections.push(buildCsvRow(['Dashboard Export']))
    csvSections.push(buildCsvRow(['Generated At', new Date().toISOString()]))
    csvSections.push(buildCsvRow(['Date Range', dateRange.startDate || 'Today', dateRange.endDate || '']))
    csvSections.push(buildCsvRow(['Filters', `State=${filterSummary.state}`, `Pod=${filterSummary.pod}`, `Student=${filterSummary.student}`, `Category=${filterSummary.category}`]))
    csvSections.push('')

    csvSections.push(buildCsvRow(['Metrics']))
    csvSections.push(buildCsvRow(['Total Time Seconds', totalTimeSeconds]))
    csvSections.push(buildCsvRow(['Active Time Seconds', totalActiveSeconds]))
    csvSections.push(buildCsvRow(['Idle Time Seconds', totalIdleSeconds]))
    csvSections.push(buildCsvRow(['Total Users', totalUsers]))
    csvSections.push(buildCsvRow(['Active Users', totalActiveUsers]))
    csvSections.push(buildCsvRow(['Inactive Users', totalInactiveUsers]))
    csvSections.push(buildCsvRow(['Total Visits', totalActivityToday]))
    csvSections.push(buildCsvRow(['Blocked Visits', blockedToday]))
    csvSections.push('')

    csvSections.push(buildCsvRow(['Top Websites']))
    csvSections.push(buildCsvRow(['Domain', 'Visits', 'Active Time Seconds']))
    topDomains.forEach((domain) => {
      csvSections.push(buildCsvRow([domain._id, domain.count, domain.totalDuration]))
    })
    csvSections.push('')

    csvSections.push(buildCsvRow(['Top Pods']))
    csvSections.push(buildCsvRow(['Pod', 'Code', 'State', 'Visits', 'Active Time Seconds', 'Idle Time Seconds']))
    topPods.forEach((pod) => {
      csvSections.push(buildCsvRow([
        pod.name,
        pod.code,
        pod.state,
        pod.totalVisits,
        pod.totalDuration,
        pod.totalIdleSeconds || 0
      ]))
    })
    csvSections.push('')

    csvSections.push(buildCsvRow(['State Summary']))
    csvSections.push(buildCsvRow(['State', 'Visits', 'Active Time Seconds', 'Idle Time Seconds', 'Total Time Seconds']))
    stateSummaries.forEach((summary) => {
      csvSections.push(buildCsvRow([
        summary.state,
        summary.totalVisits,
        summary.totalDuration,
        summary.totalIdleSeconds,
        summary.totalTimeSeconds
      ]))
    })

    const csvContent = csvSections.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    clearFilters()
    clearRange()
  }

  const stateOptions = [...new Set(centers.map((center) => center.state).filter(Boolean))].sort()
  const filteredStates = stateOptions.filter((state) =>
    state.toLowerCase().includes(filters.stateSearch.toLowerCase())
  )
  const filteredCenters = filterCentersByStateAndSearch(centers, filters.state, filters.centerSearch)
  const filteredStudents = filterStudentsByScopeAndSearch(
    students,
    centers,
    filters.state,
    filters.center,
    filters.studentSearch
  )
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(filters.categorySearch.toLowerCase())
  )

  const selectedState = filters.state || (stateSummaries[0]?.state ?? '')
  const selectedStateSummary = stateSummaries.find((summary) => summary.state === selectedState)
  const selectedStatePods = topPods.filter((pod) => pod.state === selectedState)
  const visibleQuickActions = filterQuickActionsByRole(quickActionItems, adminRole)
  const [stateSvgMarkup, setStateSvgMarkup] = useState('')

  useEffect(() => {
    let isMounted = true
    fetch('/in (1).svg')
      .then((res) => res.text())
      .then((svg) => {
        if (isMounted) {
          const cleaned = svg
            .replace(/<\?xml[^>]*>/i, '')
            .replace(/<!DOCTYPE[^>]*>/i, '')
          setStateSvgMarkup(cleaned)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-ink">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening across your learning centers today.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="status-online" />
          <span className="text-sm font-medium text-emerald-700">All systems operational</span>
        </div>
      </div>

      {/* Range selector */}
      <Card className="p-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Metrics range</h2>
              <p className="text-sm text-slate-500">
                {hasCustomRange ? 'Custom range applied' : 'Showing today by default'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="text-sm"
                />
              </div>
              {hasCustomRange && (
                <Button type="button" variant="outline" onClick={clearRange} className="text-sm">
                  Clear range
                </Button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Dashboard filters</span>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportCsv}
                className="ml-auto text-sm"
              >
                Export CSV
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="link"
                  onClick={clearFilters}
                  className="text-sm text-indigo-600"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">State</label>
                <Select
                  value={filters.state || undefined}
                  onValueChange={(value) => handleFilterChange('state', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 z-10 bg-white p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={filters.stateSearch}
                          onChange={(e) => handleFilterChange('stateSearch', e.target.value)}
                          className="h-9 pl-10 text-sm"
                          placeholder="Search states"
                        />
                      </div>
                    </div>
                    <SelectItem value="all">All states</SelectItem>
                    {filteredStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Pod</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between text-sm font-normal">
                      <span className="truncate">
                        {filters.center.length === 0
                          ? 'All pods'
                          : `${filters.center.length} pod${filters.center.length === 1 ? '' : 's'} selected`}
                      </span>
                      <Filter className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[280px] p-2" align="start">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={filters.centerSearch}
                        onChange={(e) => handleFilterChange('centerSearch', e.target.value)}
                        className="h-9 pl-10 text-sm"
                        placeholder="Search pods"
                      />
                    </div>
                    {filteredCenters.map((center) => (
                      <DropdownMenuCheckboxItem
                        key={center._id}
                        checked={filters.center.includes(center._id)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() => toggleCenterSelection(center._id)}
                      >
                        {center.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Student</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between text-sm font-normal">
                      <span className="truncate">
                        {filters.student.length === 0
                          ? 'All students'
                          : `${filters.student.length} student${filters.student.length === 1 ? '' : 's'} selected`}
                      </span>
                      <Filter className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[320px] p-2" align="start">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={filters.studentSearch}
                        onChange={(e) => handleFilterChange('studentSearch', e.target.value)}
                        className="h-9 pl-10 text-sm"
                        placeholder="Search students"
                      />
                    </div>
                    {filteredStudents.map((student) => (
                      <DropdownMenuCheckboxItem
                        key={student._id}
                        checked={filters.student.includes(student._id)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() => toggleStudentSelection(student._id)}
                      >
                        {student.name} ({student.studentId})
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Website Category</label>
                <Select
                  value={filters.category || undefined}
                  onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 z-10 bg-white p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={filters.categorySearch}
                          onChange={(e) => handleFilterChange('categorySearch', e.target.value)}
                          className="h-9 pl-10 text-sm"
                          placeholder="Search categories"
                        />
                      </div>
                    </div>
                    <SelectItem value="all">All categories</SelectItem>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category._id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={Clock}
          label="Total Time Spent"
          value={totalTimeSeconds}
          displayValue={formatDuration(totalTimeSeconds)}
          color="indigo"
          delay={0}
        />
        <StatCard
          icon={Timer}
          label="Total Active Time"
          value={totalActiveSeconds}
          displayValue={formatDuration(totalActiveSeconds)}
          color="emerald"
          delay={100}
        />
        <StatCard
          icon={Activity}
          label="Total Idle Time"
          value={totalIdleSeconds}
          displayValue={formatDuration(totalIdleSeconds)}
          color="amber"
          delay={200}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          color="purple"
          delay={300}
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Users"
          value={totalActiveUsers}
          color="indigo"
          delay={400}
        />
        <StatCard
          icon={XCircle}
          label="Inactive Users"
          value={totalInactiveUsers}
          color="rose"
          delay={500}
        />
      </div>

      {/* State overview */}
      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">India state snapshot</h2>
            <p className="text-sm text-slate-500">Click a state to inspect pods and activity</p>
          </div>
          {selectedState && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              <span>Selected state: <span className="font-semibold text-slate-700">{selectedState}</span></span>
            </div>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase">India map</div>
            {stateSummaries.length === 0 ? (
              <div className="text-sm text-slate-400">No state activity for this range.</div>
            ) : stateSvgMarkup ? (
              <StateMap
                states={stateSummaries}
                selectedState={selectedState}
                onSelect={handleStateClick}
                svgMarkup={stateSvgMarkup}
              />
            ) : (
              <div className="text-sm text-slate-400">Loading map...</div>
            )}
          </div>
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase">State details</div>
            {selectedStateSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Total visits</p>
                    <p className="text-lg font-semibold text-ink">{selectedStateSummary.totalVisits}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Total time</p>
                    <p className="text-lg font-semibold text-ink">{formatDuration(selectedStateSummary.totalTimeSeconds)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Active time</p>
                    <p className="text-lg font-semibold text-ink">{formatDuration(selectedStateSummary.totalDuration)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Idle time</p>
                    <p className="text-lg font-semibold text-ink">{formatDuration(selectedStateSummary.totalIdleSeconds)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pod</TableHead>
                        <TableHead>Visits</TableHead>
                        <TableHead>Active Time</TableHead>
                        <TableHead>Idle Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStatePods.length === 0 ? (
                        <TableRow>
                          <TableCell className="text-sm text-slate-400" colSpan={4}>
                            No pod activity for this state yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedStatePods.map((pod) => (
                          <TableRow key={pod._id}>
                            <TableCell>
                              <div className="text-sm font-medium text-ink">{pod.name}</div>
                              <div className="text-xs text-slate-400">{pod.code}</div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{pod.totalVisits}</TableCell>
                            <TableCell className="text-sm text-slate-600">{formatDuration(pod.totalDuration)}</TableCell>
                            <TableCell className="text-sm text-slate-600">{formatDuration(pod.totalIdleSeconds || 0)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Select a state to view details.</div>
            )}
          </div>
        </div>
      </Card>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-ink">Quick Actions</h2>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {visibleQuickActions.map((action) => (
              <QuickAction
                key={action.id}
                icon={action.icon}
                label={action.label}
                description={action.description}
                to={action.to}
                color={action.color}
              />
            ))}
            {visibleQuickActions.length === 0 && (
              <Card className="border border-slate-200/70 bg-white p-4 text-sm text-slate-500">
                No quick actions are available for your role.
              </Card>
            )}
          </div>

          {/* Getting started card */}
          {(centerCount === 0 || studentCount === 0) && (
            <Card className="mt-6 border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-amber-900">Getting Started</h3>
                  <p className="text-sm leading-relaxed text-amber-700">
                    {centerCount === 0
                      ? 'Create your first learning center to get started.'
                      : 'Add students to your centers so they can log in.'}
                  </p>
                  <Button variant="link" asChild className="mt-3 gap-1 px-0 text-amber-700">
                    <Link to={centerCount === 0 ? '/centers' : '/students'}>
                      {centerCount === 0 ? 'Add Center' : 'Add Student'}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Clock className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">Recent Activity</h2>
                  <p className="text-sm text-slate-500">Latest browsing activity</p>
                </div>
              </div>
              <Button variant="link" asChild className="gap-1 text-indigo-600">
                <Link to="/activity">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {activityFeed.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activityFeed.slice(0, 3).map((activity, i) => (
                  <ActivityItem
                    key={activity._id || `${activity.url}-${activity.visitTime || i}`}
                    activity={activity}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-500">No activity yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  Activity will appear here once students start browsing
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Top websites */}
      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Top Websites Visited</h2>
              <p className="text-sm text-slate-500">
                Top 10 websites by {websiteRankBy === 'time' ? 'active time' : 'visit frequency'}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select value={websiteRankBy} onValueChange={setWebsiteRankBy}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Rank by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visits">Rank by visits</SelectItem>
                <SelectItem value="time">Rank by active time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <TopWebsitesTable domains={topDomains} />
      </Card>

      {/* Top pods */}
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Top 10 Pods</h2>
            <p className="text-sm text-slate-500">Highest active time by pod</p>
          </div>
        </div>
        <TopPodsTable pods={topPods} />
      </Card>

      {/* Center overview */}
      {centers.length > 0 && (
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Learning Centers</h2>
                <p className="text-sm text-slate-500">{centerCount} centers registered</p>
              </div>
            </div>
            <Button variant="outline" asChild className="text-sm">
              <Link to="/centers">Manage Centers</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centers.slice(0, 6).map((center, i) => (
              <Card
                key={center._id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 opacity-0 animate-fadeIn"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
                  {center.code?.slice(0, 2) || center.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{center.name}</p>
                  <p className="text-xs text-slate-400">{center.code}</p>
                </div>
                <div className="status-online" />
              </Card>
            ))}
          </div>

        </Card>
      )}
    </div>
  )
}

export default Dashboard
