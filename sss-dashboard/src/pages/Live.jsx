import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Radio,
  Users,
  Activity as ActivityIcon,
  AlertTriangle,
  LogOut,
  Globe,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCenters, getStudents } from '../services/api'
import { forceLogoutStudent } from '../services/adminService'
import useActivity from '../hooks/useActivity'
import useActivityStore from '../store/activityStore'
import useNotificationStore from '../store/notificationStore'
import { getActiveSessions } from '../lib/liveUtils'

function StatCard({ icon: Icon, label, value, color }) {
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

function LiveStudentCard({ student, heartbeat, isOnline, onForceLogout }) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">{student.name}</p>
          <p className="text-sm text-slate-500">{student.studentId}</p>
        </div>
        <Badge variant={isOnline ? 'default' : 'outline'} className="text-xs">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <div className="space-y-1 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="truncate">{heartbeat?.currentUrl || 'No active session'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>{heartbeat?.lastSeen ? new Date(heartbeat.lastSeen).toLocaleTimeString() : '—'}</span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => onForceLogout(student)}
        disabled={!isOnline}
        className="w-full gap-2"
      >
        <LogOut className="h-4 w-4" />
        Force logout
      </Button>
    </Card>
  )
}

function ActivityStreamItem({ activity }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
        <ActivityIcon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{activity.domain || activity.url}</p>
        <p className="text-xs text-slate-400 truncate">{activity.studentName || activity.student?.name}</p>
      </div>
      <span className="text-xs text-slate-400">
        {new Date(activity.visitTime || activity.timestamp || Date.now()).toLocaleTimeString()}
      </span>
    </div>
  )
}

function Live() {
  const [centerFilter, setCenterFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  useActivity({ enabled: true })

  const onlineStudents = useActivityStore((state) => state.onlineStudents)
  const heartbeats = useActivityStore((state) => state.heartbeats)
  const liveActivities = useActivityStore((state) => state.activities)
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then((res) => res.data)
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const forceLogoutMutation = useMutation({
    mutationFn: (studentId) => forceLogoutStudent(studentId),
    onSuccess: () => toast.success('Logout command sent'),
    onError: () => toast.error('Failed to send logout command')
  })

  const students = studentsData?.data || []
  const centers = centersData?.data || []

  const filteredStudents = centerFilter
    ? students.filter((student) => (student.center?._id || student.center) === centerFilter)
    : students
  const activeSessions = getActiveSessions(students, onlineStudents, searchTerm, centerFilter)
  const activeCount = filteredStudents.filter((student) => onlineStudents[student._id]?.isOnline).length

  const handleForceLogout = (student) => {
    if (confirm(`Force logout ${student.name}?`)) {
      forceLogoutMutation.mutate(student._id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Live Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor active sessions and real-time activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-52"
            placeholder="Search student"
          />
          <Select
            value={centerFilter || undefined}
            onValueChange={(value) => setCenterFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centers</SelectItem>
              {centers.map((center) => (
                <SelectItem key={center._id} value={center._id}>
                  {center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Radio} label="Online now" value={activeCount} color="emerald" />
        <StatCard icon={Users} label="Total students" value={filteredStudents.length} color="indigo" />
        <StatCard icon={ActivityIcon} label="Live activity" value={liveActivities.length} color="amber" />
        <StatCard icon={AlertTriangle} label="Alerts" value={unreadCount} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink">Active Sessions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((student) => {
              const heartbeat = heartbeats[student._id]
              const isOnline = onlineStudents[student._id]?.isOnline
              return (
                <LiveStudentCard
                  key={student._id}
                  student={student}
                  heartbeat={heartbeat}
                  isOnline={isOnline}
                  onForceLogout={handleForceLogout}
                />
              )
            })}
            {activeSessions.length === 0 && (
              <Card className="p-6 text-center text-slate-500">
                No active sessions right now.
              </Card>
            )}
          </div>
        </div>
        <div>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink">Live Activity</h3>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {liveActivities.length === 0 ? (
                <p className="text-sm text-slate-500">Waiting for activity events...</p>
              ) : (
                liveActivities.slice(0, 20).map((activity) => (
                  <ActivityStreamItem key={`${activity._id || activity.url}-${activity.visitTime}`} activity={activity} />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Live
