import { NextRequest, NextResponse } from 'next/server';
import { routeAndVerifyOtp } from '@/lib/otp/router';
import { getAuthenticatedUser, upsertUser } from '@/lib/auth/serverAuth';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('otp-verify', ip, 15, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, verified: false, error: `Too many verification attempts. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || body.challengeId || '').trim();
    const otp = String(body.otp || body.code || '').trim();
    const destination = String(body.destination || body.phone || body.email || '').trim();

    if (!challengeId && !destination) {
      return NextResponse.json(
        { ok: false, error: 'Challenge ID or destination phone is required.' },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid 6-digit numeric OTP code.' },
        { status: 400 }
      );
    }

    const targetKey = challengeId || destination.toLowerCase().replace(/[\s+()\-]/g, '');
    const targetRate = checkRateLimit('otp-verify-target', targetKey, 5, 15 * 60_000);
    if (!targetRate.allowed) {
      return NextResponse.json(
        { ok: false, verified: false, error: `Too many verification attempts for this challenge. Retry in ${targetRate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const result = routeAndVerifyOtp(challengeId, otp, destination);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, verified: false, error: result.message },
        { status: 400 }
      );
    }

    // If caller is already signed in and verified their own email/phone, persist verification on server record
    const authUser = getAuthenticatedUser(req);
    if (authUser && result.destination) {
      if (result.channel === 'email' && result.destination.trim().toLowerCase() === authUser.email.toLowerCase()) {
        upsertUser({ ...authUser, emailVerified: true });
      } else if (
        result.channel === 'whatsapp' &&
        result.destination.replace(/[\s+()\-]/g, '') === authUser.phone.replace(/[\s+()\-]/g, '')
      ) {
        upsertUser({ ...authUser, phoneVerified: true });
      }
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      challenge_id: challengeId,
      destination: result.destination,
      channel: result.channel,
      message: 'OTP verified successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
