// Profile PC hardware and map to fighter stats
const si = require('systeminformation');
const nodeos = require('node:os');
const { execSync } = require('node:child_process');

let cachedSpecsPromise = null;

// Fallback: query GPU via PowerShell/WMIC on Windows
function fallbackGPU() {
  try {
    if (process.platform !== 'win32') return null;
    const raw = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json"',
      { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    let gpus = JSON.parse(raw);
    if (!Array.isArray(gpus)) gpus = [gpus];
    // Filter to the one with most VRAM
    gpus.sort((a, b) => (b.AdapterRAM || 0) - (a.AdapterRAM || 0));
    const best = gpus[0];
    if (best && best.Name) {
      return {
        model: best.Name,
        vramMB: Math.round((best.AdapterRAM || 0) / (1024 * 1024)),
        vendor: best.Name.toLowerCase().includes('nvidia') ? 'NVIDIA' :
                best.Name.toLowerCase().includes('amd') ? 'AMD' :
                best.Name.toLowerCase().includes('intel') ? 'Intel' : '',
      };
    }
  } catch {}
  return null;
}

function cleanCpuBrand(brand) {
  return String(brand || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cpuBrandScore(brand) {
  const text = cleanCpuBrand(brand).toLowerCase();
  if (!text || text === 'unknown cpu' || text === 'unknown') return 0;

  let score = 1;
  if (/\d/.test(text)) score += 2;
  if (text.includes('intel') || text.includes('amd') || text.includes('ryzen') || text.includes('xeon') || text.includes('core')) score += 2;
  if (text.includes('family') || text.includes('stepping') || text.includes('authenticamd') || text.includes('genuineintel')) score -= 3;
  if (text.length >= 12) score += 1;
  return score;
}

// Fallback: prefer Windows CIM CPU info, then Node's os.cpus()
function fallbackCPU() {
  try {
    if (process.platform === 'win32') {
      const raw = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, CurrentClockSpeed | ConvertTo-Json"',
        { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).toString().trim();
      let cpus = JSON.parse(raw);
      if (!Array.isArray(cpus)) cpus = [cpus];
      cpus = cpus.filter(Boolean);
      cpus.sort((a, b) =>
        (b.NumberOfLogicalProcessors || 0) - (a.NumberOfLogicalProcessors || 0) ||
        (b.NumberOfCores || 0) - (a.NumberOfCores || 0) ||
        (b.MaxClockSpeed || 0) - (a.MaxClockSpeed || 0)
      );
      const best = cpus[0];
      if (best && best.Name) {
        return {
          brand: cleanCpuBrand(best.Name) || 'Unknown CPU',
          manufacturer: cleanCpuBrand(best.Manufacturer),
          cores: best.NumberOfCores || 0,
          threads: best.NumberOfLogicalProcessors || best.NumberOfCores || 0,
          speed: (best.CurrentClockSpeed || best.MaxClockSpeed || 0) / 1000,
          speedMax: (best.MaxClockSpeed || best.CurrentClockSpeed || 0) / 1000,
        };
      }
    }
  } catch {}

  const cpus = nodeos.cpus();
  if (!cpus.length) return null;
  return {
    brand: cleanCpuBrand(cpus[0].model) || 'Unknown CPU',
    manufacturer: cpus[0].model.includes('Intel') ? 'Intel' :
                   cpus[0].model.includes('AMD') ? 'AMD' : '',
    cores: cpus.length,        // logical cores
    threads: cpus.length,
    speed: cpus[0].speed / 1000, // MHz → GHz
    speedMax: cpus[0].speed / 1000,
  };
}

async function scanSpecsUncached() {
  const [cpu, mem, graphics, disks, os, uuid, chassis] = await Promise.all([
    si.cpu().catch(() => ({})),
    si.mem().catch(() => ({ total: 8 * 1024 ** 3 })),
    si.graphics().catch(() => ({ controllers: [] })),
    si.diskLayout().catch(() => []),
    si.osInfo().catch(() => ({})),
    si.uuid().catch(() => ({})),
    si.chassis().catch(() => ({ type: '' })),
  ]);

  // ── CPU: use systeminformation, fallback to os.cpus() ──
  let cpuInfo = {
    brand: cleanCpuBrand(cpu.brand),
    manufacturer: cleanCpuBrand(cpu.manufacturer),
    cores: cpu.physicalCores || cpu.cores || 0,
    threads: cpu.cores || 0,
    speed: cpu.speed || 0,
    speedMax: cpu.speedMax || cpu.speed || 0,
  };
  const fb = fallbackCPU();
  const cpuLooksWrong = !cpuInfo.brand || cpuInfo.brand === 'Unknown' || cpuInfo.cores === 0;
  if (fb) {
    if (cpuLooksWrong || cpuBrandScore(fb.brand) > cpuBrandScore(cpuInfo.brand)) {
      cpuInfo.brand = fb.brand || cpuInfo.brand;
      cpuInfo.manufacturer = fb.manufacturer || cpuInfo.manufacturer;
    }
    cpuInfo.cores = cpuInfo.cores || fb.cores;
    cpuInfo.threads = cpuInfo.threads || fb.threads;
    cpuInfo.speed = cpuInfo.speed || fb.speed;
    cpuInfo.speedMax = cpuInfo.speedMax || fb.speedMax;
  }
  if (!cpuInfo.brand) cpuInfo.brand = 'Unknown CPU';
  if (!cpuInfo.cores) cpuInfo.cores = 1;
  if (!cpuInfo.threads) cpuInfo.threads = cpuInfo.cores;
  if (!cpuInfo.speed) cpuInfo.speed = 1.0;
  if (!cpuInfo.speedMax) cpuInfo.speedMax = cpuInfo.speed;

  // ── GPU: use systeminformation, fallback to PowerShell query ──
  const gpuControllers = (graphics.controllers || []).slice().sort((a, b) => (b.vram || 0) - (a.vram || 0));
  let gpuMain = gpuControllers[0] || {};

  // Check if systeminformation returned junk (no model, or "Integrated" with 0 VRAM)
  const gpuLooksWrong = !gpuMain.model || gpuMain.model === 'Integrated' ||
    (gpuMain.model.toLowerCase().includes('intel') && gpuControllers.length <= 1 && !gpuMain.model.toLowerCase().includes('arc'));

  if (gpuLooksWrong) {
    const fb = fallbackGPU();
    if (fb && fb.vramMB > (gpuMain.vram || 0)) {
      gpuMain = { model: fb.model, vram: fb.vramMB, vendor: fb.vendor };
    }
  }

  const primaryDisk = disks?.[0] || {};
  const chassisType = (chassis.type || '').toLowerCase();

  return {
    id: uuid.hardware || uuid.os || `${Date.now()}`,
    cpu: cpuInfo,
    ram: {
      totalGB: Math.round((mem.total / (1024 ** 3)) * 10) / 10,
      speed: 3200,
    },
    gpu: {
      model: gpuMain.model || 'Integrated',
      vramMB: gpuMain.vram || 0,
      vendor: gpuMain.vendor || '',
    },
    storage: {
      type: guessDiskType(primaryDisk),
      sizeGB: Math.round((primaryDisk.size || 0) / (1024 ** 3)),
      name: primaryDisk.name || primaryDisk.device || 'Unknown',
    },
    os: {
      platform: os.platform || process.platform,
      distro: os.distro || '',
      hostname: os.hostname || 'unknown',
    },
    isLaptop: chassisType.includes('notebook') || chassisType.includes('laptop')
              || chassisType.includes('portable') || chassisType.includes('sub notebook'),
  };
}

async function getSpecs(options = {}) {
  const { refresh = false } = options;

  if (refresh || !cachedSpecsPromise) {
    cachedSpecsPromise = scanSpecsUncached().catch((err) => {
      cachedSpecsPromise = null;
      throw err;
    });
  }

  const specs = await cachedSpecsPromise;
  return JSON.parse(JSON.stringify(specs));
}

function guessDiskType(disk) {
  const name = (disk.name || '').toLowerCase();
  const type = (disk.type || '').toLowerCase();
  const iface = (disk.interfaceType || '').toLowerCase();

  if (iface.includes('nvme') || name.includes('nvme')) return 'NVMe';
  if (type === 'ssd' || name.includes('ssd')) return 'SSD';
  if (type === 'hdd' || name.includes('hdd')) return 'HDD';
  return 'SSD'; // default assumption for modern machines
}

// Map raw specs to fighter stats (0-100 scale + HP)
function buildStats(specs) {
  // CPU Score: cores * speed * thread bonus
  const cpuRaw = specs.cpu.cores * specs.cpu.speedMax * (1 + specs.cpu.threads / specs.cpu.cores * 0.3);

  // GPU Score: VRAM is the main differentiator
  const gpuRaw = specs.gpu.vramMB > 0 ? specs.gpu.vramMB : 512; // integrated = ~512MB equivalent

  // Storage Score
  const storageMultiplier = { NVMe: 3, SSD: 2, HDD: 1 }[specs.storage.type] || 1;
  const storageRaw = storageMultiplier * 100;

  // RAM Score
  const ramRaw = specs.ram.totalGB;

  // Normalize to 0-100 with diminishing returns (log scale)
  const normalize = (val, min, max) => {
    const clamped = Math.max(min, Math.min(max, val));
    return Math.round(((Math.log(clamped) - Math.log(min)) / (Math.log(max) - Math.log(min))) * 90 + 10);
  };

  const stats = {
    // STR: Raw processing power (CPU cores * speed)
    str: normalize(cpuRaw, 2, 1000),
    // VIT: Endurance / HP pool (RAM)
    vit: normalize(ramRaw, 2, 1024),
    // MAG: Special attack power (GPU)
    mag: normalize(gpuRaw, 256, 98304),
    // SPD: Initiative and dodge (storage + single-thread CPU)
    spd: normalize(specs.cpu.speedMax * storageMultiplier, 1, 20),
    // DEF: Derived — average of VIT and SPD
    def: 0,
  };

  stats.def = Math.round((stats.vit + stats.spd) / 2);

  // Laptop penalty — thermal throttling, shared power, inferior cooling
  if (specs.isLaptop) {
    const penalty = 0.82;  // 18% stat reduction across the board
    stats.str = Math.round(stats.str * penalty);
    stats.vit = Math.round(stats.vit * penalty);
    stats.mag = Math.round(stats.mag * penalty);
    stats.spd = Math.round(stats.spd * penalty);
    stats.def = Math.round(stats.def * penalty);
  }

  // HP: 400 base + VIT scaling
  const hp = 400 + stats.vit * 12;

  return { ...stats, hp, maxHp: hp, isLaptop: !!specs.isLaptop };
}

// Generate a display name for the fighter
function fighterName(specs) {
  const cpu = specs.cpu.brand
    .replace(/\(R\)/gi, '')
    .replace(/\(TM\)/gi, '')
    .replace(/CPU/gi, '')
    .replace(/Processor/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Shorten to something punchy
  if (cpu.length > 24) {
    // Take the model number/name part
    const parts = cpu.split(' ');
    return parts.slice(0, 3).join(' ');
  }
  return cpu;
}

function gpuName(specs) {
  return specs.gpu.model
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

// ─── Archetype classification based on stats + hardware ───
// Returns { name, tagline, color } — the fighter's "species"

const ARCHETYPES = {
  APEX:      { name: 'KERNEL_GOD',    tagline: 'ring -1 — owns the hypervisor' },
  TITAN:     { name: 'ROOT_GOD',      tagline: 'sudo rm -rf /your/chances' },
  HIVEMIND:  { name: 'FORK_BOMB',     tagline: ':(){ :|:& };: — infinite threads' },
  ARCMAGE:   { name: 'SHADER_WITCH',  tagline: 'Pipelines overflow with dark energy' },
  BLITZ:     { name: 'ZERO_DAY',      tagline: 'Exploits land before you patch' },
  FORTRESS:  { name: 'MALLOC_WALL',   tagline: 'Heap so deep nothing gets through' },
  BERSERKER: { name: 'STACK_SMASHER', tagline: 'Buffer overflow is a lifestyle' },
  PHANTOM:   { name: 'GHOST_PROC',    tagline: 'PID unknown — kill -9 can\'t touch this' },
  NOMAD:     { name: 'SSH_DRIFTER',   tagline: 'Connects from anywhere, strikes remote' },
  SCRAPPER:  { name: 'SEG_FAULT',     tagline: 'Shouldn\'t be running — but here we are' },
  SENTINEL:  { name: 'DAEMON',        tagline: 'Always running, always watching' },
};

function classifyArchetype(stats, specs) {
  const { str, mag, spd, def, hp } = stats;
  const cores = specs.cpu?.cores || 4;
  const ramGB = specs.ram?.totalGB || 8;
  const vramMB = specs.gpu?.vramMB || 0;
  const isLaptop = stats.isLaptop || specs.isLaptop || false;
  const gpuModel = (specs.gpu?.model || '').toLowerCase();
  const isIntegrated = vramMB === 0 ||
    (specs.gpu?.vendor === 'Intel' && !gpuModel.includes('arc'));

  const avg = (str + mag + spd + def) / 4;
  const minStat = Math.min(str, mag, spd, def);

  // APEX — supercomputer tier, maxed across every stat (avg ~95+)
  if (avg >= 90 && minStat >= 85) return ARCHETYPES.APEX;

  // TITAN — enthusiast elite, very strong across the board (avg ~76-89)
  if (avg >= 76 && minStat >= 68) return ARCHETYPES.TITAN;

  // SCRAPPER — integrated GPU + weak overall
  if (isIntegrated && avg < 40) return ARCHETYPES.SCRAPPER;

  // HIVEMIND — many-core workstation / threadripper (not already TITAN/APEX)
  if (cores >= 16 && str >= 65) return ARCHETYPES.HIVEMIND;

  // NOMAD — laptop (checked after TITAN so beastly laptops can be TITAN)
  if (isLaptop) return ARCHETYPES.NOMAD;

  // ARCMAGE — GPU powerhouse, magic dominant
  if (mag >= 60 && mag >= str && mag >= spd) return ARCHETYPES.ARCMAGE;

  // BLITZ — speed dominant (fast clock + NVMe)
  if (spd >= 65 && spd >= str + 10 && spd >= mag) return ARCHETYPES.BLITZ;

  // FORTRESS — high RAM tank
  if (def >= 55 && ramGB >= 32) return ARCHETYPES.FORTRESS;

  // BERSERKER — high STR, offense-heavy
  if (str >= 55 && str >= mag + 10) return ARCHETYPES.BERSERKER;

  // PHANTOM — fast but fragile
  if (spd >= 55 && hp <= 800) return ARCHETYPES.PHANTOM;

  // SENTINEL — balanced mid-range (default)
  return ARCHETYPES.SENTINEL;
}

module.exports = { getSpecs, buildStats, fighterName, gpuName, classifyArchetype };
