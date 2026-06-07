import { createClient } from '@/lib/supabase/server'
import { sendEmail } from './email'

type NotificationType = 'budget_alert' | 'goal_milestone' | 'large_transaction' | 'system'

interface TriggerNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  emailSubject?: string
  emailHtml?: string
}

export async function triggerNotification({
  userId,
  type,
  title,
  message,
  emailSubject,
  emailHtml,
}: TriggerNotificationParams) {
  try {
    const supabase = await createClient()
    
    // Fetch the user profile settings to check preference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error(`[Notification Service] Failed to fetch profile for user ${userId}:`, profileError?.message)
      return { error: 'Profile not found' }
    }

    const preferenceMap: Record<NotificationType, string> = {
      budget_alert: 'notif_budget_alerts',
      goal_milestone: 'notif_goal_milestones',
      large_transaction: 'notif_large_transactions',
      system: 'system',
    }

    const preferenceKey = preferenceMap[type]
    const isEnabled = preferenceKey === 'system' ? true : !!profile[preferenceKey]

    if (!isEnabled) {
      console.log(`[Notification Service] Notification type "${type}" is disabled in user preferences.`)
      return { success: false, reason: 'Disabled by user preferences' }
    }

    // 1. Insert In-App Notification (RLS policies are handled; server client operates on behalf of user session or service role.
    // In our case, the server client is authenticated as the user because it uses cookies)
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single()

    if (notifError) {
      console.error(`[Notification Service] Failed to create in-app notification:`, notifError.message)
    }

    // 2. Send email if parameters are supplied and setting is on
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email

    if (email && emailSubject && emailHtml) {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
      })
    }

    return { success: true, notification: notifData }
  } catch (err: any) {
    console.error(`[Notification Service] Error triggering notification:`, err.message)
    return { error: err.message }
  }
}

interface TransactionInfo {
  type: string
  amount: number
  category_id: string | null
  title: string
  transaction_date: string
}

export async function checkBudgetAndThresholds(
  userId: string,
  userEmail: string,
  tx: TransactionInfo
) {
  try {
    const supabase = await createClient()

    // 1. Fetch user's profile settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return

    const currency = profile.currency || 'USD'

    // ─── CHECK LARGE TRANSACTION ALERT ──────────────────────────────────────────
    if (profile.notif_large_transactions && tx.type === 'expense') {
      const threshold = Number(profile.large_transaction_threshold ?? 500)
      if (tx.amount >= threshold) {
        const title = 'Large Transaction Alert 💸'
        const message = `A transaction of ${currency} ${tx.amount.toFixed(2)} ("${tx.title}") was recorded, which exceeds your threshold of ${threshold.toFixed(2)}.`
        
        const emailHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #e4e4e7; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">💸</span>
              <h2 style="color: #4f46e5; margin: 8px 0 0 0; font-size: 24px; font-weight: 700;">Large Transaction Alert</h2>
            </div>
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">We are notifying you that a transaction has exceeded your threshold limit of <strong>${currency} ${threshold.toFixed(2)}</strong>:</p>
            
            <div style="background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%); padding: 18px; border-radius: 12px; margin: 24px 0; border: 1px solid #e4e4e7;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 4px 0; color: #71717a; width: 80px;"><strong>Title:</strong></td>
                  <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${tx.title}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #71717a;"><strong>Amount:</strong></td>
                  <td style="padding: 4px 0; color: #ef4444; font-weight: 600; font-size: 16px;">${currency} ${tx.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #71717a;"><strong>Date:</strong></td>
                  <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${tx.transaction_date}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">To view this transaction, open the <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/transactions" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">FinTrack Transactions</a> tab.</p>
            <p style="font-size: 13px; color: #71717a; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center;">This is an automated security alert from FinTrack. You can adjust your threshold limits in the settings.</p>
          </div>
        `

        await triggerNotification({
          userId,
          type: 'large_transaction',
          title,
          message,
          emailSubject: `FinTrack: Large Transaction Alert (${currency} ${tx.amount.toFixed(2)})`,
          emailHtml,
        })
      }
    }

    // ─── CHECK BUDGET ALERTS ─────────────────────────────────────────────────────
    if (profile.notif_budget_alerts && tx.category_id && tx.type === 'expense') {
      // 1. Fetch budget for this category
      const { data: budget } = await supabase
        .from('budgets')
        .select('*, categories(name)')
        .eq('user_id', userId)
        .eq('category_id', tx.category_id)
        .single()

      if (budget) {
        const categoryName = budget.categories?.name || 'Category'
        const limit = Number(budget.monthly_limit)

        // 2. Fetch all expense transactions for the current month in this category
        const now = new Date(tx.transaction_date)
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]

        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', tx.category_id)
          .eq('type', 'expense')
          .gte('transaction_date', firstOfMonth)
          .lte('transaction_date', lastOfMonth)

        const totalSpent = (txs ?? []).reduce((sum, item) => sum + Number(item.amount), 0)

        let alertType: 'exceeded' | 'warning' | null = null
        if (totalSpent >= limit) {
          alertType = 'exceeded'
        } else if (totalSpent >= limit * 0.8) {
          alertType = 'warning'
        }

        if (alertType) {
          // Check if warning has already been sent to prevent duplicates this month
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          const alertMessageSubstring = alertType === 'exceeded' ? 'exceeded' : '80%'
          
          const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'budget_alert')
            .like('message', `%${categoryName}%`)
            .like('message', `%${alertMessageSubstring}%`)
            .gte('created_at', `${currentMonthStr}-01T00:00:00Z`)

          if (!existingNotifs || existingNotifs.length === 0) {
            const isExceeded = alertType === 'exceeded'
            const percentStr = isExceeded ? '100%' : '80%'
            const title = isExceeded 
              ? `Budget Limit Exceeded! ⚠️` 
              : `Budget Warning: 80% Reached 🔔`
            
            const message = isExceeded
              ? `You have exceeded your monthly budget limit of ${currency} ${limit.toFixed(2)} for "${categoryName}". Total spent: ${currency} ${totalSpent.toFixed(2)}.`
              : `You have spent ${currency} ${totalSpent.toFixed(2)} which is ${percentStr} of your ${currency} ${limit.toFixed(2)} budget limit for "${categoryName}".`

            const alertColor = isExceeded ? '#ef4444' : '#f59e0b'
            
            const emailHtml = `
              <div style="font-family: system-ui, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #e4e4e7; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 40px;">${isExceeded ? '⚠️' : '🔔'}</span>
                  <h2 style="color: ${alertColor}; margin: 8px 0 0 0; font-size: 24px; font-weight: 700;">${title}</h2>
                </div>
                <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Hello,</p>
                <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">This is an automated notification regarding your budget limits for <strong>${categoryName}</strong>:</p>
                
                <div style="background-color: #f4f4f5; padding: 18px; border-radius: 12px; margin: 24px 0; border: 1px solid #e4e4e7;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 4px 0; color: #71717a; width: 100px;"><strong>Category:</strong></td>
                      <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${categoryName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #71717a;"><strong>Limit:</strong></td>
                      <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${currency} ${limit.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #71717a;"><strong>Spent:</strong></td>
                      <td style="padding: 4px 0; color: ${alertColor}; font-weight: 600; font-size: 16px;">${currency} ${totalSpent.toFixed(2)} (${((totalSpent / limit) * 100).toFixed(0)}%)</td>
                    </tr>
                  </table>
                  
                  <div style="width: 100%; background-color: #e4e4e7; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 12px;">
                    <div style="width: ${Math.min((totalSpent / limit) * 100, 100)}%; height: 100%; background-color: ${alertColor}; border-radius: 4px;"></div>
                  </div>
                </div>
                
                <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Adjust your monthly limits or check your dashboard at <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/budgets" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">FinTrack Budgets</a>.</p>
                <p style="font-size: 13px; color: #71717a; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center;">This is an automated budget report from FinTrack.</p>
              </div>
            `

            await triggerNotification({
              userId,
              type: 'budget_alert',
              title,
              message,
              emailSubject: `FinTrack: ${categoryName} Budget Alert (${percentStr})`,
              emailHtml,
            })
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[Notification Service] Error checking budget/thresholds:`, err.message)
  }
}

export async function checkGoalMilestones(
  userId: string,
  userEmail: string,
  goalTitle: string,
  prevAmount: number,
  newAmount: number,
  targetAmount: number
) {
  try {
    const supabase = await createClient()

    // Fetch user settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile || !profile.notif_goal_milestones) return

    const currency = profile.currency || 'USD'
    const prevPercent = targetAmount > 0 ? (prevAmount / targetAmount) * 100 : 0
    const newPercent = targetAmount > 0 ? (newAmount / targetAmount) * 100 : 0

    const milestones = [25, 50, 75, 100]
    let crossedMilestone: number | null = null

    for (const milestone of milestones) {
      if (prevPercent < milestone && newPercent >= milestone) {
        crossedMilestone = milestone
      }
    }

    if (crossedMilestone) {
      const isCompleted = crossedMilestone === 100
      const title = isCompleted
        ? `Goal Achieved! 🎉`
        : `Goal Milestone Reached! 🚀`
      
      const message = isCompleted
        ? `Congratulations! You have fully achieved your goal "${goalTitle}" by reaching ${currency} ${newAmount.toFixed(2)}.`
        : `You have reached ${crossedMilestone}% of your goal "${goalTitle}". Progress: ${currency} ${newAmount.toFixed(2)} / ${targetAmount.toFixed(2)}.`

      const emailHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #e4e4e7; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px;">${isCompleted ? '🎉' : '🚀'}</span>
            <h2 style="color: #10b981; margin: 8px 0 0 0; font-size: 24px; font-weight: 700;">${title}</h2>
          </div>
          <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Hello,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">${isCompleted ? 'Outstanding work! You have finished your savings goal' : 'Great job! You have reached a milestone on your savings goal'} <strong>${goalTitle}</strong>:</p>
          
          <div style="background-color: #f4f4f5; padding: 18px; border-radius: 12px; margin: 24px 0; border: 1px solid #e4e4e7;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #71717a; width: 120px;"><strong>Goal:</strong></td>
                <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${goalTitle}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #71717a;"><strong>Target:</strong></td>
                <td style="padding: 4px 0; color: #18181b; font-weight: 500;">${currency} ${targetAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #71717a;"><strong>Current savings:</strong></td>
                <td style="padding: 4px 0; color: #10b981; font-weight: 600; font-size: 16px;">${currency} ${newAmount.toFixed(2)} (${newPercent.toFixed(0)}%)</td>
              </tr>
            </table>
            
            <div style="width: 100%; background-color: #e4e4e7; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 12px;">
              <div style="width: ${Math.min(newPercent, 100)}%; height: 100%; background-color: #10b981; border-radius: 4px;"></div>
            </div>
          </div>
          
          <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Keep it up! View and manage your savings goals at <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/goals" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">FinTrack Goals</a>.</p>
          <p style="font-size: 13px; color: #71717a; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center;">This is an automated milestone update from FinTrack.</p>
        </div>
      `

      await triggerNotification({
        userId,
        type: 'goal_milestone',
        title,
        message,
        emailSubject: `FinTrack: Goal Milestone Reached (${crossedMilestone}% for "${goalTitle}")`,
        emailHtml,
      })
    }
  } catch (err: any) {
    console.error(`[Notification Service] Error checking goal milestones:`, err.message)
  }
}
