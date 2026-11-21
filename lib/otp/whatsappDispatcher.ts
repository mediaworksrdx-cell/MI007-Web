import { formatOtpMessage } from './engine';
import { dispatchMetaCloudOtp } from './metaWhatsAppDispatcher';

export interface WhatsAppDispatchResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Universal WhatsApp OTP Dispatcher:
 * 1. Checks Meta WhatsApp Cloud API (Primary — No linked devices, zero QR codes).
 * 2. Falls back to Self-Hosted GCP Bot Gateway.
 */
export async function dispatchWhatsAppOtp(
  phone: string,
  otp: string,
  challengeId?: string
): Promise<WhatsAppDispatchResult> {
  // 1. Meta WhatsApp Business Cloud API (Official worldwide OTP delivery)
  const metaResult = await dispatchMetaCloudOtp(phone, otp);
  if (metaResult.ok) {
    return metaResult;
  }

  // 2. Self-Hosted GCP Microservice Gateway
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
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.ok) {
      return { ok: true, messageId: data?.messageId || `wa_${Date.now()}` };
    }

    // Return upstream Meta error or gateway error if available, without internal code leakage
    return {
      ok: false,
      error:
        metaResult.error ||
        data?.error ||
        'Unable to deliver WhatsApp OTP. Please ensure your number is valid and capable of receiving WhatsApp messages.',
    };
  } catch {
    return {
      ok: false,
      error:
        metaResult.error ||
        'WhatsApp delivery service temporarily unavailable. Please try again.',
    };
  }
}
