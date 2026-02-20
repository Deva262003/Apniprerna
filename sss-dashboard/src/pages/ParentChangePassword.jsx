import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock, KeyRound, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useParentAuthStore from '../store/parentAuthStore'
import { changeParentPassword } from '../services/parentService'

function ParentChangePassword() {
  const navigate = useNavigate()
  const setParent = useParentAuthStore((s) => s.login)
  const token = useParentAuthStore((s) => s.token)
  const parent = useParentAuthStore((s) => s.parent)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => changeParentPassword(currentPassword, newPassword),
    onSuccess: (res) => {
      const updatedParent = res.data.data
      setParent(token, {
        ...parent,
        mustChangePassword: updatedParent.mustChangePassword
      })
      toast.success('Password updated')
      navigate('/parent')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update password')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Change password</h1>
            <p className="text-sm text-slate-500">Required on first login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Current password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">New password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={mutation.isPending} className="w-full gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default ParentChangePassword
