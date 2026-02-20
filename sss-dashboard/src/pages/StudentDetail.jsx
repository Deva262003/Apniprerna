import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Building2,
  Activity,
  Shield,
  Globe,
  Clock,
  ArrowLeft,
  Phone,
  Mail,
  Hash,
  Timer,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  AlertTriangle,
  Download
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { getStudent, getStudentStats, getStudentActivity } from '../services/api'
import useActivityStore from '../store/activityStore'
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
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/25'
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${colors[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <p className="font-display text-3xl font-bold text-ink">{value}</p>
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

function BlockedCategoriesCard({ categories }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        No blocked attempts today
      </div>
    )
  }

  const categoryColors = {
    adult: 'bg-rose-100 text-rose-600',
    gambling: 'bg-amber-100 text-amber-600',
    social_media: 'bg-blue-100 text-blue-600',
    gaming: 'bg-purple-100 text-purple-600',
    streaming: 'bg-pink-100 text-pink-600',
    malware: 'bg-red-100 text-red-600',
    violence: 'bg-orange-100 text-orange-600',
    drugs: 'bg-yellow-100 text-yellow-600',
    custom: 'bg-slate-100 text-slate-600'
  }

  return (
        <div className="space-y-3 p-4">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <Badge className={`px-2 py-1 text-xs font-medium ${categoryColors[cat._id] || categoryColors.custom}`}>
                  {cat._id || 'Unknown'}
                </Badge>
              </div>
              <span className="text-sm font-semibold text-slate-600">{cat.count} blocked</span>
            </div>
          ))}
        </div>

  )
}

function ActivityTable({ activities }) {
  const [showFullUrl, setShowFullUrl] = useState({})

  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        No recent activity
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[420px]">Full URL</TableHead>
            <TableHead className="w-[120px]">Duration</TableHead>
            <TableHead className="w-[220px]">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity._id}>
              <TableCell className="max-w-[420px]">
                <div className="flex items-center gap-2">
                  {activity.wasBlocked ? (
                    <Shield className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  ) : (
                    <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowFullUrl(prev => ({ ...prev, [activity._id]: !prev[activity._id] }))}
                      className="h-auto w-full justify-start px-0 text-left text-xs text-slate-600 hover:bg-transparent"
                    >
                      <span className={showFullUrl[activity._id] ? 'break-all' : 'truncate'}>
                        {activity.url}
                      </span>
                    </Button>
                    <span className="text-xs text-indigo-500">
                      {showFullUrl[activity._id] ? 'Show less' : 'Show full'}
                    </span>
                  </div>
                  {activity.wasBlocked && (
                    <Badge variant="destructive" className="px-1.5 py-0.5 text-[10px]">
                      {activity.blockCategory || 'Blocked'}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatDuration(activity.durationSeconds)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(activity.visitTime).toLocaleString()}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}


function StudentDetail() {
  const { id } = useParams()
  const [activityPage, setActivityPage] = useState(1)
  const [statsRangePreset, setStatsRangePreset] = useState('7d')
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' })

  const statsRange = statsRangePreset === 'custom'
    ? customRange
    : getDateRangeForPreset(statsRangePreset)

  const rangeParams = {
    ...(statsRange.startDate && { startDate: statsRange.startDate }),
    ...(statsRange.endDate && { endDate: statsRange.endDate })
  }

  useEffect(() => {
    setActivityPage(1)
  }, [statsRange.startDate, statsRange.endDate])

  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id).then((res) => res.data)
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['studentStats', id, statsRange.startDate, statsRange.endDate],
    queryFn: () => getStudentStats(id, rangeParams).then((res) => res.data),
    refetchInterval: 30000
  })

  const { data: activityData } = useQuery({
    queryKey: ['studentActivity', id, activityPage, statsRange.startDate, statsRange.endDate],
    queryFn: () => getStudentActivity(id, { page: activityPage, limit: 15, ...rangeParams }).then((res) => res.data),
    refetchInterval: 30000
  })

  const student = studentData?.data
  const onlineStudents = useActivityStore((state) => state.onlineStudents)
  const stats = statsData?.data || {}
  const activities = activityData?.data || []
  const activityPagination = activityData?.pagination || { page: 1, totalPages: 1 }

  const buildCsvRow = (values) => values
    .map((value) => {
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    .join(',')

  const handleExportRange = async () => {
    const response = await getStudentActivity(id, {
      page: 1,
      limit: 2000,
      ...rangeParams
    })

    const exportRows = response.data?.data || []
    const csvRows = [
      buildCsvRow(['Student', student?.name || 'Unknown']),
      buildCsvRow(['Student ID', student?.studentId || 'Unknown']),
      buildCsvRow(['Range Start', statsRange.startDate || 'N/A']),
      buildCsvRow(['Range End', statsRange.endDate || 'N/A']),
      '',
      buildCsvRow(['URL', 'Domain', 'Duration Seconds', 'Blocked', 'Blocked Category', 'Visited At'])
    ]

    exportRows.forEach((activity) => {
      csvRows.push(buildCsvRow([
        activity.url,
        activity.domain,
        activity.durationSeconds,
        activity.wasBlocked ? 'Yes' : 'No',
        activity.blockCategory || '',
        activity.visitTime
      ]))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `student-activity-${student?.studentId || id}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (studentLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <Card className="p-12 text-center">
        <h3 className="font-display text-lg font-semibold text-ink">Student not found</h3>
        <Button variant="link" asChild className="mt-2 text-indigo-600">
          <Link to="/students">Back to Students</Link>
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
            to="/students"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
              {student.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">{student.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {student.studentId}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    onlineStudents[student._id]?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <Badge variant={student.isActive ? 'default' : 'destructive'}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {student.center && (
            <Link
              to={`/centers/${student.center._id}`}
              className="flex items-center gap-1 hover:text-indigo-600"
            >
              <Building2 className="w-4 h-4" />
              <span>{student.center.name}</span>
            </Link>
          )}
          {student.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              <span>{student.email}</span>
            </div>
          )}
          {student.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{student.phone}</span>
            </div>
          )}
          {student.lastLoginAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Last login: {new Date(student.lastLoginAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Student analytics range</h2>
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
            <Button type="button" variant="outline" className="gap-2" onClick={handleExportRange}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Activity}
          label="Activity (Range)"
          value={stats.todayActivity || 0}
          subtext="page visits"
          color="indigo"
        />
        <StatCard
          icon={Shield}
          label="Blocked (Range)"
          value={stats.todayBlocked || 0}
          subtext="threats blocked"
          color="rose"
        />
        <StatCard
          icon={Timer}
          label="Time (Range)"
          value={formatDuration(stats.totalTimeToday || 0)}
          subtext="browsing time"
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Activity"
          value={stats.totalActivity || 0}
          subtext="all time visits"
          color="emerald"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Blocked"
          value={stats.totalBlocked || 0}
          subtext="all time blocked"
          color="purple"
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

        {/* Blocked Categories */}
        <Card>
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-display text-lg font-semibold text-ink">Blocked Categories</h2>
            <p className="text-sm text-slate-500">Types of blocked content in selected range</p>
          </div>
          <BlockedCategoriesCard categories={stats.topBlockedCategories} />
        </Card>

      </div>

      {/* Activity History */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Activity History</h2>
            <p className="text-sm text-slate-500">Recent browsing activity</p>
          </div>
          <Button variant="link" asChild className="text-indigo-600">
            <Link to={`/activity?student=${id}`}>View All</Link>
          </Button>
        </div>
        <ActivityTable activities={activities} />
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

export default StudentDetail
