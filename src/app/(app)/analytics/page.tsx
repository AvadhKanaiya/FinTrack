import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts'
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview'
import { AnalyticsSubscriptionsCard } from '@/components/analytics/AnalyticsSubscriptionsCard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all transactions and subscriptions
  const [{ data: transactions }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .order('transaction_date', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true })
  ])

  // Compute spending by category (expenses only)
  const categoryMap: Record<string, { name: string; total: number; color: string }> = {}
  const monthlyMap: Record<string, { income: number; expenses: number }> = {}

  // Build last 6 months keys
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const key = format(m, 'MMM yyyy')
    monthlyMap[key] = { income: 0, expenses: 0 }
  }

  let totalIncome = 0
  let totalExpenses = 0

  if (transactions) {
    transactions.forEach((tx) => {
      const amount = Number(tx.amount)
      const date = new Date(tx.transaction_date)
      const monthKey = format(date, 'MMM yyyy')

      if (tx.type === 'income') {
        totalIncome += amount
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].income += amount
        }
      } else {
        totalExpenses += amount
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].expenses += amount
        }

        // Category breakdown
        const catName = tx.categories?.name || 'Uncategorized'
        const catColor = tx.categories?.color || '#6366f1'
        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, total: 0, color: catColor }
        }
        categoryMap[catName].total += amount
      }
    })
  }

  const categoryData = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const monthlyData = Object.entries(monthlyMap).map(([name, val]) => ({
    name,
    income: Math.round(val.income * 100) / 100,
    expenses: Math.round(val.expenses * 100) / 100,
  }))

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
    : 0

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <span className="text-sm text-muted-foreground">All time overview</span>
      </div>

      <AnalyticsOverview
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        savingsRate={savingsRate}
      />

      <AnalyticsSubscriptionsCard
        subscriptions={(subscriptions ?? []) as any}
        totalExpenses={totalExpenses}
      />

      <AnalyticsCharts categoryData={categoryData} monthlyData={monthlyData} />
    </div>
  )
}
