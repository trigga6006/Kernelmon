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

function extractTurnPayload(result) {
  return {
    status: result.status,
    hostMove: result.hostMove,
    joinerMove: result.joinerMove,
    hostItem: result.hostItem,
    joinerItem: result.joinerItem,
    hostQteSuccess: !!result.hostQteSuccess,
    joinerQteSuccess: !!result.joinerQteSuccess,
    resolution: result.resolution || null,
  };
}

async function submitTurn(relayUrl, roomCode, role, moveName, turnNum, itemId, qteSuccess) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');

  return httpRequest(`${base}/rooms/${code}/turn`, 'POST', {
    role,
    move: moveName,
    turnNum,
    item: itemId || null,
    qteSuccess: !!qteSuccess,
  });
}

async function waitForTurn(relayUrl, roomCode, turnNum, requireResolution = false, timeoutMs = TURN_TIMEOUT) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(POLL_INTERVAL);
    try {
      const result = await httpRequest(`${base}/rooms/${code}/turn?t=${turnNum}`, 'GET');
      if (result.status === 'ended') {
        throw new Error('Battle already ended.');
      }
      if (result.status === 'resolved') {
        return extractTurnPayload(result);
      }
      if (!requireResolution && result.status === 'ready') {
        return extractTurnPayload(result);
      }
    } catch (err) {
      if (err.message.includes('Rate limit') || err.message.includes('429')) {
        await sleep(2000);
      } else if (err.message.includes('Battle already ended')) {
        throw err;
      }
    }
  }

  throw new Error('Opponent timed out (2 minutes). Battle abandoned.');
}

// Submit our move and wait for opponent's move
async function submitAndWait(relayUrl, roomCode, role, moveName, turnNum, itemId, qteSuccess) {
  const submitResult = await submitTurn(relayUrl, roomCode, role, moveName, turnNum, itemId, qteSuccess);

  if (submitResult.status === 'ended') {
    throw new Error('Battle already ended.');
  }

  if (submitResult.status === 'ready' || submitResult.status === 'resolved') {
    return extractTurnPayload(submitResult);
  }

  return waitForTurn(relayUrl, roomCode, turnNum, false, TURN_TIMEOUT);
}

async function publishTurnResolution(relayUrl, roomCode, turnNum, resolution) {
  const base = relayUrl.replace(/\/$/, '');
  const code = roomCode.toUpperCase().replace(/[\s]/g, '');
  return httpRequest(`${base}/rooms/${code}/turn/resolve`, 'POST', {
    role: 'host',
    turnNum,
    resolution,
  });
}

async function waitForTurnResolution(relayUrl, roomCode, turnNum) {
  return waitForTurn(relayUrl, roomCode, turnNum, true, 5_000);
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

module.exports = {
  submitAndWait,
  publishTurnResolution,
  waitForTurnResolution,
  endBattle,
};
