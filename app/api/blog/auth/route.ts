import { NextRequest, NextResponse } from 'next/server';
import { verifyBlogPasskey } from '@/lib/blog/blogService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
