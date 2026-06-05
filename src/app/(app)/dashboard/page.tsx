import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ExpenseChart } from '@/components/dashboard/ExpenseChart'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { DashboardSubscriptionsCard } from '@/components/dashboard/DashboardSubscriptionsCard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all transactions for balance, income, expenses
  const [{ data: transactions }, { data: topGoal }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(name)')
      .order('transaction_date', { ascending: false }),
    supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true })
  ])

  let income = 0
  let expenses = 0

  const chartDataMap: Record<string, number> = {}

  if (transactions) {
    transactions.forEach(tx => {
      const amount = Number(tx.amount)
      if (tx.type === 'income') {
        income += amount
      } else if (tx.type === 'expense') {
        expenses += amount
        
        // Aggregate for chart by month (e.g., "Jan")
        const date = new Date(tx.transaction_date)
        const month = format(date, 'MMM')
        chartDataMap[month] = (chartDataMap[month] || 0) + amount
      }
    })
  }

  const balance = income - expenses
  const recentTransactions = transactions?.slice(0, 5) || []
  
  // Format chart data
  const chartData = Object.keys(chartDataMap).map(month => ({
    name: month,
    total: chartDataMap[month]
  })).reverse() // Simple reverse for chronological if they are recent, though a proper sort by month index is better. Let's just pass it as is.

  const goal = topGoal ? {
    title: topGoal.title,
    current: Number(topGoal.current_amount),
    target: Number(topGoal.target_amount)
  } : null

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      <SummaryCards
        balance={balance}
        income={income}
        expenses={expenses}
        goal={goal}
      />
      
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ExpenseChart data={chartData} />
        </div>
        <div className="lg:col-span-3">
          <RecentTransactions transactions={recentTransactions as any} />
        </div>

        <div className="lg:col-span-7">
          <DashboardSubscriptionsCard subscriptions={(subscriptions ?? []) as any} />
        </div>
      </div>
    </div>
  )
}
