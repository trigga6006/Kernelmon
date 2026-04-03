// ═══════════════════════════════════════════════════════════════
// PARTS SYSTEM — Collect PC components, swap onto your fighter
// Drop from battle wins. Equip to override hardware scan.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.rigemon');
const PARTS_FILE = path.join(WSO_DIR, 'parts.json');
const BUILD_FILE = path.join(WSO_DIR, 'build.json');

// ─── Rarity tiers ───

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const RARITY_COLORS = {
  common:    '\x1b[38;2;160;165;180m',
  uncommon:  '\x1b[38;2;140;230;180m',
  rare:      '\x1b[38;2;140;190;250m',
  epic:      '\x1b[38;2;200;170;240m',
  legendary: '\x1b[38;2;240;220;140m',
  mythic:    '\x1b[38;2;255;100;100m',
};

const RARITY_ICONS = {
  common: '·', uncommon: '◇', rare: '◆', epic: '★', legendary: '✦', mythic: '⚡',
};

// ─── Parts Catalog ───
// Each part has real hardware specs that feed into the profiler's stat system.
// The profiler uses: cpu.cores, cpu.threads, cpu.speedMax, gpu.vramMB, gpu.model,
// gpu.vendor, ram.totalGB, storage.type

const PARTS = {
  // ══════════════════════════════════════
  // CPUs — affects STR and SPD
  // ══════════════════════════════════════

  // Common
  i3_12100:      { type: 'cpu', rarity: 'common',    name: 'Intel Core i3-12100',        icon: '▣', cpu: { brand: 'Intel Core i3-12100',         manufacturer: 'Intel', cores: 4,  threads: 8,  speedMax: 4.3 }, dropWeight: 30 },
  r5_3600:       { type: 'cpu', rarity: 'common',    name: 'AMD Ryzen 5 3600',           icon: '▣', cpu: { brand: 'AMD Ryzen 5 3600',            manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 4.2 }, dropWeight: 30 },
  i5_10400:      { type: 'cpu', rarity: 'common',    name: 'Intel Core i5-10400F',       icon: '▣', cpu: { brand: 'Intel Core i5-10400F',        manufacturer: 'Intel', cores: 6,  threads: 12, speedMax: 4.3 }, dropWeight: 28 },

  // Uncommon
  r5_5600x:      { type: 'cpu', rarity: 'uncommon',  name: 'AMD Ryzen 5 5600X',          icon: '▣', cpu: { brand: 'AMD Ryzen 5 5600X',           manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 4.6 }, dropWeight: 18 },
  i5_12600k:     { type: 'cpu', rarity: 'uncommon',  name: 'Intel Core i5-12600K',       icon: '▣', cpu: { brand: 'Intel Core i5-12600K',        manufacturer: 'Intel', cores: 10, threads: 16, speedMax: 4.9 }, dropWeight: 18 },
  r5_7600x:      { type: 'cpu', rarity: 'uncommon',  name: 'AMD Ryzen 5 7600X',          icon: '▣', cpu: { brand: 'AMD Ryzen 5 7600X',           manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 5.3 }, dropWeight: 16 },

  // Rare
  r7_5800x3d:    { type: 'cpu', rarity: 'rare',      name: 'AMD Ryzen 7 5800X3D',        icon: '▣', cpu: { brand: 'AMD Ryzen 7 5800X3D',         manufacturer: 'AMD',   cores: 8,  threads: 16, speedMax: 4.5 }, dropWeight: 8 },
  i7_13700k:     { type: 'cpu', rarity: 'rare',      name: 'Intel Core i7-13700K',       icon: '▣', cpu: { brand: 'Intel Core i7-13700K',        manufacturer: 'Intel', cores: 16, threads: 24, speedMax: 5.4 }, dropWeight: 8 },
  r7_7800x3d:    { type: 'cpu', rarity: 'rare',      name: 'AMD Ryzen 7 7800X3D',        icon: '▣', cpu: { brand: 'AMD Ryzen 7 7800X3D',         manufacturer: 'AMD',   cores: 8,  threads: 16, speedMax: 5.0 }, dropWeight: 7 },

  // Epic
  r9_7900x:      { type: 'cpu', rarity: 'epic',      name: 'AMD Ryzen 9 7900X',          icon: '▣', cpu: { brand: 'AMD Ryzen 9 7900X',           manufacturer: 'AMD',   cores: 12, threads: 24, speedMax: 5.6 }, dropWeight: 3 },
  i9_13900k:     { type: 'cpu', rarity: 'epic',      name: 'Intel Core i9-13900K',       icon: '▣', cpu: { brand: 'Intel Core i9-13900K',        manufacturer: 'Intel', cores: 24, threads: 32, speedMax: 5.8 }, dropWeight: 3 },
  r9_7950x:      { type: 'cpu', rarity: 'epic',      name: 'AMD Ryzen 9 7950X',          icon: '▣', cpu: { brand: 'AMD Ryzen 9 7950X',           manufacturer: 'AMD',   cores: 16, threads: 32, speedMax: 5.7 }, dropWeight: 2.5 },

  // Legendary
  i9_14900ks:    { type: 'cpu', rarity: 'legendary',  name: 'Intel Core i9-14900KS',     icon: '▣', cpu: { brand: 'Intel Core i9-14900KS',       manufacturer: 'Intel', cores: 24, threads: 32, speedMax: 6.2 }, dropWeight: 0.8 },
  r9_9950x:      { type: 'cpu', rarity: 'legendary',  name: 'AMD Ryzen 9 9950X',         icon: '▣', cpu: { brand: 'AMD Ryzen 9 9950X',           manufacturer: 'AMD',   cores: 16, threads: 32, speedMax: 5.7 }, dropWeight: 0.8 },
  tr_7970x:      { type: 'cpu', rarity: 'legendary',  name: 'AMD Threadripper 7970X',    icon: '▣', cpu: { brand: 'AMD Threadripper 7970X',      manufacturer: 'AMD',   cores: 32, threads: 64, speedMax: 5.3 }, dropWeight: 0.5 },

  // Mythic
  tr_7995wx:     { type: 'cpu', rarity: 'mythic',    name: 'Threadripper PRO 7995WX',    icon: '▣', cpu: { brand: 'AMD Threadripper PRO 7995WX',  manufacturer: 'AMD',   cores: 96, threads: 192, speedMax: 5.1 }, dropWeight: 0.1 },
  w9_3595x:      { type: 'cpu', rarity: 'mythic',    name: 'Intel Xeon w9-3595X',        icon: '▣', cpu: { brand: 'Intel Xeon w9-3595X',         manufacturer: 'Intel', cores: 60, threads: 120, speedMax: 4.8 }, dropWeight: 0.1 },

  // ══════════════════════════════════════
  // GPUs — affects MAG
  // ══════════════════════════════════════

  // Common
  gtx_1650:      { type: 'gpu', rarity: 'common',    name: 'GTX 1650',                   icon: '◈', gpu: { model: 'NVIDIA GeForce GTX 1650',   vramMB: 4096,  vendor: 'NVIDIA' }, dropWeight: 30 },
  rx_6500xt:     { type: 'gpu', rarity: 'common',    name: 'RX 6500 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 6500 XT',     vramMB: 4096,  vendor: 'AMD' },    dropWeight: 28 },
  gtx_1060:      { type: 'gpu', rarity: 'common',    name: 'GTX 1060 6GB',               icon: '◈', gpu: { model: 'NVIDIA GeForce GTX 1060',   vramMB: 6144,  vendor: 'NVIDIA' }, dropWeight: 30 },

  // Uncommon
  rtx_3060:      { type: 'gpu', rarity: 'uncommon',  name: 'RTX 3060',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 3060',   vramMB: 12288, vendor: 'NVIDIA' }, dropWeight: 18 },
  rx_6700xt:     { type: 'gpu', rarity: 'uncommon',  name: 'RX 6700 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 6700 XT',     vramMB: 12288, vendor: 'AMD' },    dropWeight: 18 },
  arc_a770:      { type: 'gpu', rarity: 'uncommon',  name: 'Intel Arc A770',              icon: '◈', gpu: { model: 'Intel Arc A770',            vramMB: 16384, vendor: 'Intel' },  dropWeight: 15 },

  // Rare
  rtx_4070:      { type: 'gpu', rarity: 'rare',      name: 'RTX 4070',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4070',   vramMB: 12288, vendor: 'NVIDIA' }, dropWeight: 8 },
  rx_7800xt:     { type: 'gpu', rarity: 'rare',      name: 'RX 7800 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 7800 XT',     vramMB: 16384, vendor: 'AMD' },    dropWeight: 8 },
  rtx_4070ti:    { type: 'gpu', rarity: 'rare',      name: 'RTX 4070 Ti Super',          icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4070 Ti Super', vramMB: 16384, vendor: 'NVIDIA' }, dropWeight: 7 },

  // Epic
  rtx_4080:      { type: 'gpu', rarity: 'epic',      name: 'RTX 4080 Super',             icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4080 Super', vramMB: 16384, vendor: 'NVIDIA' }, dropWeight: 3 },
  rx_7900xtx:    { type: 'gpu', rarity: 'epic',      name: 'RX 7900 XTX',                icon: '◈', gpu: { model: 'AMD Radeon RX 7900 XTX',     vramMB: 24576, vendor: 'AMD' },    dropWeight: 3 },
  rtx_4090:      { type: 'gpu', rarity: 'epic',      name: 'RTX 4090',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4090',    vramMB: 24576, vendor: 'NVIDIA' }, dropWeight: 2 },

  // Legendary
  rtx_5090:      { type: 'gpu', rarity: 'legendary', name: 'RTX 5090',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 5090',    vramMB: 32768, vendor: 'NVIDIA' }, dropWeight: 0.8 },
  rx_9070xtx:    { type: 'gpu', rarity: 'legendary', name: 'RX 9070 XTX',                icon: '◈', gpu: { model: 'AMD Radeon RX 9070 XTX',     vramMB: 24576, vendor: 'AMD' },    dropWeight: 0.8 },
  pro_w7900:     { type: 'gpu', rarity: 'legendary', name: 'Radeon PRO W7900',           icon: '◈', gpu: { model: 'AMD Radeon PRO W7900',       vramMB: 49152, vendor: 'AMD' },    dropWeight: 0.5 },

  // Mythic
  a100:          { type: 'gpu', rarity: 'mythic',    name: 'NVIDIA A100 80GB',           icon: '◈', gpu: { model: 'NVIDIA A100',                vramMB: 81920, vendor: 'NVIDIA' }, dropWeight: 0.08 },
  h100:          { type: 'gpu', rarity: 'mythic',    name: 'NVIDIA H100 80GB',           icon: '◈', gpu: { model: 'NVIDIA H100',                vramMB: 81920, vendor: 'NVIDIA' }, dropWeight: 0.05 },
  mi300x:        { type: 'gpu', rarity: 'mythic',    name: 'AMD Instinct MI300X',        icon: '◈', gpu: { model: 'AMD Instinct MI300X',        vramMB: 196608, vendor: 'AMD' },   dropWeight: 0.03 },

  // ══════════════════════════════════════
  // RAM — affects VIT / HP / DEF
  // ══════════════════════════════════════

  // Common
  ram_8gb:       { type: 'ram', rarity: 'common',    name: '8 GB DDR4',                  icon: '█', ram: { totalGB: 8 },   dropWeight: 35 },
  ram_16gb:      { type: 'ram', rarity: 'common',    name: '16 GB DDR4',                 icon: '█', ram: { totalGB: 16 },  dropWeight: 30 },

  // Uncommon
  ram_32gb:      { type: 'ram', rarity: 'uncommon',  name: '32 GB DDR5',                 icon: '█', ram: { totalGB: 32 },  dropWeight: 16 },

  // Rare
  ram_64gb:      { type: 'ram', rarity: 'rare',      name: '64 GB DDR5',                 icon: '█', ram: { totalGB: 64 },  dropWeight: 6 },

  // Epic
  ram_128gb:     { type: 'ram', rarity: 'epic',      name: '128 GB DDR5 ECC',            icon: '█', ram: { totalGB: 128 }, dropWeight: 2 },

  // Legendary
  ram_256gb:     { type: 'ram', rarity: 'legendary', name: '256 GB DDR5 RDIMM',          icon: '█', ram: { totalGB: 256 }, dropWeight: 0.5 },

  // Mythic
  ram_1tb:       { type: 'ram', rarity: 'mythic',    name: '1 TB DDR5 Server',           icon: '█', ram: { totalGB: 1024 }, dropWeight: 0.05 },

  // ══════════════════════════════════════
  // Storage — affects SPD
  // ══════════════════════════════════════

  // Common
  hdd_1tb:       { type: 'storage', rarity: 'common',    name: '1TB 7200RPM HDD',        icon: '▤', storage: { type: 'HDD', sizeGB: 1000 },  dropWeight: 30 },
  ssd_500gb:     { type: 'storage', rarity: 'common',    name: '500GB SATA SSD',          icon: '▤', storage: { type: 'SSD', sizeGB: 500 },   dropWeight: 28 },

  // Uncommon
  ssd_1tb:       { type: 'storage', rarity: 'uncommon',  name: '1TB SATA SSD',            icon: '▤', storage: { type: 'SSD', sizeGB: 1000 },  dropWeight: 16 },
  nvme_500gb:    { type: 'storage', rarity: 'uncommon',  name: '500GB NVMe Gen3',         icon: '▤', storage: { type: 'NVMe', sizeGB: 500 },  dropWeight: 16 },

  // Rare
  nvme_1tb:      { type: 'storage', rarity: 'rare',      name: '1TB NVMe Gen4',           icon: '▤', storage: { type: 'NVMe', sizeGB: 1000 }, dropWeight: 7 },
  nvme_2tb:      { type: 'storage', rarity: 'rare',      name: '2TB NVMe Gen4',           icon: '▤', storage: { type: 'NVMe', sizeGB: 2000 }, dropWeight: 6 },

  // Epic
  nvme_4tb:      { type: 'storage', rarity: 'epic',      name: '4TB NVMe Gen5',           icon: '▤', storage: { type: 'NVMe', sizeGB: 4000 }, dropWeight: 2 },

  // Legendary
  nvme_8tb:      { type: 'storage', rarity: 'legendary', name: '8TB NVMe Gen5 Pro',       icon: '▤', storage: { type: 'NVMe', sizeGB: 8000 }, dropWeight: 0.4 },

  // Mythic
  optane_dc:     { type: 'storage', rarity: 'mythic',    name: 'Intel Optane DC P5800X',  icon: '▤', storage: { type: 'NVMe', sizeGB: 1600 }, dropWeight: 0.05 },
};

// ─── Type labels ───
const TYPE_LABELS = { cpu: 'CPU', gpu: 'GPU', ram: 'RAM', storage: 'STORAGE' };
const TYPE_COLORS = {
  cpu:     '\x1b[38;2;245;180;150m',
  gpu:     '\x1b[38;2;180;160;240m',
  ram:     '\x1b[38;2;140;230;180m',
  storage: '\x1b[38;2;140;190;250m',
};

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadParts() {
  try {
    if (!fs.existsSync(PARTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PARTS_FILE, 'utf8'));
  } catch { return {}; }
}

function saveParts(inv) {
  ensureDir();
  fs.writeFileSync(PARTS_FILE, JSON.stringify(inv, null, 2));
}

// ─── Multi-build persistence ───
// builds.json = { active: 0, builds: [ { name, main, parts: { cpu, gpu, ram, storage } }, ... ] }
// Index 0 is always the main character (real hardware + optional overrides)
// Index 1+ are custom characters built entirely from parts

const DEFAULT_BUILDS = { active: 0, builds: [{ name: 'My Rig', main: true, parts: {} }] };

function loadBuilds() {
  try {
    if (!fs.existsSync(BUILD_FILE)) {
      // Migrate old build.json format (single object of part IDs)
      const oldFile = BUILD_FILE;
      if (fs.existsSync(oldFile)) {
        const old = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
        if (old && !old.builds) {
          // Old format: { cpu: 'id', gpu: 'id', ... }
          return { active: 0, builds: [{ name: 'My Rig', main: true, parts: old }] };
        }
        return old;
      }
      return JSON.parse(JSON.stringify(DEFAULT_BUILDS));
    }
    const data = JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'));
    // Migration: if old format (flat object without builds array)
    if (data && !data.builds) {
      return { active: 0, builds: [{ name: 'My Rig', main: true, parts: data }] };
    }
    // Ensure index 0 is always the main build
    if (!data.builds || data.builds.length === 0) {
      data.builds = [{ name: 'My Rig', main: true, parts: {} }];
    }
    if (!data.builds[0].main) data.builds[0].main = true;
    return data;
  } catch { return JSON.parse(JSON.stringify(DEFAULT_BUILDS)); }
}

function saveBuilds(data) {
  ensureDir();
  fs.writeFileSync(BUILD_FILE, JSON.stringify(data, null, 2));
}

function getActiveBuildIndex() {
  return loadBuilds().active || 0;
}

function setActiveBuild(index) {
  const data = loadBuilds();
  if (index >= 0 && index < data.builds.length) {
    data.active = index;
    saveBuilds(data);
  }
}

function getBuild(index) {
  const data = loadBuilds();
  return data.builds[index] || null;
}

function getAllBuilds() {
  return loadBuilds().builds;
}

// Create a new custom character (empty, needs all 4 parts to be battle-ready)
function createBuild(name) {
  const data = loadBuilds();
  data.builds.push({ name, main: false, parts: {} });
  saveBuilds(data);
  return data.builds.length - 1; // return new index
}

// Delete a custom character and return all its parts to inventory
function deleteBuild(index) {
  const data = loadBuilds();
  if (index <= 0 || index >= data.builds.length) return false; // can't delete main
  const build = data.builds[index];

  // Return all equipped parts to inventory
  for (const partId of Object.values(build.parts)) {
    if (partId && PARTS[partId]) addPart(partId);
  }

  data.builds.splice(index, 1);
  // Fix active index
  if (data.active >= data.builds.length) data.active = 0;
  if (data.active === index) data.active = 0;
  else if (data.active > index) data.active--;
  saveBuilds(data);
  return true;
}

// ─── Inventory operations ───

function addPart(partId, count = 1) {
  const inv = loadParts();
  inv[partId] = (inv[partId] || 0) + count;
  saveParts(inv);
}

function removePart(partId) {
  const inv = loadParts();
  if (!inv[partId] || inv[partId] <= 0) return false;
  inv[partId]--;
  if (inv[partId] <= 0) delete inv[partId];
  saveParts(inv);
  return true;
}

function getOwnedParts() {
  const inv = loadParts();
  return Object.entries(inv)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, ...PARTS[id] }))
    .filter(p => p.name)
    .sort((a, b) => {
      // Sort by type, then rarity (best first)
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    });
}

function getOwnedPartsByType(type) {
  return getOwnedParts().filter(p => p.type === type);
}

// ─── Build-scoped part operations ───

function equipPartOnBuild(buildIndex, partId) {
  const part = PARTS[partId];
  if (!part) return false;
  const data = loadBuilds();
  const build = data.builds[buildIndex];
  if (!build) return false;

  const prevId = build.parts[part.type];

  // Unequip old part (return to inventory)
  if (prevId && prevId !== partId) {
    addPart(prevId);
  }

  // Remove new part from inventory and equip
  removePart(partId);
  build.parts[part.type] = partId;
  saveBuilds(data);
  return true;
}

function unequipPartOnBuild(buildIndex, type) {
  const data = loadBuilds();
  const build = data.builds[buildIndex];
  if (!build) return false;
  const partId = build.parts[type];
  if (!partId) return false;

  addPart(partId);
  delete build.parts[type];
  saveBuilds(data);
  return true;
}

// Check if a custom build has all 4 slots filled (battle-ready)
function isBuildComplete(buildIndex) {
  const build = getBuild(buildIndex);
  if (!build) return false;
  if (build.main) return true; // main is always ready (uses real hardware)
  const REQUIRED = ['cpu', 'gpu', 'ram', 'storage'];
  return REQUIRED.every(type => build.parts[type] && PARTS[build.parts[type]]);
}

// ─── Spec override ───
// Returns a modified specs object with the active build's parts applied

function applyBuildOverrides(realSpecs) {
  const data = loadBuilds();
  const activeIdx = data.active || 0;
  const build = data.builds[activeIdx];
  if (!build) return realSpecs;
  const parts = build.parts || {};

  if (Object.keys(parts).length === 0) return realSpecs;

  // For custom characters (non-main), build specs entirely from parts
  if (!build.main) {
    return buildSpecsFromParts(parts, realSpecs.id);
  }

  // For main character, overlay parts onto real hardware
  const specs = JSON.parse(JSON.stringify(realSpecs));

  if (parts.cpu && PARTS[parts.cpu]) {
    specs.cpu = { ...specs.cpu, ...PARTS[parts.cpu].cpu };
  }
  if (parts.gpu && PARTS[parts.gpu]) {
    specs.gpu = { ...specs.gpu, ...PARTS[parts.gpu].gpu };
  }
  if (parts.ram && PARTS[parts.ram]) {
    specs.ram = { ...specs.ram, ...PARTS[parts.ram].ram };
  }
  if (parts.storage && PARTS[parts.storage]) {
    specs.storage = { ...specs.storage, ...PARTS[parts.storage].storage };
  }

  if (Object.keys(parts).length > 0) specs.isLaptop = false;
  return specs;
}

// Build a full specs object entirely from parts (for custom characters)
function buildSpecsFromParts(parts, fallbackId) {
  const cpuPart  = parts.cpu     && PARTS[parts.cpu];
  const gpuPart  = parts.gpu     && PARTS[parts.gpu];
  const ramPart  = parts.ram     && PARTS[parts.ram];
  const storPart = parts.storage && PARTS[parts.storage];

  return {
    id: fallbackId || `custom-${Date.now()}`,
    cpu: cpuPart ? { ...cpuPart.cpu }
      : { brand: 'None', manufacturer: '', cores: 1, threads: 1, speed: 0.1, speedMax: 0.1 },
    gpu: gpuPart ? { ...gpuPart.gpu }
      : { model: 'None', vramMB: 0, vendor: '' },
    ram: ramPart ? { ...ramPart.ram }
      : { totalGB: 0.5 },
    storage: storPart ? { ...storPart.storage }
      : { type: 'HDD', sizeGB: 0 },
    os: { platform: process.platform, distro: '', hostname: 'custom' },
    isLaptop: false,
  };
}

// ─── Drop rolling ───
// Parts drop much rarer than items. Chance increases with opponent tier.

function rollPartDrop(rng, opponentTier = 'mid') {
  // Base chance to get ANY part at all
  const baseChance = { flagship: 0.35, high: 0.25, mid: 0.15, low: 0.08 };
  const chance = baseChance[opponentTier] || 0.15;

  if (rng.next() >= chance) return null; // no part drop

  // Weight-based selection from the catalog
  const entries = Object.entries(PARTS);
  const totalWeight = entries.reduce((s, [, p]) => s + p.dropWeight, 0);
  let roll = rng.next() * totalWeight;

  for (const [id, part] of entries) {
    roll -= part.dropWeight;
    if (roll <= 0) {
      return { id, ...part };
    }
  }

  // Fallback: random common
  const commons = entries.filter(([, p]) => p.rarity === 'common');
  const pick = commons[Math.floor(rng.next() * commons.length)];
  return pick ? { id: pick[0], ...pick[1] } : null;
}

// ─── Display helpers ───

function printPartDrop(part) {
  if (!part) return;
  const rc = RARITY_COLORS[part.rarity] || '';
  const tc = TYPE_COLORS[part.type] || '';
  const icon = RARITY_ICONS[part.rarity] || '·';
  const bright = '\x1b[38;2;230;230;245m';

  console.log(`\x1b[38;2;255;215;0m  ⚡ PART DROP!${RESET}`);
  console.log(`  ${rc}${icon} ${bright}${part.name}${rc} (${part.rarity} ${TYPE_LABELS[part.type]})${RESET}`);
}

function printOwnedParts() {
  const owned = getOwnedParts();
  const builds = getAllBuilds();
  const cyan = '\x1b[38;2;130;220;235m';
  const bright = '\x1b[38;2;230;230;245m';
  const dim = '\x1b[38;2;100;100;130m';
  const gold = '\x1b[38;2;255;215;0m';

  if (owned.length === 0 && builds.every(b => Object.keys(b.parts).length === 0)) {
    console.log(`${dim}  No parts yet. Win battles for a chance to earn components!${RESET}`);
    return;
  }

  console.log(`${cyan}  ╭──────────────────────────────────────────────────╮${RESET}`);
  console.log(`${cyan}  │  ${bright}PARTS INVENTORY${dim}                                  ${cyan}│${RESET}`);
  console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);

  // Show all builds
  const activeIdx = getActiveBuildIndex();
  for (let bi = 0; bi < builds.length; bi++) {
    const b = builds[bi];
    const active = bi === activeIdx ? `${gold}★ ` : '  ';
    console.log(`${cyan}  │  ${active}${bright}${b.name}${b.main ? dim + ' (hardware)' : ''}${RESET}${' '.repeat(Math.max(0, 38 - b.name.length))}${cyan}│${RESET}`);
    for (const type of ['cpu', 'gpu', 'ram', 'storage']) {
      const partId = b.parts[type];
      if (partId && PARTS[partId]) {
        const p = PARTS[partId];
        const rc = RARITY_COLORS[p.rarity] || dim;
        console.log(`${cyan}  │    ${TYPE_COLORS[type]}${TYPE_LABELS[type].padEnd(8)}${rc}${p.name.padEnd(36).slice(0,36)}${cyan}│${RESET}`);
      } else if (b.main) {
        console.log(`${cyan}  │    ${TYPE_COLORS[type]}${TYPE_LABELS[type].padEnd(8)}${dim}(stock)${' '.repeat(30)}${cyan}│${RESET}`);
      } else {
        console.log(`${cyan}  │    ${TYPE_COLORS[type]}${TYPE_LABELS[type].padEnd(8)}${dim}(empty)${' '.repeat(30)}${cyan}│${RESET}`);
      }
    }
    if (bi < builds.length - 1) console.log(`${cyan}  │${' '.repeat(50)}│${RESET}`);
  }

  if (owned.length > 0) {
    console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
    for (const part of owned) {
      const rc = RARITY_COLORS[part.rarity] || dim;
      const tc = TYPE_COLORS[part.type] || dim;
      const icon = RARITY_ICONS[part.rarity] || '·';
      console.log(`${cyan}  │  ${rc}${icon} ${bright}${part.name.padEnd(24)}${tc}${TYPE_LABELS[part.type].padEnd(8)}${rc}x${part.count}  (${part.rarity})${cyan.padEnd(1)}│${RESET}`);
    }
  }

  console.log(`${cyan}  ╰──────────────────────────────────────────────────╯${RESET}`);
}

module.exports = {
  PARTS, RARITY_ORDER, RARITY_COLORS, RARITY_ICONS,
  TYPE_LABELS, TYPE_COLORS,
  loadParts, saveParts, addPart, removePart,
  getOwnedParts, getOwnedPartsByType,
  loadBuilds, saveBuilds, getAllBuilds, getBuild,
  getActiveBuildIndex, setActiveBuild,
  createBuild, deleteBuild,
  equipPartOnBuild, unequipPartOnBuild,
  isBuildComplete, applyBuildOverrides, buildSpecsFromParts,
  rollPartDrop, printPartDrop, printOwnedParts,
};
