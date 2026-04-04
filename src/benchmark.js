const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const si = require('systeminformation');

const { Screen } = require('./screen');
const { colors } = require('./palette');

const CONDITION_COLORS = {
  power: colors.peach,
  magic: colors.lavender,
  speed: colors.sky,
  heat: colors.mint,
  focus: colors.gold,
  risk: colors.rose,
};

const REFLEX_WORDS = ['sync', 'cache', 'sudo', 'stack', 'nvme', 'pulse', 'trace'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(min, max, ratio) {
  return min + (max - min) * ratio;
}

function scale(value, min, max) {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function scoreLog(value, min, max) {
  const safeValue = Math.max(value, min);
  return Math.round(scale(Math.log(safeValue), Math.log(min), Math.log(max)) * 100);
}

function scoreLinear(value, min, max) {
  return Math.round(scale(value, min, max) * 100);
}

function hrMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function percentText(value) {
  const absPct = Math.abs(value) * 100;
  if (absPct < 0.5) return '0%';
  const pct = absPct < 10 ? absPct.toFixed(1) : Math.round(absPct);
  return `${value >= 0 ? '+' : '-'}${pct}%`;
}

function multText(multiplier) {
  return `x${multiplier.toFixed(2)}`;
}

function initiativeText(value, turns) {
  if (!value) return 'neutral launch';
  return `${value >= 0 ? '+' : ''}${value} init / ${turns} turns`;
}

function toneColor(tone) {
  return CONDITION_COLORS[tone] || colors.dim;
}

function normalizeBenchmarkProfile(profile) {
  if (!profile || typeof profile !== 'object' || !profile.modifiers) return null;

  return {
    version: Number(profile.version) || 1,
    completedAt: Number(profile.completedAt) || Date.now(),
    tests: profile.tests && typeof profile.tests === 'object' ? profile.tests : {},
    modifiers: {
      initiativeBonus: Math.round(Number(profile.modifiers.initiativeBonus) || 0),
      initiativeTurns: clamp(Math.round(Number(profile.modifiers.initiativeTurns) || 0), 0, 5),
      cpuDamageMult: clamp(Number(profile.modifiers.cpuDamageMult) || 1, 0.75, 1.35),
      memoryDamageMult: clamp(Number(profile.modifiers.memoryDamageMult) || 1, 0.75, 1.35),
      thermalSkipMult: clamp(Number(profile.modifiers.thermalSkipMult) || 1, 0.5, 1.4),
      thermalStatusResist: clamp(Number(profile.modifiers.thermalStatusResist) || 0, 0, 0.6),
      focusCritBonus: clamp(Number(profile.modifiers.focusCritBonus) || 0, -0.03, 0.08),
      focusDodgeBonus: clamp(Number(profile.modifiers.focusDodgeBonus) || 0, -0.03, 0.08),
    },
    conditions: Array.isArray(profile.conditions)
      ? profile.conditions
        .filter(Boolean)
        .map(cond => ({
          label: String(cond.label || '').slice(0, 20),
          short: String(cond.short || '').slice(0, 42),
          desc: String(cond.desc || '').slice(0, 120),
          tone: cond.tone || 'speed',
        }))
      : [],
  };
}

function applyBenchmarkProfile(fighter, profile) {
  fighter.benchmark = normalizeBenchmarkProfile(profile);
  return fighter.benchmark;
}

function getBenchmarkSummaryLines(profile, maxLines = 3) {
  const normalized = normalizeBenchmarkProfile(profile);
  if (!normalized || normalized.conditions.length === 0) {
    return [{ text: 'No live benchmark conditions', color: colors.dimmer }];
  }

  return normalized.conditions.slice(0, maxLines).map(condition => ({
    text: `${condition.label}: ${condition.short}`,
    color: toneColor(condition.tone),
  }));
}

function getBenchmarkLogEntries(fighter, maxLines = 2) {
  if (!fighter?.benchmark) return [];
  return getBenchmarkSummaryLines(fighter.benchmark, maxLines).map(entry => ({
    text: `${fighter.name.slice(0, 12)} ${entry.text}`,
    color: entry.color,
  }));
}

function getBenchmarkConditionEvents(fighter, who, maxLines = 2) {
  const normalized = normalizeBenchmarkProfile(fighter?.benchmark);
  if (!normalized) return [];
  return normalized.conditions.slice(0, maxLines).map(condition => ({
    type: 'condition',
    who,
    label: condition.label,
    desc: condition.short,
    tone: condition.tone,
  }));
}

function getBenchmarkCombatModifiers(profile, turn, move) {
  const normalized = normalizeBenchmarkProfile(profile);
  if (!normalized) {
    return {
      damageMult: 1,
      critBonus: 0,
      dodgeBonus: 0,
      skipChanceMult: 1,
      statusResist: 0,
      initiativeBonus: 0,
    };
  }

  const base = move?.base || '';
  const altBase = move?.altBase || '';
  const usesStr = base === 'str' || altBase === 'str';
  const usesMag = base === 'mag' || altBase === 'mag';
  const initiativeBonus = turn <= normalized.modifiers.initiativeTurns
    ? normalized.modifiers.initiativeBonus
    : 0;

  return {
    damageMult:
      (usesStr ? normalized.modifiers.cpuDamageMult : 1) *
      (usesMag ? normalized.modifiers.memoryDamageMult : 1),
    critBonus: normalized.modifiers.focusCritBonus,
    dodgeBonus: normalized.modifiers.focusDodgeBonus,
    skipChanceMult: normalized.modifiers.thermalSkipMult,
    statusResist: normalized.modifiers.thermalStatusResist,
    initiativeBonus,
  };
}

function measureCpuBurst(durationMs = 80) {
  const start = hrMs();
  let sample = 0x9e3779b9;
  let ops = 0;

  while (hrMs() - start < durationMs) {
    sample ^= sample << 13;
    sample ^= sample >>> 17;
    sample ^= sample << 5;
    sample = Math.imul(sample ^ 0xa5a5a5a5, 2654435761);
    sample ^= sample >>> 11;
    sample = Math.imul(sample, 1597334677);
    ops += 8;
  }

  const elapsedMs = Math.max(1, hrMs() - start);
  const opsPerMs = ops / elapsedMs;
  return {
    raw: opsPerMs,
    score: scoreLog(opsPerMs, 15000, 300000),
    label: `${Math.round(opsPerMs).toLocaleString()} ops/ms`,
  };
}

function measureMemoryThroughput(sizeMB = 4, passes = 2) {
  const totalInts = Math.floor((sizeMB * 1024 * 1024) / 4);
  const data = new Uint32Array(totalInts);
  let checksum = 0;
  const start = hrMs();

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < data.length; i++) {
      const next = (i * 2654435761 + pass * 97) >>> 0;
      data[i] = next;
      checksum ^= next;
    }
    for (let i = 0; i < data.length; i++) {
      checksum ^= data[i];
    }
  }

  const elapsedSec = Math.max(0.001, (hrMs() - start) / 1000);
  const movedMB = sizeMB * passes * 2;
  const mbPerSec = movedMB / elapsedSec;

  return {
    raw: mbPerSec,
    score: scoreLog(mbPerSec, 150, 7000),
    label: `${Math.round(mbPerSec).toLocaleString()} MB/s`,
    checksum,
  };
}

function measureStorageSpeed(sizeKB = 128) {
  const tempPath = path.join(os.tmpdir(), `kernelmon-bench-${process.pid}-${Date.now()}.bin`);
  const bytes = sizeKB * 1024;
  const buffer = Buffer.alloc(bytes, 0x6b);

  try {
    const writeStart = hrMs();
    fs.writeFileSync(tempPath, buffer);
    const writeMs = Math.max(0.1, hrMs() - writeStart);

    const readStart = hrMs();
    fs.readFileSync(tempPath);
    const readMs = Math.max(0.1, hrMs() - readStart);

    const mb = bytes / (1024 * 1024);
    const writeMbps = mb / (writeMs / 1000);
    const readMbps = mb / (readMs / 1000);
    const combined = (writeMbps + readMbps) / 2;

    return {
      raw: combined,
      score: scoreLog(combined, 20, 2500),
      label: `${Math.round(combined).toLocaleString()} MB/s`,
      writeMbps,
      readMbps,
    };
  } catch {
    return {
      raw: 60,
      score: 35,
      label: 'temp fs fallback',
      writeMbps: 60,
      readMbps: 60,
    };
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
}

async function measureThermals() {
  try {
    const thermal = await si.cpuTemperature();
    const celsius = [thermal.main, thermal.max]
      .filter(value => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)[0];

    if (!celsius) {
      return { raw: null, score: null, label: 'sensor unavailable', unavailable: true };
    }

    return {
      raw: celsius,
      score: scoreLinear(88 - celsius, 3, 38),
      label: `${Math.round(celsius)}C`,
    };
  } catch {
    return { raw: null, score: null, label: 'sensor unavailable', unavailable: true };
  }
}

function buildCondition(testKey, modifiers) {
  switch (testKey) {
    case 'storage':
      if (modifiers.initiativeBonus >= 0) {
        return {
          label: 'BOOT VECTOR',
          short: initiativeText(modifiers.initiativeBonus, modifiers.initiativeTurns),
          desc: 'Fast launch latency converts into opening-turn initiative.',
          tone: 'speed',
        };
      }
      return {
        label: 'COLD BOOT',
        short: initiativeText(modifiers.initiativeBonus, modifiers.initiativeTurns),
        desc: 'Slow storage warmup leaves the rig reacting late out of the gate.',
        tone: 'risk',
      };

    case 'thermal':
      if (modifiers.thermalUnavailable) {
        return {
          label: 'THERMAL UNKNOWN',
          short: 'no heat modifier',
          desc: 'Thermal sensors were unavailable, so this fight stays thermally neutral.',
          tone: 'speed',
        };
      }
      if (modifiers.thermalSkipMult <= 1) {
        return {
          label: 'HEAT SINK',
          short: `stall ${multText(modifiers.thermalSkipMult)} | resist ${percentText(modifiers.thermalStatusResist)}`,
          desc: 'Stable thermals lower self-stall risk and shrug off thermal debuffs.',
          tone: 'heat',
        };
      }
      return {
        label: 'HOT CHASSIS',
        short: `stall ${multText(modifiers.thermalSkipMult)}`,
        desc: 'The chassis is already warm, so burst phases are more likely to wobble.',
        tone: 'risk',
      };

    case 'memory':
      if (modifiers.memoryDamageMult >= 1) {
        return {
          label: 'CACHE RESONANCE',
          short: `MAG ${multText(modifiers.memoryDamageMult)}`,
          desc: 'Healthy memory throughput lifts special attack scaling.',
          tone: 'magic',
        };
      }
      return {
        label: 'LEAKY BUS',
        short: `MAG ${multText(modifiers.memoryDamageMult)}`,
        desc: 'Thin memory throughput drags down special attack conversion.',
        tone: 'risk',
      };

    case 'cpu':
      if (modifiers.cpuDamageMult >= 1) {
        return {
          label: 'BURST PIPELINE',
          short: `STR ${multText(modifiers.cpuDamageMult)}`,
          desc: 'Short CPU burst headroom pushes physical attack output higher.',
          tone: 'power',
        };
      }
      return {
        label: 'THROTTLED TURBO',
        short: `STR ${multText(modifiers.cpuDamageMult)}`,
        desc: 'The burst pass came in soft, so physical attack scaling slips.',
        tone: 'risk',
      };

    case 'reflex':
    default:
      if (modifiers.focusCritBonus >= 0 || modifiers.focusDodgeBonus >= 0) {
        return {
          label: 'FOCUS LOCK',
          short: `crit ${percentText(modifiers.focusCritBonus)} | dodge ${percentText(modifiers.focusDodgeBonus)}`,
          desc: 'Clean operator timing sharpens crit windows and evasive reads.',
          tone: 'focus',
        };
      }
      return {
        label: 'INPUT LAG',
        short: `crit ${percentText(modifiers.focusCritBonus)} | dodge ${percentText(modifiers.focusDodgeBonus)}`,
        desc: 'A sloppy input trial leaves the pilot a beat behind.',
        tone: 'risk',
      };
  }
}

function buildBenchmarkProfile(results) {
  const cpuRatio = scale(results.cpu.score, 0, 100);
  const memoryRatio = scale(results.memory.score, 0, 100);
  const storageRatio = scale(results.storage.score, 0, 100);
  const thermalAvailable = !results.thermal?.unavailable && typeof results.thermal?.score === 'number';
  const thermalRatio = thermalAvailable ? scale(results.thermal.score, 0, 100) : 0.5;
  const reflexRatio = scale(results.reflex.score, 0, 100);
  const reflexMiss = results.reflex?.matched === false;

  const modifiers = {
    initiativeBonus: Math.round(lerp(-4, 10, storageRatio * 0.7 + reflexRatio * 0.3)),
    initiativeTurns: 2,
    cpuDamageMult: Number(lerp(0.93, 1.15, cpuRatio).toFixed(3)),
    memoryDamageMult: Number(lerp(0.93, 1.15, memoryRatio).toFixed(3)),
    thermalSkipMult: thermalAvailable ? Number(lerp(1.18, 0.64, thermalRatio).toFixed(3)) : 1,
    thermalStatusResist: thermalAvailable ? Number(lerp(0.02, 0.42, thermalRatio).toFixed(3)) : 0,
    thermalUnavailable: !thermalAvailable,
    focusCritBonus: reflexMiss ? -0.02 : Number(lerp(-0.02, 0.05, reflexRatio).toFixed(3)),
    focusDodgeBonus: reflexMiss ? -0.02 : Number(lerp(-0.02, 0.04, reflexRatio).toFixed(3)),
  };

  return normalizeBenchmarkProfile({
    version: 1,
    completedAt: Date.now(),
    tests: results,
    modifiers,
    conditions: [
      buildCondition('storage', modifiers),
      buildCondition('thermal', modifiers),
      buildCondition('memory', modifiers),
      buildCondition('cpu', modifiers),
      buildCondition('reflex', modifiers),
    ],
  });
}

function renderFrame(screen, fighter, opponent, title, subtitle, results, activeKey, footerLines = []) {
  const w = screen.width;
  screen.clear();
  screen.centerText(0, '─'.repeat(w), colors.dimmer);
  screen.centerText(0, ` ${title} `, colors.gold, null, true);
  if (subtitle) screen.centerText(1, subtitle.slice(0, w - 4), colors.dim);

  const leftX = 4;
  const rightX = Math.floor(w / 2) + 2;

  screen.text(leftX, 3, 'YOUR RIG', colors.p1, null, true);
  screen.text(leftX, 4, fighter.name.slice(0, 28), colors.white);
  screen.text(leftX, 5, `GPU: ${(fighter.gpu || 'Integrated').slice(0, 26)}`, colors.dim);
  screen.text(leftX, 6, `STR:${fighter.stats.str} MAG:${fighter.stats.mag} SPD:${fighter.stats.spd}`, colors.dim);

  screen.text(rightX, 3, opponent ? 'TARGET' : 'TRANSITION', opponent ? colors.p2 : colors.sky, null, true);
  screen.text(rightX, 4, opponent ? (opponent.name || 'Unknown').slice(0, 28) : 'Bench before the battle spike', colors.white);
  screen.text(rightX, 5, opponent ? `GPU: ${(opponent.gpu || '?').slice(0, 26)}` : 'Run a lightweight systems pass', colors.dim);
  screen.text(rightX, 6, opponent
    ? `STR:${opponent.stats.str} MAG:${opponent.stats.mag} SPD:${opponent.stats.spd}`
    : 'Convert it into live combat conditions', colors.dim);

  screen.hline(2, 8, w - 4, '─', colors.dimmer);
  screen.text(4, 9, 'LIVE BENCHMARKS', colors.cyan, null, true);

  const rows = [
    ['cpu', 'CPU BURST'],
    ['memory', 'MEMORY BUS'],
    ['storage', 'STORAGE SPRINT'],
    ['thermal', 'THERMAL FLOOR'],
    ['reflex', 'INPUT CHECK'],
  ];

  rows.forEach(([key, label], index) => {
    const y = 11 + index * 2;
    const result = results[key];
    const selected = key === activeKey;
    screen.text(5, y, selected ? '▶' : '·', selected ? colors.gold : colors.dimmer, null, selected);
    screen.text(8, y, label.padEnd(18), result ? colors.white : colors.dim, null, !!result);
    if (result) {
      screen.text(28, y, String(result.label || '').slice(0, 20), toneColor(activeKey === key ? 'focus' : 'speed'));
      screen.bar(50, y, Math.min(16, w - 56), (result.score || 0) / 100, colors.mint, colors.ghost);
      screen.text(50 + Math.min(16, w - 56) + 1, y, `${String(result.score).padStart(3)}%`, colors.dim);
    } else if (selected) {
      screen.text(28, y, 'sampling...', colors.gold);
    } else {
      screen.text(28, y, 'waiting', colors.dimmer);
    }
  });

  screen.text(rightX, 10, 'CONDITIONS', colors.gold, null, true);
  const profile = buildBenchmarkProfile({
    cpu: results.cpu || { score: 50, label: 'pending' },
    memory: results.memory || { score: 50, label: 'pending' },
    storage: results.storage || { score: 50, label: 'pending' },
    thermal: results.thermal || { score: 50, label: 'pending' },
    reflex: results.reflex || { score: 50, label: 'pending' },
  });
  const summary = getBenchmarkSummaryLines(profile, 5);
  summary.forEach((line, index) => {
    screen.text(rightX, 12 + index * 2, line.text.slice(0, w - rightX - 4), line.color);
  });

  footerLines.forEach((line, index) => {
    screen.text(4, screen.height - 3 + index, line.slice(0, w - 8), colors.dimmer);
  });

  screen.render();
}

async function captureReflexTrial(screen, fighter, opponent, results, stdin) {
  const cue = REFLEX_WORDS[Math.floor(Math.random() * REFLEX_WORDS.length)];

  renderFrame(
    screen,
    fighter,
    opponent,
    'BENCH TO BATTLE',
    'Stand by for the operator input test.',
    results,
    'reflex',
    ['Wait for the cue, type the word, then press Enter.']
  );
  await sleep(900 + Math.floor(Math.random() * 900));

  let input = '';
  const start = Date.now();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => finish(false), 4000);

    function finish(success) {
      clearTimeout(timeout);
      stdin.removeListener('data', onKey);
      const elapsed = Date.now() - start;
      const cleanInput = input.trim().toLowerCase();
      const matched = success && cleanInput === cue;
      const reactionScore = matched ? scoreLinear(2300 - elapsed, 200, 1800) : 15;
      resolve({
        raw: elapsed,
        score: reactionScore,
        label: matched ? `${elapsed} ms` : 'missed cue',
        matched,
        input: cleanInput,
        cue,
      });
    }

    function onKey(key) {
      if (key === '\x03') {
        finish(false);
        return;
      }

      if (key === '\r' || key === '\n') {
        finish(true);
        return;
      }

      if (key === '\x7f' || key === '\b') {
        input = input.slice(0, -1);
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        input += key;
      }

      screen.clear();
      renderFrame(
        screen,
        fighter,
        opponent,
        'BENCH TO BATTLE',
        'Operator input test in progress.',
        results,
        'reflex',
        [`Cue: ${cue}`, `Typed: ${input}`]
      );
      screen.text(4, screen.height - 5, 'TYPE NOW', colors.gold, null, true);
      screen.render();
    }

    screen.clear();
    renderFrame(
      screen,
      fighter,
      opponent,
      'BENCH TO BATTLE',
      'Type the cue and hit Enter.',
      results,
      'reflex',
      [`Cue: ${cue}`]
    );
    screen.text(4, screen.height - 5, cue.toUpperCase(), colors.white, null, true);
    screen.render();

    stdin.on('data', onKey);
  });
}

async function runBenchmarkSequence(screen, fighter, opponent, stdin) {
  const results = {};

  const steps = [
    {
      key: 'cpu',
      subtitle: 'Sampling burst math throughput.',
      run: () => measureCpuBurst(),
    },
    {
      key: 'memory',
      subtitle: 'Sweeping memory lanes for throughput.',
      run: () => measureMemoryThroughput(),
    },
    {
      key: 'storage',
      subtitle: 'Touching temp storage for launch latency.',
      run: () => measureStorageSpeed(),
    },
    {
      key: 'thermal',
      subtitle: 'Reading thermal floor and stability.',
      run: () => measureThermals(),
    },
  ];

  for (const step of steps) {
    renderFrame(screen, fighter, opponent, 'BENCH TO BATTLE', step.subtitle, results, step.key, ['Please wait...']);
    await sleep(120);
    results[step.key] = await step.run();
    renderFrame(screen, fighter, opponent, 'BENCH TO BATTLE', `${step.key.toUpperCase()} locked in.`, results, step.key);
    await sleep(220);
  }

  results.reflex = await captureReflexTrial(screen, fighter, opponent, results, stdin);
  renderFrame(screen, fighter, opponent, 'BENCH TO BATTLE', 'Conditions compiled.', results, 'reflex', ['Press Enter to deploy these live conditions.']);

  await new Promise((resolve) => {
    function onKey(key) {
      if (key === '\r' || key === '\n' || key === ' ') {
        stdin.removeListener('data', onKey);
        resolve();
      } else if (key === '\x03') {
        stdin.removeListener('data', onKey);
        resolve();
      }
    }
    stdin.on('data', onKey);
  });

  return buildBenchmarkProfile(results);
}

function showGate(screen, fighter, opponent, cursor, profile) {
  const w = screen.width;
  screen.clear();
  screen.centerText(0, '─'.repeat(w), colors.dimmer);
  screen.centerText(0, ' B E N C H   T O   B A T T L E ', colors.gold, null, true);
  screen.centerText(1, 'Optional live system pass before the battle starts.', colors.dim);

  const leftX = 4;
  const rightX = Math.floor(w / 2) + 2;

  screen.text(leftX, 4, 'YOUR RIG', colors.p1, null, true);
  screen.text(leftX, 5, fighter.name.slice(0, 28), colors.white);
  screen.text(leftX, 6, `GPU: ${(fighter.gpu || 'Integrated').slice(0, 26)}`, colors.dim);
  screen.text(leftX, 7, `HP:${fighter.stats.hp} STR:${fighter.stats.str} MAG:${fighter.stats.mag} SPD:${fighter.stats.spd}`, colors.dim);

  screen.text(rightX, 4, opponent ? 'TARGET' : 'WHY RUN IT?', opponent ? colors.p2 : colors.sky, null, true);
  if (opponent) {
    screen.text(rightX, 5, (opponent.name || 'Unknown').slice(0, 28), colors.white);
    screen.text(rightX, 6, `GPU: ${(opponent.gpu || '?').slice(0, 26)}`, colors.dim);
    screen.text(rightX, 7, `HP:${opponent.stats.hp} STR:${opponent.stats.str} MAG:${opponent.stats.mag} SPD:${opponent.stats.spd}`, colors.dim);
  } else {
    screen.text(rightX, 5, 'Storage burst -> early initiative', colors.dim);
    screen.text(rightX, 6, 'Thermals -> less overheat drift', colors.dim);
    screen.text(rightX, 7, 'Memory + reflex -> live scaling', colors.dim);
  }

  screen.hline(2, 9, w - 4, '─', colors.dimmer);
  screen.text(4, 11, 'CURRENT LOADOUT', colors.cyan, null, true);
  const summary = getBenchmarkSummaryLines(profile, 5);
  summary.forEach((line, index) => {
    screen.text(6, 13 + index * 2, line.text.slice(0, w - 12), line.color);
  });

  const options = [profile ? 'RERUN BENCH' : 'RUN BENCH', 'SKIP'];
  const menuY = screen.height - 5;
  options.forEach((label, index) => {
    const x = 8 + index * 24;
    if (cursor === index) {
      screen.text(x, menuY, '▶', colors.gold, null, true);
      screen.text(x + 2, menuY, ` ${label} `, colors.white, null, true);
    } else {
      screen.text(x + 2, menuY, ` ${label} `, colors.dim);
    }
  });
  screen.text(4, screen.height - 2, 'Left/Right to choose, Enter to continue', colors.dimmer);
  screen.render();
}

async function promptGate(screen, fighter, opponent, profile, stdin) {
  return new Promise((resolve) => {
    let cursor = 0;

    function render() {
      showGate(screen, fighter, opponent, cursor, profile);
    }

    function onKey(key) {
      if (key === '\x1b[C' || key === 'l') {
        cursor = (cursor + 1) % 2;
        render();
      } else if (key === '\x1b[D' || key === 'h') {
        cursor = (cursor - 1 + 2) % 2;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        stdin.removeListener('data', onKey);
        resolve(cursor === 0 ? 'run' : 'skip');
      } else if (key === '\x03') {
        stdin.removeListener('data', onKey);
        resolve('skip');
      }
    }

    stdin.on('data', onKey);
    render();
  });
}

async function runBenchToBattleTransition(fighter, opponent = null) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return normalizeBenchmarkProfile(fighter?.benchmark);
  }

  const screen = new Screen();
  const stdin = process.stdin;
  screen.enter();
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let profile = normalizeBenchmarkProfile(fighter?.benchmark);

  try {
    const action = await promptGate(screen, fighter, opponent, profile, stdin);
    if (action === 'run') {
      profile = await runBenchmarkSequence(screen, fighter, opponent, stdin);
      applyBenchmarkProfile(fighter, profile);
    }
    return normalizeBenchmarkProfile(profile);
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
    screen.exit();
  }
}

module.exports = {
  applyBenchmarkProfile,
  getBenchmarkCombatModifiers,
  getBenchmarkConditionEvents,
  getBenchmarkLogEntries,
  getBenchmarkSummaryLines,
  normalizeBenchmarkProfile,
  runBenchToBattleTransition,
  toneColor,
};
