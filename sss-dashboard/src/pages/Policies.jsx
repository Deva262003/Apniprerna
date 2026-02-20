import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShieldAlert,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  togglePolicy
} from '../services/policyService'
import { getCenters, getStudents } from '../services/api'


const parseList = (value) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const formatList = (list) => (Array.isArray(list) ? list.join(', ') : '')

function PolicyModal({ open, policy, centers, students, onClose, onSave }) {

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: policy?.name || '',
    description: policy?.description || '',
    policyType: policy?.policyType || 'blocklist',
    scope: policy?.scope || 'center',
    center: policy?.center?._id || policy?.center || '',
    student: policy?.student?._id || policy?.student || '',
    priority: policy?.priority ?? 0,
    isActive: policy?.isActive ?? true,
    blockedDomains: formatList(policy?.rules?.blockedDomains),
    blockedPatterns: formatList(policy?.rules?.blockedPatterns),
    blockedCategories: formatList(policy?.rules?.blockedCategories),
    allowedDomains: formatList(policy?.rules?.allowedDomains),
    allowOnlyListed: policy?.rules?.allowOnlyListed ?? false,
    allowedDays: formatList(policy?.rules?.allowedDays),
    allowedHoursStart: policy?.rules?.allowedHours?.start || '',
    allowedHoursEnd: policy?.rules?.allowedHours?.end || '',
    maxSessionMinutes: policy?.rules?.maxSessionMinutes || '',
    timezone: policy?.rules?.timezone || ''
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: form.name,
        description: form.description,
        policyType: form.policyType,
        scope: form.scope,
        center: form.scope === 'center' ? form.center : undefined,
        student: form.scope === 'student' ? form.student : undefined,
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        rules: {}
      }

      if (form.policyType === 'blocklist') {
        payload.rules.blockedDomains = parseList(form.blockedDomains)
        payload.rules.blockedPatterns = parseList(form.blockedPatterns)
        payload.rules.blockedCategories = parseList(form.blockedCategories)
      }

      if (form.policyType === 'allowlist') {
        payload.rules.allowedDomains = parseList(form.allowedDomains)
        payload.rules.allowOnlyListed = form.allowOnlyListed
      }

      if (form.policyType === 'time_restriction') {
        payload.rules.allowedDays = parseList(form.allowedDays)
        if (form.allowedHoursStart && form.allowedHoursEnd) {
          payload.rules.allowedHours = {
            start: form.allowedHoursStart,
            end: form.allowedHoursEnd
          }
        }
        if (form.maxSessionMinutes) {
          payload.rules.maxSessionMinutes = Number(form.maxSessionMinutes)
        }
        if (form.timezone) {
          payload.rules.timezone = form.timezone
        }
      }

      await onSave(payload)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save policy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {policy ? 'Edit Policy' : 'Create Policy'}
              </DialogTitle>
              <DialogDescription>Configure policy rules and scope</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Policy Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Policy Type
              </label>
              <Select value={form.policyType} onValueChange={(value) => setForm({ ...form, policyType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocklist">Blocklist</SelectItem>
                  <SelectItem value="allowlist">Allowlist</SelectItem>
                  <SelectItem value="time_restriction">Time Restriction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Scope
              </label>
              <Select value={form.scope} onValueChange={(value) => setForm({ ...form, scope: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === 'center' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Center
                </label>
                <Select
                  value={form.center || undefined}
                  onValueChange={(value) => setForm({ ...form, center: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a center" />
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
            {form.scope === 'student' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Student
                </label>
                <Select
                  value={form.student || undefined}
                  onValueChange={(value) => setForm({ ...form, student: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Priority
              </label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </div>
          </div>

          {form.policyType === 'blocklist' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Blocked Domains
                </label>
                <Textarea
                  rows={2}
                  value={form.blockedDomains}
                  onChange={(e) => setForm({ ...form, blockedDomains: e.target.value })}
                  placeholder="facebook.com, youtube.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Blocked Patterns
                </label>
                <Textarea
                  rows={2}
                  value={form.blockedPatterns}
                  onChange={(e) => setForm({ ...form, blockedPatterns: e.target.value })}
                  placeholder="*game*, *casino*"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Blocked Categories
                </label>
                <Input
                  value={form.blockedCategories}
                  onChange={(e) => setForm({ ...form, blockedCategories: e.target.value })}
                  placeholder="gaming, social"
                />
              </div>
            </div>
          )}

          {form.policyType === 'allowlist' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Allowed Domains
                </label>
                <Textarea
                  rows={2}
                  value={form.allowedDomains}
                  onChange={(e) => setForm({ ...form, allowedDomains: e.target.value })}
                  placeholder="khanacademy.org, wikipedia.org"
                />
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.allowOnlyListed}
                  onChange={(e) => setForm({ ...form, allowOnlyListed: e.target.checked })}
                />
                Allow only listed domains
              </label>
            </div>
          )}

          {form.policyType === 'time_restriction' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Allowed Days
                </label>
                <Input
                  value={form.allowedDays}
                  onChange={(e) => setForm({ ...form, allowedDays: e.target.value })}
                  placeholder="monday, tuesday, wednesday"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={form.allowedHoursStart}
                    onChange={(e) => setForm({ ...form, allowedHoursStart: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={form.allowedHoursEnd}
                    onChange={(e) => setForm({ ...form, allowedHoursEnd: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Max Session (minutes)
                  </label>
                  <Input
                    type="number"
                    value={form.maxSessionMinutes}
                    onChange={(e) => setForm({ ...form, maxSessionMinutes: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Timezone
                  </label>
                  <Input
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    placeholder="Asia/Kolkata"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active policy
            </label>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {policy ? 'Save Changes' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function Policies() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState({ open: false, policy: null })

  const { data, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => getPolicies().then((res) => res.data)
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then((res) => res.data)
  })

  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries(['policies'])
      toast.success('Policy created')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['policies'])
      toast.success('Policy updated')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries(['policies'])
      toast.success('Policy deleted')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: togglePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries(['policies'])
      toast.success('Policy status updated')
    }
  })

  const handleSave = async (payload) => {
    if (modal.policy) {
      await updateMutation.mutateAsync({ id: modal.policy._id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
  }

  const handleDelete = (policy) => {
    if (confirm(`Delete "${policy.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(policy._id)
    }
  }

  const policies = data?.data || []
  const centers = centersData?.data || []
  const students = studentsData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Policies</h1>
          <p className="text-slate-500 mt-1">
            Manage {policies.length} policy{policies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, policy: null })} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>

      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : policies.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <ShieldAlert className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No policies yet</h3>
          <p className="mt-2 text-slate-500">Create a policy to start enforcing rules.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy._id}>
                    <TableCell>
                      <p className="font-medium text-ink">{policy.name}</p>
                      <p className="text-xs text-slate-400">{policy.description || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{policy.policyType}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {policy.scope}
                    </TableCell>
                    <TableCell className="text-slate-600">{policy.priority}</TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ? 'default' : 'outline'}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation.mutate(policy._id)}
                          className="h-8 w-8 text-slate-500"
                        >
                          {policy.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setModal({ open: true, policy })}
                          className="h-8 w-8 text-slate-500"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(policy)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}


      <PolicyModal
        open={modal.open}
        policy={modal.policy}
        centers={centers}
        students={students}
        onClose={() => setModal({ open: false, policy: null })}
        onSave={handleSave}
      />

    </div>
  )
}

export default Policies
