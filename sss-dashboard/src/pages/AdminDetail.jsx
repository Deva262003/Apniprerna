import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Shield, User } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { getAdmin } from '../services/adminService'

function AdminDetail() {
  const { id } = useParams()

  const adminQuery = useQuery({
    queryKey: ['admin', id],
    queryFn: () => getAdmin(id).then((r) => r.data)
  })

  const admin = adminQuery.data?.data

  if (adminQuery.isLoading) {
    return (
      <Card className="p-8">
        <p className="text-sm text-slate-600">Loading admin...</p>
      </Card>
    )
  }

  if (adminQuery.isError || !admin) {
    return (
      <Card className="p-8">
        <p className="text-sm text-slate-600">Admin not found.</p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/admins" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admins
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  const centerLabel = !admin.center
    ? 'All Centers'
    : typeof admin.center === 'string'
      ? admin.center
      : admin.center?.name
        ? `${admin.center.name}${admin.center.code ? ` (${admin.center.code})` : ''}`
        : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold text-ink">{admin.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{admin.email}</p>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admins">
            <ArrowLeft className="h-4 w-4" />
            Admins
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Account</h2>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <User className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold text-ink">{admin.role || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Status</p>
              <div className="mt-1">
                <Badge variant={admin.isActive ? 'secondary' : 'destructive'}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Center</p>
              <p className="mt-1 text-sm font-semibold text-ink">{centerLabel}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Quick Links</h2>
          <div className="mt-4 space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/admins">Admin Management</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/settings">Settings</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdminDetail
