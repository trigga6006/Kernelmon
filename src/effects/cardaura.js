// ═══════════════════════════════════════════════════════════════
// CARD ENVIRONMENTAL EFFECTS — Rarity-scaled ambient animations
// Environmental effects that transform the battle background.
// Scale from barely-noticeable (common) to full-screen
// reality warps (primordial). Three modes: passive (ambient),
// reactive (burst on trigger), active (dramatic cinematic).
// NEVER draws over character sprites — only environment.
// ═══════════════════════════════════════════════════════════════

const { rgb } = require('../palette');

// ─── Character palettes for different visual layers ───

const EMBER_CHARS   = '·∘◦○◎●';
const ENERGY_CHARS  = '◈◆✦★⊹⋆∘·';
const BLOCK_CHARS   = '░▒▓█';
const SACRED_CHARS  = '◇◆⟐⊛✧◈★✦○';
const WARP_CHARS    = '~≈╳╬┼┤├┴┬─│◈◆✧⟐';
const SHIMMER_CHARS = '·•◦○◊⊹⋆';

// ─── Theme palettes keyed by card action intent ───
// Each theme has 5 colors (dark → bright) plus directional flag

const THEMES = {
  aggressive: {
    colors: [[200,40,20],[255,120,80],[255,60,40],[255,200,60],[255,160,40]],
    chars: EMBER_CHARS + '╳⚡✦',
    directional: true,
  },
  restorative: {
    colors: [[40,160,100],[100,230,160],[80,200,220],[160,255,200],[120,255,180]],
    chars: '·◦○◎∘+◇',
    directional: false,
  },
  empowering: {
    colors: [[200,160,40],[255,220,100],[255,180,60],[255,255,180],[255,240,120]],
    chars: ENERGY_CHARS,
    directional: false,
  },
  protective: {
    colors: [[40,100,200],[100,180,255],[140,220,255],[200,230,255],[160,200,255]],
    chars: '◇○◎□◆═║◦',
    directional: false,
  },
  corrupting: {
    colors: [[100,20,120],[200,80,220],[160,40,180],[255,100,160],[220,60,200]],
    chars: '╳▓░▒█◆×∘',
    directional: true,
  },
  purifying: {
    colors: [[100,180,200],[180,240,255],[220,255,240],[255,255,255],[200,250,255]],
    chars: '·°◦○∘+×',
    directional: false,
  },
  cosmic: {
    colors: [[80,60,160],[255,200,255],[160,120,255],[255,255,200],[200,160,255]],
    chars: '⟐⊛✧◇◆★✦⚡◈',
    directional: false,
  },
  ambient: {
    colors: [[80,100,140],[160,200,240],[200,180,240],[180,220,200],[160,190,220]],
    chars: SHIMMER_CHARS,
    directional: false,
  },
};

// ─── Rarity tier visual configuration ───
// particles: scattered particle count
// dur: base duration in frames (at 20fps)
// rings: concentric expanding ring count
// waves/aurora/mandala/warp/burn: whether that visual layer is enabled

const RARITY_IDX = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
  mythic: 5, transcendent: 6, divine: 7, primordial: 8,
};

const TIERS = {
  common:       { particles: 5,   dur: 15, rings: 0, waves: false, aurora: false, mandala: false, warp: false, burn: false },
  uncommon:     { particles: 10,  dur: 20, rings: 0, waves: false, aurora: false, mandala: false, warp: false, burn: false },
  rare:         { particles: 20,  dur: 28, rings: 0, waves: true,  aurora: false, mandala: false, warp: false, burn: false },
  epic:         { particles: 35,  dur: 36, rings: 0, waves: true,  aurora: false, mandala: false, warp: false, burn: false },
  legendary:    { particles: 55,  dur: 44, rings: 2, waves: true,  aurora: false, mandala: false, warp: false, burn: false },
  mythic:       { particles: 75,  dur: 52, rings: 3, waves: true,  aurora: false, mandala: false, warp: false, burn: false },
  transcendent: { particles: 100, dur: 60, rings: 3, waves: true,  aurora: true,  mandala: false, warp: false, burn: false },
  divine:       { particles: 140, dur: 70, rings: 4, waves: true,  aurora: true,  mandala: true,  warp: false, burn: false },
  primordial:   { particles: 200, dur: 80, rings: 5, waves: true,  aurora: true,  mandala: true,  warp: true,  burn: true  },
};

// Rarity RGB colors (for passive aura tinting)
const RARITY_RGB = {
  common: [160,165,180], uncommon: [140,230,180], rare: [140,190,250],
  epic: [200,170,240], legendary: [240,220,140], mythic: [255,100,100],
  transcendent: [200,120,255], divine: [255,215,100], primordial: [180,255,220],
};


// ═══════════════════════════════════════════════════════════════
// CARD ENVIRONMENTAL EFFECT — one-shot triggered animation
// Spawned when a card is activated (active) or triggered (reactive)
// ═══════════════════════════════════════════════════════════════

class CardEnvironmentalEffect {
  constructor(opts) {
    this.w = opts.w;
    this.h = opts.h;
    this.rarity = opts.rarity;
    this.theme = THEMES[opts.themeName] || THEMES.ambient;
    this.themeName = opts.themeName || 'ambient';
    this.tier = TIERS[opts.rarity] || TIERS.common;
    this.rarityIdx = RARITY_IDX[opts.rarity] || 0;
    this.startFrame = opts.startFrame;
    this.triggerType = opts.triggerType; // 'reactive' or 'active'
    this.rng = opts.rng;
    this.exclusionZones = [];
    this.done = false;

    // Caster and target positions (for directional effects)
    this.cx = opts.cx;
    this.cy = opts.cy;
    this.tx = opts.targetCx;
    this.ty = opts.targetCy;

    // Duration: reactive is snappier, active is full cinematic
    const mult = opts.triggerType === 'reactive' ? 0.6 : 1.0;
    this.duration = Math.round(this.tier.dur * mult);

    // Pre-generate scattered particles
    this._generateParticles(opts.rng);
  }

  _generateParticles(rng) {
    this.particles = [];
    for (let i = 0; i < this.tier.particles; i++) {
      let x, y;
      if (this.rarityIdx <= 1) {
        // Common/uncommon: particles hug edges and corners only
        const side = rng.int(0, 3);
        if (side === 0)      { x = rng.int(0, this.w - 1); y = rng.int(0, 2); }
        else if (side === 1) { x = rng.int(this.w - 4, this.w - 1); y = rng.int(1, this.h - 9); }
        else if (side === 2) { x = rng.int(0, this.w - 1); y = rng.int(this.h - 11, this.h - 9); }
        else                 { x = rng.int(0, 3); y = rng.int(1, this.h - 9); }
      } else if (this.rarityIdx <= 3) {
        // Rare/epic: mix of edge and interior
        if (rng.chance(0.35)) {
          const side = rng.int(0, 3);
          if (side === 0)      { x = rng.int(0, this.w - 1); y = rng.int(0, 4); }
          else if (side === 1) { x = rng.int(this.w - 6, this.w - 1); y = rng.int(1, this.h - 9); }
          else if (side === 2) { x = rng.int(0, this.w - 1); y = rng.int(this.h - 13, this.h - 9); }
          else                 { x = rng.int(0, 5); y = rng.int(1, this.h - 9); }
        } else {
          x = rng.int(0, this.w - 1);
          y = rng.int(1, this.h - 9);
        }
      } else {
        // Legendary+: full screen spread
        x = rng.int(0, this.w - 1);
        y = rng.int(1, this.h - 9);
      }

      this.particles.push({
        x, y,
        char: this.theme.chars[Math.floor(rng.next() * this.theme.chars.length)],
        speed: rng.float(0.3, 1.8),
        phase: rng.float(0, Math.PI * 2),
        colorIdx: rng.int(0, this.theme.colors.length - 1),
        drift: rng.float(-0.6, 0.6),
      });
    }
  }

  // Color from theme palette at given brightness (0-1)
  _tc(idx, brightness) {
    const c = this.theme.colors[idx % this.theme.colors.length];
    const b = Math.max(0, Math.min(1, brightness));
    return rgb(Math.round(c[0] * b), Math.round(c[1] * b), Math.round(c[2] * b));
  }

  // Interpolate through all theme colors based on a 0-1 value, with optional brighten-to-white
  _burnColor(heat) {
    const tc = this.theme.colors;
    if (heat < 0.05) {
      const c = tc[0];
      return rgb(Math.round(c[0] * 0.2), Math.round(c[1] * 0.2), Math.round(c[2] * 0.2));
    }
    // Map heat 0.05-0.85 through the color array
    const clampedHeat = Math.min(0.85, heat);
    const colorT = ((clampedHeat - 0.05) / 0.8) * (tc.length - 1);
    const idx = Math.min(Math.floor(colorT), tc.length - 2);
    const frac = colorT - idx;
    const c1 = tc[idx], c2 = tc[idx + 1];
    let r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
    let g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
    let b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
    // Brighten toward white at extreme heat
    if (heat > 0.85) {
      const wm = (heat - 0.85) / 0.15;
      r = Math.round(r + (255 - r) * wm);
      g = Math.round(g + (255 - g) * wm);
      b = Math.round(b + (255 - b) * wm);
    }
    return rgb(r, g, b);
  }

  _inExclusion(x, y) {
    for (const z of this.exclusionZones) {
      if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return true;
    }
    return false;
  }

  update(frame) {
    if (frame - this.startFrame >= this.duration) this.done = true;
  }

  draw(screen, frame) {
    const elapsed = frame - this.startFrame;
    if (elapsed < 0 || this.done) return;
    const t = elapsed / this.duration;

    // Fade envelope — reactive is sharper, active builds and lingers
    const fadeIn = this.triggerType === 'reactive' ? 0.08 : 0.15;
    const fadeOut = this.triggerType === 'reactive' ? 0.55 : 0.75;
    const fade = t < fadeIn ? t / fadeIn
      : t > fadeOut ? Math.max(0, (1 - t) / (1 - fadeOut))
      : 1.0;

    // Render layers back-to-front (most dramatic first so less dramatic overlays)
    if (this.tier.burn)      this._drawFullBurn(screen, t, fade, elapsed);
    if (this.tier.warp)      this._drawRealityWarp(screen, t, fade, elapsed);
    if (this.tier.mandala)   this._drawMandala(screen, t, fade, elapsed);
    if (this.tier.aurora)    this._drawAurora(screen, t, fade, elapsed);
    if (this.tier.rings > 0) this._drawEnergyRings(screen, t, fade, elapsed);
    if (this.tier.waves)     this._drawEnergyWaves(screen, t, fade, elapsed);
    this._drawParticles(screen, t, fade, elapsed);
    if (this.theme.directional && this.rarityIdx >= 2) {
      this._drawDirectionalSweep(screen, t, fade, elapsed);
    }
  }


  // ─── PARTICLES: scattered across environment, all tiers ───
  // Common: a few faint dots at edges. Primordial: dense field everywhere.

  _drawParticles(screen, t, fade, elapsed) {
    for (const p of this.particles) {
      // Stagger particle appearance so they don't all pop in at once
      const stagger = p.phase / (Math.PI * 2) * 0.25;
      if (t < stagger || t > 0.9 + stagger * 0.3) continue;

      // Gentle drift movement
      const x = Math.round(p.x + Math.sin(elapsed * 0.08 + p.phase) * 2.5 * p.drift);
      const y = Math.round(p.y + Math.cos(elapsed * 0.06 + p.phase) * 0.7);
      if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;
      if (this._inExclusion(x, y)) continue;

      // Brightness pulses
      const pulse = 0.4 + Math.sin(elapsed * p.speed * 0.15 + p.phase) * 0.4;
      const brightness = fade * pulse;
      if (brightness < 0.08) continue;

      // At low rarity, only draw on empty cells (barely noticeable)
      if (this.rarityIdx <= 1) {
        const cell = screen.buffer[y]?.[x];
        if (!cell || (cell.char !== ' ' && cell.fg)) continue;
      }

      screen.set(x, y, p.char, this._tc(p.colorIdx, brightness));
    }
  }


  // ─── ENERGY WAVES: horizontal ripple sweeps from edges (rare+) ───

  _drawEnergyWaves(screen, t, fade, elapsed) {
    const waveCount = Math.min(4, 1 + Math.floor(this.rarityIdx / 2));

    for (let w = 0; w < waveCount; w++) {
      const waveT = (t * 1.8 + w * 0.25) % 1;
      const fromLeft = w % 2 === 0;
      const waveX = fromLeft
        ? Math.round(waveT * this.w)
        : Math.round((1 - waveT) * this.w);

      // Vertical span grows with rarity
      const halfSpan = Math.round(this.h * (0.15 + this.rarityIdx * 0.04));
      const yCen = Math.round(this.h * 0.38);

      for (let dy = -halfSpan; dy <= halfSpan; dy++) {
        // Wave undulation
        const undulate = Math.sin(elapsed * 0.12 + dy * 0.25 + w) * 2;
        const y = yCen + dy + Math.round(undulate);
        if (y < 1 || y >= this.h - 8) continue;

        // Wave thickness
        const thickness = 1 + Math.floor(this.rarityIdx / 3);
        for (let dx = 0; dx < thickness; dx++) {
          const x = waveX + (fromLeft ? -dx : dx);
          if (x < 0 || x >= this.w) continue;
          if (this._inExclusion(x, y)) continue;

          const distFade = 1 - dx / (thickness + 1);
          const vertFade = 1 - Math.abs(dy) / (halfSpan + 1);
          const brightness = fade * distFade * vertFade * 0.6;
          if (brightness < 0.06) continue;

          const cIdx = (w + dx + Math.floor(elapsed * 0.08)) % this.theme.colors.length;
          const ch = BLOCK_CHARS[Math.min(dx, BLOCK_CHARS.length - 1)];
          screen.set(x, y, ch, this._tc(cIdx, brightness));
        }
      }
    }
  }


  // ─── ENERGY RINGS: concentric circles expanding from screen center (legendary+) ───

  _drawEnergyRings(screen, t, fade, elapsed) {
    const cx = Math.floor(this.w / 2);
    const cy = Math.floor(this.h * 0.35);
    const maxR = Math.max(this.w, this.h) * 0.45;

    for (let ring = 0; ring < this.tier.rings; ring++) {
      const ringT = (t * 1.4 + ring * 0.18) % 1;
      const radius = ringT * maxR;
      const ringFade = fade * Math.max(0, 1 - ringT) * 0.75;
      if (ringFade < 0.04) continue;

      const segments = Math.floor(radius * 3.5) + 10;
      const rotDir = ring % 2 === 0 ? 1 : -1;
      const rotSpeed = 0.06 + ring * 0.025;

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + elapsed * rotSpeed * rotDir;
        const px = cx + Math.round(Math.cos(angle) * radius * 1.8);
        const py = cy + Math.round(Math.sin(angle) * radius * 0.55);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const cIdx = (ring + i) % this.theme.colors.length;
        const ch = SACRED_CHARS[(i + ring + Math.floor(elapsed * 0.15)) % SACRED_CHARS.length];
        screen.set(px, py, ch, this._tc(cIdx, ringFade));
      }
    }
  }


  // ─── AURORA: flowing wave bands across top of screen (transcendent+) ───

  _drawAurora(screen, t, fade, elapsed) {
    const bands = 2 + Math.floor(this.rarityIdx / 3);
    const maxY = Math.min(Math.floor(this.h * 0.28), 9);

    for (let band = 0; band < bands; band++) {
      const baseY = 1 + Math.floor(band * maxY / bands);
      const waveLen = 12 + band * 4;
      const speed = 0.05 + band * 0.015;

      for (let x = 0; x < this.w; x++) {
        const waveY = baseY + Math.round(
          Math.sin(x / waveLen * Math.PI * 2 + elapsed * speed + band * 1.5) * 1.5
        );
        if (waveY < 1 || waveY >= this.h - 8) continue;
        if (this._inExclusion(x, waveY)) continue;

        const shimmer = Math.sin(x * 0.08 + elapsed * 0.04 + band * 2.3);
        const intensity = fade * (0.2 + shimmer * 0.25);
        if (intensity < 0.06) continue;

        const cIdx = (band + Math.floor(x * 0.04 + elapsed * 0.07)) % this.theme.colors.length;
        screen.set(x, waveY, intensity > 0.35 ? '░' : '·', this._tc(cIdx, intensity * 0.55));
      }
    }
  }


  // ─── MANDALA: rotating sacred geometry pattern (divine+) ───

  _drawMandala(screen, t, fade, elapsed) {
    const cx = Math.floor(this.w / 2);
    const cy = Math.floor(this.h * 0.35);
    const maxR = Math.min(this.w * 0.32, this.h * 0.55);
    const armCount = this.rarity === 'primordial' ? 12 : 8;
    const rotSpeed = 0.035;

    // Mandala grows as animation progresses
    const growR = maxR * Math.min(1, t * 2.5);

    for (let arm = 0; arm < armCount; arm++) {
      const baseAngle = (arm / armCount) * Math.PI * 2 + elapsed * rotSpeed;

      // Each arm traces from center outward
      const steps = Math.floor(growR * 1.2);
      for (let s = 1; s < steps; s++) {
        const r = (s / steps) * growR;
        // Slight sinusoidal curve in each arm
        const curve = Math.sin(s * 0.25 + elapsed * 0.04) * 0.12;
        const angle = baseAngle + curve;

        const px = cx + Math.round(Math.cos(angle) * r * 1.8);
        const py = cy + Math.round(Math.sin(angle) * r * 0.55);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const distFade = 1 - (s / steps) * 0.4;
        const brightness = fade * distFade * 0.7;
        if (brightness < 0.06) continue;

        const cIdx = (arm + s) % this.theme.colors.length;
        const ch = SACRED_CHARS[(s + Math.floor(elapsed * 0.12)) % SACRED_CHARS.length];
        screen.set(px, py, ch, this._tc(cIdx, brightness));
      }

      // Bright node points along each arm
      for (let n = 1; n <= 3; n++) {
        const nodeR = growR * n * 0.28;
        if (nodeR < 1) continue;
        const px = cx + Math.round(Math.cos(baseAngle) * nodeR * 1.8);
        const py = cy + Math.round(Math.sin(baseAngle) * nodeR * 0.55);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const pulse = 0.6 + Math.sin(elapsed * 0.18 + arm + n * 2) * 0.4;
        screen.set(px, py, '◈', this._tc(0, fade * pulse));
      }
    }

    // Concentric connecting rings between nodes
    for (let ring = 1; ring <= 3; ring++) {
      const ringR = growR * ring * 0.28;
      if (ringR < 2) continue;
      const segs = Math.floor(ringR * 3) + 8;
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2 + elapsed * rotSpeed * 0.5;
        const px = cx + Math.round(Math.cos(angle) * ringR * 1.8);
        const py = cy + Math.round(Math.sin(angle) * ringR * 0.55);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const brightness = fade * 0.35 * (1 - ring * 0.15);
        if (brightness < 0.05) continue;

        const cIdx = (ring + i) % this.theme.colors.length;
        screen.set(px, py, '·', this._tc(cIdx, brightness));
      }
    }
  }


  // ─── REALITY WARP: background cells morph and shift (primordial) ───
  // Wavefront expands from center, warping every empty cell it touches.
  // Through the "cracks," alien characters shimmer in theme colors.

  _drawRealityWarp(screen, t, fade, elapsed) {
    const cx = Math.floor(this.w / 2);
    const cy = Math.floor(this.h * 0.35);
    const maxDist = Math.sqrt((this.w / 2) * (this.w / 2) + (this.h / 2) * (this.h / 2));

    for (let y = 1; y < this.h - 8; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this._inExclusion(x, y)) continue;

        // Distance from center (aspect-corrected)
        const dx = (x - cx) / 1.8;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normalDist = dist / maxDist;

        // Wavefront expands outward
        const arrivalT = normalDist * 0.35;
        const localT = t - arrivalT;
        if (localT < 0) continue;

        // Warp intensity ramps up fast, fades after peak
        let warpI = Math.min(1, localT * 4) * fade;
        // Collapse inward near the end
        if (t > 0.7) {
          const collapse = (t - 0.7) / 0.3;
          warpI *= Math.max(0, 1 - collapse + normalDist * 0.6);
        }
        if (warpI < 0.08) continue;

        // Warped character cycles based on position + time
        const charSeed = Math.floor(x * 0.4 + y * 0.7 + elapsed * 0.4);
        const ch = WARP_CHARS[((charSeed % WARP_CHARS.length) + WARP_CHARS.length) % WARP_CHARS.length];

        // Color shifts through theme palette
        const cIdx = Math.floor(dist * 0.12 + elapsed * 0.08) % this.theme.colors.length;

        // Only overwrite non-empty cells at high warp intensity
        const cell = screen.buffer[y]?.[x];
        if (warpI > 0.45 || (cell && cell.char === ' ')) {
          screen.set(x, y, ch, this._tc(cIdx, warpI * 0.7));
        }
      }
    }
  }


  // ─── FULL BURN: gradient heat sweep across entire screen (primordial) ───
  // The "solar flare" — a wave of heat radiates from the caster, sweeping
  // across the environment. Colors gradient from white-hot → theme bright →
  // theme dark → embers. The wavefront crackles with sparks.

  _drawFullBurn(screen, t, fade, elapsed) {
    for (let y = 1; y < this.h - 8; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this._inExclusion(x, y)) continue;

        // Distance from caster (aspect-corrected for terminal)
        const dx = x - this.cx;
        const dy = (y - this.cy) * 2.0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(this.w * this.w + (this.h * 2) * (this.h * 2));
        const normalDist = dist / maxDist;

        // Wave arrives at closer cells first (radial expansion from caster)
        const arrivalT = normalDist * 0.45;
        const localT = t - arrivalT;
        if (localT < 0) continue;

        // Heat peaks quickly at wavefront, then decays slowly
        const heat = Math.max(0, Math.min(1,
          localT < 0.18 ? localT / 0.18
            : 1 - (localT - 0.18) / 0.82
        )) * fade;
        if (heat < 0.03) continue;

        // Vertical falloff — hotter at mid-screen, cooler at edges
        const vertCenter = this.h * 0.35;
        const vertDist = Math.abs(y - vertCenter) / (this.h * 0.4);
        const finalHeat = heat * Math.max(0.3, 1 - vertDist * 0.4);
        if (finalHeat < 0.03) continue;

        // Block character based on heat level
        let ch;
        if (finalHeat > 0.8)      ch = '█';
        else if (finalHeat > 0.6) ch = '▓';
        else if (finalHeat > 0.4) ch = '▒';
        else if (finalHeat > 0.2) ch = '░';
        else                       ch = '·';

        // Ember flicker at the wavefront edge
        if (Math.abs(localT - 0.18) < 0.08 && (elapsed + x * 3 + y * 7) % 4 < 2) {
          ch = EMBER_CHARS[(x + y + elapsed) % EMBER_CHARS.length];
        }

        screen.set(x, y, ch, this._burnColor(finalHeat));
      }
    }
  }


  // ─── DIRECTIONAL SWEEP: energy flows from caster toward target (rare+ offensive) ───
  // For offensive cards, particles stream across the battlefield toward the
  // opponent. At higher rarities, the sweep is wider and more intense.
  // An impact burst rings out around the target when the wave arrives.

  _drawDirectionalSweep(screen, t, fade, elapsed) {
    const dx = this.tx - this.cx;
    const dy = this.ty - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const count = 4 + this.rarityIdx * 3;
    const width = 2 + Math.floor(this.rarityIdx / 2);

    // Streaming particles along the attack vector
    for (let i = 0; i < count; i++) {
      const particleT = (t * 2.2 + i / count * 0.7) % 1;
      const pathX = this.cx + dx * particleT;
      const pathY = this.cy + dy * particleT * 0.5; // squished for terminal

      // Perpendicular spread
      const perpX = -ny;
      const perpY = nx;

      for (let s = -width; s <= width; s++) {
        const px = Math.round(pathX + perpX * s * 1.4);
        const py = Math.round(pathY + perpY * s * 0.3);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const spreadFade = 1 - Math.abs(s) / (width + 1);
        const progressFade = particleT > 0.85 ? (1 - particleT) * 6.7 : 1;
        const brightness = fade * spreadFade * progressFade * 0.75;
        if (brightness < 0.06) continue;

        const cIdx = (i + Math.floor(elapsed * 0.15)) % this.theme.colors.length;
        const ch = Math.abs(s) === 0 ? '█' : Math.abs(s) <= 1 ? '▓' : '░';
        screen.set(px, py, ch, this._tc(cIdx, brightness));
      }
    }

    // Impact burst around target when sweep arrives
    if (t > 0.45) {
      const impactT = Math.min(1, (t - 0.45) * 2.5);
      const impactR = impactT * (2.5 + this.rarityIdx * 0.8);
      const impactFade = fade * Math.max(0, 1 - impactT * 0.6);
      if (impactFade < 0.04) return;

      const segs = Math.floor(impactR * 3.5) + 6;
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2 + elapsed * 0.08;
        const px = Math.round(this.tx + Math.cos(angle) * impactR * 1.5);
        const py = Math.round(this.ty + Math.sin(angle) * impactR * 0.4);

        if (px < 0 || px >= this.w || py < 1 || py >= this.h - 8) continue;
        if (this._inExclusion(px, py)) continue;

        const ch = '✦◈⊹·'[i % 4];
        screen.set(px, py, ch, this._tc(0, impactFade));
      }
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// PASSIVE CARD AURA — persistent ambient shimmer
// Subtle background glow while passive cards are equipped.
// Scales with the highest-rarity passive card in the hand.
// ═══════════════════════════════════════════════════════════════

class CardPassiveAura {
  constructor(w, h, rng) {
    this.w = w;
    this.h = h;
    this.rng = rng;
    this.active = false;
    this.rarityIdx = 0;
    this.color = [160, 200, 240];
    this.particles = [];
    this.exclusionZones = [];
  }

  // Configure based on equipped passive cards — uses highest rarity
  configure(cards) {
    if (!cards || cards.length === 0) { this.active = false; return; }

    let bestIdx = -1;
    let bestColor = null;
    for (const card of cards) {
      if (card.type !== 'passive') continue;
      const idx = RARITY_IDX[card.rarity] || 0;
      if (idx > bestIdx) {
        bestIdx = idx;
        bestColor = RARITY_RGB[card.rarity] || [160, 200, 240];
      }
    }

    if (bestIdx < 0) { this.active = false; return; }

    this.active = true;
    this.rarityIdx = bestIdx;
    this.color = bestColor;

    // Edge shimmer particles — more for higher rarity
    this.particles = [];
    const count = 3 + bestIdx * 2;
    const rng = this.rng;
    for (let i = 0; i < count; i++) {
      const side = rng.int(0, 3);
      let x, y;
      if (side === 0)      { x = rng.int(0, this.w - 1); y = rng.int(0, 2); }
      else if (side === 1) { x = rng.int(this.w - 4, this.w - 1); y = rng.int(1, this.h - 9); }
      else if (side === 2) { x = rng.int(0, this.w - 1); y = rng.int(this.h - 11, this.h - 9); }
      else                 { x = rng.int(0, 3); y = rng.int(1, this.h - 9); }

      this.particles.push({
        x, y,
        phase: rng.float(0, Math.PI * 2),
        speed: rng.float(0.025, 0.065),
        char: SHIMMER_CHARS[rng.int(0, SHIMMER_CHARS.length - 1)],
      });
    }
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.particles = this.particles.filter(p => p.x < w && p.y < h);
  }

  draw(screen, frameCount) {
    if (!this.active) return;

    for (const p of this.particles) {
      const brightness = 0.15 + Math.sin(frameCount * p.speed + p.phase) * 0.15;
      if (brightness < 0.08) continue;

      const x = Math.round(p.x + Math.sin(frameCount * 0.025 + p.phase) * 1.5);
      const y = Math.round(p.y + Math.cos(frameCount * 0.018 + p.phase) * 0.5);

      if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;

      // Check exclusion zones
      let excluded = false;
      for (const z of this.exclusionZones) {
        if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) {
          excluded = true; break;
        }
      }
      if (excluded) continue;

      // Only draw on empty cells — passive aura must be barely visible
      const cell = screen.buffer[y]?.[x];
      if (!cell || (cell.char !== ' ' && cell.fg)) continue;

      const c = this.color;
      screen.set(x, y, p.char,
        rgb(Math.round(c[0] * brightness), Math.round(c[1] * brightness), Math.round(c[2] * brightness)));
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// CARD AURA MANAGER — coordinates all card environmental effects
// ═══════════════════════════════════════════════════════════════

class CardAuraManager {
  constructor(w, h, rng) {
    this.w = w;
    this.h = h;
    this.rng = rng;
    this.effects = [];
    this.passiveAura = new CardPassiveAura(w, h, rng);
    this.exclusionZones = [];
  }

  setExclusions(zones) {
    this.exclusionZones = zones;
    this.passiveAura.exclusionZones = zones;
    for (const eff of this.effects) eff.exclusionZones = zones;
  }

  configurePassive(cards) {
    this.passiveAura.configure(cards);
  }

  // Trigger an environmental effect for a card event
  // opts: { rarity, themeName, triggerType, cx, cy, targetCx, targetCy, startFrame }
  trigger(opts) {
    const eff = new CardEnvironmentalEffect({
      ...opts,
      w: this.w,
      h: this.h,
      rng: this.rng,
    });
    eff.exclusionZones = this.exclusionZones;
    this.effects.push(eff);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.passiveAura.resize(w, h);
  }

  update(frame) {
    for (const eff of this.effects) eff.update(frame);
    this.effects = this.effects.filter(e => !e.done);
  }

  // Draw passive aura — call early in render order (background layer)
  drawPassive(screen, frameCount) {
    this.passiveAura.draw(screen, frameCount);
  }

  // Draw triggered effects — call after sprites, before HP bars
  drawEffects(screen, frame) {
    for (const eff of this.effects) eff.draw(screen, frame);
  }
}


// ═══════════════════════════════════════════════════════════════
// THEME DETECTION — maps a card's mechanics to a visual theme
// ═══════════════════════════════════════════════════════════════

function getCardTheme(card) {
  if (!card) return 'ambient';
  const action = card.effect?.action;

  // Offensive
  if (['damage', 'damage_stun', 'damage_debuff_all', 'nuke', 'blackout',
    'apocalypse', 'counter', 'multi_hit', 'release_damage'].includes(action)) {
    return 'aggressive';
  }
  // Restorative
  if (['heal', 'revive', 'rewind', 'drain', 'resist_heal'].includes(action)) {
    return 'restorative';
  }
  // Empowering
  if (['boost', 'boost_recoil', 'boost_next_attack', 'mega_boost'].includes(action)) {
    return 'empowering';
  }
  // Protective
  if (['shield', 'invulnerable', 'survive', 'set_trap'].includes(action)) {
    return 'protective';
  }
  // Corrupting
  if (['enemy_debuff', 'debuff_all', 'strip_buff'].includes(action)) {
    return 'corrupting';
  }
  // Purifying
  if (['cleanse', 'cleanse_all', 'cleanse_and_boost'].includes(action)) {
    return 'purifying';
  }
  // Cosmic
  if (['reset'].includes(action)) {
    return 'cosmic';
  }
  // Passive mechanics
  if (card.type === 'passive') {
    const m = card.effect?.mechanic;
    if (m === 'void_aura' || m === 'decay_aura') return 'corrupting';
    if (m === 'thermal_resist' || m === 'stall_resist') return 'protective';
    if (m === 'foresight') return 'cosmic';
    return 'empowering';
  }
  return 'ambient';
}


module.exports = { CardAuraManager, CardEnvironmentalEffect, CardPassiveAura, getCardTheme };
