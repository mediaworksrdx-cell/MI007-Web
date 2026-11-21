import { NextRequest, NextResponse } from 'next/server';
import {
  getInProcessBotStatus,
  requestInProcessPairingCode,
  resetInProcessBotSession,
} from '@/lib/alerts/whatsappBotServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const customUrl = req.nextUrl.searchParams.get('url');
  const externalGateway = customUrl || process.env.WHATSAPP_GATEWAY_URL;

  if (externalGateway) {
    try {
      const res = await fetch(`${externalGateway.replace(/\/$/, '')}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }

  // Native In-Process Baileys Execution (Runs directly on Vercel & Node)
  try {
    const status = await getInProcessBotStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      status: 'idle',
      connected: false,
      message: err?.message || 'Bot is ready to link.',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'request-code';
    const externalGateway = body.gatewayUrl || process.env.WHATSAPP_GATEWAY_URL;

    if (externalGateway) {
      try {
        const targetUrl = `${externalGateway.replace(/\/$/, '')}/${action === 'reset' ? 'reset' : 'request-code'}`;
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }
      } catch {}
    }

    // Native In-Process Baileys Execution (Runs directly on Vercel & Node)
    if (action === 'reset') {
      const result = await resetInProcessBotSession();
      return NextResponse.json(result);
    }

    if (action === 'request-code') {
      const phone = body.phone || '+918838202279';
      const result = await requestInProcessPairingCode(phone);
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to generate WhatsApp verification OTP' },
      { status: 500 }
    );
  }
}
