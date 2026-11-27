import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { routeAndVerifyOtp } from '@/lib/otp/router';
import {
  attachSessionCookie,
  findUserByEmail,
  findUserByPhone,
  toPublicUser,
  upsertUser,
  verifyPassword,
} from '@/lib/auth/serverAuth';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('auth-login', ip, 15, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many login attempts. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const loginType = body.type || (body.phone ? 'phone_otp' : 'email_password');
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || body.mobile || '').trim();
    const password = String(body.password || '');
    const otp = String(body.otp || body.code || '').trim();
    const challengeId = String(body.challenge_id || '').trim();

    // Account + IP lockout (blocks brute-force without allowing remote DoS lockout of the legitimate owner)
    const acctKey = loginType === 'phone_otp' ? phone.replace(/[\s+()\-]/g, '') : email;
    if (acctKey) {
      const acctRate = checkRateLimit('auth-login-acct-ip', `${acctKey}:${ip}`, 8, 15 * 60_000);
      if (!acctRate.allowed) {
        return NextResponse.json(
          { ok: false, error: `Too many login attempts for this account from your IP. Retry in ${acctRate.retryAfterSeconds}s.` },
          { status: 429 }
        );
      }

      // High account-wide cap on password logins across all IPs (blocks distributed credential stuffing; owner can still use OTP)
      if (loginType !== 'phone_otp') {
        const globalAcctRate = checkRateLimit('auth-login-acct-global', acctKey, 100, 60 * 60_000);
        if (!globalAcctRate.allowed) {
          return NextResponse.json(
            { ok: false, error: `Account temporarily rate-limited due to high login volume. Use WhatsApp OTP or retry in ${globalAcctRate.retryAfterSeconds}s.` },
            { status: 429 }
          );
        }
      }
    }

    if (loginType === 'phone_otp') {
      if (!phone) {
        return NextResponse.json(
          { ok: false, error: 'Mobile phone number is required.' },
          { status: 400 }
        );
      }
      if (!otp || otp.length !== 6) {
        return NextResponse.json(
          { ok: false, error: 'Please enter the 6-digit WhatsApp verification code.' },
          { status: 400 }
        );
      }

      const verifyRes = routeAndVerifyOtp(challengeId, otp, phone);
      if (!verifyRes.ok) {
        return NextResponse.json(
          { ok: false, error: verifyRes.message || 'Invalid or expired OTP code.' },
          { status: 401 }
        );
      }

      const cleanPhone = phone.startsWith('+') ? phone : `+${phone.replace(/[\s+()\-]/g, '')}`;
      let record = findUserByPhone(cleanPhone);
      if (!record) {
        record = upsertUser({
          id: `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
          name: String(body.name || 'MI-007 Trader').trim().slice(0, 80),
          email: email || `${cleanPhone.replace(/[^0-9]/g, '')}@mi007.terminal`,
          phone: cleanPhone,
          phoneVerified: true,
          role: 'Pro Trader',
          deskId: `DESK-${crypto.randomInt(100, 1000)}`,
          createdAt: new Date().toISOString(),
        });
      } else if (!record.phoneVerified) {
        record = upsertUser({ ...record, phoneVerified: true });
      }

      const publicUser = toPublicUser(record);
      const res = NextResponse.json({
        ok: true,
        message: 'Authenticated via WhatsApp OTP successfully.',
        user: publicUser,
      });
      attachSessionCookie(res, publicUser);
      return res;
    }

    // Email + Password login (strict server-side password verification)
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const existing = findUserByEmail(email);
    if (!existing || !existing.passwordHash || !verifyPassword(password, existing.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const publicUser = toPublicUser(existing);
    const res = NextResponse.json({
      ok: true,
      message: 'Logged in successfully.',
      user: publicUser,
    });
    attachSessionCookie(res, publicUser);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Login failed.' },
      { status: 500 }
    );
  }
}
