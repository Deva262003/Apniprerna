import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Globe,
  XCircle,
  Search,
  Filter,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity as ActivityIcon,
  Building2,
  User,
  Calendar,
  Timer,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { getActivities, getCenters, getStudents, getActivityStats, getActivityCategories } from '../services/api'
import useActivity from '../hooks/useActivity'


function formatDuration(seconds) {
  if (!seconds || seconds < 1) return '< 1s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function ActivityRow({ activity, index, showCenter = true, showSite = true }) {

  const [showFullUrl, setShowFullUrl] = useState(false)
  const isBlocked = activity.wasBlocked

  return (
    <TableRow
      className="opacity-0 animate-fadeIn"
      style={{ animationDelay: `${index * 20}ms`, animationFillMode: 'forwards' }}
    >
      {showSite && (
        <TableCell className="w-[260px]">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isBlocked ? 'bg-rose-50' : 'bg-slate-100'
            }`}>
              {isBlocked ? (
                <XCircle className="h-5 w-5 text-rose-500" />
              ) : (
                <Globe className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="max-w-[200px] truncate text-sm font-medium text-ink">
                  {activity.domain || 'Unknown'}
                </p>
                {isBlocked && (
                  <Badge variant="destructive" className="px-1.5 py-0.5 text-[10px]">
                    {activity.blockCategory || 'Blocked'}
                  </Badge>
                )}
              </div>
              <p className="max-w-[300px] truncate text-xs text-slate-400">
                {activity.title || 'No title'}
              </p>
            </div>
          </div>
        </TableCell>
      )}
      <TableCell className={showSite ? "w-[320px]" : "w-[420px]"}>
        <div className={showSite ? "max-w-[320px]" : "max-w-[420px]"}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowFullUrl(!showFullUrl)}
            className="h-auto w-full justify-start whitespace-normal px-0 text-left text-sm text-slate-600 hover:bg-transparent"
          >
            <span className={showFullUrl ? 'block break-all' : 'block truncate'}>
              {activity.url}
            </span>
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setShowFullUrl(!showFullUrl)}
            className="h-auto px-0 text-xs text-indigo-500"
          >
            {showFullUrl ? 'Show less' : 'Show full URL'}
          </Button>
        </div>
      </TableCell>
      <TableCell className="w-[180px]">
        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
          {activity.category || 'Uncategorized'}
        </Badge>
      </TableCell>
      <TableCell className="w-[200px]">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100">
            <User className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-600">{activity.student?.name || '—'}</p>
            <p className="text-xs text-slate-400">{activity.student?.studentId}</p>
          </div>
        </div>
      </TableCell>
      {showCenter && (
        <TableCell className="w-[160px]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <span className="text-sm text-slate-600">{activity.center?.name || '—'}</span>
          </div>
        </TableCell>
      )}
      <TableCell className="w-[120px]">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Timer className="h-4 w-4" />
          <span>{formatDuration(activity.durationSeconds)}</span>
        </div>
      </TableCell>
      <TableCell className="w-[220px]">
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          <span>{new Date(activity.visitTime).toLocaleString()}</span>
        </div>
      </TableCell>
      <TableCell className="w-[80px] text-right">
        <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-indigo-600">
          <a href={activity.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </TableCell>
    </TableRow>

  )
}

function StatsCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  }

  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  )

}

function Activity() {
  const { activities: liveActivities } = useActivity({ enabled: true })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    center: '',
    student: '',
    domain: '',
    wasBlocked: '',
    startDate: '',
    endDate: '',
    category: ''
  })
  const limit = 25

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

  const { data: statsData } = useQuery({
    queryKey: ['activityStats'],
    queryFn: () => getActivityStats().then((res) => res.data),
    refetchInterval: 30000
  })

  const queryParams = {
    page,
    limit,
    ...(filters.center && { center: filters.center }),
    ...(filters.student && { student: filters.student }),
    ...(filters.domain && { domain: filters.domain }),
    ...(filters.wasBlocked && { wasBlocked: filters.wasBlocked }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.category && { category: filters.category })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['activities', queryParams],
    queryFn: () => getActivities(queryParams).then((res) => res.data),
    keepPreviousData: true
  })

  const centers = centersData?.data || []
  const students = studentsData?.data || []
  const categories = categoriesData?.data || []
  const activities = data?.data || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const stats = statsData?.data || {}


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      center: '',
      student: '',
      domain: '',
      wasBlocked: '',
      startDate: '',
    endDate: '',
    category: ''
  })
  setPage(1)
}

  const hasFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-ink">Live Activity Stream</h3>
            <p className="text-sm text-slate-500">Real-time browsing updates</p>
          </div>
        </div>
        {liveActivities.length === 0 ? (
          <p className="text-sm text-slate-500">Waiting for activity events...</p>
        ) : (
          <div className="space-y-3">
            {liveActivities.slice(0, 6).map((activity, index) => (
              <div key={`${activity._id || activity.url}-${index}`} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink">{activity.domain || activity.url}</p>
                  <p className="text-xs text-slate-400">{activity.studentName || activity.student?.name}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(activity.visitTime || activity.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Activity Log</h1>
          <p className="text-slate-500 mt-1">
            View all browsing activity with full URL details
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={ActivityIcon}
          label="Total Today"
          value={stats.totalToday || 0}
          color="indigo"
        />
        <StatsCard
          icon={Shield}
          label="Blocked Today"
          value={stats.blockedToday || 0}
          color="rose"
        />
        <StatsCard
          icon={Globe}
          label="Top Domain"
          value={stats.topDomains?.[0]?._id || '—'}
          color="emerald"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Top Blocked Category"
          value={stats.topBlockedCategories?.[0]?._id || '—'}
          color="amber"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <span className="font-medium text-slate-700">Filters</span>
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="ml-auto h-auto p-0 text-sm text-indigo-600"
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Center</label>
            <Select
              value={filters.center || undefined}
              onValueChange={(value) => handleFilterChange('center', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Centers" />
              </SelectTrigger>
              <SelectContent>
                {centers.map((center) => (
                  <SelectItem key={center._id} value={center._id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Student</label>
            <Select
              value={filters.student || undefined}
              onValueChange={(value) => handleFilterChange('student', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student._id} value={student._id}>
                    {student.name} ({student.studentId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Domain</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.domain}
                onChange={(e) => handleFilterChange('domain', e.target.value)}
                className="h-9 pl-10 text-sm"
                placeholder="Search domain..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <Select
              value={filters.category || undefined}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <Select
              value={filters.wasBlocked || undefined}
              onValueChange={(value) => handleFilterChange('wasBlocked', value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Allowed</SelectItem>
                <SelectItem value="true">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-9 pl-10 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-9 pl-10 text-sm"
              />
            </div>
          </div>
        </div>
      </Card>



      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading activity...</p>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <ActivityIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No activity found</h3>
          <p className="mt-2 text-slate-500">
            {hasFilters
              ? 'Try adjusting your filters to see more results.'
              : 'Activity will appear here once students start browsing.'}
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[420px]">Full URL</TableHead>
                    <TableHead className="w-[180px]">Category</TableHead>
                    <TableHead className="w-[200px]">Student</TableHead>
                    <TableHead className="w-[160px]">Center</TableHead>
                    <TableHead className="w-[120px]">Duration</TableHead>
                    <TableHead className="w-[220px]">Time</TableHead>
                    <TableHead className="w-[80px] text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity, i) => (
                    <ActivityRow key={activity._id} activity={activity} index={i} showSite={false} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }).slice(0, 5).map((_, index) => {
                  const pageNumber = index + 1
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        isActive={pageNumber === page}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className={page === pagination.totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      )}

    </div>
  )
}

export default Activity
