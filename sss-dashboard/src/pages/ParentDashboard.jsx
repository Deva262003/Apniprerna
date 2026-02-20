import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Activity, Clock, Globe, LogOut, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getParentStudents, getParentStudentStats, getParentStudentActivity, parentForceLogout } from '../services/parentService'

function formatSeconds(totalSeconds) {
  const s = Number(totalSeconds) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

function ParentDashboard() {
  const [studentId, setStudentId] = useState('')

  const studentsQuery = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => getParentStudents().then((r) => r.data)
  })

  const students = useMemo(() => studentsQuery.data?.data || [], [studentsQuery.data])

  useEffect(() => {
    if (!studentId && students.length > 0) {
      setStudentId(students[0]._id)
    }
  }, [studentId, students])

  const statsQuery = useQuery({
    queryKey: ['parent-student-stats', studentId],
    queryFn: () => getParentStudentStats(studentId).then((r) => r.data),
    enabled: !!studentId
  })

  const activityQuery = useQuery({
    queryKey: ['parent-student-activity', studentId],
    queryFn: () => getParentStudentActivity(studentId, { page: 1, limit: 25 }).then((r) => r.data),
    enabled: !!studentId
  })

  const forceLogoutMutation = useMutation({
    mutationFn: () => parentForceLogout(studentId),
    onSuccess: () => toast.success('Logout request sent'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to force logout')
  })

  const stats = statsQuery.data?.data
  const activities = activityQuery.data?.data || []

  const selected = students.find((s) => s._id === studentId)

  const handleForceLogout = () => {
    if (!studentId) return
    if (confirm(`Force logout ${selected?.name || 'student'}?`)) {
      forceLogoutMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-slate-500 mt-1">Usage and browsing history</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={studentId || undefined} onValueChange={setStudentId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={studentsQuery.isLoading ? 'Loading students...' : 'Select a child'} />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name} ({s.studentId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleForceLogout} disabled={!studentId || forceLogoutMutation.isPending} className="gap-2">
            <LogOut className="h-4 w-4" />
            Force logout
          </Button>
        </div>
      </div>

      {studentsQuery.isLoading ? (
        <Card className="p-6 text-sm text-slate-500">Loading...</Card>
      ) : students.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-slate-600">No child account is linked to this parent yet.</p>
          <p className="text-xs text-slate-400 mt-1">Please contact your POD Admin to link your child.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Stat icon={Clock} label="Time today" value={formatSeconds(stats?.totalTimeToday)} />
            <Stat icon={Activity} label="Visits today" value={stats?.todayActivity ?? '—'} />
            <Stat icon={ShieldAlert} label="Blocked today" value={stats?.todayBlocked ?? '—'} />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
              <p className="text-xs text-slate-400">Last 25 entries</p>
            </div>
            {activityQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading activity...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500">No activity records yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.map((a) => (
                  <div key={a._id} className="py-3 flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{a.domain || a.url}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {new Date(a.visitTime || a.timestamp || Date.now()).toLocaleString()}
                        {a.wasBlocked ? ' • Blocked' : ''}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      {a.durationSeconds ? formatSeconds(a.durationSeconds) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default ParentDashboard
