import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  clearSessionCookie(res, req);
  return res;
}
