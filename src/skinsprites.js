// ═══════════════════════════════════════════════════════════════════
// SKIN SPRITES — Transcendent cosmetic character art (12 skins)
// Each skin fully replaces the fighter's draw routines with unique
// hand-crafted ASCII art, animations, and color themes.
// ═══════════════════════════════════════════════════════════════════

const { rgb } = require('./palette');
const { cycle, coreGlow, eyeChar, eyeState, ledSweep } = require('./sprites');

// ─── Shared Helpers ───

function transcendentGlow(frame, phase) {
  const f = ((frame + (phase || 0)) % 60) / 60;
  const r = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2));
  const g = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2 + 2.09));
  const b = Math.floor(128 + 127 * Math.sin(f * Math.PI * 2 + 4.19));
  return rgb(r, g, b);
}

function makeTheme(overrides) {
  return {
    frame: rgb(150, 158, 185), frameDk: rgb(95, 100, 128),
    frameLt: rgb(185, 192, 215), accent: rgb(130, 220, 235),
    accentDk: rgb(80, 160, 180), core: rgb(100, 210, 230),
    coreDk: rgb(55, 140, 165), coreMed: rgb(78, 175, 198),
    vent: rgb(65, 70, 95), ventLt: rgb(80, 85, 110),
    eye: rgb(230, 215, 140), eyeOff: rgb(75, 75, 95),
    leg: rgb(85, 90, 108), shadow: rgb(38, 38, 52),
    emblem: rgb(110, 180, 200), data: rgb(60, 100, 120),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SKIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const SKIN_SPRITES = {

  // ─────────────────────────────────────────────
  // 1. PHANTOM REAPER
  //    All-black silhouette, crimson slash marks, glowing red eyes
  // ─────────────────────────────────────────────
  phantom_reaper: {
    theme: makeTheme({
      frame: rgb(30, 30, 38), frameDk: rgb(15, 15, 22), frameLt: rgb(55, 55, 65),
      accent: rgb(180, 20, 20), accentDk: rgb(120, 10, 10),
      core: rgb(200, 30, 30), coreDk: rgb(100, 10, 10), coreMed: rgb(150, 20, 20),
      vent: rgb(22, 22, 30), ventLt: rgb(35, 35, 45),
      eye: rgb(255, 30, 30), eyeOff: rgb(50, 10, 10),
      leg: rgb(25, 25, 32), shadow: rgb(8, 8, 12),
      emblem: rgb(160, 15, 15), data: rgb(80, 5, 5),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.phantom_reaper.theme;
      const blk = t.frame;
      const dk = t.frameDk;
      const red = t.accent;
      const redG = coreGlow(frame, 20, t);

      // Hood (top)
      s.set(ox + 5, oy, '╱', dk); s.set(ox + 6, oy, '▄', blk);
      s.set(ox + 7, oy, '▄', blk); s.set(ox + 8, oy, '╲', dk);
      // Hood wider
      s.set(ox + 4, oy + 1, '╱', dk);
      for (let i = 5; i <= 9; i++) s.set(ox + i, oy + 1, '█', blk);
      s.set(ox + 10, oy + 1, '╲', dk);

      // Cloak body — wide billowing shape
      for (let row = 2; row <= 8; row++) {
        const halfW = Math.min(row, 6);
        const cx = 7;
        s.set(ox + cx - halfW, oy + row, '▌', dk);
        for (let i = cx - halfW + 1; i < cx + halfW; i++) {
          // Slash marks flicker across the cloak
          const slashPhase = (frame + row * 3 + i * 7) % 50;
          if (slashPhase < 2) {
            s.set(ox + i, oy + row, '╱', red);
          } else if (slashPhase >= 25 && slashPhase < 27) {
            s.set(ox + i, oy + row, '╲', red);
          } else {
            s.set(ox + i, oy + row, '▓', blk);
          }
        }
        s.set(ox + cx + halfW, oy + row, '▐', dk);
      }

      // Tattered cloak bottom edge
      for (let i = 0; i < 13; i++) {
        const tatter = (frame + i * 5) % 30;
        if (tatter < 6) s.set(ox + 1 + i, oy + 9, '░', dk);
        else if (tatter < 12) s.set(ox + 1 + i, oy + 9, '▄', dk);
      }

      // Scythe handle across back
      const scytheGlow = cycle(frame, 30, 4) < 2 ? red : t.accentDk;
      s.set(ox + 12, oy + 1, '│', t.frameLt);
      s.set(ox + 12, oy + 2, '│', t.frameLt);
      s.set(ox + 12, oy + 3, '│', t.frameLt);
      s.set(ox + 11, oy, '╮', scytheGlow);
      s.set(ox + 13, oy, '─', scytheGlow);
      s.set(ox + 13, oy - 1, '╯', scytheGlow);
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.phantom_reaper.theme;
      const blk = t.frame;
      const dk = t.frameDk;
      const red = t.accent;

      // Hood
      s.set(ox + 4, oy, '╱', dk); s.set(ox + 5, oy, '▄', blk);
      s.set(ox + 6, oy, '▄', blk); s.set(ox + 7, oy, '╲', dk);

      // Face area
      s.set(ox + 3, oy + 1, '▐', dk);
      s.set(ox + 4, oy + 1, '▓', blk); s.set(ox + 5, oy + 1, '▓', blk);
      s.set(ox + 6, oy + 1, '▓', blk); s.set(ox + 7, oy + 1, '▓', blk);
      s.set(ox + 8, oy + 1, '▌', dk);

      // Eyes — glowing red, blink occasionally
      const blink = eyeState(frame, 100);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff);
        s.set(ox + 6, oy + 1, '─', t.eyeOff);
      } else {
        const eyeC = coreGlow(frame, 16, t);
        s.set(ox + 5, oy + 1, '◆', eyeC);
        s.set(ox + 6, oy + 1, '◆', eyeC);
      }

      // Cloak body
      for (let row = 2; row <= 6; row++) {
        const halfW = Math.min(row + 1, 5);
        const cx = 6;
        s.set(ox + cx - halfW, oy + row, '▌', dk);
        for (let i = cx - halfW + 1; i < cx + halfW; i++) {
          const slashP = (frame + row * 5 + i * 3) % 40;
          if (slashP < 2) {
            s.set(ox + i, oy + row, '╱', red);
          } else {
            s.set(ox + i, oy + row, '▓', blk);
          }
        }
        s.set(ox + cx + halfW, oy + row, '▐', dk);
      }

      // Scythe at side
      s.set(ox + 1, oy + 2, '╭', red);
      s.set(ox + 0, oy + 2, '─', red);
      s.set(ox + 1, oy + 3, '│', t.frameLt);
      s.set(ox + 1, oy + 4, '│', t.frameLt);
      s.set(ox + 1, oy + 5, '│', t.frameLt);

      // Tattered bottom
      for (let i = 0; i < 10; i++) {
        const tatter = (frame + i * 4) % 20;
        if (tatter < 5) s.set(ox + 1 + i, oy + 7, '░', dk);
        else if (tatter < 10) s.set(ox + 1 + i, oy + 7, '▄', dk);
      }
    },
  },

  // ─────────────────────────────────────────────
  // 2. GOLD TITAN
  //    Massive black/gold armored colossus, gilded circuits, crown
  // ─────────────────────────────────────────────
  gold_titan: {
    theme: makeTheme({
      frame: rgb(25, 22, 18), frameDk: rgb(12, 10, 8), frameLt: rgb(50, 45, 35),
      accent: rgb(220, 185, 40), accentDk: rgb(160, 130, 20),
      core: rgb(245, 210, 60), coreDk: rgb(180, 150, 30), coreMed: rgb(212, 180, 45),
      vent: rgb(40, 35, 25), ventLt: rgb(55, 48, 35),
      eye: rgb(255, 220, 60), eyeOff: rgb(80, 65, 20),
      leg: rgb(30, 26, 20), shadow: rgb(10, 8, 5),
      emblem: rgb(200, 170, 35), data: rgb(120, 100, 15),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.gold_titan.theme;
      const blk = t.frame;
      const gold = t.accent;
      const goldG = coreGlow(frame, 18, t);
      const goldB = t.accentDk;

      // Crown spikes
      s.set(ox + 4, oy - 1, '▲', gold); s.set(ox + 6, oy - 1, '▲', goldG);
      s.set(ox + 8, oy - 1, '▲', gold); s.set(ox + 10, oy - 1, '▲', goldG);

      // Crown base / head
      s.set(ox + 3, oy, '╔', gold);
      for (let i = 4; i <= 10; i++) {
        s.set(ox + i, oy, (i % 2 === 0) ? '█' : '▓', (i % 2 === 0) ? blk : goldB);
      }
      s.set(ox + 11, oy, '╗', gold);

      // Head row 2
      s.set(ox + 3, oy + 1, '║', gold);
      for (let i = 4; i <= 10; i++) s.set(ox + i, oy + 1, '█', blk);
      s.set(ox + 11, oy + 1, '║', gold);

      // Massive torso
      for (let row = 2; row <= 7; row++) {
        s.set(ox + 1, oy + row, '▐', goldB);
        s.set(ox + 2, oy + row, '█', blk);
        // Gold circuit traces
        for (let i = 3; i <= 11; i++) {
          const isCircuit = ((row + i + Math.floor(frame / 8)) % 5) === 0;
          if (isCircuit) {
            const circCh = (row + i) % 2 === 0 ? '╪' : '╫';
            s.set(ox + i, oy + row, circCh, goldG);
          } else {
            s.set(ox + i, oy + row, '█', blk);
          }
        }
        s.set(ox + 12, oy + row, '█', blk);
        s.set(ox + 13, oy + row, '▌', goldB);
      }

      // Gold trim lines on sides
      for (let row = 2; row <= 7; row++) {
        const trimGlow = cycle(frame + row * 3, 24, 4) < 2 ? gold : goldB;
        s.set(ox + 0, oy + row, '║', trimGlow);
        s.set(ox + 14, oy + row, '║', trimGlow);
      }

      // Belt
      s.set(ox + 1, oy + 8, '╚', gold);
      for (let i = 2; i <= 12; i++) s.set(ox + i, oy + 8, '═', gold);
      s.set(ox + 13, oy + 8, '╝', gold);

      // Legs — thick pillars
      for (let row = 9; row <= 9; row++) {
        s.set(ox + 3, oy + row, '█', blk); s.set(ox + 4, oy + row, '█', blk);
        s.set(ox + 5, oy + row, '▌', goldB);
        s.set(ox + 9, oy + row, '▐', goldB);
        s.set(ox + 10, oy + row, '█', blk); s.set(ox + 11, oy + row, '█', blk);
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.gold_titan.theme;
      const blk = t.frame;
      const gold = t.accent;
      const goldG = coreGlow(frame, 18, t);

      // Crown
      s.set(ox + 3, oy - 1, '▲', gold); s.set(ox + 5, oy - 1, '▲', goldG);
      s.set(ox + 7, oy - 1, '▲', gold); s.set(ox + 9, oy - 1, '▲', goldG);

      // Head
      s.set(ox + 2, oy, '╔', gold);
      for (let i = 3; i <= 9; i++) s.set(ox + i, oy, '█', blk);
      s.set(ox + 10, oy, '╗', gold);

      // Face with eyes
      s.set(ox + 2, oy + 1, '║', gold);
      s.set(ox + 3, oy + 1, '█', blk);
      const blink = eyeState(frame, 120);
      if (blink === 'blink') {
        s.set(ox + 4, oy + 1, '─', t.eyeOff); s.set(ox + 8, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 4, oy + 1, '◆', goldG); s.set(ox + 8, oy + 1, '◆', goldG);
      }
      for (let i = 5; i <= 7; i++) s.set(ox + i, oy + 1, '█', blk);
      s.set(ox + 9, oy + 1, '█', blk);
      s.set(ox + 10, oy + 1, '║', gold);

      // Torso
      for (let row = 2; row <= 5; row++) {
        s.set(ox + 1, oy + row, '▐', t.accentDk);
        for (let i = 2; i <= 10; i++) {
          const isCircuit = ((row + i + Math.floor(frame / 10)) % 6) === 0;
          s.set(ox + i, oy + row, isCircuit ? '╬' : '█', isCircuit ? goldG : blk);
        }
        s.set(ox + 11, oy + row, '▌', t.accentDk);
      }

      // Emblem — gold diamond on chest
      s.set(ox + 6, oy + 3, '◆', goldG);

      // Belt
      for (let i = 1; i <= 11; i++) s.set(ox + i, oy + 6, '═', gold);

      // Legs
      s.set(ox + 3, oy + 7, '█', blk); s.set(ox + 4, oy + 7, '█', blk);
      s.set(ox + 8, oy + 7, '█', blk); s.set(ox + 9, oy + 7, '█', blk);
    },
  },

  // ─────────────────────────────────────────────
  // 3. VOID BLOB
  //    Amorphous dark-matter blob, edges shift/undulate
  // ─────────────────────────────────────────────
  void_blob: {
    theme: makeTheme({
      frame: rgb(25, 10, 40), frameDk: rgb(12, 5, 22), frameLt: rgb(50, 25, 70),
      accent: rgb(140, 60, 200), accentDk: rgb(90, 30, 140),
      core: rgb(170, 80, 240), coreDk: rgb(100, 40, 160), coreMed: rgb(135, 60, 200),
      vent: rgb(30, 12, 48), ventLt: rgb(45, 20, 65),
      eye: rgb(200, 120, 255), eyeOff: rgb(50, 20, 70),
      leg: rgb(20, 8, 35), shadow: rgb(5, 2, 10),
      emblem: rgb(160, 70, 220), data: rgb(80, 30, 120),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.void_blob.theme;
      const dk = t.frameDk;
      const body = t.frame;
      const edge = t.accent;
      const edgeG = coreGlow(frame, 22, t);

      // Amorphous blob — radius varies per angle via frame
      const cx = 7, cy = 5;
      for (let row = 0; row <= 9; row++) {
        for (let col = 0; col <= 13; col++) {
          const dx = col - cx;
          const dy = (row - cy) * 1.8; // stretch vertically to look blobby
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Undulating radius
          const angle = Math.atan2(dy, dx);
          const wobble = Math.sin(angle * 3 + frame * 0.15) * 1.2
                       + Math.sin(angle * 5 - frame * 0.1) * 0.8;
          const radius = 4.5 + wobble;

          if (dist < radius - 1.0) {
            // Inner void
            const voidShift = (frame + col * 3 + row * 7) % 35;
            if (voidShift < 2) {
              s.set(ox + col, oy + row, '·', t.coreDk);
            } else {
              s.set(ox + col, oy + row, '▓', dk);
            }
          } else if (dist < radius) {
            // Edge — shimmering
            const edgeCh = (frame + col + row) % 4;
            const chars = ['░', '▒', '▓', '▒'];
            s.set(ox + col, oy + row, chars[edgeCh], edgeG);
          }
        }
      }

      // Inner void core — pulsing
      const coreP = cycle(frame, 24, 4);
      const coreCh = ['◯', '◎', '●', '◎'][coreP];
      s.set(ox + cx, oy + cy, coreCh, t.core);
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.void_blob.theme;
      const dk = t.frameDk;
      const edgeG = coreGlow(frame, 22, t);

      const cx = 6, cy = 4;
      for (let row = 0; row <= 7; row++) {
        for (let col = 0; col <= 11; col++) {
          const dx = col - cx;
          const dy = (row - cy) * 1.6;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const wobble = Math.sin(angle * 3 + frame * 0.15) * 1.0
                       + Math.sin(angle * 5 - frame * 0.1) * 0.6;
          const radius = 3.8 + wobble;

          if (dist < radius - 1.0) {
            const voidShift = (frame + col * 5 + row * 3) % 30;
            if (voidShift < 2) {
              s.set(ox + col, oy + row, '·', t.coreDk);
            } else {
              s.set(ox + col, oy + row, '▓', dk);
            }
          } else if (dist < radius) {
            const chars = ['░', '▒', '▓', '▒'];
            s.set(ox + col, oy + row, chars[(frame + col + row) % 4], edgeG);
          }
        }
      }

      // Eyes — two sinister violet dots
      const blink = eyeState(frame, 90);
      if (blink !== 'blink') {
        s.set(ox + 4, oy + 3, '◆', t.eye);
        s.set(ox + 8, oy + 3, '◆', t.eye);
      } else {
        s.set(ox + 4, oy + 3, '─', t.eyeOff);
        s.set(ox + 8, oy + 3, '─', t.eyeOff);
      }

      // Mouth — shifting slit
      const mouthW = cycle(frame, 30, 4);
      for (let i = 0; i < mouthW + 1; i++) {
        s.set(ox + 5 + i, oy + 5, '▬', t.coreDk);
      }
    },
  },

  // ─────────────────────────────────────────────
  // 4. CITRUS CORE
  //    A literal orange with stick legs, leaf antenna, cute dot eyes
  // ─────────────────────────────────────────────
  citrus_core: {
    theme: makeTheme({
      frame: rgb(230, 140, 30), frameDk: rgb(180, 105, 15), frameLt: rgb(250, 175, 60),
      accent: rgb(80, 170, 50), accentDk: rgb(50, 120, 30),
      core: rgb(255, 200, 50), coreDk: rgb(200, 150, 20), coreMed: rgb(228, 175, 35),
      vent: rgb(190, 110, 20), ventLt: rgb(210, 130, 30),
      eye: rgb(40, 35, 30), eyeOff: rgb(140, 100, 40),
      leg: rgb(110, 75, 20), shadow: rgb(120, 70, 10),
      emblem: rgb(255, 220, 80), data: rgb(160, 110, 10),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.citrus_core.theme;
      const orange = t.frame;
      const orangeL = t.frameLt;
      const orangeD = t.frameDk;
      const green = t.accent;
      const greenD = t.accentDk;

      // Leaf antenna (on top, sways with frame)
      const leafSway = cycle(frame, 40, 4);
      const leafOff = leafSway < 2 ? 0 : (leafSway === 2 ? 1 : -1);
      s.set(ox + 7 + leafOff, oy, '♣', green);
      s.set(ox + 7, oy + 1, '│', greenD);

      // Round orange body (back view, rows 2-8)
      //     ╭────────╮
      //    │ ▓▓▓▓▓▓▓▓ │
      //   │ ▓▓▓▓▓▓▓▓▓▓ │
      //   │ ▓▓▓▓▓▓▓▓▓▓ │
      //    │ ▓▓▓▓▓▓▓▓ │
      //     ╰────────╯
      const rowWidths = [3, 5, 6, 6, 6, 5, 3];
      for (let r = 0; r < rowWidths.length; r++) {
        const w = rowWidths[r];
        const startX = 7 - Math.floor(w / 2);
        for (let i = 0; i < w * 2; i++) {
          const col = startX + i;
          if (col < 1 || col > 13) continue;
          // Orange peel texture
          const texPhase = (r + i + Math.floor(frame / 12)) % 6;
          let ch, color;
          if (texPhase === 0) { ch = '▒'; color = orangeL; }
          else if (texPhase === 3) { ch = '░'; color = orangeD; }
          else { ch = '█'; color = orange; }
          s.set(ox + col, oy + 2 + r, ch, color);
        }
      }

      // Stick legs
      const walkPhase = cycle(frame, 30, 4);
      const legL = walkPhase < 2 ? 0 : -1;
      const legR = walkPhase >= 2 ? 0 : 1;
      s.set(ox + 5 + legL, oy + 9, '/', t.leg);
      s.set(ox + 9 + legR, oy + 9, '\\', t.leg);
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.citrus_core.theme;
      const orange = t.frame;
      const orangeL = t.frameLt;
      const orangeD = t.frameDk;
      const green = t.accent;

      // Leaf
      const leafSway = cycle(frame, 40, 4);
      const leafOff = leafSway < 2 ? 0 : (leafSway === 2 ? 1 : -1);
      s.set(ox + 6 + leafOff, oy, '♣', green);
      s.set(ox + 6, oy + 1, '│', t.accentDk);

      // Round body (front)
      const rowWidths = [3, 4, 5, 5, 4, 3];
      for (let r = 0; r < rowWidths.length; r++) {
        const w = rowWidths[r];
        const startX = 6 - Math.floor(w / 2);
        for (let i = 0; i < w * 2; i++) {
          const col = startX + i;
          if (col < 0 || col > 11) continue;
          const texPhase = (r + i + Math.floor(frame / 12)) % 5;
          let ch, color;
          if (texPhase === 0) { ch = '▒'; color = orangeL; }
          else if (texPhase === 3) { ch = '░'; color = orangeD; }
          else { ch = '█'; color = orange; }
          s.set(ox + col, oy + 2 + r, ch, color);
        }
      }

      // Cute dot eyes
      const blink = eyeState(frame, 100);
      if (blink === 'blink') {
        s.set(ox + 4, oy + 4, '─', t.eyeOff);
        s.set(ox + 8, oy + 4, '─', t.eyeOff);
      } else {
        s.set(ox + 4, oy + 4, '●', t.eye);
        s.set(ox + 8, oy + 4, '●', t.eye);
      }

      // Cute smile
      s.set(ox + 5, oy + 5, '╰', t.eye);
      s.set(ox + 6, oy + 5, '─', t.eye);
      s.set(ox + 7, oy + 5, '╯', t.eye);

      // Stick legs
      const walkPhase = cycle(frame, 30, 4);
      const legL = walkPhase < 2 ? 0 : -1;
      const legR = walkPhase >= 2 ? 0 : 1;
      s.set(ox + 4 + legL, oy + 8 - 1, '/', t.leg);
      s.set(ox + 8 + legR, oy + 8 - 1, '\\', t.leg);
    },
  },

  // ─────────────────────────────────────────────
  // 5. DATA WRAITH
  //    Translucent glitching ghost, matrix-rain particles
  // ─────────────────────────────────────────────
  data_wraith: {
    theme: makeTheme({
      frame: rgb(15, 50, 25), frameDk: rgb(8, 30, 15), frameLt: rgb(30, 80, 40),
      accent: rgb(50, 200, 80), accentDk: rgb(30, 140, 50),
      core: rgb(80, 240, 110), coreDk: rgb(40, 160, 60), coreMed: rgb(60, 200, 85),
      vent: rgb(10, 40, 18), ventLt: rgb(20, 60, 30),
      eye: rgb(220, 255, 220), eyeOff: rgb(20, 60, 30),
      leg: rgb(12, 45, 22), shadow: rgb(5, 18, 8),
      emblem: rgb(60, 210, 90), data: rgb(25, 100, 40),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.data_wraith.theme;
      const body = t.frame;
      const green = t.accent;
      const greenG = coreGlow(frame, 16, t);
      const matrixChars = '01アイウエオカキクケコ';

      // Ghost silhouette — translucent, with static glitches
      //   ╭───╮
      //  ┃░░░░░┃
      //  ┃░░░░░┃
      //  ┃░░░░░░┃
      //  ┃░░░░░░░┃
      //  ╰┤╰┤╰┤╰┤
      // Top
      s.set(ox + 5, oy, '╭', t.frameLt);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy, '─', t.frameLt);
      s.set(ox + 9, oy, '╮', t.frameLt);

      // Body rows
      const bodyWidths = [5, 6, 7, 8, 8, 7, 6];
      for (let r = 0; r < bodyWidths.length; r++) {
        const w = bodyWidths[r];
        const startX = 7 - Math.floor(w / 2);
        s.set(ox + startX, oy + 1 + r, '┃', t.frameLt);
        for (let i = 1; i < w; i++) {
          const col = startX + i;
          // Matrix rain effect
          const rainPhase = (frame * 2 + col * 7 + r * 3) % 20;
          if (rainPhase < 2) {
            const mch = matrixChars[(frame + col + r) % matrixChars.length];
            s.set(ox + col, oy + 1 + r, mch, greenG);
          } else if (rainPhase < 5) {
            s.set(ox + col, oy + 1 + r, '░', t.frameDk);
          } else {
            // Glitch — occasional horizontal distortion
            const glitch = (frame + r * 13) % 60;
            if (glitch < 2) {
              s.set(ox + col, oy + 1 + r, '▒', green);
            } else {
              s.set(ox + col, oy + 1 + r, '░', body);
            }
          }
        }
        s.set(ox + startX + w, oy + 1 + r, '┃', t.frameLt);
      }

      // Wavy bottom edge
      for (let i = 0; i < 6; i++) {
        const wave = (frame + i * 5) % 4;
        const ch = wave < 2 ? '╰' : '┤';
        s.set(ox + 4 + i, oy + 8, ch, t.frameLt);
      }

      // Falling matrix particles below
      for (let px = 3; px <= 11; px += 2) {
        const py = (frame + px * 3) % 12;
        if (py < 3) {
          const mch = matrixChars[(frame + px) % matrixChars.length];
          s.set(ox + px, oy + 8 + py, mch, t.accentDk);
        }
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.data_wraith.theme;
      const body = t.frame;
      const green = t.accent;
      const greenG = coreGlow(frame, 16, t);
      const matrixChars = '01アイウエオカキクケコ';

      // Smaller ghost front
      s.set(ox + 4, oy, '╭', t.frameLt);
      for (let i = 5; i <= 7; i++) s.set(ox + i, oy, '─', t.frameLt);
      s.set(ox + 8, oy, '╮', t.frameLt);

      const bodyWidths = [5, 6, 6, 6, 5];
      for (let r = 0; r < bodyWidths.length; r++) {
        const w = bodyWidths[r];
        const startX = 6 - Math.floor(w / 2);
        s.set(ox + startX, oy + 1 + r, '┃', t.frameLt);
        for (let i = 1; i < w; i++) {
          const col = startX + i;
          const rainPhase = (frame * 2 + col * 5 + r * 3) % 18;
          if (rainPhase < 2) {
            const mch = matrixChars[(frame + col + r) % matrixChars.length];
            s.set(ox + col, oy + 1 + r, mch, greenG);
          } else {
            const glitch = (frame + r * 11) % 40;
            s.set(ox + col, oy + 1 + r, glitch < 2 ? '▒' : '░', glitch < 2 ? green : body);
          }
        }
        s.set(ox + startX + w, oy + 1 + r, '┃', t.frameLt);
      }

      // Eyes — hollow white within the static
      const blink = eyeState(frame, 80);
      if (blink !== 'blink') {
        s.set(ox + 4, oy + 2, '◎', t.eye);
        s.set(ox + 8, oy + 2, '◎', t.eye);
      } else {
        s.set(ox + 4, oy + 2, '─', t.eyeOff);
        s.set(ox + 8, oy + 2, '─', t.eyeOff);
      }

      // Wavy bottom
      for (let i = 0; i < 5; i++) {
        const wave = (frame + i * 4) % 4;
        s.set(ox + 3 + i, oy + 6, wave < 2 ? '╰' : '┤', t.frameLt);
      }

      // Matrix rain below
      for (let px = 3; px <= 9; px += 2) {
        const py = (frame + px * 5) % 8;
        if (py < 2) {
          const mch = matrixChars[(frame + px) % matrixChars.length];
          s.set(ox + px, oy + 7 + py, mch, t.accentDk);
        }
      }
    },
  },

  // ─────────────────────────────────────────────
  // 6. ANCIENT SAGE
  //    Small yoda-like elder, big ears, walking stick, hunched
  // ─────────────────────────────────────────────
  ancient_sage: {
    theme: makeTheme({
      frame: rgb(95, 75, 50), frameDk: rgb(60, 48, 30), frameLt: rgb(130, 105, 75),
      accent: rgb(85, 140, 70), accentDk: rgb(55, 100, 45),
      core: rgb(220, 195, 100), coreDk: rgb(160, 140, 60), coreMed: rgb(190, 168, 80),
      vent: rgb(70, 55, 38), ventLt: rgb(85, 68, 48),
      eye: rgb(240, 210, 80), eyeOff: rgb(80, 65, 35),
      leg: rgb(75, 60, 40), shadow: rgb(35, 28, 18),
      emblem: rgb(110, 160, 85), data: rgb(55, 80, 40),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.ancient_sage.theme;
      const skin = t.accent;
      const robe = t.frame;
      const robeDk = t.frameDk;
      const stick = t.frameLt;

      // Big pointy ears (back view shows them sticking out)
      s.set(ox + 3, oy + 1, '╲', skin);
      s.set(ox + 2, oy, '╲', skin);
      s.set(ox + 11, oy + 1, '╱', skin);
      s.set(ox + 12, oy, '╱', skin);

      // Small round head (back, showing sparse hair)
      for (let i = 5; i <= 9; i++) s.set(ox + i, oy, '▄', skin);
      s.set(ox + 4, oy + 1, '▐', skin);
      for (let i = 5; i <= 9; i++) {
        const hairP = (i + frame) % 8;
        s.set(ox + i, oy + 1, hairP < 2 ? '~' : '█', hairP < 2 ? t.frameLt : skin);
      }
      s.set(ox + 10, oy + 1, '▌', skin);

      // Hunched robed body — smaller, rounded
      s.set(ox + 5, oy + 2, '╭', robe);
      for (let i = 6; i <= 9; i++) s.set(ox + i, oy + 2, '▄', robe);
      s.set(ox + 10, oy + 2, '╮', robe);

      for (let row = 3; row <= 6; row++) {
        const w = row <= 4 ? 6 : 5;
        const startX = 7 - Math.floor(w / 2);
        s.set(ox + startX, oy + row, '▌', robeDk);
        for (let i = 1; i < w; i++) {
          const fold = (row + i + Math.floor(frame / 15)) % 4;
          s.set(ox + startX + i, oy + row, fold === 0 ? '░' : '▓', fold === 0 ? robeDk : robe);
        }
        s.set(ox + startX + w, oy + row, '▐', robeDk);
      }

      // Robe bottom
      s.set(ox + 5, oy + 7, '╰', robe);
      for (let i = 6; i <= 9; i++) s.set(ox + i, oy + 7, '─', robe);
      s.set(ox + 10, oy + 7, '╯', robe);

      // Tiny shuffling feet
      const walk = cycle(frame, 40, 4);
      s.set(ox + 6 + (walk < 2 ? 0 : -1), oy + 8, '▄', t.leg);
      s.set(ox + 9 + (walk >= 2 ? 0 : 1), oy + 8, '▄', t.leg);

      // Walking stick (held to side, back)
      s.set(ox + 3, oy + 2, '/', stick);
      s.set(ox + 3, oy + 3, '|', stick);
      s.set(ox + 3, oy + 4, '|', stick);
      s.set(ox + 3, oy + 5, '|', stick);
      s.set(ox + 3, oy + 6, '|', stick);
      s.set(ox + 3, oy + 7, '|', stick);
      s.set(ox + 3, oy + 8, '.', stick);

      // Wisdom glow from top of staff
      const glowP = cycle(frame, 24, 4);
      const glowCh = ['·', '✧', '*', '✧'][glowP];
      s.set(ox + 3, oy + 1, glowCh, coreGlow(frame, 20, t));
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.ancient_sage.theme;
      const skin = t.accent;
      const robe = t.frame;
      const robeDk = t.frameDk;
      const stick = t.frameLt;

      // Big ears
      s.set(ox + 1, oy + 1, '╼', skin);
      s.set(ox + 0, oy, '▸', skin);
      s.set(ox + 10, oy + 1, '╾', skin);
      s.set(ox + 11, oy, '◂', skin);

      // Head
      s.set(ox + 3, oy, '▄', skin);
      for (let i = 4; i <= 7; i++) s.set(ox + i, oy, '▄', skin);
      s.set(ox + 8, oy, '▄', skin);
      s.set(ox + 2, oy + 1, '▐', skin);
      for (let i = 3; i <= 8; i++) s.set(ox + i, oy + 1, '█', skin);
      s.set(ox + 9, oy + 1, '▌', skin);

      // Wise eyes — glow warm gold
      const blink = eyeState(frame, 110);
      if (blink === 'blink') {
        s.set(ox + 4, oy + 1, '─', t.eyeOff);
        s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        const eyeG = coreGlow(frame, 20, t);
        s.set(ox + 4, oy + 1, '●', eyeG);
        s.set(ox + 7, oy + 1, '●', eyeG);
      }

      // Robed body (hunched, small)
      s.set(ox + 3, oy + 2, '╭', robe);
      for (let i = 4; i <= 7; i++) s.set(ox + i, oy + 2, '▄', robe);
      s.set(ox + 8, oy + 2, '╮', robe);

      for (let row = 3; row <= 5; row++) {
        s.set(ox + 3, oy + row, '▌', robeDk);
        for (let i = 4; i <= 7; i++) {
          const fold = (row + i + Math.floor(frame / 12)) % 3;
          s.set(ox + i, oy + row, fold === 0 ? '░' : '▓', fold === 0 ? robeDk : robe);
        }
        s.set(ox + 8, oy + row, '▐', robeDk);
      }

      s.set(ox + 3, oy + 6, '╰', robe);
      for (let i = 4; i <= 7; i++) s.set(ox + i, oy + 6, '─', robe);
      s.set(ox + 8, oy + 6, '╯', robe);

      // Feet
      const walk = cycle(frame, 40, 4);
      s.set(ox + 4 + (walk < 2 ? 0 : -1), oy + 7, '▄', t.leg);
      s.set(ox + 7 + (walk >= 2 ? 0 : 1), oy + 7, '▄', t.leg);

      // Walking stick
      s.set(ox + 1, oy + 2, '\\', stick);
      s.set(ox + 1, oy + 3, ' ', stick); s.set(ox + 1, oy + 3, '|', stick);
      s.set(ox + 1, oy + 4, '|', stick);
      s.set(ox + 1, oy + 5, '|', stick);
      s.set(ox + 1, oy + 6, '|', stick);
      s.set(ox + 1, oy + 7, '.', stick);

      // Staff glow
      const glowP = cycle(frame, 24, 4);
      const glowCh = ['·', '✧', '*', '✧'][glowP];
      s.set(ox + 1, oy + 1, glowCh, coreGlow(frame, 20, t));
    },
  },

  // ─────────────────────────────────────────────
  // 7. CHROME VALKYRIE
  //    Sleek silver armor, glowing wing outlines, winged helmet
  // ─────────────────────────────────────────────
  chrome_valkyrie: {
    theme: makeTheme({
      frame: rgb(180, 185, 195), frameDk: rgb(120, 125, 140), frameLt: rgb(220, 225, 235),
      accent: rgb(160, 210, 245), accentDk: rgb(110, 165, 200),
      core: rgb(230, 240, 255), coreDk: rgb(170, 195, 225), coreMed: rgb(200, 218, 240),
      vent: rgb(140, 145, 158), ventLt: rgb(160, 165, 178),
      eye: rgb(160, 220, 255), eyeOff: rgb(100, 110, 130),
      leg: rgb(150, 155, 170), shadow: rgb(80, 82, 92),
      emblem: rgb(200, 230, 255), data: rgb(120, 160, 195),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.chrome_valkyrie.theme;
      const silver = t.frame;
      const silverL = t.frameLt;
      const silverD = t.frameDk;
      const wingGlow = coreGlow(frame, 20, t);
      const wingBright = t.core;

      // Wing outlines (back view — spread wide)
      // Left wing
      const wPulse = cycle(frame, 30, 4);
      const wC = wPulse < 2 ? wingGlow : wingBright;
      s.set(ox + 0, oy + 1, '╱', wC); s.set(ox - 1, oy, '╱', wC);
      s.set(ox - 2, oy - 1, '─', wC); s.set(ox - 3, oy - 1, '╲', wC);
      s.set(ox + 0, oy + 2, '│', wC); s.set(ox - 1, oy + 1, '╱', wC);
      s.set(ox - 2, oy, '─', wC);
      // Right wing
      s.set(ox + 13, oy + 1, '╲', wC); s.set(ox + 14, oy, '╲', wC);
      s.set(ox + 15, oy - 1, '─', wC); s.set(ox + 16, oy - 1, '╱', wC);
      s.set(ox + 13, oy + 2, '│', wC); s.set(ox + 14, oy + 1, '╲', wC);
      s.set(ox + 15, oy, '─', wC);

      // Winged helmet
      s.set(ox + 4, oy, '╱', silverL); s.set(ox + 5, oy, '▄', silver);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy, '█', silver);
      s.set(ox + 9, oy, '▄', silver); s.set(ox + 10, oy, '╲', silverL);
      // Helmet wings
      s.set(ox + 3, oy - 1, '▸', wingGlow); s.set(ox + 11, oy - 1, '◂', wingGlow);

      // Head
      s.set(ox + 5, oy + 1, '█', silver);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy + 1, '▓', silverD);
      s.set(ox + 9, oy + 1, '█', silver);

      // Sleek torso
      for (let row = 2; row <= 6; row++) {
        const w = row <= 3 ? 8 : row <= 5 ? 7 : 6;
        const startX = 7 - Math.floor(w / 2);
        s.set(ox + startX, oy + row, '▐', silverL);
        for (let i = 1; i < w; i++) {
          const reflect = (row + i + Math.floor(frame / 6)) % 8;
          const ch = reflect === 0 ? '░' : reflect === 4 ? '▒' : '█';
          const col = reflect === 0 ? silverL : reflect === 4 ? silverL : silver;
          s.set(ox + startX + i, oy + row, ch, col);
        }
        s.set(ox + startX + w, oy + row, '▌', silverD);
      }

      // Core glow in center of back
      s.set(ox + 7, oy + 4, '◈', wingGlow);

      // Armored skirt
      s.set(ox + 4, oy + 7, '╰', silverD);
      for (let i = 5; i <= 9; i++) s.set(ox + i, oy + 7, '═', silver);
      s.set(ox + 10, oy + 7, '╯', silverD);

      // Legs
      s.set(ox + 5, oy + 8, '█', silver); s.set(ox + 6, oy + 8, '▌', silverD);
      s.set(ox + 8, oy + 8, '▐', silverD); s.set(ox + 9, oy + 8, '█', silver);
      s.set(ox + 5, oy + 9, '▀', silverD); s.set(ox + 9, oy + 9, '▀', silverD);
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.chrome_valkyrie.theme;
      const silver = t.frame;
      const silverL = t.frameLt;
      const silverD = t.frameDk;
      const wingGlow = coreGlow(frame, 20, t);

      // Winged helmet
      s.set(ox + 2, oy - 1, '▸', wingGlow); s.set(ox + 10, oy - 1, '◂', wingGlow);
      s.set(ox + 3, oy, '╱', silverL);
      for (let i = 4; i <= 8; i++) s.set(ox + i, oy, '█', silver);
      s.set(ox + 9, oy, '╲', silverL);

      // Face visor
      s.set(ox + 3, oy + 1, '▐', silverL);
      s.set(ox + 4, oy + 1, '█', silverD);
      // Eyes
      const blink = eyeState(frame, 100);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff); s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 5, oy + 1, '◆', t.eye); s.set(ox + 7, oy + 1, '◆', t.eye);
      }
      s.set(ox + 6, oy + 1, '▓', silverD);
      s.set(ox + 8, oy + 1, '█', silverD);
      s.set(ox + 9, oy + 1, '▌', silverL);

      // Torso
      for (let row = 2; row <= 5; row++) {
        const w = row <= 3 ? 7 : 6;
        const startX = 6 - Math.floor(w / 2);
        s.set(ox + startX, oy + row, '▐', silverL);
        for (let i = 1; i < w; i++) {
          const reflect = (row + i + Math.floor(frame / 6)) % 7;
          s.set(ox + startX + i, oy + row, reflect === 0 ? '░' : '█', reflect === 0 ? silverL : silver);
        }
        s.set(ox + startX + w, oy + row, '▌', silverD);
      }

      // Chest emblem
      s.set(ox + 6, oy + 3, '◈', wingGlow);

      // Skirt
      for (let i = 3; i <= 9; i++) s.set(ox + i, oy + 6, '═', silver);

      // Legs
      s.set(ox + 4, oy + 7, '█', silver); s.set(ox + 5, oy + 7, '▌', silverD);
      s.set(ox + 7, oy + 7, '▐', silverD); s.set(ox + 8, oy + 7, '█', silver);
    },
  },

  // ─────────────────────────────────────────────
  // 8. NEON RONIN
  //    Samurai silhouette in hot pink and electric cyan
  // ─────────────────────────────────────────────
  neon_ronin: {
    theme: makeTheme({
      frame: rgb(40, 20, 55), frameDk: rgb(22, 10, 35), frameLt: rgb(60, 35, 80),
      accent: rgb(255, 50, 130), accentDk: rgb(180, 30, 90),
      core: rgb(50, 220, 240), coreDk: rgb(25, 150, 175), coreMed: rgb(38, 185, 208),
      vent: rgb(35, 18, 48), ventLt: rgb(50, 28, 65),
      eye: rgb(50, 230, 250), eyeOff: rgb(30, 60, 70),
      leg: rgb(35, 18, 50), shadow: rgb(15, 8, 22),
      emblem: rgb(255, 80, 150), data: rgb(30, 130, 150),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.neon_ronin.theme;
      const body = t.frame;
      const pink = t.accent;
      const pinkD = t.accentDk;
      const cyan = t.core;
      const cyanG = coreGlow(frame, 18, t);

      // Kabuto helmet (back)
      s.set(ox + 5, oy, '▄', body); s.set(ox + 6, oy, '█', body);
      s.set(ox + 7, oy, '█', body); s.set(ox + 8, oy, '█', body);
      s.set(ox + 9, oy, '▄', body);
      // Helmet crescent
      s.set(ox + 4, oy - 1, '╲', pink); s.set(ox + 7, oy - 1, '▀', pink);
      s.set(ox + 10, oy - 1, '╱', pink);

      // Neck
      s.set(ox + 6, oy + 1, '█', body); s.set(ox + 7, oy + 1, '█', body);
      s.set(ox + 8, oy + 1, '█', body);

      // Shoulders with neon trim
      s.set(ox + 3, oy + 2, '╔', pink);
      s.set(ox + 4, oy + 2, '═', pink); s.set(ox + 5, oy + 2, '█', body);
      s.set(ox + 6, oy + 2, '█', body); s.set(ox + 7, oy + 2, '█', body);
      s.set(ox + 8, oy + 2, '█', body); s.set(ox + 9, oy + 2, '█', body);
      s.set(ox + 10, oy + 2, '═', pink); s.set(ox + 11, oy + 2, '╗', pink);

      // Torso with pink edge highlights
      for (let row = 3; row <= 6; row++) {
        s.set(ox + 4, oy + row, '▐', pinkD);
        for (let i = 5; i <= 9; i++) {
          s.set(ox + i, oy + row, '█', body);
        }
        s.set(ox + 10, oy + row, '▌', pinkD);
        // Neon circuit line down center
        const neonP = (frame + row * 5) % 12;
        if (neonP < 4) s.set(ox + 7, oy + row, '│', cyanG);
      }

      // Katana on back — diagonal
      const katGlow = cycle(frame, 20, 4) < 2 ? cyan : t.coreDk;
      s.set(ox + 11, oy, '╱', katGlow);
      s.set(ox + 12, oy + 1, '╱', katGlow);
      s.set(ox + 12, oy + 2, '│', t.frameLt);
      s.set(ox + 12, oy + 3, '│', t.frameLt);
      s.set(ox + 12, oy + 4, '│', t.frameLt);
      s.set(ox + 12, oy + 5, '│', t.frameLt);
      s.set(ox + 12, oy + 6, '│', t.frameLt);

      // Waist sash
      s.set(ox + 4, oy + 7, '╰', pink);
      for (let i = 5; i <= 9; i++) s.set(ox + i, oy + 7, '─', pink);
      s.set(ox + 10, oy + 7, '╯', pink);
      s.set(ox + 11, oy + 7, '╲', pinkD); // sash tail

      // Legs
      s.set(ox + 5, oy + 8, '█', body); s.set(ox + 6, oy + 8, '▌', pinkD);
      s.set(ox + 8, oy + 8, '▐', pinkD); s.set(ox + 9, oy + 8, '█', body);
      s.set(ox + 5, oy + 9, '▀', body); s.set(ox + 9, oy + 9, '▀', body);
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.neon_ronin.theme;
      const body = t.frame;
      const pink = t.accent;
      const pinkD = t.accentDk;
      const cyan = t.core;
      const cyanG = coreGlow(frame, 18, t);

      // Kabuto helmet with crescent
      s.set(ox + 3, oy - 1, '╲', pink); s.set(ox + 6, oy - 1, '▀', pink);
      s.set(ox + 9, oy - 1, '╱', pink);
      s.set(ox + 4, oy, '▄', body);
      for (let i = 5; i <= 7; i++) s.set(ox + i, oy, '█', body);
      s.set(ox + 8, oy, '▄', body);

      // Face
      s.set(ox + 4, oy + 1, '▐', body);
      s.set(ox + 5, oy + 1, '█', body);
      // Eyes — cyan glow
      const blink = eyeState(frame, 90);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff); s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 5, oy + 1, '◆', cyanG); s.set(ox + 7, oy + 1, '◆', cyanG);
      }
      s.set(ox + 6, oy + 1, '▓', body);
      s.set(ox + 8, oy + 1, '▌', body);

      // Shoulders
      s.set(ox + 2, oy + 2, '╔', pink); s.set(ox + 3, oy + 2, '═', pink);
      for (let i = 4; i <= 8; i++) s.set(ox + i, oy + 2, '█', body);
      s.set(ox + 9, oy + 2, '═', pink); s.set(ox + 10, oy + 2, '╗', pink);

      // Torso
      for (let row = 3; row <= 5; row++) {
        s.set(ox + 3, oy + row, '▐', pinkD);
        for (let i = 4; i <= 8; i++) s.set(ox + i, oy + row, '█', body);
        s.set(ox + 9, oy + row, '▌', pinkD);
        // Neon line
        const neonP = (frame + row * 4) % 10;
        if (neonP < 3) s.set(ox + 6, oy + row, '│', cyanG);
      }

      // Katana at side
      s.set(ox + 1, oy + 2, '│', cyan);
      s.set(ox + 1, oy + 3, '│', cyan);
      s.set(ox + 1, oy + 4, '│', cyan);
      s.set(ox + 1, oy + 5, '▪', cyan);

      // Sash
      s.set(ox + 3, oy + 6, '╰', pink);
      for (let i = 4; i <= 8; i++) s.set(ox + i, oy + 6, '─', pink);
      s.set(ox + 9, oy + 6, '╯', pink);

      // Legs
      s.set(ox + 4, oy + 7, '█', body); s.set(ox + 5, oy + 7, '▌', pinkD);
      s.set(ox + 7, oy + 7, '▐', pinkD); s.set(ox + 8, oy + 7, '█', body);
    },
  },

  // ─────────────────────────────────────────────
  // 9. ICE MONARCH
  //    Frozen crystalline entity, angular geometric, snowflakes
  // ─────────────────────────────────────────────
  ice_monarch: {
    theme: makeTheme({
      frame: rgb(140, 195, 230), frameDk: rgb(90, 145, 185), frameLt: rgb(200, 230, 250),
      accent: rgb(220, 240, 255), accentDk: rgb(160, 200, 230),
      core: rgb(240, 250, 255), coreDk: rgb(180, 215, 240), coreMed: rgb(210, 232, 248),
      vent: rgb(110, 160, 200), ventLt: rgb(130, 180, 215),
      eye: rgb(180, 230, 255), eyeOff: rgb(90, 130, 160),
      leg: rgb(120, 170, 210), shadow: rgb(50, 80, 110),
      emblem: rgb(230, 245, 255), data: rgb(100, 150, 190),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.ice_monarch.theme;
      const ice = t.frame;
      const iceL = t.frameLt;
      const iceD = t.frameDk;
      const frost = t.accent;
      const frostG = coreGlow(frame, 24, t);

      // Crystal crown — angular spikes
      s.set(ox + 4, oy - 1, '△', frost); s.set(ox + 7, oy - 1, '▲', frostG);
      s.set(ox + 10, oy - 1, '△', frost);

      // Head — faceted crystal
      s.set(ox + 4, oy, '╱', iceL);
      for (let i = 5; i <= 9; i++) {
        const facet = (i + Math.floor(frame / 8)) % 3;
        s.set(ox + i, oy, facet === 0 ? '◇' : '█', facet === 0 ? frost : ice);
      }
      s.set(ox + 10, oy, '╲', iceL);
      s.set(ox + 4, oy + 1, '▐', ice);
      for (let i = 5; i <= 9; i++) s.set(ox + i, oy + 1, '█', ice);
      s.set(ox + 10, oy + 1, '▌', ice);

      // Angular crystalline torso
      for (let row = 2; row <= 7; row++) {
        const halfW = row <= 3 ? 5 : row <= 5 ? 6 : row <= 6 ? 5 : 4;
        const startX = 7 - halfW;
        const endX = 7 + halfW;
        s.set(ox + startX, oy + row, '◁', iceD);
        for (let i = startX + 1; i < endX; i++) {
          // Faceted crystal pattern
          const facet = (row * 3 + i * 2 + Math.floor(frame / 10)) % 7;
          let ch, color;
          if (facet === 0) { ch = '◇'; color = frost; }
          else if (facet === 3) { ch = '░'; color = iceL; }
          else if (facet === 5) { ch = '▒'; color = iceD; }
          else { ch = '█'; color = ice; }
          s.set(ox + i, oy + row, ch, color);
        }
        s.set(ox + endX, oy + row, '▷', iceD);
      }

      // Ice core in center
      s.set(ox + 7, oy + 4, '❖', frostG);

      // Crystal legs
      s.set(ox + 5, oy + 8, '╱', iceD); s.set(ox + 6, oy + 8, '▼', ice);
      s.set(ox + 8, oy + 8, '▼', ice); s.set(ox + 9, oy + 8, '╲', iceD);

      // Snowflake particles drifting
      const snowChars = ['·', '✧', '*', '·', '°'];
      for (let px = 0; px <= 13; px += 3) {
        const py = (frame + px * 7) % 14;
        if (py < 10) {
          const sch = snowChars[(frame + px) % snowChars.length];
          s.set(ox + px, oy + py, sch, t.accentDk);
        }
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.ice_monarch.theme;
      const ice = t.frame;
      const iceL = t.frameLt;
      const iceD = t.frameDk;
      const frost = t.accent;
      const frostG = coreGlow(frame, 24, t);

      // Crown
      s.set(ox + 3, oy - 1, '△', frost); s.set(ox + 6, oy - 1, '▲', frostG);
      s.set(ox + 9, oy - 1, '△', frost);

      // Head
      s.set(ox + 3, oy, '╱', iceL);
      for (let i = 4; i <= 8; i++) {
        const facet = (i + Math.floor(frame / 8)) % 3;
        s.set(ox + i, oy, facet === 0 ? '◇' : '█', facet === 0 ? frost : ice);
      }
      s.set(ox + 9, oy, '╲', iceL);

      // Face
      s.set(ox + 3, oy + 1, '▐', ice);
      s.set(ox + 4, oy + 1, '█', ice);
      const blink = eyeState(frame, 110);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff); s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 5, oy + 1, '◆', frostG); s.set(ox + 7, oy + 1, '◆', frostG);
      }
      s.set(ox + 6, oy + 1, '█', ice); s.set(ox + 8, oy + 1, '█', ice);
      s.set(ox + 9, oy + 1, '▌', ice);

      // Crystalline body
      for (let row = 2; row <= 5; row++) {
        const halfW = row <= 3 ? 4 : row <= 4 ? 5 : 4;
        const startX = 6 - halfW;
        const endX = 6 + halfW;
        s.set(ox + startX, oy + row, '◁', iceD);
        for (let i = startX + 1; i < endX; i++) {
          const facet = (row * 3 + i * 2 + Math.floor(frame / 10)) % 6;
          let ch, color;
          if (facet === 0) { ch = '◇'; color = frost; }
          else if (facet === 3) { ch = '░'; color = iceL; }
          else { ch = '█'; color = ice; }
          s.set(ox + i, oy + row, ch, color);
        }
        s.set(ox + endX, oy + row, '▷', iceD);
      }

      // Chest crystal
      s.set(ox + 6, oy + 3, '❖', frostG);

      // Legs
      s.set(ox + 4, oy + 6, '╱', iceD); s.set(ox + 5, oy + 6, '▼', ice);
      s.set(ox + 7, oy + 6, '▼', ice); s.set(ox + 8, oy + 6, '╲', iceD);

      // Snowflake particles
      const snowChars = ['·', '✧', '*', '°'];
      for (let px = 1; px <= 11; px += 3) {
        const py = (frame + px * 5) % 10;
        if (py < 8) {
          s.set(ox + px, oy + py, snowChars[(frame + px) % snowChars.length], t.accentDk);
        }
      }
    },
  },

  // ─────────────────────────────────────────────
  // 10. SOLAR DRAKE
  //     Dragon silhouette radiating heat, white-hot core, wings spread
  // ─────────────────────────────────────────────
  solar_drake: {
    theme: makeTheme({
      frame: rgb(200, 80, 20), frameDk: rgb(140, 45, 10), frameLt: rgb(240, 130, 50),
      accent: rgb(255, 200, 60), accentDk: rgb(200, 150, 30),
      core: rgb(255, 245, 220), coreDk: rgb(240, 200, 120), coreMed: rgb(248, 222, 170),
      vent: rgb(120, 40, 8), ventLt: rgb(160, 60, 15),
      eye: rgb(255, 255, 200), eyeOff: rgb(120, 80, 30),
      leg: rgb(150, 55, 12), shadow: rgb(60, 20, 5),
      emblem: rgb(255, 220, 100), data: rgb(180, 100, 20),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.solar_drake.theme;
      const body = t.frame;
      const bodyD = t.frameDk;
      const bodyL = t.frameLt;
      const hot = t.core;
      const hotG = coreGlow(frame, 16, t);
      const orange = t.accent;

      // Wings spread wide (back view)
      const wPulse = cycle(frame, 24, 4);
      const wC = wPulse < 2 ? bodyL : orange;
      // Left wing
      s.set(ox + 0, oy + 2, '╱', wC); s.set(ox - 1, oy + 1, '╱', wC);
      s.set(ox - 2, oy, '─', wC); s.set(ox - 3, oy, '╲', bodyL);
      s.set(ox + 0, oy + 3, '│', bodyD);
      s.set(ox - 1, oy + 2, '╱', bodyD); s.set(ox - 2, oy + 1, '─', bodyD);
      // Right wing
      s.set(ox + 13, oy + 2, '╲', wC); s.set(ox + 14, oy + 1, '╲', wC);
      s.set(ox + 15, oy, '─', wC); s.set(ox + 16, oy, '╱', bodyL);
      s.set(ox + 13, oy + 3, '│', bodyD);
      s.set(ox + 14, oy + 2, '╲', bodyD); s.set(ox + 15, oy + 1, '─', bodyD);

      // Horned head
      s.set(ox + 4, oy - 1, '╱', bodyD); s.set(ox + 10, oy - 1, '╲', bodyD);
      s.set(ox + 5, oy, '▄', body);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy, '█', body);
      s.set(ox + 9, oy, '▄', body);

      // Neck
      s.set(ox + 6, oy + 1, '█', body); s.set(ox + 7, oy + 1, '█', body);
      s.set(ox + 8, oy + 1, '█', body);

      // Dragon body — muscular, tapering
      for (let row = 2; row <= 6; row++) {
        const halfW = row <= 3 ? 5 : row <= 5 ? 4 : 3;
        const startX = 7 - halfW;
        s.set(ox + startX, oy + row, '▐', bodyD);
        for (let i = startX + 1; i < 7 + halfW; i++) {
          // Heat shimmer effect
          const heat = (frame + row * 4 + i * 3) % 15;
          if (heat < 2) {
            s.set(ox + i, oy + row, '░', hotG);
          } else if (heat < 4) {
            s.set(ox + i, oy + row, '▒', bodyL);
          } else {
            s.set(ox + i, oy + row, '█', body);
          }
        }
        s.set(ox + 7 + halfW, oy + row, '▌', bodyD);
      }

      // White-hot core
      s.set(ox + 7, oy + 4, '◉', hotG);

      // Tail (curving down-right)
      s.set(ox + 10, oy + 6, '╲', bodyD);
      s.set(ox + 11, oy + 7, '╲', bodyD);
      s.set(ox + 12, oy + 8, '─', bodyD);
      s.set(ox + 13, oy + 8, '▸', orange);

      // Legs — sturdy claws
      s.set(ox + 5, oy + 7, '█', body); s.set(ox + 5, oy + 8, '▼', bodyD);
      s.set(ox + 9, oy + 7, '█', body); s.set(ox + 9, oy + 8, '▼', bodyD);

      // Heat distortion particles above
      for (let px = 3; px <= 11; px += 2) {
        const py = (frame + px * 4) % 8;
        if (py < 3) {
          const hch = py === 0 ? '°' : '·';
          s.set(ox + px, oy - 2 + py, hch, t.accentDk);
        }
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.solar_drake.theme;
      const body = t.frame;
      const bodyD = t.frameDk;
      const bodyL = t.frameLt;
      const hot = t.core;
      const hotG = coreGlow(frame, 16, t);
      const orange = t.accent;

      // Horns
      s.set(ox + 2, oy - 1, '╱', bodyD); s.set(ox + 10, oy - 1, '╲', bodyD);

      // Head
      s.set(ox + 3, oy, '▄', body);
      for (let i = 4; i <= 8; i++) s.set(ox + i, oy, '█', body);
      s.set(ox + 9, oy, '▄', body);

      // Face — fierce eyes
      s.set(ox + 3, oy + 1, '▐', body);
      s.set(ox + 4, oy + 1, '█', body);
      const blink = eyeState(frame, 80);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff); s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 5, oy + 1, '◆', hotG); s.set(ox + 7, oy + 1, '◆', hotG);
      }
      s.set(ox + 6, oy + 1, '▼', bodyD); // snout
      s.set(ox + 8, oy + 1, '█', body);
      s.set(ox + 9, oy + 1, '▌', body);

      // Body
      for (let row = 2; row <= 5; row++) {
        const halfW = row <= 3 ? 4 : 3;
        const startX = 6 - halfW;
        s.set(ox + startX, oy + row, '▐', bodyD);
        for (let i = startX + 1; i < 6 + halfW; i++) {
          const heat = (frame + row * 3 + i * 5) % 12;
          if (heat < 2) {
            s.set(ox + i, oy + row, '░', hotG);
          } else {
            s.set(ox + i, oy + row, '█', body);
          }
        }
        s.set(ox + 6 + halfW, oy + row, '▌', bodyD);
      }

      // Core glow on chest
      s.set(ox + 6, oy + 3, '◉', hotG);

      // Mini wings at sides
      s.set(ox + 1, oy + 2, '╱', bodyL); s.set(ox + 0, oy + 1, '╱', orange);
      s.set(ox + 11, oy + 2, '╲', bodyL); s.set(ox + 12, oy + 1, '╲', orange);

      // Legs
      s.set(ox + 4, oy + 6, '█', body); s.set(ox + 4, oy + 7, '▼', bodyD);
      s.set(ox + 8, oy + 6, '█', body); s.set(ox + 8, oy + 7, '▼', bodyD);

      // Heat particles
      for (let px = 2; px <= 10; px += 3) {
        const py = (frame + px * 6) % 6;
        if (py < 2) s.set(ox + px, oy - 1 + py, '°', t.accentDk);
      }
    },
  },

  // ─────────────────────────────────────────────
  // 11. ABYSSAL LEVIATHAN
  //     Deep-sea horror, bioluminescent dots, tentacles, large eye
  // ─────────────────────────────────────────────
  abyssal_leviathan: {
    theme: makeTheme({
      frame: rgb(12, 25, 50), frameDk: rgb(5, 12, 30), frameLt: rgb(25, 45, 75),
      accent: rgb(40, 200, 180), accentDk: rgb(20, 140, 125),
      core: rgb(60, 230, 210), coreDk: rgb(30, 160, 145), coreMed: rgb(45, 195, 178),
      vent: rgb(8, 20, 40), ventLt: rgb(15, 32, 55),
      eye: rgb(240, 190, 60), eyeOff: rgb(60, 45, 15),
      leg: rgb(10, 22, 45), shadow: rgb(3, 8, 18),
      emblem: rgb(50, 210, 190), data: rgb(20, 100, 90),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.abyssal_leviathan.theme;
      const deep = t.frame;
      const deepD = t.frameDk;
      const deepL = t.frameLt;
      const bio = t.accent;
      const bioG = coreGlow(frame, 20, t);

      // Massive bulbous head/body (back view, creature is mostly head)
      const rowWidths = [4, 6, 8, 9, 10, 10, 9, 7, 5];
      for (let r = 0; r < rowWidths.length; r++) {
        const w = rowWidths[r];
        const startX = 7 - Math.floor(w / 2);
        for (let i = 0; i < w; i++) {
          const col = startX + i;
          // Bioluminescent dots scattered
          const bioPhase = (frame * 2 + col * 7 + r * 11) % 40;
          if (bioPhase < 2) {
            s.set(ox + col, oy + r, '●', bioG);
          } else if (bioPhase < 4) {
            s.set(ox + col, oy + r, '·', bio);
          } else if (i === 0 || i === w - 1) {
            s.set(ox + col, oy + r, '▓', deepL);
          } else {
            s.set(ox + col, oy + r, '█', deep);
          }
        }
      }

      // Tentacles dangling below (undulating)
      for (let tentacle = 0; tentacle < 5; tentacle++) {
        const tx = 4 + tentacle * 2;
        const tPhase = (frame + tentacle * 8) % 20;
        const sway = tPhase < 10 ? 0 : (tPhase < 15 ? 1 : -1);
        s.set(ox + tx + sway, oy + 9, '┃', deepL);
        // Bioluminescent tip
        const tipGlow = (frame + tentacle * 5) % 16 < 8 ? bio : t.accentDk;
        s.set(ox + tx + sway, oy + 10 - 1, '·', tipGlow);
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.abyssal_leviathan.theme;
      const deep = t.frame;
      const deepD = t.frameDk;
      const deepL = t.frameLt;
      const bio = t.accent;
      const bioG = coreGlow(frame, 20, t);
      const amber = t.eye;

      // Bulbous body (front)
      const rowWidths = [3, 5, 7, 8, 8, 7, 5];
      for (let r = 0; r < rowWidths.length; r++) {
        const w = rowWidths[r];
        const startX = 6 - Math.floor(w / 2);
        for (let i = 0; i < w; i++) {
          const col = startX + i;
          const bioPhase = (frame * 2 + col * 5 + r * 9) % 35;
          if (bioPhase < 2) {
            s.set(ox + col, oy + r, '●', bioG);
          } else if (bioPhase < 4) {
            s.set(ox + col, oy + r, '·', bio);
          } else if (i === 0 || i === w - 1) {
            s.set(ox + col, oy + r, '▓', deepL);
          } else {
            s.set(ox + col, oy + r, '█', deep);
          }
        }
      }

      // Large singular eye — center of the face
      const eyeP = cycle(frame, 30, 4);
      const eyeSize = ['◎', '◉', '◎', '●'][eyeP];
      const blink = eyeState(frame, 130);
      if (blink === 'blink') {
        s.set(ox + 6, oy + 2, '─', t.eyeOff);
      } else {
        s.set(ox + 6, oy + 2, eyeSize, amber);
        // Eye glow ring
        s.set(ox + 5, oy + 2, '(', t.eyeOff);
        s.set(ox + 7, oy + 2, ')', t.eyeOff);
      }

      // Maw
      s.set(ox + 4, oy + 4, '╰', deepL);
      for (let i = 5; i <= 7; i++) {
        const toothP = (i + frame) % 3;
        s.set(ox + i, oy + 4, toothP === 0 ? '▼' : '─', toothP === 0 ? deepL : deepD);
      }
      s.set(ox + 8, oy + 4, '╯', deepL);

      // Tentacles
      for (let tentacle = 0; tentacle < 4; tentacle++) {
        const tx = 3 + tentacle * 2;
        const tPhase = (frame + tentacle * 6) % 16;
        const sway = tPhase < 8 ? 0 : (tPhase < 12 ? 1 : -1);
        s.set(ox + tx + sway, oy + 5, '│', deepL);
        s.set(ox + tx + sway, oy + 6, '│', deepL);
        const tipGlow = (frame + tentacle * 4) % 12 < 6 ? bio : t.accentDk;
        s.set(ox + tx + sway, oy + 7, '·', tipGlow);
      }
    },
  },

  // ─────────────────────────────────────────────
  // 12. KERNEL PRIME
  //     The "perfect machine". Sleek minimal humanoid, glowing core chest
  // ─────────────────────────────────────────────
  kernel_prime: {
    theme: makeTheme({
      frame: rgb(55, 58, 68), frameDk: rgb(35, 38, 48), frameLt: rgb(85, 88, 100),
      accent: rgb(60, 150, 245), accentDk: rgb(35, 100, 190),
      core: rgb(100, 190, 255), coreDk: rgb(50, 130, 210), coreMed: rgb(75, 160, 232),
      vent: rgb(42, 45, 55), ventLt: rgb(55, 58, 68),
      eye: rgb(120, 200, 255), eyeOff: rgb(40, 55, 75),
      leg: rgb(48, 52, 62), shadow: rgb(22, 24, 32),
      emblem: rgb(80, 170, 240), data: rgb(35, 95, 160),
    }),
    drawBack(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.kernel_prime.theme;
      const body = t.frame;
      const bodyD = t.frameDk;
      const bodyL = t.frameLt;
      const blue = t.accent;
      const blueG = coreGlow(frame, 18, t);
      const white = rgb(220, 225, 240);

      // Clean geometric head — smooth dome
      s.set(ox + 5, oy, '╭', bodyL);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy, '─', bodyL);
      s.set(ox + 9, oy, '╮', bodyL);
      s.set(ox + 5, oy + 1, '│', bodyL);
      for (let i = 6; i <= 8; i++) s.set(ox + i, oy + 1, '█', body);
      s.set(ox + 9, oy + 1, '│', bodyL);

      // Neck
      s.set(ox + 6, oy + 2, '█', body); s.set(ox + 7, oy + 2, '█', body);
      s.set(ox + 8, oy + 2, '█', body);

      // Clean torso with geometric lines
      for (let row = 3; row <= 7; row++) {
        const halfW = row <= 4 ? 5 : row <= 6 ? 4 : 3;
        const startX = 7 - halfW;
        const endX = 7 + halfW;
        s.set(ox + startX, oy + row, '▐', bodyL);
        for (let i = startX + 1; i < endX; i++) {
          // Clean geometric panel lines
          const isLine = (i === startX + 1 || i === endX - 1);
          if (isLine) {
            s.set(ox + i, oy + row, '│', bodyL);
          } else {
            s.set(ox + i, oy + row, '█', body);
          }
        }
        s.set(ox + endX, oy + row, '▌', bodyD);
      }

      // Core glow — visible from back as blue light bleeding through seams
      for (let row = 4; row <= 6; row++) {
        const coreP = (frame + row * 3) % 12;
        if (coreP < 4) {
          s.set(ox + 7, oy + row, '║', blueG);
        }
      }

      // Shoulder joints — clean circles
      s.set(ox + 2, oy + 3, '○', bodyL); s.set(ox + 12, oy + 3, '○', bodyL);

      // Arms — minimal geometric
      s.set(ox + 2, oy + 4, '│', body); s.set(ox + 12, oy + 4, '│', body);
      s.set(ox + 2, oy + 5, '│', body); s.set(ox + 12, oy + 5, '│', body);
      s.set(ox + 2, oy + 6, '○', bodyD); s.set(ox + 12, oy + 6, '○', bodyD);

      // Legs — clean columns
      s.set(ox + 5, oy + 8, '█', body); s.set(ox + 6, oy + 8, '▌', bodyD);
      s.set(ox + 8, oy + 8, '▐', bodyD); s.set(ox + 9, oy + 8, '█', body);
      s.set(ox + 5, oy + 9, '▀', bodyL); s.set(ox + 9, oy + 9, '▀', bodyL);

      // LED status strip on upper back
      const ledPos = ledSweep(frame, 30, 5);
      for (let i = 0; i < 5; i++) {
        const lx = ox + 5 + i;
        s.set(lx, oy + 3, '─', i === ledPos ? blueG : bodyD);
      }
    },
    drawFront(screen, ox, oy, _tint, frame) {
      const s = screen;
      const t = SKIN_SPRITES.kernel_prime.theme;
      const body = t.frame;
      const bodyD = t.frameDk;
      const bodyL = t.frameLt;
      const blue = t.accent;
      const blueG = coreGlow(frame, 18, t);
      const white = rgb(220, 225, 240);

      // Smooth head
      s.set(ox + 4, oy, '╭', bodyL);
      for (let i = 5; i <= 7; i++) s.set(ox + i, oy, '─', bodyL);
      s.set(ox + 8, oy, '╮', bodyL);

      // Face — minimal, clean
      s.set(ox + 4, oy + 1, '│', bodyL);
      s.set(ox + 5, oy + 1, '█', body);
      // Eyes — clean blue dots
      const blink = eyeState(frame, 120);
      if (blink === 'blink') {
        s.set(ox + 5, oy + 1, '─', t.eyeOff); s.set(ox + 7, oy + 1, '─', t.eyeOff);
      } else {
        s.set(ox + 5, oy + 1, '●', blueG); s.set(ox + 7, oy + 1, '●', blueG);
      }
      s.set(ox + 6, oy + 1, '█', body);
      s.set(ox + 8, oy + 1, '│', bodyL);

      // Neck
      s.set(ox + 5, oy + 2, '█', body); s.set(ox + 6, oy + 2, '█', body);
      s.set(ox + 7, oy + 2, '█', body);

      // Torso
      for (let row = 3; row <= 5; row++) {
        const halfW = row <= 3 ? 4 : row <= 4 ? 4 : 3;
        const startX = 6 - halfW;
        const endX = 6 + halfW;
        s.set(ox + startX, oy + row, '▐', bodyL);
        for (let i = startX + 1; i < endX; i++) {
          const isLine = (i === startX + 1 || i === endX - 1);
          s.set(ox + i, oy + row, isLine ? '│' : '█', isLine ? bodyL : body);
        }
        s.set(ox + endX, oy + row, '▌', bodyD);
      }

      // Core — the defining feature, glowing blue circle in chest
      const corePhase = cycle(frame, 24, 4);
      const coreCh = ['◎', '◉', '●', '◉'][corePhase];
      s.set(ox + 6, oy + 3, coreCh, blueG);
      // Core glow bleeds to adjacent cells
      const coreBleed = cycle(frame, 20, 4) < 2;
      if (coreBleed) {
        s.set(ox + 5, oy + 3, '░', t.accentDk);
        s.set(ox + 7, oy + 3, '░', t.accentDk);
        s.set(ox + 6, oy + 2, '░', t.accentDk);
        s.set(ox + 6, oy + 4, '░', t.accentDk);
      }

      // Shoulder joints
      s.set(ox + 1, oy + 3, '○', bodyL); s.set(ox + 11, oy + 3, '○', bodyL);

      // Arms
      s.set(ox + 1, oy + 4, '│', body); s.set(ox + 11, oy + 4, '│', body);
      s.set(ox + 1, oy + 5, '○', bodyD); s.set(ox + 11, oy + 5, '○', bodyD);

      // Waist
      s.set(ox + 3, oy + 6, '╰', bodyL);
      for (let i = 4; i <= 8; i++) s.set(ox + i, oy + 6, '─', bodyL);
      s.set(ox + 9, oy + 6, '╯', bodyL);

      // Legs
      s.set(ox + 4, oy + 7, '█', body); s.set(ox + 5, oy + 7, '▌', bodyD);
      s.set(ox + 7, oy + 7, '▐', bodyD); s.set(ox + 8, oy + 7, '█', body);

      // LED sweep across chest
      const ledPos = ledSweep(frame, 24, 5);
      for (let i = 0; i < 5; i++) {
        const lx = ox + 4 + i;
        s.set(lx, oy + 5, '─', i === ledPos ? blueG : bodyD);
      }
    },
  },
};

module.exports = { SKIN_SPRITES, transcendentGlow };
