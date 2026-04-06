// ═══════════════════════════════════════════════════════════════
// TITLES — Cosmetic name tags displayed above rig names in battle
// Equippable per build, rarity-colored, with special Creator/Founding tags
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { rgb, BOLD, RESET, BLINK } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const TITLES_FILE = path.join(WSO_DIR, 'titles.json');

// ─── Rarity colors for titles (matching part rarities, excluding divine/primordial) ───

const TITLE_RARITY_COLORS = {
  common:       rgb(160, 165, 180),
  uncommon:     rgb(140, 230, 180),
  rare:         rgb(140, 190, 250),
  epic:         rgb(200, 170, 240),
  legendary:    rgb(240, 220, 140),
  mythic:       rgb(255, 100, 100),
  transcendent: rgb(200, 120, 255),
  // Special tags
  founding:     rgb(255, 215, 60),         // rich gold
  creator:      rgb(255, 60, 200),         // hot magenta (base — animated in render)
};

const TITLE_RARITY_ICONS = {
  common: '·', uncommon: '◇', rare: '◆', epic: '★',
  legendary: '✦', mythic: '⚡', transcendent: '✧',
  founding: '♛', creator: '⚡',
};

// ─── Title Catalog ───
// Rarities: common → transcendent (no divine/primordial card rarities)
// Plus two special tags: 'creator' and 'founding'

const TITLES = {
  // ── Common ──
  rookie: {
    name: 'Rookie',
    rarity: 'common',
    desc: 'Everyone starts somewhere.',
  },
  script_kiddie: {
    name: 'Script Kiddie',
    rarity: 'common',
    desc: 'Copy-paste warrior.',
  },
  end_user: {
    name: 'End User',
    rarity: 'common',
    desc: 'Just here to click things.',
  },

  // ── Uncommon ──
  sysadmin: {
    name: 'Sysadmin',
    rarity: 'uncommon',
    desc: 'Keeper of the servers.',
  },
  debugger: {
    name: 'Debugger',
    rarity: 'uncommon',
    desc: 'Finds bugs others can\'t see.',
  },
  packet_sniffer: {
    name: 'Packet Sniffer',
    rarity: 'uncommon',
    desc: 'Knows what\'s on the wire.',
  },

  // ── Rare ──
  kernel_hacker: {
    name: 'Kernel Hacker',
    rarity: 'rare',
    desc: 'Speaks fluent assembly.',
  },
  overclocker: {
    name: 'Overclocker',
    rarity: 'rare',
    desc: 'Pushes silicon past the limit.',
  },
  netrunner: {
    name: 'Netrunner',
    rarity: 'rare',
    desc: 'Ghosts through firewalls.',
  },

  // ── Epic ──
  root_access: {
    name: 'Root Access',
    rarity: 'epic',
    desc: 'Full control. No restrictions.',
  },
  zero_day: {
    name: 'Zero Day',
    rarity: 'epic',
    desc: 'Exploits the unknown.',
  },
  silicon_sage: {
    name: 'Silicon Sage',
    rarity: 'epic',
    desc: 'Wisdom forged in transistors.',
  },

  // ── Legendary ──
  mainframe: {
    name: 'Mainframe',
    rarity: 'legendary',
    desc: 'The backbone of everything.',
  },
  apex_predator: {
    name: 'Apex Predator',
    rarity: 'legendary',
    desc: 'Top of the food chain.',
  },
  quantum_mind: {
    name: 'Quantum Mind',
    rarity: 'legendary',
    desc: 'Thinks in superpositions.',
  },

  // ── Mythic ──
  god_process: {
    name: 'God Process',
    rarity: 'mythic',
    desc: 'PID 0. Unkillable.',
  },
  singularity: {
    name: 'Singularity',
    rarity: 'mythic',
    desc: 'Beyond computational limits.',
  },

  // ── Transcendent ──
  prime_architect: {
    name: 'Prime Architect',
    rarity: 'transcendent',
    desc: 'Designed the machine itself.',
  },
  eternal_kernel: {
    name: 'Eternal Kernel',
    rarity: 'transcendent',
    desc: 'Has never been rebooted.',
  },

  // ── Special: Creator (unique — owner only) ──
  creator: {
    name: 'CREATOR',
    rarity: 'creator',
    desc: 'The one who built this world.',
    special: true,
  },

  // ── Special: Founding Player (friends of the creator) ──
  founding_player: {
    name: 'Founding Player',
    rarity: 'founding',
    desc: 'Was there from the very beginning.',
    special: true,
  },
};

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function emptyInventory() {
  return { titles: [], equipped: {} };
}

function loadTitles() {
  try {
    if (!fs.existsSync(TITLES_FILE)) return emptyInventory();
    const raw = JSON.parse(fs.readFileSync(TITLES_FILE, 'utf8'));
    return {
      titles: raw.titles || [],
      equipped: raw.equipped || {},
    };
  } catch {
    return emptyInventory();
  }
}

function saveTitles(data) {
  ensureDir();
  fs.writeFileSync(TITLES_FILE, JSON.stringify({
    titles: data.titles || [],
    equipped: data.equipped || {},
  }, null, 2));
}

// ─── Inventory Operations ───

function addTitle(titleId, source) {
  if (!TITLES[titleId]) return null;
  const data = loadTitles();
  // Prevent duplicate special titles
  if (TITLES[titleId].special && data.titles.some(t => t.titleId === titleId)) {
    return data.titles.find(t => t.titleId === titleId).titleId;
  }
  data.titles.push({
    titleId,
    obtainedAt: Date.now(),
    source: source || 'unknown',
  });
  saveTitles(data);
  return titleId;
}

function getOwnedTitles() {
  const data = loadTitles();
  return data.titles
    .map(t => ({ ...t, ...(TITLES[t.titleId] || {}) }))
    .filter(t => t.name);
}

function equipTitle(buildIndex, titleId) {
  const data = loadTitles();
  if (!data.titles.find(t => t.titleId === titleId)) return false;
  data.equipped[String(buildIndex)] = titleId;
  saveTitles(data);
  return true;
}

function unequipTitle(buildIndex) {
  const data = loadTitles();
  data.equipped[String(buildIndex)] = null;
  saveTitles(data);
}

function getEquippedTitleId(buildIndex) {
  const data = loadTitles();
  const titleId = data.equipped[String(buildIndex)];
  if (!titleId) return null;
  if (!data.titles.find(t => t.titleId === titleId)) return null;
  return titleId;
}

function getEquippedTitle(buildIndex) {
  const titleId = getEquippedTitleId(buildIndex);
  if (!titleId) return null;
  return TITLES[titleId] || null;
}

// ─── Rendering helpers ───

// Returns the display string for a title (no ANSI — just the text with brackets/icon)
function getTitleText(titleId) {
  const def = TITLES[titleId];
  if (!def) return null;
  const icon = TITLE_RARITY_ICONS[def.rarity] || '';
  return `${icon} ${def.name} ${icon}`;
}

// Returns the ANSI-colored title string for static (non-animated) display
function getColoredTitle(titleId) {
  const def = TITLES[titleId];
  if (!def) return null;
  const text = getTitleText(titleId);
  const color = TITLE_RARITY_COLORS[def.rarity] || TITLE_RARITY_COLORS.common;

  if (def.rarity === 'founding') {
    // Gold with bold
    return `${BOLD}${color}${text}${RESET}`;
  }

  return `${color}${text}${RESET}`;
}

// Returns animated title color for the Creator tag based on frame count
// Cycles through a rainbow spectrum for a flashy animated effect
function getCreatorColor(frameCount) {
  const speed = 0.15;
  const t = frameCount * speed;
  // Cycle through: magenta → cyan → gold → rose → lavender
  const palette = [
    [255, 60, 200],   // hot magenta
    [60, 220, 255],   // electric cyan
    [255, 220, 60],   // bright gold
    [255, 100, 150],  // hot rose
    [180, 120, 255],  // electric purple
    [60, 255, 180],   // neon green
  ];
  const idx = Math.floor(t) % palette.length;
  const next = (idx + 1) % palette.length;
  const frac = t - Math.floor(t);

  const r = Math.round(palette[idx][0] + (palette[next][0] - palette[idx][0]) * frac);
  const g = Math.round(palette[idx][1] + (palette[next][1] - palette[idx][1]) * frac);
  const b = Math.round(palette[idx][2] + (palette[next][2] - palette[idx][2]) * frac);

  return rgb(r, g, b);
}

// Draw title text above a name position on screen, character by character
// For the Creator tag: each character gets a shifted color for a wave effect
function drawTitle(screen, x, y, titleId, frameCount) {
  const def = TITLES[titleId];
  if (!def) return 0;
  const text = getTitleText(titleId);
  if (!text) return 0;

  if (def.rarity === 'creator') {
    // Animated rainbow wave — each character offset by position
    for (let i = 0; i < text.length; i++) {
      const charFrame = frameCount + i * 3; // offset per char for wave
      const color = getCreatorColor(charFrame);
      screen.set(x + i, y, text[i], color, null, true);
    }
    // Sparkle effect: occasional glint characters above/around the title
    const sparkleChars = ['✦', '✧', '⋆', '·', '∘'];
    const sparkleIdx = Math.floor(frameCount * 0.3) % text.length;
    if (frameCount % 4 < 2) {
      const sx = x + sparkleIdx;
      const sy = y - 1;
      if (sy >= 0) {
        const sChar = sparkleChars[frameCount % sparkleChars.length];
        const sColor = getCreatorColor(frameCount + 10);
        screen.set(sx, sy, sChar, sColor);
      }
    }
    return text.length;
  }

  if (def.rarity === 'founding') {
    // Bold gold with subtle shimmer — alternating bright/dim gold
    const bright = frameCount % 8 < 5;
    const color = bright ? rgb(255, 225, 80) : rgb(220, 190, 60);
    for (let i = 0; i < text.length; i++) {
      screen.set(x + i, y, text[i], color, null, true);
    }
    return text.length;
  }

  // Standard rarity titles — static color, bold
  const color = TITLE_RARITY_COLORS[def.rarity] || TITLE_RARITY_COLORS.common;
  for (let i = 0; i < text.length; i++) {
    screen.set(x + i, y, text[i], color, null, true);
  }
  return text.length;
}

module.exports = {
  TITLES,
  TITLE_RARITY_COLORS,
  TITLE_RARITY_ICONS,
  loadTitles,
  saveTitles,
  addTitle,
  getOwnedTitles,
  equipTitle,
  unequipTitle,
  getEquippedTitleId,
  getEquippedTitle,
  getTitleText,
  getColoredTitle,
  getCreatorColor,
  drawTitle,
};
