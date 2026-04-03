// ═══════════════════════════════════════════════════════════════
// MOVESET — Expanded pool, hardware-gated, loadout persistence
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');

const WSO_DIR = path.join(__dirname, '..', '.rigemon');
const LOADOUT_FILE = path.join(WSO_DIR, 'loadout.json');

// ─── Full Move Pool (expanded) ───
const MOVE_POOL = {
  // ══ Physical (CPU) ══
  CORE_DUMP:        { cat: 'physical', base: 'str', mult: 1.0,  req: 'cpu', minStat: 0,  label: 'Core Dump',        desc: 'process.kill()',     flavor: 'Dumps core memory at the opponent' },
  OVERCLOCK_SURGE:  { cat: 'physical', base: 'str', mult: 1.3,  req: 'cpu', minStat: 60, label: 'Overclock Surge',  desc: 'cpu.turbo(MAX)',     flavor: 'Pushes all cores past safe limits' },
  THREAD_RIPPER:    { cat: 'physical', base: 'str', mult: 1.1,  req: 'cpu', minStat: 50, label: 'Thread Ripper',    desc: 'fork_bomb()',        flavor: 'Spawns threads until something breaks' },
  CACHE_SLAM:       { cat: 'physical', base: 'str', mult: 0.9,  req: 'cpu', minStat: 0,  label: 'Cache Slam',       desc: 'L3.flush(0xFF)',     flavor: 'Flushes L3 cache directly at target' },
  BRANCH_PREDICT:   { cat: 'speed',    base: 'spd', mult: 1.0,  req: 'cpu', minStat: 40, label: 'Branch Predict',   desc: 'specExec.run()',     flavor: 'Predicts and pre-executes the attack' },
  STACK_SMASH:      { cat: 'physical', base: 'str', mult: 1.2,  req: 'cpu', minStat: 45, label: 'Stack Smash',      desc: 'buffer.overflow()',  flavor: 'Corrupts the stack frame violently' },
  PIPELINE_FLUSH:   { cat: 'physical', base: 'str', mult: 0.8,  req: 'cpu', minStat: 0,  label: 'Pipeline Flush',   desc: 'pipe.flush(ALL)',    flavor: 'Clears the entire instruction pipeline' },
  HYPER_THREAD:     { cat: 'physical', base: 'str', mult: 1.15, req: 'cpu', minStat: 55, label: 'Hyper Thread',     desc: 'smt.parallel()',     flavor: 'Simultaneous multi-threaded assault' },

  // ══ Magic (GPU) ══
  VRAM_OVERFLOW:    { cat: 'magic',    base: 'mag', mult: 1.2,  req: 'gpu', minStat: 50, label: 'VRAM Overflow',    desc: 'gpu.alloc(∞)',       flavor: 'Allocates infinite VRAM' },
  SHADER_STORM:     { cat: 'magic',    base: 'mag', mult: 1.0,  req: 'gpu', minStat: 30, label: 'Shader Storm',     desc: 'render.flood()',     flavor: 'Floods the render pipeline' },
  TENSOR_CRUSH:     { cat: 'magic',    base: 'mag', mult: 1.4,  req: 'gpu', minStat: 70, label: 'Tensor Crush',     desc: 'cuda.launch(*)',     flavor: 'Launches every tensor core at once' },
  PIXEL_BARRAGE:    { cat: 'magic',    base: 'mag', mult: 0.8,  req: 'gpu', minStat: 0,  label: 'Pixel Barrage',    desc: 'gl.drawArrays()',    flavor: 'Rapid-fire pixel bombardment' },
  RAY_TRACE_BEAM:   { cat: 'magic',    base: 'mag', mult: 1.1,  req: 'gpu', minStat: 60, label: 'Ray Trace Beam',   desc: 'rt.intersect()',     flavor: 'Traces a ray directly through the target' },
  COMPUTE_WAVE:     { cat: 'magic',    base: 'mag', mult: 1.05, req: 'gpu', minStat: 40, label: 'Compute Wave',     desc: 'cl.enqueue()',       flavor: 'OpenCL compute kernel barrage' },
  FRAMEBUFFER_BOMB: { cat: 'magic',    base: 'mag', mult: 0.9,  req: 'gpu', minStat: 20, label: 'Framebuffer Bomb', desc: 'fb.corrupt()',       flavor: 'Corrupts the framebuffer entirely' },
  DLSS_UPSCALE:     { cat: 'magic',    base: 'mag', mult: 1.25, req: 'gpu', minStat: 65, label: 'DLSS Upscale',     desc: 'ai.upscale(4x)',     flavor: 'AI-enhanced quadruple damage scaling' },

  // ══ Speed (Storage/IO) ══
  NVME_DASH:        { cat: 'speed',    base: 'spd', mult: 1.0,  req: 'spd', minStat: 50, label: 'NVMe Dash',        desc: 'io.read(0,∞)',       flavor: 'Blitz attack at NVMe speeds' },
  DMA_STRIKE:       { cat: 'speed',    base: 'spd', mult: 1.2,  req: 'spd', minStat: 40, label: 'DMA Strike',       desc: 'dma.transfer()',     flavor: 'Direct memory access bypass attack' },
  INTERRUPT_SPIKE:  { cat: 'speed',    base: 'spd', mult: 0.9,  req: 'spd', minStat: 0,  label: 'Interrupt Spike',  desc: 'IRQ.force(0)',       flavor: 'Forces a hardware interrupt' },
  QUICK_FORMAT:     { cat: 'speed',    base: 'spd', mult: 1.1,  req: 'spd', minStat: 35, label: 'Quick Format',     desc: 'disk.format(fast)',  flavor: 'Wipes the target drive at speed' },
  DEFRAG_STRIKE:    { cat: 'speed',    base: 'spd', mult: 0.85, req: 'spd', minStat: 0,  label: 'Defrag Strike',    desc: 'disk.defrag()',      flavor: 'Rearranges the opponent from inside' },

  // ══ Special ══
  BLUE_SCREEN:      { cat: 'special',  base: 'str', mult: 1.6,  req: 'cpu', minStat: 70, label: 'Blue Screen',      desc: 'STOP 0x0000007E',    flavor: 'The dreaded BSOD', special: 'stun' },
  KERNEL_PANIC:     { cat: 'special',  base: 'mag', mult: 1.5,  req: 'gpu', minStat: 65, label: 'Kernel Panic',     desc: 'panic("fatal")',     flavor: 'System-level crash attack', special: 'stun' },
  RAM_HEAL:         { cat: 'special',  base: 'vit', mult: 0.5,  req: 'vit', minStat: 0,  label: 'RAM Heal',         desc: 'malloc(HP)',         flavor: 'Allocate fresh memory to recover', special: 'heal' },
  THERMAL_THROTTLE: { cat: 'special',  base: 'str', mult: 0.3,  req: 'cpu', minStat: 30, label: 'Thermal Throttle', desc: 'temp > TJ_MAX',      flavor: 'Overheat the opponent', special: 'debuff' },
  QUANTUM_TUNNEL:   { cat: 'special',  base: 'spd', mult: 2.0,  req: 'spd', minStat: 80, label: 'Quantum Tunnel',   desc: '??undefined??',      flavor: 'Phase through defenses', special: 'pierce' },
  MEMORY_LEAK:      { cat: 'special',  base: 'vit', mult: 0.4,  req: 'vit', minStat: 30, label: 'Memory Leak',      desc: 'while(1)malloc()',   flavor: 'Slowly drain opponent HP each turn', special: 'dot' },
  SAFE_MODE:        { cat: 'special',  base: 'vit', mult: 0.3,  req: 'vit', minStat: 0,  label: 'Safe Mode',        desc: 'boot.safe()',        flavor: 'Reduce damage taken for 2 turns', special: 'harden' },
  ROOTKIT:          { cat: 'special',  base: 'spd', mult: 1.3,  req: 'spd', minStat: 55, label: 'Rootkit',          desc: 'root.inject()',      flavor: 'Bypass defenses entirely', special: 'pierce' },
};

// Get all moves a fighter's hardware qualifies for.
// If specs + archetype provided, signature moves are included at the front.
function getAvailableMoves(stats, specs, archetype) {
  const reqMap = { cpu: 'str', gpu: 'mag', spd: 'spd', vit: 'vit' };
  const pool = Object.entries(MOVE_POOL)
    .filter(([, move]) => {
      const reqStat = stats[reqMap[move.req]] || 0;
      return reqStat >= move.minStat;
    })
    .map(([name, move]) => ({ name, ...move }));

  if (specs && archetype) {
    const { generateSignatureMoves } = require('./signature');
    const sig = generateSignatureMoves(stats, specs, archetype);
    return [...sig, ...pool];
  }

  return pool;
}

// Score and auto-assign best 4 moves (regular pool only)
function assignMoveset(stats) {
  const available = getAvailableMoves(stats);

  const scored = available.map(move => {
    const statVal = stats[move.base] || 0;
    const score = statVal * move.mult;
    return { ...move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick best per category, then fill
  const selected = [];
  const usedCats = new Set();

  for (const cat of ['physical', 'magic', 'speed', 'special']) {
    const best = scored.find(s => s.cat === cat && !selected.includes(s));
    if (best) { selected.push(best); usedCats.add(cat); }
  }

  for (const s of scored) {
    if (selected.length >= 4) break;
    if (!selected.includes(s)) selected.push(s);
  }

  return selected.slice(0, 4);
}

// ─── Loadout persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadLoadout() {
  try {
    if (!fs.existsSync(LOADOUT_FILE)) return null;
    return JSON.parse(fs.readFileSync(LOADOUT_FILE, 'utf8'));
  } catch { return null; }
}

function saveLoadout(moveNames) {
  ensureDir();
  fs.writeFileSync(LOADOUT_FILE, JSON.stringify(moveNames, null, 2));
}

// Get equipped moves — either from saved loadout or auto-assigned.
// Accepts optional specs/archetype to resolve signature moves in saved loadouts.
function getEquippedMoves(stats, specs, archetype) {
  const saved = loadLoadout();
  if (saved && Array.isArray(saved) && saved.length === 4) {
    // Build a lookup for signature moves so saved loadouts can reference them
    let sigLookup = {};
    if (specs && archetype) {
      const { generateSignatureMoves } = require('./signature');
      const sig = generateSignatureMoves(stats, specs, archetype);
      sigLookup = Object.fromEntries(sig.map(m => [m.name, m]));
    }

    const reqMap = { cpu: 'str', gpu: 'mag', spd: 'spd', vit: 'vit' };
    const equipped = saved
      .map(name => {
        // Check signature moves first
        if (sigLookup[name]) return sigLookup[name];
        // Then regular pool
        const move = MOVE_POOL[name];
        if (!move) return null;
        const reqStat = stats[reqMap[move.req]] || 0;
        if (reqStat < move.minStat) return null;
        return { name, ...move };
      })
      .filter(Boolean);

    if (equipped.length === 4) return equipped;
  }
  // Fallback to auto-assignment
  return assignMoveset(stats);
}

module.exports = {
  MOVE_POOL, getAvailableMoves, assignMoveset,
  loadLoadout, saveLoadout, getEquippedMoves,
};
