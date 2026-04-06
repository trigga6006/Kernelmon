// ═══════════════════════════════════════════════════════════════
// HACK THE GRID — Terminal roguelike puzzle mini-game
// Navigate a grid, collect data nodes, dodge firewall sentries.
// Three-strike system with typing challenges on breach.
// Fullscreen, hacker/terminal aesthetic.
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { ESC, colors, rgb, RESET, BOLD } = require('./palette');
const { createRNG } = require('./rng');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

// ─── Hacker Visual Constants ───

// Player is a 3-wide sprite: accent + core + accent, changes with facing
const PLAYER_SPRITES = {
  right: ['{', '@', '>'],
  left:  ['<', '@', '}'],
  up:    ['[', '@', ']'],
  down:  ['[', '@', ']'],
  idle:  ['[', '@', ']'],
};
const PLAYER_CORE_COLOR = rgb(0, 255, 120);
const PLAYER_EDGE_COLOR = rgb(0, 180, 90);
const PLAYER_TRAIL = [
  { char: '.', color: rgb(0, 180, 90) },
  { char: '.', color: rgb(0, 120, 60) },
  { char: '.', color: rgb(0, 60, 30) },
  { char: ' ', color: null },
];

// Nodes look like data fragments — hex, bits, register names
const NODE_CHARS = ['0', '1', '$', '#', '%', '&', 'x'];
const NODE_COLOR = rgb(0, 220, 130);
const NODE_DIM   = rgb(0, 140, 80);

// Sentry is a 3-wide sprite based on patrol direction
const SENTRY_SPRITES = {
  right: ['(', '#', '>'],
  left:  ['<', '#', ')'],
  up:    ['/', '#', '\\'],
  down:  ['\\', '#', '/'],
  diag:  ['<', '#', '>'],
};
const SENTRY_COLOR_HI = rgb(255, 50, 50);
const SENTRY_COLOR_LO = rgb(180, 30, 30);
const SENTRY_EDGE_HI = rgb(200, 40, 40);
const SENTRY_EDGE_LO = rgb(120, 25, 25);

const WALL_CHAR = '░';
const WALL_COLOR = rgb(30, 32, 38);
const FLOOR_CHARS = [' ', ' ', ' ', ' ', '.', '·']; // mostly empty, sparse dots
const FLOOR_COLOR = rgb(20, 25, 22);

const LIFE_FULL = '■';
const LIFE_EMPTY = '□';
const LIFE_COLOR = rgb(255, 60, 60);

// Characters for glitch/scatter effects — hacker debris
const GLITCH_CHARS = '0123456789ABCDEFabcdef{}[]<>|/\\~!@#$%^&*:;'.split('');

// ─── Typing Challenge Commands (scale with level) ───

const BREACH_COMMANDS = [
  ['kill -9 $$', 'chmod 777 .', 'rm -rf /tmp', 'sudo reboot', 'nmap -sS .'],
  ['iptables -F INPUT', 'ssh -L 8080:local', 'tcpdump -i eth0 -c 50', 'openssl rand -hex 32', 'curl -x socks5://proxy'],
  ['iptables -A INPUT -s 0.0.0.0/0 -j DROP', 'openssl enc -aes-256-cbc -salt -in dump', 'nmap -sV -p 1-65535 --script vuln', 'ssh -o StrictHostKeyChecking=no root@target'],
];

// ─── Grid Generation ───

function generateGrid(w, h, level, rng) {
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        row.push(1);
      } else {
        const wallChance = 0.06 + Math.min(level * 0.015, 0.10);
        row.push(rng.next() < wallChance ? 1 : 0);
      }
    }
    grid.push(row);
  }

  // Clear player start area
  const px = 3, py = 3;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = px + dx, ny = py + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) grid[ny][nx] = 0;
    }
  }

  // Build reachability map — BFS from player start using 3-wide movement rules
  const reachable = [];
  for (let ry = 0; ry < h; ry++) reachable.push(new Uint8Array(w));

  function canStand(cx, cy) {
    return cx >= 2 && cx < w - 2 && cy >= 1 && cy < h - 1 &&
      grid[cy][cx] === 0 && grid[cy][cx - 1] === 0 && grid[cy][cx + 1] === 0;
  }

  const queue = [[px, py]];
  reachable[py][px] = 1;
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [ddx, ddy] of dirs) {
      const nx2 = cx + ddx, ny2 = cy + ddy;
      if (canStand(nx2, ny2) && !reachable[ny2][nx2]) {
        reachable[ny2][nx2] = 1;
        queue.push([nx2, ny2]);
      }
    }
  }

  // Data nodes — only spawn at positions reachable by the 3-wide player
  const nodeCount = 6 + Math.min(level * 2, 12);
  const nodes = [];
  let attempts = 0;
  while (nodes.length < nodeCount && attempts < 500) {
    const nx = rng.int(2, w - 3);
    const ny = rng.int(2, h - 3);
    if (reachable[ny][nx] && !(Math.abs(nx - px) < 3 && Math.abs(ny - py) < 3) && !nodes.some(n => n.x === nx && n.y === ny)) {
      nodes.push({ x: nx, y: ny, char: NODE_CHARS[rng.int(0, NODE_CHARS.length - 1)], pulse: rng.int(0, 20) });
    }
    attempts++;
  }

  // Sentries
  const sentryCount = 2 + Math.min(level, 6);
  const sentries = [];
  for (let i = 0; i < sentryCount; i++) {
    let sx, sy;
    attempts = 0;
    do {
      sx = rng.int(4, w - 5);
      sy = rng.int(4, h - 5);
      attempts++;
    } while ((grid[sy][sx] === 1 || (Math.abs(sx - px) < 5 && Math.abs(sy - py) < 5) || sentries.some(s => s.x === sx && s.y === sy)) && attempts < 200);
    if (attempts >= 200) continue;

    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: -1 }];
    const dir = dirs[rng.int(0, dirs.length - 1)];
    const speed = 0.25 + Math.min(level * 0.06, 0.45);
    const charIdx = rng.int(0, 5);
    sentries.push({ x: sx, y: sy, startX: sx, startY: sy, dx: dir.dx, dy: dir.dy, speed, acc: 0, charIdx });
  }

  return { grid, nodes, sentries, playerStart: { x: px, y: py } };
}

// ─── Scatter Effect — hacker debris ───

class ScatterFX {
  constructor() { this.items = []; }

  emit(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      this.items.push({
        x, y,
        vx: Math.cos(angle) * (0.4 + Math.random() * 0.6),
        vy: Math.sin(angle) * (0.3 + Math.random() * 0.4),
        life: 5 + Math.floor(Math.random() * 5),
        char: GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)],
        color,
      });
    }
  }

  update() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      // Flicker char each frame
      if (p.life > 0 && Math.random() < 0.4) p.char = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }

  draw(screen) {
    for (const p of this.items) {
      const sx = Math.round(p.x);
      const sy = Math.round(p.y);
      if (p.life > 2) screen.set(sx, sy, p.char, p.color);
    }
  }
}

// ─── Main Game ───

async function renderHackGrid(fighter) {
  const screen = new Screen();
  const w = screen.width;
  const h = screen.height;
  const rng = createRNG(Date.now());

  // Fullscreen grid — use nearly all terminal space
  const gridW = w - 2;
  const gridH = h - 4;
  const gridX = 1;
  const gridY = 2;

  let level = 1;
  let score = 0;
  let lives = 3;
  let gameState = 'boot';
  let frame = 0;

  let levelData = generateGrid(gridW, gridH, level, rng);
  let px = levelData.playerStart.x;
  let py = levelData.playerStart.y;
  let trail = [];
  let nodesCollected = 0;
  const scatter = new ScatterFX();

  // Floor noise — static per-cell chars seeded once
  const floorMap = [];
  for (let y = 0; y < gridH; y++) {
    const row = [];
    for (let x = 0; x < gridW; x++) {
      row.push(FLOOR_CHARS[rng.int(0, FLOOR_CHARS.length - 1)]);
    }
    floorMap.push(row);
  }

  let breachCommand = '';
  let breachInput = '';
  let breachTimer = 0;
  let breachMaxTime = 0;

  let glitchFrames = 0;
  let bootFrame = 0;
  const BOOT_FRAMES = 35;
  let clearFrame = 0;
  const CLEAR_FRAMES = 35;
  let overFrame = 0;
  const OVER_TEXT = 'CONNECTION TERMINATED';

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  const keyHeld = { up: false, down: false, left: false, right: false };
  let lastMoveFrame = 0;
  let facing = 'idle';
  const MOVE_COOLDOWN = 1; // move every frame for fluid movement
  const KEY_LINGER_MS = 120; // how long a key press lingers
  const keyTimes = { up: 0, down: 0, left: 0, right: 0 };

  screen.enter();

  let breachResolve = null;
  let resolve;
  const resultPromise = new Promise(r => { resolve = r; });

  function onKey(key) {
    if (key === '\x03') {
      cleanup();
      screen.exit();
      resolve({ score, level, reason: 'quit' });
      return;
    }

    if (gameState === 'breach') {
      if (key === '\r' || key === '\n') {
        if (breachResolve) {
          const r = breachResolve; breachResolve = null;
          r(breachInput.trim().toLowerCase() === breachCommand.toLowerCase());
        }
      } else if (key === '\x7f' || key === '\b') {
        breachInput = breachInput.slice(0, -1);
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        breachInput += key;
      }
      return;
    }

    if (gameState === 'gameover') {
      if (overFrame > 30) {
        cleanup();
        screen.exit();
        resolve({ score, level, reason: 'dead' });
      }
      return;
    }

    if (gameState !== 'play') return;
    const now = Date.now();
    if (key === '\x1b[A' || key === 'w') keyTimes.up = now;
    if (key === '\x1b[B' || key === 's') keyTimes.down = now;
    if (key === '\x1b[D' || key === 'a') keyTimes.left = now;
    if (key === '\x1b[C' || key === 'd') keyTimes.right = now;
  }

  stdin.on('data', onKey);

  // ─── Game Loop ───

  const gameLoop = setInterval(() => {
    frame++;

    // ── Boot: cascade grid with scrolling hex noise ──
    if (gameState === 'boot') {
      screen.clear();
      bootFrame++;
      const revealRow = Math.floor((bootFrame / BOOT_FRAMES) * gridH);

      for (let gy = 0; gy <= Math.min(revealRow, gridH - 1); gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const sx = gridX + gx;
          const sy = gridY + gy;
          if (levelData.grid[gy][gx] === 1) {
            screen.set(sx, sy, WALL_CHAR, WALL_COLOR);
          } else if (gy === revealRow) {
            // Scanline: flickering hex digits on the reveal edge
            const ch = GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)];
            screen.set(sx, sy, ch, rgb(0, rng.int(80, 180), rng.int(40, 100)));
          }
        }
      }

      // HUD
      screen.text(2, 0, `HACK THE GRID`, rgb(0, 220, 120), null, true);
      screen.text(w - 12, 0, `Level ${level}`, colors.dim);
      const bootMsg = bootFrame < BOOT_FRAMES ? `Mapping network... ${Math.floor((bootFrame / BOOT_FRAMES) * 100)}%` : '> READY';
      screen.text(2, h - 1, bootMsg, bootFrame < BOOT_FRAMES ? rgb(0, 100, 60) : rgb(0, 255, 120));

      screen.render();
      if (bootFrame >= BOOT_FRAMES) gameState = 'play';
      return;
    }

    // ── Level clear: dissolve into hex noise ──
    if (gameState === 'levelclear') {
      clearFrame++;
      screen.clear();
      const progress = clearFrame / CLEAR_FRAMES;

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const sx = gridX + gx;
          const sy = gridY + gy;
          if (rng.next() < progress) {
            // Dissolve into random hex
            const ch = GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)];
            const fade = 1 - progress;
            screen.set(sx, sy, ch, rgb(0, Math.round(160 * fade), Math.round(100 * fade)));
          } else {
            if (levelData.grid[gy][gx] === 1) screen.set(sx, sy, WALL_CHAR, WALL_COLOR);
          }
        }
      }

      screen.centerText(0, `> SECTOR ${level} CLEARED`, rgb(0, 255, 120), null, true);
      screen.centerText(Math.floor(h / 2), `+${50 * level} BONUS`, colors.gold, null, true);
      screen.centerText(Math.floor(h / 2) + 1, `Score: ${score}`, rgb(0, 200, 120));

      screen.render();
      if (clearFrame >= CLEAR_FRAMES) {
        level++;
        levelData = generateGrid(gridW, gridH, level, rng);
        px = levelData.playerStart.x;
        py = levelData.playerStart.y;
        trail = [];
        nodesCollected = 0;
        bootFrame = 0;
        clearFrame = 0;
        gameState = 'boot';
      }
      return;
    }

    // ── Game over: full screen glitch cascade ──
    if (gameState === 'gameover') {
      overFrame++;
      screen.clear();

      // Fill screen with decaying hex/symbol noise
      const density = Math.min(0.6, overFrame * 0.03);
      for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
          if (rng.next() < density) {
            const r = rng.next() < 0.4 ? rng.int(150, 255) : rng.int(30, 80);
            screen.set(sx, sy, GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)], rgb(r, rng.int(20, 50), rng.int(20, 50)));
          }
        }
      }

      // Typewriter reveal
      const cy = Math.floor(h / 2);
      const revealLen = Math.min(overFrame, OVER_TEXT.length);
      screen.centerText(cy - 1, OVER_TEXT.slice(0, revealLen), rgb(255, 50, 50), null, true);
      if (overFrame > 18) {
        screen.centerText(cy + 1, `Score: ${score}  |  Level ${level}`, rgb(0, 200, 120), null, true);
      }
      if (overFrame > 30) {
        screen.centerText(cy + 3, 'Press any key', colors.dimmer);
      }

      screen.render();
      return;
    }

    // ── Breach typing challenge ──
    if (gameState === 'breach') {
      screen.clear();
      const cy = Math.floor(h / 2);

      // Noise bands top and bottom
      for (let sx = 0; sx < w; sx++) {
        for (let band = 0; band < 3; band++) {
          if (rng.next() < 0.5) {
            const ch = GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)];
            screen.set(sx, cy - 6 + band, ch, rgb(rng.int(120, 255), rng.int(20, 50), rng.int(20, 40)));
            screen.set(sx, cy + 6 - band, ch, rgb(rng.int(120, 255), rng.int(20, 50), rng.int(20, 40)));
          }
        }
      }

      // Lives
      const livesStr = `${LIFE_FULL.repeat(lives)}${LIFE_EMPTY.repeat(3 - lives)}`;
      screen.centerText(cy - 5, livesStr, LIFE_COLOR);

      screen.centerText(cy - 3, '> BREACH DETECTED <', rgb(255, 60, 60), null, true);
      screen.centerText(cy - 2, 'Type the command to patch:', rgb(180, 180, 180));

      // Command
      screen.centerText(cy, `$ ${breachCommand}`, rgb(0, 255, 120), null, true);

      // Input with blinking cursor
      const cursorChar = frame % 10 < 5 ? '_' : ' ';
      screen.centerText(cy + 2, `> ${breachInput}${cursorChar}`, rgb(200, 200, 200), null, true);

      // Timer
      const elapsed = (Date.now() - breachTimer) / 1000;
      const remaining = Math.max(0, breachMaxTime - elapsed);
      const ratio = remaining / breachMaxTime;
      const barW = 40;
      const barX = Math.floor((w - barW) / 2);
      screen.bar(barX, cy + 4, barW, ratio, ratio > 0.3 ? rgb(0, 200, 100) : rgb(255, 60, 60), rgb(40, 40, 50));
      screen.text(barX + barW + 2, cy + 4, `${remaining.toFixed(1)}s`, ratio > 0.3 ? rgb(0, 200, 100) : rgb(255, 60, 60));

      screen.render();

      if (remaining <= 0 && breachResolve) {
        const r = breachResolve; breachResolve = null;
        r(false);
      }
      return;
    }

    // ══ Main gameplay ══

    // Movement — continuous with key linger for fluidity
    if (frame - lastMoveFrame >= MOVE_COOLDOWN) {
      const now = Date.now();
      let dx = 0, dy = 0;
      if ((now - keyTimes.up) < KEY_LINGER_MS) dy = -1;
      if ((now - keyTimes.down) < KEY_LINGER_MS) dy = 1;
      if ((now - keyTimes.left) < KEY_LINGER_MS) dx = -1;
      if ((now - keyTimes.right) < KEY_LINGER_MS) dx = 1;

      if (dx !== 0 || dy !== 0) {
        // Update facing
        if (dx > 0) facing = 'right';
        else if (dx < 0) facing = 'left';
        else if (dy < 0) facing = 'up';
        else if (dy > 0) facing = 'down';

        const nx = px + dx, ny = py + dy;
        // Keep 3-wide sprite clear of walls: nx-1 and nx+1 must also be floor
        if (nx >= 2 && nx < gridW - 2 && ny >= 1 && ny < gridH - 1 &&
            levelData.grid[ny][nx] === 0 && levelData.grid[ny][nx - 1] === 0 && levelData.grid[ny][nx + 1] === 0) {
          trail.push({ x: px, y: py, age: 0 });
          if (trail.length > 30) trail.shift();
          px = nx;
          py = ny;
          lastMoveFrame = frame;
        }
      }
    }

    // Age trail
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age++;
      if (trail[i].age >= PLAYER_TRAIL.length) trail.splice(i, 1);
    }

    // Node collection
    for (let i = levelData.nodes.length - 1; i >= 0; i--) {
      const n = levelData.nodes[i];
      if (n.y === py && n.x >= px - 1 && n.x <= px + 1) {
        levelData.nodes.splice(i, 1);
        nodesCollected++;
        score += 10 * level;
        // Scatter hex debris on collection
        scatter.emit(gridX + n.x, gridY + n.y, 8, rgb(0, 255, 120));
      }
    }

    // Level clear
    if (levelData.nodes.length === 0) {
      score += 50 * level;
      gameState = 'levelclear';
      clearFrame = 0;
      return;
    }

    // Update sentries
    for (const s of levelData.sentries) {
      s.acc += s.speed;
      while (s.acc >= 1) {
        s.acc -= 1;
        const nx = Math.round(s.x + s.dx);
        const ny = Math.round(s.y + s.dy);
        if (nx <= 0 || nx >= gridW - 1 || ny <= 0 || ny >= gridH - 1 || levelData.grid[ny][nx] === 1) {
          s.dx = -s.dx;
          s.dy = -s.dy;
        } else {
          s.x = nx;
          s.y = ny;
        }
      }
    }

    // Sentry collision — check if any of the 3-wide sprites overlap
    for (const s of levelData.sentries) {
      const sx = Math.round(s.x);
      const sy = Math.round(s.y);
      if (sy === py && Math.abs(sx - px) <= 2) {
        lives--;
        glitchFrames = 8;
        scatter.emit(gridX + px, gridY + py, 15, rgb(255, 50, 50));

        if (lives <= 0) {
          gameState = 'gameover';
          overFrame = 0;
          return;
        }

        gameState = 'breach';
        const cmdPool = BREACH_COMMANDS[Math.min(Math.floor((level - 1) / 2), BREACH_COMMANDS.length - 1)];
        breachCommand = cmdPool[rng.int(0, cmdPool.length - 1)];
        breachInput = '';
        breachMaxTime = 5 + breachCommand.length * 0.2;
        breachTimer = Date.now();

        new Promise(r => { breachResolve = r; }).then(success => {
          if (success) {
            s.x = s.startX;
            s.y = s.startY;
            gameState = 'play';
            scatter.emit(gridX + px, gridY + py, 10, rgb(0, 255, 120));
          } else {
            gameState = 'gameover';
            overFrame = 0;
          }
        });
        return;
      }
    }

    scatter.update();

    // ── Render ──
    screen.clear();

    // Floor with sparse noise
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const cell = levelData.grid[gy][gx];
        const sx = gridX + gx;
        const sy = gridY + gy;
        if (cell === 1) {
          screen.set(sx, sy, WALL_CHAR, WALL_COLOR);
        } else {
          const fc = floorMap[gy][gx];
          if (fc !== ' ') screen.set(sx, sy, fc, FLOOR_COLOR);
        }
      }
    }

    // Data nodes — flicker between char and hex digit
    for (const n of levelData.nodes) {
      const flicker = (frame + n.pulse) % 12 < 8;
      const ch = flicker ? n.char : GLITCH_CHARS[rng.int(0, 15)]; // hex digit
      const col = flicker ? NODE_COLOR : NODE_DIM;
      screen.set(gridX + n.x, gridY + n.y, ch, col);
    }

    // Trail
    for (const t of trail) {
      const info = PLAYER_TRAIL[Math.min(t.age, PLAYER_TRAIL.length - 1)];
      if (info.color) screen.set(gridX + t.x, gridY + t.y, info.char, info.color);
    }

    // Sentries — 3-wide directional sprite, pulsing red
    for (const s of levelData.sentries) {
      const bright = (frame + s.charIdx) % 6 < 3;
      const sx = gridX + Math.round(s.x);
      const sy = gridY + Math.round(s.y);
      let sprKey = 'diag';
      if (s.dx > 0 && s.dy === 0) sprKey = 'right';
      else if (s.dx < 0 && s.dy === 0) sprKey = 'left';
      else if (s.dy < 0 && s.dx === 0) sprKey = 'up';
      else if (s.dy > 0 && s.dx === 0) sprKey = 'down';
      const spr = SENTRY_SPRITES[sprKey];
      screen.set(sx - 1, sy, spr[0], bright ? SENTRY_EDGE_HI : SENTRY_EDGE_LO);
      screen.set(sx,     sy, spr[1], bright ? SENTRY_COLOR_HI : SENTRY_COLOR_LO);
      screen.set(sx + 1, sy, spr[2], bright ? SENTRY_EDGE_HI : SENTRY_EDGE_LO);
    }

    // Player — 3-wide sprite based on facing
    const pSprite = PLAYER_SPRITES[facing] || PLAYER_SPRITES.idle;
    screen.set(gridX + px - 1, gridY + py, pSprite[0], PLAYER_EDGE_COLOR);
    screen.set(gridX + px,     gridY + py, pSprite[1], PLAYER_CORE_COLOR);
    screen.set(gridX + px + 1, gridY + py, pSprite[2], PLAYER_EDGE_COLOR);

    // Scatter debris
    scatter.draw(screen);

    // Glitch overlay
    if (glitchFrames > 0) {
      glitchFrames--;
      for (let i = 0; i < 25; i++) {
        const gx = rng.int(0, w - 1);
        const gy = rng.int(0, h - 1);
        screen.set(gx, gy, GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)], rgb(rng.int(150, 255), rng.int(20, 60), rng.int(20, 40)));
      }
    }

    // ── HUD (minimal, top and bottom bars) ──
    screen.text(1, 0, 'HACK THE GRID', rgb(0, 180, 100));
    screen.text(16, 0, `Lv.${level}`, colors.dim);

    const livesStr = `${LIFE_FULL.repeat(lives)}${LIFE_EMPTY.repeat(3 - lives)}`;
    screen.text(Math.floor(w / 2) - 2, 0, livesStr, LIFE_COLOR);

    screen.text(w - 14, 0, `Score: ${score}`, rgb(0, 220, 120));

    const nodesLeft = levelData.nodes.length;
    const totalNodes = nodesLeft + nodesCollected;
    screen.text(1, h - 1, `Nodes: ${nodesCollected}/${totalNodes}`, rgb(0, 160, 100));
    screen.text(w - 24, h - 1, 'WASD/Arrows  Collect all', rgb(50, 60, 55));

    screen.render();
  }, FRAME_MS);

  function cleanup() {
    clearInterval(gameLoop);
    stdin.removeListener('data', onKey);
    try { stdin.setRawMode(false); } catch {}
    try { stdin.pause(); } catch {}
  }

  return await resultPromise;
}

module.exports = { renderHackGrid };
