import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'marketintelligence-007.com';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const origin = resolveOrigin(req);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/terminal?authError=google_not_configured`);
  }

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
