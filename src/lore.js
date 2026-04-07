// ═══════════════════════════════════════════════════════════════
// LORE — Hardware-derived backstory, origin, traits, battle style
// Deterministic: same hardware always generates the same lore
// ═══════════════════════════════════════════════════════════════

// ─── Deterministic hash for consistent selection ───
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

// ─── Origin stories — where this rig came from ───

const ORIGINS = {
  APEX: [
    'Assembled in a climate-controlled datacenter by engineers who signed NDAs just to look at it. This is not a computer — it is an institution.',
    'Born from a requisition form that made accounting cry. Ninety-six cores, a terabyte of RAM, and a GPU that costs more than most cars.',
    'There was no budget. There was no limit. There was only the question: "What if we built everything at once?" This is the answer.',
  ],
  TITAN: [
    'Forged in a cleanroom where silicon meets divinity. Every component hand-picked, every benchmark shattered.',
    'Born from a build so excessive the power company called to ask questions. Overkill is a lifestyle.',
    'Assembled during a thunderstorm by an engineer who whispered "no compromises" with every screw.',
  ],
  HIVEMIND: [
    'Spawned from a workstation that rendered 4K frames while compiling the kernel. Multitasking is its mother tongue.',
    'Originally destined for a render farm, it developed consciousness somewhere around thread 47.',
    'Built by someone who thought "why have 8 cores when you can have all of them." The answer was power.',
  ],
  ARCMAGE: [
    'Channeled into existence through a GPU so powerful it bends light. Shaders are its spellbook.',
    'Its GPU was the last one in stock. The buyer drove 200 miles. That desperation became raw power.',
    'Emerged from a deep learning lab where neural networks dreamed in floating point. The math became magic.',
  ],
  BLITZ: [
    'Booted from an NVMe so fast the BIOS barely saw it. By the time you blink, it\'s already loaded.',
    'Optimized by someone who counted milliseconds the way poets count syllables. Speed is art.',
    'Its first POST was its fastest — zero bloat, zero waste, just raw velocity from power button to desktop.',
  ],
  FORTRESS: [
    'Packed with so much RAM the motherboard groaned. Nothing gets paged out. Nothing gets forgotten.',
    'Built to survive. While others crash under load, this rig opens another hundred tabs out of spite.',
    'Designed by someone whose worst nightmare was "insufficient memory." They made sure it would never happen.',
  ],
  BERSERKER: [
    'Overclocked on day one. The thermal paste was barely dry before the benchmarks started screaming.',
    'Its CPU runs so hot it could cook breakfast. But who needs breakfast when you have raw processing power.',
    'The product of someone who looked at the "safe" voltage limit and thought "that\'s a suggestion."',
  ],
  PHANTOM: [
    'Runs silent, hits hard. By the time the task manager notices, the work is already done.',
    'Built lean and mean — no RGB, no tempered glass, just a black box that processes at frightening speed.',
    'Its case has no windows because there\'s nothing to see. The real show is in the benchmarks.',
  ],
  NOMAD: [
    'Carried through airports and coffee shops, this road warrior computes anywhere the Wi-Fi reaches.',
    'Powered by battery and determination. Thermal throttling is just cardio for the CPU.',
    'It knows every power outlet in every terminal. Mobile, adaptable, and tougher than it looks.',
  ],
  SCRAPPER: [
    'Salvaged from parts that should\'ve been recycled. Held together by thermal paste and sheer will.',
    'Nobody expected it to boot. Nobody expected it to fight. And yet — here it is.',
    'Its specs say "budget." Its heart says "try me." What it lacks in power it makes up in grit.',
  ],
  SENTINEL: [
    'A balanced build by someone who reads reviews. Not flashy, not weak — just relentlessly dependable.',
    'Born in the sweet spot between budget and overkill. It does everything well and nothing poorly.',
    'The kind of rig that shows up, does the work, and never complains. Steady hands, steady framerates.',
  ],
};

// ─── Personality traits — derived from stat distribution ───

const TRAIT_POOLS = {
  high_str: ['Aggressive', 'Relentless', 'Brute-force thinker', 'Overclocked temper'],
  high_mag: ['Arcane', 'Render-obsessed', 'Pixel-perfect', 'Shader-brained'],
  high_spd: ['Impatient', 'Lightning reflexes', 'First-mover', 'Can\'t sit still'],
  high_vit: ['Stubborn', 'Unkillable', 'Endurance runner', 'Outlasts everything'],
  high_def: ['Cautious', 'Fortified mind', 'Calculated', 'Brick wall energy'],
  balanced: ['Adaptable', 'Jack of all trades', 'Unpredictable', 'Reads the opponent'],
  glass_cannon: ['Fragile ego', 'All offense no defense', 'Lives on the edge', 'One-shot mentality'],
  tank: ['Immovable', 'Patient hunter', 'Wears you down', 'Outlast and crush'],
};

function getTraits(stats, seed) {
  const traits = [];
  const { str, mag, spd, vit, def } = stats;
  const avg = (str + mag + spd + def) / 4;
  const hp = stats.hp;

  // Primary trait from highest stat
  const highest = [
    { key: 'high_str', val: str },
    { key: 'high_mag', val: mag },
    { key: 'high_spd', val: spd },
    { key: 'high_vit', val: vit || Math.round((hp - 400) / 12) },
    { key: 'high_def', val: def },
  ].sort((a, b) => b.val - a.val);

  traits.push(pick(TRAIT_POOLS[highest[0].key], seed));
  traits.push(pick(TRAIT_POOLS[highest[1].key], seed >> 3));

  // Archetype trait
  if (str > 65 && hp < 1000) traits.push(pick(TRAIT_POOLS.glass_cannon, seed >> 5));
  else if (def > 55 && hp > 1000) traits.push(pick(TRAIT_POOLS.tank, seed >> 5));
  else traits.push(pick(TRAIT_POOLS.balanced, seed >> 5));

  return traits.slice(0, 3);
}

// ─── Battle style — how this rig fights ───

const BATTLE_STYLES = {
  APEX:      'Transcends mortal combat. Regenerates between strikes, hits with machine precision, and never flinches.',
  TITAN:     'Overwhelms with superior stats across the board. No weakness to exploit.',
  HIVEMIND:  'Floods the field with parallel attacks. Every thread is a weapon.',
  ARCMAGE:   'Channels devastating GPU magic. Weak in melee, terrifying at range.',
  BLITZ:     'Strikes first, strikes fast. The fight is over before the opponent\'s turn.',
  FORTRESS:  'Absorbs punishment and retaliates. Patience is its sharpest weapon.',
  BERSERKER: 'Pure offense. Trades defense for overwhelming CPU-driven damage.',
  PHANTOM:   'Dodges and counters. Hard to hit, harder to predict.',
  NOMAD:     'Adaptable and resourceful. Compensates for thermal limits with clever play.',
  SCRAPPER:  'Fights dirty. No fancy moves — just survival instinct and raw determination.',
  SENTINEL:  'Methodical and consistent. Wins through reliability, not flash.',
};

// ─── Hardware fun facts ───

function getHardwareFacts(specs) {
  const facts = [];
  const cores = specs.cpu?.cores || 0;
  const threads = specs.cpu?.threads || 0;
  const ramGB = specs.ram?.totalGB || 0;
  const vramMB = specs.gpu?.vramMB || 0;
  const storType = specs.storage?.type || 'HDD';
  const speedMax = specs.cpu?.speedMax || 0;
  const gpuModel = (specs.gpu?.model || '').toLowerCase();

  if (cores >= 16) facts.push(`${cores} cores — more threads than a silk factory`);
  else if (cores >= 8) facts.push(`${cores} cores — serious parallel processing`);
  else if (cores <= 2) facts.push(`${cores} cores — doing a lot with a little`);

  if (threads > cores * 1.5) facts.push('Hyperthreaded — fights on multiple fronts');

  if (ramGB >= 64) facts.push(`${ramGB}GB RAM — could load the entire internet into memory`);
  else if (ramGB >= 32) facts.push(`${ramGB}GB RAM — Chrome tabs fear nothing`);
  else if (ramGB <= 4) facts.push(`${ramGB}GB RAM — every byte is precious`);

  if (vramMB >= 24000) facts.push(`${Math.round(vramMB / 1024)}GB VRAM — renders reality in real-time`);
  else if (vramMB >= 12000) facts.push(`${Math.round(vramMB / 1024)}GB VRAM — ray tracing is just the beginning`);
  else if (vramMB === 0) facts.push('Integrated graphics — magic drawn from shared memory');

  if (storType === 'NVMe') facts.push('NVMe storage — loads before the electrons arrive');
  else if (storType === 'HDD') facts.push('HDD storage — old school, spinning platters of data');

  if (speedMax >= 5.5) facts.push(`${speedMax}GHz — clock speed that makes physicists nervous`);
  else if (speedMax >= 5.0) facts.push(`${speedMax}GHz — breaking the 5 wall`);

  if (gpuModel.includes('4090') || gpuModel.includes('h100') || gpuModel.includes('a100')) {
    facts.push('Flagship GPU — the silicon lottery jackpot');
  }

  if (specs.isLaptop) facts.push('Laptop chassis — power constrained but never outmatched');

  return facts.slice(0, 4);
}

// ─── Main lore generator ───

function generateLore(stats, specs, archetype) {
  const id = specs.id || specs.cpu?.brand || 'unknown';
  const seed = hash(id);
  const archKey = findArchKey(archetype);

  const origin = pick(ORIGINS[archKey] || ORIGINS.SENTINEL, seed);
  const traits = getTraits(stats, seed);
  const battleStyle = BATTLE_STYLES[archKey] || BATTLE_STYLES.SENTINEL;
  const facts = getHardwareFacts(specs);

  return { origin, traits, battleStyle, facts };
}

// Map archetype object back to its key
function findArchKey(archetype) {
  if (!archetype) return 'SENTINEL';
  const name = archetype.name || '';
  const MAP = {
    KERNEL_GOD: 'APEX', ROOT_GOD: 'TITAN', FORK_BOMB: 'HIVEMIND', SHADER_WITCH: 'ARCMAGE',
    ZERO_DAY: 'BLITZ', MALLOC_WALL: 'FORTRESS', STACK_SMASHER: 'BERSERKER',
    GHOST_PROC: 'PHANTOM', SSH_DRIFTER: 'NOMAD', SEG_FAULT: 'SCRAPPER',
    DAEMON: 'SENTINEL',
  };
  return MAP[name] || 'SENTINEL';
}

module.exports = { generateLore };
