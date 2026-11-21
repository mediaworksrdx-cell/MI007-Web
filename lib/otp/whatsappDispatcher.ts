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
  const hasMetaConfig = Boolean(
    (process.env.META_WHATSAPP_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.WHATSAPP_CLOUD_API_TOKEN) &&
      (process.env.META_WHATSAPP_PHONE_ID ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        process.env.WHATSAPP_CLOUD_PHONE_ID)
  );

  // 1. Meta WhatsApp Business Cloud API (Official worldwide OTP delivery)
  if (hasMetaConfig) {
    const metaResult = await dispatchMetaCloudOtp(phone, otp);
    if (metaResult.ok) {
      return metaResult;
    }
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

    // Client-safe error: never leak pairing codes or internal terminal messages
    return {
      ok: false,
      error: 'Unable to deliver WhatsApp OTP at this moment. Please check your phone number or try again.',
    };
  } catch {
    return {
      ok: false,
      error: 'WhatsApp delivery service temporarily unavailable.',
    };
  }
}
