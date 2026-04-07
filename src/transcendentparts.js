// ═══════════════════════════════════════════════════════════════
// TRANSCENDENT PART EFFECTS — Dramatic visual auras & overlays
// Wraps the existing sprite draw functions to add animated effects.
// Each Transcendent part has: theme override, drawAura, drawOverlay.
// Effects render BEHIND and ON TOP of the base sprite.
// Does NOT render when a skin is equipped (skin takes priority).
// ALL equipped Transcendent parts stack their effects simultaneously.
// Full set (all 4 slots transcendent) triggers additional mega-effects.
//
// Design principles:
//   - Structured form over random noise (clear shapes, not scattered dots)
//   - Each effect has ONE dominant visual motif + a hovering companion
//   - Brand-specific color palettes — no generic rainbow on individual effects
//   - Smooth continuous motion, not random blinking/teleporting
//   - GPU companions: right flank | CPU: above | RAM: left flank | Storage: below
// ═══════════════════════════════════════════════════════════════

const { rgb } = require('./palette');
const { PARTS } = require('./parts');

// ─── Shared animation helpers ───

function transcendentGlow(frame, phase) {
  const f = ((frame + (phase || 0)) % 60) / 60;
  const r = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2));
  const g = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2 + 2.09));
  const b = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2 + 4.19));
  return rgb(r, g, b);
}

// Gold-to-platinum shift for full set mega effect
function ascendantGlow(frame, phase) {
  const f = ((frame + (phase || 0)) % 80) / 80;
  const r = Math.floor(225 + 30 * Math.sin(f * Math.PI * 2));
  const g = Math.floor(200 + 40 * Math.sin(f * Math.PI * 2 - 0.5));
  const b = Math.floor(120 + 80 * Math.sin(f * Math.PI * 2 + 1.0));
  return rgb(r, g, b);
}

function hash(a, b) { return ((a * 2654435761) ^ (b * 340573321)) >>> 0; }

// Sine wave 0–1
function wave(frame, period, phase) {
  return Math.sin(((frame + (phase || 0)) % period) / period * Math.PI * 2) * 0.5 + 0.5;
}

// Smooth bob offset (returns -1, 0, or 1)
function bob(frame, speed) {
  return Math.round(Math.sin(frame * (speed || 0.08)) * 1.0);
}

// Sprite bounds (14 wide × 12 tall standard sprite)
const SW = 14, SH = 12;
const CX = 7, CY = 5;

// ═══════════════════════════════════════════════════════════════
// TRANSCENDENT EFFECT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TRANSCENDENT_EFFECTS = {

  // ─────────────────────────────────────────
  // GPU: NVIDIA B200 Blackwell — "Neural Dominion"
  // Silver-white chassis with bright NVIDIA green circuit nodes
  // Clean, bright, techy — the visible face of AI compute
  // Motif: Neural circuit frame with sequencing data pulses
  // ─────────────────────────────────────────
  blackwell_b200: {
    theme: {
      frame: rgb(190, 195, 210), frameDk: rgb(145, 150, 165), frameLt: rgb(220, 225, 238),
      accent: rgb(118, 200, 0), accentDk: rgb(76, 140, 0),
      core: rgb(130, 225, 20), coreDk: rgb(80, 155, 10), coreMed: rgb(105, 190, 15),
      vent: rgb(168, 172, 188), ventLt: rgb(182, 186, 202),
      eye: rgb(140, 240, 30), eyeOff: rgb(55, 75, 45),
      leg: rgb(158, 163, 178), shadow: rgb(88, 92, 105),
      emblem: rgb(118, 200, 15), data: rgb(70, 130, 5),
    },
    drawAura(s, ox, oy, frame) {
      const green = rgb(118, 200, 0);
      const bright = rgb(160, 240, 40);
      const silver = rgb(180, 188, 205);
      const dim = rgb(65, 120, 5);

      // Clean silver circuit frame
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '─', silver);
        s.set(ox + x, oy + SH, '─', silver);
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '│', silver);
        s.set(ox + SW, oy + y, '│', silver);
      }

      // 8 circuit nodes at corners + midpoints — pulse sequentially like data routing
      const nodes = [[-1, -1], [CX, -1], [SW, -1], [SW, CY], [SW, SH], [CX, SH], [-1, SH], [-1, CY]];
      const activeIdx = Math.floor((frame % 40) / 5) % 8;
      const trailIdx = (activeIdx + 7) % 8;
      for (let i = 0; i < nodes.length; i++) {
        const isActive = i === activeIdx;
        const isTrail = i === trailIdx;
        s.set(ox + nodes[i][0], oy + nodes[i][1], isActive ? '◉' : '●', isActive ? bright : isTrail ? green : dim);
      }

      // Sparse neural data — 2 columns per side, clean scrolling digits (not dense noise)
      const colPositions = [-2, SW + 1];
      for (const col of colPositions) {
        for (let row = 0; row < SH; row++) {
          const scrollPhase = (frame + row * 4 + col * 7) % 22;
          if (scrollPhase < 3) {
            const ch = String.fromCharCode(0x30 + ((row + frame) % 10));
            s.set(ox + col, oy + row, ch, scrollPhase < 1 ? green : dim);
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const green = rgb(118, 200, 0);
      const bright = rgb(160, 240, 40);
      const dim = rgb(65, 120, 5);

      // Single clean scan beam — slow horizontal sweep
      const scanY = Math.floor(((frame % 50) / 50) * SH);
      for (let x = 1; x < SW - 1; x += 2) {
        s.set(ox + x, oy + scanY, '─', green);
      }

      // ── Companion: sentinel drone (right flank) ──
      const dy = bob(frame, 0.07);
      const cx = SW + 3, cy = CY - 1 + dy;
      s.set(ox + cx - 1, oy + cy, '─', dim);
      s.set(ox + cx,     oy + cy, '◈', bright);
      s.set(ox + cx + 1, oy + cy, '─', dim);
      s.set(ox + cx,     oy + cy + 1, '│', dim);
      const eyeOn = frame % 30 < 25;
      if (eyeOn) s.set(ox + cx, oy + cy - 1, '▀', green);
    },
  },

  // ─────────────────────────────────────────
  // GPU: NVIDIA Rubin Ultra — "Event Horizon"
  // Near-black void body with deep emerald corona
  // The darkness IS the power — compute so dense it bends light
  // Motif: Slow accretion disk + gravitational pulse
  // ─────────────────────────────────────────
  rubin_ultra: {
    theme: {
      frame: rgb(12, 18, 14), frameDk: rgb(5, 10, 7), frameLt: rgb(22, 32, 24),
      accent: rgb(0, 130, 50), accentDk: rgb(0, 85, 30),
      core: rgb(0, 160, 60), coreDk: rgb(0, 90, 32), coreMed: rgb(0, 125, 45),
      vent: rgb(8, 14, 10), ventLt: rgb(14, 22, 16),
      eye: rgb(0, 180, 65), eyeOff: rgb(0, 35, 15),
      leg: rgb(10, 16, 12), shadow: rgb(3, 6, 4),
      emblem: rgb(0, 150, 52), data: rgb(0, 80, 28),
    },
    drawAura(s, ox, oy, frame) {
      const emerald = rgb(0, 130, 50);
      const deep = rgb(0, 70, 25);
      const abyss = rgb(0, 40, 15);

      // Accretion disk — 10 particles in slow elliptical orbit around the sprite
      // Front-half particles brighter than back-half (depth illusion)
      for (let i = 0; i < 10; i++) {
        const angle = (frame / 140 * Math.PI * 2) + (i * Math.PI * 2 / 10);
        const rx = Math.round(CX + 9 * Math.cos(angle));
        const ry = Math.round(CY + 5.5 * Math.sin(angle));
        const isFront = Math.sin(angle) < 0; // top half = "front" of orbit
        if (rx >= -5 && rx < SW + 5 && ry >= -3 && ry < SH + 3) {
          s.set(ox + rx, oy + ry, isFront ? '•' : '·', isFront ? emerald : abyss);
        }
      }

      // Void border — barely-visible dark frame that absorbs surrounding light
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 2, '░', abyss);
        s.set(ox + x, oy + SH + 1, '░', abyss);
      }
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 2, oy + y, '░', abyss);
        s.set(ox + SW + 1, oy + y, '░', abyss);
      }

      // Gravitational pulse — expanding emerald ring, once every 70 frames
      const pulsePhase = frame % 70;
      if (pulsePhase < 24) {
        const r = Math.floor(pulsePhase / 3) + 1;
        const fade = Math.max(0, 1 - pulsePhase / 24);
        const col = rgb(0, Math.floor(110 * fade), Math.floor(42 * fade));
        for (let a = 0; a < 12; a++) {
          const ax = Math.round(CX + Math.cos(a * Math.PI / 6) * r * 1.3);
          const ay = Math.round(CY + Math.sin(a * Math.PI / 6) * r * 0.5);
          if (ax >= -4 && ax < SW + 4 && ay >= -3 && ay < SH + 3) {
            s.set(ox + ax, oy + ay, '·', col);
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const emerald = rgb(0, 160, 60);
      const bright = rgb(0, 200, 80);
      const deep = rgb(0, 80, 30);

      // Inner horizon glow — faint emerald edge at top and bottom of sprite
      const pulse = wave(frame, 35, 0);
      const glowCol = rgb(0, Math.floor(60 + 70 * pulse), Math.floor(22 + 28 * pulse));
      for (let x = 2; x < SW - 2; x += 3) {
        s.set(ox + x, oy, '▄', glowCol);
        s.set(ox + x, oy + SH - 1, '▀', glowCol);
      }

      // ── Companion: singularity core (right flank) ──
      const dy = bob(frame, 0.06);
      const cx = SW + 3, cy = CY + dy;
      s.set(ox + cx, oy + cy, '◈', bright);
      s.set(ox + cx - 1, oy + cy, '·', emerald);
      s.set(ox + cx + 1, oy + cy, '·', emerald);
      s.set(ox + cx, oy + cy - 1, '·', deep);
      s.set(ox + cx, oy + cy + 1, '·', deep);
      // Gravity tether — brief green arc reaching toward sprite
      if (frame % 45 < 12) {
        s.set(ox + cx - 2, oy + cy, '─', rgb(0, 55, 20));
        s.set(ox + cx - 3, oy + cy, '·', rgb(0, 35, 12));
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: AMD Instinct MI350X — "Obsidian Forge"
  // Deep black body with barely-visible dark crimson magma veins
  // Restrained apocalyptic heat — the subtlety IS the intimidation
  // Motif: Hairline magma cracks pulsing under black stone
  // ─────────────────────────────────────────
  mi350x: {
    theme: {
      frame: rgb(18, 10, 10), frameDk: rgb(8, 4, 4), frameLt: rgb(32, 18, 18),
      accent: rgb(120, 15, 8), accentDk: rgb(75, 8, 4),
      core: rgb(150, 22, 10), coreDk: rgb(80, 10, 5), coreMed: rgb(115, 16, 8),
      vent: rgb(14, 8, 8), ventLt: rgb(22, 14, 14),
      eye: rgb(170, 30, 12), eyeOff: rgb(30, 8, 5),
      leg: rgb(16, 10, 10), shadow: rgb(6, 3, 3),
      emblem: rgb(135, 18, 8), data: rgb(72, 10, 5),
    },
    drawAura(s, ox, oy, frame) {
      // Magma veins — hairline cracks that pulse between near-invisible and dim crimson
      const veinPulse = wave(frame, 50, 0); // very slow breathing
      const vr = Math.floor(45 + 75 * veinPulse);
      const vg = Math.floor(3 + 12 * veinPulse);
      const vb = Math.floor(2 + 6 * veinPulse);
      const veinCol = rgb(vr, vg, vb);
      const stone = rgb(22, 10, 10);

      // Bottom magma cracks — jagged intermittent line
      for (let x = -1; x <= SW; x++) {
        const hasVein = (x + 3) % 4 < 2;
        s.set(ox + x, oy + SH, hasVein ? '─' : '░', hasVein ? veinCol : stone);
      }
      // Ash floor below
      for (let x = 0; x <= SW - 1; x += 2) {
        s.set(ox + x, oy + SH + 1, '░', stone);
      }

      // Side veins — thin vertical cracks reaching partway up
      const sideVeinPulse = wave(frame, 50, 15);
      const sideCol = rgb(Math.floor(35 + 55 * sideVeinPulse), Math.floor(3 + 8 * sideVeinPulse), 2);
      for (let y = SH - 1; y >= SH - 4; y -= 2) {
        s.set(ox - 1, oy + y, '│', y >= SH - 2 ? sideCol : stone);
        s.set(ox + SW, oy + y, '│', y >= SH - 2 ? sideCol : stone);
      }

      // Dark smoke — 2 thin wisps rising slowly above the sprite
      for (let i = 0; i < 2; i++) {
        const smokeX = 3 + i * 8;
        const smokeY = -1 - ((frame + i * 20) % 8);
        if (smokeY >= -5) {
          const fade = Math.max(0, 1 - Math.abs(smokeY + 3) / 3);
          const g = Math.floor(22 + 16 * fade);
          s.set(ox + smokeX, oy + smokeY, '░', rgb(g, g - 4, g - 4));
        }
      }

      // Deep ember glow at base — slow hearbeat barely visible through stone
      const heartbeat = wave(frame, 70, 0);
      for (let x = 1; x < SW - 1; x += 4) {
        const er = Math.floor(50 + 50 * heartbeat);
        s.set(ox + x, oy + SH - 1, '▄', rgb(er, 4, 2));
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const flash = rgb(180, 30, 10);

      // ── Companion: obsidian anvil (right flank) ──
      const strikeCycle = frame % 55;
      const strikeY = strikeCycle < 5 ? -1 : strikeCycle < 8 ? 1 : 0;
      const hx = SW + 3, hy = CY - 2 + strikeY;
      // Dark monolithic block
      s.set(ox + hx, oy + hy, '█', rgb(25, 12, 12));
      s.set(ox + hx + 1, oy + hy, '▌', rgb(18, 8, 8));
      s.set(ox + hx, oy + hy + 1, '║', rgb(20, 10, 10));
      s.set(ox + hx, oy + hy + 2, '║', rgb(15, 7, 7));
      // Single ember eye — pulses like a slow heartbeat
      const eyePulse = wave(frame, 35, 0);
      s.set(ox + hx, oy + hy - 1, '·', rgb(Math.floor(70 + 60 * eyePulse), 6, 3));

      // Strike flash — brief crimson burst then back to darkness
      if (strikeCycle >= 5 && strikeCycle < 9) {
        s.set(ox + hx - 1, oy + hy, '✹', flash);
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: Intel Falcon Shores — "Arc Conduit"
  // Deep navy body with structured electric blue arcs
  // Channeled lightning — precision-harnessed, not chaotic
  // Motif: Clean lightning rods with persistent bolt paths
  // ─────────────────────────────────────────
  falcon_shores: {
    theme: {
      frame: rgb(12, 20, 50), frameDk: rgb(6, 12, 32), frameLt: rgb(22, 35, 72),
      accent: rgb(100, 180, 255), accentDk: rgb(50, 120, 220),
      core: rgb(140, 210, 255), coreDk: rgb(40, 100, 200), coreMed: rgb(80, 160, 240),
      vent: rgb(10, 18, 42), ventLt: rgb(16, 26, 58),
      eye: rgb(180, 230, 255), eyeOff: rgb(20, 40, 80),
      leg: rgb(14, 22, 55), shadow: rgb(5, 10, 28),
      emblem: rgb(100, 170, 255), data: rgb(40, 90, 180),
    },
    drawAura(s, ox, oy, frame) {
      const blue = rgb(100, 180, 255);
      const bright = rgb(200, 235, 255);
      const dim = rgb(30, 70, 150);

      // 2 lightning rods — one per side, structured bolt paths
      const rodPositions = [-2, SW + 1];
      const boltSeed = Math.floor(frame / 12); // persist 12 frames per bolt shape
      for (let r = 0; r < 2; r++) {
        const rx = rodPositions[r];
        // Rod base with grounding symbol
        s.set(ox + rx, oy + SH, '╋', bright);
        s.set(ox + rx, oy + SH + 1, '┴', dim);
        // Bolt path — 4 segments zigzagging upward
        const h1 = hash(r, boltSeed);
        let bx = rx;
        for (let seg = 0; seg < 4; seg++) {
          const segY = SH - 1 - seg * 3;
          const jitter = ((h1 >> (seg * 4 + 8)) % 3) - 1;
          bx = Math.max(rx - 2, Math.min(rx + 2, rx + jitter));
          if (segY >= -1 && segY < SH) {
            const ch = jitter > 0 ? '╲' : jitter < 0 ? '╱' : '│';
            s.set(ox + bx, oy + segY, ch, (frame % 6 < 3) ? bright : blue);
          }
        }
      }

      // Dim electric border — persistent low glow
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '░', dim);
        s.set(ox + x, oy + SH + 1, '░', dim);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const blue = rgb(140, 210, 255);
      const bright = rgb(200, 235, 255);

      // Energy nodes — 4 corners pulse in sequence
      const nodes = [[2, 2], [SW - 3, 2], [2, SH - 3], [SW - 3, SH - 3]];
      for (let i = 0; i < nodes.length; i++) {
        const brightness = wave(frame, 24, i * 6);
        s.set(ox + nodes[i][0], oy + nodes[i][1], '◉', brightness > 0.5 ? bright : blue);
      }

      // ── Companion: storm orb (right flank) ──
      const dy = bob(frame, 0.09);
      const sx = SW + 3, sy = CY - 1 + dy;
      s.set(ox + sx - 1, oy + sy, '⚡', blue);
      s.set(ox + sx,     oy + sy, '◉', bright);
      s.set(ox + sx + 1, oy + sy, '⚡', blue);
      // Clean arc below — alternates direction
      const arcCh = frame % 10 < 5 ? '╱' : '╲';
      s.set(ox + sx, oy + sy + 1, arcCh, rgb(40, 90, 180));
    },
  },

  // ─────────────────────────────────────────
  // CPU: AMD EPYC 9965 Turin — "Crimson Loom"
  // Dark gunmetal body with AMD red-orange threading
  // 192 threads weaving reality — the loom of compute
  // Motif: Red thread lines radiating outward in a weave pattern
  // ─────────────────────────────────────────
  epyc_9965: {
    theme: {
      frame: rgb(48, 34, 30), frameDk: rgb(28, 18, 15), frameLt: rgb(70, 50, 44),
      accent: rgb(200, 50, 25), accentDk: rgb(145, 30, 12),
      core: rgb(220, 65, 30), coreDk: rgb(150, 35, 15), coreMed: rgb(185, 48, 22),
      vent: rgb(38, 26, 22), ventLt: rgb(52, 38, 32),
      eye: rgb(235, 80, 35), eyeOff: rgb(50, 18, 10),
      leg: rgb(42, 30, 26), shadow: rgb(18, 10, 8),
      emblem: rgb(200, 55, 25), data: rgb(130, 30, 12),
    },
    drawAura(s, ox, oy, frame) {
      const red = rgb(200, 50, 25);
      const bright = rgb(235, 80, 35);
      const dim = rgb(110, 25, 10);

      // Concentric thread rings — expanding outward in AMD red
      const maxR = 9;
      for (let ring = 0; ring < 3; ring++) {
        const r = ((frame % 35) / 35 + ring * 0.33) % 1.0 * maxR;
        const ri = Math.floor(r);
        if (ri < 1 || ri > maxR) continue;
        const fade = Math.max(0, 1 - r / maxR);
        const col = rgb(Math.floor(200 * fade), Math.floor(45 * fade), Math.floor(20 * fade));
        for (let angle = 0; angle < 16; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 8) * ri * 1.3);
          const ay = Math.round(Math.sin(angle * Math.PI / 8) * ri * 0.55);
          if (CX + ax >= -3 && CX + ax < SW + 3 && CY + ay >= -2 && CY + ay < SH + 2) {
            s.set(ox + CX + ax, oy + CY + ay, '·', col);
          }
        }
      }

      // 8 radiating thread lines — AMD red pulse
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4;
        const brightness = wave(frame, 22, ray * 5);
        const col = brightness > 0.5 ? bright : red;
        for (let step = 3; step < 7; step++) {
          const rx = Math.round(CX + Math.cos(angle) * step * 1.3);
          const ry = Math.round(CY + Math.sin(angle) * step * 0.55);
          if (rx >= -3 && rx < SW + 3 && ry >= -2 && ry < SH + 2) {
            s.set(ox + rx, oy + ry, '·', col);
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const red = rgb(220, 65, 30);
      const bright = rgb(245, 100, 45);

      // Pulsing loom core — cross at center
      const pulse = wave(frame, 14, 0);
      const coreCol = rgb(220, Math.floor(50 + 40 * pulse), Math.floor(25 + 20 * pulse));
      s.set(ox + CX, oy + CY, '◉', bright);
      s.set(ox + CX - 1, oy + CY, '─', coreCol);
      s.set(ox + CX + 1, oy + CY, '─', coreCol);
      s.set(ox + CX, oy + CY - 1, '│', coreCol);
      s.set(ox + CX, oy + CY + 1, '│', coreCol);

      // ── Companion: processing die (above sprite) ──
      const dy = bob(frame, 0.06);
      const dx = CX + 4, ddy = -4 + dy;
      s.set(ox + dx - 1, oy + ddy - 1, '┌', red);
      s.set(ox + dx,     oy + ddy - 1, '─', red);
      s.set(ox + dx + 1, oy + ddy - 1, '┐', red);
      s.set(ox + dx - 1, oy + ddy,     '│', red);
      const diePulse = wave(frame, 16, 0);
      s.set(ox + dx,     oy + ddy,     '◉', diePulse > 0.5 ? bright : red);
      s.set(ox + dx + 1, oy + ddy,     '│', red);
      s.set(ox + dx - 1, oy + ddy + 1, '└', red);
      s.set(ox + dx,     oy + ddy + 1, '─', red);
      s.set(ox + dx + 1, oy + ddy + 1, '┘', red);
    },
  },

  // ─────────────────────────────────────────
  // CPU: Cerebras WSE-3 — "Wafer Constellation"
  // Midnight body with warm amber silicon glow
  // 900,000 cores on one wafer — a living city of light
  // Motif: Grid of cores activating in sweeping waves
  // ─────────────────────────────────────────
  cerebras_wse3: {
    theme: {
      frame: rgb(15, 18, 30), frameDk: rgb(8, 10, 18), frameLt: rgb(25, 30, 48),
      accent: rgb(220, 170, 60), accentDk: rgb(165, 125, 35),
      core: rgb(240, 195, 80), coreDk: rgb(170, 130, 40), coreMed: rgb(205, 160, 55),
      vent: rgb(12, 14, 25), ventLt: rgb(18, 22, 36),
      eye: rgb(245, 210, 100), eyeOff: rgb(55, 45, 18),
      leg: rgb(14, 16, 28), shadow: rgb(6, 7, 14),
      emblem: rgb(225, 175, 65), data: rgb(140, 105, 30),
    },
    drawAura(s, ox, oy, frame) {
      const amber = rgb(220, 170, 60);
      const bright = rgb(245, 210, 100);
      const dim = rgb(80, 60, 18);
      const dark = rgb(35, 28, 10);

      // Wafer grid — dense rows of core dots along top and bottom
      // Activation wave sweeps left to right across the grid
      const waveX = ((frame % 55) / 55) * (SW + 10) - 5;
      for (let x = -4; x <= SW + 3; x += 2) {
        const dist = Math.abs(x - waveX);
        const glow = Math.max(0, 1 - dist / 3.5);
        const r = Math.floor(80 + 165 * glow);
        const g = Math.floor(60 + 150 * glow);
        const b = Math.floor(18 + 82 * glow);
        const ch = glow > 0.6 ? '■' : glow > 0.2 ? '●' : '·';
        s.set(ox + x, oy - 2, ch, rgb(r, g, b));
        s.set(ox + x, oy + SH + 1, ch, rgb(r, g, b));
      }

      // Side columns — vertical core arrays
      const waveY = ((frame % 45) / 45) * (SH + 6) - 3;
      for (let y = -1; y < SH + 1; y += 2) {
        const dist = Math.abs(y - waveY);
        const glow = Math.max(0, 1 - dist / 3);
        const col = glow > 0.5 ? amber : glow > 0.15 ? dim : dark;
        s.set(ox - 3, oy + y, glow > 0.5 ? '●' : '·', col);
        s.set(ox + SW + 2, oy + y, glow > 0.5 ? '●' : '·', col);
      }

      // Interconnect traces — thin lines connecting the core rows
      s.set(ox - 3, oy - 2, '┌', dim);
      s.set(ox + SW + 2, oy - 2, '┐', dim);
      s.set(ox - 3, oy + SH + 1, '└', dim);
      s.set(ox + SW + 2, oy + SH + 1, '┘', dim);
    },
    drawOverlay(s, ox, oy, frame) {
      const amber = rgb(220, 170, 60);
      const bright = rgb(245, 210, 100);

      // Internal processing ripple — sparse dots lighting up inside sprite
      const ripplePhase = frame % 40;
      if (ripplePhase < 20) {
        const r = Math.floor(ripplePhase / 4) + 1;
        for (let a = 0; a < 4; a++) {
          const ax = Math.round(CX + Math.cos(a * Math.PI / 2) * r * 1.2);
          const ay = Math.round(CY + Math.sin(a * Math.PI / 2) * r * 0.5);
          if (ax >= 0 && ax < SW && ay >= 0 && ay < SH) {
            s.set(ox + ax, oy + ay, '·', amber);
          }
        }
      }

      // ── Companion: miniature wafer die (above sprite) ──
      const dy = bob(frame, 0.07);
      const px = CX - 4, py = -3 + dy;
      // Small grid inside a box — the wafer itself
      s.set(ox + px - 1, oy + py - 1, '┌', amber);
      s.set(ox + px,     oy + py - 1, '─', amber);
      s.set(ox + px + 1, oy + py - 1, '┐', amber);
      s.set(ox + px - 1, oy + py,     '│', amber);
      // Core status — cycles between states
      const coreState = Math.floor((frame % 30) / 10);
      const coreCh = ['·', '●', '■'][coreState];
      s.set(ox + px,     oy + py,     coreCh, bright);
      s.set(ox + px + 1, oy + py,     '│', amber);
      s.set(ox + px - 1, oy + py + 1, '└', amber);
      s.set(ox + px,     oy + py + 1, '─', amber);
      s.set(ox + px + 1, oy + py + 1, '┘', amber);
    },
  },

  // ─────────────────────────────────────────
  // CPU: Apple M4 Ultra Max — "Monolith"
  // Space black body with subtle champagne accents
  // Minimalist transcendence — less is more, Apple-style elegance
  // Motif: Single breathing halo ring + precise geometry
  // ─────────────────────────────────────────
  m4_ultra_max: {
    theme: {
      frame: rgb(28, 28, 32), frameDk: rgb(15, 15, 18), frameLt: rgb(45, 45, 52),
      accent: rgb(195, 170, 135), accentDk: rgb(150, 130, 100),
      core: rgb(215, 190, 155), coreDk: rgb(155, 135, 105), coreMed: rgb(185, 162, 130),
      vent: rgb(22, 22, 26), ventLt: rgb(32, 32, 38),
      eye: rgb(225, 205, 170), eyeOff: rgb(48, 44, 38),
      leg: rgb(25, 25, 30), shadow: rgb(10, 10, 12),
      emblem: rgb(200, 178, 145), data: rgb(130, 115, 88),
    },
    drawAura(s, ox, oy, frame) {
      const champagne = rgb(195, 170, 135);
      const soft = rgb(150, 132, 105);
      const muted = rgb(90, 78, 60);

      // Breathing halo — single perfect elliptical ring that pulses brightness
      const breathe = wave(frame, 55, 0); // very slow breathing
      const alpha = 0.3 + 0.7 * breathe;
      const hr = Math.floor(195 * alpha);
      const hg = Math.floor(170 * alpha);
      const hb = Math.floor(135 * alpha);
      const haloCol = rgb(hr, hg, hb);

      for (let i = 0; i < 14; i++) {
        const angle = i * Math.PI * 2 / 14;
        const hx = Math.round(CX + 9 * Math.cos(angle));
        const hy = Math.round(CY + 5.5 * Math.sin(angle));
        if (hx >= -5 && hx < SW + 5 && hy >= -3 && hy < SH + 3) {
          s.set(ox + hx, oy + hy, '·', haloCol);
        }
      }

      // Clean precise border — thin single line, no ornamentation
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '─', muted);
        s.set(ox + x, oy + SH, '─', muted);
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '│', muted);
        s.set(ox + SW, oy + y, '│', muted);
      }
      // Champagne corner gems
      s.set(ox - 1, oy - 1, '◇', soft);
      s.set(ox + SW, oy - 1, '◇', soft);
      s.set(ox - 1, oy + SH, '◇', soft);
      s.set(ox + SW, oy + SH, '◇', soft);
    },
    drawOverlay(s, ox, oy, frame) {
      const champagne = rgb(210, 188, 155);
      const warm = rgb(225, 205, 170);

      // Single orbiting diamond — slow, precise, elegant (one element, not six)
      const angle = frame / 100 * Math.PI * 2;
      const orbitX = Math.round(CX + 9 * Math.cos(angle));
      const orbitY = Math.round(CY + 5.5 * Math.sin(angle));
      if (orbitX >= -5 && orbitX < SW + 5 && orbitY >= -4 && orbitY < SH + 3) {
        s.set(ox + orbitX, oy + orbitY, '◇', warm);
      }
      // Trailing dot behind the diamond
      const trailAngle = angle - 0.3;
      const tx = Math.round(CX + 9 * Math.cos(trailAngle));
      const ty = Math.round(CY + 5.5 * Math.sin(trailAngle));
      if (tx >= -5 && tx < SW + 5 && ty >= -4 && ty < SH + 3) {
        s.set(ox + tx, oy + ty, '·', champagne);
      }

      // ── Companion: platinum glyph (above sprite) ──
      const dy = bob(frame, 0.04); // very slow bob — unhurried
      const gx = CX + 5, gy = -3 + dy;
      s.set(ox + gx, oy + gy, '◇', warm);
    },
  },

  // ─────────────────────────────────────────
  // RAM: 4TB HBM4 Stacked — "Data Typhoon"
  // Deep navy body with cyan-to-violet data flow
  // Twin data pillars with flowing bandwidth streams
  // Motif: Structured data pillars + horizontal data flow
  // ─────────────────────────────────────────
  hbm4_stack: {
    theme: {
      frame: rgb(10, 25, 45), frameDk: rgb(5, 14, 28), frameLt: rgb(18, 40, 65),
      accent: rgb(80, 230, 255), accentDk: rgb(45, 160, 220),
      core: rgb(130, 220, 255), coreDk: rgb(55, 130, 200), coreMed: rgb(90, 185, 240),
      vent: rgb(8, 20, 38), ventLt: rgb(14, 30, 52),
      eye: rgb(170, 240, 255), eyeOff: rgb(20, 50, 80),
      leg: rgb(12, 28, 50), shadow: rgb(4, 12, 25),
      emblem: rgb(110, 200, 250), data: rgb(50, 130, 200),
    },
    drawAura(s, ox, oy, frame) {
      const cyan = rgb(80, 230, 255);
      const violet = rgb(160, 100, 255);
      const dim = rgb(35, 100, 160);
      const streamChars = ['║', '│', '┃', '║'];

      // 2 data pillars — one per side, smooth scrolling with cyan-to-violet gradient
      const pillarPositions = [-2, SW + 1];
      for (let p = 0; p < 2; p++) {
        const px = pillarPositions[p];
        for (let y = -1; y < SH + 2; y++) {
          const scrollPhase = (frame + y * 2 + p * 13) % 14;
          const t = Math.max(0, Math.min(1, (y + 1) / (SH + 2)));
          const r = Math.floor(80 + 80 * t);
          const g = Math.floor(230 - 130 * t);
          const col = scrollPhase < 5 ? rgb(r, g, 255) : rgb(Math.floor(r * 0.25), Math.floor(g * 0.25), Math.floor(255 * 0.35));
          s.set(ox + px, oy + y, streamChars[scrollPhase % 4], col);
        }
      }

      // Horizontal data stream — smooth flow above and below
      for (let x = -3; x <= SW + 2; x++) {
        const abovePhase = (frame + x * 2) % 18;
        if (abovePhase < 4) {
          s.set(ox + x, oy - 2, '─', cyan);
        }
        const belowPhase = (frame - x * 2 + 40) % 18;
        if (belowPhase < 4) {
          s.set(ox + x, oy + SH + 2, '─', violet);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const cyan = rgb(100, 240, 255);

      // 3 streaming data bytes — smooth vertical flow through sprite
      for (let i = 0; i < 3; i++) {
        const col = 2 + i * 4;
        const row = SH - ((frame + i * 7) % (SH + 5));
        if (row >= 0 && row < SH) {
          const hex = ((frame + i * 13) % 256).toString(16).toUpperCase().padStart(2, '0');
          const t = row / SH;
          const c = rgb(Math.floor(80 + 80 * t), Math.floor(230 - 130 * t), 255);
          s.set(ox + col, oy + row, hex[0], c);
          if (col + 1 < SW) s.set(ox + col + 1, oy + row, hex[1], c);
        }
      }

      // ── Companion: memory module (left flank) ──
      const dy = bob(frame, 0.06);
      const mx = -4, my = CY - 1 + dy;
      s.set(ox + mx, oy + my - 1, '┃', cyan);
      s.set(ox + mx, oy + my,     '█', rgb(80, 230, 255));
      s.set(ox + mx, oy + my + 1, '█', rgb(130, 200, 255));
      s.set(ox + mx, oy + my + 2, '┃', cyan);
      // Module status LED
      const ledOn = wave(frame, 22, 0) > 0.5;
      s.set(ox + mx + 1, oy + my, ledOn ? '◆' : '◇', ledOn ? rgb(0, 255, 180) : rgb(40, 120, 100));
    },
  },

  // ─────────────────────────────────────────
  // Storage: Samsung PM1743 30.72TB — "Golden God Circuit"
  // Dark bronze body with gold circuit traces and flowing data
  // Permanent circuit grid with pulsing junction nodes
  // Motif: PCB circuit board with gold traces
  // ─────────────────────────────────────────
  pm1743_30tb: {
    theme: {
      frame: rgb(40, 28, 10), frameDk: rgb(22, 15, 5), frameLt: rgb(60, 45, 18),
      accent: rgb(255, 210, 60), accentDk: rgb(200, 155, 35),
      core: rgb(255, 230, 90), coreDk: rgb(180, 135, 25), coreMed: rgb(235, 190, 45),
      vent: rgb(32, 22, 8), ventLt: rgb(48, 35, 14),
      eye: rgb(255, 240, 120), eyeOff: rgb(50, 35, 12),
      leg: rgb(38, 26, 10), shadow: rgb(16, 10, 4),
      emblem: rgb(250, 200, 55), data: rgb(180, 130, 25),
    },
    drawAura(s, ox, oy, frame) {
      const gold = rgb(255, 210, 60);
      const dim = rgb(160, 120, 25);

      // Permanent circuit grid — horizontal and vertical traces
      for (let x = -3; x <= SW + 2; x++) {
        s.set(ox + x, oy - 2, '─', dim);
        s.set(ox + x, oy + SH + 1, '─', dim);
      }
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 3, oy + y, '│', dim);
        s.set(ox + SW + 2, oy + y, '│', dim);
      }
      // Junction nodes — pulsing at key intersections
      const junctions = [[-3, -2], [SW + 2, -2], [-3, SH + 1], [SW + 2, SH + 1],
                         [CX, -2], [CX, SH + 1], [-3, CY], [SW + 2, CY]];
      for (let i = 0; i < junctions.length; i++) {
        const brightness = wave(frame, 22, i * 5);
        s.set(ox + junctions[i][0], oy + junctions[i][1], '┼', brightness > 0.5 ? gold : dim);
      }

      // Gold floor glow
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy + SH, '▀', wave(frame, 30, x * 2) > 0.5 ? gold : dim);
      }

      // Data flow dots moving along circuit traces
      for (let i = 0; i < 2; i++) {
        const hx = ((frame + i * 12) % (SW + 6)) - 3;
        s.set(ox + hx, oy - 2, '●', gold);
        const vy = ((frame + i * 14) % (SH + 3)) - 1;
        s.set(ox - 3, oy + vy, '●', gold);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const gold = rgb(255, 210, 60);
      const dim = rgb(160, 120, 25);

      // 3 persistent circuit traces on sprite body
      const traces = [
        { y: 2, x0: 1, len: 6, dir: 'h' },
        { y: 6, x0: 4, len: 7, dir: 'h' },
        { x: CX, y0: 1, len: 4, dir: 'v' },
      ];
      for (const t of traces) {
        const brightness = wave(frame, 28, (t.x0 || t.x || 0) * 3);
        const col = brightness > 0.4 ? gold : dim;
        if (t.dir === 'h') {
          for (let j = 0; j < t.len; j++) s.set(ox + t.x0 + j, oy + t.y, '─', col);
          s.set(ox + t.x0 + t.len, oy + t.y, '┐', col);
        } else {
          for (let j = 0; j < t.len; j++) s.set(ox + t.x, oy + t.y0 + j, '│', col);
          s.set(ox + t.x, oy + t.y0 + t.len, '┘', col);
        }
      }

      // ── Companion: circuit node (below sprite) ──
      const dy = bob(frame, 0.05);
      const cx = CX + 3, cy = SH + 2 + dy;
      s.set(ox + cx - 1, oy + cy, '┌', gold);
      s.set(ox + cx,     oy + cy, '◈', rgb(255, 240, 140));
      s.set(ox + cx + 1, oy + cy, '┐', gold);
      s.set(ox + cx - 1, oy + cy + 1, '└', dim);
      s.set(ox + cx,     oy + cy + 1, '─', dim);
      s.set(ox + cx + 1, oy + cy + 1, '┘', dim);
    },
  },

  // ─────────────────────────────────────────
  // Storage: Quantum Photonic Array — "Quantum Enigma"
  // Deep violet body with purple probability fields
  // Fixed probability ring, entanglement lines, wave collapse
  // Motif: Quantum mechanics — probability clouds and wave collapse
  // ─────────────────────────────────────────
  ql_petascale: {
    theme: {
      frame: rgb(25, 15, 50), frameDk: rgb(14, 8, 30), frameLt: rgb(40, 28, 72),
      accent: rgb(170, 130, 255), accentDk: rgb(120, 85, 220),
      core: rgb(200, 160, 255), coreDk: rgb(100, 65, 200), coreMed: rgb(150, 110, 240),
      vent: rgb(20, 12, 42), ventLt: rgb(30, 20, 58),
      eye: rgb(220, 190, 255), eyeOff: rgb(40, 25, 70),
      leg: rgb(22, 14, 48), shadow: rgb(10, 6, 24),
      emblem: rgb(180, 140, 255), data: rgb(100, 65, 180),
    },
    drawAura(s, ox, oy, frame) {
      const bright = rgb(200, 170, 255);
      const mid = rgb(140, 100, 230);
      const dim = rgb(70, 45, 140);

      // Fixed probability ring — 14 dots in elliptical formation, pulse brightness
      for (let i = 0; i < 14; i++) {
        const angle = i * Math.PI * 2 / 14;
        const rx = Math.round(CX + 9 * Math.cos(angle));
        const ry = Math.round(CY + 5.5 * Math.sin(angle));
        const brightness = wave(frame, 32, i * 4);
        const col = brightness > 0.6 ? bright : brightness > 0.3 ? mid : dim;
        s.set(ox + rx, oy + ry, '·', col);
      }

      // Entanglement lines — 3 fixed pairs connected by persistent traces
      const pairs = [[0, 7], [3, 10], [5, 12]];
      for (let p = 0; p < pairs.length; p++) {
        const a1 = pairs[p][0] * Math.PI * 2 / 14;
        const a2 = pairs[p][1] * Math.PI * 2 / 14;
        const x1 = Math.round(CX + 9 * Math.cos(a1));
        const y1 = Math.round(CY + 5.5 * Math.sin(a1));
        const x2 = Math.round(CX + 9 * Math.cos(a2));
        const y2 = Math.round(CY + 5.5 * Math.sin(a2));
        const mx = Math.floor((x1 + x2) / 2);
        const my = Math.floor((y1 + y2) / 2);
        const lineVis = wave(frame, 28, p * 7);
        if (lineVis > 0.3) {
          const ch = Math.abs(x2 - x1) > Math.abs(y2 - y1) ? '─' : '│';
          s.set(ox + mx, oy + my, ch, dim);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const bright = rgb(220, 200, 255);
      const white = rgb(255, 255, 255);
      const violet = rgb(160, 120, 255);

      // Wave collapse — expanding ring then sharp snap to center
      const cycleLen = 55;
      const phase = frame % cycleLen;

      if (phase < 25) {
        const r = Math.floor(phase / 3);
        const fade = Math.max(0, 1 - phase / 25);
        const col = rgb(Math.floor(180 * fade), Math.floor(140 * fade), 255);
        for (let angle = 0; angle < 8; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 4) * r * 1.2);
          const ay = Math.round(Math.sin(angle * Math.PI / 4) * r * 0.45);
          if (CX + ax >= 0 && CX + ax < SW && CY + ay >= 0 && CY + ay < SH) {
            s.set(ox + CX + ax, oy + CY + ay, '◦', col);
          }
        }
      } else if (phase < 32) {
        // Collapse — bright cross at center
        s.set(ox + CX, oy + CY, '✦', white);
        s.set(ox + CX - 1, oy + CY, '═', bright);
        s.set(ox + CX + 1, oy + CY, '═', bright);
        s.set(ox + CX, oy + CY - 1, '║', bright);
        s.set(ox + CX, oy + CY + 1, '║', bright);
      }

      // ── Companion: quantum orb (below sprite) ──
      const dy = bob(frame, 0.09);
      const qx = CX - 3, qy = SH + 2 + dy;
      s.set(ox + qx, oy + qy, '◈', bright);
      // Orbiting electron
      const eAngle = frame / 22 * Math.PI * 2;
      const ex = Math.round(qx + 2 * Math.cos(eAngle));
      const ey = Math.round(qy + 1 * Math.sin(eAngle));
      s.set(ox + ex, oy + ey, '·', violet);
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// FULL SET MEGA-EFFECT — "KERNEL ASCENDANT"
// When all 4 slots have transcendent parts equipped.
// Crown, energy wings, orbital symbols, ground eruption.
// Gold-to-platinum palette — transcends all brand identities.
// ═══════════════════════════════════════════════════════════════

const FULL_SET_THEME = {
  frame: rgb(20, 15, 35), frameDk: rgb(10, 8, 20), frameLt: rgb(35, 28, 55),
  accent: rgb(220, 180, 255), accentDk: rgb(160, 120, 220),
  core: rgb(255, 220, 255), coreDk: rgb(140, 100, 200), coreMed: rgb(200, 160, 240),
  vent: rgb(16, 12, 30), ventLt: rgb(25, 20, 42),
  eye: rgb(255, 255, 255), eyeOff: rgb(45, 35, 65),
  leg: rgb(22, 16, 38), shadow: rgb(8, 6, 16),
  emblem: rgb(240, 200, 255), data: rgb(120, 80, 180),
};

const FULL_SET_EFFECT = {
  drawAura(s, ox, oy, frame) {
    const gold = rgb(255, 220, 80);
    const platinum = rgb(235, 240, 255);
    const white = rgb(255, 255, 255);

    // ── Energy crown — persistent structure above head ──
    const crownPulse = wave(frame, 22, 0);
    const crownColor = crownPulse > 0.5 ? gold : rgb(255, 240, 180);
    const crownBright = crownPulse > 0.7 ? white : gold;

    s.set(ox + CX, oy - 4, '▲', crownBright);
    s.set(ox + CX - 1, oy - 4, '✦', crownColor);
    s.set(ox + CX + 1, oy - 4, '✦', crownColor);
    s.set(ox + CX - 2, oy - 3, '╱', crownColor);
    s.set(ox + CX + 2, oy - 3, '╲', crownColor);
    s.set(ox + CX, oy - 3, '█', crownBright);
    s.set(ox + CX - 1, oy - 3, '▓', crownColor);
    s.set(ox + CX + 1, oy - 3, '▓', crownColor);

    // ── Energy wings — smooth flap, gold-to-platinum shift ──
    const flapOffset = Math.round(Math.sin(frame * 0.06) * 1.0);
    const wingColor = ascendantGlow(frame, 0);
    const wingDim = ascendantGlow(frame, 40);
    const wingY = 3 + flapOffset;

    // Left wing
    s.set(ox - 6, oy + wingY - 1, '═', wingDim);
    s.set(ox - 5, oy + wingY - 1, '═', wingColor);
    s.set(ox - 4, oy + wingY, '═', wingColor);
    s.set(ox - 3, oy + wingY, '═', wingColor);
    s.set(ox - 2, oy + wingY, '╲', wingColor);
    s.set(ox - 5, oy + wingY, '─', wingDim);
    s.set(ox - 6, oy + wingY, '─', wingDim);
    s.set(ox - 4, oy + wingY + 1, '─', wingDim);
    s.set(ox - 3, oy + wingY + 1, '╲', wingDim);

    // Right wing
    s.set(ox + SW + 5, oy + wingY - 1, '═', wingDim);
    s.set(ox + SW + 4, oy + wingY - 1, '═', wingColor);
    s.set(ox + SW + 3, oy + wingY, '═', wingColor);
    s.set(ox + SW + 2, oy + wingY, '═', wingColor);
    s.set(ox + SW + 1, oy + wingY, '╱', wingColor);
    s.set(ox + SW + 4, oy + wingY, '─', wingDim);
    s.set(ox + SW + 5, oy + wingY, '─', wingDim);
    s.set(ox + SW + 3, oy + wingY + 1, '─', wingDim);
    s.set(ox + SW + 2, oy + wingY + 1, '╱', wingDim);

    // ── Ground eruption — smooth gold gradient below ──
    for (let x = -3; x <= SW + 2; x++) {
      s.set(ox + x, oy + SH + 1, '▀', ascendantGlow(frame, x * 5));
    }
  },

  drawOverlay(s, ox, oy, frame) {
    const gold = rgb(255, 220, 80);
    const platinum = rgb(235, 240, 255);

    // ── 6 orbital symbols — clean elliptical path, gold-platinum palette ──
    const orbitSymbols = ['✦', '✧', '◆', '◇', '★', '☆'];
    for (let i = 0; i < 6; i++) {
      const angle = (frame / 100 * Math.PI * 2) + (i * Math.PI * 2 / 6);
      const orbitX = Math.round(CX + 10 * Math.cos(angle));
      const orbitY = Math.round(CY + 6 * Math.sin(angle));
      if (orbitX >= -6 && orbitX < SW + 6 && orbitY >= -4 && orbitY < SH + 3) {
        s.set(ox + orbitX, oy + orbitY, orbitSymbols[i], ascendantGlow(frame, i * 12));
      }
    }

    // ── Permanent crown jewel ──
    s.set(ox + CX, oy - 5, '✦', rgb(255, 255, 255));

    // ── Cardinal energy markers — 4 fixed glyphs at compass points ──
    const pulse = wave(frame, 25, 0);
    const markerCol = pulse > 0.5 ? platinum : gold;
    s.set(ox + CX, oy - 6, '◆', markerCol);
    s.set(ox + CX, oy + SH + 3, '◆', markerCol);
    s.set(ox - 7, oy + CY, '◆', markerCol);
    s.set(ox + SW + 6, oy + CY, '◆', markerCol);
  },
};

// ═══════════════════════════════════════════════════════════════
// Effect Application — stacks ALL transcendent effects
// ═══════════════════════════════════════════════════════════════

const APPLY_ORDER = ['ram', 'storage', 'cpu', 'gpu'];

function findAllTranscendentParts(equippedParts) {
  if (!equippedParts || typeof equippedParts !== 'object') return [];
  const found = [];
  for (const type of APPLY_ORDER) {
    const partId = equippedParts[type];
    if (partId && PARTS[partId] && PARTS[partId].rarity === 'transcendent') {
      if (TRANSCENDENT_EFFECTS[partId]) found.push({ id: partId, type });
    }
  }
  return found;
}

const TYPE_PRIORITY = ['gpu', 'cpu', 'storage', 'ram'];
function findTopTranscendentPart(equippedParts) {
  if (!equippedParts || typeof equippedParts !== 'object') return null;
  for (const type of TYPE_PRIORITY) {
    const partId = equippedParts[type];
    if (partId && PARTS[partId] && PARTS[partId].rarity === 'transcendent') {
      if (TRANSCENDENT_EFFECTS[partId]) return { id: partId, type };
    }
  }
  return null;
}

function applyTranscendentPartEffects(sprite, equippedParts) {
  const transcendentParts = findAllTranscendentParts(equippedParts);
  if (transcendentParts.length === 0) return sprite;

  const isFullSet = transcendentParts.length >= 4;

  // Build merged theme — apply in order so GPU wins for overlapping properties
  let mergedTheme = { ...sprite.theme };
  for (const tp of transcendentParts) {
    const effect = TRANSCENDENT_EFFECTS[tp.id];
    if (effect && effect.theme) {
      mergedTheme = { ...mergedTheme, ...effect.theme };
    }
  }
  if (isFullSet) {
    mergedTheme = { ...mergedTheme, ...FULL_SET_THEME };
  }
  sprite.theme = mergedTheme;

  const origBack = sprite.back.draw;
  const origFront = sprite.front.draw;

  sprite.back = {
    ...sprite.back,
    draw(screen, ox, oy, tint, frame) {
      const f = frame || 0;
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawAura) effect.drawAura(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawAura(screen, ox, oy, f);
      origBack(screen, ox, oy, tint, frame);
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawOverlay) effect.drawOverlay(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawOverlay(screen, ox, oy, f);
    },
  };

  sprite.front = {
    ...sprite.front,
    draw(screen, ox, oy, tint, frame) {
      const f = frame || 0;
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawAura) effect.drawAura(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawAura(screen, ox, oy, f);
      origFront(screen, ox, oy, tint, frame);
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawOverlay) effect.drawOverlay(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawOverlay(screen, ox, oy, f);
    },
  };

  sprite.transcendent = transcendentParts.map(tp => tp.id);
  sprite.transcendentFullSet = isFullSet;
  return sprite;
}

module.exports = {
  TRANSCENDENT_EFFECTS,
  FULL_SET_EFFECT,
  applyTranscendentPartEffects,
  findTopTranscendentPart,
  findAllTranscendentParts,
  transcendentGlow,
};
