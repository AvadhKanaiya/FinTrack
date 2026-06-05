import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubscriptionsClient } from '@/components/subscriptions/SubscriptionsClient'

export const metadata = {
  title: 'Subscriptions — FinTrack',
  description: 'Manage your active paid services and track recurring expenses.',
}

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch subscriptions ordered by renewal date
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .order('renewal_date', { ascending: true })

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your active paid services, streaming memberships, and recurring expenses
        </p>
      </div>

      <SubscriptionsClient subscriptions={(subscriptions ?? []) as any} />
    </div>
  )
}
