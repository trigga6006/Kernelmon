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

// ─── Creator tag: reality-break effect ───
// The tag looks like it's corrupting the renderer — unstable, flickering between
// hot white overexposure and deep void. Characters randomly glitch into symbols
// as if the game can't contain whoever's wearing it.

const GLITCH_CHARS = '▓▒░█▌▐╪╫╬┼╳※¤∎⌧⍟⌬◊◈☰⚑⛧';

// Deterministic pseudo-random per character per frame (no Math.random in render)
function creatorHash(i, frame) {
  let h = (i * 2654435761 + frame * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return (h & 0xFFFF) / 0xFFFF; // 0-1
}

function getCreatorColor(frameCount) {
  // Slow burn between white-hot core and void purple, with occasional flicker spikes
  const t = frameCount * 0.08;
  const pulse = Math.sin(t) * 0.5 + 0.5; // 0-1 smooth
  const spike = Math.sin(t * 7.3) > 0.92 ? 1 : 0; // rare hard flicker

  if (spike) return rgb(255, 255, 255); // blinding white flash

  // Interpolate: void black-purple ↔ searing white with magenta undertone
  const r = Math.round(40 + pulse * 215);
  const g = Math.round(5 + pulse * 180);
  const b = Math.round(60 + pulse * 195);
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
    const baseColor = getCreatorColor(frameCount);
    const voidColor = rgb(20, 0, 35);
    const hotWhite = rgb(255, 240, 255);

    for (let i = 0; i < text.length; i++) {
      const h = creatorHash(i, frameCount);
      let ch = text[i];
      let color = baseColor;

      // ~12% chance a character corrupts into a glitch symbol
      if (h < 0.12 && ch !== ' ') {
        ch = GLITCH_CHARS[Math.floor(creatorHash(i + 99, frameCount) * GLITCH_CHARS.length)];
        // Corrupted chars flicker between void and overexposed
        color = h < 0.06 ? voidColor : hotWhite;
      } else {
        // Stagger color phase per character for depth
        color = getCreatorColor(frameCount + i * 2);
      }

      screen.set(x + i, y, ch, color, null, true);
    }

    // Scan-line tear: a horizontal glitch artifact that sweeps across
    const tearCycle = Math.floor(frameCount * 0.4) % 30;
    if (tearCycle < text.length) {
      const ti = tearCycle;
      const tearChar = GLITCH_CHARS[Math.floor(creatorHash(ti, frameCount * 3) * GLITCH_CHARS.length)];
      const tearColor = creatorHash(ti, frameCount) > 0.5 ? hotWhite : rgb(140, 0, 80);
      screen.set(x + ti, y, tearChar, tearColor, null, true);
    }

    // Ghost echo: faint afterimage of the tag one row above, drifting
    if (y - 1 >= 0) {
      const drift = Math.floor(frameCount * 0.15) % 3 - 1; // -1, 0, or 1
      const echoAlpha = Math.sin(frameCount * 0.1) * 0.3 + 0.3; // 0-0.6
      if (echoAlpha > 0.2) {
        for (let i = 0; i < text.length; i++) {
          const ex = x + i + drift;
          if (ex >= 0) {
            const fade = rgb(
              Math.round(40 * echoAlpha),
              Math.round(5 * echoAlpha),
              Math.round(60 * echoAlpha),
            );
            screen.set(ex, y - 1, text[i], fade);
          }
        }
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
