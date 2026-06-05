'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface Category {
  name: string
  icon: string | null
  color: string | null
}

interface Budget {
  id: string
  category_id: string
  monthly_limit: number
  categories: Category | null
}

interface BudgetsListProps {
  budgets: Budget[]
  spentMap: Record<string, number>
}

export function BudgetsList({ budgets, spentMap }: BudgetsListProps) {
  const { formatAmount } = useUserPreferences()

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {budgets && budgets.length > 0 ? (
        budgets.map((budget) => {
          const cat = budget.categories
          const color = cat?.color || '#6366f1'
          const icon = cat?.icon || '📦'

          // Live spend from real transactions this month
          const spent = spentMap[budget.category_id] ?? 0
          const limit = Number(budget.monthly_limit)
          const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
          const isOverBudget = spent > limit
          const isWarning = !isOverBudget && percentage >= 80

          const barColor = isOverBudget
            ? '#ef4444'
            : isWarning
            ? '#f59e0b'
            : color

          return (
            <Card
              key={budget.id}
              className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {/* Category icon badge */}
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl flex-shrink-0"
                      style={{
                        backgroundColor: color + '1a',
                        border: `1.5px solid ${color}33`,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">
                        {cat?.name || 'Unknown Category'}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">Monthly Budget</CardDescription>
                    </div>
                  </div>
                  {/* Color dot */}
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Amount row */}
                  <div className="flex justify-between items-end">
                    <div>
                      <span
                        className="text-2xl font-bold"
                        style={{ color: isOverBudget ? '#ef4444' : undefined }}
                      >
                        {formatAmount(spent)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">spent</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      of {formatAmount(limit)}
                    </span>
                  </div>

                  {/* Progress bar — inline style for dynamic color */}
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    {isOverBudget ? (
                      <p className="text-xs font-medium text-red-500">
                        ⚠️ {formatAmount(spent - limit)} over budget!
                      </p>
                    ) : isWarning ? (
                      <p className="text-xs font-medium text-amber-500">
                        🔔 {formatAmount(limit - spent)} left — nearing limit
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {formatAmount(limit - spent)} remaining
                      </p>
                    )}
                    <span
                      className="text-xs font-semibold"
                      style={{ color: barColor }}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <div className="text-5xl">💰</div>
          <div>
            <p className="font-medium text-foreground">No budgets set up yet</p>
            <p className="text-sm mt-1">Click &quot;Create Budget&quot; to set your first spending limit.</p>
          </div>
        </div>
      )}
    </div>
  )
}
