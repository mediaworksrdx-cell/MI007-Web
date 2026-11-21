import { NextRequest, NextResponse } from 'next/server';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const targetUrl = `${GCP_TRADE_ENGINE_URL}/${pathStr}${request.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MI007-Vercel-Proxy/1.0',
      },
      cache: 'no-store',
    });
    const data = await res.arrayBuffer();
    const hostHeader = GCP_TRADE_ENGINE_URL.includes('://') 
      ? new URL(GCP_TRADE_ENGINE_URL).host 
      : 'GCP-34.27.67.139';
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Trade-Engine-Host': hostHeader,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Trade Engine unreachable on GCP', details: err?.message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const targetUrl = `${GCP_TRADE_ENGINE_URL}/${pathStr}${request.nextUrl.search}`;
  const body = await request.text();

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'Accept': 'application/json',
      },
      body: body || undefined,
      cache: 'no-store',
    });
    const data = await res.arrayBuffer();
    const hostHeader = GCP_TRADE_ENGINE_URL.includes('://') 
      ? new URL(GCP_TRADE_ENGINE_URL).host 
      : 'GCP-34.27.67.139';
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Trade-Engine-Host': hostHeader,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Trade Engine unreachable on GCP', details: err?.message },
      { status: 502 }
    );
  }
}
