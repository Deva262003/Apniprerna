import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { sendCommand, getCommandHistory } from '../services/adminService'
import { getCenters, getStudents } from '../services/api'

function StatusBadge({ status }) {
  const variants = {
    pending: 'secondary',
    sent: 'outline',
    acknowledged: 'default',
    failed: 'destructive'
  }

  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
}

function Commands() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    type: 'FORCE_LOGOUT',
    targetType: 'student',
    targetId: ''
  })
  const [filters, setFilters] = useState({ status: '' })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then((res) => res.data)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['commands', filters],
    queryFn: () => getCommandHistory(filters).then((res) => res.data)
  })

  const sendMutation = useMutation({
    mutationFn: sendCommand,
    onSuccess: () => {
      queryClient.invalidateQueries(['commands'])
      toast.success('Command sent')
    },
    onError: () => toast.error('Failed to send command')
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (form.targetType !== 'all' && !form.targetId) {
      toast.error('Select a target')
      return
    }
    sendMutation.mutate(form)
  }

  const centers = centersData?.data || []
  const students = studentsData?.data || []
  const commands = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Admin Commands</h1>
        <p className="text-slate-500 mt-1">Send real-time commands to student extensions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Send className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-ink">Send Command</h2>
              <p className="text-sm text-slate-500">Force logout or sync blocklist</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Command Type
              </label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select command" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORCE_LOGOUT">Force Logout</SelectItem>
                  <SelectItem value="SYNC_BLOCKLIST">Sync Blocklist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Target Type
              </label>
              <Select
                value={form.targetType}
                onValueChange={(value) => setForm({ ...form, targetType: value, targetId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="all">All Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.targetType === 'student' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Student
                </label>
                <Select
                  value={form.targetId || undefined}
                  onValueChange={(value) => setForm({ ...form, targetId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
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
            )}

            {form.targetType === 'center' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Center
                </label>
                <Select
                  value={form.targetId || undefined}
                  onValueChange={(value) => setForm({ ...form, targetId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center._id} value={center._id}>
                        {center.name} ({center.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full gap-2">
              {sendMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Command
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <History className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-ink">Command History</h2>
                <p className="text-sm text-slate-500">Track delivery and acknowledgments</p>
              </div>
            </div>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : commands.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No commands sent yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.map((command) => (
                    <TableRow key={command._id}>
                      <TableCell className="text-sm text-slate-600">{command.type}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {command.student?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={command.status} />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(command.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default Commands
