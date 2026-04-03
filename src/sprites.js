// ═══════════════════════════════════════════════════════════════════
// SPRITE CATALOG — Component-Assembly System
// Each fighter is built from 4 hardware-driven body parts:
//   HEAD  → CPU family  (Ryzen angular / Intel geometric / Apple smooth)
//   TORSO → Overall tier (flagship massive / high solid / mid compact / low tiny)
//   ARM   → GPU model   (THE showpiece — cannon, blade, pod, stub)
//   LEGS  → Storage type (NVMe thrusters / SSD stable / HDD clunky)
// Brand color themes are applied across ALL components.
// ═══════════════════════════════════════════════════════════════════

const { rgb, colors } = require('./palette');

// ─────────────────────────────────────────────
// §1  BRAND COLOR THEMES  (kept from previous)
// ─────────────────────────────────────────────

function makeTheme(o) {
  return {
    frame:    rgb(150, 158, 185),   frameDk:  rgb(95, 100, 128),
    frameLt:  rgb(185, 192, 215),   accent:   rgb(130, 220, 235),
    accentDk: rgb(80, 160, 180),    core:     rgb(100, 210, 230),
    coreDk:   rgb(55, 140, 165),    vent:     rgb(65, 70, 95),
    eye:      rgb(230, 215, 140),   eyeOff:   rgb(75, 75, 95),
    leg:      rgb(85, 90, 108),     shadow:   rgb(38, 38, 52),
    ...o,
  };
}

const THEMES = {
  nvidia_fe: makeTheme({
    frame: rgb(175, 180, 198), frameDk: rgb(120, 125, 145), frameLt: rgb(210, 215, 230),
    accent: rgb(118, 185, 0), accentDk: rgb(76, 135, 0),
    core: rgb(118, 200, 20), coreDk: rgb(70, 140, 10), eye: rgb(118, 200, 20),
  }),
  asus_rog: makeTheme({
    frame: rgb(65, 65, 82), frameDk: rgb(40, 40, 55), frameLt: rgb(95, 95, 115),
    accent: rgb(220, 45, 45), accentDk: rgb(155, 25, 25),
    core: rgb(235, 55, 55), coreDk: rgb(160, 30, 30), eye: rgb(235, 55, 55),
  }),
  msi: makeTheme({
    frame: rgb(75, 75, 92), frameDk: rgb(48, 48, 62), frameLt: rgb(108, 108, 125),
    accent: rgb(210, 40, 40), accentDk: rgb(150, 20, 20),
    core: rgb(240, 80, 30), coreDk: rgb(170, 50, 15), eye: rgb(240, 80, 30),
  }),
  evga: makeTheme({
    frame: rgb(88, 92, 108), frameDk: rgb(58, 62, 78), frameLt: rgb(125, 130, 148),
    accent: rgb(0, 200, 80), accentDk: rgb(0, 140, 55),
    core: rgb(0, 220, 90), coreDk: rgb(0, 150, 60), eye: rgb(0, 220, 90),
  }),
  gigabyte: makeTheme({
    frame: rgb(55, 65, 105), frameDk: rgb(35, 42, 72), frameLt: rgb(80, 92, 138),
    accent: rgb(240, 150, 30), accentDk: rgb(180, 105, 15),
    core: rgb(245, 160, 40), coreDk: rgb(180, 110, 20), eye: rgb(245, 160, 40),
  }),
  amd_ref: makeTheme({
    frame: rgb(62, 62, 75), frameDk: rgb(40, 40, 52), frameLt: rgb(90, 90, 108),
    accent: rgb(200, 30, 30), accentDk: rgb(140, 15, 15),
    core: rgb(220, 40, 40), coreDk: rgb(150, 20, 20), eye: rgb(220, 40, 40),
  }),
  sapphire: makeTheme({
    frame: rgb(70, 100, 168), frameDk: rgb(45, 65, 118), frameLt: rgb(100, 135, 200),
    accent: rgb(80, 145, 230), accentDk: rgb(50, 100, 175),
    core: rgb(90, 160, 245), coreDk: rgb(55, 110, 185), eye: rgb(90, 160, 245),
  }),
  powercolor: makeTheme({
    frame: rgb(48, 42, 52), frameDk: rgb(30, 25, 35), frameLt: rgb(72, 65, 78),
    accent: rgb(190, 20, 20), accentDk: rgb(130, 10, 10),
    core: rgb(210, 25, 25), coreDk: rgb(140, 12, 12), eye: rgb(210, 25, 25),
  }),
  intel_arc: makeTheme({
    frame: rgb(50, 95, 185), frameDk: rgb(30, 62, 135), frameLt: rgb(75, 125, 218),
    accent: rgb(220, 225, 240), accentDk: rgb(160, 165, 180),
    core: rgb(60, 140, 245), coreDk: rgb(35, 95, 185), eye: rgb(60, 140, 245),
  }),
  apple: makeTheme({
    frame: rgb(185, 188, 198), frameDk: rgb(145, 148, 158), frameLt: rgb(215, 218, 228),
    accent: rgb(225, 228, 238), accentDk: rgb(175, 178, 188),
    core: rgb(230, 232, 242), coreDk: rgb(180, 182, 192),
    eye: rgb(230, 232, 242), vent: rgb(155, 158, 168),
  }),
  generic: makeTheme({
    frame: rgb(105, 108, 125), frameDk: rgb(72, 75, 90), frameLt: rgb(138, 142, 158),
    accent: rgb(130, 135, 155), accentDk: rgb(90, 95, 112),
    core: rgb(140, 145, 165), coreDk: rgb(95, 100, 118), eye: rgb(140, 145, 165),
  }),
};

// ─────────────────────────────────────────────
// §2  HARDWARE DETECTION (expanded)
// ─────────────────────────────────────────────

const GPU_TIERS = {
  flagship: ['5090','4090','3090','titan','7900 xtx','7900xtx','radeon vii','rx 9070 xtx','9070 xtx'],
  high:     ['5080','4080','3080','2080 ti','2080ti','7900 xt','7900xt','7800 xt','7800xt','6900 xt','6900xt','6800 xt','6800xt','rx 9070','arc a770'],
  mid:      ['5070','4070','3070','3060 ti','3060ti','2070','2060','7700 xt','7700xt','7600','6700 xt','6700xt','6600 xt','6600xt','arc a750','arc a580','1080 ti','1080ti','1080'],
};

const BRAND_PATTERNS = [
  { brand: 'asus_rog',   patterns: ['rog','asus','strix','tuf'] },
  { brand: 'msi',        patterns: ['msi','gaming x','gaming z','suprim','ventus'] },
  { brand: 'evga',       patterns: ['evga','ftw','xc3','kingpin'] },
  { brand: 'gigabyte',   patterns: ['gigabyte','aorus','eagle','gaming oc','windforce'] },
  { brand: 'sapphire',   patterns: ['sapphire','pulse','nitro'] },
  { brand: 'powercolor', patterns: ['powercolor','red devil','red dragon','hellhound'] },
];

// GPU family determines the ARM/WEAPON component
function classifyGPU(model) {
  const m = model.toLowerCase();
  if (/50[89]0/.test(m) || /4090/.test(m) || /titan/i.test(m))    return 'nvidia_flagship';
  if (/40[78]0|3080|5070 ti/.test(m))                              return 'nvidia_high';
  if (/40[67]0|30[67]0|20[67]0|10[78]0/.test(m))                  return 'nvidia_mid';
  if (/7900\s*xtx|9070\s*xtx/i.test(m))                           return 'amd_flagship';
  if (/7[89]00\s*xt|6[89]00\s*xt|9070(?!\s*xtx)/i.test(m))       return 'amd_high';
  if (/7[67]00|6[67]00/i.test(m))                                  return 'amd_mid';
  if (/arc\s*a[0-9]/i.test(m))                                     return 'intel_arc';
  if (/apple|m[1-4]/i.test(m))                                     return 'apple';
  return 'integrated';
}

// CPU family determines the HEAD component
function classifyCPU(brand) {
  const b = brand.toLowerCase();
  if (/ryzen\s*(9|7)/i.test(b))                                    return 'ryzen_high';
  if (/ryzen\s*(5|3)/i.test(b))                                    return 'ryzen_mid';
  if (/i[97]-|core.*(i9|i7|ultra\s*9|ultra\s*7)/i.test(b))        return 'intel_high';
  if (/i[53]-|core.*(i5|i3|ultra\s*5)/i.test(b))                  return 'intel_mid';
  if (/m[1-4]\s*(max|ultra|pro)/i.test(b) || /apple/i.test(b))    return 'apple';
  if (/celeron|pentium|atom|n[0-9]{4}/i.test(b))                   return 'celeron';
  return 'generic';
}

function identifyHardware(specs) {
  const model = (specs.gpu?.model || '').toLowerCase();
  const vendor = (specs.gpu?.vendor || '').toLowerCase();
  const vram = specs.gpu?.vramMB || 0;

  let tier = 'low';
  for (const [t, keywords] of Object.entries(GPU_TIERS)) {
    if (keywords.some(kw => model.includes(kw))) { tier = t; break; }
  }
  if (tier === 'low' && vram > 0) {
    if (vram >= 16000) tier = 'flagship';
    else if (vram >= 8000) tier = 'high';
    else if (vram >= 4000) tier = 'mid';
  }

  let brand = 'generic';
  if (model.includes('apple') || model.includes('m1') || model.includes('m2') || model.includes('m3') || model.includes('m4') || vendor.includes('apple')) {
    brand = 'apple';
  } else if ((model.includes('uhd') || model.includes('iris') || model.includes('hd graphics')) && !model.includes('arc')) {
    brand = 'generic'; tier = 'low';
  } else if (model.includes('arc') && (vendor.includes('intel') || model.includes('intel'))) {
    brand = 'intel_arc';
  } else {
    let foundAIB = false;
    for (const { brand: b, patterns } of BRAND_PATTERNS) {
      if (patterns.some(p => model.includes(p))) { brand = b; foundAIB = true; break; }
    }
    if (!foundAIB) {
      if (vendor.includes('nvidia') || model.includes('nvidia') || model.includes('geforce') || model.includes('rtx') || model.includes('gtx')) brand = 'nvidia_fe';
      else if (vendor.includes('amd') || vendor.includes('advanced micro') || model.includes('radeon') || model.includes('amd')) brand = 'amd_ref';
    }
  }

  const gpuFamily = classifyGPU(specs.gpu?.model || '');
  const cpuFamily = classifyCPU(specs.cpu?.brand || '');
  const storage = specs.storage?.type || 'SSD';

  return { tier, brand, gpuFamily, cpuFamily, storage };
}

// ═══════════════════════════════════════════════════════════════
// §3  BACK VIEW COMPONENTS (player — bottom-left, larger)
// ═══════════════════════════════════════════════════════════════
// Coordinate system: ox,oy is top-left of bounding box.
// Torso occupies cols 2-11, rows 2-8.
// GPU arm extends RIGHT from col 12+.
// Head occupies cols 3-10, rows 0-1.
// Legs occupy cols 3-10, rows 9-10.

// ─── CPU HEADS (back view — seen from behind) ───

function headBack_ryzenHigh(s, ox, oy, t, frame) {
  // Wide angular head with exposed pin array — aggressive, multi-core
  const pulse = (frame % 32) > 16;
  s.set(ox+3, oy, '╔', t.accent);
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '█', t.frame);
  s.set(ox+6, oy, '▄', t.accent); s.set(ox+7, oy, '▄', t.accent);
  s.set(ox+8, oy, '█', t.frame);
  s.set(ox+9, oy, '▄', t.frameDk);
  s.set(ox+10, oy, '╗', t.accentDk);
  // Row 1: head body with pin grid
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, '▓', t.vent);
  s.set(ox+4, oy+1, pulse ? '░' : '▒', t.accent);
  s.set(ox+5, oy+1, '▓', t.vent);
  s.set(ox+6, oy+1, pulse ? '░' : '▒', t.accent);
  s.set(ox+7, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, pulse ? '░' : '▒', t.accent);
  s.set(ox+9, oy+1, '▓', t.vent);
  s.set(ox+10, oy+1, '█', t.frameDk);
  s.set(ox+11, oy+1, '▌', t.shadow);
}

function headBack_ryzenMid(s, ox, oy, t, frame) {
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '█', t.frame); s.set(ox+6, oy, '▄', t.accent);
  s.set(ox+7, oy, '█', t.frame); s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  for (let i=4;i<=8;i++) s.set(ox+i, oy+1, i%2===0?'▒':'▓', i%2===0?t.accent:t.vent);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_intelHigh(s, ox, oy, t, frame) {
  // Sharp geometric head — clean lines, LED strip
  const pulse = (frame % 28) > 14;
  s.set(ox+4, oy, '╔', t.frameLt);
  s.set(ox+5, oy, '═', t.frame);  s.set(ox+6, oy, '═', t.frame);
  s.set(ox+7, oy, '═', t.frame);  s.set(ox+8, oy, '╗', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, '█', t.frame);
  s.set(ox+5, oy+1, pulse?'█':'░', t.accent);
  s.set(ox+6, oy+1, pulse?'█':'░', t.accent);
  s.set(ox+7, oy+1, pulse?'█':'░', t.accent);
  s.set(ox+8, oy+1, '█', t.frame);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_intelMid(s, ox, oy, t, frame) {
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '═', t.frame); s.set(ox+6, oy, '═', t.frame);
  s.set(ox+7, oy, '═', t.frame); s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  for (let i=4;i<=8;i++) s.set(ox+i, oy+1, '▓', t.vent);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_apple(s, ox, oy, t, frame) {
  // Smooth rounded — minimal, clean curves
  s.set(ox+4, oy, '╭', t.frameLt);
  s.set(ox+5, oy, '─', t.frame); s.set(ox+6, oy, '─', t.frame);
  s.set(ox+7, oy, '─', t.frame); s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+3, oy+1, '│', t.frameLt);
  s.set(ox+4, oy+1, ' ');
  for (let i=5;i<=7;i++) s.set(ox+i, oy+1, '░', t.vent);
  s.set(ox+8, oy+1, ' ');
  s.set(ox+9, oy+1, '│', t.frameDk);
}

function headBack_celeron(s, ox, oy, t, frame) {
  // Tiny round blob
  s.set(ox+5, oy, '▄', t.frameLt); s.set(ox+6, oy, '▄', t.frame);
  s.set(ox+7, oy, '▄', t.frameDk);
  s.set(ox+5, oy+1, '█', t.frameLt);
  s.set(ox+6, oy+1, '▓', t.vent);
  s.set(ox+7, oy+1, '█', t.frameDk);
}

function headBack_generic(s, ox, oy, t, frame) {
  headBack_intelMid(s, ox, oy, t, frame);
}

// ─── TORSO (back view) ───

function torsoBack_flagship(s, ox, oy, t, frame) {
  // Massive torso with wide shoulders, thick armor plates
  // Rows 2-8 relative to sprite origin
  const r = oy + 2;
  // Row 2: shoulders — extra wide
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+12, r, '▌', t.frameDk);
  // Row 3-6: body with vents
  for (let row=1;row<=4;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    s.set(ox+3, r+row, '█', t.frame);
    for (let i=4;i<=9;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+10, r+row, '█', t.frame);
    s.set(ox+11, r+row, '█', t.frameDk);
    s.set(ox+12, r+row, '▌', t.shadow);
  }
  // Row 7: waist belt
  s.set(ox+1, r+5, '▐', t.frameLt);
  s.set(ox+2, r+5, '═', t.accent);
  for (let i=3;i<=10;i++) s.set(ox+i, r+5, '█', t.frame);
  s.set(ox+11, r+5, '═', t.accentDk);
  s.set(ox+12, r+5, '▌', t.shadow);
  // Accent stripe down the spine
  for (let row=1;row<=4;row++) {
    s.set(ox+6, r+row, '║', t.accent);
    s.set(ox+7, r+row, '║', t.accentDk);
  }
}

function torsoBack_high(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+12, r, '▌', t.frameDk);
  for (let row=1;row<=4;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=10;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+11, r+row, '█', t.frameDk);
    s.set(ox+12, r+row, '▌', t.shadow);
  }
  s.set(ox+1, r+5, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r+5, '█', t.frame);
  s.set(ox+12, r+5, '▌', t.shadow);
}

function torsoBack_mid(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+2, r, '▐', t.frameLt);
  for (let i=3;i<=9;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+2, r+row, '▐', t.frameLt);
    s.set(ox+3, r+row, '█', t.frame);
    for (let i=4;i<=8;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+9, r+row, '█', t.frameDk);
    s.set(ox+10, r+row, '▌', t.shadow);
  }
  s.set(ox+2, r+4, '▐', t.frameLt);
  for (let i=3;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.shadow);
}

function torsoBack_low(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+4, r, '▐', t.frameLt);
  for (let i=5;i<=7;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+8, r, '▌', t.frameDk);
  for (let row=1;row<=2;row++) {
    s.set(ox+4, r+row, '▐', t.frameLt);
    s.set(ox+5, r+row, '▒', t.vent);
    s.set(ox+6, r+row, '▒', t.vent);
    s.set(ox+7, r+row, '█', t.frameDk);
    s.set(ox+8, r+row, '▌', t.shadow);
  }
  s.set(ox+4, r+3, '▐', t.frameLt);
  for (let i=5;i<=7;i++) s.set(ox+i, r+3, '█', t.frame);
  s.set(ox+8, r+3, '▌', t.shadow);
}

// ─── GPU ARM/WEAPON (back view — extends RIGHT from torso) ───

function gpuBack_nvidiaFlagship(s, ox, oy, t, frame) {
  // MASSIVE triple-fan cannon. Extends cols 12-20, rows 3-7.
  const pulse = (frame % 24) > 12;
  const r = oy + 3;  const c = ox + 12;
  // Barrel housing
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '═', t.frame);
  s.set(c+5,r, '═', t.frame); s.set(c+6,r, '╗', t.frameDk);
  // Fan row 1
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+6,r+1, '║', t.frameDk);
  s.set(c+7,r+1, '▌', t.shadow);
  // Barrel mid
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '▓', t.vent);
  s.set(c+2,r+2, '█', t.frame);
  s.set(c+3,r+2, '█', pulse?t.core:t.coreDk);
  s.set(c+4,r+2, '█', t.frame);
  s.set(c+5,r+2, '▓', t.vent);
  s.set(c+6,r+2, '║', t.frameDk);
  s.set(c+7,r+2, '►', pulse?t.core:t.accent); // muzzle
  // Fan row 2
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c+4,r+3, '▓', t.vent);
  s.set(c+5,r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c+6,r+3, '║', t.frameDk);
  s.set(c+7,r+3, '▌', t.shadow);
  // Bottom housing
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=5;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+6, r+4, '╝', t.frameDk);
  // Exhaust vents below
  s.set(c+2,r+5, '░', t.vent); s.set(c+3,r+5, '░', t.vent); s.set(c+4,r+5, '░', t.vent);
}

function gpuBack_nvidiaHigh(s, ox, oy, t, frame) {
  // Dual-fan rifle arm. Cols 12-17, rows 3-7.
  const pulse = (frame % 28) > 14;
  const r = oy + 3;  const c = ox + 12;
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+4,r+1, '║', t.frameDk);
  s.set(c+5,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.frame);
  s.set(c+2,r+2, '█', pulse?t.core:t.coreDk);
  s.set(c+3,r+2, '█', t.frame);
  s.set(c+4,r+2, '║', t.frameDk);
  s.set(c+5,r+2, '►', pulse?t.core:t.accent);
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c+4,r+3, '║', t.frameDk);
  s.set(c+5,r+3, '▌', t.shadow);
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=3;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+4, r+4, '╝', t.frameDk);
}

function gpuBack_nvidiaMid(s, ox, oy, t, frame) {
  // Compact sidearm. Cols 10-14, rows 4-6.
  const pulse = (frame % 32) > 16;
  const r = oy + 4;  const c = ox + 10;
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c+2,r+1, '║', t.frameDk);
  s.set(c+3,r+1, '►', t.accent);
  s.set(c, r+2, '╚', t.frameLt);
  s.set(c+1,r+2, '═', t.frame); s.set(c+2,r+2, '╝', t.frameDk);
}

function gpuBack_amdFlagship(s, ox, oy, t, frame) {
  // Angular blade weapon with exposed heat pipes. Cols 12-19, rows 2-8.
  const pulse = (frame % 26) > 13;
  const r = oy + 2;  const c = ox + 12;
  // Blade tip
  s.set(c+5, r, '╱', t.accent);
  s.set(c+6, r, '▄', t.accentDk);
  // Upper blade
  s.set(c, r+1, '╠', t.frameLt);
  s.set(c+1,r+1, '▓', t.vent);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, '═', t.accent);
  s.set(c+4,r+1, '═', t.accent);
  s.set(c+5,r+1, '█', t.accent);
  s.set(c+6,r+1, '▌', t.shadow);
  // Core blade rows
  for (let row=2;row<=4;row++) {
    s.set(c, r+row, '║', t.frameLt);
    s.set(c+1,r+row, row===3?'█':'▒', row===3?(pulse?t.core:t.coreDk):t.vent);
    s.set(c+2,r+row, row===3?'█':'▒', row===3?(pulse?t.core:t.coreDk):t.vent);
    s.set(c+3,r+row, '█', t.accent);
    s.set(c+4,r+row, '█', row===3?(pulse?t.core:t.accent):t.accent);
    s.set(c+5,r+row, '█', t.accentDk);
    s.set(c+6,r+row, '▌', t.shadow);
  }
  // Heat pipes visible
  s.set(c, r+5, '║', t.frameLt);
  s.set(c+1,r+5, '─', t.vent); s.set(c+2,r+5, '─', t.vent);
  s.set(c+3,r+5, '─', t.vent); s.set(c+4,r+5, '═', t.accent);
  s.set(c+5,r+5, '▀', t.accentDk);
  // Lower blade taper
  s.set(c, r+6, '╚', t.frameLt);
  s.set(c+1,r+6, '═', t.frame);
  s.set(c+2,r+6, '═', t.accent);
  s.set(c+3,r+6, '▀', t.accentDk);
}

function gpuBack_amdHigh(s, ox, oy, t, frame) {
  // Triple-fan backplate arm — 7800 XT / 6800 XT class. Cols 12-19, rows 2-8.
  const pulse = (frame % 26) > 13;
  const spin  = (frame % 20) > 10;
  const r = oy + 2;  const c = ox + 12;
  // Top housing
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '═', t.frame);
  s.set(c+5,r, '═', t.accent); s.set(c+6,r, '╗', t.frameDk);
  // Fan row 1 — triple fans, spinning
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, spin?'◎':'◉', pulse?t.core:t.coreDk);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, spin?'◎':'◉', pulse?t.core:t.coreDk);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, spin?'◎':'◉', pulse?t.core:t.coreDk);
  s.set(c+6,r+1, '║', t.frameDk);
  s.set(c+7,r+1, '▌', t.shadow);
  // Backplate with heat pipes
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '─', t.vent); s.set(c+2,r+2, '█', t.accent);
  s.set(c+3,r+2, '█', pulse?t.core:t.coreDk);
  s.set(c+4,r+2, '█', t.accent); s.set(c+5,r+2, '─', t.vent);
  s.set(c+6,r+2, '║', t.frameDk);
  s.set(c+7,r+2, '▌', t.shadow);
  // Middle accent stripe
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '▓', t.vent);
  s.set(c+2,r+3, '═', t.accent); s.set(c+3,r+3, '═', t.accent);
  s.set(c+4,r+3, '═', t.accent); s.set(c+5,r+3, '▓', t.vent);
  s.set(c+6,r+3, '║', t.frameDk);
  s.set(c+7,r+3, '►', pulse?t.core:t.accent);
  // Fan row 2
  s.set(c, r+4, '║', t.frameLt);
  s.set(c+1,r+4, spin?'◉':'◎', pulse?t.coreDk:t.core);
  s.set(c+2,r+4, '▓', t.vent);
  s.set(c+3,r+4, spin?'◉':'◎', pulse?t.coreDk:t.core);
  s.set(c+4,r+4, '▓', t.vent);
  s.set(c+5,r+4, spin?'◉':'◎', pulse?t.coreDk:t.core);
  s.set(c+6,r+4, '║', t.frameDk);
  s.set(c+7,r+4, '▌', t.shadow);
  // Bottom housing
  s.set(c, r+5, '╚', t.frameLt);
  for (let i=1;i<=5;i++) s.set(c+i, r+5, '═', t.frame);
  s.set(c+6, r+5, '╝', t.frameDk);
  // Exhaust
  s.set(c+2,r+6, '░', t.vent); s.set(c+3,r+6, '░', t.vent); s.set(c+4,r+6, '░', t.vent);
}

function gpuBack_amdMid(s, ox, oy, t, frame) {
  // Small blade stub. Cols 10-13, rows 4-6.
  const pulse = (frame % 34) > 17;
  const r = oy + 4;  const c = ox + 10;
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '▄', t.accentDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '█', pulse?t.core:t.coreDk); s.set(c+2,r+1, '█', t.accent);
  s.set(c, r+2, '╚', t.frameLt); s.set(c+1,r+2, '═', t.frame); s.set(c+2,r+2, '▀', t.accent);
}

function gpuBack_intelArc(s, ox, oy, t, frame) {
  // Crystalline geometric arm. Cols 12-16, rows 3-7.
  const pulse = (frame % 22) > 11;
  const r = oy + 3;  const c = ox + 12;
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '▄', t.accent); s.set(c+2,r, '△', t.accent); s.set(c+3,r, '▄', t.accentDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◇', pulse?t.core:t.coreDk);
  s.set(c+2,r+1, '█', t.accent);
  s.set(c+3,r+1, '◇', pulse?t.coreDk:t.core);
  s.set(c+4,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.accent);
  s.set(c+2,r+2, '◆', pulse?t.core:t.accent);
  s.set(c+3,r+2, '█', t.accentDk);
  s.set(c+4,r+2, '▌', t.shadow);
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '◇', pulse?t.coreDk:t.core);
  s.set(c+2,r+3, '█', t.accent);
  s.set(c+3,r+3, '◇', pulse?t.core:t.coreDk);
  s.set(c, r+4, '╚', t.frameLt);
  s.set(c+1,r+4, '▀', t.accent); s.set(c+2,r+4, '▽', t.accent); s.set(c+3,r+4, '▀', t.accentDk);
}

function gpuBack_apple(s, ox, oy, t, frame) {
  // Smooth minimal pod. Cols 10-12, rows 4-6.
  const r = oy + 4;  const c = ox + 10;
  s.set(c, r, '╭', t.frameLt); s.set(c+1,r, '─', t.frame); s.set(c+2,r, '╮', t.frameDk);
  s.set(c, r+1, '│', t.frameLt); s.set(c+1,r+1, '○', t.accent); s.set(c+2,r+1, '│', t.frameDk);
  s.set(c, r+2, '╰', t.frameLt); s.set(c+1,r+2, '─', t.frame); s.set(c+2,r+2, '╯', t.frameDk);
}

function gpuBack_integrated(s, ox, oy, t, frame) {
  // Pathetic tiny stub. Single pixel.
  const r = oy + 5;  const c = ox + 8;
  s.set(c, r, '▪', t.vent);
}

// ─── LEGS (back view) ───

function legsBack_nvme(s, ox, oy, t) {
  // Thruster-style angular legs with speed lines
  const r = oy + 8;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+5, r, '▀', t.accent);
  s.set(ox+8, r, '▀', t.accent);
  s.set(ox+9, r, '█', t.leg); s.set(ox+10, r, '▀', t.frame);
  // Thruster exhaust
  s.set(ox+4, r+1, '▓', t.accent); s.set(ox+5, r+1, '░', t.accentDk);
  s.set(ox+8, r+1, '░', t.accentDk); s.set(ox+9, r+1, '▓', t.accent);
  s.set(ox+4, r+2, '▀', t.leg); s.set(ox+9, r+2, '▀', t.leg);
}

function legsBack_ssd(s, ox, oy, t) {
  // Solid stable legs
  const r = oy + 8;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg); s.set(ox+5, r, '▀', t.frame);
  s.set(ox+8, r, '▀', t.frame); s.set(ox+9, r, '█', t.leg); s.set(ox+10, r, '▀', t.frame);
  s.set(ox+4, r+1, '█', t.leg); s.set(ox+9, r+1, '█', t.leg);
  s.set(ox+4, r+2, '▀', t.leg); s.set(ox+9, r+2, '▀', t.leg);
}

function legsBack_hdd(s, ox, oy, t) {
  // Chunky heavy legs — thick, boxy
  const r = oy + 8;
  s.set(ox+2, r, '▀', t.frame); s.set(ox+3, r, '█', t.leg);
  s.set(ox+4, r, '█', t.leg); s.set(ox+5, r, '▀', t.frame);
  s.set(ox+8, r, '▀', t.frame); s.set(ox+9, r, '█', t.leg);
  s.set(ox+10, r, '█', t.leg); s.set(ox+11, r, '▀', t.frame);
  s.set(ox+3, r+1, '█', t.leg); s.set(ox+4, r+1, '█', t.leg);
  s.set(ox+9, r+1, '█', t.leg); s.set(ox+10, r+1, '█', t.leg);
  s.set(ox+3, r+2, '▀', t.leg); s.set(ox+4, r+2, '▀', t.leg);
  s.set(ox+9, r+2, '▀', t.leg); s.set(ox+10, r+2, '▀', t.leg);
}

// ═══════════════════════════════════════════════════════════════
// §4  FRONT VIEW COMPONENTS (opponent — top-right, smaller)
// ═══════════════════════════════════════════════════════════════
// Torso cols 2-9, GPU arm extends LEFT from col 1 and below.
// Head cols 3-8, rows 0-1.

function headFront_ryzenHigh(s, ox, oy, t, frame) {
  const blink = (frame % 55) > 50;
  s.set(ox+2, oy, '▄', t.accent); s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk); s.set(ox+9, oy, '▄', t.accentDk);
  s.set(ox+1, oy+1, '█', t.frameLt); s.set(ox+2, oy+1, '█', t.frame);
  s.set(ox+3, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+4, oy+1, '▒', t.accent); s.set(ox+5, oy+1, '▒', t.accent);
  s.set(ox+6, oy+1, '▒', t.accent); s.set(ox+7, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+9, oy+1, '█', t.frame); s.set(ox+10, oy+1, '█', t.frameDk);
}

function headFront_ryzenMid(s, ox, oy, t, frame) {
  const blink = (frame % 60) > 55;
  s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  for (let i=4;i<=7;i++) s.set(ox+i, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intelHigh(s, ox, oy, t, frame) {
  const blink = (frame % 58) > 53;
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '═', t.frame);
  s.set(ox+8, oy, '╗', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+4, oy+1, '█', t.accent); s.set(ox+5, oy+1, '█', t.accent);
  s.set(ox+6, oy+1, '█', t.accent); s.set(ox+7, oy+1, '█', t.accent);
  s.set(ox+8, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intelMid(s, ox, oy, t, frame) {
  const blink = (frame % 65) > 60;
  s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  for (let i=4;i<=7;i++) s.set(ox+i, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, blink?'─':'◈', blink?t.frame:t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_apple(s, ox, oy, t, frame) {
  const blink = (frame % 70) > 65;
  s.set(ox+3, oy, '╭', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '─', t.frame);
  s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+2, oy+1, '│', t.frameLt);
  s.set(ox+3, oy+1, ' ');
  s.set(ox+4, oy+1, blink?'─':'●', blink?t.frame:t.eye);
  s.set(ox+5, oy+1, ' '); s.set(ox+6, oy+1, ' ');
  s.set(ox+7, oy+1, blink?'─':'●', blink?t.frame:t.eye);
  s.set(ox+8, oy+1, ' ');
  s.set(ox+9, oy+1, '│', t.frameDk);
}

function headFront_celeron(s, ox, oy, t, frame) {
  const blink = (frame % 80) > 74;
  s.set(ox+4, oy, '▄', t.frameLt); s.set(ox+5, oy, '▄', t.frame);
  s.set(ox+6, oy, '▄', t.frame); s.set(ox+7, oy, '▄', t.frameDk);
  s.set(ox+4, oy+1, '█', t.frameLt);
  s.set(ox+5, oy+1, blink?'─':'·', blink?t.frame:t.eye);
  s.set(ox+6, oy+1, blink?'─':'·', blink?t.frame:t.eye);
  s.set(ox+7, oy+1, '█', t.frameDk);
}

function headFront_generic(s, ox, oy, t, frame) {
  headFront_intelMid(s, ox, oy, t, frame);
}

// ─── TORSO FRONT ───

function torsoFront_flagship(s, ox, oy, t, frame) {
  const r = oy + 2;
  // Separator
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  // Body rows
  for (let row=1;row<=3;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=8;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+9, r+row, '█', t.frame);
    s.set(ox+10, r+row, '▌', t.frameDk);
  }
  // Accent spine
  s.set(ox+5, r+1, '║', t.accent); s.set(ox+6, r+1, '║', t.accentDk);
  s.set(ox+5, r+2, '║', t.accent); s.set(ox+6, r+2, '║', t.accentDk);
  // Belt
  s.set(ox+1, r+4, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.frameDk);
}

function torsoFront_high(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=8;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+9, r+row, '█', t.frameDk);
    s.set(ox+10, r+row, '▌', t.shadow);
  }
  s.set(ox+1, r+4, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.shadow);
}

function torsoFront_mid(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+2, r, '▐', t.frameLt);
  for (let i=3;i<=8;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+9, r, '▌', t.frameDk);
  for (let row=1;row<=2;row++) {
    s.set(ox+2, r+row, '▐', t.frameLt);
    s.set(ox+3, r+row, '█', t.frame);
    for (let i=4;i<=7;i++) s.set(ox+i, r+row, '▒', t.vent);
    s.set(ox+8, r+row, '█', t.frameDk);
    s.set(ox+9, r+row, '▌', t.shadow);
  }
  s.set(ox+2, r+3, '▐', t.frameLt);
  for (let i=3;i<=8;i++) s.set(ox+i, r+3, '█', t.frame);
  s.set(ox+9, r+3, '▌', t.shadow);
}

function torsoFront_low(s, ox, oy, t, frame) {
  const r = oy + 2;
  s.set(ox+4, r, '▐', t.frameLt);
  s.set(ox+5, r, '═', t.frame); s.set(ox+6, r, '═', t.frame);
  s.set(ox+7, r, '▌', t.frameDk);
  s.set(ox+4, r+1, '▐', t.frameLt);
  s.set(ox+5, r+1, '▒', t.vent); s.set(ox+6, r+1, '▒', t.vent);
  s.set(ox+7, r+1, '▌', t.frameDk);
  s.set(ox+4, r+2, '▐', t.frameLt);
  s.set(ox+5, r+2, '█', t.frame); s.set(ox+6, r+2, '█', t.frame);
  s.set(ox+7, r+2, '▌', t.shadow);
}

// ─── GPU ARM FRONT VIEW (extends LEFT from torso) ───

function gpuFront_nvidiaFlagship(s, ox, oy, t, frame) {
  // Massive cannon visible from front. Extends left cols -3 to 1, rows 3-7.
  const pulse = (frame % 24) > 12;
  const r = oy + 3;  const c = ox - 1;
  s.set(c-2, r, '◄', pulse?t.core:t.accent);
  s.set(c-1, r, '█', t.frame); s.set(c, r, '█', t.frame); s.set(c+1, r, '╣', t.frameDk);
  s.set(c-2, r+1, '▌', t.shadow);
  s.set(c-1, r+1, '◎', pulse?t.core:t.coreDk);
  s.set(c, r+1, '▓', t.vent); s.set(c+1, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '◄', pulse?t.core:t.accent);
  s.set(c-1, r+2, '█', pulse?t.core:t.coreDk);
  s.set(c, r+2, '█', t.frame); s.set(c+1, r+2, '╣', t.frameDk);
  s.set(c-2, r+3, '▌', t.shadow);
  s.set(c-1, r+3, '◎', pulse?t.coreDk:t.core);
  s.set(c, r+3, '▓', t.vent); s.set(c+1, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '▀', t.frame); s.set(c+1, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaHigh(s, ox, oy, t, frame) {
  const pulse = (frame % 28) > 14;
  const r = oy + 3;  const c = ox;
  s.set(c-1, r, '█', t.frame); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '◎', pulse?t.core:t.coreDk); s.set(c, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '►', pulse?t.core:t.accent);
  s.set(c-1, r+2, '█', t.frame); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, '◎', pulse?t.coreDk:t.core); s.set(c, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaMid(s, ox, oy, t, frame) {
  const pulse = (frame % 32) > 16;
  const r = oy + 4;  const c = ox + 1;
  s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r, '◎', pulse?t.core:t.coreDk);
  s.set(c, r+1, '╣', t.frameDk);
  s.set(c-1, r+1, '▀', t.frame);
}

function gpuFront_amdFlagship(s, ox, oy, t, frame) {
  const pulse = (frame % 26) > 13;
  const r = oy + 2;  const c = ox;
  s.set(c-2, r, '▄', t.accent); s.set(c-1, r, '╲', t.accent);
  s.set(c-2, r+1, '█', t.accent); s.set(c-1, r+1, '█', t.accent); s.set(c, r+1, '╣', t.frameDk);
  s.set(c-2, r+2, '█', t.accentDk);
  s.set(c-1, r+2, '█', pulse?t.core:t.coreDk); s.set(c, r+2, '║', t.frameDk);
  s.set(c-2, r+3, '█', t.accent); s.set(c-1, r+3, '█', t.accent); s.set(c, r+3, '╣', t.frameDk);
  s.set(c-2, r+4, '─', t.vent); s.set(c-1, r+4, '═', t.accent); s.set(c, r+4, '║', t.frameDk);
  s.set(c-1, r+5, '▀', t.accentDk); s.set(c, r+5, '╝', t.frameDk);
}

function gpuFront_amdHigh(s, ox, oy, t, frame) {
  // Triple-fan visible from front — chunky weapon arm
  const pulse = (frame % 26) > 13;
  const spin  = (frame % 20) > 10;
  const r = oy + 2;  const c = ox;
  // Top
  s.set(c-2, r, '▄', t.accent); s.set(c-1, r, '═', t.frame); s.set(c, r, '╗', t.frameDk);
  // Fan visible
  s.set(c-2, r+1, '█', t.accent);
  s.set(c-1, r+1, spin?'◎':'◉', pulse?t.core:t.coreDk);
  s.set(c, r+1, '║', t.frameDk);
  // Core
  s.set(c-2, r+2, '█', t.accent);
  s.set(c-1, r+2, '█', pulse?t.core:t.coreDk);
  s.set(c, r+2, '║', t.frameDk);
  s.set(c+1, r+2, '►', pulse?t.core:t.accent);
  // Fan visible
  s.set(c-2, r+3, '█', t.accentDk);
  s.set(c-1, r+3, spin?'◉':'◎', pulse?t.coreDk:t.core);
  s.set(c, r+3, '║', t.frameDk);
  // Bottom
  s.set(c-2, r+4, '▀', t.accent); s.set(c-1, r+4, '═', t.frame); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_amdMid(s, ox, oy, t, frame) {
  const pulse = (frame % 34) > 17;
  const r = oy + 4;  const c = ox + 1;
  s.set(c-1, r, '█', pulse?t.core:t.coreDk); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '▀', t.accent);
}

function gpuFront_intelArc(s, ox, oy, t, frame) {
  const pulse = (frame % 22) > 11;
  const r = oy + 3;  const c = ox;
  s.set(c-1, r, '◇', pulse?t.core:t.coreDk); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '◆', pulse?t.core:t.accent); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '◇', pulse?t.coreDk:t.core); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, '▀', t.accent);
}

function gpuFront_apple(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  s.set(c-1, r, '○', t.accent); s.set(c, r, '│', t.frameDk);
}

function gpuFront_integrated(s, ox, oy, t, frame) {
  // Nothing visible — no weapon
}

// ─── LEGS FRONT ───

function legsFront_nvme(s, ox, oy, t) {
  const r = oy + 7;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '▀', t.frame);
  s.set(ox+4, r+1, '▓', t.accent); s.set(ox+7, r+1, '▓', t.accent);
}

function legsFront_ssd(s, ox, oy, t) {
  const r = oy + 7;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '▀', t.frame);
  s.set(ox+4, r+1, '▀', t.leg); s.set(ox+7, r+1, '▀', t.leg);
}

function legsFront_hdd(s, ox, oy, t) {
  const r = oy + 7;
  s.set(ox+2, r, '▀', t.frame); s.set(ox+3, r, '█', t.leg); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '█', t.leg); s.set(ox+9, r, '▀', t.frame);
  s.set(ox+3, r+1, '▀', t.leg); s.set(ox+4, r+1, '▀', t.leg);
  s.set(ox+7, r+1, '▀', t.leg); s.set(ox+8, r+1, '▀', t.leg);
}

// ═══════════════════════════════════════════════════════════════
// §5  DISPATCH TABLES
// ═══════════════════════════════════════════════════════════════

const HEAD_BACK   = { ryzen_high: headBack_ryzenHigh, ryzen_mid: headBack_ryzenMid, intel_high: headBack_intelHigh, intel_mid: headBack_intelMid, apple: headBack_apple, celeron: headBack_celeron, generic: headBack_generic };
const HEAD_FRONT  = { ryzen_high: headFront_ryzenHigh, ryzen_mid: headFront_ryzenMid, intel_high: headFront_intelHigh, intel_mid: headFront_intelMid, apple: headFront_apple, celeron: headFront_celeron, generic: headFront_generic };
const TORSO_BACK  = { flagship: torsoBack_flagship, high: torsoBack_high, mid: torsoBack_mid, low: torsoBack_low };
const TORSO_FRONT = { flagship: torsoFront_flagship, high: torsoFront_high, mid: torsoFront_mid, low: torsoFront_low };
const GPU_BACK    = { nvidia_flagship: gpuBack_nvidiaFlagship, nvidia_high: gpuBack_nvidiaHigh, nvidia_mid: gpuBack_nvidiaMid, amd_flagship: gpuBack_amdFlagship, amd_high: gpuBack_amdHigh, amd_mid: gpuBack_amdMid, intel_arc: gpuBack_intelArc, apple: gpuBack_apple, integrated: gpuBack_integrated };
const GPU_FRONT   = { nvidia_flagship: gpuFront_nvidiaFlagship, nvidia_high: gpuFront_nvidiaHigh, nvidia_mid: gpuFront_nvidiaMid, amd_flagship: gpuFront_amdFlagship, amd_high: gpuFront_amdHigh, amd_mid: gpuFront_amdMid, intel_arc: gpuFront_intelArc, apple: gpuFront_apple, integrated: gpuFront_integrated };
const LEGS_BACK   = { NVMe: legsBack_nvme, SSD: legsBack_ssd, HDD: legsBack_hdd, eMMC: legsBack_hdd };
const LEGS_FRONT  = { NVMe: legsFront_nvme, SSD: legsFront_ssd, HDD: legsFront_hdd, eMMC: legsFront_hdd };

// ═══════════════════════════════════════════════════════════════
// §6  HIT / KO HELPERS
// ═══════════════════════════════════════════════════════════════

const GLITCH_CHARS = '╳╬▓░▒█';

function drawHit(compositeDraw, screen, ox, oy, frame) {
  const shakeX = (frame % 2 === 0) ? 1 : -1;
  compositeDraw(screen, ox + shakeX, oy, null, frame);
  for (let i = 0; i < 5; i++) {
    const gx = ox + 2 + Math.floor(Math.random() * 10);
    const gy = oy + 1 + Math.floor(Math.random() * 7);
    screen.set(gx, gy, GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)], colors.rose);
  }
}

function drawKO(screen, ox, oy, isBack) {
  const d = colors.dim;
  const by = isBack ? oy + 6 : oy + 4;
  screen.text(ox + 2, by, '▄▄▄▄▄▄▄▄▄', d);
  screen.text(ox + 2, by + 1, '░░░░░░░░░', d);
  screen.text(ox + 2, by + 2, '▀▀▀▀▀▀▀▀▀', d);
  screen.text(ox + 3, by - 1, 'x     x', colors.dimmer);
}

// ═══════════════════════════════════════════════════════════════
// §7  PUBLIC API — Assembles components into composite sprites
// ═══════════════════════════════════════════════════════════════

function getSprite(specs) {
  const hw = identifyHardware(specs);
  const theme = THEMES[hw.brand] || THEMES.generic;

  const headB  = HEAD_BACK[hw.cpuFamily]   || HEAD_BACK.generic;
  const headF  = HEAD_FRONT[hw.cpuFamily]  || HEAD_FRONT.generic;
  const bodyB  = TORSO_BACK[hw.tier]       || TORSO_BACK.mid;
  const bodyF  = TORSO_FRONT[hw.tier]      || TORSO_FRONT.mid;
  const gpuB   = GPU_BACK[hw.gpuFamily]    || GPU_BACK.integrated;
  const gpuF   = GPU_FRONT[hw.gpuFamily]   || GPU_FRONT.integrated;
  const legB   = LEGS_BACK[hw.storage]     || LEGS_BACK.SSD;
  const legF   = LEGS_FRONT[hw.storage]    || LEGS_FRONT.SSD;

  // Composite draw: assemble all 4 parts
  function drawBack(screen, ox, oy, _tint, frame) {
    bodyB(screen, ox, oy, theme, frame);   // torso first (background)
    gpuB(screen, ox, oy, theme, frame);    // GPU arm overlays on torso right edge
    headB(screen, ox, oy, theme, frame);   // head on top
    legB(screen, ox, oy, theme);           // legs on bottom
  }

  function drawFront(screen, ox, oy, _tint, frame) {
    bodyF(screen, ox, oy, theme, frame);
    gpuF(screen, ox, oy, theme, frame);
    headF(screen, ox, oy, theme, frame);
    legF(screen, ox, oy, theme);
  }

  return {
    back:  { draw: drawBack },
    front: { draw: drawFront },
    drawBackHit(screen, ox, oy, frame)  { drawHit(drawBack, screen, ox, oy, frame); },
    drawFrontHit(screen, ox, oy, frame) { drawHit(drawFront, screen, ox, oy, frame); },
    drawBackKO(screen, ox, oy)  { drawKO(screen, ox, oy, true); },
    drawFrontKO(screen, ox, oy) { drawKO(screen, ox, oy, false); },
    theme,
    hw,
  };
}

module.exports = { getSprite, identifyHardware, THEMES };
