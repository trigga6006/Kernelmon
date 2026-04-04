// ═══════════════════════════════════════════════════════════════════
// SPRITE CATALOG — Component-Assembly System (v3)
// Each fighter is built from 7 hardware-driven body parts:
//   HEAD      → CPU family  (14 variants: Threadripper/Ryzen9-3/Xeon/i9-i3/Apple/Celeron)
//   TORSO     → Overall tier + storage detailing (flagship/high/mid/low)
//   SHOULDERS → RAM amount  (massive pauldrons → bare frame, with glow)
//   ARM       → GPU model   (18 variants with 0-3 fans, brand-specific silhouettes)
//   EMBLEM    → AIB brand   (ROG eye, MSI dragon, EVGA bolt, etc.)
//   ACCESSORY → Spec hash   (antenna, visor, horns, monocle, cables)
//   LEGS      → Storage type + RAM reinforcement (NVMe thrusters / SSD stable / HDD clunky)
// Brand color themes are applied across ALL components.
// ═══════════════════════════════════════════════════════════════════

const { rgb, colors } = require('./palette');

// ─────────────────────────────────────────────
// §1  BRAND COLOR THEMES
// ─────────────────────────────────────────────

function makeTheme(o) {
  return {
    frame:    rgb(150, 158, 185),   frameDk:  rgb(95, 100, 128),
    frameLt:  rgb(185, 192, 215),   accent:   rgb(130, 220, 235),
    accentDk: rgb(80, 160, 180),    core:     rgb(100, 210, 230),
    coreDk:   rgb(55, 140, 165),    coreMed:  rgb(78, 175, 198),
    vent:     rgb(65, 70, 95),      ventLt:   rgb(80, 85, 110),
    eye:      rgb(230, 215, 140),   eyeOff:   rgb(75, 75, 95),
    leg:      rgb(85, 90, 108),     shadow:   rgb(38, 38, 52),
    emblem:   rgb(110, 180, 200),   data:     rgb(60, 100, 120),
    ...o,
  };
}

const THEMES = {
  nvidia_fe: makeTheme({
    frame: rgb(175, 180, 198), frameDk: rgb(120, 125, 145), frameLt: rgb(210, 215, 230),
    accent: rgb(118, 185, 0), accentDk: rgb(76, 135, 0),
    core: rgb(118, 200, 20), coreDk: rgb(70, 140, 10), coreMed: rgb(94, 170, 15),
    eye: rgb(118, 200, 20), emblem: rgb(100, 175, 15), data: rgb(55, 120, 5),
  }),
  asus_rog: makeTheme({
    frame: rgb(65, 65, 82), frameDk: rgb(40, 40, 55), frameLt: rgb(95, 95, 115),
    accent: rgb(220, 45, 45), accentDk: rgb(155, 25, 25),
    core: rgb(235, 55, 55), coreDk: rgb(160, 30, 30), coreMed: rgb(198, 42, 42),
    eye: rgb(235, 55, 55), emblem: rgb(200, 40, 40), data: rgb(130, 20, 20),
  }),
  msi: makeTheme({
    frame: rgb(75, 75, 92), frameDk: rgb(48, 48, 62), frameLt: rgb(108, 108, 125),
    accent: rgb(210, 40, 40), accentDk: rgb(150, 20, 20),
    core: rgb(240, 80, 30), coreDk: rgb(170, 50, 15), coreMed: rgb(205, 65, 22),
    eye: rgb(240, 80, 30), emblem: rgb(210, 60, 20), data: rgb(140, 35, 10),
  }),
  evga: makeTheme({
    frame: rgb(88, 92, 108), frameDk: rgb(58, 62, 78), frameLt: rgb(125, 130, 148),
    accent: rgb(0, 200, 80), accentDk: rgb(0, 140, 55),
    core: rgb(0, 220, 90), coreDk: rgb(0, 150, 60), coreMed: rgb(0, 185, 75),
    eye: rgb(0, 220, 90), emblem: rgb(0, 190, 70), data: rgb(0, 120, 45),
  }),
  gigabyte: makeTheme({
    frame: rgb(55, 65, 105), frameDk: rgb(35, 42, 72), frameLt: rgb(80, 92, 138),
    accent: rgb(240, 150, 30), accentDk: rgb(180, 105, 15),
    core: rgb(245, 160, 40), coreDk: rgb(180, 110, 20), coreMed: rgb(212, 135, 30),
    eye: rgb(245, 160, 40), emblem: rgb(225, 140, 25), data: rgb(150, 90, 10),
  }),
  amd_ref: makeTheme({
    frame: rgb(62, 62, 75), frameDk: rgb(40, 40, 52), frameLt: rgb(90, 90, 108),
    accent: rgb(200, 30, 30), accentDk: rgb(140, 15, 15),
    core: rgb(220, 40, 40), coreDk: rgb(150, 20, 20), coreMed: rgb(185, 30, 30),
    eye: rgb(220, 40, 40), emblem: rgb(190, 25, 25), data: rgb(120, 12, 12),
  }),
  sapphire: makeTheme({
    frame: rgb(70, 100, 168), frameDk: rgb(45, 65, 118), frameLt: rgb(100, 135, 200),
    accent: rgb(80, 145, 230), accentDk: rgb(50, 100, 175),
    core: rgb(90, 160, 245), coreDk: rgb(55, 110, 185), coreMed: rgb(72, 135, 215),
    eye: rgb(90, 160, 245), emblem: rgb(75, 140, 220), data: rgb(40, 90, 160),
  }),
  powercolor: makeTheme({
    frame: rgb(48, 42, 52), frameDk: rgb(30, 25, 35), frameLt: rgb(72, 65, 78),
    accent: rgb(190, 20, 20), accentDk: rgb(130, 10, 10),
    core: rgb(210, 25, 25), coreDk: rgb(140, 12, 12), coreMed: rgb(175, 18, 18),
    eye: rgb(210, 25, 25), emblem: rgb(180, 15, 15), data: rgb(110, 8, 8),
  }),
  intel_arc: makeTheme({
    frame: rgb(50, 95, 185), frameDk: rgb(30, 62, 135), frameLt: rgb(75, 125, 218),
    accent: rgb(220, 225, 240), accentDk: rgb(160, 165, 180),
    core: rgb(60, 140, 245), coreDk: rgb(35, 95, 185), coreMed: rgb(48, 118, 215),
    eye: rgb(60, 140, 245), emblem: rgb(50, 120, 220), data: rgb(25, 75, 150),
  }),
  apple: makeTheme({
    frame: rgb(185, 188, 198), frameDk: rgb(145, 148, 158), frameLt: rgb(215, 218, 228),
    accent: rgb(225, 228, 238), accentDk: rgb(175, 178, 188),
    core: rgb(230, 232, 242), coreDk: rgb(180, 182, 192), coreMed: rgb(205, 207, 217),
    eye: rgb(230, 232, 242), vent: rgb(155, 158, 168), ventLt: rgb(170, 173, 183),
    emblem: rgb(200, 203, 215), data: rgb(140, 143, 155),
  }),
  generic: makeTheme({
    frame: rgb(105, 108, 125), frameDk: rgb(72, 75, 90), frameLt: rgb(138, 142, 158),
    accent: rgb(130, 135, 155), accentDk: rgb(90, 95, 112),
    core: rgb(140, 145, 165), coreDk: rgb(95, 100, 118), coreMed: rgb(118, 122, 142),
    eye: rgb(140, 145, 165), emblem: rgb(115, 120, 140), data: rgb(75, 78, 95),
  }),
};

// ─────────────────────────────────────────────
// §2  HARDWARE DETECTION (expanded v3)
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

// Fine-grained GPU family — 18 visual tiers
function classifyGPU(model) {
  const m = model.toLowerCase();
  // --- NVIDIA (7 tiers, most specific first) ---
  if (/5090|4090|3090|titan/i.test(m) && !/gt\s/i.test(m))          return 'nvidia_flagship';
  if (/5080|4080|3080/.test(m))                                      return 'nvidia_enthusiast';
  if (/5070\s*ti|4070\s*ti|3070\s*ti/.test(m))                       return 'nvidia_performance';
  if (/5070(?!\s*ti)|4070(?!\s*ti)|3070(?!\s*ti)|2080(?!\s*ti)/.test(m)) return 'nvidia_mainstream';
  if (/4060\s*ti|3060\s*ti|2070|1080\s*ti|1080(?!\s*ti)|1070\s*ti/.test(m)) return 'nvidia_value';
  if (/4060(?!\s*ti)|3060(?!\s*ti)|2060|16[56]0|1070(?!\s*ti)|1060/.test(m)) return 'nvidia_entry';
  if (/1050|1030|gt\s*[0-9]/i.test(m))                               return 'nvidia_budget';
  if (/nvidia|geforce|rtx|gtx/i.test(m))                             return 'nvidia_mainstream';
  // --- AMD (6 tiers) ---
  if (/7900\s*xtx|9070\s*xtx|radeon\s*vii/i.test(m))               return 'amd_flagship';
  if (/9070(?!\s*xtx)\s*xt|7900\s*xt(?!x)|6900\s*xt/i.test(m))     return 'amd_enthusiast';
  if (/7800\s*xt|6800\s*xt/i.test(m))                                return 'amd_performance';
  if (/7700\s*xt|6700\s*xt|6600\s*xt/i.test(m))                     return 'amd_mainstream';
  if (/7600|6600(?!\s*xt)|6500|6400/i.test(m))                       return 'amd_entry';
  if (/rx\s*5[0-9]{2}|rx\s*4[0-9]{2}|vega/i.test(m))                return 'amd_legacy';
  if (/amd|radeon/i.test(m))                                          return 'amd_mainstream';
  // --- Intel Arc (3 tiers) ---
  if (/arc\s*[ab]?7[0-9]0/i.test(m))                                 return 'intel_arc_high';
  if (/arc\s*[ab]?[56][0-9]0/i.test(m))                              return 'intel_arc_mid';
  if (/arc\s*[ab]?[0-3][0-9]0/i.test(m))                             return 'intel_arc_low';
  if (/arc/i.test(m))                                                  return 'intel_arc_mid';
  // --- Others ---
  if (/apple|m[1-4]/i.test(m))                                        return 'apple';
  return 'integrated';
}

// Fine-grained CPU family — 14 visual tiers
function classifyCPU(brand) {
  const b = brand.toLowerCase();
  if (/threadripper|epyc/i.test(b))                                   return 'threadripper';
  if (/ryzen\s*9/i.test(b))                                           return 'ryzen9';
  if (/ryzen\s*7/i.test(b))                                           return 'ryzen7';
  if (/ryzen\s*5/i.test(b))                                           return 'ryzen5';
  if (/ryzen\s*3/i.test(b))                                           return 'ryzen3';
  if (/xeon/i.test(b))                                                 return 'xeon';
  if (/i9-|core.*(i9|ultra\s*9)/i.test(b))                           return 'intel_i9';
  if (/i7-|core.*(i7|ultra\s*7)/i.test(b))                           return 'intel_i7';
  if (/i5-|core.*(i5|ultra\s*5)/i.test(b))                           return 'intel_i5';
  if (/i3-|core.*i3/i.test(b))                                        return 'intel_i3';
  if (/m[1-4]\s*(max|ultra)/i.test(b))                                return 'apple_pro';
  if (/m[1-4]\s*pro/i.test(b))                                        return 'apple_pro';
  if (/m[1-4]/i.test(b) || /apple/i.test(b))                         return 'apple_base';
  if (/celeron|pentium|atom|n[0-9]{4}/i.test(b))                     return 'celeron';
  return 'generic';
}

// Fan count derived from GPU family
function deriveFanCount(gpuFamily) {
  const map = {
    nvidia_flagship: 3, nvidia_enthusiast: 3, nvidia_performance: 2,
    nvidia_mainstream: 2, nvidia_value: 2, nvidia_entry: 1, nvidia_budget: 0,
    amd_flagship: 3, amd_enthusiast: 3, amd_performance: 2,
    amd_mainstream: 2, amd_entry: 1, amd_legacy: 1,
    intel_arc_high: 2, intel_arc_mid: 2, intel_arc_low: 1,
    apple: 0, integrated: 0,
  };
  return map[gpuFamily] ?? 1;
}

// Deterministic hash from string -> 0..max
function specHashOf(str, max) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return ((h % max) + max) % max;
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

  const ramGB = specs.ram?.totalGB || 0;
  const ram = ramGB >= 64 ? 'massive' : ramGB >= 32 ? 'heavy' : ramGB >= 16 ? 'light' : 'minimal';

  const cores = specs.cpu?.cores || 4;
  const coreClass = cores >= 12 ? 'many' : cores >= 4 ? 'quad' : 'few';

  const isLaptop = !!specs.isLaptop;
  const fanCount = deriveFanCount(gpuFamily);

  const hashStr = (specs.gpu?.model || '') + ':' + (specs.cpu?.brand || '') + ':' + storage;
  const specHash = specHashOf(hashStr, 6);

  return { tier, brand, gpuFamily, cpuFamily, storage, ram, coreClass, isLaptop, specHash, fanCount };
}

// ─────────────────────────────────────────────
// §2.5  ANIMATION HELPERS
// ─────────────────────────────────────────────

function cycle(frame, period, states) {
  return Math.floor((frame % period) / (period / states));
}

const VENT_CHARS = ['░', '▒', '▓', '▒'];
function ventChar(frame, period, offset) {
  return VENT_CHARS[cycle(frame + (offset || 0), period, 4)];
}

const FAN_CHARS = ['◎', '◉', '●', '◉'];
function fanChar(frame, period, offset) {
  return FAN_CHARS[cycle(frame + (offset || 0), period, 4)];
}

function coreGlow(frame, period, t) {
  return [t.coreDk, t.coreMed, t.core, t.coreMed][cycle(frame, period, 4)];
}

function eyeState(frame, period) {
  const p = period || 130;
  const f = frame % p;
  if (f < 55) return 'center';
  if (f < 65) return 'left';
  if (f < 82) return 'center';
  if (f < 92) return 'right';
  if (f < 120) return 'center';
  return 'blink';
}

function eyeChar(frame, period, style) {
  const st = eyeState(frame, period);
  if (st === 'blink') return '─';
  if (style === 'diamond') return st === 'left' ? '◇' : st === 'right' ? '◈' : '◆';
  if (style === 'round')   return st === 'left' ? '◔' : st === 'right' ? '◕' : '●';
  if (style === 'dot')     return st === 'left' ? '·' : st === 'right' ? '·' : '·';
  if (style === 'sharp')   return st === 'left' ? '◁' : st === 'right' ? '▷' : '◈';
  if (style === 'slit')    return st === 'left' ? '‹' : st === 'right' ? '›' : '▪';
  if (style === 'wide')    return st === 'left' ? '◐' : st === 'right' ? '◑' : '◉';
  return st === 'left' ? '◁' : st === 'right' ? '▷' : '◈';
}

function dataParticle(frame, x, baseY, tier) {
  if (tier !== 'flagship' && tier !== 'high') return null;
  const period = tier === 'flagship' ? 40 : 60;
  const f = (frame + x * 7) % period;
  if (f > 4) return null;
  return { char: f < 2 ? '·' : '°', y: baseY - f };
}

// LED sweep: which position in a row of N is active
function ledSweep(frame, period, count) {
  return Math.floor((frame % period) / (period / count));
}

// Heat pipe flow: cycling directional characters
const PIPE_CHARS = ['─', '═', '▬', '═'];
function pipeChar(frame, period, offset) {
  return PIPE_CHARS[cycle(frame + (offset || 0), period, 4)];
}

// Storage-based torso accent: NVMe data streams, SSD clean lines, HDD mechanical
function storageAccent(frame, storage, x, y) {
  if (storage === 'NVMe') {
    const f = (frame + x * 5) % 30;
    if (f < 3) return { char: f === 0 ? '·' : '°', active: true };
  }
  if (storage === 'HDD') {
    const f = (frame + x * 3) % 40;
    if (f === 0) return { char: '·', active: true };
  }
  return { char: null, active: false };
}


// ═══════════════════════════════════════════════════════════════
// §3  BACK VIEW COMPONENTS (player — bottom-left, larger)
// ═══════════════════════════════════════════════════════════════
// Coordinate system: ox,oy is top-left of bounding box.
// Torso occupies cols 2-11, rows 2-8.
// GPU arm extends RIGHT from col 12+.
// Head occupies cols 3-10, rows 0-1.
// Legs occupy cols 3-10, rows 9-10.

// ─── CPU HEADS (back view — 14 variants) ───

function headBack_threadripper(s, ox, oy, t, frame) {
  // MASSIVE extra-wide head with dense pin array and dual accent bars
  const p = cycle(frame, 24, 4);
  const pinA = p < 2 ? '░' : '▒';
  const pinB = p >= 1 && p <= 2 ? '▒' : '░';
  const pinC = (p + 2) % 4 < 2 ? '░' : '▒';
  // Row 0: extra-wide top plate with double accent bars
  s.set(ox+2, oy, '╔', t.accent);
  s.set(ox+3, oy, '▄', t.accent); s.set(ox+4, oy, '█', t.frameLt);
  s.set(ox+5, oy, '▄', t.core); s.set(ox+6, oy, '▄', t.accent);
  s.set(ox+7, oy, '▄', t.accent); s.set(ox+8, oy, '▄', t.core);
  s.set(ox+9, oy, '█', t.frameDk); s.set(ox+10, oy, '▄', t.accent);
  s.set(ox+11, oy, '╗', t.accentDk);
  // Row 1: dense pin grid across full width
  s.set(ox+1, oy+1, '█', t.frameLt);
  s.set(ox+2, oy+1, '▓', t.vent);
  s.set(ox+3, oy+1, pinA, t.accent); s.set(ox+4, oy+1, pinB, t.core);
  s.set(ox+5, oy+1, pinC, t.accent); s.set(ox+6, oy+1, pinA, t.core);
  s.set(ox+7, oy+1, pinB, t.accent); s.set(ox+8, oy+1, pinC, t.core);
  s.set(ox+9, oy+1, pinA, t.accent);
  s.set(ox+10, oy+1, '▓', t.vent);
  s.set(ox+11, oy+1, '█', t.frameDk);
  s.set(ox+12, oy+1, '▌', t.shadow);
}

function headBack_ryzen9(s, ox, oy, t, frame, hw) {
  // Wide aggressive head with dense pin grid and RGB accent strip
  const p = cycle(frame, 28, 4);
  const pinA = p < 2 ? '░' : '▒';
  const pinB = p >= 1 && p <= 2 ? '░' : '▒';
  const rgbPhase = cycle(frame, 40, 4);
  const rgbCol = [t.accent, t.core, t.coreMed, t.accent][rgbPhase];
  s.set(ox+3, oy, '╔', t.accent);
  s.set(ox+4, oy, '▄', t.frameLt); s.set(ox+5, oy, '█', rgbCol);
  s.set(ox+6, oy, '▄', t.accent); s.set(ox+7, oy, '▄', t.accent);
  s.set(ox+8, oy, '█', rgbCol); s.set(ox+9, oy, '▄', t.frameDk);
  s.set(ox+10, oy, '╗', t.accentDk);
  // Row 1: pins
  s.set(ox+2, oy+1, '█', t.frameLt);
  const many = hw && hw.coreClass === 'many';
  s.set(ox+3, oy+1, many ? '▓' : '█', many ? t.vent : t.frame);
  s.set(ox+4, oy+1, pinA, t.accent); s.set(ox+5, oy+1, '▓', t.vent);
  s.set(ox+6, oy+1, pinB, t.core); s.set(ox+7, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, pinA, t.accent);
  s.set(ox+9, oy+1, many ? '▓' : '█', many ? t.vent : t.frame);
  s.set(ox+10, oy+1, '█', t.frameDk);
  s.set(ox+11, oy+1, '▌', t.shadow);
}

function headBack_ryzen7(s, ox, oy, t, frame) {
  // Angular head with clean pin pattern
  const p = cycle(frame, 32, 4);
  const pinA = p < 2 ? '░' : '▒';
  const pinB = p >= 1 && p <= 2 ? '░' : '▒';
  s.set(ox+3, oy, '╔', t.accent);
  s.set(ox+4, oy, '▄', t.frameLt); s.set(ox+5, oy, '█', t.frame);
  s.set(ox+6, oy, '▄', t.accent); s.set(ox+7, oy, '▄', t.accent);
  s.set(ox+8, oy, '█', t.frame); s.set(ox+9, oy, '▄', t.frameDk);
  s.set(ox+10, oy, '╗', t.accentDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, '█', t.frame);
  s.set(ox+4, oy+1, pinA, t.accent); s.set(ox+5, oy+1, '▓', t.vent);
  s.set(ox+6, oy+1, pinB, t.accent); s.set(ox+7, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, pinA, t.accent);
  s.set(ox+9, oy+1, '█', t.frame);
  s.set(ox+10, oy+1, '█', t.frameDk);
  s.set(ox+11, oy+1, '▌', t.shadow);
}

function headBack_ryzen5(s, ox, oy, t, frame) {
  // Standard angular with basic pins
  const p = cycle(frame, 36, 4);
  const pin = p < 2 ? '░' : '▒';
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '█', t.frame); s.set(ox+6, oy, '▄', t.accent);
  s.set(ox+7, oy, '█', t.frame); s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, pin, t.accent); s.set(ox+5, oy+1, '▓', t.vent);
  s.set(ox+6, oy+1, pin, t.accent); s.set(ox+7, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, pin, t.accent);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_ryzen3(s, ox, oy, t, frame) {
  // Compact angular, fewer pins
  const p = cycle(frame, 42, 4);
  const pin = p < 2 ? '░' : '▒';
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '▄', t.frame); s.set(ox+6, oy, '▄', t.accent);
  s.set(ox+7, oy, '▄', t.frame); s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+4, oy+1, '█', t.frameLt);
  s.set(ox+5, oy+1, pin, t.accent); s.set(ox+6, oy+1, '▓', t.vent);
  s.set(ox+7, oy+1, pin, t.accent);
  s.set(ox+8, oy+1, '█', t.frameDk);
}

function headBack_xeon(s, ox, oy, t, frame) {
  // Industrial server-grade — wide with status LED bar and ventilation slats
  const led = ledSweep(frame, 36, 5);
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i = 4; i <= 9; i++) {
    const isLed = (i - 4) === led;
    s.set(ox+i, oy, isLed ? '█' : '═', isLed ? t.core : t.frame);
  }
  s.set(ox+10, oy, '╗', t.frameDk);
  // Row 1: slotted ventilation grille
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, '▐', t.frame);
  s.set(ox+4, oy+1, '░', t.vent); s.set(ox+5, oy+1, '█', t.frame);
  s.set(ox+6, oy+1, '░', t.vent); s.set(ox+7, oy+1, '█', t.frame);
  s.set(ox+8, oy+1, '░', t.vent);
  s.set(ox+9, oy+1, '▌', t.frame);
  s.set(ox+10, oy+1, '█', t.frameDk);
  s.set(ox+11, oy+1, '▌', t.shadow);
}

function headBack_intel_i9(s, ox, oy, t, frame) {
  // Premium geometric — multi-LED strip with sweeping glow
  const led = ledSweep(frame, 28, 5);
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i = 4; i <= 8; i++) {
    const dist = Math.abs((i - 4) - led);
    const col = dist === 0 ? t.core : dist === 1 ? t.accent : t.accentDk;
    s.set(ox+i, oy, '═', col);
  }
  s.set(ox+9, oy, '╗', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, '█', t.frame);
  s.set(ox+4, oy+1, '█', coreGlow(frame, 28, t));
  s.set(ox+5, oy+1, '█', coreGlow(frame+7, 28, t));
  s.set(ox+6, oy+1, '█', coreGlow(frame+14, 28, t));
  s.set(ox+7, oy+1, '█', coreGlow(frame+21, 28, t));
  s.set(ox+8, oy+1, '█', t.frame);
  s.set(ox+9, oy+1, '█', t.frameDk);
  s.set(ox+10, oy+1, '▌', t.shadow);
}

function headBack_intel_i7(s, ox, oy, t, frame) {
  // Clean geometric head with LED strip
  const p = cycle(frame, 28, 4);
  const led = [t.accentDk, t.accent, t.core, t.accent][p];
  s.set(ox+4, oy, '╔', t.frameLt);
  s.set(ox+5, oy, '═', t.frame); s.set(ox+6, oy, '═', t.frame);
  s.set(ox+7, oy, '═', t.frame); s.set(ox+8, oy, '╗', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, '█', t.frame);
  s.set(ox+5, oy+1, '█', led); s.set(ox+6, oy+1, '█', led);
  s.set(ox+7, oy+1, '█', led);
  s.set(ox+8, oy+1, '█', t.frame);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_intel_i5(s, ox, oy, t, frame) {
  // Medium geometric with single LED
  const p = cycle(frame, 36, 4);
  const led = p >= 2 ? t.accent : t.accentDk;
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '═', t.frame); s.set(ox+6, oy, '═', t.frame);
  s.set(ox+7, oy, '═', t.frame); s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, '▓', t.vent);
  s.set(ox+5, oy+1, '█', led); s.set(ox+6, oy+1, '▓', t.vent);
  s.set(ox+7, oy+1, '█', led);
  s.set(ox+8, oy+1, '▓', t.vent);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headBack_intel_i3(s, ox, oy, t, frame) {
  // Compact geometric, dim single LED
  const p = cycle(frame, 44, 4);
  const led = p === 2 ? t.accent : t.accentDk;
  s.set(ox+5, oy, '▄', t.frameLt);
  s.set(ox+6, oy, '═', t.frame); s.set(ox+7, oy, '═', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+4, oy+1, '█', t.frameLt);
  s.set(ox+5, oy+1, '▓', t.vent);
  s.set(ox+6, oy+1, '█', led);
  s.set(ox+7, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, '█', t.frameDk);
}

function headBack_apple_pro(s, ox, oy, t, frame) {
  // Smooth rounded with premium thermal detail
  const breath = cycle(frame, 60, 4);
  const v = [t.vent, t.vent, t.ventLt, t.vent][breath];
  s.set(ox+4, oy, '╭', t.frameLt);
  s.set(ox+5, oy, '─', t.frame); s.set(ox+6, oy, '─', t.accent);
  s.set(ox+7, oy, '─', t.frame); s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+3, oy+1, '│', t.frameLt);
  s.set(ox+4, oy+1, '░', v); s.set(ox+5, oy+1, '░', v);
  s.set(ox+6, oy+1, '▪', coreGlow(frame, 50, t));
  s.set(ox+7, oy+1, '░', v); s.set(ox+8, oy+1, '░', v);
  s.set(ox+9, oy+1, '│', t.frameDk);
}

function headBack_apple_base(s, ox, oy, t, frame) {
  // Simple smooth rounded — minimal
  const breath = cycle(frame, 80, 4);
  const v = breath === 2 ? t.ventLt : t.vent;
  s.set(ox+4, oy, '╭', t.frameLt);
  s.set(ox+5, oy, '─', t.frame); s.set(ox+6, oy, '─', t.frame);
  s.set(ox+7, oy, '─', t.frame); s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+3, oy+1, '│', t.frameLt);
  s.set(ox+4, oy+1, ' ');
  s.set(ox+5, oy+1, '░', v); s.set(ox+6, oy+1, '░', v); s.set(ox+7, oy+1, '░', v);
  s.set(ox+8, oy+1, ' ');
  s.set(ox+9, oy+1, '│', t.frameDk);
}

function headBack_celeron(s, ox, oy, t, frame) {
  // Tiny underdog blob with crooked antenna
  const wobble = cycle(frame, 50, 4);
  s.set(ox+5, oy-1, wobble < 2 ? '╻' : '╹', t.accent);
  s.set(ox+5, oy, '▄', t.frameLt); s.set(ox+6, oy, '▄', t.frame);
  s.set(ox+7, oy, '▄', t.frameDk);
  s.set(ox+5, oy+1, '█', t.frameLt);
  s.set(ox+6, oy+1, '▓', t.vent);
  s.set(ox+7, oy+1, '█', t.frameDk);
}

function headBack_generic(s, ox, oy, t, frame) {
  headBack_intel_i5(s, ox, oy, t, frame);
}

// ─── TORSO (back view) — with storage-influenced detailing ───

function torsoBack_flagship(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const breath = cycle(frame, 60, 4);
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+12, r, '▌', t.frameDk);
  for (let row=1;row<=4;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    s.set(ox+3, r+row, '█', t.frame);
    for (let i=4;i<=9;i++) {
      const isTrace = (row + i) % 3 === 0;
      if (isTrace) {
        s.set(ox+i, r+row, stor === 'NVMe' ? '╪' : '┼', t.ventLt);
      } else {
        const sa = storageAccent(frame, stor, i, row);
        if (sa.active) s.set(ox+i, r+row, sa.char, t.data);
        else s.set(ox+i, r+row, ventChar(frame, 60, row * 4 + i), t.vent);
      }
    }
    s.set(ox+10, r+row, '█', t.frame);
    s.set(ox+11, r+row, '█', t.frameDk);
    s.set(ox+12, r+row, '▌', t.shadow);
  }
  s.set(ox+1, r+5, '▐', t.frameLt);
  s.set(ox+2, r+5, '═', t.accent);
  for (let i=3;i<=10;i++) s.set(ox+i, r+5, '█', t.frame);
  s.set(ox+11, r+5, '═', t.accentDk);
  s.set(ox+12, r+5, '▌', t.shadow);
  // Cascading accent spine
  const spinePhase = cycle(frame, 40, 4);
  for (let row=1;row<=4;row++) {
    const active = ((spinePhase + row) % 4) < 2;
    s.set(ox+6, r+row, '║', active ? t.accent : t.accentDk);
    s.set(ox+7, r+row, '║', active ? t.accentDk : t.accent);
  }
  // Power connector + NVMe indicator
  s.set(ox+12, r+2, stor === 'NVMe' ? '▪' : '·', stor === 'NVMe' ? t.core : t.accent);
  s.set(ox+12, r+3, '▪', t.core);
  const dp = dataParticle(frame, ox+6, r, 'flagship');
  if (dp) s.set(ox+6, dp.y, dp.char, t.data);
}

function torsoBack_high(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+12, r, '▌', t.frameDk);
  for (let row=1;row<=4;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=10;i++) {
      const isTrace = (row + i) % 4 === 0;
      if (isTrace) {
        s.set(ox+i, r+row, stor === 'NVMe' ? '═' : '─', stor === 'NVMe' ? t.ventLt : t.ventLt);
      } else {
        const sa = storageAccent(frame, stor, i, row);
        if (sa.active) s.set(ox+i, r+row, sa.char, t.data);
        else s.set(ox+i, r+row, ventChar(frame, 64, row * 3 + i), t.vent);
      }
    }
    s.set(ox+11, r+row, '█', t.frameDk);
    s.set(ox+12, r+row, '▌', t.shadow);
  }
  s.set(ox+1, r+5, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r+5, '█', t.frame);
  s.set(ox+12, r+5, '▌', t.shadow);
  if (stor === 'NVMe') {
    s.set(ox+6, r+1, '║', coreGlow(frame, 44, t));
    s.set(ox+6, r+2, '║', coreGlow(frame+11, 44, t));
  }
  const dp = dataParticle(frame, ox+6, r, 'high');
  if (dp) s.set(ox+6, dp.y, dp.char, t.data);
}

function torsoBack_mid(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+2, r, '▐', t.frameLt);
  for (let i=3;i<=9;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+2, r+row, '▐', t.frameLt);
    s.set(ox+3, r+row, '█', t.frame);
    for (let i=4;i<=8;i++) {
      const sa = storageAccent(frame, stor, i, row);
      if (sa.active) s.set(ox+i, r+row, sa.char, t.data);
      else s.set(ox+i, r+row, ventChar(frame, 68, row * 5 + i), t.vent);
    }
    s.set(ox+9, r+row, '█', t.frameDk);
    s.set(ox+10, r+row, '▌', t.shadow);
  }
  s.set(ox+2, r+4, '▐', t.frameLt);
  for (let i=3;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.shadow);
  // HDD gets a mechanical accent
  if (stor === 'HDD') {
    const gear = cycle(frame, 30, 3);
    s.set(ox+6, r+2, ['·','°','·'][gear], t.vent);
  }
}

function torsoBack_low(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+4, r, '▐', t.frameLt);
  for (let i=5;i<=7;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+8, r, '▌', t.frameDk);
  for (let row=1;row<=2;row++) {
    s.set(ox+4, r+row, '▐', t.frameLt);
    s.set(ox+5, r+row, ventChar(frame, 72, row), t.vent);
    s.set(ox+6, r+row, ventChar(frame, 72, row + 3), t.vent);
    s.set(ox+7, r+row, '█', t.frameDk);
    s.set(ox+8, r+row, '▌', t.shadow);
  }
  s.set(ox+4, r+3, '▐', t.frameLt);
  for (let i=5;i<=7;i++) s.set(ox+i, r+3, '█', t.frame);
  s.set(ox+8, r+3, '▌', t.shadow);
  if (stor === 'HDD') {
    s.set(ox+6, r+1, '·', t.vent);
  }
}

// ─── SHOULDERS (back view — RAM-based, enhanced) ───

function shoulderBack_massive(s, ox, oy, t, frame) {
  const r = oy + 2;
  const glow = coreGlow(frame, 36, t);
  const glow2 = coreGlow(frame + 9, 36, t);
  // Left pauldron — armored with dual data channels
  s.set(ox, r, '╔', t.accent); s.set(ox, r+1, '║', glow); s.set(ox, r+2, '║', glow2); s.set(ox, r+3, '╚', t.accentDk);
  // Right pauldron
  s.set(ox+13, r, '╗', t.accent); s.set(ox+13, r+1, '║', glow); s.set(ox+13, r+2, '║', glow2); s.set(ox+13, r+3, '╝', t.accentDk);
}

function shoulderBack_heavy(s, ox, oy, t, frame) {
  const r = oy + 2;
  const glow = coreGlow(frame, 44, t);
  s.set(ox, r, '▐', t.frameLt); s.set(ox, r+1, '▐', glow);
  s.set(ox+13, r, '▌', t.frameDk); s.set(ox+13, r+1, '▌', glow);
}

function shoulderBack_light(s, ox, oy, t) {
  const r = oy + 2;
  s.set(ox+1, r, '▪', t.accent);
  s.set(ox+12, r, '▪', t.accentDk);
}

function shoulderBack_minimal() { /* bare frame — nothing */ }

// ─── CHEST EMBLEM (back view — brand-specific overlay) ───

function emblemBack_asus_rog(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+6, oy+5, '◉', glow); s.set(ox+7, oy+5, '═', t.accent);
}
function emblemBack_msi(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 32, t);
  s.set(ox+6, oy+5, '▼', glow); s.set(ox+7, oy+5, '▼', t.accentDk);
}
function emblemBack_evga(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 28, t);
  s.set(ox+6, oy+5, '╱', t.accent); s.set(ox+7, oy+5, '╲', glow);
}
function emblemBack_gigabyte(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 34, t);
  s.set(ox+6, oy+5, '◆', glow); s.set(ox+7, oy+5, '◆', t.accentDk);
}
function emblemBack_sapphire(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+6, oy+5, '◇', glow); s.set(ox+7, oy+5, '◆', t.accent);
}
function emblemBack_powercolor(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 26, t);
  s.set(ox+6, oy+5, '▲', glow); s.set(ox+7, oy+5, '▲', t.accentDk);
}
function emblemBack_nvidia_fe(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+6, oy+5, '╲', t.accent); s.set(ox+7, oy+5, '╱', glow);
}
function emblemBack_amd_ref(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 28, t);
  s.set(ox+6, oy+5, '∞', glow);
}
function emblemBack_intel_arc(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 26, t);
  s.set(ox+6, oy+5, '◈', glow); s.set(ox+7, oy+5, '╬', t.accent);
}
function emblemBack_apple(s, ox, oy, t) {
  s.set(ox+6, oy+5, '●', t.accent);
}
function emblemBack_generic(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 40, t);
  s.set(ox+6, oy+5, '╬', glow);
}

// ─── ACCESSORY (back view — specHash-based) ───

function accessoryBack_0() { /* none */ }
function accessoryBack_1(s, ox, oy, t, frame) {
  const pulse = cycle(frame, 40, 2);
  s.set(ox+6, oy-1, '┃', t.frameLt);
  s.set(ox+6, oy-2, pulse ? '◦' : '·', t.accent);
}
function accessoryBack_2(s, ox, oy, t) {
  s.set(ox+4, oy, '▬', t.accent); s.set(ox+5, oy, '▬', t.accent);
  s.set(ox+8, oy, '▬', t.accentDk); s.set(ox+9, oy, '▬', t.accentDk);
}
function accessoryBack_3(s, ox, oy, t) {
  s.set(ox+3, oy-1, '╱', t.accent); s.set(ox+10, oy-1, '╲', t.accentDk);
}
function accessoryBack_4(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 24, t);
  s.set(ox+10, oy, '◦', glow);
}
function accessoryBack_5(s, ox, oy, t) {
  s.set(ox+11, oy+1, '≈', t.vent); s.set(ox+12, oy+1, '~', t.vent);
}

// ─── GPU ARM/WEAPON (back view — 18 variants) ───

// === NVIDIA family: cannon/rifle motif ===

function gpuBack_nvidiaFlagship(s, ox, oy, t, frame) {
  // MASSIVE triple-fan cannon with NVLink bridge and vapor chamber — 5090/4090/3090/Titan
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 20, t);
  // NVLink bridge
  s.set(c+1, r-1, '═', t.accent); s.set(c+2, r-1, '▪', fg);
  s.set(c+3, r-1, '═', t.accent); s.set(c+4, r-1, '▪', coreGlow(frame+10, 20, t));
  // Top housing
  s.set(c, r, '╠', t.frameLt);
  for (let i=1;i<=6;i++) s.set(c+i, r, '═', t.frame);
  s.set(c+7, r, '╗', t.frameDk);
  // Fan row 1 — triple fans, fast spin
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 20, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 20, 5), fg);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, fanChar(frame, 20, 10), fg);
  s.set(c+6,r+1, '▓', t.vent);
  s.set(c+7,r+1, '║', t.frameDk);
  s.set(c+8,r+1, '▌', t.shadow);
  // Barrel mid — vapor chamber core
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '▓', t.vent); s.set(c+2,r+2, '█', t.frame);
  s.set(c+3,r+2, '█', fg); s.set(c+4,r+2, '█', fg);
  s.set(c+5,r+2, '█', t.frame); s.set(c+6,r+2, '▓', t.vent);
  s.set(c+7,r+2, '║', t.frameDk);
  s.set(c+8,r+2, '►', fg); // muzzle
  // Fan row 2 — reversed phase
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, fanChar(frame, 20, 10), coreGlow(frame+10, 20, t));
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, fanChar(frame, 20, 15), coreGlow(frame+10, 20, t));
  s.set(c+4,r+3, '▓', t.vent);
  s.set(c+5,r+3, fanChar(frame, 20, 0), coreGlow(frame+10, 20, t));
  s.set(c+6,r+3, '▓', t.vent);
  s.set(c+7,r+3, '║', t.frameDk);
  s.set(c+8,r+3, '▌', t.shadow);
  // Bottom housing
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=6;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+7, r+4, '╝', t.frameDk);
  // Triple exhaust vents
  s.set(c+2,r+5, ventChar(frame, 16, 0), t.vent);
  s.set(c+3,r+5, ventChar(frame, 16, 4), t.vent);
  s.set(c+4,r+5, ventChar(frame, 16, 8), t.vent);
  s.set(c+5,r+5, ventChar(frame, 16, 12), t.vent);
}

function gpuBack_nvidiaEnthusiast(s, ox, oy, t, frame) {
  // Large triple-fan with backplate accent — 5080/4080/3080
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 24, t);
  // Backplate accent
  s.set(c+1, r-1, '═', t.accent); s.set(c+2, r-1, '▪', fg); s.set(c+3, r-1, '═', t.accent);
  s.set(c, r, '╠', t.frameLt);
  for (let i=1;i<=5;i++) s.set(c+i, r, '═', t.frame);
  s.set(c+6, r, '╗', t.frameDk);
  // Fan row — triple fans
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 24, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 24, 6), fg);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, fanChar(frame, 24, 12), fg);
  s.set(c+6,r+1, '║', t.frameDk);
  s.set(c+7,r+1, '▌', t.shadow);
  // Core
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '▓', t.vent); s.set(c+2,r+2, '█', t.frame);
  s.set(c+3,r+2, '█', fg);
  s.set(c+4,r+2, '█', t.frame); s.set(c+5,r+2, '▓', t.vent);
  s.set(c+6,r+2, '║', t.frameDk);
  s.set(c+7,r+2, '►', fg);
  // Fan row 2
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, fanChar(frame, 24, 12), coreGlow(frame+12, 24, t));
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, fanChar(frame, 24, 18), coreGlow(frame+12, 24, t));
  s.set(c+4,r+3, '▓', t.vent);
  s.set(c+5,r+3, fanChar(frame, 24, 0), coreGlow(frame+12, 24, t));
  s.set(c+6,r+3, '║', t.frameDk);
  s.set(c+7,r+3, '▌', t.shadow);
  // Bottom
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=5;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+6, r+4, '╝', t.frameDk);
  // Exhaust
  s.set(c+2,r+5, ventChar(frame, 20, 0), t.vent);
  s.set(c+3,r+5, ventChar(frame, 20, 5), t.vent);
  s.set(c+4,r+5, ventChar(frame, 20, 10), t.vent);
}

function gpuBack_nvidiaPerformance(s, ox, oy, t, frame) {
  // Dual-fan rifle with heat sink fins — 5070Ti/4070Ti/3070Ti
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 26, t);
  s.set(c, r, '╠', t.frameLt);
  for (let i=1;i<=4;i++) s.set(c+i, r, '═', t.frame);
  s.set(c+5, r, '╗', t.frameDk);
  // Heat sink fin detail on top
  s.set(c+1, r, '╤', t.frame); s.set(c+4, r, '╤', t.frame);
  // Fan row — dual fans
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 26, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 26, 7), fg);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, '║', t.frameDk);
  s.set(c+6,r+1, '▌', t.shadow);
  // Core with pipe detail
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.frame);
  s.set(c+2,r+2, '█', fg);
  s.set(c+3,r+2, '█', t.frame);
  s.set(c+4,r+2, '─', t.vent);
  s.set(c+5,r+2, '║', t.frameDk);
  s.set(c+6,r+2, '►', fg);
  // Fan row 2
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, fanChar(frame, 26, 13), coreGlow(frame+13, 26, t));
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, fanChar(frame, 26, 20), coreGlow(frame+13, 26, t));
  s.set(c+4,r+3, '▓', t.vent);
  s.set(c+5,r+3, '║', t.frameDk);
  s.set(c+6,r+3, '▌', t.shadow);
  // Bottom
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=4;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+5, r+4, '╝', t.frameDk);
}

function gpuBack_nvidiaMainstream(s, ox, oy, t, frame) {
  // Compact dual-fan — 5070/4070/3070/2080
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 28, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 28, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 28, 7), fg);
  s.set(c+4,r+1, '║', t.frameDk);
  s.set(c+5,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.frame);
  s.set(c+2,r+2, '█', fg);
  s.set(c+3,r+2, '█', t.frame);
  s.set(c+4,r+2, '║', t.frameDk);
  s.set(c+5,r+2, '►', fg);
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, fanChar(frame, 28, 14), coreGlow(frame+14, 28, t));
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, fanChar(frame, 28, 21), coreGlow(frame+14, 28, t));
  s.set(c+4,r+3, '║', t.frameDk);
  s.set(c+5,r+3, '▌', t.shadow);
  s.set(c, r+4, '╚', t.frameLt);
  for (let i=1;i<=3;i++) s.set(c+i, r+4, '═', t.frame);
  s.set(c+4, r+4, '╝', t.frameDk);
}

function gpuBack_nvidiaValue(s, ox, oy, t, frame) {
  // Compact dual-fan blower — 4060Ti/3060Ti/2070/1080Ti
  const r = oy + 3;  const c = ox + 11;
  const fg = coreGlow(frame, 30, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 30, 0), fg);
  s.set(c+2,r+1, '█', t.frame);
  s.set(c+3,r+1, fanChar(frame, 30, 8), fg);
  s.set(c+4,r+1, '║', t.frameDk);
  s.set(c+5,r+1, '▌', t.shadow);
  // Simpler core
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '▓', t.vent);
  s.set(c+2,r+2, '█', fg);
  s.set(c+3,r+2, '▓', t.vent);
  s.set(c+4,r+2, '║', t.frameDk);
  s.set(c+5,r+2, '►', t.accent);
  s.set(c, r+3, '╚', t.frameLt);
  for (let i=1;i<=3;i++) s.set(c+i, r+3, '═', t.frame);
  s.set(c+4, r+3, '╝', t.frameDk);
}

function gpuBack_nvidiaEntry(s, ox, oy, t, frame) {
  // Single-fan small housing — 4060/3060/2060/1660/1650
  const r = oy + 4;  const c = ox + 10;
  const fg = coreGlow(frame, 34, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.frame); s.set(c+2,r, '═', t.frame); s.set(c+3,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 34, 0), fg);
  s.set(c+2,r+1, '█', t.frame);
  s.set(c+3,r+1, '║', t.frameDk);
  s.set(c+4,r+1, '►', t.accent);
  s.set(c, r+2, '╚', t.frameLt);
  s.set(c+1,r+2, '═', t.frame); s.set(c+2,r+2, '═', t.frame); s.set(c+3,r+2, '╝', t.frameDk);
}

function gpuBack_nvidiaBudget(s, ox, oy, t) {
  // Passive heatsink stub — GT 1030/730, no fans
  const r = oy + 5;  const c = ox + 9;
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '░', t.vent); s.set(c+2,r, '╗', t.frameDk);
  s.set(c, r+1, '╚', t.frameLt);
  s.set(c+1,r+1, '░', t.vent); s.set(c+2,r+1, '╝', t.frameDk);
}

// === AMD family: angular blade motif ===

function gpuBack_amdFlagship(s, ox, oy, t, frame) {
  // Massive blade with triple fans + exposed heat pipe curves — 9070XTX/7900XTX/Radeon VII
  const r = oy + 2;  const c = ox + 12;
  const fg = coreGlow(frame, 18, t);
  // Blade tip
  s.set(c+4, r, '╱', t.accent); s.set(c+5, r, '▄', t.accent); s.set(c+6, r, '▄', t.accentDk);
  // Upper blade with fans
  s.set(c, r+1, '╠', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 18, 0), fg);
  s.set(c+2,r+1, '─', t.vent);
  s.set(c+3,r+1, fanChar(frame, 18, 5), fg);
  s.set(c+4,r+1, '═', t.accent);
  s.set(c+5,r+1, '█', t.accent); s.set(c+6,r+1, '▌', t.shadow);
  // Core blade rows with heat pipe curves
  for (let row=2;row<=4;row++) {
    s.set(c, r+row, '║', t.frameLt);
    s.set(c+1,r+row, row===3?'█':'▒', row===3?fg:t.vent);
    s.set(c+2,r+row, row===3?'█':row===2?'╮':'╯', row===3?fg:t.vent);
    s.set(c+3,r+row, '█', t.accent);
    s.set(c+4,r+row, '█', row===3?fg:t.accent);
    s.set(c+5,r+row, '█', t.accentDk);
    s.set(c+6,r+row, '▌', t.shadow);
  }
  // Heat pipes
  s.set(c, r+5, '║', t.frameLt);
  s.set(c+1,r+5, '─', t.vent); s.set(c+2,r+5, '─', t.vent);
  s.set(c+3,r+5, '─', t.vent); s.set(c+4,r+5, '═', t.accent);
  s.set(c+5,r+5, '▀', t.accentDk);
  // Lower blade taper
  s.set(c, r+6, '╚', t.frameLt);
  s.set(c+1,r+6, '═', t.frame); s.set(c+2,r+6, '═', t.accent);
  s.set(c+3,r+6, '▀', t.accentDk);
  // Exhaust below heat pipes
  s.set(c+1,r+7, ventChar(frame, 14, 0), t.vent);
  s.set(c+2,r+7, ventChar(frame, 14, 4), t.vent);
}

function gpuBack_amdEnthusiast(s, ox, oy, t, frame) {
  // Triple-fan angular arm with accent stripes — 9070XT/7900XT/6900XT
  const r = oy + 2;  const c = ox + 12;
  const fg = coreGlow(frame, 20, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '═', t.frame);
  s.set(c+5,r, '═', t.accent); s.set(c+6,r, '╗', t.frameDk);
  // Fan row 1 — triple fans
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 20, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 20, 5), fg);
  s.set(c+4,r+1, '▓', t.vent);
  s.set(c+5,r+1, fanChar(frame, 20, 10), fg);
  s.set(c+6,r+1, '║', t.frameDk);
  s.set(c+7,r+1, '▌', t.shadow);
  // Backplate
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '─', t.vent); s.set(c+2,r+2, '█', t.accent);
  s.set(c+3,r+2, '█', fg);
  s.set(c+4,r+2, '█', t.accent); s.set(c+5,r+2, '─', t.vent);
  s.set(c+6,r+2, '║', t.frameDk);
  s.set(c+7,r+2, '▌', t.shadow);
  // Accent stripe
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '▓', t.vent);
  s.set(c+2,r+3, '═', t.accent); s.set(c+3,r+3, '═', t.accent);
  s.set(c+4,r+3, '═', t.accent); s.set(c+5,r+3, '▓', t.vent);
  s.set(c+6,r+3, '║', t.frameDk);
  s.set(c+7,r+3, '►', fg);
  // Fan row 2
  s.set(c, r+4, '║', t.frameLt);
  s.set(c+1,r+4, fanChar(frame, 20, 10), coreGlow(frame+10, 20, t));
  s.set(c+2,r+4, '▓', t.vent);
  s.set(c+3,r+4, fanChar(frame, 20, 15), coreGlow(frame+10, 20, t));
  s.set(c+4,r+4, '▓', t.vent);
  s.set(c+5,r+4, fanChar(frame, 20, 0), coreGlow(frame+10, 20, t));
  s.set(c+6,r+4, '║', t.frameDk);
  s.set(c+7,r+4, '▌', t.shadow);
  // Bottom
  s.set(c, r+5, '╚', t.frameLt);
  for (let i=1;i<=5;i++) s.set(c+i, r+5, '═', t.frame);
  s.set(c+6, r+5, '╝', t.frameDk);
  // Exhaust
  s.set(c+2,r+6, ventChar(frame, 18, 0), t.vent);
  s.set(c+3,r+6, ventChar(frame, 18, 4), t.vent);
  s.set(c+4,r+6, ventChar(frame, 18, 9), t.vent);
}

function gpuBack_amdPerformance(s, ox, oy, t, frame) {
  // Dual-fan medium blade — 7800XT/6800XT
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 24, t);
  // Angular blade tip
  s.set(c+3, r-1, '╱', t.accent); s.set(c+4, r-1, '▄', t.accentDk);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '╗', t.frameDk);
  // Dual fans
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 24, 0), fg);
  s.set(c+2,r+1, '▓', t.vent);
  s.set(c+3,r+1, fanChar(frame, 24, 6), fg);
  s.set(c+4,r+1, '║', t.frameDk);
  s.set(c+5,r+1, '▌', t.shadow);
  // Core with accent
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.accent); s.set(c+2,r+2, '█', fg);
  s.set(c+3,r+2, '█', t.accent);
  s.set(c+4,r+2, '║', t.frameDk);
  s.set(c+5,r+2, '►', fg);
  // Fan row 2
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, fanChar(frame, 24, 12), coreGlow(frame+12, 24, t));
  s.set(c+2,r+3, '▓', t.vent);
  s.set(c+3,r+3, fanChar(frame, 24, 18), coreGlow(frame+12, 24, t));
  s.set(c+4,r+3, '║', t.frameDk);
  s.set(c+5,r+3, '▌', t.shadow);
  // Bottom taper
  s.set(c, r+4, '╚', t.frameLt);
  s.set(c+1,r+4, '═', t.accent); s.set(c+2,r+4, '═', t.frame);
  s.set(c+3,r+4, '▀', t.accentDk);
}

function gpuBack_amdMainstream(s, ox, oy, t, frame) {
  // Compact dual-fan blade — 7700XT/6700XT/6600XT
  const r = oy + 3;  const c = ox + 11;
  const fg = coreGlow(frame, 28, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '═', t.frame);
  s.set(c+3,r, '═', t.frame); s.set(c+4,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 28, 0), fg);
  s.set(c+2,r+1, '█', t.accent);
  s.set(c+3,r+1, fanChar(frame, 28, 7), fg);
  s.set(c+4,r+1, '║', t.frameDk);
  s.set(c+5,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '▓', t.vent); s.set(c+2,r+2, '█', fg);
  s.set(c+3,r+2, '▓', t.vent);
  s.set(c+4,r+2, '║', t.frameDk);
  s.set(c+5,r+2, '►', t.accent);
  s.set(c, r+3, '╚', t.frameLt);
  s.set(c+1,r+3, '═', t.accent); s.set(c+2,r+3, '═', t.frame);
  s.set(c+3,r+3, '═', t.frame); s.set(c+4,r+3, '╝', t.frameDk);
}

function gpuBack_amdEntry(s, ox, oy, t, frame) {
  // Single-fan small blade stub — 7600/6600/6500XT
  const r = oy + 4;  const c = ox + 10;
  const fg = coreGlow(frame, 32, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '▄', t.accentDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, fanChar(frame, 32, 0), fg);
  s.set(c+2,r+1, '█', t.accent);
  s.set(c+3,r+1, '►', t.accent);
  s.set(c, r+2, '╚', t.frameLt); s.set(c+1,r+2, '═', t.frame); s.set(c+2,r+2, '▀', t.accent);
}

function gpuBack_amdLegacy(s, ox, oy, t, frame) {
  // Retro blower style — RX 580/570/480/Vega — single centered blower wheel
  const r = oy + 4;  const c = ox + 10;
  const fg = coreGlow(frame, 36, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '═', t.accent); s.set(c+2,r, '═', t.frame); s.set(c+3,r, '╗', t.frameDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '▓', t.vent);
  s.set(c+2,r+1, fanChar(frame, 36, 0), fg);
  s.set(c+3,r+1, '║', t.frameDk);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '═', t.accent);
  s.set(c+2,r+2, ventChar(frame, 30, 0), t.vent);
  s.set(c+3,r+2, '║', t.frameDk);
  s.set(c+4,r+2, '▌', t.shadow);
  s.set(c, r+3, '╚', t.frameLt);
  s.set(c+1,r+3, '═', t.frame); s.set(c+2,r+3, '═', t.frame); s.set(c+3,r+3, '╝', t.frameDk);
}

// === Intel Arc family: crystalline/geometric motif ===

function gpuBack_intelArcHigh(s, ox, oy, t, frame) {
  // Full crystalline arm with alternating gem pattern — A770
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 22, t);
  const fg2 = coreGlow(frame + 11, 22, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '▄', t.accent); s.set(c+2,r, '△', t.accent);
  s.set(c+3,r, '▄', t.accentDk); s.set(c+4,r, '▄', t.accent);
  // Gem rows
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◇', fg); s.set(c+2,r+1, '█', t.accent);
  s.set(c+3,r+1, '◇', fg2); s.set(c+4,r+1, '█', t.accentDk);
  s.set(c+5,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.accent); s.set(c+2,r+2, '◆', fg);
  s.set(c+3,r+2, '█', t.accent); s.set(c+4,r+2, '◆', fg2);
  s.set(c+5,r+2, '▌', t.shadow);
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '◇', fg2); s.set(c+2,r+3, '█', t.accent);
  s.set(c+3,r+3, '◇', fg);
  s.set(c, r+4, '╚', t.frameLt);
  s.set(c+1,r+4, '▀', t.accent); s.set(c+2,r+4, '▽', t.accent);
  s.set(c+3,r+4, '▀', t.accentDk); s.set(c+4,r+4, '▀', t.accent);
}

function gpuBack_intelArcMid(s, ox, oy, t, frame) {
  // Medium crystal — A750/A580
  const r = oy + 3;  const c = ox + 12;
  const fg = coreGlow(frame, 22, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '▄', t.accent); s.set(c+2,r, '△', t.accent); s.set(c+3,r, '▄', t.accentDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◇', fg);
  s.set(c+2,r+1, '█', t.accent);
  s.set(c+3,r+1, '◇', coreGlow(frame+11, 22, t));
  s.set(c+4,r+1, '▌', t.shadow);
  s.set(c, r+2, '║', t.frameLt);
  s.set(c+1,r+2, '█', t.accent);
  s.set(c+2,r+2, '◆', fg);
  s.set(c+3,r+2, '█', t.accentDk);
  s.set(c+4,r+2, '▌', t.shadow);
  s.set(c, r+3, '║', t.frameLt);
  s.set(c+1,r+3, '◇', coreGlow(frame+11, 22, t));
  s.set(c+2,r+3, '█', t.accent);
  s.set(c+3,r+3, '◇', fg);
  s.set(c, r+4, '╚', t.frameLt);
  s.set(c+1,r+4, '▀', t.accent); s.set(c+2,r+4, '▽', t.accent); s.set(c+3,r+4, '▀', t.accentDk);
}

function gpuBack_intelArcLow(s, ox, oy, t, frame) {
  // Small crystal shard — A380/A310
  const r = oy + 4;  const c = ox + 10;
  const fg = coreGlow(frame, 26, t);
  s.set(c, r, '╠', t.frameLt);
  s.set(c+1,r, '▄', t.accent); s.set(c+2,r, '▄', t.accentDk);
  s.set(c, r+1, '║', t.frameLt);
  s.set(c+1,r+1, '◆', fg); s.set(c+2,r+1, '█', t.accent);
  s.set(c, r+2, '╚', t.frameLt);
  s.set(c+1,r+2, '▀', t.accent); s.set(c+2,r+2, '▀', t.accentDk);
}

function gpuBack_apple(s, ox, oy, t, frame) {
  // Smooth minimal pod — unified SoC
  const r = oy + 4;  const c = ox + 10;
  const glow = coreGlow(frame, 40, t);
  s.set(c, r, '╭', t.frameLt); s.set(c+1,r, '─', t.frame); s.set(c+2,r, '╮', t.frameDk);
  s.set(c, r+1, '│', t.frameLt); s.set(c+1,r+1, '○', glow); s.set(c+2,r+1, '│', t.frameDk);
  s.set(c, r+2, '╰', t.frameLt); s.set(c+1,r+2, '─', t.frame); s.set(c+2,r+2, '╯', t.frameDk);
}

function gpuBack_integrated(s, ox, oy, t) {
  // Tiny stub — no discrete GPU
  const r = oy + 5;  const c = ox + 8;
  s.set(c, r, '▪', t.vent);
}

// ─── LEGS (back view) — with RAM reinforcement & storage animation ───

function legsBack_nvme(s, ox, oy, t, frame, hw) {
  const r = oy + 8;
  const ram = hw ? hw.ram : 'light';
  // Thruster-style angular legs
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+5, r, '▀', t.accent);
  s.set(ox+8, r, '▀', t.accent);
  s.set(ox+9, r, '█', t.leg); s.set(ox+10, r, '▀', t.frame);
  // Thruster exhaust — fastest animation
  s.set(ox+4, r+1, ventChar(frame, 14, 0), t.accent);
  s.set(ox+5, r+1, ventChar(frame, 14, 4), t.accentDk);
  s.set(ox+8, r+1, ventChar(frame, 14, 8), t.accentDk);
  s.set(ox+9, r+1, ventChar(frame, 14, 12), t.accent);
  s.set(ox+4, r+2, '▀', t.leg); s.set(ox+9, r+2, '▀', t.leg);
  // RAM reinforcement: DIMM indicators on legs
  if (ram === 'massive') {
    s.set(ox+3, r+1, '▪', coreGlow(frame, 30, t));
    s.set(ox+10, r+1, '▪', coreGlow(frame+8, 30, t));
    s.set(ox+5, r+2, '▪', coreGlow(frame+15, 30, t));
    s.set(ox+8, r+2, '▪', coreGlow(frame+23, 30, t));
  } else if (ram === 'heavy') {
    s.set(ox+3, r+1, '·', coreGlow(frame, 40, t));
    s.set(ox+10, r+1, '·', coreGlow(frame+10, 40, t));
  } else if (ram === 'light') {
    s.set(ox+5, r+2, '·', t.accentDk);
  }
}

function legsBack_ssd(s, ox, oy, t, frame, hw) {
  const r = oy + 8;
  const ram = hw ? hw.ram : 'light';
  const ledOn = cycle(frame, 80, 4) === 0;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg); s.set(ox+5, r, '▀', t.frame);
  s.set(ox+8, r, '▀', t.frame); s.set(ox+9, r, '█', t.leg); s.set(ox+10, r, '▀', t.frame);
  s.set(ox+4, r+1, '█', t.leg); s.set(ox+9, r+1, '█', t.leg);
  s.set(ox+4, r+2, '▀', t.leg); s.set(ox+9, r+2, '▀', t.leg);
  // SSD LED
  s.set(ox+5, r+1, '·', ledOn ? t.accent : t.vent);
  // RAM reinforcement
  if (ram === 'massive') {
    s.set(ox+3, r+1, '▐', coreGlow(frame, 34, t));
    s.set(ox+10, r+1, '▌', coreGlow(frame+8, 34, t));
    s.set(ox+5, r+2, '▪', coreGlow(frame+17, 34, t));
    s.set(ox+8, r+2, '▪', coreGlow(frame+25, 34, t));
  } else if (ram === 'heavy') {
    s.set(ox+3, r+1, '·', coreGlow(frame, 44, t));
    s.set(ox+10, r+1, '·', coreGlow(frame+11, 44, t));
  } else if (ram === 'light') {
    s.set(ox+8, r+1, '·', t.accentDk);
  }
}

function legsBack_hdd(s, ox, oy, t, frame, hw) {
  const r = oy + 8;
  const ram = hw ? hw.ram : 'light';
  const platter = cycle(frame, 30, 3);
  const pc = ['°', '·', '○'][platter];
  // Chunky heavy legs
  s.set(ox+2, r, '▀', t.frame); s.set(ox+3, r, '█', t.leg);
  s.set(ox+4, r, '█', t.leg); s.set(ox+5, r, '▀', t.frame);
  s.set(ox+8, r, '▀', t.frame); s.set(ox+9, r, '█', t.leg);
  s.set(ox+10, r, '█', t.leg); s.set(ox+11, r, '▀', t.frame);
  s.set(ox+3, r+1, '█', t.leg); s.set(ox+4, r+1, '█', t.leg);
  s.set(ox+9, r+1, '█', t.leg); s.set(ox+10, r+1, '█', t.leg);
  s.set(ox+3, r+2, '▀', t.leg); s.set(ox+4, r+2, '▀', t.leg);
  s.set(ox+9, r+2, '▀', t.leg); s.set(ox+10, r+2, '▀', t.leg);
  // Platter spin indicator
  s.set(ox+3, r+1, pc, t.vent);
  s.set(ox+10, r+1, pc, t.vent);
  // RAM reinforcement
  if (ram === 'massive') {
    s.set(ox+2, r+1, '▐', coreGlow(frame, 36, t));
    s.set(ox+11, r+1, '▌', coreGlow(frame+9, 36, t));
  } else if (ram === 'heavy') {
    s.set(ox+5, r+1, '·', coreGlow(frame, 48, t));
    s.set(ox+8, r+1, '·', coreGlow(frame+12, 48, t));
  }
}


// ═══════════════════════════════════════════════════════════════
// §4  FRONT VIEW COMPONENTS (opponent — top-right, smaller)
// ═══════════════════════════════════════════════════════════════

// ─── CPU HEADS (front view — with eye expression system, 14 variants) ───

function headFront_threadripper(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 120, 'wide');
  const eblink = eyeState(frame, 120) === 'blink';
  s.set(ox+1, oy, '▄', t.accent); s.set(ox+2, oy, '▄', t.frameLt);
  for (let i=3;i<=8;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+9, oy, '▄', t.frameDk); s.set(ox+10, oy, '▄', t.accentDk);
  s.set(ox+1, oy+1, '█', t.accent);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '▒', t.accent); s.set(ox+5, oy+1, '▒', t.core);
  s.set(ox+6, oy+1, '▒', t.core); s.set(ox+7, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
  s.set(ox+10, oy+1, '█', t.accentDk);
}

function headFront_ryzen9(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 125, 'sharp');
  const eblink = eyeState(frame, 125) === 'blink';
  const rgbPhase = cycle(frame, 40, 4);
  const rgbCol = [t.accent, t.core, t.coreMed, t.accent][rgbPhase];
  s.set(ox+2, oy, '▄', rgbCol); s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk); s.set(ox+9, oy, '▄', rgbCol);
  s.set(ox+1, oy+1, '█', t.frameLt); s.set(ox+2, oy+1, '█', t.frame);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '▒', t.accent); s.set(ox+5, oy+1, '▒', t.accent);
  s.set(ox+6, oy+1, '▒', t.accent); s.set(ox+7, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frame); s.set(ox+10, oy+1, '█', t.frameDk);
}

function headFront_ryzen7(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 130, 'sharp');
  const eblink = eyeState(frame, 130) === 'blink';
  s.set(ox+2, oy, '▄', t.accent); s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk); s.set(ox+9, oy, '▄', t.accentDk);
  s.set(ox+1, oy+1, '█', t.frameLt); s.set(ox+2, oy+1, '█', t.frame);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '▒', t.accent); s.set(ox+5, oy+1, '▒', t.accent);
  s.set(ox+6, oy+1, '▒', t.accent); s.set(ox+7, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frame); s.set(ox+10, oy+1, '█', t.frameDk);
}

function headFront_ryzen5(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 135, 'sharp');
  const eblink = eyeState(frame, 135) === 'blink';
  s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  for (let i=4;i<=7;i++) s.set(ox+i, oy+1, '▒', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_ryzen3(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 140, 'sharp');
  const eblink = eyeState(frame, 140) === 'blink';
  s.set(ox+4, oy, '▄', t.frameLt);
  for (let i=5;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+5, oy+1, '▒', t.accent); s.set(ox+6, oy+1, '▒', t.accent);
  s.set(ox+7, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+8, oy+1, '█', t.frameDk);
}

function headFront_xeon(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 120, 'slit');
  const eblink = eyeState(frame, 120) === 'blink';
  const led = ledSweep(frame, 36, 5);
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i=4;i<=8;i++) {
    const isLed = (i - 4) === led;
    s.set(ox+i, oy, isLed ? '█' : '═', isLed ? t.core : t.frame);
  }
  s.set(ox+9, oy, '╗', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '░', t.vent); s.set(ox+5, oy+1, '█', t.frame);
  s.set(ox+6, oy+1, '░', t.vent); s.set(ox+7, oy+1, '█', t.frame);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intel_i9(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 125, 'diamond');
  const eblink = eyeState(frame, 125) === 'blink';
  const led = ledSweep(frame, 28, 5);
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i=4;i<=8;i++) {
    const dist = Math.abs((i - 4) - led);
    s.set(ox+i, oy, '═', dist === 0 ? t.core : dist === 1 ? t.accent : t.frame);
  }
  s.set(ox+9, oy, '╗', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '█', t.accent); s.set(ox+5, oy+1, '█', t.accent);
  s.set(ox+6, oy+1, '█', t.accent); s.set(ox+7, oy+1, '█', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intel_i7(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 125, 'diamond');
  const eblink = eyeState(frame, 125) === 'blink';
  s.set(ox+3, oy, '╔', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '═', t.frame);
  s.set(ox+8, oy, '╗', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+4, oy+1, '█', t.accent); s.set(ox+5, oy+1, '█', t.accent);
  s.set(ox+6, oy+1, '█', t.accent); s.set(ox+7, oy+1, '█', t.accent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intel_i5(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 140, 'diamond');
  const eblink = eyeState(frame, 140) === 'blink';
  s.set(ox+3, oy, '▄', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+8, oy, '▄', t.frameDk);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.eye);
  for (let i=4;i<=7;i++) s.set(ox+i, oy+1, '▓', t.vent);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+9, oy+1, '█', t.frameDk);
}

function headFront_intel_i3(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 150, 'diamond');
  const eblink = eyeState(frame, 150) === 'blink';
  s.set(ox+4, oy, '▄', t.frameLt);
  s.set(ox+5, oy, '▄', t.frame); s.set(ox+6, oy, '▄', t.frame);
  s.set(ox+7, oy, '▄', t.frameDk);
  s.set(ox+3, oy+1, '█', t.frameLt);
  s.set(ox+4, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+5, oy+1, '▓', t.vent); s.set(ox+6, oy+1, '▓', t.vent);
  s.set(ox+7, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+8, oy+1, '█', t.frameDk);
}

function headFront_apple_pro(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 145, 'round');
  const eblink = eyeState(frame, 145) === 'blink';
  s.set(ox+3, oy, '╭', t.frameLt);
  s.set(ox+4, oy, '─', t.frame); s.set(ox+5, oy, '─', t.accent);
  s.set(ox+6, oy, '─', t.accent); s.set(ox+7, oy, '─', t.frame);
  s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+2, oy+1, '│', t.frameLt); s.set(ox+3, oy+1, ' ');
  s.set(ox+4, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+5, oy+1, ' '); s.set(ox+6, oy+1, ' ');
  s.set(ox+7, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+8, oy+1, ' '); s.set(ox+9, oy+1, '│', t.frameDk);
}

function headFront_apple_base(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 150, 'round');
  const eblink = eyeState(frame, 150) === 'blink';
  s.set(ox+3, oy, '╭', t.frameLt);
  for (let i=4;i<=7;i++) s.set(ox+i, oy, '─', t.frame);
  s.set(ox+8, oy, '╮', t.frameDk);
  s.set(ox+2, oy+1, '│', t.frameLt); s.set(ox+3, oy+1, ' ');
  s.set(ox+4, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+5, oy+1, ' '); s.set(ox+6, oy+1, ' ');
  s.set(ox+7, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+8, oy+1, ' '); s.set(ox+9, oy+1, '│', t.frameDk);
}

function headFront_celeron(s, ox, oy, t, frame) {
  const ec = eyeChar(frame, 160, 'dot');
  const eblink = eyeState(frame, 160) === 'blink';
  const wobble = cycle(frame, 50, 4);
  s.set(ox+5, oy-1, wobble < 2 ? '╻' : '╹', t.accent);
  s.set(ox+4, oy, '▄', t.frameLt); s.set(ox+5, oy, '▄', t.frame);
  s.set(ox+6, oy, '▄', t.frame); s.set(ox+7, oy, '▄', t.frameDk);
  s.set(ox+4, oy+1, '█', t.frameLt);
  s.set(ox+5, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+6, oy+1, ec, eblink ? t.frame : t.eye);
  s.set(ox+7, oy+1, '█', t.frameDk);
}

function headFront_generic(s, ox, oy, t, frame) {
  headFront_intel_i5(s, ox, oy, t, frame);
}

// ─── TORSO FRONT — with storage breathing ───

function torsoFront_flagship(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=8;i++) {
      const isTrace = (row + i) % 3 === 0;
      if (isTrace) {
        s.set(ox+i, r+row, stor === 'NVMe' ? '╪' : '┼', t.ventLt);
      } else {
        s.set(ox+i, r+row, ventChar(frame, 60, row * 4 + i), t.vent);
      }
    }
    s.set(ox+9, r+row, '█', t.frame);
    s.set(ox+10, r+row, '▌', t.frameDk);
  }
  // Accent spine
  const sp = cycle(frame, 36, 4);
  s.set(ox+5, r+1, '║', ((sp+1)%4)<2?t.accent:t.accentDk);
  s.set(ox+6, r+1, '║', ((sp+1)%4)<2?t.accentDk:t.accent);
  s.set(ox+5, r+2, '║', ((sp+2)%4)<2?t.accent:t.accentDk);
  s.set(ox+6, r+2, '║', ((sp+2)%4)<2?t.accentDk:t.accent);
  // Belt
  s.set(ox+1, r+4, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.frameDk);
}

function torsoFront_high(s, ox, oy, t, frame, hw) {
  const r = oy + 2;
  const stor = hw ? hw.storage : 'SSD';
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=8;i++) {
      const isTrace = (row + i) % 4 === 0;
      if (isTrace) {
        s.set(ox+i, r+row, stor === 'NVMe' ? '═' : '─', t.ventLt);
      } else {
        s.set(ox+i, r+row, ventChar(frame, 64, row * 3 + i), t.vent);
      }
    }
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
    for (let i=4;i<=7;i++) s.set(ox+i, r+row, ventChar(frame, 68, row * 5 + i), t.vent);
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
  s.set(ox+5, r+1, ventChar(frame, 72, 0), t.vent);
  s.set(ox+6, r+1, ventChar(frame, 72, 3), t.vent);
  s.set(ox+7, r+1, '▌', t.frameDk);
  s.set(ox+4, r+2, '▐', t.frameLt);
  s.set(ox+5, r+2, '█', t.frame); s.set(ox+6, r+2, '█', t.frame);
  s.set(ox+7, r+2, '▌', t.shadow);
}

// ─── SHOULDERS FRONT ───

function shoulderFront_massive(s, ox, oy, t, frame) {
  const r = oy + 2;
  const glow = coreGlow(frame, 36, t);
  s.set(ox, r, '╔', t.accent); s.set(ox, r+1, '║', glow);
  s.set(ox+11, r, '╗', t.accent); s.set(ox+11, r+1, '║', glow);
}
function shoulderFront_heavy(s, ox, oy, t) {
  const r = oy + 2;
  s.set(ox, r, '▐', t.accent); s.set(ox+11, r, '▌', t.accentDk);
}
function shoulderFront_light(s, ox, oy, t) {
  s.set(ox+1, oy+2, '▪', t.accent); s.set(ox+10, oy+2, '▪', t.accentDk);
}
function shoulderFront_minimal() { }

// ─── CHEST EMBLEM FRONT ───

function emblemFront_asus_rog(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+5, oy+4, '◉', glow); s.set(ox+6, oy+4, '═', t.accent);
}
function emblemFront_msi(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 32, t);
  s.set(ox+5, oy+4, '▼', glow);
}
function emblemFront_evga(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 28, t);
  s.set(ox+5, oy+4, '╱', glow); s.set(ox+6, oy+4, '╲', t.accent);
}
function emblemFront_gigabyte(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 34, t);
  s.set(ox+5, oy+4, '◆', glow);
}
function emblemFront_sapphire(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+5, oy+4, '◇', glow); s.set(ox+6, oy+4, '◆', t.accent);
}
function emblemFront_powercolor(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 26, t);
  s.set(ox+5, oy+4, '▲', glow);
}
function emblemFront_nvidia_fe(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 30, t);
  s.set(ox+5, oy+4, '╲', t.accent); s.set(ox+6, oy+4, '╱', glow);
}
function emblemFront_amd_ref(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 28, t);
  s.set(ox+5, oy+4, '∞', glow);
}
function emblemFront_intel_arc(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 26, t);
  s.set(ox+5, oy+4, '◈', glow);
}
function emblemFront_apple(s, ox, oy, t) {
  s.set(ox+5, oy+4, '●', t.accent);
}
function emblemFront_generic(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 40, t);
  s.set(ox+5, oy+4, '╬', glow);
}

// ─── ACCESSORY FRONT ───

function accessoryFront_0() { }
function accessoryFront_1(s, ox, oy, t, frame) {
  const pulse = cycle(frame, 40, 2);
  s.set(ox+6, oy-1, '┃', t.frameLt);
  s.set(ox+6, oy-2, pulse ? '◦' : '·', t.accent);
}
function accessoryFront_2(s, ox, oy, t, frame) {
  const sweep = cycle(frame, 60, 6);
  s.set(ox+3 + sweep, oy+1, '▬', t.accent);
}
function accessoryFront_3(s, ox, oy, t) {
  s.set(ox+2, oy-1, '╱', t.accent); s.set(ox+9, oy-1, '╲', t.accentDk);
}
function accessoryFront_4(s, ox, oy, t, frame) {
  const glow = coreGlow(frame, 24, t);
  s.set(ox+8, oy, '◎', glow);
}
function accessoryFront_5(s, ox, oy, t) {
  s.set(ox+1, oy+1, '≈', t.vent);
}

// ─── GPU ARM FRONT VIEW — 18 variants ───

function gpuFront_nvidiaFlagship(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox - 1;
  const fg = coreGlow(frame, 20, t);
  s.set(c-3, r, '◄', fg);
  s.set(c-2, r, '█', fg); s.set(c-1, r, '█', t.frame);
  s.set(c, r, '█', t.frame); s.set(c+1, r, '╣', t.frameDk);
  s.set(c-2, r+1, '▌', t.shadow);
  s.set(c-1, r+1, fanChar(frame, 20, 0), fg);
  s.set(c, r+1, '▓', t.vent); s.set(c+1, r+1, '║', t.frameDk);
  s.set(c-3, r+2, '◄', fg);
  s.set(c-2, r+2, '█', fg); s.set(c-1, r+2, '█', fg);
  s.set(c, r+2, '█', t.frame); s.set(c+1, r+2, '╣', t.frameDk);
  s.set(c-2, r+3, '▌', t.shadow);
  s.set(c-1, r+3, fanChar(frame, 20, 10), coreGlow(frame+10, 20, t));
  s.set(c, r+3, '▓', t.vent); s.set(c+1, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '▀', t.frame); s.set(c+1, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaEnthusiast(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox - 1;
  const fg = coreGlow(frame, 24, t);
  s.set(c-2, r, '◄', fg);
  s.set(c-1, r, '█', t.frame); s.set(c, r, '█', t.frame); s.set(c+1, r, '╣', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 24, 0), fg);
  s.set(c, r+1, '▓', t.vent); s.set(c+1, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '◄', fg);
  s.set(c-1, r+2, '█', fg);
  s.set(c, r+2, '█', t.frame); s.set(c+1, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, fanChar(frame, 24, 12), coreGlow(frame+12, 24, t));
  s.set(c, r+3, '▓', t.vent); s.set(c+1, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '▀', t.frame); s.set(c+1, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaPerformance(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 26, t);
  s.set(c-1, r, '█', t.frame); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 26, 0), fg); s.set(c, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '►', fg);
  s.set(c-1, r+2, '█', t.frame); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, fanChar(frame, 26, 13), coreGlow(frame+13, 26, t));
  s.set(c, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaMainstream(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 28, t);
  s.set(c-1, r, '█', t.frame); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 28, 0), fg); s.set(c, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '►', fg);
  s.set(c-1, r+2, '█', t.frame); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, fanChar(frame, 28, 14), coreGlow(frame+14, 28, t));
  s.set(c, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.frame); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_nvidiaValue(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 30, t);
  s.set(c-1, r, '█', t.frame); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 30, 0), fg); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '█', fg); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, '▀', t.frame); s.set(c, r+3, '╝', t.frameDk);
}

function gpuFront_nvidiaEntry(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  const fg = coreGlow(frame, 34, t);
  s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r, fanChar(frame, 34, 0), fg);
  s.set(c, r+1, '╣', t.frameDk);
  s.set(c-1, r+1, '▀', t.frame);
}

function gpuFront_nvidiaBudget(s, ox, oy, t) {
  const r = oy + 5;  const c = ox + 1;
  s.set(c-1, r, '░', t.vent); s.set(c, r, '║', t.frameDk);
}

function gpuFront_amdFlagship(s, ox, oy, t, frame) {
  const r = oy + 2;  const c = ox;
  const fg = coreGlow(frame, 18, t);
  s.set(c-2, r, '▄', t.accent); s.set(c-1, r, '╲', t.accent);
  s.set(c-2, r+1, '█', t.accent); s.set(c-1, r+1, '█', t.accent); s.set(c, r+1, '╣', t.frameDk);
  s.set(c-2, r+2, '█', t.accentDk);
  s.set(c-1, r+2, '█', fg); s.set(c, r+2, '║', t.frameDk);
  s.set(c-2, r+3, '█', t.accent); s.set(c-1, r+3, '█', t.accent); s.set(c, r+3, '╣', t.frameDk);
  s.set(c-2, r+4, '─', t.vent); s.set(c-1, r+4, '═', t.accent); s.set(c, r+4, '║', t.frameDk);
  s.set(c-1, r+5, '▀', t.accentDk); s.set(c, r+5, '╝', t.frameDk);
}

function gpuFront_amdEnthusiast(s, ox, oy, t, frame) {
  const r = oy + 2;  const c = ox;
  const fg = coreGlow(frame, 20, t);
  s.set(c-2, r, '▄', t.accent); s.set(c-1, r, '═', t.frame); s.set(c, r, '╗', t.frameDk);
  s.set(c-2, r+1, '█', t.accent);
  s.set(c-1, r+1, fanChar(frame, 20, 0), fg);
  s.set(c, r+1, '║', t.frameDk);
  s.set(c-2, r+2, '█', t.accent);
  s.set(c-1, r+2, '█', fg);
  s.set(c, r+2, '║', t.frameDk);
  s.set(c+1, r+2, '►', fg);
  s.set(c-2, r+3, '█', t.accentDk);
  s.set(c-1, r+3, fanChar(frame, 20, 10), coreGlow(frame+10, 20, t));
  s.set(c, r+3, '║', t.frameDk);
  s.set(c-2, r+4, '▀', t.accent); s.set(c-1, r+4, '═', t.frame); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_amdPerformance(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 24, t);
  s.set(c-1, r, '═', t.accent); s.set(c, r, '╗', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 24, 0), fg); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '█', fg); s.set(c, r+2, '║', t.frameDk);
  s.set(c+1, r+2, '►', fg);
  s.set(c-1, r+3, fanChar(frame, 24, 12), coreGlow(frame+12, 24, t)); s.set(c, r+3, '║', t.frameDk);
  s.set(c-1, r+4, '▀', t.accent); s.set(c, r+4, '╝', t.frameDk);
}

function gpuFront_amdMainstream(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox + 1;
  const fg = coreGlow(frame, 28, t);
  s.set(c-1, r, '═', t.accent); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, fanChar(frame, 28, 0), fg); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '█', fg); s.set(c, r+2, '║', t.frameDk);
  s.set(c-1, r+3, '▀', t.accent);
}

function gpuFront_amdEntry(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  const fg = coreGlow(frame, 32, t);
  s.set(c-1, r, '█', fg); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '▀', t.accent);
}

function gpuFront_amdLegacy(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  const fg = coreGlow(frame, 36, t);
  s.set(c-1, r, fanChar(frame, 36, 0), fg); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '═', t.accent); s.set(c, r+1, '╣', t.frameDk);
  s.set(c-1, r+2, '▀', t.frame);
}

function gpuFront_intelArcHigh(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 22, t);
  s.set(c-1, r, '◇', fg); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '◆', coreGlow(frame+11, 22, t)); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '◇', fg); s.set(c, r+2, '║', t.frameDk);
  s.set(c-1, r+3, '◆', coreGlow(frame+11, 22, t)); s.set(c, r+3, '╣', t.frameDk);
  s.set(c-1, r+4, '▀', t.accent);
}

function gpuFront_intelArcMid(s, ox, oy, t, frame) {
  const r = oy + 3;  const c = ox;
  const fg = coreGlow(frame, 22, t);
  s.set(c-1, r, '◇', fg); s.set(c, r, '╣', t.frameDk);
  s.set(c-1, r+1, '◆', coreGlow(frame+11, 22, t)); s.set(c, r+1, '║', t.frameDk);
  s.set(c-1, r+2, '◇', fg); s.set(c, r+2, '╣', t.frameDk);
  s.set(c-1, r+3, '▀', t.accent);
}

function gpuFront_intelArcLow(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  const fg = coreGlow(frame, 26, t);
  s.set(c-1, r, '◆', fg); s.set(c, r, '║', t.frameDk);
  s.set(c-1, r+1, '▀', t.accent);
}

function gpuFront_apple(s, ox, oy, t, frame) {
  const r = oy + 4;  const c = ox + 1;
  const glow = coreGlow(frame, 40, t);
  s.set(c-1, r, '○', glow); s.set(c, r, '│', t.frameDk);
}

function gpuFront_integrated() { }

// ─── LEGS FRONT — with RAM reinforcement ───

function legsFront_nvme(s, ox, oy, t, frame, hw) {
  const r = oy + 7;
  const ram = hw ? hw.ram : 'light';
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '▀', t.frame);
  s.set(ox+4, r+1, ventChar(frame, 14, 0), t.accent);
  s.set(ox+7, r+1, ventChar(frame, 14, 8), t.accent);
  if (ram === 'massive' || ram === 'heavy') {
    s.set(ox+3, r+1, '▪', coreGlow(frame, 34, t));
    s.set(ox+8, r+1, '▪', coreGlow(frame+8, 34, t));
  }
}

function legsFront_ssd(s, ox, oy, t, frame, hw) {
  const r = oy + 7;
  const ram = hw ? hw.ram : 'light';
  const ledOn = cycle(frame, 80, 4) === 0;
  s.set(ox+3, r, '▀', t.frame); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '▀', t.frame);
  s.set(ox+4, r+1, '▀', t.leg); s.set(ox+7, r+1, '▀', t.leg);
  s.set(ox+5, r, '·', ledOn ? t.accent : t.vent);
  if (ram === 'massive') {
    s.set(ox+3, r+1, '▪', coreGlow(frame, 36, t));
    s.set(ox+8, r+1, '▪', coreGlow(frame+9, 36, t));
  }
}

function legsFront_hdd(s, ox, oy, t, frame, hw) {
  const r = oy + 7;
  const ram = hw ? hw.ram : 'light';
  const platter = cycle(frame, 30, 3);
  const pc = ['°', '·', '○'][platter];
  s.set(ox+2, r, '▀', t.frame); s.set(ox+3, r, '█', t.leg); s.set(ox+4, r, '█', t.leg);
  s.set(ox+7, r, '█', t.leg); s.set(ox+8, r, '█', t.leg); s.set(ox+9, r, '▀', t.frame);
  s.set(ox+3, r+1, '▀', t.leg); s.set(ox+4, r+1, '▀', t.leg);
  s.set(ox+7, r+1, '▀', t.leg); s.set(ox+8, r+1, '▀', t.leg);
  s.set(ox+3, r, pc, t.vent);
  if (ram === 'massive') {
    s.set(ox+2, r+1, '▪', coreGlow(frame, 40, t));
    s.set(ox+9, r+1, '▪', coreGlow(frame+10, 40, t));
  }
}


// ═══════════════════════════════════════════════════════════════
// §5  DISPATCH TABLES
// ═══════════════════════════════════════════════════════════════

const HEAD_BACK = {
  threadripper: headBack_threadripper, ryzen9: headBack_ryzen9,
  ryzen7: headBack_ryzen7, ryzen5: headBack_ryzen5, ryzen3: headBack_ryzen3,
  xeon: headBack_xeon, intel_i9: headBack_intel_i9, intel_i7: headBack_intel_i7,
  intel_i5: headBack_intel_i5, intel_i3: headBack_intel_i3,
  apple_pro: headBack_apple_pro, apple_base: headBack_apple_base,
  celeron: headBack_celeron, generic: headBack_generic,
  // Legacy aliases for backward compat
  ryzen_high: headBack_ryzen9, ryzen_mid: headBack_ryzen5,
  intel_high: headBack_intel_i7, intel_mid: headBack_intel_i5,
  apple: headBack_apple_base,
};

const HEAD_FRONT = {
  threadripper: headFront_threadripper, ryzen9: headFront_ryzen9,
  ryzen7: headFront_ryzen7, ryzen5: headFront_ryzen5, ryzen3: headFront_ryzen3,
  xeon: headFront_xeon, intel_i9: headFront_intel_i9, intel_i7: headFront_intel_i7,
  intel_i5: headFront_intel_i5, intel_i3: headFront_intel_i3,
  apple_pro: headFront_apple_pro, apple_base: headFront_apple_base,
  celeron: headFront_celeron, generic: headFront_generic,
  ryzen_high: headFront_ryzen9, ryzen_mid: headFront_ryzen5,
  intel_high: headFront_intel_i7, intel_mid: headFront_intel_i5,
  apple: headFront_apple_base,
};

const TORSO_BACK  = { flagship: torsoBack_flagship, high: torsoBack_high, mid: torsoBack_mid, low: torsoBack_low };
const TORSO_FRONT = { flagship: torsoFront_flagship, high: torsoFront_high, mid: torsoFront_mid, low: torsoFront_low };

const GPU_BACK = {
  nvidia_flagship: gpuBack_nvidiaFlagship, nvidia_enthusiast: gpuBack_nvidiaEnthusiast,
  nvidia_performance: gpuBack_nvidiaPerformance, nvidia_mainstream: gpuBack_nvidiaMainstream,
  nvidia_value: gpuBack_nvidiaValue, nvidia_entry: gpuBack_nvidiaEntry,
  nvidia_budget: gpuBack_nvidiaBudget,
  amd_flagship: gpuBack_amdFlagship, amd_enthusiast: gpuBack_amdEnthusiast,
  amd_performance: gpuBack_amdPerformance, amd_mainstream: gpuBack_amdMainstream,
  amd_entry: gpuBack_amdEntry, amd_legacy: gpuBack_amdLegacy,
  intel_arc_high: gpuBack_intelArcHigh, intel_arc_mid: gpuBack_intelArcMid,
  intel_arc_low: gpuBack_intelArcLow,
  apple: gpuBack_apple, integrated: gpuBack_integrated,
  // Legacy aliases
  nvidia_high: gpuBack_nvidiaMainstream, nvidia_mid: gpuBack_nvidiaEntry,
  amd_high: gpuBack_amdEnthusiast, amd_mid: gpuBack_amdEntry,
  intel_arc: gpuBack_intelArcMid,
};

const GPU_FRONT = {
  nvidia_flagship: gpuFront_nvidiaFlagship, nvidia_enthusiast: gpuFront_nvidiaEnthusiast,
  nvidia_performance: gpuFront_nvidiaPerformance, nvidia_mainstream: gpuFront_nvidiaMainstream,
  nvidia_value: gpuFront_nvidiaValue, nvidia_entry: gpuFront_nvidiaEntry,
  nvidia_budget: gpuFront_nvidiaBudget,
  amd_flagship: gpuFront_amdFlagship, amd_enthusiast: gpuFront_amdEnthusiast,
  amd_performance: gpuFront_amdPerformance, amd_mainstream: gpuFront_amdMainstream,
  amd_entry: gpuFront_amdEntry, amd_legacy: gpuFront_amdLegacy,
  intel_arc_high: gpuFront_intelArcHigh, intel_arc_mid: gpuFront_intelArcMid,
  intel_arc_low: gpuFront_intelArcLow,
  apple: gpuFront_apple, integrated: gpuFront_integrated,
  nvidia_high: gpuFront_nvidiaMainstream, nvidia_mid: gpuFront_nvidiaEntry,
  amd_high: gpuFront_amdEnthusiast, amd_mid: gpuFront_amdEntry,
  intel_arc: gpuFront_intelArcMid,
};

const LEGS_BACK   = { NVMe: legsBack_nvme, SSD: legsBack_ssd, HDD: legsBack_hdd, eMMC: legsBack_hdd };
const LEGS_FRONT  = { NVMe: legsFront_nvme, SSD: legsFront_ssd, HDD: legsFront_hdd, eMMC: legsFront_hdd };

const SHOULDER_BACK  = { massive: shoulderBack_massive, heavy: shoulderBack_heavy, light: shoulderBack_light, minimal: shoulderBack_minimal };
const SHOULDER_FRONT = { massive: shoulderFront_massive, heavy: shoulderFront_heavy, light: shoulderFront_light, minimal: shoulderFront_minimal };

const EMBLEM_BACK = {
  asus_rog: emblemBack_asus_rog, msi: emblemBack_msi, evga: emblemBack_evga,
  gigabyte: emblemBack_gigabyte, sapphire: emblemBack_sapphire, powercolor: emblemBack_powercolor,
  nvidia_fe: emblemBack_nvidia_fe, amd_ref: emblemBack_amd_ref, intel_arc: emblemBack_intel_arc,
  apple: emblemBack_apple, generic: emblemBack_generic,
};
const EMBLEM_FRONT = {
  asus_rog: emblemFront_asus_rog, msi: emblemFront_msi, evga: emblemFront_evga,
  gigabyte: emblemFront_gigabyte, sapphire: emblemFront_sapphire, powercolor: emblemFront_powercolor,
  nvidia_fe: emblemFront_nvidia_fe, amd_ref: emblemFront_amd_ref, intel_arc: emblemFront_intel_arc,
  apple: emblemFront_apple, generic: emblemFront_generic,
};

const ACCESSORY_BACK  = [accessoryBack_0, accessoryBack_1, accessoryBack_2, accessoryBack_3, accessoryBack_4, accessoryBack_5];
const ACCESSORY_FRONT = [accessoryFront_0, accessoryFront_1, accessoryFront_2, accessoryFront_3, accessoryFront_4, accessoryFront_5];


// ═══════════════════════════════════════════════════════════════
// §6  HIT / KO HELPERS — tier-aware
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

function drawKO(screen, ox, oy, isBack, tier) {
  const d = colors.dim;
  const by = isBack ? oy + 6 : oy + 4;

  if (tier === 'flagship') {
    screen.text(ox + 1, by, '░▒▓█▓▒░▒▓░', d);
    screen.text(ox + 2, by + 1, '▓░░▒▓░░▓', d);
    screen.text(ox + 1, by + 2, '▀▀░▀▀░▀▀▀▀', d);
    screen.text(ox + 3, by - 1, '✦     ✦', colors.dimmer);
    screen.set(ox + 6, by - 2, '✦', colors.ghost);
  } else if (tier === 'high') {
    screen.text(ox + 2, by, '▄▄▄▄▄▄▄▄▄', d);
    screen.text(ox + 2, by + 1, '░░▒░░▒░░░', d);
    screen.text(ox + 2, by + 2, '▀▀▀▀▀▀▀▀▀', d);
    screen.text(ox + 4, by - 1, '░   ░', colors.dimmer);
  } else if (tier === 'low') {
    screen.text(ox + 4, by + 1, '▄▄▄', d);
    screen.text(ox + 4, by + 2, '▀▀▀', d);
    screen.text(ox + 4, by, '· ·', colors.dimmer);
  } else {
    screen.text(ox + 2, by, '▄▄▄▄▄▄▄▄▄', d);
    screen.text(ox + 2, by + 1, '░░░░░░░░░', d);
    screen.text(ox + 2, by + 2, '▀▀▀▀▀▀▀▀▀', d);
    screen.text(ox + 3, by - 1, 'x     x', colors.dimmer);
  }
}


// ═══════════════════════════════════════════════════════════════
// §6.5  APEX OVERRIDES — Special full-body draw for KERNEL_GOD tier
// Dual GPU arms, energy cape, menacing crown, particle aura
// ═══════════════════════════════════════════════════════════════

function drawApexBack(screen, ox, oy, t, frame, hw) {
  const s = screen;
  const fg = coreGlow(frame, 16, t);
  const fg2 = coreGlow(frame + 8, 16, t);

  // ─── ENERGY CAPE (background layer — shimmering data streams) ───
  for (let row = 3; row <= 9; row++) {
    const capeW = Math.min(row - 1, 6);
    for (let i = -capeW; i <= capeW; i++) {
      const cx = ox + 7 + i;
      const drift = (frame + row * 3 + Math.abs(i) * 7) % 20;
      if (drift < 2) {
        s.set(cx, oy + row, '░', t.accentDk);
      } else if (drift < 4) {
        s.set(cx, oy + row, '·', t.data);
      }
    }
  }

  // ─── TORSO — massive armored chassis with dual power spine ───
  const r = oy + 2;
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=11;i++) s.set(ox+i, r, '█', t.frame);
  s.set(ox+12, r, '▌', t.frameDk);
  for (let row=1;row<=4;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=10;i++) {
      const isTrace = (row + i) % 2 === 0;
      s.set(ox+i, r+row, isTrace ? '╪' : ventChar(frame, 40, row * 4 + i), isTrace ? fg : t.vent);
    }
    s.set(ox+11, r+row, '█', t.frameDk);
    s.set(ox+12, r+row, '▌', t.shadow);
  }
  // Dual power spines — pulsing in alternation
  const sp = cycle(frame, 24, 4);
  for (let row=1;row<=4;row++) {
    const a1 = ((sp + row) % 4) < 2;
    const a2 = ((sp + row + 2) % 4) < 2;
    s.set(ox+5, r+row, '║', a1 ? t.core : t.accentDk);
    s.set(ox+6, r+row, '█', fg);
    s.set(ox+7, r+row, '█', fg2);
    s.set(ox+8, r+row, '║', a2 ? t.core : t.accentDk);
  }
  // Belt with power connectors
  s.set(ox+1, r+5, '▐', t.frameLt);
  s.set(ox+2, r+5, '═', t.core);
  for (let i=3;i<=10;i++) s.set(ox+i, r+5, '█', t.frame);
  s.set(ox+11, r+5, '═', t.core);
  s.set(ox+12, r+5, '▌', t.shadow);
  s.set(ox+12, r+2, '▪', fg); s.set(ox+12, r+3, '▪', fg2);

  // ─── SHOULDERS — massive armored pauldrons with cascading glow ───
  const glow = coreGlow(frame, 20, t);
  const glow2 = coreGlow(frame + 5, 20, t);
  const glow3 = coreGlow(frame + 10, 20, t);
  s.set(ox-1, r, '╔', t.core); s.set(ox-1, r+1, '║', glow); s.set(ox-1, r+2, '║', glow2);
  s.set(ox-1, r+3, '║', glow3); s.set(ox-1, r+4, '╚', t.accentDk);
  s.set(ox+14, r, '╗', t.core); s.set(ox+14, r+1, '║', glow); s.set(ox+14, r+2, '║', glow2);
  s.set(ox+14, r+3, '║', glow3); s.set(ox+14, r+4, '╝', t.accentDk);

  // ─── HEAD — menacing crown with triple-wide pin array and energy horns ───
  const p = cycle(frame, 20, 4);
  const pinA = p < 2 ? '░' : '▒';
  const pinB = p >= 1 && p <= 2 ? '▒' : '░';
  // Energy horns
  const hornGlow = coreGlow(frame, 18, t);
  s.set(ox+2, oy-1, '╱', hornGlow); s.set(ox+1, oy-2, '╱', t.core);
  s.set(ox+11, oy-1, '╲', hornGlow); s.set(ox+12, oy-2, '╲', t.core);
  // Crown top
  s.set(ox+2, oy, '╔', t.core);
  s.set(ox+3, oy, '▄', t.accent); s.set(ox+4, oy, '█', t.frameLt);
  s.set(ox+5, oy, '▄', fg); s.set(ox+6, oy, '▄', t.core);
  s.set(ox+7, oy, '▄', t.core); s.set(ox+8, oy, '▄', fg);
  s.set(ox+9, oy, '█', t.frameDk); s.set(ox+10, oy, '▄', t.accent);
  s.set(ox+11, oy, '╗', t.core);
  // Head body with dense pin array
  s.set(ox+1, oy+1, '█', t.frameLt);
  s.set(ox+2, oy+1, '▓', t.vent);
  s.set(ox+3, oy+1, pinA, fg); s.set(ox+4, oy+1, pinB, t.core);
  s.set(ox+5, oy+1, pinA, fg); s.set(ox+6, oy+1, '█', t.core);
  s.set(ox+7, oy+1, '█', t.core); s.set(ox+8, oy+1, pinB, fg);
  s.set(ox+9, oy+1, pinA, t.core); s.set(ox+10, oy+1, pinB, fg);
  s.set(ox+11, oy+1, '▓', t.vent);
  s.set(ox+12, oy+1, '█', t.frameDk);

  // ─── LEFT GPU ARM (extends LEFT from torso) ───
  const lc = ox + 1;  const lr = oy + 3;
  s.set(lc-1, lr, '╗', t.frameDk);
  s.set(lc-2,lr, '═', t.frame); s.set(lc-3,lr, '═', t.frame);
  s.set(lc-4,lr, '═', t.frame); s.set(lc-5,lr, '╔', t.frameLt);
  s.set(lc-5, lr+1, '║', t.frameLt);
  s.set(lc-4,lr+1, fanChar(frame, 18, 0), fg);
  s.set(lc-3,lr+1, '▓', t.vent);
  s.set(lc-2,lr+1, fanChar(frame, 18, 5), fg);
  s.set(lc-1,lr+1, '║', t.frameDk);
  s.set(lc-5, lr+2, '║', t.frameLt);
  s.set(lc-4,lr+2, '█', t.frame); s.set(lc-3,lr+2, '█', fg);
  s.set(lc-2,lr+2, '█', t.frame);
  s.set(lc-1,lr+2, '║', t.frameDk);
  s.set(lc-6,lr+2, '◄', fg);
  s.set(lc-5, lr+3, '║', t.frameLt);
  s.set(lc-4,lr+3, fanChar(frame, 18, 9), fg2);
  s.set(lc-3,lr+3, '▓', t.vent);
  s.set(lc-2,lr+3, fanChar(frame, 18, 14), fg2);
  s.set(lc-1,lr+3, '║', t.frameDk);
  s.set(lc-5, lr+4, '╚', t.frameLt);
  s.set(lc-4,lr+4, '═', t.frame); s.set(lc-3,lr+4, '═', t.frame);
  s.set(lc-2,lr+4, '═', t.frame); s.set(lc-1,lr+4, '╝', t.frameDk);

  // ─── RIGHT GPU ARM (extends RIGHT from torso — same as flagship but bigger) ───
  const rc = ox + 12;  const rr = oy + 3;
  s.set(rc, rr, '╠', t.frameLt);
  s.set(rc+1,rr, '═', t.frame); s.set(rc+2,rr, '═', t.frame);
  s.set(rc+3,rr, '═', t.frame); s.set(rc+4,rr, '═', t.frame);
  s.set(rc+5,rr, '╗', t.frameDk);
  s.set(rc, rr+1, '║', t.frameLt);
  s.set(rc+1,rr+1, fanChar(frame, 18, 0), fg);
  s.set(rc+2,rr+1, '▓', t.vent);
  s.set(rc+3,rr+1, fanChar(frame, 18, 5), fg);
  s.set(rc+4,rr+1, '▓', t.vent);
  s.set(rc+5,rr+1, '║', t.frameDk);
  s.set(rc, rr+2, '║', t.frameLt);
  s.set(rc+1,rr+2, '█', t.frame); s.set(rc+2,rr+2, '█', fg);
  s.set(rc+3,rr+2, '█', fg); s.set(rc+4,rr+2, '█', t.frame);
  s.set(rc+5,rr+2, '║', t.frameDk);
  s.set(rc+6,rr+2, '►', fg);
  s.set(rc, rr+3, '║', t.frameLt);
  s.set(rc+1,rr+3, fanChar(frame, 18, 9), fg2);
  s.set(rc+2,rr+3, '▓', t.vent);
  s.set(rc+3,rr+3, fanChar(frame, 18, 14), fg2);
  s.set(rc+4,rr+3, '▓', t.vent);
  s.set(rc+5,rr+3, '║', t.frameDk);
  s.set(rc, rr+4, '╚', t.frameLt);
  for (let i=1;i<=4;i++) s.set(rc+i, rr+4, '═', t.frame);
  s.set(rc+5, rr+4, '╝', t.frameDk);
  // Exhaust from both arms
  s.set(rc+2,rr+5, ventChar(frame, 14, 0), t.vent);
  s.set(rc+3,rr+5, ventChar(frame, 14, 4), t.vent);
  s.set(lc-4,lr+5, ventChar(frame, 14, 7), t.vent);
  s.set(lc-3,lr+5, ventChar(frame, 14, 11), t.vent);

  // ─── LEGS — heavy thruster platform ───
  const ly = oy + 8;
  s.set(ox+3, ly, '▀', t.frame); s.set(ox+4, ly, '█', t.leg);
  s.set(ox+5, ly, '▀', t.core);
  s.set(ox+8, ly, '▀', t.core);
  s.set(ox+9, ly, '█', t.leg); s.set(ox+10, ly, '▀', t.frame);
  s.set(ox+4, ly+1, ventChar(frame, 12, 0), t.core);
  s.set(ox+5, ly+1, ventChar(frame, 12, 3), t.accent);
  s.set(ox+8, ly+1, ventChar(frame, 12, 6), t.accent);
  s.set(ox+9, ly+1, ventChar(frame, 12, 9), t.core);
  // DIMM indicators
  s.set(ox+3, ly+1, '▪', glow); s.set(ox+10, ly+1, '▪', glow2);
  s.set(ox+5, ly+2, '▪', glow2); s.set(ox+8, ly+2, '▪', glow3);
  s.set(ox+4, ly+2, '▀', t.leg); s.set(ox+9, ly+2, '▀', t.leg);

  // ─── AMBIENT PARTICLES — data drift above head ───
  const dp1 = (frame + 3) % 50;
  if (dp1 < 3) s.set(ox+6, oy - 2 - dp1, dp1 === 0 ? '·' : '°', t.data);
  const dp2 = (frame + 17) % 45;
  if (dp2 < 3) s.set(ox+9, oy - 2 - dp2, dp2 === 0 ? '°' : '·', t.data);

  // ─── EMBLEM — core power indicator ───
  s.set(ox+6, oy+7, '◉', fg); s.set(ox+7, oy+7, '◉', fg2);
}

function drawApexFront(screen, ox, oy, t, frame, hw) {
  const s = screen;
  const fg = coreGlow(frame, 16, t);
  const fg2 = coreGlow(frame + 8, 16, t);

  // ─── ENERGY CAPE (faint shimmer behind body) ───
  for (let row = 3; row <= 7; row++) {
    const capeW = Math.min(row - 2, 4);
    for (let i = -capeW; i <= capeW; i++) {
      const cx = ox + 6 + i;
      const drift = (frame + row * 3 + Math.abs(i) * 5) % 18;
      if (drift < 2) s.set(cx, oy + row, '░', t.accentDk);
    }
  }

  // ─── TORSO ───
  const r = oy + 2;
  s.set(ox+1, r, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r, '═', t.frame);
  s.set(ox+10, r, '▌', t.frameDk);
  for (let row=1;row<=3;row++) {
    s.set(ox+1, r+row, '▐', t.frameLt);
    s.set(ox+2, r+row, '█', t.frame);
    for (let i=3;i<=8;i++) {
      const isTrace = (row + i) % 2 === 0;
      s.set(ox+i, r+row, isTrace ? '╪' : ventChar(frame, 40, row * 4 + i), isTrace ? fg : t.vent);
    }
    s.set(ox+9, r+row, '█', t.frame);
    s.set(ox+10, r+row, '▌', t.frameDk);
  }
  // Power spines
  const sp = cycle(frame, 24, 4);
  s.set(ox+5, r+1, '║', ((sp+1)%4)<2?t.core:t.accentDk);
  s.set(ox+6, r+1, '║', ((sp+1)%4)<2?t.accentDk:t.core);
  s.set(ox+5, r+2, '║', ((sp+2)%4)<2?t.core:t.accentDk);
  s.set(ox+6, r+2, '║', ((sp+2)%4)<2?t.accentDk:t.core);
  // Belt
  s.set(ox+1, r+4, '▐', t.frameLt);
  for (let i=2;i<=9;i++) s.set(ox+i, r+4, '█', t.frame);
  s.set(ox+10, r+4, '▌', t.frameDk);

  // ─── SHOULDERS ───
  const glow = coreGlow(frame, 20, t);
  s.set(ox, r, '╔', t.core); s.set(ox, r+1, '║', glow); s.set(ox, r+2, '║', coreGlow(frame+5, 20, t));
  s.set(ox+11, r, '╗', t.core); s.set(ox+11, r+1, '║', glow); s.set(ox+11, r+2, '║', coreGlow(frame+5, 20, t));

  // ─── HEAD — crown with glowing eyes ───
  const ec = eyeChar(frame, 100, 'wide');
  const eblink = eyeState(frame, 100) === 'blink';
  const hornGlow = coreGlow(frame, 18, t);
  s.set(ox+2, oy-1, '╱', hornGlow); s.set(ox+9, oy-1, '╲', hornGlow);
  s.set(ox+1, oy, '▄', t.core); s.set(ox+2, oy, '▄', t.frameLt);
  for (let i=3;i<=8;i++) s.set(ox+i, oy, '▄', t.frame);
  s.set(ox+9, oy, '▄', t.frameDk); s.set(ox+10, oy, '▄', t.core);
  s.set(ox+1, oy+1, '█', t.core);
  s.set(ox+2, oy+1, '█', t.frameLt);
  s.set(ox+3, oy+1, ec, eblink ? t.frame : t.core);
  s.set(ox+4, oy+1, '▒', fg); s.set(ox+5, oy+1, '▒', t.core);
  s.set(ox+6, oy+1, '▒', t.core); s.set(ox+7, oy+1, '▒', fg);
  s.set(ox+8, oy+1, ec, eblink ? t.frame : t.core);
  s.set(ox+9, oy+1, '█', t.frameDk);
  s.set(ox+10, oy+1, '█', t.core);

  // ─── DUAL GPU ARMS ───
  // Right arm
  const rc = ox - 1;  const rr = oy + 3;
  s.set(rc-2, rr, '◄', fg);
  s.set(rc-1, rr, '█', t.frame); s.set(rc, rr, '█', t.frame); s.set(rc+1, rr, '╣', t.frameDk);
  s.set(rc-1, rr+1, fanChar(frame, 18, 0), fg);
  s.set(rc, rr+1, '▓', t.vent); s.set(rc+1, rr+1, '║', t.frameDk);
  s.set(rc-2, rr+2, '◄', fg);
  s.set(rc-1, rr+2, '█', fg); s.set(rc, rr+2, '█', t.frame); s.set(rc+1, rr+2, '╣', t.frameDk);
  s.set(rc-1, rr+3, fanChar(frame, 18, 9), fg2);
  s.set(rc, rr+3, '▓', t.vent); s.set(rc+1, rr+3, '║', t.frameDk);
  s.set(rc-1, rr+4, '▀', t.frame); s.set(rc, rr+4, '▀', t.frame); s.set(rc+1, rr+4, '╝', t.frameDk);
  // Left arm (mirror on right side of body)
  const lc = ox + 11;
  s.set(lc, rr, '╠', t.frameLt); s.set(lc+1, rr, '█', t.frame); s.set(lc+2, rr, '█', t.frame);
  s.set(lc+3, rr, '►', fg);
  s.set(lc, rr+1, '║', t.frameLt);
  s.set(lc+1, rr+1, '▓', t.vent); s.set(lc+2, rr+1, fanChar(frame, 18, 5), fg);
  s.set(lc, rr+2, '╠', t.frameLt); s.set(lc+1, rr+2, '█', t.frame);
  s.set(lc+2, rr+2, '█', fg); s.set(lc+3, rr+2, '►', fg);
  s.set(lc, rr+3, '║', t.frameLt);
  s.set(lc+1, rr+3, '▓', t.vent); s.set(lc+2, rr+3, fanChar(frame, 18, 14), fg2);
  s.set(lc, rr+4, '╝', t.frameLt); s.set(lc+1, rr+4, '▀', t.frame); s.set(lc+2, rr+4, '▀', t.frame);

  // ─── LEGS ───
  const ly = oy + 7;
  s.set(ox+3, ly, '▀', t.frame); s.set(ox+4, ly, '█', t.leg);
  s.set(ox+7, ly, '█', t.leg); s.set(ox+8, ly, '▀', t.frame);
  s.set(ox+4, ly+1, ventChar(frame, 12, 0), t.core);
  s.set(ox+7, ly+1, ventChar(frame, 12, 6), t.core);
  s.set(ox+3, ly+1, '▪', glow); s.set(ox+8, ly+1, '▪', coreGlow(frame+5, 20, t));

  // ─── EMBLEM ───
  s.set(ox+5, oy+4, '◉', fg); s.set(ox+6, oy+4, '◉', fg2);
}


// ═══════════════════════════════════════════════════════════════
// §7  PUBLIC API — Assembles components into composite sprites
// ═══════════════════════════════════════════════════════════════

// Detect apex-tier hardware: cores >= 32 AND VRAM >= 24GB AND RAM >= 128GB
function _isApexTier(specs) {
  const cores = specs.cpu?.cores || 0;
  const vram = specs.gpu?.vramMB || 0;
  const ram = specs.ram?.totalGB || 0;
  return cores >= 32 && vram >= 24000 && ram >= 128;
}

function getSprite(specs) {
  const hw = identifyHardware(specs);
  const theme = THEMES[hw.brand] || THEMES.generic;

  // Detect apex-tier hardware (KERNEL_GOD level) for special full-body override
  const isApex = _isApexTier(specs);

  const headB  = HEAD_BACK[hw.cpuFamily]   || HEAD_BACK.generic;
  const headF  = HEAD_FRONT[hw.cpuFamily]  || HEAD_FRONT.generic;
  const bodyB  = TORSO_BACK[hw.tier]       || TORSO_BACK.mid;
  const bodyF  = TORSO_FRONT[hw.tier]      || TORSO_FRONT.mid;
  const gpuB   = GPU_BACK[hw.gpuFamily]    || GPU_BACK.integrated;
  const gpuF   = GPU_FRONT[hw.gpuFamily]   || GPU_FRONT.integrated;
  const legB   = LEGS_BACK[hw.storage]     || LEGS_BACK.SSD;
  const legF   = LEGS_FRONT[hw.storage]    || LEGS_FRONT.SSD;

  const shoulderB = SHOULDER_BACK[hw.ram]    || shoulderBack_minimal;
  const shoulderF = SHOULDER_FRONT[hw.ram]   || shoulderFront_minimal;
  const emblemB   = EMBLEM_BACK[hw.brand]    || emblemBack_generic;
  const emblemF   = EMBLEM_FRONT[hw.brand]   || emblemFront_generic;
  const accB      = ACCESSORY_BACK[hw.specHash]  || accessoryBack_0;
  const accF      = ACCESSORY_FRONT[hw.specHash] || accessoryFront_0;

  // Composite draw: assemble all 7 layers — pass hw for storage/RAM influence
  function drawBack(screen, ox, oy, _tint, frame) {
    if (isApex) { drawApexBack(screen, ox, oy, theme, frame, hw); return; }
    bodyB(screen, ox, oy, theme, frame, hw);       // torso (storage detailing)
    emblemB(screen, ox, oy, theme, frame);          // brand emblem on torso
    shoulderB(screen, ox, oy, theme, frame);        // RAM-based shoulders
    gpuB(screen, ox, oy, theme, frame);             // GPU arm (fan count baked in)
    headB(screen, ox, oy, theme, frame, hw);        // head (core class influence)
    accB(screen, ox, oy, theme, frame);             // accessory
    legB(screen, ox, oy, theme, frame, hw);         // legs (storage + RAM reinforcement)
  }

  function drawFront(screen, ox, oy, _tint, frame) {
    if (isApex) { drawApexFront(screen, ox, oy, theme, frame, hw); return; }
    bodyF(screen, ox, oy, theme, frame, hw);
    emblemF(screen, ox, oy, theme, frame);
    shoulderF(screen, ox, oy, theme, frame);
    gpuF(screen, ox, oy, theme, frame);
    headF(screen, ox, oy, theme, frame, hw);
    accF(screen, ox, oy, theme, frame);
    legF(screen, ox, oy, theme, frame, hw);
  }

  return {
    back:  { draw: drawBack },
    front: { draw: drawFront },
    drawBackHit(screen, ox, oy, frame)  { drawHit(drawBack, screen, ox, oy, frame); },
    drawFrontHit(screen, ox, oy, frame) { drawHit(drawFront, screen, ox, oy, frame); },
    drawBackKO(screen, ox, oy)  { drawKO(screen, ox, oy, true, hw.tier); },
    drawFrontKO(screen, ox, oy) { drawKO(screen, ox, oy, false, hw.tier); },
    theme,
    hw,
  };
}

module.exports = {
  getSprite, identifyHardware, THEMES,
  // Exported for skin sprite reuse
  drawHit, drawKO,
  cycle, coreGlow, ventChar, fanChar, eyeChar, eyeState, ledSweep, dataParticle,
};
