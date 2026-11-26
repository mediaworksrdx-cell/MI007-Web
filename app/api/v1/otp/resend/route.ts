import { NextRequest, NextResponse } from 'next/server';
import { routeAndSendOtp, routeGetStatus } from '@/lib/otp/router';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('otp-resend', ip, 5, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many resend requests. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || body.challengeId || '').trim();
    const fallbackChannel = body.channel as 'whatsapp' | 'email' | undefined;

    if (!challengeId) {
      return NextResponse.json(
        { ok: false, error: 'Challenge ID (challenge_id) is required to resend.' },
        { status: 400 }
      );
    }

    const currentStatus = routeGetStatus(challengeId);
    if (!currentStatus) {
      return NextResponse.json(
        { ok: false, error: 'Challenge expired or not found. Please initiate a new request.' },
        { status: 404 }
      );
    }

    const destKey = currentStatus.destination.toLowerCase().replace(/[\s+()\-]/g, '');
    const destRate = checkRateLimit('otp-send-dest', destKey, 5, 15 * 60_000);
    if (!destRate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many OTP requests for this destination. Retry in ${destRate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const channel = fallbackChannel || currentStatus.channel;
    const result = await routeAndSendOtp({
      destination: currentStatus.destination,
      channel,
      purpose: currentStatus.purpose,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || result.message },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      challenge_id: result.challenge_id,
      channel: result.channel,
      destination: result.destination,
      expires_in: result.expires_in,
      cooldown: result.cooldown,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}
