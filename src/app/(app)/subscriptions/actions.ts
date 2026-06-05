'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const amount = formData.get('amount') as string
  const renewal_date = formData.get('renewal_date') as string
  const billing_cycle = formData.get('billing_cycle') as string

  if (!name || !amount || !renewal_date || !billing_cycle) {
    return { error: 'Please fill in all fields.' }
  }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: name.trim(),
    amount: parseFloat(amount),
    renewal_date,
    billing_cycle,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  revalidatePath('/analytics')
  return { success: true }
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const amount = formData.get('amount') as string
  const renewal_date = formData.get('renewal_date') as string
  const billing_cycle = formData.get('billing_cycle') as string

  if (!name || !amount || !renewal_date || !billing_cycle) {
    return { error: 'Please fill in all fields.' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      name: name.trim(),
      amount: parseFloat(amount),
      renewal_date,
      billing_cycle,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  revalidatePath('/analytics')
  return { success: true }
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  revalidatePath('/analytics')
  return { success: true }
}
