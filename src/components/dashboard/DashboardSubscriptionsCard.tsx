'use client'

import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import { Card } from '@/components/ui/card'
import { Calendar, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Subscription {
  id: string
  name: string
  amount: number
  renewal_date: string
  billing_cycle: string
}

interface DashboardSubscriptionsCardProps {
  subscriptions: Subscription[]
}

export function DashboardSubscriptionsCard({ subscriptions }: DashboardSubscriptionsCardProps) {
  const { formatDate, formatAmount } = useUserPreferences()

  // Calculate monthly commitment and find top 3 upcoming renewals
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const activeCount = subscriptions.length
  let monthlyTotal = 0

  const processedSubs = subscriptions.map((sub) => {
    const amt = Number(sub.amount)
    if (sub.billing_cycle === 'monthly') {
      monthlyTotal += amt
    } else {
      monthlyTotal += amt / 12
    }

    // Next renewal date calculation
    const renDate = new Date(sub.renewal_date)
    renDate.setHours(0, 0, 0, 0)

    if (renDate < now) {
      while (renDate < now) {
        if (sub.billing_cycle === 'monthly') {
          renDate.setMonth(renDate.getMonth() + 1)
        } else {
          renDate.setFullYear(renDate.getFullYear() + 1)
        }
      }
    }

    const diffDays = Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...sub,
      next_renewal_date: renDate,
      days_remaining: diffDays
    }
  })

  // Sort by closest renewal date
  const upcomingRenewals = processedSubs
    .sort((a, b) => a.days_remaining - b.days_remaining)
    .slice(0, 3)

  if (activeCount === 0) return null

  return (
    <Card className="rounded-xl border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6 overflow-hidden">
      <div className="grid gap-6 md:grid-cols-7 items-center">
        {/* Left side: Stats */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <h3 className="font-semibold leading-none tracking-tight text-lg mb-1">Subscriptions</h3>
            <p className="text-xs text-muted-foreground">Recurring paid commitments</p>
          </div>
          <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 p-4 rounded-xl">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Monthly Commitment</p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatAmount(monthlyTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeCount} active paid services
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-600 font-semibold transition-colors"
          >
            Manage subscriptions
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Right side: Upcoming renewals grid */}
        <div className="md:col-span-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Renewals</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {upcomingRenewals.map((sub) => (
              <div key={sub.id} className="flex flex-col justify-between p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/10 border border-zinc-100/40 dark:border-zinc-800/20 hover:scale-[1.01] transition-transform">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{sub.name}</p>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{sub.billing_cycle}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-bold tabular-nums">{formatAmount(Number(sub.amount))}</span>
                    <span className="text-[10px] text-muted-foreground">/{sub.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-[10px] text-muted-foreground">{formatDate(sub.next_renewal_date.toISOString().split('T')[0])}</span>
                    <span className={`inline-block text-[9px] font-bold rounded-full px-1.5 py-0.2 ${
                      sub.days_remaining === 0
                        ? 'bg-red-100 dark:bg-red-950/30 text-red-600'
                        : sub.days_remaining <= 3
                        ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-600'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}>
                      {sub.days_remaining === 0 ? 'Today' : `${sub.days_remaining}d`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
