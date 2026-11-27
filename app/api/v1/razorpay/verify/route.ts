import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.razorpay_order_id || '').trim();
    const paymentId = String(body?.razorpay_payment_id || '').trim();
    const signature = String(body?.razorpay_signature || '').trim();
    const planId = String(body?.planId || 'PRO').trim();
    const billingCycle = String(body?.billingCycle || 'MONTHLY').trim();

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing Razorpay payment ID.' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (keySecret && orderId && signature) {
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        return NextResponse.json(
          { ok: false, error: 'Razorpay payment signature verification failed.' },
          { status: 400 }
        );
      }
    }

    const validUntil = new Date(
      Date.now() + (billingCycle === 'ANNUAL' ? 365 : 30) * 86_400_000
    ).toISOString();

    return NextResponse.json({
      ok: true,
      subscription: {
        planId,
        billingCycle,
        paymentId,
        orderId,
        status: 'ACTIVE',
        activatedAt: new Date().toISOString(),
        validUntil,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to verify Razorpay payment.' },
      { status: 500 }
    );
  }
}
