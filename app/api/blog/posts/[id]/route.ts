import { NextRequest, NextResponse } from 'next/server';
import {
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  verifyBlogPasskey,
  getAllBlogPosts,
} from '@/lib/blog/blogService';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Never accept passkey from URL query string (prevents credential leakage in logs/history/Referer)
    const passkey = req.headers.get('x-blog-passkey') || '';
    const auth = verifyBlogPasskey(passkey);
    const allowDraft = auth.role === 'admin' || auth.role === 'author';

    let post = await getBlogPostBySlug(id, { allowDraft });
    // Enforce per-author draft isolation (prevent cross-author draft IDOR)
    if (post && post.status === 'draft' && auth.role !== 'admin' && post.authorKeyId !== auth.authorKeyId) {
      post = null;
    }

    if (!post) {
      const all = await getAllBlogPosts({
        status: allowDraft ? 'all' : 'published',
        isAdmin: auth.role === 'admin',
        authorKeyId: auth.authorKeyId || undefined,
      });
      post = all.find((p) => p.id === id) || null;
    }

    if (!post) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('blog-auth', ip, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many requests. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const passkey = (req.headers.get('x-blog-passkey') || body?.passkey || '').trim();

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Enter Admin or Author passkey.' },
        { status: 401 }
      );
    }

    // BL5 fix: normalize published boolean → status string for updates too
    const updates = { ...body };
    if ('published' in updates) {
      updates.status = updates.published === true ? 'published' : 'draft';
      delete updates.published;
    }

    const res = await updateBlogPost(id, updates, passkey);
    if (!res.ok) {
      const status = res.error?.includes('Unauthorized') ? 401 : res.error?.includes('Forbidden') ? 403 : 400;
      return NextResponse.json({ success: false, error: res.error }, { status });
    }

    return NextResponse.json({ success: true, post: res.post });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('blog-auth', ip, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many requests. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const passkey = (req.headers.get('x-blog-passkey') || '').trim();

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Enter Admin or Author passkey.' },
        { status: 401 }
      );
    }

    const res = await deleteBlogPost(id, passkey);
    if (!res.ok) {
      const status = res.error?.includes('Unauthorized') ? 401 : res.error?.includes('Forbidden') ? 403 : 400;
      return NextResponse.json({ success: false, error: res.error }, { status });
    }

    return NextResponse.json({ success: true, message: 'Article deleted successfully' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete article' },
      { status: 500 }
    );
  }
}
