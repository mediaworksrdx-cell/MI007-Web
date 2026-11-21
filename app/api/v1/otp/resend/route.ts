import { NextRequest, NextResponse } from 'next/server';
import { routeAndSendOtp, routeGetStatus } from '@/lib/otp/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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
