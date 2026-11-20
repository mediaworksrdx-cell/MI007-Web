'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '@/lib/blog/blogService';

export default function BlogPostReaderPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [morePosts, setMorePosts] = useState<BlogPost[]>([]);
  // BL13 fix: build share URL only client-side to avoid SSR window reference
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    async function loadPost() {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.post) {
            setPost(data.post);
          }
        }

        // Load more posts for recommendation
        const allRes = await fetch('/api/blog/posts');
        if (allRes.ok) {
          const allData = await allRes.json();
          if (Array.isArray(allData.posts)) {
            setMorePosts(allData.posts.filter((p: BlogPost) => p.slug !== slug).slice(0, 3));
          }
        }
      } catch (err) {
        console.warn('Failed to load blog post:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Recent';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-mono text-[var(--theme-card-text-muted)]">Loading institutional article...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] flex flex-col items-center justify-center py-24 px-4">
        <div className="text-4xl mb-3">📄</div>
        <h1 className="text-xl font-bold text-white">Article Not Found</h1>
        <p className="text-xs text-[var(--theme-card-text-muted)] mt-1 mb-6">
          The requested article may have been removed, unpublished, or the URL is incorrect.
        </p>
        <Link
          href="/blog"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors"
        >
          &larr; Back to All Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* ── Top Breadcrumbs & Action Bar ── */}
      <div className="border-b border-[var(--theme-card-border)] bg-slate-950/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--theme-card-text-muted)] truncate">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-emerald-400 font-medium truncate max-w-[200px] sm:max-w-sm">{post.category}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/blog/admin"
              className="px-2.5 py-1 rounded-md border border-[var(--theme-card-border)] hover:border-emerald-500/50 bg-slate-900 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
            >
              Author Portal
            </Link>
          </div>
        </div>
      </div>

      {/* ── Article Header ── */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            {post.category}
          </span>
          <span className="text-xs text-[var(--theme-card-text-muted)] font-mono">
            {post.readTimeMinutes} min read
          </span>
          <span className="text-xs text-[var(--theme-card-text-muted)] font-mono">•</span>
          <span className="text-xs text-[var(--theme-card-text-muted)] font-mono">
            {formatDate(post.publishedAt)}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          {post.title}
        </h1>

        <p className="mt-4 text-base sm:text-lg text-[var(--theme-card-text-muted)] leading-relaxed">
          {post.summary}
        </p>

        {/* Author Byline */}
        <div className="mt-8 pt-6 border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/30 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-base flex items-center justify-center">
                {post.author.name[0]}
              </div>
            )}
            <div>
              <div className="text-sm font-black text-white">{post.author.name}</div>
              <div className="text-xs text-[var(--theme-card-text-muted)] font-mono">{post.author.role}</div>
            </div>
          </div>

          {/* Social Share Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/50 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy article link"
            >
              <span>{copied ? '✓ Copied' : '🔗 Copy'}</span>
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] hover:border-sky-500/50 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
            >
              𝕏 Share
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} — ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/50 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* ── Featured Cover Image ── */}
      {post.coverImage && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-10">
          <div className="relative rounded-3xl overflow-hidden border border-[var(--theme-card-border)] shadow-2xl max-h-[480px]">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover object-center max-h-[480px]"
            />
          </div>
        </div>
      )}

      {/* ── Article Body (Markdown Rendered) ── */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {/* BL7 fix: replaced hand-rolled regex renderer with react-markdown + remark-gfm */}
        <div className="prose prose-invert prose-emerald prose-sm sm:prose-base max-w-none
          prose-headings:text-white prose-headings:font-black
          prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:border-b prose-h2:border-[var(--theme-card-border)] prose-h2:pb-2 prose-h2:pt-6
          prose-h3:text-lg prose-h3:sm:text-xl prose-h3:pt-4 prose-h3:pb-1
          prose-p:text-slate-300 prose-p:leading-relaxed
          prose-li:text-slate-300 prose-li:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-500/10
          prose-blockquote:rounded-r-xl prose-blockquote:p-4 prose-blockquote:text-emerald-200 prose-blockquote:not-italic
          prose-code:bg-slate-800 prose-code:text-emerald-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl
          prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300
          prose-strong:text-white prose-em:text-slate-200
          prose-hr:border-[var(--theme-card-border)]
          prose-table:text-sm prose-th:text-white prose-td:text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-[var(--theme-card-border)] flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-[var(--theme-card-text-muted)] mr-1">Tags:</span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-[var(--theme-card-border)] text-emerald-400 text-xs font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* ── Author Bio Footer Card ── */}
        <div className="mt-10 rounded-2xl border border-[var(--theme-card-border)] bg-slate-900/60 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xl flex items-center justify-center shrink-0">
              {post.author.name[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="text-xs font-mono uppercase text-emerald-400 font-bold">Published By</div>
            <h4 className="text-base font-black text-white mt-0.5">{post.author.name}</h4>
            <div className="text-xs text-[var(--theme-card-text-muted)] font-mono">{post.author.role}</div>
            {post.author.bio && (
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">{post.author.bio}</p>
            )}
          </div>
        </div>
      </article>

      {/* ── More Articles Recommendation Section ── */}
      {morePosts.length > 0 && (
        <section className="border-t border-[var(--theme-card-border)] py-12 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg sm:text-xl font-black text-white">More Market Intelligence Research</h3>
              <Link href="/blog" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                View All Articles &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {morePosts.map((mp) => (
                <Link
                  key={mp.id}
                  href={`/blog/${mp.slug}`}
                  className="group rounded-2xl border border-[var(--theme-card-border)] bg-slate-900/60 hover:border-emerald-500/50 p-5 transition-all duration-200 block shadow-md hover:shadow-xl"
                >
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    {mp.category}
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {mp.title}
                  </h4>
                  <p className="mt-2 text-xs text-[var(--theme-card-text-muted)] line-clamp-2 leading-relaxed">
                    {mp.summary}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
