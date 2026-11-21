import fs from 'fs';
import path from 'path';
import pino from 'pino';

let activeSock: any = null;
let currentPairingCode: string | null = null;
let currentPairingPhone: string | null = null;
let connectionState: string = 'idle';

function getAuthDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'whatsapp_auth');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {}
    }
    return tmpDir;
  }
  const localDir = path.resolve(process.cwd(), 'whatsapp_auth');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }
  return localDir;
}

export function cleanPhoneNumber(phone: string): string {
  return String(phone || '').replace(/[\s+()\-]/g, '');
}

export function formatPairingCode(code: string): string {
  if (!code) return '';
  const clean = String(code).trim().replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

export async function getInProcessBotStatus(): Promise<{
  ok: boolean;
  status: string;
  connected: boolean;
  user: string | null;
  pairingCode: string | null;
  pairingPhone: string | null;
}> {
  try {
    const { useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    const authDir = getAuthDir();
    const { state } = await useMultiFileAuthState(authDir);
    const isRegistered = Boolean(state?.creds?.registered);
    const user = state?.creds?.me?.id || null;

    if (isRegistered) {
      connectionState = 'connected';
      return {
        ok: true,
        status: 'connected',
        connected: true,
        user,
        pairingCode: null,
        pairingPhone: null,
      };
    }

    return {
      ok: true,
      status: currentPairingCode ? 'awaiting_pairing' : connectionState,
      connected: false,
      user: null,
      pairingCode: currentPairingCode,
      pairingPhone: currentPairingPhone,
    };
  } catch {
    return {
      ok: true,
      status: 'idle',
      connected: false,
      user: null,
      pairingCode: currentPairingCode,
      pairingPhone: currentPairingPhone,
    };
  }
}

export async function requestInProcessPairingCode(phoneInput: string): Promise<{
  ok: boolean;
  code: string;
  phone: string;
}> {
  const digits = cleanPhoneNumber(phoneInput);
  if (!digits || digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid phone number: "${phoneInput}". Must contain 8 to 15 digits including country code.`);
  }

  const { default: makeWASocket, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
  const authDir = getAuthDir();
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }) as any,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  sock.ev.on('creds.update', saveCreds);
  activeSock = sock;

  // Allow socket to initiate connection handshake with WhatsApp servers
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const rawCode = await sock.requestPairingCode(digits);
  const formatted = formatPairingCode(rawCode);
  currentPairingCode = formatted;
  currentPairingPhone = `+${digits}`;
  connectionState = 'awaiting_pairing';

  return {
    ok: true,
    code: formatted,
    phone: `+${digits}`,
  };
}

export async function resetInProcessBotSession(): Promise<{ ok: boolean; message: string }> {
  try {
    if (activeSock) {
      try {
        await activeSock.logout();
      } catch {}
      activeSock = null;
    }
    const authDir = getAuthDir();
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    currentPairingCode = null;
    currentPairingPhone = null;
    connectionState = 'idle';
    return { ok: true, message: 'WhatsApp session reset. Ready to pair again.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Failed to reset session' };
  }
}

export async function sendInProcessBotMessage(
  phoneInput: string,
  text: string
): Promise<{ ok: boolean; message: string }> {
  const digits = cleanPhoneNumber(phoneInput);
  if (!digits) {
    return { ok: false, message: 'Phone number is required.' };
  }

  const { default: makeWASocket, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
  const authDir = getAuthDir();
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  if (!state?.creds?.registered && !activeSock) {
    return {
      ok: false,
      message: 'WhatsApp Bot is not linked yet. Please enter pairing OTP on your phone first.',
    };
  }

  const sock =
    activeSock ||
    makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }) as any,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    });

  sock.ev.on('creds.update', saveCreds);
  activeSock = sock;

  const jid = `${digits}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
  return { ok: true, message: `Delivered to WhatsApp (+${digits})` };
}
