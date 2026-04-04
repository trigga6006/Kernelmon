// Client-side relay communication
// Uses Node built-in http/https — zero dependencies

const http = require('node:http');
const https = require('node:https');

const DEFAULT_RELAY_URL = 'https://wso-relay.fly.dev';

const REQUEST_TIMEOUT = 10_000;
const POLL_INTERVAL = 500;
const POLL_TIMEOUT = 15 * 60_000; // 15 min max wait

// ─── HTTP helper ───

function httpRequest(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const req = mod.request(parsed, {
      method,
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
      },
      timeout: REQUEST_TIMEOUT,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error(`Invalid response from relay (HTTP ${res.statusCode})`));
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Cannot reach relay server. Is it running?'));
      } else {
        reject(new Error(`Relay error: ${err.message}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Relay request timed out.'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Host: create room and wait for opponent ───

async function hostOnline(myFighter, relayUrl = DEFAULT_RELAY_URL) {
  const base = relayUrl.replace(/\/$/, '');

  // Create room
  console.log('\x1b[38;2;130;220;235m  ◆ Creating room on relay...\x1b[0m');
  const createResult = await httpRequest(`${base}/rooms`, 'POST', { fighter: myFighter });
  const code = createResult.code;
  let matchSeed = createResult.matchSeed || 0;

  console.log('');
  console.log('\x1b[38;2;130;220;235m  ╭─────────────────────────────────────╮\x1b[0m');
  console.log('\x1b[38;2;130;220;235m  │   KERNELMON — Online Battle           │\x1b[0m');
  console.log('\x1b[38;2;130;220;235m  │                                     │\x1b[0m');
  console.log(`\x1b[38;2;130;220;235m  │   Room: \x1b[1m${code}\x1b[22m                     │\x1b[0m`);
  console.log('\x1b[38;2;130;220;235m  │                                     │\x1b[0m');
  console.log('\x1b[38;2;100;100;130m  │   Share this code with opponent:     │\x1b[0m');
  console.log(`\x1b[38;2;100;100;130m  │   kmon join ${code}                │\x1b[0m`);
  console.log('\x1b[38;2;130;220;235m  ╰─────────────────────────────────────╯\x1b[0m');
  console.log('');
  console.log('\x1b[38;2;100;100;130m  Waiting for opponent...\x1b[0m');

  // Poll for joiner
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);
    try {
      const result = await httpRequest(`${base}/rooms/${code}`, 'GET');
      if (result.status === 'matched' && result.fighter) {
        return { opponent: result.fighter, roomCode: code, matchSeed: result.matchSeed || matchSeed };
      }
    } catch (err) {
      // Rate limited — back off and retry
      if (err.message.includes('Rate limit') || err.message.includes('429')) {
        await sleep(2000);
      }
      // Only throw if we're truly at the end of the timeout
      if (Date.now() - start > POLL_TIMEOUT - POLL_INTERVAL) throw err;
    }
  }

  throw new Error('Timed out waiting for opponent (5 minutes). Room expired.');
}

// ─── Join: connect to existing room ───

async function joinOnline(myFighter, roomCode, relayUrl = DEFAULT_RELAY_URL) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');
  // Keep the dash if present, relay normalizes anyway

  console.log(`\x1b[38;2;180;160;240m  ◆ Joining room ${code}...\x1b[0m`);

  const result = await httpRequest(`${base}/rooms/${code}/join`, 'POST', { fighter: myFighter });

  if (result.status !== 'matched' || !result.fighter) {
    throw new Error('Failed to join room. Unexpected response.');
  }

  console.log('\x1b[38;2;180;160;240m  ◆ Matched! Exchanging specs...\x1b[0m');
  return { opponent: result.fighter, matchSeed: result.matchSeed || 0 };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Room code pattern for auto-detection in CLI
// Matches 4-4 alphanumeric with optional dash, but NOT IP addresses (which have dots)
const ROOM_CODE_PATTERN = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

module.exports = { hostOnline, joinOnline, DEFAULT_RELAY_URL, ROOM_CODE_PATTERN };
