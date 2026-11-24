import { NextRequest, NextResponse } from 'next/server';
import { routeAndSendOtp } from '@/lib/otp/router';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('otp-send', ip, 5, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many OTP requests. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const destination = String(body.destination || body.phone || body.email || '').trim();
    const channel = (body.channel || (destination.includes('@') ? 'email' : 'whatsapp')) as 'whatsapp' | 'email';
    const purpose = body.purpose || 'verification';

    if (!destination) {
      return NextResponse.json(
        { ok: false, error: 'Destination (phone number or email) is required.' },
        { status: 400 }
      );
    }

    // Per-destination rate limit (independent of IP, prevents OTP bombing even across rotating IPs)
    const destKey = destination.toLowerCase().replace(/[\s+()\-]/g, '');
    const destRate = checkRateLimit('otp-send-dest', destKey, 5, 15 * 60_000);
    if (!destRate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many OTP requests for this destination. Retry in ${destRate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const result = await routeAndSendOtp({ destination, channel, purpose });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || result.message, challenge_id: result.challenge_id },
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
      { ok: false, error: err?.message || 'Internal OTP dispatch error' },
      { status: 500 }
    );
  }
}
