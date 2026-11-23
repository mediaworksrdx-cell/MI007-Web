import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const resendConfigured = Boolean((process.env.RESEND_API_KEY || '').trim());
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const smtpConfigured = Boolean(user && (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD));

  return NextResponse.json({
    ok: true,
    service: 'mi007-email-bot',
    provider: resendConfigured ? 'resend' : smtpConfigured ? 'smtp' : 'unconfigured',
    configured: resendConfigured || smtpConfigured,
    smtp: {
      host,
      port,
      configured: smtpConfigured,
      sender: user ? user.replace(/(.{3})(.*)(@.*)/, '$1***$3') : 'unconfigured',
    },
  });
}
