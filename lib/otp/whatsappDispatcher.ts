import { formatOtpMessage } from './engine';

export interface WhatsAppDispatchResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Dispatches a formatted OTP message to our dedicated WhatsApp Bot microservice on the GCP VM.
 */
export async function dispatchWhatsAppOtp(
  phone: string,
  otp: string,
  challengeId?: string
): Promise<WhatsAppDispatchResult> {
  const gatewayUrl = (
    process.env.WHATSAPP_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_GATEWAY_URL ||
    'https://synthetixanalytics.com/whatsapp'
  ).replace(/\/$/, '');

  const cleanPhone = String(phone || '').replace(/[\s+()\-]/g, '');
  const text = formatOtpMessage(otp);

  try {
    const res = await fetch(`${gatewayUrl}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        otp,
        text,
        challenge_id: challengeId,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.ok) {
      return { ok: true, messageId: data?.messageId || `wa_${Date.now()}` };
    }

    return {
      ok: false,
      error: data?.error || `WhatsApp gateway returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to reach WhatsApp Bot gateway',
    };
  }
}
