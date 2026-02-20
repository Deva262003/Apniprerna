import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Users,
  Activity,
  Shield,
  Globe,
  Clock,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  TrendingUp,
  Timer,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
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
import { getCenter, getCenterStats, getActivities, getStudents } from '../services/api'
import useActivityStore from '../store/activityStore'
import { ActivityRow } from './Activity'
import { getDateRangeForPreset } from '../lib/dateRanges'

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

function StatCard({ icon: Icon, label, value, subtext, color }) {
  const colors = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25',
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25'
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${colors[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="font-display text-3xl font-bold text-ink truncate" title={value}>
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
    </Card>
  )

}

function TopDomainsTable({ domains }) {
  if (!domains || domains.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        No domain activity yet today
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Time Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain, i) => (
            <TableRow key={domain._id}>
              <TableCell className="text-sm text-slate-400">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-ink">{domain._id}</span>
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



function CenterDetail() {
  const { id } = useParams()
  const [activityPage, setActivityPage] = useState(1)
  const [statsRangePreset, setStatsRangePreset] = useState('7d')
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' })

  const statsRange = statsRangePreset === 'custom'
    ? customRange
    : getDateRangeForPreset(statsRangePreset)

  const { data: centerData, isLoading: centerLoading } = useQuery({
    queryKey: ['center', id],
    queryFn: () => getCenter(id).then((res) => res.data)
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['centerStats', id, statsRange.startDate, statsRange.endDate],
    queryFn: () => getCenterStats(id, statsRange).then((res) => res.data),
    refetchInterval: 30000
  })

  const [activityFilters, setActivityFilters] = useState({
    student: '',
    domain: '',
    wasBlocked: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    setActivityPage(1)
  }, [activityFilters])

  const { data: activityData } = useQuery({
    queryKey: ['centerActivity', id, activityPage, activityFilters],
    queryFn: () =>
      getActivities({
        center: id,
        page: activityPage,
        limit: 10,
        ...(activityFilters.student && { student: activityFilters.student }),
        ...(activityFilters.domain && { domain: activityFilters.domain }),
        ...(activityFilters.wasBlocked && { wasBlocked: activityFilters.wasBlocked }),
        ...(activityFilters.startDate && { startDate: activityFilters.startDate }),
        ...(activityFilters.endDate && { endDate: activityFilters.endDate })
      }).then((res) => res.data),
    refetchInterval: 30000
  })


  const { data: studentsData } = useQuery({
    queryKey: ['centerStudents', id],
    queryFn: () => getStudents({ center: id }).then((res) => res.data)
  })

  const center = centerData?.data
  const stats = statsData?.data || {}
  const activities = activityData?.data || []
  const activityPagination = activityData?.pagination || { page: 1, totalPages: 1 }
  const students = studentsData?.data || []
  const onlineStudents = useActivityStore((state) => state.onlineStudents)

  if (centerLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading center details...</p>
        </div>
      </div>
    )
  }

  if (!center) {
    return (
      <Card className="p-12 text-center">
        <h3 className="font-display text-lg font-semibold text-ink">Center not found</h3>
        <Button variant="link" asChild className="mt-2 text-indigo-600">
          <Link to="/centers">Back to Centers</Link>
        </Button>
      </Card>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to="/centers"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Centers
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
              {center.code?.slice(0, 2) || center.name?.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">{center.name}</h1>
              <p className="text-slate-500 font-mono">{center.code}</p>
              {center.pmsPodId && (
                <p className="text-xs text-slate-400 font-mono">POD ID: {center.pmsPodId}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {(center.city || center.state) && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{[center.city, center.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {center.contactName && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{center.contactName}</span>
            </div>
          )}
          {center.contactPhone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{center.contactPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Center analytics range</h2>
            <p className="text-sm text-slate-500">Default range is last 7 days</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statsRangePreset} onValueChange={setStatsRangePreset}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="1y">Last 1 year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {statsRangePreset === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customRange.startDate}
                  onChange={(event) => setCustomRange((prev) => ({ ...prev, startDate: event.target.value }))}
                />
                <Input
                  type="date"
                  value={customRange.endDate}
                  onChange={(event) => setCustomRange((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents || 0}
          subtext={`${stats.activeStudents || 0} active`}
          color="indigo"
        />
        <StatCard
          icon={Activity}
          label="Activity Today"
          value={stats.todayActivity || 0}
          subtext="page visits"
          color="emerald"
        />
        <StatCard
          icon={Shield}
          label="Blocked Today"
          value={stats.todayBlocked || 0}
          subtext="Blocked visits today"
          color="rose"
        />
        <StatCard
          icon={TrendingUp}
          label="Top Domain"
          value={stats.topDomains?.[0]?._id || '—'}
          subtext={stats.topDomains?.[0] ? `${stats.topDomains[0].count} visits` : ''}
          color="amber"
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Domains */}
        <Card>
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-display text-lg font-semibold text-ink">Top Domains (Selected Range)</h2>
            <p className="text-sm text-slate-500">Most visited websites</p>
          </div>
          <TopDomainsTable domains={stats.topDomains} />
        </Card>

        {/* Students */}
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Students</h2>
              <p className="text-sm text-slate-500">{students.length} enrolled</p>
            </div>
            <Button variant="link" asChild className="text-indigo-600">
              <Link to={`/students?center=${id}`}>View All</Link>
            </Button>
          </div>
          <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
            {students.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No students enrolled
              </div>
            ) : (
              students.slice(0, 10).map((student) => (
                <Link
                  key={student._id}
                  to={`/students/${student._id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                    {student.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{student.name}</p>
                    <p className="font-mono text-xs text-slate-400">{student.studentId}</p>
                  </div>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      onlineStudents[student._id]?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </Link>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* Recent Activity */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Recent Activity</h2>
            <p className="text-sm text-slate-500">Latest browsing activity from this center</p>
          </div>
          <Button variant="link" asChild className="text-indigo-600">
            <Link to={`/activity?center=${id}`}>View All</Link>
          </Button>
        </div>
        <div className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              value={activityFilters.student || undefined}
              onValueChange={(value) =>
                setActivityFilters((prev) => ({ ...prev, student: value === 'all' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student._id} value={student._id}>
                    {student.name || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={activityFilters.domain}
              onChange={(e) =>
                setActivityFilters((prev) => ({ ...prev, domain: e.target.value }))
              }
              placeholder="Domain"
            />
            <Select
              value={activityFilters.wasBlocked || undefined}
              onValueChange={(value) =>
                setActivityFilters((prev) => ({ ...prev, wasBlocked: value === 'all' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                <SelectItem value="true">Blocked</SelectItem>
                <SelectItem value="false">Allowed</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={activityFilters.startDate}
              onChange={(e) =>
                setActivityFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
            <Input
              type="date"
              value={activityFilters.endDate}
              onChange={(e) =>
                setActivityFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            No recent activity
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[420px]">Full URL</TableHead>
                  <TableHead className="w-[180px]">Category</TableHead>
                  <TableHead className="w-[200px]">Student</TableHead>
                  <TableHead className="w-[120px]">Duration</TableHead>
                  <TableHead className="w-[220px]">Time</TableHead>
                  <TableHead className="w-[80px] text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity, i) => (
                  <ActivityRow
                    key={activity._id || `${activity.url}-${activity.visitTime || i}`}
                    activity={activity}
                    index={i}
                    showCenter={false}
                    showSite={false}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {activityPagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Page {activityPage} of {activityPagination.totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    className={activityPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                {Array.from({ length: activityPagination.totalPages }).slice(0, 5).map((_, index) => {
                  const pageNumber = index + 1
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        isActive={pageNumber === activityPage}
                        onClick={() => setActivityPage(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setActivityPage((p) => Math.min(activityPagination.totalPages, p + 1))}
                    className={activityPage === activityPagination.totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  )
}

export default CenterDetail
