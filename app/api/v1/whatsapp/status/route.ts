import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gatewayUrl = (process.env.WHATSAPP_GATEWAY_URL || '').replace(/\/$/, '');
  if (!gatewayUrl) {
    return NextResponse.json(
      {
        ok: false,
        service: 'mi007-whatsapp-bot',
        configured: false,
      },
      { status: 503 }
    );
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.WHATSAPP_GATEWAY_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.WHATSAPP_GATEWAY_SECRET}`;
    }

    const res = await fetch(`${gatewayUrl}/status`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      ok: res.ok,
      service: 'mi007-whatsapp-bot',
      connected: Boolean(data?.connected),
      status: data?.status || 'unknown',
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: 'mi007-whatsapp-bot',
        error: 'WhatsApp gateway temporarily unavailable',
      },
      { status: 503 }
    );
  }
}
