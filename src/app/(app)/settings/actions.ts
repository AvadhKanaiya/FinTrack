'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notifications/email'
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

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const adminClient = createAdminClient()

  // Generate the email change verification link via admin client
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'email_change_new',
    email: user.email!,
    newEmail: email,
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
    },
  })

  if (linkError) {
    return { error: linkError.message }
  }

  const tokenHash = linkData?.properties?.hashed_token
  if (!tokenHash) {
    return { error: 'Failed to generate email change verification link.' }
  }

  const actionLink = `${getBaseUrl()}/auth/callback?token_hash=${tokenHash}&type=email_change`

  // Send the verification email using custom SMTP settings
  const emailHtml = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; height: 48px; width: 48px; align-items: center; justify-content: center; background-color: #4f46e5; color: #ffffff; margin-bottom: 16px; border-radius: 12px;">
          <span style="font-size: 24px; font-weight: bold; font-family: system-ui, sans-serif;">F</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0;">Change Email Address</h1>
        <p style="font-size: 14px; color: #71717a; margin: 4px 0 0 0;">Confirm your new email for FinTrack</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">We received a request to change the email address associated with your FinTrack account to <strong>${email}</strong>. Please click the button below to verify this change.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);">Confirm Email Change</a>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #71717a; text-align: center;">If you did not request this change, you can safely ignore this email.</p>
      
      <p style="font-size: 13px; line-height: 1.5; color: #71717a; text-align: center;">If the button doesn't work, copy and paste the link below into your browser:<br/>
      <a href="${actionLink}" style="color: #4f46e5; word-break: break-all;">${actionLink}</a></p>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center; font-size: 12px; color: #a1a1aa;">
        © ${new Date().getFullYear()} FinTrack. All rights reserved.
      </div>
    </div>
  `

  const emailResult = await sendEmail({
    to: email,
    subject: 'FinTrack: Confirm your email address change',
    html: emailHtml,
  })

  if (!emailResult?.success) {
    return { error: 'Failed to send confirmation email. Please check your SMTP settings.' }
  }

  revalidatePath('/settings')
  return { success: true, message: 'A confirmation link has been sent to your new email. Please verify it to complete the change!' }
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

