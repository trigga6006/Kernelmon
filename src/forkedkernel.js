const { Screen } = require('./screen');
const { colors, rgb, bgRgb } = require('./palette');

const BOARD_SIZE = 7;
const UPLINKS = [
  { x: 1, y: 3 },
  { x: 3, y: 3 },
  { x: 5, y: 3 },
];

const DOCTRINES = {
  thermal: {
    key: 'thermal',
    name: 'THERMAL',
    color: rgb(240, 160, 140),
    desc: 'Fortified units become harder to dislodge.',
  },
  cache: {
    key: 'cache',
    name: 'CACHE',
    color: rgb(140, 230, 180),
    desc: 'Diagonal allies also provide support links.',
  },
  io: {
    key: 'io',
    name: 'I/O',
    color: rgb(140, 190, 250),
    desc: 'NVMe and Process units gain stronger routing mobility.',
  },
};

const UNIT_DEFS = {
  core: { glyph: 'K', name: 'Core', specialty: 'guard', value: 999 },
  cpu: { glyph: 'C', name: 'CPU', specialty: 'burst', value: 9 },
  gpu: { glyph: 'G', name: 'GPU', specialty: 'hack', value: 8 },
  ram: { glyph: 'R', name: 'RAM', specialty: 'guard', value: 7 },
  nvme: { glyph: 'N', name: 'NVMe', specialty: 'burst', value: 6 },
  process: { glyph: 'P', name: 'Process', specialty: 'hack', value: 3 },
};

const STANCES = [
  { key: 'burst', name: 'BURST', color: colors.peach, icon: 'B' },
  { key: 'guard', name: 'GUARD', color: colors.sky, icon: 'G' },
  { key: 'hack', name: 'HACK', color: colors.lilac, icon: 'H' },
];

const FILES = 'abcdefg';
const FPS = 20;
const FRAME_MS = 1000 / FPS;
const HOLD_TO_WIN = 2;

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function posKey(x, y) {
  return `${x},${y}`;
}

function formatCell(x, y) {
  return `${FILES[x]}${BOARD_SIZE - y}`;
}

function getOpponent(side) {
  return side === 'player' ? 'enemy' : 'player';
}

function getUnitColor(side) {
  return side === 'player' ? colors.cyan : colors.lavender;
}

function isUplink(x, y) {
  return UPLINKS.some(p => p.x === x && p.y === y);
}

function getDoctrine(state, side) {
  return DOCTRINES[side === 'player' ? state.playerDoctrine : state.enemyDoctrine];
}

function createUnit(side, type, x, y, id) {
  return {
    id,
    side,
    type,
    x,
    y,
    alive: true,
    fortified: false,
    locked: 0,
    actedLastRound: false,
  };
}

function createInitialState(playerDoctrine, enemyDoctrine) {
  const units = [
    createUnit('enemy', 'cpu', 1, 0, 'enemy-cpu'),
    createUnit('enemy', 'gpu', 2, 0, 'enemy-gpu'),
    createUnit('enemy', 'core', 3, 0, 'enemy-core'),
    createUnit('enemy', 'ram', 4, 0, 'enemy-ram'),
    createUnit('enemy', 'nvme', 5, 0, 'enemy-nvme'),
    createUnit('enemy', 'process', 1, 1, 'enemy-process-1'),
    createUnit('enemy', 'process', 3, 1, 'enemy-process-2'),
    createUnit('enemy', 'process', 5, 1, 'enemy-process-3'),
    createUnit('player', 'process', 1, 5, 'player-process-1'),
    createUnit('player', 'process', 3, 5, 'player-process-2'),
    createUnit('player', 'process', 5, 5, 'player-process-3'),
    createUnit('player', 'cpu', 1, 6, 'player-cpu'),
    createUnit('player', 'gpu', 2, 6, 'player-gpu'),
    createUnit('player', 'core', 3, 6, 'player-core'),
    createUnit('player', 'ram', 4, 6, 'player-ram'),
    createUnit('player', 'nvme', 5, 6, 'player-nvme'),
  ];

  return {
    round: 1,
    units,
    playerDoctrine,
    enemyDoctrine,
    uplinkLock: { player: 0, enemy: 0 },
    winner: null,
    winnerReason: null,
  };
}

function getLiveUnits(state, side) {
  return state.units.filter(unit => unit.alive && (!side || unit.side === side));
}

function getUnitAt(state, x, y, opts = {}) {
  const exclude = new Set(opts.excludeIds || []);
  return state.units.find(unit => unit.alive && !exclude.has(unit.id) && unit.x === x && unit.y === y) || null;
}

function getUnitById(state, id) {
  return state.units.find(unit => unit.id === id) || null;
}

function getCore(state, side) {
  return getLiveUnits(state, side).find(unit => unit.type === 'core') || null;
}

function getSupportOffsets(doctrineKey) {
  const orth = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  if (doctrineKey !== 'cache') return orth;
  return orth.concat([
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ]);
}

function lineMoves(state, unit, dirs, range) {
  const moves = [];
  for (const dir of dirs) {
    for (let step = 1; step <= range; step++) {
      const x = unit.x + dir.x * step;
      const y = unit.y + dir.y * step;
      if (!inBounds(x, y)) break;
      const occupier = getUnitAt(state, x, y);
      if (occupier) {
        if (occupier.side !== unit.side) moves.push({ x, y, kind: 'capture', distance: step });
        break;
      }
      moves.push({ x, y, kind: 'move', distance: step });
    }
  }
  return moves;
}

function stepMoves(state, unit, offsets) {
  const moves = [];
  for (const offset of offsets) {
    const x = unit.x + offset.x;
    const y = unit.y + offset.y;
    if (!inBounds(x, y)) continue;
    const occupier = getUnitAt(state, x, y);
    if (occupier && occupier.side === unit.side) continue;
    moves.push({ x, y, kind: occupier ? 'capture' : 'move', distance: 1 });
  }
  return moves;
}

function getLegalMoves(state, unit) {
  const doctrineKey = getDoctrine(state, unit.side).key;
  if (!unit.alive || unit.locked > 0) return [];

  switch (unit.type) {
    case 'core':
      return stepMoves(state, unit, [
        { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
      ]);
    case 'cpu':
      return lineMoves(state, unit, [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      ], 2);
    case 'gpu':
      return lineMoves(state, unit, [
        { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
      ], 2);
    case 'ram':
      return stepMoves(state, unit, [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      ]);
    case 'nvme': {
      const range = doctrineKey === 'io' ? 4 : 3;
      return lineMoves(state, unit, [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      ], range);
    }
    case 'process': {
      const dir = unit.side === 'player' ? -1 : 1;
      const offsets = [
        { x: 0, y: dir },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ];
      if (doctrineKey === 'io') offsets.push({ x: -1, y: dir }, { x: 1, y: dir });
      return stepMoves(state, unit, offsets);
    }
    default:
      return [];
  }
}

function getEligibleUnits(state, side, alreadyChosenIds = []) {
  const chosen = new Set(alreadyChosenIds);
  return getLiveUnits(state, side).filter(unit => unit.locked <= 0 && !chosen.has(unit.id));
}

function getDefaultStance(unit) {
  return UNIT_DEFS[unit.type].specialty;
}

function getStanceLabel(stanceKey) {
  const stance = STANCES.find(item => item.key === stanceKey);
  return stance ? stance.name : stanceKey.toUpperCase();
}

function beats(left, right) {
  return (
    (left === 'burst' && right === 'hack') ||
    (left === 'hack' && right === 'guard') ||
    (left === 'guard' && right === 'burst')
  );
}

function buildIntentMap(state, playerOrders, enemyOrders) {
  const ordersById = {};
  for (const order of playerOrders.concat(enemyOrders)) ordersById[order.unitId] = order;

  const intents = {};
  for (const unit of getLiveUnits(state)) {
    const order = ordersById[unit.id];
    if (!order) {
      intents[unit.id] = {
        unitId: unit.id,
        type: 'hold',
        fromX: unit.x,
        fromY: unit.y,
        toX: unit.x,
        toY: unit.y,
        moved: false,
        stance: unit.fortified ? 'guard' : getDefaultStance(unit),
      };
      continue;
    }

    if (order.type === 'fortify') {
      intents[unit.id] = {
        unitId: unit.id,
        type: 'fortify',
        fromX: unit.x,
        fromY: unit.y,
        toX: unit.x,
        toY: unit.y,
        moved: false,
        stance: 'guard',
      };
      continue;
    }

    intents[unit.id] = {
      unitId: unit.id,
      type: 'move',
      fromX: unit.x,
      fromY: unit.y,
      toX: order.x,
      toY: order.y,
      moved: true,
      stance: order.stance,
      distance: Math.abs(order.x - unit.x) + Math.abs(order.y - unit.y),
    };
  }

  return intents;
}

function collectSupport(state, side, conflictSquare, intentMap, excludeIds = []) {
  const doctrineKey = getDoctrine(state, side).key;
  const supportOffsets = getSupportOffsets(doctrineKey);
  const exclude = new Set(excludeIds);
  let support = 0;

  for (const unit of getLiveUnits(state, side)) {
    if (exclude.has(unit.id)) continue;
    const intent = intentMap[unit.id];
    if (!intent || intent.moved) continue;

    const adjacent = supportOffsets.some(offset => (
      unit.x + offset.x === conflictSquare.x && unit.y + offset.y === conflictSquare.y
    ));
    if (!adjacent) continue;

    let value = 1;
    if (unit.type === 'ram' && unit.fortified) value += 1;
    if (doctrineKey === 'thermal' && unit.fortified) value += 1;
    support += value;
  }

  return support;
}

function scoreConflict(state, unit, intent, conflictSquare, support, opponentStance) {
  let score = 1;

  if (beats(intent.stance, opponentStance)) score += 2;
  else if (!beats(opponentStance, intent.stance)) score += 1;

  score += support;

  if (UNIT_DEFS[unit.type].specialty === intent.stance) score += 1;
  if (intent.stance === 'guard' && unit.fortified) score += 1;
  if (getDoctrine(state, unit.side).key === 'thermal' && intent.stance === 'guard' && unit.fortified) {
    score += 1;
  }
  if (getDoctrine(state, unit.side).key === 'io' && isUplink(conflictSquare.x, conflictSquare.y) && (unit.type === 'nvme' || unit.type === 'process')) {
    score += 1;
  }

  return score;
}

function findConflictPairs(state, intentMap) {
  const pairs = [];
  const seen = new Set();
  const playerUnits = getLiveUnits(state, 'player');
  const enemyUnits = getLiveUnits(state, 'enemy');

  for (const playerUnit of playerUnits) {
    const playerIntent = intentMap[playerUnit.id];
    for (const enemyUnit of enemyUnits) {
      const enemyIntent = intentMap[enemyUnit.id];
      const pairKey = `${playerUnit.id}|${enemyUnit.id}`;
      if (seen.has(pairKey)) continue;

      let conflictSquare = null;
      let reason = null;

      if (playerIntent.moved && playerIntent.toX === enemyUnit.x && playerIntent.toY === enemyUnit.y) {
        conflictSquare = { x: enemyUnit.x, y: enemyUnit.y };
        reason = 'intercept';
      } else if (enemyIntent.moved && enemyIntent.toX === playerUnit.x && enemyIntent.toY === playerUnit.y) {
        conflictSquare = { x: playerUnit.x, y: playerUnit.y };
        reason = 'intercept';
      } else if (
        playerIntent.moved &&
        enemyIntent.moved &&
        playerIntent.toX === enemyIntent.toX &&
        playerIntent.toY === enemyIntent.toY
      ) {
        conflictSquare = { x: playerIntent.toX, y: playerIntent.toY };
        reason = 'collision';
      }

      if (!conflictSquare) continue;

      seen.add(pairKey);
      pairs.push({
        playerId: playerUnit.id,
        enemyId: enemyUnit.id,
        conflictSquare,
        reason,
      });
    }
  }

  return pairs;
}

function nearestUplinkDistance(x, y) {
  return UPLINKS.reduce((best, uplink) => (
    Math.min(best, Math.abs(uplink.x - x) + Math.abs(uplink.y - y))
  ), 999);
}

function computeUplinkControl(state) {
  const control = { player: 0, enemy: 0, owners: [] };

  for (const uplink of UPLINKS) {
    const occupant = getUnitAt(state, uplink.x, uplink.y);
    let owner = null;
    if (occupant) {
      const contesting = getLiveUnits(state, getOpponent(occupant.side))
        .some(unit => Math.abs(unit.x - uplink.x) + Math.abs(unit.y - uplink.y) === 1);
      if (!contesting) owner = occupant.side;
    }

    if (owner) control[owner]++;
    control.owners.push(owner);
  }

  return control;
}

// ═══════════════════════════════════════════════════════════════
// ROUND RESOLUTION
// ═══════════════════════════════════════════════════════════════

function applyRoundOutcome(state, playerOrders, enemyOrders) {
  const intentMap = buildIntentMap(state, playerOrders, enemyOrders);
  const log = [];

  // --- Apply fortify intents ---
  for (const unit of getLiveUnits(state)) {
    const intent = intentMap[unit.id];
    if (intent && intent.type === 'fortify') {
      unit.fortified = true;
      log.push(`${unit.side} ${UNIT_DEFS[unit.type].name} fortifies at ${formatCell(unit.x, unit.y)}`);
    } else if (intent && intent.moved) {
      unit.fortified = false;
    }
  }

  // --- Find conflicts ---
  const conflicts = findConflictPairs(state, intentMap);
  const conflictUnitIds = new Set();
  for (const c of conflicts) { conflictUnitIds.add(c.playerId); conflictUnitIds.add(c.enemyId); }

  // --- Apply non-conflicting moves ---
  for (const unit of getLiveUnits(state)) {
    if (conflictUnitIds.has(unit.id)) continue;
    const intent = intentMap[unit.id];
    if (!intent || !intent.moved) continue;

    // Check destination is not occupied by a friendly unit
    const occupier = getUnitAt(state, intent.toX, intent.toY, { excludeIds: [unit.id] });
    if (occupier && occupier.side === unit.side) continue;

    // Uncontested capture
    if (occupier && occupier.side !== unit.side) {
      occupier.alive = false;
      log.push(`${unit.side} ${UNIT_DEFS[unit.type].name} captures ${UNIT_DEFS[occupier.type].name} at ${formatCell(intent.toX, intent.toY)}`);
    }

    unit.x = intent.toX;
    unit.y = intent.toY;
    log.push(`${unit.side} ${UNIT_DEFS[unit.type].name} moves to ${formatCell(intent.toX, intent.toY)}`);
  }

  // --- Resolve conflicts ---
  for (const conflict of conflicts) {
    const pUnit = getUnitById(state, conflict.playerId);
    const eUnit = getUnitById(state, conflict.enemyId);
    if (!pUnit || !eUnit || !pUnit.alive || !eUnit.alive) continue;

    const pIntent = intentMap[pUnit.id];
    const eIntent = intentMap[eUnit.id];
    const sq = conflict.conflictSquare;

    const pSupport = collectSupport(state, 'player', sq, intentMap, [pUnit.id, eUnit.id]);
    const eSupport = collectSupport(state, 'enemy', sq, intentMap, [pUnit.id, eUnit.id]);

    const pScore = scoreConflict(state, pUnit, pIntent, sq, pSupport, eIntent.stance);
    const eScore = scoreConflict(state, eUnit, eIntent, sq, eSupport, pIntent.stance);

    log.push(`Conflict at ${formatCell(sq.x, sq.y)}: ${UNIT_DEFS[pUnit.type].name}(${getStanceLabel(pIntent.stance)} +${pSupport}sup =${pScore}) vs ${UNIT_DEFS[eUnit.type].name}(${getStanceLabel(eIntent.stance)} +${eSupport}sup =${eScore})`);

    if (pScore > eScore) {
      eUnit.alive = false;
      if (pIntent.moved) { pUnit.x = sq.x; pUnit.y = sq.y; }
      log.push(`  → Player wins, ${UNIT_DEFS[eUnit.type].name} destroyed`);
    } else if (eScore > pScore) {
      pUnit.alive = false;
      if (eIntent.moved) { eUnit.x = sq.x; eUnit.y = sq.y; }
      log.push(`  → Enemy wins, ${UNIT_DEFS[pUnit.type].name} destroyed`);
    } else {
      // Tie — both become locked for 1 round
      pUnit.locked = 1;
      eUnit.locked = 1;
      log.push(`  → Tie! Both units locked`);
    }
  }

  // --- Decrement locks ---
  for (const unit of getLiveUnits(state)) {
    if (!conflictUnitIds.has(unit.id) && unit.locked > 0) {
      unit.locked--;
    }
  }

  // --- Check win conditions ---
  const playerCore = getCore(state, 'player');
  const enemyCore = getCore(state, 'enemy');

  if (!enemyCore || !enemyCore.alive) {
    state.winner = 'player';
    state.winnerReason = 'Core Breach';
    log.push('PLAYER wins by Core Breach!');
  } else if (!playerCore || !playerCore.alive) {
    state.winner = 'enemy';
    state.winnerReason = 'Core Breach';
    log.push('ENEMY wins by Core Breach!');
  } else {
    // Uplink lock check
    const control = computeUplinkControl(state);
    if (control.player >= 2) {
      state.uplinkLock.player++;
      if (state.uplinkLock.player >= HOLD_TO_WIN) {
        state.winner = 'player';
        state.winnerReason = 'Uplink Lock';
        log.push('PLAYER wins by Uplink Lock!');
      }
    } else {
      state.uplinkLock.player = 0;
    }
    if (control.enemy >= 2) {
      state.uplinkLock.enemy++;
      if (state.uplinkLock.enemy >= HOLD_TO_WIN) {
        state.winner = 'enemy';
        state.winnerReason = 'Uplink Lock';
        log.push('ENEMY wins by Uplink Lock!');
      }
    } else {
      state.uplinkLock.enemy = 0;
    }
  }

  state.round++;
  return log;
}

// ═══════════════════════════════════════════════════════════════
// AI — Simple greedy enemy
// ═══════════════════════════════════════════════════════════════

function aiPickOrders(state) {
  const orders = [];
  const eligible = getEligibleUnits(state, 'enemy');
  const chosenIds = [];

  // Priority: move toward uplinks and player core, pick stance based on specialty
  const scored = [];
  for (const unit of eligible) {
    const moves = getLegalMoves(state, unit);
    let bestMove = null;
    let bestScore = -999;

    for (const move of moves) {
      let s = 0;
      // Prefer capturing
      if (move.kind === 'capture') s += 10;
      // Prefer uplinks
      if (isUplink(move.x, move.y)) s += 8;
      // Prefer moving toward center/player side
      s += move.y * 0.5; // enemy wants to push toward higher y
      // Prefer moving toward nearest uplink
      s -= nearestUplinkDistance(move.x, move.y) * 0.3;
      if (s > bestScore) { bestScore = s; bestMove = move; }
    }

    scored.push({ unit, bestMove, bestScore });
  }

  // Sort by score descending, pick top 2
  scored.sort((a, b) => b.bestScore - a.bestScore);

  for (const entry of scored) {
    if (orders.length >= 2) break;
    if (!entry.bestMove) continue;
    chosenIds.push(entry.unit.id);
    orders.push({
      unitId: entry.unit.id,
      type: 'move',
      x: entry.bestMove.x,
      y: entry.bestMove.y,
      stance: getDefaultStance(entry.unit),
    });
  }

  // If fewer than 2 orders, fill with fortify
  if (orders.length < 2) {
    for (const unit of eligible) {
      if (orders.length >= 2) break;
      if (chosenIds.includes(unit.id)) continue;
      orders.push({ unitId: unit.id, type: 'fortify' });
    }
  }

  return orders;
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL RENDERING
// ═══════════════════════════════════════════════════════════════

function fitText(text, width) {
  if (width <= 0) return '';
  if (text.length <= width) return text;
  if (width <= 3) return text.slice(0, width);
  return `${text.slice(0, width - 3)}...`;
}

function padCenter(text, width) {
  const clipped = fitText(text, width);
  if (clipped.length >= width) return clipped;
  const left = Math.floor((width - clipped.length) / 2);
  const right = width - clipped.length - left;
  return `${' '.repeat(left)}${clipped}${' '.repeat(right)}`;
}

function wrapText(text, width) {
  if (width <= 0) return [];
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line.length) {
      line = word;
      continue;
    }
    if ((line.length + 1 + word.length) <= width) {
      line += ` ${word}`;
      continue;
    }
    lines.push(fitText(line, width));
    line = word;
  }
  if (line.length) lines.push(fitText(line, width));
  return lines;
}

function getBoardScale(scr) {
  const candidates = [
    { cellW: 7, rowH: 2, gap: 3, footerH: 10, railW: 28 },
    { cellW: 5, rowH: 1, gap: 2, footerH: 9, railW: 24 },
    { cellW: 3, rowH: 1, gap: 2, footerH: 8, railW: 20 },
  ];

  for (const candidate of candidates) {
    const availableW = scr.width - 2;
    const centerW = availableW - (candidate.railW * 2) - (candidate.gap * 2);
    const boardMinW = 8 + (BOARD_SIZE * candidate.cellW);
    const boardPanelH = 5 + (BOARD_SIZE * candidate.rowH);
    const totalH = boardPanelH + candidate.gap + candidate.footerH;
    if (centerW < boardMinW) continue;
    if (totalH <= (scr.height - 2)) {
      return { ...candidate, centerW };
    }
  }

  const fallbackGap = 1;
  const fallbackRail = 18;
  const fallbackCenter = Math.max(30, scr.width - 2 - (fallbackRail * 2) - (fallbackGap * 2));
  return { cellW: 3, rowH: 1, gap: fallbackGap, footerH: 7, railW: fallbackRail, centerW: fallbackCenter };
}

function getMatchLayout(scr, opts = {}) {
  const includeFooter = opts.includeFooter !== false;
  const scale = getBoardScale(scr);
  const boardPanelW = scale.centerW;
  let boardPanelH = 5 + (BOARD_SIZE * scale.rowH);
  const railPanelW = scale.railW;
  let railPanelH = Math.max(boardPanelH, 15);
  let footerPanelH = Math.max(7, Math.min(scale.footerH, scr.height - boardPanelH - scale.gap - 2));
  if (!includeFooter) {
    boardPanelH = Math.min(scr.height - 2, boardPanelH + footerPanelH + scale.gap);
    railPanelH = boardPanelH;
    footerPanelH = 0;
  }
  const totalW = railPanelW + scale.gap + boardPanelW + scale.gap + railPanelW;
  const totalH = includeFooter ? (boardPanelH + scale.gap + footerPanelH) : boardPanelH;
  const originX = Math.max(0, Math.floor((scr.width - totalW) / 2));
  const originY = Math.max(1, Math.floor((scr.height - totalH) / 2));

  return {
    scale,
    rulesPanel: { x: originX, y: originY, w: railPanelW, h: railPanelH },
    boardPanel: { x: originX + railPanelW + scale.gap, y: originY, w: boardPanelW, h: boardPanelH },
    statusPanel: { x: originX + railPanelW + scale.gap + boardPanelW + scale.gap, y: originY, w: railPanelW, h: railPanelH },
    footerPanel: { x: originX + railPanelW + scale.gap, y: originY + boardPanelH + scale.gap, w: boardPanelW, h: footerPanelH },
  };
}

function drawPanel(scr, panel, title, color = colors.dimmer) {
  scr.box(panel.x, panel.y, panel.w, panel.h, color);
  if (title) {
    scr.text(panel.x + 2, panel.y, ` ${fitText(title, panel.w - 6)} `, color, null, true);
  }
}

function getBoardCellText(unit, isUplinkCell, cellW) {
  if (unit) {
    return padCenter(`[${UNIT_DEFS[unit.type].glyph}]`, cellW);
  }
  if (isUplinkCell) {
    return padCenter(cellW >= 5 ? '<U>' : '◆', cellW);
  }
  return padCenter('·', cellW);
}

function getBoardGeometry(panel, scale) {
  const contentW = 2 + (BOARD_SIZE * scale.cellW);
  const contentH = 1 + (BOARD_SIZE * scale.rowH);
  const innerW = panel.w - 4;
  const innerH = panel.h - 4;
  const innerX = panel.x + 2 + Math.max(0, Math.floor((innerW - contentW) / 2));
  const innerY = panel.y + 2 + Math.max(0, Math.floor((innerH - contentH) / 2));
  return {
    innerX,
    innerY,
    contentW,
    contentH,
    gridX: innerX + 2,
    headerY: innerY,
    rowStartY: innerY + 1,
    gridBottomY: innerY + contentH - 1,
  };
}

function renderBoard(scr, state, panel, scale, opts = {}) {
  drawPanel(scr, panel, 'BATTLEFIELD', colors.gold);
  const geo = getBoardGeometry(panel, scale);
  const availableMoves = new Map((opts.availableMoves || []).map(move => [posKey(move.x, move.y), move]));
  const cursorPos = opts.cursor || null;
  const selectedPos = opts.selectedUnit ? { x: opts.selectedUnit.x, y: opts.selectedUnit.y } : null;

  if (opts.titleNote) {
    scr.text(panel.x + Math.max(2, panel.w - opts.titleNote.length - 3), panel.y, ` ${fitText(opts.titleNote, panel.w - 8)} `, colors.cyan, null, true);
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    const headerX = geo.gridX + col * scale.cellW;
    scr.text(headerX, geo.headerY, padCenter(FILES[col], scale.cellW), colors.dim);
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    const baseY = geo.rowStartY + row * scale.rowH;
    const label = String(BOARD_SIZE - row);
    scr.text(geo.innerX, baseY, label, colors.dim, null, true);

    for (let col = 0; col < BOARD_SIZE; col++) {
      const x = geo.gridX + col * scale.cellW;
      const unit = getUnitAt(state, col, row);
      const uplinkCell = isUplink(col, row);
      const dark = (col + row) % 2 === 0;
      const move = availableMoves.get(posKey(col, row));
      const isCursor = cursorPos && cursorPos.x === col && cursorPos.y === row;
      const isSelected = selectedPos && selectedPos.x === col && selectedPos.y === row;
      let bg = unit
        ? (unit.locked > 0 ? bgRgb(72, 38, 28) : unit.fortified ? bgRgb(28, 52, 72) : (dark ? bgRgb(22, 24, 38) : bgRgb(28, 30, 46)))
        : (dark ? bgRgb(18, 20, 30) : bgRgb(23, 25, 36));
      let fg = unit ? getUnitColor(unit.side) : (uplinkCell ? colors.gold : colors.ghost);
      let text = getBoardCellText(unit, uplinkCell, scale.cellW);

      if (move && !unit) {
        text = padCenter(move.kind === 'capture' ? 'x' : '+', scale.cellW);
        fg = move.kind === 'capture' ? colors.rose : colors.mint;
        bg = move.kind === 'capture' ? bgRgb(52, 22, 32) : bgRgb(22, 42, 30);
      }
      if (isSelected) {
        bg = bgRgb(26, 76, 82);
      }
      if (isCursor) {
        bg = move
          ? (move.kind === 'capture' ? bgRgb(90, 32, 46) : bgRgb(30, 72, 44))
          : bgRgb(72, 72, 94);
        fg = colors.white;
      }

      scr.text(x, baseY, text, fg, bg, !!unit || isCursor || isSelected);
      if (scale.rowH > 1) {
        const status = unit
          ? padCenter(unit.locked > 0 ? 'LOCK' : unit.fortified ? 'FORT' : UNIT_DEFS[unit.type].name.toUpperCase(), scale.cellW)
          : ' '.repeat(scale.cellW);
        const statusFg = isCursor ? colors.white : (unit ? colors.dimmer : colors.ghost);
        scr.text(x, baseY + 1, fitText(status, scale.cellW), statusFg, bg);
      }
    }
  }

  if (opts.boardNotes && opts.boardNotes.length) {
    let y = geo.gridBottomY + 2;
    const maxY = panel.y + panel.h - 2;
    const noteX = panel.x + 3;
    const noteW = panel.w - 6;
    for (const note of opts.boardNotes) {
      if (y > maxY) break;
      scr.text(noteX, y++, fitText(note.text, noteW), note.fg || colors.dim, null, !!note.bold);
    }
  }

  return geo;
}

function renderRulesPanel(scr, panel) {
  drawPanel(scr, panel, 'RULES', colors.coral);

  const innerX = panel.x + 2;
  const innerW = panel.w - 4;
  let y = panel.y + 2;
  const items = [
    { text: '1. Hover your units and press Space to arm a move.', fg: colors.white, bold: true },
    { text: '2. Moving into an enemy triggers a clash instead of an instant capture.', fg: colors.dim },
    { text: '3. Move to a highlighted square and press Enter to confirm.', fg: colors.white, bold: true },
    { text: '4. Pick a stance from the popup:', fg: colors.white, bold: true },
    { text: 'Burst > Hack', fg: colors.peach },
    { text: 'Hack > Guard', fg: colors.lilac },
    { text: 'Guard > Burst', fg: colors.sky },
    { text: '5. Nearby allies add support to clashes.', fg: colors.white, bold: true },
    { text: '6. Fortified units defend better and hold space.', fg: colors.dim },
    { text: '7. Win by breaching the enemy Core or holding 2 uplinks for 2 rounds.', fg: colors.white, bold: true },
  ];

  for (const item of items) {
    const lines = wrapText(item.text, innerW);
    for (const line of lines) {
      if (y >= panel.y + panel.h - 1) return;
      scr.text(innerX, y++, line, item.fg || colors.dim, null, !!item.bold);
    }
    if (y < panel.y + panel.h - 1) y++;
  }
}

function renderSidebar(scr, state, panel) {
  drawPanel(scr, panel, 'STATUS', colors.lilac);

  const control = computeUplinkControl(state);
  const pd = getDoctrine(state, 'player');
  const ed = getDoctrine(state, 'enemy');
  const innerX = panel.x + 2;
  const innerY = panel.y + 2;
  const innerW = panel.w - 4;
  let y = innerY;

  const lines = [
    { text: `Round ${state.round}`, fg: colors.white, bold: true },
    { text: '' },
    { text: `You: ${pd.name}`, fg: pd.color, bold: true },
    { text: fitText(pd.desc, innerW), fg: colors.dimmer },
    { text: '' },
    { text: `Foe: ${ed.name}`, fg: ed.color, bold: true },
    { text: fitText(ed.desc, innerW), fg: colors.dimmer },
    { text: '' },
    { text: 'Uplinks', fg: colors.gold, bold: true },
  ];

  for (let i = 0; i < UPLINKS.length; i++) {
    const owner = control.owners[i];
    const label = owner === 'player' ? 'YOU' : owner === 'enemy' ? 'FOE' : 'NEUTRAL';
    const fg = owner === 'player' ? colors.cyan : owner === 'enemy' ? colors.lavender : colors.dim;
    lines.push({ text: `${FILES[UPLINKS[i].x]}${BOARD_SIZE - UPLINKS[i].y}  ${label}`, fg });
  }

  if (state.uplinkLock.player > 0) lines.push({ text: `Lock  YOU ${state.uplinkLock.player}/${HOLD_TO_WIN}`, fg: colors.cyan });
  if (state.uplinkLock.enemy > 0) lines.push({ text: `Lock  FOE ${state.uplinkLock.enemy}/${HOLD_TO_WIN}`, fg: colors.lavender });

  lines.push({ text: '' });
  lines.push({ text: `Units  YOU ${getLiveUnits(state, 'player').length}`, fg: colors.cyan });
  lines.push({ text: `Units  FOE ${getLiveUnits(state, 'enemy').length}`, fg: colors.lavender });
  lines.push({ text: '' });
  lines.push({ text: 'Legend', fg: colors.gold, bold: true });
  lines.push({ text: '[ ] unit  <U> uplink', fg: colors.dim });
  lines.push({ text: 'Blue bg fortified', fg: colors.dim });
  lines.push({ text: 'Amber bg locked', fg: colors.dim });

  for (const line of lines) {
    if (y >= panel.y + panel.h - 1) break;
    if (line.text === '') {
      y++;
      continue;
    }
    scr.text(innerX, y++, fitText(line.text, innerW), line.fg || colors.dim, null, !!line.bold);
  }
}

function renderListPanel(scr, panel, title, items, accent = colors.gold) {
  drawPanel(scr, panel, title, accent);
  const innerX = panel.x + 2;
  const innerY = panel.y + 2;
  const innerW = panel.w - 4;
  const innerH = panel.h - 4;
  let y = innerY;

  for (const item of items) {
    const wrapped = wrapText(item.text, innerW);
    for (const line of wrapped) {
      if (y >= innerY + innerH) return;
      scr.text(innerX, y++, line, item.fg || colors.dim, null, !!item.bold);
    }
  }
}

function getDirectionalTarget(current, targets, direction) {
  if (!current || !targets.length) return targets[0] || null;
  const dir = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
  }[direction];
  if (!dir) return current;

  let best = null;
  let bestScore = Infinity;
  for (const target of targets) {
    if (target.x === current.x && target.y === current.y) continue;
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    if (dir.dx && Math.sign(dx) !== dir.dx) continue;
    if (dir.dy && Math.sign(dy) !== dir.dy) continue;
    const primary = dir.dx ? Math.abs(dx) : Math.abs(dy);
    const secondary = dir.dx ? Math.abs(dy) : Math.abs(dx);
    const score = primary * 10 + secondary;
    if (score < bestScore) {
      best = target;
      bestScore = score;
    }
  }

  if (best) return best;
  const currentIndex = targets.findIndex(target => target.x === current.x && target.y === current.y);
  if (currentIndex === -1) return targets[0] || current;
  if (direction === 'left' || direction === 'up') return targets[(currentIndex - 1 + targets.length) % targets.length];
  return targets[(currentIndex + 1) % targets.length];
}

function renderStancePopup(scr, panel, selectedUnit, stanceCursor) {
  const popupW = Math.min(34, panel.w - 8);
  const popupH = 8;
  const popupX = panel.x + Math.floor((panel.w - popupW) / 2);
  const popupY = panel.y + 3;
  scr.box(popupX, popupY, popupW, popupH, colors.white, bgRgb(15, 18, 30));
  scr.centerText(popupY + 1, 'Choose Stance', colors.white, null, true);
  scr.centerText(popupY + 2, fitText(UNIT_DEFS[selectedUnit.type].name, popupW - 4), colors.dim);

  for (let i = 0; i < STANCES.length; i++) {
    const stance = STANCES[i];
    const selected = i === stanceCursor;
    const label = `${selected ? '▸' : ' '} ${stance.name}${stance.key === getDefaultStance(selectedUnit) ? ' *' : ''}`;
    scr.text(popupX + 2, popupY + 4 + i, fitText(label, popupW - 4), selected ? stance.color : colors.dim, null, selected);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOCTRINE SELECTION
// ═══════════════════════════════════════════════════════════════

async function selectDoctrine(scr) {
  const docKeys = Object.keys(DOCTRINES);
  let cursor = 0;

  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function draw() {
      scr.clear();
      const w = scr.width;
      const h = scr.height;
      const panelW = Math.min(84, Math.max(48, w - 10));
      const panelH = Math.min(18, Math.max(15, h - 6));
      const panel = {
        x: Math.floor((w - panelW) / 2),
        y: Math.floor((h - panelH) / 2),
        w: panelW,
        h: panelH,
      };
      drawPanel(scr, panel, 'FORKED KERNEL', colors.gold);

      const innerX = panel.x + 3;
      const innerY = panel.y + 2;
      const innerW = panel.w - 6;
      let y = innerY;

      const intro = [
        'Issue two orders each round.',
        'Captures trigger stance-based conflicts.',
        'Win by breaching the enemy Core or locking 2 uplinks for 2 rounds.',
      ];
      for (const line of intro) {
        for (const wrapped of wrapText(line, innerW)) {
          scr.text(innerX, y++, wrapped, colors.dim);
        }
      }

      y++;
      scr.text(innerX, y++, 'Choose your doctrine:', colors.white, null, true);
      y++;

      for (let i = 0; i < docKeys.length; i++) {
        const doc = DOCTRINES[docKeys[i]];
        const selected = i === cursor;
        const accent = selected ? doc.color : colors.ghost;
        const option = { x: innerX, y, w: innerW, h: 3 };
        scr.box(option.x, option.y, option.w, option.h, accent);
        scr.text(option.x + 2, option.y + 1, `${selected ? '▸' : ' '} ${doc.name}`, selected ? doc.color : colors.dim, null, selected);
        scr.text(option.x + 18, option.y + 1, fitText(doc.desc, option.w - 21), selected ? colors.white : colors.dimmer);
        y += 4;
      }

      scr.centerText(panel.y + panel.h - 2, '↑↓ Select   Enter Confirm   Q Quit', colors.dim);
      scr.render();
    }

    function onKey(key) {
      if (key === '\x03' || key === 'q' || key === 'Q') {
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();
        resolve(null);
        return;
      }
      if (key === '\x1b[A' || key === 'w' || key === 'W') {
        cursor = (cursor - 1 + docKeys.length) % docKeys.length;
      } else if (key === '\x1b[B' || key === 's' || key === 'S') {
        cursor = (cursor + 1) % docKeys.length;
      } else if (key === '\r' || key === '\n') {
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();
        resolve(docKeys[cursor]);
        return;
      }
      draw();
    }

    stdin.on('data', onKey);
    draw();
  });
}

// ═══════════════════════════════════════════════════════════════
// PLAYER ORDER ENTRY
// ═══════════════════════════════════════════════════════════════

async function getPlayerOrders(scr, state) {
  const orders = [];
  const chosenIds = [];

  for (let orderNum = 0; orderNum < 2; orderNum++) {
    const order = await pickOneOrder(scr, state, orderNum + 1, chosenIds);
    if (!order) return null; // player quit
    orders.push(order);
    chosenIds.push(order.unitId);
  }

  return orders;
}

async function pickOneOrder(scr, state, orderNum, chosenIds) {
  const eligible = getEligibleUnits(state, 'player', chosenIds);
  if (eligible.length === 0) return { unitId: '_skip', type: 'fortify' };

  let phase = 'unit'; // unit -> move -> stance
  let cursor = { x: eligible[0].x, y: eligible[0].y };
  let selectedUnit = getUnitById(state, eligible[0].id);
  let moves = [];
  let selectedMove = null;
  let stanceCursor = 0;

  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function draw() {
      scr.clear();
      const layout = getMatchLayout(scr, { includeFooter: false });

      const boardNotes = [];
      const queued = chosenIds.length > 0
        ? chosenIds.map((id, idx) => {
            const unit = getUnitById(state, id);
            return `${idx + 1}:${unit ? UNIT_DEFS[unit.type].name : 'Locked In'}`;
          }).join('   ')
        : 'No previous orders locked in this round.';

      renderRulesPanel(scr, layout.rulesPanel);
      if (phase === 'unit') {
        boardNotes.push({ text: `Order ${orderNum}/2: hover one of your units, press Space to select, F to fortify.`, fg: colors.white, bold: true });
        boardNotes.push({ text: `Queued: ${queued}`, fg: colors.dim });
        if (selectedUnit) {
          boardNotes.push({ text: `Hovering ${UNIT_DEFS[selectedUnit.type].name} at ${formatCell(selectedUnit.x, selectedUnit.y)}.`, fg: colors.cyan });
        }
      } else if (phase === 'move') {
        boardNotes.push({ text: `${UNIT_DEFS[selectedUnit.type].name} selected. Move the cursor to a highlighted square and press Enter.`, fg: colors.white, bold: true });
        boardNotes.push({ text: 'Esc cancels selection and returns to piece hover.', fg: colors.dim });
      } else if (phase === 'stance') {
        boardNotes.push({ text: `Destination ${formatCell(selectedMove.x, selectedMove.y)} selected. Pick a stance from the popup.`, fg: colors.white, bold: true });
      }

      renderBoard(scr, state, layout.boardPanel, layout.scale, {
        cursor,
        selectedUnit,
        availableMoves: phase === 'move' || phase === 'stance' ? moves : [],
        boardNotes,
        titleNote: `ORDER ${orderNum}/2`,
      });
      renderSidebar(scr, state, layout.statusPanel);
      if (phase === 'stance') {
        renderStancePopup(scr, layout.boardPanel, selectedUnit, stanceCursor);
      }

      scr.render();
    }

    function moveHover(direction) {
      if (phase === 'unit') {
        const targets = eligible.map(unit => ({ x: unit.x, y: unit.y }));
        cursor = getDirectionalTarget(cursor, targets, direction) || cursor;
        const hovered = eligible.find(unit => unit.x === cursor.x && unit.y === cursor.y);
        if (hovered) selectedUnit = hovered;
      } else if (phase === 'move') {
        const targets = moves.map(move => ({ x: move.x, y: move.y }));
        cursor = getDirectionalTarget(cursor, targets, direction) || cursor;
      } else if (phase === 'stance') {
        if (direction === 'up' || direction === 'left') stanceCursor = (stanceCursor - 1 + STANCES.length) % STANCES.length;
        if (direction === 'down' || direction === 'right') stanceCursor = (stanceCursor + 1) % STANCES.length;
      }
    }

    function onKey(key) {
      if (key === '\x03') {
        stdin.removeListener('data', onKey);
        stdin.setRawMode(false);
        stdin.pause();
        resolve(null);
        return;
      }

      if (phase === 'unit') {
        if (key === 'q' || key === 'Q') {
          stdin.removeListener('data', onKey);
          stdin.setRawMode(false);
          stdin.pause();
          resolve(null);
          return;
        }
        if (key === '\x1b[A' || key === 'w' || key === 'W') moveHover('up');
        else if (key === '\x1b[B' || key === 's' || key === 'S') moveHover('down');
        else if (key === '\x1b[D' || key === 'a' || key === 'A') moveHover('left');
        else if (key === '\x1b[C' || key === 'd' || key === 'D') moveHover('right');
        else if (key === 'f' || key === 'F') {
          stdin.removeListener('data', onKey);
          stdin.setRawMode(false);
          stdin.pause();
          resolve({ unitId: selectedUnit.id, type: 'fortify' });
          return;
        } else if (key === ' ') {
          moves = getLegalMoves(state, selectedUnit);
          if (moves.length === 0) {
            stdin.removeListener('data', onKey);
            stdin.setRawMode(false);
            stdin.pause();
            resolve({ unitId: selectedUnit.id, type: 'fortify' });
            return;
          }
          selectedMove = moves[0];
          cursor = { x: selectedMove.x, y: selectedMove.y };
          phase = 'move';
        }
      } else if (phase === 'move') {
        if (key === '\x1b') {
          phase = 'unit';
          cursor = { x: selectedUnit.x, y: selectedUnit.y };
        } else if (key === '\x1b[A' || key === 'w' || key === 'W') moveHover('up');
        else if (key === '\x1b[B' || key === 's' || key === 'S') moveHover('down');
        else if (key === '\x1b[D' || key === 'a' || key === 'A') moveHover('left');
        else if (key === '\x1b[C' || key === 'd' || key === 'D') moveHover('right');
        else if (key === '\r' || key === '\n') {
          selectedMove = moves.find(move => move.x === cursor.x && move.y === cursor.y) || moves[0];
          stanceCursor = STANCES.findIndex(st => st.key === getDefaultStance(selectedUnit));
          if (stanceCursor < 0) stanceCursor = 0;
          phase = 'stance';
        }
      } else if (phase === 'stance') {
        if (key === '\x1b') { phase = 'move'; }
        else if (key === '\x1b[A' || key === 'w' || key === 'W') moveHover('up');
        else if (key === '\x1b[B' || key === 's' || key === 'S') moveHover('down');
        else if (key === '\x1b[D' || key === 'a' || key === 'A') moveHover('left');
        else if (key === '\x1b[C' || key === 'd' || key === 'D') moveHover('right');
        else if (key === '\r' || key === '\n') {
          stdin.removeListener('data', onKey);
          stdin.setRawMode(false);
          stdin.pause();
          resolve({
            unitId: selectedUnit.id,
            type: 'move',
            x: selectedMove.x,
            y: selectedMove.y,
            stance: STANCES[stanceCursor].key,
          });
          return;
        }
      }
      draw();
    }

    stdin.on('data', onKey);
    draw();
  });
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION SCREEN
// ═══════════════════════════════════════════════════════════════

async function showResolutionScreen(scr, state, logLines) {
  scr.clear();
  const h = scr.height;
  const layout = getMatchLayout(scr);

  renderRulesPanel(scr, layout.rulesPanel);
  renderBoard(scr, state, layout.boardPanel, layout.scale);
  renderSidebar(scr, state, layout.statusPanel);

  const items = [{ text: `Round ${state.round - 1} resolved.`, fg: colors.gold, bold: true }];
  for (const line of logLines) {
    items.push({ text: line, fg: line.startsWith('  ') ? colors.gold : colors.dim });
  }
  items.push({ text: '' });
  items.push({ text: 'Press any key to continue.', fg: colors.white });
  renderListPanel(scr, layout.footerPanel, 'EVENT LOG', items, colors.gold);
  scr.text(layout.footerPanel.x + 2, h - 1, fitText('The log shows exactly why each clash resolved the way it did.', layout.footerPanel.w - 4), colors.ghost);
  scr.render();

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

// ═══════════════════════════════════════════════════════════════
// MATCH END SCREEN
// ═══════════════════════════════════════════════════════════════

async function showMatchEndScreen(scr, state) {
  scr.clear();
  const w = scr.width;
  const h = scr.height;
  const panelW = Math.min(72, Math.max(46, w - 12));
  const panelH = Math.min(16, Math.max(13, h - 8));
  const panel = {
    x: Math.floor((w - panelW) / 2),
    y: Math.floor((h - panelH) / 2),
    w: panelW,
    h: panelH,
  };
  drawPanel(scr, panel, 'FORKED KERNEL', colors.gold);

  const cy = panel.y + Math.floor(panel.h / 2);
  if (state.winner === 'player') {
    scr.centerText(cy - 2, 'VICTORY', colors.mint, null, true);
  } else {
    scr.centerText(cy - 2, 'DEFEAT', colors.rose, null, true);
  }
  scr.centerText(cy, fitText(`${state.winnerReason} after ${state.round - 1} rounds`, panel.w - 6), colors.white);
  const pAlive = getLiveUnits(state, 'player').length;
  const eAlive = getLiveUnits(state, 'enemy').length;
  scr.centerText(cy + 2, `Your units: ${pAlive}   Foe units: ${eAlive}`, colors.dim);
  scr.centerText(cy + 4, 'Press R to rematch or Q to return to the menu.', colors.dimmer);
  scr.centerText(h - 2, '[R] Rematch    [Q] Return to Menu', colors.white);
  scr.render();

  return new Promise(resolve => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.once('data', (key) => {
      stdin.setRawMode(false);
      stdin.pause();
      if (key === '\x03') process.exit(0);
      resolve(key === 'r' || key === 'R');
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

async function renderForkedKernel(fighter) {
  const scr = new Screen();
  scr.enter();
  scr.padded();

  // Doctrine selection
  const playerDoctrine = await selectDoctrine(scr);
  if (!playerDoctrine) {
    scr.exit();
    return { won: false, reason: 'quit' };
  }

  // AI picks a random doctrine
  const docKeys = Object.keys(DOCTRINES);
  const enemyDoctrine = docKeys[Math.floor(Math.random() * docKeys.length)];

  let playAgain = true;
  let lastResult = { won: false, reason: 'quit' };

  while (playAgain) {
    const state = createInitialState(playerDoctrine, enemyDoctrine);

    // Main game loop
    while (!state.winner) {
      const playerOrders = await getPlayerOrders(scr, state);
      if (!playerOrders) {
        scr.exit();
        return { won: false, reason: 'quit' };
      }

      const enemyOrders = aiPickOrders(state);
      const logLines = applyRoundOutcome(state, playerOrders, enemyOrders);

      await showResolutionScreen(scr, state, logLines);
    }

    lastResult = { won: state.winner === 'player', reason: state.winnerReason, rounds: state.round - 1 };
    playAgain = await showMatchEndScreen(scr, state);
  }

  scr.exit();
  return lastResult;
}

module.exports = { renderForkedKernel };
