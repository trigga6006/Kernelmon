// Pokemon-style battle renderer
// Player: back view, bottom-left (foreground, larger)
// Opponent: front view, top-right (background, smaller)
// Projectiles travel between them on attack

const { Screen } = require('./screen');
const { colors, hpColor, RESET, BOLD, rgb } = require('./palette');
const { MatrixRain, CodeSparkle } = require('./effects/matrix');
const { GlitchEffect, FloatingText } = require('./effects/glitch');
const { ProjectileManager } = require('./effects/projectile');
const { createRNG } = require('./rng');
const { getSprite } = require('./sprites');
const { toneColor } = require('./benchmark');

const FPS = 20;
const FRAME_MS = 1000 / FPS;
const TOTAL_DURATION_MS = 60_000;
const INTRO_DURATION_MS = 5_000;
const OUTRO_DURATION_MS = 6_000;

async function renderBattle(fighterA, fighterB, events) {
  // Safety net: ensure both fighters have working sprites
  // (functions don't survive JSON serialization over the relay)
  for (const f of [fighterA, fighterB]) {
    if (!f.sprite || typeof f.sprite.back?.draw !== 'function') {
      f.sprite = f.specs ? getSprite(f.specs) : getSprite({ gpu: { model: '', vramMB: 0, vendor: '' }, cpu: { brand: '' }, storage: { type: 'SSD' } });
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

  // ─── Pokemon-style layout positions ───
  // Opponent: top-right area (smaller, "far away")
  const oppX = Math.floor(w * 0.62);
  const oppY = 2;
  const oppCenterX = oppX + 5;
  const oppCenterY = oppY + 4;

  // Player: bottom-left area (larger, "close up")
  const plyX = Math.floor(w * 0.08);
  const plyY = h - 22;  // positioned so fighter + stats + log all fit
  const plyCenterX = plyX + 7;
  const plyCenterY = plyY + 5;

  // Health bar positions — centered, stacked (matches turn-based layout)
  const barW = Math.min(24, Math.floor(w * 0.2));
  const oppBarX = Math.floor(w * 0.33);
  const oppBarY = oppY;
  const oppBarW = barW;

  const plyBarX = Math.floor(w * 0.28);
  const plyBarY = plyY + 8;
  const plyBarW = barW;

  // Battle log
  const logY = h - 7;
  const logHeight = 5;
  const logX = 3;
  const logW = w - 6;

  // ─── State ───
  let hpA = fighterA.stats.maxHp;
  let hpB = fighterB.stats.maxHp;
  let targetHpA = hpA;
  let targetHpB = hpB;
  const battleLog = [];
  let currentEventIdx = 0;
  let p1HitFrames = 0;
  let p2HitFrames = 0;
  let p1KO = false;
  let p2KO = false;
  let winner = null;
  let phase = 'intro';
  let frameCount = 0;
  let battleTransitionDone = false;
  let fightGlitchFired = false;

  // Pending events: events that fire after projectile lands
  const pendingImpacts = [];

  // Distribute battle events across the timeline
  const battleEvents = events.filter(e => e.type !== 'intro' && e.type !== 'victory');
  const battleDuration = TOTAL_DURATION_MS - INTRO_DURATION_MS - OUTRO_DURATION_MS;
  const eventSpacing = battleDuration / (battleEvents.length || 1);
  const eventTimings = battleEvents.map((e, i) => ({
    event: e,
    time: INTRO_DURATION_MS + i * eventSpacing,
  }));

  screen.enter();
  const startTime = Date.now();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      frameCount++;

      // Phase
      if (elapsed < INTRO_DURATION_MS) {
        phase = 'intro';
      } else if (elapsed > TOTAL_DURATION_MS - OUTRO_DURATION_MS && winner) {
        phase = 'outro';
      } else {
        phase = 'battle';
      }

      // Fire events — launch projectiles instead of instant damage
      while (currentEventIdx < eventTimings.length && eventTimings[currentEventIdx].time <= elapsed) {
        const { event } = eventTimings[currentEventIdx];
        launchEvent(event);
        currentEventIdx++;
      }

      // Process pending impacts (when projectiles land)
      processPendingImpacts();

      // Smooth HP
      hpA += (targetHpA - hpA) * 0.12;
      hpB += (targetHpB - hpB) * 0.12;
      if (Math.abs(hpA - targetHpA) < 1) hpA = targetHpA;
      if (Math.abs(hpB - targetHpB) < 1) hpB = targetHpB;

      if (p1HitFrames > 0) p1HitFrames--;
      if (p2HitFrames > 0) p2HitFrames--;

      // Update effects
      if (phase === 'intro') {
        matrix.update();
      } else {
        sparkle.exclusionZones = [
          { x: plyX - 1, y: plyY - 1, w: 18, h: 14 },
          { x: oppX - 1, y: oppY - 1, w: 16, h: 12 },
          { x: 1, y: oppBarY, w: oppBarW + 12, h: 3 },
          { x: plyBarX - 1, y: plyBarY - 1, w: plyBarW + 12, h: 5 },
          { x: 0, y: logY - 1, w, h: logHeight + 2 },
        ];
        sparkle.update();
      }
      glitch.update();
      floats.update();
      projectiles.update();

      // ─── DRAW ───
      screen.clear();

      if (phase === 'intro') {
        // Intro: matrix rain + intro overlay — no fighters, no UI
        matrix.draw(screen);
        drawIntro(screen, elapsed);
      } else {
        // Battle / Outro: sparkle BG + full scene
        sparkle.draw(screen);
        drawGround(screen);
        drawFighterSprites(screen);
        drawUI(screen, elapsed);
        drawLogPanel(screen);
        projectiles.draw(screen);
        glitch.draw(screen);
        floats.draw(screen);

        // Clean transition: clear lingering intro effects on first battle frame
        if (!battleTransitionDone && phase === 'battle') {
          battleTransitionDone = true;
          glitch.active = [];  // clear any leftover intro glitch particles
        }

        if (phase === 'outro') drawOutro(screen, elapsed);
      }

      screen.render();

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        setTimeout(() => {
          screen.exit();
          resolve(winner);
        }, 500);
      }
    }, FRAME_MS);
  });

  // ─── Event handling ───

  function launchEvent(event) {
    if (event.type === 'attack') {
      const isAAttacking = event.who === 'a';

      // Launch from attacker center to target center — using the ACTUAL MOVE NAME
      const fromX = isAAttacking ? plyCenterX + 6 : oppCenterX - 2;
      const fromY = isAAttacking ? plyCenterY - 2 : oppCenterY + 2;
      const toX = isAAttacking ? oppCenterX : plyCenterX + 2;
      const toY = isAAttacking ? oppCenterY : plyCenterY;

      projectiles.fire(fromX, fromY, toX, toY, event.move);

      // Queue the damage to apply when projectile lands
      pendingImpacts.push({
        event,
        framesUntilImpact: Math.ceil(1.0 / (projectiles.active[projectiles.active.length - 1]?.anim.speed || 0.07)),
      });

      // Add log immediately (you see the attack name as it fires)
      const whoLabel = isAAttacking ? fighterA.name : fighterB.name;
      let logLine = `${whoLabel.slice(0, 14)} → ${event.move}`;
      if (event.isCrit) logLine += ' ★CRIT';
      logLine += ` [${event.damage}]`;
      addLog(logLine, event.isCrit ? colors.crit : (isAAttacking ? colors.p1 : colors.p2));
      addLog(`  ${event.flavor}`, colors.dimmer);
      if (event.resisted) addLog('  Thermal guard resisted the debuff', colors.mint);

    } else if (event.type === 'condition') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      addLog(`${whoLabel.slice(0, 14)} ${event.label}: ${event.desc}`, toneColor(event.tone));

    } else if (event.type === 'dodge') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      addLog(`${whoLabel.slice(0, 14)} dodged ${event.move}!`, colors.sky);
      const dx = event.who === 'a' ? plyCenterX : oppCenterX;
      const dy = event.who === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(dx, dy, 'DODGE', colors.sky, 12);

    } else if (event.type === 'heal') {
      const who = event.who;
      const whoLabel = who === 'a' ? fighterA.name : fighterB.name;
      if (who === 'a') targetHpA = event.hpA;
      else targetHpB = event.hpB;
      addLog(`${whoLabel.slice(0, 14)} → ${event.move} [+${event.amount}]`, colors.mint);
      const hx = who === 'a' ? plyCenterX : oppCenterX;
      const hy = who === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(hx, hy, `+${event.amount}`, colors.mint, 14);

    } else if (event.type === 'stunned') {
      const whoLabel = event.who === 'a' ? fighterA.name : fighterB.name;
      addLog(`${whoLabel.slice(0, 14)} is STUNNED`, colors.rose);
      const sx = event.who === 'a' ? plyCenterX : oppCenterX;
      const sy = event.who === 'a' ? plyCenterY - 3 : oppCenterY - 2;
      floats.add(sx, sy, 'STUNNED', colors.rose, 12);

    } else if (event.type === 'ko') {
      winner = event.winner;
      if (event.loser === 'a') p1KO = true;
      else if (event.loser === 'b') p2KO = true;
      const winnerName = winner === 'a' ? fighterA.name : fighterB.name;
      addLog('', null);
      addLog(`═══ ${winnerName} WINS ═══`, colors.gold);
      glitch.screenTear(w, 8);
      glitch.screenTear(w, 6);
      glitch.scatter(w / 2, h / 2, w, h, 25, 10);
    }
  }

  function processPendingImpacts() {
    for (let i = pendingImpacts.length - 1; i >= 0; i--) {
      pendingImpacts[i].framesUntilImpact--;
      if (pendingImpacts[i].framesUntilImpact <= 0) {
        const { event } = pendingImpacts[i];
        applyDamage(event);
        pendingImpacts.splice(i, 1);
      }
    }
  }

  function applyDamage(event) {
    const isTargetA = event.target === 'a';
    if (isTargetA) {
      targetHpA = event.hpA;
      p1HitFrames = 6;
      glitch.burst(plyCenterX, plyCenterY, 7, 6);
      floats.add(plyCenterX - 2, plyCenterY - 4,
        event.isCrit ? `★${event.damage}` : `${event.damage}`,
        event.isCrit ? colors.crit : colors.damage, 14);
    } else {
      targetHpB = event.hpB;
      p2HitFrames = 6;
      glitch.burst(oppCenterX, oppCenterY, 6, 6);
      floats.add(oppCenterX - 2, oppCenterY - 3,
        event.isCrit ? `★${event.damage}` : `${event.damage}`,
        event.isCrit ? colors.crit : colors.damage, 14);
    }
    if (event.isCrit) {
      glitch.screenTear(w, 4);
    }
    if (event.specialEffect) {
      const tx = isTargetA ? plyCenterX : oppCenterX;
      const ty = isTargetA ? plyCenterY : oppCenterY;
      glitch.scatter(tx, ty, 12, 6, 12, 8);
    }
  }

  function addLog(text, color) {
    battleLog.push({ text, color });
    if (battleLog.length > logHeight) battleLog.shift();
  }

  // ─── Drawing ───

  function drawGround(screen) {
    // Subtle perspective ground lines
    const groundY = plyY + 11;
    if (groundY < h - 8) {
      screen.hline(0, groundY, w, '·', colors.ghost);
    }
    // Distant ground line near opponent
    const distGroundY = oppY + 9;
    if (distGroundY < h && distGroundY > 0) {
      screen.hline(Math.floor(w * 0.4), distGroundY, Math.floor(w * 0.5), '·', colors.ghost);
    }
  }

  function drawFighterSprites(screen) {
    const sprA = fighterA.sprite;
    const sprB = fighterB.sprite;

    // Player (bottom-left, back view) — uses hardware-matched sprite
    if (p1KO) {
      sprA ? sprA.drawBackKO(screen, plyX, plyY) : null;
    } else if (p1HitFrames > 0) {
      sprA ? sprA.drawBackHit(screen, plyX, plyY, frameCount) : null;
    } else {
      sprA ? sprA.back.draw(screen, plyX, plyY, null, frameCount) : null;
    }

    // Opponent (top-right, front view) — uses hardware-matched sprite
    if (p2KO) {
      sprB ? sprB.drawFrontKO(screen, oppX, oppY) : null;
    } else if (p2HitFrames > 0) {
      sprB ? sprB.drawFrontHit(screen, oppX, oppY, frameCount) : null;
    } else {
      sprB ? sprB.front.draw(screen, oppX, oppY, null, frameCount) : null;
    }
  }

  function drawUI(screen, elapsed) {
    // Title
    const title = ' K E R N E L M O N';
    screen.centerText(0, '─'.repeat(w), colors.dimmer);
    screen.centerText(0, title, colors.cyan, null, true);

    // Timer
    const timeLeft = Math.max(0, Math.ceil((TOTAL_DURATION_MS - elapsed) / 1000));
    const timerStr = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
    screen.text(w - 8, 0, timerStr, colors.dim);

    // ─── Opponent info (centered, above player — matches turn-based layout) ───
    const oppInfoY = 2;
    screen.text(oppBarX, oppInfoY, fighterB.name.slice(0, 24), colors.p2, null, true);
    const oppArch = fighterB.archetype?.name || '';
    if (oppArch) screen.text(oppBarX + Math.min(fighterB.name.length, 24) + 1, oppInfoY, oppArch, colors.dimmer);
    // HP bar
    const ratioB = Math.max(0, hpB / fighterB.stats.maxHp);
    screen.bar(oppBarX, oppInfoY + 1, oppBarW, ratioB, hpColor(ratioB), colors.dimmer);
    const hpTextB = ` ${Math.round(Math.max(0, hpB))}/${fighterB.stats.maxHp}`;
    screen.text(oppBarX + oppBarW, oppInfoY + 1, hpTextB, hpColor(ratioB));
    // Mini stats
    const bst = fighterB.stats;
    screen.text(oppBarX, oppInfoY + 2, `STR:${bst.str} MAG:${bst.mag} SPD:${bst.spd}`, colors.dimmer);

    // ─── Player info (centered, below opponent — matches turn-based layout) ───
    const plyInfoY = plyBarY;
    screen.text(plyBarX, plyInfoY, fighterA.name.slice(0, 24), colors.p1, null, true);
    const plyArch = fighterA.archetype?.name || '';
    if (plyArch) screen.text(plyBarX + Math.min(fighterA.name.length, 24) + 1, plyInfoY, plyArch, colors.dimmer);
    // HP bar
    const ratioA = Math.max(0, hpA / fighterA.stats.maxHp);
    screen.bar(plyBarX, plyInfoY + 1, plyBarW, ratioA, hpColor(ratioA), colors.dimmer);
    const hpTextA = ` ${Math.round(Math.max(0, hpA))}/${fighterA.stats.maxHp}`;
    screen.text(plyBarX + plyBarW, plyInfoY + 1, hpTextA, hpColor(ratioA));
    // Mini stats
    const ast = fighterA.stats;
    screen.text(plyBarX, plyInfoY + 2, `STR:${ast.str} MAG:${ast.mag} SPD:${ast.spd}`, colors.dimmer);
    // GPU
    screen.text(plyBarX, plyInfoY + 3, `GPU: ${fighterA.gpu.slice(0, 26)}`, colors.ghost);
  }

  function drawLogPanel(screen) {
    // Log box at bottom
    screen.hline(1, logY - 1, w - 2, '─', colors.dimmer);
    screen.text(3, logY - 1, ' BATTLE LOG ', colors.dim);
    screen.text(w - 22, h - 1, '─ kernelmon ─', colors.dimmer);

    for (let i = 0; i < battleLog.length && i < logHeight; i++) {
      const entry = battleLog[i];
      const y = logY + i;
      const prefix = entry.text.startsWith('  ') ? '  ' : '› ';
      screen.text(logX, y, prefix + entry.text.slice(0, logW - 4), entry.color || colors.dim);
    }
  }

  function drawIntro(screen, elapsed) {
    const progress = elapsed / INTRO_DURATION_MS;
    const cy = Math.floor(h / 2);

    // Clear a solid dark band behind intro text so matrix rain doesn't bleed through
    const bandTop = cy - 3;
    const bandBot = cy + 5;
    for (let y = bandTop; y <= bandBot && y < h; y++) {
      for (let x = 0; x < w; x++) {
        screen.set(x, y, ' ', null, null, false);
      }
    }

    // Title always visible
    const title = ' K E R N E L M O N';
    screen.centerText(0, '─'.repeat(w), colors.dimmer);
    screen.centerText(0, title, colors.cyan, null, true);

    if (progress < 0.30) {
      // Phase 1: Scanning hardware
      const dots = '.'.repeat(Math.floor((progress / 0.30) * 3) + 1);
      screen.centerText(cy, `SCANNING HARDWARE${dots}`, colors.cyan, null, true);
      if (progress > 0.1) {
        screen.centerText(cy + 2, fighterA.name, colors.p1);
        screen.centerText(cy + 3, 'vs', colors.dim);
        screen.centerText(cy + 4, fighterB.name, colors.p2);
      }
    } else if (progress < 0.55) {
      // Phase 2: Building fighters — stats reveal
      screen.centerText(cy - 2, 'BUILDING FIGHTERS...', colors.lavender, null, true);
      const sp = (progress - 0.30) / 0.25;
      if (sp > 0.2) screen.centerText(cy, `STR: ${fighterA.stats.str}  vs  ${fighterB.stats.str}`, colors.dim);
      if (sp > 0.4) screen.centerText(cy + 1, `MAG: ${fighterA.stats.mag}  vs  ${fighterB.stats.mag}`, colors.dim);
      if (sp > 0.6) screen.centerText(cy + 2, `SPD: ${fighterA.stats.spd}  vs  ${fighterB.stats.spd}`, colors.dim);
      if (sp > 0.8) screen.centerText(cy + 3, `HP:  ${fighterA.stats.hp}  vs  ${fighterB.stats.hp}`, colors.dim);
    } else if (progress < 0.82) {
      // Phase 3: FIGHT! — solid, no flicker
      screen.centerText(cy - 1, '╔═══════════════╗', colors.gold, null, true);
      screen.centerText(cy,     '║    F I G H T  ║', colors.gold, null, true);
      screen.centerText(cy + 1, '╚═══════════════╝', colors.gold, null, true);
      // Single glitch burst — fire exactly once
      if (!fightGlitchFired) {
        fightGlitchFired = true;
        glitch.scatter(w / 2, cy, w * 0.4, h * 0.3, 10, 6);
      }
    }
    // Phase 4 (0.82-1.0): blank beat — just the cleared band + matrix above/below

    // Glitch particles drawn on top
    glitch.draw(screen);
  }

  function drawOutro(screen, elapsed) {
    const outroStart = TOTAL_DURATION_MS - OUTRO_DURATION_MS;
    const outroProgress = (elapsed - outroStart) / OUTRO_DURATION_MS;

    if (winner && outroProgress > 0.15) {
      const winnerName = winner === 'a' ? fighterA.name : fighterB.name;
      const winnerColor = winner === 'a' ? colors.p1 : colors.p2;
      const cy = Math.floor(h / 2) - 2;

      const boxW = Math.max(winnerName.length + 10, 28);
      const boxX = Math.floor((w - boxW) / 2);
      screen.box(boxX, cy, boxW, 5, colors.gold);
      screen.centerText(cy + 1, '◆ WINNER ◆', colors.gold, null, true);
      screen.centerText(cy + 2, winnerName, winnerColor, null, true);

      if (frameCount % 5 === 0) {
        glitch.scatter(w / 2, cy + 1, w * 0.5, 6, 3, 6);
      }
    }
  }
}

module.exports = { renderBattle };
