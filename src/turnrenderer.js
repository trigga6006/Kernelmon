// ═══════════════════════════════════════════════════════════════
// TURN-BASED BATTLE RENDERER
// Loop: show move selection → submit → animate turn → repeat
// Reuses existing screen, sprites, effects, and projectile system
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, hpColor } = require('./palette');
const { MatrixRain } = require('./effects/matrix');
const { GlitchEffect, FloatingText } = require('./effects/glitch');
const { ProjectileManager } = require('./effects/projectile');
const { createRNG } = require('./rng');
const { getSprite } = require('./sprites');
const { selectMove } = require('./moveselect');
const { createBattleState, processTurn, isOver, getWinner } = require('./turnbattle');
const { submitAndWait, endBattle } = require('./turnrelay');

const FPS = 20;
const FRAME_MS = 1000 / FPS;
const TURN_ANIM_MS = 4000;  // 4 seconds to animate each turn's events

async function renderTurnBattle(fighterA, fighterB, movesetA, movesetB, options = {}) {
  const { role, roomCode, relayUrl, seed } = options;
  const isOnline = !!roomCode;

  // Ensure sprites
  for (const f of [fighterA, fighterB]) {
    if (!f.sprite || typeof f.sprite.back?.draw !== 'function') {
      f.sprite = f.specs ? getSprite(f.specs) : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
    }
  }

  const screen = new Screen();
  const rng = createRNG(99);
  const matrix = new MatrixRain(screen.width, screen.height, rng);
  const glitch = new GlitchEffect(rng);
  const floats = new FloatingText();
  const projectiles = new ProjectileManager(rng, screen.width, screen.height);

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
  const oppBarW = Math.min(24, Math.floor(w * 0.2));
  const plyBarX = Math.floor(w * 0.5);
  const plyBarY = plyY + 8;
  const plyBarW = Math.min(28, Math.floor(w * 0.25));
  const logY = h - 7;
  const logHeight = 5;
  const logX = 3;
  const logW = w - 6;

  // Battle state
  const battleState = createBattleState(fighterA, fighterB, seed || 42);
  let hpA = fighterA.stats.maxHp;
  let hpB = fighterB.stats.maxHp;
  let targetHpA = hpA;
  let targetHpB = hpB;
  const battleLog = [];
  let p1HitFrames = 0;
  let p2HitFrames = 0;
  let p1KO = false;
  let p2KO = false;
  let frameCount = 0;
  let turnNum = 0;

  function addLog(text, color) {
    battleLog.push({ text, color });
    if (battleLog.length > logHeight) battleLog.shift();
  }

  screen.enter();

  // ─── Main battle loop ───
  try {
    while (!isOver(battleState)) {
      turnNum++;
      addLog(`═══ Turn ${turnNum} ═══`, colors.gold);

      // Render the scene with move selection UI
      drawScene();

      // ── Player selects move ──
      const myMove = await selectMove(movesetA, screen, logX, logY, logW, logHeight);
      addLog(`You chose: ${myMove.label}`, colors.p1);

      let opponentMove;
      if (isOnline) {
        // Submit and wait for opponent
        drawScene(); // redraw without selection UI
        addLog('Waiting for opponent...', colors.dim);
        drawScene();

        const result = await submitAndWait(relayUrl, roomCode, role, myMove.name, turnNum - 1);
        const oppMoveName = role === 'host' ? result.joinerMove : result.hostMove;
        opponentMove = movesetB.find(m => m.name === oppMoveName) || movesetB[0];
      } else {
        // Demo/local: AI picks randomly (seeded)
        opponentMove = movesetB[battleState.rng.int(0, movesetB.length - 1)];
      }

      addLog(`Opponent chose: ${opponentMove.label}`, colors.p2);

      // ── Process turn ──
      const myMoveForEngine = role === 'joiner'
        ? { a: opponentMove, b: myMove }
        : { a: myMove, b: opponentMove };

      // In the engine, A is always the host perspective
      const events = processTurn(
        battleState,
        role === 'joiner' ? opponentMove : myMove,
        role === 'joiner' ? myMove : opponentMove
      );

      // ── Animate the turn events ──
      await animateTurnEvents(events);

      // Update HP targets from final event state
      const lastHpEvent = [...events].reverse().find(e => e.hpA !== undefined);
      if (lastHpEvent) {
        targetHpA = lastHpEvent.hpA;
        targetHpB = lastHpEvent.hpB;
      }

      // Small pause between turns
      await animateIdle(500);
    }

    // ── Victory ──
    const winner = getWinner(battleState);
    const winnerName = winner === 'a' ? fighterA.name : fighterB.name;
    addLog('', null);
    addLog(`═══ ${winnerName} WINS! ═══`, colors.gold);
    glitch.screenTear(w, 8);
    glitch.scatter(w / 2, h / 2, w, h, 25, 10);

    // Show victory for 5 seconds
    await animateIdle(5000);

    if (isOnline) endBattle(relayUrl, roomCode);

    screen.exit();
    return winner;

  } catch (err) {
    screen.exit();
    throw err;
  }

  // ─── Drawing helpers ───

  function drawScene() {
    screen.clear();
    matrix.draw(screen);

    // Title
    screen.centerText(0, '─'.repeat(w), colors.dimmer);
    screen.centerText(0, ' W O R K S T A T I O N   O F F ', colors.cyan, null, true);
    screen.text(w - 12, 0, `Turn ${turnNum}`, colors.dim);

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

    // Opponent info (top-left)
    screen.text(3, 2, fighterB.name.slice(0, 24), colors.p2, null, true);
    const ratioB = Math.max(0, hpB / fighterB.stats.maxHp);
    screen.bar(3, 3, oppBarW, ratioB, hpColor(ratioB), colors.dimmer);
    screen.text(3 + oppBarW, 3, ` ${Math.round(Math.max(0, hpB))}/${fighterB.stats.maxHp}`, hpColor(ratioB));

    // Player info (bottom-right)
    screen.text(plyBarX, plyBarY, fighterA.name.slice(0, 24), colors.p1, null, true);
    const ratioA = Math.max(0, hpA / fighterA.stats.maxHp);
    screen.bar(plyBarX, plyBarY + 1, plyBarW, ratioA, hpColor(ratioA), colors.dimmer);
    screen.text(plyBarX + plyBarW, plyBarY + 1, ` ${Math.round(Math.max(0, hpA))}/${fighterA.stats.maxHp}`, hpColor(ratioA));

    // Effects
    projectiles.draw(screen);
    glitch.draw(screen);
    floats.draw(screen);

    // Log
    screen.hline(1, logY - 1, w - 2, '─', colors.dimmer);
    screen.text(3, logY - 1, ' BATTLE LOG ', colors.dim);
    for (let i = 0; i < battleLog.length && i < logHeight; i++) {
      const entry = battleLog[i];
      const prefix = entry.text.startsWith('  ') ? '  ' : '› ';
      screen.text(logX, logY + i, prefix + entry.text.slice(0, logW - 4), entry.color || colors.dim);
    }

    screen.render();
  }

  // Animate a set of turn events over TURN_ANIM_MS
  function animateTurnEvents(events) {
    return new Promise((resolve) => {
      const eventSpacing = TURN_ANIM_MS / (events.length || 1);
      let eventIdx = 0;
      let elapsed = 0;

      const interval = setInterval(() => {
        frameCount++;
        elapsed += FRAME_MS;

        // Fire events on schedule
        while (eventIdx < events.length && eventIdx * eventSpacing <= elapsed) {
          processAnimEvent(events[eventIdx]);
          eventIdx++;
        }

        // Smooth HP
        hpA += (targetHpA - hpA) * 0.15;
        hpB += (targetHpB - hpB) * 0.15;
        if (Math.abs(hpA - targetHpA) < 1) hpA = targetHpA;
        if (Math.abs(hpB - targetHpB) < 1) hpB = targetHpB;

        if (p1HitFrames > 0) p1HitFrames--;
        if (p2HitFrames > 0) p2HitFrames--;

        matrix.update();
        glitch.update();
        floats.update();
        projectiles.update();

        drawScene();

        if (elapsed >= TURN_ANIM_MS) {
          clearInterval(interval);
          resolve();
        }
      }, FRAME_MS);
    });
  }

  function processAnimEvent(event) {
    if (event.type === 'attack') {
      const isA = event.who === 'a';
      const fromX = isA ? plyCenterX + 6 : oppCenterX - 2;
      const fromY = isA ? plyCenterY - 2 : oppCenterY + 2;
      const toX = isA ? oppCenterX : plyCenterX + 2;
      const toY = isA ? oppCenterY : plyCenterY;
      projectiles.fire(fromX, fromY, toX, toY, event.move);

      // Delayed damage
      setTimeout(() => {
        if (event.target === 'a') { targetHpA = event.hpA; p1HitFrames = 6; }
        else { targetHpB = event.hpB; p2HitFrames = 6; }
        glitch.burst(event.target === 'a' ? plyCenterX : oppCenterX, event.target === 'a' ? plyCenterY : oppCenterY, 6, 6);
        floats.add(
          (event.target === 'a' ? plyCenterX : oppCenterX) - 2,
          (event.target === 'a' ? plyCenterY : oppCenterY) - 3,
          event.isCrit ? `★${event.damage}` : `${event.damage}`,
          event.isCrit ? colors.crit : colors.damage, 14
        );
        if (event.isCrit) glitch.screenTear(w, 4);
      }, 800);

      const whoLabel = isA ? fighterA.name : fighterB.name;
      let logLine = `${whoLabel.slice(0, 14)} → ${event.label}`;
      if (event.isCrit) logLine += ' ★CRIT';
      logLine += ` [${event.damage}]`;
      addLog(logLine, event.isCrit ? colors.crit : (isA ? colors.p1 : colors.p2));
      addLog(`  ${event.flavor}`, colors.dimmer);

    } else if (event.type === 'dodge') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      addLog(`${whoLabel.slice(0, 14)} dodged ${event.label}!`, colors.sky);
      floats.add(event.who === 'a' ? plyCenterX : oppCenterX, event.who === 'a' ? plyCenterY - 3 : oppCenterY - 2, 'DODGE', colors.sky, 12);

    } else if (event.type === 'heal') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      if (event.who === 'a') targetHpA = event.hpA;
      else targetHpB = event.hpB;
      addLog(`${whoLabel.slice(0, 14)} → ${event.label} [+${event.amount}]`, colors.mint);
      floats.add(event.who === 'a' ? plyCenterX : oppCenterX, event.who === 'a' ? plyCenterY - 3 : oppCenterY - 2, `+${event.amount}`, colors.mint, 14);

    } else if (event.type === 'stunned') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      addLog(`${whoLabel.slice(0, 14)} is STUNNED`, colors.rose);

    } else if (event.type === 'ko') {
      if (event.loser === 'a') p1KO = true;
      else p2KO = true;
      glitch.screenTear(w, 8);
      glitch.scatter(w / 2, h / 2, w, h, 25, 10);
    }
  }

  // Run the render loop for a duration (idle animation)
  function animateIdle(durationMs) {
    return new Promise((resolve) => {
      let elapsed = 0;
      const interval = setInterval(() => {
        frameCount++;
        elapsed += FRAME_MS;
        matrix.update();
        glitch.update();
        floats.update();
        projectiles.update();
        if (p1HitFrames > 0) p1HitFrames--;
        if (p2HitFrames > 0) p2HitFrames--;
        hpA += (targetHpA - hpA) * 0.15;
        hpB += (targetHpB - hpB) * 0.15;
        drawScene();
        if (elapsed >= durationMs) { clearInterval(interval); resolve(); }
      }, FRAME_MS);
    });
  }
}

module.exports = { renderTurnBattle };
