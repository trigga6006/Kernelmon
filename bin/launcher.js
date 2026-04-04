#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════
// RIGEMON — Main Terminal Launcher
// Full-screen interactive menu with animated matrix background
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('../src/screen');
const { colors, hpColor, rgb, RESET, BOLD } = require('../src/palette');
const { MatrixRain } = require('../src/effects/matrix');
const { createRNG } = require('../src/rng');
const { getSpecs, buildStats, fighterName, gpuName, classifyArchetype } = require('../src/profiler');
const { getSprite } = require('../src/sprites');
const { getEquippedMoves, assignMoveset } = require('../src/moveset');
const { generateSignatureMoves, SIGNATURE_ICON } = require('../src/signature');
const { registerSignatureAnims } = require('../src/effects/projectile');
const { getOwnedItems, RARITY_COLORS } = require('../src/items');
const { printHistory } = require('../src/history');
const { simulate } = require('../src/battle');
const { renderBattle } = require('../src/renderer');
const { combinedSeed } = require('../src/rng');

let renderTurnBattle;
try { renderTurnBattle = require('../src/turnrenderer').renderTurnBattle; } catch (e) {}

let renderDash;
try { renderDash = require('../src/dashrenderer').renderDash; } catch (e) {}

let renderRogue;
try { renderRogue = require('../src/roguelike').renderRogue; } catch (e) {}

const { saveMatch } = require('../src/history');
const { rollRewards, addItem, printRewards } = require('../src/items');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── ASCII Logo ───
const LOGO = [
  '                     ╔██╗                                    ',
  '                     ╚═██╗                                   ',
  '██████╗ ██╗ ██████╗ ███████╗███╗   ███╗ ██████╗ ███╗   ██╗',
  '██╔══██╗██║██╔════╝ ██╔════╝████╗ ████║██╔═══██╗████╗  ██║',
  '██████╔╝██║██║  ███╗█████╗  ██╔████╔██║██║   ██║██╔██╗ ██║',
  '██╔══██╗██║██║   ██║██╔══╝  ██║╚██╔╝██║██║   ██║██║╚██╗██║',
  '██║  ██║██║╚██████╔╝███████╗██║ ╚═╝ ██║╚██████╔╝██║ ╚████║',
  '╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝',
];

const LOGO_SMALL = [
  '╦═╗╦╔═╗╔═╗╔╦╗╔═╗╔╗╔',
  '╠╦╝║║ ╦║╣ ║║║║ ║║║║',
  '╩╚═╩╚═╝╚═╝╩ ╩╚═╝╝╚╝',
];

const SUBTITLE = '◄ YOUR RIG. YOUR FIGHTER. ►';

const MENU_ITEMS = [
  { key: 'demo',        label: 'QUICK BATTLE',    desc: 'Auto-battle vs Chromebook',  icon: '⚡' },
  { key: 'demo_turns',  label: 'TURN BATTLE',     desc: 'Turn-based vs Chromebook',   icon: '◆' },
  { key: 'dash',        label: 'DASH MODE',       desc: 'Side-scroll obstacle runner', icon: '▸' },
  { key: 'rogue',       label: 'ROGUE MODE',      desc: 'Explore the void, find battles', icon: '◉' },
  { key: 'profile',     label: 'MY PROFILE',      desc: 'View your fighter stats',    icon: '◈' },
  { key: 'loadout',     label: 'LOADOUT',          desc: 'Configure equipped moves',   icon: '⚔' },
  { key: 'bag',         label: 'BAG',              desc: 'View collected items',       icon: '◰' },
  { key: 'workshop',    label: 'WORKSHOP',         desc: 'Swap parts on your build',   icon: '▣' },
  { key: 'lootbox',     label: 'LOOT BOX',         desc: 'Spend credits on crates',    icon: '✦' },
  { key: 'history',     label: 'BATTLE LOG',       desc: 'Past match history',         icon: '▤' },
  { key: 'host',        label: 'HOST GAME',        desc: 'Host a battle for others',   icon: '◎' },
  { key: 'join',        label: 'JOIN BATTLE',      desc: 'Enter a room code to join',  icon: '↗' },
  { key: 'quit',        label: 'EXIT',             desc: 'Disconnect',                 icon: '×' },
];

const ITEM_COLORS = {
  demo:        colors.peach,
  demo_turns:  colors.gold,
  dash:        colors.coral,
  rogue:       rgb(75, 150, 90),
  profile:     colors.cyan,
  loadout:     colors.lavender,
  bag:         colors.mint,
  workshop:    rgb(255, 215, 0),
  lootbox:     rgb(240, 170, 50),
  history:     colors.dim,
  host:        colors.coral,
  join:        colors.lilac,
  quit:        colors.rose,
};

// ─── Build fighter helper ───
async function buildFighter(rawSpecs) {
  const { applyBuildOverrides } = require('../src/parts');
  const specs = applyBuildOverrides(rawSpecs);
  const stats = buildStats(specs);
  const name = fighterName(specs);
  const gpu = gpuName(specs);
  const sprite = getSprite(specs);
  const archetype = classifyArchetype(stats, specs);
  return { id: rawSpecs.id, name, gpu, stats, specs, sprite, archetype };
}

function mockOpponent() {
  const mockSpecs = {
    cpu: { brand: 'Intel Celeron N4020', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 },
    ram: { totalGB: 4 },
    gpu: { model: 'Intel UHD Graphics 600', vramMB: 0, vendor: 'Intel' },
    storage: { type: 'eMMC' },
  };
  const mockStats = { str: 22, vit: 25, mag: 15, spd: 20, def: 22, hp: 700, maxHp: 700 };
  return {
    id: 'mock-chromebook-001', name: 'Celeron N4020', gpu: 'Intel UHD 600',
    stats: mockStats, specs: mockSpecs, sprite: getSprite(mockSpecs),
    archetype: classifyArchetype(mockStats, mockSpecs),
  };
}

function postBattle(myFighter, opponent, winner, mode) {
  saveMatch(myFighter, opponent, winner, mode);

  const { calculateBattleCredits, addCredits } = require('../src/credits');
  const earned = calculateBattleCredits(winner, myFighter, opponent, mode);
  const newBal = addCredits(earned);

  // 8% chance to drop a bag item on win
  let itemDrop = null;
  if (winner === 'a') {
    const rng = createRNG(Date.now());
    if (rng.next() < 0.08) {
      const { ITEMS } = require('../src/items');
      const rarityW = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 };
      const totalW = Object.values(rarityW).reduce((s, w) => s + w, 0);
      let roll = rng.next() * totalW;
      let rarity = 'common';
      for (const [r, w] of Object.entries(rarityW)) {
        roll -= w;
        if (roll <= 0) { rarity = r; break; }
      }
      const candidates = Object.entries(ITEMS).filter(([, i]) => i.rarity === rarity);
      if (candidates.length > 0) {
        const [id, item] = candidates[Math.floor(rng.next() * candidates.length)];
        addItem(id);
        itemDrop = { id, ...item };
      }
    }
  }

  return { earned, newBal, itemDrop };
}

// ─── Animated battle reward screen ───
async function showBattleRewards(winner, rewards, winMsg, loseMsg) {
  const scr = new Screen();
  scr.enter();
  const w = scr.width;
  const h = scr.height;
  const cy = Math.floor(h / 2);

  scr.centerText(0, '─'.repeat(w), colors.dimmer);
  scr.centerText(0, ' BATTLE COMPLETE ', colors.cyan, null, true);

  // Phase 1: Victory / Defeat banner
  if (winner === 'a') {
    scr.centerText(cy - 4, '★ ★ ★  V I C T O R Y  ★ ★ ★', colors.gold, null, true);
    scr.centerText(cy - 2, winMsg, colors.cyan);
  } else {
    scr.centerText(cy - 4, 'D E F E A T', colors.rose, null, true);
    scr.centerText(cy - 2, loseMsg, colors.dim);
  }
  scr.render();
  await sleep(700);

  // Phase 2: Credit counter ticks up
  const { earned, newBal, itemDrop } = rewards;
  const steps = Math.min(earned, 24);
  for (let i = 1; i <= steps; i++) {
    const current = Math.floor((earned * i) / steps);
    scr.centerText(cy, `◆ +${current} credits`, colors.gold, null, true);
    scr.render();
    await sleep(35);
  }
  scr.centerText(cy, `◆ +${earned} credits`, colors.gold, null, true);
  scr.centerText(cy + 1, `Balance: ${newBal}`, colors.dim);
  scr.render();
  await sleep(400);

  // Phase 3: Item drop reveal
  if (itemDrop) {
    const rc = RARITY_COLORS[itemDrop.rarity] || colors.dim;
    // Flash
    for (let f = 0; f < 4; f++) {
      scr.centerText(cy + 3, f % 2 === 0 ? '▸ ITEM DROP ◂' : '             ', colors.mint, null, true);
      scr.render();
      await sleep(100);
    }
    scr.centerText(cy + 3, '▸ ITEM DROP ◂', colors.mint, null, true);
    scr.centerText(cy + 4, `${itemDrop.icon}  ${itemDrop.name}  (${itemDrop.rarity})`, rc, null, true);
    scr.render();
    await sleep(500);
  }

  scr.hline(2, h - 4, w - 4, '─', colors.ghost);
  scr.centerText(h - 3, 'Press any key to continue', colors.dimmer);
  scr.text(w - 14, h - 1, '─ rigémon ─', colors.dimmer);
  scr.render();

  await waitForKey();
  scr.exit();
}

// ═══════════════════════════════════════════════════════════════
// MAIN MENU RENDERER — single setInterval, diff-based rendering
// ═══════════════════════════════════════════════════════════════

async function mainMenu() {
  const screen = new Screen();
  const rng = createRNG(42);
  const matrix = new MatrixRain(screen.width, screen.height, rng);
  const w = screen.width;
  const h = screen.height;

  let cursor = 0;
  let frameCount = 0;
  let scanning = true;
  let myFighter = null;
  let done = false;
  let focus = 'menu';       // 'menu' or 'card'
  let cardBuildIdx = 0;     // which build is shown on the card
  let cardFighters = {};    // cache: buildIdx → fighter object

  // Load builds info
  const { getAllBuilds, getActiveBuildIndex, setActiveBuild, getBuild, applyBuildOverrides: applyOverrides, buildSpecsFromParts, isBuildComplete } = require('../src/parts');
  cardBuildIdx = getActiveBuildIndex();

  // Sparse rain for menu — evenly spaced columns with slight jitter for organic feel
  const spacing = 7; // ~14% density, guaranteed even left-to-right coverage
  for (const col of matrix.columns) {
    col.active = false;
    col.speed = rng.float(0.15, 0.6);
  }
  for (let base = 0; base < matrix.columns.length; base += spacing) {
    const jitter = rng.int(-1, 1);
    const x = Math.max(0, Math.min(matrix.columns.length - 1, base + jitter));
    matrix.columns[x].active = true;
  }

  // Scan hardware in background while menu renders
  let rawSpecs = null;
  getSpecs().then(async specs => {
    rawSpecs = specs;
    myFighter = await buildFighter(specs);
    cardFighters[0] = myFighter; // main build is always index 0 default
    // Pre-build the active build's fighter
    cardFighters[getActiveBuildIndex()] = myFighter;
    scanning = false;
  }).catch(() => { scanning = false; });

  screen.enter();

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let resolveChoice;
  const choicePromise = new Promise(r => { resolveChoice = r; });

  // Build a fighter for a specific build index (lazy, cached)
  async function ensureCardFighter(idx) {
    if (cardFighters[idx]) return;
    if (!rawSpecs) return;
    const builds = getAllBuilds();
    const build = builds[idx];
    if (!build) return;
    if (build.main) {
      // Main build uses real specs + overrides (already built as myFighter if idx 0)
      cardFighters[idx] = myFighter;
    } else {
      // Custom build — construct specs from parts
      const customSpecs = buildSpecsFromParts(build.parts, rawSpecs.id);
      const cStats = buildStats(customSpecs);
      const cName = fighterName(customSpecs);
      const cGpu = gpuName(customSpecs);
      const cSprite = getSprite(customSpecs);
      const cArch = classifyArchetype(cStats, customSpecs);
      cardFighters[idx] = { id: rawSpecs.id, name: cName, gpu: cGpu, stats: cStats, specs: customSpecs, sprite: cSprite, archetype: cArch };
    }
  }

  function onKey(key) {
    if (done) return;

    if (focus === 'menu') {
      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      } else if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % MENU_ITEMS.length;
      } else if (key === '\x1b[C' || key === 'l') {
        // Right arrow → focus on profile card
        if (!scanning) focus = 'card';
      } else if (key === '\r' || key === '\n' || key === ' ') {
        done = true;
        resolveChoice(MENU_ITEMS[cursor].key);
      } else if (key === '\x03' || key === 'q') {
        done = true;
        resolveChoice('quit');
      }
    } else if (focus === 'card') {
      const builds = getAllBuilds();
      if (key === '\x1b[D' || key === 'h') {
        // Left arrow → back to menu
        focus = 'menu';
      } else if (key === '\x1b[A' || key === 'k') {
        // Cycle builds up
        cardBuildIdx = (cardBuildIdx - 1 + builds.length) % builds.length;
        ensureCardFighter(cardBuildIdx);
      } else if (key === '\x1b[B' || key === 'j') {
        // Cycle builds down
        cardBuildIdx = (cardBuildIdx + 1) % builds.length;
        ensureCardFighter(cardBuildIdx);
      } else if (key === '\r' || key === '\n' || key === ' ') {
        // Set this build as active
        if (builds[cardBuildIdx]?.main || isBuildComplete(cardBuildIdx)) {
          setActiveBuild(cardBuildIdx);
          // Update myFighter to match the newly active build
          if (cardFighters[cardBuildIdx]) myFighter = cardFighters[cardBuildIdx];
        }
      } else if (key === '\x1b' || key === 'q') {
        focus = 'menu';
      } else if (key === '\x03') {
        done = true;
        resolveChoice('quit');
      }
    }
  }
  stdin.on('data', onKey);

  // ─── Layout constants (shared across draw functions) ───
  const useSmall = w < 65;
  const logo = useSmall ? LOGO_SMALL : LOGO;
  const menuX = 4;
  const menuY = logo.length + 5;
  const menuW = Math.min(50, w - 8);
  const menuH = MENU_ITEMS.length + 2; // borders + items
  const menuBottom = menuY + menuH;

  const boxW = Math.min(35, w - 8);
  const cardX = w - boxW - 4;
  const cardY = menuY;

  // Exclusion zone: keep rain out of the entire UI band (menu through card)
  matrix.exclusionZone = { x: 0, y: menuY - 1, w, h: (h - 2) - (menuY - 1) };

  // ─── Single render interval ───
  const renderLoop = setInterval(() => {
    frameCount++;
    screen.clear();
    matrix.update();
    matrix.draw(screen);

    drawLogo(screen, w, h, frameCount);
    drawMenu(screen, w, h, frameCount, cursor);
    drawProfileCard(screen, w, h, frameCount, scanning);
    drawFooter(screen, w, h);

    screen.render();
  }, FRAME_MS);

  const choice = await choicePromise;

  clearInterval(renderLoop);
  stdin.removeListener('data', onKey);
  try { stdin.setRawMode(false); } catch (e) {}
  try { stdin.pause(); } catch (e) {}

  // Brief transition animation on the menu screen
  const selectedItem = MENU_ITEMS.find(m => m.key === choice);
  const label = selectedItem ? selectedItem.label : '';
  const accent = ITEM_COLORS[choice] || colors.cyan;

  for (let i = 0; i < 8; i++) {
    screen.clear();

    const cy = Math.floor(h / 2);
    const dots = '.'.repeat((i % 3) + 1);
    screen.centerText(cy - 1, '─'.repeat(30), colors.dimmer);
    screen.centerText(cy, `${label}${dots}`, accent, null, true);
    screen.centerText(cy + 1, '─'.repeat(30), colors.dimmer);

    const spread = Math.floor((i / 8) * (w / 2));
    for (let x = Math.floor(w / 2) - spread; x <= Math.floor(w / 2) + spread; x++) {
      if (x >= 0 && x < w) screen.set(x, cy + 2, '━', i < 4 ? accent : colors.dimmer);
    }

    screen.render();
    await sleep(FRAME_MS);
  }

  screen.exit();

  return { choice, fighter: myFighter };

  // ─── Drawing helpers (all write to buffer, never call render) ───

  function drawLogo(screen, w, h, frame) {
    const logoY = 1;

    for (let i = 0; i < logo.length; i++) {
      const line = logo[i];
      const cx = Math.floor((w - line.length) / 2);
      for (let c = 0; c < line.length; c++) {
        if (line[c] === ' ') continue;
        const phase = (c / line.length + frame * 0.015) % 1;
        let color;
        if (phase < 0.33) color = colors.cyan;
        else if (phase < 0.66) color = colors.lavender;
        else color = colors.gold;
        screen.set(cx + c, logoY + i, line[c], color, null, true);
      }
    }

    // Subtitle
    const subY = logoY + logo.length + 1;
    screen.centerText(subY, SUBTITLE, colors.gold, null, true);

    // Scan line
    const scanX = Math.floor(w * 0.25);
    const scanW = Math.floor(w * 0.5);
    const scanProgress = (frame % 60) / 60;
    for (let i = 0; i < scanW; i++) {
      const norm = i / scanW;
      const dist = Math.abs(norm - scanProgress);
      if (dist < 0.06) screen.set(scanX + i, subY + 1, '━', colors.cyan);
      else if (dist < 0.12) screen.set(scanX + i, subY + 1, '─', colors.dimmer);
      else screen.set(scanX + i, subY + 1, '─', colors.ghost);
    }
  }

  function drawMenu(screen, w, h, frame, cursor) {
    const menuFocused = focus === 'menu';
    const borderCol = menuFocused ? colors.dimmer : colors.ghost;

    // Top border
    screen.text(menuX, menuY - 1, '╔' + '═'.repeat(menuW) + '╗', borderCol);

    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const y = menuY + i;
      const selected = i === cursor;
      const accent = ITEM_COLORS[item.key] || colors.dim;

      screen.text(menuX, y, '║', borderCol);
      screen.text(menuX + menuW + 1, y, '║', borderCol);

      if (selected && menuFocused) {
        const pulse = frame % 10 < 5;
        screen.text(menuX + 1, y, pulse ? ' ▸' : ' ►', colors.white, null, true);
        screen.text(menuX + 4, y, item.icon, accent, null, true);
        screen.text(menuX + 6, y, item.label.padEnd(16), colors.white, null, true);
        screen.text(menuX + 23, y, item.desc.slice(0, menuW - 23), accent);
      } else if (selected && !menuFocused) {
        // Still highlighted but dimmed when card is focused
        screen.text(menuX + 3, y, '▸', colors.dimmer);
        screen.text(menuX + 4, y, item.icon, colors.dim);
        screen.text(menuX + 6, y, item.label.padEnd(16), colors.dim);
        screen.text(menuX + 23, y, item.desc.slice(0, menuW - 23), colors.ghost);
      } else {
        screen.text(menuX + 4, y, item.icon, colors.dimmer);
        screen.text(menuX + 6, y, item.label.padEnd(16), menuFocused ? colors.dim : colors.ghost);
        screen.text(menuX + 23, y, item.desc.slice(0, menuW - 23), colors.ghost);
      }
    }

    // Bottom border
    screen.text(menuX, menuY + MENU_ITEMS.length, '╚' + '═'.repeat(menuW) + '╝', borderCol);
  }

  function drawProfileCard(screen, w, h, frame, scanning) {
    const focused = focus === 'card';
    const borderColor = focused ? colors.cyan : colors.dimmer;
    const builds = getAllBuilds();
    const activeIdx = getActiveBuildIndex();
    const isActive = cardBuildIdx === activeIdx;
    const build = builds[cardBuildIdx];
    const fighter = cardFighters[cardBuildIdx] || (cardBuildIdx === 0 ? myFighter : null);

    // Header with build name
    const headerLabel = build ? build.name : 'SYSTEM PROFILE';
    const activeTag = isActive ? ' ★' : '';
    screen.text(cardX, cardY, '┌─ ', borderColor);
    screen.text(cardX + 3, cardY, headerLabel.slice(0, boxW - 8), focused ? colors.white : colors.dim, null, focused);
    screen.text(cardX + 3 + Math.min(headerLabel.length, boxW - 8), cardY, activeTag, colors.gold, null, true);
    const afterLabel = 3 + Math.min(headerLabel.length, boxW - 8) + activeTag.length;
    const remainDash = Math.max(0, boxW + 1 - afterLabel);
    screen.text(cardX + afterLabel, cardY, ' ' + '─'.repeat(remainDash) + '┐', borderColor);

    if (focused && builds.length > 1) {
      screen.text(cardX + boxW - 2, cardY, '↕', colors.cyan, null, true);
    }

    if (fighter && !scanning) {
      const arch = fighter.archetype || { name: '???', tagline: '' };
      const s = fighter.stats;

      screen.text(cardX, cardY + 1, '│' + ' '.repeat(boxW) + '│', borderColor);
      screen.text(cardX + 2, cardY + 1, fighter.name.slice(0, boxW - 2), colors.cyan, null, true);

      screen.text(cardX, cardY + 2, '│' + ' '.repeat(boxW) + '│', borderColor);
      screen.text(cardX + 2, cardY + 2, arch.name, colors.gold);
      const tagSpace = boxW - 3 - arch.name.length;
      if (tagSpace > 4) screen.text(cardX + 3 + arch.name.length, cardY + 2, arch.tagline.slice(0, tagSpace), colors.dimmer);

      screen.text(cardX, cardY + 3, '├' + '─'.repeat(boxW) + '┤', borderColor);

      const barSmall = (val, max = 100, bw = 10) => {
        const filled = Math.round((val / max) * bw);
        return '█'.repeat(Math.min(filled, bw)) + '░'.repeat(bw - Math.min(filled, bw));
      };

      const statRows = [
        ['STR', s.str, 100, colors.peach],
        ['MAG', s.mag, 100, colors.lavender],
        ['SPD', s.spd, 100, colors.sky],
        ['DEF', s.def, 100, colors.mint],
        ['HP ', s.hp,  2000, colors.white],
      ];

      for (let i = 0; i < statRows.length; i++) {
        const [label, val, max, color] = statRows[i];
        const row = cardY + 4 + i;
        screen.text(cardX, row, '│' + ' '.repeat(boxW) + '│', borderColor);
        screen.text(cardX + 2, row, `${label} ${barSmall(val, max)} ${String(val).padStart(max > 999 ? 4 : 3)}`, color);
      }

      screen.text(cardX, cardY + 9, '├' + '─'.repeat(boxW) + '┤', borderColor);

      // Lore traits
      try {
        const { generateLore } = require('../src/lore');
        const lore = generateLore(s, fighter.specs, fighter.archetype);
        for (let i = 0; i < Math.min(lore.traits.length, 3); i++) {
          screen.text(cardX, cardY + 10 + i, '│' + ' '.repeat(boxW) + '│', borderColor);
          screen.text(cardX + 2, cardY + 10 + i, `· ${lore.traits[i]}`, colors.dim);
        }

        // Status row
        screen.text(cardX, cardY + 13, '│' + ' '.repeat(boxW) + '│', borderColor);
        if (focused) {
          if (isActive) {
            screen.text(cardX + 2, cardY + 13, '★ ACTIVE', colors.gold, null, true);
          } else if (build && (build.main || isBuildComplete(cardBuildIdx))) {
            screen.text(cardX + 2, cardY + 13, 'ENTER = set active', colors.dim);
          } else {
            screen.text(cardX + 2, cardY + 13, 'INCOMPLETE', colors.rose);
          }
          screen.text(cardX + boxW - 4, cardY + 13, `${cardBuildIdx + 1}/${builds.length}`, colors.dimmer);
        }
        screen.text(cardX, cardY + 14, '└' + '─'.repeat(boxW) + '┘', borderColor);
      } catch {
        screen.text(cardX, cardY + 10, '└' + '─'.repeat(boxW) + '┘', borderColor);
      }
    } else {
      screen.text(cardX, cardY + 1, '│' + ' '.repeat(boxW) + '│', borderColor);
      const dots = '.'.repeat((frame % 4) + 1);
      screen.text(cardX + 2, cardY + 1, `Scanning hardware${dots}`, colors.dim);
      for (let i = 2; i <= 8; i++) {
        screen.text(cardX, cardY + i, '│' + ' '.repeat(boxW) + '│', borderColor);
      }
      screen.text(cardX, cardY + 9, '└' + '─'.repeat(boxW) + '┘', borderColor);
    }
  }

  function drawFooter(screen, w, h) {
    const footY = h - 2;
    screen.hline(2, footY, w - 4, '─', colors.ghost);
    if (focus === 'menu') {
      screen.text(4, footY, ' ↑↓ navigate ', colors.dim);
      screen.text(19, footY, ' ENTER select ', colors.dim);
      screen.text(35, footY, ' → profile ', colors.dim);
      screen.text(48, footY, ' Q quit ', colors.dim);
    } else {
      screen.text(4, footY, ' ↑↓ switch build ', colors.dim);
      screen.text(23, footY, ' ENTER activate ', colors.dim);
      screen.text(41, footY, ' ← menu ', colors.dim);
    }
    screen.text(w - 14, h - 1, '─ rigémon ─', colors.dimmer);
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

// Show content in alt screen, wait for keypress to dismiss
async function showInfoScreen(title, renderFn) {
  const infoScreen = new Screen();
  infoScreen.enter();

  const w = infoScreen.width;
  const h = infoScreen.height;

  // Title bar
  infoScreen.centerText(0, '─'.repeat(w), colors.dimmer);
  infoScreen.centerText(0, ` ${title} `, colors.cyan, null, true);

  // Content
  renderFn(infoScreen, w, h);

  // Footer
  infoScreen.hline(2, h - 2, w - 4, '─', colors.ghost);
  infoScreen.text(4, h - 2, ' Press any key to return ', colors.dim);
  infoScreen.text(w - 14, h - 1, '─ rigémon ─', colors.dimmer);

  infoScreen.render();

  // Wait for key
  await waitForKey();
  infoScreen.exit();
}

async function handleProfile(fighter) {
  if (!fighter) {
    await withLoadingScreen('Scanning hardware', async () => {
      const specs = await getSpecs();
      fighter = await buildFighter(specs);
    });
  }
  const { openProfile } = require('../src/profilescreen');
  const { getPassiveInfo } = require('../src/balance');
  const { getBalance, formatBalance } = require('../src/credits');

  const arch = fighter.archetype || { name: '???', tagline: '' };
  const passive = getPassiveInfo(arch.name);
  const creditsStr = formatBalance(getBalance());

  const profScreen = new Screen();
  profScreen.enter();
  await openProfile(fighter, profScreen, { passive, credits: creditsStr });
  profScreen.exit();
}

async function handleDemo(fighter, turnMode) {
  if (!fighter) {
    await withLoadingScreen('Scanning hardware', async () => {
      const specs = await getSpecs();
      fighter = await buildFighter(specs);
    });
  }

  // Opponent selection screen
  const { selectOpponent } = require('../src/opponentselect');
  const selectScreen = new Screen();
  selectScreen.enter();
  const opponent = await selectOpponent(selectScreen);
  selectScreen.exit();

  if (!opponent) return; // user pressed ESC

  // Prepare battle data
  let seed, myMoves, oppMoves, events;
  await withLoadingScreen('Preparing battle', async () => {
    seed = combinedSeed(fighter.id, opponent.id);

    if (turnMode && renderTurnBattle) {
      myMoves = getEquippedMoves(fighter.stats, fighter.specs, fighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch (e) {}
      oppMoves = assignMoveset(opponent.stats);
    } else {
      events = simulate(fighter, opponent, seed);
    }
  });

  // Battle runs its own screen
  let winner;
  if (turnMode && renderTurnBattle) {
    winner = await renderTurnBattle(fighter, opponent, myMoves, oppMoves, { role: 'host', seed });
  } else {
    winner = await renderBattle(fighter, opponent, events);
  }

  const oppName = opponent.name || 'the opponent';
  const rewards = postBattle(fighter, opponent, winner, turnMode ? 'turns' : 'auto');
  await showBattleRewards(winner, rewards, `Your rig destroyed ${oppName}!`, `...${oppName} won.`);
}

async function handleDash(fighter) {
  if (!fighter) {
    await withLoadingScreen('Scanning hardware', async () => {
      const specs = await getSpecs();
      fighter = await buildFighter(specs);
    });
  }

  if (!renderDash) {
    await showInfoScreen('DASH MODE', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Dash mode unavailable.', colors.rose);
    });
    return;
  }

  let playAgain = true;
  while (playAgain) {
    const result = await renderDash(fighter);

    // Award credits based on dash score
    const { calculateDashCredits, addCredits } = require('../src/credits');
    const earned = calculateDashCredits(result.score);
    const newBal = addCredits(earned);

    // Show result screen with retry / quit options
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    const cy = Math.floor(h / 2);

    scr.centerText(0, '─'.repeat(w), colors.dimmer);
    scr.centerText(0, ' RUN COMPLETE ', colors.cyan, null, true);

    scr.centerText(cy - 3, '▸ ▸ ▸  D A S H  M O D E  ◂ ◂ ◂', colors.coral, null, true);
    scr.centerText(cy - 1, `Final Score: ${result.score}`, colors.gold, null, true);
    if (result.reason === 'dead') {
      scr.centerText(cy + 1, 'Your rig crashed!', colors.rose);
    } else {
      scr.centerText(cy + 1, 'Run ended.', colors.dim);
    }
    scr.centerText(cy + 3, `◆ +${earned} credits  (balance: ${newBal})`, colors.gold);

    scr.hline(2, h - 4, w - 4, '─', colors.ghost);
    scr.centerText(h - 3, '[R] Retry    [Q] Return to Menu', colors.white);
    scr.text(w - 14, h - 1, '─ rigémon ─', colors.dimmer);
    scr.render();

    const key = await waitForKeyReturn();
    scr.exit();

    playAgain = (key === 'r' || key === 'R');
  }
}

async function handleRogue(fighter) {
  if (!fighter) {
    await withLoadingScreen('Scanning hardware', async () => {
      const specs = await getSpecs();
      fighter = await buildFighter(specs);
    });
  }

  if (!renderRogue) {
    await showInfoScreen('ROGUE MODE', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Rogue mode unavailable.', colors.rose);
    });
    return;
  }

  const result = await renderRogue(fighter);

  // Show result screen
  const scr = new Screen();
  scr.enter();
  const w = scr.width;
  const h = scr.height;
  const cy = Math.floor(h / 2);

  scr.centerText(0, '─'.repeat(w), colors.dimmer);
  scr.centerText(0, ' ROGUE COMPLETE ', rgb(75, 150, 90), null, true);

  if (result.reason === 'victory') {
    scr.centerText(cy - 3, '★ ★ ★  A L L  E N E M I E S  D E F E A T E D  ★ ★ ★', colors.gold, null, true);
    scr.centerText(cy - 1, `Battles won: ${result.battlesWon}`, colors.cyan);

    // Award bonus credits for rogue completion
    const { addCredits } = require('../src/credits');
    const bonus = 500 * result.battlesWon;
    const newBal = addCredits(bonus);
    scr.centerText(cy + 1, `◆ +${bonus} bonus credits  (balance: ${newBal})`, colors.gold);
  } else {
    scr.centerText(cy - 3, 'R O G U E  M O D E', rgb(75, 150, 90), null, true);
    scr.centerText(cy - 1, `Battles won: ${result.battlesWon}`, colors.dim);
    scr.centerText(cy + 1, 'You left the void.', colors.dim);
  }

  scr.hline(2, h - 4, w - 4, '─', colors.ghost);
  scr.centerText(h - 3, 'Press any key to continue', colors.dimmer);
  scr.text(w - 14, h - 1, '─ rigémon ─', colors.dimmer);
  scr.render();

  await waitForKeyReturn();
  scr.exit();
}

async function handleBag() {
  const items = getOwnedItems();
  await showInfoScreen('BAG', (scr, w, h) => {
    if (items.length === 0) {
      scr.text(4, 3, 'Empty — win battles to earn items.', colors.dim);
    } else {
      scr.text(4, 2, `${items.reduce((s, i) => s + i.count, 0)} items total`, colors.dim);
      for (let i = 0; i < items.length && i < h - 6; i++) {
        const item = items[i];
        const rc = RARITY_COLORS[item.rarity] || colors.dim;
        const y = 4 + i;
        scr.text(4, y, item.icon, rc);
        scr.text(6, y, `${item.name} x${item.count}`.padEnd(24), colors.white);
        scr.text(31, y, item.desc, colors.dim);
      }
    }
  });
}

async function handleHistory() {
  const { getRecords } = require('../src/history');
  const records = getRecords();
  const opponents = Object.values(records);
  opponents.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed));

  const { timeAgo } = require('../src/history');

  await showInfoScreen('BATTLE LOG', (scr, w, h) => {
    if (opponents.length === 0) {
      scr.text(4, 3, 'No match history yet. Go battle someone!', colors.dim);
      return;
    }

    const totalW = opponents.reduce((s, o) => s + o.wins, 0);
    const totalL = opponents.reduce((s, o) => s + o.losses, 0);
    const totalPct = totalW + totalL > 0 ? Math.round((totalW / (totalW + totalL)) * 100) : 0;

    scr.text(4, 2, `Overall: ${totalW}W - ${totalL}L (${totalPct}%)`, colors.cyan, null, true);
    scr.hline(4, 3, w - 8, '─', colors.ghost);

    let y = 4;
    const maxRows = h - 7;
    for (const opp of opponents) {
      if (y >= maxRows) { scr.text(4, y, `... and ${opponents.length - opponents.indexOf(opp)} more`, colors.dim); break; }
      const total = opp.wins + opp.losses;
      const pct = Math.round((opp.wins / total) * 100);
      const winColor = opp.wins >= opp.losses ? colors.mint : colors.rose;
      const last = timeAgo(opp.lastPlayed);

      scr.text(4, y, `vs ${opp.name.slice(0, 28)}`, colors.white, null, true);
      scr.text(36, y, `${opp.wins}W-${opp.losses}L`, winColor);
      scr.text(46, y, `${pct}%`, colors.dim);
      scr.text(52, y, last, colors.ghost);
      y++;
      if (opp.gpu) {
        scr.text(7, y, opp.gpu.slice(0, 40), colors.dim);
        y++;
      }
    }
  });
}

async function handleLoadout(fighter) {
  if (!fighter) {
    await withLoadingScreen('Scanning hardware', async () => {
      const specs = await getSpecs();
      fighter = await buildFighter(specs);
    });
  }
  const { getAvailableMoves, getEquippedMoves: getEq } = require('../src/moveset');
  const available = getAvailableMoves(fighter.stats);
  const equipped = getEq(fighter.stats);
  let sigMoves = [];
  try { sigMoves = generateSignatureMoves(fighter.stats, fighter.specs, fighter.archetype); } catch (e) {}

  await showInfoScreen('LOADOUT', (scr, w, h) => {
    let y = 2;

    if (sigMoves.length > 0) {
      scr.text(4, y++, `${SIGNATURE_ICON} SIGNATURE MOVES`, colors.gold, null, true);
      y++;
      for (const m of sigMoves) {
        scr.text(4, y, SIGNATURE_ICON, colors.gold);
        scr.text(6, y, m.label.padEnd(22), colors.white, null, true);
        scr.text(29, y, 'SIGNATURE', colors.peach);
        scr.text(40, y++, m.desc, colors.dim);
      }
      y++;
    }

    scr.text(4, y++, '⚔ EQUIPPED MOVES', colors.cyan, null, true);
    y++;
    equipped.forEach((m, i) => {
      scr.text(4, y, `${i + 1}.`, colors.gold);
      scr.text(7, y, m.label.padEnd(22), colors.white, null, true);
      scr.text(30, y, m.cat.padEnd(10), colors.dim);
      scr.text(41, y++, m.desc, colors.dim);
    });

    y += 2;
    scr.text(4, y, `${available.length} moves available. Use loadout picker in turn-based pre-battle.`, colors.dim);
  });
}

async function handleWorkshop(fighter) {
  let specs;
  await withLoadingScreen('Loading workshop', async () => {
    specs = await getSpecs();
  });

  try {
    const { openWorkshop } = require('../src/workshop');
    const workshopScreen = new Screen();
    workshopScreen.enter();
    await openWorkshop(specs, workshopScreen);
    workshopScreen.exit();
  } catch (e) {
    // Workshop module may not exist on all branches
    await showInfoScreen('WORKSHOP', (scr) => {
      scr.text(4, 4, 'Workshop not available.', colors.dim);
    });
  }
}

async function handleLootBox() {
  try {
    const { openLootShop } = require('../src/lootbox');
    const lootScreen = new Screen();
    lootScreen.enter();
    await openLootShop(lootScreen);
    lootScreen.exit();
  } catch (e) {
    await showInfoScreen('LOOT BOX', (scr) => {
      scr.text(4, 4, 'Loot box not available.', colors.dim);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// INLINE MULTIPLAYER — Host & Join flows inside the launcher
// ═══════════════════════════════════════════════════════════════

// Pick from a list of options on an alt screen
function pickOption(title, options) {
  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let cursor = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      scr.clear();
      scr.centerText(0, '─'.repeat(w), colors.dimmer);
      scr.centerText(0, ` ${title} `, colors.cyan, null, true);

      const startY = Math.floor(h / 2) - Math.floor(options.length);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const y = startY + i * 2;
        const sel = i === cursor;
        if (sel) {
          scr.centerText(y, `▸ ${opt.label}`, colors.white, null, true);
          scr.centerText(y + 1, opt.desc, colors.dim);
        } else {
          scr.centerText(y, `  ${opt.label}`, colors.dim);
        }
      }

      scr.hline(2, h - 2, w - 4, '─', colors.ghost);
      scr.text(4, h - 2, ' ↑↓ choose  ENTER select  Esc back ', colors.dim);
      scr.render();
    }

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % options.length;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        cleanup();
        scr.exit();
        resolve(options[cursor].key);
      } else if (key === '\x1b' || key === 'q') {
        cleanup();
        scr.exit();
        resolve(null);
      } else if (key === '\x03') {
        cleanup();
        scr.exit();
        process.exit(0);
      }
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

// Text input screen — returns the typed string or null on Esc
function textInput(title, prompt) {
  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let buf = '';

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      scr.clear();
      scr.centerText(0, '─'.repeat(w), colors.dimmer);
      scr.centerText(0, ` ${title} `, colors.lilac, null, true);

      const cy = Math.floor(h / 2);
      scr.centerText(cy - 2, prompt, colors.dim);
      const inputLine = `> ${buf}_`;
      scr.centerText(cy, inputLine, colors.white, null, true);

      scr.centerText(cy + 3, 'Type the room code and press Enter', colors.dimmer);
      scr.centerText(cy + 4, 'Esc to go back', colors.dimmer);

      scr.hline(2, h - 2, w - 4, '─', colors.ghost);
      scr.render();
    }

    function onKey(key) {
      if (key === '\r' || key === '\n') {
        const val = buf.trim();
        cleanup();
        scr.exit();
        resolve(val.length > 0 ? val : null);
      } else if (key === '\x1b' || (key === 'q' && buf.length === 0)) {
        cleanup();
        scr.exit();
        resolve(null);
      } else if (key === '\x7f' || key === '\b') {
        buf = buf.slice(0, -1);
        render();
      } else if (key === '\x03') {
        cleanup();
        scr.exit();
        process.exit(0);
      } else if (key.length === 1 && key >= ' ' && buf.length < 30) {
        buf += key;
        render();
      }
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

async function handleHost(fighter) {
  // Step 1: Pick battle mode
  const mode = await pickOption('HOST GAME', [
    { key: 'turns', label: 'TURN-BASED', desc: 'Take turns choosing moves' },
    { key: 'auto',  label: 'QUICK BATTLE', desc: 'Auto-simulated fight' },
  ]);
  if (!mode) return;

  const turnMode = mode === 'turns';

  // Step 2: Pick connection type
  const connType = await pickOption('CONNECTION', [
    { key: 'online', label: 'ONLINE', desc: 'Host via relay server (share room code)' },
    { key: 'lan',    label: 'LAN', desc: 'Host on local network (share your IP)' },
  ]);
  if (!connType) return;

  const online = connType === 'online';

  // Step 3: Scan hardware and connect
  let myFighter = fighter;
  let opponent, matchSeed = 0, roomCode, seed;

  // Suppress console.log from relay/network modules during screen mode
  const origLog = console.log;
  const logBuffer = [];
  console.log = (...args) => logBuffer.push(args.map(String).join(' '));

  try {
    if (online) {
      // Host online — show waiting screen with room code
      const { hostOnline, DEFAULT_RELAY_URL } = require('../src/relay');

      await withLoadingScreen('Scanning hardware', async () => {
        if (!myFighter) {
          const specs = await getSpecs();
          myFighter = await buildFighter(specs);
        }
      });

      // Create room (briefly suppress logs)
      let createResult;
      await withLoadingScreen('Creating room', async () => {
        const base = DEFAULT_RELAY_URL.replace(/\/$/, '');
        const http = require('node:http');
        const https = require('node:https');
        const parsed = new URL(`${base}/rooms`);
        const mod = parsed.protocol === 'https:' ? https : http;
        const payload = JSON.stringify({ fighter: myFighter });

        createResult = await new Promise((resolve, reject) => {
          const req = mod.request(parsed, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: 10000,
          }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
              try { resolve(JSON.parse(data)); }
              catch { reject(new Error('Invalid relay response')); }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
          req.write(payload);
          req.end();
        });
      });

      roomCode = createResult.code;
      matchSeed = createResult.matchSeed || 0;

      // Show room code and wait for opponent
      const waitScreen = new Screen();
      waitScreen.enter();
      const ww = waitScreen.width;
      const wh = waitScreen.height;
      const cy = Math.floor(wh / 2);
      let waitFrame = 0;
      let matched = false;
      let waitError = null;

      const spinChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

      // Poll in background
      const base = DEFAULT_RELAY_URL.replace(/\/$/, '');
      const pollStart = Date.now();
      const POLL_TIMEOUT = 15 * 60_000;

      (async () => {
        const http = require('node:http');
        const https = require('node:https');
        while (!matched && Date.now() - pollStart < POLL_TIMEOUT) {
          await new Promise(r => setTimeout(r, 500));
          try {
            const parsed = new URL(`${base}/rooms/${roomCode}`);
            const mod = parsed.protocol === 'https:' ? https : http;
            const result = await new Promise((resolve, reject) => {
              const req = mod.request(parsed, { method: 'GET', timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', c => { data += c; });
                res.on('end', () => {
                  try { resolve(JSON.parse(data)); }
                  catch { reject(new Error('bad response')); }
                });
              });
              req.on('error', reject);
              req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
              req.end();
            });
            if (result.status === 'matched' && result.fighter) {
              opponent = result.fighter;
              matchSeed = result.matchSeed || matchSeed;
              matched = true;
            }
          } catch (err) {
            if (err.message.includes('429')) await new Promise(r => setTimeout(r, 2000));
          }
        }
        if (!matched) waitError = 'Timed out waiting for opponent.';
      })();

      // Render waiting screen
      const waitInterval = setInterval(() => {
        waitFrame++;
        waitScreen.clear();

        waitScreen.centerText(0, '─'.repeat(ww), colors.dimmer);
        waitScreen.centerText(0, ' HOST GAME ', colors.coral, null, true);

        waitScreen.centerText(cy - 4, 'Share this room code with your opponent:', colors.dim);
        waitScreen.centerText(cy - 2, `╔═══════════════════╗`, colors.cyan);
        waitScreen.centerText(cy - 1, `║    ${roomCode}     ║`, colors.white, null, true);
        waitScreen.centerText(cy,     `╚═══════════════════╝`, colors.cyan);

        waitScreen.centerText(cy + 2, `Mode: ${turnMode ? 'Turn-Based' : 'Quick Battle'}`, colors.dim);

        const spin = spinChars[waitFrame % spinChars.length];
        waitScreen.centerText(cy + 4, `${spin}  Waiting for opponent...`, colors.cyan);

        waitScreen.hline(2, wh - 2, ww - 4, '─', colors.ghost);
        waitScreen.text(4, wh - 2, ' Esc to cancel ', colors.dim);

        waitScreen.render();
      }, 50);

      // Allow Esc to cancel
      const cancelPromise = new Promise(resolve => {
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        function onK(key) {
          if (key === '\x1b' || key === 'q' || key === '\x03') {
            stdin.removeListener('data', onK);
            stdin.setRawMode(false);
            stdin.pause();
            resolve('cancel');
          }
        }
        stdin.on('data', onK);
      });

      // Wait for match or cancel
      while (!matched && !waitError) {
        const result = await Promise.race([
          new Promise(r => setTimeout(r, 100)),
          cancelPromise,
        ]);
        if (result === 'cancel') {
          clearInterval(waitInterval);
          waitScreen.exit();
          console.log = origLog;
          return;
        }
      }

      clearInterval(waitInterval);
      waitScreen.exit();

      if (waitError) {
        console.log = origLog;
        await showInfoScreen('ERROR', (scr) => {
          scr.text(4, 4, waitError, colors.rose);
        });
        return;
      }

    } else {
      // Host LAN
      const { host: hostLAN, PORT } = require('../src/network');

      await withLoadingScreen('Scanning hardware', async () => {
        if (!myFighter) {
          const specs = await getSpecs();
          myFighter = await buildFighter(specs);
        }
      });

      // Start server and wait
      const result = await hostLAN(myFighter);
      opponent = result.opponent;
    }

    // Rebuild opponent sprite
    if (opponent.specs) opponent.sprite = getSprite(opponent.specs);

    console.log = origLog;

    // Compute seed
    seed = combinedSeed(myFighter.id, opponent.id) ^ matchSeed;

    // Run battle
    let winner;
    if (turnMode && renderTurnBattle) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats);
      winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, {
        role: 'host', roomCode, relayUrl: require('../src/relay').DEFAULT_RELAY_URL, seed,
      });
    } else {
      const events = simulate(myFighter, opponent, seed);
      winner = await renderBattle(myFighter, opponent, events);
    }

    const rewards = postBattle(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');
    await showBattleRewards(winner, rewards, 'Your rig wins the online battle!', 'Opponent\'s rig wins.');

  } catch (err) {
    console.log = origLog;
    await showInfoScreen('ERROR', (scr) => {
      scr.text(4, 4, `Connection error: ${err.message}`, colors.rose);
      scr.text(4, 6, 'Press any key to return to menu.', colors.dim);
    });
  } finally {
    console.log = origLog;
  }
}

async function handleJoin(fighter) {
  // Step 1: Get room code / IP
  const code = await textInput('JOIN BATTLE', 'Enter room code or IP address:');
  if (!code) return;

  const { ROOM_CODE_PATTERN, joinOnline, DEFAULT_RELAY_URL } = require('../src/relay');
  const { join: joinLAN, PORT } = require('../src/network');
  const isRoomCode = ROOM_CODE_PATTERN.test(code);

  // Suppress console.log from network modules
  const origLog = console.log;
  console.log = () => {};

  try {
    let myFighter = fighter;
    let opponent, matchSeed = 0, roomCode;

    await withLoadingScreen('Scanning hardware', async () => {
      if (!myFighter) {
        const specs = await getSpecs();
        myFighter = await buildFighter(specs);
      }
    });

    await withLoadingScreen(isRoomCode ? `Joining room ${code.toUpperCase()}` : `Connecting to ${code}`, async () => {
      if (isRoomCode) {
        const result = await joinOnline(myFighter, code, DEFAULT_RELAY_URL);
        opponent = result.opponent;
        matchSeed = result.matchSeed || 0;
        roomCode = code.toUpperCase();
      } else {
        const result = await joinLAN(myFighter, code);
        opponent = result.opponent;
      }
    });

    if (opponent.specs) opponent.sprite = getSprite(opponent.specs);

    console.log = origLog;

    // Auto-detect turn mode: default to turns since that's the richer experience
    const turnMode = !!renderTurnBattle;

    const seed = combinedSeed(opponent.id, myFighter.id) ^ matchSeed;
    let winner;

    if (turnMode) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats);
      winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, {
        role: 'joiner', roomCode, relayUrl: DEFAULT_RELAY_URL, seed,
      });
    } else {
      const events = simulate(opponent, myFighter, seed);
      const swapped = events.map(e => {
        const s = { ...e };
        const swapAB = v => v === 'a' ? 'b' : v === 'b' ? 'a' : v;
        if ('who' in s) s.who = swapAB(s.who);
        if ('target' in s) s.target = swapAB(s.target);
        if ('winner' in s) s.winner = swapAB(s.winner);
        if ('loser' in s) s.loser = swapAB(s.loser);
        if ('attacker' in s) s.attacker = swapAB(s.attacker);
        const tmpHp = s.hpA; s.hpA = s.hpB; s.hpB = tmpHp;
        const tmpMax = s.maxHpA; s.maxHpA = s.maxHpB; s.maxHpB = tmpMax;
        const tmpFinal = s.finalHpA; s.finalHpA = s.finalHpB; s.finalHpB = tmpFinal;
        return s;
      });
      winner = await renderBattle(myFighter, opponent, swapped);
    }

    const rewards = postBattle(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');
    await showBattleRewards(winner, rewards, 'Your rig wins!', 'Opponent\'s rig wins.');

  } catch (err) {
    console.log = origLog;
    await showInfoScreen('ERROR', (scr) => {
      scr.text(4, 4, `Connection error: ${err.message}`, colors.rose);
      scr.text(4, 6, 'Press any key to return to menu.', colors.dim);
    });
  } finally {
    console.log = origLog;
  }
}

// ═══════════════════════════════════════════════════════════════
// LOADING BRIDGE — animated loading screen that covers async gaps
// Runs a spinner until the provided async function completes,
// then exits cleanly so the next screen can take over.
// ═══════════════════════════════════════════════════════════════

async function withLoadingScreen(label, asyncFn) {
  const loadScreen = new Screen();
  loadScreen.enter();

  const w = loadScreen.width;
  const h = loadScreen.height;
  const cy = Math.floor(h / 2);
  const spinChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frame = 0;
  let done = false;

  // Animate while the async work runs
  const anim = setInterval(() => {
    frame++;
    loadScreen.clear();

    loadScreen.centerText(0, '─'.repeat(w), colors.dimmer);
    loadScreen.centerText(0, ' R I G É M O N', colors.cyan, null, true);

    const spin = spinChars[frame % spinChars.length];
    loadScreen.centerText(cy, `${spin}  ${label}...`, colors.cyan, null, true);

    // Subtle pulsing bar
    const barW = 20;
    const barX = Math.floor((w - barW) / 2);
    const pulse = Math.floor((Math.sin(frame * 0.3) + 1) * barW / 2);
    for (let i = 0; i < barW; i++) {
      const dist = Math.abs(i - pulse);
      loadScreen.set(barX + i, cy + 2, '─', dist < 3 ? colors.cyan : dist < 6 ? colors.dimmer : colors.ghost);
    }

    loadScreen.render();
  }, FRAME_MS);

  try {
    await asyncFn();
  } finally {
    done = true;
    clearInterval(anim);
    loadScreen.exit();
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP — returns to menu after each action
// ═══════════════════════════════════════════════════════════════

async function run() {
  while (true) {
    const { choice, fighter } = await mainMenu();

    switch (choice) {
      case 'demo':
        await handleDemo(fighter, false);
        break;
      case 'demo_turns':
        await handleDemo(fighter, true);
        break;
      case 'dash':
        await handleDash(fighter);
        break;
      case 'rogue':
        await handleRogue(fighter);
        break;
      case 'profile':
        await handleProfile(fighter);
        break;
      case 'loadout':
        await handleLoadout(fighter);
        break;
      case 'bag':
        await handleBag();
        break;
      case 'workshop':
        await handleWorkshop(fighter);
        break;
      case 'lootbox':
        await handleLootBox();
        break;
      case 'history':
        await handleHistory();
        break;
      case 'host':
        await handleHost(fighter);
        break;
      case 'join':
        await handleJoin(fighter);
        break;
      case 'quit':
        process.exit(0);
    }
    // Each handler uses showInfoScreen which waits for key — loop back to menu
  }
}

function waitForKey() {
  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.once('data', (key) => {
      if (key === '\x03') process.exit(0);
      stdin.setRawMode(false);
      stdin.pause();
      resolve();
    });
  });
}

function waitForKeyReturn() {
  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.once('data', (key) => {
      if (key === '\x03') process.exit(0);
      stdin.setRawMode(false);
      stdin.pause();
      resolve(key);
    });
  });
}

run().catch(err => {
  console.error(`\x1b[38;2;240;150;170m  ✗ Error: ${err.message}\x1b[0m`);
  process.exit(1);
});
