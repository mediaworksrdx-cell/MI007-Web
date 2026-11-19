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
    whatsappProvider?: 'callmebot' | 'meta' | 'twilio';
    whatsappPhone?: string;
    callmebotApiKey?: string;
    gmailTo?: string;
    gmailUser?: string;
    gmailAppPassword?: string;
    originUrl?: string;
  };
}

function formatNum(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 10) return v.toFixed(4);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildPlainText(payload: NotifyAlertPayload): string {
  const { alert, isTest, config } = payload;
  const dirIcon = alert.direction === 'BULLISH' ? '▲ LONG' : '▼ SHORT';
  const baseUrl = (config?.originUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://mi-007-web-sandy.vercel.app').replace(/\/$/, '');
  const chartUrl = `${baseUrl}/chart/${encodeURIComponent(alert.symbol)}?market=${encodeURIComponent(alert.market || 'INDIA')}`;

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
  const { alert, isTest, config } = payload;
  const isBull = alert.direction === 'BULLISH';
  const accent = isBull ? '#10b981' : '#ef4444';
  const dirText = isBull ? '▲ LONG' : '▼ SHORT';
  const baseUrl = (config?.originUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://mi-007-web-sandy.vercel.app').replace(/\/$/, '');
  const chartUrl = `${baseUrl}/chart/${encodeURIComponent(alert.symbol)}?market=${encodeURIComponent(alert.market || 'INDIA')}`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 14px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: ${accent}; padding: 14px 20px; color: #ffffff;">
        <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;">
          ${isTest ? 'TEST NOTIFICATION • ' : ''}MI-007 SMART MONEY CONCEPTS ALERT
        </div>
        <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">
          ${dirText} &bull; ${alert.symbol} (${alert.timeframe})
        </div>
      </div>
      <div style="padding: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 6px;">${alert.setupName}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
          Status: <strong style="color: #f8fafc;">${alert.statusLabel}</strong> &nbsp;|&nbsp;
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
          Open ${alert.symbol} Live Chart &rarr;
        </a>
        <div style="margin-top: 16px; font-size: 11px; color: #64748b;">
          Generated from closed-candle SMC structure. Verify liquidity &amp; risk management before executing.
        </div>
      </div>
    </div>
  `;
}

async function sendWhatsApp(
  text: string,
  config: NotifyAlertPayload['config']
): Promise<{ ok: boolean; message: string }> {
  const provider = config?.whatsappProvider || 'callmebot';
  const rawPhone = (config?.whatsappPhone || process.env.WHATSAPP_DEFAULT_PHONE || '').replace(/[^0-9+]/g, '');

  if (!rawPhone) {
    return { ok: false, message: 'WhatsApp phone number is not configured.' };
  }

  // 1. Meta WhatsApp Cloud API (if configured via env)
  if (provider === 'meta' || (process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID && provider !== 'callmebot')) {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
      return { ok: false, message: 'META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_ID env vars are required.' };
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: rawPhone.replace(/^\+/, ''),
          type: 'text',
          text: { body: text },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { ok: false, message: `Meta WhatsApp error (${res.status}): ${errText.slice(0, 120)}` };
      }
      return { ok: true, message: 'Sent via Meta WhatsApp Cloud API' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Meta WhatsApp request failed' };
    }
  }

  // 2. Twilio WhatsApp (if configured via env)
  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    if (!sid || !token) {
      return { ok: false, message: 'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars are required.' };
    }
    try {
      const params = new URLSearchParams();
      params.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
      params.set('To', `whatsapp:${rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone}`);
      params.set('Body', text);
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { ok: false, message: `Twilio error (${res.status}): ${errText.slice(0, 120)}` };
      }
      return { ok: true, message: 'Sent via Twilio WhatsApp' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Twilio WhatsApp request failed' };
    }
  }

  // 3. CallMeBot (Free personal WhatsApp API — 1-minute setup)
  const apiKey = (config?.callmebotApiKey || process.env.CALLMEBOT_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, message: 'CallMeBot API key is missing. Add your free CallMeBot key in WhatsApp settings.' };
  }
  try {
    const phoneParam = rawPhone.replace(/^\+/, '');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phoneParam)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = await res.text().catch(() => '');
    if (!res.ok || /error|invalid|apikey/i.test(body)) {
      return { ok: false, message: `CallMeBot rejected (${res.status}): ${body.replace(/<[^>]+>/g, '').trim().slice(0, 120)}` };
    }
    return { ok: true, message: 'Sent via WhatsApp (CallMeBot)' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'WhatsApp CallMeBot request failed' };
  }
}

async function sendGmail(
  payload: NotifyAlertPayload,
  plainText: string
): Promise<{ ok: boolean; message: string }> {
  const user = (payload.config?.gmailUser || process.env.GMAIL_USER || '').trim();
  const pass = (payload.config?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const to = (payload.config?.gmailTo || process.env.GMAIL_TO || user).trim();

  if (!user || !pass) {
    return {
      ok: false,
      message: 'Gmail credentials missing. Enter Gmail + 16-char App Password in settings (or set GMAIL_USER & GMAIL_APP_PASSWORD in .env).',
    };
  }
  if (!to) {
    return { ok: false, message: 'Recipient Gmail address is required.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const dirTag = payload.alert.direction === 'BULLISH' ? 'LONG' : 'SHORT';
    const subject = `${payload.isTest ? '[TEST] ' : ''}MI-007 SMC ${dirTag}: ${payload.alert.symbol} (${payload.alert.timeframe}) — ${payload.alert.statusLabel}`;

    await transporter.sendMail({
      from: `"MI-007 SMC Alerts" <${user}>`,
      to,
      subject,
      text: plainText,
      html: buildHtmlEmail(payload),
    });

    return { ok: true, message: `Email sent to ${to}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Gmail SMTP send failed' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NotifyAlertPayload;
    if (!payload?.alert?.symbol) {
      return NextResponse.json({ error: 'Missing alert payload' }, { status: 400 });
    }

    const plainText = buildPlainText(payload);
    const results: {
      whatsapp?: { ok: boolean; message: string };
      gmail?: { ok: boolean; message: string };
    } = {};

    const tasks: Promise<void>[] = [];
    if (payload.channels?.whatsapp) {
      tasks.push(
        sendWhatsApp(plainText, payload.config).then((r) => {
          results.whatsapp = r;
        })
      );
    }
    if (payload.channels?.gmail) {
      tasks.push(
        sendGmail(payload, plainText).then((r) => {
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
