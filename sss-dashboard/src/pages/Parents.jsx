import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users,
  Plus,
  Loader2,
  Search,
  RefreshCcw,
  KeyRound,
  Pencil
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import { getStudents } from '../services/api'
import { createParent, getParents, resetParentPassword, updateParent } from '../services/parentAdminService'

function CredentialsDialog({ open, title, description, parentId, tempPassword, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Parent ID</p>
            <p className="mt-1 font-mono text-lg text-ink">{parentId}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-700">Temporary Password (show once)</p>
            <p className="mt-1 font-mono text-lg text-amber-900">{tempPassword}</p>
            <p className="mt-2 text-xs text-amber-700">Parent will be asked to change this password on first login.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ParentModal({ open, parent, students, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    parentIdType: 'numeric',
    parentId: '',
    students: []
  })
  const [studentSearch, setStudentSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = !!parent

  useEffect(() => {
    if (!open) return
    setForm({
      name: parent?.name || '',
      phone: parent?.phone || '',
      email: parent?.email || '',
      parentIdType: parent?.parentIdType || 'numeric',
      parentId: parent?.parentId || '',
      students: parent?.students?.map((s) => s._id) || []
    })
  }, [open, parent])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      s.name?.toLowerCase().includes(q) || s.studentId?.toString().includes(q)
    )
  }, [studentSearch, students])

  const normalizeParentId = (value, type) => {
    const v = String(value || '')
    if (type === 'numeric') return v.replace(/\D/g, '').slice(0, 8)
    return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  }

  const toggleStudent = (id) => {
    setForm((prev) => {
      const exists = prev.students.includes(id)
      return { ...prev, students: exists ? prev.students.filter((x) => x !== id) : [...prev.students, id] }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.students.length === 0) {
      toast.error('Select at least one student')
      return
    }
    if (!isEdit) {
      if (form.parentIdType === 'numeric' && form.parentId && !/^\d{8}$/.test(form.parentId)) {
        toast.error('Numeric Parent ID must be exactly 8 digits')
        return
      }
      if (form.parentIdType === 'alphanumeric' && form.parentId && !/^[A-Z0-9]{8}$/.test(form.parentId)) {
        toast.error('Alphanumeric Parent ID must be exactly 8 characters (A-Z, 0-9)')
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        students: form.students
      }

      if (!isEdit) {
        payload.parentIdType = form.parentIdType
        if (form.parentId) payload.parentId = form.parentId
      }

      await onSave(payload)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {isEdit ? 'Edit Parent' : 'Create Parent'}
              </DialogTitle>
              <DialogDescription>
                {isEdit ? 'Update parent and linked children' : 'Generate a parent login ID and temporary password'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Parent name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Parent ID type *</label>
                <Select
                  value={form.parentIdType}
                  onValueChange={(value) => {
                    setForm({
                      ...form,
                      parentIdType: value,
                      parentId: normalizeParentId(form.parentId, value)
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numeric (8 digits)</SelectItem>
                    <SelectItem value="alphanumeric">Alphanumeric (8 chars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Parent ID (optional)</label>
                <Input
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: normalizeParentId(e.target.value, form.parentIdType) })}
                  placeholder={form.parentIdType === 'numeric' ? 'Leave blank to auto-generate' : 'E.g. AB12CD34'}
                  className="font-mono"
                />
                <p className="text-xs text-slate-400">Leave blank to auto-generate a unique ID</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-slate-700">Link student(s) *</label>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9"
                  placeholder="Search students"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No students found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <label key={s._id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50">
                      <Checkbox
                        checked={form.students.includes(s._id)}
                        onCheckedChange={() => toggleStudent(s._id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{s.studentId}</p>
                      </div>
                      <Badge variant="secondary">{s.center?.name || '—'}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">Selected: {form.students.length}</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Parent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Parents() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState({ open: false, parent: null })
  const [search, setSearch] = useState('')
  const [creds, setCreds] = useState({ open: false, parentId: '', tempPassword: '', title: '', description: '' })

  const parentsQuery = useQuery({
    queryKey: ['parents'],
    queryFn: () => getParents({ search }).then((r) => r.data)
  })

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then((r) => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => createParent(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['parents'])
      const { parent, tempPassword } = res.data.data
      setCreds({
        open: true,
        parentId: parent.parentId,
        tempPassword,
        title: 'Parent created',
        description: 'Share these credentials with the parent.'
      })
      toast.success('Parent created')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to create parent')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateParent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['parents'])
      toast.success('Parent updated')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update parent')
  })

  const resetMutation = useMutation({
    mutationFn: (id) => resetParentPassword(id),
    onSuccess: (res, id) => {
      const tempPassword = res.data.data.tempPassword
      const parent = parents.find((p) => p._id === id)
      setCreds({
        open: true,
        parentId: parent?.parentId || '—',
        tempPassword,
        title: 'Password reset',
        description: 'Share the new temporary password with the parent.'
      })
      toast.success('Password reset')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reset password')
  })

  const parents = parentsQuery.data?.data || []
  const students = studentsQuery.data?.data || []

  const handleSave = async (payload) => {
    if (modal.parent) {
      await updateMutation.mutateAsync({ id: modal.parent._id, data: payload })
      return
    }
    await createMutation.mutateAsync(payload)
  }

  const handleReset = (p) => {
    if (confirm(`Reset password for ${p.name}?`)) {
      resetMutation.mutate(p._id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Parents</h1>
          <p className="text-slate-500 mt-1">Manage parent accounts and linked children</p>
        </div>
        <Button onClick={() => setModal({ open: true, parent: null })} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Parent
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
            placeholder="Search by parent name or ID..."
          />
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries(['parents'])} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {parentsQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : parents.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-slate-600">No parents yet</p>
          <p className="text-xs text-slate-400 mt-1">Create a parent account to give access to a child's data.</p>
        </Card>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Children</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.email || p.phone || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-slate-100 px-2 py-1 text-sm font-mono text-slate-700">{p.parentId}</span>
                      <p className="text-[11px] text-slate-400 mt-1">{p.parentIdType}</p>
                    </TableCell>
                    <TableCell className="text-slate-600">{p.center?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.students?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'secondary' : 'destructive'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModal({ open: true, parent: p })}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReset(p)}
                          className="gap-2"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ParentModal
        open={modal.open}
        parent={modal.parent}
        students={students}
        onClose={() => setModal({ open: false, parent: null })}
        onSave={handleSave}
      />

      <CredentialsDialog
        open={creds.open}
        title={creds.title}
        description={creds.description}
        parentId={creds.parentId}
        tempPassword={creds.tempPassword}
        onClose={() => setCreds({ open: false, parentId: '', tempPassword: '', title: '', description: '' })}
      />
    </div>
  )
}

export default Parents
