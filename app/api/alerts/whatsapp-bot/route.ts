import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = (process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:5050').replace(/\/$/, '');

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/status`, {
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
      message: 'WhatsApp Gateway microservice is offline.',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'request-code';

    if (action === 'reset') {
      const res = await fetch(`${GATEWAY_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'request-code') {
      const phone = body.phone || '+918838202279';
      const res = await fetch(`${GATEWAY_URL}/request-code`, {
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
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to communicate with WhatsApp gateway' },
      { status: 500 }
    );
  }
}
