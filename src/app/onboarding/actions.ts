'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const fullName = formData.get('fullName') as string
  const currency = formData.get('currency') as string
  const monthlyIncome = parseFloat(formData.get('monthlyIncome') as string)
  const theme = formData.get('theme') as string

  // Note: RLS needs to allow users to update their own profile
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      currency: currency,
      monthly_income: monthlyIncome,
      theme: theme
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
