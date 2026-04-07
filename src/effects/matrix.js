// Matrix rain background effect — subtle, dimmed, pastel-tinted
const { colors } = require('../palette');

// Katakana + digits + symbols for that authentic matrix feel
const MATRIX_CHARS = 'ァアィイゥウェエォオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFabcdef{}[]<>|/\\~!@#$%^&*';

// Sparkle characters — lighter, code-flavored
const SPARKLE_CHARS = '·•*+×.:°¤◦○◊⊹⋆✦{}[]<>/\\|~0123456789abcdef';

class MatrixRain {
  constructor(width, height, rng) {
    this.width = width;
    this.height = height;
    this.rng = rng;
    this.columns = [];
    this.exclusionZone = null;
    this.exclusionZones = [];

    for (let x = 0; x < width; x++) {
      this.columns.push({
        y: rng.int(-height, 0),
        speed: rng.float(0.2, 0.8),
        length: rng.int(4, 10),
        accumulator: 0,
        active: rng.chance(0.4),
        chars: [],
      });

      for (let i = 0; i < height + 20; i++) {
        this.columns[x].chars.push(MATRIX_CHARS[Math.floor(rng.next() * MATRIX_CHARS.length)]);
      }
    }
  }

  resize(width, height) {
    const rng = this.rng;
    // Add new columns if wider
    while (this.columns.length < width) {
      const col = {
        y: rng.int(-height, 0),
        speed: rng.float(0.2, 0.8),
        length: rng.int(4, 10),
        accumulator: 0,
        active: false,
        chars: [],
      };
      for (let i = 0; i < height + 20; i++) {
        col.chars.push(MATRIX_CHARS[Math.floor(rng.next() * MATRIX_CHARS.length)]);
      }
      this.columns.push(col);
    }
    // Trim if narrower
    if (this.columns.length > width) {
      this.columns.length = width;
    }
    this.width = width;
    this.height = height;
  }

  update() {
    for (const col of this.columns) {
      if (!col.active) continue;
      col.accumulator += col.speed;
      while (col.accumulator >= 1) {
        col.y++;
        col.accumulator -= 1;
      }
      if (col.y - col.length > this.height) {
        col.y = this.rng.int(-8, -1);
        col.speed = this.rng.float(0.2, 0.8);
        col.length = this.rng.int(4, 10);
        // Stay active — initial activation controls density, reset just recycles
        // (previously rng.chance(0.55) could deactivate evenly-spaced columns)
      }
    }
  }

  draw(screen) {
    for (let x = 0; x < this.width && x < screen.width; x++) {
      const col = this.columns[x];
      if (!col.active) continue;

      for (let i = 0; i < col.length; i++) {
        const y = Math.floor(col.y) - i;
        if (y < 0 || y >= screen.height) continue;

        const charIdx = (y + 100) % col.chars.length;
        const brightness = i === 0 ? 1.0 : 1.0 - (i / col.length);

        let fg;
        if (brightness > 0.9) {
          fg = colors.matrixBright;
        } else if (brightness > 0.4) {
          fg = colors.matrix;
        } else {
          fg = colors.ghost;
        }

        if (this._inExclusion(x, y)) continue;

        const cell = screen.buffer[y]?.[x];
        if (cell && cell.char === ' ' && !cell.fg) {
          screen.set(x, y, col.chars[charIdx], fg);
        }
      }
    }
  }

  _inExclusion(x, y) {
    const ez = this.exclusionZone;
    if (ez && x >= ez.x && x < ez.x + ez.w && y >= ez.y && y < ez.y + ez.h) return true;

    for (let i = 0; i < this.exclusionZones.length; i++) {
      const z = this.exclusionZones[i];
      if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CODE SPARKLE — stationary particles that pop in/out randomly
// No directional movement. Each particle appears, glows, fades, vanishes.
// Much lighter on the renderer than rain (only ~20-30 cells active).
// ═══════════════════════════════════════════════════════════════

class CodeSparkle {
  constructor(width, height, rng, density = 25) {
    this.width = width;
    this.height = height;
    this.rng = rng;
    this.particles = [];
    this.maxParticles = density;
    this.exclusionZones = [];
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    // Remove particles that are now out of bounds
    this.particles = this.particles.filter(p => p.x < width && p.y < height);
  }

  update() {
    const rng = this.rng;

    // Age existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age++;
      if (p.age >= p.lifespan) {
        this.particles.splice(i, 1);
      }
    }

    // Spawn new particles to maintain density
    const toSpawn = Math.min(3, this.maxParticles - this.particles.length);
    for (let i = 0; i < toSpawn; i++) {
      const x = rng.int(0, this.width - 1);
      const y = rng.int(0, this.height - 1);

      // Check exclusion zones
      let excluded = false;
      for (const z of this.exclusionZones) {
        if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) {
          excluded = true;
          break;
        }
      }
      if (excluded) continue;

      this.particles.push({
        x, y,
        char: SPARKLE_CHARS[Math.floor(rng.next() * SPARKLE_CHARS.length)],
        lifespan: rng.int(6, 25),  // frames alive (~0.3-1.2s at 20fps)
        age: 0,
        flickerOffset: rng.int(0, 7), // desync flicker so particles don't pulse together
      });
    }
  }

  draw(screen) {
    for (const p of this.particles) {
      const cell = screen.buffer[p.y]?.[p.x];
      if (!cell || (cell.char !== ' ' && cell.fg)) continue; // don't overwrite UI

      // Fade: bright at birth, dim at middle, ghost at end
      const life = p.age / p.lifespan;
      let fg;
      if (life < 0.15) {
        fg = colors.matrixBright;  // pop in bright
      } else if (life < 0.5) {
        fg = colors.matrix;        // steady glow
      } else if (life < 0.8) {
        fg = colors.ghost;         // fading
      } else {
        // Flicker out — each particle flickers on its own schedule
        if ((p.age + p.flickerOffset) % 3 === 0) continue; // skip this particle this frame
        fg = colors.ghost;
      }

      screen.set(p.x, p.y, p.char, fg);
    }
  }
}

module.exports = { MatrixRain, CodeSparkle };
