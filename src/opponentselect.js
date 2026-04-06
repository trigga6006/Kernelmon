// ═══════════════════════════════════════════════════════════════
// OPPONENT SELECT — Pick your demo battle opponent
// Screen-based picker with animated sprite previews
// ═══════════════════════════════════════════════════════════════

const { colors, rgb } = require('./palette');
const { getSprite } = require('./sprites');
const { classifyArchetype } = require('./profiler');
const { createRNG } = require('./rng');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

const DIM    = rgb(100, 100, 130);
const DIMMER = rgb(70, 70, 95);
const BRIGHT = rgb(230, 230, 245);
const LABEL  = rgb(130, 220, 235);
const GOLD   = rgb(255, 215, 0);
const ROSE   = rgb(240, 150, 170);

// ─── Opponent definitions ───

const OPPONENTS = [
  {
    key: 'chromebook',
    label: 'CHROMEBOOK',
    desc: 'A humble Chromebook. Budget hardware, big heart.',
    specs: {
      cpu: { brand: 'Intel Celeron N4020', manufacturer: 'Intel', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 },
      ram: { totalGB: 4 },
      gpu: { model: 'Intel UHD Graphics 600', vramMB: 0, vendor: 'Intel' },
      storage: { type: 'eMMC' },
    },
    stats: { str: 22, vit: 25, mag: 15, spd: 20, def: 22, hp: 700, maxHp: 700 },
    id: 'mock-chromebook-001',
    name: 'Celeron N4020',
    gpu: 'Intel UHD 600',
    iconColor: DIM,
  },
  {
    key: 'god_machine',
    label: 'GOD MACHINE',
    desc: 'Absolute overkill. Threadripper + H100 + 1TB RAM.',
    specs: {
      cpu: { brand: 'AMD Threadripper PRO 7995WX', manufacturer: 'AMD', cores: 96, threads: 192, speed: 5.1, speedMax: 5.1 },
      ram: { totalGB: 1024 },
      gpu: { model: 'NVIDIA H100 80GB', vramMB: 81920, vendor: 'NVIDIA' },
      storage: { type: 'NVMe', sizeGB: 8000, name: 'Optane DC P5800X' },
    },
    stats: { str: 100, vit: 100, mag: 100, spd: 92, def: 96, hp: 1600, maxHp: 1600 },
    id: 'mock-godmachine-001',
    name: 'TR PRO 7995WX',
    gpu: 'NVIDIA H100 80GB',
    iconColor: GOLD,
  },
];

const RANDOM_TEST_NAMES = [
  'NULLBYTE',
  'PATCHWERK',
  'HEXWISP',
  'STACKVOID',
  'BYTEHOWL',
  'CLOCKFANG',
  'ROOTSPARK',
  'MALWARE',
  'ZEROHEX',
  'GLITCHRIG',
];

const RANDOM_CPU_POOL = [
  { brand: 'AMD Ryzen 5 5600X', manufacturer: 'AMD', cores: 6, threads: 12, speed: 3.7, speedMax: 4.6 },
  { brand: 'AMD Ryzen 7 7800X3D', manufacturer: 'AMD', cores: 8, threads: 16, speed: 4.2, speedMax: 5.0 },
  { brand: 'AMD Threadripper PRO 7975WX', manufacturer: 'AMD', cores: 32, threads: 64, speed: 4.0, speedMax: 5.3 },
  { brand: 'Intel Core i5-13600K', manufacturer: 'Intel', cores: 14, threads: 20, speed: 3.5, speedMax: 5.1 },
  { brand: 'Intel Core i7-14700K', manufacturer: 'Intel', cores: 20, threads: 28, speed: 3.4, speedMax: 5.6 },
  { brand: 'Intel Core i9-14900KS', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.2, speedMax: 6.2 },
  { brand: 'Intel Celeron N4020', manufacturer: 'Intel', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 },
  { brand: 'Apple M2 Pro', manufacturer: 'Apple', cores: 10, threads: 10, speed: 3.5, speedMax: 3.5 },
];

const RANDOM_GPU_POOL = [
  { model: 'Intel UHD Graphics 600', vendor: 'Intel', vramMB: 0 },
  { model: 'Intel Arc A580', vendor: 'Intel', vramMB: 8192 },
  { model: 'AMD Radeon RX 6600 XT', vendor: 'AMD', vramMB: 8192 },
  { model: 'AMD Radeon RX 7900 XTX', vendor: 'AMD', vramMB: 24576 },
  { model: 'NVIDIA GeForce RTX 3060', vendor: 'NVIDIA', vramMB: 12288 },
  { model: 'NVIDIA GeForce RTX 4080 SUPER', vendor: 'NVIDIA', vramMB: 16384 },
  { model: 'NVIDIA GeForce RTX 5090', vendor: 'NVIDIA', vramMB: 32768 },
  { model: 'Apple M2 Pro GPU', vendor: 'Apple', vramMB: 0 },
];

const RANDOM_STORAGE_POOL = [
  { type: 'HDD', sizeGB: 1000, name: 'Barracuda 1TB' },
  { type: 'SSD', sizeGB: 1000, name: '870 EVO 1TB' },
  { type: 'NVMe', sizeGB: 2000, name: '980 PRO 2TB' },
  { type: 'NVMe', sizeGB: 4000, name: 'SN850X 4TB' },
  { type: 'eMMC', sizeGB: 64, name: 'Embedded 64GB' },
];

const RANDOM_RAM_POOL = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

function trimLabel(text, max = 22) {
  if (!text) return 'UNKNOWN';
  return text.length > max ? text.slice(0, max - 1) : text;
}

function buildRandomCardBattleSpecs(rng) {
  return {
    cpu: { ...rng.pick(RANDOM_CPU_POOL) },
    ram: { totalGB: rng.pick(RANDOM_RAM_POOL) },
    gpu: { ...rng.pick(RANDOM_GPU_POOL) },
    storage: { ...rng.pick(RANDOM_STORAGE_POOL) },
    isLaptop: rng.chance(0.25),
  };
}

function buildRandomCardBattleStats(rng) {
  const str = rng.int(20, 100);
  const vit = rng.int(20, 100);
  const mag = rng.int(20, 100);
  const spd = rng.int(20, 100);
  const def = rng.int(20, 100);
  const hp = 400 + vit * 12;
  return { str, vit, mag, spd, def, hp, maxHp: hp };
}

function randomOpponentColor(stats) {
  const avg = (stats.str + stats.mag + stats.spd + stats.def) / 4;
  if (avg >= 80) return GOLD;
  if (avg >= 60) return LABEL;
  if (avg >= 40) return BRIGHT;
  return ROSE;
}

function buildRandomCardBattleOpponent(seed = Date.now()) {
  const rng = createRNG(seed | 0);
  const specs = buildRandomCardBattleSpecs(rng);
  const stats = buildRandomCardBattleStats(rng);
  const sprite = getSprite(specs);
  const archetype = classifyArchetype(stats, specs);
  const tag = `${rng.pick(RANDOM_TEST_NAMES)}-${rng.int(100, 999)}`;

  return {
    id: `mock-random-${seed}`,
    key: 'random_test_fighter',
    label: 'RANDOM FIGHTER',
    desc: 'Fresh test opponent with randomized stats, hardware, and loadout.',
    name: tag,
    gpu: trimLabel(specs.gpu.model, 28),
    specs,
    stats,
    sprite,
    archetype,
    iconColor: randomOpponentColor(stats),
  };
}

// Build full fighter objects from definitions (cached)
function buildOpponent(def) {
  const sprite = getSprite(def.specs);
  const archetype = classifyArchetype(def.stats, def.specs);
  return {
    id: def.id,
    name: def.name,
    gpu: def.gpu,
    stats: { ...def.stats },
    specs: def.specs,
    sprite,
    archetype,
  };
}

function selectRandomCardBattleOpponent(screen) {
  return new Promise((resolve) => {
    let frame = 0;
    let rollSeed = Date.now();
    let opponent = buildRandomCardBattleOpponent(rollSeed);

    function reroll() {
      rollSeed += 1;
      opponent = buildRandomCardBattleOpponent(rollSeed);
    }

    function render() {
      const W = screen.width;
      const H = screen.height;
      const listX = 3;
      const cardY = Math.max(2, Math.floor(H / 2) - 5);
      const spriteX = Math.max(W - 22, 45);
      const st = opponent.stats;
      const archName = opponent.archetype?.name || '???';

      screen.clear();

      screen.hline(1, 0, W - 2, '─', DIM);
      screen.set(0, 0, '╭', DIM);
      screen.set(W - 1, 0, '╮', DIM);
      screen.text(3, 0, ' CARD BATTLE TEST OPPONENT ', LABEL);

      for (let y = 1; y < H - 1; y++) {
        screen.set(0, y, '│', DIM);
        screen.set(W - 1, y, '│', DIM);
      }

      screen.set(0, H - 1, '╰', DIM);
      screen.hline(1, H - 1, W - 2, '─', DIM);
      screen.set(W - 1, H - 1, '╯', DIM);
      screen.text(4, H - 1, ' ENTER Fight ', DIMMER);
      screen.text(19, H - 1, ' SPACE Reroll ', DIMMER);
      screen.text(35, H - 1, ' ESC Back ', DIMMER);

      screen.text(listX, cardY, '▶', opponent.iconColor);
      screen.text(listX + 2, cardY, opponent.label, BRIGHT, null, true);
      screen.text(listX + 2 + opponent.label.length + 2, cardY, archName, opponent.iconColor);

      screen.text(listX + 3, cardY + 1, opponent.name, opponent.iconColor, null, true);
      screen.text(listX + 3, cardY + 2, opponent.desc.slice(0, W - listX - 8), DIMMER);

      const hwLine = `${trimLabel(opponent.specs.cpu.brand, 20)} · ${trimLabel(opponent.gpu, 18)} · ${opponent.specs.ram.totalGB}GB · ${opponent.specs.storage.type}`;
      screen.text(listX + 3, cardY + 3, hwLine.slice(0, W - listX - 8), DIMMER);

      const statLine = `HP:${st.hp}  STR:${st.str}  MAG:${st.mag}  SPD:${st.spd}  DEF:${st.def}`;
      screen.text(listX + 3, cardY + 4, statLine, LABEL);

      const barX = listX + 3;
      const barW = 12;
      screen.text(barX, cardY + 6, 'STR', DIMMER);
      screen.bar(barX + 4, cardY + 6, barW, st.str / 100, opponent.iconColor, DIMMER);
      screen.text(barX + 17, cardY + 6, 'MAG', DIMMER);
      screen.bar(barX + 21, cardY + 6, barW, st.mag / 100, opponent.iconColor, DIMMER);
      screen.text(barX, cardY + 7, 'SPD', DIMMER);
      screen.bar(barX + 4, cardY + 7, barW, st.spd / 100, opponent.iconColor, DIMMER);
      screen.text(barX + 17, cardY + 7, 'DEF', DIMMER);
      screen.bar(barX + 21, cardY + 7, barW, st.def / 100, opponent.iconColor, DIMMER);

      if (spriteX + 14 < W) {
        screen.text(spriteX, cardY - 1, 'PREVIEW', DIMMER);
        screen.hline(spriteX + 8, cardY - 1, 10, '─', DIMMER);
        opponent.sprite.front.draw(screen, spriteX, cardY, null, frame);
      }

      screen.render();
    }

    const interval = setInterval(() => {
      frame++;
      render();
    }, FRAME_MS);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function onKey(key) {
      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(opponent);
      } else if (key === ' ') {
        reroll();
      } else if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve(null);
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      clearInterval(interval);
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

// ─── Selection screen ───

function selectOpponent(screen) {
  return new Promise((resolve) => {
    let cursor = 0;
    let frame = 0;

    // Pre-build sprites for preview
    const sprites = OPPONENTS.map(o => getSprite(o.specs));
    const archetypes = OPPONENTS.map(o => classifyArchetype(o.stats, o.specs));

    const W = screen.width;
    const H = screen.height;

    function render() {
      screen.clear();

      // Title bar
      screen.hline(1, 0, W - 2, '─', DIM);
      screen.set(0, 0, '╭', DIM);
      screen.set(W - 1, 0, '╮', DIM);
      screen.text(3, 0, ' SELECT OPPONENT ', LABEL);

      // Side borders
      for (let y = 1; y < H - 1; y++) {
        screen.set(0, y, '│', DIM);
        screen.set(W - 1, y, '│', DIM);
      }

      // Bottom border
      screen.set(0, H - 1, '╰', DIM);
      screen.hline(1, H - 1, W - 2, '─', DIM);
      screen.set(W - 1, H - 1, '╯', DIM);
      screen.text(4, H - 1, ' ↑↓ Select ', DIM);
      screen.text(17, H - 1, ' ENTER Fight ', DIMMER);
      screen.text(32, H - 1, ' ESC Back ', DIMMER);

      // Draw opponent cards
      const cardH = Math.max(6, Math.floor((H - 4) / OPPONENTS.length));
      const listX = 3;
      const spriteX = Math.max(W - 22, 45);

      for (let i = 0; i < OPPONENTS.length; i++) {
        const opp = OPPONENTS[i];
        const st = opp.stats;
        const arch = archetypes[i];
        const y = 2 + i * cardH;
        const selected = i === cursor;

        // Selection indicator
        screen.text(listX, y, selected ? '►' : ' ', selected ? opp.iconColor : DIM);

        // Name
        screen.text(listX + 2, y, opp.label, selected ? BRIGHT : DIM, null, selected);

        // Archetype
        const archName = arch?.name || '???';
        screen.text(listX + 2 + opp.label.length + 2, y, archName, selected ? opp.iconColor : DIMMER);

        // Description
        screen.text(listX + 3, y + 1, opp.desc.slice(0, W - listX - 6), selected ? DIM : DIMMER);

        // Hardware summary
        const hwLine = `${opp.specs.cpu.brand.slice(0, 20)} · ${opp.gpu.slice(0, 18)} · ${opp.specs.ram.totalGB}GB · ${opp.specs.storage.type}`;
        screen.text(listX + 3, y + 2, hwLine.slice(0, W - listX - 6), DIMMER);

        // Stats bar
        const statLine = `HP:${st.hp}  STR:${st.str}  MAG:${st.mag}  SPD:${st.spd}  DEF:${st.def}`;
        screen.text(listX + 3, y + 3, statLine, selected ? LABEL : DIMMER);

        // Stat bars for selected
        if (selected && y + 4 < H - 2) {
          const barX = listX + 3;
          const barW = 12;
          screen.text(barX, y + 4, 'STR', DIMMER);
          screen.bar(barX + 4, y + 4, barW, st.str / 100, opp.iconColor, DIMMER);
          screen.text(barX + 17, y + 4, 'MAG', DIMMER);
          screen.bar(barX + 21, y + 4, barW, st.mag / 100, opp.iconColor, DIMMER);
        }
      }

      // Animated sprite preview of selected opponent
      if (spriteX + 14 < W) {
        const previewY = 3;
        screen.text(spriteX, previewY - 1, 'PREVIEW', DIMMER);
        screen.hline(spriteX + 8, previewY - 1, 10, '─', DIMMER);
        sprites[cursor].front.draw(screen, spriteX, previewY, null, frame);
      }

      screen.render();
    }

    const interval = setInterval(() => {
      frame++;
      render();
    }, FRAME_MS);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k') {
        // Up
        cursor = (cursor - 1 + OPPONENTS.length) % OPPONENTS.length;
      } else if (key === '\x1b[B' || key === 'j') {
        // Down
        cursor = (cursor + 1) % OPPONENTS.length;
      } else if (key === '\r' || key === '\n') {
        // Confirm
        cleanup();
        resolve(buildOpponent(OPPONENTS[cursor]));
      } else if (key === '\x1b' || key === 'q') {
        // Cancel
        cleanup();
        resolve(null);
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      clearInterval(interval);
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

module.exports = {
  selectOpponent,
  selectRandomCardBattleOpponent,
  buildRandomCardBattleOpponent,
  OPPONENTS,
  buildOpponent,
};
