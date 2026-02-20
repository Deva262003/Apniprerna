import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useParentAuthStore from '../store/parentAuthStore'
import { parentLogin } from '../services/parentService'

function ParentLogin() {
  const navigate = useNavigate()
  const login = useParentAuthStore((s) => s.login)
  const [parentId, setParentId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await parentLogin(parentId, password)
      const { token, parent } = response.data.data
      login(token, parent)
      toast.success('Welcome!')
      if (parent?.mustChangePassword) {
        navigate('/parent/change-password')
      } else {
        navigate('/parent')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-paper relative">
      <div className="absolute inset-0 pattern-dots opacity-40" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink mb-2">Parent Portal</h2>
          <p className="text-slate-500">Sign in to view your child's activity</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Parent ID</label>
            <Input
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="Enter your Parent ID"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                placeholder="Enter your password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="group w-full gap-2 py-6 text-base">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ParentLogin
