import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  attachSessionCookie,
  findUserByEmail,
  toPublicUser,
  upsertUser,
} from '@/lib/auth/serverAuth';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

const DEFAULT_GOOGLE_CLIENT_ID =
  '646295866415-pd7uejfd8jgudpbm2mq483vc59b1gb94.apps.googleusercontent.com';

function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'marketintelligence-007.com';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
  const origin = resolveOrigin(req);

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${origin}/api/v1/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set('mi007_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 600,
  });
  return res;
}

/**
 * POST /api/v1/auth/google
 * Verifies a Google Identity Services OAuth2 access_token directly with Google's
 * tokeninfo + userinfo endpoints, validates audience (Client ID), and issues an MI-007 session.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('auth-google', ip, 15, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many sign-in attempts. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accessToken = String(body?.accessToken || '').trim();
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Missing Google access token.' },
        { status: 400 }
      );
    }

    const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;

    // 1. Verify token audience with Google tokeninfo
    const tokenInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!tokenInfoRes.ok) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired Google token.' },
        { status: 401 }
      );
    }
    const tokenInfo = (await tokenInfoRes.json()) as { aud?: string; azp?: string };
    if (tokenInfo.aud !== expectedClientId && tokenInfo.azp !== expectedClientId) {
      return NextResponse.json(
        { ok: false, error: 'Google token audience mismatch.' },
        { status: 401 }
      );
    }

    // 2. Fetch verified user profile
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch Google user profile.' },
        { status: 401 }
      );
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    const email = (profile.email || '').trim().toLowerCase();
    if (!email || !profile.email_verified) {
      return NextResponse.json(
        { ok: false, error: 'Google account email is not verified.' },
        { status: 401 }
      );
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
    const res = NextResponse.json({
      ok: true,
      message: 'Signed in with Google successfully.',
      user: publicUser,
    });
    attachSessionCookie(res, publicUser);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Google authentication failed.' },
      { status: 500 }
    );
  }
}
