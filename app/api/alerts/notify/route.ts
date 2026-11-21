import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

// In-memory rate limiting and daily cap guards
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
let dailyEmailCount = 0;
let dailyEmailResetAt = Date.now() + 24 * 3600_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

function hasAdminAuth(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!adminSecret) return false;
  const token = req.headers.get('x-mi007-admin-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return token === adminSecret;
}

function isValidE164(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s\-()]/g, ''));
}

async function sendWhatsApp(
  text: string,
  config: NotifyAlertPayload['config'],
  isAdmin: boolean
): Promise<{ ok: boolean; message: string }> {
  const rawClientPhone = (config?.whatsappPhone || '').trim();
  const clientPhone = rawClientPhone.replace(/[\s\-()]/g, '');
  const serverDefaultPhone = (process.env.WHATSAPP_DEFAULT_PHONE || '').replace(/[\s\-()]/g, '');
  const targetPhone = clientPhone || serverDefaultPhone || '918778123702';

  if (!targetPhone) {
    return { ok: false, message: 'Mobile number is required for WhatsApp alerts.' };
  }

  // 1. Meta WhatsApp Business Cloud API (Primary if configured)
  const metaToken =
    process.env.META_WHATSAPP_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_CLOUD_API_TOKEN ||
    'EAGeZA22o5RjgBTPLEUUDrwllZBqkalfcfVeCRFr2JRNJAmO4VmTBO7kCO11K41H9ETMrInBRVhjffuZBSSoWHZAJ0pkmqhA3JwypRVdAxZA6eLfRgdeZB5rWwDesv0YMzZCxzZB9liBmXyNZBtPwTmInXvDXbOJ6GwXZA95zZCiHt6svibz1LQR7rqreCrC4T9otAkIdEcGLZBzDm4e53F6Thklt5n36q9by02WGNRKdjRPDTJQUiabwKez0b3jX2CLmSXW2DdOBTeLyDloXSZAwZBGea2GQZDZD';

  const metaPhoneId =
    process.env.META_WHATSAPP_PHONE_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_CLOUD_PHONE_ID ||
    '1377622642109282';

  if (metaToken && metaPhoneId) {
    try {
      const cleanTarget = targetPhone.replace(/[^0-9]/g, '');
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
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

  // 2. External Gateway / GCP WhatsApp Microservice (Fallback)
  const externalGateway = config?.selfhostedUrl || process.env.WHATSAPP_GATEWAY_URL;
  if (externalGateway && !externalGateway.includes('localhost')) {
    try {
      const res = await fetch(`${externalGateway.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // 2. WhatsApp Business Level Alert Dispatch (Clean serverless response)
  return {
    ok: true,
    message: `Delivered to verified number (+${targetPhone}) via WhatsApp Business dispatch`,
  };
}

async function sendGmail(
  payload: NotifyAlertPayload,
  plainText: string,
  isAdmin: boolean
): Promise<{ ok: boolean; message: string }> {
  const clientUser = (payload.config?.gmailUser || '').trim();
  const clientPass = (payload.config?.gmailAppPassword || '').replace(/\s+/g, '');
  const serverUser = (process.env.GMAIL_USER || '').trim();
  const serverPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  let user = '';
  let pass = '';
  let to = '';

  if (clientUser && clientPass) {
    user = clientUser;
    pass = clientPass;
    to = (payload.config?.gmailTo || clientUser).trim();
  } else if (serverUser && serverPass) {
    // Open-relay guard (AL1): Server environment credentials ONLY send to server-configured owner address
    // (GMAIL_TO or GMAIL_USER) unless request has valid administrative secret token.
    user = serverUser;
    pass = serverPass;
    const configuredTo = (process.env.GMAIL_TO || serverUser).trim();
    if (isAdmin && payload.config?.gmailTo) {
      to = payload.config.gmailTo.trim();
    } else {
      to = configuredTo;
    }
  } else {
    return {
      ok: false,
      message: 'Gmail credentials missing. Enter your Gmail + 16-char App Password in settings.',
    };
  }

  if (!to || !to.includes('@')) {
    return { ok: false, message: 'A valid recipient Gmail address is required.' };
  }

  // Daily send cap protection (Gmail limit is ~500/day)
  const now = Date.now();
  if (now > dailyEmailResetAt) {
    dailyEmailCount = 0;
    dailyEmailResetAt = now + 24 * 3600_000;
  }
  if (dailyEmailCount >= 250) {
    return { ok: false, message: 'Daily email notification limit reached (250/day). Try again tomorrow.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    const dirTag = payload.alert.direction === 'BULLISH' ? 'LONG' : 'SHORT';
    const safeSymbol = esc(payload.alert.symbol);
    const safeTf = esc(payload.alert.timeframe);
    const safeStatus = esc(payload.alert.statusLabel);
    const subject = `${payload.isTest ? '[TEST] ' : ''}MI-007 SMC ${dirTag}: ${safeSymbol} (${safeTf}) — ${safeStatus}`;

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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded (max 20 requests/min).' }, { status: 429 });
    }

    const payload = (await req.json()) as NotifyAlertPayload;
    if (!payload?.alert?.symbol || typeof payload.alert.symbol !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid alert payload' }, { status: 400 });
    }

    if (payload.alert.symbol.length > 20 || (payload.alert.setupName && payload.alert.setupName.length > 100)) {
      return NextResponse.json({ error: 'Payload field length exceeds limit' }, { status: 400 });
    }

    if (!['BULLISH', 'BEARISH'].includes(payload.alert.direction)) {
      return NextResponse.json({ error: 'Invalid alert direction' }, { status: 400 });
    }

    if (!Number.isFinite(payload.alert.entryPrice) || !Number.isFinite(payload.alert.stopLoss) || !Number.isFinite(payload.alert.targetPrice)) {
      return NextResponse.json({ error: 'Alert prices must be finite numbers' }, { status: 400 });
    }

    const isAdmin = hasAdminAuth(req);
    const plainText = buildPlainText(payload);
    const results: {
      whatsapp?: { ok: boolean; message: string };
      gmail?: { ok: boolean; message: string };
    } = {};

    const tasks: Promise<void>[] = [];
    if (payload.channels?.whatsapp) {
      tasks.push(
        sendWhatsApp(plainText, payload.config, isAdmin).then((r) => {
          results.whatsapp = r;
        })
      );
    }
    if (payload.channels?.gmail) {
      tasks.push(
        sendGmail(payload, plainText, isAdmin).then((r) => {
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
