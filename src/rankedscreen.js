// ═══════════════════════════════════════════════════════════════
// RANKED SCREEN — Full-page rank browser with animated frames
// Left/right to page through all 15 ranks. Each rank gets its own
// visual treatment: background ambience, border frame, and elite
// effects (ice shimmer, fire glitch, void wings).
// ═══════════════════════════════════════════════════════════════

const { rgb, colors, BOLD, RESET } = require('./palette');
const { RANKS, getRankedData, getRankForRp, getRankIndex, getNextRank } = require('./ranked');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

// ─── Deterministic pseudo-random (no Math.random in render) ───

function hash(i, frame) {
  let h = (i * 2654435761 + frame * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return (h & 0xFFFF) / 0xFFFF;
}

// ─── Frame tier for each rank index ───

function getFrameTier(idx) {
  if (idx <= 1) return 'none';
  if (idx <= 3) return 'thin';
  if (idx <= 7) return 'box';
  if (idx <= 11) return 'ornate';
  if (idx === 12) return 'ice';
  if (idx === 13) return 'fire';
  return 'wings';
}

// ─── Background ambience per tier ───
// Drawn first, behind everything. Gets more complex as rank increases.

function drawBackground(screen, w, h, idx, frame) {
  const tier = getFrameTier(idx);
  const rank = RANKS[idx];

  if (tier === 'none') {
    // Subtle sparse dots — almost nothing
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(hash(i, Math.floor(frame / 40)) * w);
      const y = Math.floor(hash(i + 50, Math.floor(frame / 40)) * h);
      if (x > 0 && x < w - 1 && y > 1 && y < h - 2) {
        screen.set(x, y, '·', rgb(35, 35, 50));
      }
    }
    return;
  }

  if (tier === 'thin') {
    // Slow drifting dots — gentle ambience
    const count = 12;
    for (let i = 0; i < count; i++) {
      const baseX = hash(i * 7, 0) * w;
      const drift = Math.sin(frame * 0.02 + i) * 3;
      const x = Math.floor(baseX + drift) % w;
      const y = Math.floor(hash(i * 13, 0) * (h - 4)) + 2;
      if (x > 0 && x < w - 1) {
        const bright = Math.sin(frame * 0.04 + i * 2) * 0.3 + 0.5;
        const g = Math.round(80 + bright * 40);
        screen.set(x, y, '·', rgb(40, g, 50));
      }
    }
    return;
  }

  if (tier === 'box') {
    // Falling data streams — light matrix drizzle
    const streams = 8 + idx;
    for (let s = 0; s < streams; s++) {
      const col = Math.floor(hash(s * 3, 0) * w);
      if (col <= 0 || col >= w - 1) continue;
      const speed = 0.5 + hash(s * 7, 0) * 0.8;
      const headY = Math.floor((frame * speed + hash(s * 11, 0) * h * 3) % (h * 2));
      const tailLen = 3 + Math.floor(hash(s * 17, 0) * 3);
      for (let t = 0; t < tailLen; t++) {
        const y = headY - t;
        if (y < 1 || y >= h - 1) continue;
        const fade = 1 - t / tailLen;
        const g = Math.round(80 + fade * 100);
        const b = Math.round(60 + fade * 80);
        const ch = t === 0 ? '│' : '·';
        screen.set(col, y, ch, rgb(30, g, b));
      }
    }
    return;
  }

  if (tier === 'ornate') {
    // Dense matrix rain + horizontal scan lines
    const streams = 14 + (idx - 8) * 3;
    for (let s = 0; s < streams; s++) {
      const col = Math.floor(hash(s * 3, 0) * w);
      if (col <= 0 || col >= w - 1) continue;
      const speed = 0.6 + hash(s * 7, 0) * 1.0;
      const headY = Math.floor((frame * speed + hash(s * 11, 0) * h * 3) % (h * 2));
      const tailLen = 4 + Math.floor(hash(s * 17, 0) * 4);
      for (let t = 0; t < tailLen; t++) {
        const y = headY - t;
        if (y < 1 || y >= h - 1) continue;
        const fade = 1 - t / tailLen;
        const r = Math.round(80 + fade * 80);
        const g = Math.round(60 + fade * 60);
        const b = Math.round(120 + fade * 100);
        const ch = t === 0 ? '▌' : '│';
        screen.set(col, y, ch, rgb(r, g, b));
      }
    }
    // Horizontal scan line sweep
    const scanY = Math.floor(frame * 0.3) % (h + 10) - 5;
    if (scanY >= 1 && scanY < h - 1) {
      for (let x = 1; x < w - 1; x++) {
        if (hash(x, frame) < 0.3) {
          screen.set(x, scanY, '─', rgb(60, 40, 90));
        }
      }
    }
    return;
  }

  if (tier === 'ice') {
    // Falling ice crystals / snowfall
    const flakes = 25;
    const iceChars = '·✦*◇❆✧○';
    for (let s = 0; s < flakes; s++) {
      const col = Math.floor(hash(s * 3, 0) * w);
      if (col <= 0 || col >= w - 1) continue;
      const speed = 0.3 + hash(s * 7, 0) * 0.5;
      const sway = Math.sin(frame * 0.03 + s * 1.5) * 2;
      const y = Math.floor((frame * speed + hash(s * 11, 0) * h * 4) % (h * 2));
      const x = Math.floor(col + sway);
      if (y >= 1 && y < h - 1 && x > 0 && x < w - 1) {
        const bright = 0.3 + hash(s, Math.floor(frame / 8)) * 0.7;
        const r = Math.round(120 + bright * 80);
        const g = Math.round(200 + bright * 40);
        const b = Math.round(240 + bright * 15);
        const ch = iceChars[Math.floor(hash(s * 19, 0) * iceChars.length)];
        screen.set(x, y, ch, rgb(r, g, b));
      }
    }
    // Frost floor — icy particles along the bottom
    for (let x = 1; x < w - 1; x++) {
      if (hash(x, Math.floor(frame / 6)) < 0.15) {
        const ch = hash(x, frame) < 0.5 ? '░' : '▒';
        screen.set(x, h - 3, ch, rgb(100, 180, 220));
      }
    }
    return;
  }

  if (tier === 'fire') {
    // Rising fire/glitch particles — embers + corruption
    const embers = 30;
    const fireChars = '░▒▓█▀▄╳※';
    for (let s = 0; s < embers; s++) {
      const col = Math.floor(hash(s * 3, 0) * w);
      if (col <= 0 || col >= w - 1) continue;
      const speed = 0.4 + hash(s * 7, 0) * 0.8;
      const sway = Math.sin(frame * 0.05 + s * 2) * 2;
      // Fire rises (subtract frame)
      const baseY = h - 2;
      const y = Math.floor(baseY - ((frame * speed + hash(s * 11, 0) * h * 3) % (h * 2)));
      const x = Math.floor(col + sway);
      if (y >= 1 && y < h - 1 && x > 0 && x < w - 1) {
        const life = Math.max(0, (y - 1) / (h - 3)); // 0 at bottom, 1 at top
        const r = Math.round(255 - life * 120);
        const g = Math.round(80 - life * 60);
        const b = Math.round(20 + life * 20);
        const ch = fireChars[Math.floor(hash(s * 19, Math.floor(frame / 3)) * fireChars.length)];
        screen.set(x, y, ch, rgb(r, g, b));
      }
    }
    // Glitch corruption: random horizontal tears
    const tearCount = 2 + Math.floor(hash(0, Math.floor(frame / 4)) * 3);
    for (let t = 0; t < tearCount; t++) {
      const tearY = Math.floor(hash(t + 80, Math.floor(frame / 5)) * (h - 4)) + 2;
      const tearX = Math.floor(hash(t + 90, Math.floor(frame / 5)) * (w - 20));
      const tearLen = 3 + Math.floor(hash(t + 100, Math.floor(frame / 5)) * 8);
      for (let i = 0; i < tearLen; i++) {
        const x = tearX + i;
        if (x > 0 && x < w - 1) {
          const ch = fireChars[Math.floor(hash(i + t * 50, frame) * fireChars.length)];
          screen.set(x, tearY, ch, rgb(255, Math.floor(hash(i, frame) * 60), 30));
        }
      }
    }
    return;
  }

  if (tier === 'wings') {
    // Void distortion — reality warping, data streams converging toward center
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    // Radial void particles pulling inward
    const voidChars = '·░▒▓█╳◊◈✧⟐';
    const particles = 40;
    for (let p = 0; p < particles; p++) {
      const angle = hash(p * 3, 0) * Math.PI * 2;
      const maxDist = Math.min(w, h) * 0.6;
      const speed = 0.02 + hash(p * 7, 0) * 0.03;
      const dist = maxDist - ((frame * speed + hash(p * 11, 0)) % 1) * maxDist;
      const x = Math.floor(cx + Math.cos(angle) * dist * (w / h));
      const y = Math.floor(cy + Math.sin(angle) * dist * 0.5);
      if (x > 0 && x < w - 1 && y > 1 && y < h - 2) {
        const fade = dist / maxDist;
        const r = Math.round(80 + (1 - fade) * 175);
        const g = Math.round(40 + (1 - fade) * 120);
        const b = Math.round(150 + (1 - fade) * 105);
        const ch = voidChars[Math.floor(hash(p * 19, Math.floor(frame / 4)) * voidChars.length)];
        screen.set(x, y, ch, rgb(r, g, b));
      }
    }
    // White pulse rings radiating outward periodically
    const ringPhase = (frame * 0.04) % 1;
    const ringDist = ringPhase * Math.min(w, h) * 0.5;
    for (let a = 0; a < 30; a++) {
      const angle = (a / 30) * Math.PI * 2;
      const x = Math.floor(cx + Math.cos(angle) * ringDist * (w / h) * 0.6);
      const y = Math.floor(cy + Math.sin(angle) * ringDist * 0.3);
      if (x > 0 && x < w - 1 && y > 1 && y < h - 2) {
        const alpha = 1 - ringPhase;
        const v = Math.round(100 + alpha * 155);
        screen.set(x, y, '·', rgb(v, v, v));
      }
    }
  }
}

// ─── Rank frame / badge rendering ───
// Draws the decorative frame around the rank name at center of screen.

function drawRankFrame(screen, w, h, idx, frame) {
  const rank = RANKS[idx];
  const tier = getFrameTier(idx);
  const nameText = rank.name;
  const iconText = `${rank.icon} ${nameText} ${rank.icon}`;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2) - 2;

  if (tier === 'none') {
    // Just the name, no frame
    screen.centerText(cy, iconText, rank.color, null, true);
    return;
  }

  if (tier === 'thin') {
    // Bracket-style frame: ─[ ◇ NAME ◇ ]─
    const inner = ` ${iconText} `;
    const left = '─[ ';
    const right = ' ]─';
    const full = left + iconText + right;
    const startX = cx - Math.floor(full.length / 2);
    screen.text(startX, cy, left, rgb(80, 80, 100));
    screen.text(startX + left.length, cy, iconText, rank.color, null, true);
    screen.text(startX + left.length + iconText.length, cy, right, rgb(80, 80, 100));
    return;
  }

  if (tier === 'box') {
    // Single-line box
    const pad = 4;
    const innerW = iconText.length + pad * 2;
    const bx = cx - Math.floor(innerW / 2) - 1;
    const by = cy - 1;

    // Border color pulses gently
    const pulse = Math.sin(frame * 0.04) * 0.15 + 0.85;
    const nums = rank.color.match(/\d+/g).map(Number);
    const br = Math.round((nums[2] || 100) * pulse);
    const bg2 = Math.round((nums[3] || 100) * pulse);
    const bb = Math.round((nums[4] || 100) * pulse);
    const borderColor = rgb(Math.min(br, 255), Math.min(bg2, 255), Math.min(bb, 255));

    screen.set(bx, by, '┌', borderColor);
    screen.hline(bx + 1, by, innerW, '─', borderColor);
    screen.set(bx + innerW + 1, by, '┐', borderColor);
    screen.set(bx, by + 1, '│', borderColor);
    screen.set(bx + innerW + 1, by + 1, '│', borderColor);
    screen.set(bx, by + 2, '└', borderColor);
    screen.hline(bx + 1, by + 2, innerW, '─', borderColor);
    screen.set(bx + innerW + 1, by + 2, '┘', borderColor);

    screen.centerText(cy, iconText, rank.color, null, true);
    return;
  }

  if (tier === 'ornate') {
    // Double-line box with star accents
    const pad = 4;
    const innerW = iconText.length + pad * 2;
    const bx = cx - Math.floor(innerW / 2) - 1;
    const by = cy - 1;

    const pulse = Math.sin(frame * 0.05) * 0.2 + 0.8;
    const nums = rank.color.match(/\d+/g).map(Number);
    const rr = nums[2] || 100, gg = nums[3] || 100, bbb = nums[4] || 100;
    const borderColor = rgb(
      Math.min(Math.round(rr * pulse), 255),
      Math.min(Math.round(gg * pulse), 255),
      Math.min(Math.round(bbb * pulse), 255)
    );
    const accentColor = rgb(
      Math.min(Math.round(rr * 1.2), 255),
      Math.min(Math.round(gg * 1.2), 255),
      Math.min(Math.round(bbb * 1.2), 255)
    );

    // Double-line border
    screen.set(bx, by, '╔', borderColor);
    screen.hline(bx + 1, by, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by, '╗', borderColor);
    screen.set(bx, by + 1, '║', borderColor);
    screen.set(bx + innerW + 1, by + 1, '║', borderColor);
    screen.set(bx, by + 2, '╚', borderColor);
    screen.hline(bx + 1, by + 2, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by + 2, '╝', borderColor);

    // Star accents at corners (animated sparkle)
    const sparkle = frame % 12 < 6;
    const starChar = sparkle ? '✦' : '✧';
    screen.set(bx - 1, by - 1, starChar, accentColor);
    screen.set(bx + innerW + 2, by - 1, starChar, accentColor);
    screen.set(bx - 1, by + 3, starChar, accentColor);
    screen.set(bx + innerW + 2, by + 3, starChar, accentColor);

    screen.centerText(cy, iconText, rank.color, null, true);
    return;
  }

  if (tier === 'ice') {
    // Double box + ice crystal border with frost particles
    const pad = 4;
    const innerW = iconText.length + pad * 2;
    const bx = cx - Math.floor(innerW / 2) - 1;
    const by = cy - 1;

    const t = frame * 0.06;
    const shimmer = Math.sin(t) * 0.2 + 0.8;
    const borderColor = rgb(
      Math.round(120 * shimmer + 40),
      Math.round(210 * shimmer + 20),
      Math.round(245 * shimmer + 10)
    );

    screen.set(bx, by, '╔', borderColor);
    screen.hline(bx + 1, by, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by, '╗', borderColor);
    screen.set(bx, by + 1, '║', borderColor);
    screen.set(bx + innerW + 1, by + 1, '║', borderColor);
    screen.set(bx, by + 2, '╚', borderColor);
    screen.hline(bx + 1, by + 2, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by + 2, '╝', borderColor);

    // Frost particle ring around the frame
    const frostChars = '·✦*✧❆○';
    const perim = (innerW + 4) * 2 + 6;
    for (let i = 0; i < perim; i++) {
      if (hash(i, Math.floor(frame / 5)) > 0.35) continue;
      let fx, fy;
      if (i < innerW + 4) {
        fx = bx - 1 + i; fy = by - 2;
      } else if (i < (innerW + 4) + 3) {
        fx = bx + innerW + 2; fy = by - 1 + (i - innerW - 4);
      } else if (i < (innerW + 4) * 2 + 3) {
        fx = bx + innerW + 3 - (i - innerW - 7); fy = by + 3;
      } else {
        fx = bx - 1; fy = by + 2 - (i - (innerW + 4) * 2 - 3);
      }
      if (fx > 0 && fx < w - 1 && fy > 0 && fy < h - 1) {
        const ch = frostChars[Math.floor(hash(i * 7, Math.floor(frame / 8)) * frostChars.length)];
        const bright = hash(i, Math.floor(frame / 4)) * 0.5 + 0.5;
        screen.set(fx, fy, ch, rgb(
          Math.round(140 + bright * 100),
          Math.round(220 + bright * 30),
          Math.round(245 + bright * 10)
        ));
      }
    }

    // Animated name text with ice shimmer
    const nameX = cx - Math.floor(iconText.length / 2);
    for (let i = 0; i < iconText.length; i++) {
      const sparkle = hash(i, frame) < 0.06 && iconText[i] !== ' ';
      const wave = Math.sin(t + i * 0.4) * 0.15 + 0.85;
      const color = sparkle
        ? rgb(240, 250, 255)
        : rgb(Math.round(160 * wave), Math.round(230 * wave), Math.round(255 * wave));
      screen.set(nameX + i, cy, iconText[i], color, null, true);
    }
    return;
  }

  if (tier === 'fire') {
    // Glitch corruption frame with fire particles
    const pad = 4;
    const innerW = iconText.length + pad * 2;
    const bx = cx - Math.floor(innerW / 2) - 1;
    const by = cy - 1;

    const t = frame * 0.1;
    const glitchChars = '▓▒░█▌▐╪╫╬┼╳※';

    // Unstable border — occasionally corrupts
    for (let x = bx; x <= bx + innerW + 1; x++) {
      const isCorner = x === bx || x === bx + innerW + 1;
      const topCh = isCorner ? (x === bx ? '╔' : '╗') : '═';
      const botCh = isCorner ? (x === bx ? '╚' : '╝') : '═';

      const corrupt = hash(x, Math.floor(frame / 3)) < 0.12;
      const tCh = corrupt ? glitchChars[Math.floor(hash(x, frame) * glitchChars.length)] : topCh;
      const bCh = corrupt ? glitchChars[Math.floor(hash(x + 99, frame) * glitchChars.length)] : botCh;
      const color = corrupt ? rgb(255, 40, 40) : rgb(
        Math.round(220 + Math.sin(t + x * 0.3) * 35),
        Math.round(60 + Math.sin(t + x * 0.3) * 20),
        Math.round(40 + Math.sin(t + x * 0.3) * 20)
      );
      screen.set(x, by, tCh, color);
      screen.set(x, by + 2, bCh, color);
    }
    screen.set(bx, by + 1, '║', rgb(220, 60, 40));
    screen.set(bx + innerW + 1, by + 1, '║', rgb(220, 60, 40));

    // Fire particles above and below frame
    const fireChars = '░▒▓▀▄';
    for (let i = 0; i < innerW + 2; i++) {
      const x = bx + i;
      // Above: flames rising
      if (hash(i, Math.floor(frame / 2)) < 0.4) {
        const rise = Math.floor(hash(i, Math.floor(frame / 3)) * 3);
        const fy = by - 2 - rise;
        if (fy > 0) {
          const life = rise / 3;
          const ch = fireChars[Math.floor(hash(i * 13, Math.floor(frame / 2)) * fireChars.length)];
          screen.set(x, fy, ch, rgb(
            Math.round(255 - life * 80),
            Math.round(100 - life * 60),
            Math.round(20)
          ));
        }
      }
      // Below: smoldering
      if (hash(i + 50, Math.floor(frame / 2)) < 0.3) {
        const ch = fireChars[Math.floor(hash(i * 17, Math.floor(frame / 2)) * fireChars.length)];
        screen.set(x, by + 3, ch, rgb(180, 40, 20));
      }
    }

    // Animated name text with red glitch
    const nameX = cx - Math.floor(iconText.length / 2);
    for (let i = 0; i < iconText.length; i++) {
      let ch = iconText[i];
      const h2 = hash(i, frame);
      const glitch = h2 < 0.1 && ch !== ' ';
      if (glitch) ch = glitchChars[Math.floor(hash(i + 33, frame) * glitchChars.length)];
      const flicker = Math.sin(t * 3 + i) > 0.6;
      const color = glitch
        ? (flicker ? rgb(255, 40, 40) : rgb(80, 0, 0))
        : rgb(
            Math.round(200 + Math.sin(t + i * 0.3) * 55),
            Math.round(50 + Math.sin(t + i * 0.3) * 30),
            Math.round(40 + Math.sin(t + i * 0.3) * 20)
          );
      screen.set(nameX + i, cy, ch, color, null, true);
    }
    return;
  }

  if (tier === 'wings') {
    // Void frame with extending wing structures
    const pad = 4;
    const innerW = iconText.length + pad * 2;
    const bx = cx - Math.floor(innerW / 2) - 1;
    const by = cy - 1;

    const t = frame * 0.08;

    // Core frame — phases between void and overexposure
    const pulse = Math.sin(t) * 0.5 + 0.5;
    const borderColor = rgb(
      Math.round(120 + pulse * 135),
      Math.round(80 + pulse * 140),
      Math.round(200 + pulse * 55)
    );

    screen.set(bx, by, '╔', borderColor);
    screen.hline(bx + 1, by, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by, '╗', borderColor);
    screen.set(bx, by + 1, '║', borderColor);
    screen.set(bx + innerW + 1, by + 1, '║', borderColor);
    screen.set(bx, by + 2, '╚', borderColor);
    screen.hline(bx + 1, by + 2, innerW, '═', borderColor);
    screen.set(bx + innerW + 1, by + 2, '╝', borderColor);

    // Wing structures — extending lines from sides
    const wingLen = Math.min(8, Math.floor((bx - 2) * 0.7));
    const wingChars = ['━', '━', '━', '═', '═', '─', '╌', '·'];
    const glitchChars = '▓▒░╪╫���◊◈⟐';

    for (let side = 0; side < 2; side++) {
      const dir = side === 0 ? -1 : 1;
      const anchor = side === 0 ? bx - 1 : bx + innerW + 2;

      for (let layer = 0; layer < 3; layer++) {
        const layerY = by + layer;
        for (let i = 0; i < wingLen; i++) {
          const x = anchor + dir * i;
          if (x < 1 || x >= w - 1) continue;

          // Wing animation: wave that flows outward
          const wavePhase = Math.sin(t * 2 - i * 0.3 + layer * 0.5);
          const active = wavePhase > -0.3;
          if (!active) continue;

          const fade = 1 - i / wingLen;
          const intensity = fade * (wavePhase * 0.3 + 0.7);

          // Occasional void glitch on wing
          const isGlitch = hash(i + layer * 20 + side * 40, frame) < 0.08;
          let ch, color;
          if (isGlitch) {
            ch = glitchChars[Math.floor(hash(i + layer * 30, frame) * glitchChars.length)];
            color = hash(i, frame) < 0.5 ? rgb(15, 0, 30) : rgb(255, 240, 255);
          } else {
            ch = wingChars[Math.min(i, wingChars.length - 1)];
            color = rgb(
              Math.round((120 + pulse * 135) * intensity),
              Math.round((80 + pulse * 140) * intensity),
              Math.round((200 + pulse * 55) * intensity)
            );
          }
          screen.set(x, layerY, ch, color);
        }
      }

      // Wing tips — flared endpoints
      const tipX = anchor + dir * wingLen;
      if (tipX > 0 && tipX < w - 1) {
        const tipChar = side === 0 ? '◁' : '▷';
        const tipPulse = Math.sin(t * 3) > 0 ? rgb(255, 240, 255) : rgb(180, 120, 240);
        screen.set(tipX, by + 1, tipChar, tipPulse);
      }
    }

    // Animated name text with void phasing
    const nameX = cx - Math.floor(iconText.length / 2);
    for (let i = 0; i < iconText.length; i++) {
      let ch = iconText[i];
      const h2 = hash(i, frame);
      const spike = Math.sin(t * 6.7) > 0.9 ? 1 : 0;
      let color;

      if (spike) {
        color = rgb(255, 255, 255);
      } else if (h2 < 0.08 && ch !== ' ') {
        ch = glitchChars[Math.floor(hash(i + 77, frame) * glitchChars.length)];
        color = h2 < 0.04 ? rgb(15, 0, 30) : rgb(255, 240, 255);
      } else {
        const charPulse = Math.sin(t + i * 0.4) * 0.5 + 0.5;
        color = rgb(
          Math.round(120 + charPulse * 135),
          Math.round(80 + charPulse * 140),
          Math.round(200 + charPulse * 55)
        );
      }
      screen.set(nameX + i, cy, ch, color, null, true);
    }
  }
}

// ─── Info section below the frame ───

// ─── Games-to-reach estimate ───
// Shows how many wins it would take at common wager tiers to reach a target RP.
// Uses the base win formula: 20 + wager * 0.05 (ignoring streak bonus for conservative estimate).

const WAGER_TIERS = [
  { amount: 100,  label: '100cr' },
  { amount: 1000, label: '1K cr' },
  { amount: 5000, label: '5K cr' },
];

function winsToReach(rpNeeded, wagerAmount) {
  if (rpNeeded <= 0) return 0;
  const rpPerWin = 20 + Math.floor(wagerAmount * 0.05);
  return Math.ceil(rpNeeded / rpPerWin);
}

function drawRankInfo(screen, w, h, idx, data) {
  const rank = RANKS[idx];
  const nextRank = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const currentIdx = getRankIndex(data.rp);
  const dim = rgb(100, 100, 130);
  const dimmer = rgb(70, 70, 95);
  const bright = rgb(230, 230, 245);
  const cy = Math.floor(h / 2);

  let y = cy + 2;

  // Description
  screen.centerText(y, rank.desc, dim);
  y += 2;

  // RP range
  const rpMin = rank.rp;
  const rpMax = nextRank ? nextRank.rp - 1 : '∞';
  screen.centerText(y, `RP Range: ${rpMin} — ${rpMax}`, bright);
  y += 1;

  // Relationship to player's current rank
  if (idx === currentIdx) {
    screen.centerText(y, '► CURRENT RANK ◄', rank.color, null, true);
    y += 1;
    if (nextRank) {
      const needed = nextRank.rp - data.rp;
      screen.centerText(y, `${needed} RP to next rank (${nextRank.name})`, dim);
      y += 1;
      // Games-to-next-rank estimates
      const estimates = WAGER_TIERS.map(t =>
        `${t.label}: ~${winsToReach(needed, t.amount)} wins`
      ).join('    ');
      screen.centerText(y, estimates, dimmer);
    } else {
      screen.centerText(y, 'Maximum rank achieved.', rgb(255, 215, 0));
    }
  } else if (idx < currentIdx) {
    screen.centerText(y, '✓ ACHIEVED', rgb(140, 230, 180));
  } else {
    const needed = rank.rp - data.rp;
    screen.centerText(y, `${needed} RP from your current rating`, dim);
    y += 1;
    // Games-to-reach estimates
    const estimates = WAGER_TIERS.map(t =>
      `${t.label}: ~${winsToReach(needed, t.amount)} wins`
    ).join('    ');
    screen.centerText(y, estimates, dimmer);
  }
  y += 2;

  // Page indicator
  screen.centerText(y, `◄  ${idx + 1} / ${RANKS.length}  ►`, rgb(80, 80, 110));
}

// ─── Main screen ───

function openRankedScreen(screen) {
  return new Promise((resolve) => {
    const data = getRankedData();
    const currentIdx = getRankIndex(data.rp);
    let cursor = 0; // start at rank 1 (index 0)
    let frameCount = 0;

    const w = screen.width;
    const h = screen.height;

    function render() {
      screen.clear();

      const rank = RANKS[cursor];
      const tier = getFrameTier(cursor);

      // Background ambience
      drawBackground(screen, w, h, cursor, frameCount);

      // Title bar
      screen.hline(1, 0, w - 2, '─', rgb(60, 60, 85));
      screen.centerText(0, ' RANKED ', rgb(255, 100, 100), null, true);

      // Rank frame (centered)
      drawRankFrame(screen, w, h, cursor, frameCount);

      // Info section
      drawRankInfo(screen, w, h, cursor, data);

      // Footer
      screen.hline(2, h - 2, w - 4, '─', rgb(40, 40, 60));
      const navLeft = cursor > 0 ? '← prev' : '      ';
      const navRight = cursor < RANKS.length - 1 ? 'next →' : '      ';
      screen.text(4, h - 2, ` ${navLeft} `, rgb(100, 100, 130));
      screen.text(w - 12, h - 2, ` ${navRight} `, rgb(100, 100, 130));
      screen.centerText(h - 2, ' ESC exit ', rgb(80, 80, 110));
      screen.text(w - 14, h - 1, '─ kernelmon ─', rgb(50, 50, 70));

      screen.render();
    }

    // Animation loop
    const timer = setInterval(() => {
      frameCount++;
      render();
    }, FRAME_MS);

    // Keyboard
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function onKey(key) {
      if (key === '\x1b[C' || key === 'l' || key === 'd') {
        if (cursor < RANKS.length - 1) cursor++;
      } else if (key === '\x1b[D' || key === 'h' || key === 'a') {
        if (cursor > 0) cursor--;
      } else if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      clearInterval(timer);
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

module.exports = { openRankedScreen };
