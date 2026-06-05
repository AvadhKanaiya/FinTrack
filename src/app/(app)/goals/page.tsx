import { GoalModal } from '@/components/goals/GoalModal'
import { GoalsList } from '@/components/goals/GoalsList'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Savings Goals</h2>
        <GoalModal />
      </div>

      <GoalsList goals={(goals ?? []) as any} />
    </div>
  )
}
