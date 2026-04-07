// ═══════════════════════════════════════════════════════════════
// ARTIFACT VISUALS — Floating animated effects for equipped artifacts
// Core  → Sigil Plate:    Geometric circuit-seal below fighter
// Module → Orbiting Glyphs: Three fragments orbiting the fighter
// Relic  → Void Fracture:  Unstable glitching tear near fighter
// NEVER draws over character sprites — orbits/floats around them.
// ═══════════════════════════════════════════════════════════════

const { rgb } = require('../palette');

// ─── Rarity-scaled color palettes ───

const RARITY_IDX = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, transcendent: 6,
};

// Sigil Plate colors (warm: steel → gold → white-hot)
const SIGIL_COLORS = [
  [rgb(140, 145, 160), rgb(110, 115, 130), rgb(90, 95, 108)],   // common: dull steel
  [rgb(170, 175, 190), rgb(140, 145, 160), rgb(120, 125, 140)], // uncommon: brighter steel
  [rgb(200, 190, 140), rgb(170, 160, 110), rgb(140, 130, 90)],  // rare: warm brass
  [rgb(230, 200, 100), rgb(200, 170, 70), rgb(170, 140, 50)],   // epic: rich gold
  [rgb(250, 225, 100), rgb(220, 195, 70), rgb(190, 165, 50)],   // legendary: bright gold
  [rgb(255, 200, 120), rgb(255, 160, 80), rgb(255, 120, 60)],   // mythic: molten
  [rgb(255, 250, 220), rgb(255, 240, 180), rgb(255, 220, 140)], // transcendent: white-hot
];

// Orbiting Glyphs colors (cool: teal/cyan palette)
const ORBIT_COLORS = [
  [rgb(60, 140, 150), rgb(50, 120, 130), rgb(40, 100, 110)],
  [rgb(70, 165, 175), rgb(60, 145, 155), rgb(50, 125, 135)],
  [rgb(80, 190, 210), rgb(70, 170, 190), rgb(60, 150, 170)],
  [rgb(90, 210, 230), rgb(80, 190, 210), rgb(70, 170, 190)],
  [rgb(110, 230, 240), rgb(90, 210, 220), rgb(80, 190, 200)],
  [rgb(130, 245, 255), rgb(110, 225, 235), rgb(90, 205, 215)],
  [rgb(180, 255, 255), rgb(150, 245, 250), rgb(120, 235, 240)],
];

// Void Fracture colors (forbidden: violet + sickly green + chaos)
const VOID_BASE = [rgb(120, 40, 180), rgb(40, 200, 100)];
const VOID_FLASH = [rgb(255, 60, 120), rgb(20, 10, 30), rgb(240, 240, 255)];

// ─── Sigil Plate patterns (two alternating states) ───

const SIGIL_A = [
  '  ╬  ',
  ' ═◈═ ',
  '  ╬  ',
];
const SIGIL_B = [
  '  ║  ',
  ' ─◈─ ',
  '  ║  ',
];

// Higher rarity → expanded sigil
const SIGIL_A_WIDE = [
  '  ·╬·  ',
  ' ═╳◈╳═ ',
  '  ·╬·  ',
];
const SIGIL_B_WIDE = [
  '  ·║·  ',
  ' ─┼◈┼─ ',
  '  ·║·  ',
];

// ═══════════════════════════════════════════════════════════════

class ArtifactVisualManager {
  constructor(screenWidth, screenHeight, rng) {
    this.w = screenWidth;
    this.h = screenHeight;
    this.rng = rng;
    this.playerArtifacts = null;
    this.oppArtifacts = null;

    // Void fracture state (per side)
    this.fractures = { player: this._initFracture(), opp: this._initFracture() };
  }

  setArtifacts(playerArtifacts, opponentArtifacts) {
    this.playerArtifacts = playerArtifacts;
    this.oppArtifacts = opponentArtifacts;
  }

  _initFracture() {
    return {
      cells: [], // [{x, y, char, colorIdx}]
      lastShift: 0,
    };
  }

  draw(screen, frameCount, plyCenter, oppCenter) {
    if (this.playerArtifacts) {
      this._drawArtifacts(screen, frameCount, plyCenter, this.playerArtifacts, true);
    }
    if (this.oppArtifacts) {
      this._drawArtifacts(screen, frameCount, oppCenter, this.oppArtifacts, false);
    }
  }

  _drawArtifacts(screen, frame, center, artifacts, isPlayer) {
    if (!artifacts || Object.keys(artifacts).length === 0) return;

    // Draw each equipped artifact's visual
    if (artifacts.core) this._drawSigilPlate(screen, frame, center, artifacts.core, isPlayer);
    if (artifacts.module) this._drawOrbitingGlyphs(screen, frame, center, artifacts.module, isPlayer);
    if (artifacts.relic) this._drawVoidFracture(screen, frame, center, artifacts.relic, isPlayer);
  }

  // ─── CORE: Sigil Plate ───
  // Geometric circuit-seal hovering below the fighter
  _drawSigilPlate(screen, frame, center, artifactId, isPlayer) {
    const { ARTIFACTS } = require('../artifacts');
    const artifact = ARTIFACTS[artifactId];
    if (!artifact) return;

    const rarIdx = RARITY_IDX[artifact.rarity] || 0;
    const colors = SIGIL_COLORS[Math.min(rarIdx, SIGIL_COLORS.length - 1)];

    // Position below the sprite
    const baseY = isPlayer ? center.y + 6 : center.y + 5;
    const baseX = center.x;

    // Alternate between two patterns every 8 frames (breathing effect)
    const useWide = rarIdx >= 3; // epic+ gets wider sigil
    const phase = Math.floor(frame / 8) % 2;
    const pattern = useWide
      ? (phase === 0 ? SIGIL_A_WIDE : SIGIL_B_WIDE)
      : (phase === 0 ? SIGIL_A : SIGIL_B);

    // Center pulse: the ◈ character flickers
    const centerChar = (frame % 16 < 12) ? '◈' : '·';

    for (let row = 0; row < pattern.length; row++) {
      const line = pattern[row];
      const y = baseY + row;
      if (y < 1 || y >= this.h - 7) continue;

      const halfW = Math.floor(line.length / 2);
      for (let col = 0; col < line.length; col++) {
        let ch = line[col];
        if (ch === ' ') continue;

        const x = baseX - halfW + col;
        if (x < 0 || x >= this.w) continue;

        // Center character replacement
        if (ch === '◈') ch = centerChar;

        // Color: outer chars darker, center brighter
        const distFromCenter = Math.abs(col - halfW) + Math.abs(row - 1);
        const colorIdx = distFromCenter < 2 ? 0 : (distFromCenter < 3 ? 1 : 2);
        screen.set(x, y, ch, colors[colorIdx]);
      }
    }

    // Mythic+: add corner sparks
    if (rarIdx >= 5) {
      const sparkChars = ['·', '⊹', '⋆'];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + frame * 0.08;
        const r = useWide ? 5 : 4;
        const sx = baseX + Math.round(Math.cos(a) * r);
        const sy = baseY + 1 + Math.round(Math.sin(a) * r * 0.4);
        if (sx >= 0 && sx < this.w && sy >= 1 && sy < this.h - 7) {
          const sparkIdx = (i + Math.floor(frame * 0.2)) % sparkChars.length;
          const flicker = (frame + i * 5) % 6;
          if (flicker < 4) {
            screen.set(sx, sy, sparkChars[sparkIdx], colors[0]);
          }
        }
      }
    }
  }

  // ─── MODULE: Orbiting Glyphs ───
  // Three small glyphs orbiting in a tight ellipse
  _drawOrbitingGlyphs(screen, frame, center, artifactId, isPlayer) {
    const { ARTIFACTS } = require('../artifacts');
    const artifact = ARTIFACTS[artifactId];
    if (!artifact) return;

    const rarIdx = RARITY_IDX[artifact.rarity] || 0;
    const colors = ORBIT_COLORS[Math.min(rarIdx, ORBIT_COLORS.length - 1)];
    const glyphs = ['◇', '▪', '»'];

    const rx = isPlayer ? 7 : 6;
    const ry = isPlayer ? 3 : 2;
    const speed = 0.025; // radians per frame — full orbit ~40 frames

    for (let i = 0; i < 3; i++) {
      const angle = frame * speed + (i * Math.PI * 2 / 3); // 120-degree separation
      const px = center.x + Math.round(Math.cos(angle) * rx);
      const py = center.y + Math.round(Math.sin(angle) * ry);

      if (px < 0 || px >= this.w || py < 1 || py >= this.h - 7) continue;

      // Don't draw if inside sprite bounds (rough bounding box)
      const dx = Math.abs(px - center.x);
      const dy = Math.abs(py - center.y);
      if (dx < (isPlayer ? 5 : 4) && dy < (isPlayer ? 4 : 3)) continue;

      screen.set(px, py, glyphs[i], colors[i % colors.length]);

      // Higher rarity: trailing dot
      if (rarIdx >= 2) {
        const trailAngle = angle - speed * 3;
        const tx = center.x + Math.round(Math.cos(trailAngle) * rx);
        const ty = center.y + Math.round(Math.sin(trailAngle) * ry);
        if (tx >= 0 && tx < this.w && ty >= 1 && ty < this.h - 7) {
          const tdx = Math.abs(tx - center.x);
          const tdy = Math.abs(ty - center.y);
          if (!(tdx < (isPlayer ? 5 : 4) && tdy < (isPlayer ? 4 : 3))) {
            screen.set(tx, ty, '·', colors[2]);
          }
        }
      }

      // Epic+: brief connecting lines between adjacent fragments
      if (rarIdx >= 3 && (frame + i * 7) % 20 < 3) {
        const nextI = (i + 1) % 3;
        const nextAngle = frame * speed + (nextI * Math.PI * 2 / 3);
        const nx = center.x + Math.round(Math.cos(nextAngle) * rx);
        const ny = center.y + Math.round(Math.sin(nextAngle) * ry);
        // Draw midpoint connector
        const mx = Math.round((px + nx) / 2);
        const my = Math.round((py + ny) / 2);
        if (mx >= 0 && mx < this.w && my >= 1 && my < this.h - 7) {
          const connChar = Math.abs(px - nx) > Math.abs(py - ny) ? '─' : '│';
          screen.set(mx, my, connChar, colors[1]);
        }
      }
    }
  }

  // ─── RELIC: Void Fracture ───
  // Jagged, unstable tear near the fighter that glitches
  _drawVoidFracture(screen, frame, center, artifactId, isPlayer) {
    const { ARTIFACTS } = require('../artifacts');
    const artifact = ARTIFACTS[artifactId];
    if (!artifact) return;

    const rarIdx = RARITY_IDX[artifact.rarity] || 0;
    const fractureChars = ['░', '▒', '▓', '╳', '~', '≈'];

    // Position: upper-right of player sprite, upper-left of opponent
    const offsetX = isPlayer ? 8 : -8;
    const offsetY = -3;
    const fx = center.x + offsetX;
    const fy = center.y + offsetY;

    // Fracture size scales with rarity (2x2 → 4x3)
    const patchW = rarIdx >= 4 ? 4 : (rarIdx >= 2 ? 3 : 2);
    const patchH = rarIdx >= 4 ? 3 : 2;

    // Blink out for 2 frames every 20
    if (frame % 20 < 2) return;

    // Flash color determination
    let flashColor = null;
    if (frame % 6 === 0) {
      flashColor = VOID_FLASH[Math.floor(this.rng.next() * VOID_FLASH.length)];
    }

    // Fracture key (player or opp)
    const fKey = isPlayer ? 'player' : 'opp';
    const fracture = this.fractures[fKey];

    // Initialize or rebuild cells periodically
    if (fracture.cells.length === 0 || frame - fracture.lastShift > 4) {
      fracture.cells = [];
      for (let row = 0; row < patchH; row++) {
        for (let col = 0; col < patchW; col++) {
          // Random jitter: each cell can shift ±1
          const jx = Math.round((this.rng.next() - 0.5) * 1.4);
          const jy = Math.round((this.rng.next() - 0.5) * 0.8);
          const charIdx = Math.floor(this.rng.next() * fractureChars.length);
          const colorIdx = Math.floor(this.rng.next() * 2); // 0 = violet, 1 = green

          fracture.cells.push({
            x: fx + col + jx,
            y: fy + row + jy,
            char: fractureChars[charIdx],
            colorIdx,
          });
        }
      }
      fracture.lastShift = frame;
    }

    // Per-frame: randomly replace 1-2 chars for glitch effect
    for (let g = 0; g < 2; g++) {
      if (fracture.cells.length > 0) {
        const idx = Math.floor(this.rng.next() * fracture.cells.length);
        fracture.cells[idx].char = fractureChars[Math.floor(this.rng.next() * fractureChars.length)];
        fracture.cells[idx].colorIdx = Math.floor(this.rng.next() * 2);
      }
    }

    // Draw the fracture patch
    for (const cell of fracture.cells) {
      if (cell.x < 0 || cell.x >= this.w || cell.y < 1 || cell.y >= this.h - 7) continue;

      const color = flashColor || VOID_BASE[cell.colorIdx];
      screen.set(cell.x, cell.y, cell.char, color);
    }

    // Mythic+: add pulsing border sparks
    if (rarIdx >= 5) {
      const sparkPositions = [
        { x: fx - 1, y: fy },
        { x: fx + patchW, y: fy },
        { x: fx - 1, y: fy + patchH - 1 },
        { x: fx + patchW, y: fy + patchH - 1 },
      ];
      for (let i = 0; i < sparkPositions.length; i++) {
        const sp = sparkPositions[i];
        if (sp.x < 0 || sp.x >= this.w || sp.y < 1 || sp.y >= this.h - 7) continue;
        const pulse = (frame + i * 4) % 8;
        if (pulse < 5) {
          const sparkChar = pulse < 2 ? '⚡' : '·';
          screen.set(sp.x, sp.y, sparkChar, VOID_BASE[i % 2]);
        }
      }
    }

    // Transcendent: outer distortion ring
    if (rarIdx >= 6) {
      const distortChars = ['~', '≈', '·'];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + frame * 0.06;
        const dr = patchW + 1;
        const dx = fx + Math.round(patchW / 2) + Math.round(Math.cos(a) * dr);
        const dy = fy + Math.round(patchH / 2) + Math.round(Math.sin(a) * dr * 0.5);
        if (dx >= 0 && dx < this.w && dy >= 1 && dy < this.h - 7) {
          const dChar = distortChars[(i + frame) % distortChars.length];
          const dColor = (frame + i) % 3 === 0 ? VOID_FLASH[0] : VOID_BASE[i % 2];
          screen.set(dx, dy, dChar, dColor);
        }
      }
    }
  }
}

module.exports = { ArtifactVisualManager };
