// ═══════════════════════════════════════════════════════════════
// EXPLORE MODE — Open-world single-player with procedural biomes
// Walk freely in 4 directions from a crossroads. Biomes shift as
// you travel. Fight enemies, visit shops, spend credits on gear.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { Screen } = require('./screen');
const { colors, rgb, bgRgb, RESET } = require('./palette');
const { CodeSparkle } = require('./effects/matrix');
const { createRNG, combinedSeed } = require('./rng');
const { getSprite } = require('./sprites');
const { simulate } = require('./battle');
const { renderBattle } = require('./renderer');
const { getEquippedMoves, assignMoveset } = require('./moveset');
const { registerSignatureAnims } = require('./effects/projectile');
const {
  createWorld, BIOMES, ITEM_PRICES, SHOP_TILES, SHOP_NPC_DX, SHOP_NPC_DY,
  SHOP_INTERACT_RADIUS, STRUCT_FG, STRUCT_ACCENT, NPC_COLOR, SHOP_ICON_CLR,
  ROAD_BG, ROAD_MARK, isRoad, hash,
} = require('./world');
const { calculateBattleCredits, addCredits, spendCredits, getBalance } = require('./credits');
const { rollRewards, addItem } = require('./items');
const { saveMatch } = require('./history');

let renderTurnBattle;
try { renderTurnBattle = require('./turnrenderer').renderTurnBattle; } catch (e) {}

// ─── Constants ───
const FPS = 20;
const FRAME_MS = 1000 / FPS;
const HORIZONTAL_STEP = 1.6;
const KEY_LINGER_MS = 160;
const MOVE_INTERVAL_MS = 70;
const PAUSE_OPTIONS = ['RESUME RUN', 'SAVE GAME', 'RETURN TO MENU'];
const RARITY_COLORS = {
  common:    rgb(160, 165, 180),
  uncommon:  rgb(140, 230, 180),
  rare:      rgb(140, 190, 250),
  epic:      rgb(200, 170, 240),
  legendary: rgb(240, 220, 140),
};

// ─── Colors ───
const PLAYER_FG    = rgb(230, 230, 245);
const BRIGHT       = rgb(230, 230, 245);
const LABEL        = rgb(130, 220, 235);
const GOLD         = rgb(255, 215, 0);
const ENEMY_FG     = rgb(240, 80, 80);
const HUD_DIM      = rgb(80, 85, 100);
const DIM          = rgb(45, 55, 50);
const CROSSRD_CLR  = rgb(200, 185, 120);

// ─── Grass bending characters ───
const GRASS_BEND_R = ['/', ')', '⟩', '›', '╱'];
const GRASS_BEND_L = ['\\', '(', '⟨', '‹', '╲'];
const GRASS_BEND_D = ['_', '‿', '⌣', '˯', ','];
const GRASS_BEND_U = ['^', '˄', '⌃', "'", '`'];

// ═══════════════════════════════════════════════════════════════
// BEND TRACKER — movement ripple overlay on top of biome grass
// ═══════════════════════════════════════════════════════════════

class BendTracker {
  constructor() {
    this.bends = new Map();
    this.decay = 0.08;
  }

  applyMovement(px, py, dx, dy) {
    if (dx === 0 && dy === 0) return;
    const radius = 5;
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        const d = Math.sqrt(ox * ox + oy * oy);
        if (d > radius || d < 1) continue;
        const k = `${px + ox},${py + oy}`;
        this.bends.set(k, {
          dx, dy,
          intensity: Math.min(1, Math.max(0, 1 - d / radius) + 0.3),
          age: 0,
        });
      }
    }
  }

  update() {
    for (const [k, b] of this.bends) {
      b.age++;
      b.intensity -= this.decay;
      if (b.intensity <= 0) this.bends.delete(k);
    }
  }

  getBend(wx, wy) {
    const b = this.bends.get(`${wx},${wy}`);
    if (!b || b.intensity < 0.15) return null;
    let chars;
    if (Math.abs(b.dx) > Math.abs(b.dy)) {
      chars = b.dx > 0 ? GRASS_BEND_R : GRASS_BEND_L;
    } else {
      chars = b.dy > 0 ? GRASS_BEND_D : GRASS_BEND_U;
    }
    return {
      char: chars[Math.floor(b.intensity * (chars.length - 1))],
      intensity: b.intensity,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SAVE SYSTEM — persist exploration progress to disk
// ═══════════════════════════════════════════════════════════════

const SAVE_DIR = path.join(__dirname, '..', '.kernelmon');
const SAVE_FILE = path.join(SAVE_DIR, 'explore_save.json');

function loadSave() {
  try {
    if (!fs.existsSync(SAVE_FILE)) return null;
    return JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
  } catch { return null; }
}

function writeSave(data) {
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
  fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
}

function deleteSave() {
  try { if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPLORATION RENDERER
// ═══════════════════════════════════════════════════════════════

async function renderRogue(fighter, options = {}) {
  const battleMode = options.battleMode === 'turn' ? 'turn' : 'auto';
  const useTurnBattles = battleMode === 'turn' && !!renderTurnBattle;

  // Ensure player sprite
  if (!fighter.sprite || typeof fighter.sprite.front?.draw !== 'function') {
    fighter.sprite = fighter.specs
      ? getSprite(fighter.specs)
      : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
  }

  const screen = new Screen();
  const existingSave = loadSave();
  let worldSeed = existingSave ? existingSave.worldSeed : Date.now();
  let world = createWorld(worldSeed);
  const rng = createRNG(Date.now());
  const bends = new BendTracker();
  const sparkle = new CodeSparkle(screen.width, screen.height, rng, 18);
  const playerTheme = fighter.sprite?.theme || {};
  const playerCore   = playerTheme.core || playerTheme.accent || PLAYER_FG;
  const playerAccent = playerTheme.accent || LABEL;
  const playerAccDk  = playerTheme.accentDk || HUD_DIM;
  const playerTrim   = playerTheme.frameLt || BRIGHT;

  const w = screen.width;
  const h = screen.height;

  // ─── Player state (restored from save if loading) ───
  let px = existingSave ? existingSave.px || 0 : 0;
  let py = existingSave ? existingSave.py || 0 : 0;
  let facing = existingSave ? existingSave.facing || 'down' : 'down';
  let frame = 0;

  // ─── Movement ───
  let keyTimes = { up: 0, down: 0, left: 0, right: 0 };
  let lastMoveAt = 0;

  // ─── Game state ───
  let gameState = existingSave ? 'pregame' : 'explore';
  let battleTarget = null;
  let nearbyEnemy = null;
  let nearbyShop = null;
  let battlesWon = existingSave ? existingSave.battlesWon || 0 : 0;
  let battleIntroFrame = 0;
  let encounterFlash = 0;
  let statusMsg = '';
  let statusTimer = 0;
  let statusMsg2 = '';
  let statusTimer2 = 0;
  let pauseSelection = 0;
  let pregameSelection = 0;

  // ─── Shop state ───
  let shopSelection = 0;
  let activeShop = null;

  // ─── Defeated tracking (persists across chunk eviction) ───
  const defeatedEnemies = new Set(existingSave ? existingSave.defeatedEnemies || [] : []);

  sparkle.exclusionZones = [{ x: 0, y: 0, w, h: 2 }];

  screen.enter();
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let resolveGame;
  const gamePromise = new Promise(r => { resolveGame = r; });

  // ─── Helpers ───
  function cellX() { return Math.round(px); }
  function cellY() { return Math.round(py); }
  function camX() { return cellX() - Math.floor(w / 2); }
  function camY() { return cellY() - Math.floor(h / 2) + 1; }
  function setStatus(msg, msg2) {
    statusMsg = msg; statusTimer = 90;
    statusMsg2 = msg2 || ''; statusTimer2 = msg2 ? 90 : 0;
  }

  function facingFrom(dx, dy) {
    if (dx > 0 && dy < 0) return 'up_right';
    if (dx < 0 && dy < 0) return 'up_left';
    if (dx > 0 && dy > 0) return 'down_right';
    if (dx < 0 && dy > 0) return 'down_left';
    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
    if (dy < 0) return 'up';
    if (dy > 0) return 'down';
    return facing;
  }

  // ─── Input ───
  function splitKeys(input) {
    const keys = [];
    for (let i = 0; i < input.length; i++) {
      if (input[i] === '\x1b' && input[i + 1] === '[' && input[i + 2]) {
        keys.push(input.slice(i, i + 3)); i += 2;
      } else { keys.push(input[i]); }
    }
    return keys;
  }

  function onKey(input) {
    for (const rawKey of splitKeys(input)) {
      const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;

      // Quit
      if (key === '\x03' || key === 'q') {
        gameState = 'done';
        resolveGame({ battlesWon, reason: 'quit' });
        return;
      }

      // ── Pregame menu (continue / new game) ──
      if (gameState === 'pregame') {
        if (key === 'w' || key === 'k' || key === '\x1b[A') { pregameSelection = 0; return; }
        if (key === 's' || key === 'j' || key === '\x1b[B') { pregameSelection = 1; return; }
        if (key === '\r' || key === '\n' || key === ' ') {
          if (pregameSelection === 0) {
            gameState = 'explore';
            setStatus('Save loaded!');
          } else {
            worldSeed = Date.now();
            world = createWorld(worldSeed);
            px = 0; py = 0; facing = 'down';
            battlesWon = 0;
            defeatedEnemies.clear();
            deleteSave();
            gameState = 'explore';
          }
          return;
        }
        return;
      }

      // ── Shopping state ──
      if (gameState === 'shopping') {
        if (key === '\x1b') {
          gameState = 'explore';
          activeShop = null;
          return;
        }
        if (key === 'w' || key === 'k' || key === '\x1b[A') {
          shopSelection = Math.max(0, shopSelection - 1);
          return;
        }
        if (key === 's' || key === 'j' || key === '\x1b[B') {
          if (activeShop) shopSelection = Math.min(activeShop.stock.length - 1, shopSelection + 1);
          return;
        }
        if ((key === '\r' || key === '\n' || key === ' ') && activeShop) {
          const item = activeShop.stock[shopSelection];
          if (item) {
            const bal = getBalance();
            if (bal >= item.price) {
              spendCredits(item.price);
              addItem(item.id);
              setStatus(`Bought ${item.name}!`, `Balance: ${getBalance()} credits`);
            } else {
              setStatus('Not enough credits!');
            }
          }
          return;
        }
        return;
      }

      // ── Paused state ──
      if (gameState === 'paused') {
        if (key === '\x1b') { keyTimes = { up: 0, down: 0, left: 0, right: 0 }; gameState = 'explore'; return; }
        if (key === 'w' || key === 'k' || key === '\x1b[A') { pauseSelection = (pauseSelection - 1 + PAUSE_OPTIONS.length) % PAUSE_OPTIONS.length; return; }
        if (key === 's' || key === 'j' || key === '\x1b[B') { pauseSelection = (pauseSelection + 1) % PAUSE_OPTIONS.length; return; }
        if (key === '\r' || key === '\n' || key === ' ') {
          if (pauseSelection === 0) {
            keyTimes = { up: 0, down: 0, left: 0, right: 0 }; gameState = 'explore';
          } else if (pauseSelection === 1) {
            writeSave({ worldSeed, px, py, facing, battlesWon,
              defeatedEnemies: [...defeatedEnemies], savedAt: new Date().toISOString() });
            setStatus('Game saved!');
            keyTimes = { up: 0, down: 0, left: 0, right: 0 }; gameState = 'explore';
          } else {
            gameState = 'done'; resolveGame({ battlesWon, reason: 'paused_exit' });
          }
          return;
        }
        return;
      }

      if (gameState !== 'explore') return;

      // Esc → pause
      if (key === '\x1b') {
        keyTimes = { up: 0, down: 0, left: 0, right: 0 };
        pauseSelection = 0;
        gameState = 'paused';
        return;
      }

      // ENTER / Space → interact (enemy takes priority over shop)
      if (key === '\r' || key === '\n' || key === ' ') {
        if (nearbyEnemy) {
          battleTarget = nearbyEnemy;
          gameState = 'battle_intro';
          battleIntroFrame = 0;
          return;
        }
        if (nearbyShop) {
          activeShop = nearbyShop;
          shopSelection = 0;
          gameState = 'shopping';
          return;
        }
        return;
      }

      // Movement
      const now = Date.now();
      if (key === 'w' || key === '\x1b[A') keyTimes.up = now;
      if (key === 's' || key === '\x1b[B') keyTimes.down = now;
      if (key === 'a' || key === '\x1b[D') keyTimes.left = now;
      if (key === 'd' || key === '\x1b[C') keyTimes.right = now;
    }
  }

  stdin.on('data', onKey);

  // ─── Drawing: player ───
  function drawPlayer(sx, sy) {
    const facingInfo = {
      up: [0, -1, '▲'], down: [0, 1, '▼'], left: [-1, 0, '◄'], right: [1, 0, '►'],
      up_left: [-1, -1, '↖'], up_right: [1, -1, '↗'],
      down_left: [-1, 1, '↙'], down_right: [1, 1, '↘'],
    };
    if (sy < 2 || sy >= h || sx < 0 || sx >= w) return;
    screen.set(sx, sy, '◉', playerCore, null, true);
    if (sx - 1 >= 0) screen.set(sx - 1, sy, '▐', playerAccDk);
    if (sx + 1 < w)  screen.set(sx + 1, sy, '▌', playerAccent);
    if (sy + 1 < h)  screen.set(sx, sy + 1, '╹', playerTrim);
    const [fx, fy, fc] = facingInfo[facing] || facingInfo.down;
    const mx = sx + fx, my = sy + fy;
    if (my >= 2 && my < h && mx >= 0 && mx < w) screen.set(mx, my, fc, playerAccent, null, true);
  }

  // ─── Drawing: structure ───
  function drawStructure(struct, cx, cy) {
    for (const t of SHOP_TILES) {
      const sx = struct.worldX + t.dx - cx;
      const sy = struct.worldY + t.dy - cy;
      if (sx >= 0 && sx < w && sy >= 2 && sy < h) {
        screen.set(sx, sy, t.ch, t.accent ? SHOP_ICON_CLR : STRUCT_FG);
      }
    }
    // NPC
    const nsx = struct.npcX - cx;
    const nsy = struct.npcY - cy;
    if (nsx >= 0 && nsx < w && nsy >= 2 && nsy < h) {
      const pulse = Math.sin(frame * 0.08 + hash(struct.worldX, struct.worldY) % 100) * 0.5 + 0.5;
      screen.set(nsx, nsy, '☻', pulse > 0.3 ? NPC_COLOR : HUD_DIM);
    }
  }

  // ─── Drawing: shop overlay ───
  function drawShopUI() {
    if (!activeShop) return;
    const stock = activeShop.stock;
    const boxW = 38;
    const boxH = stock.length + 7;
    const bx = Math.floor((w - boxW) / 2);
    const by = Math.floor((h - boxH) / 2);
    const bal = getBalance();

    // Dim background
    for (let sy = 2; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) screen.set(sx, sy, ' ', null, bgRgb(5, 7, 12));
    }

    screen.box(bx, by, boxW, boxH, playerAccent, bgRgb(10, 12, 18));
    screen.text(bx + 3, by + 1, activeShop.name, BRIGHT, null, true);
    screen.text(bx + 3, by + 2, `Credits: ${bal}`, GOLD);
    screen.hline(bx + 1, by + 3, boxW - 2, '─', HUD_DIM);

    for (let i = 0; i < stock.length; i++) {
      const it = stock[i];
      const sel = i === shopSelection;
      const prefix = sel ? '► ' : '  ';
      const rc = RARITY_COLORS[it.rarity] || HUD_DIM;
      const priceStr = `${it.price} cr`;
      const nameStr = `${it.icon} ${it.name}`;
      const row = by + 4 + i;
      screen.text(bx + 2, row, prefix, sel ? BRIGHT : HUD_DIM, null, sel);
      screen.text(bx + 4, row, nameStr.slice(0, boxW - 14), rc);
      screen.text(bx + boxW - priceStr.length - 3, row, priceStr, bal >= it.price ? GOLD : ENEMY_FG);
    }

    screen.hline(bx + 1, by + boxH - 3, boxW - 2, '─', HUD_DIM);
    screen.text(bx + 3, by + boxH - 2, 'ENTER buy', HUD_DIM);
    screen.text(bx + 16, by + boxH - 2, 'ESC close', HUD_DIM);
  }

  // ─── Drawing: pause menu ───
  function drawPauseMenu() {
    const boxW = 28, boxH = 9;
    const bx = Math.floor((w - boxW) / 2);
    const by = Math.floor((h - boxH) / 2) - 1;
    for (let sy = 2; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) screen.set(sx, sy, ' ', null, bgRgb(5, 7, 12));
    }
    screen.box(bx, by, boxW, boxH, playerAccent, bgRgb(10, 12, 18));
    screen.centerText(by + 1, 'PAUSED', playerAccent, null, true);
    screen.centerText(by + 2, 'Esc resumes your run', HUD_DIM);
    for (let i = 0; i < PAUSE_OPTIONS.length; i++) {
      const sel = i === pauseSelection;
      screen.text(bx + 4, by + 4 + i, `${sel ? '► ' : '  '}${PAUSE_OPTIONS[i]}`.padEnd(boxW - 8),
        sel ? playerCore : colors.white, null, sel);
    }
  }

  // ─── Drawing: pregame menu (continue / new game) ───
  function drawPregameMenu() {
    const boxW = 32, boxH = 10;
    const bx = Math.floor((w - boxW) / 2);
    const by = Math.floor((h - boxH) / 2) - 1;

    for (let sy = 0; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) screen.set(sx, sy, ' ', null, bgRgb(5, 7, 12));
    }

    screen.box(bx, by, boxW, boxH, playerAccent, bgRgb(10, 12, 18));
    screen.centerText(by + 1, 'EXPLORE MODE', playerAccent, null, true);

    if (existingSave) {
      const wins = existingSave.battlesWon || 0;
      screen.centerText(by + 3, `Save found — ${wins} win${wins !== 1 ? 's' : ''}`, HUD_DIM);
      const biome = world.getBiome(existingSave.px || 0, existingSave.py || 0);
      if (biome) screen.centerText(by + 4, biome.name, DIM);
    }

    const opts = ['CONTINUE', 'NEW GAME'];
    for (let i = 0; i < opts.length; i++) {
      const sel = i === pregameSelection;
      screen.text(bx + 4, by + 6 + i, `${sel ? '► ' : '  '}${opts[i]}`.padEnd(boxW - 8),
        sel ? playerCore : colors.white, null, sel);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER FRAME
  // ═══════════════════════════════════════════════════════════════

  function renderFrame() {
    screen.clear();

    // Pregame menu takes over the screen
    if (gameState === 'pregame') {
      drawPregameMenu();
      screen.render();
      return;
    }

    const cx = camX();
    const cy = camY();

    // 1. Ground + grass (biome-aware) + road surface
    for (let sy = 2; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) {
        const wx = cx + sx;
        const wy = cy + sy;

        // Ground / road
        const gnd = world.getGround(wx, wy);
        if (gnd.bg) {
          screen.set(sx, sy, gnd.char, gnd.fg, gnd.bg);
        } else if (gnd.fg) {
          screen.set(sx, sy, gnd.char, gnd.fg);
        }

        // Grass with bend overlay
        const bend = bends.getBend(wx, wy);
        if (bend) {
          const biome = world.getBiome(wx, wy);
          const bc = bend.intensity > 0.6 ? biome.grassLit
            : bend.intensity > 0.3 ? biome.grassColors[Math.min(3, biome.grassColors.length - 1)]
            : biome.grassColors[Math.min(2, biome.grassColors.length - 1)];
          screen.set(sx, sy, bend.char, bc);
        } else {
          const g = world.getGrass(wx, wy);
          if (g) screen.set(sx, sy, g.char, g.color);
        }
      }
    }

    // 2. Crossroads marker at origin
    const crossSX = 0 - cx;
    const crossSY = 0 - cy;
    if (crossSX >= 0 && crossSX < w && crossSY >= 2 && crossSY < h) {
      screen.set(crossSX, crossSY, '╬', CROSSRD_CLR, null, true);
    }

    // 3. Sparkle
    sparkle.draw(screen);

    // 4. Structures
    const structs = world.getActiveStructures(cx, cy, w, h);
    for (const s of structs) {
      if (s.type === 'shop') drawStructure(s, cx, cy);
    }

    // 5. Enemies
    const enemies = world.getActiveEnemies(cx, cy, w, h)
      .filter(e => !defeatedEnemies.has(e.id));

    nearbyEnemy = null;
    nearbyShop = null;

    for (const enemy of enemies) {
      const ex = enemy.worldX - cx;
      const ey = enemy.worldY - cy;
      const dist = Math.sqrt((enemy.worldX - px) ** 2 + (enemy.worldY - py) ** 2);
      const detected = dist < 25;

      if (ex < -12 || ex > w + 12 || ey < 0 || ey > h + 12) continue;

      // Sprite when close, icon when far
      if (dist < 20 && enemy.fighter.sprite) {
        enemy.fighter.sprite.front.draw(screen, ex - 5, ey - 8, null, frame);
      } else if (dist < 40) {
        const pulse = Math.sin(frame * 0.15 + enemy.pulsePhase) * 0.5 + 0.5;
        if (ey >= 2 && ey < h && ex >= 0 && ex < w) {
          screen.set(ex, ey, enemy.icon, pulse > 0.5 ? enemy.iconColor : DIM);
        }
      }

      // Detection indicator
      if (detected && dist > 3) {
        const iy = ey - (dist < 20 ? 10 : 2);
        if (iy >= 2 && iy < h && ex >= 0 && ex < w) {
          screen.set(ex, iy, (frame % 20 < 10) ? '!' : '¡', ENEMY_FG);
        }
      }

      // Nearby interaction
      if (dist < 5) {
        nearbyEnemy = enemy;
        const py2 = Math.max(2, ey - (dist < 20 ? 12 : 4));
        const txt = `[ ENTER to battle ${enemy.label} ]`;
        const tx = Math.floor(ex - txt.length / 2);
        if (py2 >= 2 && py2 < h) screen.text(Math.max(0, tx), py2, txt, GOLD);

      }
    }

    // 6. Shop proximity prompts
    for (const s of structs) {
      if (s.type !== 'shop') continue;
      const dist = Math.sqrt((s.npcX - px) ** 2 + (s.npcY - py) ** 2);
      if (dist < SHOP_INTERACT_RADIUS) {
        nearbyShop = s;
        const nsx = s.npcX - cx;
        const nsy = s.npcY - cy - 1;
        if (nsy >= 2 && nsy < h) {
          const txt = `[ ENTER to shop at ${s.name} ]`;
          const tx = Math.max(0, Math.floor(nsx - txt.length / 2));
          screen.text(tx, nsy, txt, GOLD);
        }
      }
    }

    // 7. Player
    drawPlayer(cellX() - cx, cellY() - cy);

    // 8. Encounter flash
    if (encounterFlash > 0) {
      encounterFlash--;
      if (encounterFlash % 4 < 2) {
        for (let sy = 0; sy < h; sy++) { screen.set(0, sy, '█', ENEMY_FG); screen.set(w - 1, sy, '█', ENEMY_FG); }
        for (let sx = 0; sx < w; sx++) { screen.set(sx, 0, '█', ENEMY_FG); screen.set(sx, h - 1, '█', ENEMY_FG); }
      }
    }

    // 9. Battle intro iris
    if (gameState === 'battle_intro') {
      battleIntroFrame++;
      const progress = Math.min(1, battleIntroFrame / 30);
      const cxS = Math.floor(w / 2), cyS = Math.floor(h / 2);
      const maxR = Math.sqrt(cxS * cxS + cyS * cyS);
      const irisR = maxR * (1 - progress);
      for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
          if (Math.sqrt((sx - cxS) ** 2 + ((sy - cyS) * 2) ** 2) > irisR) {
            screen.set(sx, sy, ' ', null, bgRgb(5, 5, 8));
          }
        }
      }
      if (battleIntroFrame === 15) encounterFlash = 10;
      if (battleIntroFrame > 10 && battleTarget) {
        screen.centerText(cyS, `⚔ ${battleTarget.label} ⚔`, ENEMY_FG, null, true);
      }
    }

    // 10. Shop overlay
    if (gameState === 'shopping') drawShopUI();

    // 11. Pause overlay
    if (gameState === 'paused') drawPauseMenu();

    // ─── HUD ───
    screen.hline(0, 1, w, '─', HUD_DIM);
    const biome = world.getBiome(cellX(), cellY());
    const biomeName = biome ? biome.name : 'Unknown';
    const posText = `(${cellX()}, ${cellY()})`;
    const modeText = `EXPLORE [${biomeName}]`;
    const bal = getBalance();
    const credText = `${bal} cr`;
    const killText = `Defeated: ${battlesWon}`;

    screen.text(2, 0, modeText, LABEL, null, true);
    screen.text(w - posText.length - credText.length - 5, 0, posText, HUD_DIM);
    screen.text(w - credText.length - 2, 0, credText, GOLD);
    screen.text(Math.floor((w - killText.length) / 2), 0, killText, battlesWon > 0 ? GOLD : HUD_DIM);

    // Status messages
    if (statusTimer > 0) { statusTimer--; screen.centerText(3, statusMsg, GOLD); }
    if (statusTimer2 > 0) { statusTimer2--; screen.centerText(4, statusMsg2, HUD_DIM); }

    // Navigation hint (fades)
    if (frame < 120) {
      screen.centerText(h - 2, 'WASD / Arrows to move · ENTER interact · Esc menu', HUD_DIM);
    }

    // Direction arrows to off-screen enemies
    for (const enemy of enemies) {
      const ex = enemy.worldX - cx;
      const ey = enemy.worldY - cy;
      if (ex >= 2 && ex < w - 2 && ey >= 3 && ey < h - 1) continue;
      const angle = Math.atan2(enemy.worldY - py, enemy.worldX - px);
      const arrows = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
      const idx = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
      const edgeX = Math.max(2, Math.min(w - 3, Math.floor(w / 2 + Math.cos(angle) * (w / 2 - 4))));
      const edgeY = Math.max(2, Math.min(h - 2, Math.floor(h / 2 + Math.sin(angle) * (h / 2 - 3))));
      const dist = Math.sqrt((enemy.worldX - px) ** 2 + (enemy.worldY - py) ** 2);
      if (dist > 50) continue; // don't show arrows for very distant enemies
      screen.set(edgeX, edgeY, arrows[idx], dist < 30 ? enemy.iconColor : HUD_DIM);
      screen.text(edgeX + 1, edgeY, `${Math.round(dist)}`, HUD_DIM);
    }

    screen.render();
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  async function gameLoop() {
    while (gameState !== 'done') {
      const start = Date.now();
      frame++;

      // ── Movement ──
      if (gameState === 'explore') {
        const now = Date.now();
        const up    = (now - keyTimes.up)    < KEY_LINGER_MS;
        const down  = (now - keyTimes.down)  < KEY_LINGER_MS;
        const left  = (now - keyTimes.left)  < KEY_LINGER_MS;
        const right = (now - keyTimes.right) < KEY_LINGER_MS;

        let dx = 0, dy = 0;
        if (up) dy -= 1;
        if (down) dy += 1;
        if (left) dx -= 1;
        if (right) dx += 1;

        if ((dx !== 0 || dy !== 0) && (now - lastMoveAt) >= MOVE_INTERVAL_MS) {
          px += dx * (dx !== 0 ? HORIZONTAL_STEP : 1);
          py += dy;
          facing = facingFrom(dx, dy);
          bends.applyMovement(cellX(), cellY(), dx, dy);
          lastMoveAt = now;
        }
      }

      // ── Battle launch ──
      if (gameState === 'battle_intro' && battleIntroFrame >= 30) {
        gameState = 'battling';
        const enemy = battleTarget;

        screen.handoff();
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();

        const seed = combinedSeed(fighter.id, enemy.fighter.id);
        let winner;
        if (useTurnBattles) {
          const myMoves = getEquippedMoves(fighter.stats, fighter.specs, fighter.archetype);
          try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
          const oppMoves = assignMoveset(enemy.fighter.stats);
          winner = await renderTurnBattle(fighter, enemy.fighter, myMoves, oppMoves, { role: 'host', seed });
        } else {
          const events = simulate(fighter, enemy.fighter, seed);
          winner = await renderBattle(fighter, enemy.fighter, events);
        }

        // Post-battle rewards
        const won = winner === 'a';
        const mode = useTurnBattles ? 'turns' : 'auto';

        try { saveMatch(fighter, enemy.fighter, winner, mode); } catch {}

        const earned = calculateBattleCredits(winner, fighter, enemy.fighter, mode);
        addCredits(earned);

        if (won) {
          defeatedEnemies.add(enemy.id);
          battlesWon++;
          const rewards = rollRewards(createRNG(Date.now()), enemy.tier >= 3 ? 'high' : 'mid', true);
          for (const r of rewards) addItem(r.id);
          const rewardText = rewards.length > 0 ? ` · ${rewards.map(r => r.name).join(', ')}` : '';
          setStatus(
            `★ ${enemy.label} DEFEATED ★`,
            `+${earned} credits${rewardText}`
          );
        } else {
          setStatus('Defeated... but you persist.', `+${earned} credits`);
        }

        battleTarget = null;
        px -= 5; py -= 5;

        screen.enter();
        screen.resetDiff();
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', onKey);
        gameState = 'explore';
      }

      // ── Update effects ──
      if (gameState !== 'paused' && gameState !== 'battling') {
        bends.update();
        sparkle.update();
      }

      // ── Render ──
      if (gameState !== 'battling') {
        renderFrame();
      }

      // ── Frame timing ──
      const elapsed = Date.now() - start;
      await new Promise(r => setTimeout(r, Math.max(1, FRAME_MS - elapsed)));
    }
  }

  gameLoop();
  const result = await gamePromise;

  stdin.removeListener('data', onKey);
  try { stdin.setRawMode(false); stdin.pause(); } catch {}
  screen.exit();

  return result;
}

module.exports = { renderRogue };
