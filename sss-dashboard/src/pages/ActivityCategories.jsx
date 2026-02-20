import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tags,
  Filter
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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getActivityCategories,
  createActivityCategory,
  updateActivityCategory,
  deleteActivityCategory,
  getActivityCategoryRules,
  createActivityCategoryRule,
  updateActivityCategoryRule,
  deleteActivityCategoryRule
} from '../services/api'


const COLOR_OPTIONS = [
  { value: 'slate', label: 'Slate' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'rose', label: 'Rose' },
  { value: 'amber', label: 'Amber' },
  { value: 'sky', label: 'Sky' }
]

const PATTERN_TYPES = [
  { value: 'domain', label: 'Domain' },
  { value: 'url', label: 'Full URL' },
  { value: 'regex', label: 'Regex' }
]

function CategoryModal({ open, category, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || 'slate',
    isActive: category?.isActive ?? true
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
              <Tags className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {category ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
              <DialogDescription>Define how activity is categorized.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Color</label>
              <Select value={form.color} onValueChange={(value) => setForm({ ...form, color: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select
                value={form.isActive ? 'true' : 'false'}
                onValueChange={(value) => setForm({ ...form, isActive: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function RuleModal({ open, rule, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    category: rule?.category?._id || '',
    pattern: rule?.pattern || '',
    patternType: rule?.patternType || 'domain',
    isActive: rule?.isActive ?? true
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                {rule ? 'Edit Rule' : 'Assign Domain to Category'}
              </DialogTitle>
              <DialogDescription>Attach domains, URLs, or regex patterns.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <Select
              value={form.category || undefined}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Pattern</label>
            <Input
              value={form.pattern}
              onChange={(event) => setForm({ ...form, pattern: event.target.value })}
              placeholder="example.com or *.example.com"
              required
            />
            <p className="text-xs text-slate-400">Use *.domain.com for subdomains.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Pattern Type</label>
              <Select value={form.patternType} onValueChange={(value) => setForm({ ...form, patternType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pattern type" />
                </SelectTrigger>
                <SelectContent>
                  {PATTERN_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select
                value={form.isActive ? 'true' : 'false'}
                onValueChange={(value) => setForm({ ...form, isActive: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}

function ActivityCategories() {
  const queryClient = useQueryClient()
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedRule, setSelectedRule] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['activityCategories'],
    queryFn: () => getActivityCategories().then((res) => res.data)
  })

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['activityCategoryRules', filterCategory],
    queryFn: () => getActivityCategoryRules({ category: filterCategory || undefined }).then((res) => res.data)
  })

  const categories = categoriesData?.data || []
  const rules = rulesData?.data || []

  const filteredRules = useMemo(() => {
    if (!search) return rules
    return rules.filter((rule) => rule.pattern.toLowerCase().includes(search.toLowerCase()))
  }, [rules, search])

  const createCategoryMutation = useMutation({
    mutationFn: (payload) => createActivityCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategories'] })
      toast.success('Category saved')
    }
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => updateActivityCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategories'] })
      toast.success('Category updated')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => deleteActivityCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategories'] })
      queryClient.invalidateQueries({ queryKey: ['activityCategoryRules'] })
      toast.success('Category deleted')
    }
  })

  const createRuleMutation = useMutation({
    mutationFn: (payload) => createActivityCategoryRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategoryRules'] })
      toast.success('Rule saved')
    }
  })

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, payload }) => updateActivityCategoryRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategoryRules'] })
      toast.success('Rule updated')
    }
  })

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => deleteActivityCategoryRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityCategoryRules'] })
      toast.success('Rule deleted')
    }
  })

  const handleSaveCategory = (payload) => {
    if (selectedCategory) {
      return updateCategoryMutation.mutateAsync({ id: selectedCategory._id, payload })
    }
    return createCategoryMutation.mutateAsync(payload)
  }

  const handleSaveRule = (payload) => {
    if (selectedRule) {
      return updateRuleMutation.mutateAsync({ id: selectedRule._id, payload })
    }
    return createRuleMutation.mutateAsync(payload)
  }

  const handleDeleteCategory = (category) => {
    if (!window.confirm(`Delete ${category.name}? This removes associated rules.`)) return
    deleteCategoryMutation.mutate(category._id)
  }

  const handleDeleteRule = (rule) => {
    if (!window.confirm(`Delete ${rule.pattern}?`)) return
    deleteRuleMutation.mutate(rule._id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Activity Categories</h1>
          <p className="text-slate-500 mt-1">Create categories and map them to domains.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedRule(null)
              setShowRuleModal(true)
            }}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Assign Domain
          </Button>
          <Button
            onClick={() => {
              setSelectedCategory(null)
              setShowCategoryModal(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Category
          </Button>

        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_2fr]">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Categories</h2>
          </div>
          {categoriesLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-500">No categories yet.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category._id} className="flex items-start justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{category.name}</p>
                    <p className="text-xs text-slate-400">{category.description || '—'}</p>
                    <Badge variant={category.isActive ? 'default' : 'outline'} className="mt-2 text-[10px]">
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-indigo-500"
                      onClick={() => {
                        setSelectedCategory(category)
                        setShowCategoryModal(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-500"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold text-ink">Domain Rules</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterCategory || undefined}
                onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 pl-10 text-sm"
                  placeholder="Search domains..."
                />
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {rulesLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : filteredRules.length === 0 ? (
            <p className="text-sm text-slate-500">No rules yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => (
                <div key={rule._id} className="flex items-start justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{rule.pattern}</p>
                    <p className="text-xs text-slate-400">
                      {rule.category?.name} · {rule.patternType}
                    </p>
                    <Badge variant={rule.isActive ? 'default' : 'outline'} className="mt-2 text-[10px]">
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-indigo-500"
                      onClick={() => {
                        setSelectedRule(rule)
                        setShowRuleModal(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-500"
                      onClick={() => handleDeleteRule(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>


      <CategoryModal
        open={showCategoryModal}
        category={selectedCategory}
        onClose={() => {
          setShowCategoryModal(false)
          setSelectedCategory(null)
        }}
        onSave={handleSaveCategory}
      />

      <RuleModal
        open={showRuleModal}
        rule={selectedRule}
        categories={categories}
        onClose={() => {
          setShowRuleModal(false)
          setSelectedRule(null)
        }}
        onSave={handleSaveRule}
      />

    </div>
  )
}

export default ActivityCategories
