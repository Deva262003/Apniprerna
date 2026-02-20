import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'

import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Search,
  Users,
  Building2,
  Hash,
  Key,
  MoreVertical,
  UserCircle,
  Filter,
  Download,
  Clock,
  BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { getStudents, createStudent, updateStudent, deleteStudent, getCenters } from '../services/api'
import useActivityStore from '../store/activityStore'


function StudentModal({ open, student, onClose, onSave }) {

  const [form, setForm] = useState({
    studentId: student?.studentId || '',
    name: student?.name || '',
    center: student?.center?._id || student?.center || '',
    pin: ''
  })
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!student && !/^\d{6,8}$/.test(form.studentId)) {
      toast.error('Student ID must be 6-8 digits')
      return
    }

    if (!student && !/^\d{4}$/.test(form.pin)) {
      toast.error('PIN must be 4 digits')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        center: form.center
      }

      if (!student) {
        payload.studentId = form.studentId
        payload.pin = form.pin
      } else if (form.pin) {
        payload.pin = form.pin
      }

      await onSave(payload)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const centers = centersData?.data || []

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {student ? 'Edit Student' : 'Add New Student'}
              </DialogTitle>
              <DialogDescription>
                {student ? 'Update student details' : 'Create a student account'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="pl-11"
                placeholder="Enter student's full name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Learning Center <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Select
                value={form.center || undefined}
                onValueChange={(value) => setForm({ ...form, center: value })}
              >
                <SelectTrigger className="pl-11">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Student ID {!student && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                  className="pl-11 font-mono"
                  placeholder="6-8 digits"
                  disabled={!!student}
                  required={!student}
                />
              </div>
              {student && (
                <p className="text-xs text-slate-400">ID cannot be changed</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                PIN {!student && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="pl-11 pr-11 font-mono"
                  placeholder={student ? 'Leave blank' : '4 digits'}
                  required={!student}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {student && (
                <p className="text-xs text-slate-400">Leave blank to keep current</p>
              )}
            </div>
          </div>

          {!student && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Note:</strong> Student ID cannot be changed after creation. Make sure it's correct.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {student ? 'Save Changes' : 'Create Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function StudentRow({ student, onEdit, onDelete, index }) {
  const onlineStudents = useActivityStore((state) => state.onlineStudents)
  const isOnline = onlineStudents[student._id]?.isOnline


  return (
    <TableRow
      className="opacity-0 animate-fadeIn"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white shadow-sm">
            {student.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink">{student.name}</p>
            <p className="text-sm text-slate-400">Added {new Date(student.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="rounded bg-slate-100 px-2 py-1 text-sm font-mono text-slate-600">
          {student.studentId}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-sm text-slate-600">{student.center?.name || '—'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
          <span className="text-sm text-slate-600">{isOnline ? 'Online' : 'Offline'}</span>
          <Badge variant={student.isActive ? 'secondary' : 'destructive'}>
            {student.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          <span>
            {student.lastLoginAt
              ? new Date(student.lastLoginAt).toLocaleDateString()
              : 'Never'
            }
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/students/${student._id}`} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Stats
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 text-rose-600 focus:text-rose-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>

  )
}

function Students() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [modal, setModal] = useState({ open: false, student: null })
  const [search, setSearch] = useState('')
  const [filterCenter, setFilterCenter] = useState(searchParams.get('center') || '')

  useEffect(() => {
    setFilterCenter(searchParams.get('center') || '')
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['students', filterCenter],
    queryFn: () => getStudents(filterCenter ? { center: filterCenter } : undefined).then((res) => res.data)
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      toast.success('Student created successfully!')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      toast.success('Student updated successfully!')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      toast.success('Student deleted')
    }
  })

  const handleSave = async (formData) => {
    if (modal.student) {
      await updateMutation.mutateAsync({ id: modal.student._id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const handleDelete = (student) => {
    if (confirm(`Delete "${student.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(student._id)
    }
  }

  const students = data?.data || []
  const centers = centersData?.data || []

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.includes(search)
    const matchesCenter = !filterCenter || s.center?._id === filterCenter
    return matchesSearch && matchesCenter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Students</h1>
          <p className="text-slate-500 mt-1">
            Manage {students.length} student account{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setModal({ open: true, student: null })} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
            placeholder="Search by name or student ID..."
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Select
            value={filterCenter || undefined}
            onValueChange={(value) => setFilterCenter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="pl-12">
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


      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading students...</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Users className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No students yet</h3>
          <p className="mt-2 text-slate-500">
            {centers.length === 0
              ? "Create a learning center first, then add students."
              : "Add your first student to get started."
            }
          </p>
          <Button
            onClick={() => setModal({ open: true, student: null })}
            disabled={centers.length === 0}
            className="mt-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Your First Student
          </Button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No results found</h3>
          <p className="mt-2 text-slate-500">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, i) => (
                  <StudentRow
                    key={student._id}
                    student={student}
                    index={i}
                    onEdit={() => setModal({ open: true, student })}
                    onDelete={() => handleDelete(student)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}


      {/* Modal */}
      <StudentModal
        open={modal.open}
        student={modal.student}
        onClose={() => setModal({ open: false, student: null })}
        onSave={handleSave}
      />

    </div>
  )
}

export default Students
