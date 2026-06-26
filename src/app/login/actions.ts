'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notifications/email'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'


export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const adminClient = createAdminClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Validate email format (requires domain with dot, e.g. name@example.com, no name@text allowed)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  // 1. Create the user in unconfirmed state via admin client
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  })

  if (createError) {
    return { error: createError.message }
  }

  // 2. Generate the verification link via admin client
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
    },
  })

  if (linkError) {
    return { error: `Account created, but failed to generate verification link: ${linkError.message}` }
  }

  const tokenHash = linkData?.properties?.hashed_token
  if (!tokenHash) {
    return { error: 'Failed to generate verification link.' }
  }

  const actionLink = `${getBaseUrl()}/auth/callback?token_hash=${tokenHash}&type=signup`

  // 3. Send the verification email using custom SMTP settings
  const emailHtml = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; height: 48px; width: 48px; align-items: center; justify-content: center; background-color: #4f46e5; color: #ffffff; margin-bottom: 16px; border-radius: 12px;">
          <span style="font-size: 24px; font-weight: bold; font-family: system-ui, sans-serif;">F</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0;">Welcome to FinTrack</h1>
        <p style="font-size: 14px; color: #71717a; margin: 4px 0 0 0;">Your personalized financial companion</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">Thank you for signing up! Please verify your email address to activate your account and start tracking your expenses.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);">Verify Email Address</a>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #71717a; text-align: center;">If the button doesn't work, copy and paste the link below into your browser:<br/>
      <a href="${actionLink}" style="color: #4f46e5; word-break: break-all;">${actionLink}</a></p>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center; font-size: 12px; color: #a1a1aa;">
        © ${new Date().getFullYear()} FinTrack. All rights reserved.
      </div>
    </div>
  `

  const emailResult = await sendEmail({
    to: email,
    subject: 'Welcome to FinTrack: Verify your email address',
    html: emailHtml,
  })

  if (!emailResult?.success) {
    return { error: 'Account created, but failed to send verification email.' }
  }

  return { success: true, message: 'Verification email sent! Please check your inbox.' }
}

export async function forgotPassword(formData: FormData) {
  const adminClient = createAdminClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return { error: 'Email is required.' }
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  // Generate the recovery verification link via admin client
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${getBaseUrl()}/auth/reset-password`,
    },
  })

  if (linkError) {
    return { error: linkError.message }
  }

  const tokenHash = linkData?.properties?.hashed_token
  if (!tokenHash) {
    return { error: 'Failed to generate password reset token.' }
  }

  const actionLink = `${getBaseUrl()}/auth/reset-password?token_hash=${tokenHash}`

  // Send the recovery email using custom SMTP settings
  const emailHtml = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; height: 48px; width: 48px; align-items: center; justify-content: center; background-color: #4f46e5; color: #ffffff; margin-bottom: 16px; border-radius: 12px;">
          <span style="font-size: 24px; font-weight: bold; font-family: system-ui, sans-serif;">F</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0;">Reset Your Password</h1>
        <p style="font-size: 14px; color: #71717a; margin: 4px 0 0 0;">Password recovery for FinTrack</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">We received a request to reset the password for your FinTrack account. Please click the button below to set a new password.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);">Reset Password</a>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #71717a; text-align: center;">If you did not request this, you can safely ignore this email.</p>
      
      <p style="font-size: 13px; line-height: 1.5; color: #71717a; text-align: center;">If the button doesn't work, copy and paste the link below into your browser:<br/>
      <a href="${actionLink}" style="color: #4f46e5; word-break: break-all;">${actionLink}</a></p>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center; font-size: 12px; color: #a1a1aa;">
        © ${new Date().getFullYear()} FinTrack. All rights reserved.
      </div>
    </div>
  `

  const emailResult = await sendEmail({
    to: email,
    subject: 'FinTrack: Reset your password',
    html: emailHtml,
  })

  if (!emailResult?.success) {
    return { error: 'Failed to send password reset email. Please check your SMTP settings.' }
  }

  return { success: true, message: 'Password reset link sent! Please check your inbox.' }
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

