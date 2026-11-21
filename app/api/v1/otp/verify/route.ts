import { NextRequest, NextResponse } from 'next/server';
import { routeAndVerifyOtp } from '@/lib/otp/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const challengeId = String(body.challenge_id || body.challengeId || '').trim();
    const otp = String(body.otp || body.code || '').trim();

    if (!challengeId) {
      return NextResponse.json(
        { ok: false, error: 'Challenge ID (challenge_id) is required.' },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid 6-digit numeric OTP code.' },
        { status: 400 }
      );
    }

    const result = routeAndVerifyOtp(challengeId, otp);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, verified: false, error: result.message },
        { status: 400 }
      );
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
