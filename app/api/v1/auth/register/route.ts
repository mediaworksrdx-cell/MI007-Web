import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  attachSessionCookie,
  findUserByEmail,
  hashPassword,
  toPublicUser,
  upsertUser,
} from '@/lib/auth/serverAuth';
import { routeGetStatus } from '@/lib/otp/router';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('auth-register', ip, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many registration attempts. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 80);
    const phone = String(body.phone || body.mobile || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const challengeId = String(body.challenge_id || body.challengeId || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Please enter your full name (minimum 2 characters).' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[\s+()\-]/g, '');
    if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 15) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid international mobile phone number.' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (findUserByEmail(email)) {
      // Generic response prevents email enumeration
      return NextResponse.json(
        { ok: false, error: 'Unable to complete registration with the provided details.' },
        { status: 400 }
      );
    }

    // Never trust client-supplied phoneVerified; derive strictly from server-verified OTP challenge
    let phoneVerified = false;
    if (challengeId) {
      const challengeStatus = routeGetStatus(challengeId);
      if (
        challengeStatus &&
        challengeStatus.verified &&
        !challengeStatus.expired &&
        challengeStatus.destination.replace(/[\s+()\-]/g, '') === cleanPhone
      ) {
        phoneVerified = true;
      }
    }

    const userId = `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const deskId = `DESK-${crypto.randomInt(100, 1000)}`;

    const record = upsertUser({
      id: userId,
      name,
      email,
      phone: phone.startsWith('+') ? phone : `+${cleanPhone}`,
      phoneVerified,
      role: 'Pro Trader',
      deskId,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    });

    const publicUser = toPublicUser(record);
    const res = NextResponse.json({
      ok: true,
      message: 'Account registered successfully.',
      user: publicUser,
    });
    attachSessionCookie(res, publicUser);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Registration failed.' },
      { status: 500 }
    );
  }
}
