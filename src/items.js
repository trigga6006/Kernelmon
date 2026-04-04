// ═══════════════════════════════════════════════════════════════
// ITEM SYSTEM — Earn from wins, use mid-battle from BAG
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const INVENTORY_FILE = path.join(WSO_DIR, 'inventory.json');

// ─── Item Catalog ───

const ITEMS = {
  // ── Healing ──
  thermal_paste: {
    name: 'Thermal Paste',
    desc: 'Restore 20% max HP',
    icon: '◆',
    rarity: 'common',
    effect: 'heal',
    value: 0.20,
    dropRate: 0.6,
  },
  arctic_silver: {
    name: 'Arctic Silver',
    desc: 'Restore 40% max HP',
    icon: '◆',
    rarity: 'rare',
    effect: 'heal',
    value: 0.40,
    dropRate: 0.15,
  },
  liquid_metal: {
    name: 'Liquid Metal',
    desc: 'Restore 70% max HP',
    icon: '◆',
    rarity: 'epic',
    effect: 'heal',
    value: 0.70,
    dropRate: 0.04,
  },

  // ── Stat Boosts ──
  overclock_kit: {
    name: 'Overclock Kit',
    desc: 'STR +30% for 2 turns',
    icon: '⚡',
    rarity: 'common',
    effect: 'boost_str',
    value: 0.30,
    duration: 2,
    dropRate: 0.45,
  },
  ram_stick: {
    name: 'RAM Stick',
    desc: 'DEF +25% for 3 turns',
    icon: '█',
    rarity: 'common',
    effect: 'boost_def',
    value: 0.25,
    duration: 3,
    dropRate: 0.45,
  },
  nvme_cache: {
    name: 'NVMe Cache',
    desc: 'SPD +35% for 2 turns',
    icon: '»',
    rarity: 'uncommon',
    effect: 'boost_spd',
    value: 0.35,
    duration: 2,
    dropRate: 0.3,
  },
  gpu_bios_flash: {
    name: 'GPU BIOS Flash',
    desc: 'MAG +30% for 2 turns',
    icon: '◇',
    rarity: 'uncommon',
    effect: 'boost_mag',
    value: 0.30,
    duration: 2,
    dropRate: 0.3,
  },

  // ── Defensive / Utility ──
  firewall: {
    name: 'Firewall',
    desc: 'Block the next attack completely',
    icon: '▣',
    rarity: 'rare',
    effect: 'shield',
    value: 1,
    dropRate: 0.12,
  },
  driver_update: {
    name: 'Driver Update',
    desc: 'Cure stun and debuffs',
    icon: '↑',
    rarity: 'common',
    effect: 'cleanse',
    value: 1,
    dropRate: 0.5,
  },
  surge_protector: {
    name: 'Surge Protector',
    desc: 'Reflect 50% of next hit back',
    icon: '⚡',
    rarity: 'epic',
    effect: 'reflect',
    value: 0.50,
    dropRate: 0.05,
  },

  // ── Offensive ──
  voltage_spike: {
    name: 'Voltage Spike',
    desc: 'Deal 15% of opponent max HP',
    icon: '★',
    rarity: 'uncommon',
    effect: 'direct_damage',
    value: 0.15,
    dropRate: 0.25,
  },
  emp_charge: {
    name: 'EMP Charge',
    desc: 'Stun opponent for 1 turn',
    icon: '✦',
    rarity: 'rare',
    effect: 'stun',
    value: 1,
    dropRate: 0.1,
  },
  zero_day_exploit: {
    name: 'Zero-Day Exploit',
    desc: 'Deal 30% of opponent max HP + stun',
    icon: '★',
    rarity: 'legendary',
    effect: 'nuke',
    value: 0.30,
    dropRate: 0.02,
  },

  // ── Special Attacks ──
  darknet_collapse: {
    name: 'Darknet Collapse',
    desc: 'Implosion — 25% HP + stun + DEF down',
    icon: '●',
    rarity: 'epic',
    effect: 'special_darknet_collapse',
    value: 0.25,
    dropRate: 0.03,
  },
  botnet_typhoon: {
    name: 'Botnet Typhoon',
    desc: 'Swarm storm — 35% HP + STR/SPD down',
    icon: '◎',
    rarity: 'legendary',
    effect: 'special_botnet_typhoon',
    value: 0.35,
    dropRate: 0.01,
  },
  skyfall_payload: {
    name: 'Skyfall Payload',
    desc: 'Orbital strike — 20% HP + stun',
    icon: '▼',
    rarity: 'rare',
    effect: 'special_skyfall_payload',
    value: 0.20,
    dropRate: 0.06,
  },
  phantom_protocol: {
    name: 'Phantom Protocol',
    desc: 'Ghost crash — 22% HP + MAG down',
    icon: '◈',
    rarity: 'epic',
    effect: 'special_phantom_protocol',
    value: 0.22,
    dropRate: 0.03,
  },
  reactor_overflow: {
    name: 'Reactor Overflow',
    desc: 'Core breach — 40% HP + all stats down',
    icon: '✹',
    rarity: 'legendary',
    effect: 'special_reactor_overflow',
    value: 0.40,
    dropRate: 0.008,
  },
};

const RARITY_COLORS = {
  common:    '\x1b[38;2;160;165;180m',
  uncommon:  '\x1b[38;2;140;230;180m',
  rare:      '\x1b[38;2;140;190;250m',
  epic:      '\x1b[38;2;200;170;240m',
  legendary: '\x1b[38;2;240;220;140m',
};

// ─── Inventory persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadInventory() {
  try {
    if (!fs.existsSync(INVENTORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
  } catch { return {}; }
}

function saveInventory(inv) {
  ensureDir();
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inv, null, 2));
}

// Add item(s) to inventory
function addItem(itemId, count = 1) {
  const inv = loadInventory();
  inv[itemId] = (inv[itemId] || 0) + count;
  saveInventory(inv);
}

// Remove one item from inventory (on use)
function useItem(itemId) {
  const inv = loadInventory();
  if (!inv[itemId] || inv[itemId] <= 0) return false;
  inv[itemId]--;
  if (inv[itemId] <= 0) delete inv[itemId];
  saveInventory(inv);
  return true;
}

// Get list of owned items with details
function getOwnedItems() {
  const inv = loadInventory();
  return Object.entries(inv)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, ...ITEMS[id] }))
    .filter(item => item.name); // skip unknown item IDs
}

// ─── Reward drops ───

function rollRewards(rng, opponentTier = 'mid', won = true) {
  if (!won) return []; // losers get nothing

  const rewards = [];
  const tierMultiplier = { flagship: 2.0, high: 1.5, mid: 1.0, low: 0.7 };
  const mult = tierMultiplier[opponentTier] || 1.0;

  // Roll for each item in the catalog
  for (const [id, item] of Object.entries(ITEMS)) {
    const chance = item.dropRate * mult;
    if (rng.next() < chance) {
      rewards.push({ id, ...item });
    }
  }

  // Guarantee at least 1 item on win
  if (rewards.length === 0) {
    const commons = Object.entries(ITEMS).filter(([, i]) => i.rarity === 'common');
    const pick = commons[Math.floor(rng.next() * commons.length)];
    if (pick) rewards.push({ id: pick[0], ...pick[1] });
  }

  // Cap at 3 items per win
  return rewards.slice(0, 3);
}

// ─── Display ───

function printInventory() {
  const owned = getOwnedItems();
  const cyan = '\x1b[38;2;130;220;235m';
  const bright = '\x1b[38;2;230;230;245m';
  const dim = '\x1b[38;2;100;100;130m';

  if (owned.length === 0) {
    console.log(`${dim}  No items yet. Win battles to earn loot!${RESET}`);
    return;
  }

  console.log(`${cyan}  ╭──────────────────────────────────────────────────╮${RESET}`);
  console.log(`${cyan}  │  ${bright}BAG${dim}                                  ${bright}${owned.reduce((s, i) => s + i.count, 0)} items${cyan}  │${RESET}`);
  console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);

  for (const item of owned) {
    const rc = RARITY_COLORS[item.rarity] || dim;
    console.log(`${cyan}  │  ${rc}${item.icon} ${bright}${item.name.padEnd(22)}${dim}x${item.count}  ${item.desc.padEnd(18).slice(0,18)}${cyan}│${RESET}`);
  }

  console.log(`${cyan}  ╰──────────────────────────────────────────────────╯${RESET}`);
}

function printRewards(rewards) {
  if (rewards.length === 0) return;
  const gold = '\x1b[38;2;240;220;140m';
  const bright = '\x1b[38;2;230;230;245m';

  console.log(`${gold}  ◆ LOOT EARNED:${RESET}`);
  for (const item of rewards) {
    const rc = RARITY_COLORS[item.rarity] || '';
    console.log(`${rc}    ${item.icon} ${bright}${item.name}${rc} (${item.rarity})${RESET}`);
  }
}

module.exports = {
  ITEMS, RARITY_COLORS,
  loadInventory, saveInventory, addItem, useItem,
  getOwnedItems, rollRewards,
  printInventory, printRewards,
};
