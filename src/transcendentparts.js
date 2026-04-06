// ═══════════════════════════════════════════════════════════════
// TRANSCENDENT PART EFFECTS — Dramatic visual auras & overlays
// Wraps the existing sprite draw functions to add animated effects.
// Each Transcendent part has: theme override, drawAura, drawOverlay.
// Effects render BEHIND and ON TOP of the base sprite.
// Does NOT render when a skin is equipped (skin takes priority).
// ALL equipped Transcendent parts stack their effects simultaneously.
// Full set (all 4 slots transcendent) triggers additional mega-effects.
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

// Sine wave helper (returns 0–1)
function wave(frame, period, phase) {
  return Math.sin(((frame + (phase || 0)) % period) / period * Math.PI * 2) * 0.5 + 0.5;
}

// Sprite bounds for effect placement (14 wide × 12 tall standard sprite)
const SW = 14, SH = 12;
const CX = 7, CY = 5; // sprite center

// ═══════════════════════════════════════════════════════════════
// TRANSCENDENT EFFECT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TRANSCENDENT_EFFECTS = {

  // ─────────────────────────────────────────
  // GPU: NVIDIA B200 Blackwell — "Digital Godstorm"
  // Dense matrix rain, energy border, dual scan beams
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

      // Dense matrix rain — 10 columns spanning well beyond sprite
      for (let col = -4; col <= SW + 3; col += 2) {
        for (let row = -2; row < SH + 3; row++) {
          const phase = (frame * 2 + col * 7 + row * 3) % 16;
          if (phase < 5) {
            const ch = String.fromCharCode(0x30 + (hash(col, frame + row) % 10));
            const bright = phase === 0 ? grn : phase < 2 ? mid : dk;
            s.set(ox + col, oy + row, ch, bright);
          }
        }
      }

      // Energy border — solid glowing frame around sprite
      for (let x = -1; x <= SW; x++) {
        const bc = ((frame + x * 3) % 12 < 6) ? grn : mid;
        s.set(ox + x, oy - 2, '▄', bc);
        s.set(ox + x, oy + SH + 1, '▀', bc);
      }
      for (let y = -1; y < SH + 1; y++) {
        const bc = ((frame + y * 4) % 12 < 6) ? grn : mid;
        s.set(ox - 2, oy + y, '▐', bc);
        s.set(ox + SW + 1, oy + y, '▌', bc);
      }

      // Digital rune band above sprite
      const runes = '◈✦★⚡◆▣◉✧';
      for (let x = 0; x < SW; x += 2) {
        const ri = hash(x, Math.floor(frame / 4)) % runes.length;
        const rc = ((frame + x * 5) % 8 < 4) ? grn : dk;
        s.set(ox + x, oy - 3, runes[ri], rc);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const grn = rgb(0, 255, 100);
      const bright = rgb(120, 255, 160);

      // Dual scan beams — horizontal and vertical
      const hScan = Math.floor(((frame % 30) / 30) * SH);
      for (let x = 0; x < SW; x++) {
        if ((frame + x) % 2 === 0) s.set(ox + x, oy + hScan, '─', grn);
      }
      const vScan = Math.floor(((frame % 25) / 25) * SW);
      for (let y = 0; y < SH; y++) {
        if ((frame + y) % 3 === 0) s.set(ox + vScan, oy + y, '│', grn);
      }

      // Code injection — hex values flashing on sprite body
      for (let i = 0; i < 4; i++) {
        const seed = hash(i, Math.floor(frame / 3));
        const px = seed % SW;
        const py = (seed >> 8) % SH;
        const hex = ((frame + i * 17) % 256).toString(16).toUpperCase();
        if ((frame + i * 7) % 10 < 4) {
          s.set(ox + px, oy + py, hex[0], bright);
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: NVIDIA Rubin Ultra — "Solar Furnace"
  // Thick heat shimmer, molten border, rising plasma
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
      const shimmerChars = ['░', '▒', '▓', '█', '▓', '▒'];

      // Thick shimmer border — 2 cells deep on all sides
      for (let y = -1; y < SH + 1; y++) {
        for (let layer = 0; layer < 2; layer++) {
          const ch = shimmerChars[(frame + y * 2 + layer * 3) % 6];
          const col = layer === 0 ? hot : warm;
          s.set(ox - 1 - layer, oy + y, ch, col);
          s.set(ox + SW + layer, oy + y, shimmerChars[(frame + y * 2 + layer * 3 + 2) % 6], col);
        }
      }
      // Top border — 2 rows of heat waves
      for (let x = -1; x <= SW; x++) {
        const ch1 = shimmerChars[(frame + x * 2) % 6];
        s.set(ox + x, oy - 1, ch1, warm);
        const waveChars = ['~', '≈', '~', '∿'];
        s.set(ox + x, oy - 2, waveChars[(frame + x * 3) % 4], ember);
      }
      // Heat waves — 3 rows above
      for (let row = 0; row < 3; row++) {
        for (let x = 0; x < SW; x += 2) {
          const vis = (frame + x * 3 + row * 7) % 10 < 5;
          if (vis) {
            s.set(ox + x, oy - 3 - row, '~', row === 0 ? warm : ember);
          }
        }
      }
      // Molten floor — 2 rows below
      for (let x = -1; x <= SW; x++) {
        const fc = ((frame + x * 4) % 8 < 4) ? hot : warm;
        s.set(ox + x, oy + SH, '▀', fc);
        s.set(ox + x, oy + SH + 1, shimmerChars[(frame + x * 2) % 6], ember);
      }
    },
    drawOverlay(s, ox, oy, frame) {
      // 8 rising heat particles
      const heatChars = ['°', '˚', '·', '∘', '°', '˚'];
      for (let i = 0; i < 8; i++) {
        const seed = hash(i, Math.floor(frame / 3));
        const px = seed % SW;
        const py = -1 - ((frame + i * 4) % (SH + 6));
        const ch = heatChars[seed % 6];
        const hc = (seed % 3 === 0) ? rgb(255, 255, 240) : rgb(255, 210, 130);
        if (oy + py >= oy - 4) s.set(ox + px, oy + py, ch, hc);
      }
      // Sunspot flares — bright flashes at random positions
      for (let i = 0; i < 3; i++) {
        if ((frame + i * 11) % 15 < 3) {
          const sx = hash(frame + i, 33) % SW;
          const sy = hash(frame + i, 77) % SH;
          s.set(ox + sx, oy + sy, '✦', rgb(255, 255, 255));
        }
      }
      // Corona streaks — horizontal bright lines
      const streakY = (frame % 20 < 10) ? (frame % 10) : 9 - (frame % 10);
      const sRow = Math.floor(streakY * SH / 10);
      if (sRow >= 0 && sRow < SH && (frame % 3 === 0)) {
        for (let x = 0; x < SW; x += 2) {
          s.set(ox + x, oy + sRow, '═', rgb(255, 255, 255));
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: AMD Instinct MI350X — "Infernal Forge"
  // Massive forge glow, ember columns, lava cracks, volcanic burst
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
      const ember = rgb(200, 50, 10);
      const ash = rgb(120, 30, 8);

      // Forge glow — bottom 3 rows, wide spread
      const pulse = wave(frame, 20, 0);
      for (let row = 0; row < 3; row++) {
        const width = SW + 4 - row * 2;
        const startX = -2 + row;
        for (let x = startX; x < startX + width; x++) {
          const intensity = (frame + x * 5 + row * 3) % 8;
          const ch = intensity < 2 ? '█' : intensity < 4 ? '▓' : '░';
          const glowR = Math.floor(200 + 55 * pulse);
          const col = intensity < 4 ? rgb(glowR, 40 + Math.floor(30 * pulse), 5) : ash;
          s.set(ox + x, oy + SH + row, ch, col);
        }
      }

      // Side ember columns — rising particles on both flanks
      for (let side = 0; side < 2; side++) {
        const baseX = side === 0 ? -3 : SW + 2;
        for (let y = SH + 1; y >= -2; y--) {
          const phase = (frame * 2 + y * 3 + side * 17) % 20;
          if (phase < 6) {
            const ch = phase < 2 ? '▓' : phase < 4 ? '░' : '·';
            const col = phase < 2 ? fire : phase < 4 ? ember : ash;
            s.set(ox + baseX, oy + y, ch, col);
            s.set(ox + baseX + (side === 0 ? 1 : -1), oy + y, phase < 3 ? '░' : '·', col);
          }
        }
      }

      // Lava cracks across bottom edge
      for (let x = -1; x <= SW; x++) {
        if ((frame + x * 7) % 12 < 5) {
          s.set(ox + x, oy + SH - 1, '═', lava);
        }
      }

      // Smoke wisps above
      for (let x = 1; x < SW - 1; x += 3) {
        const smokeY = -1 - ((frame + x * 2) % 4);
        if ((frame + x * 5) % 8 < 3) {
          s.set(ox + x, oy + smokeY, '░', rgb(80, 50, 40));
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      // 12 rising embers through and above sprite
      const emberChars = ['·', '∘', '°', '•', '✹', '◆'];
      for (let i = 0; i < 12; i++) {
        const seed = hash(i, Math.floor(frame / 3));
        const px = seed % (SW + 2) - 1;
        const py = SH - ((frame + i * 5) % (SH + 8));
        const ch = emberChars[seed % 6];
        const bright = (seed % 3 === 0) ? rgb(255, 180, 40) : rgb(255, 80, 20);
        if (py >= -3 && py < SH + 1) s.set(ox + px, oy + py, ch, bright);
      }

      // Magma veins — shifting bright lines on sprite body
      for (let i = 0; i < 3; i++) {
        const seed = hash(i, Math.floor(frame / 8));
        const sy = seed % SH;
        const sx = (seed >> 4) % (SW - 4);
        const len = 3 + (seed % 3);
        const col = ((frame + i * 10) % 12 < 6) ? rgb(255, 180, 40) : rgb(255, 80, 20);
        for (let j = 0; j < len; j++) {
          if (sx + j < SW) s.set(ox + sx + j, oy + sy, '─', col);
        }
      }

      // Volcanic flash — bright burst every 35 frames
      if (frame % 35 < 3) {
        s.set(ox + CX, oy + CY, '✹', rgb(255, 255, 200));
        s.set(ox + CX - 1, oy + CY, '─', rgb(255, 200, 100));
        s.set(ox + CX + 1, oy + CY, '─', rgb(255, 200, 100));
        s.set(ox + CX, oy + CY - 1, '│', rgb(255, 200, 100));
        s.set(ox + CX, oy + CY + 1, '│', rgb(255, 200, 100));
      }
    },
  },

  // ─────────────────────────────────────────
  // GPU: Intel Falcon Shores — "Tesla's Wrath"
  // Dense lightning network, electric corona, ground strikes
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
      const white = rgb(255, 255, 255);
      const dim = rgb(40, 90, 180);

      // 6 lightning bolts with 4 segments each, snapping every 5 frames
      const boltSeed = Math.floor(frame / 5);
      const boltChars = ['╱', '╲', '│', '─', '┘', '┐', '└', '┌'];
      for (let bolt = 0; bolt < 6; bolt++) {
        const h1 = hash(bolt, boltSeed);
        const startX = h1 % (SW + 4) - 2;
        const startY = (h1 >> 4) % 3 - 1;
        const boltColor = (frame % 3 < 2) ? bright : blue;

        let px = startX, py = startY;
        for (let seg = 0; seg < 4; seg++) {
          const segSeed = hash(bolt * 10 + seg, boltSeed);
          const dx = (segSeed % 5) - 2;
          const dy = Math.floor(seg * SH / 4) + (segSeed % 3);
          px = Math.max(-3, Math.min(SW + 2, startX + dx));
          py = startY + dy;
          if (py >= -2 && py < SH + 2) {
            s.set(ox + px, oy + py, boltChars[segSeed % 8], boltColor);
            // Bolt glow — adjacent cell
            if (px + 1 < SW + 3) s.set(ox + px + 1, oy + py, '░', dim);
          }
        }
      }

      // Electric corona — flickering ░ border all around
      for (let x = -2; x <= SW + 1; x++) {
        if ((frame + x * 3) % 4 < 2) {
          s.set(ox + x, oy - 2, '░', blue);
          s.set(ox + x, oy + SH + 1, '░', blue);
        }
      }
      for (let y = -1; y < SH + 1; y++) {
        if ((frame + y * 5) % 4 < 2) {
          s.set(ox - 2, oy + y, '░', blue);
          s.set(ox + SW + 1, oy + y, '░', blue);
        }
      }

      // Ground strikes — bright marks at bottom
      for (let i = 0; i < 3; i++) {
        const gx = hash(i, Math.floor(frame / 8)) % SW;
        if ((frame + i * 11) % 16 < 4) {
          s.set(ox + gx, oy + SH, '╋', white);
          s.set(ox + gx, oy + SH + 1, '│', blue);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const white = rgb(255, 255, 255);
      const blue = rgb(140, 210, 255);

      // 4 simultaneous crackling sparks
      for (let i = 0; i < 4; i++) {
        if ((frame + i * 5) % 4 < 2) {
          const sx = hash(frame + i, 99) % SW;
          const sy = hash(frame + i, 77) % SH;
          s.set(ox + sx, oy + sy, '*', white);
        }
      }

      // Tesla coil — vertical bright line that sways
      const coilX = CX + Math.round(Math.sin(frame * 0.15) * 3);
      for (let y = 0; y < SH; y += 2) {
        if ((frame + y) % 4 < 2) {
          s.set(ox + coilX, oy + y, '│', blue);
        }
      }

      // Energy nodes — fixed points that pulse
      const nodes = [[2, 2], [SW - 3, 2], [CX, SH - 3], [1, SH - 2], [SW - 2, SH - 2]];
      for (let i = 0; i < nodes.length; i++) {
        if ((frame + i * 8) % 12 < 6) {
          s.set(ox + nodes[i][0], oy + nodes[i][1], '◉', blue);
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // CPU: AMD EPYC 9965 Turin — "Threadweaver"
  // Dense concentric rings, starburst rays, pulsing mega-core
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

      // 5 concentric rings expanding — faster period
      const maxR = 10;
      for (let ring = 0; ring < 5; ring++) {
        const ringPhase = ((frame % 20) / 20 + ring * 0.2) % 1.0;
        const r = ringPhase * maxR;
        const ri = Math.floor(r);
        if (ri < 1 || ri > maxR) continue;
        const brightness = Math.max(0, 1 - r / maxR);
        const col = rgb(
          Math.floor(255 * brightness),
          Math.floor(160 * brightness),
          Math.floor(35 * brightness)
        );
        for (let angle = 0; angle < 12; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 6) * ri * 1.3);
          const ay = Math.round(Math.sin(angle * Math.PI / 6) * ri * 0.55);
          const px = CX + ax;
          const py = CY + ay;
          if (px >= -4 && px < SW + 4 && py >= -3 && py < SH + 3) {
            s.set(ox + px, oy + py, '·', col);
          }
        }
      }

      // 12 starburst rays from center to edges
      for (let ray = 0; ray < 12; ray++) {
        const angle = ray * Math.PI / 6;
        const len = 6 + Math.floor(wave(frame, 15, ray * 3) * 3);
        for (let step = 2; step < len; step++) {
          const rx = Math.round(CX + Math.cos(angle) * step * 1.3);
          const ry = Math.round(CY + Math.sin(angle) * step * 0.55);
          if (rx >= -3 && rx < SW + 3 && ry >= -2 && ry < SH + 2) {
            const ch = step % 3 === 0 ? '·' : '─';
            const col = step < 4 ? gold : amber;
            s.set(ox + rx, oy + ry, ch, col);
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const gold = rgb(255, 200, 70);
      const bright = rgb(255, 240, 120);

      // Large 3×3 pulsing core display
      const pulse = wave(frame, 10, 0);
      const coreColor = rgb(255, Math.floor(180 + 60 * pulse), Math.floor(50 + 50 * pulse));
      s.set(ox + CX, oy + CY, '◉', bright);
      s.set(ox + CX - 1, oy + CY, '○', coreColor);
      s.set(ox + CX + 1, oy + CY, '○', coreColor);
      s.set(ox + CX, oy + CY - 1, '○', coreColor);
      s.set(ox + CX, oy + CY + 1, '○', coreColor);

      // Thread wave — horizontal pulse lines
      const waveY = Math.floor(wave(frame, 20, 0) * SH);
      for (let x = 1; x < SW - 1; x += 2) {
        s.set(ox + x, oy + waveY, '─', gold);
      }
    },
  },

  // ─────────────────────────────────────────
  // CPU: Cerebras WSE-3 — "Prismatic Singularity"
  // Triple holographic border, corner crystals, prismatic burst
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
      // Triple holographic border — each layer cycles at different speed
      // Outer border (distance 2)
      for (let x = -2; x <= SW + 1; x++) {
        s.set(ox + x, oy - 2, '·', transcendentGlow(frame, x * 3));
        s.set(ox + x, oy + SH + 1, '·', transcendentGlow(frame, x * 3 + 40));
      }
      for (let y = -1; y < SH + 1; y++) {
        s.set(ox - 2, oy + y, '·', transcendentGlow(frame, y * 5));
        s.set(ox + SW + 1, oy + y, '·', transcendentGlow(frame, y * 5 + 40));
      }
      // Middle border (distance 1) — block characters
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '▄', transcendentGlow(frame * 2, x * 4));
        s.set(ox + x, oy + SH, '▀', transcendentGlow(frame * 2, x * 4 + 20));
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '▐', transcendentGlow(frame * 2, y * 6));
        s.set(ox + SW, oy + y, '▌', transcendentGlow(frame * 2, y * 6 + 30));
      }
      // Inner glow — faint shimmer just inside sprite edge
      for (let x = 0; x < SW; x++) {
        if ((frame + x * 2) % 6 < 2) {
          s.set(ox + x, oy, '░', transcendentGlow(frame * 3, x * 5));
          s.set(ox + x, oy + SH - 1, '░', transcendentGlow(frame * 3, x * 5 + 30));
        }
      }

      // Corner crystals with trailing sparkles
      const corners = [[-2, -2], [SW + 1, -2], [-2, SH + 1], [SW + 1, SH + 1]];
      for (let i = 0; i < 4; i++) {
        const [cx, cy] = corners[i];
        s.set(ox + cx, oy + cy, '✦', transcendentGlow(frame, i * 15));
        // Trailing sparkle
        const tx = cx + (i < 2 ? -1 : 1) * ((frame + i * 5) % 3);
        const ty = cy + (i % 2 === 0 ? -1 : 1) * ((frame + i * 7) % 2);
        s.set(ox + tx, oy + ty, '✧', transcendentGlow(frame, i * 15 + 10));
      }

      // Diagonal rainbow streaks from corners
      for (let d = 0; d < 4; d++) {
        const phase = (frame + d * 15) % 30;
        if (phase < 8) {
          const dx = (d < 2 ? 1 : -1);
          const dy = (d % 2 === 0 ? 1 : -1);
          const startX = d < 2 ? -1 : SW;
          const startY = d % 2 === 0 ? -1 : SH;
          for (let step = 0; step < 4; step++) {
            const px = startX + dx * step;
            const py = startY + dy * Math.floor(step * 0.5);
            if (px >= -3 && px < SW + 3 && py >= -3 && py < SH + 3) {
              s.set(ox + px, oy + py, '─', transcendentGlow(frame, d * 10 + step * 5));
            }
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      // 3 simultaneous scan lines at different speeds
      for (let i = 0; i < 3; i++) {
        const scanRow = (frame * (i + 1)) % (SH + 6) - 3;
        if (scanRow >= 0 && scanRow < SH) {
          for (let x = 0; x < SW; x++) {
            if ((x + frame + i * 4) % 3 === 0) {
              s.set(ox + x, oy + scanRow, '═', transcendentGlow(frame, x * 3 + i * 20));
            }
          }
        }
      }

      // Prismatic burst every 40 frames — 8 directional particles
      const burstPhase = frame % 40;
      if (burstPhase < 10) {
        const r = burstPhase;
        for (let dir = 0; dir < 8; dir++) {
          const ax = Math.round(Math.cos(dir * Math.PI / 4) * r * 0.8);
          const ay = Math.round(Math.sin(dir * Math.PI / 4) * r * 0.4);
          const px = CX + ax;
          const py = CY + ay;
          if (px >= 0 && px < SW && py >= 0 && py < SH) {
            s.set(ox + px, oy + py, '✦', transcendentGlow(frame, dir * 7));
          }
        }
      }
      // Central flash at burst start
      if (burstPhase < 3) {
        s.set(ox + CX, oy + CY, '◉', rgb(255, 255, 255));
      }
    },
  },

  // ─────────────────────────────────────────
  // CPU: Apple M4 Ultra Max — "Platinum Ascendant"
  // Dense particle constellation, solid border, orbital geometry
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
      const soft = rgb(140, 150, 175);

      // Dense 18-particle field — always visible, not blinking
      for (let i = 0; i < 18; i++) {
        const seed = hash(i, 42); // Fixed positions, not frame-dependent
        const px = (seed % (SW + 10)) - 5;
        const py = ((seed >> 8) % (SH + 8)) - 4;
        // Gentle brightness pulsing instead of on/off
        const brightness = wave(frame, 30 + (i % 5) * 4, i * 7);
        const col = brightness > 0.5 ? plat : silver;
        s.set(ox + px, oy + py, '·', col);
      }

      // Solid elegant border — always visible, thin platinum line
      for (let x = -1; x <= SW; x++) {
        s.set(ox + x, oy - 1, '─', silver);
        s.set(ox + x, oy + SH, '─', silver);
      }
      for (let y = 0; y < SH; y++) {
        s.set(ox - 1, oy + y, '│', silver);
        s.set(ox + SW, oy + y, '│', silver);
      }
      // Corner accents
      s.set(ox - 1, oy - 1, '┌', plat);
      s.set(ox + SW, oy - 1, '┐', plat);
      s.set(ox - 1, oy + SH, '└', plat);
      s.set(ox + SW, oy + SH, '┘', plat);

      // Constellation lines connecting nearby particles
      for (let i = 0; i < 6; i++) {
        const s1 = hash(i * 2, 42);
        const s2 = hash(i * 2 + 1, 42);
        const x1 = (s1 % (SW + 10)) - 5;
        const y1 = ((s1 >> 8) % (SH + 8)) - 4;
        const x2 = (s2 % (SW + 10)) - 5;
        const y2 = ((s2 >> 8) % (SH + 8)) - 4;
        const midX = Math.floor((x1 + x2) / 2);
        const midY = Math.floor((y1 + y2) / 2);
        if ((frame + i * 10) % 20 < 10) {
          s.set(ox + midX, oy + midY, '·', soft);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const plat = rgb(230, 238, 255);
      const bright = rgb(255, 255, 255);

      // 8 orbiting geometric shapes — wider orbit
      const shapes = ['◇', '○', '△', '□', '◇', '○', '△', '□'];
      for (let i = 0; i < 8; i++) {
        const angle = (frame / 80 * Math.PI * 2) + (i * Math.PI * 2 / 8);
        const orbitX = Math.round(CX + 8 * Math.cos(angle));
        const orbitY = Math.round(CY + 5 * Math.sin(angle));
        if (orbitX >= -4 && orbitX < SW + 4 && orbitY >= -3 && orbitY < SH + 3) {
          s.set(ox + orbitX, oy + orbitY, shapes[i], plat);
        }
      }

      // Platinum pulse — whole-sprite brightness flash every 35 frames
      if (frame % 35 < 2) {
        for (let y = 0; y < SH; y += 3) {
          for (let x = 0; x < SW; x += 3) {
            s.set(ox + x, oy + y, '·', bright);
          }
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // RAM: 4TB HBM4 Stacked — "Data Typhoon"
  // Quad data pillars, horizontal streams, data burst
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
      const streamChars = ['║', '│', '┃', '║', '│', '┃'];

      // 4 data pillars — 2 on each side, staggered
      const pillarPositions = [-3, -2, SW + 1, SW + 2];
      for (let p = 0; p < 4; p++) {
        const px = pillarPositions[p];
        for (let y = -2; y < SH + 3; y++) {
          const phase = (frame * 2 + y * 2 + p * 13) % 16;
          // Cyan-to-violet gradient
          const t = Math.max(0, Math.min(1, (y + 2) / (SH + 4)));
          const r = Math.floor(80 + 80 * t);
          const g = Math.floor(230 - 130 * t);
          const b = 255;
          const col = phase < 6 ? rgb(r, g, b) : rgb(Math.floor(r * 0.3), Math.floor(g * 0.3), Math.floor(b * 0.4));
          s.set(ox + px, oy + y, streamChars[phase % 6], col);
        }
      }

      // Horizontal data streams above and below
      for (let x = -3; x <= SW + 2; x++) {
        // Above: flowing left
        const abovePhase = (frame + x * 3) % 12;
        if (abovePhase < 4) {
          const hex = ((frame + x * 7) % 16).toString(16).toUpperCase();
          s.set(ox + x, oy - 3, hex, cyan);
        }
        // Below: flowing right
        const belowPhase = (frame - x * 3 + 60) % 12;
        if (belowPhase < 4) {
          const hex = ((frame + x * 11) % 16).toString(16).toUpperCase();
          s.set(ox + x, oy + SH + 2, hex, violet);
        }
      }

      // Data burst — expanding ring from center every 25 frames
      const burstPhase = frame % 25;
      if (burstPhase < 8) {
        const r = burstPhase + 1;
        for (let angle = 0; angle < 8; angle++) {
          const bx = Math.round(CX + r * 1.2 * Math.cos(angle * Math.PI / 4));
          const by = Math.round(CY + r * 0.5 * Math.sin(angle * Math.PI / 4));
          if (bx >= -3 && bx < SW + 3 && by >= -2 && by < SH + 2) {
            s.set(ox + bx, oy + by, '·', cyan);
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const cyan = rgb(100, 240, 255);
      const bright = rgb(180, 255, 255);

      // 8 streaming data bytes through sprite
      for (let i = 0; i < 8; i++) {
        const col = (hash(i, 42) % (SW - 2)) + 1;
        const row = SH - ((frame + i * 4) % (SH + 4));
        if (row >= 0 && row < SH) {
          const hex = ((frame + i * 13) % 256).toString(16).toUpperCase().padStart(2, '0');
          const t = row / SH;
          const c = rgb(Math.floor(80 + 80 * t), Math.floor(230 - 130 * t), 255);
          s.set(ox + col, oy + row, hex[0], c);
          if (col + 1 < SW) s.set(ox + col + 1, oy + row, hex[1], c);
        }
      }

      // Hex dump flash — brief row of hex values
      if (frame % 20 < 3) {
        const flashRow = hash(frame, 42) % SH;
        for (let x = 0; x < SW; x += 2) {
          s.set(ox + x, oy + flashRow, 'F', bright);
          if (x + 1 < SW) s.set(ox + x + 1, oy + flashRow, ((frame + x) % 16).toString(16).toUpperCase(), bright);
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // Storage: Samsung PM1743 30.72TB — "Golden God Circuit"
  // Extended circuit traces, gold aura, spark nodes, dense overlay
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
      const bright = rgb(255, 240, 140);
      const dim = rgb(180, 140, 30);
      const traceChars = ['─', '│', '┐', '┘', '┌', '└', '├', '┤'];

      // Extended circuit traces BEYOND sprite — 3 cells out in all directions
      for (let trace = 0; trace < 6; trace++) {
        const seed = hash(trace, Math.floor(frame / 8));
        const isExternal = trace < 3; // first 3 traces go outside sprite
        let startX, startY, dir;

        if (isExternal) {
          // Traces in the aura zone (outside sprite)
          startX = (seed % (SW + 8)) - 4;
          startY = (trace === 0) ? -2 : (trace === 1) ? SH + 1 : ((seed >> 4) % 3) - 1;
          dir = trace === 2 ? 1 : 0;
        } else {
          startX = (seed % (SW + 4)) - 2;
          startY = ((seed >> 4) % (SH + 4)) - 2;
          dir = seed % 2;
        }

        const len = 4 + (seed % 4);
        const c = ((frame + trace * 8) % 14 < 7) ? gold : dim;

        for (let step = 0; step < len; step++) {
          let px, py;
          if (dir === 0) {
            px = startX + step;
            py = startY;
          } else {
            px = startX;
            py = startY + step;
          }
          if (px >= -4 && px < SW + 4 && py >= -3 && py < SH + 3) {
            s.set(ox + px, oy + py, dir === 0 ? '─' : '│', c);
          }
        }
        // Corner junction
        const cx = dir === 0 ? startX + len : startX;
        const cy = dir === 0 ? startY : startY + len;
        if (cx >= -4 && cx < SW + 4 && cy >= -3 && cy < SH + 3) {
          s.set(ox + cx, oy + cy, traceChars[2 + (seed % 4)], c);
        }
      }

      // Pulsing gold floor glow
      for (let x = -1; x <= SW; x++) {
        const gc = ((frame + x * 3) % 10 < 5) ? gold : dim;
        s.set(ox + x, oy + SH, '▀', gc);
      }

      // Spark nodes at circuit junctions outside sprite
      const sparkPositions = [[-3, 1], [-2, SH - 2], [SW + 2, 3], [SW + 1, SH - 1], [CX, -2]];
      for (let i = 0; i < sparkPositions.length; i++) {
        if ((frame + i * 9) % 12 < 5) {
          s.set(ox + sparkPositions[i][0], oy + sparkPositions[i][1], '✦', bright);
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const gold = rgb(255, 210, 60);
      const bright = rgb(255, 240, 160);
      const dim = rgb(180, 140, 30);
      const traceChars = ['─', '│', '┐', '┘', '┌', '└'];

      // 8 dense circuit traces ON sprite body
      for (let trace = 0; trace < 8; trace++) {
        const seed = hash(trace + 100, Math.floor(frame / 6));
        const startY = seed % SH;
        const startX = (frame + trace * 3) % SW;
        const dir = seed % 2;
        const len = 2 + (seed % 4);
        const c = ((frame + trace * 6) % 12 < 6) ? gold : dim;

        for (let step = 0; step < len; step++) {
          let px, py;
          if (dir === 0) {
            px = (startX + step) % SW;
            py = startY;
          } else {
            px = startX % SW;
            py = (startY + step) % SH;
          }
          s.set(ox + px, oy + py, dir === 0 ? '─' : '│', c);
        }
        // Corner at end
        const cx = dir === 0 ? (startX + len) % SW : startX % SW;
        const cy = dir === 0 ? startY : (startY + len) % SH;
        s.set(ox + cx, oy + cy, traceChars[2 + (seed % 4)], c);
      }

      // Animated data dots flowing along traces
      for (let i = 0; i < 5; i++) {
        const dx = (frame * 2 + i * 7) % SW;
        const dy = hash(i, 99) % SH;
        if ((frame + i * 3) % 6 < 3) {
          s.set(ox + dx, oy + dy, '·', bright);
        }
      }

      // Gold flash — brief pulse across sprite
      if (frame % 30 < 2) {
        for (let y = 0; y < SH; y += 2) {
          for (let x = 0; x < SW; x += 3) {
            s.set(ox + x, oy + y, '·', bright);
          }
        }
      }
    },
  },

  // ─────────────────────────────────────────
  // Storage: Quantum Photonic Array — "Quantum Transcendence"
  // Dense probability cloud, entanglement lines, dramatic collapse
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

      // 22 probability dots — dense cloud
      const cloudW = SW + 10;
      const cloudH = SH + 8;
      const visibleDots = [];
      for (let i = 0; i < 22; i++) {
        const dotSeed = hash(i, Math.floor(frame / 2));
        const px = (dotSeed % cloudW) - 5;
        const py = ((dotSeed >> 8) % cloudH) - 4;
        const visible = ((frame + i * 5) % 8) < 5;
        if (visible) {
          const col = (dotSeed % 4 === 0) ? bright : (dotSeed % 3 === 0) ? mid : dim;
          s.set(ox + px, oy + py, '·', col);
          visibleDots.push([px, py]);
        }
      }

      // Entanglement lines — connect pairs of visible dots
      for (let i = 0; i < visibleDots.length - 1; i += 2) {
        const [x1, y1] = visibleDots[i];
        const [x2, y2] = visibleDots[i + 1];
        const midX = Math.floor((x1 + x2) / 2);
        const midY = Math.floor((y1 + y2) / 2);
        const dx = Math.abs(x2 - x1);
        if (dx < 8 && (frame + i * 3) % 6 < 3) {
          const ch = Math.abs(x2 - x1) > Math.abs(y2 - y1) ? '─' : '│';
          s.set(ox + midX, oy + midY, ch, dim);
        }
      }

      // Quantum field — subtle shimmer around sprite
      for (let x = -2; x <= SW + 1; x += 3) {
        for (let y = -1; y < SH + 1; y += 3) {
          if ((frame + x * 2 + y * 5) % 10 < 2) {
            s.set(ox + x, oy + y, '░', rgb(50, 30, 100));
          }
        }
      }
    },
    drawOverlay(s, ox, oy, frame) {
      const bright = rgb(220, 200, 255);
      const white = rgb(255, 255, 255);
      const violet = rgb(160, 120, 255);

      // Dramatic wave collapse — expanding ring that snaps to center
      const cycleLen = 35;
      const phase = frame % cycleLen;

      if (phase < 22) {
        // Ring expands outward — larger radius
        const r = Math.floor(phase / 2.5);
        const col = rgb(Math.max(0, 180 - r * 12), Math.max(0, 140 - r * 10), 255);
        for (let angle = 0; angle < 12; angle++) {
          const ax = Math.round(Math.cos(angle * Math.PI / 6) * r * 1.4);
          const ay = Math.round(Math.sin(angle * Math.PI / 6) * r * 0.5);
          const px = CX + ax;
          const py = CY + ay;
          if (px >= -2 && px < SW + 2 && py >= -1 && py < SH + 1) {
            s.set(ox + px, oy + py, '◦', col);
          }
        }
      } else if (phase < 28) {
        // Collapse flash at center — bright burst
        s.set(ox + CX, oy + CY, '✦', white);
        s.set(ox + CX - 1, oy + CY, '═', bright);
        s.set(ox + CX + 1, oy + CY, '═', bright);
        s.set(ox + CX, oy + CY - 1, '║', bright);
        s.set(ox + CX, oy + CY + 1, '║', bright);

        // Post-collapse particles shooting outward
        const explodeR = (phase - 22) * 2;
        for (let dir = 0; dir < 8; dir++) {
          const ex = Math.round(CX + Math.cos(dir * Math.PI / 4) * explodeR);
          const ey = Math.round(CY + Math.sin(dir * Math.PI / 4) * explodeR * 0.4);
          if (ex >= 0 && ex < SW && ey >= 0 && ey < SH) {
            s.set(ox + ex, oy + ey, '·', violet);
          }
        }
      }

      // Quantum tunneling — dot teleports across sprite
      if (frame % 12 < 3) {
        const tx = hash(frame, 55) % SW;
        const ty = hash(frame, 88) % SH;
        s.set(ox + tx, oy + ty, '◈', bright);
      }
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// FULL SET MEGA-EFFECT — "KERNEL ASCENDANT"
// When all 4 slots have transcendent parts equipped.
// Crown, energy wings, orbital symbols, ground eruption, chromatic storm.
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

    // ── Energy crown — 3 rows above sprite ──
    const crownPulse = wave(frame, 15, 0);
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

    // ── Energy wings — extending 6 cells each side ──
    const flapOffset = Math.round(Math.sin(frame * 0.08) * 1.2);
    const wingColor = transcendentGlow(frame, 0);
    const wingDim = transcendentGlow(frame, 30);

    // Left wing
    const wingY = 3 + flapOffset;
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

    // ── Ground eruption — 2 rows below sprite ──
    for (let x = -3; x <= SW + 2; x++) {
      const eruptColor = transcendentGlow(frame * 2, x * 5);
      s.set(ox + x, oy + SH + 1, '▀', eruptColor);
      if ((frame + x * 3) % 6 < 3) {
        s.set(ox + x, oy + SH + 2, '░', transcendentGlow(frame, x * 7));
      }
    }
  },

  drawOverlay(s, ox, oy, frame) {
    // ── 6 orbital symbols circling the sprite ──
    const orbitSymbols = ['✦', '✧', '◆', '◇', '★', '☆'];
    for (let i = 0; i < 6; i++) {
      const angle = (frame / 100 * Math.PI * 2) + (i * Math.PI * 2 / 6);
      const orbitX = Math.round(CX + 10 * Math.cos(angle));
      const orbitY = Math.round(CY + 6 * Math.sin(angle));
      if (orbitX >= -6 && orbitX < SW + 6 && orbitY >= -4 && orbitY < SH + 3) {
        s.set(ox + orbitX, oy + orbitY, orbitSymbols[i], transcendentGlow(frame, i * 10));
      }
    }

    // ── Chromatic storm — 14 bright particles in cycling rainbow ──
    for (let i = 0; i < 14; i++) {
      const seed = hash(i, Math.floor(frame / 2));
      const px = (seed % (SW + 14)) - 7;
      const py = ((seed >> 8) % (SH + 10)) - 5;
      const visible = ((frame + i * 4) % 7) < 4;
      if (visible) {
        const stormChars = ['·', '∘', '°', '✦', '★', '◆'];
        const ch = stormChars[seed % 6];
        s.set(ox + px, oy + py, ch, transcendentGlow(frame, i * 9));
      }
    }

    // ── Power pulse — full-sprite flash every 50 frames ──
    if (frame % 50 < 2) {
      const flashColor = rgb(255, 255, 255);
      for (let y = 0; y < SH; y += 2) {
        for (let x = 0; x < SW; x += 2) {
          s.set(ox + x, oy + y, '·', flashColor);
        }
      }
    }

    // ── Permanent crown jewel — bright star above head ──
    s.set(ox + CX, oy - 5, '✦', rgb(255, 255, 255));
  },
};

// ═══════════════════════════════════════════════════════════════
// Effect Application — stacks ALL transcendent effects
// ═══════════════════════════════════════════════════════════════

// Application order: later types override theme colors
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

// Backward-compatible: returns highest-priority single part
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
  // Full set overrides everything with ultra-dark prismatic theme
  if (isFullSet) {
    mergedTheme = { ...mergedTheme, ...FULL_SET_THEME };
  }
  sprite.theme = mergedTheme;

  const origBack = sprite.back.draw;
  const origFront = sprite.front.draw;

  // Wrap back draw — stack ALL auras, then sprite, then ALL overlays
  sprite.back = {
    ...sprite.back,
    draw(screen, ox, oy, tint, frame) {
      const f = frame || 0;
      // All auras (behind sprite)
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawAura) effect.drawAura(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawAura(screen, ox, oy, f);

      // Original sprite
      origBack(screen, ox, oy, tint, frame);

      // All overlays (on top of sprite)
      for (const tp of transcendentParts) {
        const effect = TRANSCENDENT_EFFECTS[tp.id];
        if (effect && effect.drawOverlay) effect.drawOverlay(screen, ox, oy, f);
      }
      if (isFullSet) FULL_SET_EFFECT.drawOverlay(screen, ox, oy, f);
    },
  };

  // Wrap front draw — same stacking
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
