import fs from 'fs';
import path from 'path';

export type BlogCategory = 'SMC Analysis' | 'Macro & Forex' | 'Commodities' | 'Crypto' | 'Order Flow & Institutional';

export interface BlogAuthor {
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  twitter?: string;
  linkedin?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  category: BlogCategory;
  tags: string[];
  author: BlogAuthor;
  authorKeyId: string; // 'admin' or author passkey identifier
  status: 'published' | 'draft';
  featured?: boolean;
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  views?: number;
}

export type BlogAuthRole = 'admin' | 'author' | 'none';

// Secure Passkey Authentication
export const ADMIN_PASSKEY = process.env.BLOG_ADMIN_PASSWORD || 'MI007_ADMIN_2026';
export const AUTHOR_PASSKEYS = [
  process.env.BLOG_AUTHOR_PASSWORD || 'ANALYST_DEV_2026',
  'ANALYST_QUANT_2026',
  'ANALYST_MACRO_2026',
];

export function verifyBlogPasskey(passkey: string): { role: BlogAuthRole; authorKeyId: string } {
  const cleanKey = (passkey || '').trim();
  if (!cleanKey) return { role: 'none', authorKeyId: '' };

  if (cleanKey === ADMIN_PASSKEY) {
    return { role: 'admin', authorKeyId: 'admin' };
  }

  const authorIdx = AUTHOR_PASSKEYS.indexOf(cleanKey);
  if (authorIdx !== -1) {
    return { role: 'author', authorKeyId: `author_${authorIdx + 1}` };
  }

  return { role: 'none', authorKeyId: '' };
}

// ── Default Institutional Starter Articles ──────────────────────────────────────
export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-gold-smc-liquidity',
    slug: 'gold-spot-structural-liquidity-sweep-order-flow',
    title: 'Gold Spot & COMEX Futures: Structural Liquidity Sweep & Volume Profile Distribution',
    summary: 'A deep-dive institutional breakdown of XAU/USD price action, highlighting buy-side liquidity sweeps above $2,750, point-of-control migration, and institutional order block mitigation.',
    category: 'Commodities',
    tags: ['Gold', 'SMC', 'OrderFlow', 'VolumeProfile'],
    author: {
      name: 'Dev Anand',
      role: 'Chief Market Strategist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: 'Quantitative macro and institutional SMC trader focusing on precious metals, energy, and equity indices.',
      twitter: 'https://x.com',
      linkedin: 'https://linkedin.com',
    },
    authorKeyId: 'admin',
    status: 'published',
    featured: true,
    publishedAt: '2026-11-18T10:00:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
    readTimeMinutes: 6,
    views: 1420,
    coverImage: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80',
    content: `## Institutional Context & Macro Liquidity Overview

Recent price action across Gold (XAU/USD) and COMEX Gold Futures (GC) reflects an textbook institutional re-accumulation structure following a clean sweep of Buy-Side Liquidity (BSL).

In this market review, we examine the structural anatomy of the move using the **MI-007 Smart Money Concepts (SMC)** framework and **Volume Profile (VPVR)** dynamics.

---

### Key Structural Highlights

1. **Buy-Side Liquidity (BSL) Sweep**: Price engineered an aggressive extension above protected pivot highs, triggering retail stop-runs before violently rejecting back inside the established balance range.
2. **Fair Value Gap (FVG) Displacement**: The subsequent bearish displacement leg left an unmitigated 4-hour Fair Value Gap spanning between key psychological inflection points.
3. **Volume Profile POC & Value Area Confluence**: The Point of Control (POC) established robust volume absorption at lower value boundaries, signaling strong passive buyer limit orders.

> **Trading Rule**: When an institutional liquidity sweep occurs on a higher timeframe (4H or Daily), never chase breakout candles until a confirmed displacement candle and subsequent retest of the formed Order Block / FVG prints.

---

### Execution Checklist & Risk Framework

Before entering trades aligned with this setup:
- **Confirm Mitigation State**: Verify whether the demand order block remains FRESH or partially mitigated.
- **Check Delta Volume**: Monitor aggressive buying delta via Order Flow Footprints at the support band.
- **Target Invariant**: Place Take Profit 1 at internal liquidity pools (1:2 R:R minimum) with trailing stops behind confirmed higher swing lows.`,
  },
  {
    id: 'post-smc-fvg-mastery',
    slug: 'mastering-fair-value-gaps-and-order-blocks-institutional-trading',
    title: 'Mastering Fair Value Gaps (FVG) and Order Blocks in Institutional Trading',
    summary: 'Learn how smart money algorithms engineer 3-candle displacement imbalances, differentiate fresh vs mitigated zones, and execute sniper entries using 50% Consequent Encroachment.',
    category: 'SMC Analysis',
    tags: ['SMC', 'FVG', 'OrderBlock', 'PriceAction'],
    author: {
      name: 'Aarka Research Desk',
      role: 'Algorithmic Research',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      bio: 'Algorithmic trading desk publishing systematic Smart Money Concepts research and market microstructure analytics.',
    },
    authorKeyId: 'author_1',
    status: 'published',
    featured: false,
    publishedAt: '2026-11-15T14:30:00.000Z',
    updatedAt: '2026-11-15T14:30:00.000Z',
    readTimeMinutes: 8,
    views: 2890,
    coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
    content: `## What is a True Fair Value Gap (FVG)?

In retail technical analysis, price imbalances are often called "slippage" or "gaps". In institutional market microstructure, an imbalance represents an **inefficiency** where only one side of the market (buyers or sellers) was matched during rapid algorithmic displacement.

A canonical 3-candle FVG occurs when:
- **Candle 1**: Establishes the initial boundary high/low.
- **Candle 2**: An explosive displacement bar with massive directional volume.
- **Candle 3**: Leaves a physical gap between Candle 1's wick and Candle 3's wick.

---

### The 50% Consequent Encroachment (C.E.) Rule

The 50% midpoint of the Fair Value Gap is mathematically referred to as the **Consequent Encroachment**:
$$\\text{C.E.} = \\frac{\\text{FVG High} + \\text{FVG Low}}{2}$$

When algorithmic liquidity sweeps pull back into an unmitigated imbalance:
- Institutional limit orders are clustered heavily around the 50% C.E. level.
- If price closes beyond the far boundary of the FVG, the gap is structurally **INVALIDATED** and flips into an **Inverse Fair Value Gap (IFVG)**.

---

### Inverse FVG (IFVG) Reversal Mechanics

When an imbalance fails to hold and a candle body closes outside its range, the zone is not deleted. Instead, the polarity flips:
- A failed bullish FVG becomes a formidable resistance breaker.
- A failed bearish FVG becomes immediate demand on the retest.`,
  },
  {
    id: 'post-macro-dollar-trajectories',
    slug: 'global-macro-fed-rate-cycles-dollar-dominance-fx-markets',
    title: 'Global Macro: Central Bank Policy Divergence, Dollar Trajectories & Forex Structure',
    summary: 'Evaluating monetary policy divergences between the Federal Reserve, ECB, and RBI, and their immediate impact on EUR/USD, USD/INR, and global asset rotations.',
    category: 'Macro & Forex',
    tags: ['Forex', 'Macro', 'EURUSD', 'USDINR', 'Fed'],
    author: {
      name: 'Dev Anand',
      role: 'Chief Market Strategist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: 'Quantitative macro and institutional SMC trader focusing on precious metals, energy, and equity indices.',
      twitter: 'https://x.com',
      linkedin: 'https://linkedin.com',
    },
    authorKeyId: 'admin',
    status: 'published',
    featured: false,
    publishedAt: '2026-11-10T09:15:00.000Z',
    updatedAt: '2026-11-10T09:15:00.000Z',
    readTimeMinutes: 5,
    views: 1150,
    coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
    content: `## Macroeconomic Backdrop: Rates, Yields & Interbank Liquidity

As global interest rate cycles decouple, institutional foreign exchange desks are observing elevated volatility clusters across G10 and emerging market pairs.

---

### Key Macro Catalysts Under Observation

1. **Real Rate Differentials**: Widening yield spreads between US 10-Year Treasuries and European sovereign benchmarks continue to anchor dollar liquidity.
2. **USD/INR Structural Range**: The Indian Rupee continues to consolidate within a tightly calibrated interbank range, defended by RBI spot market interventions and forward swaps.
3. **Cross-Asset Correlation**: Rising Treasury yields maintain an inverse correlation with speculative growth assets while reinforcing safe-haven dollar bids.

> **Key Takeaway**: Track higher-timeframe Weekly and Daily order blocks on Dollar Index (DXY) before trading directional setups on EUR/USD or commodities.`,
  },
];

// In-Memory & File-based Persistence Cache
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'blog-posts.json');
let inMemoryPosts: BlogPost[] | null = null;

function loadStoredPosts(): BlogPost[] {
  if (inMemoryPosts !== null) return inMemoryPosts;

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryPosts = parsed;
        return inMemoryPosts;
      }
    }
  } catch (err) {
    console.warn('[BlogService] Could not read blog-posts.json, using defaults:', err);
  }

  inMemoryPosts = [...INITIAL_BLOG_POSTS];
  return inMemoryPosts;
}

function persistPosts(posts: BlogPost[]): void {
  inMemoryPosts = posts;
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(posts, null, 2), 'utf8');
  } catch (err) {
    console.warn('[BlogService] Could not write to blog-posts.json (read-only environment):', err);
  }
}

// ── CRUD Methods ─────────────────────────────────────────────────────────────

export async function getAllBlogPosts(options?: {
  status?: 'published' | 'draft' | 'all';
  category?: string;
  tag?: string;
  authorKeyId?: string;
  isAdmin?: boolean;
}): Promise<BlogPost[]> {
  const posts = loadStoredPosts();
  const statusFilter = options?.status || 'published';

  return posts.filter((p) => {
    // Status filter
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      if (!options?.isAdmin && (!options?.authorKeyId || p.authorKeyId !== options.authorKeyId)) {
        return false;
      }
    }

    // Category filter
    if (options?.category && options.category !== 'All' && p.category !== options.category) {
      return false;
    }

    // Tag filter
    if (options?.tag && !p.tags.some((t) => t.toLowerCase() === options.tag?.toLowerCase())) {
      return false;
    }

    return true;
  }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getBlogPostBySlug(slug: string, options?: { allowDraft?: boolean }): Promise<BlogPost | null> {
  const posts = loadStoredPosts();
  const cleanSlug = slug.toLowerCase().trim();
  const found = posts.find((p) => p.slug.toLowerCase() === cleanSlug);

  if (!found) return null;
  if (found.status === 'draft' && !options?.allowDraft) return null;

  return found;
}

export async function createBlogPost(
  data: Omit<BlogPost, 'id' | 'publishedAt' | 'updatedAt' | 'views'>,
  authPasskey: string
): Promise<{ ok: boolean; post?: BlogPost; error?: string }> {
  const { role, authorKeyId } = verifyBlogPasskey(authPasskey);
  if (role === 'none') {
    return { ok: false, error: 'Unauthorized: Invalid Admin or Author passkey.' };
  }

  if (!data.title?.trim() || !data.content?.trim()) {
    return { ok: false, error: 'Title and content are required.' };
  }

  const posts = loadStoredPosts();
  const slug = (data.slug || data.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (posts.some((p) => p.slug === slug)) {
    return { ok: false, error: 'An article with this URL slug already exists. Please choose a unique title or slug.' };
  }

  const wordCount = data.content.split(/\s+/).length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  const newPost: BlogPost = {
    ...data,
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    slug,
    authorKeyId: role === 'admin' ? 'admin' : authorKeyId,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readTimeMinutes,
    views: 0,
  };

  posts.unshift(newPost);
  persistPosts(posts);

  return { ok: true, post: newPost };
}

export async function updateBlogPost(
  id: string,
  updates: Partial<Omit<BlogPost, 'id' | 'authorKeyId'>>,
  authPasskey: string
): Promise<{ ok: boolean; post?: BlogPost; error?: string }> {
  const { role, authorKeyId } = verifyBlogPasskey(authPasskey);
  if (role === 'none') {
    return { ok: false, error: 'Unauthorized: Invalid Admin or Author passkey.' };
  }

  const posts = loadStoredPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) {
    return { ok: false, error: 'Article not found.' };
  }

  const existing = posts[idx];

  // Authors can only edit their own articles. Admin can edit any article.
  if (role !== 'admin' && existing.authorKeyId !== authorKeyId) {
    return { ok: false, error: 'Forbidden: Authors can only edit their own articles.' };
  }

  let readTimeMinutes = existing.readTimeMinutes;
  if (updates.content) {
    const wordCount = updates.content.split(/\s+/).length;
    readTimeMinutes = Math.max(1, Math.round(wordCount / 200));
  }

  const updated: BlogPost = {
    ...existing,
    ...updates,
    readTimeMinutes,
    updatedAt: new Date().toISOString(),
  };

  posts[idx] = updated;
  persistPosts(posts);

  return { ok: true, post: updated };
}

export async function deleteBlogPost(
  id: string,
  authPasskey: string
): Promise<{ ok: boolean; error?: string }> {
  const { role, authorKeyId } = verifyBlogPasskey(authPasskey);
  if (role === 'none') {
    return { ok: false, error: 'Unauthorized: Invalid Admin or Author passkey.' };
  }

  const posts = loadStoredPosts();
  const target = posts.find((p) => p.id === id);
  if (!target) {
    return { ok: false, error: 'Article not found.' };
  }

  // Authors can only delete their own articles. Super Admin can delete any article.
  if (role !== 'admin' && target.authorKeyId !== authorKeyId) {
    return { ok: false, error: 'Forbidden: Authors can only delete their own articles.' };
  }

  const filtered = posts.filter((p) => p.id !== id);
  persistPosts(filtered);

  return { ok: true };
}
