import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import * as fs from 'fs'
import * as path from 'path'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'FinTrack <notifications@fintrack.com>'
const EMAIL_LOG_FILE = path.join(process.cwd(), 'email-logs.log')

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  console.log(`[Email] Attempting to send email to ${to} with subject "${subject}"`)

  // 1. Try Resend if API Key is configured
  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY)
      const { data, error } = await resend.emails.send({
        from: SMTP_FROM,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      })

      if (error) {
        throw new Error(error.message)
      }

      console.log(`[Email] Sent successfully via Resend. ID: ${data?.id}`)
      return { success: true, provider: 'resend', id: data?.id }
    } catch (err: any) {
      console.error(`[Email] Failed to send via Resend: ${err.message}. Falling back...`)
    }
  }

  // 2. Try SMTP if configured
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const port = SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })

      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      })

      console.log(`[Email] Sent successfully via SMTP. Message ID: ${info.messageId}`)
      return { success: true, provider: 'smtp', id: info.messageId }
    } catch (err: any) {
      console.error(`[Email] Failed to send via SMTP: ${err.message}. Falling back...`)
    }
  }

  // 3. Fallback: Log to file and console
  const logMessage = `
========================================
[EMAIL LOG - ${new Date().toISOString()}]
TO: ${to}
SUBJECT: ${subject}
TEXT CONTENT:
${text || html.replace(/<[^>]*>/g, '')}
HTML CONTENT:
${html}
========================================
`
  try {
    fs.appendFileSync(EMAIL_LOG_FILE, logMessage, 'utf-8')
    console.log(`[Email Sandbox] Email logged to ${EMAIL_LOG_FILE}`)
  } catch (err: any) {
    console.error(`[Email Sandbox] Failed to write email to log file: ${err.message}`)
  }

  console.log(`[Email Sandbox] To configure real emails, set RESEND_API_KEY or SMTP_HOST in .env.local`)
  return { success: true, provider: 'sandbox' }
}
