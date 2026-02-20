import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Loader2,
  Building2,
  MapPin,
  Phone,
  User,
  Search,
  Users,
  ArrowRight,
  BarChart3,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCenters, syncCenters } from '../services/api'


function CenterCard({ center, index }) {
  return (
    <Card
      className="p-5 opacity-0 animate-fadeIn"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            {center.code?.slice(0, 2) || center.name?.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-ink">{center.name}</h3>
            <p className="text-sm text-slate-400 font-mono">{center.code}</p>
            {center.pmsPodId && (
              <p className="text-xs text-slate-400 font-mono">POD ID: {center.pmsPodId}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {(center.city || center.state) && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{[center.city, center.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {center.contactName && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4 text-slate-400" />
            <span>{center.contactName}</span>
          </div>
        )}
        {center.contactPhone && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{center.contactPhone}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">
            {center.studentCount || 0} student{center.studentCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={center.isActive !== false ? 'status-online' : 'w-2 h-2 bg-slate-300 rounded-full'} />
          <span className={`text-xs font-medium ${center.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
            {center.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <Button variant="ghost" asChild className="mt-3 gap-2 text-indigo-600 hover:text-indigo-700">
        <Link to={`/centers/${center._id}`}>
          <BarChart3 className="h-4 w-4" />
          View Stats
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  )
}

function CenterListItem({ center, index }) {
  return (
    <Card
      className="flex flex-col gap-4 px-5 py-4 opacity-0 animate-fadeIn lg:flex-row lg:items-center lg:justify-between"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/20">
          {center.code?.slice(0, 2) || center.name?.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-ink">{center.name}</h3>
          <p className="text-sm text-slate-400 font-mono">{center.code}</p>
          {center.pmsPodId && (
            <p className="text-xs text-slate-400 font-mono">POD ID: {center.pmsPodId}</p>
          )}
          {(center.city || center.state) && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{[center.city, center.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="w-4 h-4 text-slate-400" />
          <span>
            {center.studentCount || 0} student{center.studentCount !== 1 ? 's' : ''}
          </span>
        </div>
        {center.contactName && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4 text-slate-400" />
            <span>{center.contactName}</span>
          </div>
        )}
        {center.contactPhone && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{center.contactPhone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className={center.isActive !== false ? 'status-online' : 'w-2 h-2 bg-slate-300 rounded-full'} />
          <span className={`text-xs font-medium ${center.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
            {center.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <Button variant="ghost" asChild className="gap-2 text-indigo-600 hover:text-indigo-700">
        <Link to={`/centers/${center._id}`}>
          <BarChart3 className="h-4 w-4" />
          View Stats
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  )
}


function Centers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    status: 'all'
  })
  const [viewMode, setViewMode] = useState('card')
  const [page, setPage] = useState(1)
  const pageSize = 9

  const { data, isLoading } = useQuery({
    queryKey: ['centers'],
    queryFn: () => getCenters().then((res) => res.data)
  })

  const syncMutation = useMutation({
    mutationFn: syncCenters,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['centers'])
      const summary = response?.data?.data
      if (summary) {
        toast.success(`Synced centers. Added ${summary.created}, updated ${summary.updated}.`)
      } else {
        toast.success('Centers synced successfully!')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to sync centers')
    }
  })


  const centers = data?.data || []
  const filteredCenters = centers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())

    const matchesState = filters.state
      ? (c.state || '').toLowerCase().includes(filters.state.toLowerCase())
      : true

    const matchesCity = filters.city
      ? (c.city || '').toLowerCase().includes(filters.city.toLowerCase())
      : true

    const matchesStatus =
      filters.status === 'all'
        ? true
        : filters.status === 'active'
        ? c.isActive !== false
        : c.isActive === false

    return matchesSearch && matchesState && matchesCity && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredCenters.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedCenters = filteredCenters.slice(startIndex, startIndex + pageSize)

  useEffect(() => {
    setPage(1)
  }, [search, filters.state, filters.city, filters.status])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Learning Centers</h1>
          <p className="text-slate-500 mt-1">
            Manage your {centers.length} learning center{centers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          className="gap-2"
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync from PMS
        </Button>
      </div>


      {/* Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
            placeholder="Search centers by name or code..."
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            value={filters.state}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
            className="w-full sm:w-40"
            placeholder="State"
          />
          <Input
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full sm:w-40"
            placeholder="City"
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <Button
              type="button"
              variant={viewMode === 'card' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('card')}
              className="h-9 w-9"
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-9 w-9"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>


      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading centers...</p>
          </div>
        </div>
      ) : centers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No centers yet</h3>
          <p className="mt-2 text-slate-500">Sync with PMS to load your learning centers.</p>
          <Button
            onClick={() => syncMutation.mutate()}
            className="mt-6 gap-2"
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync from PMS
          </Button>
        </Card>

      ) : filteredCenters.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">No results found</h3>
          <p className="mt-2 text-slate-500">Try adjusting your search terms.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {paginatedCenters.length} of {filteredCenters.length} center{filteredCenters.length !== 1 ? 's' : ''}
            </span>
            <span>
              Page {safePage} of {totalPages}
            </span>
          </div>
          {viewMode === 'card' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCenters.map((center, i) => (
                <CenterCard
                  key={center._id}
                  center={center}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedCenters.map((center, i) => (
                <CenterListItem
                  key={center._id}
                  center={center}
                  index={i}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredCenters.length)} of {filteredCenters.length}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className={safePage === 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).slice(0, 5).map((_, index) => {
                  const pageNumber = index + 1
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        isActive={pageNumber === safePage}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className={safePage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}


    </div>
  )
}

export default Centers
