import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthenticatedUser } from '@/lib/auth/serverAuth';
import { checkRateLimit as checkSharedRateLimit, getClientIp } from '@/lib/security/rateLimit';

export interface NotifyAlertPayload {
  isTest?: boolean;
  alert: {
    symbol: string;
    name?: string;
    timeframe: string;
    market: string;
    assetClass?: string;
    setupName: string;
    direction: 'BULLISH' | 'BEARISH';
    qualityScore: number;
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    targetPrice2?: number;
    riskReward: number;
    statusLabel: string;
    triggeredAt?: string;
  };
  channels: {
    whatsapp?: boolean;
    gmail?: boolean;
  };
  config?: {
    whatsappProvider?: 'selfhosted' | 'twilio' | 'callmebot' | 'meta';
    whatsappPhone?: string;
    selfhostedUrl?: string;
    callmebotApiKey?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    gmailTo?: string;
    gmailUser?: string;
    gmailAppPassword?: string;
    originUrl?: string;
  };
}

// HTML escaping helper to prevent XSS and HTML injection in notifications
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function formatNum(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 10) return v.toFixed(4);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSafeChartUrl(symbol: string, market?: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://mi-007-web-sandy.vercel.app').replace(/\/$/, '');
  const cleanSym = encodeURIComponent(String(symbol || '').replace(/[^A-Za-z0-9_.-]/g, ''));
  const cleanMkt = encodeURIComponent(String(market || 'INDIA').replace(/[^A-Za-z0-9_.-]/g, ''));
  return `${base}/chart/${cleanSym}?market=${cleanMkt}`;
}

function buildPlainText(payload: NotifyAlertPayload): string {
  const { alert, isTest } = payload;
  const dirIcon = alert.direction === 'BULLISH' ? '▲ LONG' : '▼ SHORT';
  const chartUrl = getSafeChartUrl(alert.symbol, alert.market);

  return [
    isTest ? '🧪 [TEST ALERT] Market Intelligence MI-007' : '🔔 Market Intelligence MI-007 SMC Alert',
    `${dirIcon} • ${alert.symbol} (${alert.timeframe})`,
    `Setup: ${alert.setupName}`,
    `Status: ${alert.statusLabel} | Quality: ${Math.round(alert.qualityScore)}/100`,
    `Entry: ${formatNum(alert.entryPrice)}`,
    `SL: ${formatNum(alert.stopLoss)}`,
    `TP1: ${formatNum(alert.targetPrice)} (1:${alert.riskReward.toFixed(1)})${alert.targetPrice2 ? ` | TP2: ${formatNum(alert.targetPrice2)}` : ''}`,
    `Chart: ${chartUrl}`,
  ].join('\n');
}

function buildHtmlEmail(payload: NotifyAlertPayload): string {
  const { alert, isTest } = payload;
  const isBull = alert.direction === 'BULLISH';
  const accent = isBull ? '#10b981' : '#ef4444';
  const dirText = isBull ? '▲ LONG' : '▼ SHORT';
  const chartUrl = getSafeChartUrl(alert.symbol, alert.market);

  const safeSymbol = esc(alert.symbol);
  const safeTf = esc(alert.timeframe);
  const safeSetup = esc(alert.setupName);
  const safeStatus = esc(alert.statusLabel);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 14px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: ${accent}; padding: 14px 20px; color: #ffffff;">
        <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;">
          ${isTest ? 'TEST NOTIFICATION • ' : ''}MI-007 SMART MONEY CONCEPTS ALERT
        </div>
        <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">
          ${dirText} &bull; ${safeSymbol} (${safeTf})
        </div>
      </div>
      <div style="padding: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 6px;">${safeSetup}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
          Status: <strong style="color: #f8fafc;">${safeStatus}</strong> &nbsp;|&nbsp;
          Quality: <strong style="color: ${accent};">${Math.round(alert.qualityScore)}/100</strong> &nbsp;|&nbsp;
          R:R: <strong style="color: #f8fafc;">1:${alert.riskReward.toFixed(1)}</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px;">
          <tr>
            <td style="padding: 8px 10px; background: #1e293b; border-radius: 6px 0 0 0; color: #94a3b8;">Entry Price</td>
            <td style="padding: 8px 10px; background: #1e293b; border-radius: 0 6px 0 0; text-align: right; font-weight: 700; color: #ffffff;">${formatNum(alert.entryPrice)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; background: #172033; color: #fca5a5;">Stop Loss (SL)</td>
            <td style="padding: 8px 10px; background: #172033; text-align: right; font-weight: 700; color: #f87171;">${formatNum(alert.stopLoss)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; background: #1e293b; color: #6ee7b7;">Target 1 (TP1)</td>
            <td style="padding: 8px 10px; background: #1e293b; text-align: right; font-weight: 700; color: #34d399;">${formatNum(alert.targetPrice)}</td>
          </tr>
          ${
            alert.targetPrice2
              ? `<tr>
                  <td style="padding: 8px 10px; background: #172033; color: #6ee7b7;">Target 2 (TP2)</td>
                  <td style="padding: 8px 10px; background: #172033; text-align: right; font-weight: 700; color: #34d399;">${formatNum(alert.targetPrice2)}</td>
                </tr>`
              : ''
          }
        </table>
        <a href="${chartUrl}" style="display: inline-block; background: ${accent}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 18px; border-radius: 8px;">
          Open ${safeSymbol} Live Chart &rarr;
        </a>
        <div style="margin-top: 16px; font-size: 11px; color: #64748b;">
          Generated from closed-candle SMC structure. Verify liquidity &amp; risk management before executing.
        </div>
      </div>
    </div>
  `;
}

// Daily cap guard (rate limiting uses shared Nginx-aware rate limiter)
let dailyEmailCount = 0;
let dailyEmailResetAt = Date.now() + 24 * 3600_000;

function hasAdminAuth(req: NextRequest): boolean {
  // Strictly use ADMIN_SECRET (never share with CRON_SECRET) with constant-time comparison
  const adminSecret = (process.env.ADMIN_SECRET || '').trim();
  if (!adminSecret) return false;
  const token = (
    req.headers.get('x-mi007-admin-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();
  if (!token) return false;
  const a = Buffer.from(token, 'utf8');
  const b = Buffer.from(adminSecret, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isValidE164(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s\-()]/g, ''));
}

async function sendWhatsApp(
  text: string,
  config: NotifyAlertPayload['config'],
  isAdmin: boolean,
  verifiedUserPhone?: string
): Promise<{ ok: boolean; message: string }> {
  const rawClientPhone = (config?.whatsappPhone || '').trim();
  const clientPhone = rawClientPhone.replace(/[\s\-()]/g, '');
  const serverDefaultPhone = (process.env.WHATSAPP_DEFAULT_PHONE || '').replace(/[\s\-()]/g, '');

  // Open-relay guard:
  // - Admin secret can send to any valid E.164 recipient (or server default).
  // - Signed-in user (valid HttpOnly mi007_session) can ONLY send to their own verified phone number.
  const targetPhone = isAdmin
    ? (clientPhone || serverDefaultPhone)
    : (verifiedUserPhone || '');

  if (!targetPhone || !isValidE164(targetPhone)) {
    return {
      ok: false,
      message: isAdmin
        ? 'Valid E.164 recipient mobile number is required for WhatsApp alerts.'
        : 'Server WHATSAPP_DEFAULT_PHONE is not configured (or admin authorization required for custom recipients).',
    };
  }

  // 1. Meta WhatsApp Business Cloud API (Strictly from environment variables — no hardcoded tokens)
  const metaToken =
    process.env.META_WHATSAPP_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_CLOUD_API_TOKEN ||
    '';

  const metaPhoneId =
    process.env.META_WHATSAPP_PHONE_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_CLOUD_PHONE_ID ||
    '';

  if (metaToken && metaPhoneId) {
    const cleanTarget = targetPhone.replace(/[^0-9]/g, '');
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(metaPhoneId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTarget,
          type: 'text',
          text: { preview_url: true, body: text },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const metaData = await metaRes.json().catch(() => ({}));
      if (metaRes.ok && metaData?.messages?.[0]?.id) {
        return { ok: true, message: `Delivered via Meta WhatsApp Cloud API (+${cleanTarget})` };
      }
    } catch {}
  }

  // 2. Server-Configured WhatsApp Microservice (Never trust client-supplied gateway URLs to prevent SSRF)
  const externalGateway = process.env.WHATSAPP_GATEWAY_URL;
  if (externalGateway) {
    try {
      const gwHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.WHATSAPP_GATEWAY_SECRET) {
        gwHeaders['Authorization'] = `Bearer ${process.env.WHATSAPP_GATEWAY_SECRET}`;
      }
      const res = await fetch(`${externalGateway.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: gwHeaders,
        body: JSON.stringify({ phone: targetPhone, text }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        return { ok: true, message: `Delivered via WhatsApp (+${data.to || targetPhone})` };
      }
      if (data?.error) {
        return { ok: false, message: data.error };
      }
    } catch {}
  }

  return {
    ok: false,
    message: 'WhatsApp delivery is not configured on the server (set META_WHATSAPP_TOKEN & META_WHATSAPP_PHONE_ID or WHATSAPP_GATEWAY_URL).',
  };
}

async function sendGmail(
  payload: NotifyAlertPayload,
  plainText: string,
  isAdmin: boolean,
  verifiedUserEmail?: string
): Promise<{ ok: boolean; message: string }> {
  const clientUser = (payload.config?.gmailUser || '').trim();
  const clientPass = (payload.config?.gmailAppPassword || '').replace(/\s+/g, '');
  const serverUser = (process.env.GMAIL_USER || '').trim();
  const serverPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const resendKey = (process.env.RESEND_API_KEY || '').trim();

  // Daily send cap protection
  const now = Date.now();
  if (now > dailyEmailResetAt) {
    dailyEmailCount = 0;
    dailyEmailResetAt = now + 24 * 3600_000;
  }
  if (dailyEmailCount >= 250) {
    return { ok: false, message: 'Daily email notification limit reached (250/day). Try again tomorrow.' };
  }

  const dirTag = payload.alert.direction === 'BULLISH' ? 'LONG' : 'SHORT';
  const safeSymbol = esc(payload.alert.symbol);
  const safeTf = esc(payload.alert.timeframe);
  const safeStatus = esc(payload.alert.statusLabel);
  const subject = `${payload.isTest ? '[TEST] ' : ''}MI-007 SMC ${dirTag}: ${safeSymbol} (${safeTf}) — ${safeStatus}`;

  // 1. Resend HTTP API (Primary zero-friction server-side delivery — never act as an arbitrary client SMTP relay)
  if (resendKey) {
    const defaultTo = (process.env.ALERT_DEFAULT_EMAIL || process.env.GMAIL_TO || serverUser || '').trim();
    const to = isAdmin
      ? ((payload.config?.gmailTo || verifiedUserEmail || defaultTo).trim())
      : ((verifiedUserEmail || '').trim());

    if (!to || !to.includes('@')) {
      return { ok: false, message: 'A verified account email is required to receive email alerts.' };
    }

    const fromHeader =
      (process.env.RESEND_FROM || '').trim() ||
      'MI-007 SMC Alerts <onboarding@resend.dev>';

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [to],
          subject,
          text: plainText,
          html: buildHtmlEmail(payload),
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        dailyEmailCount++;
        return { ok: true, message: `Email sent to ${to} via Resend` };
      }
      return { ok: false, message: data?.message || `Resend API returned HTTP ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Resend email send failed' };
    }
  }

  let user = '';
  let pass = '';
  let to = '';

  // Server SMTP only — client-supplied SMTP credentials are NOT accepted (prevents open SMTP relay abuse)
  if (serverUser && serverPass) {
    user = serverUser;
    pass = serverPass;
    const configuredTo = (process.env.ALERT_DEFAULT_EMAIL || process.env.GMAIL_TO || serverUser).trim();
    to = isAdmin ? ((payload.config?.gmailTo || verifiedUserEmail || configuredTo).trim()) : ((verifiedUserEmail || '').trim());
  } else {
    return {
      ok: false,
      message: 'Email delivery not configured on server (set RESEND_API_KEY or Gmail SMTP).',
    };
  }

  if (!to || !to.includes('@')) {
    return { ok: false, message: 'A valid recipient email address is required.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from: `"MI-007 SMC Alerts" <${user}>`,
      to,
      subject,
      text: plainText,
      html: buildHtmlEmail(payload),
    });

    dailyEmailCount++;
    return { ok: true, message: `Email sent to ${to}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Gmail SMTP send failed' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkSharedRateLimit('alerts-notify', ip, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Rate limit exceeded (max 20 requests/min). Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    // Require either valid admin secret OR authenticated user session (never allow anonymous callers to message the owner)
    const isAdmin = hasAdminAuth(req);
    const authUser = getAuthenticatedUser(req);
    if (!isAdmin && !authUser) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required. Please sign in to send alert notifications.' },
        { status: 401 }
      );
    }

    const payload = (await req.json()) as NotifyAlertPayload;
    if (!payload?.alert?.symbol || typeof payload.alert.symbol !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid alert payload' }, { status: 400 });
    }

    const symbol = payload.alert.symbol.trim();
    const setupName = typeof payload.alert.setupName === 'string' ? payload.alert.setupName.trim() : '';
    const statusLabel = typeof payload.alert.statusLabel === 'string' ? payload.alert.statusLabel.trim() : '';
    const timeframe = typeof payload.alert.timeframe === 'string' ? payload.alert.timeframe.trim() : '';
    const market = typeof payload.alert.market === 'string' ? payload.alert.market.trim() : '';

    if (
      symbol.length > 20 ||
      setupName.length > 100 ||
      statusLabel.length > 60 ||
      timeframe.length > 12 ||
      market.length > 20
    ) {
      return NextResponse.json({ error: 'Payload field length exceeds limit' }, { status: 400 });
    }

    if (!['BULLISH', 'BEARISH'].includes(payload.alert.direction)) {
      return NextResponse.json({ error: 'Invalid alert direction' }, { status: 400 });
    }

    if (
      !Number.isFinite(payload.alert.entryPrice) ||
      !Number.isFinite(payload.alert.stopLoss) ||
      !Number.isFinite(payload.alert.targetPrice) ||
      !Number.isFinite(payload.alert.riskReward) ||
      !Number.isFinite(payload.alert.qualityScore)
    ) {
      return NextResponse.json({ error: 'Alert prices, riskReward, and qualityScore must be finite numbers' }, { status: 400 });
    }

    // Normalize trimmed fields
    payload.alert.symbol = symbol;
    payload.alert.setupName = setupName || 'SMC Setup';
    payload.alert.statusLabel = statusLabel || 'ACTIVE';
    payload.alert.timeframe = timeframe || '1H';
    payload.alert.market = market || 'INDIA';

    const verifiedUserPhone = authUser?.phoneVerified && authUser.phone
      ? authUser.phone.replace(/[\s\-()]/g, '')
      : undefined;
    const plainText = buildPlainText(payload);
    const results: {
      whatsapp?: { ok: boolean; message: string };
      gmail?: { ok: boolean; message: string };
    } = {};

    const tasks: Promise<void>[] = [];
    if (payload.channels?.whatsapp) {
      tasks.push(
        sendWhatsApp(plainText, payload.config, isAdmin, verifiedUserPhone).then((r) => {
          results.whatsapp = r;
        })
      );
    }
    if (payload.channels?.gmail) {
      const verifiedUserEmail = authUser?.email && authUser.email.includes('@') ? authUser.email : undefined;
      tasks.push(
        sendGmail(payload, plainText, isAdmin, verifiedUserEmail).then((r) => {
          results.gmail = r;
        })
      );
    }

    await Promise.all(tasks);
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to dispatch notifications' },
      { status: 500 }
    );
  }
}
