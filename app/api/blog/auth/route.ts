import { NextRequest, NextResponse } from 'next/server';
import { verifyBlogPasskey } from '@/lib/blog/blogService';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('blog-auth', ip, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many authentication attempts. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const passkey = (body?.passkey || '').trim();

    if (!passkey) {
      return NextResponse.json({ success: false, error: 'Passkey is required.' }, { status: 400 });
    }

    const { role, authorKeyId } = verifyBlogPasskey(passkey);
    if (role === 'none') {
      return NextResponse.json({ success: false, error: 'Invalid Admin or Author passkey.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      role,
      authorKeyId,
      label: role === 'admin' ? 'Super Admin' : 'Author / Analyst',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
