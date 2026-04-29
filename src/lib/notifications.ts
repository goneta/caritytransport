/**
 * Carity Notification Service
 *
 * Dispatches notifications via multiple channels:
 * - In-App (always)
 * - SMS via Twilio (when configured)
 * - Email via SendGrid (when configured)
 * - Browser Push via Web Push/VAPID (when configured)
 *
 * Environment variables required:
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * - SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

import prisma from '@/lib/prisma'
import { isWebPushConfigured, sendPushToUser } from '@/lib/push'

// ─── Types ───

export interface NotificationPayload {
  recipientId: string
  type: string
  subject?: string
  message: string
  triggerEvent?: string
  senderId?: string
}

interface RecipientInfo {
  id: string
  name: string | null
  email: string
  phone: string | null
  notifySMS: boolean
  notifyEmail: boolean
  notifyPush: boolean
}

// ─── Configuration Check ───

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-account-sid'
  )
}

export function isSendGridConfigured(): boolean {
  return !!(
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY !== 'your-sendgrid-api-key'
  )
}

// ─── SMS via Twilio ───

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!isTwilioConfigured()) {
    return { success: false, error: 'Twilio not configured' }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const fromNumber = process.env.TWILIO_PHONE_NUMBER!

  // Ensure phone number is in E.164 format
  const formattedTo = formatPhoneNumber(to)
  if (!formattedTo) {
    return { success: false, error: 'Invalid phone number format' }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: fromNumber,
        Body: body,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Twilio SMS error:', error)
      return { success: false, error: error.message || 'Failed to send SMS' }
    }

    const result = await response.json()
    console.log(`SMS sent successfully: ${result.sid}`)
    return { success: true }
  } catch (error) {
    console.error('Twilio SMS exception:', error)
    return { success: false, error: 'SMS sending failed' }
  }
}

// ─── Email via SendGrid ───

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSendGridConfigured()) {
    return { success: false, error: 'SendGrid not configured' }
  }

  const apiKey = process.env.SENDGRID_API_KEY!
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@carity.com'
  const fromName = process.env.SENDGRID_FROM_NAME || 'Carity Transport'

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [
          ...(textContent ? [{ type: 'text/plain', value: textContent }] : []),
          { type: 'text/html', value: htmlContent },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid email error:', response.status, errorText)
      return { success: false, error: `Email failed: ${response.status}` }
    }

    console.log(`Email sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('SendGrid email exception:', error)
    return { success: false, error: 'Email sending failed' }
  }
}

// ─── Unified Notification Dispatcher ───

/**
 * Creates an in-app notification AND dispatches SMS/email
 * based on the recipient's preferences and available channels.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const { recipientId, type, subject, message, triggerEvent, senderId } = payload

  // 1. Always create in-app notification
  await prisma.notification.create({
    data: {
      recipientId,
      senderId: senderId || null,
      type,
      subject: subject || null,
      message,
      triggerEvent: triggerEvent || null,
    },
  })

  // 2. Get recipient info for external channels
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notifySMS: true,
      notifyEmail: true,
      notifyPush: true,
    },
  }) as RecipientInfo | null

  if (!recipient) return

  // 3. Check for notification template
  let smsBody = message
  let emailSubject = subject || `Carity: ${type.replace(/_/g, ' ')}`
  let emailHtml = buildEmailHtml(subject || type, message, recipient.name)

  if (triggerEvent) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { triggerEvent },
    })
    if (template && template.active) {
      if (template.smsTemplate) {
        smsBody = interpolateTemplate(template.smsTemplate, { name: recipient.name, message })
      }
      if (template.emailSubject) {
        emailSubject = interpolateTemplate(template.emailSubject, { name: recipient.name, message })
      }
      if (template.emailTemplate) {
        emailHtml = interpolateTemplate(template.emailTemplate, { name: recipient.name, message })
      }
    }
  }

  // 4. Send SMS if user opted in and has phone
  if (recipient.notifySMS && recipient.phone && isTwilioConfigured()) {
    const smsResult = await sendSMS(recipient.phone, smsBody)
    if (!smsResult.success) {
      console.warn(`SMS failed for ${recipientId}: ${smsResult.error}`)
    }
  }

  // 5. Send email if user opted in
  if (recipient.notifyEmail && recipient.email && isSendGridConfigured()) {
    const emailResult = await sendEmail(recipient.email, emailSubject, emailHtml, message)
    if (!emailResult.success) {
      console.warn(`Email failed for ${recipientId}: ${emailResult.error}`)
    }
  }

  // 6. Send browser push if user opted in and VAPID is configured
  if (recipient.notifyPush && isWebPushConfigured()) {
    await sendPushToUser(recipient.id, {
      title: subject || `Carity: ${type.replace(/_/g, ' ')}`,
      body: message,
      url: '/parent/notifications',
      tag: triggerEvent || type,
    })
  }
}

/**
 * Dispatches notification to multiple recipients.
 */
export async function dispatchNotificationBulk(
  recipientIds: string[],
  payload: Omit<NotificationPayload, 'recipientId'>
): Promise<void> {
  // Create all in-app notifications in bulk
  await prisma.notification.createMany({
    data: recipientIds.map(id => ({
      recipientId: id,
      senderId: payload.senderId || null,
      type: payload.type,
      subject: payload.subject || null,
      message: payload.message,
      triggerEvent: payload.triggerEvent || null,
    })),
  })

  // Dispatch external notifications individually (respects per-user prefs)
  await Promise.allSettled(
    recipientIds.map(id =>
      dispatchExternalOnly({
        ...payload,
        recipientId: id,
      })
    )
  )
}

/**
 * Sends only external notifications (SMS/email) without creating in-app record.
 * Used internally by dispatchNotificationBulk after bulk in-app creation.
 */
async function dispatchExternalOnly(payload: NotificationPayload): Promise<void> {
  const { recipientId, type, subject, message, triggerEvent } = payload

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notifySMS: true,
      notifyEmail: true,
      notifyPush: true,
    },
  }) as RecipientInfo | null

  if (!recipient) return

  let smsBody = message
  let emailSubject = subject || `Carity: ${type.replace(/_/g, ' ')}`
  let emailHtml = buildEmailHtml(subject || type, message, recipient.name)

  if (triggerEvent) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { triggerEvent },
    })
    if (template && template.active) {
      if (template.smsTemplate) {
        smsBody = interpolateTemplate(template.smsTemplate, { name: recipient.name, message })
      }
      if (template.emailSubject) {
        emailSubject = interpolateTemplate(template.emailSubject, { name: recipient.name, message })
      }
      if (template.emailTemplate) {
        emailHtml = interpolateTemplate(template.emailTemplate, { name: recipient.name, message })
      }
    }
  }

  if (recipient.notifySMS && recipient.phone && isTwilioConfigured()) {
    await sendSMS(recipient.phone, smsBody)
  }

  if (recipient.notifyEmail && recipient.email && isSendGridConfigured()) {
    await sendEmail(recipient.email, emailSubject, emailHtml, message)
  }

  if (recipient.notifyPush && isWebPushConfigured()) {
    await sendPushToUser(recipient.id, {
      title: subject || `Carity: ${type.replace(/_/g, ' ')}`,
      body: message,
      url: '/parent/notifications',
      tag: triggerEvent || type,
    })
  }
}

// ─── Helpers ───

function formatPhoneNumber(phone: string): string | null {
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // If starts with 0 (UK local), convert to +44
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.slice(1)
  }

  // If doesn't start with +, assume UK
  if (!cleaned.startsWith('+')) {
    cleaned = '+44' + cleaned
  }

  // Basic validation: must be at least 10 digits
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) {
    return null
  }

  return cleaned
}

function interpolateTemplate(template: string, vars: Record<string, string | null>): string {
  let result = template
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  })
  return result
}

function buildEmailHtml(subject: string, message: string, recipientName: string | null): string {
  const name = recipientName || 'there'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;border-radius:12px 12px 0 0;padding:24px;">
          <tr>
            <td style="color:#ffffff;font-size:20px;font-weight:bold;">
              Carity
            </td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:12px;padding-top:4px;">
              School Transport Platform
            </td>
          </tr>
        </table>
        <!-- Body -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;">
          <tr>
            <td style="font-size:16px;color:#111827;padding-bottom:16px;">
              Hi ${name},
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#374151;line-height:1.6;padding-bottom:24px;">
              ${message.replace(/\n/g, '<br>')}
            </td>
          </tr>
          <tr>
            <td style="padding-top:16px;border-top:1px solid #f3f4f6;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="display:inline-block;background-color:#000000;color:#ffffff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
                Open Dashboard
              </a>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:0 0 12px 12px;padding:16px 24px;border:1px solid #e5e7eb;border-top:none;">
          <tr>
            <td style="font-size:12px;color:#6b7280;text-align:center;">
              Carity Limited &bull; School Transport &bull; London, UK<br>
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/parent/settings" style="color:#6b7280;">Manage notification preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
