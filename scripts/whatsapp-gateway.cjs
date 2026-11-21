/**
 * Private Self-Hosted WhatsApp Alert Gateway
 * Powered by @whiskeysockets/baileys
 *
 * Runs a standalone HTTP microservice on port 5050.
 * Supports OTP Pairing Code (no QR camera scan needed) & QR fallback.
 * Permanent session saved to whatsapp_auth/ with $0 ongoing fees.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const PORT = parseInt(process.env.PORT || '5050', 10);
const AUTH_DIR = path.resolve(__dirname, '..', 'whatsapp_auth');

let sock = null;
let connectionState = 'initializing';
let currentQr = null;
let connectedUser = null;
let currentPairingCode = null;
let currentPairingPhone = null;
let isStarting = false;

function cleanPhoneNumber(phone) {
  return String(phone || '').replace(/[\s+()\-]/g, '');
}

function formatPairingCode(code) {
  if (!code) return '';
  const clean = String(code).trim().replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean;
}

async function requestPairing(phoneInput) {
  const digits = cleanPhoneNumber(phoneInput);
  if (!digits || digits.length < 8 || digits.length > 15) {
    throw new Error(`Invalid phone number: "${phoneInput}". Must contain 8 to 15 digits including country code.`);
  }

  if (connectionState === 'connected') {
    throw new Error(`WhatsApp is already connected as ${connectedUser || 'active user'}. Use /reset to switch accounts.`);
  }

  if (!sock) {
    throw new Error('WhatsApp socket is not initialized yet. Please wait a few seconds and try again.');
  }

  try {
    const rawCode = await sock.requestPairingCode(digits);
    const formatted = formatPairingCode(rawCode);
    currentPairingCode = formatted;
    currentPairingPhone = `+${digits}`;

    console.log('\n================================================================');
    console.log(`⚡ WHATSAPP OTP PAIRING CODE FOR +${digits}:`);
    console.log(`\n                  👉   ${formatted}   👈\n`);
    console.log('📌 HOW TO LINK ON YOUR PHONE:');
    console.log('   1. Open WhatsApp on your phone (+91' + digits.slice(-10) + ')');
    console.log('   2. Tap Settings (iOS) or 3 Dots (Android) -> Linked Devices');
    console.log('   3. Tap "Link a device"');
    console.log('   4. Tap "Link with phone number instead" at the bottom of the screen');
    console.log(`   5. Enter this 8-character pairing code: ${formatted}`);
    console.log('================================================================\n');

    return { ok: true, code: formatted, phone: `+${digits}` };
  } catch (err) {
    console.error('[WhatsApp Bot] Error requesting pairing code:', err?.message || err);
    throw err;
  }
}

async function startWhatsAppBot(requestedPhone = null) {
  if (isStarting) return;
  isStarting = true;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version = undefined;
    try {
      const vRes = await fetchLatestBaileysVersion();
      version = vRes.version;
    } catch {}

    const isRegistered = Boolean(state?.creds?.registered);

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      syncFullHistory: false,
      browser: ['MI-007 Platform', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        if (!isRegistered && connectionState !== 'connected') {
          connectionState = 'awaiting_pairing';
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionState = 'disconnected';
        connectedUser = null;
        console.log(`[WhatsApp Bot] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
        isStarting = false;
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppBot(), 3000);
        } else {
          console.log('[WhatsApp Bot] Session logged out. Delete whatsapp_auth/ or call /reset to pair again.');
        }
      } else if (connection === 'open') {
        connectionState = 'connected';
        currentQr = null;
        currentPairingCode = null;
        connectedUser = sock?.user?.id || 'Connected';
        isStarting = false;
        console.log('\n================================================================');
        console.log(`✅ WHATSAPP BOT CONNECTED! Signed in as: ${connectedUser}`);
        console.log(`⚡ Ready to send automated trade alerts on http://localhost:${PORT}`);
        console.log('================================================================\n');
      }
    });

    // Auto-request pairing code on startup if not registered
    if (!isRegistered) {
      connectionState = 'awaiting_pairing';
      const defaultPhone = requestedPhone || process.env.PHONE || process.argv[2] || '+918838202279';
      setTimeout(async () => {
        if (!state.creds.registered && connectionState !== 'connected') {
          try {
            await requestPairing(defaultPhone);
          } catch (e) {
            console.log(`[WhatsApp Bot] Ready for pairing. Awaiting phone number on http://localhost:${PORT}/request-code or terminal.`);
          }
        }
      }, 2500);
    }
  } catch (err) {
    isStarting = false;
    console.error('[WhatsApp Bot] Initialization error:', err);
  }
}

// ── HTTP REST Server ──────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health / Status Endpoint
  if (url.pathname === '/status' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: connectionState,
        connected: connectionState === 'connected',
        user: connectedUser,
        hasQr: Boolean(currentQr),
        pairingCode: currentPairingCode,
        pairingPhone: currentPairingPhone,
      })
    );
    return;
  }

  // Request OTP Pairing Code Endpoint
  if (url.pathname === '/request-code' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10000) req.destroy();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const phone = data.phone || process.env.PHONE || '+918838202279';
        const result = await requestPairing(phone);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to request pairing code' }));
      }
    });
    return;
  }

  // Reset / Logout Session Endpoint
  if (url.pathname === '/reset' && req.method === 'POST') {
    try {
      if (sock) {
        try {
          await sock.logout();
        } catch {}
      }
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      connectionState = 'disconnected';
      connectedUser = null;
      currentPairingCode = null;
      currentPairingPhone = null;
      currentQr = null;
      setTimeout(() => startWhatsAppBot(), 1500);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'WhatsApp session reset. Ready to pair again.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to reset session' }));
    }
    return;
  }

  // Send Alert or OTP Endpoint
  if ((url.pathname === '/send' || url.pathname === '/send-otp') && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const rawPhone = String(data.phone || '').trim();
        let text = String(data.text || '').trim();
        if (!text && data.otp) {
          text = [
            'MI-007 Verification',
            '',
            'Your verification code is:',
            `*${data.otp}*`,
            '',
            'Valid for 5 minutes.',
            'Do not share this code with anyone.',
            '',
            'MARKET INTELLIGENCE AI — MI-007',
            'Synthetix Analytics',
          ].join('\n');
        }

        if (!rawPhone || !text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Both "phone" and "text" fields are required.' }));
          return;
        }

        if (connectionState !== 'connected' || !sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              ok: false,
              error: `WhatsApp Bot is not connected yet (current state: ${connectionState}). Please enter pairing OTP on your phone first.`,
            })
          );
          return;
        }

        const cleanDigits = cleanPhoneNumber(rawPhone);
        if (cleanDigits.length < 8 || cleanDigits.length > 15) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid international phone number format.' }));
          return;
        }

        const jid = `${cleanDigits}@s.whatsapp.net`;
        console.log(`[WhatsApp Bot] Sending alert to ${jid}...`);

        const result = await sock.sendMessage(jid, { text });
        console.log(`[WhatsApp Bot] Message delivered! ID: ${result?.key?.id}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, messageId: result?.key?.id, to: cleanDigits }));
      } catch (err) {
        console.error('[WhatsApp Bot] Error sending message:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Failed to send WhatsApp message' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`[WhatsApp Gateway] Listening on http://localhost:${PORT}`);
  startWhatsAppBot().catch((err) => {
    console.error('[WhatsApp Bot] Fatal initialization error:', err);
  });
});
