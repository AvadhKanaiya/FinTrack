'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Wallet, PiggyBank, Target } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface SummaryCardsProps {
  balance: number
  income: number
  expenses: number
  goal?: { title: string; current: number; target: number } | null
}

export function SummaryCards({ balance, income, expenses, goal }: SummaryCardsProps) {
  const { formatAmount } = useUserPreferences()
  const goalPercentage = goal ? Math.min((goal.current / goal.target) * 100, 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-50/10 dark:text-indigo-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(balance)}</div>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Income</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-50/10 dark:text-emerald-400">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(income)}</div>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-50/10 dark:text-red-400">
            <PiggyBank className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatAmount(expenses)}</div>
        </CardContent>
      </Card>
      
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Savings Goal</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-50/10 dark:text-purple-400">
            <Target className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {goal ? (
            <>
              <div className="text-2xl font-bold">{goalPercentage.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1 truncate">
                {formatAmount(goal.current)} / {formatAmount(goal.target)} to {goal.title}
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-50" style={{ width: `${goalPercentage}%` }} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">No active savings goals.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
