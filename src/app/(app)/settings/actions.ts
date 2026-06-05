'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Update profile ───────────────────────────────────────────────────────────
// Uses UPDATE + row-count check. The migration_fix_profile_rls.sql script
// ensures every auth user has a profile row and the correct RLS policies.
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const full_name          = (formData.get('full_name')     as string)?.trim() || null
  const avatar_url         = (formData.get('avatar_url')    as string)?.trim() || null
  const currency           = (formData.get('currency')      as string) || 'USD'
  const monthly_income_raw = formData.get('monthly_income') as string
  const monthly_income     = monthly_income_raw ? parseFloat(monthly_income_raw) : null

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, avatar_url, currency, monthly_income })
    .eq('id', user.id)
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { error: 'Profile row not found. Please run the latest database migration and try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Update appearance / display preferences ──────────────────────────────────
// Uses UPDATE + row-count check. Same migration dependency as updateProfile.
export async function updateAppearance(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const theme         = (formData.get('theme')         as string) || 'system'
  const date_format   = (formData.get('date_format')   as string) || 'MMM_d_yyyy'
  const number_format = (formData.get('number_format') as string) || 'comma'

  const { data, error } = await supabase
    .from('profiles')
    .update({ theme, date_format, number_format })
    .eq('id', user.id)
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { error: 'Profile row not found. Please run the latest database migration and try again.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

// ─── Update email ─────────────────────────────────────────────────────────────
export async function updateEmail(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'Email is required.' }
  if (email === user.email) return { error: 'This is already your current email.' }

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${getBaseUrl()}/auth/callback` }
  )
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true, message: 'Email address updated successfully!' }
}

// Helper to derive base URL for email redirects
function getBaseUrl() {
  // Use NEXT_PUBLIC_SITE_URL if set, otherwise fall back to Vercel URL or localhost
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// ─── Update password ──────────────────────────────────────────────────────────
export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const password = formData.get('password') as string
  const confirm  = formData.get('confirm_password') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  return { success: true }
}

// ─── Delete account ───────────────────────────────────────────────────────────
export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.auth.signOut()
  redirect('/login')
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ─── Update notification preferences ──────────────────────────────────────────
export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const notif_budget_alerts = formData.get('notif_budget_alerts') === 'true'
  const notif_goal_milestones = formData.get('notif_goal_milestones') === 'true'
  const notif_weekly_summary = formData.get('notif_weekly_summary') === 'true'
  const notif_large_transactions = formData.get('notif_large_transactions') === 'true'
  const notif_monthly_report = formData.get('notif_monthly_report') === 'true'
  const threshold_raw = formData.get('large_transaction_threshold') as string
  const large_transaction_threshold = threshold_raw ? parseFloat(threshold_raw) : 500

  const { data, error } = await supabase
    .from('profiles')
    .update({
      notif_budget_alerts,
      notif_goal_milestones,
      notif_weekly_summary,
      notif_large_transactions,
      notif_monthly_report,
      large_transaction_threshold,
    })
    .eq('id', user.id)
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { error: 'Profile row not found. Please run the database migration and try again.' }
  }

  revalidatePath('/settings')
  return { success: true }
}

