'use client'

import { useState, useMemo } from 'react'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EditSubscriptionModal, SubscriptionModal } from '@/components/subscriptions/SubscriptionModal'
import {
  CreditCard, Calendar, RefreshCw, DollarSign, Search, X, AlertCircle
} from 'lucide-react'

interface Subscription {
  id: string
  name: string
  amount: number
  renewal_date: string
  billing_cycle: string
}

interface SubscriptionsClientProps {
  subscriptions: Subscription[]
}

export function SubscriptionsClient({ subscriptions }: SubscriptionsClientProps) {
  const { formatDate, formatAmount } = useUserPreferences()
  const [search, setSearch] = useState('')

  // ─── Calculations ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let monthlyTotal = 0
    let annualTotal = 0
    let nextRenewal: Subscription | null = null
    let minDaysToRenewal = Infinity

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    for (const sub of subscriptions) {
      const amt = Number(sub.amount)
      if (sub.billing_cycle === 'monthly') {
        monthlyTotal += amt
        annualTotal += amt * 12
      } else {
        monthlyTotal += amt / 12
        annualTotal += amt
      }

      // Calculate days to renewal
      const renDate = new Date(sub.renewal_date)
      renDate.setHours(0, 0, 0, 0)
      
      // If renewal date has passed, calculate next occurrence
      if (renDate < now) {
        while (renDate < now) {
          if (sub.billing_cycle === 'monthly') {
            renDate.setMonth(renDate.getMonth() + 1)
          } else {
            renDate.setFullYear(renDate.getFullYear() + 1)
          }
        }
      }

      const diffTime = renDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays >= 0 && diffDays < minDaysToRenewal) {
        minDaysToRenewal = diffDays
        nextRenewal = { ...sub, renewal_date: renDate.toISOString().split('T')[0] }
      }
    }

    return {
      monthlyTotal,
      annualTotal,
      activeCount: subscriptions.length,
      nextRenewal,
      daysToNextRenewal: minDaysToRenewal === Infinity ? null : minDaysToRenewal
    }
  }, [subscriptions])

  // ─── Filter pipeline ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return subscriptions.filter(sub => 
      sub.name.toLowerCase().includes(search.toLowerCase().trim())
    )
  }, [subscriptions, search])

  // Helper for rendering days remaining badge
  const getRenewalBadge = (renewalDateStr: string, cycle: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const renDate = new Date(renewalDateStr)
    renDate.setHours(0, 0, 0, 0)

    if (renDate < now) {
      while (renDate < now) {
        if (cycle === 'monthly') {
          renDate.setMonth(renDate.getMonth() + 1)
        } else {
          renDate.setFullYear(renDate.getFullYear() + 1)
        }
      }
    }

    const diffDays = Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { text: 'Renews Today', className: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30' }
    if (diffDays === 1) return { text: 'Renews Tomorrow', className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30' }
    if (diffDays <= 7) return { text: `Renews in ${diffDays} days`, className: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30' }
    return { text: `Renews in ${diffDays} days`, className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60' }
  }

  return (
    <div className="space-y-6">
      {/* ─── Statistics Grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Monthly commitment */}
        <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.monthlyTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total recurring / month</p>
          </CardContent>
        </Card>

        {/* Annual commitment */}
        <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Cost</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <RefreshCw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.annualTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total recurring / year</p>
          </CardContent>
        </Card>

        {/* Active Subscriptions Count */}
        <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active paid subscriptions</p>
          </CardContent>
        </Card>

        {/* Next Renewal */}
        <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {stats.nextRenewal ? (
              <>
                <div className="text-lg font-bold truncate">{stats.nextRenewal.name}</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formatDate(stats.nextRenewal.renewal_date)} ({stats.daysToNextRenewal === 0 ? 'Today' : `${stats.daysToNextRenewal}d left`})
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">No active renewals.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Search and Header Row ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="sub-search"
            placeholder="Search subscriptions..."
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

        <SubscriptionModal />
      </div>

      {/* ─── Grid List ────────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sub) => {
            const badge = getRenewalBadge(sub.renewal_date, sub.billing_cycle)
            const amt = Number(sub.amount)

            return (
              <Card key={sub.id} className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl overflow-hidden hover:scale-[1.01] transition-transform duration-200">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold">{sub.name}</CardTitle>
                    <span className={`inline-block text-[10px] uppercase font-bold tracking-wide rounded-full px-2 py-0.5 ${
                      sub.billing_cycle === 'monthly'
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/45'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/45'
                    }`}>
                      {sub.billing_cycle}
                    </span>
                  </div>
                  <EditSubscriptionModal subscription={sub} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formatAmount(amt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /{sub.billing_cycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Next renewal:</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatDate(sub.renewal_date)}
                      </span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground bg-white/20 dark:bg-zinc-900/20 backdrop-blur-md rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <AlertCircle className="h-8 w-8 text-zinc-400" />
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">No subscriptions found</p>
            <p className="text-xs mt-1">
              {search ? 'Try adjusting your search terms.' : 'Add your first recurring subscription to start tracking!'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
