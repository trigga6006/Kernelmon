// Pokemon-style fighter avatars
// Player: back view (foreground, bottom-left, larger)
// Opponent: front view (background, top-right, smaller)
// Uses half-block chars (▀▄█▓▒░) for pixel art with 3D depth

const { colors, rgb } = require('./palette');

// ─── Color definitions for the pixel art ───
const C = {
  frame:   rgb(160, 170, 200),    // shell/frame — cool steel
  frameDk: rgb(100, 110, 140),    // dark frame edge (shadow side)
  frameLt: rgb(190, 200, 225),    // light frame edge (highlight)
  core:    rgb(60, 180, 200),     // core glow — cyan
  coreDk:  rgb(40, 130, 155),     // core shadow
  coreLt:  rgb(100, 220, 240),    // core highlight
  screen:  rgb(80, 90, 120),      // screen off
  screenOn:rgb(130, 220, 235),    // screen lit
  vent:    rgb(70, 75, 100),      // vents/grille
  led:     rgb(240, 220, 140),    // LED indicator — gold
  leg:     rgb(90, 95, 115),      // legs/base
  shadow:  rgb(40, 40, 55),       // drop shadow
  eye:     rgb(240, 220, 140),    // eyes/sensors — gold
  eyeOff:  rgb(80, 80, 100),
};

// ─── PLAYER: Back view (large, 14w x 11h) ───
// A chunky robot/tower seen from behind, with depth shading
const PLAYER_BACK = {
  width: 14,
  height: 11,
  art: [
    //  01234567890123
    '      ▄██▄      ',  // 0: antenna/top
    '    ▄██████▄    ',  // 1: head top
    '   ██▓▓▓▓▓▓██   ',  // 2: head
    '   ██▓▓▓▓▓▓██▌  ',  // 3: head+shadow
    '  ▐████████████▌ ',  // 4: shoulders
    '  ▐██▒▒▒▒▒▒██▌ ',  // 5: back panel
    '  ▐██▒▒██▒▒██▌ ',  // 6: back detail
    '  ▐██▒▒▒▒▒▒██▌ ',  // 7: back panel
    '  ▐██████████▌ ',  // 8: waist
    '   ▀██▀  ▀██▀  ',  // 9: legs
    '    ▀▀    ▀▀   ',  // 10: feet
  ],
  // Per-character color map (null = skip/transparent)
  draw: function(screen, ox, oy, tint, frame) {
    const isIdle2 = (frame % 40) > 20;
    const coreColor = isIdle2 ? C.coreDk : C.core;

    // Row 0: antenna nub
    screen.set(ox + 5, oy, '▄', C.frameLt);
    screen.set(ox + 6, oy, '█', C.frame);
    screen.set(ox + 7, oy, '█', C.frame);
    screen.set(ox + 8, oy, '▄', C.frameDk);

    // Row 1: head top
    screen.set(ox + 3, oy + 1, '▄', C.frameLt);
    for (let i = 4; i <= 9; i++) screen.set(ox + i, oy + 1, '█', C.frame);
    screen.set(ox + 10, oy + 1, '▄', C.frameDk);

    // Row 2-3: head body
    for (let r = 2; r <= 3; r++) {
      screen.set(ox + 2, oy + r, '█', C.frameLt);
      screen.set(ox + 3, oy + r, '█', C.frame);
      for (let i = 4; i <= 9; i++) screen.set(ox + i, oy + r, '▓', C.vent);
      screen.set(ox + 10, oy + r, '█', C.frame);
      screen.set(ox + 11, oy + r, '█', C.frameDk);
      if (r === 3) screen.set(ox + 12, oy + r, '▌', C.shadow);
    }

    // Row 4: shoulders (wider)
    screen.set(ox + 1, oy + 4, '▐', C.frameLt);
    for (let i = 2; i <= 11; i++) screen.set(ox + i, oy + 4, '█', C.frame);
    screen.set(ox + 12, oy + 4, '▌', C.frameDk);

    // Row 5-7: back panel with detail
    for (let r = 5; r <= 7; r++) {
      screen.set(ox + 1, oy + r, '▐', C.frameLt);
      screen.set(ox + 2, oy + r, '█', C.frame);
      screen.set(ox + 3, oy + r, '█', C.frame);
      for (let i = 4; i <= 9; i++) {
        if (r === 6 && i >= 6 && i <= 7) {
          screen.set(ox + i, oy + r, '█', coreColor); // core glow
        } else {
          screen.set(ox + i, oy + r, '▒', C.vent);
        }
      }
      screen.set(ox + 10, oy + r, '█', C.frame);
      screen.set(ox + 11, oy + r, '█', C.frameDk);
      screen.set(ox + 12, oy + r, '▌', C.shadow);
    }

    // Row 8: waist
    screen.set(ox + 1, oy + 8, '▐', C.frameLt);
    for (let i = 2; i <= 11; i++) screen.set(ox + i, oy + 8, '█', C.frame);
    screen.set(ox + 12, oy + 8, '▌', C.shadow);

    // Row 9: legs
    screen.set(ox + 3, oy + 9, '▀', C.frame);
    screen.set(ox + 4, oy + 9, '█', C.leg);
    screen.set(ox + 5, oy + 9, '▀', C.frame);
    screen.set(ox + 8, oy + 9, '▀', C.frame);
    screen.set(ox + 9, oy + 9, '█', C.leg);
    screen.set(ox + 10, oy + 9, '▀', C.frame);

    // Row 10: feet
    screen.set(ox + 4, oy + 10, '▀', C.leg);
    screen.set(ox + 5, oy + 10, '▀', C.leg);
    screen.set(ox + 8, oy + 10, '▀', C.leg);
    screen.set(ox + 9, oy + 10, '▀', C.leg);

    // LED indicator on shoulder
    screen.set(ox + 3, oy + 4, '◆', isIdle2 ? C.led : C.eyeOff);
  },
};

// ─── OPPONENT: Front view (smaller, 10w x 8h) ───
// Facing the player, with screen/face visible
const OPPONENT_FRONT = {
  width: 10,
  height: 8,
  draw: function(screen, ox, oy, tint, frame) {
    const blink = (frame % 60) > 55; // occasional blink
    const coreColor = (frame % 30) > 15 ? C.core : C.coreDk;

    // Row 0: top edge
    screen.set(ox + 2, oy, '▄', C.frameLt);
    for (let i = 3; i <= 7; i++) screen.set(ox + i, oy, '▄', C.frame);
    screen.set(ox + 8, oy, '▄', C.frameDk);

    // Row 1: head with eyes
    screen.set(ox + 1, oy + 1, '█', C.frameLt);
    screen.set(ox + 2, oy + 1, '█', C.frame);
    screen.set(ox + 3, oy + 1, ' ', null);
    screen.set(ox + 4, oy + 1, blink ? '─' : '◈', blink ? C.frame : C.eye);
    screen.set(ox + 5, oy + 1, ' ', null);
    screen.set(ox + 6, oy + 1, blink ? '─' : '◈', blink ? C.frame : C.eye);
    screen.set(ox + 7, oy + 1, ' ', null);
    screen.set(ox + 8, oy + 1, '█', C.frame);
    screen.set(ox + 9, oy + 1, '█', C.frameDk);

    // Row 2: mouth/speaker grille
    screen.set(ox + 1, oy + 2, '█', C.frameLt);
    screen.set(ox + 2, oy + 2, '█', C.frame);
    screen.set(ox + 3, oy + 2, '▄', C.screen);
    screen.set(ox + 4, oy + 2, '▄', C.screen);
    screen.set(ox + 5, oy + 2, '▄', C.screen);
    screen.set(ox + 6, oy + 2, '▄', C.screen);
    screen.set(ox + 7, oy + 2, '▄', C.screen);
    screen.set(ox + 8, oy + 2, '█', C.frame);
    screen.set(ox + 9, oy + 2, '█', C.frameDk);

    // Row 3: separator
    screen.set(ox + 1, oy + 3, '▐', C.frameLt);
    for (let i = 2; i <= 8; i++) screen.set(ox + i, oy + 3, '═', C.frame);
    screen.set(ox + 9, oy + 3, '▌', C.frameDk);

    // Row 4: body/chest with core
    screen.set(ox + 1, oy + 4, '▐', C.frameLt);
    screen.set(ox + 2, oy + 4, '█', C.frame);
    screen.set(ox + 3, oy + 4, '▒', C.vent);
    screen.set(ox + 4, oy + 4, '▒', C.vent);
    screen.set(ox + 5, oy + 4, '◆', coreColor);
    screen.set(ox + 6, oy + 4, '▒', C.vent);
    screen.set(ox + 7, oy + 4, '▒', C.vent);
    screen.set(ox + 8, oy + 4, '█', C.frame);
    screen.set(ox + 9, oy + 4, '▌', C.frameDk);

    // Row 5: body bottom
    screen.set(ox + 1, oy + 5, '▐', C.frameLt);
    for (let i = 2; i <= 8; i++) screen.set(ox + i, oy + 5, '█', C.frame);
    screen.set(ox + 9, oy + 5, '▌', C.frameDk);

    // Row 6: legs
    screen.set(ox + 2, oy + 6, '▀', C.frame);
    screen.set(ox + 3, oy + 6, '█', C.leg);
    screen.set(ox + 4, oy + 6, '▀', C.leg);
    screen.set(ox + 6, oy + 6, '▀', C.leg);
    screen.set(ox + 7, oy + 6, '█', C.leg);
    screen.set(ox + 8, oy + 6, '▀', C.frame);

    // Row 7: feet
    screen.set(ox + 3, oy + 7, '▀', C.leg);
    screen.set(ox + 7, oy + 7, '▀', C.leg);
  },
};

// ─── Hit reaction versions ───
function drawPlayerHit(screen, ox, oy, frame) {
  // Shake offset
  const shakeX = (frame % 2 === 0) ? 1 : -1;
  // Draw normal but offset + in rose color with glitch chars replacing some parts
  PLAYER_BACK.draw(screen, ox + shakeX, oy, colors.rose, frame);
  // Overlay some glitch characters
  const glitchChars = '╳╬▓░▒█';
  for (let i = 0; i < 4; i++) {
    const gx = ox + 3 + Math.floor(Math.random() * 8);
    const gy = oy + 2 + Math.floor(Math.random() * 6);
    screen.set(gx, gy, glitchChars[Math.floor(Math.random() * glitchChars.length)], colors.rose);
  }
}

function drawOpponentHit(screen, ox, oy, frame) {
  const shakeX = (frame % 2 === 0) ? 1 : -1;
  OPPONENT_FRONT.draw(screen, ox + shakeX, oy, colors.rose, frame);
  const glitchChars = '╳╬▓░▒█';
  for (let i = 0; i < 3; i++) {
    const gx = ox + 2 + Math.floor(Math.random() * 6);
    const gy = oy + 1 + Math.floor(Math.random() * 5);
    screen.set(gx, gy, glitchChars[Math.floor(Math.random() * glitchChars.length)], colors.rose);
  }
}

// ─── KO frames ───
function drawPlayerKO(screen, ox, oy) {
  // Collapsed/broken tower
  const d = colors.dim;
  screen.text(ox + 2, oy + 6, '▄▄▄▄▄▄▄▄▄▄', d);
  screen.text(ox + 2, oy + 7, '░░░░░░░░░░', d);
  screen.text(ox + 2, oy + 8, '▀▀▀▀▀▀▀▀▀▀', d);
  screen.text(ox + 3, oy + 5, 'x      x', colors.dimmer);
  screen.text(ox + 4, oy + 9, '░░░░░░', colors.dimmer);
}

function drawOpponentKO(screen, ox, oy) {
  const d = colors.dim;
  screen.text(ox + 1, oy + 4, '▄▄▄▄▄▄▄▄', d);
  screen.text(ox + 1, oy + 5, '░░░░░░░░', d);
  screen.text(ox + 1, oy + 6, '▀▀▀▀▀▀▀▀', d);
  screen.text(ox + 3, oy + 3, 'x    x', colors.dimmer);
}

module.exports = {
  PLAYER_BACK, OPPONENT_FRONT,
  drawPlayerHit, drawOpponentHit,
  drawPlayerKO, drawOpponentKO,
};
