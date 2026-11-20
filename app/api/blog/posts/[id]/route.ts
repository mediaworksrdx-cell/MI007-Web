import { NextRequest, NextResponse } from 'next/server';
import {
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  verifyBlogPasskey,
  getAllBlogPosts,
} from '@/lib/blog/blogService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const passkey = req.nextUrl.searchParams.get('passkey') || '';
    const auth = verifyBlogPasskey(passkey);
    const allowDraft = auth.role === 'admin' || auth.role === 'author';

    // Check slug first, then fallback to id
    let post = await getBlogPostBySlug(id, { allowDraft });
    if (!post) {
      const all = await getAllBlogPosts({ status: 'all', isAdmin: true });
      post = all.find((p) => p.id === id) || null;
    }

    if (!post) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const passkey = (req.headers.get('x-blog-passkey') || body?.passkey || '').trim();

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Enter Admin or Author passkey.' },
        { status: 401 }
      );
    }

    const res = await updateBlogPost(id, body, passkey);
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
    const { id } = await params;
    const passkey = (req.headers.get('x-blog-passkey') || req.nextUrl.searchParams.get('passkey') || '').trim();

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
