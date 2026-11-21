import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory OTP store with 10-minute expiry
interface OtpEntry {
  otp: string;
  phone: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

function cleanPhone(p: string): string {
  return String(p || '').replace(/[\s+()\-]/g, '');
}

export async function GET(req: NextRequest) {
  const phone = cleanPhone(req.nextUrl.searchParams.get('phone') || '');
  if (!phone) {
    return NextResponse.json({ ok: true, status: 'ready', verified: false });
  }

  const entry = otpStore.get(phone);
  const isValid = Boolean(entry && Date.now() < entry.expiresAt);

  return NextResponse.json({
    ok: true,
    status: 'ready',
    hasPendingOtp: isValid,
    phone: `+${phone}`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'send-otp';
    const rawPhone = body.phone || '+918778123702';
    const phone = cleanPhone(rawPhone);

    if (!phone || phone.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Valid phone number with country code is required (e.g. +918778123702)' },
        { status: 400 }
      );
    }

    // 1. Send OTP Action
    if (action === 'send-otp' || action === 'request-code') {
      // Generate clean 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(phone, {
        otp,
        phone,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // If external WhatsApp gateway / GCP microservice is configured, forward OTP send request
      const externalGateway = body.gatewayUrl || process.env.WHATSAPP_GATEWAY_URL;
      if (externalGateway && !externalGateway.includes('localhost')) {
        try {
          await fetch(`${externalGateway.replace(/\/$/, '')}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp, text: `Your MI-007 Verification OTP is: ${otp}` }),
            signal: AbortSignal.timeout(5000),
          });
        } catch {
          // Non-blocking in testing mode
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Verification OTP generated for +${phone}`,
        otp,
        code: otp,
        phone: `+${phone}`,
      });
    }

    // 2. Verify OTP Action
    if (action === 'verify-otp') {
      const userOtp = String(body.otp || '').trim().replace(/[^0-9]/g, '');
      if (!userOtp || userOtp.length !== 6) {
        return NextResponse.json(
          { ok: false, error: 'Please enter a valid 6-digit OTP' },
          { status: 400 }
        );
      }

      const stored = otpStore.get(phone);
      if (!stored || Date.now() > stored.expiresAt) {
        return NextResponse.json(
          { ok: false, error: 'OTP has expired or was not requested. Click Resend OTP.' },
          { status: 400 }
        );
      }

      if (stored.otp !== userOtp) {
        return NextResponse.json(
          { ok: false, error: 'Incorrect OTP code. Please check and try again.' },
          { status: 400 }
        );
      }

      // OTP matches successfully
      otpStore.delete(phone);
      return NextResponse.json({
        ok: true,
        verified: true,
        message: `Phone number +${phone} successfully verified for WhatsApp Business alerts!`,
        phone: `+${phone}`,
      });
    }

    // 3. Reset Action
    if (action === 'reset') {
      otpStore.delete(phone);
      return NextResponse.json({
        ok: true,
        message: 'WhatsApp verification reset.',
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to process WhatsApp OTP request' },
      { status: 500 }
    );
  }
}
