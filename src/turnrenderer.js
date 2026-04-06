// ═══════════════════════════════════════════════════════════════
// TURN-BASED BATTLE RENDERER
// Single continuous render loop — no flickering, no competing timers
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, hpColor, rgb } = require('./palette');
const { MatrixRain, CodeSparkle } = require('./effects/matrix');
const { GlitchEffect, FloatingText } = require('./effects/glitch');
const { ProjectileManager } = require('./effects/projectile');
const { BlackHoleEffect, MaelstromEffect, IonCannonEffect, QuantumRiftEffect, SupernovaEffect } = require('./effects/special');
const { createRNG } = require('./rng');
const { getSprite } = require('./sprites');
const {
  createBattleState,
  processTurn,
  isOver,
  getWinner,
  serializeBattleState,
  applyBattleStateSnapshot,
} = require('./turnbattle');
const {
  submitAndWait,
  publishTurnResolution,
  waitForTurnResolution,
  endBattle,
} = require('./turnrelay');
const { useItem, getOwnedItems, ITEMS, RARITY_COLORS } = require('./items');
const { preBattleLobby } = require('./prebattle');
const { getBenchmarkLogEntries } = require('./benchmark');
const { getCategoryMultiplier } = require('./balance');
const { SIGNATURE_COLOR, SIGNATURE_ACCENT, SIGNATURE_ICON } = require('./signature');

const FPS = 20;
const FRAME_MS = 1000 / FPS;
const TURN_ANIM_MS = 5500;  // 5.5s per turn — enough for projectile travel + dramatic impact
const TURN_TIMER_SECS = 30;

// Move category colors and icons (inline move selection UI)
const CAT_COLORS = {
  physical: colors.peach,
  magic:    colors.lavender,
  speed:    colors.sky,
  special:  colors.gold,
};

const CAT_ICONS = {
  physical: '⚔',
  magic:    '◆',
  speed:    '»',
  special:  '★',
};

// ─── Hacker callsign pool ───
const CALLSIGNS = {
  flagship: [
    'MAINFRAME', 'ZERO_DAY', 'ROOT_ACCESS', 'KERNEL_PANIC',
    'BLACKHAT', 'APEX_NODE', 'DARK_FIBER', 'OVERCLOCK',
    'TITAN_GATE', 'SYSTEM_SHOCK', 'DEEP_STACK', 'PRIME_ROOT',
  ],
  high: [
    'DARKNET', 'CIPHER_BREAK', 'PROXY_WAR', 'GHOST_SHELL',
    'NETRUNNER', 'SILICON_EDGE', 'DAEMON_CORE', 'FLUX_GATE',
    'RED_THREAD', 'CORE_DUMP', 'VECTOR_9', 'PHASE_SHIFT',
  ],
  mid: [
    'PACKET_STORM', 'HASH_CLASH', 'FIREWALL', 'STACK_TRACE',
    'MEM_LEAK', 'BYTE_FORCE', 'PING_SPIKE', 'CACHE_HIT',
    'BIT_SHIFT', 'RUNTIME', 'HEX_EDIT', 'SUDO',
  ],
  low: [
    'SCRIPT_KIDDIE', 'DIAL_UP', 'BLUESCREEN', 'SEG_FAULT',
    'NULL_PTR', 'BOOT_LOOP', 'BEEP_CODE', 'FLOPPY',
    'DOT_EXE', 'SAFE_MODE', 'BIOS_BEEP', 'TASK_FAIL',
  ],
};

function getCallsign(fighter) {
  const hw = fighter.sprite?.hw;
  if (!hw) return fighter.name;
  const tier = hw.tier || 'mid';
  const pool = CALLSIGNS[tier] || CALLSIGNS.mid;
  const idx = (hw.specHash || 0) % pool.length;
  return pool[idx];
}

async function renderTurnBattle(fighterA, fighterB, movesetA, movesetB, options = {}) {
  const { role, roomCode, relayUrl, seed, autoPlay } = options;
  const isOnline = !!roomCode;
  const isHost = role === 'host' || !isOnline;

  const meSlot = isHost ? 'a' : 'b';
  const oppSlot = isHost ? 'b' : 'a';

  function toDisplay(stateSlot) {
    if (isHost) return stateSlot;
    return stateSlot === 'a' ? 'b' : 'a';
  }

  function syncDisplayHpFromState() {
    targetHpA = isHost ? battleState.a.hp : battleState.b.hp;
    targetHpB = isHost ? battleState.b.hp : battleState.a.hp;
  }

  function resolveSubmittedMove(submittedRole, moveName) {
    if (!moveName || moveName === '__FORFEIT__' || moveName === '__ITEM_ONLY__') return null;
    const pool = submittedRole === 'host'
      ? (isHost ? movesetA : movesetB)
      : (isHost ? movesetB : movesetA);
    return pool.find(m => m.name === moveName) || pool[0] || null;
  }

  // Ensure sprites
  for (const f of [fighterA, fighterB]) {
    if (!f.sprite || typeof f.sprite.back?.draw !== 'function') {
      f.sprite = f.specs ? getSprite(f.specs) : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
      // Re-apply skin override if present
      if (f.skinId) {
        try {
          const { applySkinOverride } = require('./skins');
          f.sprite = applySkinOverride(f.sprite, f.skinId);
        } catch {}
      }
      // Re-apply Transcendent part effects (only if no skin)
      if (!f.skinId && f.equippedParts) {
        try {
          const { applyTranscendentPartEffects } = require('./transcendentparts');
          f.sprite = applyTranscendentPartEffects(f.sprite, f.equippedParts);
        } catch {}
      }
    }
  }

  const screen = new Screen();
  const rng = createRNG(99);
  const matrix = new MatrixRain(screen.width, screen.height, rng); // used only for intro
  const sparkle = new CodeSparkle(screen.width, screen.height, rng, 20);
  const glitch = new GlitchEffect(rng);
  const floats = new FloatingText();
  const projectiles = new ProjectileManager(rng, screen.width, screen.height);

  // Tame the intro rain
  for (const col of matrix.columns) {
    col.active = rng.chance(0.20);
    col.speed = rng.float(0.2, 0.7);
  }

  const w = screen.width;
  const h = screen.height;

  // Layout (same as auto battle)
  const oppX = Math.floor(w * 0.62);
  const oppY = 2;
  const oppCenterX = oppX + 5;
  const oppCenterY = oppY + 4;
  const plyX = Math.floor(w * 0.08);
  const plyY = h - 22;
  const plyCenterX = plyX + 7;
  const plyCenterY = plyY + 5;
  const barW = Math.min(24, Math.floor(w * 0.2));
  const oppBarX = Math.floor(w * 0.33);
  const plyBarX = Math.floor(w * 0.28);
  const plyBarY = plyY + 8;
  const logY = h - 8;
  const logHeight = 7;  // header + 6 moves (BAG accessed via right arrow)
  const logX = 3;
  const logW = w - 6;

  // Battle state: state.a = host, state.b = joiner (ALWAYS)
  const battleState = createBattleState(
    isHost ? fighterA : fighterB,
    isHost ? fighterB : fighterA,
    seed || 42
  );
  let hpA = fighterA.stats.maxHp;
  let hpB = fighterB.stats.maxHp;
  let targetHpA = hpA;
  let targetHpB = hpB;
  const battleLog = [];
  let p1HitFrames = 0;
  let p2HitFrames = 0;
  let p1KO = false;
  let p2KO = false;

  // Item ring effect — expanding green ring around the user
  let itemRing = null; // { cx, cy, startFrame, duration }
  // Bag cooldown — can't use items two turns in a row
  let lastItemTurn = 0;
  // Special attack effects — full-screen animations (black hole, maelstrom)
  let specialEffect = null; // BlackHoleEffect | MaelstromEffect instance
  let frameCount = 0;
  let battleStartTime = Date.now();
  let turnNum = 0;

  function addLog(text, color) {
    battleLog.push({ text, color });
    if (battleLog.length > logHeight) battleLog.shift();
  }

  // ─── Item effect application ───
  function applyItemEffect(item, state, who) {
    const fighter = state[who];
    const opponent = state[who === 'a' ? 'b' : 'a'];
    const dWho = toDisplay(who);
    const dOpp = toDisplay(who === 'a' ? 'b' : 'a');

    const userCX = dWho === 'a' ? plyCenterX : oppCenterX;
    const userCY = dWho === 'a' ? plyCenterY : oppCenterY;
    const oppCX = dOpp === 'a' ? plyCenterX : oppCenterX;
    const oppCY = dOpp === 'a' ? plyCenterY : oppCenterY;

    // Trigger green ring effect around the item user
    itemRing = { cx: userCX, cy: userCY, startFrame: frameCount, duration: 16 };

    switch (item.effect) {
      case 'heal': {
        const healAmt = Math.round(fighter.maxHp * item.value);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
        if (dWho === 'a') targetHpA = fighter.hp;
        else targetHpB = fighter.hp;
        addLog(`  +${healAmt} HP restored`, colors.mint);
        floats.add(userCX, userCY - 3, `+${healAmt}`, colors.mint, 14);
        break;
      }
      case 'boost_str': {
        const boost = Math.round(fighter.str * item.value);
        fighter.str += boost;
        fighter._boosts = fighter._boosts || [];
        fighter._boosts.push({ stat: 'str', amount: boost, turns: item.duration });
        addLog(`  STR +${boost} for ${item.duration} turns`, colors.peach);
        break;
      }
      case 'boost_def': {
        const boost = Math.round(fighter.def * item.value);
        fighter.def += boost;
        fighter._boosts = fighter._boosts || [];
        fighter._boosts.push({ stat: 'def', amount: boost, turns: item.duration });
        addLog(`  DEF +${boost} for ${item.duration} turns`, colors.sky);
        break;
      }
      case 'boost_spd': {
        const boost = Math.round(fighter.spd * item.value);
        fighter.spd += boost;
        fighter._boosts = fighter._boosts || [];
        fighter._boosts.push({ stat: 'spd', amount: boost, turns: item.duration });
        addLog(`  SPD +${boost} for ${item.duration} turns`, colors.sky);
        break;
      }
      case 'boost_mag': {
        const boost = Math.round(fighter.mag * item.value);
        fighter.mag += boost;
        fighter._boosts = fighter._boosts || [];
        fighter._boosts.push({ stat: 'mag', amount: boost, turns: item.duration });
        addLog(`  MAG +${boost} for ${item.duration} turns`, colors.lavender);
        break;
      }
      case 'shield': {
        fighter._shield = true;
        addLog(`  Firewall active — next hit blocked`, colors.sky);
        break;
      }
      case 'cleanse': {
        fighter.stunned = false;
        fighter.debuffed = false;
        addLog(`  Status effects cleared`, colors.mint);
        break;
      }
      case 'reflect': {
        fighter._reflect = item.value;
        addLog(`  Reflect active — 50% damage returned`, colors.lavender);
        break;
      }
      case 'direct_damage': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  Dealt ${dmg} direct damage`, colors.peach);
        floats.add(oppCX, oppCY - 3, `${dmg}`, colors.damage, 14);
        glitch.burst(oppCX, oppCY, 5, 5);
        break;
      }
      case 'stun': {
        opponent.stunned = true;
        addLog(`  Opponent stunned for 1 turn`, colors.rose);
        break;
      }
      case 'nuke': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        opponent.stunned = true;
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  NUKE! ${dmg} damage + stun`, colors.gold);
        glitch.screenTear(w, 6);
        glitch.scatter(w / 2, h / 2, w, h, 20, 8);
        break;
      }
      case 'special_darknet_collapse': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        opponent.stunned = true;
        // DEF down — reduce by 20%
        const defLoss = Math.round(opponent.def * 0.20);
        opponent.def = Math.max(1, opponent.def - defLoss);
        opponent._boosts = opponent._boosts || [];
        opponent._boosts.push({ stat: 'def', amount: -defLoss, turns: 3 });
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  ● DARKNET COLLAPSE!`, rgb(200, 120, 255));
        addLog(`  ${dmg} damage + stun + DEF -${defLoss}`, rgb(180, 100, 240));
        floats.add(oppCX, oppCY - 4, `${dmg}`, colors.damage, 20);
        floats.add(oppCX - 3, oppCY - 2, 'COLLAPSE', rgb(200, 120, 255), 25);
        specialEffect = new BlackHoleEffect(oppCX, oppCY, w, h, frameCount);
        break;
      }
      case 'special_botnet_typhoon': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        // STR down 25% for 3 turns
        const strLoss = Math.round(opponent.str * 0.25);
        opponent.str = Math.max(1, opponent.str - strLoss);
        opponent._boosts = opponent._boosts || [];
        opponent._boosts.push({ stat: 'str', amount: -strLoss, turns: 3 });
        // SPD down 25% for 3 turns
        const spdLoss = Math.round(opponent.spd * 0.25);
        opponent.spd = Math.max(1, opponent.spd - spdLoss);
        opponent._boosts.push({ stat: 'spd', amount: -spdLoss, turns: 3 });
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  ◎ BOTNET TYPHOON unleashed!`, rgb(100, 240, 255));
        addLog(`  ${dmg} dmg + STR -${strLoss} + SPD -${spdLoss}`, rgb(140, 220, 255));
        floats.add(oppCX, oppCY - 4, `${dmg}`, colors.damage, 20);
        floats.add(oppCX - 3, oppCY - 2, 'TYPHOON', rgb(100, 240, 255), 25);
        specialEffect = new MaelstromEffect(oppCX, oppCY, w, h, frameCount);
        break;
      }
      case 'special_skyfall_payload': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        opponent.stunned = true;
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  ▼ SKYFALL PAYLOAD inbound!`, rgb(120, 180, 255));
        addLog(`  ${dmg} damage + stun`, rgb(200, 230, 255));
        floats.add(oppCX, oppCY - 4, `${dmg}`, colors.damage, 20);
        floats.add(oppCX - 3, oppCY - 2, 'SKYFALL', rgb(180, 220, 255), 25);
        specialEffect = new IonCannonEffect(oppCX, oppCY, w, h, frameCount);
        break;
      }
      case 'special_phantom_protocol': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        // MAG down 25% for 3 turns
        const magLoss = Math.round(opponent.mag * 0.25);
        opponent.mag = Math.max(1, opponent.mag - magLoss);
        opponent._boosts = opponent._boosts || [];
        opponent._boosts.push({ stat: 'mag', amount: -magLoss, turns: 3 });
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  ◈ PHANTOM PROTOCOL engaged!`, rgb(255, 100, 255));
        addLog(`  ${dmg} damage + MAG -${magLoss}`, rgb(200, 150, 255));
        floats.add(oppCX, oppCY - 4, `${dmg}`, colors.damage, 20);
        floats.add(oppCX - 3, oppCY - 2, 'PHANTOM', rgb(255, 100, 255), 25);
        specialEffect = new QuantumRiftEffect(oppCX, oppCY, w, h, frameCount);
        break;
      }
      case 'special_reactor_overflow': {
        const dmg = Math.round(opponent.maxHp * item.value);
        opponent.hp = Math.max(0, opponent.hp - dmg);
        // All stats down 15% for 2 turns
        opponent._boosts = opponent._boosts || [];
        for (const stat of ['str', 'def', 'spd', 'mag']) {
          const loss = Math.round(opponent[stat] * 0.15);
          opponent[stat] = Math.max(1, opponent[stat] - loss);
          opponent._boosts.push({ stat, amount: -loss, turns: 2 });
        }
        if (dOpp === 'a') targetHpA = opponent.hp;
        else targetHpB = opponent.hp;
        addLog(`  ✹ REACTOR OVERFLOW!`, rgb(255, 240, 120));
        addLog(`  ${dmg} dmg + all stats -15%`, rgb(255, 200, 80));
        floats.add(oppCX, oppCY - 4, `${dmg}`, colors.damage, 25);
        floats.add(oppCX - 3, oppCY - 2, 'OVERFLOW', rgb(255, 240, 120), 30);
        specialEffect = new SupernovaEffect(oppCX, oppCY, w, h, frameCount);
        break;
      }
    }
  }

  // ─── Tick down temporary boosts ───
  function tickBoosts(state) {
    for (const who of ['a', 'b']) {
      const fighter = state[who];
      if (!fighter._boosts) continue;
      fighter._boosts = fighter._boosts.filter(b => {
        b.turns--;
        if (b.turns <= 0) {
          fighter[b.stat] -= b.amount;
          return false;
        }
        return true;
      });
    }
  }

  const nameA = getCallsign(fighterA);
  const nameB = getCallsign(fighterB);

  screen.enter();

  // ─── Pre-battle lobby (skipped in auto-play mode) ───
  if (!autoPlay) {
    try {
      const finalMoves = await preBattleLobby(fighterA, fighterB, screen, movesetA);
      if (Array.isArray(finalMoves) && finalMoves.length === 4) {
        movesetA = finalMoves;
      }
    } catch (e) {
      // If pre-battle fails (e.g. non-interactive), keep default moveset
    }
  }

  // ─── Online ready-up sync ───
  // Both players must signal READY before the battle intro plays.
  // Uses turn -1 as a handshake so both clients start at the same time.
  if (isOnline) {
    const READY_TURN = -1;
    const readySpinChars = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
    let readyFrame = 0;
    let readyDone = false;

    // Render waiting screen while we sync
    const readyInterval = setInterval(() => {
      readyFrame++;
      screen.clear();
      screen.centerText(0, '\u2500'.repeat(w), colors.dimmer);
      screen.centerText(0, ' READY UP ', colors.gold, null, true);

      const cy = Math.floor(h / 2);
      const spin = readySpinChars[readyFrame % readySpinChars.length];
      screen.centerText(cy - 1, '\u2714 You are ready!', rgb(0, 220, 120));
      screen.centerText(cy + 1, `${spin}  Waiting for opponent to ready up...`, colors.cyan);

      screen.hline(2, h - 2, w - 4, '\u2500', colors.ghost);
      screen.render();
    }, 50);

    try {
      // Submit our ready signal and wait for opponent's
      await submitAndWait(relayUrl, roomCode, role, '__READY__', READY_TURN);
    } catch (e) {
      // If sync fails (timeout, etc.) proceed anyway so the game isn't stuck
    }

    readyDone = true;
    clearInterval(readyInterval);
  }

  // ─── Battle intro ───
  screen.resetDiff();
  await battleIntro(screen, matrix, nameA, nameB, fighterA, fighterB, w, h);

  // Hard transition: blank the prev buffer so the first battle frame is pristine
  screen.resetDiff();
  // Pre-draw one full battle frame so sprites appear instantly and fully formed
  battleStartTime = Date.now();
  for (const entry of getBenchmarkLogEntries(fighterA)) addLog(entry.text, entry.color);
  for (const entry of getBenchmarkLogEntries(fighterB)) addLog(entry.text, entry.color);

  // ═══════════════════════════════════════════════════════════════
  // SINGLE RENDER LOOP + PERSISTENT STDIN
  // One interval, one key handler — no toggling, no competing timers
  // ═══════════════════════════════════════════════════════════════

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  // Phase state
  let phase = 'idle'; // 'select' | 'waiting' | 'animating' | 'idle' | 'quicktime'
  let cursorRow = 0;   // 0-2 = move rows, 3 = BAG
  let cursorCol = 0;   // 0 = left column, 1 = right column
  let selectMode = 'moves'; // 'moves' | 'bag'
  let bagItems = [];
  let bagScroll = 0; // scroll offset for bag list
  // Helper: get linear move index from row/col
  function getCursorIndex() { return cursorRow * 2 + cursorCol; }
  // Legacy compat: expose cursor as linear index for auto-select etc.
  let cursor = 0;
  let moveResolve = null;
  let turnTimerStart = 0; // timestamp when selection began

  // Animation state
  let animEvents = [];
  let animEventIdx = 0;
  let animElapsed = 0;
  let animResolve = null;

  // Idle state
  let idleElapsed = 0;
  let idleDuration = 0;
  let idleResolve = null;

  // Quick-time event state
  const QTE_COMMANDS = [
    'sudo reboot', 'chmod 777', 'git push', 'npm install', 'kill -9',
    'ping localhost', 'cat /dev/null', 'rm -rf /tmp', 'echo $PATH',
    'ls -la', 'gcc -o', 'make clean', 'apt update', 'ssh root',
    'curl -X POST', 'docker run', 'grep -r', 'cd /root',
  ];
  const QTE_BONUSES = [
    { name: 'POWER SURGE', stat: 'str', amount: 0.25, turns: 1, color: colors.peach,
      msg: 'STR +25% next attack!' },
    { name: 'SHADER BOOST', stat: 'mag', amount: 0.25, turns: 1, color: colors.lavender,
      msg: 'MAG +25% next attack!' },
    { name: 'OVERCLOCK', stat: 'spd', amount: 0.30, turns: 1, color: colors.sky,
      msg: 'SPD +30% next turn!' },
    { name: 'FIREWALL', stat: 'def', amount: 0.30, turns: 1, color: colors.mint,
      msg: 'DEF +30% next turn!' },
    { name: 'RAM PATCH', stat: 'heal', amount: 0.12, turns: 0, color: colors.mint,
      msg: 'Restored 12% HP!' },
    { name: 'CRIT HACK', stat: 'crit', amount: 1, turns: 1, color: colors.gold,
      msg: 'Next attack is a GUARANTEED CRIT!' },
  ];
  const QTE_CHANCE = 0.35;   // 35% per turn — ~every 3 turns
  const QTE_TIME_MS = 4000;  // 4 seconds to type
  const EVOLVE_STREAK = 3;   // consecutive QTE successes to evolve
  const EVOLVE_BOOST = 0.18; // +18% all stats on evolution
  const EVOLVE_DURATION = 10; // evolution lasts 10 turns then expires
  let qteCommand = '';
  let qteInput = '';
  let qteStartTime = 0;
  let qteResolve = null;
  let hackStreak = 0;        // consecutive QTE successes (player)
  let evolved = false;        // true while player is evolved
  let evolvedTurn = 0;        // turn number when player evolved
  let oppHackStreak = 0;     // consecutive QTE successes (opponent, online)
  let oppEvolved = false;     // true while opponent is evolved
  let oppEvolvedTurn = 0;     // turn number when opponent evolved

  function getQuickHackPlan(turnNumber, qteRole = 'solo') {
    if (turnNumber <= 1) return null;

    const roleSalt = qteRole === 'host'
      ? 0x517cc1b7
      : qteRole === 'joiner'
        ? 0x2f6e2b1d
        : 0x13579bdf;
    const turnSeed = (((seed || 42) >>> 0) ^ roleSalt ^ Math.imul(turnNumber, 0x45d9f3b)) >>> 0;
    const qteRng = createRNG(turnSeed);

    if (!qteRng.chance(QTE_CHANCE)) return null;

    return {
      command: QTE_COMMANDS[qteRng.int(0, QTE_COMMANDS.length - 1)],
      bonus: QTE_BONUSES[qteRng.int(0, QTE_BONUSES.length - 1)],
    };
  }

  function applyQuickHackBonus(state, who, bonus) {
    if (!bonus) return;

    const fighter = state[who];
    const dWho = toDisplay(who);
    const cx = dWho === 'a' ? plyCenterX : oppCenterX;
    const cy = dWho === 'a' ? plyCenterY : oppCenterY;

    floats.add(cx, cy - 4, bonus.name, bonus.color, 20);
    glitch.burst(cx, cy, 5, 5);

    if (bonus.stat === 'heal') {
      const healAmt = Math.round(fighter.maxHp * bonus.amount);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + healAmt);
      if (dWho === 'a') targetHpA = fighter.hp;
      else targetHpB = fighter.hp;
      itemRing = { cx, cy, startFrame: frameCount, duration: 16 };
      return;
    }

    if (bonus.stat === 'crit') {
      const boost = 500; // guarantees crit via spd/1000 formula
      fighter.spd += boost;
      fighter._boosts = fighter._boosts || [];
      fighter._boosts.push({ stat: 'spd', amount: boost, turns: 1 });
      return;
    }

    const boost = Math.max(1, Math.round(fighter[bonus.stat] * bonus.amount));
    fighter[bonus.stat] += boost;
    fighter._boosts = fighter._boosts || [];
    fighter._boosts.push({ stat: bonus.stat, amount: boost, turns: bonus.turns });
  }

  // ─── Evolution: apply permanent stat boost for rest of match ───
  function applyEvolution(state, who) {
    const fighter = state[who];
    const dWho = toDisplay(who);
    const cx = dWho === 'a' ? plyCenterX : oppCenterX;
    const cy = dWho === 'a' ? plyCenterY : oppCenterY;

    // Boost all combat stats permanently (no turns limit = rest of match)
    for (const stat of ['str', 'mag', 'spd', 'def']) {
      const boost = Math.max(1, Math.round(fighter[stat] * EVOLVE_BOOST));
      fighter[stat] += boost;
    }
    // HP boost — increase max and heal the bonus amount
    const hpBoost = Math.round(fighter.maxHp * EVOLVE_BOOST);
    fighter.maxHp += hpBoost;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + hpBoost);
    if (dWho === 'a') { targetHpA = fighter.hp; }
    else { targetHpB = fighter.hp; }

    // Big visual burst
    floats.add(cx, cy - 5, '◆ E V O L V E D ◆', colors.gold, 40);
    floats.add(cx, cy - 3, `ALL STATS +18% (${EVOLVE_DURATION} turns)`, colors.cyan, 30);
    glitch.screenTear(w, 8);
    glitch.scatter(cx, cy, w, h, 20, 10);
    itemRing = { cx, cy, startFrame: frameCount, duration: 24 };
  }

  // ─── De-evolution: revert stat boosts when duration expires ───
  function revertEvolution(state, who) {
    const fighter = state[who];
    const dWho = toDisplay(who);
    const cx = dWho === 'a' ? plyCenterX : oppCenterX;
    const cy = dWho === 'a' ? plyCenterY : oppCenterY;

    // Reverse the stat boosts (same formula as apply)
    for (const stat of ['str', 'mag', 'spd', 'def']) {
      const boost = Math.max(1, Math.round(fighter[stat] / (1 + EVOLVE_BOOST) * EVOLVE_BOOST));
      fighter[stat] = Math.max(1, fighter[stat] - boost);
    }
    const hpBoost = Math.round(fighter.maxHp / (1 + EVOLVE_BOOST) * EVOLVE_BOOST);
    fighter.maxHp = Math.max(1, fighter.maxHp - hpBoost);
    fighter.hp = Math.min(fighter.hp, fighter.maxHp);
    if (dWho === 'a') { targetHpA = fighter.hp; }
    else { targetHpB = fighter.hp; }

    floats.add(cx, cy - 4, 'EVOLUTION EXPIRED', colors.rose, 25);
    glitch.burst(cx, cy, 4, 4);
  }

  let lastTickTime = Date.now();

  // ─── Auto-play driver (demo mode) ───
  let autoTurnIndex = 0;
  let autoTyping = false;
  let autoTypeTimer = null;
  let autoSelectStarted = false;
  let autoQteStarted = false;

  function autoPlayTick() {
    if (!autoPlay) return;

    // Auto-type quick hack commands character by character
    if (phase === 'quicktime' && qteResolve && !autoTyping && !autoQteStarted) {
      autoQteStarted = true;
      autoTyping = true;
      const cmd = qteCommand;
      let i = 0;
      const charDelay = Math.min(120, 1800 / (cmd.length || 1));
      autoTypeTimer = setInterval(() => {
        if (i < cmd.length) {
          qteInput += cmd[i];
          i++;
        } else {
          clearInterval(autoTypeTimer);
          autoTypeTimer = null;
          autoTyping = false;
          setTimeout(() => {
            if (qteResolve) {
              const r = qteResolve; qteResolve = null;
              r(qteInput.trim().toLowerCase() === qteCommand.toLowerCase());
            }
          }, 300);
        }
      }, charDelay);
      return;
    }

    // Auto-select moves and items
    if (phase === 'select' && moveResolve && !autoSelectStarted) {
      autoSelectStarted = true;
      const plan = autoPlay.turns && autoPlay.turns[autoTurnIndex];
      autoTurnIndex++;

      if (plan && plan.type === 'item') {
        // Navigate right to bag then select item
        bagItems = getOwnedItems();
        const targetItem = bagItems.find(it => it.id === plan.itemId);
        if (targetItem) {
          selectMode = 'bag';
          bagItems = getOwnedItems();
          cursor = bagItems.findIndex(it => it.id === plan.itemId);
          if (cursor < 0) cursor = 0;
          bagScroll = Math.max(0, cursor - (logHeight - 2));
          setTimeout(() => {
            if (moveResolve && bagItems.length > 0) {
              const r = moveResolve; moveResolve = null;
              r({ type: 'item', item: bagItems[cursor] });
            }
          }, 800);
          return;
        }
      }

      // Default: pick a move with cursor animation
      const moveIdx = plan && plan.type === 'move' && typeof plan.moveIndex === 'number'
        ? plan.moveIndex % movesetA.length
        : autoTurnIndex % movesetA.length;

      // Set 2D cursor to target move
      cursorRow = Math.floor(moveIdx / 2);
      cursorCol = moveIdx % 2;
      cursor = moveIdx;

      // Animate cursor scrolling to target
      let scrollStep = 0;
      const scrollTimer = setInterval(() => {
        if (scrollStep >= moveIdx) {
          clearInterval(scrollTimer);
          setTimeout(() => {
            if (moveResolve) {
              const r = moveResolve; moveResolve = null;
              r({ type: 'move', move: movesetA[moveIdx] });
            }
          }, 400);
          return;
        }
        scrollStep++;
        cursorRow = Math.floor(scrollStep / 2);
        cursorCol = scrollStep % 2;
        cursor = scrollStep;
      }, 200);
      return;
    }
  }

  // ─── Key handler (stays active for the entire battle) ───
  function onKey(key) {
    if (key === '\x03') {
      if (autoTypeTimer) clearInterval(autoTypeTimer);
      cleanupAll();
      process.exit(0);
    }

    if (autoPlay) return; // ignore manual input in auto-play mode

    // Quick-time event input — typing characters
    if (phase === 'quicktime') {
      if (key === '\r' || key === '\n') {
        // Submit
        if (qteResolve) {
          const r = qteResolve; qteResolve = null;
          r(qteInput.trim().toLowerCase() === qteCommand.toLowerCase());
        }
      } else if (key === '\x7f' || key === '\b') {
        // Backspace
        qteInput = qteInput.slice(0, -1);
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        // Printable character
        qteInput += key;
      }
      return;
    }

    if (phase !== 'select') return;

    if (selectMode === 'moves') {
      if (key === '\x1b[A' || key === 'k') {
        if (movesetA.length > 0) cursor = (cursor - 1 + movesetA.length) % movesetA.length;
      } else if (key === '\x1b[B' || key === 'j') {
        if (movesetA.length > 0) cursor = (cursor + 1) % movesetA.length;
      } else if (key === '\x1b[C' || key === 'l' || key === 'd') {
        // Right → open bag (blocked if item used last turn)
        if (lastItemTurn > 0 && turnNum - lastItemTurn < 2) {
          addLog(`Bag on cooldown (1 turn)`, colors.dim);
        } else {
          bagItems = getOwnedItems();
          selectMode = 'bag';
          cursor = 0;
          bagScroll = 0;
        }
      } else if (key === '\r' || key === '\n' || key === ' ') {
        if (cursor < movesetA.length) {
          const move = movesetA[cursor];
          const myCooldowns = battleState[meSlot].cooldowns || {};
          if (myCooldowns[move.name] && myCooldowns[move.name] > 0) {
            // Move on cooldown — flash feedback but don't select
          } else if (moveResolve) {
            const r = moveResolve; moveResolve = null; r({ type: 'move', move });
          }
        }
      }
    } else if (selectMode === 'bag') {
      const bagVisible = logHeight - 1;
      if (key === '\x1b[A' || key === 'k') {
        if (bagItems.length > 0) cursor = (cursor - 1 + bagItems.length) % bagItems.length;
        if (cursor < bagScroll) bagScroll = cursor;
        if (cursor >= bagScroll + bagVisible) bagScroll = cursor - bagVisible + 1;
        if (cursor === bagItems.length - 1 && bagScroll === 0) bagScroll = Math.max(0, bagItems.length - bagVisible); // wrap to bottom
      } else if (key === '\x1b[B' || key === 'j') {
        if (bagItems.length > 0) cursor = (cursor + 1) % bagItems.length;
        if (cursor >= bagScroll + bagVisible) bagScroll = cursor - bagVisible + 1;
        if (cursor < bagScroll) bagScroll = cursor;
        if (cursor === 0) bagScroll = 0; // wrap to top
      } else if (key === '\r' || key === '\n' || key === ' ') {
        if (bagItems.length > 0 && cursor < bagItems.length) {
          if (moveResolve) { const r = moveResolve; moveResolve = null; r({ type: 'item', item: bagItems[cursor] }); }
        }
      } else if (key === '\x1b' || key === 'q' || key === '\x1b[D' || key === 'h' || key === 'a') {
        selectMode = 'moves';
        cursorRow = 0;
        cursorCol = 0;
      }
    }
  }
  stdin.on('data', onKey);

  // ─── Single render interval ───
  const renderLoop = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTickTime;
    lastTickTime = now;

    // Advance animation/idle timers BEFORE drawing
    if (phase === 'animating') {
      animElapsed += dt;
      const spacing = TURN_ANIM_MS / (animEvents.length || 1);
      while (animEventIdx < animEvents.length && animEventIdx * spacing <= animElapsed) {
        processAnimEvent(animEvents[animEventIdx]);
        animEventIdx++;
      }
    } else if (phase === 'idle') {
      idleElapsed += dt;
    }

    // Quick-time event timeout
    if (phase === 'quicktime' && qteResolve) {
      const elapsed = Date.now() - qteStartTime;
      if (elapsed >= QTE_TIME_MS) {
        const r = qteResolve; qteResolve = null;
        r(false); // timed out = failed
      }
    }

    // Turn timer — forfeit move when time runs out
    if (phase === 'select' && moveResolve) {
      const elapsed = (now - turnTimerStart) / 1000;
      if (elapsed >= TURN_TIMER_SECS) {
        addLog(`⏱ TIME'S UP — turn forfeited!`, colors.rose);
        // Forfeit animation effects
        glitch.screenTear(w, 3);
        floats.add(plyCenterX, plyCenterY - 3, 'FORFEIT', colors.rose, 18);
        p1HitFrames = 8;
        const r = moveResolve; moveResolve = null;
        r({ type: 'forfeit' });
      }
    }

    // Exclusion zones during selection
    if (phase === 'select' || phase === 'quicktime') {
      const uiZone = { x: logX, y: logY - 1, w: logW, h: logHeight + 2 };
      matrix.exclusionZone = uiZone;
      glitch.exclusionZone = uiZone;
      floats.exclusionZone = uiZone;
    } else {
      matrix.exclusionZone = null;
      glitch.exclusionZone = null;
      floats.exclusionZone = null;
    }

    // Draw base scene (always)
    drawSceneBase();

    // Phase-specific overlay
    if (phase === 'quicktime') {
      drawQuickTimeUI();
    } else if (phase === 'select') {
      drawMoveUI();
    } else if (phase === 'waiting') {
      drawWaitingUI();
    } else {
      drawBattleLog();
    }

    screen.render();

    // Auto-play driver — fires after render so UI updates are visible
    autoPlayTick();

    // Resolve phase promises AFTER render (so last frame is visible)
    if (phase === 'animating' && animElapsed >= TURN_ANIM_MS && animResolve) {
      const r = animResolve; animResolve = null; r();
    }
    if (phase === 'idle' && idleElapsed >= idleDuration && idleResolve) {
      const r = idleResolve; idleResolve = null; r();
    }
  }, FRAME_MS);

  // ─── Phase transition helpers ───
  function waitForMove() {
    return new Promise(resolve => {
      phase = 'select';
      cursor = 0;
      cursorRow = 0;
      cursorCol = 0;
      selectMode = 'moves';
      glitch.active = [];
      floats.items = [];
      turnTimerStart = Date.now();
      autoSelectStarted = false;
      moveResolve = resolve;
    });
  }

  function runAnimation(events) {
    return new Promise(resolve => {
      phase = 'animating';
      animEvents = events;
      animEventIdx = 0;
      animElapsed = 0;
      animResolve = resolve;
    });
  }

  function animateIdle(duration) {
    return new Promise(resolve => {
      phase = 'idle';
      idleElapsed = 0;
      idleDuration = duration;
      idleResolve = resolve;
    });
  }

  // Returns true if player succeeded, false if failed/timeout
  function runQuickTime(command) {
    return new Promise(resolve => {
      qteCommand = command;
      qteInput = '';
      qteStartTime = Date.now();
      phase = 'quicktime';
      autoQteStarted = false;
      autoTyping = false;
      qteResolve = resolve;
    });
  }

  function cleanupAll() {
    clearInterval(renderLoop);
    if (autoTypeTimer) clearInterval(autoTypeTimer);
    stdin.removeListener('data', onKey);
    try { stdin.setRawMode(false); } catch (e) {}
    try { stdin.pause(); } catch (e) {}
    screen.exit();
  }

  // ─── Main battle loop ───
  try {
    while (!isOver(battleState)) {
      turnNum++;
      addLog(`═══ Turn ${turnNum} ═══`, colors.gold);

      // Check if evolution expired (10 turns)
      if (evolved && turnNum - evolvedTurn >= EVOLVE_DURATION) {
        evolved = false;
        hackStreak = 0;
        addLog(`◇ Your evolution has expired!`, colors.rose);
        revertEvolution(battleState, meSlot);
        await animateIdle(1200);
      }
      if (oppEvolved && turnNum - oppEvolvedTurn >= EVOLVE_DURATION) {
        oppEvolved = false;
        oppHackStreak = 0;
        addLog(`◇ Opponent's evolution has expired!`, colors.dim);
        revertEvolution(battleState, isHost ? 'b' : 'a');
        await animateIdle(1200);
      }

      const myQuickHackPlan = !evolved ? getQuickHackPlan(turnNum, isOnline ? role : 'solo') : null;
      let myQuickHackSuccess = false;

      if (myQuickHackPlan) {
        const streakLabel = hackStreak > 0 ? ` (streak: ${hackStreak}/${EVOLVE_STREAK})` : '';
        addLog(`⚡ QUICK HACK${streakLabel} — type the command!`, colors.gold);
        const success = await runQuickTime(myQuickHackPlan.command);

        if (success) {
          const bonus = myQuickHackPlan.bonus;
          myQuickHackSuccess = true;
          hackStreak++;

          if (hackStreak >= EVOLVE_STREAK) {
            // ── EVOLUTION TRIGGERED ──
            evolved = true;
            evolvedTurn = turnNum;
            addLog(``, null);
            addLog(`◆◆◆ E V O L V E D ◆◆◆`, colors.gold);
            addLog(`3 consecutive hacks — all stats +18% for ${EVOLVE_DURATION} turns!`, colors.cyan);
            applyEvolution(battleState, meSlot);
            await animateIdle(2200);
          } else {
            addLog(`✓ ${bonus.name}: ${bonus.msg}`, bonus.color);
            addLog(`  Hack streak: ${hackStreak}/${EVOLVE_STREAK}`, colors.gold);
            applyQuickHackBonus(battleState, meSlot, bonus);
            await animateIdle(800);
          }
        } else {
          const hadStreak = hackStreak > 0;
          hackStreak = 0;
          addLog(`✗ Too slow — hack failed!`, colors.rose);
          if (hadStreak) addLog(`  Streak reset!`, colors.rose);
          floats.add(plyCenterX, plyCenterY - 3, 'MISS', colors.rose, 12);
          await animateIdle(600);
        }
      }

      // Player selects move or item
      const choice = await waitForMove();

      let myMove = null;
      let myItem = null;
      let forfeited = false;

      if (choice.type === 'forfeit') {
        forfeited = true;
        // Forfeit animation pause — let the effects play
        await animateIdle(1200);
      } else if (choice.type === 'item') {
        const item = choice.item;
        const consumed = useItem(item.id);
        if (consumed) {
          myItem = item;
          lastItemTurn = turnNum;
          addLog(`Used: ${item.name}`, colors.mint);
        }
        myMove = null; // item use consumes the turn — no attack
      } else {
        myMove = choice.move;
        const moveIcon = myMove.signature ? SIGNATURE_ICON : (CAT_ICONS[myMove.cat] || '·');
        addLog(`${moveIcon} You chose: ${myMove.label}`, colors.p1);
      }

      let opponentMove;
      let hostMove = null;
      let joinerMove = null;
      let oppItem = null;
      let opponentForfeited = false;
      let hostQteSuccess = false;
      let joinerQteSuccess = false;
      const relayTurnNum = turnNum - 1;
      if (isOnline) {
        addLog('Waiting for opponent...', colors.dim);
        phase = 'waiting';

        const moveName = forfeited ? '__FORFEIT__' : (myMove ? myMove.name : '__ITEM_ONLY__');
        const result = await submitAndWait(relayUrl, roomCode, role, moveName, relayTurnNum, myItem?.id, myQuickHackSuccess);
        hostMove = resolveSubmittedMove('host', result.hostMove);
        joinerMove = resolveSubmittedMove('joiner', result.joinerMove);
        opponentMove = role === 'host' ? joinerMove : hostMove;
        opponentForfeited = role === 'host'
          ? result.joinerMove === '__FORFEIT__'
          : result.hostMove === '__FORFEIT__';
        hostQteSuccess = !!result.hostQteSuccess;
        joinerQteSuccess = !!result.joinerQteSuccess;

        const oppItemId = role === 'host' ? result.joinerItem : result.hostItem;
        if (oppItemId) oppItem = ITEMS[oppItemId] || null;
      } else {
        opponentMove = movesetB[battleState.rng.int(0, movesetB.length - 1)];
        hostMove = isHost ? (forfeited ? null : myMove) : opponentMove;
        joinerMove = isHost ? opponentMove : (forfeited ? null : myMove);
        hostQteSuccess = !!myQuickHackSuccess;
      }

      if (opponentForfeited) addLog('Opponent forfeited turn', colors.rose);
      else {
        const oppIcon = opponentMove.signature ? SIGNATURE_ICON : (CAT_ICONS[opponentMove.cat] || '·');
        addLog(`${oppIcon} Opponent chose: ${opponentMove.label}`, colors.p2);
      }

      const hostQuickHackPlan = isOnline ? getQuickHackPlan(turnNum, 'host') : (isHost ? myQuickHackPlan : null);
      const joinerQuickHackPlan = isOnline ? getQuickHackPlan(turnNum, 'joiner') : (!isHost ? myQuickHackPlan : null);

      if (isOnline) {
        const opponentQuickHackPlan = role === 'host' ? joinerQuickHackPlan : hostQuickHackPlan;
        const opponentQuickHackSuccess = role === 'host' ? joinerQteSuccess : hostQteSuccess;
        const opponentSlot = role === 'host' ? 'b' : 'a';

        if (opponentQuickHackPlan && !oppEvolved) {
          if (opponentQuickHackSuccess) {
            oppHackStreak++;
            if (oppHackStreak >= EVOLVE_STREAK) {
              oppEvolved = true;
              oppEvolvedTurn = turnNum;
              addLog(`⚠ Opponent EVOLVED! All stats +18% for ${EVOLVE_DURATION} turns`, colors.rose);
              applyEvolution(battleState, opponentSlot);
              await animateIdle(1500);
            } else {
              addLog(`Opponent hack: ${opponentQuickHackPlan.bonus.name}`, opponentQuickHackPlan.bonus.color);
              applyQuickHackBonus(battleState, opponentSlot, opponentQuickHackPlan.bonus);
              await animateIdle(700);
            }
          } else {
            oppHackStreak = 0;
          }
        }
      }

      // Apply items in deterministic order: host first, then joiner
      const hostItem = isHost ? myItem : oppItem;
      const joinerItem = isHost ? oppItem : myItem;

      if (hostItem) {
        applyItemEffect(hostItem, battleState, 'a');
        const isSpecialA = hostItem.effect?.startsWith('special_');
        await animateIdle(isSpecialA ? 3800 : 900);
      }
      if (joinerItem) {
        applyItemEffect(joinerItem, battleState, 'b');
        const isSpecialB = joinerItem.effect?.startsWith('special_');
        await animateIdle(isSpecialB ? 3800 : 900);
      }

      let events = null;
      let stateSnapshot = null;

      if (isOnline && isHost) {
        events = processTurn(battleState, hostMove, joinerMove);
        tickBoosts(battleState);
        stateSnapshot = serializeBattleState(battleState);
        try {
          await publishTurnResolution(relayUrl, roomCode, relayTurnNum, {
            events,
            battleState: stateSnapshot,
          });
        } catch {}
      } else if (isOnline) {
        try {
          const resolved = await waitForTurnResolution(relayUrl, roomCode, relayTurnNum);
          if (resolved?.resolution) {
            events = Array.isArray(resolved.resolution.events) ? resolved.resolution.events : [];
            stateSnapshot = resolved.resolution.battleState || null;
          }
        } catch {}
      }

      if (!Array.isArray(events)) {
        events = processTurn(battleState, hostMove, joinerMove);
        tickBoosts(battleState);
        stateSnapshot = serializeBattleState(battleState);
      }

      await runAnimation(events);

      if (stateSnapshot) applyBattleStateSnapshot(battleState, stateSnapshot);
      syncDisplayHpFromState();
      await animateIdle(500);
    }

    // ── Victory ──
    const stateWinner = getWinner(battleState);
    const displayWinner = toDisplay(stateWinner);
    const winnerName = displayWinner === 'a' ? nameA : displayWinner === 'b' ? nameB : 'DRAW';
    addLog('', null);
    addLog(`═══ ${winnerName} WINS! ═══`, colors.gold);
    glitch.screenTear(w, 8);
    glitch.scatter(w / 2, h / 2, w, h, 25, 10);

    await animateIdle(autoPlay ? 2500 : 5000);

    if (isOnline) endBattle(relayUrl, roomCode);

    cleanupAll();
    screen.exit();
    return displayWinner;

  } catch (err) {
    cleanupAll();
    screen.exit();
    throw err;
  }

  // ═══════════════════════════════════════════════════════════════
  // DRAWING HELPERS (hoisted — available throughout the function)
  // ═══════════════════════════════════════════════════════════════

  function drawSceneBase() {
    screen.clear();
    frameCount = Math.floor((Date.now() - battleStartTime) / FRAME_MS);

    // Sparkle exclusion zones — keep particles away from UI elements
    sparkle.exclusionZones = [
      { x: plyX - 1, y: plyY - 1, w: 18, h: 14 },              // player sprite
      { x: oppX - 1, y: oppY - 1, w: 16, h: 12 },              // opponent sprite
      { x: oppBarX - 1, y: 1, w: barW + 12, h: 4 },            // opponent HP + timer bar
      { x: plyBarX - 1, y: plyBarY - 1, w: barW + 12, h: 4 },  // player HP bar
      { x: 0, y: logY - 1, w, h: logHeight + 2 },              // log / move UI
    ];

    sparkle.update();
    sparkle.draw(screen);
    glitch.update();
    floats.update();
    projectiles.update();
    if (specialEffect) {
      specialEffect.update(frameCount);
      if (specialEffect.done) specialEffect = null;
    }
    if (p1HitFrames > 0) p1HitFrames--;
    if (p2HitFrames > 0) p2HitFrames--;

    // Smooth HP
    targetHpA = Math.max(0, Math.min(targetHpA, fighterA.stats.maxHp));
    targetHpB = Math.max(0, Math.min(targetHpB, fighterB.stats.maxHp));
    hpA += (targetHpA - hpA) * 0.18;
    hpB += (targetHpB - hpB) * 0.18;
    if (Math.abs(hpA - targetHpA) < 2) hpA = targetHpA;
    if (Math.abs(hpB - targetHpB) < 2) hpB = targetHpB;
    hpA = Math.max(0, Math.min(hpA, fighterA.stats.maxHp));
    hpB = Math.max(0, Math.min(hpB, fighterB.stats.maxHp));

    // Title
    screen.centerText(0, '─'.repeat(w), colors.dimmer);
    screen.centerText(0, ' K E R N E L M O N', colors.cyan, null, true);
    screen.text(w - 12, 0, `Turn ${turnNum}`, colors.dim);

    // Turn timer — prominent countdown + shrinking bar on row 1
    if (phase === 'select' || phase === 'waiting') {
      const elapsed = (Date.now() - turnTimerStart) / 1000;
      const remaining = Math.max(0, Math.ceil(TURN_TIMER_SECS - elapsed));
      const ratio = Math.max(0, 1 - elapsed / TURN_TIMER_SECS);
      const timerColor = remaining <= 5 ? colors.rose : remaining <= 10 ? colors.peach : colors.cyan;

      // Countdown number
      const countStr = `⏱ ${String(remaining).padStart(2)}s`;
      screen.text(2, 1, countStr, timerColor, null, true);

      // Shrinking bar
      const timerBarW = Math.min(w - 12, 40);
      const timerBarX = 9;
      const filled = Math.round(timerBarW * ratio);
      for (let i = 0; i < timerBarW; i++) {
        if (i < filled) {
          screen.set(timerBarX + i, 1, '█', timerColor);
        } else {
          screen.set(timerBarX + i, 1, '░', colors.ghost);
        }
      }

      // Urgent flash effect in last 5 seconds
      if (remaining <= 5 && remaining > 0 && frameCount % 6 < 3) {
        screen.text(timerBarX + timerBarW + 1, 1, ' !! ', colors.rose, null, true);
      }
    }

    // Ground
    const groundY = plyY + 11;
    if (groundY < h - 8) screen.hline(0, groundY, w, '·', colors.ghost);

    // Fighters
    const sprA = fighterA.sprite;
    const sprB = fighterB.sprite;
    if (p1KO) sprA?.drawBackKO(screen, plyX, plyY);
    else if (p1HitFrames > 0) sprA?.drawBackHit(screen, plyX, plyY, frameCount);
    else sprA?.back.draw(screen, plyX, plyY, null, frameCount);

    if (p2KO) sprB?.drawFrontKO(screen, oppX, oppY);
    else if (p2HitFrames > 0) sprB?.drawFrontHit(screen, oppX, oppY, frameCount);
    else sprB?.front.draw(screen, oppX, oppY, null, frameCount);

    // ─── Evolution aura — ultraviolet/oxidized swirl with code flickers ───
    if (evolved || oppEvolved) {
      // Code fragments that flicker in the aura
      const codeGlyphs = [
        '0x', 'ff', '&&', '||', '>>', '<<', '::',  '//', '!=', '**',
        '~$', '#!', '%d', '0b', '=>', '{}', '[]', ';;', '++', '--',
      ];

      // Ultraviolet / oxidized color palette — cycles over time
      const auraColors = [
        rgb(140, 60, 220),   // deep violet
        rgb(180, 80, 255),   // bright ultraviolet
        rgb(100, 40, 180),   // dark purple
        rgb(80, 200, 180),   // oxidized teal
        rgb(60, 170, 160),   // verdigris
        rgb(100, 220, 200),  // bright patina
        rgb(160, 100, 240),  // lavender violet
        rgb(70, 190, 170),   // copper-green
        rgb(200, 120, 255),  // hot violet
        rgb(50, 160, 140),   // deep oxidized
      ];

      const drawAura = (cx, cy, isPlayer) => {
        const t = frameCount * 0.05;  // slow rotation
        const numParticles = 28;
        const rx = isPlayer ? 9 : 8;  // radius x (wider for back sprite)
        const ry = isPlayer ? 6 : 5;  // radius y (terminal chars are tall)

        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + t;
          // Two interleaved orbits spinning in opposite directions
          const orbit = i % 2 === 0 ? 1 : -1;
          const a = angle * orbit + (i % 3) * 0.3;
          // Wobble the radius for organic swirl
          const wobble = 1 + Math.sin(frameCount * 0.12 + i * 1.7) * 0.2;
          const px = cx + Math.round(Math.cos(a) * rx * wobble);
          const py = cy + Math.round(Math.sin(a) * ry * wobble * 0.5);

          if (px < 0 || px >= w || py < 1 || py >= h - 7) continue;

          // Color cycles through palette based on position + time
          const colorIdx = Math.floor((i * 3 + frameCount * 0.3) % auraColors.length);
          const color = auraColors[colorIdx];

          // Decide: code glyph or energy particle
          const glyphChance = (Math.sin(frameCount * 0.08 + i * 2.1) + 1) / 2;
          if (glyphChance > 0.65) {
            // Code flicker — brief glyph appearance
            const glyphIdx = (i + Math.floor(frameCount * 0.15)) % codeGlyphs.length;
            const glyph = codeGlyphs[glyphIdx];
            // Only show glyph for a few frames (flicker)
            const flickerPhase = Math.floor(frameCount * 0.2 + i * 0.7) % 5;
            if (flickerPhase < 2) {
              for (let c = 0; c < glyph.length && px + c < w; c++) {
                screen.set(px + c, py, glyph[c], color);
              }
            }
          } else {
            // Energy particle
            const energyChars = ['◈', '◆', '✦', '·', '∘', '⊹', '⋆'];
            const eIdx = (i + frameCount) % energyChars.length;
            // Fade particles that are "behind" the sprite (top/bottom)
            const distFromCenter = Math.abs(Math.sin(a));
            if (distFromCenter > 0.3) {
              screen.set(px, py, energyChars[eIdx], color);
            }
          }
        }

        // Inner glow — subtle shimmer close to the sprite
        const innerGlyphs = ['·', ':', '.', '`'];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 1.5;
          const ir = isPlayer ? 5 : 4;
          const px = cx + Math.round(Math.cos(a) * ir);
          const py = cy + Math.round(Math.sin(a) * ir * 0.4);
          if (px >= 0 && px < w && py >= 1 && py < h - 7) {
            const flicker = (frameCount + i * 3) % 4;
            if (flicker < 2) {
              const ic = auraColors[(i * 2 + Math.floor(frameCount * 0.5)) % auraColors.length];
              screen.set(px, py, innerGlyphs[i % innerGlyphs.length], ic);
            }
          }
        }
      };

      if (evolved) drawAura(plyCenterX, plyCenterY, true);
      if (oppEvolved) drawAura(oppCenterX, oppCenterY, false);
    }

    // Item ring effect — expanding green ring
    if (itemRing) {
      const elapsed = frameCount - itemRing.startFrame;
      if (elapsed >= itemRing.duration) {
        itemRing = null;
      } else {
        const t = elapsed / itemRing.duration;
        const { cx, cy } = itemRing;
        // Two concentric rings expanding outward
        const ringChars = ['◈', '○', '◦', '·'];
        for (let ring = 0; ring < 2; ring++) {
          const r = (t * 7) + ring * 2.5;
          const fade = Math.max(0, 1 - t - ring * 0.2);
          if (fade <= 0) continue;
          const segments = Math.floor(r * 4) + 8;
          const ringColor = fade > 0.6 ? colors.mint : fade > 0.3 ? rgb(80, 180, 120) : colors.ghost;
          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = cx + Math.round(Math.cos(angle) * r);
            const py = cy + Math.round(Math.sin(angle) * r * 0.4);
            if (px >= 0 && px < w && py >= 0 && py < h) {
              const ch = ringChars[Math.min(ring, ringChars.length - 1)];
              screen.set(px, py, ch, ringColor);
            }
          }
        }
      }
    }

    // Effects (after sprites, before HP bars)
    projectiles.draw(screen);
    glitch.draw(screen);
    floats.draw(screen);
    if (specialEffect) specialEffect.draw(screen, frameCount);

    // Opponent info
    const oppArch = fighterB.archetype?.name || '';
    screen.text(oppBarX, 2, nameB, colors.p2, null, true);
    if (oppEvolved) {
      const remaining = Math.max(0, EVOLVE_DURATION - (turnNum - oppEvolvedTurn));
      const pulse = frameCount % 12 < 6;
      screen.text(oppBarX + nameB.length + 1, 2, `◆EVOLVED (${remaining})◆`, pulse ? colors.rose : rgb(180, 60, 60), null, true);
    } else if (oppArch) {
      screen.text(oppBarX + nameB.length + 1, 2, oppArch, colors.dimmer);
    }
    const clampedHpB = Math.max(0, Math.min(hpB, fighterB.stats.maxHp));
    const ratioB = clampedHpB / fighterB.stats.maxHp;
    screen.bar(oppBarX, 3, barW, ratioB, hpColor(ratioB), colors.dimmer);
    screen.text(oppBarX + barW, 3, ` ${Math.round(clampedHpB)}/${fighterB.stats.maxHp}`, hpColor(ratioB));

    // Player info
    const plyArch = fighterA.archetype?.name || '';
    screen.text(plyBarX, plyBarY, nameA, colors.p1, null, true);
    if (evolved) {
      // Pulsing EVOLVED tag with remaining turns
      const remaining = Math.max(0, EVOLVE_DURATION - (turnNum - evolvedTurn));
      const pulse = frameCount % 12 < 6;
      screen.text(plyBarX + nameA.length + 1, plyBarY, `◆EVOLVED (${remaining})◆`, pulse ? colors.gold : rgb(180, 150, 60), null, true);
    } else if (hackStreak > 0) {
      // Show streak progress
      const streakDots = '◆'.repeat(hackStreak) + '◇'.repeat(EVOLVE_STREAK - hackStreak);
      screen.text(plyBarX + nameA.length + 1, plyBarY, streakDots, colors.gold);
    } else if (plyArch) {
      screen.text(plyBarX + nameA.length + 1, plyBarY, plyArch, colors.dimmer);
    }
    const clampedHpA = Math.max(0, Math.min(hpA, fighterA.stats.maxHp));
    const ratioA = clampedHpA / fighterA.stats.maxHp;
    screen.bar(plyBarX, plyBarY + 1, barW, ratioA, hpColor(ratioA), colors.dimmer);
    screen.text(plyBarX + barW, plyBarY + 1, ` ${Math.round(clampedHpA)}/${fighterA.stats.maxHp}`, hpColor(ratioA));

    // Log divider
    screen.hline(1, logY - 1, w - 2, '─', colors.dimmer);
    screen.text(3, logY - 1, ' BATTLE LOG ', colors.dim);
  }

  function drawBattleLog() {
    for (let i = 0; i < battleLog.length && i < logHeight; i++) {
      const entry = battleLog[i];
      const prefix = entry.text.startsWith('  ') ? '  ' : '› ';
      screen.text(logX, logY + i, prefix + entry.text.slice(0, logW - 4), entry.color || colors.dim);
    }
  }

  function drawMoveUI() {
    // Clear the log area
    for (let row = 0; row < logHeight; row++) {
      for (let x = logX; x < logX + logW; x++) {
        screen.set(x, logY + row, ' ');
      }
    }

    if (selectMode === 'moves') {
      screen.text(logX + 1, logY, '╸ SELECT YOUR MOVE ╺', colors.gold, null, true);

      const myCooldowns = battleState[meSlot].cooldowns || {};
      const oppArchetype = battleState[oppSlot].archetype;
      const labelW = Math.min(22, Math.floor(logW * 0.4));

      // Single-column list of all 6 moves
      for (let i = 0; i < movesetA.length; i++) {
        const m = movesetA[i];
        const y = logY + 1 + i;
        const selected = cursor === i;
        const onCooldown = myCooldowns[m.name] && myCooldowns[m.name] > 0;
        const cdText = onCooldown ? `[${myCooldowns[m.name]}]` : '';
        const isSig = m.signature;
        const icon = isSig ? SIGNATURE_ICON : (CAT_ICONS[m.cat] || '·');
        const baseColor = isSig ? SIGNATURE_COLOR : (CAT_COLORS[m.cat] || colors.dim);
        const dimColor = isSig ? SIGNATURE_ACCENT : colors.dimmer;

        if (onCooldown) {
          if (selected) screen.text(logX + 1, y, '▸', colors.dim, null, true);
          screen.text(logX + 3, y, icon, colors.dimmer);
          screen.text(logX + 5, y, m.label.slice(0, labelW).padEnd(labelW), colors.dimmer);
          screen.text(logX + 5 + labelW + 1, y, cdText, colors.rose);
        } else if (selected) {
          screen.text(logX + 1, y, '▸', colors.white, null, true);
          screen.text(logX + 3, y, icon, baseColor, null, true);
          screen.text(logX + 5, y, m.label.slice(0, labelW).padEnd(labelW), colors.white, null, true);
          screen.text(logX + 5 + labelW + 1, y, m.desc.slice(0, 20), baseColor);
          const catMult = getCategoryMultiplier(m.cat, oppArchetype);
          if (catMult > 1.0) screen.text(logX + 5 + labelW + 22, y, '!!', colors.mint, null, true);
          else if (catMult < 1.0) screen.text(logX + 5 + labelW + 22, y, '..', colors.rose);
        } else {
          screen.text(logX + 3, y, icon, dimColor);
          screen.text(logX + 5, y, m.label.slice(0, labelW).padEnd(labelW), isSig ? SIGNATURE_ACCENT : colors.dim);
        }
      }

      // BAG box in the center-right area
      const bagX = logX + Math.floor(logW / 2) + 2;
      const bagCenterY = logY + 3;
      const ownedCount = getOwnedItems().reduce((s, i) => s + i.count, 0);
      const bagOnCooldown = lastItemTurn > 0 && turnNum - lastItemTurn < 2;
      const bagColor = bagOnCooldown ? colors.dim : colors.mint;
      screen.text(bagX, bagCenterY - 1, '┌──────────┐', bagColor);
      screen.text(bagX, bagCenterY,     '│ ◰ BAG    │', bagColor);
      screen.text(bagX, bagCenterY + 1, `│ ${String(ownedCount).padStart(3)} items│`, bagOnCooldown ? colors.dimmer : colors.dim);
      screen.text(bagX, bagCenterY + 2, '└──────────┘', bagColor);
      if (bagOnCooldown) {
        screen.text(bagX + 1, bagCenterY + 3, 'COOLDOWN', colors.rose);
      } else {
        screen.text(bagX + 2, bagCenterY + 3, '▸ to open', colors.dimmer);
      }

    } else if (selectMode === 'bag') {
      screen.text(logX + 1, logY, '╸ USE AN ITEM ╺', colors.mint, null, true);
      screen.text(logX + logW - 10, logY, '◂ MOVES', colors.dim);

      if (bagItems.length === 0) {
        screen.text(logX + 3, logY + 1, 'Bag is empty! Win battles to earn items.', colors.dim);
      } else {
        const bagVisible = logHeight - 1;
        const hasAbove = bagScroll > 0;
        const hasBelow = bagScroll + bagVisible < bagItems.length;

        for (let vi = 0; vi < Math.min(bagVisible, bagItems.length); vi++) {
          const i = bagScroll + vi;
          if (i >= bagItems.length) break;
          const item = bagItems[i];
          const y = logY + 1 + vi;
          const selected = i === cursor;
          const rc = RARITY_COLORS[item.rarity] || colors.dim;

          if (selected) {
            screen.text(logX + 1, y, '▸', colors.white, null, true);
            screen.text(logX + 3, y, item.icon, rc, null, true);
            screen.text(logX + 5, y, `${item.name} x${item.count}`.padEnd(22), colors.white, null, true);
            screen.text(logX + 28, y, item.desc.slice(0, logW - 32), rc);
          } else {
            screen.text(logX + 3, y, item.icon, colors.dimmer);
            screen.text(logX + 5, y, `${item.name} x${item.count}`.padEnd(22), colors.dim);
            screen.text(logX + 28, y, item.desc.slice(0, logW - 32), colors.dimmer);
          }
        }

        // Scroll indicators
        if (hasAbove) screen.text(logX + logW - 3, logY + 1, '▲', colors.dim);
        if (hasBelow) screen.text(logX + logW - 3, logY + bagVisible, '▼', colors.dim);
      }
    }
  }

  function drawQuickTimeUI() {
    // Clear log area
    for (let row = 0; row < logHeight; row++) {
      for (let x = logX; x < logX + logW; x++) {
        screen.set(x, logY + row, ' ');
      }
    }

    const elapsed = (Date.now() - qteStartTime) / 1000;
    const remaining = Math.max(0, QTE_TIME_MS / 1000 - elapsed);
    const ratio = remaining / (QTE_TIME_MS / 1000);

    // Header with flashing alert
    const flash = frameCount % 6 < 3;
    screen.text(logX + 1, logY, flash ? '⚡ QUICK HACK!' : '  QUICK HACK!', colors.gold, null, true);

    // Timer bar
    const timerW = Math.min(20, logW - 30);
    const timerX = logX + 18;
    const timerColor = remaining <= 1 ? colors.rose : remaining <= 2 ? colors.peach : colors.gold;
    const filled = Math.round(timerW * ratio);
    for (let i = 0; i < timerW; i++) {
      screen.set(timerX + i, logY, i < filled ? '█' : '░', i < filled ? timerColor : colors.ghost);
    }
    screen.text(timerX + timerW + 1, logY, `${remaining.toFixed(1)}s`, timerColor);

    // Command to type
    screen.text(logX + 1, logY + 1, '$ ', colors.mint);
    screen.text(logX + 3, logY + 1, qteCommand, colors.white, null, true);

    // Input box
    screen.text(logX + 1, logY + 3, '> ', colors.cyan, null, true);
    // Show typed input with character-by-character color feedback
    for (let i = 0; i < qteInput.length; i++) {
      const correct = i < qteCommand.length && qteInput[i].toLowerCase() === qteCommand[i].toLowerCase();
      screen.set(logX + 3 + i, logY + 3, qteInput[i], correct ? colors.mint : colors.rose, null, true);
    }
    // Blinking cursor
    if (frameCount % 8 < 5) {
      screen.set(logX + 3 + qteInput.length, logY + 3, '▎', colors.cyan);
    }

    // Streak indicator + hint
    const streakDots = '◆'.repeat(hackStreak) + '◇'.repeat(EVOLVE_STREAK - hackStreak);
    const streakHint = hackStreak === EVOLVE_STREAK - 1
      ? `${streakDots}  NEXT = EVOLVE!`
      : `${streakDots}  ${hackStreak}/${EVOLVE_STREAK} to evolve`;
    const streakColor = hackStreak === EVOLVE_STREAK - 1 ? colors.gold : colors.dim;
    screen.text(logX + 1, logY + 5, `Type + ENTER  ${streakHint}`, streakColor);
  }

  function drawWaitingUI() {
    // Clear log area
    for (let row = 0; row < logHeight; row++) {
      for (let x = logX; x < logX + logW; x++) {
        screen.set(x, logY + row, ' ');
      }
    }
    screen.text(logX, logY, '› Waiting for opponent...', colors.dim);
    const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
    screen.text(logX, logY + 1, `  ${dots}`, colors.dimmer);
    // Show recent log below
    for (let i = 0; i < Math.min(battleLog.length, logHeight - 3); i++) {
      const entry = battleLog[battleLog.length - Math.min(battleLog.length, logHeight - 3) + i];
      if (entry) {
        const prefix = entry.text.startsWith('  ') ? '  ' : '› ';
        screen.text(logX, logY + 3 + i, prefix + entry.text.slice(0, logW - 4), entry.color || colors.dim);
      }
    }
  }

  function processAnimEvent(event) {
    if (event.type === 'attack') {
      const dWho = toDisplay(event.who);
      const dTarget = toDisplay(event.target);
      const isMe = dWho === 'a';

      const fromX = isMe ? plyCenterX + 6 : oppCenterX - 2;
      const fromY = isMe ? plyCenterY - 2 : oppCenterY + 2;
      const toX = isMe ? oppCenterX : plyCenterX + 2;
      const toY = isMe ? oppCenterY : plyCenterY;
      projectiles.fire(fromX, fromY, toX, toY, event.move);

      // Impact effects — delayed to match projectile travel time
      setTimeout(() => {
        if (dTarget === 'a') { targetHpA = isHost ? event.hpA : event.hpB; p1HitFrames = 10; }
        else { targetHpB = isHost ? event.hpB : event.hpA; p2HitFrames = 10; }
        const hitCX = dTarget === 'a' ? plyCenterX : oppCenterX;
        const hitCY = dTarget === 'a' ? plyCenterY : oppCenterY;

        // Burst size scales with damage
        const burstSize = event.isCrit ? 10 : Math.min(8, 4 + Math.floor(event.damage / 30));
        glitch.burst(hitCX, hitCY, burstSize, burstSize);

        // Damage number
        floats.add(
          hitCX - 2, hitCY - 3,
          event.isCrit ? `★${event.damage}` : `${event.damage}`,
          event.isCrit ? colors.crit : colors.damage, 18
        );

        // Crit: heavy screen tear + scatter debris
        if (event.isCrit) {
          glitch.screenTear(w, 5);
          glitch.scatter(hitCX, hitCY, 14, 8, 8, 6);
        }

        // Big hits (>50 damage): light screen tear
        if (event.damage > 50 && !event.isCrit) {
          glitch.screenTear(w, 2);
        }
      }, 1000);

      const whoLabel = isMe ? nameA : nameB;
      let logLine = `${whoLabel.slice(0, 14)} → ${event.label}`;
      if (event.isCrit) logLine += ' ★CRIT';
      logLine += ` [${event.damage}]`;
      addLog(logLine, event.isCrit ? colors.crit : (isMe ? colors.p1 : colors.p2));
      if (event.categoryEffect === 'super_effective') addLog('  Super effective!', colors.mint);
      else if (event.categoryEffect === 'not_effective') addLog('  Not very effective...', colors.rose);
      if (event.specialEffect === 'dot') addLog('  Inflicted damage over time!', colors.gold);
      if (event.specialEffect === 'harden') addLog('  Defense hardened!', colors.sky);
      if (event.resisted) addLog('  Thermal guard resisted the debuff', colors.mint);

    } else if (event.type === 'dodge') {
      const dWho = toDisplay(event.who);
      const whoLabel = dWho === 'a' ? nameA : nameB;
      addLog(`${whoLabel.slice(0, 14)} dodged ${event.label}!`, colors.sky);
      const cx = dWho === 'a' ? plyCenterX : oppCenterX;
      const cy = dWho === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(cx, cy, 'DODGE', colors.sky, 12);

    } else if (event.type === 'heal') {
      const dWho = toDisplay(event.who);
      const whoLabel = dWho === 'a' ? nameA : nameB;
      if (dWho === 'a') targetHpA = isHost ? event.hpA : event.hpB;
      else targetHpB = isHost ? event.hpB : event.hpA;
      addLog(`${whoLabel.slice(0, 14)} → ${event.label} [+${event.amount}]`, colors.mint);
      const cx = dWho === 'a' ? plyCenterX : oppCenterX;
      const cy = dWho === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(cx, cy, `+${event.amount}`, colors.mint, 14);

    } else if (event.type === 'stunned') {
      const dWho = toDisplay(event.who);
      const whoLabel = dWho === 'a' ? nameA : nameB;
      addLog(`${whoLabel.slice(0, 14)} is STUNNED`, colors.rose);
      const sx = dWho === 'a' ? plyCenterX : oppCenterX;
      const sy = dWho === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(sx, sy, 'STUNNED', colors.rose, 16);

    } else if (event.type === 'dot') {
      const dWho = toDisplay(event.who);
      const whoLabel = dWho === 'a' ? nameA : nameB;
      if (dWho === 'a') targetHpA = isHost ? event.hpA : event.hpB;
      else targetHpB = isHost ? event.hpB : event.hpA;
      addLog(`${whoLabel.slice(0, 14)} takes ${event.damage} burn damage`, colors.gold);
      const cx = dWho === 'a' ? plyCenterX : oppCenterX;
      const cy = dWho === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(cx, cy, `-${event.damage}`, colors.gold, 10);

    } else if (event.type === 'stall') {
      const dWho = toDisplay(event.who);
      const whoLabel = dWho === 'a' ? nameA : nameB;
      addLog(`${whoLabel.slice(0, 14)} stalled! (${event.passive})`, colors.rose);

    } else if (event.type === 'ko') {
      const dLoser = toDisplay(event.loser);
      const lCX = dLoser === 'a' ? plyCenterX : oppCenterX;
      const lCY = dLoser === 'a' ? plyCenterY : oppCenterY;
      if (dLoser === 'a') p1KO = true;
      else p2KO = true;
      // Dramatic KO — multiple screen tears + heavy scatter from the KO'd fighter
      glitch.screenTear(w, 8);
      glitch.scatter(lCX, lCY, 18, 12, 20, 10);
      floats.add(lCX - 1, lCY - 4, 'K.O.', colors.rose, 24);
      // Second wave after a beat
      setTimeout(() => {
        glitch.screenTear(w, 5);
        glitch.scatter(w / 2, h / 2, w, h, 12, 8);
      }, 400);
    }
  }
}

// ─── Battle intro sequence ───
async function battleIntro(screen, matrix, nameA, nameB, fighterA, fighterB, w, h) {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Phase 1: Matrix rain fills in (~0.75s)
  for (let i = 0; i < 15; i++) {
    screen.clear();
    matrix.update();
    matrix.draw(screen);
    const spread = Math.floor((i / 15) * (w / 2));
    for (let x = cx - spread; x <= cx + spread; x++) {
      if (x >= 0 && x < w) screen.set(x, cy, '─', colors.dimmer);
    }
    screen.render();
    await sleep(FRAME_MS);
  }

  // Phase 2: VS screen with callsigns (~1.25s)
  const phases = 25;
  for (let i = 0; i < phases; i++) {
    screen.clear();
    matrix.update();
    matrix.draw(screen);

    screen.hline(4, cy, w - 8, '═', colors.dimmer);

    const vsGlow = i % 10 < 5 ? colors.gold : colors.peach;
    screen.text(cx - 2, cy, ' VS ', vsGlow, null, true);

    const slideA = Math.min(i * 3, cx - 14);
    screen.text(Math.max(2, slideA), cy - 2, nameA, colors.p1, null, true);
    if (i > 6) {
      screen.text(Math.max(2, slideA), cy - 1, fighterA.gpu?.slice(0, 28) || '', colors.dim);
    }

    const slideB = Math.min(i * 3, cx - 14);
    const bx = Math.max(cx + 2, w - 2 - slideB - nameB.length);
    screen.text(bx, cy + 2, nameB, colors.p2, null, true);
    if (i > 6) {
      screen.text(bx, cy + 3, fighterB.gpu?.slice(0, 28) || '', colors.dim);
    }

    if (i > 10) {
      screen.text(2, cy - 3, '╔══', colors.p1);
      screen.text(w - 5, cy + 4, '══╝', colors.p2);
    }

    if (i > 16) {
      const dots = '.'.repeat((i % 4));
      screen.centerText(h - 3, `INITIALIZING BATTLE${dots}`, i % 6 < 3 ? colors.dim : colors.dimmer);
    }

    screen.render();
    await sleep(FRAME_MS);
  }

  // Phase 3: Flash and clear (0.5s)
  for (let i = 0; i < 10; i++) {
    screen.clear();
    if (i < 3) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        screen.hline(0, y, w, '█', i === 0 ? colors.white : colors.dim);
      }
    }
    // No rain in final frames — clean transition to battle
    screen.render();
    await sleep(FRAME_MS);
  }

  // Final blank frame — flush prev buffer so no intro artifacts carry over
  screen.clear();
  screen.render();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { renderTurnBattle };
