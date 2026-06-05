import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notifications/email'

// Helper to check authorization
function isAuthorized(request: Request) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  const authHeader = request.headers.get('Authorization')
  
  const expectedSecret = process.env.CRON_SECRET

  // In local development, if no secret is defined in environment, allow testing easily
  if (!expectedSecret && process.env.NODE_ENV === 'development') {
    return true
  }

  if (!expectedSecret) {
    return false
  }

  if (querySecret === expectedSecret) return true
  if (authHeader === `Bearer ${expectedSecret}`) return true

  return false
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') // 'weekly' or 'monthly'

    if (reportType !== 'weekly' && reportType !== 'monthly') {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "weekly" or "monthly"' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Fetch all users from Supabase Auth to match email addresses
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError || !authData?.users) {
      console.error('[Cron API] Failed to fetch auth users:', authError?.message)
      return NextResponse.json({ error: 'Failed to retrieve auth users' }, { status: 500 })
    }

    const userEmailMap = new Map<string, string>()
    for (const u of authData.users) {
      if (u.email) userEmailMap.set(u.id, u.email)
    }

    // 2. Query profiles that have chosen this preference
    const preferenceField = reportType === 'weekly' ? 'notif_weekly_summary' : 'notif_monthly_report'
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq(preferenceField, true)

    if (profileError) {
      console.error('[Cron API] Failed to fetch user profiles:', profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: `No users subscribed to ${reportType} reports` })
    }

    const now = new Date()
    const summaryResults = []

    // ─── PROCESS WEEKLY SUMMARY ────────────────────────────────────────────────
    if (reportType === 'weekly') {
      // Past 7 days range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 7)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      for (const profile of profiles) {
        const userEmail = userEmailMap.get(profile.id)
        if (!userEmail) continue

        const currency = profile.currency || 'USD'

        // Fetch transactions for this user in range
        const { data: txs, error: txError } = await adminClient
          .from('transactions')
          .select('amount, title, category_id, categories(name)')
          .eq('user_id', profile.id)
          .eq('type', 'expense')
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr)

        if (txError) {
          console.error(`[Cron API] Error fetching transactions for user ${profile.id}:`, txError.message)
          continue
        }

        const totalSpent = (txs ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0)

        // Compile category breakdown
        const categoryMap = new Map<string, number>()
        for (const tx of (txs ?? []) as any[]) {
          const categoryName = (Array.isArray(tx.categories) ? tx.categories[0]?.name : tx.categories?.name) || 'Uncategorized'
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(tx.amount))
        }

        let breakdownHtml = ''
        categoryMap.forEach((amount, category) => {
          breakdownHtml += `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #3f3f46;">${category}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; text-align: right; font-weight: 600; color: #18181b;">${currency} ${amount.toFixed(2)}</td>
            </tr>
          `
        })

        // Trigger Notification & Email
        const title = 'Weekly Spending Summary 📊'
        const message = `You spent a total of ${currency} ${totalSpent.toFixed(2)} over the last 7 days.`

        // Save In-app notification
        await adminClient.from('notifications').insert({
          user_id: profile.id,
          title,
          message,
          type: 'system',
          is_read: false,
        })

        // Send Weekly Email
        const emailHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #e4e4e7; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">📊</span>
              <h2 style="color: #4f46e5; margin: 8px 0 0 0; font-size: 24px; font-weight: 700;">Weekly Summary Report</h2>
              <p style="color: #71717a; margin: 4px 0 0 0; font-size: 14px;">${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Hello ${profile.full_name || 'there'},</p>
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Here is your spending digest for the past week. You spent a total of <strong style="font-size: 18px; color: #4f46e5;">${currency} ${totalSpent.toFixed(2)}</strong>.</p>
            
            <h3 style="font-size: 16px; font-weight: 600; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; margin-top: 32px; color: #18181b;">Spending by Category</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
              ${breakdownHtml || '<tr><td colspan="2" style="text-align: center; color: #71717a; padding: 12px 0;">No expenses recorded this week. Good job!</td></tr>'}
            </table>
            
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46; margin-top: 32px;">To adjust budgets or check transaction details, log in to your <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">FinTrack Dashboard</a>.</p>
            <p style="font-size: 13px; color: #71717a; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center;">This is an automated weekly digest from FinTrack. You can toggle off weekly summary emails in your account settings.</p>
          </div>
        `

        await sendEmail({
          to: userEmail,
          subject: `FinTrack: Weekly Summary Report (${currency} ${totalSpent.toFixed(2)})`,
          html: emailHtml,
        })

        summaryResults.push({ id: profile.id, email: userEmail, spent: totalSpent })
      }
    }

    // ─── PROCESS MONTHLY REPORT ────────────────────────────────────────────────
    else if (reportType === 'monthly') {
      // Last month range
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      const startDateStr = firstDayOfLastMonth.toISOString().split('T')[0]
      const endDateStr = lastDayOfLastMonth.toISOString().split('T')[0]

      const monthName = firstDayOfLastMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })

      for (const profile of profiles) {
        const userEmail = userEmailMap.get(profile.id)
        if (!userEmail) continue

        const currency = profile.currency || 'USD'
        const monthlyIncome = Number(profile.monthly_income || 0)

        // Fetch transactions for last month
        const { data: txs, error: txError } = await adminClient
          .from('transactions')
          .select('amount, title, categories(name)')
          .eq('user_id', profile.id)
          .eq('type', 'expense')
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr)

        if (txError) {
          console.error(`[Cron API] Error fetching monthly transactions for user ${profile.id}:`, txError.message)
          continue
        }

        const totalSpent = (txs ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0)

        // Calculate category breakdowns
        const categoryMap = new Map<string, number>()
        for (const tx of (txs ?? []) as any[]) {
          const categoryName = (Array.isArray(tx.categories) ? tx.categories[0]?.name : tx.categories?.name) || 'Uncategorized'
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(tx.amount))
        }

        let breakdownHtml = ''
        categoryMap.forEach((amount, category) => {
          breakdownHtml += `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #3f3f46;">${category}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; text-align: right; font-weight: 600; color: #18181b;">${currency} ${amount.toFixed(2)}</td>
            </tr>
          `
        })

        // Calculate saving metrics
        const savedAmount = Math.max(0, monthlyIncome - totalSpent)
        const savingsRate = monthlyIncome > 0 ? (savedAmount / monthlyIncome) * 100 : 0

        // In-app notification
        const title = `Monthly spending report: ${monthName} 📅`
        const message = `In ${monthName}, you spent ${currency} ${totalSpent.toFixed(2)}.` + 
          (monthlyIncome > 0 ? ` Savings rate: ${savingsRate.toFixed(0)}%.` : '')

        await adminClient.from('notifications').insert({
          user_id: profile.id,
          title,
          message,
          type: 'system',
          is_read: false,
        })

        // Monthly HTML email
        const emailHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 24px; border-radius: 16px; border: 1px solid #e4e4e7; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 40px;">📅</span>
              <h2 style="color: #4f46e5; margin: 8px 0 0 0; font-size: 24px; font-weight: 700;">Monthly spending report</h2>
              <p style="color: #71717a; margin: 4px 0 0 0; font-size: 14px;">For ${monthName}</p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Hello ${profile.full_name || 'there'},</p>
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46;">Here is your financial overview for the month of <strong>${monthName}</strong>:</p>
            
            <div style="background-color: #f4f4f5; padding: 18px; border-radius: 12px; margin: 24px 0; border: 1px solid #e4e4e7;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${monthlyIncome > 0 ? `
                <tr>
                  <td style="padding: 6px 0; color: #71717a;">Monthly income:</td>
                  <td style="padding: 6px 0; color: #18181b; font-weight: 600; text-align: right;">${currency} ${monthlyIncome.toFixed(2)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #71717a;">Total Spent:</td>
                  <td style="padding: 6px 0; color: #ef4444; font-weight: 600; text-align: right;">${currency} ${totalSpent.toFixed(2)}</td>
                </tr>
                ${monthlyIncome > 0 ? `
                <tr style="border-top: 1px solid #e4e4e7;">
                  <td style="padding: 8px 0 0 0; color: #71717a; font-weight: 500;">Saved Amount:</td>
                  <td style="padding: 8px 0 0 0; color: #10b981; font-weight: 600; text-align: right; font-size: 16px;">${currency} ${savedAmount.toFixed(2)} (${savingsRate.toFixed(0)}% Savings Rate)</td>
                </tr>` : ''}
              </table>
            </div>

            <h3 style="font-size: 16px; font-weight: 600; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; margin-top: 32px; color: #18181b;">Spending by Category</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
              ${breakdownHtml || '<tr><td colspan="2" style="text-align: center; color: #71717a; padding: 12px 0;">No expenses recorded.</td></tr>'}
            </table>
            
            <p style="font-size: 15px; line-height: 1.5; color: #3f3f46; margin-top: 32px;">Adjust your budgets or analyze your categories at the <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/analytics" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">FinTrack Analytics Console</a>.</p>
            <p style="font-size: 13px; color: #71717a; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center;">This is an automated monthly financial digest from FinTrack.</p>
          </div>
        `

        await sendEmail({
          to: userEmail,
          subject: `FinTrack: Monthly Financial Summary - ${monthName}`,
          html: emailHtml,
        })

        summaryResults.push({ id: profile.id, email: userEmail, spent: totalSpent })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${reportType} reports`,
      processedCount: summaryResults.length,
      users: summaryResults.map(r => r.email),
    })

  } catch (err: any) {
    console.error('[Cron API] Uncaught error in cron handler:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
