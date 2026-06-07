'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Tag,
  Wallet,
  Target,
  CreditCard,
  Bell,
  Settings,
  Loader2,
} from 'lucide-react'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Command as CommandPrimitive } from 'cmdk'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResults {
  transactions: any[]
  goals: any[]
  subscriptions: any[]
  categories: any[]
}

const quickLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Categories', href: '/categories', icon: Tag },
  { name: 'Budgets', href: '/budgets', icon: Wallet },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const { formatAmount, formatDate } = useUserPreferences()
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState<SearchResults>({
    transactions: [],
    goals: [],
    subscriptions: [],
    categories: [],
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Debounce and run queries
  useEffect(() => {
    if (!query.trim()) {
      setResults({ transactions: [], goals: [], subscriptions: [], categories: [] })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const delayDebounce = setTimeout(() => {
      const searchDb = async () => {
        try {
          const [txRes, goalRes, subRes, catRes] = await Promise.all([
            supabase
              .from('transactions')
              .select('id, title, amount, type, transaction_date, categories(name, icon, color)')
              .or(`title.ilike.%${query}%,note.ilike.%${query}%`)
              .order('transaction_date', { ascending: false })
              .limit(5),
            supabase
              .from('goals')
              .select('id, title, current_amount, target_amount, icon')
              .ilike('title', `%${query}%`)
              .limit(3),
            supabase
              .from('subscriptions')
              .select('id, name, amount, billing_cycle')
              .ilike('name', `%${query}%`)
              .limit(3),
            supabase
              .from('categories')
              .select('id, name, icon, color, type')
              .ilike('name', `%${query}%`)
              .limit(3),
          ])

          startTransition(() => {
            setResults({
              transactions: txRes.data || [],
              goals: goalRes.data || [],
              subscriptions: subRes.data || [],
              categories: catRes.data || [],
            })
          })
        } catch (err) {
          console.error('[GlobalSearch] Error fetching results:', err)
        } finally {
          setIsLoading(false)
        }
      }

      searchDb()
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [query, supabase])

  // Listen for Ctrl+K / ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Clear query on close
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  // Navigation helper
  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [router, onOpenChange]
  )

  const hasResults =
    results.transactions.length > 0 ||
    results.goals.length > 0 ||
    results.subscriptions.length > 0 ||
    results.categories.length > 0

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search FinTrack"
      description="Quickly search through transactions, goals, subscriptions, and categories, or jump to pages."
      className="sm:max-w-2xl!"
    >
      <Command shouldFilter={false} className="border-0 shadow-lg dark:bg-zinc-950">
        <div className="flex items-center border-b px-4 dark:border-zinc-800 h-14 gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <CommandPrimitive.Input
            placeholder="Search transactions, budgets, goals..."
            value={query}
            onValueChange={setQuery}
            className="flex-1 bg-transparent py-4 text-base outline-none border-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {(isLoading || isPending) && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>
        <CommandList className="max-h-[350px] overflow-y-auto p-2">
          {/* Empty state */}
          {query.trim() && !isLoading && !isPending && !hasResults && (
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No results found matching "{query}".
            </CommandEmpty>
          )}

          {/* Quick links when empty query */}
          {!query.trim() && (
            <CommandGroup heading="Quick Navigation">
              <div className="grid grid-cols-2 gap-1 p-1">
                {quickLinks.map((link) => (
                  <CommandItem
                    key={link.name}
                    value={link.name}
                    onSelect={() => handleSelect(link.href)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{link.name}</span>
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          )}

          {/* Search results */}
          {query.trim() && hasResults && (
            <>
              {/* Transactions */}
              {results.transactions.length > 0 && (
                <CommandGroup heading="Transactions">
                  {results.transactions.map((tx) => {
                    const cat = tx.categories
                    const isIncome = tx.type === 'income'
                    return (
                      <CommandItem
                        key={tx.id}
                        value={`tx-${tx.id}`}
                        onSelect={() => handleSelect('/transactions')}
                        className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
                            {tx.title}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{formatDate(tx.transaction_date)}</span>
                            {cat && (
                              <span className="inline-flex items-center gap-1">
                                <span>•</span>
                                <span>{cat.icon || '📦'}</span>
                                <span className="truncate">{cat.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold tabular-nums shrink-0 ${
                            isIncome ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {isIncome ? '+' : '−'}
                          {formatAmount(Number(tx.amount))}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {/* Savings Goals */}
              {results.goals.length > 0 && (
                <CommandGroup heading="Savings Goals">
                  {results.goals.map((goal) => {
                    const progress = goal.target_amount > 0 
                      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                      : 0
                    return (
                      <CommandItem
                        key={goal.id}
                        value={`goal-${goal.id}`}
                        onSelect={() => handleSelect('/goals')}
                        className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg leading-none shrink-0">{goal.icon || '🎯'}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
                              {goal.title}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              Progress: {progress.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5 shrink-0">
                          {formatAmount(Number(goal.current_amount))} / {formatAmount(Number(goal.target_amount))}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {/* Subscriptions */}
              {results.subscriptions.length > 0 && (
                <CommandGroup heading="Subscriptions">
                  {results.subscriptions.map((sub) => (
                    <CommandItem
                      key={sub.id}
                      value={`sub-${sub.id}`}
                      onSelect={() => handleSelect('/subscriptions')}
                      className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
                          {sub.name}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 capitalize">
                          Billing cycle: {sub.billing_cycle}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                        {formatAmount(Number(sub.amount))}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Categories */}
              {results.categories.length > 0 && (
                <CommandGroup heading="Categories">
                  {results.categories.map((cat) => {
                    const catColor = cat.color || '#6366f1'
                    return (
                      <CommandItem
                        key={cat.id}
                        value={`cat-${cat.id}`}
                        onSelect={() => handleSelect('/categories')}
                        className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-sm shrink-0"
                            style={{
                              backgroundColor: catColor + '20',
                              color: catColor,
                            }}
                          >
                            {cat.icon || '📦'}
                          </span>
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-xs capitalize font-medium text-muted-foreground bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded px-1.5 py-0.5 shrink-0">
                          {cat.type}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
