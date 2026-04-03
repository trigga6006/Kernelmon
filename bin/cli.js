#!/usr/bin/env node

// WORKSTATION OFF — CLI entry point
// Usage:
//   wso host [--online] [--turns]   Host a battle (--turns for turn-based mode)
//   wso join <room-code>            Join an online battle
//   wso join <ip> [--port 7331]     Join a LAN battle
//   wso demo [--turns]              Demo battle (--turns for turn-based)
//   wso profile                     Show your PC's fighter stats

const { getSpecs, buildStats, fighterName, gpuName } = require('../src/profiler');
const { simulate } = require('../src/battle');
const { renderBattle } = require('../src/renderer');
const { host, join, PORT } = require('../src/network');
const { hostOnline, joinOnline, DEFAULT_RELAY_URL, ROOM_CODE_PATTERN } = require('../src/relay');
const { combinedSeed } = require('../src/rng');
const { colors, RESET } = require('../src/palette');
const { getSprite } = require('../src/sprites');
const { assignMoveset } = require('../src/moveset');
const { renderTurnBattle } = require('../src/turnrenderer');

const args = process.argv.slice(2);
const command = args[0] || 'demo';

function getFlag(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}

async function buildFighter(specs) {
  const stats = buildStats(specs);
  const name = fighterName(specs);
  const gpu = gpuName(specs);
  const sprite = getSprite(specs);
  return {
    id: specs.id,
    name,
    gpu,
    stats,
    specs,
    sprite, // hardware-matched visual identity
  };
}

function printFighter(fighter, color) {
  const s = fighter.stats;
  console.log(`${color}  ╭────────────────────────────────────╮${RESET}`);
  console.log(`${color}  │  ${fighter.name.padEnd(34)}│${RESET}`);
  console.log(`${color}  │  GPU: ${fighter.gpu.padEnd(29)}│${RESET}`);
  console.log(`${color}  ├────────────────────────────────────┤${RESET}`);
  console.log(`${color}  │  HP:${String(s.hp).padStart(5)}  STR:${String(s.str).padStart(3)}  MAG:${String(s.mag).padStart(3)}      │${RESET}`);
  console.log(`${color}  │          SPD:${String(s.spd).padStart(3)}  DEF:${String(s.def).padStart(3)}      │${RESET}`);
  console.log(`${color}  ╰────────────────────────────────────╯${RESET}`);
}

// Mock opponent for demo mode (a modest machine)
function mockOpponent() {
  const mockSpecs = {
    cpu: { brand: 'Intel Celeron N4020', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 },
    ram: { totalGB: 4 },
    gpu: { model: 'Intel UHD Graphics 600', vramMB: 0, vendor: 'Intel' },
    storage: { type: 'eMMC' },
  };
  return {
    id: 'mock-chromebook-001',
    name: 'Celeron N4020',
    gpu: 'Intel UHD 600',
    stats: {
      str: 22, vit: 25, mag: 15, spd: 20, def: 22, hp: 700, maxHp: 700,
    },
    specs: mockSpecs,
    sprite: getSprite(mockSpecs),
  };
}

async function main() {
  try {
    switch (command) {
      case 'profile': {
        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const specs = await getSpecs();
        const fighter = await buildFighter(specs);
        printFighter(fighter, '\x1b[38;2;130;220;235m');
        console.log('');
        break;
      }

      case 'host': {
        const online = args.includes('--online');
        const turnMode = args.includes('--turns');
        const port = parseInt(getFlag('--port', PORT), 10);
        const relayUrl = getFlag('--relay', DEFAULT_RELAY_URL);

        console.log('\n\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m');
        const specs = await getSpecs();
        const myFighter = await buildFighter(specs);
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
        printFighter(opponent, '\x1b[38;2;180;160;240m');

        const seed = combinedSeed(myFighter.id, opponent.id) ^ matchSeed;
        let winner;

        if (turnMode) {
          const myMoves = assignMoveset(myFighter.stats);
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

        console.log('');
        if (winner === 'a') {
          console.log('\x1b[38;2;240;220;140m  ★ YOUR WORKSTATION WINS! ★\x1b[0m');
        } else {
          console.log('\x1b[38;2;180;160;240m  Opponent\'s workstation wins.\x1b[0m');
        }
        console.log('');
        break;
      }

      case 'join': {
        const target = args[1];
        if (!target) {
          console.error('\x1b[38;2;240;150;170m  ✗ Usage:\x1b[0m');
          console.error('\x1b[38;2;240;150;170m    wso join ABCD-1234        (online, room code)\x1b[0m');
          console.error('\x1b[38;2;240;150;170m    wso join 192.168.1.5      (LAN, IP address)\x1b[0m');
          process.exit(1);
        }

        const isRoomCode = ROOM_CODE_PATTERN.test(target);
        const port = parseInt(getFlag('--port', PORT), 10);
        const relayUrl = getFlag('--relay', DEFAULT_RELAY_URL);

        console.log('\n\x1b[38;2;180;160;240m  ◆ Scanning hardware...\x1b[0m');
        const specs = await getSpecs();
        const myFighter = await buildFighter(specs);
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
        printFighter(opponent, '\x1b[38;2;130;220;235m');

        const seed = combinedSeed(opponent.id, myFighter.id) ^ matchSeed;
        let winner;

        if (turnMode) {
          // Turn-based: joiner is fighterA (foreground), opponent is fighterB
          const myMoves = assignMoveset(myFighter.stats);
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

        console.log('');
        if (winner === 'a') {
          console.log('\x1b[38;2;240;220;140m  ★ YOUR WORKSTATION WINS! ★\x1b[0m');
        } else {
          console.log('\x1b[38;2;130;220;235m  Opponent\'s workstation wins.\x1b[0m');
        }
        console.log('');
        break;
      }

      case 'demo':
      default: {
        const turnMode = args.includes('--turns');
        console.log(`\n\x1b[38;2;130;220;235m  ◆ DEMO MODE${turnMode ? ' (Turn-Based)' : ''} — Battle against a Chromebook\x1b[0m`);
        console.log('\x1b[38;2;130;220;235m  ◆ Scanning hardware...\x1b[0m\n');
        const specs = await getSpecs();
        const myFighter = await buildFighter(specs);
        printFighter(myFighter, '\x1b[38;2;130;220;235m');

        const opponent = mockOpponent();
        console.log('\x1b[38;2;180;160;240m  ◆ Opponent:\x1b[0m');
        printFighter(opponent, '\x1b[38;2;180;160;240m');

        if (turnMode) {
          const myMoves = assignMoveset(myFighter.stats);
          const oppMoves = assignMoveset(opponent.stats);
          console.log('\x1b[38;2;130;220;235m  ◆ Your moves:\x1b[0m');
          myMoves.forEach(m => console.log(`\x1b[38;2;100;100;130m    ${m.label.padEnd(20)} ${m.desc}\x1b[0m`));
          console.log('\x1b[38;2;240;220;140m  ◆ Battle starting in 2 seconds...\x1b[0m\n');
          await sleep(2000);

          const seed = combinedSeed(myFighter.id, opponent.id);
          const winner = await renderTurnBattle(myFighter, opponent, myMoves, oppMoves, { role: 'host', seed });

          console.log('');
          if (winner === 'a') {
            console.log('\x1b[38;2;240;220;140m  ★ YOUR WORKSTATION DESTROYS THE CHROMEBOOK! ★\x1b[0m');
          } else {
            console.log('\x1b[38;2;240;150;170m  ...the Chromebook won. Somehow.\x1b[0m');
          }
        } else {
          console.log('\x1b[38;2;240;220;140m  ◆ Battle starting in 3 seconds...\x1b[0m\n');
          await sleep(3000);

          const seed = combinedSeed(myFighter.id, opponent.id);
          const events = simulate(myFighter, opponent, seed);
          const winner = await renderBattle(myFighter, opponent, events);

          console.log('');
          if (winner === 'a') {
            console.log('\x1b[38;2;240;220;140m  ★ YOUR WORKSTATION DESTROYS THE CHROMEBOOK! ★\x1b[0m');
          } else {
            console.log('\x1b[38;2;240;150;170m  ...the Chromebook won. Somehow.\x1b[0m');
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
