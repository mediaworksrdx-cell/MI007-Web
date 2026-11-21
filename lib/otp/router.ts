import {
  createOtpChallenge,
  verifyOtpChallenge,
  recordDeliveryLog,
  getChallengeStatus,
  OtpChannel,
  OtpPurpose,
} from './engine';
import { dispatchWhatsAppOtp } from './whatsappDispatcher';
import { dispatchEmailOtp } from './emailDispatcher';

export interface SendOtpRequest {
  destination: string;
  channel: OtpChannel;
  purpose?: OtpPurpose;
}

export interface SendOtpResponse {
  ok: boolean;
  challenge_id?: string;
  channel?: OtpChannel;
  destination?: string;
  expires_in?: number;
  cooldown?: number;
  message: string;
  error?: string;
}

/**
 * Central Message Router: Dispatches OTP via the selected channel
 * and records the challenge state.
 */
export async function routeAndSendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
  const { destination, channel, purpose } = request;

  if (!destination) {
    return {
      ok: false,
      message: 'Destination (phone number or email) is required.',
      error: 'Destination is required.',
    };
  }

  try {
    const challenge = createOtpChallenge({ destination, channel, purpose });

    let dispatchOk = false;
    let dispatchError = '';

    if (channel === 'whatsapp') {
      const waResult = await dispatchWhatsAppOtp(challenge.destination, challenge.rawOtp, challenge.challengeId);
      if (waResult.ok) {
        dispatchOk = true;
        recordDeliveryLog(challenge.challengeId, 'whatsapp', 'SENT', waResult.messageId);
      } else {
        dispatchError = waResult.error || 'Failed to dispatch via WhatsApp Bot';
        recordDeliveryLog(challenge.challengeId, 'whatsapp', 'FAILED', dispatchError);
      }
    } else if (channel === 'email') {
      const emResult = await dispatchEmailOtp(challenge.destination, challenge.rawOtp);
      if (emResult.ok) {
        dispatchOk = true;
        recordDeliveryLog(challenge.challengeId, 'email', 'SENT', emResult.messageId);
      } else {
        dispatchError = emResult.error || 'Failed to dispatch via Email Bot';
        recordDeliveryLog(challenge.challengeId, 'email', 'FAILED', dispatchError);
      }
    }

    if (!dispatchOk) {
      return {
        ok: false,
        challenge_id: challenge.challengeId,
        channel,
        destination: challenge.destination,
        message: `Failed to deliver OTP via ${channel}: ${dispatchError}`,
        error: dispatchError,
      };
    }

    return {
      ok: true,
      challenge_id: challenge.challengeId,
      channel,
      destination: challenge.destination,
      expires_in: challenge.expiresInSeconds,
      cooldown: challenge.cooldownSeconds,
      message: `Verification code sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} to ${challenge.destination}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Failed to generate and route OTP challenge',
      error: err?.message || 'Internal OTP Router Error',
    };
  }
}

export function routeAndVerifyOtp(challengeId: string, otp: string, destination?: string) {
  return verifyOtpChallenge(challengeId, otp, destination);
}

export function routeGetStatus(challengeId: string) {
  return getChallengeStatus(challengeId);
}
