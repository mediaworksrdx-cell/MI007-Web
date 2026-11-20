'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogPost, BlogCategory } from '@/lib/blog/blogService';

const CATEGORIES: Array<'All' | BlogCategory> = [
  'All',
  'SMC Analysis',
  'Macro & Forex',
  'Commodities',
  'Crypto',
  'Order Flow & Institutional',
];

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'All' | BlogCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const res = await fetch('/api/blog/posts');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.posts)) {
            setPosts(data.posts);
          }
        }
      } catch (err) {
        console.warn('Failed to load blog posts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((p) => {
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.author.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const featuredPost = filteredPosts.find((p) => p.featured) || filteredPosts[0];
  const regularPosts = filteredPosts.filter((p) => p.id !== featuredPost?.id);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-chart-bg)] text-[var(--theme-card-text)] selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* ── Header / Hero Section ── */}
      <section className="relative overflow-hidden border-b border-[var(--theme-card-border)] py-12 sm:py-16 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Institutional Market Research &amp; SMC Analysis
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Market Intelligence <span className="text-emerald-400 font-extrabold">Blog</span>
              </h1>
              <p className="mt-3 text-base sm:text-lg text-[var(--theme-card-text-muted)] max-w-2xl leading-relaxed">
                In-depth technical setups, Fair Value Gap breakdowns, macro market rotations, and quantitative trade reviews directly from our research desk.
              </p>
            </div>

            {/* Author / Admin Quick Link */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/blog/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--theme-card-border)] hover:border-emerald-500/60 bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-xs"
              >
                <span>🔐</span>
                <span>Author &amp; Admin Portal</span>
              </Link>
              <Link
                href="/chart/GOLD"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md"
              >
                <span>⚡ Live Terminal</span>
              </Link>
            </div>
          </div>

          {/* ── Search & Category Filter Bar ── */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'border border-[var(--theme-card-border)] bg-slate-900/60 hover:bg-slate-800 text-[var(--theme-card-text-muted)] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search articles, tags, authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--theme-card-border)] bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-mono text-[var(--theme-card-text-muted)]">Loading institutional research articles...</div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[var(--theme-card-border)] rounded-2xl p-8">
            <div className="text-3xl mb-2">📑</div>
            <h3 className="text-base font-bold text-white">No articles found</h3>
            <p className="text-xs text-[var(--theme-card-text-muted)] mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No articles match "${searchQuery}". Try a different keyword or reset filters.`
                : 'No articles published in this category yet.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Featured Hero Card ── */}
            {featuredPost && (
              <article className="group relative rounded-3xl border border-[var(--theme-card-border)] bg-slate-900/60 hover:border-emerald-500/50 overflow-hidden transition-all duration-300 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-0">
                {featuredPost.coverImage && (
                  <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full min-h-[280px] overflow-hidden bg-slate-950">
                    <img
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent lg:hidden" />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                        Featured Research
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono font-bold">
                        {featuredPost.category}
                      </span>
                    </div>
                  </div>
                )}

                <div className={`p-6 sm:p-8 flex flex-col justify-between ${featuredPost.coverImage ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--theme-card-text-muted)] font-mono mb-3">
                      <span>{formatDate(featuredPost.publishedAt)}</span>
                      <span>•</span>
                      <span>{featuredPost.readTimeMinutes} min read</span>
                    </div>

                    <Link href={`/blog/${featuredPost.slug}`}>
                      <h2 className="text-xl sm:text-2xl font-black text-white hover:text-emerald-400 transition-colors leading-snug">
                        {featuredPost.title}
                      </h2>
                    </Link>

                    <p className="mt-3 text-xs sm:text-sm text-[var(--theme-card-text-muted)] line-clamp-3 leading-relaxed">
                      {featuredPost.summary}
                    </p>

                    {/* Tag Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {featuredPost.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Author Card Footer */}
                  <div className="pt-6 mt-6 border-t border-[var(--theme-card-border)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {featuredPost.author.avatar ? (
                        <img
                          src={featuredPost.author.avatar}
                          alt={featuredPost.author.name}
                          className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                          {featuredPost.author.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{featuredPost.author.name}</div>
                        <div className="text-[10px] text-[var(--theme-card-text-muted)] font-mono">{featuredPost.author.role}</div>
                      </div>
                    </div>

                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <span>Read Article</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              </article>
            )}

            {/* ── Regular Posts Grid ── */}
            {regularPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularPosts.map((post) => (
                  <article
                    key={post.id}
                    className="group rounded-2xl border border-[var(--theme-card-border)] bg-slate-900/60 hover:border-emerald-500/50 flex flex-col justify-between overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl"
                  >
                    <div>
                      {post.coverImage && (
                        <Link href={`/blog/${post.slug}`} className="block relative h-48 overflow-hidden bg-slate-950">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md border border-white/10 text-emerald-400 text-[10px] font-mono font-bold">
                              {post.category}
                            </span>
                          </div>
                        </Link>
                      )}

                      <div className="p-5">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--theme-card-text-muted)] font-mono mb-2">
                          <span>{formatDate(post.publishedAt)}</span>
                          <span>•</span>
                          <span>{post.readTimeMinutes} min read</span>
                        </div>

                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                        </Link>

                        <p className="mt-2 text-xs text-[var(--theme-card-text-muted)] line-clamp-2 leading-relaxed">
                          {post.summary}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[9px] font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-5 pt-3 border-t border-[var(--theme-card-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.author.avatar ? (
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-6 h-6 rounded-full object-cover border border-emerald-500/20"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                            {post.author.name[0]}
                          </div>
                        )}
                        <span className="text-[11px] font-medium text-slate-300 truncate max-w-[120px]">
                          {post.author.name}
                        </span>
                      </div>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        <span>Read</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
