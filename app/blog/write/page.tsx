'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { BlogPost, BlogCategory } from '@/lib/blog/blogService';

const CATEGORIES: { id: BlogCategory; label: string }[] = [
  { id: 'SMC Analysis', label: 'SMC Analysis' },
  { id: 'Macro & Forex', label: 'Macro & Forex' },
  { id: 'Commodities', label: 'Commodities' },
  { id: 'Crypto', label: 'Crypto' },
  { id: 'Order Flow & Institutional', label: 'Order Flow & Institutional' },
];

const PRESET_COVERS = [
  { label: 'Gold Vault & Bullion', url: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Trading Desk & Charts', url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Central Bank Finance', url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Bitcoin & Cryptography', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Quantitative Analytics', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80' },
];

interface SessionUser {
  role: 'super_admin' | 'author';
  authorKeyId: string;
  name: string;
  passkey: string;
}

function BlogWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || searchParams.get('id');

  const [session, setSession] = useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(false);
  const [fetchingPost, setFetchingPost] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState<BlogCategory>('SMC Analysis');
  const [tagsInput, setTagsInput] = useState('NIFTY, OrderBlocks, Liquidity');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0].url);
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('Senior Market Analyst');
  const [authorBio, setAuthorBio] = useState('Institutional trader specializing in order flow and Smart Money Concepts.');
  const [isPublished, setIsPublished] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mi007_blog_session');
      if (stored) {
        const parsed = JSON.parse(stored) as SessionUser;
        setSession(parsed);
        if (!authorName) {
          setAuthorName(parsed.name || (parsed.role === 'super_admin' ? 'MI007 Chief Editor' : 'MI007 Analyst'));
        }
      } else {
        router.push('/blog/admin?redirect=/blog/write');
      }
    } catch {
      router.push('/blog/admin?redirect=/blog/write');
    }
  }, [router]);

  // Load post if in edit mode
  useEffect(() => {
    if (!editId) return;

    setFetchingPost(true);
    fetch(`/api/blog/posts/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then((data: BlogPost) => {
        setTitle(data.title);
        setSlug(data.slug);
        setSlugManuallyEdited(true);
        setCategory(data.category);
        setTagsInput(data.tags.join(', '));
        setCoverImage(data.coverImage || '');
        setSummary(data.summary);
        setContent(data.content);
        setAuthorName(data.author.name);
        setAuthorRole(data.author.role);
        setAuthorBio(data.author.bio || '');
        setIsPublished(data.status === 'published');
      })
      .catch((err) => {
        setStatusMsg({ type: 'error', text: `Failed to load post for editing: ${err.message}` });
      })
      .finally(() => {
        setFetchingPost(false);
      });
  }, [editId]);

  // Auto-slug generator
  useEffect(() => {
    if (slugManuallyEdited || !title) return;
    const auto = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(auto);
  }, [title, slugManuallyEdited]);

  // Auto-calculated read time
  const readTimeEstimate = useMemo(() => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(wordCount / 200));
    return `${mins} min read`;
  }, [content]);

  // Formatting helpers for content textarea
  const insertFormatting = (prefix: string, suffix: string = '', placeholder: string = 'text') => {
    const textarea = document.getElementById('blog-content-area') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const handleSave = async (publishState?: boolean) => {
    if (!session) {
      setStatusMsg({ type: 'error', text: 'You must be logged in as an author or super admin.' });
      return;
    }
    if (!title.trim() || !content.trim() || !summary.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in Title, Summary, and Content before saving.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const targetPublished = publishState !== undefined ? publishState : isPublished;

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      category,
      tags,
      coverImage: coverImage.trim() || PRESET_COVERS[0].url,
      summary: summary.trim(),
      content: content.trim(),
      published: targetPublished,
      readTime: readTimeEstimate,
      author: {
        name: authorName.trim() || session.name,
        role: authorRole.trim() || 'Institutional Analyst',
        avatar: session.role === 'super_admin' ? '/avatars/admin.png' : '/avatars/analyst.png',
        bio: authorBio.trim(),
      },
      authorKeyId: session.authorKeyId,
    };

    try {
      const url = editId ? `/api/blog/posts/${editId}` : '/api/blog/posts';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-blog-passkey': session.passkey,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save post');
      }

      setStatusMsg({
        type: 'success',
        text: editId
          ? 'Article updated successfully!'
          : `Article ${targetPublished ? 'published' : 'saved as draft'} successfully!`,
      });

      setTimeout(() => {
        if (targetPublished && result.post?.slug) {
          router.push(`/blog/${result.post.slug}`);
        } else {
          router.push('/blog/admin');
        }
      }, 900);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving post' });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Verifying Author Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/blog/admin"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div>
              <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {editId ? 'Edit Article' : 'Authoring Studio'}
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Logged in as <span className="text-emerald-400 font-medium">{session.name}</span> (
                {session.role === 'super_admin' ? 'Super Admin' : 'Staff Author'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'write'
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Live Preview</span>
              </button>
            </div>

            {/* Save Draft */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
            >
              Draft
            </button>

            {/* Publish Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>{loading ? 'Saving...' : editId ? 'Update & Publish' : 'Publish Article'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`px-4 py-2.5 text-xs font-medium text-center border-b ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {fetchingPost ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading existing post content...</p>
        </div>
      ) : activeTab === 'preview' ? (
        /* Preview Tab View */
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="mb-8 border-b border-slate-800 pb-8">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full mb-4">
              {category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              {title || 'Untitled Research Article'}
            </h1>
            <p className="text-base text-slate-400 leading-relaxed mb-6">
              {summary || 'Article summary will appear here.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="font-semibold text-white">{authorName || session.name}</span>
              <span>•</span>
              <span>{authorRole}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {readTimeEstimate}
              </span>
            </div>
          </div>

          {coverImage && (
            <div className="mb-10 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <img src={coverImage} alt={title} className="w-full h-80 object-cover" />
            </div>
          )}

          <div className="prose prose-invert prose-emerald max-w-none text-slate-300 space-y-4">
            {content ? (
              content.split('\n\n').map((paragraph, idx) => {
                const trimmed = paragraph.trim();
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={idx} className="text-2xl font-bold text-white mt-8 mb-4">
                      {trimmed.replace(/^##\s+/, '')}
                    </h2>
                  );
                }
                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="text-xl font-semibold text-white mt-6 mb-3">
                      {trimmed.replace(/^###\s+/, '')}
                    </h3>
                  );
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote
                      key={idx}
                      className="border-l-4 border-emerald-500 pl-4 py-2 italic text-slate-200 bg-emerald-500/5 rounded-r my-4"
                    >
                      {trimmed.replace(/^>\s+/, '')}
                    </blockquote>
                  );
                }
                return (
                  <p key={idx} className="leading-relaxed">
                    {trimmed}
                  </p>
                );
              })
            ) : (
              <p className="italic text-slate-500">No content entered yet. Switch to the Write tab to begin authoring.</p>
            )}
          </div>
        </main>
      ) : (
        /* Write Tab View */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Editor Column (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Article Title <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Institutional Order Flow Analysis: Decoding Smart Money Sweeps"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-lg font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Slug & Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>URL Slug</span>
                    <span className="text-[10px] text-slate-500 lowercase">/blog/{slug || '...'}</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="post-url-slug"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Estimated Read Time
                  </label>
                  <input
                    type="text"
                    value={readTimeEstimate}
                    readOnly
                    className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Summary / Excerpt */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Executive Summary / Excerpt <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A concise 2-3 sentence overview that appears in search engines, social cards, and post listings..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Content Editor Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Article Body (Markdown Supported) <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {content.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl bg-slate-900 overflow-hidden focus-within:border-emerald-500 transition-colors">
                  {/* Formatting Buttons */}
                  <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-800 bg-slate-950/60 text-xs">
                    <button
                      type="button"
                      title="Heading 2"
                      onClick={() => insertFormatting('## ', '', 'Section Title')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition-colors"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      title="Heading 3"
                      onClick={() => insertFormatting('### ', '', 'Subsection')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition-colors"
                    >
                      H3
                    </button>
                    <div className="h-4 w-px bg-slate-800 mx-1" />
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => insertFormatting('**', '**', 'bold text')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white font-bold transition-colors"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      onClick={() => insertFormatting('*', '*', 'italic text')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white italic transition-colors"
                    >
                      I
                    </button>
                    <div className="h-4 w-px bg-slate-800 mx-1" />
                    <button
                      type="button"
                      title="Blockquote"
                      onClick={() => insertFormatting('> ', '', 'Key trading takeaway')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white font-serif transition-colors"
                    >
                      Quote
                    </button>
                    <button
                      type="button"
                      title="Bullet List"
                      onClick={() => insertFormatting('- ', '', 'Bullet item')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      List
                    </button>
                    <button
                      type="button"
                      title="Code Block"
                      onClick={() => insertFormatting('```\n', '\n```', '// Pine Script or JSON setup')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white font-mono transition-colors"
                    >
                      Code
                    </button>
                    <button
                      type="button"
                      title="Insert Link"
                      onClick={() => insertFormatting('[Link Title](', ')', 'https://example.com')}
                      className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      Link
                    </button>
                    <div className="h-4 w-px bg-slate-800 mx-1" />
                    <button
                      type="button"
                      title="Embed Terminal Chart Snapshot"
                      onClick={() =>
                        insertFormatting(
                          '\n> [!NOTE]\n> **Terminal Snapshot**: NIFTY 50 15m Fair Value Gap mitigated at 24,180 with heavy institutional volume confirmation.\n\n'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-emerald-400 font-medium text-[11px] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      <span>Chart Callout</span>
                    </button>
                  </div>

                  <textarea
                    id="blog-content-area"
                    rows={18}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your research analysis here... Use markdown headers (##), bullet points (-), or quotes (>) to structure your insights."
                    className="w-full p-4 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-mono leading-relaxed resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Settings Column (1 col) */}
            <div className="space-y-6">
              {/* Category Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Classification
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BlogCategory)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Tags <span className="text-slate-500">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="NIFTY, Gold, Liquidity, SMC"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tagsInput
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Image Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Cover Image
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Image URL</label>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      Or Pick Preset:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_COVERS.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCoverImage(preset.url)}
                          className={`text-left p-1.5 rounded-lg border text-[10px] transition-colors truncate ${
                            coverImage === preset.url
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-800 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {coverImage && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 aspect-video relative">
                      <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] text-slate-400">
                        Live Preview
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Author Attribution Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Author Profile
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Alex Vance, CFA"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Role / Designation</label>
                    <input
                      type="text"
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      placeholder="e.g. Senior Order Flow Specialist"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Short Bio</label>
                    <textarea
                      rows={2}
                      value={authorBio}
                      onChange={(e) => setAuthorBio(e.target.value)}
                      placeholder="Short 1-line analyst bio..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Publication Status Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Publication State
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-medium text-white">
                        {isPublished ? 'Published (Live)' : 'Draft (Hidden from public)'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isPublished ? 'Visible on /blog and accessible by public readers' : 'Only visible in Admin studio'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default function BlogWritePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">Loading Authoring Studio...</p>
          </div>
        </div>
      }
    >
      <BlogWriteContent />
    </Suspense>
  );
}
