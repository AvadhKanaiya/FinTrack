import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsListClient } from '@/components/notifications/NotificationsListClient'

export const metadata = {
  title: 'Notifications — FinTrack',
  description: 'View your alerts, limits, and milestones history.',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View your alerts, limits, and milestones history
        </p>
      </div>

      <NotificationsListClient />
    </div>
  )
}
