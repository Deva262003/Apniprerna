import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  ShieldOff,
  Globe,
  Building2,
  User,
  Search,
  MoreVertical,
  Ban,
  ToggleLeft,
  ToggleRight,
  Filter,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import {
  getBlockedSites,
  createBlockedSite,
  updateBlockedSite,
  deleteBlockedSite,
  toggleBlockedSite,
  bulkCreateBlockedSites,
  getBlocklistStats,
  getCenters,
  getStudents
} from '../services/api'


const CATEGORIES = [
  { value: 'adult', label: 'Adult Content', color: 'rose' },
  { value: 'gambling', label: 'Gambling', color: 'orange' },
  { value: 'social_media', label: 'Social Media', color: 'blue' },
  { value: 'gaming', label: 'Gaming', color: 'purple' },
  { value: 'streaming', label: 'Streaming', color: 'pink' },
  { value: 'malware', label: 'Malware', color: 'red' },
  { value: 'violence', label: 'Violence', color: 'amber' },
  { value: 'drugs', label: 'Drugs', color: 'emerald' },
  { value: 'custom', label: 'Custom', color: 'slate' }
]

const SCOPES = [
  { value: 'global', label: 'Everyone', icon: Globe, description: 'Blocks for all students' },
  { value: 'center', label: 'Specific Center', icon: Building2, description: 'Blocks for a center' },
  { value: 'student', label: 'Specific Student', icon: User, description: 'Blocks for one student' }
]

function BlockModal({ open, site, onClose, onSave }) {
  const [form, setForm] = useState({
    pattern: site?.pattern || '',
    patternType: site?.patternType || 'domain',
    category: site?.category || 'custom',
    scope: site?.scope || 'global',
    scopeId: site?.scopeId?._id || '',
    description: site?.description || ''
  })
  const [loading, setLoading] = useState(false)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then(res => res.data)
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents().then(res => res.data),
    enabled: form.scope === 'student'
  })

  const centers = centersData?.data || []
  const students = studentsData?.data || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/25">
              <Ban className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {site ? 'Edit Blocked Site' : 'Block Website'}
              </DialogTitle>
              <DialogDescription>
                {site ? 'Update blocking rule' : 'Add a new site to blocklist'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Website Domain <span className="text-rose-500">*</span>
            </label>
            <Input
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="facebook.com or *.facebook.com"
              required
            />
            <p className="text-xs text-slate-400">
              Use * for wildcards. Example: *.example.com blocks all subdomains
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Category
            </label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Block For
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.scope === value ? 'secondary' : 'outline'}
                  onClick={() => setForm({ ...form, scope: value, scopeId: '' })}
                  className="h-auto flex-col gap-1 py-3"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {form.scope === 'center' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Select Center <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.scopeId || undefined}
                onValueChange={(value) => setForm({ ...form, scopeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a center..." />
                </SelectTrigger>
                <SelectContent>
                  {centers.map(center => (
                    <SelectItem key={center._id} value={center._id}>
                      {center.name} ({center.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.scope === 'student' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Select Student <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.scopeId || undefined}
                onValueChange={(value) => setForm({ ...form, scopeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} ({student.studentCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Reason / Notes
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-[80px] resize-none"
              placeholder="Why is this site being blocked?"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {site ? 'Save Changes' : 'Block Site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function BulkImportModal({ open, onClose, onImport }) {
  const [sites, setSites] = useState('')
  const [scope, setScope] = useState('global')
  const [scopeId, setScopeId] = useState('')
  const [category, setCategory] = useState('custom')
  const [loading, setLoading] = useState(false)

  const { data: centersData } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then(res => res.data)
  })

  const centers = centersData?.data || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const siteList = sites
        .split('\n')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('#'))

      if (siteList.length === 0) {
        toast.error('Please enter at least one site')
        return
      }

      await onImport({ sites: siteList, scope, scopeId, category })
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">Bulk Import</DialogTitle>
              <DialogDescription>Add multiple sites at once</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Websites (one per line)
            </label>
            <Textarea
              value={sites}
              onChange={(e) => setSites(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
              placeholder="facebook.com
instagram.com
tiktok.com
# Lines starting with # are ignored"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Scope</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Everyone</SelectItem>
                  <SelectItem value="center">Specific Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === 'center' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Select Center</label>
              <Select value={scopeId || undefined} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a center..." />
                </SelectTrigger>
                <SelectContent>
                  {centers.map(center => (
                    <SelectItem key={center._id} value={center._id}>{center.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Import Sites
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function BlockedSiteCard({ site, onEdit, onDelete, onToggle, index }) {
  const [showMenu, setShowMenu] = useState(false)
  const category = CATEGORIES.find(c => c.value === site.category) || CATEGORIES[CATEGORIES.length - 1]

  const getScopeBadge = () => {
    if (site.scope === 'global') return { icon: Globe, label: 'Everyone', color: 'indigo' }
    if (site.scope === 'center') return { icon: Building2, label: site.scopeId?.name || 'Center', color: 'purple' }
    return { icon: User, label: site.scopeId?.name || 'Student', color: 'amber' }
  }

  const scopeBadge = getScopeBadge()

  return (
    <Card
      className={`p-4 opacity-0 animate-fadeIn ${!site.isActive ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            site.isActive
              ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
              : 'bg-slate-200 text-slate-500'
          }`}>
            {site.isActive ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-ink truncate">{site.pattern}</h3>
              <Badge variant="secondary" className="text-xs">
                {category.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <scopeBadge.icon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">{scopeBadge.label}</span>
            </div>
            {site.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{site.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={site.isActive ? 'text-emerald-600' : 'text-slate-400'}
            title={site.isActive ? 'Disable' : 'Enable'}
          >
            {site.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </div>
    </Card>
  )

}

function Blocking() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState({ open: false, site: null })
  const [bulkModal, setBulkModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterScope, setFilterScope] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['blocklist', filterScope, filterCategory],
    queryFn: () => getBlockedSites({
      scope: filterScope || undefined,
      category: filterCategory || undefined
    }).then(res => res.data)
  })

  const { data: statsData } = useQuery({
    queryKey: ['blocklist-stats'],
    queryFn: () => getBlocklistStats().then(res => res.data)
  })

  const createMutation = useMutation({
    mutationFn: createBlockedSite,
    onSuccess: () => {
      queryClient.invalidateQueries(['blocklist'])
      queryClient.invalidateQueries(['blocklist-stats'])
      toast.success('Site blocked successfully!')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBlockedSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['blocklist'])
      toast.success('Block rule updated!')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlockedSite,
    onSuccess: () => {
      queryClient.invalidateQueries(['blocklist'])
      queryClient.invalidateQueries(['blocklist-stats'])
      toast.success('Site unblocked')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: toggleBlockedSite,
    onSuccess: () => {
      queryClient.invalidateQueries(['blocklist'])
      queryClient.invalidateQueries(['blocklist-stats'])
    }
  })

  const bulkMutation = useMutation({
    mutationFn: bulkCreateBlockedSites,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['blocklist'])
      queryClient.invalidateQueries(['blocklist-stats'])
      toast.success(res.data.message)
    }
  })

  const handleSave = async (formData) => {
    if (modal.site) {
      await updateMutation.mutateAsync({ id: modal.site._id, data: formData })
    } else {
      await createMutation.mutateAsync(formData)
    }
  }

  const handleDelete = (site) => {
    if (confirm(`Unblock "${site.pattern}"?`)) {
      deleteMutation.mutate(site._id)
    }
  }

  const sites = data?.data || []
  const stats = statsData?.data?.summary || { total: 0, active: 0, global: 0, center: 0, student: 0 }

  const filteredSites = sites.filter(s =>
    s.pattern.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Website Blocking</h1>
          <p className="text-slate-500 mt-1">
            {stats.active} active blocks across {stats.total} rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkModal(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={() => setModal({ open: true, site: null })} className="gap-2">
            <Plus className="h-4 w-4" />
            Block Site
          </Button>
        </div>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <Ban className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Rules</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{stats.global}</p>
              <p className="text-xs text-slate-500">Global</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{stats.center}</p>
              <p className="text-xs text-slate-500">Center-specific</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{stats.student}</p>
              <p className="text-xs text-slate-500">Student-specific</p>
            </div>
          </div>
        </Card>
      </div>


      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
            placeholder="Search blocked sites..."
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filterScope || undefined}
            onValueChange={(value) => setFilterScope(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterCategory || undefined}
            onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
            <p className="text-sm text-slate-500">Loading blocklist...</p>
          </div>
        </div>
      ) : sites.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <Shield className="h-8 w-8 text-rose-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No blocked sites yet</h3>
          <p className="mt-2 text-slate-500">Start blocking distracting or harmful websites.</p>
          <Button
            onClick={() => setModal({ open: true, site: null })}
            className="mt-6 gap-2"
          >
            <Plus className="h-4 w-4" />
            Block Your First Site
          </Button>
        </Card>
      ) : filteredSites.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No results found</h3>
          <p className="mt-2 text-slate-500">Try adjusting your search or filters.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredSites.map((site, i) => (
            <BlockedSiteCard
              key={site._id}
              site={site}
              index={i}
              onEdit={() => setModal({ open: true, site })}
              onDelete={() => handleDelete(site)}
              onToggle={() => toggleMutation.mutate(site._id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <BlockModal
        open={modal.open}
        site={modal.site}
        onClose={() => setModal({ open: false, site: null })}
        onSave={handleSave}
      />
      <BulkImportModal
        open={bulkModal}
        onClose={() => setBulkModal(false)}
        onImport={bulkMutation.mutateAsync}
      />

    </div>
  )
}

export default Blocking
