'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BlogPost, BlogAuthRole } from '@/lib/blog/blogService';

export default function BlogAdminDashboardPage() {
  const [passkey, setPasskey] = useState('');
  const [authRole, setAuthRole] = useState<BlogAuthRole>('none');
  const [authorKeyId, setAuthorKeyId] = useState('');
  const [authLabel, setAuthLabel] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; msg: string } | null>(null);

  // Authenticate with API
  const handleLogin = useCallback(async (keyToTest: string) => {
    if (!keyToTest.trim()) return;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/blog/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: keyToTest.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAuthRole(data.role);
        setAuthorKeyId(data.authorKeyId);
        setAuthLabel(data.label);
        setPasskey(keyToTest.trim());
        if (typeof window !== 'undefined') {
          // BL6 fix: write full session object to localStorage so /blog/write can read it
          const sessionObj = {
            role: data.role === 'admin' ? 'super_admin' : 'author',
            authorKeyId: data.authorKeyId,
            name: data.role === 'admin' ? 'MI007 Chief Editor' : 'MI007 Analyst',
            passkey: keyToTest.trim(),
          };
          localStorage.setItem('mi007_blog_session', JSON.stringify(sessionObj));
          sessionStorage.setItem('mi007_blog_passkey', keyToTest.trim());
        }
      } else {
        setAuthError(data.error || 'Invalid Admin or Author passkey.');
        setAuthRole('none');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error.');
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  // Restore session passkey on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('mi007_blog_passkey');
      if (saved) {
        handleLogin(saved);
      }
    }
  }, [handleLogin]);

  // Load articles once authenticated
  const loadPosts = useCallback(async () => {
    if (authRole === 'none') return;
    setLoadingPosts(true);
    try {
      // BL2 fix: send passkey in header, not in query string
      const res = await fetch('/api/blog/posts?status=all', {
        headers: { 'x-blog-passkey': passkey },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.warn('Failed to load posts in admin:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [authRole, passkey]);

  useEffect(() => {
    if (authRole !== 'none') {
      loadPosts();
    }
  }, [authRole, loadPosts]);

  // Handle post deletion
  const handleDeletePost = async (id: string) => {
    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/blog/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-blog-passkey': passkey,
        },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirmId(null);
        setStatusMessage({ ok: true, msg: 'Article deleted successfully.' });
      } else {
        setStatusMessage({ ok: false, msg: data.error || 'Failed to delete article.' });
      }
    } catch (err: any) {
      setStatusMessage({ ok: false, msg: err?.message || 'Network error deleting article.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mi007_blog_passkey');
      localStorage.removeItem('mi007_blog_session'); // BL6 fix: clear both stores
    }
    setAuthRole('none');
    setPasskey('');
    setAuthorKeyId('');
    setAuthLabel('');
    setPosts([]);
  };

  // ── 1. Unauthenticated Login Screen ──
  if (authRole === 'none') {
    return (
      <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[var(--theme-card-border)] bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-md">
              🔐
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Blog Author &amp; Admin Portal
            </h1>
            <p className="text-xs text-[var(--theme-card-text-muted)] mt-1.5 leading-relaxed">
              Enter your Super Admin Key or Analyst Passkey to publish, manage, and moderate research articles.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(passkey);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Passkey Credential
              </label>
              <input
                type="password"
                placeholder="Enter Super Admin or Author key..."
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-[var(--theme-card-border)] bg-slate-950 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating || !passkey.trim()}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {isAuthenticating ? 'Verifying Passkey...' : 'Enter Portal &rarr;'}
            </button>
          </form>

          {/* Quick Guidance Box */}
          <div className="mt-6 pt-5 border-t border-[var(--theme-card-border)] text-center">
            <div className="text-[11px] text-[var(--theme-card-text-muted)] font-mono">
              Contact your administrator for access credentials.
            </div>
            <div className="mt-4">
              <Link href="/blog" className="text-xs text-slate-400 hover:text-white transition-colors">
                &larr; Back to Public Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Authenticated Admin & Author Dashboard ──
  const isSuperAdmin = authRole === 'admin';
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;

  return (
    <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* ── Top Portal Navigation Bar ── */}
      <div className="border-b border-[var(--theme-card-border)] bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors">
              &larr; Public Blog
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                isSuperAdmin
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {authLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/blog/write"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span>✍️</span>
              <span>Write Article</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] hover:border-rose-500/50 bg-slate-900 hover:bg-rose-500/10 text-xs font-bold text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--theme-card-border)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Article Management &amp; Moderation
            </h1>
            <p className="text-xs sm:text-sm text-[var(--theme-card-text-muted)] mt-1">
              {isSuperAdmin
                ? 'Super Admin Mode: You have full permissions to publish, edit, and delete any post across all authors.'
                : 'Author Mode: You can publish new articles, edit your existing drafts, and delete your own posts.'}
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-slate-900/60 text-center">
              <div className="text-lg font-black text-white font-mono">{posts.length}</div>
              <div className="text-[10px] font-mono text-[var(--theme-card-text-muted)] uppercase">Total Posts</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
              <div className="text-lg font-black text-emerald-400 font-mono">{publishedCount}</div>
              <div className="text-[10px] font-mono text-emerald-300/80 uppercase">Published</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <div className="text-lg font-black text-amber-400 font-mono">{draftCount}</div>
              <div className="text-[10px] font-mono text-amber-300/80 uppercase">Drafts</div>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div className={`mt-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span>{statusMessage.msg}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold px-2 py-0.5 opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Articles List Table ── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Articles ({posts.length})</span>
              {loadingPosts && <span className="text-xs text-slate-500 font-normal animate-pulse">Syncing...</span>}
            </h2>
            <button
              type="button"
              onClick={loadPosts}
              disabled={loadingPosts}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-bold cursor-pointer"
            >
              🔄 Refresh List
            </button>
          </div>

          {loadingPosts && posts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-xs font-mono text-[var(--theme-card-text-muted)]">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[var(--theme-card-border)] rounded-2xl">
              <div className="text-2xl mb-2">✍️</div>
              <h3 className="text-sm font-bold text-white">No articles created yet</h3>
              <p className="text-xs text-[var(--theme-card-text-muted)] mt-1 mb-4">
                Click below to write and publish your first institutional market research piece.
              </p>
              <Link
                href="/blog/write"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md"
              >
                <span>Write First Article</span>
                <span>&rarr;</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--theme-card-border)] bg-slate-900/60 shadow-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--theme-card-border)] bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-3.5 px-4 font-bold">Article Details</th>
                    <th className="py-3.5 px-4 font-bold">Category</th>
                    <th className="py-3.5 px-4 font-bold">Author</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Published</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-card-border)] text-slate-200">
                  {posts.map((post) => {
                    const canEditOrDelete = isSuperAdmin || post.authorKeyId === authorKeyId;

                    return (
                      <tr key={post.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Title & Slug */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="font-bold text-white hover:text-emerald-400 transition-colors line-clamp-1 text-[13px]"
                          >
                            {post.title}
                          </Link>
                          <div className="text-[10px] font-mono text-[var(--theme-card-text-muted)] truncate mt-0.5">
                            /blog/{post.slug}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-medium text-emerald-400">
                            {post.category}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-300">
                          {post.author.name}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {post.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Published Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] font-mono text-slate-400">
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/blog/${post.slug}`}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
                              title="View published article"
                            >
                              View
                            </Link>

                            {canEditOrDelete ? (
                              <>
                                <Link
                                  href={`/blog/write?edit=${encodeURIComponent(post.id)}`}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 text-[11px] font-bold transition-colors"
                                  title="Edit article"
                                >
                                  Edit
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(post.id)}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Delete article"
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono italic">
                                Read Only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmId && (() => {
        const target = posts.find((p) => p.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-lg flex items-center justify-center mb-3">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-white">Delete Article Permanently?</h3>
              <p className="text-xs text-[var(--theme-card-text-muted)] mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">&ldquo;{target?.title}&rdquo;</strong>?
                This action cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-[var(--theme-card-border)] bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePost(deleteConfirmId)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
