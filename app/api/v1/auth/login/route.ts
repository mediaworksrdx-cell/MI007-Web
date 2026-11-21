import { NextRequest, NextResponse } from 'next/server';
import { routeAndVerifyOtp } from '@/lib/otp/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const loginType = body.type || (body.phone ? 'phone_otp' : 'email_password');
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || body.mobile || '').trim();
    const password = String(body.password || '');
    const otp = String(body.otp || body.code || '').trim();
    const challengeId = String(body.challenge_id || '').trim();

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
          { status: 400 }
        );
      }

      const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const user = {
        id: `USR-${Date.now().toString(36).toUpperCase()}`,
        name: body.name || 'MI-007 Trader',
        email: email || `${cleanPhone.replace(/[^0-9]/g, '')}@mi007.terminal`,
        phone: cleanPhone,
        phoneVerified: true,
        role: 'Pro Trader',
        deskId: `DESK-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        ok: true,
        message: 'Authenticated via WhatsApp OTP successfully.',
        user,
      });
    }

    // Email + Password login
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { ok: false, error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const userName = email.split('@')[0].toUpperCase();
    const user = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name: userName || 'QUANT-TRADER',
      email,
      phone: phone || '+918778123702',
      phoneVerified: Boolean(phone),
      role: 'Pro Trader',
      deskId: `DESK-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      message: 'Logged in successfully.',
      user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
