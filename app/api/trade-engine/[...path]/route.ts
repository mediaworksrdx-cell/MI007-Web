import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const GCP_TRADE_ENGINE_URL = (process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

// Strict allowlist of safe read-only Trade Engine endpoints (prevents arbitrary proxy / path traversal)
const ALLOWED_GET_EXACT = new Set([
  'candles',
  'live-prices',
  'macro-data',
  'crypto-prices',
  'news',
  'economic-calendar',
  'notifications',
  'search',
  'us/eod',
  'us/quote',
  'fno/quote',
  'fno/chain',
  'fno/status',
  'crypto/candles',
  'crypto/ticker',
  'crypto/scan',
]);

const ALLOWED_GET_PREFIXES = ['historical/kite/', 'historical/coingecko/'];

function sanitizeAndValidatePath(segments: string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 6) return null;
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || seg.includes('\\') || seg.includes('..') || !/^[A-Za-z0-9._-]+$/.test(seg)) {
      return null;
    }
  }
  const normalized = segments.join('/');
  if (ALLOWED_GET_EXACT.has(normalized)) return normalized;
  if (ALLOWED_GET_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return normalized;
  return null;
}

function isAuthorizedAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET || process.env.TRADE_ENGINE_SECRET;
  if (!adminSecret) return false;
  const provided =
    request.headers.get('x-mi007-admin-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  if (provided.length !== adminSecret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(adminSecret));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const safePath = sanitizeAndValidatePath(path);
  if (!safePath) {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }

  const targetUrl = `${GCP_TRADE_ENGINE_URL}/${safePath}${request.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MI007-Vercel-Proxy/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    // Force application/json + nosniff so upstream HTML/text can never execute as same-origin XSS
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Trade Engine temporarily unavailable' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  // Mutating upstream Trade Engine routes (e.g. /subscribe) require server/admin authentication
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await context.params;
  const normalized = Array.isArray(path) ? path.join('/') : '';
  if (normalized !== 'subscribe') {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }

  const targetUrl = `${GCP_TRADE_ENGINE_URL}/subscribe`;
  const body = await request.text();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (process.env.TRADE_ENGINE_SECRET) {
      headers['X-Trade-Engine-Secret'] = process.env.TRADE_ENGINE_SECRET;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: body || undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Trade Engine temporarily unavailable' },
      { status: 502 }
    );
  }
}
