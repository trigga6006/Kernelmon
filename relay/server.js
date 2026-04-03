#!/usr/bin/env node
// ═══════════════════════════════════════════════════
// WorkstationOff Relay — matchmaking server
// Zero dependencies. Brokers fighter JSON exchange
// between two players, then gets out of the way.
// ═══════════════════════════════════════════════════

const http = require('node:http');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const MAX_BODY = 8192;          // 8KB max payload
const ROOM_TTL = 5 * 60_000;   // 5 min room lifetime
const ROOM_LIMIT = 100;         // max concurrent rooms
const CLEANUP_INTERVAL = 30_000;
const RATE_LIMIT = 10;          // requests per minute per IP
const RATE_WINDOW = 60_000;

// ─── Room code alphabet (no ambiguous I/O/0/1) ───
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHA[bytes[i] % ALPHA.length];
  }
  return code.slice(0, 4) + '-' + code.slice(4);
}

function normalizeCode(raw) {
  return (raw || '').toUpperCase().replace(/[\s-]/g, '');
}

// ─── State ───
const rooms = new Map();
const rateLimits = new Map();  // ip → { tokens, lastRefill }

// ─── Rate limiting ───
function checkRate(ip) {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry) {
    entry = { tokens: RATE_LIMIT, lastRefill: now };
    rateLimits.set(ip, entry);
  }
  const elapsed = now - entry.lastRefill;
  if (elapsed > RATE_WINDOW) {
    entry.tokens = RATE_LIMIT;
    entry.lastRefill = now;
  }
  if (entry.tokens <= 0) return false;
  entry.tokens--;
  return true;
}

// ─── Body reader ───
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        req.destroy();
        reject({ status: 413, error: 'Payload too large' });
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ─── Validate fighter structure ───
function validateFighter(fighter) {
  if (!fighter || typeof fighter !== 'object') return false;
  if (typeof fighter.id !== 'string') return false;
  if (typeof fighter.name !== 'string') return false;
  if (!fighter.stats || typeof fighter.stats !== 'object') return false;
  if (typeof fighter.stats.hp !== 'number') return false;
  return true;
}

// ─── Response helpers ───
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function error(res, status, msg) {
  json(res, status, { error: msg });
}

// ─── Cleanup sweep ───
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL) rooms.delete(code);
  }
  // Prune stale rate limit entries
  for (const [ip, entry] of rateLimits) {
    if (now - entry.lastRefill > RATE_WINDOW * 2) rateLimits.delete(ip);
  }
}, CLEANUP_INTERVAL);

// ─── Router ───
const server = http.createServer(async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Rate limit
  if (!checkRate(ip)) return error(res, 429, 'Rate limit exceeded. Try again in a minute.');

  try {
    // GET /health
    if (method === 'GET' && path === '/health') {
      return json(res, 200, { status: 'ok', rooms: rooms.size });
    }

    // POST /rooms — create a room
    if (method === 'POST' && path === '/rooms') {
      if (rooms.size >= ROOM_LIMIT) return error(res, 503, 'Server full. Try again shortly.');

      const body = JSON.parse(await readBody(req));
      if (!validateFighter(body.fighter)) return error(res, 400, 'Invalid fighter data.');

      // Generate unique code
      let code, normalized;
      let attempts = 0;
      do {
        code = generateCode();
        normalized = normalizeCode(code);
        attempts++;
      } while (rooms.has(normalized) && attempts < 5);
      if (rooms.has(normalized)) return error(res, 503, 'Could not generate room code. Try again.');

      rooms.set(normalized, {
        hostFighter: body.fighter,
        joinerFighter: null,
        createdAt: Date.now(),
      });

      console.log(`[+] Room ${code} created by ${ip} (${rooms.size} active)`);
      return json(res, 201, { code });
    }

    // GET /rooms/:code — host polls for joiner
    const pollMatch = method === 'GET' && path.match(/^\/rooms\/([A-Za-z0-9-]+)$/);
    if (pollMatch) {
      const normalized = normalizeCode(pollMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');

      if (room.joinerFighter) {
        // Match found — return joiner's fighter, schedule room cleanup
        const fighter = room.joinerFighter;
        setTimeout(() => rooms.delete(normalized), 10_000);
        return json(res, 200, { status: 'matched', fighter });
      }
      return json(res, 200, { status: 'waiting' });
    }

    // POST /rooms/:code/join — joiner submits fighter
    const joinMatch = method === 'POST' && path.match(/^\/rooms\/([A-Za-z0-9-]+)\/join$/);
    if (joinMatch) {
      const normalized = normalizeCode(joinMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');
      if (room.joinerFighter) return error(res, 409, 'Room is full.');

      const body = JSON.parse(await readBody(req));
      if (!validateFighter(body.fighter)) return error(res, 400, 'Invalid fighter data.');

      room.joinerFighter = body.fighter;
      console.log(`[*] Room ${joinMatch[1]} matched! (${ip})`);
      return json(res, 200, { status: 'matched', fighter: room.hostFighter });
    }

    // 404
    error(res, 404, 'Not found.');
  } catch (err) {
    if (err.status) return error(res, err.status, err.error);
    console.error('[!] Error:', err.message);
    error(res, 500, 'Internal server error.');
  }
});

server.listen(PORT, () => {
  console.log(`WorkstationOff Relay listening on port ${PORT}`);
  console.log(`Max rooms: ${ROOM_LIMIT} | TTL: ${ROOM_TTL / 1000}s | Rate: ${RATE_LIMIT}/min`);
});
