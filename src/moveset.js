// ═══════════════════════════════════════════════════════════════
// MOVESET ASSIGNMENT — Hardware determines your 4 battle moves
// ═══════════════════════════════════════════════════════════════

// Full move pool with stat requirements and display info
const MOVE_POOL = {
  // ── Physical (CPU-based) ──
  CORE_DUMP:        { cat: 'physical', base: 'str', mult: 1.0,  req: 'cpu', minStat: 0,  label: 'Core Dump',        desc: 'process.kill()',     flavor: 'Dumps core memory at the opponent' },
  OVERCLOCK_SURGE:  { cat: 'physical', base: 'str', mult: 1.3,  req: 'cpu', minStat: 60, label: 'Overclock Surge',  desc: 'cpu.turbo(MAX)',     flavor: 'Pushes all cores past safe limits' },
  THREAD_RIPPER:    { cat: 'physical', base: 'str', mult: 1.1,  req: 'cpu', minStat: 50, label: 'Thread Ripper',    desc: 'fork_bomb()',        flavor: 'Spawns threads until something breaks' },
  CACHE_SLAM:       { cat: 'physical', base: 'str', mult: 0.9,  req: 'cpu', minStat: 0,  label: 'Cache Slam',       desc: 'L3.flush(0xFF)',     flavor: 'Flushes L3 cache directly at target' },
  BRANCH_PREDICT:   { cat: 'speed',    base: 'spd', mult: 1.0,  req: 'cpu', minStat: 40, label: 'Branch Predict',   desc: 'specExec.run()',     flavor: 'Predicts and pre-executes the attack' },

  // ── Magic (GPU-based) ──
  VRAM_OVERFLOW:    { cat: 'magic',    base: 'mag', mult: 1.2,  req: 'gpu', minStat: 50, label: 'VRAM Overflow',    desc: 'gpu.alloc(∞)',       flavor: 'Allocates infinite VRAM' },
  SHADER_STORM:     { cat: 'magic',    base: 'mag', mult: 1.0,  req: 'gpu', minStat: 30, label: 'Shader Storm',     desc: 'render.flood()',     flavor: 'Floods the render pipeline' },
  TENSOR_CRUSH:     { cat: 'magic',    base: 'mag', mult: 1.4,  req: 'gpu', minStat: 70, label: 'Tensor Crush',     desc: 'cuda.launch(*)',     flavor: 'Launches every tensor core at once' },
  PIXEL_BARRAGE:    { cat: 'magic',    base: 'mag', mult: 0.8,  req: 'gpu', minStat: 0,  label: 'Pixel Barrage',    desc: 'gl.drawArrays()',    flavor: 'Rapid-fire pixel bombardment' },
  RAY_TRACE_BEAM:   { cat: 'magic',    base: 'mag', mult: 1.1,  req: 'gpu', minStat: 60, label: 'Ray Trace Beam',   desc: 'rt.intersect()',     flavor: 'Traces a ray directly through the target' },

  // ── Speed (Storage-based) ──
  NVME_DASH:        { cat: 'speed',    base: 'spd', mult: 1.0,  req: 'spd', minStat: 50, label: 'NVMe Dash',        desc: 'io.read(0,∞)',       flavor: 'Blitz attack at NVMe speeds' },
  DMA_STRIKE:       { cat: 'speed',    base: 'spd', mult: 1.2,  req: 'spd', minStat: 40, label: 'DMA Strike',       desc: 'dma.transfer()',     flavor: 'Direct memory access bypass attack' },
  INTERRUPT_SPIKE:  { cat: 'speed',    base: 'spd', mult: 0.9,  req: 'spd', minStat: 0,  label: 'Interrupt Spike',  desc: 'IRQ.force(0)',       flavor: 'Forces a hardware interrupt' },

  // ── Special ──
  BLUE_SCREEN:      { cat: 'special',  base: 'str', mult: 1.6,  req: 'cpu', minStat: 70, label: 'Blue Screen',      desc: 'STOP 0x0000007E',    flavor: 'The dreaded BSOD', special: 'stun' },
  KERNEL_PANIC:     { cat: 'special',  base: 'mag', mult: 1.5,  req: 'gpu', minStat: 65, label: 'Kernel Panic',     desc: 'panic("fatal")',     flavor: 'System-level crash attack', special: 'stun' },
  RAM_HEAL:         { cat: 'special',  base: 'vit', mult: 0.5,  req: 'vit', minStat: 0,  label: 'RAM Heal',         desc: 'malloc(HP)',         flavor: 'Allocate fresh memory to recover', special: 'heal' },
  THERMAL_THROTTLE: { cat: 'special',  base: 'str', mult: 0.3,  req: 'cpu', minStat: 30, label: 'Thermal Throttle', desc: 'temp > TJ_MAX',      flavor: 'Overheat the opponent', special: 'debuff' },
  QUANTUM_TUNNEL:   { cat: 'special',  base: 'spd', mult: 2.0,  req: 'spd', minStat: 80, label: 'Quantum Tunnel',   desc: '??undefined??',      flavor: 'Phase through defenses', special: 'pierce' },
};

// Assign 4 moves based on fighter stats
function assignMoveset(stats) {
  const allMoves = Object.entries(MOVE_POOL);

  // Score each move: how well it fits this fighter's stats
  const scored = allMoves.map(([name, move]) => {
    const statVal = stats[move.base] || 0;
    const reqMap = { cpu: 'str', gpu: 'mag', spd: 'spd', vit: 'vit' };
    const reqStat = stats[reqMap[move.req]] || 0;

    // Skip if below minimum stat requirement
    if (reqStat < move.minStat) return null;

    // Score: higher base stat + multiplier = better fit
    const score = statVal * move.mult + reqStat * 0.3;
    return { name, move, score };
  }).filter(Boolean);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick top moves but ensure variety — at least 1 from each available category
  const selected = [];
  const usedCats = new Set();

  // First pass: pick best move from each category
  for (const cat of ['physical', 'magic', 'speed', 'special']) {
    const best = scored.find(s => s.move.cat === cat && !selected.includes(s));
    if (best) {
      selected.push(best);
      usedCats.add(cat);
    }
  }

  // Fill remaining slots from top scorers
  for (const s of scored) {
    if (selected.length >= 4) break;
    if (!selected.includes(s)) {
      selected.push(s);
    }
  }

  // If we still don't have 4 (very weak machines), pad with basics
  while (selected.length < 4) {
    const fallback = scored.find(s => !selected.includes(s)) || scored[0];
    if (fallback && !selected.includes(fallback)) {
      selected.push(fallback);
    } else break;
  }

  return selected.slice(0, 4).map(s => ({
    name: s.name,
    ...s.move,
  }));
}

module.exports = { MOVE_POOL, assignMoveset };
