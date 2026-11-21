import { NextRequest, NextResponse } from 'next/server';

function getGatewayUrl(customUrl?: string | null): string {
  return (customUrl || process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:5050').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const customUrl = req.nextUrl.searchParams.get('url');
  const gatewayUrl = getGatewayUrl(customUrl);

  try {
    const res = await fetch(`${gatewayUrl}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: 'offline', connected: false, error: 'Gateway returned error' });
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      status: data.status || 'unknown',
      connected: Boolean(data.connected),
      user: data.user || null,
      pairingCode: data.pairingCode || null,
      pairingPhone: data.pairingPhone || null,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      status: 'offline',
      connected: false,
      message: `WhatsApp Gateway microservice is offline (${gatewayUrl}).`,
    });
  }
}

export async function POST(req: NextRequest) {
  let targetGateway = getGatewayUrl();
  try {
    const body = await req.json().catch(() => ({}));
    if (body.gatewayUrl) {
      targetGateway = getGatewayUrl(body.gatewayUrl);
    }
    const action = body.action || 'request-code';

    if (action === 'reset') {
      const res = await fetch(`${targetGateway}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'request-code') {
      const phone = body.phone || '+918838202279';
      const res = await fetch(`${targetGateway}/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    const isConnRefused =
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.message?.includes('fetch failed') ||
      err?.name === 'TypeError';

    const helpfulMsg = isConnRefused
      ? `WhatsApp Gateway is offline or unreachable at ${targetGateway}. To use Private Bot OTP pairing, start the gateway ("npm run whatsapp:bot" on your server), or switch to CallMeBot for free zero-server cloud alerts.`
      : err?.message || 'Failed to communicate with WhatsApp gateway';

    return NextResponse.json(
      { ok: false, error: helpfulMsg },
      { status: 503 }
    );
  }
}
