import { TransactionModal } from '@/components/transactions/TransactionModal'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, categories(id, name, icon, color)')
      .order('transaction_date', { ascending: false }),
    supabase
      .from('categories')
      .select('id, name, icon, color')
      .order('name'),
  ])

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <TransactionModal />
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TransactionFilters
        transactions={(transactions ?? []) as any}
        categories={categories ?? []}
      />
    </div>
  )
}
