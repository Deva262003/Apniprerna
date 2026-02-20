import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Filter, Loader2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../services/adminService'
import { getCenters } from '../services/api'
import AdminFormModal from '../components/AdminFormModal'

const formatRole = (role) => {
  switch (role) {
    case 'pod_admin':
      return 'POD Admin'
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'viewer':
      return 'Viewer'
    default:
      return role
  }
}


function AdminManagement() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState({ open: false, admin: null })
  const [search, setSearch] = useState('')
  const [filterCenter, setFilterCenter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => getAdmins().then(res => res.data)
  })

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then(res => res.data)
  })

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries(['admins'])
      toast.success('Admin created successfully')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admins'])
      toast.success('Admin updated successfully')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries(['admins'])
      toast.success('Admin deleted')
    }
  })

  const handleSave = async (formData) => {
    if (modal.admin) {
      await updateMutation.mutateAsync({ id: modal.admin._id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const handleDelete = (admin) => {
    if (confirm(`Delete "${admin.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(admin._id)
    }
  }

  const admins = data?.data || []
  const centers = centersData?.data || []

  const filteredAdmins = admins.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    const matchesCenter = !filterCenter || a.center?._id === filterCenter
    return matchesSearch && matchesCenter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Admins</h1>
          <p className="text-slate-500 mt-1">Manage {admins.length} admin account{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModal({ open: true, admin: null })} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>

      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
            placeholder="Search by name or email..."
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
              {centers.map(center => (
                <SelectItem key={center._id} value={center._id}>{center.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No admins found</h3>
          <p className="mt-2 text-slate-500">Add an admin to get started.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin._id}>
                    <TableCell className="font-medium text-ink">{admin.name}</TableCell>
                    <TableCell className="text-slate-600">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatRole(admin.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{admin.center?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setModal({ open: true, admin })}
                          className="h-8 w-8 text-slate-500"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(admin)}
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
        </div>
      )}


      <AdminFormModal
        open={modal.open}
        admin={modal.admin}
        onClose={() => setModal({ open: false, admin: null })}
        onSave={handleSave}
      />

    </div>
  )
}

export default AdminManagement
