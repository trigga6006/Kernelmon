// ═══════════════════════════════════════════════════════════════
// ROGUE MODE — Top-down exploration through a liminal grass field
// Walk around with WASD, encounter enemies, trigger battles.
// Grass bends based on movement direction. CodeSparkle ambient.
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, rgb, bgRgb, RESET } = require('./palette');
const { CodeSparkle } = require('./effects/matrix');
const { createRNG } = require('./rng');
const { getSprite } = require('./sprites');
const { classifyArchetype } = require('./profiler');
const { simulate } = require('./battle');
const { renderBattle } = require('./renderer');
const { combinedSeed } = require('./rng');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

// ─── Colors ───
const DIM       = rgb(45, 55, 50);
const DIMMER    = rgb(30, 38, 35);
const GRASS_1   = rgb(35, 85, 50);
const GRASS_2   = rgb(45, 100, 60);
const GRASS_3   = rgb(55, 120, 70);
const GRASS_LIT = rgb(75, 150, 90);
const GRASS_DK  = rgb(25, 60, 35);
const GROUND_1  = rgb(18, 22, 20);
const GROUND_2  = rgb(22, 28, 24);
const PLAYER_FG = rgb(230, 230, 245);
const BRIGHT    = rgb(230, 230, 245);
const LABEL     = rgb(130, 220, 235);
const GOLD      = rgb(255, 215, 0);
const ROSE      = rgb(240, 150, 170);
const ENEMY_FG  = rgb(240, 80, 80);
const ENEMY_FG2 = rgb(255, 200, 60);
const HUD_DIM   = rgb(80, 85, 100);
const HUD_BG    = bgRgb(14, 14, 22);

// ─── Grass characters by bend direction ───
const GRASS_UPRIGHT = [',', '.', "'", '`', ';', ':', '"', '∴', '·'];
const GRASS_BEND_R  = ['/', ')', '⟩', '›', '╱'];
const GRASS_BEND_L  = ['\\', '(', '⟨', '‹', '╲'];
const GRASS_BEND_D  = ['_', '‿', '⌣', '˯', ','];
const GRASS_BEND_U  = ['^', '˄', '⌃', "'", '`'];

// ─── Enemy definitions ───
const ENEMIES = [
  {
    key: 'wanderer',
    label: 'WANDERING PROCESS',
    desc: 'A stray daemon roaming the void.',
    specs: {
      cpu: { brand: 'Intel Core i5-10400', manufacturer: 'Intel', cores: 6, threads: 12, speed: 2.9, speedMax: 4.3 },
      ram: { totalGB: 16 },
      gpu: { model: 'NVIDIA GeForce GTX 1660 Super', vramMB: 6144, vendor: 'NVIDIA' },
      storage: { type: 'SSD' },
    },
    stats: { str: 52, vit: 48, mag: 45, spd: 55, def: 51, hp: 950, maxHp: 950 },
    id: 'rogue-wanderer-001',
    name: 'i5-10400',
    gpu: 'GTX 1660 Super',
    worldX: 55,
    worldY: -35,
    icon: '◈',
    iconColor: ENEMY_FG,
  },
  {
    key: 'sentinel',
    label: 'ROOT SENTINEL',
    desc: 'An ancient process. Overpowered. Guarding something.',
    specs: {
      cpu: { brand: 'AMD Ryzen 9 7950X', manufacturer: 'AMD', cores: 16, threads: 32, speed: 4.5, speedMax: 5.7 },
      ram: { totalGB: 64 },
      gpu: { model: 'NVIDIA GeForce RTX 4080', vramMB: 16384, vendor: 'NVIDIA' },
      storage: { type: 'NVMe', sizeGB: 2000, name: 'Samsung 990 Pro' },
    },
    stats: { str: 82, vit: 78, mag: 80, spd: 75, def: 78, hp: 1350, maxHp: 1350 },
    id: 'rogue-sentinel-001',
    name: 'Ryzen 9 7950X',
    gpu: 'RTX 4080 16GB',
    worldX: 110,
    worldY: -70,
    icon: '◆',
    iconColor: ENEMY_FG2,
  },
];

function buildEnemy(def) {
  const sprite = getSprite(def.specs);
  const archetype = classifyArchetype(def.stats, def.specs);
  return {
    id: def.id,
    name: def.name,
    gpu: def.gpu,
    stats: { ...def.stats },
    specs: def.specs,
    sprite,
    archetype,
  };
}

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL GRASS FIELD
// ═══════════════════════════════════════════════════════════════

class GrassField {
  constructor(rng) {
    this.rng = rng;
    // Bend state: map of "x,y" → { dir, intensity, age }
    this.bends = new Map();
    this.bendDecay = 0.08; // how fast bends fade per frame
    this.lastMoveDir = { dx: 0, dy: 0 };
  }

  // Get the base grass character + color for a world position
  grassAt(wx, wy) {
    // Deterministic hash for this position
    const h = this._hash(wx, wy);

    // ~40% of cells have grass (sparse, liminal feel)
    if (h % 100 > 38) return null;

    const charIdx = h % GRASS_UPRIGHT.length;
    const colorRoll = (h >> 8) % 5;
    const color = [GRASS_DK, GRASS_1, GRASS_2, GRASS_3, GRASS_LIT][colorRoll];

    return { char: GRASS_UPRIGHT[charIdx], color };
  }

  // Apply bend wave from player position
  applyMovement(px, py, dx, dy) {
    if (dx === 0 && dy === 0) return;
    this.lastMoveDir = { dx, dy };

    // Bend grass in a radius around the player
    const radius = 5;
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        const dist = Math.sqrt(ox * ox + oy * oy);
        if (dist > radius || dist < 1) continue;

        const wx = px + ox;
        const wy = py + oy;
        const key = `${wx},${wy}`;

        // Intensity falls off with distance
        const intensity = Math.max(0, 1 - (dist / radius));

        this.bends.set(key, {
          dx, dy,
          intensity: Math.min(1, intensity + 0.3),
          age: 0,
        });
      }
    }
  }

  // Decay all bends
  update() {
    for (const [key, bend] of this.bends) {
      bend.age++;
      bend.intensity -= this.bendDecay;
      if (bend.intensity <= 0) {
        this.bends.delete(key);
      }
    }
  }

  // Get the display character for a world cell (with bend applied)
  getDisplay(wx, wy) {
    const base = this.grassAt(wx, wy);
    if (!base) return null;

    const key = `${wx},${wy}`;
    const bend = this.bends.get(key);

    if (!bend || bend.intensity < 0.15) {
      return base;
    }

    // Pick bent character based on bend direction
    let chars;
    if (Math.abs(bend.dx) > Math.abs(bend.dy)) {
      chars = bend.dx > 0 ? GRASS_BEND_R : GRASS_BEND_L;
    } else {
      chars = bend.dy > 0 ? GRASS_BEND_D : GRASS_BEND_U;
    }

    const idx = Math.floor(bend.intensity * (chars.length - 1));
    // Brighter when freshly bent
    const color = bend.intensity > 0.6 ? GRASS_LIT : bend.intensity > 0.3 ? GRASS_3 : GRASS_2;

    return { char: chars[idx], color };
  }

  _hash(x, y) {
    let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
    h = ((h >> 13) ^ h) * 1274126177;
    h = ((h >> 16) ^ h);
    return Math.abs(h);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ROGUELIKE RENDERER
// ═══════════════════════════════════════════════════════════════

async function renderRogue(fighter) {
  // Ensure sprite is alive
  if (!fighter.sprite || typeof fighter.sprite.front?.draw !== 'function') {
    fighter.sprite = fighter.specs
      ? getSprite(fighter.specs)
      : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
  }

  const screen = new Screen();
  const rng = createRNG(Date.now());
  const sparkle = new CodeSparkle(screen.width, screen.height, rng, 18);
  const grass = new GrassField(rng);

  const w = screen.width;
  const h = screen.height;

  // ─── Player state ───
  let px = 0, py = 0;              // world position
  let moveDir = { dx: 0, dy: 0 };  // current frame movement
  let facing = 'down';              // last non-zero direction
  let frame = 0;

  // ─── Enemy state ───
  const enemyStates = ENEMIES.map(def => ({
    def,
    fighter: buildEnemy(def),
    alive: true,
    worldX: def.worldX,
    worldY: def.worldY,
    detected: false,   // player within detection range
    pulsePhase: Math.random() * Math.PI * 2,
  }));

  // ─── Movement tracking ───
  let moveUp = false, moveDown = false, moveLeft = false, moveRight = false;
  let moveSpeed = 1;  // cells per move tick
  let moveCooldown = 0;
  const MOVE_RATE = 3; // frames between moves (lower = faster)

  // ─── Game state ───
  let gameState = 'explore'; // 'explore' | 'battle_intro' | 'battling' | 'victory' | 'done'
  let battleTarget = null;
  let nearbyEnemy = null;    // enemy within interaction range
  let battlesWon = 0;
  let battleIntroFrame = 0;
  let victoryFrame = 0;
  let encounterFlash = 0;
  let statusMessage = '';
  let statusTimer = 0;

  // HUD exclusion zone (top 2 rows)
  sparkle.exclusionZones = [
    { x: 0, y: 0, w, h: 2 },
  ];

  screen.enter();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let resolveGame;
  const gamePromise = new Promise(r => { resolveGame = r; });

  function onKey(key) {
    // Quit
    if (key === '\x03' || key === 'q') {
      gameState = 'done';
      resolveGame({ battlesWon, reason: 'quit' });
      return;
    }

    if (gameState === 'victory') {
      if (victoryFrame > 40) {
        resolveGame({ battlesWon, reason: 'victory' });
      }
      return;
    }

    if (gameState !== 'explore') return;

    // ENTER to engage nearby enemy
    if ((key === '\r' || key === '\n' || key === ' ') && nearbyEnemy) {
      battleTarget = nearbyEnemy;
      gameState = 'battle_intro';
      battleIntroFrame = 0;
      return;
    }

    // WASD + arrow keys
    if (key === 'w' || key === '\x1b[A') moveUp = true;
    if (key === 's' || key === '\x1b[B') moveDown = true;
    if (key === 'a' || key === '\x1b[D') moveLeft = true;
    if (key === 'd' || key === '\x1b[C') moveRight = true;
  }

  // Track key releases via raw mode timing
  // (In raw mode we just get key presses, so we auto-clear each frame)

  stdin.on('data', onKey);

  // ─── Camera ───
  function cameraX() { return px - Math.floor(w / 2); }
  function cameraY() { return py - Math.floor(h / 2) + 1; } // +1 for HUD

  // ─── Draw ground cell ───
  function drawGroundCell(screenX, screenY, worldX, worldY) {
    // Ground tile — subtle checkerboard
    const isCheck = ((worldX + worldY) % 2 === 0);
    const groundChar = isCheck ? '·' : ' ';
    const groundColor = isCheck ? GROUND_2 : null;

    // Draw base ground (very subtle)
    if (groundColor) {
      screen.set(screenX, screenY, groundChar, DIM);
    }

    // Draw grass on top
    const g = grass.getDisplay(worldX, worldY);
    if (g) {
      screen.set(screenX, screenY, g.char, g.color);
    }
  }

  // ─── Render frame ───
  function renderFrame() {
    screen.clear();

    const cx = cameraX();
    const cy = cameraY();

    // Draw ground + grass for visible area
    for (let sy = 2; sy < h; sy++) { // skip top 2 rows for HUD
      for (let sx = 0; sx < w; sx++) {
        const worldX = cx + sx;
        const worldY = cy + sy;
        drawGroundCell(sx, sy, worldX, worldY);
      }
    }

    // Draw sparkle layer
    sparkle.draw(screen);

    // Draw enemies
    nearbyEnemy = null; // reset each frame
    for (const enemy of enemyStates) {
      if (!enemy.alive) continue;

      const ex = enemy.worldX - cx;
      const ey = enemy.worldY - cy;

      // Distance from player
      const dist = Math.sqrt(
        (enemy.worldX - px) ** 2 + (enemy.worldY - py) ** 2
      );

      enemy.detected = dist < 25;

      // Only render if on screen
      if (ex < -12 || ex > w + 12 || ey < 0 || ey > h + 12) continue;

      // Draw enemy sprite if close enough
      if (dist < 20 && enemy.fighter.sprite) {
        // Draw the front sprite centered on enemy position
        const spriteX = ex - 5;
        const spriteY = ey - 8;
        enemy.fighter.sprite.front.draw(screen, spriteX, spriteY, null, frame);
      } else if (dist < 40) {
        // Far away — just show icon
        const pulse = Math.sin(frame * 0.15 + enemy.pulsePhase) * 0.5 + 0.5;
        const iconColor = pulse > 0.5 ? enemy.def.iconColor : DIM;
        if (ey >= 2 && ey < h && ex >= 0 && ex < w) {
          screen.set(ex, ey, enemy.def.icon, iconColor);
        }
      }

      // Detection indicator
      if (enemy.detected && dist > 3) {
        const indicatorX = ex;
        const indicatorY = ey - (dist < 20 ? 10 : 2);
        if (indicatorY >= 2 && indicatorY < h && indicatorX >= 0 && indicatorX < w) {
          const excl = (frame % 20 < 10) ? '!' : '¡';
          screen.set(indicatorX, indicatorY, excl, ENEMY_FG);
        }
      }

      // Close enough to battle — show prompt and track as nearby
      if (dist < 5) {
        nearbyEnemy = enemy;

        const promptY = Math.max(2, ey - (dist < 20 ? 12 : 4));
        const promptText = `[ ENTER to battle ${enemy.def.label} ]`;
        const promptX = Math.floor(ex - promptText.length / 2);
        if (promptY >= 2 && promptY < h) {
          screen.text(Math.max(0, promptX), promptY, promptText, GOLD);
        }

        // Auto-engage on direct collision (same cell)
        if (px === enemy.worldX && py === enemy.worldY) {
          battleTarget = enemy;
          gameState = 'battle_intro';
          battleIntroFrame = 0;
        }
      }
    }

    // Draw player character
    const playerScreenX = px - cx;
    const playerScreenY = py - cy;

    // Draw a small player marker with facing indicator
    const facingChars = { up: '▲', down: '▼', left: '◄', right: '►' };
    if (playerScreenY >= 2 && playerScreenY < h && playerScreenX >= 0 && playerScreenX < w) {
      screen.set(playerScreenX, playerScreenY, '@', PLAYER_FG, null, true);

      // Facing indicator
      const fc = facingChars[facing] || '▼';
      const fy = facing === 'up' ? playerScreenY - 1 : facing === 'down' ? playerScreenY + 1 : playerScreenY;
      const fx = facing === 'left' ? playerScreenX - 1 : facing === 'right' ? playerScreenX + 1 : playerScreenX;
      if (fy >= 2 && fy < h && fx >= 0 && fx < w) {
        screen.set(fx, fy, fc, LABEL);
      }
    }

    // Encounter flash effect
    if (encounterFlash > 0) {
      encounterFlash--;
      if (encounterFlash % 4 < 2) {
        // Flash the screen edges
        for (let sy = 0; sy < h; sy++) {
          screen.set(0, sy, '█', ENEMY_FG);
          screen.set(w - 1, sy, '█', ENEMY_FG);
        }
        for (let sx = 0; sx < w; sx++) {
          screen.set(sx, 0, '█', ENEMY_FG);
          screen.set(sx, h - 1, '█', ENEMY_FG);
        }
      }
    }

    // Battle intro transition
    if (gameState === 'battle_intro') {
      battleIntroFrame++;
      const progress = Math.min(1, battleIntroFrame / 30);

      // Closing iris effect
      const centerX = Math.floor(w / 2);
      const centerY = Math.floor(h / 2);
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      const irisRadius = maxRadius * (1 - progress);

      for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
          const dist = Math.sqrt((sx - centerX) ** 2 + ((sy - centerY) * 2) ** 2);
          if (dist > irisRadius) {
            screen.set(sx, sy, ' ', null, bgRgb(5, 5, 8));
          }
        }
      }

      if (battleIntroFrame === 15) {
        encounterFlash = 10;
      }

      // Show enemy name during transition
      if (battleIntroFrame > 10 && battleTarget) {
        const nameText = `⚔ ${battleTarget.def.label} ⚔`;
        screen.centerText(centerY, nameText, ENEMY_FG, null, true);
      }
    }

    // Victory state
    if (gameState === 'victory') {
      victoryFrame++;
      const winText = '★ ALL ENEMIES DEFEATED ★';
      const subText = 'Press any key to exit';
      screen.centerText(Math.floor(h / 2) - 1, winText, GOLD, null, true);
      if (victoryFrame > 20) {
        screen.centerText(Math.floor(h / 2) + 1, subText, HUD_DIM);
      }
    }

    // ─── HUD ───
    // Top bar
    screen.hline(0, 1, w, '─', HUD_DIM);
    const posText = `(${px}, ${py})`;
    const modeText = `ROGUE MODE`;
    const killText = `Defeated: ${battlesWon}/${enemyStates.length}`;
    screen.text(2, 0, modeText, LABEL, null, true);
    screen.text(w - posText.length - 2, 0, posText, HUD_DIM);
    screen.text(Math.floor((w - killText.length) / 2), 0, killText, battlesWon > 0 ? GOLD : HUD_DIM);

    // Status message
    if (statusTimer > 0) {
      statusTimer--;
      screen.centerText(3, statusMessage, GOLD);
    }

    // Navigation hint
    if (frame < 100) {
      const hint = 'WASD / Arrow keys to move';
      screen.centerText(h - 2, hint, HUD_DIM);
    }

    // Enemy direction indicators (compass-style at screen edges)
    for (const enemy of enemyStates) {
      if (!enemy.alive) continue;
      const ex = enemy.worldX - cx;
      const ey = enemy.worldY - cy;

      // Only show arrow if enemy is off-screen
      if (ex >= 2 && ex < w - 2 && ey >= 3 && ey < h - 1) continue;

      const angle = Math.atan2(enemy.worldY - py, enemy.worldX - px);
      const arrowChars = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
      const idx = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
      const arrow = arrowChars[idx];

      // Place arrow at screen edge in the direction of the enemy
      const edgeX = Math.max(2, Math.min(w - 3, Math.floor(w / 2 + Math.cos(angle) * (w / 2 - 4))));
      const edgeY = Math.max(2, Math.min(h - 2, Math.floor(h / 2 + Math.sin(angle) * (h / 2 - 3))));

      const dist = Math.sqrt((enemy.worldX - px) ** 2 + (enemy.worldY - py) ** 2);
      const distText = `${Math.round(dist)}`;
      const arrowColor = dist < 30 ? enemy.def.iconColor : HUD_DIM;

      screen.set(edgeX, edgeY, arrow, arrowColor);
      screen.text(edgeX + 1, edgeY, distText, HUD_DIM);
    }

    screen.render();
  }

  // ─── Game loop ───
  async function gameLoop() {
    while (gameState !== 'done') {
      const start = Date.now();
      frame++;

      if (gameState === 'explore') {
        // Process movement
        moveCooldown--;
        if (moveCooldown <= 0) {
          let dx = 0, dy = 0;
          if (moveUp) dy = -moveSpeed;
          if (moveDown) dy = moveSpeed;
          if (moveLeft) dx = -moveSpeed;
          if (moveRight) dx = moveSpeed;

          if (dx !== 0 || dy !== 0) {
            px += dx;
            py += dy;
            moveDir = { dx, dy };
            grass.applyMovement(px, py, dx, dy);

            // Update facing
            if (Math.abs(dx) > Math.abs(dy)) {
              facing = dx > 0 ? 'right' : 'left';
            } else {
              facing = dy > 0 ? 'down' : 'up';
            }

            moveCooldown = MOVE_RATE;
          }
        }

        // Clear movement (tap-style, not held)
        moveUp = moveDown = moveLeft = moveRight = false;
      }

      if (gameState === 'battle_intro' && battleIntroFrame >= 30) {
        // Launch battle
        gameState = 'battling';
        const enemy = battleTarget;

        // Handoff screen to battle renderer
        screen.handoff();
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();

        // Run the battle
        const seed = combinedSeed(fighter.id, enemy.fighter.id);
        const events = simulate(fighter, enemy.fighter, seed);
        const winner = await renderBattle(fighter, enemy.fighter, events);

        // Battle finished — resume roguelike
        if (winner === 'a') {
          enemy.alive = false;
          battlesWon++;
          statusMessage = `★ ${enemy.def.label} DEFEATED ★`;
          statusTimer = 80;
        } else {
          statusMessage = `You were defeated... but you persist.`;
          statusTimer = 80;
        }

        battleTarget = null;

        // Move player away from enemy position to avoid re-trigger
        px -= 5;
        py -= 5;

        // Re-enter screen
        screen.enter();
        screen.resetDiff();
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', onKey);

        // Check win condition
        if (enemyStates.every(e => !e.alive)) {
          gameState = 'victory';
          victoryFrame = 0;
        } else {
          gameState = 'explore';
        }
      }

      // Update effects
      grass.update();
      sparkle.update();

      // Render
      if (gameState !== 'battling') {
        renderFrame();
      }

      // Frame timing
      const elapsed = Date.now() - start;
      const wait = Math.max(1, FRAME_MS - elapsed);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  gameLoop();

  const result = await gamePromise;

  // Cleanup
  stdin.removeListener('data', onKey);
  try {
    stdin.setRawMode(false);
    stdin.pause();
  } catch {}
  screen.exit();

  return result;
}

module.exports = { renderRogue };
