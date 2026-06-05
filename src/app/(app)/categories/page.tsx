import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryModal } from '@/components/categories/CategoryModal'
import { CategoryCard } from '@/components/categories/CategoryCard'
import { Globe, User } from 'lucide-react'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  const systemCategories = categories?.filter((c) => c.user_id === null) ?? []
  const personalCategories = categories?.filter((c) => c.user_id === user.id) ?? []

  const expenseSystem = systemCategories.filter((c) => c.type === 'expense')
  const incomeSystem = systemCategories.filter((c) => c.type === 'income')
  const expensePersonal = personalCategories.filter((c) => c.type === 'expense')
  const incomePersonal = personalCategories.filter((c) => c.type === 'income')

  return (
    <div className="flex-1 space-y-8 pt-2 pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            System defaults are available to everyone. Your personal categories are only visible to you.
          </p>
        </div>
        <CategoryModal />
      </div>

      {/* System Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Globe className="h-4 w-4 text-zinc-500" />
          </div>
          <h3 className="font-semibold text-lg">System Categories</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {systemCategories.length} total
          </span>
        </div>

        {/* Expense */}
        {expenseSystem.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pl-1">Expense</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {expenseSystem.map((cat) => (
                <CategoryCard key={cat.id} category={cat} isSystem />
              ))}
            </div>
          </div>
        )}

        {/* Income */}
        {incomeSystem.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pl-1">Income</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {incomeSystem.map((cat) => (
                <CategoryCard key={cat.id} category={cat} isSystem />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Personal Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-lg">My Categories</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            {personalCategories.length} custom
          </span>
        </div>

        {personalCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-16 text-center">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">No personal categories yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &ldquo;Add Category&rdquo; to create your first custom category.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {expensePersonal.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pl-1">Expense</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {expensePersonal.map((cat) => (
                    <CategoryCard key={cat.id} category={cat} isSystem={false} />
                  ))}
                </div>
              </div>
            )}
            {incomePersonal.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pl-1">Income</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {incomePersonal.map((cat) => (
                    <CategoryCard key={cat.id} category={cat} isSystem={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
