// ═══════════════════════════════════════════════════════════════
// SYSTEM CORE — Persistent meta-progression with circuit-board UI
// Unlock and upgrade modules for passive account buffs
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { Screen } = require('./screen');
const { ESC, colors, rgb, bgRgb, RESET, BOLD, DIM } = require('./palette');
const { getBalance, spendCredits, formatBalance } = require('./credits');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const CORE_FILE = path.join(WSO_DIR, 'systemcore.json');

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

// Category colors
const CAT_COLORS = {
  Core:   rgb(230, 230, 245),
  Income: rgb(240, 220, 140),
  Reward: rgb(140, 230, 180),
  Utility:rgb(140, 190, 250),
  Visual: rgb(200, 170, 240),
  Access: rgb(240, 160, 140),
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
  return {
    modules: {},
    lastCollected: Date.now(),
    totalInvested: 0,
  };
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
  if (total >= 30) return { tier: 'V', name: 'TRANSCENDENT', color: rgb(200, 120, 255) };
  if (total >= 22) return { tier: 'IV', name: 'OVERCLOCKED', color: rgb(240, 220, 140) };
  if (total >= 14) return { tier: 'III', name: 'OPTIMIZED', color: rgb(140, 230, 180) };
  if (total >= 7)  return { tier: 'II', name: 'INITIALIZED', color: rgb(140, 190, 250) };
  if (total >= 1)  return { tier: 'I', name: 'BOOT SEQUENCE', color: rgb(130, 220, 235) };
  return { tier: '0', name: 'DORMANT', color: rgb(60, 60, 85) };
}

// ─── Buff Queries (used by other modules) ───

function getBuff(buffKey) {
  const core = loadCore();
  let value = 0;
  const kernelLevel = core.modules.KERNEL || 0;
  const coreBonus = 1 + kernelLevel * 0.02; // KERNEL amplifies all buffs

  for (const [id, def] of Object.entries(MODULES)) {
    if (def.buffKey === buffKey && core.modules[id]) {
      const raw = core.modules[id] * def.buffPerLevel;
      // KERNEL's own buff isn't amplified by itself
      value += id === 'KERNEL' ? raw : raw * coreBonus;
    }
  }
  return value;
}

function getCreditMultiplier() {
  return 1 + getBuff('creditMult');
}

function getDropRateBonus() {
  return getBuff('dropRate');
}

function getRpMultiplier() {
  return 1 + getBuff('rpMult');
}

function getExtraItemSlots() {
  return Math.floor(getBuff('extraItemSlots'));
}

function getPassiveIncomeRate() {
  return getBuff('passiveIncome'); // credits per hour
}

// ─── Passive Income Collection ───

const PASSIVE_CAP = 500;

function collectPassiveIncome() {
  const rate = getPassiveIncomeRate();
  if (rate <= 0) return 0;

  const core = loadCore();
  const now = Date.now();
  const elapsed = (now - (core.lastCollected || now)) / 3600000; // hours
  const earned = Math.min(Math.floor(rate * elapsed), PASSIVE_CAP);

  if (earned > 0) {
    const { addCredits } = require('./credits');
    addCredits(earned);
    core.lastCollected = now;
    saveCore(core);
  } else {
    core.lastCollected = now;
    saveCore(core);
  }

  return earned;
}

// ─── Upgrade Logic ───

function canUnlock(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return false;
  if (!def.prereq) return true;
  const reqLevel = getModuleLevel(def.prereq.module);
  return reqLevel >= def.prereq.level;
}

function canUpgrade(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return false;
  const level = getModuleLevel(moduleId);
  if (level >= def.maxLevel) return false;
  if (!canUnlock(moduleId)) return false;
  const cost = def.costs[level];
  return getBalance() >= cost;
}

function upgradeModule(moduleId) {
  const def = MODULES[moduleId];
  if (!def) return { success: false, reason: 'Unknown module' };

  const core = loadCore();
  const level = core.modules[moduleId] || 0;

  if (level >= def.maxLevel) return { success: false, reason: 'Already maxed' };
  if (!canUnlock(moduleId)) {
    const req = def.prereq;
    const reqDef = MODULES[req.module];
    return { success: false, reason: `Requires ${reqDef.name} Lv${req.level}` };
  }

  const cost = def.costs[level];
  if (!spendCredits(cost)) return { success: false, reason: 'Not enough credits' };

  core.modules[moduleId] = level + 1;
  core.totalInvested += cost;
  saveCore(core);

  return { success: true, newLevel: level + 1, cost };
}

// ─── Circuit Board Layout ───
// Positions are relative to content area; actual coords computed at render time

function getLayout(w, h) {
  const cx = Math.floor(w / 2);
  const startY = 5;

  // Node dimensions
  const NW = 14;  // node width
  const NH = 3;   // node height
  const gapX = Math.max(4, Math.floor(w / 6));

  return {
    KERNEL:      { x: cx - Math.floor(NW / 2), y: startY },
    CLOCK_BOOST: { x: cx - gapX - Math.floor(NW / 2), y: startY + 4 },
    CACHE:       { x: cx + gapX - Math.floor(NW / 2), y: startY + 4 },
    PIPELINE:    { x: cx - gapX - Math.floor(NW / 2), y: startY + 8 },
    MEM_POOL:    { x: cx + gapX - Math.floor(NW / 2), y: startY + 8 },
    SHADER:      { x: cx + gapX - Math.floor(NW / 2), y: startY + 12 },
    BUS_CTRL:    { x: cx - Math.floor(NW / 2), y: startY + 12 },
    OVERCLOCK:   { x: cx - gapX - Math.floor(NW / 2), y: startY + 16 },
    NW, NH,
  };
}

// Connections between nodes (for drawing traces)
const CONNECTIONS = [
  ['KERNEL', 'CLOCK_BOOST'],
  ['KERNEL', 'CACHE'],
  ['CLOCK_BOOST', 'PIPELINE'],
  ['CACHE', 'MEM_POOL'],
  ['KERNEL', 'BUS_CTRL'],
  ['CACHE', 'SHADER'],
  ['BUS_CTRL', 'OVERCLOCK'],
];

// ─── Drawing Helpers ───

function nodeColor(moduleId, level, selected) {
  if (selected) return rgb(255, 255, 255);
  if (level <= 0 && !canUnlock(moduleId)) return rgb(40, 40, 60);
  if (level <= 0) return rgb(80, 80, 110);
  const def = MODULES[moduleId];
  if (level >= def.maxLevel) return rgb(240, 220, 140); // gold for maxed
  return CAT_COLORS[def.category] || colors.cyan;
}

function nodeBgColor(moduleId, level, selected) {
  if (selected) return bgRgb(35, 35, 55);
  if (level > 0) return bgRgb(22, 22, 38);
  return null;
}

function drawNode(scr, moduleId, x, y, nw, nh, level, selected) {
  const def = MODULES[moduleId];
  const fg = nodeColor(moduleId, level, selected);
  const bg = nodeBgColor(moduleId, level, selected);
  const locked = level <= 0 && !canUnlock(moduleId);
  const borderChar = selected ? '═' : '─';
  const cornerTL = selected ? '╔' : '┌';
  const cornerTR = selected ? '╗' : '┐';
  const cornerBL = selected ? '╚' : '└';
  const cornerBR = selected ? '╝' : '┘';
  const sideL = selected ? '║' : '│';
  const sideR = selected ? '║' : '│';

  // Top border
  scr.text(x, y, cornerTL + borderChar.repeat(nw - 2) + cornerTR, fg, bg);

  // Module name centered
  const label = locked ? '? ? ?' : def.name;
  const pad = Math.max(0, nw - 2 - label.length);
  const lpad = Math.floor(pad / 2);
  const rpad = pad - lpad;
  scr.text(x, y + 1, sideL + ' '.repeat(lpad) + label + ' '.repeat(rpad) + sideR, fg, bg);

  // Level indicators
  const maxLv = def.maxLevel;
  let lvStr = '';
  if (locked) {
    lvStr = '🔒'.length > 1 ? 'LOCKED' : 'LOCKED';
  } else {
    for (let i = 0; i < maxLv; i++) {
      lvStr += i < level ? '●' : '○';
    }
  }
  const lvPad = Math.max(0, nw - 2 - lvStr.length);
  const lvLpad = Math.floor(lvPad / 2);
  const lvRpad = lvPad - lvLpad;
  const lvColor = locked ? rgb(50, 50, 70) : level >= maxLv ? rgb(240, 220, 140) : fg;
  scr.text(x, y + 2, cornerBL + borderChar.repeat(nw - 2) + cornerBR, fg, bg);

  // Draw level indicators on the bottom border line (overwrite center)
  const lvX = x + 1 + lvLpad;
  scr.text(lvX, y + 2, lvStr, lvColor, bg);
}

function drawTrace(scr, x1, y1, x2, y2, active) {
  const fg = active ? rgb(60, 100, 120) : rgb(30, 30, 45);

  if (x1 === x2) {
    // Vertical trace
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      scr.text(x1, y, '│', fg);
    }
  } else {
    // L-shaped trace: go down from source, then horizontal, then down to target
    const midY = Math.floor((y1 + y2) / 2);
    // Vertical from source
    for (let y = y1; y <= midY; y++) scr.text(x1, y, '│', fg);
    // Horizontal
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) scr.text(x, midY, '─', fg);
    // Corners
    if (x1 < x2) {
      scr.text(x1, midY, '└', fg);
      scr.text(x2, midY, '┐', fg);
    } else {
      scr.text(x1, midY, '┘', fg);
      scr.text(x2, midY, '┌', fg);
    }
    // Vertical to target
    for (let y = midY + 1; y <= y2; y++) scr.text(x2, y, '│', fg);
  }
}

// ─── Main UI ───

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function openSystemCore() {
  const scr = new Screen();
  scr.enter();
  scr.padded();

  const w = scr.width;
  const h = scr.height;
  const layout = getLayout(w, h);
  const { NW, NH } = layout;

  let cursor = 0;
  let done = false;
  let flashMsg = null;
  let flashTimer = 0;
  let frameCount = 0;

  // Collect passive income on open
  const passiveCollected = collectPassiveIncome();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  const onKey = (key) => {
    if (key === '\x1b' || key === 'q') {
      done = true;
      return;
    }
    if (key === '\x1b[A' || key === 'k') { // Up
      cursor = (cursor - 1 + MODULE_ORDER.length) % MODULE_ORDER.length;
    }
    if (key === '\x1b[B' || key === 'j') { // Down
      cursor = (cursor + 1) % MODULE_ORDER.length;
    }
    if (key === '\x1b[D' || key === 'h') { // Left
      // Jump to left column or up
      const cur = MODULE_ORDER[cursor];
      const pos = layout[cur];
      const cx = Math.floor(w / 2);
      if (pos.x > cx) {
        // Currently right, find left neighbor at same row
        const target = MODULE_ORDER.find(id => {
          const p = layout[id];
          return p.y === pos.y && p.x < cx;
        });
        if (target) cursor = MODULE_ORDER.indexOf(target);
      }
    }
    if (key === '\x1b[C' || key === 'l') { // Right
      const cur = MODULE_ORDER[cursor];
      const pos = layout[cur];
      const cx = Math.floor(w / 2);
      if (pos.x < cx) {
        const target = MODULE_ORDER.find(id => {
          const p = layout[id];
          return p.y === pos.y && p.x > cx;
        });
        if (target) cursor = MODULE_ORDER.indexOf(target);
      }
    }
    if (key === '\r' || key === ' ') { // Enter or Space
      const moduleId = MODULE_ORDER[cursor];
      const result = upgradeModule(moduleId);
      if (result.success) {
        flashMsg = `${MODULES[moduleId].name} upgraded to Lv${result.newLevel}!`;
        flashTimer = 40; // ~2 seconds at 20fps
      } else {
        flashMsg = result.reason;
        flashTimer = 30;
      }
    }
  };

  stdin.on('data', onKey);

  // Show passive income collection if any
  if (passiveCollected > 0) {
    flashMsg = `Pipeline collected: +${passiveCollected} credits`;
    flashTimer = 60;
  }

  // Render loop
  while (!done) {
    scr.clear();
    const core = loadCore();
    const balance = getBalance();
    const tier = getCoreTier();
    const totalLevel = getTotalCoreLevel();

    // ─── Header ───
    const titleStr = `${tier.tier === '0' ? '○' : '◆'} S Y S T E M   C O R E ${tier.tier === '0' ? '○' : '◆'}`;
    scr.centerText(0, titleStr, tier.color, null, true);
    scr.centerText(1, `Tier ${tier.tier}: ${tier.name}`, tier.color);

    // Summary bar
    const barWidth = Math.min(20, w - 20);
    const barFill = Math.min(barWidth, Math.round((totalLevel / 36) * barWidth));
    const bar = '█'.repeat(barFill) + '░'.repeat(barWidth - barFill);
    const summaryLeft = `Core [${bar}] ${totalLevel}/36`;
    const summaryRight = `◆ ${formatBalance(balance)} credits`;
    scr.text(2, 3, summaryLeft, tier.color);
    scr.text(w - summaryRight.length - 2, 3, summaryRight, rgb(240, 220, 140));

    scr.hline(1, 4, w - 2, '─', rgb(40, 40, 60));

    // ─── Draw traces first (behind nodes) ───
    for (const [fromId, toId] of CONNECTIONS) {
      const fromPos = layout[fromId];
      const toPos = layout[toId];
      const fromLevel = core.modules[fromId] || 0;
      const active = fromLevel > 0;
      const fromCX = fromPos.x + Math.floor(NW / 2);
      const toCX = toPos.x + Math.floor(NW / 2);
      drawTrace(scr, fromCX, fromPos.y + NH, toCX, toPos.y, active);
    }

    // ─── Draw nodes ───
    for (let i = 0; i < MODULE_ORDER.length; i++) {
      const id = MODULE_ORDER[i];
      const pos = layout[id];
      const level = core.modules[id] || 0;
      const selected = i === cursor;
      drawNode(scr, id, pos.x, pos.y, NW, NH, level, selected);
    }

    // ─── Detail panel for selected module ───
    const selId = MODULE_ORDER[cursor];
    const selDef = MODULES[selId];
    const selLevel = core.modules[selId] || 0;
    const locked = selLevel <= 0 && !canUnlock(selId);
    const maxed = selLevel >= selDef.maxLevel;

    const detailY = h - 8;
    scr.hline(1, detailY, w - 2, '─', rgb(40, 40, 60));

    const catColor = CAT_COLORS[selDef.category] || colors.cyan;
    scr.text(3, detailY + 1, `${selDef.icon} ${selDef.name}`, catColor, null, true);
    scr.text(3 + selDef.name.length + 4, detailY + 1, `— ${selDef.desc}`, colors.dim);
    scr.text(w - 12, detailY + 1, `[${selDef.category}]`, catColor);

    // Effects
    const effectStr = selDef.effects.join(' | ');
    scr.text(5, detailY + 2, effectStr, rgb(180, 180, 200));

    // Level & cost
    if (locked) {
      const req = selDef.prereq;
      const reqDef = MODULES[req.module];
      scr.text(5, detailY + 3, `Locked — requires ${reqDef.name} Lv${req.level}`, rgb(100, 60, 60));
    } else if (maxed) {
      scr.text(5, detailY + 3, `MAX LEVEL (${selLevel}/${selDef.maxLevel})`, rgb(240, 220, 140));
    } else {
      const cost = selDef.costs[selLevel];
      const canAfford = balance >= cost;
      const costColor = canAfford ? rgb(140, 230, 180) : rgb(240, 100, 100);
      scr.text(5, detailY + 3,
        `Lv ${selLevel} → ${selLevel + 1}`,
        rgb(180, 180, 200));
      scr.text(20, detailY + 3,
        `Cost: ${cost} credits`,
        costColor);

      // Show buff preview
      const currentBuff = selLevel * selDef.buffPerLevel;
      const nextBuff = (selLevel + 1) * selDef.buffPerLevel;
      let buffLabel = '';
      if (selDef.buffKey === 'creditMult' || selDef.buffKey === 'dropRate' || selDef.buffKey === 'rpMult' || selDef.buffKey === 'coreEfficiency') {
        buffLabel = `${(currentBuff * 100).toFixed(0)}% → ${(nextBuff * 100).toFixed(0)}%`;
      } else if (selDef.buffKey === 'passiveIncome') {
        buffLabel = `${currentBuff}/hr → ${nextBuff}/hr`;
      } else {
        buffLabel = `${currentBuff} → ${nextBuff}`;
      }
      scr.text(5, detailY + 4, `Buff: ${buffLabel}`, rgb(140, 140, 170));
    }

    // Flash message
    if (flashMsg && flashTimer > 0) {
      const flashColor = flashMsg.includes('!') || flashMsg.includes('+') ? rgb(140, 230, 180) : rgb(240, 150, 150);
      scr.centerText(detailY + 5, `  ${flashMsg}  `, flashColor, null, true);
      flashTimer--;
      if (flashTimer <= 0) flashMsg = null;
    }

    // Footer
    scr.hline(1, h - 2, w - 2, '─', rgb(40, 40, 60));
    const controls = '[↑↓←→] Navigate   [Enter] Upgrade   [Esc] Back';
    scr.centerText(h - 1, controls, colors.dim);

    // Ambient glow effect on active nodes
    if (frameCount % 20 < 10) {
      const kernelLv = core.modules.KERNEL || 0;
      if (kernelLv > 0) {
        const kPos = layout.KERNEL;
        const pulse = frameCount % 20 < 5 ? rgb(100, 140, 160) : rgb(70, 100, 120);
        scr.text(kPos.x - 1, kPos.y + 1, '>', pulse);
        scr.text(kPos.x + NW, kPos.y + 1, '<', pulse);
      }
    }

    scr.render();
    frameCount++;
    await sleep(50); // 20fps
  }

  stdin.removeListener('data', onKey);
  scr.exit();
}

module.exports = {
  openSystemCore,
  // Buff queries for other modules
  getBuff,
  getCreditMultiplier,
  getDropRateBonus,
  getRpMultiplier,
  getExtraItemSlots,
  getPassiveIncomeRate,
  collectPassiveIncome,
  // Upgrade
  upgradeModule,
  canUpgrade,
  canUnlock,
  // State queries
  getModuleLevel,
  getTotalCoreLevel,
  getCoreTier,
};
