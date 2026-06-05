'use client'

import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface AnalyticsOverviewProps {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
}

export function AnalyticsOverview({ totalIncome, totalExpenses, savingsRate }: AnalyticsOverviewProps) {
  const { formatAmount } = useUserPreferences()

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6">
        <p className="text-sm font-medium text-muted-foreground">Total Income</p>
        <p className="text-3xl font-bold mt-1 text-emerald-500">
          {formatAmount(totalIncome)}
        </p>
      </div>
      <div className="rounded-xl border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6">
        <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
        <p className="text-3xl font-bold mt-1 text-red-500">
          {formatAmount(totalExpenses)}
        </p>
      </div>
      <div className="rounded-xl border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6">
        <p className="text-sm font-medium text-muted-foreground">Savings Rate</p>
        <p className={`text-3xl font-bold mt-1 ${savingsRate >= 0 ? 'text-indigo-500' : 'text-red-500'}`}>
          {savingsRate}%
        </p>
      </div>
    </div>
  )
}
