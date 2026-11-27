import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export type Mi007PlanId = 'PULSE' | 'PRO' | 'MASTER_PRO';

const PLAN_PRICING: Record<Mi007PlanId, { name: string; monthlyInr: number }> = {
  PULSE: { name: 'MI-007 Market Pulse (Pulse Basic)', monthlyInr: 599 },
  PRO: { name: 'MI-007 Market Pro (Edge Pro)', monthlyInr: 999 },
  MASTER_PRO: { name: 'MI-007 Market Master Pro (Ultra Alpha)', monthlyInr: 1299 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const planId = (body?.planId as Mi007PlanId) || 'PRO';
    const billingCycle = body?.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    const applyLaunchOffer = body?.applyLaunchOffer !== false; // 15% launch offer enabled by default

    const plan = PLAN_PRICING[planId];
    if (!plan) {
      return NextResponse.json({ ok: false, error: 'Invalid subscription plan.' }, { status: 400 });
    }

    const months = billingCycle === 'ANNUAL' ? 12 : 1;
    const grossInr = plan.monthlyInr * months;
    // 10% annual discount + 15% limited-time new launch discount
    const afterAnnualInr = billingCycle === 'ANNUAL' ? Math.round(grossInr * 0.9) : grossInr;
    const discountedBaseInr = applyLaunchOffer ? Math.round(afterAnnualInr * 0.85) : afterAnnualInr;
    const gstInr = Math.round(discountedBaseInr * 0.18);
    const totalInr = discountedBaseInr + gstInr;
    const amountPaise = totalInr * 100;

    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
    const receipt = `MI007_${planId}_${Date.now()}`;

    // If live/test Razorpay credentials are configured, create an official Razorpay order
    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            planId,
            planName: plan.name,
            billingCycle,
            launchOffer15Pct: String(applyLaunchOffer),
          },
        }),
      });

      if (rzpRes.ok) {
        const orderData = (await rzpRes.json()) as { id: string };
        return NextResponse.json({
          ok: true,
          mode: 'LIVE',
          keyId,
          orderId: orderData.id,
          amountPaise,
          currency: 'INR',
          planId,
          planName: plan.name,
          billingCycle,
          breakdown: {
            grossInr,
            discountedBaseInr,
            gstInr,
            totalInr,
          },
        });
      }
    }

    // Checkout fallback order reference when RAZORPAY_KEY_SECRET is not yet in .env.local
    const fallbackOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    return NextResponse.json({
      ok: true,
      mode: keyId ? 'CLIENT_KEY_ONLY' : 'DEMO_CHECKOUT',
      keyId: keyId || 'rzp_test_mi007_placeholder',
      orderId: fallbackOrderId,
      amountPaise,
      currency: 'INR',
      planId,
      planName: plan.name,
      billingCycle,
      breakdown: {
        grossInr,
        discountedBaseInr,
        gstInr,
        totalInr,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to initialize Razorpay order.' },
      { status: 500 }
    );
  }
}
