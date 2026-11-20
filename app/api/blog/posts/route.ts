import { NextRequest, NextResponse } from 'next/server';
import {
  getAllBlogPosts,
  createBlogPost,
  verifyBlogPasskey,
} from '@/lib/blog/blogService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;
    // BL2 fix: read passkey from header first, never from query string
    const passkey = req.headers.get('x-blog-passkey') || '';
    const statusParam = searchParams.get('status') as 'published' | 'draft' | 'all' | null;

    const auth = verifyBlogPasskey(passkey);
    const isAdmin = auth.role === 'admin';
    const authorKeyId = auth.authorKeyId;

    // BL10 fix: when status=all, only admins see all; authors see only their own
    const requestedStatus = statusParam || (isAdmin ? 'all' : 'published');

    const posts = await getAllBlogPosts({
      status: requestedStatus,
      category,
      tag,
      authorKeyId: auth.role !== 'none' ? authorKeyId : undefined,
      isAdmin,
    });

    return NextResponse.json({
      success: true,
      total: posts.length,
      posts,
      userRole: auth.role,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passkey = (req.headers.get('x-blog-passkey') || body?.passkey || '').trim();

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Enter Admin or Author passkey.' },
        { status: 401 }
      );
    }

    // BL5 fix: normalize client's `published: boolean` → service's `status: 'published'|'draft'`
    const normalized = { ...body };
    if ('published' in normalized) {
      normalized.status = normalized.published === true ? 'published' : 'draft';
      delete normalized.published;
    }

    const res = await createBlogPost(normalized, passkey);
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, post: res.post }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
