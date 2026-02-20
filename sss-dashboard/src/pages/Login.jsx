import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import useAuthStore from '../store/authStore'
import { login as apiLogin } from '../services/api'


function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiLogin(email, password)
      const { token, admin } = response.data.data
      login(token, admin)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error) {
      const apiError = error.response?.data
      const message =
        apiError?.message ||
        apiError?.errors?.[0]?.msg ||
        'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <span className="font-display text-xl font-semibold text-white">Apni Pathshala</span>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Keeping students
              <span className="block text-indigo-200">safe online.</span>
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed mb-8">
              Monitor, protect, and guide students across 178 learning centers with our comprehensive safety platform.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: '576', label: 'Devices' },
                { value: '178', label: 'Centers' },
                { value: '24/7', label: 'Protection' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="font-display text-2xl xl:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-indigo-300 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-indigo-200 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Student Safety Software v1.0</span>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-paper relative">
        {/* Subtle pattern */}
        <div className="absolute inset-0 pattern-dots opacity-40" />

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-ink">Apni Pathshala</span>
          </div>

          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-ink mb-2">
                Welcome back
              </h2>
              <p className="text-slate-500">
                Sign in to access the dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@apnipathshala.org"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox id="remember" />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <Button type="button" variant="link" className="h-auto p-0 text-indigo-600">
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group w-full gap-2 py-6 text-base"
              >
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

            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-center text-sm text-slate-500">
                Protected by Student Safety Software
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
