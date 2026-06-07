'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkBudgetAndThresholds, checkGoalMilestones } from '@/lib/notifications/service'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const type = formData.get('type') as string
  const amount = formData.get('amount') as string
  const title = formData.get('title') as string
  const category_id = formData.get('category_id') as string
  const transaction_date = formData.get('date') as string
  const note = formData.get('note') as string

  if (!type || !amount || !title || !transaction_date) {
    return { error: 'Please fill in all required fields.' }
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type,
    amount: parseFloat(amount),
    title,
    category_id: category_id || null,
    transaction_date,
    note: note || null,
  })

  if (error) {
    return { error: error.message }
  }

  // Trigger notification checks in the background
  const txAmount = parseFloat(amount)
  checkBudgetAndThresholds(user.id, user.email || '', {
    type,
    amount: txAmount,
    category_id: category_id || null,
    title,
    transaction_date,
  })

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const type = formData.get('type') as string
  const amount = formData.get('amount') as string
  const title = formData.get('title') as string
  const category_id = formData.get('category_id') as string
  const transaction_date = formData.get('date') as string
  const note = formData.get('note') as string

  if (!type || !amount || !title || !transaction_date) {
    return { error: 'Please fill in all required fields.' }
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      type,
      amount: parseFloat(amount),
      title,
      category_id: category_id || null,
      transaction_date,
      note: note || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Trigger notification checks in the background
  const txAmount = parseFloat(amount)
  checkBudgetAndThresholds(user.id, user.email || '', {
    type,
    amount: txAmount,
    category_id: category_id || null,
    title,
    transaction_date,
  })

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const category_id = formData.get('category_id') as string
  const monthly_limit = formData.get('monthly_limit') as string

  if (!category_id || !monthly_limit) {
    return { error: 'Please fill in all required fields.' }
  }

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id,
    monthly_limit: parseFloat(monthly_limit),
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'A budget for this category already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/budgets')
  return { success: true }
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const target_amount = formData.get('target_amount') as string
  const current_amount = formData.get('current_amount') as string
  const deadline = formData.get('deadline') as string
  const icon = formData.get('icon') as string

  if (!title || !target_amount) {
    return { error: 'Please fill in all required fields.' }
  }

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    title,
    target_amount: parseFloat(target_amount),
    current_amount: current_amount ? parseFloat(current_amount) : 0,
    deadline: deadline || null,
    icon: icon || '🎯',
  })

  if (error) {
    return { error: error.message }
  }

  // Trigger goal milestones check if there's initial progress
  const targetVal = parseFloat(target_amount)
  const currentVal = current_amount ? parseFloat(current_amount) : 0
  if (currentVal > 0) {
    checkGoalMilestones(user.id, user.email || '', title, 0, currentVal, targetVal)
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const target_amount = formData.get('target_amount') as string
  const current_amount = formData.get('current_amount') as string
  const deadline = formData.get('deadline') as string
  const icon = formData.get('icon') as string

  // Fetch the old goal progress to check milestones
  const { data: oldGoal } = await supabase
    .from('goals')
    .select('current_amount, title, target_amount')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('goals')
    .update({
      title,
      target_amount: parseFloat(target_amount),
      current_amount: current_amount ? parseFloat(current_amount) : 0,
      deadline: deadline || null,
      icon: icon || '🎯',
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  if (oldGoal) {
    const prevAmount = Number(oldGoal.current_amount || 0)
    const newAmount = parseFloat(current_amount)
    const targetAmount = parseFloat(target_amount)
    checkGoalMilestones(user.id, user.email || '', oldGoal.title, prevAmount, newAmount, targetAmount)
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const icon = formData.get('icon') as string
  const color = formData.get('color') as string

  if (!name || !type) {
    return { error: 'Name and type are required.' }
  }

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: name.trim(),
    type,
    icon: icon || '📦',
    color: color || '#6366f1',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  revalidatePath('/transactions')
  revalidatePath('/budgets')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Only allow deleting personal categories (not system ones)
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // This ensures system categories (user_id = NULL) can't be deleted

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/categories')
  revalidatePath('/transactions')
  revalidatePath('/budgets')
  return { success: true }
}
