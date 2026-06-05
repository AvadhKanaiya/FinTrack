import { BudgetModal } from '@/components/budgets/BudgetModal'
import { BudgetsList } from '@/components/budgets/BudgetsList'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Current month date range
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  // Fetch budgets with category info
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, categories(name, icon, color)')
    .order('created_at', { ascending: false })

  // Fetch all expense transactions for this month, grouped by category
  const { data: txData } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('type', 'expense')
    .gte('transaction_date', firstOfMonth)
    .lte('transaction_date', lastOfMonth)

  // Build a map: category_id → total spent this month
  const spentMap: Record<string, number> = {}
  for (const tx of txData ?? []) {
    if (!tx.category_id) continue
    spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + Number(tx.amount)
  }

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budgets</h2>
          <p className="text-sm text-muted-foreground mt-1">Spending limits for {monthLabel}</p>
        </div>
        <BudgetModal />
      </div>

      <BudgetsList budgets={(budgets ?? []) as any} spentMap={spentMap} />
    </div>
  )
}
