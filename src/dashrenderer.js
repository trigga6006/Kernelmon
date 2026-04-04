// ═══════════════════════════════════════════════════════════════
// GEOMETRY DASH MODE — Side-scrolling obstacle runner
// Your rig's fighter sprite sits center-left while the world
// scrolls right-to-left. Jump (single + double) to clear
// obstacles. Score based on distance survived.
// Uses the same Screen diff-renderer, palette, and effects
// as the rest of the game for visual consistency.
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors } = require('./palette');
const { CodeSparkle } = require('./effects/matrix');
const { GlitchEffect, FloatingText } = require('./effects/glitch');
const { createRNG } = require('./rng');
const { getSprite, THEMES } = require('./sprites');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

// ─── Physics constants ───
const GRAVITY = 0.55;          // gravity per frame (terminal rows/frame²)
const JUMP_VELOCITY = -2.8;    // initial upward velocity on jump
const DOUBLE_JUMP_VEL = -2.2;  // slightly weaker second jump
const MAX_FALL_SPEED = 3.2;    // terminal velocity

// ─── World scrolling ───
const BASE_SCROLL_SPEED = 4.0;   // cols/frame at start (~7x faster)
const MAX_SCROLL_SPEED = 10.0;   // cols/frame cap
const SPEED_RAMP_FRAMES = 2000;  // frames to reach max speed (~100s)

// ─── Obstacle generation (distance-based) ───
const MIN_GAP_COLS = 30;  // minimum cols between obstacles
const MAX_GAP_COLS = 58;  // maximum cols between obstacles

// ─── Obstacle types ───
const OBSTACLE_DEFS = [
  // Single spike
  { name: 'spike', w: 3, h: 3, ground: true,
    draw: (scr, x, y, theme, frame) => {
      scr.set(x + 1, y,     '▲', theme.accent);
      scr.set(x,     y + 1, '╱', theme.accentDk);
      scr.set(x + 1, y + 1, '█', theme.accent);
      scr.set(x + 2, y + 1, '╲', theme.accentDk);
      scr.set(x,     y + 2, '█', theme.frame);
      scr.set(x + 1, y + 2, '█', theme.frameLt);
      scr.set(x + 2, y + 2, '█', theme.frame);
    }},
  // Double spike
  { name: 'dspike', w: 6, h: 3, ground: true,
    draw: (scr, x, y, theme) => {
      scr.set(x + 1, y,     '▲', theme.accent);
      scr.set(x + 4, y,     '▲', theme.accent);
      scr.set(x,     y + 1, '╱', theme.accentDk);
      scr.set(x + 1, y + 1, '█', theme.accent);
      scr.set(x + 2, y + 1, '╲', theme.accentDk);
      scr.set(x + 3, y + 1, '╱', theme.accentDk);
      scr.set(x + 4, y + 1, '█', theme.accent);
      scr.set(x + 5, y + 1, '╲', theme.accentDk);
      for (let i = 0; i < 6; i++) scr.set(x + i, y + 2, '█', theme.frame);
    }},
  // Short wall
  { name: 'wall_s', w: 2, h: 2, ground: true,
    draw: (scr, x, y, theme) => {
      scr.set(x,     y,     '▓', theme.frameLt);
      scr.set(x + 1, y,     '▓', theme.frameDk);
      scr.set(x,     y + 1, '█', theme.frame);
      scr.set(x + 1, y + 1, '█', theme.frameDk);
    }},
  // Tall wall (needs double jump or precise timing)
  { name: 'wall_t', w: 2, h: 4, ground: true,
    draw: (scr, x, y, theme) => {
      scr.set(x,     y,     '▓', theme.frameLt);
      scr.set(x + 1, y,     '▓', theme.frameDk);
      scr.set(x,     y + 1, '▒', theme.frame);
      scr.set(x + 1, y + 1, '▒', theme.frameDk);
      scr.set(x,     y + 2, '█', theme.frame);
      scr.set(x + 1, y + 2, '█', theme.frameDk);
      scr.set(x,     y + 3, '█', theme.frameLt);
      scr.set(x + 1, y + 3, '█', theme.frame);
    }},
  // Triple spike
  { name: 'tspike', w: 9, h: 3, ground: true,
    draw: (scr, x, y, theme) => {
      for (let s = 0; s < 3; s++) {
        const sx = x + s * 3;
        scr.set(sx + 1, y,     '▲', theme.accent);
        scr.set(sx,     y + 1, '╱', theme.accentDk);
        scr.set(sx + 1, y + 1, '█', theme.accent);
        scr.set(sx + 2, y + 1, '╲', theme.accentDk);
      }
      for (let i = 0; i < 9; i++) scr.set(x + i, y + 2, '█', theme.frame);
    }},
  // Floating block (mid-air obstacle — jump over or slide under)
  { name: 'float', w: 4, h: 2, ground: false, floatY: -6,
    draw: (scr, x, y, theme, frame) => {
      const glow = (frame % 20) < 10;
      const c = glow ? theme.core : theme.coreDk;
      for (let i = 0; i < 4; i++) {
        scr.set(x + i, y,     '▄', c);
        scr.set(x + i, y + 1, '█', theme.frameDk);
      }
    }},
  // Gap (hole in ground — drawn by erasing ground tiles)
  { name: 'gap', w: 5, h: 0, ground: true, isGap: true,
    draw: () => {} },
  // Saw blade
  { name: 'saw', w: 3, h: 3, ground: true,
    draw: (scr, x, y, theme, frame) => {
      const spin = frame % 4;
      const chars = ['◯', '◎', '◉', '◎'];
      scr.set(x + 1, y,     chars[spin], theme.accent);
      scr.set(x,     y + 1, '─', theme.accentDk);
      scr.set(x + 1, y + 1, chars[(spin + 2) % 4], colors.rose);
      scr.set(x + 2, y + 1, '─', theme.accentDk);
      scr.set(x,     y + 2, '█', theme.frame);
      scr.set(x + 1, y + 2, '█', theme.frameLt);
      scr.set(x + 2, y + 2, '█', theme.frame);
    }},
  // Laser beam (slide under or double-jump over)
  { name: 'laser', w: 14, h: 2, ground: false, floatY: -7,
    draw: (scr, x, y, theme, frame) => {
      const pulse = Math.sin(frame * 0.3) > 0;
      const c1 = pulse ? colors.rose : theme.accent;
      const c2 = pulse ? theme.accent : colors.rose;
      for (let i = 1; i < 13; i++) {
        scr.set(x + i, y,     '═', c1);
        scr.set(x + i, y + 1, '═', c2);
      }
      scr.set(x,      y,     '╠', theme.frameLt);
      scr.set(x + 13, y,     '╣', theme.frameLt);
      scr.set(x,      y + 1, '╠', theme.frameDk);
      scr.set(x + 13, y + 1, '╣', theme.frameDk);
    }},
  // Pillar — narrow but tall, needs a well-timed jump
  { name: 'pillar', w: 2, h: 5, ground: true,
    draw: (scr, x, y, theme, frame) => {
      const shimmer = (frame + x) % 10 < 5;
      for (let r = 0; r < 5; r++) {
        const c = r === 0 ? theme.frameLt : (shimmer && r === 1 ? theme.core : theme.frame);
        scr.set(x,     y + r, '█', c);
        scr.set(x + 1, y + r, '▓', theme.frameDk);
      }
    }},
];

// Difficulty tiers: which obstacles appear and gap distance adjustment (cols)
const DIFFICULTY_TIERS = [
  { minScore:    0, obstacles: ['spike', 'wall_s'],                                                              colBonus: 18 },
  { minScore:  300, obstacles: ['spike', 'wall_s', 'dspike', 'saw'],                                            colBonus: 10 },
  { minScore:  800, obstacles: ['spike', 'wall_s', 'dspike', 'wall_t', 'saw', 'tspike'],                        colBonus: 0  },
  { minScore: 1500, obstacles: ['spike', 'dspike', 'wall_t', 'tspike', 'saw', 'float', 'pillar'],               colBonus: -5 },
  { minScore: 2500, obstacles: ['spike', 'dspike', 'wall_t', 'tspike', 'saw', 'float', 'pillar', 'laser', 'gap'], colBonus: -10 },
];

function getDifficulty(score) {
  let tier = DIFFICULTY_TIERS[0];
  for (const t of DIFFICULTY_TIERS) {
    if (score >= t.minScore) tier = t;
  }
  return tier;
}


// ═══════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════

async function renderDash(fighter) {
  // Ensure sprite is alive (functions don't survive JSON serialization)
  if (!fighter.sprite || typeof fighter.sprite.front?.draw !== 'function') {
    fighter.sprite = fighter.specs
      ? getSprite(fighter.specs)
      : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
  }

  const screen = new Screen();
  const rng = createRNG(Date.now());
  const sparkle = new CodeSparkle(screen.width, screen.height, rng, 15);
  const glitch = new GlitchEffect(rng);
  const floats = new FloatingText();

  const w = screen.width;
  const h = screen.height;
  const theme = fighter.sprite.theme || THEMES.generic;

  // ─── Layout ───
  const GROUND_Y = h - 5;                 // ground surface row
  const PLAYER_X = Math.floor(w * 0.15);  // center-left fixed X
  const SPRITE_H = 8;                     // front sprite is ~8 rows tall
  const SPRITE_W = 10;                    // front sprite is ~10 cols wide
  const groundBaseY = GROUND_Y - SPRITE_H; // resting Y position (sprite top when on ground)

  // ─── Player state ───
  let playerY = groundBaseY;
  let velocityY = 0;
  let jumpsLeft = 2;
  let onGround = true;

  // ─── Slide / fast-fall ───
  let isSliding = false;
  let slideTimer = 0;
  let slideCooldown = 0;
  const SLIDE_DURATION = 10;   // frames of slide
  const SLIDE_COOLDOWN = 12;   // frames before next slide

  // ─── World state ───
  let scrollAccum = 0;          // fractional accumulator for sub-pixel scrolling
  let scrollSpeed = BASE_SCROLL_SPEED;
  let obstacles = [];
  let nextObstacleIn = 20;      // frames until next obstacle spawn
  let score = 0;
  let frameCount = 0;
  let gameState = 'ready';      // 'ready' | 'running' | 'dead' | 'exit'

  // Death animation
  let deathFrame = 0;
  const DEATH_ANIM_FRAMES = 40;

  // Ready state
  let readyPulse = 0;

  // Floor tile offset for scrolling ground
  let floorOffset = 0;

  // Background parallax — slow-scrolling ceiling dots
  let bgOffset = 0;

  // Sparkle exclusion — keep sparkles out of the HUD and ground areas
  sparkle.exclusionZones = [
    { x: 0, y: 0, w, h: 2 },
    { x: 0, y: GROUND_Y, w, h: h - GROUND_Y },
  ];

  screen.enter();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let resolveGame;
  const gamePromise = new Promise(r => { resolveGame = r; });

  function onKey(key) {
    if (key === '\x03' || key === 'q') {
      gameState = 'exit';
      resolveGame({ score, reason: 'quit' });
      return;
    }

    if (gameState === 'ready') {
      if (key === ' ' || key === '\x1b[A' || key === '\r' || key === '\n' || key === 'w') {
        gameState = 'running';
        velocityY = JUMP_VELOCITY;
        jumpsLeft = 1;
        onGround = false;
      }
      return;
    }

    if (gameState === 'dead') {
      if (deathFrame >= DEATH_ANIM_FRAMES) {
        resolveGame({ score, reason: 'dead' });
      }
      return;
    }

    if (gameState === 'running') {
      if (key === ' ' || key === '\x1b[A' || key === 'w') {
        // Cancel slide on jump
        if (isSliding) { isSliding = false; slideTimer = 0; }
        if (onGround) {
          velocityY = JUMP_VELOCITY;
          jumpsLeft = 1;
          onGround = false;
        } else if (jumpsLeft > 0) {
          velocityY = DOUBLE_JUMP_VEL;
          jumpsLeft = 0;
          // Double-jump burst
          glitch.scatter(PLAYER_X + SPRITE_W / 2, playerY + SPRITE_H, 6, 2, 4, 4);
        }
      }
      // Slide (ground) / fast-fall (air)
      if (key === '\x1b[B' || key === 's') {
        if (onGround && !isSliding && slideCooldown <= 0) {
          isSliding = true;
          slideTimer = SLIDE_DURATION;
          slideCooldown = SLIDE_COOLDOWN;
        } else if (!onGround) {
          velocityY = MAX_FALL_SPEED; // fast-fall
        }
      }
    }
  }

  stdin.on('data', onKey);

  // ─── Obstacle spawning ───
  function spawnObstacle() {
    const tier = getDifficulty(score);
    const defName = rng.pick(tier.obstacles);
    const def = OBSTACLE_DEFS.find(d => d.name === defName) || OBSTACLE_DEFS[0];
    const worldX = w + 5;

    let obstY;
    if (def.ground === false && def.floatY !== undefined) {
      obstY = GROUND_Y + def.floatY;
    } else {
      obstY = GROUND_Y - def.h;
    }

    obstacles.push({ def, x: worldX, y: obstY, scored: false });

    // Distance-based gaps — scales naturally with speed
    const gapCols = rng.int(MIN_GAP_COLS, MAX_GAP_COLS) + tier.colBonus;
    nextObstacleIn = Math.max(4, Math.ceil(Math.max(20, gapCols) / scrollSpeed));
  }

  // ─── Collision detection (swept for high-speed tunneling prevention) ───
  function checkCollision(scrollPx) {
    const px1 = PLAYER_X + 2;
    const px2 = PLAYER_X + SPRITE_W - 2;
    // Slide halves the hitbox — only bottom half counts
    const py1 = isSliding ? playerY + Math.floor(SPRITE_H / 2) : playerY + 1;
    const py2 = playerY + SPRITE_H - 1;

    for (const obs of obstacles) {
      if (obs.def.isGap) {
        // Gap — die if player is on ground AND overlapping the hole
        if (onGround && playerY >= groundBaseY && !isSliding) {
          const gx1 = Math.floor(obs.x);
          const gx2 = gx1 + obs.def.w;
          const pCenter = (px1 + px2) / 2;
          if (pCenter > gx1 + 1 && pCenter < gx2 - 1) return true;
        }
        continue;
      }

      const ox1 = Math.floor(obs.x);
      // Swept: extend right edge to cover where obstacle was last frame
      // Skip sweep for scored (already cleared) obstacles to avoid false positives
      const ox2 = ox1 + obs.def.w + (obs.scored ? 0 : (scrollPx || 0));
      const oy1 = obs.y;
      const oy2 = obs.y + obs.def.h;

      if (px2 > ox1 && px1 < ox2 && py2 > oy1 && py1 < oy2) {
        return true;
      }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  const renderLoop = setInterval(() => {
    frameCount++;
    screen.clear();

    // ─── UPDATE ───
    if (gameState === 'running') {
      // Ramp scroll speed smoothly
      const progress = Math.min(frameCount / SPEED_RAMP_FRAMES, 1);
      scrollSpeed = BASE_SCROLL_SPEED + (MAX_SCROLL_SPEED - BASE_SCROLL_SPEED) * progress;

      // Sub-pixel scrolling accumulator (same pattern as MatrixRain columns)
      scrollAccum += scrollSpeed;
      const scrollPixels = Math.floor(scrollAccum);
      scrollAccum -= scrollPixels;

      // Scroll floor tiles
      floorOffset = (floorOffset + scrollPixels) % 4;

      // Parallax background
      bgOffset += scrollSpeed * 0.3;

      // Move obstacles
      for (const obs of obstacles) {
        obs.x -= scrollPixels;
      }

      // Score — 100 per obstacle cleared
      for (const obs of obstacles) {
        if (!obs.scored && obs.x + obs.def.w < PLAYER_X) {
          obs.scored = true;
          score += 100;
          floats.add(PLAYER_X + SPRITE_W + 2, playerY, '+100', colors.gold, 12);
        }
      }

      // Distance score
      if (frameCount % 3 === 0) score++;

      // Remove offscreen obstacles
      obstacles = obstacles.filter(o => o.x + o.def.w > -5);

      // Spawn new obstacles
      nextObstacleIn--;
      if (nextObstacleIn <= 0) spawnObstacle();

      // ─── Physics (update AFTER scroll so collision uses current frame positions) ───
      velocityY += GRAVITY;
      if (velocityY > MAX_FALL_SPEED) velocityY = MAX_FALL_SPEED;
      playerY += velocityY;

      // Ground collision
      if (playerY >= groundBaseY) {
        playerY = groundBaseY;
        velocityY = 0;
        jumpsLeft = 2;
        onGround = true;
      }

      // Slide timer
      if (isSliding) {
        slideTimer--;
        if (slideTimer <= 0) { isSliding = false; slideTimer = 0; }
      }
      if (slideCooldown > 0) slideCooldown--;

      // Obstacle collision (swept to prevent tunneling at high speed)
      if (checkCollision(scrollPixels)) {
        gameState = 'dead';
        deathFrame = 0;
        isSliding = false; slideTimer = 0;
        glitch.burst(PLAYER_X + SPRITE_W / 2, playerY + SPRITE_H / 2, 8, 12);
        glitch.screenTear(w, 6);
      }
    } else if (gameState === 'dead') {
      deathFrame++;
      // Slow-mo scroll for drama during first 10 frames
      if (deathFrame < 10) {
        for (const obs of obstacles) obs.x -= 0.2;
      }
    } else if (gameState === 'ready') {
      readyPulse++;
    }

    // Effects update
    sparkle.update();
    glitch.update();
    floats.update();

    // ─── DRAW ───

    // Background — parallax ceiling dots
    drawBackground(screen, w, h, GROUND_Y, bgOffset, frameCount);

    // Background sparkles
    sparkle.draw(screen);

    // Ground + scrolling floor
    drawGround(screen, w, h, GROUND_Y, floorOffset, theme, obstacles);

    // Obstacles
    for (const obs of obstacles) {
      const ox = Math.floor(obs.x);
      if (ox + obs.def.w < 0 || ox >= w) continue;
      obs.def.draw(screen, ox, obs.y, theme, frameCount);
    }

    // Player sprite
    const drawY = Math.floor(playerY);
    if (gameState !== 'dead' || deathFrame < 15) {
      if (gameState === 'dead') {
        fighter.sprite.drawFrontHit(screen, PLAYER_X, drawY, frameCount);
      } else if (isSliding) {
        // Slide visual — draw sprite shifted down (crouching) with speed lines
        fighter.sprite.front.draw(screen, PLAYER_X, drawY + 3, null, frameCount);
        for (let i = 0; i < 4; i++) {
          const lx = PLAYER_X - 1 - rng.int(0, 5);
          const ly = drawY + 4 + rng.int(0, 3);
          if (ly < GROUND_Y && lx >= 0) screen.set(lx, ly, '─', theme.core);
        }
      } else {
        fighter.sprite.front.draw(screen, PLAYER_X, drawY, null, frameCount);
      }

      // Jump trail particles (below feet when airborne)
      if (!onGround && gameState === 'running') {
        const trailChars = '·•*+';
        for (let i = 0; i < 2; i++) {
          const tx = PLAYER_X + rng.int(2, SPRITE_W - 2);
          const ty = drawY + SPRITE_H + rng.int(0, 1);
          if (ty >= 0 && ty < GROUND_Y) {
            screen.set(tx, ty, trailChars[rng.int(0, trailChars.length - 1)], theme.core);
          }
        }
      }
    } else {
      fighter.sprite.drawFrontKO(screen, PLAYER_X, drawY);
    }

    // Effects overlay
    glitch.draw(screen);
    floats.draw(screen);

    // HUD
    drawHUD(screen, w, h, score, scrollSpeed, gameState, frameCount, readyPulse, jumpsLeft, isSliding, slideCooldown, fighter, theme);

    // Death overlay
    if (gameState === 'dead') {
      drawDeathOverlay(screen, w, h, score, deathFrame, DEATH_ANIM_FRAMES);
    }

    screen.render();

    if (gameState === 'exit') {
      clearInterval(renderLoop);
    }
  }, FRAME_MS);

  const result = await gamePromise;

  clearInterval(renderLoop);
  stdin.removeListener('data', onKey);
  try { stdin.setRawMode(false); } catch (e) {}
  try { stdin.pause(); } catch (e) {}
  screen.exit();

  return result;
}


// ═══════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════

function drawBackground(screen, w, h, groundY, bgOffset, frame) {
  // Parallax ceiling dots — very subtle moving decoration
  for (let x = 0; x < w; x++) {
    if ((x + Math.floor(bgOffset)) % 12 === 0) {
      screen.set(x, 3, '·', colors.ghost);
    }
    if ((x + Math.floor(bgOffset * 0.7)) % 16 === 0) {
      screen.set(x, 5, '·', colors.ghost);
    }
    if ((x + Math.floor(bgOffset * 0.5)) % 20 === 0) {
      screen.set(x, 7, '·', colors.ghost);
    }
  }
}

function drawGround(screen, w, h, groundY, floorOffset, theme, obstacles) {
  // Collect gap ranges to skip ground drawing
  const gaps = [];
  for (const obs of obstacles) {
    if (obs.def.isGap) {
      gaps.push({ x1: Math.floor(obs.x), x2: Math.floor(obs.x) + obs.def.w });
    }
  }

  function inGap(x) {
    for (const g of gaps) {
      if (x >= g.x1 && x < g.x2) return true;
    }
    return false;
  }

  // Surface line
  for (let x = 0; x < w; x++) {
    if (inGap(x)) {
      // Draw gap edges
      if (x > 0 && !inGap(x - 1)) screen.set(x, groundY, '╲', colors.dimmer);
      else if (x < w - 1 && !inGap(x + 1)) screen.set(x, groundY, '╱', colors.dimmer);
      continue;
    }
    screen.set(x, groundY, '▀', theme.frameLt);
  }

  // Ground fill rows
  const groundChars = ['═', '─', '═', '─'];
  for (let row = 1; row <= 3; row++) {
    const y = groundY + row;
    if (y >= h) break;
    for (let x = 0; x < w; x++) {
      if (inGap(x)) continue;
      const tileIdx = (x + floorOffset + row) % 4;
      const fg = row === 1 ? theme.frame : (row === 2 ? theme.frameDk : theme.shadow);
      screen.set(x, y, groundChars[tileIdx], fg);
    }
  }
}

function drawHUD(screen, w, h, score, speed, gameState, frame, readyPulse, jumpsLeft, isSliding, slideCooldown, fighter, theme) {
  // Score
  const scoreStr = `SCORE: ${score}`;
  screen.text(2, 0, scoreStr, colors.gold, null, true);

  // Speed indicator
  const speedPct = Math.floor((speed / MAX_SCROLL_SPEED) * 100);
  const speedStr = `SPEED: ${speedPct}%`;
  screen.text(w - speedStr.length - 2, 0, speedStr, colors.cyan);

  // Fighter name
  const name = fighter.name || 'UNKNOWN';
  const nameX = Math.floor((w - name.length) / 2);
  screen.text(nameX, 0, name, colors.white, null, true);

  // Top separator
  screen.hline(0, 1, w, '─', colors.dimmer);

  // Bottom separator
  screen.hline(0, h - 3, w, '─', colors.ghost);

  // Controls + jump/slide indicator
  if (gameState === 'ready') {
    const pulse = readyPulse % 30 < 15;
    screen.centerText(h - 2, pulse ? '[ SPACE / ↑  to JUMP ]' : '[ Press any key to START ]', colors.dim);
  } else if (gameState === 'running') {
    screen.text(2, h - 2, '↑ Jump  ↓ Slide', colors.ghost);
    screen.text(w - 8, h - 2, 'Q Quit', colors.ghost);

    // Jump pips — filled = available, empty = used
    const pip1 = jumpsLeft >= 1 ? '◆' : '◇';
    const pip2 = jumpsLeft >= 2 ? '◆' : '◇';
    const pipColor = jumpsLeft > 0 ? theme.core : colors.ghost;
    screen.text(19, h - 2, pip1 + pip2, pipColor);

    // Slide indicator
    if (isSliding) {
      screen.text(23, h - 2, '▸SLIDE', colors.gold);
    } else if (slideCooldown > 0) {
      screen.text(23, h - 2, '▸ ···', colors.ghost);
    }
  } else if (gameState === 'dead') {
    screen.centerText(h - 2, '[ Press any key to continue ]', colors.dim);
  }

  // Mode label
  screen.text(w - 14, h - 1, '─ DASH MODE ─', colors.dimmer);
}

function drawDeathOverlay(screen, w, h, score, deathFrame, maxFrames) {
  if (deathFrame > 10) {
    const boxW = 30;
    const boxH = 7;
    const bx = Math.floor((w - boxW) / 2);
    const by = Math.floor((h - boxH) / 2);

    // Clear the box area for readability
    for (let oy = by; oy < by + boxH; oy++) {
      for (let ox = bx; ox < bx + boxW; ox++) {
        screen.set(ox, oy, ' ');
      }
    }

    screen.box(bx, by, boxW, boxH, colors.rose);
    screen.centerText(by + 1, '╳ CRASHED ╳', colors.rose, null, true);
    screen.centerText(by + 3, `Score: ${score}`, colors.gold, null, true);

    if (deathFrame > 25) {
      screen.centerText(by + 5, 'Press any key', colors.dim);
    }
  }
}


module.exports = { renderDash };
