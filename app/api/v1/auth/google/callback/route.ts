import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  attachSessionCookie,
  findUserByEmail,
  toPublicUser,
  upsertUser,
} from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'marketintelligence-007.com';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = resolveOrigin(req);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/terminal?authError=google_not_configured`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get('mi007_oauth_state')?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    const errRes = NextResponse.redirect(`${origin}/terminal?authError=invalid_oauth_state`);
    errRes.cookies.delete('mi007_oauth_state');
    return errRes;
  }

  try {
    const redirectUri = `${origin}/api/v1/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errRes = NextResponse.redirect(`${origin}/terminal?authError=token_exchange_failed`);
      errRes.cookies.delete('mi007_oauth_state');
      return errRes;
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      const errRes = NextResponse.redirect(`${origin}/terminal?authError=missing_access_token`);
      errRes.cookies.delete('mi007_oauth_state');
      return errRes;
    }

    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const errRes = NextResponse.redirect(`${origin}/terminal?authError=userinfo_failed`);
      errRes.cookies.delete('mi007_oauth_state');
      return errRes;
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    const email = (profile.email || '').trim().toLowerCase();
    if (!email || !profile.email_verified) {
      const errRes = NextResponse.redirect(`${origin}/terminal?authError=email_not_verified`);
      errRes.cookies.delete('mi007_oauth_state');
      return errRes;
    }

    let record = findUserByEmail(email);
    if (!record) {
      record = upsertUser({
        id: `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        name: (profile.name || email.split('@')[0] || 'MI-007 Trader').trim().slice(0, 80),
        email,
        emailVerified: true,
        phone: '',
        phoneVerified: false,
        role: 'Pro Trader',
        deskId: `DESK-${crypto.randomInt(100, 1000)}`,
        createdAt: new Date().toISOString(),
      });
    } else if (!record.emailVerified) {
      record = upsertUser({
        ...record,
        emailVerified: true,
        name: record.name || (profile.name || '').trim().slice(0, 80) || record.name,
      });
    }

    const publicUser = toPublicUser(record);
    const res = NextResponse.redirect(`${origin}/terminal`);
    res.cookies.delete('mi007_oauth_state');
    attachSessionCookie(res, publicUser);
    return res;
  } catch {
    const errRes = NextResponse.redirect(`${origin}/terminal?authError=google_auth_error`);
    errRes.cookies.delete('mi007_oauth_state');
    return errRes;
  }
}
