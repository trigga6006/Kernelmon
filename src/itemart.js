// ═══════════════════════════════════════════════════════════════
// ITEM & PART ART — Small ASCII sprites for inventory/loot/battle
// Each art is 3 lines tall, 7 chars wide (padded to consistent width)
// ═══════════════════════════════════════════════════════════════

const { rgb } = require('./palette');

const ART_W = 7; // chars wide
const ART_H = 3; // lines tall

// ─── Bag Item Art ───

const ITEM_ART = {
  // ── Healing ──
  thermal_paste: [
    '┌──◆┐ ',
    '│▒▒▒│ ',
    '└──┬┘ ',
  ],
  arctic_silver: [
    '╔══◇╗ ',
    '║▓▓▓║ ',
    '╚══╧╝ ',
  ],
  liquid_metal: [
    '┌─◆─┐ ',
    '│◆▓◆│ ',
    '└─▼─┘ ',
  ],

  // ── Stat Boosts ──
  overclock_kit: [
    '┌─⚡─┐',
    '│▓█▓│ ',
    '└─⚡─┘',
  ],
  ram_stick: [
    '┃█░█░┃',
    '┃░█░█┃',
    '┗┻━┻━┛',
  ],
  nvme_cache: [
    '╔══»═╗',
    '║ »» ║',
    '╚════╝',
  ],
  gpu_bios_flash: [
    '╭─◇─╮ ',
    '│▒◆▒│ ',
    '╰─◇─╯ ',
  ],

  // ── Defensive ──
  firewall: [
    '╔═▣═╗ ',
    '║███║ ',
    '╚═▣═╝ ',
  ],
  driver_update: [
    '┌─↑↑─┐',
    '│ ↑↑ │',
    '└────┘',
  ],
  surge_protector: [
    '╔═⚡═╗',
    '║▓⚡▓║',
    '╚═══╝',
  ],

  // ── Offensive ──
  voltage_spike: [
    '  ╱╲  ',
    ' ╱★★╲ ',
    ' ╲▓▓╱ ',
  ],
  emp_charge: [
    ' ─╳─  ',
    ' ╳✦╳  ',
    ' ─╳─  ',
  ],
  zero_day_exploit: [
    '╔═★═╗ ',
    '║★✦★║ ',
    '╚═★═╝ ',
  ],

  // ── Special Attacks ──
  skyfall_payload: [
    '  ▼▼▼  ',
    ' ▓███▓ ',
    ' ░▓█▓░ ',
  ],
  darknet_collapse: [
    ' ╲ ● ╱',
    ' ─●●●─',
    ' ╱ ● ╲',
  ],
  phantom_protocol: [
    ' ┌╳╳╳┐',
    ' │◈▒◈│',
    ' └╳╳╳┘',
  ],
  botnet_typhoon: [
    ' ╭◎◎╮ ',
    ' │◎◎│ ',
    ' ╰◎◎╯ ',
  ],
  reactor_overflow: [
    ' ╔✹✹╗ ',
    ' ║✹█║ ',
    ' ╚✹✹╝ ',
  ],
};

// ─── Part Type Art ───

const PART_TYPE_ART = {
  cpu: [
    '┌┬┬┬┐ ',
    '│▓▓▓│ ',
    '└┴┴┴┘ ',
  ],
  gpu: [
    '╔══╦╗ ',
    '║▓▓║╣ ',
    '╚══╩╝ ',
  ],
  ram: [
    '┃█░█┃ ',
    '┃░█░┃ ',
    '┗┻┻┻┛ ',
  ],
  storage: [
    '╔════╗ ',
    '║▤▤▤▤║',
    '╚════╝ ',
  ],
};

// ─── Art color schemes per item category ───
// Returns [line0Color, line1Color, line2Color]

const ITEM_ART_COLORS = {
  // Healing — minty green
  thermal_paste:     () => [rgb(100, 200, 160), rgb(140, 230, 180), rgb(100, 200, 160)],
  arctic_silver:     () => [rgb(140, 190, 250), rgb(180, 220, 255), rgb(140, 190, 250)],
  liquid_metal:      () => [rgb(200, 170, 240), rgb(230, 200, 255), rgb(200, 170, 240)],

  // Boosts — warm amber / circuit green
  overclock_kit:     () => [rgb(240, 200, 100), rgb(255, 220, 140), rgb(240, 200, 100)],
  ram_stick:         () => [rgb(140, 230, 180), rgb(100, 200, 160), rgb(80, 160, 120)],
  nvme_cache:        () => [rgb(140, 190, 250), rgb(180, 220, 255), rgb(140, 190, 250)],
  gpu_bios_flash:    () => [rgb(200, 170, 240), rgb(230, 200, 255), rgb(200, 170, 240)],

  // Defensive — cool blue
  firewall:          () => [rgb(140, 190, 250), rgb(100, 160, 220), rgb(140, 190, 250)],
  driver_update:     () => [rgb(140, 230, 180), rgb(180, 240, 200), rgb(140, 230, 180)],
  surge_protector:   () => [rgb(240, 220, 140), rgb(200, 180, 100), rgb(240, 220, 140)],

  // Offensive — hot peach / rose
  voltage_spike:     () => [rgb(245, 180, 150), rgb(255, 200, 160), rgb(245, 180, 150)],
  emp_charge:        () => [rgb(240, 150, 170), rgb(255, 180, 190), rgb(240, 150, 170)],
  zero_day_exploit:  () => [rgb(240, 220, 140), rgb(255, 240, 160), rgb(240, 220, 140)],

  // Special — dramatic per-item
  skyfall_payload:   () => [rgb(120, 180, 255), rgb(180, 220, 255), rgb(100, 150, 220)],
  darknet_collapse:  () => [rgb(180, 100, 240), rgb(200, 120, 255), rgb(140, 60, 200)],
  phantom_protocol:  () => [rgb(255, 100, 255), rgb(200, 150, 255), rgb(160, 80, 200)],
  botnet_typhoon:    () => [rgb(100, 240, 255), rgb(140, 220, 255), rgb(80, 180, 220)],
  reactor_overflow:  () => [rgb(255, 220, 100), rgb(255, 240, 140), rgb(240, 180, 60)],
};

// ─── Transcendent Part Art (unique per part) ───

const TRANSCENDENT_PART_ART = {
  // GPUs
  blackwell_b200:  ['╔✧▓✧╗ ', '║◈██◈║', '╚✧▓✧╝ '],
  rubin_ultra:     ['╔═◈═╗ ', '║✦▓▓✦║', '╚═◈═╝ '],
  mi350x:          ['╔▓◈▓╗ ', '║█✦█║ ', '╚▓◈▓╝ '],
  falcon_shores:   ['╔⚡═⚡╗', '║◈▓◈║ ', '╚⚡═⚡╝'],
  // CPUs
  epyc_9965:       ['┌✧┬✧┐ ', '│◈▓◈│ ', '└✧┴✧┘ '],
  cerebras_wse3:   ['╔✧✧✧╗ ', '║✧◈✧║ ', '╚✧✧✧╝ '],
  m4_ultra_max:    ['┌─◈─┐ ', '│ ✧◈ │ ', '└─◈─┘ '],
  // RAM
  hbm4_stack:      ['┃✧║✧┃ ', '┃◈║◈┃ ', '┗✧╩✧┛ '],
  // Storage
  pm1743_30tb:     ['╔✧══╗ ', '║◈▤▤◈║', '╚══✧╝ '],
  ql_petascale:    ['╔·✧·╗ ', '║✧◈✧║ ', '╚·✧·╝ '],
};

// Part type colors
const PART_TYPE_ART_COLORS = {
  cpu: () => [rgb(245, 180, 150), rgb(255, 200, 160), rgb(245, 180, 150)],
  gpu: () => [rgb(200, 170, 240), rgb(230, 200, 255), rgb(200, 170, 240)],
  ram: () => [rgb(140, 230, 180), rgb(180, 240, 200), rgb(140, 230, 180)],
  storage: () => [rgb(140, 190, 250), rgb(180, 220, 255), rgb(140, 190, 250)],
};

// ─── Render helpers ───

// Draw art to a Screen buffer at (x, y)
function drawArt(screen, x, y, artLines, artColors) {
  for (let i = 0; i < artLines.length; i++) {
    const line = artLines[i];
    const color = artColors ? artColors[i] : null;
    screen.text(x, y + i, line, color);
  }
}

// Get art + colors for an item ID
function getItemArt(itemId) {
  const art = ITEM_ART[itemId];
  const colorFn = ITEM_ART_COLORS[itemId];
  if (!art) return null;
  return { lines: art, colors: colorFn ? colorFn() : null };
}

// Get art + colors for a part (checks for Transcendent-specific art first)
function getPartArt(partType, partId) {
  // Transcendent parts get unique art with cycling magenta/gold colors
  if (partId && TRANSCENDENT_PART_ART[partId]) {
    const art = TRANSCENDENT_PART_ART[partId];
    const mag = rgb(200, 120, 255);
    const gold = rgb(255, 215, 0);
    const bright = rgb(255, 180, 255);
    return { lines: art, colors: [mag, bright, gold] };
  }
  const art = PART_TYPE_ART[partType];
  const colorFn = PART_TYPE_ART_COLORS[partType];
  if (!art) return null;
  return { lines: art, colors: colorFn ? colorFn() : null };
}

// Format art lines for console.log (returns array of ANSI-colored strings)
function formatArtForConsole(artLines, artColors) {
  const RESET = '\x1b[0m';
  return artLines.map((line, i) => {
    const color = artColors ? artColors[i] : '';
    return `${color}${line}${RESET}`;
  });
}

module.exports = {
  ITEM_ART, PART_TYPE_ART, TRANSCENDENT_PART_ART,
  ITEM_ART_COLORS, PART_TYPE_ART_COLORS,
  ART_W, ART_H,
  drawArt, getItemArt, getPartArt, formatArtForConsole,
};
