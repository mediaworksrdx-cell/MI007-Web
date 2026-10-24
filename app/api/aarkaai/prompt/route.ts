import { NextRequest, NextResponse } from 'next/server';

const AARKAAI_BASE_URL =
  process.env.AARKAAI_BASE_URL ||
  process.env.NEXT_PUBLIC_AARKAAI_BASE_URL ||
  'https://synthetixanalytics.com';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, sessionId = 'academy-mentor-session' } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    if (query.length > 2000) {
      return NextResponse.json({ error: 'Query exceeds maximum length of 2000 characters' }, { status: 400 });
    }

    const upstreamRes = await fetch(`${AARKAAI_BASE_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        session_id: sessionId,
        mode: 'production',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Aarka AI upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
