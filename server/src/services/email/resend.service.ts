import { Resend } from 'resend'
import { logger } from '../../utils/logger.js'

/**
 * Initialize Resend client
 */
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'toju <noreply@toju.network>',
  replyTo: process.env.EMAIL_REPLY_TO,
  promulgator: process.env.PROMULGATOR,
}

const BASE_URL = process.env.BASE_URL || 'https://toju.network'

/**
 * Send batched expiration warning email for multiple uploads
 * @param to - Recipient email address
 * @param uploads - Array of expiring uploads
 * @returns Resend API response
 */
export const sendBatchExpirationWarningEmail = async (
  to: string,
  uploads: Array<{
    id: number
    fileName: string | null
    contentCid: string
    expiresAt: string | null
    fileSize: number | null
  }>,
) => {
  try {
    const count = uploads.length
    const cids = uploads.map((u) => u.contentCid).join(',')
    const response = await resend.emails.send({
      from: EMAIL_CONFIG.promulgator
        ? `${EMAIL_CONFIG.promulgator} <${EMAIL_CONFIG.from}>`
        : EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Action required: ${count} file${count !== 1 ? 's' : ''} expiring soon on toju`,
      html: getBatchExpirationWarningEmailHtml(uploads, cids),
      text: getBatchExpirationWarningEmailText(uploads, cids),
    })

    return { success: true, data: response }
  } catch (error) {
    logger.error('Failed to send batch expiration warning email', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

function getBatchExpirationWarningEmailHtml(
  uploads: Array<{
    fileName: string | null
    contentCid: string
    expiresAt: string | null
    fileSize: number | null
  }>,
  cids: string,
): string {
  const count = uploads.length
  const uploadRows = uploads
    .map((upload) => {
      const expirationDate = upload.expiresAt
        ? new Date(upload.expiresAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : 'N/A'
      const now = new Date()
      const expiry = upload.expiresAt ? new Date(upload.expiresAt) : now
      const daysRemaining = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${upload.fileName || 'Unnamed'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatFileSize(upload.fileSize)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expirationDate}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${daysRemaining}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="${BASE_URL}/renew?cids=${cids}" 
               style="color: #2563eb; text-decoration: none; font-weight: 500; cursor: pointer;">Renew</a>
          </td>
        </tr>
      `
    })
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Files Expiring Soon</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1 style="color: #111827; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Expiration Notice</h1>
    <p style="color: #6b7280; margin: 0; font-size: 16px;">
      You have ${count} upload${count !== 1 ? 's' : ''} expiring soon
    </p>
  </div>

  <div style="margin-bottom: 32px;">
    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: #141414;">
          <th style="padding: 12px; text-align: left; color: #949495; font-weight: 500; font-size: 14px;">File</th>
          <th style="padding: 12px; text-align: left; color: #949495; font-weight: 500; font-size: 14px;">Size</th>
          <th style="padding: 12px; text-align: left; color: #949495; font-weight: 500; font-size: 14px;">Expires</th>
          <th style="padding: 12px; text-align: left; color: #949495; font-weight: 500; font-size: 14px;">Days</th>
          <th style="padding: 12px; text-align: left; color: #949495; font-weight: 500; font-size: 14px;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${uploadRows}
      </tbody>
    </table>
  </div>

  <div style="text-align: center; margin-bottom: 32px;">
    <a href="${BASE_URL}/renew?cids=${cids}" 
       style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; margin-right: 12px; cursor: pointer;">
      View All & Renew
    </a>
    <a href="${BASE_URL}" 
       style="display: inline-block; background: #ffffff; color: #374151; padding: 12px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; border: 1px solid #d1d5db; cursor: pointer;">
      Manage Storage
    </a>
  </div>

  <div style="background: #fffbeb; padding: 16px; border: 1px solid #fcd34d; border-radius: 12px; margin-bottom: 32px;">
    <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">
      What happens after expiration?
    </p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">
      Files will be automatically deleted from storage and removed from IPFS within 30 days.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <div style="text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated message. Please do not reply to this email.</p>
  </div>

</body>
</html>
  `.trim()
}

function getBatchExpirationWarningEmailText(
  uploads: Array<{
    fileName: string | null
    contentCid: string
    expiresAt: string | null
    fileSize: number | null
  }>,
  cids: string,
): string {
  const count = uploads.length
  const uploadList = uploads
    .map((upload, index) => {
      const expirationDate = upload.expiresAt
        ? new Date(upload.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A'
      const now = new Date()
      const expiry = upload.expiresAt ? new Date(upload.expiresAt) : now
      const daysRemaining = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      return `
${index + 1}. ${upload.fileName || 'Unnamed'}
   Size: ${formatFileSize(upload.fileSize)}
   Expires: ${expirationDate} (${daysRemaining} days remaining)
      `.trim()
    })
    .join('\n\n')

  return `
Expiration Notice

You have ${count} upload${count !== 1 ? 's' : ''} expiring soon on toju.

${uploadList}

View all & renew: ${BASE_URL}/renew?cids=${cids}
Manage storage: ${BASE_URL}

What happens after expiration?
Files will be automatically deleted from storage and removed from IPFS within 30 days.



---
This is an automated message. Please do not reply to this email.
  `.trim()
}
