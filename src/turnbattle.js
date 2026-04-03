// ═══════════════════════════════════════════════════════════════
// TURN-BASED BATTLE ENGINE
// Processes one turn at a time given both players' move choices.
// Returns events for that turn (damage, effects, etc.)
// ═══════════════════════════════════════════════════════════════

const { createRNG } = require('./rng');

function createBattleState(fighterA, fighterB, seed) {
  const rng = createRNG(seed);
  return {
    rng,
    a: { ...fighterA.stats, hp: fighterA.stats.hp, maxHp: fighterA.stats.maxHp, stunned: false, debuffed: false },
    b: { ...fighterB.stats, hp: fighterB.stats.hp, maxHp: fighterB.stats.maxHp, stunned: false, debuffed: false },
    turn: 0,
  };
}

// Process a single turn: both players chose a move
function processTurn(state, moveA, moveB) {
  const { rng } = state;
  state.turn++;
  const events = [];

  // Determine attack order by SPD
  const spdA = state.a.spd + rng.int(-5, 5);
  const spdB = state.b.spd + rng.int(-5, 5);
  const order = spdA >= spdB
    ? [{ who: 'a', move: moveA, atk: state.a, def: state.b }]
    : [{ who: 'b', move: moveB, atk: state.b, def: state.a }];
  // Second attacker
  order.push(order[0].who === 'a'
    ? { who: 'b', move: moveB, atk: state.b, def: state.a }
    : { who: 'a', move: moveA, atk: state.a, def: state.b }
  );

  for (const turn of order) {
    const { who, move, atk, def } = turn;
    const defender = who === 'a' ? 'b' : 'a';

    if (def.hp <= 0) break;

    // Stunned — skip turn
    if (atk.stunned) {
      events.push({ type: 'stunned', who, turn: state.turn });
      atk.stunned = false;
      continue;
    }

    // Heal move
    if (move.special === 'heal') {
      const healAmt = Math.round((atk[move.base] || atk.vit) * move.mult * rng.float(0.8, 1.2));
      atk.hp = Math.min(atk.maxHp, atk.hp + healAmt);
      events.push({
        type: 'heal', who, turn: state.turn,
        move: move.name, label: move.label, flavor: move.desc,
        amount: healAmt,
        hpA: state.a.hp, hpB: state.b.hp,
      });
      continue;
    }

    // Damage calculation
    const baseStat = atk[move.base] || atk.str;
    let damage = Math.round(baseStat * move.mult * rng.float(0.7, 1.3));
    const defReduction = def.def * rng.float(0.15, 0.35);
    damage = Math.max(1, Math.round(damage - defReduction));

    if (atk.debuffed) {
      damage = Math.round(damage * 0.6);
      atk.debuffed = false;
    }

    // Crit
    const critChance = 0.05 + (atk.spd / 1000);
    const isCrit = rng.chance(critChance);
    if (isCrit) damage = Math.round(damage * 1.8);

    // Dodge
    const dodgeChance = 0.03 + (def.spd / 1500);
    const isDodge = rng.chance(dodgeChance);

    if (isDodge) {
      events.push({
        type: 'dodge', who: defender, attacker: who, turn: state.turn,
        move: move.name, label: move.label, flavor: move.desc,
        hpA: state.a.hp, hpB: state.b.hp,
      });
      continue;
    }

    // Apply damage
    def.hp = Math.max(0, def.hp - damage);

    // Special effects
    let specialEffect = null;
    if (move.special === 'stun' && rng.chance(0.6)) {
      def.stunned = true;
      specialEffect = 'stun';
    } else if (move.special === 'debuff') {
      def.debuffed = true;
      specialEffect = 'debuff';
    } else if (move.special === 'pierce') {
      specialEffect = 'pierce';
    }

    events.push({
      type: 'attack', who, target: defender, turn: state.turn,
      move: move.name, label: move.label, flavor: move.desc,
      category: move.cat, damage, isCrit, specialEffect,
      hpA: state.a.hp, hpB: state.b.hp,
      maxHpA: state.a.maxHp, maxHpB: state.b.maxHp,
    });

    if (def.hp <= 0) {
      events.push({
        type: 'ko', winner: who, loser: defender,
        finalHpA: state.a.hp, finalHpB: state.b.hp,
      });
      break;
    }
  }

  return events;
}

// Check if battle is over
function isOver(state) {
  return state.a.hp <= 0 || state.b.hp <= 0;
}

function getWinner(state) {
  if (state.a.hp <= 0 && state.b.hp <= 0) return 'draw';
  if (state.a.hp <= 0) return 'b';
  if (state.b.hp <= 0) return 'a';
  return null;
}

module.exports = { createBattleState, processTurn, isOver, getWinner };
