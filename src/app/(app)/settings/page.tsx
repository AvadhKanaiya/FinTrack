import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const metadata = {
  title: 'Settings — FinTrack',
  description: 'Manage your account, appearance and notification preferences.',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile — use select('*') so missing optional columns
  // (date_format, number_format from a later migration) don't break the query.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Settings: failed to load profile', profileError.message)
  }

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account, display preferences and notifications
        </p>
      </div>

      <SettingsClient
        user={{
          id:         user.id,
          email:      user.email ?? '',
          created_at: user.created_at,
        }}
        profile={profile ?? null}
      />
    </div>
  )
}
