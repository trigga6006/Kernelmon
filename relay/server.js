#!/usr/bin/env node
// ═══════════════════════════════════════════════════
// Rigemon Relay — matchmaking server
// Zero dependencies. Brokers fighter JSON exchange
// between two players, then gets out of the way.
// ═══════════════════════════════════════════════════

const http = require('node:http');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const MAX_BODY = 8192;          // 8KB max payload
const ROOM_TTL = 30 * 60_000;  // 30 min room lifetime (refreshed on every turn)
const ROOM_LIMIT = 100;         // max concurrent rooms
const CLEANUP_INTERVAL = 30_000;
const RATE_LIMIT = 600;         // requests per minute per IP (generous — this is a game server)
const RATE_WINDOW = 60_000;
const ENDED_ROOM_TTL = 60_000;

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
    const roomAge = now - room.createdAt;
    const endedAge = room.endedAt ? now - room.endedAt : 0;
    if (room.endedAt ? endedAge > ENDED_ROOM_TTL : roomAge > ROOM_TTL) rooms.delete(code);
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

      // matchSeed: random number both players get for per-match variety
      const matchSeed = crypto.randomBytes(4).readUInt32BE(0);

      rooms.set(normalized, {
        hostFighter: body.fighter,
        joinerFighter: null,
        createdAt: Date.now(),
        endedAt: null,
        matchSeed,
        // Turn-based state
        turnNum: 0,
        hostMove: null,
        joinerMove: null,
      });

      console.log(`[+] Room ${code} created by ${ip} (${rooms.size} active)`);
      return json(res, 201, { code, matchSeed });
    }

    // GET /rooms/:code — host polls for joiner
    const pollMatch = method === 'GET' && path.match(/^\/rooms\/([A-Za-z0-9-]+)$/);
    if (pollMatch) {
      const normalized = normalizeCode(pollMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');

      if (room.joinerFighter) {
        // Match found — return joiner's fighter (room stays alive for turns)
        const fighter = room.joinerFighter;
        const { matchSeed } = room;
        return json(res, 200, { status: 'matched', fighter, matchSeed });
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
      return json(res, 200, { status: 'matched', fighter: room.hostFighter, matchSeed: room.matchSeed });
    }

    // POST /rooms/:code/turn — submit a move choice
    // Moves are stored per-turn-number. Submitting for a new turn auto-advances.
    const turnPostMatch = method === 'POST' && path.match(/^\/rooms\/([A-Za-z0-9-]+)\/turn$/);
    if (turnPostMatch) {
      const normalized = normalizeCode(turnPostMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');
      if (room.endedAt) return json(res, 200, { status: 'ended' });

      // Keep room alive during active battle
      room.createdAt = Date.now();

      const body = JSON.parse(await readBody(req));
      const { role, move, turnNum } = body;
      if (!role || !move) return error(res, 400, 'Missing role or move.');
      if (role !== 'host' && role !== 'joiner') return error(res, 400, 'Invalid role.');

      // Initialize turns storage if needed
      if (!room.turns) room.turns = {};

      // Store move for the requested turn
      const tn = turnNum !== undefined ? turnNum : room.turnNum;
      if (!room.turns[tn]) room.turns[tn] = { hostMove: null, joinerMove: null, hostItem: null, joinerItem: null, resolution: null };

      if (role === 'host') {
        room.turns[tn].hostMove = move;
        room.turns[tn].hostItem = body.item || null;
      } else {
        room.turns[tn].joinerMove = move;
        room.turns[tn].joinerItem = body.item || null;
      }

      // Track latest turn number
      if (tn > room.turnNum) room.turnNum = tn;

      // If both moves are in for this turn, return both
      const turn = room.turns[tn];
      if (turn.hostMove && turn.joinerMove) {
        if (turn.resolution) {
          return json(res, 200, {
            status: 'resolved',
            hostMove: turn.hostMove,
            joinerMove: turn.joinerMove,
            hostItem: turn.hostItem,
            joinerItem: turn.joinerItem,
            resolution: turn.resolution,
            turnNum: tn,
          });
        }
        return json(res, 200, { status: 'ready', hostMove: turn.hostMove, joinerMove: turn.joinerMove, hostItem: turn.hostItem, joinerItem: turn.joinerItem, turnNum: tn });
      }
      return json(res, 200, { status: 'waiting', turnNum: tn });
    }

    // POST /rooms/:code/turn/resolve — host publishes the authoritative turn result
    const turnResolveMatch = method === 'POST' && path.match(/^\/rooms\/([A-Za-z0-9-]+)\/turn\/resolve$/);
    if (turnResolveMatch) {
      const normalized = normalizeCode(turnResolveMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');
      if (room.endedAt) return json(res, 200, { status: 'ended' });

      room.createdAt = Date.now();

      const body = JSON.parse(await readBody(req));
      if (body.role !== 'host') return error(res, 403, 'Only the host can resolve turns.');

      const tn = body.turnNum !== undefined ? body.turnNum : room.turnNum;
      if (!room.turns) room.turns = {};
      if (!room.turns[tn]) room.turns[tn] = { hostMove: null, joinerMove: null, hostItem: null, joinerItem: null, resolution: null };

      const turn = room.turns[tn];
      if (!turn.hostMove || !turn.joinerMove) {
        return error(res, 409, 'Both moves must be submitted before resolving the turn.');
      }

      turn.resolution = body.resolution || null;
      return json(res, 200, {
        status: 'resolved',
        hostMove: turn.hostMove,
        joinerMove: turn.joinerMove,
        hostItem: turn.hostItem,
        joinerItem: turn.joinerItem,
        resolution: turn.resolution,
        turnNum: tn,
      });
    }

    // GET /rooms/:code/turn?t=N — poll for turn resolution (READ-ONLY, never clears)
    const turnGetMatch = method === 'GET' && path.match(/^\/rooms\/([A-Za-z0-9-]+)\/turn$/);
    if (turnGetMatch) {
      const normalized = normalizeCode(turnGetMatch[1]);
      const room = rooms.get(normalized);
      if (!room) return error(res, 404, 'Room not found or expired.');
      if (room.endedAt) return json(res, 200, { status: 'ended' });

      // Keep room alive during active battle
      room.createdAt = Date.now();

      // Check which turn is being asked about
      const askTurn = url.searchParams.get('t');
      const tn = askTurn !== null ? parseInt(askTurn, 10) : room.turnNum;

      if (!room.turns) room.turns = {};
      const turn = room.turns[tn];

      if (turn && turn.hostMove && turn.joinerMove) {
        if (turn.resolution) {
          return json(res, 200, {
            status: 'resolved',
            hostMove: turn.hostMove,
            joinerMove: turn.joinerMove,
            hostItem: turn.hostItem,
            joinerItem: turn.joinerItem,
            resolution: turn.resolution,
            turnNum: tn,
          });
        }
        return json(res, 200, { status: 'ready', hostMove: turn.hostMove, joinerMove: turn.joinerMove, hostItem: turn.hostItem, joinerItem: turn.joinerItem, turnNum: tn });
      }
      return json(res, 200, { status: 'waiting', turnNum: tn });
    }

    // POST /rooms/:code/end — signal battle is over, clean up room
    const endMatch = method === 'POST' && path.match(/^\/rooms\/([A-Za-z0-9-]+)\/end$/);
    if (endMatch) {
      const normalized = normalizeCode(endMatch[1]);
      const room = rooms.get(normalized);
      if (room) {
        room.endedAt = Date.now();
        room.createdAt = Date.now();
      }
      return json(res, 200, { status: 'ok' });
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
  console.log(`Rigémon Relay listening on port ${PORT}`);
  console.log(`Max rooms: ${ROOM_LIMIT} | TTL: ${ROOM_TTL / 1000}s | Rate: ${RATE_LIMIT}/min`);
});
