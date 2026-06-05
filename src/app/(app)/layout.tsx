import { AppLayoutClient } from '@/components/layout/AppLayoutClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserPreferencesProvider } from '@/components/providers/UserPreferencesContext'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch profile for preferences — use select('*') so optional columns
  // from later migrations (date_format, number_format) don't break the query.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <UserPreferencesProvider
      initialPreferences={{
        currency:      profile?.currency      ?? 'USD',
        dateFormat:    (profile?.date_format  ?? 'MMM_d_yyyy') as 'MMM_d_yyyy' | 'dd_MM_yyyy' | 'MM_dd_yyyy' | 'yyyy_MM_dd',
        numberFormat:  (profile?.number_format ?? 'comma') as 'comma' | 'dot' | 'space',
        monthlyIncome: profile?.monthly_income ? Number(profile.monthly_income) : null,
      }}
    >
      <AppLayoutClient>{children}</AppLayoutClient>
    </UserPreferencesProvider>
  )
}
