import crypto from 'crypto';

export type OtpChannel = 'whatsapp' | 'email';
export type OtpPurpose = 'login' | 'registration' | 'alerts' | 'verification';

export interface OtpChallenge {
  challengeId: string;
  destination: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  hmac: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
  resendAvailableAt: number;
  verified: boolean;
  deliveryLogs: Array<{
    channel: OtpChannel;
    timestamp: number;
    status: 'SENT' | 'FAILED' | 'QUEUED';
    detail?: string;
  }>;
}

// In-memory challenge store (can be backed by Redis / PostgreSQL)
const challengeStore = new Map<string, OtpChallenge>();
const destinationIndex = new Map<string, string>(); // destination -> active challengeId

// Ephemeral per-process random secret if OTP_SECRET is unset (never a predictable hardcoded string)
const EPHEMERAL_OTP_SECRET = crypto.randomBytes(32).toString('hex');
const OTP_SECRET = process.env.OTP_SECRET || EPHEMERAL_OTP_SECRET;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

function hashOtp(otp: string, challengeId: string): string {
  return crypto.createHmac('sha256', OTP_SECRET).update(`${challengeId}:${otp}`).digest('hex');
}

export function generateNumericOtp(): string {
  // Cryptographically secure 6-digit numeric OTP (100000..999999 inclusive)
  return crypto.randomInt(100000, 1000000).toString();
}

export function cleanDestination(destination: string, channel: OtpChannel): string {
  if (channel === 'whatsapp') {
    return String(destination || '').trim().replace(/[\s+()\-]/g, '');
  }
  return String(destination || '').trim().toLowerCase();
}

export function formatOtpMessage(otp: string): string {
  return [
    'MI-007 Verification',
    '',
    'Your verification code is:',
    `*${otp}*`,
    '',
    'Valid for 5 minutes.',
    'Do not share this code with anyone.',
    '',
    'MARKET INTELLIGENCE AI — MI-007',
    'Synthetix Analytics',
  ].join('\n');
}

export interface CreateChallengeOptions {
  destination: string;
  channel: OtpChannel;
  purpose?: OtpPurpose;
}

export interface CreateChallengeResult {
  challengeId: string;
  destination: string;
  channel: OtpChannel;
  expiresInSeconds: number;
  cooldownSeconds: number;
  rawOtp: string; // Internal only, for delivery bots
  isReuse: boolean;
}

/**
 * Creates or reuses an active OTP challenge for the given destination.
 * If an active, unexpired challenge already exists for the user, reuses the same OTP.
 */
export function createOtpChallenge(options: CreateChallengeOptions): CreateChallengeResult {
  const channel = options.channel;
  const destination = cleanDestination(options.destination, channel);
  const purpose = options.purpose || 'verification';
  const now = Date.now();

  // Check if active challenge exists for this destination
  const existingId = destinationIndex.get(destination);
  if (existingId) {
    const existing = challengeStore.get(existingId);
    if (existing && !existing.verified && now < existing.expiresAt && existing.attempts < existing.maxAttempts) {
      // Cooldown enforcement for resend
      if (now < existing.resendAvailableAt) {
        const remainingCooldown = Math.ceil((existing.resendAvailableAt - now) / 1000);
        throw new Error(`Please wait ${remainingCooldown} seconds before requesting another code.`);
      }

      // We need a fresh OTP if switching channels or resending
      const freshOtp = generateNumericOtp();
      existing.hmac = hashOtp(freshOtp, existing.challengeId);
      existing.channel = channel;
      existing.resendAvailableAt = now + RESEND_COOLDOWN_MS;
      existing.expiresAt = now + OTP_EXPIRY_MS;

      return {
        challengeId: existing.challengeId,
        destination,
        channel,
        expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000),
        cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
        rawOtp: freshOtp,
        isReuse: true,
      };
    }
  }

  // Create new challenge with opaque high-entropy ID (never embed OTP HMAC in client token)
  const challengeId = `ch_${crypto.randomBytes(16).toString('hex')}`;
  const rawOtp = generateNumericOtp();
  const hmac = hashOtp(rawOtp, challengeId);
  const expiresAt = now + OTP_EXPIRY_MS;
  const resendAvailableAt = now + RESEND_COOLDOWN_MS;

  const challenge: OtpChallenge = {
    challengeId,
    destination,
    channel,
    purpose,
    hmac,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: now,
    expiresAt,
    resendAvailableAt,
    verified: false,
    deliveryLogs: [],
  };

  challengeStore.set(challengeId, challenge);
  destinationIndex.set(destination, challengeId);

  return {
    challengeId,
    destination,
    channel,
    expiresInSeconds: Math.ceil(OTP_EXPIRY_MS / 1000),
    cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    rawOtp,
    isReuse: false,
  };
}

export function recordDeliveryLog(
  challengeId: string,
  channel: OtpChannel,
  status: 'SENT' | 'FAILED' | 'QUEUED',
  detail?: string
): void {
  const challenge = challengeStore.get(challengeId);
  if (challenge) {
    challenge.deliveryLogs.push({
      channel,
      timestamp: Date.now(),
      status,
      detail,
    });
  }
}

export interface VerifyResult {
  ok: boolean;
  verified: boolean;
  message: string;
  destination?: string;
  channel?: OtpChannel;
}

export function verifyOtpChallenge(
  challengeId: string,
  inputOtp: string,
  destinationFallback?: string
): VerifyResult {
  const cleanInput = String(inputOtp || '').trim().replace(/[^0-9]/g, '');
  const cleanDest = destinationFallback ? cleanDestination(destinationFallback, 'whatsapp') : '';

  // 1. Resolve challenge strictly from server-side store (prevents replay & attempt-cap bypass)
  let challenge = challengeStore.get(challengeId);
  if (!challenge && cleanDest) {
    const existingId = destinationIndex.get(cleanDest);
    if (existingId) {
      challenge = challengeStore.get(existingId);
    }
  }

  const now = Date.now();

  if (!challenge) {
    return {
      ok: false,
      verified: false,
      message: 'Challenge not found or has expired. Please request a new code.',
    };
  }

  if (challenge.verified) {
    return {
      ok: false,
      verified: false,
      message: 'This OTP has already been used. Please request a new code.',
    };
  }

  if (now > challenge.expiresAt) {
    challengeStore.delete(challengeId);
    challengeStore.delete(challenge.challengeId);
    destinationIndex.delete(challenge.destination);
    return {
      ok: false,
      verified: false,
      message: 'Verification code has expired. Please request a new one.',
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challengeStore.delete(challengeId);
    challengeStore.delete(challenge.challengeId);
    destinationIndex.delete(challenge.destination);
    return {
      ok: false,
      verified: false,
      message: 'Too many incorrect attempts. For security, this challenge has been locked.',
    };
  }

  challenge.attempts += 1;
  const candidateHmac = hashOtp(cleanInput, challenge.challengeId);

  // Constant-time comparison to prevent timing attacks
  const match = crypto.timingSafeEqual(
    Buffer.from(candidateHmac, 'hex'),
    Buffer.from(challenge.hmac, 'hex')
  );

  if (!match) {
    const remaining = challenge.maxAttempts - challenge.attempts;
    return {
      ok: false,
      verified: false,
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Successfully verified — mark verified and consume
  challenge.verified = true;
  destinationIndex.delete(challenge.destination);

  return {
    ok: true,
    verified: true,
    message: 'Verification successful.',
    destination: challenge.destination,
    channel: challenge.channel,
  };
}

export function getChallengeStatus(challengeId: string) {
  const challenge = challengeStore.get(challengeId);
  if (!challenge) return null;

  return {
    challengeId: challenge.challengeId,
    destination: challenge.destination,
    channel: challenge.channel,
    purpose: challenge.purpose,
    verified: challenge.verified,
    attempts: challenge.attempts,
    maxAttempts: challenge.maxAttempts,
    expired: Date.now() > challenge.expiresAt,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    deliveryLogs: challenge.deliveryLogs,
  };
}
