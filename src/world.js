// ═══════════════════════════════════════════════════════════════
// WORLD — Procedural chunk-based world with biomes and structures
// Generates terrain, enemies, and shops on the fly.
// Everything is deterministic from a single world seed.
// ═══════════════════════════════════════════════════════════════

const { rgb, bgRgb } = require('./palette');
const { createRNG } = require('./rng');
const { getSprite } = require('./sprites');
const { buildStats, classifyArchetype } = require('./profiler');
const { ITEMS } = require('./items');

// ─── Constants ───
const CHUNK_SIZE = 32;
const MAX_CHUNKS = 64;
const ROAD_HALF = 1;                // road is 3 tiles wide (center ± 1)
const ORIGIN_SAFE_RADIUS = 35;      // Silicon Plains guaranteed near spawn
const ORIGIN_BLEND_RADIUS = 55;     // biome fade-in zone

// ═══════════════════════════════════════════════════════════════
// HASHING & NOISE
// ═══════════════════════════════════════════════════════════════

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h >> 13) ^ h) * 1274126177;
  h = ((h >> 16) ^ h);
  return Math.abs(h);
}

// Value noise with smoothstep interpolation — smooth biome regions
function smoothNoise(x, y, scale) {
  const gx = Math.floor(x / scale);
  const gy = Math.floor(y / scale);
  const fx = (x / scale) - gx;
  const fy = (y / scale) - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = (hash(gx, gy) & 0xFFFF) / 0xFFFF;
  const n10 = (hash(gx + 1, gy) & 0xFFFF) / 0xFFFF;
  const n01 = (hash(gx, gy + 1) & 0xFFFF) / 0xFFFF;
  const n11 = (hash(gx + 1, gy + 1) & 0xFFFF) / 0xFFFF;

  const top = n00 + (n10 - n00) * sx;
  const bot = n01 + (n11 - n01) * sx;
  return top + (bot - top) * sy;
}

// ═══════════════════════════════════════════════════════════════
// BIOME DEFINITIONS — 6 visually distinct biomes
// ═══════════════════════════════════════════════════════════════

const BIOMES = {
  silicon_plains: {
    name: 'Silicon Plains',
    grassChars:  [',', '.', "'", '`', ';', ':', '"', '∴', '·'],
    grassColors: [rgb(25, 60, 35), rgb(35, 85, 50), rgb(45, 100, 60), rgb(55, 120, 70), rgb(75, 150, 90)],
    grassLit:    rgb(75, 150, 90),
    groundChar:  '·',
    groundDim:   rgb(45, 55, 50),
    groundA:     rgb(18, 22, 20),
    groundB:     rgb(22, 28, 24),
    density: 0.38,
    enemyLabels: ['WANDERING PROCESS', 'STRAY DAEMON', 'IDLE THREAD', 'ORPHAN TASK'],
    shopNames:   ['Circuit Shack', 'Chip Shop', 'The Depot', 'Silicon Trader'],
  },
  voltage_marsh: {
    name: 'Voltage Marsh',
    grassChars:  ['~', '≈', '∿', '˜', '⌇', ';', ',', '·'],
    grassColors: [rgb(30, 80, 90), rgb(40, 110, 120), rgb(50, 140, 150), rgb(60, 170, 180), rgb(80, 200, 210)],
    grassLit:    rgb(80, 200, 210),
    groundChar:  '∘',
    groundDim:   rgb(35, 55, 60),
    groundA:     rgb(15, 25, 28),
    groundB:     rgb(20, 32, 35),
    density: 0.55,
    enemyLabels: ['LEAKING SOCKET', 'CORRUPT PACKET', 'FLOOD PING', 'ARP STORM'],
    shopNames:   ['Waterproof Wares', 'Marsh Trader', 'Wetware Exchange'],
  },
  thermal_desert: {
    name: 'Thermal Desert',
    grassChars:  ['·', '°', '∘', '˚', '.', ':', '∵'],
    grassColors: [rgb(100, 65, 30), rgb(130, 85, 40), rgb(160, 105, 50), rgb(190, 130, 60), rgb(220, 160, 80)],
    grassLit:    rgb(220, 160, 80),
    groundChar:  '.',
    groundDim:   rgb(60, 45, 30),
    groundA:     rgb(30, 22, 15),
    groundB:     rgb(35, 27, 18),
    density: 0.20,
    enemyLabels: ['THERMAL RUNAWAY', 'HEAT DEATH', 'BURNT REGISTER', 'CLOCK DRIFT'],
    shopNames:   ['Oasis Parts', 'Heat Sink Haven', 'Coolant Depot'],
  },
  frozen_cache: {
    name: 'Frozen Cache',
    grassChars:  ['*', '·', '∗', '⁺', '✦', ':', '⁂'],
    grassColors: [rgb(140, 170, 200), rgb(160, 190, 220), rgb(180, 210, 235), rgb(200, 225, 245), rgb(220, 240, 255)],
    grassLit:    rgb(220, 240, 255),
    groundChar:  '·',
    groundDim:   rgb(50, 55, 70),
    groundA:     rgb(20, 22, 28),
    groundB:     rgb(25, 28, 35),
    density: 0.30,
    enemyLabels: ['FROZEN PIPE', 'COLD BOOT', 'ICE LOCK', 'CACHE MISS'],
    shopNames:   ['Cold Storage', 'Cryo Shop', 'Frozen Assets'],
  },
  corrupted_sector: {
    name: 'Corrupted Sector',
    grassChars:  ['░', '▒', '▓', '■', '┃', '╎', '¦'],
    grassColors: [rgb(80, 30, 90), rgb(110, 40, 120), rgb(140, 55, 155), rgb(170, 70, 190), rgb(200, 100, 220)],
    grassLit:    rgb(200, 100, 220),
    groundChar:  '░',
    groundDim:   rgb(50, 35, 55),
    groundA:     rgb(22, 15, 25),
    groundB:     rgb(28, 18, 32),
    density: 0.35,
    enemyLabels: ['SEGFAULT GHOST', 'NULL POINTER', 'HEAP OVERFLOW', 'STACK SMASH'],
    shopNames:   ['Glitch Market', '0xDEAD Deals', 'Corrupt Vendor'],
  },
  data_thicket: {
    name: 'Data Thicket',
    grassChars:  ['♣', '↟', '│', '┃', '╿', '↑', '♠', '▌'],
    grassColors: [rgb(20, 70, 35), rgb(30, 95, 45), rgb(40, 115, 55), rgb(50, 140, 65), rgb(65, 170, 80)],
    grassLit:    rgb(65, 170, 80),
    groundChar:  '·',
    groundDim:   rgb(30, 45, 35),
    groundA:     rgb(12, 20, 15),
    groundB:     rgb(16, 25, 18),
    density: 0.65,
    enemyLabels: ['ROOT PROCESS', 'BRANCH GUARD', 'TREE WALKER', 'LEAF NODE'],
    shopNames:   ['Root Access', 'Branch Office', 'Canopy Cache'],
  },
};

// ─── Biome selection from noise ───

function getBiomeKey(wx, wy) {
  const dist = Math.sqrt(wx * wx + wy * wy);

  // Safe starting zone — always Silicon Plains
  if (dist < ORIGIN_SAFE_RADIUS) return 'silicon_plains';

  // Blend zone — fade toward real biome
  if (dist < ORIGIN_BLEND_RADIUS) {
    const blendChance = (ORIGIN_BLEND_RADIUS - dist) / (ORIGIN_BLEND_RADIUS - ORIGIN_SAFE_RADIUS);
    if ((hash(wx, wy) % 100) / 100 < blendChance) return 'silicon_plains';
  }

  // Two-axis noise → temperature + moisture → natural biome distribution
  const temp  = smoothNoise(wx, wy, 96);
  const moist = smoothNoise(wx + 50000, wy + 50000, 80);

  if (temp < 0.33) {
    return moist < 0.5 ? 'corrupted_sector' : 'frozen_cache';
  } else if (temp < 0.66) {
    return moist < 0.5 ? 'silicon_plains' : 'data_thicket';
  } else {
    return moist < 0.5 ? 'thermal_desert' : 'voltage_marsh';
  }
}

// ═══════════════════════════════════════════════════════════════
// ROADS — Four cardinal roads from origin
// ═══════════════════════════════════════════════════════════════

const ROAD_BG   = bgRgb(25, 24, 22);
const ROAD_MARK = rgb(55, 53, 48);

function isRoad(wx, wy) {
  if (Math.abs(wx) <= ROAD_HALF) return 'ns';
  if (Math.abs(wy) <= ROAD_HALF) return 'ew';
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ENEMY HARDWARE POOLS — 5 tiers by distance from origin
// ═══════════════════════════════════════════════════════════════

const ENEMY_TIERS = [
  { // Tier 0: near origin
    cpus: [
      { brand: 'Intel Celeron G5905', manufacturer: 'Intel', cores: 2, threads: 2, speed: 3.5, speedMax: 3.5 },
      { brand: 'AMD Athlon 3000G', manufacturer: 'AMD', cores: 2, threads: 4, speed: 3.5, speedMax: 3.5 },
    ],
    gpus: [
      { model: 'Intel UHD Graphics 610', vramMB: 512, vendor: 'Intel' },
      { model: 'AMD Radeon Vega 3', vramMB: 512, vendor: 'AMD' },
    ],
    ram: [4, 8], storage: ['HDD', 'SSD'],
  },
  { // Tier 1: weak
    cpus: [
      { brand: 'Intel Core i3-10100', manufacturer: 'Intel', cores: 4, threads: 8, speed: 3.6, speedMax: 4.3 },
      { brand: 'AMD Ryzen 3 3100', manufacturer: 'AMD', cores: 4, threads: 8, speed: 3.6, speedMax: 3.9 },
    ],
    gpus: [
      { model: 'NVIDIA GeForce GTX 1050 Ti', vramMB: 4096, vendor: 'NVIDIA' },
      { model: 'AMD Radeon RX 570', vramMB: 4096, vendor: 'AMD' },
    ],
    ram: [8, 16], storage: ['SSD'],
  },
  { // Tier 2: mid
    cpus: [
      { brand: 'Intel Core i5-12400', manufacturer: 'Intel', cores: 6, threads: 12, speed: 2.5, speedMax: 4.4 },
      { brand: 'AMD Ryzen 5 5600X', manufacturer: 'AMD', cores: 6, threads: 12, speed: 3.7, speedMax: 4.6 },
    ],
    gpus: [
      { model: 'NVIDIA GeForce RTX 3060', vramMB: 12288, vendor: 'NVIDIA' },
      { model: 'NVIDIA GeForce GTX 1660 Super', vramMB: 6144, vendor: 'NVIDIA' },
    ],
    ram: [16, 32], storage: ['SSD', 'NVMe'],
  },
  { // Tier 3: strong
    cpus: [
      { brand: 'Intel Core i7-13700K', manufacturer: 'Intel', cores: 16, threads: 24, speed: 3.4, speedMax: 5.4 },
      { brand: 'AMD Ryzen 7 7800X3D', manufacturer: 'AMD', cores: 8, threads: 16, speed: 4.2, speedMax: 5.0 },
    ],
    gpus: [
      { model: 'NVIDIA GeForce RTX 4070 Ti', vramMB: 12288, vendor: 'NVIDIA' },
      { model: 'NVIDIA GeForce RTX 3080', vramMB: 10240, vendor: 'NVIDIA' },
    ],
    ram: [32, 64], storage: ['NVMe'],
  },
  { // Tier 4: boss-level
    cpus: [
      { brand: 'AMD Ryzen 9 7950X', manufacturer: 'AMD', cores: 16, threads: 32, speed: 4.5, speedMax: 5.7 },
      { brand: 'Intel Core i9-14900K', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.2, speedMax: 5.8 },
    ],
    gpus: [
      { model: 'NVIDIA GeForce RTX 4080', vramMB: 16384, vendor: 'NVIDIA' },
      { model: 'NVIDIA GeForce RTX 4090', vramMB: 24576, vendor: 'NVIDIA' },
    ],
    ram: [64, 128], storage: ['NVMe'],
  },
];

function getTier(dist) {
  if (dist < 45)  return 0;
  if (dist < 90)  return 1;
  if (dist < 160) return 2;
  if (dist < 260) return 3;
  return 4;
}

// ═══════════════════════════════════════════════════════════════
// SHOP PRICING & TEMPLATES
// ═══════════════════════════════════════════════════════════════

const ITEM_PRICES = {
  common: 50, uncommon: 100, rare: 200, epic: 400, legendary: 800, mythic: 1500,
};

const STRUCT_FG     = rgb(160, 155, 140);
const STRUCT_ACCENT = rgb(200, 190, 170);
const NPC_COLOR     = rgb(130, 220, 235);
const SHOP_ICON_CLR = rgb(255, 215, 0);

// Shop building art — offsets from anchor (top-left of bounding box)
const SHOP_TILES = [
  // Roof
  { dx: 1, dy: 0, ch: '╭' }, { dx: 2, dy: 0, ch: '─' }, { dx: 3, dy: 0, ch: '─' },
  { dx: 4, dy: 0, ch: '─' }, { dx: 5, dy: 0, ch: '╮' },
  // Upper walls
  { dx: 1, dy: 1, ch: '│' }, { dx: 3, dy: 1, ch: '$', accent: true },
  { dx: 5, dy: 1, ch: '│' },
  // Lower walls
  { dx: 1, dy: 2, ch: '│' }, { dx: 5, dy: 2, ch: '│' },
  // Floor + door
  { dx: 1, dy: 3, ch: '╰' }, { dx: 2, dy: 3, ch: '─' }, { dx: 3, dy: 3, ch: '┬' },
  { dx: 4, dy: 3, ch: '─' }, { dx: 5, dy: 3, ch: '╯' },
];

const SHOP_NPC_DX = 3;
const SHOP_NPC_DY = 4;
const SHOP_INTERACT_RADIUS = 4;

// ═══════════════════════════════════════════════════════════════
// CHUNK GENERATION
// ═══════════════════════════════════════════════════════════════

function generateChunk(cx, cy, worldSeed) {
  const chunkSeed = hash(cx ^ worldSeed, cy ^ (worldSeed >>> 7));
  const rng = createRNG(chunkSeed);
  const baseX = cx * CHUNK_SIZE;
  const baseY = cy * CHUNK_SIZE;
  const centerX = baseX + CHUNK_SIZE / 2;
  const centerY = baseY + CHUNK_SIZE / 2;
  const dist = Math.sqrt(centerX * centerX + centerY * centerY);
  const biomeKey = getBiomeKey(centerX, centerY);
  const biome = BIOMES[biomeKey];

  // ─── Structures ───
  const structures = [];

  if (dist > 28) {
    const nearRoad = Math.abs(centerX) <= ROAD_HALF + 10 || Math.abs(centerY) <= ROAD_HALF + 10;
    const shopChance = nearRoad ? 0.22 : 0.07;

    if (rng.chance(shopChance)) {
      const sx = rng.int(3, CHUNK_SIZE - 9);
      const sy = rng.int(3, CHUNK_SIZE - 8);
      const shopWX = baseX + sx;
      const shopWY = baseY + sy;

      if (!isRoad(shopWX + 3, shopWY + 2)) {
        const shopRng = createRNG(hash(shopWX, shopWY));
        const tier = getTier(dist);
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const maxRIdx = Math.min(tier + 1, 4);
        const eligible = Object.entries(ITEMS)
          .filter(([, it]) => rarities.indexOf(it.rarity) <= maxRIdx);

        const numItems = shopRng.int(3, 6);
        const stock = [];
        const used = new Set();
        for (let i = 0; i < numItems && stock.length < numItems; i++) {
          const pick = shopRng.pick(eligible);
          if (pick && !used.has(pick[0])) {
            used.add(pick[0]);
            stock.push({
              id: pick[0], name: pick[1].name, desc: pick[1].desc,
              icon: pick[1].icon, rarity: pick[1].rarity,
              price: ITEM_PRICES[pick[1].rarity] || 50,
            });
          }
        }

        structures.push({
          type: 'shop',
          worldX: shopWX, worldY: shopWY,
          npcX: shopWX + SHOP_NPC_DX, npcY: shopWY + SHOP_NPC_DY,
          name: shopRng.pick(biome.shopNames),
          stock,
        });
      }
    }
  }

  // ─── Enemies ───
  const enemies = [];

  if (dist > 22) {
    const tier = getTier(dist);
    const pool = ENEMY_TIERS[tier];
    const count = rng.chance(0.55) ? (rng.chance(0.25) ? 2 : 1) : 0;

    for (let i = 0; i < count; i++) {
      const ex = rng.int(3, CHUNK_SIZE - 4);
      const ey = rng.int(3, CHUNK_SIZE - 4);
      const ewx = baseX + ex;
      const ewy = baseY + ey;

      if (isRoad(ewx, ewy)) continue;

      const cpu = rng.pick(pool.cpus);
      const gpu = rng.pick(pool.gpus);
      const ram = rng.pick(pool.ram);
      const storage = rng.pick(pool.storage);

      const specs = {
        cpu: { ...cpu }, ram: { totalGB: ram },
        gpu: { ...gpu }, storage: { type: storage },
      };

      const stats = buildStats(specs);
      const archetype = classifyArchetype(stats, specs);
      let sprite;
      try { sprite = getSprite(specs); } catch { sprite = null; }

      enemies.push({
        id: `enemy-${ewx}-${ewy}`,
        worldX: ewx, worldY: ewy,
        label: rng.pick(biome.enemyLabels),
        fighter: {
          id: `enemy-${ewx}-${ewy}`,
          name: cpu.brand.split(' ').pop(),
          gpu: gpu.model.replace('NVIDIA GeForce ', '').replace('AMD Radeon ', ''),
          stats: { ...stats }, specs, sprite, archetype,
        },
        icon: tier >= 3 ? '◆' : '◈',
        iconColor: tier >= 3 ? rgb(255, 200, 60) : rgb(240, 80, 80),
        tier,
        pulsePhase: rng.float(0, Math.PI * 2),
      });
    }
  }

  return { cx, cy, structures, enemies, biomeKey };
}

// ═══════════════════════════════════════════════════════════════
// WORLD CLASS — Manages chunks with LRU cache
// ═══════════════════════════════════════════════════════════════

class World {
  constructor(seed) {
    this.seed = seed;
    this.chunks = new Map();
    this.lru = [];
  }

  _key(cx, cy) { return `${cx},${cy}`; }

  getChunk(cx, cy) {
    const k = this._key(cx, cy);
    if (this.chunks.has(k)) {
      const idx = this.lru.indexOf(k);
      if (idx > -1) { this.lru.splice(idx, 1); this.lru.push(k); }
      return this.chunks.get(k);
    }
    const chunk = generateChunk(cx, cy, this.seed);
    this.chunks.set(k, chunk);
    this.lru.push(k);
    while (this.lru.length > MAX_CHUNKS) {
      this.chunks.delete(this.lru.shift());
    }
    return chunk;
  }

  // Per-tile lookups — fast, no chunk needed

  getBiome(wx, wy) { return BIOMES[getBiomeKey(wx, wy)]; }

  getGrass(wx, wy) {
    if (isRoad(wx, wy)) return null;
    const biome = this.getBiome(wx, wy);
    const h = hash(wx, wy);
    if ((h % 100) / 100 > biome.density) return null;
    return {
      char: biome.grassChars[(h >> 4) % biome.grassChars.length],
      color: biome.grassColors[(h >> 8) % biome.grassColors.length],
    };
  }

  getGround(wx, wy) {
    const road = isRoad(wx, wy);
    if (road) {
      const coord = road === 'ns' ? wy : wx;
      const onCenter = road === 'ns' ? wx === 0 : wy === 0;
      if (onCenter && Math.abs(coord) % 4 === 0 && coord !== 0) {
        return { char: '·', fg: ROAD_MARK, bg: ROAD_BG };
      }
      return { char: ' ', fg: null, bg: ROAD_BG };
    }
    const biome = this.getBiome(wx, wy);
    const chk = ((wx + wy) & 1) === 0;
    return {
      char: chk ? biome.groundChar : ' ',
      fg: chk ? biome.groundDim : null,
      bg: null,
    };
  }

  // Entity queries — iterate nearby chunks

  getActiveEnemies(camX, camY, viewW, viewH) {
    const out = [];
    const mnCX = Math.floor(camX / CHUNK_SIZE) - 1;
    const mxCX = Math.floor((camX + viewW) / CHUNK_SIZE) + 1;
    const mnCY = Math.floor(camY / CHUNK_SIZE) - 1;
    const mxCY = Math.floor((camY + viewH) / CHUNK_SIZE) + 1;
    for (let cy = mnCY; cy <= mxCY; cy++) {
      for (let cx = mnCX; cx <= mxCX; cx++) {
        const ch = this.getChunk(cx, cy);
        for (let i = 0; i < ch.enemies.length; i++) out.push(ch.enemies[i]);
      }
    }
    return out;
  }

  getActiveStructures(camX, camY, viewW, viewH) {
    const out = [];
    const mnCX = Math.floor(camX / CHUNK_SIZE) - 1;
    const mxCX = Math.floor((camX + viewW) / CHUNK_SIZE) + 1;
    const mnCY = Math.floor(camY / CHUNK_SIZE) - 1;
    const mxCY = Math.floor((camY + viewH) / CHUNK_SIZE) + 1;
    for (let cy = mnCY; cy <= mxCY; cy++) {
      for (let cx = mnCX; cx <= mxCX; cx++) {
        const ch = this.getChunk(cx, cy);
        for (let i = 0; i < ch.structures.length; i++) out.push(ch.structures[i]);
      }
    }
    return out;
  }
}

function createWorld(seed) {
  return new World(seed || Date.now());
}

module.exports = {
  createWorld, BIOMES, ITEM_PRICES, SHOP_TILES, SHOP_NPC_DX, SHOP_NPC_DY,
  SHOP_INTERACT_RADIUS, STRUCT_FG, STRUCT_ACCENT, NPC_COLOR, SHOP_ICON_CLR,
  ROAD_BG, ROAD_MARK, isRoad, getBiomeKey, hash, CHUNK_SIZE,
};
