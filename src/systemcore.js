// ═══════════════════════════════════════════════════════════════
// SYSTEM CORE — Persistent meta-progression with circuit-board UI
//
// Visual: You're looking at a chip die-shot from above. The entire
// screen IS the chip — a silicon substrate with PCB grid, contact
// pads along the edges, and functional blocks (modules) arranged
// like real die components. KERNEL sits center, surrounded by
// cache/pipeline/bus blocks in a realistic die layout. Traces are
// on-die interconnects. The whole thing glows to life as you
// upgrade, from cold dark silicon to blazing overclocked neon.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { Screen } = require('./screen');
const { ESC, colors, rgb, bgRgb, RESET, BOLD, DIM } = require('./palette');
const { getBalance, spendCredits, formatBalance } = require('./credits');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const CORE_FILE = path.join(WSO_DIR, 'systemcore.json');

// ─── Deterministic pseudo-random (no Math.random in render) ───

function hash(i, frame) {
  let h = (i * 2654435761 + frame * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return (h & 0xFFFF) / 0xFFFF;
}

// ─── Module Definitions ───

const MODULES = {
  KERNEL: {
    name: 'KERNEL',
    icon: '◆',
    category: 'Core',
    desc: 'Central processing anchor',
    maxLevel: 5,
    costs: [5000, 15000, 30000, 60000, 120000],
    prereq: null,
    effects: [
      'Unlocks adjacent modules',
      '+2% all buff effectiveness per level',
    ],
    buffKey: 'coreEfficiency',
    buffPerLevel: 0.02,
  },
  CLOCK_BOOST: {
    name: 'CLK BOOST',
    icon: '⚡',
    category: 'Income',
    desc: 'Clock cycle optimizer',
    maxLevel: 5,
    costs: [3000, 8000, 20000, 40000, 80000],
    prereq: { module: 'KERNEL', level: 1 },
    effects: ['+5% credit gain from battles per level'],
    buffKey: 'creditMult',
    buffPerLevel: 0.05,
  },
  CACHE: {
    name: 'CACHE',
    icon: '◈',
    category: 'Reward',
    desc: 'L3 cache expansion',
    maxLevel: 5,
    costs: [4000, 10000, 25000, 50000, 100000],
    prereq: { module: 'KERNEL', level: 1 },
    effects: ['+2% item & card drop rate per level'],
    buffKey: 'dropRate',
    buffPerLevel: 0.02,
  },
  PIPELINE: {
    name: 'PIPELINE',
    icon: '▸',
    category: 'Income',
    desc: 'Instruction pipeline depth',
    maxLevel: 5,
    costs: [6000, 15000, 30000, 60000, 120000],
    prereq: { module: 'CLOCK_BOOST', level: 2 },
    effects: [
      '+10 credits/hr passive income per level',
      'Max stored: 500 credits',
    ],
    buffKey: 'passiveIncome',
    buffPerLevel: 10,
  },
  MEM_POOL: {
    name: 'MEM POOL',
    icon: '▣',
    category: 'Utility',
    desc: 'Expanded memory allocation',
    maxLevel: 3,
    costs: [8000, 20000, 50000],
    prereq: { module: 'KERNEL', level: 2 },
    effects: ['+1 bag item slot in battle per level'],
    buffKey: 'extraItemSlots',
    buffPerLevel: 1,
  },
  SHADER: {
    name: 'SHADER',
    icon: '✧',
    category: 'Visual',
    desc: 'Render pipeline enhancement',
    maxLevel: 5,
    costs: [2000, 5000, 10000, 20000, 40000],
    prereq: { module: 'KERNEL', level: 2 },
    effects: ['Visual core glow & profile effects per level'],
    buffKey: 'visualTier',
    buffPerLevel: 1,
  },
  BUS_CTRL: {
    name: 'BUS CTRL',
    icon: '⇌',
    category: 'Access',
    desc: 'System bus controller',
    maxLevel: 3,
    costs: [10000, 30000, 80000],
    prereq: { module: 'KERNEL', level: 3 },
    effects: ['Unlocks expansion module branches'],
    buffKey: 'accessTier',
    buffPerLevel: 1,
  },
  OVERCLOCK: {
    name: 'OVERCLOCK',
    icon: '★',
    category: 'Reward',
    desc: 'Voltage regulator override',
    maxLevel: 5,
    costs: [5000, 12000, 25000, 50000, 100000],
    prereq: { module: 'BUS_CTRL', level: 1 },
    effects: ['+3% RP gain in ranked per level'],
    buffKey: 'rpMult',
    buffPerLevel: 0.03,
  },
};

const MODULE_ORDER = [
  'KERNEL', 'CLOCK_BOOST', 'CACHE', 'PIPELINE',
  'MEM_POOL', 'SHADER', 'BUS_CTRL', 'OVERCLOCK',
];

const CAT_COLORS = {
  Core:   rgb(230, 230, 245),
  Income: rgb(240, 220, 140),
  Reward: rgb(140, 230, 180),
  Utility:rgb(140, 190, 250),
  Visual: rgb(200, 170, 240),
  Access: rgb(240, 160, 140),
};

const CAT_GLOW = {
  Core:    { r: 230, g: 230, b: 255 },
  Income:  { r: 255, g: 220, b: 80 },
  Reward:  { r: 80, g: 255, b: 160 },
  Utility: { r: 80, g: 180, b: 255 },
  Visual:  { r: 200, g: 120, b: 255 },
  Access:  { r: 255, g: 120, b: 100 },
};

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadCore() {
  try {
    if (!fs.existsSync(CORE_FILE)) return defaultCore();
    const data = JSON.parse(fs.readFileSync(CORE_FILE, 'utf8'));
    return { ...defaultCore(), ...data };
  } catch { return defaultCore(); }
}

function defaultCore() {
  return { modules: {}, lastCollected: Date.now(), totalInvested: 0 };
}

function saveCore(data) {
  ensureDir();
  fs.writeFileSync(CORE_FILE, JSON.stringify(data, null, 2));
}

function getModuleLevel(moduleId) {
  const core = loadCore();
  return core.modules[moduleId] || 0;
}

function getTotalCoreLevel() {
  const core = loadCore();
  return Object.values(core.modules).reduce((sum, lv) => sum + lv, 0);
}

function getCoreTier() {
  const total = getTotalCoreLevel();
  if (total >= 36) return { tier: 'MAX', name: 'TRANSCENDENT', color: rgb(200, 120, 255) };
  if (total >= 30) return { tier: 'V', name: 'TRANSCENDENT', color: rgb(200, 120, 255) };
  if (total >= 22) return { tier: 'IV', name: 'OVERCLOCKED', color: rgb(240, 220, 140) };
  if (total >= 14) return { tier: 'III', name: 'OPTIMIZED', color: rgb(140, 230, 180) };
  if (total >= 7)  return { tier: 'II', name: 'INITIALIZED', color: rgb(140, 190, 250) };
  if (total >= 1)  return { tier: 'I', name: 'BOOT SEQUENCE', color: rgb(130, 220, 235) };
  return { tier: '0', name: 'DORMANT', color: rgb(60, 60, 85) };
}

// Check if every single module is at max level
function isFullyMaxed() {
  const core = loadCore();
  for (const [id, def] of Object.entries(MODULES)) {
    if ((core.modules[id] || 0) < def.maxLevel) return false;
  }
  return true;
}

// ─── Buff Queries (used by other modules) ───

function getBuff(buffKey) {
  const core = loadCore();
  let value = 0;
  const kernelLevel = core.modules.KERNEL || 0;
  const coreBonus = 1 + kernelLevel * 0.02;
  for (const [id, def] of Object.entries(MODULES)) {
    if (def.buffKey === buffKey && core.modules[id]) {
      const raw = core.modules[id] * def.buffPerLevel;
      value += id === 'KERNEL' ? raw : raw * coreBonus;
    }
  }
  return value;
}

function getCreditMultiplier() { return 1 + getBuff('creditMult'); }
function getDropRateBonus() { return getBuff('dropRate'); }
function getRpMultiplier() { return 1 + getBuff('rpMult'); }
function getExtraItemSlots() { return Math.floor(getBuff('extraItemSlots')); }
function getPassiveIncomeRate() { return getBuff('passiveIncome'); }

const PASSIVE_CAP = 500;

function collectPassiveIncome() {
  const rate = getPassiveIncomeRate();
  if (rate <= 0) return 0;
  const core = loadCore();
  const now = Date.now();
  const elapsed = (now - (core.lastCollected || now)) / 3600000;
  const earned = Math.min(Math.floor(rate * elapsed), PASSIVE_CAP);
  if (earned > 0) {
    const { addCredits } = require('./credits');
    addCredits(earned);
  }
  core.lastCollected = now;
  saveCore(core);
  return earned;
}

// ─── Upgrade Logic ───

function canUnlock(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return false;
  if (!def.prereq) return true;
  return getModuleLevel(def.prereq.module) >= def.prereq.level;
}

function canUpgrade(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return false;
  const level = getModuleLevel(moduleId);
  if (level >= def.maxLevel) return false;
  if (!canUnlock(moduleId)) return false;
  return getBalance() >= def.costs[level];
}

function upgradeModule(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return { success: false, reason: 'Unknown module' };
  const core = loadCore();
  const level = core.modules[moduleId] || 0;
  if (level >= def.maxLevel) return { success: false, reason: 'Already maxed' };
  if (!canUnlock(moduleId)) {
    const req = def.prereq;
    return { success: false, reason: `Requires ${MODULES[req.module].name} Lv${req.level}` };
  }
  const cost = def.costs[level];
  if (!spendCredits(cost)) return { success: false, reason: 'Not enough credits' };
  core.modules[moduleId] = level + 1;
  core.totalInvested += cost;
  saveCore(core);
  return { success: true, newLevel: level + 1, cost };
}

// ═══════════════════════════════════════════════════════════════
// CHIP DIE-SHOT LAYOUT
// ═══════════════════════════════════════════════════════════════
//
// The chip package occupies the center of the screen.
// KERNEL is a large central block. Other modules surround it
// like real die functional units:
//
//  ┌─────────────────────────────────────────────────┐
//  │ pin pin pin pin pin pin pin pin pin pin pin pin │
//  │                                                 │
//  │    ┌─────────┐              ┌─────────┐        │
//  │    │CLK BOOST│──┐     ┌────│  CACHE   │        │
//  │    └─────────┘  │     │    └─────────┘        │
//  │                 ▼     ▼                        │
//  │         ┌──────────────────┐                   │
//  │   pin   │     K E R N E L  │   pin             │
//  │         └──────────────────┘                   │
//  │            │    │     │    │                    │
//  │    ┌───────┘    │     │    └────────┐          │
//  │    │            │     │             │          │
//  │  ┌─────────┐ ┌────────┐  ┌─────────┐         │
//  │  │PIPELINE │ │BUS CTRL│  │MEM POOL │         │
//  │  └─────────┘ └────────┘  └─────────┘         │
//  │                 │                │             │
//  │    ┌─────────┐  │    ┌─────────┐              │
//  │    │OVERCLOCK│──┘    │ SHADER  │              │
//  │    └─────────┘       └─────────┘              │
//  │                                               │
//  │ pin pin pin pin pin pin pin pin pin pin pin   │
//  └─────────────────────────────────────────────────┘

function getLayout(w, h) {
  const cx = Math.floor(w / 2);

  // Detail panel takes 5 lines at the bottom (detailY through h-1)
  // Footer controls = 1 line, so detail starts at h - 6
  const detailHeight = 6;

  // Chip package boundaries (inset from screen edges)
  const chipL = Math.max(3, Math.floor(w * 0.08));
  const chipR = w - chipL;
  const chipT = 4;  // below header (rows 0-3)
  const chipB = h - detailHeight - 1; // 1 row gap above detail panel
  const chipW = chipR - chipL;
  const chipH = chipB - chipT;

  const NW = 16;
  const NH = 5;

  // Die interior — nodes must fit inside the chip with pad rows
  const dieT = chipT + 3;  // below top pads
  const dieB = chipB - 2;  // above bottom pads
  const dieL = chipL + 4;
  const dieR = chipR - 4;
  const dieW = dieR - dieL;
  const dieH = dieB - dieT;

  // 3 rows of nodes: row0 (CLK/KERNEL/CACHE), row1 (PIPE/BUS/MEM), row2 (OC/SHADER)
  // Distribute vertically to fill available space, clamping gap to avoid huge gaps
  const totalNodeH = NH * 3;
  const rawGap = Math.floor((dieH - totalNodeH) / 2);
  const rowGap = Math.max(1, Math.min(rawGap, 3)); // cap at 3 so it stays compact
  const row0Y = dieT + Math.max(0, Math.floor((dieH - totalNodeH - rowGap * 2) / 2));
  const row1Y = row0Y + NH + rowGap;
  const row2Y = row1Y + NH + rowGap;

  // KERNEL is wider, sits dead center
  const KW = 22;
  const kernelX = cx - Math.floor(KW / 2);

  // Horizontal columns: left and right, inset from die edges
  const colL = dieL + 1;
  const colR = cx + Math.floor(dieW * 0.22);

  return {
    KERNEL:      { x: kernelX, y: row0Y + 1, w: KW },
    CLOCK_BOOST: { x: colL, y: row0Y, w: NW },
    CACHE:       { x: colR, y: row0Y, w: NW },
    PIPELINE:    { x: colL, y: row1Y, w: NW },
    BUS_CTRL:    { x: cx - Math.floor(NW / 2), y: row1Y, w: NW },
    MEM_POOL:    { x: colR, y: row1Y, w: NW },
    OVERCLOCK:   { x: colL, y: row2Y, w: NW },
    SHADER:      { x: colR, y: row2Y, w: NW },
    NW, NH, KW, detailHeight,
    chip: { l: chipL, r: chipR, t: chipT, b: chipB, w: chipW, h: chipH },
  };
}

const CONNECTIONS = [
  ['KERNEL', 'CLOCK_BOOST'],
  ['KERNEL', 'CACHE'],
  ['CLOCK_BOOST', 'PIPELINE'],
  ['KERNEL', 'BUS_CTRL'],
  ['KERNEL', 'MEM_POOL'],
  ['CACHE', 'SHADER'],
  ['BUS_CTRL', 'OVERCLOCK'],
];

// ═══════════════════════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════════════════════

// ─── PCB Substrate background (fills entire screen behind chip) ───

function drawPCBBackground(scr, w, h, frame, totalLevel) {
  // PCB grid dots at regular intervals — like looking at a real board
  const gridSpaceX = 4;
  const gridSpaceY = 3;
  for (let gy = 0; gy < h; gy += gridSpaceY) {
    for (let gx = 0; gx < w; gx += gridSpaceX) {
      const bright = 16 + Math.floor(hash(gx * 31 + gy * 17, 0) * 6);
      scr.set(gx, gy, '·', rgb(bright, bright + 2, bright + 4));
    }
  }

  // Faint horizontal PCB traces (outside chip area, decorative)
  for (let t = 0; t < 6; t++) {
    const ty = Math.floor(hash(t * 13, 0) * h);
    const bright = 14 + Math.floor(hash(t * 7, 0) * 8);
    for (let x = 0; x < w; x++) {
      if (hash(x + t * 100, 0) < 0.6) {
        scr.set(x, ty, '─', rgb(bright, bright + 3, bright));
      }
    }
  }
  // Faint vertical PCB traces
  for (let t = 0; t < 4; t++) {
    const tx = Math.floor(hash(t * 19 + 50, 0) * w);
    const bright = 14 + Math.floor(hash(t * 11 + 50, 0) * 8);
    for (let y = 0; y < h; y++) {
      if (hash(y + t * 100 + 200, 0) < 0.5) {
        scr.set(tx, y, '│', rgb(bright, bright + 3, bright));
      }
    }
  }
}

// ─── Chip package: the outer casing with contact pads ───

function drawChipPackage(scr, layout, w, h, frame, totalLevel, fullyMaxed) {
  const { l, r, t, b } = layout.chip;

  // Compute package border color
  let pkgR = 45, pkgG = 45, pkgB = 60;
  if (totalLevel > 0) {
    const glow = Math.min(totalLevel / 36, 1);
    pkgR = Math.floor(45 + glow * 30);
    pkgG = Math.floor(45 + glow * 40);
    pkgB = Math.floor(60 + glow * 50);
  }
  if (fullyMaxed) {
    const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
    pkgR = Math.floor((80 + pulse * 120));
    pkgG = Math.floor((50 + pulse * 70));
    pkgB = Math.floor((140 + pulse * 115));
  }
  const pkgColor = rgb(pkgR, pkgG, pkgB);

  // Corner notch (chip orientation mark — top left)
  scr.set(l, t, '◤', pkgColor);
  // Top edge
  for (let x = l + 1; x < r; x++) scr.set(x, t, '═', pkgColor);
  scr.set(r, t, '╗', pkgColor);
  // Bottom edge
  scr.set(l, b, '╚', pkgColor);
  for (let x = l + 1; x < r; x++) scr.set(x, b, '═', pkgColor);
  scr.set(r, b, '╝', pkgColor);
  // Side edges
  for (let y = t + 1; y < b; y++) {
    scr.set(l, y, '║', pkgColor);
    scr.set(r, y, '║', pkgColor);
  }

  // Contact pads along all four edges (like BGA pads)
  const padChar = '▪';
  const padSpacing = 3;
  // Top & bottom pads
  for (let x = l + 2; x < r - 1; x += padSpacing) {
    const topActive = totalLevel > 0 && hash(x, 0) < totalLevel / 36;
    const botActive = totalLevel > 0 && hash(x + 500, 0) < totalLevel / 36;
    // Top pad
    let padColor;
    if (topActive) {
      const flicker = Math.sin(frame * 0.04 + x * 0.2) * 0.2 + 0.8;
      padColor = rgb(
        Math.floor(60 + flicker * 80),
        Math.floor(80 + flicker * 100),
        Math.floor(100 + flicker * 120)
      );
    } else {
      padColor = rgb(35, 35, 50);
    }
    scr.set(x, t + 1, padChar, padColor);
    // Bottom pad
    if (botActive) {
      const flicker = Math.sin(frame * 0.04 + x * 0.3) * 0.2 + 0.8;
      padColor = rgb(
        Math.floor(60 + flicker * 80),
        Math.floor(80 + flicker * 100),
        Math.floor(100 + flicker * 120)
      );
    } else {
      padColor = rgb(35, 35, 50);
    }
    scr.set(x, b - 1, padChar, padColor);
  }
  // Left & right pads
  for (let y = t + 2; y < b - 1; y += 2) {
    const lActive = totalLevel > 0 && hash(y + 1000, 0) < totalLevel / 36;
    const rActive = totalLevel > 0 && hash(y + 1500, 0) < totalLevel / 36;
    let padColor = rgb(35, 35, 50);
    if (lActive) {
      const flicker = Math.sin(frame * 0.04 + y * 0.2) * 0.2 + 0.8;
      padColor = rgb(
        Math.floor(60 + flicker * 80),
        Math.floor(80 + flicker * 100),
        Math.floor(100 + flicker * 120)
      );
    }
    scr.set(l + 1, y, padChar, padColor);
    padColor = rgb(35, 35, 50);
    if (rActive) {
      const flicker = Math.sin(frame * 0.04 + y * 0.3) * 0.2 + 0.8;
      padColor = rgb(
        Math.floor(60 + flicker * 80),
        Math.floor(80 + flicker * 100),
        Math.floor(100 + flicker * 120)
      );
    }
    scr.set(r - 1, y, padChar, padColor);
  }

  // Die silicon interior — faint grid pattern inside the chip
  const dieL = l + 3;
  const dieR = r - 3;
  const dieT2 = t + 2;
  const dieB = b - 2;
  for (let y = dieT2; y <= dieB; y++) {
    for (let x = dieL; x <= dieR; x++) {
      // Sparse grid intersections inside the die
      const isGridH = (y - dieT2) % 4 === 0;
      const isGridV = (x - dieL) % 6 === 0;
      if (isGridH && isGridV) {
        scr.set(x, y, '+', rgb(22, 24, 30));
      } else if (isGridH && (x - dieL) % 3 === 0) {
        scr.set(x, y, '·', rgb(18, 20, 25));
      } else if (isGridV && (y - dieT2) % 2 === 0) {
        scr.set(x, y, '·', rgb(18, 20, 25));
      }
    }
  }

  // Die label (etched into silicon — like a real die)
  const dieLabel = 'KRNLMON·v1';
  const labelX = r - 3 - dieLabel.length;
  const labelY = b - 2;
  scr.text(labelX, labelY, dieLabel, rgb(28, 30, 38));
}

// ─── Inner chip data flow (animated streams inside the chip) ───

function drawChipDataFlow(scr, layout, w, h, frame, totalLevel, fullyMaxed) {
  const { l, r, t, b } = layout.chip;
  const density = Math.min(totalLevel * 2, 30);

  // Vertical data streams inside chip
  for (let s = 0; s < density; s++) {
    const col = l + 4 + Math.floor(hash(s * 3, 0) * (r - l - 8));
    const speed = 0.2 + hash(s * 7, 0) * 0.4;
    const headY = Math.floor((frame * speed + hash(s * 11, 0) * (b - t) * 3) % ((b - t) * 2));
    const hy = t + 2 + headY;
    const tailLen = 2 + Math.floor(hash(s * 17, 0) * 3);
    for (let i = 0; i < tailLen; i++) {
      const y = hy - i;
      if (y <= t + 1 || y >= b - 1) continue;
      const fade = 1 - i / tailLen;
      const bright = Math.floor(18 + fade * 20);
      scr.set(col, y, i === 0 ? '│' : '·', rgb(bright, bright + 4, bright + 12));
    }
  }

  // Horizontal scan line inside chip
  if (totalLevel > 5) {
    const scanY = t + 2 + Math.floor(frame * 0.12) % (b - t - 4);
    if (scanY > t + 1 && scanY < b - 1) {
      for (let x = l + 3; x < r - 2; x++) {
        if (hash(x, frame) < 0.12) {
          scr.set(x, scanY, '─', rgb(22, 28, 40));
        }
      }
    }
  }

  // Sparkle particles inside die (more when more upgraded)
  for (let i = 0; i < Math.min(totalLevel * 2, 40); i++) {
    const x = l + 4 + Math.floor(hash(i * 13 + 500, Math.floor(frame / 10)) * (r - l - 8));
    const y = t + 3 + Math.floor(hash(i * 17 + 700, Math.floor(frame / 10)) * (b - t - 6));
    if (x > l + 2 && x < r - 2 && y > t + 1 && y < b - 1) {
      if (hash(i, frame) < 0.4) {
        const chars = '·∙°⊹';
        const ch = chars[Math.floor(hash(i * 23, Math.floor(frame / 6)) * chars.length)];
        scr.set(x, y, ch, rgb(25, 30, 45));
      }
    }
  }
}

// ─── Trace drawing: on-die interconnects ───

function drawTrace(scr, x1, y1, x2, y2, fromLevel, toLevel, frame, totalLevel) {
  const active = fromLevel > 0;
  const fullyLit = fromLevel > 0 && toLevel > 0;

  const path = [];

  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) path.push({ x: x1, y, ch: '║' });
  } else {
    const midY = Math.floor((y1 + y2) / 2);
    for (let y = y1; y <= midY; y++) path.push({ x: x1, y, ch: '║' });
    if (x1 < x2) {
      path[path.length - 1] = { x: x1, y: midY, ch: '╚' };
      for (let x = x1 + 1; x < x2; x++) path.push({ x, y: midY, ch: '═' });
      path.push({ x: x2, y: midY, ch: '╗' });
    } else {
      path[path.length - 1] = { x: x1, y: midY, ch: '╝' };
      for (let x = x1 - 1; x > x2; x--) path.push({ x, y: midY, ch: '═' });
      path.push({ x: x2, y: midY, ch: '╔' });
    }
    for (let y = midY + 1; y <= y2; y++) path.push({ x: x2, y, ch: '║' });
  }

  for (let i = 0; i < path.length; i++) {
    const seg = path[i];

    if (!active) {
      const dormantCh = seg.ch === '═' ? '─' : seg.ch === '║' ? '│' :
        seg.ch === '╚' ? '└' : seg.ch === '╝' ? '┘' :
        seg.ch === '╗' ? '┐' : seg.ch === '╔' ? '┌' : seg.ch;
      const flk = hash(i * 7 + seg.x, Math.floor(frame / 20)) < 0.7;
      scr.set(seg.x, seg.y, dormantCh, rgb(flk ? 28 : 20, flk ? 28 : 20, flk ? 38 : 28));
      continue;
    }

    // Energy pulse
    const pulseSpeed = 0.4 + totalLevel * 0.02;
    const pulsePos = ((frame * pulseSpeed) % (path.length + 8)) - 4;
    const dist = Math.abs(i - pulsePos);

    let r = fullyLit ? 40 : 30;
    let g = fullyLit ? 70 : 50;
    let b = fullyLit ? 100 : 70;

    if (dist < 4) {
      const intensity = 1 - dist / 4;
      const mult = fullyLit ? 1.0 : 0.5;
      r = Math.floor(r + intensity * 160 * mult);
      g = Math.floor(g + intensity * 200 * mult);
      b = Math.floor(b + intensity * 220 * mult);
    }

    if (fullyLit) {
      const p2 = ((frame * pulseSpeed * 0.6 + path.length * 0.5) % (path.length + 8)) - 4;
      const d2 = Math.abs(i - p2);
      if (d2 < 3) {
        const int2 = 1 - d2 / 3;
        r = Math.min(255, r + Math.floor(int2 * 80));
        g = Math.min(255, g + Math.floor(int2 * 120));
        b = Math.min(255, b + Math.floor(int2 * 100));
      }
    }

    scr.set(seg.x, seg.y, seg.ch, rgb(Math.min(255, r), Math.min(255, g), Math.min(255, b)));
  }
}

// ─── Node drawing ───

function drawNode(scr, moduleId, x, y, nw, nh, level, selected, frame, totalLevel) {
  const def = MODULES[moduleId];
  const locked = level <= 0 && !canUnlock(moduleId);
  const maxed = level >= def.maxLevel;
  const glow = CAT_GLOW[def.category] || { r: 150, g: 150, b: 200 };

  let borderR, borderG, borderB, fillBg, nameColor, iconColor;

  if (locked) {
    const flick = Math.sin(frame * 0.03 + hash(moduleId.length, 0) * 6) * 0.1 + 0.9;
    borderR = Math.floor(32 * flick); borderG = Math.floor(32 * flick); borderB = Math.floor(45 * flick);
    fillBg = bgRgb(12, 12, 20);
    nameColor = rgb(40, 40, 55); iconColor = rgb(32, 32, 48);
  } else if (level === 0) {
    const pulse = Math.sin(frame * 0.06) * 0.15 + 0.85;
    borderR = Math.floor(50 * pulse); borderG = Math.floor(50 * pulse); borderB = Math.floor(70 * pulse);
    fillBg = bgRgb(16, 16, 26);
    nameColor = rgb(75, 75, 105); iconColor = rgb(65, 65, 90);
  } else if (maxed) {
    const pulse = Math.sin(frame * 0.08) * 0.2 + 0.8;
    const spike = Math.sin(frame * 0.25) > 0.92 ? 1.3 : 1.0;
    borderR = Math.min(255, Math.floor(glow.r * pulse * spike));
    borderG = Math.min(255, Math.floor(glow.g * pulse * spike));
    borderB = Math.min(255, Math.floor(glow.b * pulse * spike));
    fillBg = bgRgb(Math.floor(glow.r * 0.08 + 12), Math.floor(glow.g * 0.08 + 12), Math.floor(glow.b * 0.08 + 14));
    nameColor = rgb(borderR, borderG, borderB);
    iconColor = rgb(Math.min(255, borderR + 30), Math.min(255, borderG + 30), Math.min(255, borderB + 30));
  } else {
    const ratio = level / def.maxLevel;
    const pulse = Math.sin(frame * 0.05 + level * 0.5) * (0.1 + ratio * 0.1) + (0.7 + ratio * 0.2);
    borderR = Math.min(255, Math.floor((40 + glow.r * ratio * 0.8) * pulse));
    borderG = Math.min(255, Math.floor((40 + glow.g * ratio * 0.8) * pulse));
    borderB = Math.min(255, Math.floor((50 + glow.b * ratio * 0.8) * pulse));
    fillBg = bgRgb(Math.floor(16 + glow.r * ratio * 0.04), Math.floor(16 + glow.g * ratio * 0.04), Math.floor(18 + glow.b * ratio * 0.05));
    nameColor = rgb(borderR, borderG, borderB);
    iconColor = CAT_COLORS[def.category] || colors.cyan;
  }

  if (selected) {
    const sp = Math.sin(frame * 0.12) * 0.15 + 0.85;
    borderR = Math.min(255, Math.floor(220 * sp));
    borderG = Math.min(255, Math.floor(220 * sp));
    borderB = Math.min(255, Math.floor(245 * sp));
    fillBg = bgRgb(28, 28, 48);
  }

  const bc = rgb(borderR, borderG, borderB);

  // ─── Shape: angled hex shell ───
  const inner = nw - 4;
  // Top
  scr.set(x, y, '/', bc, fillBg);
  scr.set(x + 1, y, '╶', bc, fillBg);
  for (let i = 0; i < inner; i++) {
    let ch = '─';
    if (level > 0 && !locked) {
      const sh = hash(i + x, Math.floor(frame / 3));
      if (maxed && sh < 0.15) ch = '═';
      else if (sh < 0.05 * level) ch = '━';
    }
    scr.set(x + 2 + i, y, ch, bc, fillBg);
  }
  scr.set(x + nw - 2, y, '╴', bc, fillBg);
  scr.set(x + nw - 1, y, '\\', bc, fillBg);

  // Rows 1-3 fill
  for (let row = 1; row <= 3; row++) {
    scr.set(x, y + row, '│', bc, fillBg);
    for (let i = 1; i < nw - 1; i++) scr.set(x + i, y + row, ' ', null, fillBg);
    scr.set(x + nw - 1, y + row, '│', bc, fillBg);
  }

  // Bottom
  scr.set(x, y + 4, '\\', bc, fillBg);
  scr.set(x + 1, y + 4, '╶', bc, fillBg);
  for (let i = 0; i < inner; i++) {
    let ch = '─';
    if (level > 0 && !locked) {
      const sh = hash(i + x + 99, Math.floor(frame / 3));
      if (maxed && sh < 0.15) ch = '═';
      else if (sh < 0.05 * level) ch = '━';
    }
    scr.set(x + 2 + i, y + 4, ch, bc, fillBg);
  }
  scr.set(x + nw - 2, y + 4, '╴', bc, fillBg);
  scr.set(x + nw - 1, y + 4, '/', bc, fillBg);

  // Row 1: Icon + Name
  const label = locked ? '? ? ?' : def.name;
  const iconStr = locked ? '◌' : def.icon;
  const full = `${iconStr} ${label}`;
  const pad = Math.max(0, nw - 2 - full.length);
  const lp = Math.floor(pad / 2);
  scr.text(x + 1 + lp, y + 1, iconStr, iconColor, fillBg, level > 0 || selected);
  scr.text(x + 1 + lp + iconStr.length, y + 1, ` ${label}`, nameColor, fillBg, selected);

  // Row 2: Level pips
  if (locked) {
    const ls = '◌ LOCKED';
    scr.text(x + 1 + Math.floor((nw - 2 - ls.length) / 2), y + 2, ls, rgb(38, 38, 52), fillBg);
  } else {
    let cx2 = x + 1 + Math.floor((nw - 2 - (def.maxLevel * 2 - 1)) / 2);
    for (let i = 0; i < def.maxLevel; i++) {
      const filled = i < level;
      let pipColor;
      if (filled && maxed) {
        const sh = Math.sin(frame * 0.1 + i * 1.2) * 0.2 + 0.8;
        pipColor = rgb(Math.min(255, Math.floor(glow.r * sh)), Math.min(255, Math.floor(glow.g * sh)), Math.min(255, Math.floor(glow.b * sh)));
      } else if (filled) {
        pipColor = CAT_COLORS[def.category];
      } else {
        pipColor = rgb(45, 45, 65);
      }
      scr.set(cx2, y + 2, filled ? '◆' : '◇', pipColor, fillBg);
      cx2++;
      if (i < def.maxLevel - 1) { scr.set(cx2, y + 2, ' ', null, fillBg); cx2++; }
    }
  }

  // Row 3: Energy bar
  if (!locked) {
    const barW = nw - 4;
    const ratio = level / def.maxLevel;
    const filledCells = Math.round(ratio * barW);
    for (let i = 0; i < barW; i++) {
      if (i < filledCells) {
        const flow = Math.sin(frame * 0.15 + i * 0.3) * 0.3 + 0.7;
        scr.set(x + 2 + i, y + 3, maxed ? '▰' : '▪', rgb(
          Math.min(255, Math.floor(glow.r * ratio * flow)),
          Math.min(255, Math.floor(glow.g * ratio * flow)),
          Math.min(255, Math.floor(glow.b * ratio * flow))
        ), fillBg);
      } else {
        scr.set(x + 2 + i, y + 3, '▫', rgb(28, 28, 42), fillBg);
      }
    }
  } else {
    for (let i = 0; i < nw - 4; i++) {
      const noise = hash(i + x * 7, Math.floor(frame / 10));
      scr.set(x + 2 + i, y + 3, noise < 0.3 ? '░' : ' ', rgb(20, 20, 30), fillBg);
    }
  }

  // Glow particles around high-level nodes
  if (level >= 3 && !locked) {
    const count = maxed ? 6 : level - 1;
    for (let p = 0; p < count; p++) {
      const angle = hash(p * 7 + moduleId.charCodeAt(0), 0) * Math.PI * 2;
      const dist = 1.5 + Math.sin(frame * 0.06 + p * 1.5) * 0.8;
      const px = Math.floor((x + nw / 2) + Math.cos(angle + frame * 0.03) * dist * 2.5);
      const py = Math.floor((y + nh / 2) + Math.sin(angle + frame * 0.03) * dist * 0.8);
      if (px > x - 2 && px < x + nw + 2 && py >= y - 1 && py <= y + nh) {
        const pChars = '·∙°⊹✦';
        const pch = pChars[Math.floor(hash(p * 13, Math.floor(frame / 6)) * pChars.length)];
        const fade = Math.sin(frame * 0.08 + p * 2) * 0.4 + 0.6;
        scr.set(px, py, pch, rgb(Math.floor(glow.r * fade * 0.5), Math.floor(glow.g * fade * 0.5), Math.floor(glow.b * fade * 0.5)));
      }
    }
  }

  // Maxed corner sparks
  if (maxed) {
    const sp = Math.floor(frame / 4) % 4;
    const corners = [[x - 1, y], [x + nw, y], [x - 1, y + 4], [x + nw, y + 4]];
    const sparkChars = ['✦', '✧', '⊹', '·'];
    const [sx, sy] = corners[sp % corners.length];
    scr.set(sx, sy, sparkChars[sp], rgb(Math.min(255, glow.r + 50), Math.min(255, glow.g + 50), Math.min(255, glow.b + 50)));
  }
}

// ─── TRANSCENDENT effect: when fully maxed, the whole chip radiates ───

function drawTranscendentEffect(scr, layout, w, h, frame) {
  const { l, r, t, b } = layout.chip;
  const cx = Math.floor((l + r) / 2);
  const cy = Math.floor((t + b) / 2);

  // Pulsing energy rings radiating outward from center of chip
  const ringCount = 3;
  for (let ring = 0; ring < ringCount; ring++) {
    const phase = ((frame * 0.025 + ring * 0.33) % 1);
    const maxR = Math.max(r - l, b - t) * 0.7;
    const ringDist = phase * maxR;
    const fade = 1 - phase;

    const segments = Math.floor(ringDist * 3) + 20;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = Math.floor(cx + Math.cos(angle) * ringDist * 1.2);
      const py = Math.floor(cy + Math.sin(angle) * ringDist * 0.35);
      if (px <= l || px >= r || py <= t || py >= b) continue;

      const intensity = fade * (Math.sin(angle * 4 + frame * 0.1) * 0.3 + 0.7);
      const rv = Math.floor(140 + intensity * 115);
      const gv = Math.floor(60 + intensity * 100);
      const bv = Math.floor(180 + intensity * 75);
      const chars = '·∙○◎◉';
      const ch = chars[Math.min(chars.length - 1, Math.floor(fade * chars.length))];
      scr.set(px, py, ch, rgb(rv, gv, bv));
    }
  }

  // Electric arcs between random pad pairs (crackling energy)
  const arcCount = 2 + Math.floor(hash(0, Math.floor(frame / 6)) * 3);
  for (let a = 0; a < arcCount; a++) {
    const startX = l + 2 + Math.floor(hash(a * 7, Math.floor(frame / 4)) * (r - l - 4));
    const startY = t + 2 + Math.floor(hash(a * 11, Math.floor(frame / 4)) * (b - t - 4));
    const arcLen = 3 + Math.floor(hash(a * 13, Math.floor(frame / 4)) * 5);
    const arcChars = '╳╬┼╪⚡';

    let ax = startX, ay = startY;
    for (let s = 0; s < arcLen; s++) {
      const dir = Math.floor(hash(a * 31 + s * 17, Math.floor(frame / 3)) * 4);
      if (dir === 0) ax++;
      else if (dir === 1) ax--;
      else if (dir === 2) ay++;
      else ay--;
      if (ax <= l + 1 || ax >= r - 1 || ay <= t + 1 || ay >= b - 1) break;
      const ch = arcChars[Math.floor(hash(a * 23 + s, frame) * arcChars.length)];
      const bright = 0.5 + hash(a + s * 10, frame) * 0.5;
      scr.set(ax, ay, ch, rgb(
        Math.floor(200 * bright + 55),
        Math.floor(100 * bright + 40),
        Math.floor(255 * bright)
      ));
    }
  }

  // Overexposure flash — brief white pulse periodically
  if (Math.sin(frame * 0.08) > 0.97) {
    for (let y = t + 2; y < b - 1; y++) {
      for (let x = l + 2; x < r - 1; x++) {
        if (hash(x + y * w, frame) < 0.04) {
          scr.set(x, y, '█', rgb(180, 140, 220));
        }
      }
    }
  }
}

// ─── Header ───

function drawHeader(scr, w, frame, tier, totalLevel) {
  const t = frame * 0.04;
  const titleChars = '◈  S Y S T E M   C O R E  ◈';
  const titleX = Math.floor((w - titleChars.length) / 2);
  const nums = tier.color.match(/\d+/g).map(Number);

  for (let i = 0; i < titleChars.length; i++) {
    const ch = titleChars[i];
    if (ch === ' ') { scr.set(titleX + i, 0, ' '); continue; }
    const wave = Math.sin(t + i * 0.25) * 0.2 + 0.8;
    scr.set(titleX + i, 0, ch, rgb(
      Math.min(255, Math.floor((nums[2] || 150) * wave)),
      Math.min(255, Math.floor((nums[3] || 150) * wave)),
      Math.min(255, Math.floor((nums[4] || 150) * wave))
    ), null, true);
  }

  scr.centerText(1, `TIER ${tier.tier} ── ${tier.name}`, tier.color);

  // Animated top divider
  for (let x = 1; x < w - 1; x++) {
    const flowPhase = (frame * 0.08 + x * 0.05) % (Math.PI * 2);
    const bright = Math.sin(flowPhase) * 0.3 + 0.5;
    scr.set(x, 2, '─', rgb(
      Math.max(18, Math.floor((nums[2] || 60) * bright * 0.4)),
      Math.max(18, Math.floor((nums[3] || 60) * bright * 0.4)),
      Math.max(22, Math.floor((nums[4] || 80) * bright * 0.4))
    ));
  }
}

// ─── Progress + credits bar ───

function drawProgressBar(scr, w, frame, tier, totalLevel, balance) {
  const barWidth = Math.min(24, w - 30);
  const ratio = Math.min(1, totalLevel / 36);
  const barFill = Math.round(ratio * barWidth);
  const nums = tier.color.match(/\d+/g).map(Number);

  scr.text(2, 3, 'Core [', rgb(80, 80, 110));
  for (let i = 0; i < barWidth; i++) {
    if (i < barFill) {
      const flow = Math.sin(frame * 0.1 + i * 0.4) * 0.3 + 0.7;
      const ch = flow > 0.85 ? '█' : flow > 0.5 ? '▓' : '▒';
      scr.set(8 + i, 3, ch, rgb(
        Math.min(255, Math.floor((nums[2] || 130) * flow)),
        Math.min(255, Math.floor((nums[3] || 130) * flow)),
        Math.min(255, Math.floor((nums[4] || 130) * flow))
      ));
    } else {
      scr.set(8 + i, 3, '░', rgb(28, 28, 42));
    }
  }
  scr.text(8 + barWidth, 3, `] ${totalLevel}/36`, rgb(80, 80, 110));

  const credStr = `◆ ${formatBalance(balance)} credits`;
  const gp = Math.sin(frame * 0.06) * 0.15 + 0.85;
  scr.text(w - credStr.length - 2, 3, credStr, rgb(Math.floor(240 * gp), Math.floor(220 * gp), Math.floor(140 * gp)));
}

// ─── Detail panel (compact: 6 lines total including dividers) ───

function drawDetailPanel(scr, w, h, selId, selLevel, balance, frame, flashMsg, flashTimer) {
  const selDef = MODULES[selId];
  const locked = selLevel <= 0 && !canUnlock(selId);
  const maxed = selLevel >= selDef.maxLevel;
  const glow = CAT_GLOW[selDef.category] || { r: 150, g: 150, b: 200 };
  const catColor = CAT_COLORS[selDef.category] || colors.cyan;

  // Panel occupies the bottom 6 rows: detailY .. h-1
  const detailY = h - 6;

  // Top divider
  for (let x = 1; x < w - 1; x++) {
    const wave = Math.sin(frame * 0.04 + x * 0.1);
    scr.set(x, detailY, wave > 0.9 ? '═' : '─', rgb(30 + Math.floor((wave * 0.5 + 0.5) * 12), 30 + Math.floor((wave * 0.5 + 0.5) * 12), 40 + Math.floor((wave * 0.5 + 0.5) * 12)));
  }

  // Row 1: name + desc + category (or flash message if active)
  if (flashMsg && flashTimer > 0) {
    const isSuccess = flashMsg.includes('!') || flashMsg.includes('+');
    const fi = Math.min(1, flashTimer / 10);
    const fc = isSuccess
      ? rgb(Math.floor(100 + fi * 140), Math.floor(230 * fi), Math.floor(150 + fi * 80))
      : rgb(Math.floor(240 * fi), Math.floor(100 + (1 - fi) * 50), Math.floor(100 + (1 - fi) * 50));
    scr.centerText(detailY + 1, `  ${flashMsg}  `, fc, null, true);
  } else {
    scr.text(3, detailY + 1, `${selDef.icon} ${selDef.name}`, catColor, null, true);
    scr.text(3 + selDef.name.length + 4, detailY + 1, `— ${selDef.desc}`, colors.dim);
    scr.text(w - 12, detailY + 1, `[${selDef.category}]`, catColor);
  }

  // Row 2: status line (level/cost or locked or maxed)
  if (locked) {
    const req = selDef.prereq;
    scr.text(3, detailY + 2, `◌ Locked — requires ${MODULES[req.module].name} Lv${req.level}`, rgb(100, 50, 50));
  } else if (maxed) {
    const shimStr = 'MAX LEVEL';
    for (let i = 0; i < shimStr.length; i++) {
      const sh = Math.sin(frame * 0.08 + i * 0.5) * 0.3 + 0.7;
      scr.set(3 + i, detailY + 2, shimStr[i], rgb(
        Math.min(255, Math.floor(glow.r * sh)),
        Math.min(255, Math.floor(glow.g * sh)),
        Math.min(255, Math.floor(glow.b * sh))
      ), null, true);
    }
    scr.text(3 + shimStr.length, detailY + 2, ` (${selLevel}/${selDef.maxLevel})`, rgb(120, 120, 150));
    // Effects on same line, further right
    const effectX = 3 + shimStr.length + 8;
    if (effectX + 20 < w) {
      scr.text(effectX, detailY + 2, selDef.effects[0] || '', rgb(100, 100, 130));
    }
  } else {
    const cost = selDef.costs[selLevel];
    const canAfford = balance >= cost;
    scr.text(3, detailY + 2, `Lv ${selLevel}→${selLevel + 1}`, rgb(180, 180, 200));
    scr.text(14, detailY + 2, `Cost: ${cost}`, canAfford ? rgb(140, 230, 180) : rgb(240, 100, 100));

    // Buff preview on same line
    const cur = selLevel * selDef.buffPerLevel;
    const nxt = (selLevel + 1) * selDef.buffPerLevel;
    let buffLabel;
    if (['creditMult', 'dropRate', 'rpMult', 'coreEfficiency'].includes(selDef.buffKey)) {
      buffLabel = `Buff: ${(cur * 100).toFixed(0)}%→${(nxt * 100).toFixed(0)}%`;
    } else if (selDef.buffKey === 'passiveIncome') {
      buffLabel = `Buff: ${cur}/hr→${nxt}/hr`;
    } else {
      buffLabel = `Buff: ${cur}→${nxt}`;
    }
    const buffX = Math.max(30, w - buffLabel.length - 3);
    scr.text(buffX, detailY + 2, buffLabel, rgb(100, 100, 140));
  }

  // Row 3: effects (only if not maxed, since maxed shows it inline)
  if (!locked && !maxed) {
    scr.text(3, detailY + 3, selDef.effects.join(' | '), rgb(100, 100, 130));
  } else if (locked) {
    scr.text(3, detailY + 3, selDef.effects.join(' | '), rgb(60, 60, 80));
  }

  // Bottom divider + controls
  for (let x = 1; x < w - 1; x++) scr.set(x, detailY + 4, '─', rgb(28, 28, 42));
  scr.centerText(detailY + 5, '[↑↓←→] Navigate   [Enter] Upgrade   [Esc] Back', rgb(55, 55, 80));
}

// ─── Selection box: bright red border drawn AROUND the selected node ───

function drawSelectionBox(scr, x, y, nw, nh, frame) {
  // Draw 1 cell outside the node on all sides
  const sx = x - 1;
  const sy = y - 1;
  const sw = nw + 2;
  const sh = nh + 2; // nh is 5 (rows 0-4), so box is 7 tall

  const pulse = Math.sin(frame * 0.15) * 0.2 + 0.8;
  const rr = Math.min(255, Math.floor(240 * pulse));
  const rg = Math.min(255, Math.floor(50 * pulse));
  const rb = Math.min(255, Math.floor(50 * pulse));
  const selColor = rgb(rr, rg, rb);

  // Top edge
  scr.set(sx, sy, '┌', selColor);
  for (let i = 1; i < sw - 1; i++) scr.set(sx + i, sy, '─', selColor);
  scr.set(sx + sw - 1, sy, '┐', selColor);

  // Bottom edge
  scr.set(sx, sy + sh - 1, '└', selColor);
  for (let i = 1; i < sw - 1; i++) scr.set(sx + i, sy + sh - 1, '─', selColor);
  scr.set(sx + sw - 1, sy + sh - 1, '┘', selColor);

  // Side edges
  for (let i = 1; i < sh - 1; i++) {
    scr.set(sx, sy + i, '│', selColor);
    scr.set(sx + sw - 1, sy + i, '│', selColor);
  }
}

// ─── Upgrade burst effect ───

class UpgradeBurst {
  constructor(cx, cy, glow, frame) {
    this.particles = [];
    this.startFrame = frame;
    const chars = '◆◈✦⊹∙·★●';
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 0.5 + hash(i * 13, frame) * 1.0;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed * 2,
        vy: Math.sin(angle) * speed * 0.6,
        char: chars[i % chars.length],
        r: glow.r, g: glow.g, b: glow.b,
        life: 20 + Math.floor(hash(i * 7, frame) * 15),
      });
    }
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.92; p.vy *= 0.92;
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(scr) {
    for (const p of this.particles) {
      const fade = Math.max(0.1, p.life / 30);
      scr.set(Math.round(p.x), Math.round(p.y), p.char, rgb(
        Math.min(255, Math.floor(p.r * fade)),
        Math.min(255, Math.floor(p.g * fade)),
        Math.min(255, Math.floor(p.b * fade))
      ));
    }
  }

  get done() { return this.particles.length === 0; }
}

// ═══════════════════════════════════════════════════════════════
// MAIN UI
// ═══════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function openSystemCore() {
  const scr = new Screen();
  scr.enter();
  scr.padded();

  const w = scr.width;
  const h = scr.height;
  const layout = getLayout(w, h);
  const { NW, NH, KW } = layout;

  let cursor = 0;
  let done = false;
  let flashMsg = null;
  let flashTimer = 0;
  let frameCount = 0;
  let bursts = [];

  const passiveCollected = collectPassiveIncome();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  const onKey = (key) => {
    if (key === '\x1b' || key === 'q') { done = true; return; }
    if (key === '\x1b[A' || key === 'k') cursor = (cursor - 1 + MODULE_ORDER.length) % MODULE_ORDER.length;
    if (key === '\x1b[B' || key === 'j') cursor = (cursor + 1) % MODULE_ORDER.length;
    if (key === '\x1b[D' || key === 'h') {
      const pos = layout[MODULE_ORDER[cursor]];
      const cx = Math.floor(w / 2);
      if (pos && pos.x > cx - 5) {
        const target = MODULE_ORDER.find(id => {
          const p = layout[id];
          return p && Math.abs(p.y - pos.y) <= 2 && p.x < pos.x - 4;
        });
        if (target) cursor = MODULE_ORDER.indexOf(target);
      }
    }
    if (key === '\x1b[C' || key === 'l') {
      const pos = layout[MODULE_ORDER[cursor]];
      const cx = Math.floor(w / 2);
      if (pos && pos.x < cx + 5) {
        const target = MODULE_ORDER.find(id => {
          const p = layout[id];
          return p && Math.abs(p.y - pos.y) <= 2 && p.x > pos.x + 4;
        });
        if (target) cursor = MODULE_ORDER.indexOf(target);
      }
    }
    if (key === '\r' || key === ' ') {
      const moduleId = MODULE_ORDER[cursor];
      const result = upgradeModule(moduleId);
      if (result.success) {
        flashMsg = `${MODULES[moduleId].name} upgraded to Lv${result.newLevel}!`;
        flashTimer = 50;
        const pos = layout[moduleId];
        const nodeW = moduleId === 'KERNEL' ? KW : NW;
        bursts.push(new UpgradeBurst(
          pos.x + Math.floor(nodeW / 2), pos.y + Math.floor(NH / 2),
          CAT_GLOW[MODULES[moduleId].category], frameCount
        ));
      } else {
        flashMsg = result.reason;
        flashTimer = 30;
      }
    }
  };

  stdin.on('data', onKey);

  if (passiveCollected > 0) {
    flashMsg = `Pipeline collected: +${passiveCollected} credits`;
    flashTimer = 60;
  }

  while (!done) {
    scr.clear();
    const core = loadCore();
    const balance = getBalance();
    const tier = getCoreTier();
    const totalLevel = getTotalCoreLevel();
    const fullyMaxed = isFullyMaxed();

    // Layer 0: PCB substrate
    drawPCBBackground(scr, w, h, frameCount, totalLevel);

    // Layer 1: Header + progress
    drawHeader(scr, w, frameCount, tier, totalLevel);
    drawProgressBar(scr, w, frameCount, tier, totalLevel, balance);

    // Layer 2: Chip package (border, pads, die grid)
    drawChipPackage(scr, layout, w, h, frameCount, totalLevel, fullyMaxed);

    // Layer 3: Data flow inside chip
    drawChipDataFlow(scr, layout, w, h, frameCount, totalLevel, fullyMaxed);

    // Layer 4: Connection traces
    for (const [fromId, toId] of CONNECTIONS) {
      const fp = layout[fromId];
      const tp = layout[toId];
      const fLv = core.modules[fromId] || 0;
      const tLv = core.modules[toId] || 0;
      const fnw = fromId === 'KERNEL' ? KW : NW;
      const tnw = toId === 'KERNEL' ? KW : NW;
      drawTrace(scr, fp.x + Math.floor(fnw / 2), fp.y + NH, tp.x + Math.floor(tnw / 2), tp.y, fLv, tLv, frameCount, totalLevel);
    }

    // Layer 5: Nodes
    for (let i = 0; i < MODULE_ORDER.length; i++) {
      const id = MODULE_ORDER[i];
      const pos = layout[id];
      const nodeW = id === 'KERNEL' ? KW : NW;
      drawNode(scr, id, pos.x, pos.y, nodeW, NH, core.modules[id] || 0, i === cursor, frameCount, totalLevel);
    }

    // Layer 5b: Red selection box around the selected node
    {
      const selNodeId = MODULE_ORDER[cursor];
      const selPos = layout[selNodeId];
      const selNodeW = selNodeId === 'KERNEL' ? KW : NW;
      drawSelectionBox(scr, selPos.x, selPos.y, selNodeW, NH, frameCount);
    }

    // Layer 6: Transcendent effect (when fully maxed)
    if (fullyMaxed) {
      drawTranscendentEffect(scr, layout, w, h, frameCount);
    }

    // Layer 7: Burst particles
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].update();
      bursts[i].draw(scr);
      if (bursts[i].done) bursts.splice(i, 1);
    }

    // Layer 8: Detail panel
    const selId = MODULE_ORDER[cursor];
    drawDetailPanel(scr, w, h, selId, core.modules[selId] || 0, balance, frameCount, flashMsg, flashTimer);

    if (flashTimer > 0) { flashTimer--; if (flashTimer <= 0) flashMsg = null; }

    scr.render();
    frameCount++;
    await sleep(50);
  }

  stdin.removeListener('data', onKey);
  scr.exit();
}

// ─── Transcendent badge for battle HUD ───
// Draws an animated "⚛ TRANSCENDENT" indicator inline at (x, y).
// Call AFTER drawRankBadge and offset x by its returned length + 1.
// Returns the drawn text length so callers can chain.

function _transcendentHash(i, frame) {
  let h = (i * 2654435761 + frame * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return (h & 0xFFFF) / 0xFFFF;
}

function drawTranscendentBadge(screen, x, y, frameCount) {
  if (!isFullyMaxed()) return 0;

  const text = '⚛ TRANSCENDENT';
  const t = frameCount * 0.07;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') { screen.set(x + i, y, ' '); continue; }

    // Wave of purple-white energy flowing through the text
    const wave = Math.sin(t + i * 0.4) * 0.5 + 0.5;
    // Occasional bright spike
    const spike = _transcendentHash(i, frameCount) < 0.06;

    let r, g, b;
    if (spike) {
      r = 255; g = 240; b = 255; // white flash
    } else {
      r = Math.floor(140 + wave * 115); // 140-255
      g = Math.floor(60 + wave * 80);   // 60-140
      b = Math.floor(180 + wave * 75);  // 180-255
    }
    screen.set(x + i, y, ch, rgb(r, g, b), null, spike);
  }

  return text.length;
}

module.exports = {
  openSystemCore,
  getBuff,
  getCreditMultiplier,
  getDropRateBonus,
  getRpMultiplier,
  getExtraItemSlots,
  getPassiveIncomeRate,
  collectPassiveIncome,
  upgradeModule,
  canUpgrade,
  canUnlock,
  getModuleLevel,
  getTotalCoreLevel,
  getCoreTier,
  isFullyMaxed,
  drawTranscendentBadge,
};
