'use client'

import { useState, useMemo, useCallback } from 'react'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditTransactionModal } from '@/components/transactions/TransactionModal'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface Transaction {
  id: string
  type: string
  amount: number
  title: string
  category_id: string | null
  transaction_date: string
  note: string | null
  categories: Category | null
}

type SortField = 'transaction_date' | 'title' | 'amount' | 'category'
type SortDir = 'asc' | 'desc'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

// ─── Sort icon helper ────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60 inline-block" />
  return sortDir === 'asc'
    ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-indigo-500 inline-block" />
    : <ChevronDown className="ml-1 h-3.5 w-3.5 text-indigo-500 inline-block" />
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TransactionFilters({ transactions, categories }: Props) {
  const { formatDate, formatAmount, currencySymbol } = useUserPreferences()
  // ── Sort state ─────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('transaction_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('__all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')
  const [filterType, setFilterType] = useState<string>('__all')

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterCategory !== '__all') count++
    if (filterDateFrom || filterDateTo) count++
    if (filterMinAmount || filterMaxAmount) count++
    if (filterType !== '__all') count++
    return count
  }, [filterCategory, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, filterType])

  // Selected category object for the trigger display
  const selectedCategoryData = useMemo(
    () => categories.find(c => c.id === filterCategory) ?? null,
    [categories, filterCategory]
  )

  // ── Sort toggle ────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      // Same column → flip direction
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      // New column → default to ascending
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField])

  // ── Reset filters ──────────────────────────────────────────────────────────
  const resetFilters = () => {
    setFilterCategory('__all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterMinAmount('')
    setFilterMaxAmount('')
    setFilterType('__all')
    setSearch('')
  }

  // ── Filter + sort pipeline ─────────────────────────────────────────────────
  const processed = useMemo(() => {
    let result = [...transactions]

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        tx =>
          tx.title.toLowerCase().includes(q) ||
          (tx.categories?.name ?? '').toLowerCase().includes(q) ||
          (tx.note ?? '').toLowerCase().includes(q)
      )
    }

    // Type filter
    if (filterType !== '__all') {
      result = result.filter(tx => tx.type === filterType)
    }

    // Category filter
    if (filterCategory !== '__all') {
      if (filterCategory === '__none') {
        result = result.filter(tx => !tx.category_id)
      } else {
        result = result.filter(tx => tx.category_id === filterCategory)
      }
    }

    // Date range filter
    if (filterDateFrom) {
      result = result.filter(tx => tx.transaction_date >= filterDateFrom)
    }
    if (filterDateTo) {
      result = result.filter(tx => tx.transaction_date <= filterDateTo)
    }

    // Amount range filter
    if (filterMinAmount) {
      result = result.filter(tx => Number(tx.amount) >= parseFloat(filterMinAmount))
    }
    if (filterMaxAmount) {
      result = result.filter(tx => Number(tx.amount) <= parseFloat(filterMaxAmount))
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'transaction_date':
          aVal = a.transaction_date
          bVal = b.transaction_date
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'amount':
          aVal = Number(a.amount)
          bVal = Number(b.amount)
          break
        case 'category':
          aVal = (a.categories?.name ?? '').toLowerCase()
          bVal = (b.categories?.name ?? '').toLowerCase()
          break
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [transactions, search, filterType, filterCategory, filterDateFrom, filterDateTo, filterMinAmount, filterMaxAmount, sortField, sortDir])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Search + Filter toggle row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="tx-search"
            placeholder="Search transactions..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          id="tx-filter-toggle"
          variant={showFilters ? 'default' : 'outline'}
          className={`flex items-center gap-2 relative ${showFilters ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600' : ''}`}
          onClick={() => setShowFilters(v => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className={`absolute -top-2 -right-2 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${showFilters ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            id="tx-filter-reset"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-500 gap-1.5"
            onClick={resetFilters}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-xl border bg-white dark:bg-zinc-950 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Type filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v ?? '__all')}>
              <SelectTrigger id="filter-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? '__all')}>
              <SelectTrigger id="filter-category" className="w-full">
                {filterCategory === '__all' ? (
                  <span className="text-muted-foreground">All categories</span>
                ) : filterCategory === '__none' ? (
                  <span>Uncategorized</span>
                ) : selectedCategoryData ? (
                  <span className="flex items-center gap-2">
                    <span>{selectedCategoryData.icon || '📦'}</span>
                    <span>{selectedCategoryData.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">All categories</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All categories</SelectItem>
                <SelectItem value="__none">Uncategorized</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon || '📦'}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date range</label>
            <div className="flex items-center gap-2">
              <Input
                id="filter-date-from"
                type="date"
                className="flex-1 text-sm"
                value={filterDateFrom}
                onChange={e => {
                  const newFrom = e.target.value
                  setFilterDateFrom(newFrom)
                  // Clear "to" if it is now before the new "from"
                  if (filterDateTo && newFrom && filterDateTo < newFrom) {
                    setFilterDateTo('')
                  }
                }}
              />
              <span className="text-muted-foreground text-xs shrink-0">to</span>
              <Input
                id="filter-date-to"
                type="date"
                className="flex-1 text-sm"
                value={filterDateTo}
                min={filterDateFrom || undefined}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Amount range */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount range ({currencySymbol})</label>
            <div className="flex items-center gap-2">
              <Input
                id="filter-amount-min"
                type="number"
                min="0"
                step="0.01"
                className="flex-1 text-sm"
                value={filterMinAmount}
                onChange={e => setFilterMinAmount(e.target.value)}
                placeholder="Min"
              />
              <span className="text-muted-foreground text-xs shrink-0">–</span>
              <Input
                id="filter-amount-max"
                type="number"
                min="0"
                step="0.01"
                className="flex-1 text-sm"
                value={filterMaxAmount}
                onChange={e => setFilterMaxAmount(e.target.value)}
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterType !== '__all' && (
            <FilterChip label={`Type: ${filterType}`} onRemove={() => setFilterType('__all')} />
          )}
          {filterCategory !== '__all' && (
            <FilterChip
              label={`Category: ${filterCategory === '__none' ? 'Uncategorized' : (categories.find(c => c.id === filterCategory)?.name ?? filterCategory)}`}
              onRemove={() => setFilterCategory('__all')}
            />
          )}
          {(filterDateFrom || filterDateTo) && (
            <FilterChip
              label={`Date: ${filterDateFrom || '…'} → ${filterDateTo || '…'}`}
              onRemove={() => { setFilterDateFrom(''); setFilterDateTo('') }}
            />
          )}
          {(filterMinAmount || filterMaxAmount) && (
            <FilterChip
              label={`Amount: ${currencySymbol}${filterMinAmount || '0'} – ${currencySymbol}${filterMaxAmount || '∞'}`}
              onRemove={() => { setFilterMinAmount(''); setFilterMaxAmount('') }}
            />
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{processed.length}</span> of{' '}
        <span className="font-semibold text-foreground">{transactions.length}</span> transactions
      </p>

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Date"
                  field="transaction_date"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Title"
                  field="title"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Category"
                  field="category"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Amount"
                  field="amount"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {processed.length > 0 ? (
                processed.map((tx) => {
                  const cat = tx.categories
                  const catColor = cat?.color || '#6366f1'
                  return (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{tx.title}</div>
                        {tx.note && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{tx.note}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {cat ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
                            style={{
                              backgroundColor: catColor + '1a',
                              color: catColor,
                              border: `1px solid ${catColor}33`,
                            }}
                          >
                            <span className="text-sm leading-none">{cat.icon || '📦'}</span>
                            {cat.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">
                            Uncategorized
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '−'}{formatAmount(Number(tx.amount))}
                      </TableCell>
                      <TableCell>
                        <EditTransactionModal
                          transaction={{
                            id: tx.id,
                            type: tx.type,
                            amount: Number(tx.amount),
                            title: tx.title,
                            category_id: tx.category_id,
                            transaction_date: tx.transaction_date,
                            note: tx.note,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">🔍</span>
                      <p className="font-medium">No transactions match your filters.</p>
                      <button
                        className="text-indigo-500 hover:underline text-sm"
                        onClick={resetFilters}
                      >
                        Clear filters
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ─── Sortable column header ──────────────────────────────────────────────────

function SortableHead({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  className = '',
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
  className?: string
}) {
  const active = sortField === field
  return (
    <TableHead className={className}>
      <button
        className={`inline-flex items-center gap-0.5 font-semibold text-sm select-none transition-colors hover:text-indigo-600 ${active ? 'text-indigo-600' : 'text-muted-foreground'}`}
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </button>
    </TableHead>
  )
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
