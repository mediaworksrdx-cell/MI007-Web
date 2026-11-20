/**
 * Private Self-Hosted WhatsApp Alert Gateway
 * Powered by @whiskeysockets/baileys
 *
 * Runs a standalone HTTP microservice on port 5050.
 * Scan the QR code once with your phone, and it will stay connected 24/7.
 * Messages can be sent to any phone number worldwide with zero third-party fees.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const PORT = process.env.PORT || 5050;
const AUTH_DIR = path.resolve(__dirname, '..', 'whatsapp_auth');

let sock = null;
let connectionState = 'initializing';
let currentQr = null;
let connectedUser = null;

async function startWhatsAppBot() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version = undefined;
  try {
    const vRes = await fetchLatestBaileysVersion();
    version = vRes.version;
  } catch {}

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    browser: ['MI-007 Platform', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      connectionState = 'qr_ready';
      console.log('\n================================================================');
      console.log('⚡ SCAN THIS QR CODE ON YOUR PHONE TO LINK WHATSAPP:');
      console.log('   (WhatsApp -> Settings -> Linked Devices -> Link a Device)');
      console.log('================================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      connectionState = 'disconnected';
      connectedUser = null;
      console.log(`[WhatsApp Bot] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        console.log('[WhatsApp Bot] Logged out. Delete whatsapp_auth/ and restart to pair again.');
      }
    } else if (connection === 'open') {
      connectionState = 'connected';
      currentQr = null;
      connectedUser = sock?.user?.id || 'Connected';
      console.log('\n================================================================');
      console.log(`✅ WHATSAPP BOT CONNECTED! Signed in as: ${connectedUser}`);
      console.log(`⚡ Ready to send automated trade alerts on http://localhost:${PORT}`);
      console.log('================================================================\n');
    }
  });
}

// ── HTTP REST Server ──────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      })
    );
    return;
  }

  // Send Alert Endpoint
  if (url.pathname === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const rawPhone = String(data.phone || '').trim();
        const text = String(data.text || '').trim();

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
              error: `WhatsApp Bot is not connected yet (current state: ${connectionState}). Please scan the QR code in the terminal.`,
            })
          );
          return;
        }

        // Clean phone number: remove +, spaces, dashes, parentheses
        const cleanDigits = rawPhone.replace(/[\s+()\-]/g, '');
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
