import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const phone = String(body.phone || body.mobile || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phoneVerified = Boolean(body.phoneVerified);

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

    if (password && password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const userId = `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const deskId = `DESK-${Math.floor(100 + Math.random() * 900)}`;

    const user = {
      id: userId,
      name,
      email,
      phone: phone.startsWith('+') ? phone : `+${phone}`,
      phoneVerified,
      role: 'Pro Trader',
      deskId,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      message: 'Account registered successfully.',
      user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Registration failed.' },
      { status: 500 }
    );
  }
}
