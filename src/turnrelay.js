// ═══════════════════════════════════════════════════════════════
// TURN RELAY CLIENT — Submit moves + poll for opponent's choice
// ═══════════════════════════════════════════════════════════════

const http = require('node:http');
const https = require('node:https');

const POLL_INTERVAL = 500;
const TURN_TIMEOUT = 120_000;  // 2 min per turn max

function httpRequest(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const req = mod.request(parsed, {
      method,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
      timeout: 10_000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(json.error || `HTTP ${res.statusCode}`));
          else resolve(json);
        } catch { reject(new Error(`Invalid relay response (HTTP ${res.statusCode})`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Relay timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// Submit our move and wait for opponent's move
async function submitAndWait(relayUrl, roomCode, role, moveName, turnNum) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');

  // Submit our move
  const submitResult = await httpRequest(`${base}/rooms/${code}/turn`, 'POST', {
    role,
    move: moveName,
    turnNum,
  });

  // If both moves already in, return immediately
  if (submitResult.status === 'ready') {
    return { hostMove: submitResult.hostMove, joinerMove: submitResult.joinerMove };
  }

  // Poll until opponent submits
  const start = Date.now();
  while (Date.now() - start < TURN_TIMEOUT) {
    await sleep(POLL_INTERVAL);
    const result = await httpRequest(`${base}/rooms/${code}/turn`, 'GET');
    if (result.status === 'ready') {
      return { hostMove: result.hostMove, joinerMove: result.joinerMove };
    }
  }

  throw new Error('Opponent timed out (2 minutes). Battle abandoned.');
}

// Signal battle end
async function endBattle(relayUrl, roomCode) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');
  try {
    await httpRequest(`${base}/rooms/${code}/end`, 'POST', {});
  } catch {} // best effort
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { submitAndWait, endBattle };
