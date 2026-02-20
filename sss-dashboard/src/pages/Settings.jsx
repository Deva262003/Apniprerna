import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock, Settings as SettingsIcon, User } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import useAuthStore from '../store/authStore'
import { changeAdminPassword } from '../services/api'

function Settings() {
  const admin = useAuthStore((s) => s.admin)

  const centerLabel = useMemo(() => {
    if (!admin?.center) return 'All Centers'
    if (typeof admin.center === 'string') return admin.center
    return admin.center?.name ? `${admin.center.name}${admin.center.code ? ` (${admin.center.code})` : ''}` : '—'
  }, [admin])

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const currentPassword = String(form.currentPassword || '')
      const newPassword = String(form.newPassword || '')
      const confirmPassword = String(form.confirmPassword || '')

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters')
      }
      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match')
      }

      return changeAdminPassword(currentPassword, newPassword)
    },
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password updated')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to update password')
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold text-ink">Profile</h2>
              <p className="text-sm text-slate-500">Your signed-in admin account</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <SettingsIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Name</p>
              <p className="mt-1 text-sm font-semibold text-ink">{admin?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold text-ink">{admin?.role || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="mt-1 text-sm font-semibold text-ink">{admin?.email || '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Center</p>
              <p className="mt-1 text-sm font-semibold text-ink">{centerLabel}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold text-ink">Security</h2>
              <p className="text-sm text-slate-500">Change your password</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Current password</label>
              <Input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-slate-400">Minimum 6 characters</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirm new password</label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Settings
