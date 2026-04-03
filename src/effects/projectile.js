// ═══════════════════════════════════════════════════════════════
// ATTACK ANIMATIONS — Each move gets a unique, dramatic visual
// ═══════════════════════════════════════════════════════════════

const { colors, rgb } = require('../palette');

// ─── Per-move animation configs ───
// Each defines: how the projectile looks, moves, and what screen effects it triggers

const MOVE_ANIMS = {
  // ══════ PHYSICAL ══════
  CORE_DUMP: {
    style: 'multishot',       // 3 small bolts in sequence
    lead: ['█', '▓', '▒'],
    trail: ['▒', '░', '·'],
    color: colors.peach,
    trailColor: colors.coral,
    speed: 0.09,
    trailLen: 4,
    count: 3,                 // number of sub-projectiles
    spread: 2,                // vertical spread between them
    screenEffect: null,
  },
  OVERCLOCK_SURGE: {
    style: 'beam',            // wide horizontal beam that fills the path
    lead: ['►', '▶', '▷'],
    trail: ['═', '═', '═', '─', '─', '·'],
    color: rgb(255, 200, 80),
    trailColor: rgb(200, 140, 40),
    speed: 0.04,              // slower = beam stays visible longer
    trailLen: 20,             // LONG trail = beam effect
    beamWidth: 3,             // draws on 3 rows (y-1, y, y+1)
    screenEffect: 'flash',    // brief full-screen flash
  },
  THREAD_RIPPER: {
    style: 'swarm',           // burst of scattered particles
    lead: ['╳', '╬', '┼', '╪'],
    trail: ['·', '·'],
    color: colors.peach,
    trailColor: colors.dimmer,
    speed: 0.12,
    trailLen: 2,
    count: 6,
    spread: 5,
    screenEffect: null,
  },
  CACHE_SLAM: {
    style: 'slam',
    lead: ['▓', '▒'],
    trail: ['░', '·', '·'],
    color: rgb(220, 160, 100),
    trailColor: colors.dim,
    speed: 0.07,
    trailLen: 3,
    screenEffect: null,
  },
  BRANCH_PREDICT: {
    style: 'zigzag',          // projectile zigzags unpredictably
    lead: ['◆', '◇', '◆'],
    trail: ['╱', '╲', '╱', '╲'],
    color: colors.sky,
    trailColor: colors.dimmer,
    speed: 0.08,
    trailLen: 6,
    zigAmplitude: 3,
    screenEffect: null,
  },

  // ══════ MAGIC (GPU) ══════
  VRAM_OVERFLOW: {
    style: 'wave',            // expanding wave that scrolls across screen
    lead: ['█', '▓', '▒', '░'],
    trail: [],
    color: colors.lavender,
    trailColor: colors.glitch,
    speed: 0.05,
    trailLen: 0,
    waveWidth: 4,             // columns wide the wave front is
    screenEffect: 'columnGlitch',
  },
  SHADER_STORM: {
    style: 'rain',            // vertical rain of characters between attacker and target
    lead: ['▓', '▒', '░', '│', '┃'],
    trail: ['·'],
    color: colors.cyan,
    trailColor: colors.dimmer,
    speed: 0.06,
    trailLen: 1,
    count: 12,
    screenEffect: 'flash',
  },
  TENSOR_CRUSH: {
    style: 'beam',            // massive beam — the biggest attack
    lead: ['►', '▶', '█'],
    trail: ['█', '█', '▓', '▓', '▒', '▒', '░', '░', '·'],
    color: rgb(200, 100, 255),
    trailColor: rgb(140, 60, 200),
    speed: 0.035,
    trailLen: 25,
    beamWidth: 5,             // 5 rows tall!
    screenEffect: 'flash',
  },
  PIXEL_BARRAGE: {
    style: 'swarm',
    lead: ['■', '□', '▪', '▫', '●', '○'],
    trail: ['·'],
    color: colors.mint,
    trailColor: colors.dimmer,
    speed: 0.1,
    trailLen: 2,
    count: 8,
    spread: 6,
    screenEffect: null,
  },
  RAY_TRACE_BEAM: {
    style: 'laser',           // instant line from source to target, persists
    lead: ['─'],
    trail: ['─', '─', '─', '─'],
    color: rgb(255, 80, 80),
    trailColor: rgb(180, 40, 40),
    speed: 0.15,              // fast — laser is near-instant
    trailLen: 50,             // fills entire path
    beamWidth: 1,
    screenEffect: 'flash',
  },

  // ══════ SPEED ══════
  NVME_DASH: {
    style: 'dash',            // instant teleport trail — appears all at once then fades
    lead: ['»', '›', '›'],
    trail: ['─', '─', '─', '─', '·', '·'],
    color: colors.sky,
    trailColor: rgb(80, 120, 180),
    speed: 0.2,               // very fast
    trailLen: 15,
    screenEffect: null,
  },
  DMA_STRIKE: {
    style: 'zigzag',
    lead: ['◆', '◇'],
    trail: ['╱', '╲', '·'],
    color: rgb(100, 220, 180),
    trailColor: colors.dimmer,
    speed: 0.1,
    trailLen: 5,
    zigAmplitude: 4,
    screenEffect: null,
  },
  INTERRUPT_SPIKE: {
    style: 'basic',
    lead: ['▸', '▹'],
    trail: ['·'],
    color: colors.gold,
    trailColor: colors.dim,
    speed: 0.1,
    trailLen: 2,
    screenEffect: null,
  },

  // ══════ SPECIAL ══════
  BLUE_SCREEN: {
    style: 'fullscreen',      // entire screen flashes blue with BSOD text
    lead: [],
    trail: [],
    color: rgb(0, 80, 200),
    trailColor: rgb(0, 80, 200),
    speed: 0.05,
    trailLen: 0,
    screenEffect: 'bsod',
  },
  KERNEL_PANIC: {
    style: 'fullscreen',
    lead: [],
    trail: [],
    color: colors.rose,
    trailColor: colors.rose,
    speed: 0.05,
    trailLen: 0,
    screenEffect: 'panic',
  },
  RAM_HEAL: {
    style: 'heal',            // upward sparkles on self
    lead: ['+', '✦', '◆'],
    trail: ['·', '°'],
    color: colors.mint,
    trailColor: rgb(80, 180, 120),
    speed: 0.06,
    trailLen: 3,
    count: 5,
    screenEffect: null,
  },
  THERMAL_THROTTLE: {
    style: 'wave',
    lead: ['░', '▒', '▓'],
    trail: [],
    color: rgb(255, 100, 40),
    trailColor: rgb(180, 60, 20),
    speed: 0.04,
    trailLen: 0,
    waveWidth: 6,
    screenEffect: 'heat',
  },
  QUANTUM_TUNNEL: {
    style: 'warp',            // disappears and reappears at target
    lead: ['◈', '◇', '◆'],
    trail: ['·', '·', '·'],
    color: colors.gold,
    trailColor: colors.lilac,
    speed: 0.04,
    trailLen: 3,
    screenEffect: 'glitchWave',
  },

  // ══════ NEW PHYSICAL ══════
  STACK_SMASH: {
    style: 'slam',            // heavy overhead slam — screen shakes
    lead: ['█', '▓', '█'],
    trail: ['▓', '▒', '▒', '░', '·'],
    color: rgb(240, 120, 80),
    trailColor: rgb(180, 80, 50),
    speed: 0.05,
    trailLen: 6,
    screenEffect: 'shake',
  },
  PIPELINE_FLUSH: {
    style: 'flush',           // NEW: horizontal bands sweep across the screen like data clearing
    lead: ['═', '═', '═'],
    trail: [],
    color: colors.peach,
    trailColor: colors.dimmer,
    speed: 0.06,
    trailLen: 0,
    flushLines: 5,
    screenEffect: null,
  },
  HYPER_THREAD: {
    style: 'helix',           // NEW: double helix spiral — two intertwined projectiles
    lead: ['◆', '◇'],
    trail: ['·', '·', '·'],
    color: rgb(255, 180, 100),
    trailColor: rgb(200, 120, 60),
    speed: 0.06,
    trailLen: 8,
    screenEffect: null,
  },

  // ══════ NEW MAGIC ══════
  COMPUTE_WAVE: {
    style: 'codestorm',       // NEW: storm of code fragments swirling around the target
    lead: [],
    trail: [],
    color: colors.cyan,
    trailColor: colors.dimmer,
    speed: 0.04,
    trailLen: 0,
    stormRadius: 8,
    stormCount: 15,
    screenEffect: null,
  },
  FRAMEBUFFER_BOMB: {
    style: 'explosion',       // NEW: expanding ring of pixels from target center
    lead: ['■', '□', '▪', '▫'],
    trail: [],
    color: colors.rose,
    trailColor: colors.coral,
    speed: 0.05,
    trailLen: 0,
    screenEffect: 'flash',
  },
  DLSS_UPSCALE: {
    style: 'upscale',         // NEW: small projectile that GROWS as it travels, arriving huge
    lead: ['·', '●', '◆', '█'],
    trail: ['░', '▒', '▓'],
    color: rgb(100, 220, 255),
    trailColor: rgb(60, 150, 200),
    speed: 0.05,
    trailLen: 10,
    screenEffect: 'flash',
  },

  // ══════ NEW SPEED ══════
  QUICK_FORMAT: {
    style: 'wipe',            // NEW: progress bar sweeps across target area, "formatting"
    lead: ['█'],
    trail: [],
    color: colors.sky,
    trailColor: colors.dimmer,
    speed: 0.04,
    trailLen: 0,
    screenEffect: null,
  },
  DEFRAG_STRIKE: {
    style: 'scatter_reform',  // NEW: target breaks into pieces, then snaps back together (damage applied)
    lead: ['▪', '▫', '■', '□'],
    trail: [],
    color: rgb(180, 200, 140),
    trailColor: colors.dim,
    speed: 0.04,
    trailLen: 0,
    count: 10,
    screenEffect: null,
  },

  // ══════ NEW SPECIAL ══════
  MEMORY_LEAK: {
    style: 'drip',            // NEW: slow dripping characters falling from target, persistent feel
    lead: ['▓', '▒', '░', '·'],
    trail: [],
    color: rgb(160, 255, 120),
    trailColor: rgb(80, 180, 60),
    speed: 0.04,
    trailLen: 0,
    dripCount: 8,
    screenEffect: null,
  },
  SAFE_MODE: {
    style: 'shield_up',      // NEW: protective dome of characters forming around self
    lead: ['╔', '═', '╗', '║', '╚', '╝'],
    trail: [],
    color: rgb(140, 190, 250),
    trailColor: rgb(80, 120, 180),
    speed: 0.05,
    trailLen: 0,
    screenEffect: null,
  },
  ROOTKIT: {
    style: 'infiltrate',     // NEW: invisible approach, then sudden burst of code at target
    lead: [],
    trail: [],
    color: rgb(180, 40, 60),
    trailColor: rgb(120, 25, 40),
    speed: 0.04,
    trailLen: 0,
    screenEffect: 'glitchWave',
  },
};

// ══════ SIGNATURE MOVE ANIMATIONS ══════
// Signature moves get dramatic, multi-phase visuals unique to their category.
// These are the showstoppers — nothing else in the game looks like them.

const SIGNATURE_ANIMS = {
  physical: {
    style: 'sig_physical',       // multi-phase: charge → dash → shockwave
    lead: ['█', '▓', '▒'],
    trail: ['█', '▓', '▒', '░', '░', '·'],
    color: rgb(255, 200, 50),
    trailColor: rgb(200, 140, 20),
    accentColor: rgb(255, 255, 180),
    speed: 0.025,
    trailLen: 30,
    beamWidth: 5,
    screenEffect: 'flash',
  },
  magic: {
    style: 'sig_magic',          // multi-phase: runes appear → converge → detonation
    lead: ['◈', '✦', '★', '◆'],
    trail: ['·', '°', '·'],
    color: rgb(200, 120, 255),
    trailColor: rgb(140, 60, 220),
    accentColor: rgb(255, 180, 255),
    speed: 0.022,
    trailLen: 0,
    screenEffect: 'flash',
  },
  speed: {
    style: 'sig_speed',          // multi-phase: afterimages → blink strike → static burst
    lead: ['»', '›', '▸'],
    trail: ['─', '─', '·'],
    color: rgb(80, 220, 255),
    trailColor: rgb(40, 140, 200),
    accentColor: rgb(200, 240, 255),
    speed: 0.03,
    trailLen: 20,
    screenEffect: 'glitchWave',
  },
  special: {
    style: 'sig_special',        // multi-phase: screen corrupt → code cascade → reset
    lead: [],
    trail: [],
    color: rgb(255, 215, 0),
    trailColor: rgb(255, 170, 50),
    accentColor: rgb(255, 255, 200),
    speed: 0.02,
    trailLen: 0,
    screenEffect: 'flash',
  },
};

// Synergy moves: dual-helix with expanding rings at midpoint
const SIGNATURE_SYNERGY_ANIM = {
  style: 'sig_synergy',
  lead: ['◆', '◇', '★'],
  trail: ['═', '═', '─', '─', '·', '·'],
  color: rgb(255, 180, 60),
  trailColor: rgb(200, 100, 255),
  accentColor: rgb(255, 255, 100),
  speed: 0.025,
  trailLen: 20,
  screenEffect: 'flash',
};

// Register signature moves into MOVE_ANIMS so existing projectile code works
function registerSignatureAnims(signatureMoves) {
  for (const move of signatureMoves) {
    if (!move || !move.name || MOVE_ANIMS[move.name]) continue;
    // Synergy moves (have altBase) get the dual-color helix
    if (move.altBase) {
      MOVE_ANIMS[move.name] = { ...SIGNATURE_SYNERGY_ANIM };
    } else {
      // Ultimate moves get category-based signature anim
      MOVE_ANIMS[move.name] = { ...(SIGNATURE_ANIMS[move.cat] || SIGNATURE_ANIMS.physical) };
    }
  }
}

// Fallback for moves not in the map — deliberately simple
const DEFAULT_ANIM = {
  style: 'basic',
  lead: ['·', '•'],
  trail: ['·'],
  color: colors.dim,
  trailColor: colors.ghost,
  speed: 0.08,
  trailLen: 3,
  screenEffect: null,
};

// ─── Projectile class (enhanced) ───

class Projectile {
  constructor(startX, startY, endX, endY, moveName, rng) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.x = startX;
    this.y = startY;
    this.progress = 0;
    this.anim = MOVE_ANIMS[moveName] || DEFAULT_ANIM;
    this.alive = true;
    this.trail = [];
    this.rng = rng;
    this.moveName = moveName;
    this.arcHeight = Math.abs(endY - startY) * 0.25 + 1.5;
    this.subProjectiles = [];
    this.age = 0;

    // Spawn sub-projectiles for multi-shot / swarm styles
    if (this.anim.style === 'multishot' || this.anim.style === 'swarm') {
      const count = this.anim.count || 3;
      const spread = this.anim.spread || 2;
      for (let i = 0; i < count; i++) {
        this.subProjectiles.push({
          offsetX: rng.float(-2, 2),
          offsetY: rng.float(-spread, spread),
          delay: i * 3,  // stagger by frames
          char: this.anim.lead[i % this.anim.lead.length],
          trail: [],
        });
      }
    }
    // Rain style: vertical drops between attacker and target
    if (this.anim.style === 'rain') {
      const count = this.anim.count || 8;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      for (let i = 0; i < count; i++) {
        this.subProjectiles.push({
          x: minX + rng.float(0, maxX - minX),
          y: rng.float(1, 6),
          speed: rng.float(0.3, 0.8),
          char: this.anim.lead[i % this.anim.lead.length],
          life: rng.int(8, 16),
        });
      }
    }
    // Codestorm: orbiting code fragments around target
    if (this.anim.style === 'codestorm') {
      const CODE_BITS = ['if()', 'for{}', '0xFF', 'null', 'sudo', 'rm -f', '>>>',  'err!', '&&', '||', 'int', 'void', '$_', '{}', '[];'];
      const count = this.anim.stormCount || 12;
      for (let i = 0; i < count; i++) {
        this.subProjectiles.push({
          angle: rng.float(0, Math.PI * 2),
          radius: rng.float(3, this.anim.stormRadius || 8),
          speed: rng.float(0.08, 0.2) * (rng.chance(0.5) ? 1 : -1),
          text: CODE_BITS[Math.floor(rng.next() * CODE_BITS.length)],
          life: rng.int(12, 22),
        });
      }
    }
    // Drip: falling characters from target area
    if (this.anim.style === 'drip') {
      const count = this.anim.dripCount || 6;
      for (let i = 0; i < count; i++) {
        this.subProjectiles.push({
          x: endX + rng.int(-5, 5),
          y: endY + rng.int(-2, 0),
          speed: rng.float(0.15, 0.4),
          char: this.anim.lead[i % this.anim.lead.length],
          life: rng.int(10, 20),
          delay: i * 2,
        });
      }
    }
    // Scatter_reform: pieces explode out then converge back
    if (this.anim.style === 'scatter_reform') {
      const count = this.anim.count || 10;
      for (let i = 0; i < count; i++) {
        const angle = rng.float(0, Math.PI * 2);
        const dist = rng.float(4, 10);
        this.subProjectiles.push({
          homeX: endX,
          homeY: endY,
          angle,
          dist,
          char: this.anim.lead[i % this.anim.lead.length],
        });
      }
    }
    // Explosion: expanding ring of particles
    if (this.anim.style === 'explosion') {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        this.subProjectiles.push({
          angle,
          char: this.anim.lead[i % this.anim.lead.length],
        });
      }
    }
  }

  update() {
    this.age++;

    // Already dead — just drain trail and count down
    if (!this.alive) {
      if (this.trail.length > 0) this.trail.shift();
      return;
    }

    // Non-traveling styles — just have a duration, no position tracking
    const durationOnly = ['fullscreen','heal','codestorm','explosion','drip','shield_up','wipe','flush','scatter_reform','infiltrate','sig_physical','sig_magic','sig_speed','sig_special','sig_synergy'];
    if (durationOnly.includes(this.anim.style)) {
      this.progress += this.anim.speed;
      if (this.progress >= 1.0) this.alive = false;
      return;
    }

    // Advance progress
    this.progress += this.anim.speed;
    if (this.progress >= 1.0) {
      this.alive = false;
      this.x = this.endX;
      this.y = this.endY;
      return;
    }

    // Store trail (only while alive)
    this.trail.push({ x: this.x, y: this.y });
    const maxTrail = this.anim.trailLen || 4;
    while (this.trail.length > maxTrail) this.trail.shift();

    // Move
    const t = this.progress;
    this.x = this.startX + (this.endX - this.startX) * t;

    if (this.anim.style === 'zigzag') {
      const amp = this.anim.zigAmplitude || 3;
      const zig = Math.sin(t * Math.PI * 6) * amp;
      this.y = this.startY + (this.endY - this.startY) * t + zig;
    } else if (this.anim.style === 'warp') {
      if (t < 0.3 || t > 0.7) {
        this.y = this.startY + (this.endY - this.startY) * t;
      } else {
        this.y = -100;
      }
    } else {
      const arc = -4 * this.arcHeight * (t * t - t);
      this.y = this.startY + (this.endY - this.startY) * t - arc;
    }

    // Update rain sub-projectiles (NO respawn — they fall once and die)
    if (this.anim.style === 'rain') {
      let anyAlive = false;
      for (const drop of this.subProjectiles) {
        if (drop.life <= 0) continue;
        drop.y += drop.speed;
        drop.life--;
        if (drop.life > 0) anyAlive = true;
      }
      // Kill projectile when all drops are gone
      if (!anyAlive && this.progress > 0.5) this.alive = false;
    }
  }

  // Whether this projectile has anything left to render
  get done() {
    return !this.alive && this.trail.length === 0;
  }

  draw(screen) {
    if (this.done) return;

    const a = this.anim;
    const w = screen.width;
    const h = screen.height;

    // ── FULLSCREEN EFFECTS ──
    if (a.style === 'fullscreen') {
      const intensity = 1 - this.progress;
      if (a.screenEffect === 'bsod' && intensity > 0.3) {
        // Blue screen flash
        for (let y = 2; y < h - 2; y++) {
          for (let x = 0; x < w; x++) {
            if (this.rng.next() < intensity * 0.3) {
              screen.set(x, y, ' ', null, null);
            }
          }
        }
        const cy = Math.floor(h / 2);
        screen.text(Math.floor(w/2)-16, cy-1, '╔═══════════════════════════════╗', a.color, null, true);
        screen.text(Math.floor(w/2)-16, cy,   '║   STOP: 0x0000007E BSOD      ║', a.color, null, true);
        screen.text(Math.floor(w/2)-16, cy+1, '║   A problem has been detected ║', rgb(180,200,255), null, false);
        screen.text(Math.floor(w/2)-16, cy+2, '╚═══════════════════════════════╝', a.color, null, true);
      } else if (a.screenEffect === 'panic' && intensity > 0.3) {
        const cy = Math.floor(h / 2);
        screen.text(Math.floor(w/2)-14, cy-1, '┌────────────────────────────┐', a.color, null, true);
        screen.text(Math.floor(w/2)-14, cy,   '│  KERNEL PANIC — NOT SYNCING│', a.color, null, true);
        screen.text(Math.floor(w/2)-14, cy+1, '│  Attempted to kill init!   │', colors.dim);
        screen.text(Math.floor(w/2)-14, cy+2, '└────────────────────────────┘', a.color, null, true);
        // Scatter kernel log lines
        for (let i = 0; i < 4; i++) {
          const ly = this.rng.int(2, h - 3);
          const lx = this.rng.int(0, w - 20);
          screen.text(lx, ly, `[${this.rng.float(0,99).toFixed(4)}] panic()`, colors.rose);
        }
      }
      return;
    }

    // ── HEAL EFFECT ──
    if (a.style === 'heal') {
      const count = a.count || 5;
      for (let i = 0; i < count; i++) {
        const px = this.startX + this.rng.int(-4, 4);
        const py = this.startY - Math.floor(this.progress * 6) + this.rng.int(0, 3);
        const char = a.lead[i % a.lead.length];
        screen.set(px, py, char, a.color, null, true);
      }
      return;
    }

    // ── WAVE EFFECT ──
    if (a.style === 'wave') {
      if (!this.alive) return;
      const waveX = Math.round(this.startX + (this.endX - this.startX) * this.progress);
      const ww = a.waveWidth || 4;
      const dir = this.endX > this.startX ? 1 : -1;
      for (let col = 0; col < ww; col++) {
        const cx = waveX - col * dir;
        const alpha = 1 - col / ww;
        for (let row = 2; row < h - 7; row++) {
          if (this.rng.next() < alpha * 0.5) {
            const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
            screen.set(cx, row, char, alpha > 0.5 ? a.color : colors.dimmer);
          }
        }
      }
      return;
    }

    // ── RAIN EFFECT ──
    if (a.style === 'rain') {
      for (const drop of this.subProjectiles) {
        if (drop.life > 0) {
          screen.set(Math.round(drop.x), Math.round(drop.y), drop.char, a.color);
          screen.set(Math.round(drop.x), Math.round(drop.y) - 1, '·', a.trailColor);
        }
      }
      return;
    }

    // ── BEAM EFFECT (wide trail fills the path) ──
    if (a.style === 'beam' || a.style === 'laser') {
      const bw = a.beamWidth || 1;
      const halfBw = Math.floor(bw / 2);
      // Draw the filled trail
      for (let i = 0; i < this.trail.length; i++) {
        const pos = this.trail[i];
        const age = i / this.trail.length;
        const px = Math.round(pos.x);
        const py = Math.round(pos.y);
        for (let dy = -halfBw; dy <= halfBw; dy++) {
          const char = a.trail[i % a.trail.length] || '─';
          const clr = age < 0.3 ? a.trailColor : (age < 0.7 ? a.color : a.trailColor);
          const edgeFade = Math.abs(dy) === halfBw;
          screen.set(px, py + dy, edgeFade ? '░' : char, edgeFade ? a.trailColor : clr, null, age > 0.5);
        }
      }
      // Draw the lead
      if (this.alive) {
        const px = Math.round(this.x);
        const py = Math.round(this.y);
        for (let dy = -halfBw; dy <= halfBw; dy++) {
          const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
          screen.set(px, py + dy, char, a.color, null, true);
        }
        // Bright glow ahead
        screen.set(px + 1, py, '▸', a.color);
        screen.set(px + 2, py, '·', a.trailColor);
      }
      return;
    }

    // ── MULTISHOT / SWARM ──
    if (a.style === 'multishot' || a.style === 'swarm') {
      for (const sub of this.subProjectiles) {
        if (this.age < sub.delay) continue;
        const subProgress = Math.min(1, (this.age - sub.delay) / (1.0 / a.speed));
        const sx = this.startX + (this.endX - this.startX) * subProgress + sub.offsetX;
        const sy = this.startY + (this.endY - this.startY) * subProgress + sub.offsetY;
        const arc = -4 * 1.5 * (subProgress * subProgress - subProgress);
        const fy = sy - arc;
        if (subProgress < 1) {
          screen.set(Math.round(sx), Math.round(fy), sub.char, a.color, null, true);
          // Small trail
          screen.set(Math.round(sx) - 1, Math.round(fy), '·', a.trailColor);
        }
      }
      return;
    }

    // ── WARP EFFECT ──
    if (a.style === 'warp') {
      const t = this.progress;
      // Departure sparkle
      if (t < 0.3) {
        const px = Math.round(this.x);
        const py = Math.round(this.y);
        const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
        screen.set(px, py, char, a.color, null, true);
        // Warp ring
        for (let i = 0; i < 4; i++) {
          const angle = (t * 20 + i * 1.57);
          const rx = px + Math.round(Math.cos(angle) * 3);
          const ry = py + Math.round(Math.sin(angle) * 1.5);
          screen.set(rx, ry, '◇', a.trailColor);
        }
      }
      // Middle: glitch static
      if (t > 0.25 && t < 0.75) {
        for (let i = 0; i < 3; i++) {
          const gx = this.rng.int(Math.min(this.startX, this.endX), Math.max(this.startX, this.endX));
          const gy = this.rng.int(Math.min(this.startY, this.endY), Math.max(this.startY, this.endY));
          screen.set(gx, gy, '╳', colors.glitch);
        }
      }
      // Arrival flash
      if (t > 0.7) {
        const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
        screen.set(Math.round(this.endX), Math.round(this.endY), char, a.color, null, true);
        for (let i = 0; i < 4; i++) {
          const angle = (t * 20 + i * 1.57);
          const rx = Math.round(this.endX) + Math.round(Math.cos(angle) * 2);
          const ry = Math.round(this.endY) + Math.round(Math.sin(angle) * 1);
          screen.set(rx, ry, '◆', a.color);
        }
      }
      return;
    }

    // ── DASH EFFECT ──
    if (a.style === 'dash') {
      // Draw the entire path at once, fading
      const steps = 15;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        if (t > this.progress) break;
        const dx = this.startX + (this.endX - this.startX) * t;
        const dy = this.startY + (this.endY - this.startY) * t;
        const arc = -4 * this.arcHeight * (t * t - t);
        const fade = 1 - (this.progress - t);
        const char = a.trail[i % a.trail.length] || '─';
        screen.set(Math.round(dx), Math.round(dy - arc), char, fade > 0.5 ? a.color : a.trailColor);
      }
      if (this.alive) {
        const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
        screen.set(Math.round(this.x), Math.round(this.y), char, a.color, null, true);
      }
      return;
    }

    // ── ZIGZAG (default for zigzag style) ──
    if (a.style === 'zigzag') {
      // Trail
      for (let i = 0; i < this.trail.length; i++) {
        const pos = this.trail[i];
        const char = a.trail[i % a.trail.length];
        const age = i / this.trail.length;
        screen.set(Math.round(pos.x), Math.round(pos.y), char, age < 0.5 ? a.trailColor : a.color);
      }
      if (this.alive) {
        const char = a.lead[Math.floor(this.rng.next() * a.lead.length)];
        screen.set(Math.round(this.x), Math.round(this.y), char, a.color, null, true);
      }
      return;
    }

    // ── CODESTORM: orbiting code fragments around target ──
    if (a.style === 'codestorm') {
      if (!this.alive) return;
      const t = this.progress;
      const cx = this.endX;
      const cy = this.endY;
      for (const p of this.subProjectiles) {
        if (p.life <= 0) continue;
        p.life--;
        p.angle += p.speed;
        const fadeIn = Math.min(1, t * 4);
        const r = p.radius * fadeIn;
        const px = cx + Math.round(Math.cos(p.angle) * r);
        const py = cy + Math.round(Math.sin(p.angle) * r * 0.5);
        screen.text(px, py, p.text, t > 0.7 ? a.color : a.trailColor, null, t > 0.5);
      }
      // Central vortex
      if (t > 0.3) {
        screen.set(cx, cy, '╳', a.color, null, true);
        screen.set(cx-1, cy, '╱', a.trailColor);
        screen.set(cx+1, cy, '╲', a.trailColor);
      }
      return;
    }

    // ── EXPLOSION: expanding ring from target ──
    if (a.style === 'explosion') {
      if (!this.alive) return;
      const t = this.progress;
      const cx = this.endX;
      const cy = this.endY;
      const maxR = 8;
      const r = t * maxR;
      for (const p of this.subProjectiles) {
        const px = cx + Math.round(Math.cos(p.angle) * r);
        const py = cy + Math.round(Math.sin(p.angle) * r * 0.45);
        const fade = 1 - t;
        screen.set(px, py, p.char, fade > 0.4 ? a.color : a.trailColor, null, fade > 0.6);
      }
      // Impact flash at center
      if (t < 0.3) {
        screen.set(cx, cy, '█', a.color, null, true);
        screen.set(cx-1, cy, '▓', a.color); screen.set(cx+1, cy, '▓', a.color);
        screen.set(cx, cy-1, '▓', a.color); screen.set(cx, cy+1, '▓', a.color);
      }
      return;
    }

    // ── FLUSH: horizontal data bands sweep across screen ──
    if (a.style === 'flush') {
      if (!this.alive) return;
      const t = this.progress;
      const lines = a.flushLines || 5;
      for (let i = 0; i < lines; i++) {
        const lineY = 3 + Math.floor((h - 10) * ((i + 0.5) / lines));
        const sweepX = Math.round(t * w);
        const bandW = 12;
        for (let dx = 0; dx < bandW; dx++) {
          const x = sweepX - dx;
          if (x < 0 || x >= w) continue;
          const fade = 1 - dx / bandW;
          const char = fade > 0.7 ? '█' : fade > 0.4 ? '▓' : '░';
          screen.set(x, lineY, char, fade > 0.5 ? a.color : a.trailColor);
        }
      }
      return;
    }

    // ── HELIX: double spiral projectile ──
    if (a.style === 'helix') {
      // Trail
      for (let i = 0; i < this.trail.length; i++) {
        const pos = this.trail[i];
        const t = i / this.trail.length;
        const px = Math.round(pos.x);
        const py = Math.round(pos.y);
        const offset = Math.sin(t * Math.PI * 8) * 2;
        screen.set(px, py + Math.round(offset), '·', a.trailColor);
        screen.set(px, py - Math.round(offset), '·', a.trailColor);
      }
      if (this.alive) {
        const px = Math.round(this.x);
        const py = Math.round(this.y);
        const t = this.progress;
        const offset = Math.sin(t * Math.PI * 8) * 2;
        screen.set(px, py + Math.round(offset), a.lead[0], a.color, null, true);
        screen.set(px, py - Math.round(offset), a.lead[1] || a.lead[0], a.color, null, true);
        // Connecting line
        const minY = py - Math.abs(Math.round(offset));
        const maxY = py + Math.abs(Math.round(offset));
        for (let dy = minY; dy <= maxY; dy++) {
          screen.set(px, dy, '│', a.trailColor);
        }
      }
      return;
    }

    // ── UPSCALE: projectile grows as it travels ──
    if (a.style === 'upscale') {
      // Trail gets progressively larger
      for (let i = 0; i < this.trail.length; i++) {
        const pos = this.trail[i];
        const age = i / Math.max(this.trail.length, 1);
        const size = Math.floor(age * 3);
        const px = Math.round(pos.x);
        const py = Math.round(pos.y);
        const char = a.trail[Math.min(Math.floor(age * a.trail.length), a.trail.length - 1)];
        for (let dy = -size; dy <= size; dy++) {
          screen.set(px, py + dy, char, a.trailColor);
        }
      }
      if (this.alive) {
        const px = Math.round(this.x);
        const py = Math.round(this.y);
        const size = Math.floor(this.progress * 4);
        const charIdx = Math.min(Math.floor(this.progress * a.lead.length), a.lead.length - 1);
        for (let dy = -size; dy <= size; dy++) {
          for (let dx = -Math.floor(size/2); dx <= Math.floor(size/2); dx++) {
            screen.set(px + dx, py + dy, a.lead[charIdx], a.color, null, true);
          }
        }
      }
      return;
    }

    // ── WIPE: progress bar formatting the target area ──
    if (a.style === 'wipe') {
      if (!this.alive) return;
      const t = this.progress;
      const tx = this.endX;
      const ty = this.endY;
      // Format bar above/below target
      const barW = 16;
      const filled = Math.round(t * barW);
      for (let i = 0; i < barW; i++) {
        const x = tx - 8 + i;
        screen.set(x, ty - 3, i < filled ? '█' : '░', i < filled ? a.color : a.trailColor);
      }
      // Percentage text
      const pct = `${Math.round(t * 100)}%`;
      screen.text(tx - 2, ty - 4, `FORMAT ${pct}`, a.color, null, true);
      // Wipe lines across target sprite
      if (t > 0.2) {
        const wipeY = ty - 2 + Math.floor(t * 6);
        for (let x = tx - 5; x <= tx + 5; x++) {
          screen.set(x, wipeY, '░', a.color);
        }
      }
      return;
    }

    // ── SCATTER_REFORM: pieces explode then converge ──
    if (a.style === 'scatter_reform') {
      if (!this.alive) return;
      const t = this.progress;
      for (const p of this.subProjectiles) {
        let px, py;
        if (t < 0.5) {
          // Explode outward
          const et = t * 2;
          px = p.homeX + Math.cos(p.angle) * p.dist * et;
          py = p.homeY + Math.sin(p.angle) * p.dist * 0.5 * et;
        } else {
          // Converge back
          const ct = (t - 0.5) * 2;
          px = p.homeX + Math.cos(p.angle) * p.dist * (1 - ct);
          py = p.homeY + Math.sin(p.angle) * p.dist * 0.5 * (1 - ct);
        }
        screen.set(Math.round(px), Math.round(py), p.char, t < 0.5 ? a.color : a.trailColor, null, t > 0.3);
      }
      return;
    }

    // ── DRIP: characters dripping down from target ──
    if (a.style === 'drip') {
      if (!this.alive) return;
      for (const p of this.subProjectiles) {
        if (this.age < (p.delay || 0)) continue;
        if (p.life <= 0) continue;
        p.life--;
        p.y += p.speed;
        const fade = p.life / 20;
        screen.set(Math.round(p.x), Math.round(p.y), p.char, fade > 0.5 ? a.color : a.trailColor);
        screen.set(Math.round(p.x), Math.round(p.y) - 1, '·', a.trailColor);
      }
      return;
    }

    // ── SHIELD_UP: protective dome forming around self ──
    if (a.style === 'shield_up') {
      if (!this.alive) return;
      const t = this.progress;
      const cx = this.startX + 5;
      const cy = this.startY + 4;
      const r = 5 * Math.min(1, t * 2);
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const px = cx + Math.round(Math.cos(angle) * r);
        const py = cy + Math.round(Math.sin(angle) * r * 0.45);
        const char = a.lead[i % a.lead.length];
        const fade = t > 0.7 ? (1 - t) * 3 : 1;
        screen.set(px, py, char, fade > 0.5 ? a.color : a.trailColor, null, fade > 0.7);
      }
      // Fill inside with dim shield
      if (t > 0.3 && t < 0.8) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (Math.abs(dx) + Math.abs(dy) < 5) {
              screen.set(cx + dx, cy + dy, '░', a.trailColor);
            }
          }
        }
      }
      return;
    }

    // ── INFILTRATE: invisible approach, then sudden code burst ──
    if (a.style === 'infiltrate') {
      if (!this.alive) return;
      const t = this.progress;
      const tx = this.endX;
      const ty = this.endY;
      // Phase 1: subtle glitch hints moving toward target
      if (t < 0.6) {
        const hintCount = Math.floor(t * 8);
        for (let i = 0; i < hintCount; i++) {
          const ht = (t * 1.6 + i * 0.1) % 1;
          const hx = this.startX + (tx - this.startX) * ht;
          const hy = this.startY + (ty - this.startY) * ht;
          if (this.rng.next() < 0.4) {
            screen.set(Math.round(hx) + this.rng.int(-1,1), Math.round(hy), '·', colors.dimmer);
          }
        }
      }
      // Phase 2: sudden explosive burst of code at target
      if (t > 0.6) {
        const burstT = (t - 0.6) / 0.4;
        const CODE = ['root@','chmod','0x00','exec','PRIV','####','>>>>','$$$$'];
        const burstR = burstT * 6;
        for (let i = 0; i < 10; i++) {
          const angle = this.rng.float(0, Math.PI * 2);
          const r = this.rng.float(0, burstR);
          const bx = tx + Math.round(Math.cos(angle) * r);
          const by = ty + Math.round(Math.sin(angle) * r * 0.5);
          const text = CODE[Math.floor(this.rng.next() * CODE.length)];
          screen.text(bx, by, text, burstT > 0.5 ? a.color : a.trailColor, null, burstT > 0.3);
        }
      }
      return;
    }

    // ══════════════════════════════════════════════════════════
    // SIGNATURE MOVE RENDERS — multi-phase spectacles
    // ══════════════════════════════════════════════════════════

    // ── SIG PHYSICAL: charge up → massive beam with shockwave ──
    if (a.style === 'sig_physical') {
      if (!this.alive) return;
      const t = this.progress;
      const sx = this.startX + 5;
      const sy = this.startY + 3;
      const tx = this.endX;
      const ty = this.endY;

      if (t < 0.25) {
        // Phase 1: Charge — energy gathering at attacker
        const chargeT = t / 0.25;
        const r = (1 - chargeT) * 8 + 2;
        const particles = Math.floor(chargeT * 12);
        for (let i = 0; i < particles; i++) {
          const angle = (i / particles) * Math.PI * 2 + t * 15;
          const px = sx + Math.round(Math.cos(angle) * r);
          const py = sy + Math.round(Math.sin(angle) * r * 0.4);
          screen.set(px, py, '✦', a.accentColor || a.color, null, true);
        }
        // Pulsing core
        screen.set(sx, sy, chargeT > 0.5 ? '█' : '▓', a.color, null, true);
        screen.set(sx - 1, sy, '▓', a.trailColor);
        screen.set(sx + 1, sy, '▓', a.trailColor);
      } else if (t < 0.7) {
        // Phase 2: Massive beam fires across
        const beamT = (t - 0.25) / 0.45;
        const beamHead = sx + (tx - sx) * beamT;
        const bw = 3;
        for (let x = sx; x <= Math.round(beamHead); x++) {
          const distFromHead = Math.abs(x - beamHead);
          for (let dy = -bw; dy <= bw; dy++) {
            const edgeDist = Math.abs(dy);
            if (edgeDist === bw) {
              screen.set(x, sy + dy, '░', a.trailColor);
            } else if (distFromHead < 3) {
              screen.set(x, sy + dy, '█', a.accentColor || a.color, null, true);
            } else if (distFromHead < 8) {
              screen.set(x, sy + dy, '▓', a.color, null, true);
            } else {
              screen.set(x, sy + dy, '▒', a.trailColor);
            }
          }
        }
        // Beam head glow
        const hx = Math.round(beamHead);
        screen.set(hx + 1, sy, '▶', a.accentColor || a.color, null, true);
        screen.set(hx + 2, sy, '▸', a.color);
      } else {
        // Phase 3: Shockwave rings expanding from impact
        const waveT = (t - 0.7) / 0.3;
        const maxR = 10;
        for (let ring = 0; ring < 2; ring++) {
          const r = waveT * maxR - ring * 3;
          if (r < 0) continue;
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const px = tx + Math.round(Math.cos(angle) * r);
            const py = ty + Math.round(Math.sin(angle) * r * 0.35);
            const ch = ring === 0 ? '◆' : '·';
            screen.set(px, py, ch, ring === 0 ? a.color : a.trailColor);
          }
        }
        // Lingering impact core
        screen.set(tx, ty, '╳', a.accentColor || a.color, null, true);
      }
      return;
    }

    // ── SIG MAGIC: rune circle appears → runes converge → detonation ──
    if (a.style === 'sig_magic') {
      if (!this.alive) return;
      const t = this.progress;
      const tx = this.endX;
      const ty = this.endY;
      const RUNES = ['◈', '✦', '★', '◆', '◇', '▣', '⊕', '⊗', '⊙', '⊛', '⊘', '◉'];

      if (t < 0.35) {
        // Phase 1: Rune circle materializes around target
        const formT = t / 0.35;
        const r = 8;
        const count = Math.floor(formT * 12);
        for (let i = 0; i < count; i++) {
          const angle = (i / 12) * Math.PI * 2 - t * 4;
          const px = tx + Math.round(Math.cos(angle) * r);
          const py = ty + Math.round(Math.sin(angle) * r * 0.35);
          screen.set(px, py, RUNES[i % RUNES.length], a.color, null, true);
        }
        // Connecting lines between runes
        if (formT > 0.5) {
          for (let i = 0; i < count; i++) {
            const angle = (i / 12) * Math.PI * 2 - t * 4;
            const nextAngle = ((i + 1) / 12) * Math.PI * 2 - t * 4;
            const mx = tx + Math.round(Math.cos((angle + nextAngle) / 2) * (r * 0.7));
            const my = ty + Math.round(Math.sin((angle + nextAngle) / 2) * (r * 0.7) * 0.35);
            screen.set(mx, my, '·', a.trailColor);
          }
        }
      } else if (t < 0.65) {
        // Phase 2: Runes converge inward, spinning faster
        const convT = (t - 0.35) / 0.3;
        const r = 8 * (1 - convT);
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 - t * 12;
          const px = tx + Math.round(Math.cos(angle) * r);
          const py = ty + Math.round(Math.sin(angle) * r * 0.35);
          screen.set(px, py, RUNES[i], a.accentColor || a.color, null, true);
        }
        // Energy trails spiraling in
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - t * 20;
          const sr = r + 2;
          const sx = tx + Math.round(Math.cos(angle) * sr);
          const sy = ty + Math.round(Math.sin(angle) * sr * 0.35);
          screen.set(sx, sy, '─', a.trailColor);
        }
      } else {
        // Phase 3: Detonation — expanding blast with rune fragments
        const blastT = (t - 0.65) / 0.35;
        const blastR = blastT * 12;
        // Blast ring
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const px = tx + Math.round(Math.cos(angle) * blastR);
          const py = ty + Math.round(Math.sin(angle) * blastR * 0.35);
          const ch = RUNES[Math.floor(this.rng.next() * RUNES.length)];
          screen.set(px, py, ch, blastT < 0.5 ? a.accentColor || a.color : a.trailColor, null, blastT < 0.3);
        }
        // Inner flash
        if (blastT < 0.4) {
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              screen.set(tx + dx, ty + dy, '█', a.accentColor || a.color, null, true);
            }
          }
        }
      }
      return;
    }

    // ── SIG SPEED: afterimages → blink strike → static burst ──
    if (a.style === 'sig_speed') {
      if (!this.alive) return;
      const t = this.progress;
      const sx = this.startX + 5;
      const sy = this.startY + 3;
      const tx = this.endX;
      const ty = this.endY;

      if (t < 0.2) {
        // Phase 1: Afterimages — attacker vibrates with ghost copies
        const vibeT = t / 0.2;
        for (let i = 0; i < 4; i++) {
          const ox = Math.round(vibeT * (i + 1) * 2);
          const fade = 1 - (i / 4);
          screen.set(sx + ox, sy, '▸', fade > 0.6 ? a.color : a.trailColor, null, fade > 0.5);
          screen.set(sx + ox, sy - 1, '─', a.trailColor);
          screen.set(sx + ox, sy + 1, '─', a.trailColor);
        }
      } else if (t < 0.5) {
        // Phase 2: Blink strike — disappear, trail of dashes, reappear at target
        const blinkT = (t - 0.2) / 0.3;
        // Dash trail
        const steps = 20;
        for (let i = 0; i < steps; i++) {
          const st = i / steps;
          if (st > blinkT) break;
          const dx = sx + (tx - sx) * st;
          const dy = sy + (ty - sy) * st;
          const distFromHead = Math.abs(st - blinkT);
          if (distFromHead < 0.15) {
            screen.set(Math.round(dx), Math.round(dy), '»', a.accentColor || a.color, null, true);
          } else {
            screen.set(Math.round(dx), Math.round(dy), '─', a.trailColor);
          }
        }
      } else {
        // Phase 3: Static burst at impact — electric discharge
        const burstT = (t - 0.5) / 0.5;
        const burstR = burstT * 8;
        // Lightning bolts radiating from impact
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + burstT * 5;
          let bx = tx, by = ty;
          const segments = Math.floor(burstR);
          for (let s = 0; s < segments; s++) {
            bx += Math.round(Math.cos(angle) * 1.5) + this.rng.int(-1, 1);
            by += Math.round(Math.sin(angle) * 0.6);
            const ch = s === segments - 1 ? '╳' : (this.rng.chance(0.5) ? '╱' : '╲');
            screen.set(bx, by, ch, s < 2 ? a.accentColor || a.color : a.color);
          }
        }
        // Impact core flash
        if (burstT < 0.3) {
          screen.set(tx, ty, '█', a.accentColor || a.color, null, true);
          screen.set(tx - 1, ty, '▓', a.color); screen.set(tx + 1, ty, '▓', a.color);
        }
      }
      return;
    }

    // ── SIG SPECIAL: screen corruption → code cascade → reset ──
    if (a.style === 'sig_special') {
      if (!this.alive) return;
      const t = this.progress;
      const tx = this.endX;
      const ty = this.endY;
      const w = screen.width;
      const h = screen.height;
      const CORRUPT = ['█', '▓', '▒', '░', '╳', '╬', '┼', '#', '@', '!', '?', '0', '1'];

      if (t < 0.3) {
        // Phase 1: Screen corruption spreads from edges
        const corruptT = t / 0.3;
        const bandW = Math.floor(corruptT * 15);
        for (let y = 2; y < h - 7; y++) {
          for (let i = 0; i < bandW; i++) {
            if (this.rng.next() < 0.4) {
              screen.set(i, y, CORRUPT[Math.floor(this.rng.next() * CORRUPT.length)], a.color);
              screen.set(w - 1 - i, y, CORRUPT[Math.floor(this.rng.next() * CORRUPT.length)], a.trailColor);
            }
          }
        }
      } else if (t < 0.65) {
        // Phase 2: Code cascade raining down on target area
        const cascadeT = (t - 0.3) / 0.35;
        const CODE = ['sudo rm -rf /', 'chmod 777', ':(){ :|:& };:', 'dd if=/dev/zero', 'fork()', 'exec("crash")', 'kill -9 *'];
        const lines = Math.floor(cascadeT * 8);
        for (let i = 0; i < lines; i++) {
          const ly = 3 + Math.floor(cascadeT * (h - 12)) * (i + 1) / lines;
          if (ly < h - 7) {
            const code = CODE[i % CODE.length];
            screen.text(tx - Math.floor(code.length / 2), Math.round(ly), code,
              cascadeT > 0.7 ? a.accentColor || a.color : a.color, null, cascadeT > 0.5);
          }
        }
        // Glitch bands
        for (let b = 0; b < 3; b++) {
          const by = this.rng.int(3, h - 8);
          const bw = this.rng.int(10, 30);
          const bx = this.rng.int(0, w - bw);
          for (let x = bx; x < bx + bw; x++) {
            screen.set(x, by, '░', a.color);
          }
        }
      } else {
        // Phase 3: Everything snaps back with a flash
        const resetT = (t - 0.65) / 0.35;
        if (resetT < 0.3) {
          // Flash
          for (let y = 2; y < h - 7; y++) {
            for (let x = 0; x < w; x++) {
              if (this.rng.next() < 0.15 * (1 - resetT * 3)) {
                screen.set(x, y, '█', a.accentColor || a.color);
              }
            }
          }
        }
      }
      return;
    }

    // ── SIG SYNERGY: dual helix with expanding energy rings at midpoint ──
    if (a.style === 'sig_synergy') {
      if (!this.alive) return;
      const t = this.progress;
      const sx = this.startX + 5;
      const sy = this.startY + 3;
      const tx = this.endX;
      const ty = this.endY;
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;

      if (t < 0.6) {
        // Dual helix traveling toward target
        const helixT = t / 0.6;
        const headX = sx + (tx - sx) * helixT;
        const headY = sy + (ty - sy) * helixT;
        // Trail
        const steps = 20;
        for (let i = 0; i < steps; i++) {
          const st = i / steps;
          if (st > helixT) break;
          const px = sx + (tx - sx) * st;
          const py = sy + (ty - sy) * st;
          const phase = st * Math.PI * 10;
          const offset = Math.sin(phase) * 2.5;
          screen.set(Math.round(px), Math.round(py + offset), '◆', a.color);
          screen.set(Math.round(px), Math.round(py - offset), '◇', a.trailColor);
          // Connecting energy
          if (i % 3 === 0) {
            const minY = Math.round(py - Math.abs(offset));
            const maxY = Math.round(py + Math.abs(offset));
            for (let dy = minY; dy <= maxY; dy++) {
              screen.set(Math.round(px), dy, '│', colors.ghost);
            }
          }
        }
        // Bright lead
        screen.set(Math.round(headX), Math.round(headY), '★', a.accentColor || a.color, null, true);

        // Energy rings at midpoint once helix passes
        if (helixT > 0.5) {
          const ringT = (helixT - 0.5) / 0.5;
          const r = ringT * 5;
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            screen.set(Math.round(mx + Math.cos(angle) * r), Math.round(my + Math.sin(angle) * r * 0.4), '○', a.color);
          }
        }
      } else {
        // Detonation at target
        const blastT = (t - 0.6) / 0.4;
        const blastR = blastT * 10;
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const px = tx + Math.round(Math.cos(angle) * blastR);
          const py = ty + Math.round(Math.sin(angle) * blastR * 0.35);
          screen.set(px, py, i % 2 === 0 ? '◆' : '◇', blastT < 0.4 ? a.accentColor || a.color : a.trailColor, null, blastT < 0.3);
        }
        if (blastT < 0.3) {
          screen.set(tx, ty, '★', a.accentColor || a.color, null, true);
        }
      }
      return;
    }

    // ── BASIC FALLBACK ──
    for (let i = 0; i < this.trail.length; i++) {
      const pos = this.trail[i];
      const char = a.trail[i % (a.trail.length || 1)] || '·';
      screen.set(Math.round(pos.x), Math.round(pos.y), char, a.trailColor);
    }
    if (this.alive) {
      const char = a.lead[Math.floor(this.rng.next() * (a.lead.length || 1))] || '●';
      screen.set(Math.round(this.x), Math.round(this.y), char, a.color, null, true);
      screen.set(Math.round(this.x) - 1, Math.round(this.y), '·', a.color);
      screen.set(Math.round(this.x) + 1, Math.round(this.y), '·', a.color);
    }
  }
}

// ─── Screen-wide effects triggered on impact ───

class ScreenEffects {
  constructor(rng, screenWidth, screenHeight) {
    this.rng = rng;
    this.w = screenWidth;
    this.h = screenHeight;
    this.active = [];
  }

  trigger(effectName, duration = 6) {
    this.active.push({ name: effectName, life: duration, maxLife: duration });
  }

  update() {
    this.active = this.active.filter(e => { e.life--; return e.life > 0; });
  }

  draw(screen) {
    for (const fx of this.active) {
      const t = 1 - fx.life / fx.maxLife;
      switch (fx.name) {
        case 'flash': {
          // Brief white flash that fades — just overlay bright chars on a few random spots
          if (fx.life > fx.maxLife - 2) {
            for (let i = 0; i < 30; i++) {
              const x = this.rng.int(0, this.w - 1);
              const y = this.rng.int(1, this.h - 2);
              screen.set(x, y, '░', colors.white);
            }
          }
          break;
        }
        case 'shake': {
          // Screen shake: shift all content by ±1 (done via offset in renderer)
          break;
        }
        case 'heat': {
          // Heat shimmer: wavy distortion lines
          if (fx.life > 1) {
            for (let y = 3; y < this.h - 7; y += 2) {
              const x = this.rng.int(0, this.w - 10);
              screen.text(x, y, '~~~~~', rgb(255, 100, 40));
            }
          }
          break;
        }
        case 'columnGlitch': {
          // Vertical bands of glitch characters
          const cols = 5;
          for (let i = 0; i < cols; i++) {
            const cx = this.rng.int(5, this.w - 5);
            for (let y = 2; y < this.h - 7; y++) {
              if (this.rng.next() < 0.3) {
                screen.set(cx, y, '▓', colors.glitch);
              }
            }
          }
          break;
        }
        case 'glitchWave': {
          // Horizontal bands sweep across
          const numBands = 3;
          for (let b = 0; b < numBands; b++) {
            const by = this.rng.int(2, this.h - 8);
            const bw = this.rng.int(15, 40);
            const bx = this.rng.int(0, this.w - bw);
            for (let x = bx; x < bx + bw; x++) {
              screen.set(x, by, '░', colors.glitch);
            }
          }
          break;
        }
      }
    }
  }
}

// ─── Manager ───

class ProjectileManager {
  constructor(rng, screenWidth, screenHeight) {
    this.rng = rng;
    this.active = [];
    this.screenFx = new ScreenEffects(rng, screenWidth || 120, screenHeight || 30);
  }

  fire(startX, startY, endX, endY, moveName) {
    const proj = new Projectile(startX, startY, endX, endY, moveName, this.rng);
    this.active.push(proj);
    return proj;
  }

  update() {
    for (const p of this.active) {
      const wasAlive = p.alive;
      p.update();
      // Trigger screen effect on death (once)
      if (wasAlive && !p.alive && p.anim.screenEffect) {
        this.screenFx.trigger(p.anim.screenEffect);
      }
    }
    // Clean up: dead + trail drained + past grace period
    this.active = this.active.filter(p => {
      if (p.alive) return true;
      if (p.trail.length > 0) return true;
      // Hard age cap: nothing survives more than 40 frames past creation
      return false;
    });
    this.screenFx.update();
  }

  draw(screen) {
    for (const p of this.active) {
      p.draw(screen);
    }
    this.screenFx.draw(screen);
  }

  get hasActive() {
    return this.active.length > 0;
  }
}

module.exports = { Projectile, ProjectileManager, MOVE_ANIMS, ScreenEffects, registerSignatureAnims };
