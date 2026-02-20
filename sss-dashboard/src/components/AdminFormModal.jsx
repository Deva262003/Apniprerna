import { useState } from 'react'
import { Loader2, Shield, User, Mail, Lock, Phone, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
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
import { getCenters } from '../services/api'
import { isValidPhoneNumber } from '../lib/validation'

function AdminFormModal({ admin, open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    password: '',
    role: admin?.role || 'admin',
    center: admin?.center?._id || admin?.center || '',
    phone: admin?.phone || ''
  })
  const [loading, setLoading] = useState(false)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then(res => res.data)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    const phone = String(form.phone || '').trim()
    if (!phone) {
      toast.error('Phone number is required')
      return
    }
    if (!isValidPhoneNumber(phone)) {
      toast.error('Phone number must be exactly 10 digits')
      return
    }

    setLoading(true)
    try {
      const payload = { ...form, phone }
      if (admin && !payload.password) delete payload.password
      await onSave(payload)
      onClose()
    } catch (error) {
      const apiError = error.response?.data
      const message =
        apiError?.message ||
        apiError?.errors?.[0]?.msg ||
        'Failed to save admin'
      toast.error(message)
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {admin ? 'Edit Admin' : 'Add New Admin'}
              </DialogTitle>
              <DialogDescription>Manage admin account details</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="pl-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="pl-11"
                required
              />
            </div>
          </div>

          {!admin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-11"
                  minLength={6}
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentRole = localStorage.getItem('role')
                    if (currentRole === 'pod_admin') {
                      return <SelectItem value="viewer">Viewer</SelectItem>
                    }
                    return (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="pod_admin">POD Admin</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </>
                    )
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={form.phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm({ ...form, phone: digitsOnly })
                  }}
                  className="pl-11"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Center</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Select
                value={form.center || undefined}
                onValueChange={(value) => setForm({ ...form, center: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="pl-11">
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

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {admin ? 'Save Changes' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

export default AdminFormModal
