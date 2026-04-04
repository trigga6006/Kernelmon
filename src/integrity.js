// ═══════════════════════════════════════════════════════════════
// INTEGRITY — Machine fingerprint, HMAC signing, trade tokens
// Casual anti-cheat: prevents JSON editing and simple file copying
// ═══════════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const SALT = 'kernelmon-skin-integrity-v1';
const TRADE_SALT = 'kernelmon-trade-v1-a8f3c2';

// ─── Machine Fingerprint ───

let _fingerprint = null;

function getMachineFingerprint() {
  if (_fingerprint) return _fingerprint;

  const parts = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.homedir(),
    (os.cpus()[0] || {}).model || 'unknown',
  ];

  // Incorporate hardware UUID from scan if available
  try {
    const hwPath = path.join(WSO_DIR, 'hardware.json');
    const hw = JSON.parse(fs.readFileSync(hwPath, 'utf8'));
    if (hw.id) parts.push(hw.id);
  } catch {}

  _fingerprint = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return _fingerprint;
}

// ─── Key Derivation ───

function deriveKey() {
  const fingerprint = getMachineFingerprint();
  return crypto.createHmac('sha256', SALT).update(fingerprint).digest();
}

// ─── Inventory HMAC (machine-specific) ───

function computeInventoryHMAC(data) {
  const key = deriveKey();
  const payload = JSON.stringify({
    skins: data.skins || [],
    equipped: data.equipped || {},
    usedTokens: data.usedTokens || [],
  });
  return crypto.createHmac('sha256', key).update(payload).digest('base64');
}

function signInventory(data) {
  data.hmac = computeInventoryHMAC(data);
  return data;
}

function verifyInventory(data) {
  if (!data || !data.hmac) return false;
  try {
    const expected = computeInventoryHMAC(data);
    return crypto.timingSafeEqual(
      Buffer.from(data.hmac, 'base64'),
      Buffer.from(expected, 'base64'),
    );
  } catch {
    return false;
  }
}

// ─── Trade Tokens (shared static secret) ───

function getTradeKey() {
  return crypto.createHmac('sha256', TRADE_SALT).update('token-sign').digest();
}

function signTradePayload(payload) {
  const key = getTradeKey();
  return crypto.createHmac('sha256', key)
    .update(JSON.stringify(payload))
    .digest('base64');
}

function createTradeToken(skin) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  const payload = {
    version: 1,
    type: 'kernelmon-trade-token',
    skin: {
      uuid: skin.uuid,
      skinId: skin.skinId,
      obtainedAt: skin.obtainedAt,
      source: skin.source,
    },
    exportedBy: getMachineFingerprint().slice(0, 16),
    exportedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    nonce,
  };

  payload.signature = signTradePayload(payload);

  // Base64 encode the whole thing for easy copy/paste
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function parseTradeToken(tokenBase64) {
  try {
    const json = Buffer.from(tokenBase64.trim(), 'base64').toString('utf8');
    const token = JSON.parse(json);

    // Structural validation
    if (token.version !== 1) return { valid: false, error: 'Unknown token version' };
    if (token.type !== 'kernelmon-trade-token') return { valid: false, error: 'Not a trade token' };
    if (!token.skin || !token.skin.skinId || !token.skin.uuid) return { valid: false, error: 'Malformed skin data' };
    if (!token.nonce) return { valid: false, error: 'Missing nonce' };
    if (!token.signature) return { valid: false, error: 'Missing signature' };

    // Verify signature
    const { signature, ...payload } = token;
    const expected = signTradePayload(payload);
    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expected, 'base64'),
      );
      if (!valid) return { valid: false, error: 'Invalid signature' };
    } catch {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check expiry
    if (Date.now() > token.expiresAt) return { valid: false, error: 'Token expired' };

    return { valid: true, token };
  } catch {
    return { valid: false, error: 'Failed to decode token' };
  }
}

module.exports = {
  getMachineFingerprint,
  signInventory,
  verifyInventory,
  createTradeToken,
  parseTradeToken,
};
