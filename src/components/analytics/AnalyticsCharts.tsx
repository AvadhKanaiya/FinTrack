'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useUserPreferences } from '@/components/providers/UserPreferencesContext'

interface CategoryData {
  name: string
  total: number
  color: string
}

interface MonthlyData {
  name: string
  income: number
  expenses: number
}

interface AnalyticsChartsProps {
  categoryData: CategoryData[]
  monthlyData: MonthlyData[]
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e',
]

const tooltipStyle = {
  backgroundColor: 'rgba(24, 24, 27, 0.9)',
  borderRadius: '8px',
  border: 'none',
  color: '#fff',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
}

export function AnalyticsCharts({ categoryData, monthlyData }: AnalyticsChartsProps) {
  const { formatAmount } = useUserPreferences()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const hasCategory = categoryData.length > 0
  const hasMonthly = monthlyData.some((m) => m.income > 0 || m.expenses > 0)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Income vs Expenses */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl md:col-span-2">
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>Monthly comparison for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {!mounted ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading comparison chart...
              </div>
            ) : hasMonthly ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800 opacity-50" />
                  <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatAmount(v, true, 0)} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => typeof value === 'number' ? [formatAmount(value), ''] : [value, '']} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="expenses" name="Expenses" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No transaction data yet. Add transactions to see your trends.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spending by Category Pie */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Where your money goes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {!mounted ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading category chart...
              </div>
            ) : hasCategory ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => typeof value === 'number' ? [formatAmount(value), ''] : [value, '']}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No expense data yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Categories list */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Top Spending Categories</CardTitle>
          <CardDescription>Your biggest expense areas</CardDescription>
        </CardHeader>
        <CardContent>
          {hasCategory ? (
            <div className="space-y-4 mt-2">
              {categoryData.map((cat, index) => {
                const totalAll = categoryData.reduce((s, c) => s + c.total, 0)
                const pct = totalAll > 0 ? Math.round((cat.total / totalAll) * 100) : 0
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium truncate max-w-[140px]">{cat.name}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{formatAmount(cat.total)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
              No expense categories yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
