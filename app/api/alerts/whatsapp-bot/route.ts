import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

// In-memory OTP store with 5-minute expiry and strict attempt caps
interface OtpEntry {
  otpHash: string;
  salt: string;
  phone: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();
const MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;

function cleanPhone(p: string): string {
  return String(p || '').replace(/[\s+()\-]/g, '');
}

function hashOtpCode(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

export async function GET(req: NextRequest) {
  const phone = cleanPhone(req.nextUrl.searchParams.get('phone') || '');
  if (!phone) {
    return NextResponse.json({ ok: true, status: 'ready', verified: false });
  }

  const entry = otpStore.get(phone);
  const isValid = Boolean(entry && Date.now() < entry.expiresAt && entry.attempts < entry.maxAttempts);

  return NextResponse.json({
    ok: true,
    status: 'ready',
    hasPendingOtp: isValid,
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'send-otp');
    const rawPhone = String(body.phone || '').trim();
    const phone = cleanPhone(rawPhone);

    if (!phone || phone.length < 8 || phone.length > 15) {
      return NextResponse.json(
        { ok: false, error: 'Valid international phone number (8-15 digits) is required.' },
        { status: 400 }
      );
    }

    // 1. Send OTP Action
    if (action === 'send-otp' || action === 'request-code') {
      // Rate-limit BOTH by IP and by target phone alone (spoofed IP cannot spam a victim's phone)
      const sendIpRate = checkRateLimit('wa-bot-send-ip', ip, 10, 10 * 60_000);
      const sendPhoneRate = checkRateLimit('wa-bot-send-phone', phone, 5, 15 * 60_000);
      if (!sendIpRate.allowed || !sendPhoneRate.allowed) {
        const retry = Math.max(sendIpRate.retryAfterSeconds, sendPhoneRate.retryAfterSeconds);
        return NextResponse.json(
          { ok: false, error: `Too many OTP requests. Retry in ${retry}s.` },
          { status: 429 }
        );
      }

      // Preserve attempt count & enforce 60s resend cooldown so resending cannot reset guess counter
      const existing = otpStore.get(phone);
      if (existing && Date.now() < existing.expiresAt) {
        if (existing.attempts >= existing.maxAttempts) {
          return NextResponse.json(
            { ok: false, error: 'Too many failed attempts for this number. Wait for the window to expire.' },
            { status: 429 }
          );
        }
        const elapsedMs = OTP_TTL_MS - (existing.expiresAt - Date.now());
        if (elapsedMs < 60_000) {
          const waitSec = Math.ceil((60_000 - elapsedMs) / 1000);
          return NextResponse.json(
            { ok: false, error: `Please wait ${waitSec}s before requesting another OTP.` },
            { status: 429 }
          );
        }
      }

      // Cryptographically secure 6-digit numeric OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const salt = crypto.randomBytes(16).toString('hex');
      otpStore.set(phone, {
        otpHash: hashOtpCode(otp, salt),
        salt,
        phone,
        attempts: existing && Date.now() < existing.expiresAt ? existing.attempts : 0,
        maxAttempts: MAX_ATTEMPTS,
        expiresAt: Date.now() + OTP_TTL_MS,
      });

      // Strictly use server-configured gateway URL (never accept client-supplied gatewayUrl — prevents SSRF & OTP exfiltration)
      const externalGateway = process.env.WHATSAPP_GATEWAY_URL;
      if (!externalGateway) {
        otpStore.delete(phone);
        return NextResponse.json(
          { ok: false, error: 'WhatsApp gateway is not configured on the server.' },
          { status: 503 }
        );
      }

      let gatewayDelivered = false;
      let gatewayError = '';

      try {
        const gwHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (process.env.WHATSAPP_GATEWAY_SECRET) {
          gwHeaders['Authorization'] = `Bearer ${process.env.WHATSAPP_GATEWAY_SECRET}`;
        }
        const gwRes = await fetch(`${externalGateway.replace(/\/$/, '')}/send-otp`, {
          method: 'POST',
          headers: gwHeaders,
          body: JSON.stringify({ phone, otp, text: `Your MI-007 Verification OTP is: ${otp}` }),
          signal: AbortSignal.timeout(8000),
        });
        const gwData = await gwRes.json().catch(() => ({}));
        if (gwRes.ok && gwData?.ok) {
          gatewayDelivered = true;
        } else {
          gatewayError = gwData?.error || `Gateway returned HTTP ${gwRes.status}`;
        }
      } catch (fetchErr: any) {
        gatewayError = fetchErr?.message || 'Gateway network timeout';
      }

      if (!gatewayDelivered) {
        otpStore.delete(phone);
        return NextResponse.json(
          {
            ok: false,
            error: `WhatsApp Delivery Failed: ${gatewayError}`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `Verification OTP sent to WhatsApp on +${phone}`,
        phone: `+${phone}`,
      });
    }

    // 2. Verify OTP Action
    if (action === 'verify-otp') {
      const verifyRate = checkRateLimit('wa-bot-verify', `${ip}:${phone}`, 15, 10 * 60_000);
      if (!verifyRate.allowed) {
        return NextResponse.json(
          { ok: false, error: `Too many verification attempts. Retry in ${verifyRate.retryAfterSeconds}s.` },
          { status: 429 }
        );
      }

      const userOtp = String(body.otp || '').trim().replace(/[^0-9]/g, '');
      if (!userOtp || userOtp.length !== 6) {
        return NextResponse.json(
          { ok: false, error: 'Please enter a valid 6-digit OTP' },
          { status: 400 }
        );
      }

      const stored = otpStore.get(phone);
      if (!stored || Date.now() > stored.expiresAt) {
        otpStore.delete(phone);
        return NextResponse.json(
          { ok: false, error: 'OTP has expired or was not requested. Click Resend OTP.' },
          { status: 400 }
        );
      }

      if (stored.attempts >= stored.maxAttempts) {
        otpStore.delete(phone);
        return NextResponse.json(
          { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' },
          { status: 429 }
        );
      }

      stored.attempts += 1;
      const candidateHash = hashOtpCode(userOtp, stored.salt);
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(candidateHash, 'hex'),
        Buffer.from(stored.otpHash, 'hex')
      );

      if (!isMatch) {
        const remaining = stored.maxAttempts - stored.attempts;
        if (remaining <= 0) otpStore.delete(phone);
        return NextResponse.json(
          { ok: false, error: `Incorrect OTP code. ${Math.max(0, remaining)} attempt(s) remaining.` },
          { status: 400 }
        );
      }

      // OTP matches successfully — consume immediately
      otpStore.delete(phone);
      return NextResponse.json({
        ok: true,
        verified: true,
        message: `Phone number +${phone} successfully verified for WhatsApp Business alerts!`,
        phone: `+${phone}`,
      });
    }

    // 3. Reset Action (requires admin secret to prevent unauthenticated OTP invalidation DoS)
    if (action === 'reset') {
      const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
      const token =
        req.headers.get('x-mi007-admin-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!adminSecret || !token || token.length !== adminSecret.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(adminSecret))) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
      otpStore.delete(phone);
      return NextResponse.json({
        ok: true,
        message: 'WhatsApp verification reset.',
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to process WhatsApp OTP request' },
      { status: 500 }
    );
  }
}
