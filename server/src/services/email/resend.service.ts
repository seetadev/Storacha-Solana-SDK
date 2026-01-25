import { Resend } from "resend";
import { logger } from "../../utils/logger.js";

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
  promulgator: process.env.PROMULGATOR,
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
      from: `${EMAIL_CONFIG.promulgator} from toju <${EMAIL_CONFIG.from}>`,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your file "${data.fileName}" will expire soon`,
      html: getExpirationWarningEmailHtml(data),
      text: getExpirationWarningEmailText(data),
    });

    return { success: true, data: response };
  } catch (error) {
    logger.error("Failed to send expiration warning email", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    
    <div style="margin-bottom: 32px; diplay: flex; gap: 1em;">
      <a href="https://w3s.link/ipfs/${data.cid}" 
         style="background: #111827; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px; font-weight: 500; cursor: pointer;">
        View Your File
      </a>
      <a href="https://toju.network/renew?cid=${data.cid}" 
         style="background: #111827; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 14px; font-weight: 500; cursor: pointer;">
        Extend Storage Duration
      </a>
    </div>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  
  <div style="margin-bottom: 24px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      ${EMAIL_CONFIG.promulgator} from toju
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
Renew: https://toju.network/renew?cid=${data.cid}

${EMAIL_CONFIG.promulgator} from toju

---
This is an automated message. Please do not reply to this email.
  `.trim();
}

/**
 * Send batched expiration warning email for multiple uploads
 * @param to - Recipient email address
 * @param uploads - Array of expiring uploads
 * @returns Resend API response
 */
export const sendBatchExpirationWarningEmail = async (
  to: string,
  uploads: Array<{
    id: number;
    fileName: string | null;
    contentCid: string;
    expiresAt: string | null;
    fileSize: number | null;
  }>,
) => {
  try {
    const count = uploads.length;
    const cids = uploads.map((u) => u.contentCid).join(",");
    const response = await resend.emails.send({
      from: `${EMAIL_CONFIG.promulgator} from toju <${EMAIL_CONFIG.from}>`,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `⚠️ You have ${count} file${count !== 1 ? "s" : ""} expiring soon on toju`,
      html: getBatchExpirationWarningEmailHtml(uploads, cids),
      text: getBatchExpirationWarningEmailText(uploads, cids),
    });

    return { success: true, data: response };
  } catch (error) {
    logger.error("Failed to send batch expiration warning email", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getBatchExpirationWarningEmailHtml(
  uploads: Array<{
    fileName: string | null;
    contentCid: string;
    expiresAt: string | null;
    fileSize: number | null;
  }>,
  cids: string,
): string {
  const count = uploads.length;
  const uploadRows = uploads
    .map((upload) => {
      const expirationDate = upload.expiresAt
        ? new Date(upload.expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "N/A";
      const now = new Date();
      const expiry = upload.expiresAt ? new Date(upload.expiresAt) : now;
      const daysRemaining = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #1a1a1a;">${upload.fileName || "Unnamed"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #1a1a1a;">${formatFileSize(upload.fileSize)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #1a1a1a;">${expirationDate}</td>
          <td style="padding: 12px; border-bottom: 1px solid #1a1a1a;">${daysRemaining}</td>
          <td style="padding: 12px; border-bottom: 1px solid #1a1a1a;">
            <a href="https://toju.network/renew?cids=${cids}" 
               style="color: #f97316; text-decoration: none; font-weight: 500; cursor: pointer;">Renew →</a>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Files Expiring Soon</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #ffffff; background-color: #080808; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px; padding: 24px; background: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 12px;">
    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Expiration Notice</h1>
    <p style="color: #949495; margin: 0; font-size: 16px;">
      You have ${count} upload${count !== 1 ? "s" : ""} expiring soon
    </p>
  </div>

  <div style="margin-bottom: 32px;">
    <table style="width: 100%; border-collapse: collapse; background: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden;">
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
    <a href="https://toju.network/renew?cids=${cids}" 
       style="display: inline-block; background: #ffffff; color: #080808; padding: 12px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; margin-right: 12px; cursor: pointer;">
      View All & Renew →
    </a>
    <a href="https://toju.network" 
       style="display: inline-block; background: transparent; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer;">
      Manage Storage →
    </a>
  </div>

  <div style="background: #0f0f0f; padding: 16px; border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 12px; margin-bottom: 32px;">
    <p style="margin: 0; font-size: 14px; color: #f97316; font-weight: 500;">
      What happens after expiration?
    </p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #949495;">
      Files will be automatically deleted from storage and removed from IPFS within 30 days.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 32px 0;">

  <div style="text-align: center;">
    <p style="font-size: 14px; color: #949495; margin: 0 0 8px 0;">
      ${EMAIL_CONFIG.promulgator} from <strong style="color: #ffffff;">toju</strong>
    </p>
    <p style="font-size: 12px; color: #6b7280; margin: 0;">This is an automated message. Please do not reply to this email.</p>
  </div>

</body>
</html>
  `.trim();
}

function getBatchExpirationWarningEmailText(
  uploads: Array<{
    fileName: string | null;
    contentCid: string;
    expiresAt: string | null;
    fileSize: number | null;
  }>,
  cids: string,
): string {
  const count = uploads.length;
  const uploadList = uploads
    .map((upload, index) => {
      const expirationDate = upload.expiresAt
        ? new Date(upload.expiresAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "N/A";
      const now = new Date();
      const expiry = upload.expiresAt ? new Date(upload.expiresAt) : now;
      const daysRemaining = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return `
${index + 1}. ${upload.fileName || "Unnamed"}
   Size: ${formatFileSize(upload.fileSize)}
   Expires: ${expirationDate} (${daysRemaining} days remaining)
      `.trim();
    })
    .join("\n\n");

  return `
⚠️ Expiration Notice

You have ${count} upload${count !== 1 ? "s" : ""} expiring soon on toju.

${uploadList}

View all & renew: https://toju.network/renew?cids=${cids}
Manage storage: https://toju.network

What happens after expiration?
Files will be automatically deleted from storage and removed from IPFS within 30 days.

${EMAIL_CONFIG.promulgator} from toju

---
This is an automated message. Please do not reply to this email.
  `.trim();
}
