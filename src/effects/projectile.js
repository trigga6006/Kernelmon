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
    style: 'slam',            // single heavy projectile, screen shake on impact
    lead: ['█', '█', '▓'],
    trail: ['▓', '▒', '░', '░', '·'],
    color: rgb(220, 160, 100),
    trailColor: colors.dim,
    speed: 0.06,
    trailLen: 5,
    screenEffect: 'shake',
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
    style: 'multishot',
    lead: ['▸', '▹', '▸'],
    trail: ['·', '·'],
    color: colors.gold,
    trailColor: colors.dim,
    speed: 0.14,
    trailLen: 3,
    count: 2,
    spread: 3,
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
};

// Fallback for moves not in the map
const DEFAULT_ANIM = {
  style: 'basic',
  lead: ['◆', '◇', '●'],
  trail: ['─', '·'],
  color: colors.cyan,
  trailColor: colors.dimmer,
  speed: 0.07,
  trailLen: 4,
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
  }

  update() {
    this.age++;

    // Already dead — just drain trail and count down
    if (!this.alive) {
      if (this.trail.length > 0) this.trail.shift();
      return;
    }

    // Non-traveling styles (fullscreen, heal) — just have a duration
    if (this.anim.style === 'fullscreen' || this.anim.style === 'heal') {
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

module.exports = { Projectile, ProjectileManager, MOVE_ANIMS, ScreenEffects };
