import { Resend } from "resend";

/**
 * Initialize Resend client
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
  from:
    process.env.EMAIL_FROM || "Storacha Solana <noreply@storacha-solana.com>",
  replyTo: process.env.EMAIL_REPLY_TO,
};

/**
 * Send expiration warning email to user
 * @param to - Recipient email address
 * @param data - Email template data
 * @returns Resend API response
 */
export const sendExpirationWarningEmail = async (
  to: string,
  data: {
    fileName: string;
    cid: string;
    expiresAt: string;
    daysRemaining: number;
  },
) => {
  try {
    const response = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your file "${data.fileName}" will expire soon`,
      html: getExpirationWarningEmailHtml(data),
      text: getExpirationWarningEmailText(data),
    });

    return { success: true, data: response };
  } catch (error) {
    console.error("Failed to send expiration warning email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * HTML email template for expiration warning
 */
function getExpirationWarningEmailHtml(data: {
  fileName: string;
  cid: string;
  expiresAt: string;
  daysRemaining: number;
}): string {
  const expirationDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Expiration Warning</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="margin-bottom: 32px;">
    <h1 style="color: #111827; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">File Expiration Warning</h1>
    <p style="color: #6b7280; margin: 0; font-size: 14px;">Your stored file will expire soon</p>
  </div>
  
  <div style="margin-bottom: 24px;">
    <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0;">Hello,</p>
    
    <p style="color: #1f2937; font-size: 16px; margin: 0 0 24px 0;">
      Your file stored on Storacha will expire in <strong>${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}</strong>.
    </p>
    
    <div style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>File Name:</strong> ${data.fileName}</p>
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>CID:</strong> <code style="background: #ffffff; padding: 2px 6px; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 13px; color: #1f2937;">${data.cid}</code></p>
      <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Expires On:</strong> ${expirationDate}</p>
    </div>
    
    <div style="background: #fef9f3; padding: 16px; border: 1px solid #fed7aa; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>What happens after expiration?</strong><br>
        After the expiration date, your file will be automatically deleted from Storacha and removed from IPFS within 30 days.
      </p>
    </div>
    
    <p style="color: #1f2937; font-size: 16px; margin: 0 0 24px 0;">
      To keep this file stored, you'll need to extend the storage duration before it expires.
    </p>
    
    <div style="margin-bottom: 32px;">
      <a href="https://w3s.link/ipfs/${data.cid}" 
         style="background: #111827; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px; font-weight: 500;">
        View Your File
      </a>
    </div>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  
  <div style="margin-bottom: 24px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      Seven,<br>
      <strong style="color: #374151;">Storacha Solana Team</strong>
    </p>
  </div>
  
  <div style="margin-top: 32px;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated message. Please do not reply to this email.</p>
  </div>

</body>
</html>
  `.trim();
}

// we need this plain text version to handle graceful progressive enhancement
// perhaps, in the future, some of our users may not be using an email client that renders
// HTML properly
/**
 * Plain text email template for expiration warning
 */
function getExpirationWarningEmailText(data: {
  fileName: string;
  cid: string;
  expiresAt: string;
  daysRemaining: number;
}): string {
  const expirationDate = new Date(data.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
File Expiration Warning

Hello,

Your file stored on Storacha will expire in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}.

File Details:
- File Name: ${data.fileName}
- CID: ${data.cid}
- Expires On: ${expirationDate}

What happens after expiration?
After the expiration date, your file will be automatically deleted from Storacha and removed from IPFS within 30 days.

To keep this file stored, you'll need to extend the storage duration before it expires.

View your file: https://w3s.link/ipfs/${data.cid}

Seven,
Storacha Solana Team

---
This is an automated message. Please do not reply to this email.
  `.trim();
}
