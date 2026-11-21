import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gatewayUrl = (
    process.env.WHATSAPP_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_GATEWAY_URL ||
    'https://synthetixanalytics.com/whatsapp'
  ).replace(/\/$/, '');

  try {
    const res = await fetch(`${gatewayUrl}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      service: 'mi007-whatsapp-bot',
      gateway: gatewayUrl,
      bot: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        service: 'mi007-whatsapp-bot',
        gateway: gatewayUrl,
        error: err?.message || 'Failed to connect to WhatsApp Bot gateway on GCP',
      },
      { status: 503 }
    );
  }
}
