#!/usr/bin/env node

// KERNELMON — CLI entry point
// Usage:
//   kmon host [--online] [--turns]   Host a battle (--turns for turn-based mode)
//   kmon join <room-code>            Join an online battle
//   kmon join <ip> [--port 7331]     Join a LAN battle
//   kmon demo [--turns]              Demo battle (--turns for turn-based)
//   kmon rogue                       Rogue-like exploration mode
//   kmon profile                     Show your PC's fighter stats

const { getSpecs, buildStats, fighterName, gpuName, classifyArchetype } = require('../src/profiler');
const { simulate } = require('../src/battle');
const { renderBattle } = require('../src/renderer');
const { host, join, PORT } = require('../src/network');
const { hostOnline, joinOnline, DEFAULT_RELAY_URL, ROOM_CODE_PATTERN } = require('../src/relay');
const { combinedSeed } = require('../src/rng');
const { colors, RESET } = require('../src/palette');
const { getSprite } = require('../src/sprites');
const { assignMoveset, getAvailableMoves, getEquippedMoves, saveLoadout, MOVE_POOL } = require('../src/moveset');
const { generateSignatureMoves, SIGNATURE_COLOR, SIGNATURE_ICON } = require('../src/signature');
const { registerSignatureAnims } = require('../src/effects/projectile');
const { renderTurnBattle } = require('../src/turnrenderer');
const { saveMatch, printHistory } = require('../src/history');
const { rollRewards, addItem, printInventory, printRewards } = require('../src/items');
const { runBenchToBattleTransition } = require('../src/benchmark');

const args = process.argv.slice(2);
const command = args[0] || 'demo';

function getFlag(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}

async function buildFighter(rawSpecs) {
  const { applyBuildOverrides } = require('../src/parts');
  const specs = applyBuildOverrides(rawSpecs);
  const stats = buildStats(specs);
  const name = fighterName(specs);
  const gpu = gpuName(specs);
  const sprite = getSprite(specs);
  const archetype = classifyArchetype(stats, specs);
  return {
    id: rawSpecs.id,
    name,
    gpu,
    stats,
    specs,
    sprite,
    archetype,
  };
}

async function prepareBenchToBattle(fighter, opponent = null) {
  try {
    const profile = await runBenchToBattleTransition(fighter, opponent);
    if (profile) fighter.benchmark = profile;
  } catch {}
  return fighter;
}

// Post-battle: save match + award loot if won
function postBattle(myFighter, opponent, winner, mode) {
  saveMatch(myFighter, opponent, winner, mode);

  // Award credits regardless of win/loss
  const { calculateBattleCredits, addCredits, printCreditEarned } = require('../src/credits');
  const earned = calculateBattleCredits(winner, myFighter, opponent, mode);
  const newBal = addCredits(earned);
  console.log('');
  printCreditEarned(earned, newBal);

  const won = winner === 'a';
  if (won) {
    const { createRNG } = require('../src/rng');
    const rng = createRNG(Date.now());
    const tier = opponent.sprite?.hw?.tier || 'mid';
    const rewards = rollRewards(rng, tier, true);
    for (const r of rewards) addItem(r.id);
    if (rewards.length > 0) {
      console.log('');
      printRewards(rewards);
    }
    // Roll for part drop
    const { rollPartDrop, addPart, printPartDrop } = require('../src/parts');
    const partDrop = rollPartDrop(rng, tier);
    if (partDrop) {
      addPart(partDrop.id);
      console.log('');
      printPartDrop(partDrop);
    }
  }
}

function printFighter(fighter, color, compact = false) {
  const s = fighter.stats;
  const arch = fighter.archetype || { name: '???', tagline: '' };
  if (compact) {
    console.log(`${color}  ╭────────────────────────────────────╮${RESET}`);
    console.log(`${color}  │  ${fighter.name.padEnd(34)}│${RESET}`);
    console.log(`${color}  │  GPU: ${fighter.gpu.padEnd(29)}│${RESET}`);
    console.log(`${color}  │  Class: ${arch.name.padEnd(27)}│${RESET}`);
    console.log(`${color}  ├────────────────────────────────────┤${RESET}`);
    console.log(`${color}  │  HP:${String(s.hp).padStart(5)}  STR:${String(s.str).padStart(3)}  MAG:${String(s.mag).padStart(3)}      │${RESET}`);
    console.log(`${color}  │          SPD:${String(s.spd).padStart(3)}  DEF:${String(s.def).padStart(3)}      │${RESET}`);
    console.log(`${color}  ╰────────────────────────────────────╯${RESET}`);
    return;
  }
  const sp = fighter.specs || {};
  const dim = '\x1b[38;2;100;100;130m';
  const bright = '\x1b[38;2;230;230;245m';
  const bar = (val, max = 100, width = 16) => {
    const filled = Math.round((val / max) * width);
    const full = '█'.repeat(Math.min(filled, width));
    const empty = '░'.repeat(width - Math.min(filled, width));
    return `${full}${empty}`;
  };

  console.log(`${color}  ╭──────────────────────────────────────────────────╮${RESET}`);
  console.log(`${color}  │  ${bright}${fighter.name.padEnd(48)}${color}│${RESET}`);
  console.log(`${color}  │  ${dim}Class: ${bright}${arch.name}  ${dim}${arch.tagline.padEnd(38).slice(0,38)}${color}│${RESET}`);
  console.log(`${color}  ├──────────────────────────────────────────────────┤${RESET}`);

  // CPU → STR
  const cpuLabel = (sp.cpu?.brand || 'Unknown').slice(0, 28);
  const cores = sp.cpu?.cores || '?';
  const threads = sp.cpu?.threads || '?';
  const ghz = sp.cpu?.speedMax ? `${sp.cpu.speedMax}GHz` : '';
  console.log(`${color}  │  ${dim}CPU  ${bright}${cpuLabel.padEnd(30)}${color}│${RESET}`);
  console.log(`${color}  │  ${dim}     ${cores}C/${threads}T ${ghz.padEnd(10)} ${bright}STR ${bar(s.str)} ${String(s.str).padStart(3)}${color} │${RESET}`);

  // GPU → MAG
  const gpuLabel = (fighter.gpu || 'Integrated').slice(0, 28);
  const vram = sp.gpu?.vramMB ? `${Math.round(sp.gpu.vramMB / 1024)}GB` : '0GB';
  console.log(`${color}  │  ${dim}GPU  ${bright}${gpuLabel.padEnd(30)}${color}│${RESET}`);
  console.log(`${color}  │  ${dim}     VRAM ${vram.padEnd(11)} ${bright}MAG ${bar(s.mag)} ${String(s.mag).padStart(3)}${color} │${RESET}`);

  // RAM → HP/VIT
  const ramGB = sp.ram?.totalGB || '?';
  console.log(`${color}  │  ${dim}RAM  ${bright}${(ramGB + 'GB').padEnd(30)}${color}│${RESET}`);
  console.log(`${color}  │  ${dim}                          ${bright}HP  ${bar(s.hp, 2000)} ${String(s.hp).padStart(4)}${color}│${RESET}`);

  // Storage → SPD
  const storType = sp.storage?.type || 'Unknown';
  const storName = (sp.storage?.name || '').slice(0, 22);
  console.log(`${color}  │  ${dim}DISK ${bright}${(storType + (storName ? ' — ' + storName : '')).padEnd(30).slice(0,30)}${color}│${RESET}`);
  console.log(`${color}  │  ${dim}                          ${bright}SPD ${bar(s.spd)} ${String(s.spd).padStart(3)}${color} │${RESET}`);

  // DEF (derived)
  console.log(`${color}  │  ${dim}                          ${bright}DEF ${bar(s.def)} ${String(s.def).padStart(3)}${color} │${RESET}`);

  // Flags
  const flags = [];
  if (s.isLaptop) flags.push('LAPTOP (-18%)');
  if (fighter.sprite?.hw?.brand) flags.push(fighter.sprite.hw.brand.toUpperCase().replace('_', ' '));
  if (fighter.sprite?.hw?.tier) flags.push(fighter.sprite.hw.tier.toUpperCase() + ' TIER');
  if (flags.length) {
    console.log(`${color}  │  ${dim}${flags.join(' · ').padEnd(48)}${color}│${RESET}`);
  }

  console.log(`${color}  ╰──────────────────────────────────────────────────╯${RESET}`);
}

// Mock opponent for demo mode (a modest machine)
function mockOpponent() {
  const mockSpecs = {
    cpu: { brand: 'Intel Celeron N4020', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 },
    ram: { totalGB: 4 },
    gpu: { model: 'Intel UHD Graphics 600', vramMB: 0, vendor: 'Intel' },
    storage: { type: 'eMMC' },
  };
  const mockStats = {
    str: 22, vit: 25, mag: 15, spd: 20, def: 22, hp: 700, maxHp: 700,
  };
  return {
    id: 'mock-chromebook-001',
    name: 'Celeron N4020',
    gpu: 'Intel UHD 600',
    stats: mockStats,
    specs: mockSpecs,
    sprite: getSprite(mockSpecs),
    archetype: classifyArchetype(mockStats, mockSpecs),
  };
}

async function main() {
  try {
    switch (command) {
      case 'history': {
        console.log('');
        printHistory();
        console.log('');
        break;
      }

      case 'bag': {
        console.log('');
        printInventory();
        console.log('');
        break;
      }

      case 'parts': {
        const { printOwnedParts } = require('../src/parts');
        console.log('');
        printOwnedParts();
        console.log('');
        break;
      }

      case 'workshop': {
        const { Screen } = require('../src/screen');
        const { openWorkshop } = require('../src/workshop');
        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const workshopSpecs = await getSpecs();
        const workshopScreen = new Screen();
        workshopScreen.enter();
        await openWorkshop(workshopSpecs, workshopScreen);
        workshopScreen.exit();
        break;
      }

      case 'balance': {
        const { getBalance, getLifetimeEarned, formatBalance } = require('../src/credits');
        const gold = '\x1b[38;2;255;215;0m';
        const bright = '\x1b[38;2;230;230;245m';
        const dim = '\x1b[38;2;100;100;130m';
        console.log(`\n${gold}  ◆ Balance: ${bright}${formatBalance(getBalance())} credits${RESET}`);
        console.log(`${dim}    Lifetime earned: ${formatBalance(getLifetimeEarned())}${RESET}\n`);
        break;
      }

      case 'lootbox': {
        const { Screen } = require('../src/screen');
        const { openLootShop } = require('../src/lootbox');
        const lootScreen = new Screen();
        lootScreen.enter();
        await openLootShop(lootScreen);
        lootScreen.exit();
        break;
      }

      case 'loadout': {
        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const specs = await getSpecs();
        const fighter = await buildFighter(specs);
        const available = getAvailableMoves(fighter.stats);
        const equipped = getEquippedMoves(fighter.stats);
        const sigMoves = generateSignatureMoves(fighter.stats, fighter.specs, fighter.archetype);

        const cyan = '\x1b[38;2;130;220;235m';
        const bright = '\x1b[38;2;230;230;245m';
        const dim = '\x1b[38;2;100;100;130m';
        const gold = '\x1b[38;2;240;220;140m';
        const sigColor = '\x1b[38;2;255;215;0m';
        const sigAccent = '\x1b[38;2;255;170;50m';

        console.log(`${cyan}  ╭──────────────────────────────────────────────────╮${RESET}`);
        console.log(`${cyan}  │  ${sigColor}${SIGNATURE_ICON} SIGNATURE MOVES${dim}                              ${cyan}│${RESET}`);
        console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
        sigMoves.forEach(m => {
          console.log(`${cyan}  │  ${sigColor}${SIGNATURE_ICON} ${bright}${m.label.padEnd(22)}${sigAccent}SIGNATURE  ${dim}${m.desc.padEnd(12).slice(0,12)}${cyan}│${RESET}`);
        });
        console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
        console.log(`${cyan}  │  ${bright}EQUIPPED MOVES (4)${dim}                               ${cyan}│${RESET}`);
        console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
        equipped.forEach((m, i) => {
          console.log(`${cyan}  │  ${gold}${i + 1}. ${bright}${m.label.padEnd(22)}${dim}${m.cat.padEnd(10)} ${m.desc.padEnd(16).slice(0,16)}${cyan}│${RESET}`);
        });
        console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
        console.log(`${cyan}  │  ${bright}AVAILABLE MOVES (${available.length})${dim}                          ${cyan}│${RESET}`);
        console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);
        available.forEach(m => {
          const isEquipped = equipped.some(e => e.name === m.name);
          const marker = isEquipped ? `${gold}★` : `${dim}·`;
          console.log(`${cyan}  │  ${marker} ${isEquipped ? bright : dim}${m.label.padEnd(22)}${dim}${m.cat.padEnd(10)} ${m.desc.padEnd(16).slice(0,16)}${cyan}│${RESET}`);
        });
        console.log(`${cyan}  ╰──────────────────────────────────────────────────╯${RESET}`);
        console.log(`${dim}  To change loadout: kmon loadout set <move1> <move2> <move3> <move4>${RESET}`);

        // Handle "kmon loadout set ..."
        if (args[1] === 'set' && args.length >= 6) {
          const names = args.slice(2, 6).map(n => n.toUpperCase());
          const valid = names.every(n => MOVE_POOL[n] && available.some(m => m.name === n));
          if (valid) {
            saveLoadout(names);
            console.log(`${gold}  ★ Loadout saved!${RESET}`);
          } else {
            console.log(`\x1b[38;2;240;150;170m  ✗ Invalid move names. Use exact names from the pool above.${RESET}`);
          }
        }
        console.log('');
        break;
      }

      case 'profile': {
        const { Screen } = require('../src/screen');
        const { openProfile } = require('../src/profilescreen');
        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const profileSpecs = await getSpecs();
        const profileFighter = await buildFighter(profileSpecs);
        const profileScreen = new Screen();
        profileScreen.enter();
        await openProfile(profileFighter, profileScreen);
        profileScreen.exit();
        break;
      }

      case 'host': {
        const online = args.includes('--online');
        const turnMode = args.includes('--turns');
        const port = parseInt(getFlag('--port', PORT), 10);
        const relayUrl = getFlag('--relay', DEFAULT_RELAY_URL);

        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m');
        const specs = await getSpecs();
        const myFighter = await prepareBenchToBattle(await buildFighter(specs));
        printFighter(myFighter, '\x1b[38;2;130;220;235m');

        let opponent, matchSeed = 0, roomCode;
        if (online) {
          const result = await hostOnline(myFighter, relayUrl);
          opponent = result.opponent;
          matchSeed = result.matchSeed || 0;
          roomCode = result.roomCode;
        } else {
          const result = await host(myFighter, port);
          opponent = result.opponent;
        }

        // Always rebuild opponent sprite
        if (opponent.specs) {
          opponent.sprite = getSprite(opponent.specs);
        }

        console.log('\x1b[38;2;180;160;240m  ◆ Opponent found!\x1b[0m');
        printFighter(opponent, '\x1b[38;2;180;160;240m', true);

        const seed = combinedSeed(myFighter.id, opponent.id) ^ matchSeed;
        let winner;

        if (turnMode) {
          const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
          registerSignatureAnims(myMoves.filter(m => m.signature));
          const oppMoves = assignMoveset(opponent.stats);
          console.log('\x1b[38;2;240;220;140m  ◆ Turn-based battle starting...\x1b[0m\n');
          await sleep(2000);
          winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, {
            role: 'host', roomCode, relayUrl, seed,
          });
        } else {
          console.log('\n\x1b[38;2;240;220;140m  ◆ Battle starting in 3 seconds...\x1b[0m\n');
          await sleep(3000);
          const events = simulate(myFighter, opponent, seed);
          winner = await renderBattle(myFighter, opponent, events);
        }

        postBattle(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');
        console.log('');
        if (winner === 'a') {
          console.log('\x1b[38;2;240;220;140m  ★ YOUR RIG WINS! ★\x1b[0m');
        } else {
          console.log('\x1b[38;2;180;160;240m  Opponent\'s rig wins.\x1b[0m');
        }
        console.log('');
        break;
      }

      case 'join': {
        const target = args[1];
        if (!target) {
          console.error('\x1b[38;2;240;150;170m  ✗ Usage:\x1b[0m');
          console.error('\x1b[38;2;240;150;170m    kmon join ABCD-1234        (online, room code)\x1b[0m');
          console.error('\x1b[38;2;240;150;170m    kmon join 192.168.1.5      (LAN, IP address)\x1b[0m');
          process.exit(1);
        }

        const isRoomCode = ROOM_CODE_PATTERN.test(target);
        const port = parseInt(getFlag('--port', PORT), 10);
        const relayUrl = getFlag('--relay', DEFAULT_RELAY_URL);

        console.log('\n\x1b[38;2;180;160;240m  ◆ Scanning hardware...\x1b[0m');
        const specs = await getSpecs();
        const myFighter = await prepareBenchToBattle(await buildFighter(specs));
        printFighter(myFighter, '\x1b[38;2;180;160;240m');

        const turnMode = args.includes('--turns');
        let opponent, matchSeed = 0, roomCode;
        if (isRoomCode) {
          const result = await joinOnline(myFighter, target, relayUrl);
          opponent = result.opponent;
          matchSeed = result.matchSeed || 0;
          roomCode = target;
        } else {
          const result = await join(myFighter, target, port);
          opponent = result.opponent;
        }

        // Always rebuild opponent sprite
        if (opponent.specs) {
          opponent.sprite = getSprite(opponent.specs);
        }

        console.log('\x1b[38;2;130;220;235m  ◆ Opponent found!\x1b[0m');
        printFighter(opponent, '\x1b[38;2;130;220;235m', true);

        const seed = combinedSeed(opponent.id, myFighter.id) ^ matchSeed;
        let winner;

        if (turnMode) {
          // Turn-based: joiner is fighterA (foreground), opponent is fighterB
          const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
          registerSignatureAnims(myMoves.filter(m => m.signature));
          const oppMoves = assignMoveset(opponent.stats);
          console.log('\x1b[38;2;240;220;140m  ◆ Turn-based battle starting...\x1b[0m\n');
          await sleep(2000);
          winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, {
            role: 'joiner', roomCode, relayUrl, seed,
          });
        } else {
          console.log('\n\x1b[38;2;240;220;140m  ◆ Battle starting in 3 seconds...\x1b[0m\n');
          await sleep(3000);
          const events = simulate(opponent, myFighter, seed);

          // Swap perspective for auto-battle mode
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

        postBattle(myFighter, opponent, winner, turnMode ? 'turns' : 'auto');
        console.log('');
        if (winner === 'a') {
          console.log('\x1b[38;2;240;220;140m  ★ YOUR RIG WINS! ★\x1b[0m');
        } else {
          console.log('\x1b[38;2;130;220;235m  Opponent\'s rig wins.\x1b[0m');
        }
        console.log('');
        break;
      }

      case 'dash': {
        console.log(`\n\x1b[38;2;240;160;140m  ▸ DASH MODE — Side-scroll obstacle runner\x1b[0m`);
        console.log('\x1b[38;2;240;160;140m  ▸ Scanning hardware...\x1b[0m\n');
        const dashSpecs = await getSpecs();
        const dashFighter = await buildFighter(dashSpecs);
        printFighter(dashFighter, '\x1b[38;2;240;160;140m', true);
        console.log('\x1b[38;2;240;220;140m  ▸ Starting in 2 seconds...\x1b[0m\n');
        await sleep(2000);
        const { renderDash } = require('../src/dashrenderer');
        const dashResult = await renderDash(dashFighter);
        console.log('');
        console.log(`\x1b[38;2;240;220;140m  ▸ Final Score: ${dashResult.score}\x1b[0m`);
        if (dashResult.reason === 'dead') {
          console.log('\x1b[38;2;240;150;170m  Your rig crashed!\x1b[0m');
        }
        console.log('');
        break;
      }

      case 'rogue': {
        console.log(`\n\x1b[38;2;75;150;90m  ▸ ROGUE MODE — Explore the void\x1b[0m`);
        console.log('\x1b[38;2;75;150;90m  ▸ Scanning hardware...\x1b[0m\n');
        const rogueSpecs = await getSpecs();
        const rogueFighter = await prepareBenchToBattle(await buildFighter(rogueSpecs));
        printFighter(rogueFighter, '\x1b[38;2;75;150;90m', true);
        console.log('\x1b[38;2;240;220;140m  ▸ Entering in 2 seconds...\x1b[0m\n');
        await sleep(2000);
        const { renderRogue } = require('../src/roguelike');
        const rogueResult = await renderRogue(rogueFighter);
        console.log('');
        if (rogueResult.reason === 'victory') {
          console.log(`\x1b[38;2;240;220;140m  ★ ALL ENEMIES DEFEATED — ${rogueResult.battlesWon} battles won ★\x1b[0m`);

          // Award credits for rogue completion
          const { calculateBattleCredits, addCredits, printCreditEarned } = require('../src/credits');
          const bonusCredits = 500 * rogueResult.battlesWon;
          const newBal = addCredits(bonusCredits);
          console.log('');
          printCreditEarned(bonusCredits, newBal);
        } else {
          console.log(`\x1b[38;2;100;100;130m  Exited rogue mode. Battles won: ${rogueResult.battlesWon}\x1b[0m`);
        }
        console.log('');
        break;
      }

      case 'demo':
      default: {
        const turnMode = args.includes('--turns');
        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const demoSpecs = await getSpecs();
        const myFighter = await buildFighter(demoSpecs);

        // Opponent selection screen
        const { Screen } = require('../src/screen');
        const { selectOpponent } = require('../src/opponentselect');
        const selectScreen = new Screen();
        selectScreen.enter();
        const opponent = await selectOpponent(selectScreen);
        selectScreen.exit();

        if (!opponent) break; // user pressed ESC
        await prepareBenchToBattle(myFighter, opponent);

        const oppName = opponent.name || 'the opponent';

        if (turnMode) {
          const myMoves = getEquippedMoves(myFighter.stats, myFighter.specs, myFighter.archetype);
          registerSignatureAnims(myMoves.filter(m => m.signature));
          const oppMoves = assignMoveset(opponent.stats);

          const seed = combinedSeed(myFighter.id, opponent.id);
          const winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, { role: 'host', seed });

          postBattle(myFighter, opponent, winner, 'turns');
          console.log('');
          if (winner === 'a') {
            console.log(`\x1b[38;2;240;220;140m  ★ YOUR RIG DESTROYS ${oppName.toUpperCase()}! ★\x1b[0m`);
          } else {
            console.log(`\x1b[38;2;240;150;170m  ...${oppName} won.\x1b[0m`);
          }
        } else {
          const seed = combinedSeed(myFighter.id, opponent.id);
          const events = simulate(myFighter, opponent, seed);
          const winner = await renderBattle(myFighter, opponent, events);

          postBattle(myFighter, opponent, winner, 'auto');
          console.log('');
          if (winner === 'a') {
            console.log(`\x1b[38;2;240;220;140m  ★ YOUR RIG DESTROYS ${oppName.toUpperCase()}! ★\x1b[0m`);
          } else {
            console.log(`\x1b[38;2;240;150;170m  ...${oppName} won.\x1b[0m`);
          }
        }
        console.log('');
        break;
      }
    }
  } catch (err) {
    console.error(`\x1b[38;2;240;150;170m  ✗ Error: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
