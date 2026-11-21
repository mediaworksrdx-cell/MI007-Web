import { NextRequest, NextResponse } from 'next/server';
import { routeGetStatus } from '@/lib/otp/router';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Challenge ID required' }, { status: 400 });
    }

    const status = routeGetStatus(id);
    if (!status) {
      return NextResponse.json({ ok: false, error: 'Challenge not found or expired' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Error fetching status' }, { status: 500 });
  }
}
