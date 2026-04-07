// ═══════════════════════════════════════════════════════════════
// PARTS SYSTEM — Collect PC components, swap onto your fighter
// Drop from battle wins. Equip to override hardware scan.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');
const { getPartArt, formatArtForConsole } = require('./itemart');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const PARTS_FILE = path.join(WSO_DIR, 'parts.json');
const BUILD_FILE = path.join(WSO_DIR, 'build.json');

// ─── Rarity tiers ───

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'transcendent'];

const RARITY_COLORS = {
  common:    '\x1b[38;2;160;165;180m',
  uncommon:  '\x1b[38;2;140;230;180m',
  rare:      '\x1b[38;2;140;190;250m',
  epic:      '\x1b[38;2;200;170;240m',
  legendary: '\x1b[38;2;240;220;140m',
  mythic:       '\x1b[38;2;255;100;100m',
  transcendent: '\x1b[38;2;200;120;255m',
};

const RARITY_ICONS = {
  common: '·', uncommon: '◇', rare: '◆', epic: '★', legendary: '✦', mythic: '⚡', transcendent: '✧',
};

// ─── Parts Catalog ───
// Each part has real hardware specs that feed into the profiler's stat system.
// The profiler uses: cpu.cores, cpu.threads, cpu.speedMax, gpu.vramMB, gpu.model,
// gpu.vendor, ram.totalGB, storage.type, storage.speed (custom multiplier)

const PARTS = {
  // ══════════════════════════════════════
  // CPUs — affects STR and SPD
  // ══════════════════════════════════════

  // Mobile / low-power (seed-only — match laptop hardware scans correctly; don't drop from battles)
  i5_mobile:     { type: 'cpu', rarity: 'common',    name: 'Intel Core i5 (Mobile)',     icon: '▣', cpu: { brand: 'Intel Core i5',               manufacturer: 'Intel', cores: 10, threads: 12, speedMax: 1.8, mobile: true }, dropWeight: 0 },
  i7_mobile:     { type: 'cpu', rarity: 'common',    name: 'Intel Core i7 (Mobile)',     icon: '▣', cpu: { brand: 'Intel Core i7',               manufacturer: 'Intel', cores: 14, threads: 20, speedMax: 2.0, mobile: true }, dropWeight: 0 },
  r5_mobile:     { type: 'cpu', rarity: 'common',    name: 'AMD Ryzen 5 (Mobile)',       icon: '▣', cpu: { brand: 'AMD Ryzen 5',                 manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 2.0, mobile: true }, dropWeight: 0 },
  r7_mobile:     { type: 'cpu', rarity: 'common',    name: 'AMD Ryzen 7 (Mobile)',       icon: '▣', cpu: { brand: 'AMD Ryzen 7',                 manufacturer: 'AMD',   cores: 8,  threads: 16, speedMax: 2.2, mobile: true }, dropWeight: 0 },

  // Common
  i3_12100:      { type: 'cpu', rarity: 'common',    name: 'Intel Core i3-12100',        icon: '▣', cpu: { brand: 'Intel Core i3-12100',         manufacturer: 'Intel', cores: 4,  threads: 8,  speedMax: 4.3 }, dropWeight: 30 },
  r5_3600:       { type: 'cpu', rarity: 'common',    name: 'AMD Ryzen 5 3600',           icon: '▣', cpu: { brand: 'AMD Ryzen 5 3600',            manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 4.2 }, dropWeight: 30 },
  i5_10400:      { type: 'cpu', rarity: 'common',    name: 'Intel Core i5-10400F',       icon: '▣', cpu: { brand: 'Intel Core i5-10400F',        manufacturer: 'Intel', cores: 6,  threads: 12, speedMax: 4.3 }, dropWeight: 28 },

  // Uncommon
  r5_5600x:      { type: 'cpu', rarity: 'uncommon',  name: 'AMD Ryzen 5 5600X',          icon: '▣', cpu: { brand: 'AMD Ryzen 5 5600X',           manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 4.6 }, dropWeight: 18 },
  i5_12600k:     { type: 'cpu', rarity: 'uncommon',  name: 'Intel Core i5-12600K',       icon: '▣', cpu: { brand: 'Intel Core i5-12600K',        manufacturer: 'Intel', cores: 10, threads: 16, speedMax: 4.9 }, dropWeight: 18 },
  r5_7600x:      { type: 'cpu', rarity: 'uncommon',  name: 'AMD Ryzen 5 7600X',          icon: '▣', cpu: { brand: 'AMD Ryzen 5 7600X',           manufacturer: 'AMD',   cores: 6,  threads: 12, speedMax: 5.3 }, dropWeight: 16 },

  // Rare
  r7_5800x3d:    { type: 'cpu', rarity: 'rare',      name: 'AMD Ryzen 7 5800X3D',        icon: '▣', cpu: { brand: 'AMD Ryzen 7 5800X3D',         manufacturer: 'AMD',   cores: 12, threads: 24, speedMax: 5.0 }, dropWeight: 8 },
  i7_13700k:     { type: 'cpu', rarity: 'rare',      name: 'Intel Core i7-13700K',       icon: '▣', cpu: { brand: 'Intel Core i7-13700K',        manufacturer: 'Intel', cores: 16, threads: 24, speedMax: 5.4 }, dropWeight: 8 },
  r7_7800x3d:    { type: 'cpu', rarity: 'rare',      name: 'AMD Ryzen 7 7800X3D',        icon: '▣', cpu: { brand: 'AMD Ryzen 7 7800X3D',         manufacturer: 'AMD',   cores: 12, threads: 24, speedMax: 5.2 }, dropWeight: 7 },

  // Epic
  r9_7900x:      { type: 'cpu', rarity: 'epic',      name: 'AMD Ryzen 9 7900X',          icon: '▣', cpu: { brand: 'AMD Ryzen 9 7900X',           manufacturer: 'AMD',   cores: 12, threads: 24, speedMax: 5.6 }, dropWeight: 3 },
  i9_13900k:     { type: 'cpu', rarity: 'epic',      name: 'Intel Core i9-13900K',       icon: '▣', cpu: { brand: 'Intel Core i9-13900K',        manufacturer: 'Intel', cores: 24, threads: 32, speedMax: 5.8 }, dropWeight: 3 },
  r9_7950x:      { type: 'cpu', rarity: 'epic',      name: 'AMD Ryzen 9 7950X',          icon: '▣', cpu: { brand: 'AMD Ryzen 9 7950X',           manufacturer: 'AMD',   cores: 16, threads: 32, speedMax: 5.7 }, dropWeight: 2.5 },

  // Legendary
  i9_14900ks:    { type: 'cpu', rarity: 'legendary',  name: 'Intel Core i9-14900KS',     icon: '▣', cpu: { brand: 'Intel Core i9-14900KS',       manufacturer: 'Intel', cores: 24, threads: 32, speedMax: 6.2 }, dropWeight: 0.8 },
  r9_9950x:      { type: 'cpu', rarity: 'legendary',  name: 'AMD Ryzen 9 9950X',         icon: '▣', cpu: { brand: 'AMD Ryzen 9 9950X',           manufacturer: 'AMD',   cores: 20, threads: 40, speedMax: 6.0 }, dropWeight: 0.8 },
  tr_7970x:      { type: 'cpu', rarity: 'legendary',  name: 'AMD Threadripper 7970X',    icon: '▣', cpu: { brand: 'AMD Threadripper 7970X',      manufacturer: 'AMD',   cores: 32, threads: 64, speedMax: 5.3 }, dropWeight: 0.5 },

  // Mythic
  tr_7995wx:     { type: 'cpu', rarity: 'mythic',    name: 'Threadripper PRO 7995WX',    icon: '▣', cpu: { brand: 'AMD Threadripper PRO 7995WX',  manufacturer: 'AMD',   cores: 96, threads: 192, speedMax: 5.1 }, dropWeight: 0.1 },
  w9_3595x:      { type: 'cpu', rarity: 'mythic',    name: 'Intel Xeon w9-3595X',        icon: '▣', cpu: { brand: 'Intel Xeon w9-3595X',         manufacturer: 'Intel', cores: 60, threads: 120, speedMax: 4.8 }, dropWeight: 0.1 },

  // ✧ Transcendent
  epyc_9965:     { type: 'cpu', rarity: 'transcendent', name: 'AMD EPYC 9965 Turin',      icon: '✧', cpu: { brand: 'AMD EPYC 9965 Turin',         manufacturer: 'AMD',   cores: 192, threads: 384, speedMax: 5.4 }, dropWeight: 0.008 },
  cerebras_wse3: { type: 'cpu', rarity: 'transcendent', name: 'Cerebras WSE-3',            icon: '✧', cpu: { brand: 'Cerebras WSE-3 Wafer Engine',  manufacturer: 'Cerebras', cores: 900000, threads: 900000, speedMax: 3.0 }, dropWeight: 0.005 },
  m4_ultra_max:  { type: 'cpu', rarity: 'transcendent', name: 'Apple M4 Ultra Max',        icon: '✧', cpu: { brand: 'Apple M4 Ultra Max',          manufacturer: 'Apple', cores: 128, threads: 256, speedMax: 5.8 }, dropWeight: 0.008 },

  // ══════════════════════════════════════
  // GPUs — affects MAG
  // ══════════════════════════════════════

  // Integrated (seed-only — these exist so hardware scans match correctly; they don't drop from battles)
  intel_uhd:     { type: 'gpu', rarity: 'common',    name: 'Intel UHD Graphics',          icon: '◈', gpu: { model: 'Intel UHD Graphics',        vramMB: 2048,  vendor: 'Intel',  integrated: true }, dropWeight: 0 },
  intel_iris_xe: { type: 'gpu', rarity: 'common',    name: 'Intel Iris Xe',               icon: '◈', gpu: { model: 'Intel Iris Xe Graphics',    vramMB: 4096,  vendor: 'Intel',  integrated: true }, dropWeight: 0 },
  amd_vega:      { type: 'gpu', rarity: 'common',    name: 'AMD Radeon Vega',             icon: '◈', gpu: { model: 'AMD Radeon Vega Graphics',  vramMB: 2048,  vendor: 'AMD',    integrated: true }, dropWeight: 0 },

  // Common
  gtx_1650:      { type: 'gpu', rarity: 'common',    name: 'GTX 1650',                   icon: '◈', gpu: { model: 'NVIDIA GeForce GTX 1650',   vramMB: 4096,  vendor: 'NVIDIA' }, dropWeight: 30 },
  rx_6500xt:     { type: 'gpu', rarity: 'common',    name: 'RX 6500 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 6500 XT',     vramMB: 4096,  vendor: 'AMD' },    dropWeight: 28 },
  gtx_1060:      { type: 'gpu', rarity: 'common',    name: 'GTX 1060 6GB',               icon: '◈', gpu: { model: 'NVIDIA GeForce GTX 1060',   vramMB: 6144,  vendor: 'NVIDIA' }, dropWeight: 30 },

  // Uncommon
  rtx_3060:      { type: 'gpu', rarity: 'uncommon',  name: 'RTX 3060',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 3060',   vramMB: 12288, vendor: 'NVIDIA' }, dropWeight: 18 },
  rx_6700xt:     { type: 'gpu', rarity: 'uncommon',  name: 'RX 6700 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 6700 XT',     vramMB: 12288, vendor: 'AMD' },    dropWeight: 18 },
  arc_a770:      { type: 'gpu', rarity: 'uncommon',  name: 'Intel Arc A770',              icon: '◈', gpu: { model: 'Intel Arc A770',            vramMB: 16384, vendor: 'Intel' },  dropWeight: 15 },

  // Rare
  rtx_4070:      { type: 'gpu', rarity: 'rare',      name: 'RTX 4070',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4070',   vramMB: 18432, vendor: 'NVIDIA' }, dropWeight: 8 },
  rx_7800xt:     { type: 'gpu', rarity: 'rare',      name: 'RX 7800 XT',                 icon: '◈', gpu: { model: 'AMD Radeon RX 7800 XT',     vramMB: 20480, vendor: 'AMD' },    dropWeight: 8 },
  rtx_4070ti:    { type: 'gpu', rarity: 'rare',      name: 'RTX 4070 Ti Super',          icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4070 Ti Super', vramMB: 22528, vendor: 'NVIDIA' }, dropWeight: 7 },

  // Epic
  rtx_4080:      { type: 'gpu', rarity: 'epic',      name: 'RTX 4080 Super',             icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4080 Super', vramMB: 28672, vendor: 'NVIDIA' }, dropWeight: 3 },
  rx_7900xtx:    { type: 'gpu', rarity: 'epic',      name: 'RX 7900 XTX',                icon: '◈', gpu: { model: 'AMD Radeon RX 7900 XTX',     vramMB: 32768, vendor: 'AMD' },    dropWeight: 3 },
  rtx_4090:      { type: 'gpu', rarity: 'epic',      name: 'RTX 4090',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 4090',    vramMB: 36864, vendor: 'NVIDIA' }, dropWeight: 2 },

  // Legendary
  rtx_5090:      { type: 'gpu', rarity: 'legendary', name: 'RTX 5090',                   icon: '◈', gpu: { model: 'NVIDIA GeForce RTX 5090',    vramMB: 49152, vendor: 'NVIDIA' }, dropWeight: 0.8 },
  rx_9070xtx:    { type: 'gpu', rarity: 'legendary', name: 'RX 9070 XTX',                icon: '◈', gpu: { model: 'AMD Radeon RX 9070 XTX',     vramMB: 40960, vendor: 'AMD' },    dropWeight: 0.8 },
  pro_w7900:     { type: 'gpu', rarity: 'legendary', name: 'Radeon PRO W7900',           icon: '◈', gpu: { model: 'AMD Radeon PRO W7900',       vramMB: 57344, vendor: 'AMD' },    dropWeight: 0.5 },

  // Mythic
  a100:          { type: 'gpu', rarity: 'mythic',    name: 'NVIDIA A100 80GB',           icon: '◈', gpu: { model: 'NVIDIA A100',                vramMB: 81920,  vendor: 'NVIDIA' }, dropWeight: 0.08 },
  h100:          { type: 'gpu', rarity: 'mythic',    name: 'NVIDIA H100 80GB',           icon: '◈', gpu: { model: 'NVIDIA H100',                vramMB: 98304,  vendor: 'NVIDIA' }, dropWeight: 0.05 },
  mi300x:        { type: 'gpu', rarity: 'mythic',    name: 'AMD Instinct MI300X',        icon: '◈', gpu: { model: 'AMD Instinct MI300X',        vramMB: 131072, vendor: 'AMD' },   dropWeight: 0.03 },

  // ✧ Transcendent
  blackwell_b200:  { type: 'gpu', rarity: 'transcendent', name: 'NVIDIA B200 Blackwell',    icon: '✧', gpu: { model: 'NVIDIA B200 Blackwell',     vramMB: 196608, vendor: 'NVIDIA' }, dropWeight: 0.008 },
  rubin_ultra:     { type: 'gpu', rarity: 'transcendent', name: 'NVIDIA Rubin Ultra',        icon: '✧', gpu: { model: 'NVIDIA Rubin Ultra',        vramMB: 294912, vendor: 'NVIDIA' }, dropWeight: 0.005 },
  mi350x:          { type: 'gpu', rarity: 'transcendent', name: 'AMD Instinct MI350X',       icon: '✧', gpu: { model: 'AMD Instinct MI350X',       vramMB: 294912, vendor: 'AMD' },   dropWeight: 0.006 },
  falcon_shores:   { type: 'gpu', rarity: 'transcendent', name: 'Intel Falcon Shores',       icon: '✧', gpu: { model: 'Intel Falcon Shores',       vramMB: 262144, vendor: 'Intel' }, dropWeight: 0.007 },

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

  // ✧ Transcendent
  hbm4_stack:    { type: 'ram', rarity: 'transcendent', name: '4 TB HBM4 Stacked',        icon: '✧', ram: { totalGB: 4096 }, dropWeight: 0.006 },

  // ══════════════════════════════════════
  // Storage — affects SPD
  // ══════════════════════════════════════

  // Common
  hdd_1tb:       { type: 'storage', rarity: 'common',    name: '1TB 7200RPM HDD',        icon: '▤', storage: { type: 'HDD', sizeGB: 1000, speed: 1.0 },  dropWeight: 30 },
  ssd_500gb:     { type: 'storage', rarity: 'common',    name: '500GB SATA SSD',          icon: '▤', storage: { type: 'SSD', sizeGB: 500, speed: 2.0 },   dropWeight: 28 },

  // Uncommon
  ssd_1tb:       { type: 'storage', rarity: 'uncommon',  name: '1TB SATA SSD',            icon: '▤', storage: { type: 'SSD', sizeGB: 1000, speed: 2.5 },  dropWeight: 16 },
  nvme_500gb:    { type: 'storage', rarity: 'uncommon',  name: '500GB NVMe Gen3',         icon: '▤', storage: { type: 'NVMe', sizeGB: 500, speed: 3.5 },  dropWeight: 16 },

  // Rare
  nvme_1tb:      { type: 'storage', rarity: 'rare',      name: '1TB NVMe Gen4',           icon: '▤', storage: { type: 'NVMe', sizeGB: 1000, speed: 5.0 }, dropWeight: 7 },
  nvme_2tb:      { type: 'storage', rarity: 'rare',      name: '2TB NVMe Gen4',           icon: '▤', storage: { type: 'NVMe', sizeGB: 2000, speed: 5.5 }, dropWeight: 6 },

  // Epic
  nvme_4tb:      { type: 'storage', rarity: 'epic',      name: '4TB NVMe Gen5',           icon: '▤', storage: { type: 'NVMe', sizeGB: 4000, speed: 7.0 }, dropWeight: 2 },

  // Legendary
  nvme_8tb:      { type: 'storage', rarity: 'legendary', name: '8TB NVMe Gen5 Pro',       icon: '▤', storage: { type: 'NVMe', sizeGB: 8000, speed: 9.0 }, dropWeight: 0.4 },

  // Mythic
  optane_dc:     { type: 'storage', rarity: 'mythic',    name: 'Intel Optane DC P5800X',  icon: '▤', storage: { type: 'NVMe', sizeGB: 1600, speed: 12.0 }, dropWeight: 0.05 },

  // ✧ Transcendent
  pm1743_30tb:   { type: 'storage', rarity: 'transcendent', name: 'Samsung PM1743 30.72TB',  icon: '✧', storage: { type: 'NVMe', sizeGB: 30720, speed: 15.0 }, dropWeight: 0.007 },
  ql_petascale:  { type: 'storage', rarity: 'transcendent', name: 'Quantum Photonic Array',   icon: '✧', storage: { type: 'NVMe', sizeGB: 1048576, speed: 18.0 }, dropWeight: 0.005 },
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

const DEFAULT_BUILDS = { active: 0, builds: [{ name: 'My Rig', main: true, parts: {}, artifacts: {} }] };

function refundEquippedPartsToInventory(parts) {
  for (const partId of Object.values(parts || {})) {
    if (partId && PARTS[partId]) addPart(partId);
  }
}

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

    // Ensure artifacts field exists on all builds
    for (const build of data.builds) {
      if (!build.artifacts) build.artifacts = {};
    }

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

// ─── Sell prices by rarity ───
// Slightly below "actual value" — selling is always a bit of a loss
// Contextual: common crate costs 200, wins earn ~100-150

const SELL_PRICES = {
  common:       15,
  uncommon:     35,
  rare:         80,
  epic:        180,
  legendary:   450,
  mythic:     1200,
  transcendent: 3000,
};

function getSellPrice(partId) {
  const part = PARTS[partId];
  if (!part) return 0;
  return SELL_PRICES[part.rarity] || 0;
}

// Check if a part is a seeded (initial hardware scan) part — these cannot be sold
function isSeededPart(partId) {
  const data = loadBuilds();
  return (data._seededParts || []).includes(partId);
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

function rollPartDrop(rng, opponentTier = 'mid', opts = {}) {
  const { maxRarity = 'transcendent', mythicBonus = 0 } = opts;
  const entries = Object.entries(PARTS);

  // Mythic bonus: flat per-fight chance for a guaranteed mythic part
  if (mythicBonus > 0 && rng.next() < mythicBonus) {
    const mythics = entries.filter(([, p]) => p.rarity === 'mythic');
    if (mythics.length > 0) {
      const pick = mythics[Math.floor(rng.next() * mythics.length)];
      return { id: pick[0], ...pick[1] };
    }
  }

  // Base chance to get ANY part at all
  const baseChance = { apex: 0.50, elite: 0.40, flagship: 0.35, high: 0.25, mid: 0.15, low: 0.08 };
  const chance = baseChance[opponentTier] || 0.15;

  if (rng.next() >= chance) return null; // no part drop

  // Weight-based selection from the catalog, filtered by max rarity
  const maxIdx = RARITY_ORDER.indexOf(maxRarity);
  const eligible = maxIdx >= 0
    ? entries.filter(([, p]) => RARITY_ORDER.indexOf(p.rarity) <= maxIdx)
    : entries;
  const totalWeight = eligible.reduce((s, [, p]) => s + p.dropWeight, 0);
  let roll = rng.next() * totalWeight;

  for (const [id, part] of eligible) {
    roll -= part.dropWeight;
    if (roll <= 0) {
      return { id, ...part };
    }
  }

  // Fallback: random common
  const commons = eligible.filter(([, p]) => p.rarity === 'common');
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
      const art = getPartArt(part.type);

      if (art) {
        const artStrings = formatArtForConsole(art.lines, art.colors);
        console.log(`${cyan}  │  ${artStrings[0]} ${bright}${part.name}${' '.repeat(Math.max(0, 39 - part.name.length))}${cyan}│${RESET}`);
        console.log(`${cyan}  │  ${artStrings[1]} ${tc}${TYPE_LABELS[part.type].padEnd(8)}${rc}x${part.count}  (${part.rarity})${' '.repeat(Math.max(0, 22 - part.rarity.length))}${cyan}│${RESET}`);
        console.log(`${cyan}  │  ${artStrings[2]}${' '.repeat(42)}${cyan}│${RESET}`);
      } else {
        const icon = RARITY_ICONS[part.rarity] || '·';
        console.log(`${cyan}  │  ${rc}${icon} ${bright}${part.name.padEnd(24)}${tc}${TYPE_LABELS[part.type].padEnd(8)}${rc}x${part.count}  (${part.rarity})${cyan.padEnd(1)}│${RESET}`);
      }
    }
  }

  console.log(`${cyan}  ╰──────────────────────────────────────────────────╯${RESET}`);
}

// ─── Hardware fingerprint & matching helpers ───

function extractModelNumbers(text) {
  return (text.match(/\d{3,5}[a-z]*/gi) || []).map(m => m.toLowerCase());
}

function hardwareFingerprint(specs) {
  return JSON.stringify({
    cpu: specs.cpu?.brand,
    gpu: specs.gpu?.model,
    ram: specs.ram?.totalGB,
    storType: specs.storage?.type,
    storSize: specs.storage?.sizeGB,
  });
}

// isScannedPart kept as alias for isSeededPart (defined below SELL_PRICES)
function isScannedPart(partId) {
  return isSeededPart(partId);
}

// ─── Seed / reconcile hardware → parts ───
// On first boot: matches real hardware to catalog, equips on main rig.
// On subsequent boots: skips if hardware unchanged.
// On hardware change: swaps in new matches, cleans up old scanned parts.

const SEED_VERSION = 3; // bump to force re-seed when matching logic changes

function seedPartsFromHardware(specs) {
  const data = loadBuilds();
  const mainBuild = data.builds[0];
  if (!mainBuild) return;

  const fp = hardwareFingerprint(specs);

  // Re-seed if matching algorithm was updated (version bump)
  if (data._seeded && (data._seedVersion || 0) < SEED_VERSION) {
    const oldSeeded = data._seededParts || [];
    // Remove old seeded parts from inventory and main rig
    for (const partId of oldSeeded) {
      removePart(partId);
    }
    if (mainBuild.main) {
      for (const [type, pid] of Object.entries(mainBuild.parts || {})) {
        if (oldSeeded.includes(pid)) delete mainBuild.parts[type];
      }
    }
    data._seeded = false;
    data._seededParts = [];
    data._hwFingerprint = null;
    saveBuilds(data);
  }

  // Same hardware AND already seeded with current version → nothing to do
  if (data._hwFingerprint === fp && data._seeded) return;

  const cpuBrand = (specs.cpu?.brand || '').toLowerCase();
  const gpuModel = (specs.gpu?.model || '').toLowerCase();
  const ramGB    = specs.ram?.totalGB || 0;
  const storType = specs.storage?.type || 'SSD';
  const storSize = specs.storage?.sizeGB || 500;

  const entries = Object.entries(PARTS);
  const cpuModelNums = extractModelNumbers(cpuBrand);
  const gpuModelNums = extractModelNumbers(gpuModel);

  // ── CPU matching ──
  let bestCpu = null, bestCpuScore = -Infinity;
  for (const [id, p] of entries.filter(([, p]) => p.type === 'cpu')) {
    const catalogBrand = p.cpu.brand.toLowerCase();
    const catalogNums  = extractModelNumbers(catalogBrand);
    let score = 0;

    // Manufacturer (check both brand string and dedicated manufacturer field)
    const mfg = (p.cpu.manufacturer || '').toLowerCase();
    const scannedMfg = (specs.cpu?.manufacturer || '').toLowerCase();
    if (mfg && (cpuBrand.includes(mfg) || scannedMfg === mfg)) score += 20;
    else if (mfg) score -= 30;

    // Model number (strongest signal)
    let hasModelMatch = false;
    for (const cn of catalogNums) {
      const cnDigits = cn.replace(/[a-z]/gi, '');
      for (const sn of cpuModelNums) {
        const snDigits = sn.replace(/[a-z]/gi, '');
        if (cn === sn)                                  { score += 200; hasModelMatch = true; }
        else if (cnDigits === snDigits && cnDigits.length >= 4) { score += 150; hasModelMatch = true; }
      }
    }

    // Family (ryzen / core / threadripper / xeon / epyc …)
    for (const fam of ['ryzen','core','threadripper','xeon','celeron','pentium','athlon','epyc']) {
      if (catalogBrand.includes(fam) && cpuBrand.includes(fam)) score += 30;
      else if (catalogBrand.includes(fam) !== cpuBrand.includes(fam)) score -= 15;
    }

    // Tier (i3/i5/i7/i9, Ryzen 3/5/7/9)
    for (const pat of [/\bi([3579])\b/i, /ryzen\s+([3579])/i]) {
      const ct = catalogBrand.match(pat);
      const st = cpuBrand.match(pat);
      if (ct && st) {
        if (ct[1] === st[1]) score += 40;
        else score -= Math.abs(parseInt(ct[1]) - parseInt(st[1])) * 10;
      }
    }

    // Core/speed tiebreaker (only when no model number matched)
    if (!hasModelMatch) {
      score -= Math.abs((p.cpu.cores || 4)    - (specs.cpu?.cores    || 4)) * 2;
      score -= Math.abs((p.cpu.speedMax || 3) - (specs.cpu?.speedMax || 3)) * 5;
    }

    if (score > bestCpuScore) { bestCpuScore = score; bestCpu = id; }
  }

  // ── GPU matching ──
  let bestGpu = null, bestGpuScore = -Infinity;
  for (const [id, p] of entries.filter(([, p]) => p.type === 'gpu')) {
    const catalogModel = p.gpu.model.toLowerCase();
    const catalogNums  = extractModelNumbers(catalogModel);
    let score = 0;

    // Vendor (check both model string and dedicated vendor field)
    const vendor = (p.gpu.vendor || '').toLowerCase();
    const scannedVendor = (specs.gpu?.vendor || '').toLowerCase();
    if (vendor && (gpuModel.includes(vendor) || scannedVendor === vendor)) score += 25;
    else if (vendor) score -= 40;

    // Series (rtx / gtx / rx / arc)
    for (const s of ['rtx','gtx','rx','arc']) {
      if (catalogModel.includes(s) && gpuModel.includes(s)) score += 30;
      else if (catalogModel.includes(s) !== gpuModel.includes(s)) score -= 15;
    }

    // Model number
    for (const cn of catalogNums) {
      const cnDigits = cn.replace(/[a-z]/gi, '');
      for (const sn of gpuModelNums) {
        const snDigits = sn.replace(/[a-z]/gi, '');
        if (cnDigits === snDigits && cnDigits.length >= 3) score += 200;
      }
    }

    // Suffix (xtx / xt / ti super / ti / super)
    for (const suf of ['xtx','xt','ti super','ti','super']) {
      const cHas = catalogModel.includes(suf);
      const sHas = gpuModel.includes(suf);
      if (cHas && sHas) { score += 20; break; }
      if (cHas !== sHas) { score -= 10; break; }
    }

    // VRAM tiebreaker
    score -= Math.abs((p.gpu.vramMB || 0) - (specs.gpu?.vramMB || 0)) / 1000;

    if (score > bestGpuScore) { bestGpuScore = score; bestGpu = id; }
  }

  // ── RAM matching ── closest GB
  let bestRam = null, bestRamDiff = Infinity;
  for (const [id, p] of entries.filter(([, p]) => p.type === 'ram')) {
    const diff = Math.abs((p.ram.totalGB || 8) - ramGB);
    if (diff < bestRamDiff) { bestRamDiff = diff; bestRam = id; }
  }

  // ── Storage matching ── type first, then size
  let bestStor = null, bestStorScore = -Infinity;
  for (const [id, p] of entries.filter(([, p]) => p.type === 'storage')) {
    const typeMatch = (p.storage.type || 'SSD') === storType ? 100 : 0;
    const sizeDiff  = Math.abs((p.storage.sizeGB || 500) - storSize);
    const score = typeMatch + 50 - (sizeDiff / 100);
    if (score > bestStorScore) { bestStorScore = score; bestStor = id; }
  }

  // ── Clean up old seeded parts from inventory ──
  const oldSeeded = data._seededParts || [];
  if (oldSeeded.length > 0) {
    const inv = loadParts();
    for (const oldId of oldSeeded) {
      if (inv[oldId] && inv[oldId] > 0) {
        inv[oldId]--;
        if (inv[oldId] <= 0) delete inv[oldId];
      }
    }
    saveParts(inv);
  }

  // Return any non-seeded parts on the main rig back to inventory
  const mainParts = mainBuild.parts || {};
  const oldSeededSet = new Set(oldSeeded);
  for (const type of ['cpu', 'gpu', 'ram', 'storage']) {
    const equipped = mainParts[type];
    if (equipped && PARTS[equipped] && !oldSeededSet.has(equipped)) {
      addPart(equipped);
    }
  }

  // Equip matched parts on main rig
  const matches = { cpu: bestCpu, gpu: bestGpu, ram: bestRam, storage: bestStor };
  const newScannedIds = [];
  mainBuild.parts = {};
  for (const type of ['cpu', 'gpu', 'ram', 'storage']) {
    if (matches[type]) {
      mainBuild.parts[type] = matches[type];
      newScannedIds.push(matches[type]);
    }
  }

  // Remove newly equipped parts from inventory (clean up migration leftovers)
  const inv = loadParts();
  for (const partId of newScannedIds) {
    if (inv[partId] && inv[partId] > 0) {
      inv[partId]--;
      if (inv[partId] <= 0) delete inv[partId];
    }
  }
  saveParts(inv);

  data._seeded = true;
  data._seedVersion = SEED_VERSION;
  data._hwFingerprint = fp;
  data._seededParts = newScannedIds; // track which parts came from the hardware scan
  saveBuilds(data);
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
  SELL_PRICES, getSellPrice, isSeededPart,
  rollPartDrop, printPartDrop, printOwnedParts,
  seedPartsFromHardware,
};
