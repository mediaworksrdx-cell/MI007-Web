import { NextRequest, NextResponse } from 'next/server';
import { routeGetStatus } from '@/lib/otp/router';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

function maskDestination(dest: string): string {
  const s = String(dest || '').trim();
  if (s.includes('@')) {
    const [local, domain] = s.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (s.length <= 4) return '****';
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit('otp-status', ip, 30, 5 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many requests. Retry in ${rate.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Challenge ID required' }, { status: 400 });
    }

    const status = routeGetStatus(id);
    if (!status) {
      return NextResponse.json({ ok: false, error: 'Challenge not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: {
        ...status,
        destination: maskDestination(status.destination),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Error fetching status' }, { status: 500 });
  }
}
