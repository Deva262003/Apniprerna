import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Users } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { getParent } from '../services/parentAdminService'

function ParentDetail() {
  const { id } = useParams()

  const parentQuery = useQuery({
    queryKey: ['parent', id],
    queryFn: () => getParent(id).then((r) => r.data)
  })

  const parent = parentQuery.data?.data

  if (parentQuery.isLoading) {
    return (
      <Card className="p-8">
        <p className="text-sm text-slate-600">Loading parent...</p>
      </Card>
    )
  }

  if (parentQuery.isError || !parent) {
    return (
      <Card className="p-8">
        <p className="text-sm text-slate-600">Parent not found.</p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/parents" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Parents
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold text-ink">{parent.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {parent.center?.name ? `${parent.center.name}${parent.center.code ? ` (${parent.center.code})` : ''}` : '—'}
              </p>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/parents">
            <ArrowLeft className="h-4 w-4" />
            Parents
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">Account</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Parent ID</p>
              <p className="mt-1 font-mono text-sm text-ink">{parent.parentId}</p>
              <p className="mt-1 text-xs text-slate-400">{parent.parentIdType}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Status</p>
              <div className="mt-1">
                <Badge variant={parent.isActive ? 'secondary' : 'destructive'}>
                  {parent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="mt-1 text-sm font-semibold text-ink">{parent.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Phone</p>
              <p className="mt-1 text-sm font-semibold text-ink">{parent.phone || '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Children</h2>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(parent.students || []).length === 0 ? (
              <p className="text-sm text-slate-500">No linked students</p>
            ) : (
              parent.students.map((s) => (
                <Link
                  key={s._id}
                  to={`/students/${s._id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-ink">{s.name || 'Student'}</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{s.studentId || '—'}</p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ParentDetail
