#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════
// KERNELMON — Main Terminal Launcher
// Full-screen interactive menu with animated matrix background
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('../src/screen');
const { ESC, colors, hpColor, rgb, RESET, BOLD } = require('../src/palette');
const { MatrixRain } = require('../src/effects/matrix');
const { createRNG } = require('../src/rng');
const { getSpecs, buildStats, fighterName, gpuName, classifyArchetype } = require('../src/profiler');
const { getSprite } = require('../src/sprites');
const { getEquippedMoves, assignMoveset } = require('../src/moveset');
const { generateSignatureMoves, SIGNATURE_ICON } = require('../src/signature');
const { registerSignatureAnims } = require('../src/effects/projectile');
const { getOwnedItems, RARITY_COLORS } = require('../src/items');
const { getEquippedSkinId, applySkinOverride } = require('../src/skins');
const { getEquippedTitleId } = require('../src/titles');
const { printHistory } = require('../src/history');
const { simulate } = require('../src/battle');
const { renderBattle } = require('../src/renderer');
const { combinedSeed } = require('../src/rng');
const { runBenchToBattleTransition } = require('../src/benchmark');

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
const MOUSE_INPUT_ON = `${ESC}?1000h${ESC}?1006h`;
const MOUSE_INPUT_OFF = `${ESC}?1000l${ESC}?1006l`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function enableMouseInput() {
  if (process.stdout.isTTY) process.stdout.write(MOUSE_INPUT_ON);
}

function disableMouseInput() {
  if (process.stdout.isTTY) process.stdout.write(MOUSE_INPUT_OFF);
}

function getMouseWheelDirection(input) {
  const match = /^\x1b\[<(\d+);(\d+);(\d+)([mM])$/.exec(input);
  if (!match) return null;

  const code = Number(match[1]);
  if ((code & 64) === 0) return null;

  const wheelAxis = code & 3;
  if (wheelAxis === 0) return 'up';
  if (wheelAxis === 1) return 'down';
  return null;
}

// ─── ASCII Logo ───
const LOGO = [
  '██╗  ██╗███████╗██████╗ ███╗   ██╗███████╗██╗     ███╗   ███╗ ██████╗ ███╗   ██╗',
  '██║ ██╔╝██╔════╝██╔══██╗████╗  ██║██╔════╝██║     ████╗ ████║██╔═══██╗████╗  ██║',
  '█████╔╝ █████╗  ██████╔╝██╔██╗ ██║█████╗  ██║     ██╔████╔██║██║   ██║██╔██╗ ██║',
  '██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝  ██║     ██║╚██╔╝██║██║   ██║██║╚██╗██║',
  '██║  ██╗███████╗██║  ██║██║ ╚████║███████╗███████╗██║ ╚═╝ ██║╚██████╔╝██║ ╚████║',
  '╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝',
];

const LOGO_SMALL = [
  '╦╔═╔═╗╦═╗╔╗╔╔═╗╦  ╔╦╗╔═╗╔╗╔',
  '╠╩╗║╣ ╠╦╝║║║║╣ ║  ║║║║ ║║║║',
  '╩ ╩╚═╝╩╚═╝╚╝╚═╝╩═╝╩ ╩╚═╝╝╚╝',
];

const SUBTITLE = '◄ YOUR KERNEL. YOUR FIGHTER. ►';

const MENU_ITEMS = [
  { key: 'local',       label: 'LOCAL',            desc: 'Solo battles & gym ladder',   icon: '◉' },
  { key: 'online',      label: 'ONLINE',           desc: 'Host, join & wager matches',  icon: '◎' },
  { key: 'minigame',    label: 'MINIGAME',         desc: 'Dash, hack & more',           icon: '▸' },
  { key: 'demo',        label: 'QUICK BATTLE',    desc: 'Auto-battle vs Chromebook',  icon: '⚡' },
  { key: 'demo_turns',  label: 'TURN BATTLE',     desc: 'Turn-based vs Chromebook',   icon: '◆' },
  { key: 'dash',        label: 'DASH MODE',       desc: 'Side-scroll obstacle runner', icon: '▸' },
  { key: 'hackgrid',    label: 'HACK THE GRID',   desc: 'Dodge sentries, grab data',   icon: '⌬' },
  { key: 'rogue',       label: 'SOLO MODE',       desc: 'Explore the void, find battles', icon: '◉' },
  { key: 'gym',         label: 'GYM LADDER',      desc: 'Fight gym leaders in order',    icon: '▲' },
  { key: 'profile',     label: 'MY PROFILE',      desc: 'View your fighter stats',    icon: '◈' },
  { key: 'loadout',     label: 'LOADOUT',          desc: 'Configure equipped moves',   icon: '⚔' },
  { key: 'bag',         label: 'BAG',              desc: 'View collected items',       icon: '◰' },
  { key: 'workshop',    label: 'WORKSHOP',         desc: 'Swap parts on your build',   icon: '▣' },
  { key: 'skins',       label: 'SKIN LOCKER',      desc: 'View & equip Transcendent skins', icon: '✧' },
  { key: 'lootbox',     label: 'LOOT BOX',         desc: 'Spend credits on crates',    icon: '✦' },
  { key: 'market',      label: 'MARKET',            desc: 'Trade skins with players',   icon: '⇌' },
  { key: 'kerneldex',   label: 'KERNELDEX',        desc: 'Rigs you\'ve scanned',       icon: '◈' },
  { key: 'guide',       label: 'GUIDE',            desc: 'Combat basics & matchups',   icon: '?' },
  { key: 'redeem',      label: 'REDEEM CODE',      desc: 'Enter a code for rewards',   icon: '▸' },
  { key: 'casino',      label: 'CASINO',            desc: 'Gamble credits on card games', icon: '♠' },
  { key: 'history',     label: 'BATTLE LOG',       desc: 'Past match history',         icon: '▤' },
  { key: 'wager',       label: 'WAGER',             desc: 'Stake credits in online PvP', icon: '◆' },
  { key: 'host',        label: 'HOST GAME',        desc: 'Host a battle for others',   icon: '◎' },
  { key: 'join',        label: 'JOIN BATTLE',      desc: 'Enter a room code to join',  icon: '↗' },
  { key: 'cardbattle',  label: 'CARD BATTLE',       desc: 'Battle with equipped cards',  icon: '♦' },
  { key: 'cards',       label: 'CARD BINDER',      desc: 'View your card collection',  icon: '♠' },
  { key: 'update',      label: 'UPDATE',            desc: 'Pull latest and restart',    icon: '↻' },
  { key: 'quit',        label: 'EXIT',             desc: 'Disconnect',                 icon: '×' },
];

const ITEM_COLORS = {
  local:       colors.coral,
  online:      colors.lilac,
  minigame:    rgb(0, 255, 180),
  demo:        colors.peach,
  demo_turns:  colors.gold,
  dash:        colors.coral,
  rogue:       rgb(75, 150, 90),
  gym:         rgb(255, 180, 60),
  hackgrid:    rgb(0, 255, 180),
  profile:     colors.cyan,
  loadout:     colors.lavender,
  bag:         colors.mint,
  workshop:    rgb(255, 215, 0),
  skins:       rgb(200, 120, 255),
  lootbox:     rgb(240, 170, 50),
  market:      rgb(180, 220, 140),
  kerneldex:   rgb(130, 220, 235),
  guide:       rgb(180, 210, 255),
  redeem:      rgb(130, 255, 180),
  casino:      rgb(255, 215, 0),
  history:     colors.dim,
  wager:       rgb(255, 200, 50),
  cardbattle:  rgb(255, 180, 100),
  cards:       rgb(230, 180, 140),
  host:        colors.coral,
  join:        colors.lilac,
  update:      colors.cyan,
  quit:        colors.rose,
};

const SECTION_COLORS = {
  play: colors.coral,
  customize: colors.lavender,
  etc: colors.dim,
};

const MENU_GROUPS = [
  {
    type: 'section',
    key: 'play',
    label: 'PLAY',
    desc: 'Modes, multiplayer, and match types',
    icon: '>',
    defaultExpanded: true,
    items: ['local', 'online', 'minigame', 'cardbattle'],
  },
  {
    type: 'section',
    key: 'customize',
    label: 'CUSTOMIZE',
    desc: 'Profile, moves, and fighter setup',
    icon: '*',
    defaultExpanded: false,
    items: ['profile', 'loadout', 'skins', 'cards'],
  },
  { type: 'item', key: 'bag' },
  { type: 'item', key: 'workshop' },
  {
    type: 'section',
    key: 'etc',
    label: 'ET CETERA',
    desc: 'Loot, battle log, and future extras',
    icon: '.',
    defaultExpanded: false,
    items: ['guide', 'demo', 'demo_turns', 'kerneldex', 'lootbox', 'market', 'redeem', 'casino', 'history'],
  },
  { type: 'item', key: 'update' },
  { type: 'item', key: 'quit' },
];

const MENU_ITEM_LOOKUP = Object.fromEntries(MENU_ITEMS.map(item => [item.key, item]));

function getVisibleMenuEntries(sectionState) {
  const entries = [];
  for (const group of MENU_GROUPS) {
    if (group.type === 'section') {
      entries.push({
        type: 'section',
        key: group.key,
        label: group.label,
        desc: group.desc,
        icon: group.icon,
        expanded: !!sectionState[group.key],
      });
      if (sectionState[group.key]) {
        for (const itemKey of group.items) {
          const item = MENU_ITEM_LOOKUP[itemKey];
          if (item) entries.push({ type: 'item', parent: group.key, ...item });
        }
      }
    } else {
      const item = MENU_ITEM_LOOKUP[group.key];
      if (item) entries.push({ type: 'item', standalone: true, ...item });
    }
  }
  return entries;
}

// ─── Build fighter helper ───
async function buildFighter(rawSpecs) {
  const { applyBuildOverrides, getActiveBuildIndex, getBuild } = require('../src/parts');
  const specs = applyBuildOverrides(rawSpecs);
  const stats = buildStats(specs);
  const name = fighterName(specs);
  const gpu = gpuName(specs);
  let sprite = getSprite(specs);
  const archetype = classifyArchetype(stats, specs);

  // Apply cosmetic skin override if equipped
  const buildIdx = getActiveBuildIndex();
  const skinId = getEquippedSkinId(buildIdx);
  if (skinId) sprite = applySkinOverride(sprite, skinId);

  // Apply Transcendent part visual effects (only if no skin equipped)
  const build = getBuild(buildIdx);
  const equippedParts = build?.parts || {};
  if (!skinId) {
    try {
      const { applyTranscendentPartEffects } = require('../src/transcendentparts');
      sprite = applyTranscendentPartEffects(sprite, equippedParts);
    } catch {}
  }

  // Apply equipped title
  const titleId = getEquippedTitleId(buildIdx);

  return { id: rawSpecs.id, name, gpu, stats, specs, sprite, archetype, skinId, equippedParts, titleId };
}

async function ensureSessionSpecs(sessionState, loadingLabel = 'Scanning hardware') {
  if (sessionState.rawSpecs) {
    return JSON.parse(JSON.stringify(sessionState.rawSpecs));
  }

  await withLoadingScreen(loadingLabel, async () => {
    if (!sessionState.scanPromise) {
      sessionState.scanPromise = getSpecs()
        .then((specs) => {
          sessionState.rawSpecs = JSON.parse(JSON.stringify(specs));
          return sessionState.rawSpecs;
        })
        .catch((err) => {
          sessionState.scanPromise = null;
          throw err;
        });
    }

    await sessionState.scanPromise;
  });

  return JSON.parse(JSON.stringify(sessionState.rawSpecs));
}

async function ensureSessionFighter(sessionState, fighter, loadingLabel = 'Scanning hardware') {
  if (fighter) return fighter;
  const rawSpecs = await ensureSessionSpecs(sessionState, loadingLabel);
  return buildFighter(rawSpecs);
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

async function prepareBenchToBattle(fighter, opponent = null) {
  try {
    const profile = await runBenchToBattleTransition(fighter, opponent);
    if (profile) fighter.benchmark = profile;
  } catch {}
  return fighter;
}

function postBattle(myFighter, opponent, winner, mode) {
  saveMatch(myFighter, opponent, winner, mode);

  // Kerneldex: scan opponent rig
  const { scanRig, recordResult } = require('../src/rigdex');
  const { isNew } = scanRig(opponent);
  recordResult(opponent, winner === 'a');

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

  return { earned, newBal, itemDrop, newRigScanned: isNew, rigName: opponent.name };
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
  let nextLine = cy + 3;
  if (itemDrop) {
    const rc = RARITY_COLORS[itemDrop.rarity] || colors.dim;
    for (let f = 0; f < 4; f++) {
      scr.centerText(nextLine, f % 2 === 0 ? '▸ ITEM DROP ◂' : '             ', colors.mint, null, true);
      scr.render();
      await sleep(100);
    }
    scr.centerText(nextLine, '▸ ITEM DROP ◂', colors.mint, null, true);
    scr.centerText(nextLine + 1, `${itemDrop.icon}  ${itemDrop.name}  (${itemDrop.rarity})`, rc, null, true);
    nextLine += 3;
    scr.render();
    await sleep(500);
  }

  // Phase 4: Kerneldex scan notification
  if (rewards.newRigScanned) {
    const { getDexCount } = require('../src/rigdex');
    const total = getDexCount();
    scr.centerText(nextLine, '◈ NEW RIG SCANNED ◈', rgb(130, 220, 235), null, true);
    scr.centerText(nextLine + 1, `${rewards.rigName} added to Kerneldex  (${total} total)`, colors.dim);
    scr.render();
    await sleep(600);
  }

  scr.hline(2, h - 4, w - 4, '─', colors.ghost);
  scr.centerText(h - 3, 'Press any key to continue', colors.dimmer);
  scr.text(w - 14, h - 1, '─ kernelmon ─', colors.dimmer);
  scr.render();

  await waitForKey();
  scr.exit();
}

// ═══════════════════════════════════════════════════════════════
// MAIN MENU RENDERER — single setInterval, diff-based rendering
// ═══════════════════════════════════════════════════════════════

async function mainMenu(sessionState = {}) {
  const screen = new Screen();
  const rng = createRNG(42);
  const matrix = new MatrixRain(screen.width, screen.height, rng);
  const w = screen.width;
  const h = screen.height;

  let cursor = 0;
  let frameCount = 0;
  let scanning = !sessionState.rawSpecs;
  let myFighter = null;
  let done = false;
  const sectionState = Object.fromEntries(
    MENU_GROUPS
      .filter(group => group.type === 'section')
      .map(group => [group.key, !!group.defaultExpanded])
  );
  let focus = 'menu';       // 'menu' or 'card'
  let cardBuildIdx = 0;     // which build is shown on the card
  let cardFighters = {};    // cache: buildIdx → fighter object

  // Load builds info
  const { PARTS, getAllBuilds, getActiveBuildIndex, setActiveBuild, getBuild, applyBuildOverrides: applyOverrides, buildSpecsFromParts, isBuildComplete } = require('../src/parts');
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

  // Scan hardware once per app launch; reuse the same raw scan on subsequent menu returns.
  let rawSpecs = sessionState.rawSpecs ? JSON.parse(JSON.stringify(sessionState.rawSpecs)) : null;
  if (rawSpecs) {
    myFighter = await buildFighter(rawSpecs);
    cardFighters[0] = await buildFighter(rawSpecs);
    cardFighters[getActiveBuildIndex()] = myFighter;
    scanning = false;
  } else {
    if (!sessionState.scanPromise) {
      sessionState.scanPromise = getSpecs()
        .then((specs) => {
          sessionState.rawSpecs = JSON.parse(JSON.stringify(specs));
          return sessionState.rawSpecs;
        })
        .catch((err) => {
          sessionState.scanPromise = null;
          throw err;
        });
    }
    sessionState.scanPromise.then(async specs => {
      rawSpecs = specs;
      myFighter = await buildFighter(specs);
      cardFighters[0] = await buildFighter(specs);
      cardFighters[getActiveBuildIndex()] = myFighter;
      scanning = false;
    }).catch(() => { scanning = false; });
  }

  screen.enter();
  enableMouseInput();

  // Ensure stdin is in a clean state — on Windows, pause/resume across
  // screens can leave stdin stalled until an extra keypress "kicks" it.
  // A full reset cycle with an event loop tick in between fixes this.
  const stdin = process.stdin;
  try { stdin.setRawMode(false); } catch {}
  try { stdin.pause(); } catch {}
  await new Promise(r => setImmediate(r));
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  // Drain any stale keypresses left in the buffer from prior screens
  stdin.read();

  let resolveChoice;
  const choicePromise = new Promise(r => { resolveChoice = r; });

  function currentMenuEntries() {
    return getVisibleMenuEntries(sectionState);
  }

  // Build a fighter for a specific build index (lazy, cached)
  async function ensureCardFighter(idx) {
    if (cardFighters[idx]) return;
    if (!rawSpecs) return;
    const builds = getAllBuilds();
    const build = builds[idx];
    if (!build) return;
    if (build.main) {
      // Main build — use real hardware specs with any part overrides applied
      const mainSpecs = JSON.parse(JSON.stringify(rawSpecs));
      const parts = build.parts || {};
      if (parts.cpu && PARTS[parts.cpu]) Object.assign(mainSpecs.cpu, PARTS[parts.cpu].cpu);
      if (parts.gpu && PARTS[parts.gpu]) Object.assign(mainSpecs.gpu, PARTS[parts.gpu].gpu);
      if (parts.ram && PARTS[parts.ram]) Object.assign(mainSpecs.ram, PARTS[parts.ram].ram);
      if (parts.storage && PARTS[parts.storage]) Object.assign(mainSpecs.storage, PARTS[parts.storage].storage);
      if (Object.keys(parts).length > 0) mainSpecs.isLaptop = false;
      const mStats = buildStats(mainSpecs);
      const mName = fighterName(mainSpecs);
      const mGpu = gpuName(mainSpecs);
      const mSprite = getSprite(mainSpecs);
      const mArch = classifyArchetype(mStats, mainSpecs);
      cardFighters[idx] = { id: rawSpecs.id, name: mName, gpu: mGpu, stats: mStats, specs: mainSpecs, sprite: mSprite, archetype: mArch };
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

    const wheel = getMouseWheelDirection(key);
    if (wheel) {
      if (focus === 'menu') {
        const entries = currentMenuEntries();
        if (!entries.length) return;
        cursor = wheel === 'up'
          ? (cursor - 1 + entries.length) % entries.length
          : (cursor + 1) % entries.length;
      } else if (focus === 'card') {
        const builds = getAllBuilds();
        if (!builds.length) return;
        cardBuildIdx = wheel === 'up'
          ? (cardBuildIdx - 1 + builds.length) % builds.length
          : (cardBuildIdx + 1) % builds.length;
        ensureCardFighter(cardBuildIdx);
      }
      return;
    }

    if (focus === 'menu') {
      const entries = currentMenuEntries();
      if (!entries.length) return;
      if (key === '\x1b[A' || key === 'k' || key === 'w' || key === 'W') {
        cursor = (cursor - 1 + entries.length) % entries.length;
      } else if (key === '\x1b[B' || key === 'j' || key === 's' || key === 'S') {
        cursor = (cursor + 1) % entries.length;
      } else if (key === '\x1b[D' || key === 'h' || key === 'a' || key === 'A') {
        const entry = entries[cursor];
        if (entry?.type === 'section' && entry.expanded) {
          sectionState[entry.key] = false;
        } else if (entry?.type === 'item' && entry.parent) {
          sectionState[entry.parent] = false;
          const nextEntries = currentMenuEntries();
          const parentIndex = nextEntries.findIndex(candidate => candidate.type === 'section' && candidate.key === entry.parent);
          if (parentIndex >= 0) cursor = parentIndex;
        }
      } else if (key === '\x1b[C' || key === 'l' || key === 'd' || key === 'D') {
        // Right arrow → focus on profile card
        if (!scanning) focus = 'card';
      } else if (key === '\r' || key === '\n' || key === ' ') {
        const entry = entries[cursor];
        if (entry?.type === 'section') {
          sectionState[entry.key] = !entry.expanded;
        } else if (entry?.type === 'item') {
          done = true;
          resolveChoice(entry.key);
        }
      } else if (key === '\x03' || key === 'q') {
        done = true;
        resolveChoice('quit');
      }
    } else if (focus === 'card') {
      const builds = getAllBuilds();
      if (key === '\x1b[D' || key === 'h' || key === 'a' || key === 'A') {
        // Left arrow → back to menu
        focus = 'menu';
      } else if (key === '\x1b[A' || key === 'k' || key === 'w' || key === 'W') {
        // Cycle builds up
        cardBuildIdx = (cardBuildIdx - 1 + builds.length) % builds.length;
        ensureCardFighter(cardBuildIdx);
      } else if (key === '\x1b[B' || key === 'j' || key === 's' || key === 'S') {
        // Cycle builds down
        cardBuildIdx = (cardBuildIdx + 1) % builds.length;
        ensureCardFighter(cardBuildIdx);
      } else if (key === '\r' || key === '\n' || key === ' ') {
        // Set this build as active
        if (builds[cardBuildIdx]?.main || isBuildComplete(cardBuildIdx)) {
          setActiveBuild(cardBuildIdx);
          // Rebuild fighter from the newly active build's hardware
          if (rawSpecs) {
            buildFighter(rawSpecs).then(f => {
              myFighter = f;
              cardFighters[cardBuildIdx] = f;
            });
          } else if (cardFighters[cardBuildIdx]) {
            myFighter = cardFighters[cardBuildIdx];
          }
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
  const menuH = MENU_GROUPS.reduce((total, group) => {
    if (group.type === 'section') return total + 1 + group.items.length;
    return total + 1;
  }, 0) + 2; // max border height with every section open
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
    drawMenu(screen, w, h, frameCount, currentMenuEntries(), cursor);
    drawProfileCard(screen, w, h, frameCount, scanning);
    drawFooter(screen, w, h);

    screen.render();
  }, FRAME_MS);

  const choice = await choicePromise;

  clearInterval(renderLoop);
  stdin.removeListener('data', onKey);
  disableMouseInput();
  try { stdin.setRawMode(false); } catch (e) {}
  try { stdin.pause(); } catch (e) {}

  // Brief transition animation on the menu screen
  const selectedItem = MENU_ITEM_LOOKUP[choice];
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

    // Column boundaries for each letter: K E R N E L M O N
    const bigBounds =  [[0,7],[8,15],[16,23],[24,33],[34,41],[42,49],[50,61],[62,69],[70,85]];
    const smBounds =   [[0,2],[3,5],[6,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,29]];
    const bounds = useSmall ? smBounds : bigBounds;

    // Base color per letter — mixed from the carousel palette
    const baseRGB = [
      [130,220,235], // K — cyan
      [245,180,150], // E — peach
      [240,160,140], // R — coral
      [180,160,240], // N — lavender
      [140,230,180], // E — mint
      [240,220,140], // L — gold
      [200,170,240], // M — lilac
      [240,170, 50], // O — warm orange
      [240,150,170], // N — rose
    ];

    // Shimmer: a bright pulse that sweeps across letters
    const shimmerCycle = 12; // total steps (9 letters + 3 off-screen)
    const shimmerPos = (frame * 0.12) % shimmerCycle;

    for (let i = 0; i < logo.length; i++) {
      const line = logo[i];
      const cx = Math.floor((w - line.length) / 2);
      for (let c = 0; c < line.length; c++) {
        if (line[c] === ' ') continue;
        // Determine which letter this column belongs to
        let li = bounds.length - 1;
        for (let b = 0; b < bounds.length; b++) {
          if (c >= bounds[b][0] && c <= bounds[b][1]) { li = b; break; }
        }
        const [br, bg, bb] = baseRGB[li];
        // Shimmer blend — how close is this letter to the sweep?
        const dist = Math.abs(shimmerPos - li);
        const glow = dist < 1 ? (1 - dist) * 0.55 : 0;
        const r = Math.min(255, Math.round(br + (255 - br) * glow));
        const g = Math.min(255, Math.round(bg + (255 - bg) * glow));
        const b = Math.min(255, Math.round(bb + (255 - bb) * glow));
        screen.set(cx + c, logoY + i, line[c], rgb(r, g, b), null, true);
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

  function drawMenu(screen, w, h, frame, entries, cursor) {
    const menuFocused = focus === 'menu';
    const borderCol = menuFocused ? colors.dimmer : colors.ghost;
    const innerRows = Math.max(entries.length, 1);

    // Top border
    screen.text(menuX, menuY - 1, '╔' + '═'.repeat(menuW) + '╗', borderCol);

    for (let i = 0; i < innerRows; i++) {
      const item = entries[i];
      const y = menuY + i;
      const selected = i === cursor;

      screen.text(menuX, y, '║', borderCol);
      screen.text(menuX + 1, y, ' '.repeat(menuW), colors.dim);
      screen.text(menuX + menuW + 1, y, '║', borderCol);
      if (!item) continue;

      if (item.type === 'section') {
        const accent = SECTION_COLORS[item.key] || colors.dim;
        const pulse = frame % 10 < 5;
        const pointer = selected && menuFocused ? (pulse ? '>' : '*') : ' ';
        const marker = item.expanded ? '-' : '+';
        const labelColor = selected ? colors.white : (menuFocused ? colors.dim : colors.ghost);
        const descColor = selected ? accent : colors.ghost;

        screen.text(menuX + 2, y, pointer, selected ? colors.white : colors.dimmer, null, selected && menuFocused);
        screen.text(menuX + 4, y, marker, accent, null, true);
        screen.text(menuX + 6, y, item.label.padEnd(14), labelColor, null, selected);
        screen.text(menuX + 21, y, item.desc.slice(0, Math.max(0, menuW - 21)), descColor);
        continue;
      }

      const accent = ITEM_COLORS[item.key] || colors.dim;
      const iconX = item.standalone ? menuX + 4 : menuX + 6;
      const labelX = item.standalone ? menuX + 6 : menuX + 8;
      const descX = item.standalone ? menuX + 23 : menuX + 25;
      const descWidth = Math.max(0, menuW - (descX - menuX));

      if (selected && menuFocused) {
        const pulse = frame % 10 < 5;
        screen.text(menuX + 2, y, pulse ? '>' : '*', colors.white, null, true);
        screen.text(iconX, y, item.icon, accent, null, true);
        screen.text(labelX, y, item.label.padEnd(16), colors.white, null, true);
        screen.text(descX, y, item.desc.slice(0, descWidth), accent);
      } else if (selected && !menuFocused) {
        // Still highlighted but dimmed when card is focused
        screen.text(menuX + 2, y, '>', colors.dimmer);
        screen.text(iconX, y, item.icon, colors.dim);
        screen.text(labelX, y, item.label.padEnd(16), colors.dim);
        screen.text(descX, y, item.desc.slice(0, descWidth), colors.ghost);
      } else {
        screen.text(iconX, y, item.icon, colors.dimmer);
        screen.text(labelX, y, item.label.padEnd(16), menuFocused ? colors.dim : colors.ghost);
        screen.text(descX, y, item.desc.slice(0, descWidth), colors.ghost);
      }
    }

    // Bottom border
    screen.text(menuX, menuY + innerRows, '╚' + '═'.repeat(menuW) + '╝', borderCol);
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
      screen.text(4, footY, ' Wheel/W/S navigate ', colors.dim);
      screen.text(25, footY, ' ENTER expand/select ', colors.dim);
      screen.text(49, footY, ' A/← collapse ', colors.dim);
      screen.text(65, footY, ' D/→ profile ', colors.dim);
      screen.text(81, footY, ' Q quit ', colors.dim);
    } else {
      screen.text(4, footY, ' Wheel/W/S switch build ', colors.dim);
      screen.text(31, footY, ' ENTER activate ', colors.dim);
      screen.text(49, footY, ' A/← menu ', colors.dim);
    }
    screen.text(w - 14, h - 1, '─ kernelmon ─', colors.dimmer);
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

// ─── Guide — scrollable combat reference ───

async function handleGuide() {
  const { ARCHETYPE_EFFECTIVENESS } = require('../src/balance');

  // Build guide content as lines: { text, color, bold }
  const C = {
    h1: rgb(255, 215, 0),     // gold headers
    h2: rgb(180, 210, 255),    // blue sub-headers
    txt: colors.dim,           // body text
    hi: colors.white,          // highlighted text
    grn: rgb(100, 220, 140),   // positive / strength
    red: rgb(240, 120, 120),   // weakness
    orn: rgb(255, 180, 60),    // medium / neutral
    sky: rgb(130, 200, 240),   // info
    lav: colors.lavender,      // magic
    pch: colors.peach,         // physical
  };

  const lines = [];
  const L = (text, color, bold) => lines.push({ text: text || '', color: color || C.txt, bold: !!bold });
  const blank = () => L('');

  // ── Title ──
  L('╔═══════════════════════════════════════════╗', C.h1);
  L('║           K E R N E L M O N   G U I D E  ║', C.h1, true);
  L('╚═══════════════════════════════════════════╝', C.h1);
  blank();

  // ── Move Categories ──
  L('⚔  MOVE CATEGORIES', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('Every attack belongs to one of four categories:', C.txt);
  blank();
  L('  ⚔ PHYSICAL  — CPU-powered brute force. Uses STR stat.', C.pch);
  L('  ◆ MAGIC     — GPU compute blasts. Uses MAG stat.', C.lav);
  L('  » SPEED     — Storage/IO burst strikes. Uses SPD stat.', C.sky);
  L('  ★ SPECIAL   — Utility: heals, stun, debuff, pierce. Mixed stats.', C.orn);
  blank();
  L('Special moves are always neutral — no type advantage or disadvantage.', C.txt);
  blank();

  // ── Move Tiers ──
  L('◆  MOVE TIERS', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('  UNIVERSAL   — Available to all fighters. Low power, no cooldown.', C.txt);
  L('  COMPONENT   — Locked to your hardware brand. Medium-high power.', C.sky);
  L('                (AMD/Intel CPU, NVIDIA/Radeon GPU, NVMe/SSD/HDD, etc.)', C.txt);
  L('  SIGNATURE   — Your 2 unique moves. Highest power, 3-turn cooldown.', C.h1);
  blank();
  L('You equip 6 moves total: 2 signature + 4 from your available pool.', C.txt);
  blank();

  // ── Cooldowns ──
  L('⏱  COOLDOWNS', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('After using a move with a cooldown, it\'s locked for N turns.', C.txt);
  L('The number [N] appears next to it. You must pick other moves.', C.txt);
  blank();
  L('  Signature moves: 3-turn cooldown', C.red);
  L('  High-power component moves: 2-turn cooldown', C.orn);
  L('  Universal / basic moves: no cooldown', C.grn);
  blank();
  L('Cooldown starts even if the attack is dodged. Plan accordingly.', C.txt);
  blank();

  // ── Category Effectiveness ──
  L('!!  CATEGORY EFFECTIVENESS', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('Each archetype has a weakness and resistance to move categories.', C.txt);
  L('When selecting moves, you\'ll see hints:', C.txt);
  blank();
  L('  !!  = Super effective (1.25x damage)', C.grn, true);
  L('  ..  = Not very effective (0.8x damage)', C.red);
  L('  (no icon) = Neutral (1.0x damage)', C.txt);
  blank();
  L('Read your opponent\'s archetype before picking moves!', C.hi, true);
  blank();

  // ── Archetype Matchup Chart ──
  L('▲  ARCHETYPE MATCHUPS', C.h1, true);
  L('─────────────────────────────', C.h1);
  blank();

  const archetypeInfo = [
    { name: 'STACK_SMASHER', alias: 'Berserker',  style: 'High damage + crit, risky self-harm on crit' },
    { name: 'SHADER_WITCH',  alias: 'Arcmage',    style: 'Devastating magic, but chance to fizzle' },
    { name: 'ZERO_DAY',      alias: 'Blitz',      style: 'Huge turn-1 damage that fades each round' },
    { name: 'MALLOC_WALL',   alias: 'Fortress',   style: 'Tank — reduced damage dealt, massive defense' },
    { name: 'FORK_BOMB',     alias: 'Hivemind',   style: 'Multi-core power, but always acts second' },
    { name: 'GHOST_PROC',    alias: 'Phantom',    style: 'High dodge rate, fragile when hit' },
    { name: 'ROOT_GOD',      alias: 'Titan',      style: 'Burst damage, consecutive attacks risk stalling' },
  ];

  for (const arch of archetypeInfo) {
    const eff = ARCHETYPE_EFFECTIVENESS[arch.name] || {};
    L('  ' + arch.alias.toUpperCase() + ' (' + arch.name + ')', C.h2, true);
    L('    ' + arch.style, C.txt);
    if (eff.weak) {
      L('    Weak to: ' + eff.weak.toUpperCase() + ' (take 1.25x)', C.red);
    }
    if (eff.resist) {
      L('    Resists: ' + eff.resist.toUpperCase() + ' (take 0.8x)', C.grn);
    }
    blank();
  }

  // Neutral archetypes
  L('  NEUTRAL ARCHETYPES (no weakness or resistance):', C.h2, true);
  L('    KERNEL_GOD (Apex) — Consistent output, passive HP regen', C.txt);
  L('    SSH_DRIFTER (Nomad) — Starts weak, scales stronger each turn', C.txt);
  L('    SEG_FAULT (Scrapper) — Comeback mechanic below 50% HP', C.txt);
  L('    DAEMON (Sentinel) — Low variance, steady and reliable', C.txt);
  blank();

  // ── Quick Reference ──
  L('⚡  QUICK MATCHUP REFERENCE', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('  "What moves should I bring against...?"', C.txt);
  blank();
  L('  vs Berserker / Hivemind / Fortress → bring MAGIC moves', C.lav, true);
  L('  vs Arcmage / Blitz / Titan         → bring SPEED moves', C.sky, true);
  L('  vs Blitz / Phantom                 → bring PHYSICAL moves', C.pch, true);
  L('  vs Apex / Nomad / Scrapper / Daemon → any category works', C.orn);
  blank();

  // ── Special Effects ──
  L('★  SPECIAL EFFECTS', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('  STUN    — Opponent skips their next turn (60% proc chance)', C.red);
  L('  DEBUFF  — Opponent deals 60% damage next attack', C.orn);
  L('  PIERCE  — Ignores opponent\'s defense stat entirely', C.sky);
  L('  HARDEN  — Boosts your defense by 40% for 2 turns', C.grn);
  L('  DOT     — Burns the opponent for 20% of hit damage over 3 turns', C.h1);
  L('  HEAL    — Restore HP based on your VIT stat', C.grn);
  blank();

  // ── Tips ──
  L('?  TIPS', C.h1, true);
  L('─────────────────────────────', C.h1);
  L('  • Check your opponent\'s archetype in the pre-battle lobby', C.txt);
  L('  • Equip moves that exploit their weakness category', C.txt);
  L('  • Don\'t spam your signature — use it when cooldowns align', C.txt);
  L('  • HARDEN before a big hit you can\'t dodge', C.txt);
  L('  • DOT moves are best early — they deal damage over 3 extra turns', C.txt);
  L('  • Against tanks (Fortress), use PIERCE to bypass their defense', C.txt);
  L('  • Against Blitz, survive turns 1-3 — their damage fades fast', C.txt);

  // ── Render with scrolling ──
  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let scroll = 0;
    const visibleRows = h - 4; // header + footer

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      scr.clear();

      // Header
      scr.centerText(0, '─'.repeat(w), colors.dimmer);
      scr.centerText(0, ' G U I D E ', rgb(180, 210, 255), null, true);
      scr.text(w - 20, 0, `${scroll + 1}-${Math.min(scroll + visibleRows, lines.length)}/${lines.length}`, colors.dimmer);

      // Content
      for (let i = 0; i < visibleRows && scroll + i < lines.length; i++) {
        const line = lines[scroll + i];
        scr.text(3, 2 + i, (line.text || '').slice(0, w - 6), line.color || C.txt, null, line.bold);
      }

      // Scroll indicators
      if (scroll > 0) scr.text(w - 2, 2, '▲', colors.dim);
      if (scroll + visibleRows < lines.length) scr.text(w - 2, h - 3, '▼', colors.dim);

      // Footer
      scr.hline(2, h - 2, w - 4, '─', colors.ghost);
      scr.text(4, h - 2, ' ↑↓ scroll  Esc/q return ', colors.dim);

      scr.render();
    }

    function onKey(key) {
      const maxScroll = Math.max(0, lines.length - visibleRows);
      if (key === '\x1b[A' || key === 'k' || key === 'w') {
        scroll = Math.max(0, scroll - 1);
        render();
      } else if (key === '\x1b[B' || key === 'j' || key === 's') {
        scroll = Math.min(maxScroll, scroll + 1);
        render();
      } else if (key === '\x1b[5~') { // Page Up
        scroll = Math.max(0, scroll - visibleRows);
        render();
      } else if (key === '\x1b[6~') { // Page Down
        scroll = Math.min(maxScroll, scroll + visibleRows);
        render();
      } else if (key === '\x1b' || key === 'q' || key === '\r' || key === '\n') {
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();
        scr.exit();
        resolve();
      } else if (key === '\x03') {
        scr.exit();
        process.exit(0);
      }
    }

    stdin.on('data', onKey);
    render();
  });
}

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
  infoScreen.text(w - 14, h - 1, '─ kernelmon ─', colors.dimmer);

  infoScreen.render();

  // Wait for key
  await waitForKey();
  infoScreen.exit();
}

async function handleProfile(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);
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

async function handleDemo(fighter, turnMode, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

  // Opponent selection screen
  const { selectOpponent } = require('../src/opponentselect');
  const selectScreen = new Screen();
  selectScreen.enter();
  const opponent = await selectOpponent(selectScreen);
  selectScreen.exit();

  if (!opponent) return; // user pressed ESC
  await prepareBenchToBattle(fighter, opponent);

  // Prepare battle data
  let seed, myMoves, oppMoves, events;
  await withLoadingScreen('Preparing battle', async () => {
    seed = combinedSeed(fighter.id, opponent.id);

    if (turnMode && renderTurnBattle) {
      myMoves = getEquippedMoves(fighter.stats, fighter.specs, fighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch (e) {}
      oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
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

// ═══════════════════════════════════════════════════════════════
// GYM LADDER — Pick a gym, then climb its 5-fighter ladder
// ═══════════════════════════════════════════════════════════════

async function handleGym(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

  if (!renderTurnBattle) {
    await showInfoScreen('GYM LADDER', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Turn battle renderer unavailable.', colors.rose);
    });
    return;
  }

  const { getGymOverview, buildGymFighter, getGymMoves, recordClear, calculateGymRewards } = require('../src/gym');

  // Step 1: Pick a gym
  const { getDifficultyLabel } = require('../src/gym');
  const gyms = getGymOverview();
  const gymKey = await pickOption('GYM LADDER', gyms.map(g => {
    const clearedCount = g.fighters.filter(f => f.clears > 0).length;
    const progress = g.unlocked ? `${clearedCount}/${g.fighters.length}` : '';
    return {
      key: g.id,
      label: g.unlocked ? `${g.icon}  ${g.name}` : `${g.icon}  ???  (LOCKED)`,
      desc: g.unlocked
        ? `${g.desc}${progress ? `  [${progress}]` : ''}${g.cleared ? '  CLEARED' : ''}`
        : 'Clear the previous gym first',
    };
  }));
  if (!gymKey) return;

  const gym = gyms.find(g => g.id === gymKey);
  if (!gym || !gym.unlocked) {
    await showInfoScreen('LOCKED', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Clear the previous gym first.', colors.rose);
      scr.centerText(h - 3, 'Press any key', colors.dimmer);
    });
    return;
  }

  // Step 2: Pick a fighter in the ladder
  const fighterKey = await pickOption(gym.name, gym.fighters.map(f => {
    if (!f.unlocked) {
      return { key: f.id, label: '· ???  (LOCKED)', desc: 'Defeat the previous fighter first' };
    }
    const diff = getDifficultyLabel(f, f.clears);
    const clearTag = f.clears > 0 ? ` [${f.clears}x]` : '';
    return {
      key: f.id,
      label: `${f.isLeader ? '★' : '·'} ${f.name}${clearTag}`,
      desc: `${f.title}  ─  ${diff.label}`,
    };
  }));
  if (!fighterKey) return;

  const target = gym.fighters.find(f => f.id === fighterKey);
  if (!target || !target.unlocked) {
    await showInfoScreen('LOCKED', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Defeat the previous fighter first.', colors.rose);
      scr.centerText(h - 3, 'Press any key', colors.dimmer);
    });
    return;
  }

  // Taunt screen
  const diff = getDifficultyLabel(target, target.clears);
  await showInfoScreen('GYM BATTLE', (scr, w, h) => {
    const cy = Math.floor(h / 2);
    const gc = gym.iconColor || [255, 180, 60];
    scr.centerText(cy - 5, `${gym.icon}  ${gym.name}  ${gym.icon}`, rgb(gc[0], gc[1], gc[2]), null, true);
    scr.centerText(cy - 4, diff.label, rgb(diff.color[0], diff.color[1], diff.color[2]));
    scr.centerText(cy - 2, target.name, rgb(255, 220, 100), null, true);
    scr.centerText(cy - 1, target.title, colors.dim);
    scr.centerText(cy + 1, `"${target.taunt}"`, rgb(200, 170, 240));
    if (target.clears > 0) {
      scr.centerText(cy + 3, `Reclear #${target.clears + 1} — stats scaled +${Math.round((Math.pow(1.08, target.clears) - 1) * 100)}%`, colors.gold);
    }
    scr.centerText(h - 3, 'Press any key to fight', colors.dimmer);
  });

  // Build opponent & battle
  const opponent = buildGymFighter(target, target.clears);
  await prepareBenchToBattle(fighter, opponent);

  const seed = combinedSeed(fighter.id, opponent.id + target.clears);
  const myMoves = getEquippedMoves(fighter.stats, fighter.specs, fighter.archetype);
  try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch (e) {}
  const oppMoves = getGymMoves(target, target.clears);

  const winner = await renderTurnBattle(fighter, opponent, myMoves, oppMoves, { role: 'host', seed });

  // Rewards
  const won = winner === 'a';
  const rewardInfo = calculateGymRewards(target, target.clears, won);

  if (won) {
    const totalClears = recordClear(fighterKey);

    const { addCredits } = require('../src/credits');
    const newBal = addCredits(rewardInfo.credits);

    const itemRewards = rollRewards(createRNG(Date.now()), rewardInfo.itemTier, true);
    let itemDrop = null;
    if (itemRewards.length > 0) {
      itemDrop = itemRewards[0];
      addItem(itemDrop.id);
    }

    let partDrop = null;
    if (rewardInfo.partEligible) {
      const { rollPartDrop, addPart } = require('../src/parts');
      partDrop = rollPartDrop(createRNG(Date.now() + 1), rewardInfo.itemTier, {
        maxRarity: rewardInfo.partMaxRarity,
        mythicBonus: rewardInfo.mythicBonus,
      });
      if (partDrop) addPart(partDrop.id);
    }

    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    const cy = Math.floor(h / 2);

    scr.centerText(0, '─'.repeat(w), colors.dimmer);
    scr.centerText(0, ' GYM VICTORY ', rgb(255, 180, 60), null, true);
    scr.centerText(cy - 5, `★ ★ ★  ${target.name} DEFEATED  ★ ★ ★`, colors.gold, null, true);
    if (target.isLeader) {
      scr.centerText(cy - 4, `${gym.name} CLEARED!`, rgb(100, 230, 150), null, true);
    }
    scr.centerText(cy - 3, `Clear #${totalClears}`, colors.dim);
    scr.render();
    await sleep(700);

    scr.centerText(cy - 1, `◆ +${rewardInfo.credits} credits`, colors.gold, null, true);
    scr.centerText(cy, `Balance: ${newBal}`, colors.dim);
    scr.render();
    await sleep(400);

    let rewardLine = cy + 2;
    if (itemDrop) {
      const rc = RARITY_COLORS[itemDrop.rarity] || colors.dim;
      scr.centerText(rewardLine, `▸ ${itemDrop.icon}  ${itemDrop.name}  (${itemDrop.rarity})`, rc, null, true);
      rewardLine++;
    }
    if (partDrop) {
      const rc = RARITY_COLORS[partDrop.rarity] || colors.dim;
      scr.centerText(rewardLine, `▸ PART: ${partDrop.label || partDrop.id}  (${partDrop.rarity})`, rc, null, true);
      rewardLine++;
    }

    scr.render();
    await sleep(400);

    // Kerneldex scan
    const { scanRig: gymScan, recordResult: gymRecord, getDexCount: gymDexCount } = require('../src/rigdex');
    const gymScanResult = gymScan(opponent);
    gymRecord(opponent, true);
    if (gymScanResult.isNew) {
      rewardLine++;
      scr.centerText(rewardLine, '◈ NEW RIG SCANNED ◈', rgb(130, 220, 235), null, true);
      scr.centerText(rewardLine + 1, `${target.name} added to Kerneldex  (${gymDexCount()} total)`, colors.dim);
      scr.render();
      await sleep(600);
    }

    scr.hline(2, h - 4, w - 4, '─', colors.ghost);
    scr.centerText(h - 3, 'Press any key to continue', colors.dimmer);
    scr.render();
    await waitForKey();
    scr.exit();
  } else {
    // Scan even on loss
    const { scanRig: gymScanL, recordResult: gymRecordL } = require('../src/rigdex');
    const gymLossResult = gymScanL(opponent);
    gymRecordL(opponent, false);
    await showBattleRewards(winner,
      { earned: 15, newBal: require('../src/credits').addCredits(15), itemDrop: null, newRigScanned: gymLossResult.isNew, rigName: target.name },
      '', `${target.name} was too strong. Train harder.`);
  }

  saveMatch(fighter, opponent, winner, 'gym');
}

async function handleDash(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

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
    scr.text(w - 14, h - 1, '─ kernelmon ─', colors.dimmer);
    scr.render();

    const key = await waitForKeyReturn();
    scr.exit();

    playAgain = (key === 'r' || key === 'R');
  }
}

async function handleHackGrid(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

  let renderHackGrid;
  try { renderHackGrid = require('../src/hackgrid').renderHackGrid; } catch (e) {}

  if (!renderHackGrid) {
    await showInfoScreen('HACK THE GRID', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Hack the Grid unavailable.', colors.rose);
    });
    return;
  }

  let playAgain = true;
  while (playAgain) {
    const result = await renderHackGrid(fighter);
    const levelsCleared = Math.max(0, result.level - 1);

    // Credits: 100 per level cleared + 50 bonus per level past 5
    const { addCredits } = require('../src/credits');
    let earned = levelsCleared * 100;
    if (levelsCleared > 5) earned += (levelsCleared - 5) * 50;
    earned = Math.max(earned, 10); // minimum 10
    const newBal = addCredits(earned);

    // Item drops: levels 3+ get bag items
    let itemDrop = null;
    if (levelsCleared >= 3) {
      const itemRng = createRNG(Date.now());
      const tier = levelsCleared >= 7 ? 'high' : levelsCleared >= 5 ? 'mid' : 'low';
      const itemRewards = rollRewards(itemRng, tier, true);
      if (itemRewards.length > 0) {
        itemDrop = itemRewards[0];
        addItem(itemDrop.id);
      }
    }

    // Part drops: levels 5+ get parts, levels 10+ get better odds
    let partDrop = null;
    if (levelsCleared >= 5) {
      const { rollPartDrop, addPart } = require('../src/parts');
      const partTier = levelsCleared >= 10 ? 'flagship' : levelsCleared >= 7 ? 'high' : 'mid';
      partDrop = rollPartDrop(createRNG(Date.now() + 1), partTier);
      if (partDrop) addPart(partDrop.id);
    }

    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    const cy = Math.floor(h / 2);

    scr.centerText(0, '─'.repeat(w), colors.dimmer);
    scr.centerText(0, ' RUN COMPLETE ', rgb(0, 255, 180), null, true);

    scr.centerText(cy - 4, '⌬  H A C K   T H E   G R I D  ⌬', rgb(130, 220, 235), null, true);
    scr.centerText(cy - 2, `Score: ${result.score}  |  Levels cleared: ${levelsCleared}`, colors.gold, null, true);
    if (result.reason === 'dead') {
      scr.centerText(cy - 1, 'Connection terminated.', colors.rose);
    } else {
      scr.centerText(cy - 1, 'Disconnected.', colors.dim);
    }

    // Credits
    scr.centerText(cy + 1, `◆ +${earned} credits  (balance: ${newBal})`, colors.gold);

    // Reward drops
    let rewardLine = cy + 3;
    if (itemDrop) {
      const rc = RARITY_COLORS[itemDrop.rarity] || colors.dim;
      scr.centerText(rewardLine, `▸ ${itemDrop.icon}  ${itemDrop.name}  (${itemDrop.rarity})`, rc, null, true);
      rewardLine++;
    }
    if (partDrop) {
      const rc = RARITY_COLORS[partDrop.rarity] || colors.dim;
      scr.centerText(rewardLine, `▸ PART: ${partDrop.label || partDrop.id}  (${partDrop.rarity})`, rc, null, true);
      rewardLine++;
    }

    scr.hline(2, h - 4, w - 4, '─', colors.ghost);
    scr.centerText(h - 3, '[R] Retry    [Q] Return to Menu', colors.white);
    scr.render();

    const key = await waitForKeyReturn();
    scr.exit();
    playAgain = (key === 'r' || key === 'R');
  }
}

async function handleRogue(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

  if (!renderRogue) {
    await showInfoScreen('ROGUE MODE', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'Rogue mode unavailable.', colors.rose);
    });
    return;
  }

  const rogueBattleMode = renderTurnBattle
    ? await pickOption('ROGUE BATTLE STYLE', [
        { key: 'turn', label: 'TURN-BASED ENCOUNTERS', desc: 'Every Rogue fight uses the turn battle screen.' },
        { key: 'auto', label: 'AUTO BATTLES', desc: 'Keep Rogue mode fast with automatic battle resolution.' },
      ])
    : 'auto';

  if (!rogueBattleMode) return;

  const result = await renderRogue(fighter, { battleMode: rogueBattleMode });

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
  scr.text(w - 14, h - 1, '─ kernelmon ─', colors.dimmer);
  scr.render();

  await waitForKeyReturn();
  scr.exit();
}

// Sell prices by rarity
const SELL_PRICES = {
  common: 5,
  uncommon: 15,
  rare: 40,
  epic: 100,
  legendary: 300,
  mythic: 800,
  transcendent: 2000,
};

async function handleBag() {
  const { removeItems } = require('../src/items');
  const { addCredits, getBalance } = require('../src/credits');

  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let cursor = 0;
    let sellMode = false;
    let sellQty = 1;
    const listY = 4;
    const maxRows = h - 8;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function getItems() { return getOwnedItems(); }

    function render() {
      const items = getItems();
      scr.clear();
      scr.centerText(0, '─'.repeat(w), colors.dimmer);
      scr.centerText(0, ' B A G ', colors.mint, null, true);

      if (items.length === 0) {
        scr.text(4, 3, 'Empty — win battles to earn items.', colors.dim);
        scr.centerText(h - 3, 'Esc to go back', colors.dimmer);
        scr.render();
        return;
      }

      const totalCount = items.reduce((s, i) => s + i.count, 0);
      scr.text(4, 2, `${totalCount} items`, colors.dim);
      scr.text(w - 22, 2, `Balance: ${getBalance()}`, colors.gold);
      scr.hline(4, 3, w - 8, '─', colors.ghost);

      // Clamp cursor
      if (cursor >= items.length) cursor = Math.max(0, items.length - 1);

      const scrollStart = Math.max(0, cursor - maxRows + 3);
      const scrollEnd = Math.min(items.length, scrollStart + maxRows);

      // Item list (left side)
      const listW = Math.min(40, Math.floor(w * 0.45));
      for (let i = scrollStart; i < scrollEnd; i++) {
        const item = items[i];
        const y = listY + (i - scrollStart);
        const sel = i === cursor;
        const rc = RARITY_COLORS[item.rarity] || colors.dim;

        if (sel) {
          scr.text(2, y, '▸', colors.white, null, true);
          scr.text(4, y, item.icon, rc, null, true);
          scr.text(6, y, `${item.name} x${item.count}`.padEnd(listW - 6), colors.white, null, true);
        } else {
          scr.text(4, y, item.icon, colors.dimmer);
          scr.text(6, y, `${item.name} x${item.count}`.padEnd(listW - 6), colors.dim);
        }
      }

      // Detail panel (right side) for highlighted item
      if (items.length > 0) {
        const item = items[cursor];
        const rc = RARITY_COLORS[item.rarity] || colors.dim;
        const price = SELL_PRICES[item.rarity] || 5;
        const panelX = listW + 4;
        const panelW = w - panelX - 2;
        const panelTop = listY;

        // Panel border
        scr.vline(panelX - 2, panelTop, Math.min(scrollEnd - scrollStart, maxRows), '│', colors.ghost);

        // Item name + icon
        scr.text(panelX, panelTop, `${item.icon}  ${item.name}`, colors.white, null, true);
        scr.text(panelX, panelTop + 1, `(${item.rarity})`, rc, null, true);

        // Separator
        scr.hline(panelX, panelTop + 2, panelW, '─', colors.ghost);

        // Description
        scr.text(panelX, panelTop + 3, item.desc, colors.white);

        // Effect details based on type
        let detailY = panelTop + 5;
        const effect = item.effect || '';
        const dim = colors.dim;

        if (effect === 'heal') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Healing', colors.mint);
          detailY++;
          scr.text(panelX, detailY, 'HEALS', dim);
          scr.text(panelX + 7, detailY, `${Math.round((item.value || 0) * 100)}% of max HP`, colors.mint);
        } else if (effect.startsWith('boost_')) {
          const stat = effect.replace('boost_', '').toUpperCase();
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Stat Boost', colors.sky);
          detailY++;
          scr.text(panelX, detailY, 'BUFF', dim);
          scr.text(panelX + 7, detailY, `${stat} +${Math.round((item.value || 0) * 100)}%`, colors.sky);
          detailY++;
          if (item.duration) {
            scr.text(panelX, detailY, 'LASTS', dim);
            scr.text(panelX + 7, detailY, `${item.duration} turns`, colors.sky);
          }
        } else if (effect === 'shield') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Defensive', colors.lavender);
          detailY++;
          scr.text(panelX, detailY, 'Blocks the next incoming attack', colors.lavender);
        } else if (effect === 'cleanse') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Utility', colors.mint);
          detailY++;
          scr.text(panelX, detailY, 'Removes stun and debuffs', colors.mint);
        } else if (effect === 'reflect') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Defensive', colors.lavender);
          detailY++;
          scr.text(panelX, detailY, 'REFLECTS', dim);
          scr.text(panelX + 10, detailY, `${Math.round((item.value || 0) * 100)}% of next hit`, colors.lavender);
        } else if (effect === 'direct_damage') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Offensive', colors.peach);
          detailY++;
          scr.text(panelX, detailY, 'DAMAGE', dim);
          scr.text(panelX + 8, detailY, `${Math.round((item.value || 0) * 100)}% of opponent max HP`, colors.peach);
        } else if (effect === 'stun') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Offensive', colors.peach);
          detailY++;
          scr.text(panelX, detailY, 'Stuns opponent for 1 turn', colors.peach);
        } else if (effect === 'nuke') {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Devastating', colors.rose);
          detailY++;
          scr.text(panelX, detailY, 'DAMAGE', dim);
          scr.text(panelX + 8, detailY, `${Math.round((item.value || 0) * 100)}% of opponent max HP`, colors.rose);
          detailY++;
          scr.text(panelX, detailY, '+ Stuns for 1 turn', colors.rose);
        } else if (effect.startsWith('special_')) {
          scr.text(panelX, detailY, 'TYPE', dim);
          scr.text(panelX + 7, detailY, 'Special Attack', colors.gold);
          detailY++;
          scr.text(panelX, detailY, 'DAMAGE', dim);
          scr.text(panelX + 8, detailY, `${Math.round((item.value || 0) * 100)}% of opponent max HP`, colors.gold);
          detailY++;
          scr.text(panelX, detailY, '+ Additional effects', colors.gold);
        }

        // Sell value
        detailY += 2;
        scr.text(panelX, detailY, 'SELL', dim);
        scr.text(panelX + 6, detailY, `${price} credits each`, colors.gold);
        scr.text(panelX, detailY + 1, 'OWNED', dim);
        scr.text(panelX + 7, detailY + 1, `${item.count}`, colors.white);
      }

      // Sell panel for selected item
      if (sellMode && items.length > 0) {
        const item = items[cursor];
        const price = SELL_PRICES[item.rarity] || 5;
        const totalPrice = price * sellQty;
        const panelY = h - 4;

        scr.hline(4, panelY - 1, w - 8, '─', colors.ghost);
        scr.text(4, panelY, `Sell ${item.name}`, colors.white, null, true);
        scr.text(4, panelY + 1, `Qty: ◂ ${sellQty} ▸   (max ${item.count})`, colors.mint, null, true);
        scr.text(4, panelY + 2, `Total: ${totalPrice} credits`, colors.gold, null, true);
        scr.text(w - 30, panelY + 1, 'Left/Right qty  Enter sell', colors.dimmer);
        scr.text(w - 30, panelY + 2, 'Esc cancel', colors.dimmer);
      } else {
        scr.hline(4, h - 3, w - 8, '─', colors.ghost);
        scr.text(4, h - 2, '↑↓ Browse   Enter Sell   Esc Back', colors.dimmer);
      }

      scr.render();
    }

    function onKey(key) {
      const items = getItems();

      if (key === '\x03') {
        cleanup(); scr.exit(); process.exit(0);
      }

      if (sellMode) {
        const item = items[cursor];
        if (!item) { sellMode = false; render(); return; }
        const price = SELL_PRICES[item.rarity] || 5;

        if (key === '\x1b[C' || key === 'd' || key === 'l') {
          // Increase qty
          if (sellQty < item.count) sellQty++;
          render();
        } else if (key === '\x1b[D' || key === 'a' || key === 'h') {
          // Decrease qty
          if (sellQty > 1) sellQty--;
          render();
        } else if (key === '\r' || key === '\n' || key === ' ') {
          // Confirm sell with animation
          const total = price * sellQty;
          const soldName = item.name;
          const soldQty = sellQty;
          if (removeItems(item.id, sellQty)) {
            addCredits(total);
          }
          sellMode = false;
          sellQty = 1;

          // Flash popup animation
          const popupFrames = async () => {
            const cy = Math.floor(h / 2);
            const boxW = 28;
            const boxX = Math.floor((w - boxW) / 2);

            for (let f = 0; f < 6; f++) {
              render();
              // Draw popup on top
              const bright = f < 3;
              const borderC = bright ? colors.gold : rgb(180, 160, 60);
              scr.hline(boxX, cy - 1, boxW, '─', borderC);
              scr.hline(boxX, cy + 2, boxW, '─', borderC);
              for (let row = cy; row < cy + 2; row++) {
                scr.set(boxX, row, '│', borderC);
                scr.set(boxX + boxW - 1, row, '│', borderC);
                for (let col = boxX + 1; col < boxX + boxW - 1; col++) scr.set(col, row, ' ');
              }
              scr.set(boxX, cy - 1, '╭', borderC);
              scr.set(boxX + boxW - 1, cy - 1, '╮', borderC);
              scr.set(boxX, cy + 2, '╰', borderC);
              scr.set(boxX + boxW - 1, cy + 2, '╯', borderC);
              const msg = `◆ +${total} credits`;
              scr.text(Math.floor((w - msg.length) / 2), cy, msg, colors.gold, null, true);
              const sub = `Sold ${soldQty}x ${soldName}`;
              scr.text(Math.floor((w - sub.length) / 2), cy + 1, sub, colors.dim);
              scr.render();
              await sleep(120);
            }
            await sleep(400);
            render();
          };
          popupFrames();
          return;
        } else if (key === '\x1b' || key === 'q') {
          sellMode = false;
          sellQty = 1;
          render();
        }
        return;
      }

      // Normal browse mode
      if (key === '\x1b[A' || key === 'k' || key === 'w') {
        if (items.length > 0) cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key === '\x1b[B' || key === 'j' || key === 's') {
        if (items.length > 0) cursor = (cursor + 1) % items.length;
        render();
      } else if ((key === '\r' || key === '\n' || key === ' ') && items.length > 0) {
        // Enter sell mode
        sellMode = true;
        sellQty = 1;
        render();
      } else if (key === '\x1b' || key === 'q') {
        cleanup(); scr.exit(); resolve();
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

async function handleKerneldex() {
  const { getDexEntries } = require('../src/rigdex');
  const entries = getDexEntries();

  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let cursor = 0;
    const listY = 4;
    const maxRows = h - 7;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      scr.clear();
      scr.centerText(0, '─'.repeat(w), colors.dimmer);
      scr.centerText(0, ' K E R N E L D E X ', rgb(130, 220, 235), null, true);

      if (entries.length === 0) {
        scr.text(4, 3, 'No rigs scanned yet. Battle someone to start collecting!', colors.dim);
        scr.centerText(h - 3, 'Esc to go back', colors.dimmer);
        scr.render();
        return;
      }

      scr.text(4, 2, `◈ ${entries.length} rig${entries.length === 1 ? '' : 's'} scanned`, rgb(130, 220, 235), null, true);
      scr.text(w - 20, 2, 'Esc to go back', colors.dimmer);
      scr.hline(4, 3, w - 8, '─', colors.ghost);

      // Scrollable list
      const scrollStart = Math.max(0, cursor - maxRows + 3);
      const scrollEnd = Math.min(entries.length, scrollStart + maxRows);

      for (let i = scrollStart; i < scrollEnd; i++) {
        const e = entries[i];
        const y = listY + (i - scrollStart);
        const selected = i === cursor;
        const record = `${e.wins}W-${e.losses}L`;
        const arch = e.archetype || '?';
        const recordColor = e.wins > e.losses ? rgb(100, 230, 150) : e.wins < e.losses ? colors.rose : colors.dim;

        if (selected) {
          scr.text(2, y, '▸', colors.white, null, true);
          scr.text(4, y, e.name.slice(0, 18).padEnd(18), colors.white, null, true);
          scr.text(23, y, e.gpu.slice(0, 18).padEnd(18), colors.cyan);
          scr.text(42, y, arch.slice(0, 12).padEnd(12), colors.lavender, null, true);
          scr.text(55, y, record.padEnd(10), recordColor, null, true);
          const specStr = `${e.specs.cpu.slice(0, 12)} | ${e.specs.ram} | ${e.specs.storage}`;
          scr.text(66, y, specStr.slice(0, w - 70), colors.dim);
        } else {
          scr.text(4, y, e.name.slice(0, 18).padEnd(18), colors.dim);
          scr.text(23, y, e.gpu.slice(0, 18).padEnd(18), colors.dimmer);
          scr.text(42, y, arch.slice(0, 12).padEnd(12), colors.dimmer);
          scr.text(55, y, record.padEnd(10), colors.dimmer);
        }
      }

      // Scroll indicator
      if (entries.length > maxRows) {
        const pct = Math.round((cursor / (entries.length - 1)) * 100);
        scr.text(w - 8, listY, `${pct}%`, colors.dimmer);
        // Scrollbar
        const barH = maxRows;
        const thumbPos = Math.round((cursor / (entries.length - 1)) * (barH - 1));
        for (let i = 0; i < barH; i++) {
          scr.text(w - 2, listY + i, i === thumbPos ? '█' : '│', i === thumbPos ? colors.cyan : colors.ghost);
        }
      }

      // Detail panel for selected entry
      const sel = entries[cursor];
      if (sel) {
        const dy = h - 2;
        scr.hline(4, dy - 1, w - 8, '─', colors.ghost);
        scr.text(4, dy, `${sel.specs.cpu}`, colors.dim);
        scr.text(4 + sel.specs.cpu.length + 2, dy, `| ${sel.specs.gpu}`, colors.dim);
        scr.text(w - 22, dy, `Seen ${sel.encounters}x`, colors.dimmer);
      }

      scr.render();
    }

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k' || key === 'w') {
        if (entries.length > 0) cursor = (cursor - 1 + entries.length) % entries.length;
        render();
      } else if (key === '\x1b[B' || key === 'j' || key === 's') {
        if (entries.length > 0) cursor = (cursor + 1) % entries.length;
        render();
      } else if (key === '\x1b' || key === 'q' || key === '\r' || key === '\n') {
        cleanup();
        scr.exit();
        resolve();
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

async function handleLoadout(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);
  const { getAvailableMoves, getEquippedMoves: getEq } = require('../src/moveset');
  const available = getAvailableMoves(fighter.stats, fighter.specs, fighter.archetype);
  const equipped = getEq(fighter.stats, fighter.specs, fighter.archetype);
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

async function handleWorkshop(fighter, sessionState) {
  const specs = await ensureSessionSpecs(sessionState, 'Loading workshop');

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

async function handleSkins(fighter, sessionState) {
  try {
    const { openSkinLocker } = require('../src/market');
    const skinScreen = new Screen();
    skinScreen.enter();
    await openSkinLocker(skinScreen);
    skinScreen.exit();
  } catch (e) {
    await showInfoScreen('SKIN LOCKER', (scr) => {
      scr.text(4, 4, 'Skin locker not available.', colors.dim);
    });
  }
}

async function handleMarket() {
  try {
    const { openMarket } = require('../src/market');
    const marketScreen = new Screen();
    marketScreen.enter();
    await openMarket(marketScreen);
    marketScreen.exit();
  } catch (e) {
    await showInfoScreen('MARKET', (scr) => {
      scr.text(4, 4, 'Market not available.', colors.dim);
    });
  }
}

async function handleCasino() {
  try {
    const { openCasino } = require('../src/casino');
    const casinoScreen = new Screen();
    casinoScreen.enter();
    await openCasino(casinoScreen);
    casinoScreen.exit();
  } catch (e) {
    await showInfoScreen('CASINO', (scr) => {
      scr.text(4, 4, 'Casino not available.', colors.dim);
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
    enableMouseInput();
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
      scr.text(4, h - 2, ' Wheel/W/S choose  ENTER select  Esc back ', colors.dim);
      scr.render();
    }

    function onKey(key) {
      const wheel = getMouseWheelDirection(key);
      if (wheel) {
        cursor = wheel === 'up'
          ? (cursor - 1 + options.length) % options.length
          : (cursor + 1) % options.length;
        render();
      } else if (key === '\x1b[A' || key === 'k' || key === 'w' || key === 'W') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key === '\x1b[B' || key === 'j' || key === 's' || key === 'S') {
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
      disableMouseInput();
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

// Number input screen — returns a positive integer or null on Esc
function numberInput(title, prompt, minVal = 1, maxVal = Infinity, currentBalance = null) {
  return new Promise((resolve) => {
    const scr = new Screen();
    scr.enter();
    const w = scr.width;
    const h = scr.height;
    let buf = '';
    let errorMsg = '';

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      scr.clear();
      scr.centerText(0, '\u2500'.repeat(w), colors.dimmer);
      scr.centerText(0, ` ${title} `, rgb(255, 200, 50), null, true);

      const cy = Math.floor(h / 2);

      if (currentBalance !== null) {
        const { formatBalance } = require('../src/credits');
        scr.centerText(cy - 4, `Your balance: ${formatBalance(currentBalance)} credits`, colors.gold);
      }

      scr.centerText(cy - 2, prompt, colors.dim);
      const inputLine = `> ${buf}_`;
      scr.centerText(cy, inputLine, colors.white, null, true);

      if (errorMsg) {
        scr.centerText(cy + 2, errorMsg, colors.rose);
      }

      scr.centerText(cy + 4, 'Type an amount and press Enter', colors.dimmer);
      scr.centerText(cy + 5, 'Esc to go back', colors.dimmer);

      scr.hline(2, h - 2, w - 4, '\u2500', colors.ghost);
      scr.render();
    }

    function onKey(key) {
      if (key === '\r' || key === '\n') {
        const val = parseInt(buf.trim(), 10);
        if (isNaN(val) || val < minVal) {
          errorMsg = `Minimum wager is ${minVal.toLocaleString()} credits`;
          render();
          return;
        }
        if (val > maxVal) {
          errorMsg = `You only have ${maxVal.toLocaleString()} credits`;
          render();
          return;
        }
        cleanup();
        scr.exit();
        resolve(val);
      } else if (key === '\x1b' || (key === 'q' && buf.length === 0)) {
        cleanup();
        scr.exit();
        resolve(null);
      } else if (key === '\x7f' || key === '\b') {
        buf = buf.slice(0, -1);
        errorMsg = '';
        render();
      } else if (key === '\x03') {
        cleanup();
        scr.exit();
        process.exit(0);
      } else if (key >= '0' && key <= '9' && buf.length < 10) {
        buf += key;
        errorMsg = '';
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

// ═══════════════════════════════════════════════════════════════
// WAGER MODE — Online PvP with credit stakes
// Both players buy in, winner takes the entire pot
// ═══════════════════════════════════════════════════════════════

async function handleWager(fighter, sessionState) {
  const { getBalance, deductWager, awardWager, formatBalance } = require('../src/credits');
  const balance = getBalance();

  if (balance < 100) {
    await showInfoScreen('WAGER', (scr) => {
      scr.centerText(Math.floor(scr.height / 2) - 1, 'Not enough credits to wager!', colors.rose);
      scr.centerText(Math.floor(scr.height / 2) + 1, `Balance: ${formatBalance(balance)} credits (minimum: 100)`, colors.dim);
    });
    return;
  }

  // Step 1: Host or Join?
  const role = await pickOption('WAGER', [
    { key: 'host', label: 'HOST WAGER', desc: 'Create a wager lobby and set the stakes' },
    { key: 'join', label: 'JOIN WAGER', desc: 'Enter a room code to accept a wager' },
  ]);
  if (!role) return;

  if (role === 'host') {
    await handleWagerHost(fighter, sessionState);
  } else {
    await handleWagerJoin(fighter, sessionState);
  }
}

async function handleWagerHost(fighter, sessionState) {
  const { getBalance, deductWager, awardWager, formatBalance } = require('../src/credits');

  // Step 1: Pick battle mode
  const mode = await pickOption('WAGER — BATTLE MODE', [
    { key: 'turns', label: 'TURN-BASED', desc: 'Take turns choosing moves' },
    { key: 'auto',  label: 'QUICK BATTLE', desc: 'Auto-simulated fight' },
  ]);
  if (!mode) return;

  const turnMode = mode === 'turns';

  // Step 2: Set wager amount
  const balance = getBalance();
  const wagerAmount = await numberInput(
    'SET WAGER AMOUNT',
    'How many credits to wager?',
    100,
    balance,
    balance
  );
  if (!wagerAmount) return;

  // Step 3: Confirm
  const confirm = await pickOption('CONFIRM WAGER', [
    { key: 'yes', label: `STAKE ${wagerAmount.toLocaleString()} CREDITS`, desc: `Winner takes ${(wagerAmount * 2).toLocaleString()} credits total` },
    { key: 'no',  label: 'CANCEL', desc: 'Go back to menu' },
  ]);
  if (confirm !== 'yes') return;

  // Deduct wager from host balance
  if (!deductWager(wagerAmount)) {
    await showInfoScreen('WAGER', (scr) => {
      scr.centerText(Math.floor(scr.height / 2), 'Insufficient credits!', colors.rose);
    });
    return;
  }

  // Suppress console.log from relay modules
  const origLog = console.log;
  const logBuffer = [];
  console.log = (...args) => logBuffer.push(args.map(String).join(' '));

  let myFighter = fighter;
  let opponent, matchSeed = 0, roomCode, seed;

  try {
    const { DEFAULT_RELAY_URL } = require('../src/relay');

    myFighter = await ensureSessionFighter(sessionState, myFighter);

    // Embed wager in fighter so relay passes it through to joiner
    myFighter.wager = wagerAmount;

    // Create wager room
    let createResult;
    await withLoadingScreen('Creating wager lobby', async () => {
      const base = DEFAULT_RELAY_URL.replace(/\/$/, '');
      const http = require('node:http');
      const https = require('node:https');
      const parsed = new URL(`${base}/rooms`);
      const mod = parsed.protocol === 'https:' ? https : http;
      const payload = JSON.stringify({ fighter: myFighter, wager: wagerAmount });

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

    // Show wager waiting screen
    const waitScreen = new Screen();
    waitScreen.enter();
    const ww = waitScreen.width;
    const wh = waitScreen.height;
    const cy = Math.floor(wh / 2);
    let waitFrame = 0;
    let matched = false;
    let waitError = null;

    const spinChars = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];

    // Poll in background
    const { DEFAULT_RELAY_URL: relayBase } = require('../src/relay');
    const base = relayBase.replace(/\/$/, '');
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
      if (!matched) waitError = 'Timed out waiting for opponent. Wager refunded.';
    })();

    // Render wager waiting screen
    const waitInterval = setInterval(() => {
      waitFrame++;
      waitScreen.clear();

      waitScreen.centerText(0, '\u2500'.repeat(ww), colors.dimmer);
      waitScreen.centerText(0, ' WAGER LOBBY ', rgb(255, 200, 50), null, true);

      waitScreen.centerText(cy - 6, 'Share this room code with your opponent:', colors.dim);
      waitScreen.centerText(cy - 4, '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557', colors.cyan);
      waitScreen.centerText(cy - 3, `\u2551    ${roomCode}     \u2551`, colors.white, null, true);
      waitScreen.centerText(cy - 2, '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D', colors.cyan);

      waitScreen.centerText(cy, `Mode: ${turnMode ? 'Turn-Based' : 'Quick Battle'}`, colors.dim);
      waitScreen.centerText(cy + 1, `Wager: ${wagerAmount.toLocaleString()} credits each`, rgb(255, 200, 50), null, true);
      waitScreen.centerText(cy + 2, `Winner takes: ${(wagerAmount * 2).toLocaleString()} credits`, colors.gold);

      const spin = spinChars[waitFrame % spinChars.length];
      waitScreen.centerText(cy + 4, `${spin}  Waiting for opponent...`, colors.cyan);

      waitScreen.hline(2, wh - 2, ww - 4, '\u2500', colors.ghost);
      waitScreen.text(4, wh - 2, ' Esc to cancel (wager refunded) ', colors.dim);

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
        // Refund wager on cancel
        awardWager(wagerAmount);
        return;
      }
    }

    clearInterval(waitInterval);
    waitScreen.exit();

    if (waitError) {
      console.log = origLog;
      // Refund wager on timeout
      awardWager(wagerAmount);
      await showInfoScreen('WAGER', (scr) => {
        scr.centerText(Math.floor(scr.height / 2), waitError, colors.rose);
      });
      return;
    }

    // Rebuild opponent sprite
    if (opponent.specs) {
      opponent.sprite = getSprite(opponent.specs);
      if (opponent.skinId) {
        opponent.sprite = applySkinOverride(opponent.sprite, opponent.skinId);
      } else if (opponent.equippedParts) {
        try {
          const { applyTranscendentPartEffects } = require('../src/transcendentparts');
          opponent.sprite = applyTranscendentPartEffects(opponent.sprite, opponent.equippedParts);
        } catch {}
      }
    }
    await prepareBenchToBattle(myFighter, opponent);

    console.log = origLog;

    // Compute seed
    seed = combinedSeed(myFighter.id, opponent.id) ^ matchSeed;

    // Run battle
    let winner;
    if (turnMode && renderTurnBattle) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
      winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, {
        role: 'host', roomCode, relayUrl: require('../src/relay').DEFAULT_RELAY_URL, seed,
      });
    } else {
      const events = simulate(myFighter, opponent, seed);
      winner = await renderBattle(myFighter, opponent, events);
    }

    // Wager payout
    const won = winner === 'a';
    const pot = wagerAmount * 2;

    if (won) {
      const newBal = awardWager(pot);
      await showWagerResults(true, pot, newBal, myFighter, opponent);
    } else {
      await showWagerResults(false, pot, getBalance(), myFighter, opponent);
    }

    // Still save match history (but no normal credit rewards — wager replaces them)
    saveMatch(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');

  } catch (err) {
    console.log = origLog;
    // Refund wager on error
    awardWager(wagerAmount);
    await showInfoScreen('ERROR', (scr) => {
      scr.text(4, 4, `Wager error: ${err.message}`, colors.rose);
      scr.text(4, 6, 'Your wager has been refunded.', colors.gold);
      scr.text(4, 8, 'Press any key to return to menu.', colors.dim);
    });
  } finally {
    console.log = origLog;
  }
}

async function handleWagerJoin(fighter, sessionState) {
  const { getBalance, deductWager, awardWager, formatBalance } = require('../src/credits');

  // Step 1: Enter room code
  const code = await textInput('JOIN WAGER', 'Enter wager room code:');
  if (!code) return;

  const { ROOM_CODE_PATTERN, joinOnline, DEFAULT_RELAY_URL } = require('../src/relay');
  if (!ROOM_CODE_PATTERN.test(code)) {
    await showInfoScreen('WAGER', (scr) => {
      scr.centerText(Math.floor(scr.height / 2), 'Invalid room code. Wager rooms use online relay only.', colors.rose);
    });
    return;
  }

  // Suppress console.log
  const origLog = console.log;
  console.log = () => {};

  let myFighter = fighter;
  let opponent, matchSeed = 0, wagerAmount = 0;
  const roomCode = code.toUpperCase();

  try {
    myFighter = await ensureSessionFighter(sessionState, myFighter);

    // Join the room first — read wager from the host's fighter data
    // (wager is embedded in the fighter object so it works with any relay server)
    await withLoadingScreen(`Joining room ${roomCode}`, async () => {
      const result = await joinOnline(myFighter, roomCode, DEFAULT_RELAY_URL);
      opponent = result.opponent;
      matchSeed = result.matchSeed || 0;
    });

    console.log = origLog;

    // Read wager from host's fighter (embedded by handleWagerHost)
    wagerAmount = opponent.wager || 0;
    if (wagerAmount <= 0) {
      await showInfoScreen('WAGER', (scr) => {
        scr.centerText(Math.floor(scr.height / 2), 'This room is not a wager lobby.', colors.rose);
      });
      return;
    }

    const balance = getBalance();
    if (balance < wagerAmount) {
      await showInfoScreen('WAGER', (scr) => {
        const cy = Math.floor(scr.height / 2);
        scr.centerText(cy - 1, `This wager requires ${wagerAmount.toLocaleString()} credits`, colors.rose);
        scr.centerText(cy + 1, `Your balance: ${formatBalance(balance)} credits`, colors.dim);
      });
      return;
    }

    // Confirm the wager
    const confirm = await pickOption('ACCEPT WAGER?', [
      { key: 'yes', label: `STAKE ${wagerAmount.toLocaleString()} CREDITS`, desc: `Winner takes ${(wagerAmount * 2).toLocaleString()} credits total` },
      { key: 'no',  label: 'DECLINE', desc: 'Go back to menu' },
    ]);
    if (confirm !== 'yes') return;

    // Deduct wager from joiner balance
    if (!deductWager(wagerAmount)) {
      await showInfoScreen('WAGER', (scr) => {
        scr.centerText(Math.floor(scr.height / 2), 'Insufficient credits!', colors.rose);
      });
      return;
    }

    // Rebuild opponent sprite
    if (opponent.specs) {
      opponent.sprite = getSprite(opponent.specs);
      if (opponent.skinId) {
        opponent.sprite = applySkinOverride(opponent.sprite, opponent.skinId);
      } else if (opponent.equippedParts) {
        try {
          const { applyTranscendentPartEffects } = require('../src/transcendentparts');
          opponent.sprite = applyTranscendentPartEffects(opponent.sprite, opponent.equippedParts);
        } catch {}
      }
    }
    await prepareBenchToBattle(myFighter, opponent);

    console.log = origLog;

    // Auto-detect turn mode (defaults to turns for richer experience)
    const turnMode = !!renderTurnBattle;

    const seed = combinedSeed(opponent.id, myFighter.id) ^ matchSeed;
    let winner;

    if (turnMode) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
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

    // Wager payout
    const won = winner === 'a';
    const pot = wagerAmount * 2;

    if (won) {
      const newBal = awardWager(pot);
      await showWagerResults(true, pot, newBal, myFighter, opponent);
    } else {
      await showWagerResults(false, pot, getBalance(), myFighter, opponent);
    }

    // Save match history (no normal credit rewards — wager replaces them)
    saveMatch(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');

  } catch (err) {
    console.log = origLog;
    // Refund wager on error
    if (wagerAmount > 0) awardWager(wagerAmount);
    await showInfoScreen('ERROR', (scr) => {
      scr.text(4, 4, `Wager error: ${err.message}`, colors.rose);
      scr.text(4, 6, wagerAmount > 0 ? 'Your wager has been refunded.' : '', colors.gold);
      scr.text(4, 8, 'Press any key to return to menu.', colors.dim);
    });
  } finally {
    console.log = origLog;
  }
}

// ─── Wager results screen ───
async function showWagerResults(won, pot, currentBalance, myFighter, opponent) {
  const { formatBalance } = require('../src/credits');
  const scr = new Screen();
  scr.enter();
  const w = scr.width;
  const h = scr.height;
  const cy = Math.floor(h / 2);

  scr.centerText(0, '\u2500'.repeat(w), colors.dimmer);
  scr.centerText(0, ' WAGER COMPLETE ', rgb(255, 200, 50), null, true);

  if (won) {
    scr.centerText(cy - 5, '\u2605 \u2605 \u2605  V I C T O R Y  \u2605 \u2605 \u2605', colors.gold, null, true);
    scr.centerText(cy - 3, 'You won the wager!', colors.cyan);

    // Animate pot counter
    const steps = Math.min(pot, 30);
    for (let i = 1; i <= steps; i++) {
      const current = Math.floor((pot * i) / steps);
      scr.centerText(cy - 1, `\u25C6 +${current.toLocaleString()} credits`, colors.gold, null, true);
      scr.render();
      await sleep(30);
    }
    scr.centerText(cy - 1, `\u25C6 +${pot.toLocaleString()} credits`, colors.gold, null, true);
    scr.centerText(cy + 1, `New balance: ${formatBalance(currentBalance)} credits`, colors.dim);
  } else {
    scr.centerText(cy - 5, 'D E F E A T', colors.rose, null, true);
    scr.centerText(cy - 3, 'You lost the wager.', colors.dim);
    scr.centerText(cy - 1, `\u25C6 -${(pot / 2).toLocaleString()} credits`, colors.rose, null, true);
    scr.centerText(cy + 1, `Balance: ${formatBalance(currentBalance)} credits`, colors.dim);
  }

  scr.hline(2, h - 4, w - 4, '\u2500', colors.ghost);
  scr.centerText(h - 3, 'Press any key to continue', colors.dimmer);
  scr.text(w - 14, h - 1, '\u2500 kernelmon \u2500', colors.dimmer);
  scr.render();

  await waitForKey();
  scr.exit();
}

async function handleHost(fighter, sessionState) {
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

      myFighter = await ensureSessionFighter(sessionState, myFighter);

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

      myFighter = await ensureSessionFighter(sessionState, myFighter);

      // Start server and wait
      const result = await hostLAN(myFighter);
      opponent = result.opponent;
    }

    // Rebuild opponent sprite (apply skin / transcendent effects)
    if (opponent.specs) {
      opponent.sprite = getSprite(opponent.specs);
      if (opponent.skinId) {
        opponent.sprite = applySkinOverride(opponent.sprite, opponent.skinId);
      } else if (opponent.equippedParts) {
        try {
          const { applyTranscendentPartEffects } = require('../src/transcendentparts');
          opponent.sprite = applyTranscendentPartEffects(opponent.sprite, opponent.equippedParts);
        } catch {}
      }
    }
    await prepareBenchToBattle(myFighter, opponent);

    console.log = origLog;

    // Compute seed
    seed = combinedSeed(myFighter.id, opponent.id) ^ matchSeed;

    // Run battle
    let winner;
    if (turnMode && renderTurnBattle) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
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

async function handleJoin(fighter, sessionState) {
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

    myFighter = await ensureSessionFighter(sessionState, myFighter);

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

    if (opponent.specs) {
      opponent.sprite = getSprite(opponent.specs);
      if (opponent.skinId) {
        opponent.sprite = applySkinOverride(opponent.sprite, opponent.skinId);
      } else if (opponent.equippedParts) {
        try {
          const { applyTranscendentPartEffects } = require('../src/transcendentparts');
          opponent.sprite = applyTranscendentPartEffects(opponent.sprite, opponent.equippedParts);
        } catch {}
      }
    }
    await prepareBenchToBattle(myFighter, opponent);

    console.log = origLog;

    // Auto-detect turn mode: default to turns since that's the richer experience
    const turnMode = !!renderTurnBattle;

    const seed = combinedSeed(opponent.id, myFighter.id) ^ matchSeed;
    let winner;

    if (turnMode) {
      const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
      try { registerSignatureAnims(myMoves.filter(m => m.signature)); } catch {}
      const oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
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
// PLAY SUBMENU SCREENS — LOCAL / ONLINE / MINIGAME
// ═══════════════════════════════════════════════════════════════

function openPlaySubmenu(title, titleColor, options) {
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

      // Top border
      scr.hline(0, 0, w, '─', colors.dimmer);
      scr.centerText(0, ` ${title} `, titleColor, null, true);

      // Centered card layout
      const cardW = Math.min(48, w - 8);
      const cardX = Math.floor((w - cardW) / 2);
      const cardH = 5;
      const gap = 1;
      const totalH = options.length * (cardH + gap) - gap;
      const startY = Math.max(3, Math.floor((h - totalH) / 2));

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const sel = i === cursor;
        const accent = sel ? opt.color : colors.ghost;
        const textColor = sel ? colors.white : colors.dim;
        const descColor = sel ? colors.dim : colors.dimmer;
        const y = startY + i * (cardH + gap);

        // Card border
        scr.set(cardX, y, '╭', accent);
        scr.hline(cardX + 1, y, cardW - 2, '─', accent);
        scr.set(cardX + cardW - 1, y, '╮', accent);

        for (let row = 1; row <= 3; row++) {
          scr.set(cardX, y + row, '│', accent);
          scr.set(cardX + cardW - 1, y + row, '│', accent);
          for (let col = cardX + 1; col < cardX + cardW - 1; col++) {
            scr.set(col, y + row, ' ');
          }
        }

        scr.set(cardX, y + 4, '╰', accent);
        scr.hline(cardX + 1, y + 4, cardW - 2, '─', accent);
        scr.set(cardX + cardW - 1, y + 4, '╯', accent);

        // Selection indicator
        if (sel) {
          scr.text(cardX + 2, y + 1, '▸', colors.white, null, true);
        }

        // Icon + label
        const labelX = cardX + (sel ? 5 : 3);
        scr.text(labelX, y + 1, opt.icon, sel ? opt.color : colors.dimmer, null, true);
        scr.text(labelX + 3, y + 1, opt.label, textColor, null, true);

        // Description
        scr.text(cardX + (sel ? 5 : 3), y + 2, opt.desc, descColor);

        // Sub-info line
        if (opt.sub) {
          scr.text(cardX + (sel ? 5 : 3), y + 3, opt.sub, colors.dimmer);
        }
      }

      // Footer
      scr.hline(2, h - 3, w - 4, '─', colors.ghost);
      scr.centerText(h - 2, '↑↓ Select   Enter Choose   Esc Back', colors.dimmer);

      scr.render();
    }

    function onKey(key) {
      if (key === '\x03') {
        cleanup(); scr.exit(); process.exit(0);
      }
      if (key === '\x1b[A' || key === 'w' || key === 'k') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key === '\x1b[B' || key === 's' || key === 'j') {
        cursor = (cursor + 1) % options.length;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        cleanup(); scr.exit();
        resolve(options[cursor].key);
      } else if (key === '\x1b' || key === 'q') {
        cleanup(); scr.exit();
        resolve(null);
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

async function handleLocalMenu() {
  return openPlaySubmenu('L O C A L', colors.coral, [
    { key: 'rogue', label: 'SOLO MODE', desc: 'Explore the void, find battles', sub: 'Roguelike single-player adventure', icon: '◉', color: rgb(75, 150, 90) },
    { key: 'gym',   label: 'GYM LADDER', desc: 'Fight gym leaders in order', sub: 'Climb the ranks, earn badges', icon: '▲', color: rgb(255, 180, 60) },
  ]);
}

async function handleOnlineMenu() {
  return openPlaySubmenu('O N L I N E', colors.lilac, [
    { key: 'host',       label: 'HOST GAME', desc: 'Host a battle for others to join', sub: 'Create a room and share the code', icon: '◎', color: colors.coral },
    { key: 'join',       label: 'JOIN BATTLE', desc: 'Enter a room code to fight', sub: 'Connect to an existing match', icon: '↗', color: colors.lilac },
    { key: 'wager',      label: 'WAGER', desc: 'Stake credits in online PvP', sub: 'Winner takes the pot', icon: '◆', color: rgb(255, 200, 50) },
  ]);
}

async function handleMinigameMenu() {
  return openPlaySubmenu('M I N I G A M E', rgb(0, 255, 180), [
    { key: 'dash',     label: 'DASH MODE', desc: 'Side-scroll obstacle runner', sub: 'Dodge and dash to survive', icon: '▸', color: colors.coral },
    { key: 'hackgrid', label: 'HACK THE GRID', desc: 'Dodge sentries, grab data', sub: 'Stealth grid infiltration', icon: '⌬', color: rgb(0, 255, 180) },
  ]);
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP — returns to menu after each action
// ═══════════════════════════════════════════════════════════════

async function run() {
  // --rescan flag: delete cached hardware scan and force a fresh one
  if (process.argv.includes('--rescan')) {
    try {
      const os = require('node:os');
      const fs = require('node:fs');
      const path = require('node:path');
      const homeCache = path.join(os.homedir(), '.kernelmon', 'hardware.json');
      const projCache = path.join(__dirname, '..', '.kernelmon', 'hardware.json');
      if (fs.existsSync(homeCache)) fs.unlinkSync(homeCache);
      if (fs.existsSync(projCache)) fs.unlinkSync(projCache);
    } catch {}
  }
  const sessionState = {};
  while (true) {
    const { choice, fighter } = await mainMenu(sessionState);

    switch (choice) {
      case 'local': {
        const sub = await handleLocalMenu();
        if (sub === 'rogue') await handleRogue(fighter, sessionState);
        else if (sub === 'gym') await handleGym(fighter, sessionState);
        break;
      }
      case 'online': {
        const sub = await handleOnlineMenu();
        if (sub === 'host') await handleHost(fighter, sessionState);
        else if (sub === 'join') await handleJoin(fighter, sessionState);
        else if (sub === 'wager') await handleWager(fighter, sessionState);
        else if (sub === 'cardbattle') await handleCardBattle(fighter, sessionState);
        break;
      }
      case 'minigame': {
        const sub = await handleMinigameMenu();
        if (sub === 'dash') await handleDash(fighter, sessionState);
        else if (sub === 'hackgrid') await handleHackGrid(fighter, sessionState);
        break;
      }
      case 'demo':
        await handleDemo(fighter, false, sessionState);
        break;
      case 'demo_turns':
        await handleDemo(fighter, true, sessionState);
        break;
      case 'dash':
        await handleDash(fighter, sessionState);
        break;
      case 'hackgrid':
        await handleHackGrid(fighter, sessionState);
        break;
      case 'rogue':
        await handleRogue(fighter, sessionState);
        break;
      case 'gym':
        await handleGym(fighter, sessionState);
        break;
      case 'profile':
        await handleProfile(fighter, sessionState);
        break;
      case 'loadout':
        await handleLoadout(fighter, sessionState);
        break;
      case 'bag':
        await handleBag();
        break;
      case 'workshop':
        await handleWorkshop(fighter, sessionState);
        break;
      case 'skins':
        await handleSkins(fighter, sessionState);
        break;
      case 'lootbox':
        await handleLootBox();
        break;
      case 'market':
        await handleMarket();
        break;
      case 'kerneldex':
        await handleKerneldex();
        break;
      case 'guide':
        await handleGuide();
        break;
      case 'history':
        await handleHistory();
        break;
      case 'redeem':
        try {
          const { openRedeemScreen } = require('../src/redeem');
          await openRedeemScreen();
        } catch (e) {
          await showInfoScreen('REDEEM CODE', (scr) => {
            scr.centerText(Math.floor(scr.height / 2), 'Redeem system unavailable', colors.rose);
          });
        }
        break;
      case 'casino':
        await handleCasino();
        break;
      case 'wager':
        await handleWager(fighter, sessionState);
        break;
      case 'host':
        await handleHost(fighter, sessionState);
        break;
      case 'join':
        await handleJoin(fighter, sessionState);
        break;
      case 'cardbattle':
        await handleCardBattle(fighter, sessionState);
        break;
      case 'cards':
        await handleCardBinder(fighter, sessionState);
        break;
      case 'update':
        await handleUpdate();
        break;
      case 'quit':
        process.exit(0);
    }
    // Each handler uses showInfoScreen which waits for key — loop back to menu
  }
}

// ═══════════════════════════════════════════════════════════════
// CARD BATTLE & CARD BINDER
// ═══════════════════════════════════════════════════════════════

async function handleCardBattle(fighter, sessionState) {
  fighter = await ensureSessionFighter(sessionState, fighter);

  const { Screen } = require('../src/screen');
  const { selectRandomCardBattleOpponent } = require('../src/opponentselect');
  const { grantStarterPack, getOwnedCards, selectRandomCards, addCard, rollCardDrop } = require('../src/cards');
  const { selectCards } = require('../src/cardselect');
  const { createRNG } = require('../src/rng');

  // Grant starter pack if no cards
  const starterGranted = grantStarterPack();
  if (starterGranted) {
    await showInfoScreen('STARTER PACK', (scr, w, h) => {
      const cy = Math.floor(h / 2);
      scr.centerText(cy - 2, '♦ WELCOME TO CARD BATTLE ♦', colors.gold, null, true);
      scr.centerText(cy, 'You received 3 starter cards!', colors.mint);
      scr.centerText(cy + 1, 'Efficient Cooling + Fail-Safe Boot + Overclock Burst', colors.dim);
      scr.centerText(cy + 3, 'Win battles to earn more cards.', colors.dim);
    });
  }

  const owned = getOwnedCards();
  if (owned.length === 0) {
    await showInfoScreen('CARD BATTLE', (scr, w, h) => {
      scr.centerText(Math.floor(h / 2), 'No cards available! Win battles to earn cards.', colors.rose);
    });
    return;
  }

  // Step 1: Select opponent
  const selectScreen = new Screen();
  selectScreen.enter();
  const opponent = await selectRandomCardBattleOpponent(selectScreen);
  selectScreen.exit();
  if (!opponent) return;

  // Step 2: Select cards (up to 3)
  const cardScreen = new Screen();
  cardScreen.enter();
  const hand = await selectCards(cardScreen);
  cardScreen.exit();
  if (!hand || hand.length === 0) return;

  // Step 3: Prebattle benchmark transition
  await prepareBenchToBattle(fighter, opponent);

  // Step 4: Build movesets
  let myMoves, oppMoves, seed;
  await withLoadingScreen('Preparing card battle', async () => {
    seed = combinedSeed(fighter.id || 0, opponent.id || 0);
    myMoves = getEquippedMoves(fighter.stats, fighter.specs, fighter.archetype);
    try {
      const { registerSignatureAnims } = require('../src/effects/projectile');
      registerSignatureAnims(myMoves.filter(m => m.signature));
    } catch (e) {}
    oppMoves = assignMoveset(opponent.stats, opponent.specs, opponent.archetype);
  });

  // Step 5: AI cards for opponent
  const rng = createRNG(Date.now());
  const aiCards = selectRandomCards(rng, 3);

  // Step 6: Battle with card mode enabled
  const winner = await renderTurnBattle(fighter, opponent, myMoves, oppMoves, {
    role: 'host',
    seed,
    cardMode: true,
    cardsA: hand,
    cardsB: aiCards,
  });

  // Step 7: Post-battle rewards
  const rewards = postBattle(fighter, opponent, winner, 'cardbattle');
  const oppName = opponent.name || 'the opponent';

  // Card drop on win
  if (winner === 'a') {
    const droppedCard = rollCardDrop(createRNG(seed + 1));
    if (droppedCard) {
      addCard(droppedCard.id);
    }
  }

  await showBattleRewards(winner, rewards,
    `Your rig crushed ${oppName} in Card Battle!`,
    `...${oppName} won the Card Battle.`);
}

async function handleCardBinder(fighter, sessionState) {
  const { Screen } = require('../src/screen');
  const { openCardCollection } = require('../src/cardcollection');
  const { grantStarterPack } = require('../src/cards');

  // Grant starter pack if no cards
  grantStarterPack();

  const screen = new Screen();
  screen.enter();
  await openCardCollection(screen);
  screen.exit();
}

async function handleUpdate() {
  const { execSync, spawn } = require('node:child_process');
  const projectDir = require('node:path').join(__dirname, '..');

  // Show pulling screen
  let pullOutput = '';
  let pullError = null;

  await withLoadingScreen('Pulling latest updates', async () => {
    try {
      pullOutput = execSync('git pull origin main', {
        cwd: projectDir,
        encoding: 'utf8',
        timeout: 30000,
      }).trim();
    } catch (err) {
      pullError = err.stderr || err.message || 'Unknown error';
    }
  });

  if (pullError) {
    await showInfoScreen('UPDATE', (scr) => {
      const cy = Math.floor(scr.height / 2);
      scr.centerText(cy - 1, 'Update failed', colors.rose, null, true);
      scr.centerText(cy + 1, pullError.slice(0, 60), colors.dim);
    });
    return;
  }

  const alreadyUpToDate = pullOutput.includes('Already up to date');

  if (alreadyUpToDate) {
    await showInfoScreen('UPDATE', (scr) => {
      scr.centerText(Math.floor(scr.height / 2), 'Already up to date!', colors.mint);
    });
    return;
  }

  // Files changed — restart the launcher to load new code
  await showInfoScreen('UPDATE', (scr) => {
    const cy = Math.floor(scr.height / 2);
    scr.centerText(cy - 2, 'Update complete!', colors.mint, null, true);
    scr.centerText(cy, pullOutput.split('\n').slice(0, 3).join('  '), colors.dim);
    scr.centerText(cy + 2, 'Restarting...', colors.cyan);
  });

  // Respawn the launcher process with the updated code
  const child = spawn(process.execPath, [__filename, ...process.argv.slice(2)], {
    cwd: projectDir,
    stdio: 'inherit',
    detached: false,
  });
  child.on('exit', (code) => process.exit(code || 0));
  // Stop the current event loop from continuing
  await new Promise(() => {}); // hang forever — child takes over
}

function waitForKey() {
  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.once('data', (key) => {
      stdin.setRawMode(false);
      stdin.pause();
      if (key === '\x03') process.exit(0);
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
      stdin.setRawMode(false);
      stdin.pause();
      if (key === '\x03') process.exit(0);
      resolve(key);
    });
  });
}

run().catch(err => {
  console.error(`\x1b[38;2;240;150;170m  ✗ Error: ${err.message}\x1b[0m`);
  process.exit(1);
});
