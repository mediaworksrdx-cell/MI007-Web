/**
 * Meta WhatsApp Business Cloud API Dispatcher
 * Directly integrates with Meta Graph API v21.0
 * Zero Linked Devices, zero QR codes, enterprise 99.9% global delivery.
 */

export interface MetaDispatchResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function dispatchMetaCloudOtp(
  phone: string,
  otp: string
): Promise<MetaDispatchResult> {
  const token =
    process.env.META_WHATSAPP_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_CLOUD_API_TOKEN ||
    '';

  const phoneId =
    process.env.META_WHATSAPP_PHONE_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_CLOUD_PHONE_ID ||
    '';

  const templateName =
    process.env.META_WHATSAPP_TEMPLATE_NAME || 'otp_verification';

  if (!token || !phoneId) {
    return {
      ok: false,
      error:
        'Meta WhatsApp Cloud API credentials not configured (META_WHATSAPP_TOKEN / META_WHATSAPP_PHONE_ID).',
    };
  }

  // Clean phone number (must be international format without + or spaces)
  const cleanPhone = String(phone || '').replace(/[\s+()\-]/g, '');
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return {
      ok: false,
      error: 'Invalid international phone number format.',
    };
  }

  const candidatePhoneIds = [phoneId];

  let lastError = '';

  for (const pid of candidatePhoneIds) {
    const url = `https://graph.facebook.com/v21.0/${pid}/messages`;

    // 1. Direct formatted text message
    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: `MI-007 Verification\n\nYour verification code is:\n*${otp}*\n\nValid for 5 minutes.\nDo not share this code with anyone.\n\nMARKET INTELLIGENCE AI — MI-007\nSynthetix Analytics`,
      },
    };

    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload),
        signal: AbortSignal.timeout(8000),
      });

      let data = await res.json().catch(() => ({}));

      // If text message requires template, fallback to template payload
      if (!res.ok) {
        const templatePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: otp }],
              },
            ],
          },
        };

        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templatePayload),
          signal: AbortSignal.timeout(8000),
        });

        data = await res.json().catch(() => ({}));
      }

      if (res.ok && data?.messages?.[0]?.id) {
        return {
          ok: true,
          messageId: data.messages[0].id,
        };
      }

      lastError =
        data?.error?.message ||
        data?.error?.error_data?.details ||
        `Meta API returned HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err?.message || 'Meta Cloud API network timeout';
    }
  }

  return {
    ok: false,
    error: lastError,
  };
}
