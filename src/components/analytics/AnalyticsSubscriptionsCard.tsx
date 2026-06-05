'use client'

import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface Subscription {
  id: string
  name: string
  amount: number
  renewal_date: string
  billing_cycle: string
}

interface AnalyticsSubscriptionsCardProps {
  subscriptions: Subscription[]
  totalExpenses: number
}

const COLORS = ['#6366f1', '#a78bfa']

const tooltipStyle = {
  backgroundColor: 'rgba(24, 24, 27, 0.9)',
  borderRadius: '8px',
  border: 'none',
  color: '#fff',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
}

export function AnalyticsSubscriptionsCard({ subscriptions, totalExpenses }: AnalyticsSubscriptionsCardProps) {
  const { formatAmount } = useUserPreferences()

  const data = typeof window !== 'undefined' ? (() => {
    let monthlySubSum = 0
    let monthlyCount = 0
    let annualCount = 0

    subscriptions.forEach((sub) => {
      const amt = Number(sub.amount)
      if (sub.billing_cycle === 'monthly') {
        monthlySubSum += amt
        monthlyCount++
      } else {
        monthlySubSum += amt / 12
        annualCount++
      }
    })

    const oneOffExpenses = Math.max(0, totalExpenses - monthlySubSum)
    const subscriptionRatio = totalExpenses > 0 ? (monthlySubSum / totalExpenses) * 100 : 0

    const subBreakdown = [
      { name: 'Monthly Cycle', value: monthlySubSum * (monthlyCount / (monthlyCount + annualCount || 1)) },
      { name: 'Annual Cycle', value: monthlySubSum * (annualCount / (monthlyCount + annualCount || 1)) },
    ].filter(d => d.value > 0)

    return {
      monthlySubSum,
      oneOffExpenses,
      subscriptionRatio,
      monthlyCount,
      annualCount,
      subBreakdown
    }
  })() : {
    monthlySubSum: 0,
    oneOffExpenses: 0,
    subscriptionRatio: 0,
    monthlyCount: 0,
    annualCount: 0,
    subBreakdown: []
  }

  const { monthlySubSum, oneOffExpenses, subscriptionRatio, monthlyCount, annualCount, subBreakdown } = data
  const hasSubscriptions = subscriptions.length > 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Cost Split & Ratio Card */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Subscriptions vs General Expenses</CardTitle>
          <CardDescription>Compare monthly recurring commitments to total expenditures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center pt-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Recurring Monthly</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatAmount(monthlySubSum)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subscription Ratio</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                {subscriptionRatio.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                style={{ width: `${subscriptionRatio}%` }}
                title={`Subscriptions: ${subscriptionRatio.toFixed(1)}%`}
              />
              <div
                className="h-full bg-zinc-300 dark:bg-zinc-700 transition-all duration-500 flex-1"
                title={`General: ${(100 - subscriptionRatio).toFixed(1)}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                Subscriptions ({formatAmount(monthlySubSum)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                General ({formatAmount(oneOffExpenses)})
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/10 border border-zinc-100 dark:border-zinc-800/30 text-xs text-muted-foreground leading-relaxed">
            Recurring subscriptions represent **{subscriptionRatio.toFixed(0)}%** of your total monthly expenditures. Keeping track of active memberships and terminating unused services is one of the fastest ways to improve your savings rate!
          </div>
        </CardContent>
      </Card>

      {/* Cycle Breakdown Chart */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Subscription Cycle Breakdown</CardTitle>
          <CardDescription>Distribution of active paid service contracts by cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full relative">
            {hasSubscriptions ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {subBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => typeof value === 'number' ? [formatAmount(value), 'Value'] : [value, '']}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active subscription contracts to categorize.
              </div>
            )}
          </div>
          <div className="flex justify-around text-center text-xs text-muted-foreground pt-2">
            <div>
              <p className="font-semibold text-zinc-950 dark:text-zinc-50 text-sm">{monthlyCount}</p>
              <p>Monthly Services</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-950 dark:text-zinc-50 text-sm">{annualCount}</p>
              <p>Annual Contracts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
