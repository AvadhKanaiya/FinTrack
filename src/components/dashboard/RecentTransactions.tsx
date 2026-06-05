'use client'

import { useUserPreferences } from '@/components/providers/UserPreferencesContext'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Category {
  name: string
}

interface Transaction {
  id: string
  title: string
  amount: number
  type: string
  transaction_date: string
  categories: Category | null
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { formatDate, formatAmount } = useUserPreferences()

  return (
    <div className="rounded-xl border-none shadow-md bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6 h-full min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold leading-none tracking-tight text-lg">Recent Transactions</h3>
        <Link
          href="/transactions"
          className="text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-0.5 transition-colors"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {transactions.length > 0 ? (
        <div className="mt-6 space-y-6">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <span className="text-xs font-medium uppercase">
                    {tx.categories?.name ? tx.categories.name[0] : (tx.title[0] || '?')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none truncate max-w-[150px]">{tx.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tx.categories?.name || 'Uncategorized'} • {formatDate(tx.transaction_date)}
                  </p>
                </div>
              </div>
              <div className={`font-semibold tabular-nums ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                {tx.type === 'income' ? '+' : '−'}{formatAmount(Number(tx.amount))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm mt-10">
          No recent transactions.
        </div>
      )}
    </div>
  )
}
