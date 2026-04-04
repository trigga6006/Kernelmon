// ═══════════════════════════════════════════════════════════════
// SKINS — Transcendent cosmetic overrides (loot-box only)
// UUID-based inventory with HMAC integrity protection
// ═══════════════════════════════════════════════════════════════

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { signInventory, verifyInventory, createTradeToken, parseTradeToken } = require('./integrity');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const SKINS_FILE = path.join(WSO_DIR, 'skins.json');

// ─── Skin Catalog ───

const SKINS = {
  phantom_reaper: {
    name: 'Phantom Reaper',
    desc: 'All-black silhouette with crimson slashes',
    rarity: 'transcendent',
    icon: '☠',
  },
  gold_titan: {
    name: 'Gold Titan',
    desc: 'Black and gold plated colossus',
    rarity: 'transcendent',
    icon: '♛',
  },
  void_blob: {
    name: 'Void Blob',
    desc: 'Amorphous dark-matter creature',
    rarity: 'transcendent',
    icon: '◯',
  },
  citrus_core: {
    name: 'Citrus Core',
    desc: 'A literal sentient orange',
    rarity: 'transcendent',
    icon: '◈',
  },
  data_wraith: {
    name: 'Data Wraith',
    desc: 'Glitching translucent ghost',
    rarity: 'transcendent',
    icon: '░',
  },
  ancient_sage: {
    name: 'Ancient Sage',
    desc: 'Wizened elder with a walking stick',
    rarity: 'transcendent',
    icon: '✧',
  },
  chrome_valkyrie: {
    name: 'Chrome Valkyrie',
    desc: 'Reflective silver armor with wings',
    rarity: 'transcendent',
    icon: '⚔',
  },
  neon_ronin: {
    name: 'Neon Ronin',
    desc: 'Hot pink and cyan samurai',
    rarity: 'transcendent',
    icon: '刃',
  },
  ice_monarch: {
    name: 'Ice Monarch',
    desc: 'Frozen crystal throne entity',
    rarity: 'transcendent',
    icon: '❄',
  },
  solar_drake: {
    name: 'Solar Drake',
    desc: 'White-hot dragon silhouette',
    rarity: 'transcendent',
    icon: '☀',
  },
  abyssal_leviathan: {
    name: 'Abyssal Leviathan',
    desc: 'Deep-sea bioluminescent horror',
    rarity: 'transcendent',
    icon: '◎',
  },
  kernel_prime: {
    name: 'KERNEL PRIME',
    desc: 'The original. Perfected.',
    rarity: 'transcendent',
    icon: '⚡',
  },
};

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function emptyInventory() {
  return { skins: [], equipped: {}, usedTokens: [] };
}

function loadSkins() {
  try {
    if (!fs.existsSync(SKINS_FILE)) return emptyInventory();
    const raw = JSON.parse(fs.readFileSync(SKINS_FILE, 'utf8'));

    // First-run migration: files without HMAC get signed (not wiped)
    if (!raw.hmac && raw.skins && raw.skins.length === 0) {
      return emptyInventory();
    }
    if (!raw.hmac) {
      // Legacy file — sign it now
      const data = {
        skins: raw.skins || [],
        equipped: raw.equipped || {},
        usedTokens: raw.usedTokens || [],
      };
      saveSkins(data);
      return data;
    }

    if (!verifyInventory(raw)) {
      // Tampered — reset
      return emptyInventory();
    }
    return raw;
  } catch {
    return emptyInventory();
  }
}

function saveSkins(data) {
  ensureDir();
  const signed = signInventory({
    skins: data.skins || [],
    equipped: data.equipped || {},
    usedTokens: data.usedTokens || [],
  });
  fs.writeFileSync(SKINS_FILE, JSON.stringify(signed, null, 2));
}

// ─── Inventory Operations ───

function addSkin(skinId, source) {
  if (!SKINS[skinId]) return null;
  const data = loadSkins();
  const uuid = crypto.randomUUID();
  data.skins.push({
    uuid,
    skinId,
    obtainedAt: Date.now(),
    source: source || 'unknown',
  });
  saveSkins(data);
  return uuid;
}

function getOwnedSkins() {
  const data = loadSkins();
  return data.skins.map(s => ({
    ...s,
    ...(SKINS[s.skinId] || {}),
  })).filter(s => s.name); // skip unknown skin IDs
}

function getSkinByUUID(uuid) {
  const data = loadSkins();
  const entry = data.skins.find(s => s.uuid === uuid);
  if (!entry) return null;
  return { ...entry, ...(SKINS[entry.skinId] || {}) };
}

// ─── Equip / Unequip ───

function getEquippedSkinId(buildIndex) {
  const data = loadSkins();
  const uuid = data.equipped[String(buildIndex)];
  if (!uuid) return null;
  const entry = data.skins.find(s => s.uuid === uuid);
  return entry ? entry.skinId : null;
}

function getEquippedSkinUUID(buildIndex) {
  const data = loadSkins();
  return data.equipped[String(buildIndex)] || null;
}

function equipSkin(buildIndex, skinUUID) {
  const data = loadSkins();
  // Verify the skin exists in inventory
  if (!data.skins.find(s => s.uuid === skinUUID)) return false;
  data.equipped[String(buildIndex)] = skinUUID;
  saveSkins(data);
  return true;
}

function unequipSkin(buildIndex) {
  const data = loadSkins();
  data.equipped[String(buildIndex)] = null;
  saveSkins(data);
}

// ─── Trading ───

function exportSkin(skinUUID) {
  const data = loadSkins();
  const idx = data.skins.findIndex(s => s.uuid === skinUUID);
  if (idx === -1) return null;

  const skin = data.skins.splice(idx, 1)[0];

  // Un-equip if equipped on any build
  for (const [buildIdx, equippedUUID] of Object.entries(data.equipped)) {
    if (equippedUUID === skinUUID) data.equipped[buildIdx] = null;
  }

  saveSkins(data);
  return createTradeToken(skin);
}

function importSkin(tokenBase64) {
  const result = parseTradeToken(tokenBase64);
  if (!result.valid) return { success: false, error: result.error };

  const { token } = result;
  const data = loadSkins();

  // Check replay (nonce already used)
  if (data.usedTokens.includes(token.nonce)) {
    return { success: false, error: 'Token already redeemed' };
  }

  // Check skin exists in catalog
  if (!SKINS[token.skin.skinId]) {
    return { success: false, error: 'Unknown skin type' };
  }

  // Generate new UUID for the imported instance
  const newUUID = crypto.randomUUID();
  data.skins.push({
    uuid: newUUID,
    skinId: token.skin.skinId,
    obtainedAt: Date.now(),
    source: 'trade',
  });

  // Record nonce to prevent replay
  data.usedTokens.push(token.nonce);

  // Prune old tokens (keep max 500 to avoid unbounded growth)
  if (data.usedTokens.length > 500) {
    data.usedTokens = data.usedTokens.slice(-500);
  }

  saveSkins(data);
  return { success: true, skinId: token.skin.skinId, uuid: newUUID };
}

// ─── Sprite Override ───

function applySkinOverride(sprite, skinId) {
  let skinSprites;
  try {
    skinSprites = require('./skinsprites');
  } catch {
    return sprite; // skinsprites not available
  }

  const skinDef = skinSprites.SKIN_SPRITES[skinId];
  if (!skinDef) return sprite;

  // Get drawHit/drawKO from sprites.js for fallback
  let drawHit, drawKO;
  try {
    const sprites = require('./sprites');
    drawHit = sprites.drawHit;
    drawKO = sprites.drawKO;
  } catch {}

  const skinTheme = skinDef.theme || sprite.theme;

  return {
    back:  { draw: skinDef.drawBack },
    front: { draw: skinDef.drawFront },
    drawBackHit(screen, ox, oy, frame) {
      if (skinDef.drawBackHit) return skinDef.drawBackHit(screen, ox, oy, frame);
      if (drawHit) return drawHit(skinDef.drawBack, screen, ox, oy, frame);
      skinDef.drawBack(screen, ox + (frame % 2 ? 1 : -1), oy, null, frame);
    },
    drawFrontHit(screen, ox, oy, frame) {
      if (skinDef.drawFrontHit) return skinDef.drawFrontHit(screen, ox, oy, frame);
      if (drawHit) return drawHit(skinDef.drawFront, screen, ox, oy, frame);
      skinDef.drawFront(screen, ox + (frame % 2 ? 1 : -1), oy, null, frame);
    },
    drawBackKO: skinDef.drawBackKO || sprite.drawBackKO,
    drawFrontKO: skinDef.drawFrontKO || sprite.drawFrontKO,
    theme: skinTheme,
    hw: sprite.hw,
  };
}

module.exports = {
  SKINS,
  loadSkins,
  saveSkins,
  addSkin,
  getOwnedSkins,
  getSkinByUUID,
  getEquippedSkinId,
  getEquippedSkinUUID,
  equipSkin,
  unequipSkin,
  exportSkin,
  importSkin,
  applySkinOverride,
};
