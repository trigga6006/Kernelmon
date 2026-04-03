// Deterministic battle simulation engine
// Given two fighters + a shared seed, produces an array of timed events
// Now with archetype passives and underdog balancing.

const { createRNG } = require('./rng');
const { getCombatModifiers, effectiveStat } = require('./balance');

// Attack move pools — names reference actual hardware
const MOVES = {
  physical: [
    { name: 'CORE_DUMP', base: 'str', mult: 1.0, flavor: 'process.kill()' },
    { name: 'OVERCLOCK_SURGE', base: 'str', mult: 1.3, flavor: 'cpu.turbo(MAX)' },
    { name: 'THREAD_RIPPER', base: 'str', mult: 1.1, flavor: 'fork_bomb()' },
    { name: 'CACHE_SLAM', base: 'str', mult: 0.9, flavor: 'L3.flush(0xFF)' },
    { name: 'BRANCH_PREDICT', base: 'spd', mult: 1.0, flavor: 'specExec.run()' },
  ],
  magic: [
    { name: 'VRAM_OVERFLOW', base: 'mag', mult: 1.2, flavor: 'gpu.alloc(∞)' },
    { name: 'SHADER_STORM', base: 'mag', mult: 1.0, flavor: 'render.flood()' },
    { name: 'TENSOR_CRUSH', base: 'mag', mult: 1.4, flavor: 'cuda.launch(*)' },
    { name: 'PIXEL_BARRAGE', base: 'mag', mult: 0.8, flavor: 'gl.drawArrays()' },
    { name: 'RAY_TRACE_BEAM', base: 'mag', mult: 1.1, flavor: 'rt.intersect()' },
  ],
  speed: [
    { name: 'NVME_DASH', base: 'spd', mult: 1.0, flavor: 'io.read(0,∞)' },
    { name: 'DMA_STRIKE', base: 'spd', mult: 1.2, flavor: 'dma.transfer()' },
    { name: 'INTERRUPT_SPIKE', base: 'spd', mult: 0.9, flavor: 'IRQ.force(0)' },
  ],
  special: [
    { name: 'BLUE_SCREEN', base: 'str', mult: 1.6, flavor: 'STOP 0x0000007E', special: 'stun' },
    { name: 'KERNEL_PANIC', base: 'mag', mult: 1.5, flavor: 'panic("fatal")', special: 'stun' },
    { name: 'RAM_HEAL', base: 'vit', mult: 0.5, flavor: 'malloc(HP)', special: 'heal' },
    { name: 'THERMAL_THROTTLE', base: 'str', mult: 0.3, flavor: 'temp > TJ_MAX', special: 'debuff' },
    { name: 'QUANTUM_TUNNEL', base: 'spd', mult: 2.0, flavor: '??undefined??', special: 'pierce' },
  ],
};

function simulate(fighterA, fighterB, seed) {
  const rng = createRNG(seed);
  const events = [];
  let tick = 0;

  // Clone HP + archetype info
  const state = {
    a: {
      ...fighterA.stats, hp: fighterA.stats.hp, maxHp: fighterA.stats.maxHp,
      stunned: false, debuffed: false,
      archetype: fighterA.archetype?.name || 'DAEMON',
      consecutiveAttacks: 0,
    },
    b: {
      ...fighterB.stats, hp: fighterB.stats.hp, maxHp: fighterB.stats.maxHp,
      stunned: false, debuffed: false,
      archetype: fighterB.archetype?.name || 'DAEMON',
      consecutiveAttacks: 0,
    },
  };

  events.push({ tick: tick++, type: 'intro', a: fighterA, b: fighterB });

  // Battle rounds — typically 12-22 rounds
  let round = 0;
  const maxRounds = 50; // safety cap

  while (state.a.hp > 0 && state.b.hp > 0 && round < maxRounds) {
    round++;

    // Get combat modifiers for both fighters this round
    const modsA = getCombatModifiers({
      atkArchetype: state.a.archetype, defArchetype: state.b.archetype,
      atk: state.a, def: state.b, rng, turn: round,
      consecutiveAttacks: state.a.consecutiveAttacks, move: null,
    });
    const modsB = getCombatModifiers({
      atkArchetype: state.b.archetype, defArchetype: state.a.archetype,
      atk: state.b, def: state.a, rng, turn: round,
      consecutiveAttacks: state.b.consecutiveAttacks, move: null,
    });

    // Determine attack order by SPD (with archetype penalties)
    const spdA = state.a.spd - (modsA.spdPenalty || 0) + rng.int(-5, 5);
    const spdB = state.b.spd - (modsB.spdPenalty || 0) + rng.int(-5, 5);
    const order = spdA >= spdB ? ['a', 'b'] : ['b', 'a'];

    for (const attacker of order) {
      const defender = attacker === 'a' ? 'b' : 'a';
      const atk = state[attacker];
      const def = state[defender];
      const mods = attacker === 'a' ? modsA : modsB;
      const defMods = attacker === 'a' ? modsB : modsA;

      if (def.hp <= 0) break;

      // Archetype skip/stall chance
      if (mods.skipChance > 0 && rng.chance(mods.skipChance)) {
        events.push({ tick: tick++, type: 'stall', who: attacker, round, passive: atk.archetype });
        atk.consecutiveAttacks = 0;
        continue;
      }

      // Skip if stunned
      if (atk.stunned) {
        events.push({ tick: tick++, type: 'stunned', who: attacker, round });
        atk.stunned = false;
        atk.consecutiveAttacks = 0;
        continue;
      }

      // Pick move category
      let category;
      const roll = rng.next();
      if (roll < 0.08) {
        category = 'special';
      } else if (roll < 0.35) {
        category = 'magic';
      } else if (roll < 0.55) {
        category = 'speed';
      } else {
        category = 'physical';
      }

      const move = rng.pick(MOVES[category]);
      const baseStat = effectiveStat(atk[move.base] || atk.str);

      // Variance (archetype may override)
      const variance = mods.varianceOverride || [0.7, 1.3];
      let damage = Math.round(baseStat * move.mult * rng.float(variance[0], variance[1]));

      // Apply archetype damage multiplier + underdog flat damage
      damage = Math.round(damage * mods.damageMult) + (mods.flatDamage || 0);

      // Defense reduction (with defender's passive defense bonus)
      const defValue = effectiveStat(def.def);
      const defReduction = defValue * rng.float(0.15, 0.35) * (defMods.defMult || 1);
      damage = Math.max(1, Math.round(damage - defReduction));

      // Debuffed attacker does less
      if (atk.debuffed) {
        damage = Math.round(damage * 0.6);
        atk.debuffed = false;
      }

      // Critical hit chance (with archetype crit bonus)
      const critChance = Math.max(0, 0.05 + (atk.spd / 1000) + (mods.critBonus || 0));
      const isCrit = rng.chance(critChance);
      if (isCrit) {
        const critMultiplier = mods.critMult || 1.8;
        damage = Math.round(damage * critMultiplier);
      }

      // Dodge chance (with defender's archetype dodge bonus)
      const dodgeChance = Math.min(0.35, 0.03 + (def.spd / 1500) + (defMods.dodgeBonus || 0));
      const isDodge = rng.chance(dodgeChance);

      // Handle special effects
      let specialEffect = null;
      if (move.special === 'heal') {
        const healAmt = Math.round(baseStat * move.mult * rng.float(0.8, 1.2));
        atk.hp = Math.min(atk.maxHp, atk.hp + healAmt);
        atk.consecutiveAttacks = 0;
        events.push({
          tick: tick++, type: 'heal', who: attacker, round,
          move: move.name, flavor: move.flavor, amount: healAmt,
          hpA: state.a.hp, hpB: state.b.hp,
        });
        continue;
      }

      if (isDodge) {
        atk.consecutiveAttacks++;
        events.push({
          tick: tick++, type: 'dodge', who: defender, attacker, round,
          move: move.name, flavor: move.flavor,
          hpA: state.a.hp, hpB: state.b.hp,
        });
        continue;
      }

      // Apply damage
      def.hp = Math.max(0, def.hp - damage);
      atk.consecutiveAttacks++;

      // Self-damage on crit (Berserker instability)
      let selfDmg = 0;
      if (isCrit && mods.selfDamageOnCrit > 0 && rng.chance(mods.selfDamageOnCrit)) {
        selfDmg = Math.round(atk.maxHp * mods.selfDamageAmount);
        atk.hp = Math.max(1, atk.hp - selfDmg);
      }

      // Apply special effects
      if (move.special === 'stun' && rng.chance(0.6)) {
        def.stunned = true;
        specialEffect = 'stun';
      } else if (move.special === 'debuff') {
        def.debuffed = true;
        specialEffect = 'debuff';
      } else if (move.special === 'pierce') {
        specialEffect = 'pierce';
      }

      const attackEvent = {
        tick: tick++, type: 'attack', who: attacker, target: defender, round,
        move: move.name, flavor: move.flavor, category,
        damage, isCrit, specialEffect,
        hpA: state.a.hp, hpB: state.b.hp,
        maxHpA: state.a.maxHp, maxHpB: state.b.maxHp,
      };
      if (mods.fizzle) attackEvent.fizzle = true;
      if (selfDmg > 0) attackEvent.selfDamage = selfDmg;

      events.push(attackEvent);

      if (def.hp <= 0) break;
    }
  }

  // Determine winner
  let winner;
  if (state.a.hp <= 0 && state.b.hp <= 0) {
    winner = 'draw';
  } else if (state.a.hp <= 0) {
    winner = 'b';
  } else if (state.b.hp <= 0) {
    winner = 'a';
  } else {
    // Timeout — whoever has more HP% wins
    winner = (state.a.hp / state.a.maxHp) >= (state.b.hp / state.b.maxHp) ? 'a' : 'b';
  }

  events.push({
    tick: tick++, type: 'ko',
    winner,
    loser: winner === 'a' ? 'b' : (winner === 'b' ? 'a' : null),
    finalHpA: state.a.hp,
    finalHpB: state.b.hp,
  });

  events.push({ tick: tick++, type: 'victory', winner });

  return events;
}

module.exports = { simulate, MOVES };
