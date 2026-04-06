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
//   - Each effect has a hovering companion entity for personality
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
  // GPU: NVIDIA B200 Blackwell — "Digital Godstorm"
  // Structured matrix columns, energy border, hovering data drone
  // ─────────────────────────────────────────
  blackwell_b200: {
    theme: {
      frame: rgb(15, 35, 20), frameDk: rgb(8, 20, 12), frameLt: rgb(25, 55, 30),
      accent: rgb(0, 255, 65), accentDk: rgb(0, 180, 40),
      core: rgb(0, 255, 80), coreDk: rgb(0, 140, 35), coreMed: rgb(0, 210, 55),
      vent: rgb(10, 28, 15), ventLt: rgb(18, 42, 22),
      eye: rgb(0, 255, 120), eyeOff: rgb(0, 50, 20),
      leg: rgb(12, 32, 18), shadow: rgb(5, 15, 8),
      emblem: rgb(0, 220, 70), data: rgb(0, 120, 35),
    },
    drawAura(s, ox, oy, frame) {
      const grn = rgb(0, 255, 65);
      const mid = rgb(0, 180, 40);
      const dk = rgb(0, 100, 25);

      // 4 defined matrix columns — 2 per side, smooth downward scroll
      const colPositions = [-3, -1, SW, SW + 2];
      for (const col of colPositions) {
        for (let row = -3; row < SH + 3; row++) {
          // Smooth scrolling digit stream (not random teleport)
          const scrollY = (frame + row * 3 + col * 7) % 18;
          const ch = String.fromCharCode(0x30 + ((row + frame) % 10));
          const bright = scrollY < 2 ? grn : scrollY < 5 ? mid : scrollY < 8 ? dk : null;
          if (bright) s.set(ox + col, oy + row, ch, bright);
        }
      }

      // Clean energy border — solid green frame
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 2, '▄', mid);
        s.set(ox + x, oy + SH + 1, '▀', mid);
      }
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 2, oy + y, '▐', mid);
        s.set(ox + SW + 1, oy + y, '▌', mid);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const grn = rgb(0, 255, 100);
      const mid = rgb(0, 180, 40);
      const dk = rgb(0, 100, 25);

      // Single clean scan beam — horizontal sweep
      const scanY = Math.floor(((frame % 40) / 40) * SH);
      for (let x = 0; x < SW; x++) {
        s.set(ox + x, oy + scanY, '─', grn);
      }

      // ── Companion: hovering data drone (right flank) ──
      const dy = bob(frame, 0.07);
      const cx = SW + 3, cy = CY - 1 + dy;
      s.set(ox + cx - 1, oy + cy, '─', mid);
      s.set(ox + cx,     oy + cy, '◈', grn);
      s.set(ox + cx + 1, oy + cy, '─', mid);
      s.set(ox + cx,     oy + cy + 1, '│', dk);
      // Drone canopy
      if (frame % 30 < 25) {
        s.set(ox + cx, oy + cy - 1, '▀', dk);
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: NVIDIA Rubin Ultra — "Solar Furnace"
  // Structured heat shimmer, molten border, solar wisp companion
  // ─────────────────────────────────────────
  rubin_ultra: {
    theme: {
      frame: rgb(50, 30, 15), frameDk: rgb(30, 18, 8), frameLt: rgb(75, 50, 25),
      accent: rgb(255, 240, 200), accentDk: rgb(220, 170, 90),
      core: rgb(255, 255, 230), coreDk: rgb(210, 180, 110), coreMed: rgb(245, 225, 170),
      vent: rgb(40, 25, 12), ventLt: rgb(55, 35, 18),
      eye: rgb(255, 255, 255), eyeOff: rgb(60, 40, 20),
      leg: rgb(45, 28, 14), shadow: rgb(20, 12, 5),
      emblem: rgb(255, 230, 150), data: rgb(200, 150, 70),
    },
    drawAura(s, ox, oy, frame) {
      const hot = rgb(255, 250, 220);
      const warm = rgb(255, 200, 100);
      const ember = rgb(220, 140, 50);
      const shimmerChars = ['░', '▒', '▓', '▒'];

      // Clean shimmer border — 1 cell deep, smooth cycling
      for (let y = -1; y < SH + 1; y++) {
        const ch = shimmerChars[(frame + y * 2) % 4];
        s.set(ox - 1, oy + y, ch, hot);
        s.set(ox + SW, oy + y, shimmerChars[(frame + y * 2 + 2) % 4], hot);
      }
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, shimmerChars[(frame + x) % 4], warm);
      }

      // Organized rising heat — 3 fixed columns above sprite, smooth Y motion
      const heatCols = [2, CX, SW - 3];
      for (const hx of heatCols) {
        for (let i = 0; i < 3; i++) {
          const hy = -2 - ((frame + i * 8 + hx * 3) % 6);
          const ch = i === 0 ? '°' : '·';
          if (hy >= -5) s.set(ox + hx, oy + hy, ch, i === 0 ? hot : ember);
        }
      }

      // Molten floor — solid gradient
      for (let x = -1; x <= SW; x++) {
        const pulse = wave(frame, 25, x * 2);
        s.set(ox + x, oy + SH, '▀', pulse > 0.5 ? hot : warm);
        s.set(ox + x, oy + SH + 1, '░', ember);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const hot = rgb(255, 250, 220);
      const warm = rgb(255, 200, 100);
      const ember = rgb(220, 140, 50);

      // ── Companion: solar wisp (right flank) ──
      const dy = bob(frame, 0.06);
      const wx = SW + 3, wy = CY + dy;
      s.set(ox + wx, oy + wy - 1, '✦', hot);
      s.set(ox + wx - 1, oy + wy, '╱', warm);
      s.set(ox + wx + 1, oy + wy, '╲', warm);
      s.set(ox + wx, oy + wy, '▓', hot);
      // Wisp flame flicker
      const flickCh = frame % 12 < 6 ? '°' : '·';
      s.set(ox + wx, oy + wy - 2, flickCh, ember);
    },
  },

  // ─────────────────────────────────────────
  // GPU: AMD Instinct MI350X — "Infernal Forge"
  // Forge glow, defined ember streams, forge hammer companion
  // ─────────────────────────────────────────
  mi350x: {
    theme: {
      frame: rgb(45, 12, 8), frameDk: rgb(25, 6, 4), frameLt: rgb(70, 22, 12),
      accent: rgb(255, 70, 20), accentDk: rgb(200, 40, 10),
      core: rgb(255, 100, 30), coreDk: rgb(180, 40, 8), coreMed: rgb(235, 65, 15),
      vent: rgb(35, 10, 6), ventLt: rgb(50, 15, 10),
      eye: rgb(255, 140, 40), eyeOff: rgb(50, 15, 5),
      leg: rgb(40, 12, 8), shadow: rgb(18, 5, 3),
      emblem: rgb(220, 55, 15), data: rgb(140, 30, 8),
    },
    drawAura(s, ox, oy, frame) {
      const fire = rgb(255, 80, 20);
      const lava = rgb(255, 180, 40);
      const ash = rgb(120, 30, 8);

      // Forge glow — bottom 2 rows, solid gradient
      const pulse = wave(frame, 25, 0);
      for (let x = -2; x <= SW + 1; x++) {
        const glowR = Math.floor(200 + 55 * pulse);
        s.set(ox + x, oy + SH, '▀', rgb(glowR, 50, 8));
        s.set(ox + x, oy + SH + 1, '░', ash);
      }

      // 4 defined ember streams — fixed X positions, smooth rise
      const emberCols = [-2, -1, SW, SW + 1];
      const emberChars = ['·', '∘', '°', '•'];
      for (const ex of emberCols) {
        for (let i = 0; i < 4; i++) {
          const ey = SH - ((frame + i * 5 + ex * 3) % (SH + 6));
          if (ey >= -2 && ey < SH + 1) {
            const ch = emberChars[i % 4];
            const col = (i < 2) ? fire : lava;
            s.set(ox + ex, oy + ey, ch, col);
          }
        }
      }

      // Lava cracks — persistent line at bottom edge
      for (let x = 0; x < SW; x++) {
        const vis = wave(frame, 30, x * 4) > 0.3;
        if (vis) s.set(ox + x, oy + SH - 1, '═', lava);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const fire = rgb(255, 80, 20);
      const lava = rgb(255, 180, 40);
      const bright = rgb(255, 220, 100);

      // ── Companion: forge hammer (right flank) ──
      // Hammer "strikes" with a quick bob snap
      const hammerCycle = frame % 40;
      const hammerY = hammerCycle < 5 ? -1 : hammerCycle < 8 ? 1 : 0; // quick strike motion
      const hx = SW + 3, hy = CY - 2 + hammerY;
      s.set(ox + hx, oy + hy, '█', lava);       // hammer head
      s.set(ox + hx + 1, oy + hy, '▌', fire);   // hammer side
      s.set(ox + hx, oy + hy + 1, '║', fire);   // handle
      s.set(ox + hx, oy + hy + 2, '║', rgb(140, 30, 8)); // handle
      // Spark on strike
      if (hammerCycle >= 5 && hammerCycle < 10) {
        s.set(ox + hx - 1, oy + hy, '✹', bright);
        s.set(ox + hx + 2, oy + hy + 1, '·', fire);
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: Intel Falcon Shores — "Tesla's Wrath"
  // Defined lightning paths, electric border, storm orb companion
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
      const dim = rgb(40, 90, 180);

      // 3 defined lightning rods — vertical lines at fixed positions with arcs
      const rodPositions = [-2, CX, SW + 1];
      const boltSeed = Math.floor(frame / 10); // persist longer (10 frames)
      for (let r = 0; r < 3; r++) {
        const rx = rodPositions[r];
        // Rod base
        s.set(ox + rx, oy + SH, '╋', bright);
        // Bolt path — 4 segments zigzagging upward from rod
        const h1 = hash(r, boltSeed);
        let bx = rx;
        for (let seg = 0; seg < 5; seg++) {
          const segY = SH - 1 - seg * 2 - ((h1 >> (seg * 3)) % 2);
          const jitter = ((h1 >> (seg * 4 + 8)) % 3) - 1;
          bx = Math.max(-3, Math.min(SW + 2, rx + jitter));
          if (segY >= -2 && segY < SH) {
            const ch = jitter > 0 ? '╲' : jitter < 0 ? '╱' : '│';
            s.set(ox + bx, oy + segY, ch, (frame % 4 < 2) ? bright : blue);
          }
        }
      }

      // Solid electric border — dim persistent glow
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '░', dim);
        s.set(ox + x, oy + SH + 1, '░', dim);
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '░', dim);
        s.set(ox + SW, oy + y, '░', dim);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const blue = rgb(140, 210, 255);
      const bright = rgb(200, 235, 255);

      // Energy nodes — fixed symmetric positions, pulse in sequence
      const nodes = [[2, 2], [SW - 3, 2], [2, SH - 3], [SW - 3, SH - 3], [CX, CY]];
      for (let i = 0; i < nodes.length; i++) {
        const brightness = wave(frame, 20, i * 4);
        const col = brightness > 0.5 ? bright : blue;
        s.set(ox + nodes[i][0], oy + nodes[i][1], '◉', col);
      }

      // ── Companion: storm orb (right flank) ──
      const dy = bob(frame, 0.09);
      const sx = SW + 3, sy = CY - 1 + dy;
      s.set(ox + sx - 1, oy + sy, '⚡', blue);
      s.set(ox + sx,     oy + sy, '◉', bright);
      s.set(ox + sx + 1, oy + sy, '⚡', blue);
      // Orb electrical arc below
      const arcCh = frame % 8 < 4 ? '╱' : '╲';
      s.set(ox + sx, oy + sy + 1, arcCh, rgb(40, 90, 180));
    },
  },

  // ─────────────────────────────────────────
  // CPU: AMD EPYC 9965 Turin — "Threadweaver"
  // Clean concentric rings, radiating lines, processing die companion
  // ─────────────────────────────────────────
  epyc_9965: {
    theme: {
      frame: rgb(40, 25, 10), frameDk: rgb(22, 14, 5), frameLt: rgb(60, 40, 18),
      accent: rgb(255, 170, 40), accentDk: rgb(220, 120, 25),
      core: rgb(255, 200, 60), coreDk: rgb(180, 100, 15), coreMed: rgb(235, 150, 30),
      vent: rgb(32, 20, 8), ventLt: rgb(48, 32, 14),
      eye: rgb(255, 220, 80), eyeOff: rgb(50, 30, 10),
      leg: rgb(35, 22, 10), shadow: rgb(15, 10, 4),
      emblem: rgb(255, 165, 35), data: rgb(160, 90, 15),
    },
    drawAura(s, ox, oy, frame) {
      const gold = rgb(255, 180, 50);
      const amber = rgb(220, 130, 30);
      const dim = rgb(140, 80, 15);

      // 3 concentric rings — smooth expansion, clear circular form
      const maxR = 9;
      for (let ring = 0; ring < 3; ring++) {
        const r = ((frame % 30) / 30 + ring * 0.33) % 1.0 * maxR;
        const ri = Math.floor(r);
        if (ri < 1 || ri > maxR) continue;
        const brightness = Math.max(0, 1 - r / maxR);
        const col = rgb(Math.floor(255 * brightness), Math.floor(160 * brightness), Math.floor(35 * brightness));
        for (let angle = 0; angle < 16; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 8) * ri * 1.3);
          const ay = Math.round(Math.sin(angle * Math.PI / 8) * ri * 0.55);
          if (CX + ax >= -3 && CX + ax < SW + 3 && CY + ay >= -2 && CY + ay < SH + 2) {
            s.set(ox + CX + ax, oy + CY + ay, '·', col);
          }
        }
      }

      // 8 radiating lines — persistent, pulse brightness
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4;
        const brightness = wave(frame, 20, ray * 5);
        const col = brightness > 0.5 ? gold : amber;
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
      const gold = rgb(255, 200, 70);
      const bright = rgb(255, 240, 120);

      // Pulsing core — 3×3 cross at center
      const pulse = wave(frame, 12, 0);
      const coreCol = rgb(255, Math.floor(180 + 60 * pulse), Math.floor(50 + 50 * pulse));
      s.set(ox + CX, oy + CY, '◉', bright);
      s.set(ox + CX - 1, oy + CY, '─', coreCol);
      s.set(ox + CX + 1, oy + CY, '─', coreCol);
      s.set(ox + CX, oy + CY - 1, '│', coreCol);
      s.set(ox + CX, oy + CY + 1, '│', coreCol);

      // ── Companion: processing die (above sprite) ──
      const dy = bob(frame, 0.06);
      const dx = CX + 4, ddy = -4 + dy;
      s.set(ox + dx - 1, oy + ddy - 1, '┌', gold);
      s.set(ox + dx,     oy + ddy - 1, '─', gold);
      s.set(ox + dx + 1, oy + ddy - 1, '┐', gold);
      s.set(ox + dx - 1, oy + ddy,     '│', gold);
      const diePulse = wave(frame, 15, 0);
      s.set(ox + dx,     oy + ddy,     '◉', diePulse > 0.5 ? bright : gold);
      s.set(ox + dx + 1, oy + ddy,     '│', gold);
      s.set(ox + dx - 1, oy + ddy + 1, '└', gold);
      s.set(ox + dx,     oy + ddy + 1, '─', gold);
      s.set(ox + dx + 1, oy + ddy + 1, '┘', gold);
    },
  },

  // ─────────────────────────────────────────
  // CPU: Cerebras WSE-3 — "Prismatic Singularity"
  // Double holographic border, corner crystals, holo prism companion
  // ─────────────────────────────────────────
  cerebras_wse3: {
    theme: {
      frame: rgb(18, 12, 45), frameDk: rgb(10, 6, 28), frameLt: rgb(30, 22, 65),
      accent: rgb(200, 150, 255), accentDk: rgb(150, 110, 220),
      core: rgb(230, 190, 255), coreDk: rgb(130, 90, 200), coreMed: rgb(180, 140, 240),
      vent: rgb(15, 10, 38), ventLt: rgb(22, 16, 52),
      eye: rgb(255, 230, 255), eyeOff: rgb(40, 25, 70),
      leg: rgb(20, 14, 48), shadow: rgb(8, 5, 22),
      emblem: rgb(210, 170, 255), data: rgb(100, 70, 180),
    },
    drawAura(s, ox, oy, frame) {
      // Outer holographic border — smooth rainbow cycle
      for (let x = -2; x <= SW + 1; x++) {
        s.set(ox + x, oy - 2, '·', transcendentGlow(frame, x * 3));
        s.set(ox + x, oy + SH + 1, '·', transcendentGlow(frame, x * 3 + 30));
      }
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 2, oy + y, '·', transcendentGlow(frame, y * 5));
        s.set(ox + SW + 1, oy + y, '·', transcendentGlow(frame, y * 5 + 30));
      }

      // Inner holographic border — block characters, faster cycle
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '▄', transcendentGlow(frame * 2, x * 4));
        s.set(ox + x, oy + SH, '▀', transcendentGlow(frame * 2, x * 4 + 20));
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '▐', transcendentGlow(frame * 2, y * 6));
        s.set(ox + SW, oy + y, '▌', transcendentGlow(frame * 2, y * 6 + 30));
      }

      // Corner crystals — persistent, color-cycling
      const corners = [[-2, -2], [SW + 1, -2], [-2, SH + 1], [SW + 1, SH + 1]];
      for (let i = 0; i < 4; i++) {
        s.set(ox + corners[i][0], oy + corners[i][1], '✦', transcendentGlow(frame, i * 15));
      }
    },
    drawOverlay(s, ox, oy, frame) {
      // Single clean scan line — slow sweep
      const scanRow = Math.floor(((frame % 50) / 50) * (SH + 2)) - 1;
      if (scanRow >= 0 && scanRow < SH) {
        for (let x = 0; x < SW; x += 2) {
          s.set(ox + x, oy + scanRow, '═', transcendentGlow(frame, x * 3));
        }
      }

      // ── Companion: holographic prism (above sprite) ──
      const dy = bob(frame, 0.07);
      const px = CX - 4, py = -3 + dy;
      s.set(ox + px,     oy + py - 1, '△', transcendentGlow(frame, 0));
      s.set(ox + px - 1, oy + py,     '◇', transcendentGlow(frame, 20));
      s.set(ox + px,     oy + py,     '◈', rgb(255, 255, 255));
      s.set(ox + px + 1, oy + py,     '◇', transcendentGlow(frame, 40));
      s.set(ox + px,     oy + py + 1, '▽', transcendentGlow(frame, 10));
    },
  },

  // ─────────────────────────────────────────
  // CPU: Apple M4 Ultra Max — "Platinum Ascendant"
  // Elegant border, fixed constellation, orbiting geometry
  // ─────────────────────────────────────────
  m4_ultra_max: {
    theme: {
      frame: rgb(35, 38, 48), frameDk: rgb(20, 22, 30), frameLt: rgb(55, 60, 75),
      accent: rgb(230, 235, 250), accentDk: rgb(180, 188, 210),
      core: rgb(245, 250, 255), coreDk: rgb(190, 198, 215), coreMed: rgb(220, 228, 245),
      vent: rgb(28, 30, 40), ventLt: rgb(38, 42, 55),
      eye: rgb(255, 255, 255), eyeOff: rgb(50, 55, 70),
      leg: rgb(30, 34, 45), shadow: rgb(15, 16, 22),
      emblem: rgb(215, 225, 245), data: rgb(140, 150, 180),
    },
    drawAura(s, ox, oy, frame) {
      const plat = rgb(220, 228, 245);
      const silver = rgb(180, 190, 215);

      // Solid elegant border — permanent thin line
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '─', silver);
        s.set(ox + x, oy + SH, '─', silver);
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '│', silver);
        s.set(ox + SW, oy + y, '│', silver);
      }
      s.set(ox - 1, oy - 1, '┌', plat);
      s.set(ox + SW, oy - 1, '┐', plat);
      s.set(ox - 1, oy + SH, '└', plat);
      s.set(ox + SW, oy + SH, '┘', plat);

      // Fixed star field — permanent positions, gentle brightness pulse (no blink)
      const stars = [[-4, -2], [-3, 3], [-5, 7], [SW + 3, -1], [SW + 4, 5], [SW + 2, 9],
                     [2, -3], [CX, -4], [SW - 3, -3], [3, SH + 2], [CX + 1, SH + 3], [SW - 2, SH + 2]];
      for (let i = 0; i < stars.length; i++) {
        const brightness = wave(frame, 40 + i * 3, i * 7);
        s.set(ox + stars[i][0], oy + stars[i][1], '·', brightness > 0.4 ? plat : silver);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const plat = rgb(230, 238, 255);

      // 6 orbiting geometric shapes — clean elliptical path
      const shapes = ['◇', '○', '△', '□', '◇', '○'];
      for (let i = 0; i < 6; i++) {
        const angle = (frame / 90 * Math.PI * 2) + (i * Math.PI * 2 / 6);
        const orbitX = Math.round(CX + 9 * Math.cos(angle));
        const orbitY = Math.round(CY + 6 * Math.sin(angle));
        if (orbitX >= -5 && orbitX < SW + 5 && orbitY >= -4 && orbitY < SH + 3) {
          s.set(ox + orbitX, oy + orbitY, shapes[i], plat);
        }
      }

      // ── Companion: platinum glyph (above sprite) ──
      const dy = bob(frame, 0.05);
      const gx = CX + 5, gy = -3 + dy;
      s.set(ox + gx, oy + gy, '◇', rgb(255, 255, 255));
      s.set(ox + gx, oy + gy + 1, '·', plat);
    },
  },

  // ─────────────────────────────────────────
  // RAM: 4TB HBM4 Stacked — "Data Typhoon"
  // Twin data pillars, flowing streams, memory module companion
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
      const dim = rgb(40, 120, 180);
      const streamChars = ['║', '│', '┃', '║'];

      // 2 data pillars — one per side, smooth scrolling characters
      const pillarPositions = [-2, SW + 1];
      for (let p = 0; p < 2; p++) {
        const px = pillarPositions[p];
        for (let y = -2; y < SH + 3; y++) {
          const scrollPhase = (frame + y * 2 + p * 13) % 12;
          const t = Math.max(0, Math.min(1, (y + 2) / (SH + 4)));
          const r = Math.floor(80 + 80 * t);
          const g = Math.floor(230 - 130 * t);
          const col = scrollPhase < 4 ? rgb(r, g, 255) : rgb(Math.floor(r * 0.3), Math.floor(g * 0.3), Math.floor(255 * 0.4));
          s.set(ox + px, oy + y, streamChars[scrollPhase % 4], col);
        }
      }

      // Horizontal data stream — smooth flow above and below
      for (let x = -3; x <= SW + 2; x++) {
        const abovePhase = (frame + x * 2) % 16;
        if (abovePhase < 4) {
          s.set(ox + x, oy - 2, '─', cyan);
        }
        const belowPhase = (frame - x * 2 + 40) % 16;
        if (belowPhase < 4) {
          s.set(ox + x, oy + SH + 2, '─', violet);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const cyan = rgb(100, 240, 255);

      // 4 streaming data bytes — smooth vertical flow through sprite
      for (let i = 0; i < 4; i++) {
        const col = 2 + i * 3; // fixed column positions
        const row = SH - ((frame + i * 6) % (SH + 4));
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
      const ledOn = wave(frame, 20, 0) > 0.5;
      s.set(ox + mx + 1, oy + my, ledOn ? '◆' : '◇', ledOn ? rgb(0, 255, 180) : rgb(40, 120, 100));
    },
  },

  // ─────────────────────────────────────────
  // Storage: Samsung PM1743 30.72TB — "Golden God Circuit"
  // Permanent circuit grid, gold border, circuit node companion
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
      const dim = rgb(180, 140, 30);

      // Permanent circuit grid extending from sprite — fixed structure
      // Horizontal traces above and below
      for (let x = -3; x <= SW + 2; x++) {
        s.set(ox + x, oy - 2, '─', dim);
        s.set(ox + x, oy + SH + 1, '─', dim);
      }
      // Vertical traces on sides
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 3, oy + y, '│', dim);
        s.set(ox + SW + 2, oy + y, '│', dim);
      }
      // Junction nodes at corners of the circuit — pulsing
      const junctions = [[-3, -2], [SW + 2, -2], [-3, SH + 1], [SW + 2, SH + 1],
                         [CX, -2], [CX, SH + 1], [-3, CY], [SW + 2, CY]];
      for (let i = 0; i < junctions.length; i++) {
        const brightness = wave(frame, 20, i * 5);
        s.set(ox + junctions[i][0], oy + junctions[i][1], '┼', brightness > 0.5 ? gold : dim);
      }

      // Gold floor glow
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy + SH, '▀', wave(frame, 30, x * 2) > 0.5 ? gold : dim);
      }

      // Data flow dots moving along the circuit traces (smooth motion)
      for (let i = 0; i < 3; i++) {
        // Horizontal flow along top trace
        const hx = ((frame + i * 8) % (SW + 6)) - 3;
        s.set(ox + hx, oy - 2, '●', gold);
        // Vertical flow along left trace
        const vy = ((frame + i * 10) % (SH + 3)) - 1;
        s.set(ox - 3, oy + vy, '●', gold);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const gold = rgb(255, 210, 60);
      const dim = rgb(180, 140, 30);

      // 4 persistent circuit traces on sprite body — fixed paths
      const traces = [
        { y: 2, x0: 1, len: 6, dir: 'h' },
        { y: 5, x0: 4, len: 7, dir: 'h' },
        { y: 8, x0: 2, len: 5, dir: 'h' },
        { x: CX, y0: 1, len: 4, dir: 'v' },
      ];
      for (const t of traces) {
        const brightness = wave(frame, 25, (t.x0 || t.x || 0) * 3);
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
  // Storage: Quantum Photonic Array — "Quantum Transcendence"
  // Fixed probability ring, entanglement lines, quantum orb companion
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
      const dim = rgb(80, 50, 160);

      // Fixed probability ring — 16 dots in elliptical formation, pulse brightness
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI * 2 / 16;
        const rx = Math.round(CX + 9 * Math.cos(angle));
        const ry = Math.round(CY + 6 * Math.sin(angle));
        const brightness = wave(frame, 30, i * 4);
        const col = brightness > 0.6 ? bright : brightness > 0.3 ? mid : dim;
        s.set(ox + rx, oy + ry, '·', col);
      }

      // Entanglement lines — 4 fixed pairs connected by persistent lines
      const pairs = [[0, 8], [2, 10], [4, 12], [6, 14]];
      for (let p = 0; p < pairs.length; p++) {
        const a1 = pairs[p][0] * Math.PI * 2 / 16;
        const a2 = pairs[p][1] * Math.PI * 2 / 16;
        const x1 = Math.round(CX + 9 * Math.cos(a1));
        const y1 = Math.round(CY + 6 * Math.sin(a1));
        const x2 = Math.round(CX + 9 * Math.cos(a2));
        const y2 = Math.round(CY + 6 * Math.sin(a2));
        const mx = Math.floor((x1 + x2) / 2);
        const my = Math.floor((y1 + y2) / 2);
        const lineVis = wave(frame, 25, p * 7);
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

      // Wave collapse — expanding ring then snap (structured, no random scatter)
      const cycleLen = 50;
      const phase = frame % cycleLen;

      if (phase < 25) {
        const r = Math.floor(phase / 3);
        const col = rgb(Math.max(0, 180 - r * 12), Math.max(0, 140 - r * 10), 255);
        for (let angle = 0; angle < 12; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 6) * r * 1.2);
          const ay = Math.round(Math.sin(angle * Math.PI / 6) * r * 0.45);
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
      // Orb with orbiting electron
      s.set(ox + qx, oy + qy, '◈', bright);
      const eAngle = frame / 20 * Math.PI * 2;
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
// Structured and recognizable, not chaotic.
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
    const white = rgb(255, 255, 255);

    // ── Energy crown — persistent structure above head ──
    const crownPulse = wave(frame, 20, 0);
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

    // ── Energy wings — smooth flap ──
    const flapOffset = Math.round(Math.sin(frame * 0.06) * 1.0);
    const wingColor = transcendentGlow(frame, 0);
    const wingDim = transcendentGlow(frame, 30);
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

    // ── Ground eruption — smooth energy bar below ──
    for (let x = -3; x <= SW + 2; x++) {
      s.set(ox + x, oy + SH + 1, '▀', transcendentGlow(frame, x * 5));
    }
  },

  drawOverlay(s, ox, oy, frame) {
    // ── 6 orbital symbols — clean elliptical path ──
    const orbitSymbols = ['✦', '✧', '◆', '◇', '★', '☆'];
    for (let i = 0; i < 6; i++) {
      const angle = (frame / 100 * Math.PI * 2) + (i * Math.PI * 2 / 6);
      const orbitX = Math.round(CX + 10 * Math.cos(angle));
      const orbitY = Math.round(CY + 6 * Math.sin(angle));
      if (orbitX >= -6 && orbitX < SW + 6 && orbitY >= -4 && orbitY < SH + 3) {
        s.set(ox + orbitX, oy + orbitY, orbitSymbols[i], transcendentGlow(frame, i * 10));
      }
    }

    // ── Permanent crown jewel ──
    s.set(ox + CX, oy - 5, '✦', rgb(255, 255, 255));

    // ── Cardinal energy markers — 4 fixed glyphs at compass points ──
    const pulse = wave(frame, 25, 0);
    const markerCol = pulse > 0.5 ? rgb(255, 220, 255) : rgb(180, 140, 220);
    s.set(ox + CX, oy - 6, '◆', markerCol);                    // North
    s.set(ox + CX, oy + SH + 3, '◆', markerCol);               // South
    s.set(ox - 7, oy + CY, '◆', markerCol);                     // West
    s.set(ox + SW + 6, oy + CY, '◆', markerCol);                // East
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
