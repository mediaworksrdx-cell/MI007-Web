import nodemailer from 'nodemailer';

export interface EmailDispatchResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function formatOtpEmailHtml(otp: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0b0f19; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; padding: 32px 24px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: #10b981; text-transform: uppercase;">MARKET INTELLIGENCE AI — MI-007</div>
        <h1 style="font-size: 22px; font-weight: 900; margin: 8px 0 0; color: #ffffff;">MI-007 Security</h1>
      </div>

      <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #9ca3af; margin: 0 0 16px;">Your verification code:</p>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #34d399; margin: 0 0 16px; padding: 12px; background: #064e3b20; border: 1px dashed #05966950; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #6b7280; margin: 0;">This code expires in 5 minutes.</p>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; margin: 0 0 24px;">
        If you did not request this verification code, please ignore this email. Do not share this code with anyone.
      </p>

      <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #475569;">
        Synthetix Analytics • Automated Security System
      </div>
    </div>
  `;
}

export function formatOtpEmailText(otp: string): string {
  return [
    'MI-007 Security',
    '',
    'Your verification code:',
    otp,
    '',
    'This code expires in five minutes.',
    '',
    'MARKET INTELLIGENCE AI — MI-007',
    'Synthetix Analytics',
  ].join('\n');
}

export async function dispatchEmailOtp(
  email: string,
  otp: string
): Promise<EmailDispatchResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();

  // 1. Primary: Resend HTTP API (zero-friction server-side delivery for all clients)
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    const fromHeader =
      (process.env.RESEND_FROM || '').trim() ||
      'MI-007 Security <onboarding@resend.dev>';
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [cleanEmail],
          subject: 'Your MI-007 verification code',
          text: formatOtpEmailText(otp),
          html: formatOtpEmailHtml(otp),
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        return { ok: true, messageId: data.id };
      }
      return {
        ok: false,
        error: data?.message || `Resend API returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Resend API network timeout',
      };
    }
  }

  // 2. Fallback: SMTP (Gmail / Brevo / Custom)
  const transporter = getMailTransporter();

  if (!transporter) {
    return {
      ok: false,
      error: 'Email delivery not configured on server (set RESEND_API_KEY or SMTP_USER/SMTP_PASS).',
    };
  }

  const fromAddress =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    'no-reply@synthetixanalytics.com';

  try {
    const info = await transporter.sendMail({
      from: `"MI-007 Security" <${fromAddress}>`,
      to: cleanEmail,
      subject: 'Your MI-007 verification code',
      text: formatOtpEmailText(otp),
      html: formatOtpEmailHtml(otp),
    });

    return {
      ok: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to dispatch email via SMTP',
    };
  }
}
