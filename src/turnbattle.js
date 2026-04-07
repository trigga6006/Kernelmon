// ═══════════════════════════════════════════════════════════════
// TURN-BASED BATTLE ENGINE
// Processes one turn at a time given both players' move choices.
// Returns events for that turn (damage, effects, etc.)
// Now with archetype passives and underdog balancing.
// ═══════════════════════════════════════════════════════════════

const { createRNG } = require('./rng');
const { getCombatModifiers, effectiveStat } = require('./balance');
const { normalizeBenchmarkProfile } = require('./benchmark');

// Card mode imports — lazy-loaded to avoid overhead in non-card battles
let _cardBalance = null;
function cardBalance() {
  if (!_cardBalance) _cardBalance = require('./cardbalance');
  return _cardBalance;
}

// Artifact imports — lazy-loaded
let _artifacts = null;
function artifacts() {
  if (!_artifacts) _artifacts = require('./artifacts');
  return _artifacts;
}

function cloneStateSlice(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function createBattleState(fighterA, fighterB, seed, options = {}) {
  const rng = createRNG(seed);
  const state = {
    rng,
    a: {
      ...fighterA.stats, hp: fighterA.stats.hp, maxHp: fighterA.stats.maxHp,
      stunned: false, debuffed: false,
      hardened: 0,       // turns of harden remaining
      dot: null,         // { damage, turns } damage-over-time
      cooldowns: {},     // { MOVE_NAME: turnsRemaining }
      archetype: fighterA.archetype?.name || 'DAEMON',
      benchmark: normalizeBenchmarkProfile(fighterA.benchmark),
      consecutiveAttacks: 0,
    },
    b: {
      ...fighterB.stats, hp: fighterB.stats.hp, maxHp: fighterB.stats.maxHp,
      stunned: false, debuffed: false,
      hardened: 0,
      dot: null,
      cooldowns: {},
      archetype: fighterB.archetype?.name || 'DAEMON',
      benchmark: normalizeBenchmarkProfile(fighterB.benchmark),
      consecutiveAttacks: 0,
    },
    turn: 0,
  };

  // Artifact extension — attach artifact data and init state
  const artMod = artifacts();
  if (fighterA.artifacts && Object.keys(fighterA.artifacts).length > 0) {
    state.a._artifacts = fighterA.artifacts;
    state.a._artifactState = artMod.getArtifactBattleState(fighterA.artifacts, rng);
    // Null Chassis HP bonus
    if (state.a._artifactState.hpBonusRatio) {
      const bonus = Math.round(state.a.maxHp * state.a._artifactState.hpBonusRatio);
      state.a.maxHp += bonus;
      state.a.hp += bonus;
    }
  }
  if (fighterB.artifacts && Object.keys(fighterB.artifacts).length > 0) {
    state.b._artifacts = fighterB.artifacts;
    state.b._artifactState = artMod.getArtifactBattleState(fighterB.artifacts, rng);
    if (state.b._artifactState.hpBonusRatio) {
      const bonus = Math.round(state.b.maxHp * state.b._artifactState.hpBonusRatio);
      state.b.maxHp += bonus;
      state.b.hp += bonus;
    }
  }
  // Root Overflow: copy stat from opponent (must happen after both are initialized)
  artMod.applyRootOverflow(state, 'a');
  artMod.applyRootOverflow(state, 'b');

  // Card mode extension — isolated from normal battles
  if (options.cardMode) {
    state.cardMode = true;
    state.a.cards = (options.cardsA || []).map(c => ({
      ...c, used: false, cooldown: 0,
    }));
    state.b.cards = (options.cardsB || []).map(c => ({
      ...c, used: false, cooldown: 0,
    }));
    // Card-specific state
    state.a._cardBoosts = [];
    state.a._cardDebuffs = [];
    state.a._shield = 0;
    state.a._invulnerable = 0;
    state.a._silenced = 0;
    state.b._cardBoosts = [];
    state.b._cardDebuffs = [];
    state.b._shield = 0;
    state.b._invulnerable = 0;
    state.b._silenced = 0;
  }

  return state;
}

// Process a single turn: both players chose a move
function processTurn(state, moveA, moveB) {
  const { rng } = state;
  state.turn++;
  const events = [];

  // ── Tick cooldowns for both fighters ──
  for (const fighter of [state.a, state.b]) {
    for (const name of Object.keys(fighter.cooldowns)) {
      fighter.cooldowns[name]--;
      if (fighter.cooldowns[name] <= 0) delete fighter.cooldowns[name];
    }
  }

  // ── Card mode: tick card boosts/debuffs/cooldowns ──
  if (state.cardMode) {
    const cb = cardBalance();
    cb.tickCardEffects(state.a);
    cb.tickCardEffects(state.b);
    // Check turn-start reactive triggers (e.g. adaptive_firmware every N turns)
    for (const who of ['a', 'b']) {
      const reactiveEvents = cb.checkReactiveCards(state, who, 'turn_start');
      events.push(...reactiveEvents);
    }
  }

  // ── Artifact turn-start triggers (Thermal Siphon, Kernel Panic self-dmg, etc.) ──
  for (const who of ['a', 'b']) {
    if (state[who]._artifacts) {
      const artEvents = artifacts().checkArtifactReactive(state, who, 'turn_start');
      events.push(...artEvents);
    }
  }

  // ── Apply DoT (damage over time) to both fighters ──
  for (const [who, fighter] of [['a', state.a], ['b', state.b]]) {
    if (fighter.dot && fighter.dot.turns > 0) {
      const dotDmg = fighter.dot.damage;
      fighter.hp = Math.max(1, fighter.hp - dotDmg);
      fighter.dot.turns--;
      if (fighter.dot.turns <= 0) fighter.dot = null;
      events.push({
        type: 'dot', who, turn: state.turn,
        damage: dotDmg, hpA: state.a.hp, hpB: state.b.hp,
      });
    }
    // Tick harden duration
    if (fighter.hardened > 0) fighter.hardened--;
  }

  // ── Passive heal per turn (archetype + artifact) ──
  // Computed early via getCombatModifiers so both sources contribute
  for (const [who, fighter] of [['a', state.a], ['b', state.b]]) {
    if (fighter.hp > 0 && fighter.hp < fighter.maxHp) {
      const oppWho = who === 'a' ? 'b' : 'a';
      const healCtx = {
        atkArchetype: fighter.archetype, defArchetype: state[oppWho].archetype,
        atk: fighter, def: state[oppWho], rng, turn: state.turn,
        consecutiveAttacks: fighter.consecutiveAttacks, move: null,
      };
      const healMods = getCombatModifiers(healCtx);
      if (healMods.healPerTurn > 0) {
        const heal = Math.min(healMods.healPerTurn, fighter.maxHp - fighter.hp);
        fighter.hp += heal;
        events.push({ type: 'heal_tick', who, turn: state.turn, amount: heal, hpA: state.a.hp, hpB: state.b.hp });
      }
    }
  }

  // Determine attack order by SPD (with archetype modifiers)
  // Card mode uses isolated balance layer; normal mode uses standard balance
  const getModsFn = state.cardMode ? cardBalance().getCardCombatModifiers : getCombatModifiers;
  const ctxA = {
    atkArchetype: state.a.archetype, defArchetype: state.b.archetype,
    atk: state.a, def: state.b, rng, turn: state.turn,
    consecutiveAttacks: state.a.consecutiveAttacks, move: moveA,
  };
  const ctxB = {
    atkArchetype: state.b.archetype, defArchetype: state.a.archetype,
    atk: state.b, def: state.a, rng, turn: state.turn,
    consecutiveAttacks: state.b.consecutiveAttacks, move: moveB,
  };
  const modsA = state.cardMode
    ? getModsFn(ctxA, state.a.cards || [], state.b.cards || [])
    : getModsFn(ctxA);
  const modsB = state.cardMode
    ? getModsFn(ctxB, state.b.cards || [], state.a.cards || [])
    : getModsFn(ctxB);

  const spdA = state.a.spd + (modsA.initiativeBonus || 0) - (modsA.spdPenalty || 0) + rng.int(-5, 5);
  const spdB = state.b.spd + (modsB.initiativeBonus || 0) - (modsB.spdPenalty || 0) + rng.int(-5, 5);
  const order = spdA >= spdB
    ? [{ who: 'a', move: moveA, atk: state.a, def: state.b, mods: modsA, defMods: modsB }]
    : [{ who: 'b', move: moveB, atk: state.b, def: state.a, mods: modsB, defMods: modsA }];
  // Second attacker
  order.push(order[0].who === 'a'
    ? { who: 'b', move: moveB, atk: state.b, def: state.a, mods: modsB, defMods: modsA }
    : { who: 'a', move: moveA, atk: state.a, def: state.b, mods: modsA, defMods: modsB }
  );

  for (const turn of order) {
    const { who, move, atk, def, mods, defMods } = turn;
    const defender = who === 'a' ? 'b' : 'a';

    if (def.hp <= 0) break;

    // Forfeited turn (null move) — skip entirely
    if (!move) continue;

    // Archetype skip chance (Overheat stall)
    if (mods.skipChance > 0 && rng.chance(mods.skipChance)) {
      events.push({ type: 'stall', who, turn: state.turn, passive: atk.archetype });
      atk.consecutiveAttacks = 0;
      // Card mode: stall triggers (thermal_throttle_guard)
      if (state.cardMode) {
        const stallEvents = cardBalance().checkReactiveCards(state, who, 'on_stall');
        events.push(...stallEvents);
      }
      continue;
    }

    // Stunned — skip turn (card mode / artifact may auto-cleanse)
    if (atk.stunned) {
      // Artifact: Failsafe Switch cleanse
      if (atk._artifacts) {
        const stunArtEvents = artifacts().checkArtifactReactive(state, who, 'on_stun');
        events.push(...stunArtEvents);
        if (!atk.stunned) {
          // Thermal Heart reset already handled inside checkArtifactReactive
          continue; // cleansed by artifact
        }
      }
      if (state.cardMode) {
        const stunEvents = cardBalance().checkReactiveCards(state, who, 'on_stun');
        events.push(...stunEvents);
        if (!atk.stunned) continue; // cleansed by card
      }
      events.push({ type: 'stunned', who, turn: state.turn });
      atk.stunned = false;
      atk.consecutiveAttacks = 0;
      continue;
    }

    // Heal move
    if (move.special === 'heal') {
      const healAmt = Math.round((atk[move.base] || atk.vit) * move.mult * rng.float(0.8, 1.2));
      atk.hp = Math.min(atk.maxHp, atk.hp + healAmt);
      atk.consecutiveAttacks = 0;
      // Set cooldown BEFORE continuing (otherwise heal moves skip it)
      if (move.cooldown && move.cooldown > 0) {
        atk.cooldowns[move.name] = move.cooldown;
      }
      events.push({
        type: 'heal', who, turn: state.turn,
        move: move.name, label: move.label, flavor: move.desc,
        amount: healAmt,
        hpA: state.a.hp, hpB: state.b.hp,
      });
      continue;
    }

    // Artifact: Bit Flip — temporarily swap STR↔MAG for this attack
    let _bitFlipRestoreStr = null;
    let _bitFlipRestoreMag = null;
    if (mods._bitFlipSwap) {
      _bitFlipRestoreStr = atk.str;
      _bitFlipRestoreMag = atk.mag;
      const tmp = atk.str;
      atk.str = atk.mag;
      atk.mag = tmp;
      events.push({ type: 'artifact_trigger', who, artifact: 'Bit Flip', effect: 'stat_swap', hpA: state.a.hp, hpB: state.b.hp });
    }

    // Damage calculation with balance modifiers
    let baseStat = effectiveStat(atk[move.base] || atk.str);
    if (move.altBase && atk[move.altBase]) {
      baseStat = Math.round(baseStat + effectiveStat(atk[move.altBase]) * 0.3);
    }

    // Variance (Sentinel overrides to tight range)
    const variance = mods.varianceOverride || [0.7, 1.3];
    let damage = Math.round(baseStat * move.mult * 1.8 * rng.float(variance[0], variance[1]));

    // Apply archetype damage multiplier + underdog flat damage
    damage = Math.round(damage * mods.damageMult) + (mods.flatDamage || 0);

    // Apply category effectiveness (physical/magic/speed vs defender archetype)
    const categoryMult = mods.categoryMult || 1.0;
    damage = Math.round(damage * categoryMult);

    // Defense reduction (with defender's passive defense bonus + harden)
    // Artifact: Kernel Panic — ignore defense on active turns
    if (mods._ignoreDefense) {
      // Skip defense entirely
      events.push({ type: 'artifact_trigger', who, artifact: 'Kernel Panic', effect: 'pierce_defense', hpA: state.a.hp, hpB: state.b.hp });
    } else {
      const defValue = effectiveStat(def.def);
      const hardenMult = def.hardened > 0 ? 1.4 : 1.0;
      const defReduction = defValue * rng.float(0.15, 0.35) * (defMods.defMult || 1) * hardenMult;
      damage = Math.max(1, Math.round(damage - defReduction));
    }

    if (atk.debuffed) {
      damage = Math.round(damage * 0.6);
      atk.debuffed = false;
    }

    // Crit (with archetype crit bonus)
    const critChance = Math.max(0, 0.05 + (atk.spd / 1000) + (mods.critBonus || 0));
    const isCrit = rng.chance(critChance);
    if (isCrit) {
      const critMultiplier = mods.critMult || 1.8;
      damage = Math.round(damage * critMultiplier);
    }

    // Dodge (with defender's archetype dodge bonus)
    const dodgeChance = Math.min(0.35, 0.03 + (def.spd / 1500) + (defMods.dodgeBonus || 0));
    const isDodge = rng.chance(dodgeChance);

    if (isDodge) {
      atk.consecutiveAttacks++;
      // Set cooldown even on dodge — the move was committed
      if (move.cooldown && move.cooldown > 0) {
        atk.cooldowns[move.name] = move.cooldown;
      }
      events.push({
        type: 'dodge', who: defender, attacker: who, turn: state.turn,
        move: move.name, label: move.label, flavor: move.desc,
        hpA: state.a.hp, hpB: state.b.hp,
      });
      // Artifact: Echo Buffer — defender gains damage stack on dodge
      if (def._artifacts) {
        const dodgeArtEvents = artifacts().checkArtifactReactive(state, defender, 'on_dodge');
        events.push(...dodgeArtEvents);
      }
      // Card mode: dodge triggers (counterstrike_matrix)
      if (state.cardMode) {
        const dodgeEvents = cardBalance().checkReactiveCards(state, defender, 'on_dodge');
        events.push(...dodgeEvents);
      }
      continue;
    }

    // Artifact: Null Pointer immunity — negate damage
    if (def._artifacts?.relic === 'null_pointer' && def._artifactState?.nullPointerImmune > 0) {
      damage = 0;
      events.push({ type: 'artifact_trigger', who: defender, artifact: 'Null Pointer', effect: 'immune', hpA: state.a.hp, hpB: state.b.hp });
    }

    // Card mode: shield blocks damage
    if (state.cardMode && def._shield > 0) {
      def._shield--;
      damage = 0;
      events.push({ type: 'card_shield', who: defender, turn: state.turn, hpA: state.a.hp, hpB: state.b.hp });
    }
    // Card mode: invulnerability negates damage
    if (state.cardMode && def._invulnerable > 0) {
      damage = 0;
      events.push({ type: 'card_invulnerable', who: defender, turn: state.turn, hpA: state.a.hp, hpB: state.b.hp });
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

    // Special effects
    let specialEffect = null;
    let resisted = false;
    if (move.special === 'stun' && rng.chance(0.6)) {
      def.stunned = true;
      specialEffect = 'stun';
    } else if (move.special === 'debuff') {
      const applyChance = Math.max(0.18, 1 - (defMods.statusResist || 0));
      if (rng.chance(applyChance)) {
        def.debuffed = true;
        specialEffect = 'debuff';
      } else {
        resisted = true;
      }
    } else if (move.special === 'pierce') {
      specialEffect = 'pierce';
    } else if (move.special === 'dot') {
      def.dot = { damage: Math.round(damage * 0.2), turns: 3 };
      specialEffect = 'dot';
    } else if (move.special === 'harden') {
      atk.hardened = 2;
      specialEffect = 'harden';
    }

    // Signature self-damage (Overclock Omega, VRAM Supernova, etc.)
    if (move.selfDamage && move.selfDamage > 0) {
      const sigSelfDmg = Math.round(atk.maxHp * move.selfDamage);
      atk.hp = Math.max(1, atk.hp - sigSelfDmg);
      selfDmg += sigSelfDmg;
    }

    // Set cooldown for the move if it has one
    if (move.cooldown && move.cooldown > 0) {
      atk.cooldowns[move.name] = move.cooldown;
    }

    // Determine category effectiveness label for UI
    let categoryEffect = null;
    if (categoryMult > 1.0) categoryEffect = 'super_effective';
    else if (categoryMult < 1.0) categoryEffect = 'not_effective';

    const attackEvent = {
      type: 'attack', who, target: defender, turn: state.turn,
      move: move.name, label: move.label, flavor: move.desc,
      category: move.cat, damage, isCrit, specialEffect, categoryEffect,
      hpA: state.a.hp, hpB: state.b.hp,
      maxHpA: state.a.maxHp, maxHpB: state.b.maxHp,
    };
    if (mods.fizzle) attackEvent.fizzle = true;
    if (resisted) attackEvent.resisted = true;
    if (selfDmg > 0) attackEvent.selfDamage = selfDmg;

    events.push(attackEvent);

    // ── Card mode: reactive triggers after damage ──
    if (state.cardMode && damage > 0) {
      const cb = cardBalance();
      const damageRatio = damage / def.maxHp;
      // Defender reactive triggers
      const defEvents = cb.checkReactiveCards(state, defender, 'after_damage', { damageRatio });
      events.push(...defEvents);
      if (isCrit) {
        const critEvents = cb.checkReactiveCards(state, defender, 'on_crit_received');
        events.push(...critEvents);
      }
      // Trap trigger: if defender has a trap set, attacker takes reflect damage + stun chance
      if (def._trap) {
        const reflectDmg = Math.round(atk.maxHp * def._trap.reflectDamage);
        atk.hp = Math.max(1, atk.hp - reflectDmg);
        if (Math.random() < def._trap.stunChance) atk.stunned = true;
        events.push({
          type: 'card_trigger', who: defender, card: 'Segfault Trap',
          cardType: 'reactive', subtype: 'counter', damage: reflectDmg,
          hpA: state.a.hp, hpB: state.b.hp,
        });
      }
    }

    // ── Artifact reactive triggers after damage ──
    if (damage > 0) {
      const artMod = artifacts();
      // Defender: hit received (Static Discharge charge, Deadlock Mirror reflect)
      if (def._artifacts) {
        const hitEvents = artMod.checkArtifactReactive(state, defender, 'on_hit_received', { damage });
        events.push(...hitEvents);
      }
      // Defender: crit received (Interrupt Handler counter)
      if (isCrit && def._artifacts) {
        const critEvents = artMod.checkArtifactReactive(state, defender, 'on_crit_received', { damage });
        events.push(...critEvents);
      }
      // Attacker: crit dealt (Silicon Furnace bonus)
      if (isCrit && atk._artifacts) {
        const critDealtEvents = artMod.checkArtifactReactive(state, who, 'on_crit_dealt', { damage });
        events.push(...critDealtEvents);
      }
      // Attacker: after damage dealt (Root Overflow cooldown reset, Static Discharge apply)
      if (atk._artifacts) {
        const afterDmgEvents = artMod.checkArtifactReactive(state, who, 'after_damage_dealt', { damage });
        events.push(...afterDmgEvents);
      }
      // Echo Buffer: consume stacks after dealing damage
      if (atk._artifacts && mods._consumeEchoBuffer) {
        artMod.checkArtifactReactive(state, who, 'after_attack');
      }
    }

    // Bit Flip: restore original stats
    if (_bitFlipRestoreStr !== null) {
      atk.str = _bitFlipRestoreStr;
      atk.mag = _bitFlipRestoreMag;
    }

    // ── Artifact: Parity Bomb — check HP equalization ──
    for (const w of ['a', 'b']) {
      if (state[w]._artifacts) {
        const lowHpEvents = artifacts().checkArtifactReactive(state, w, 'on_low_hp');
        events.push(...lowHpEvents);
      }
    }

    if (def.hp <= 0) {
      // Artifact: Null Pointer — survive lethal damage
      if (def._artifacts) {
        const lethalArtEvents = artifacts().checkArtifactReactive(state, defender, 'on_lethal');
        events.push(...lethalArtEvents);
        if (def.hp > 0) continue; // survived via artifact
      }
      // Card mode: check for revive/survive reactive triggers before KO
      if (state.cardMode) {
        const cb = cardBalance();
        const koEvents = cb.checkReactiveCards(state, defender, 'on_ko');
        events.push(...koEvents);
        // Also check lethal-prevention (causality_anchor)
        const lethalEvents = cb.checkReactiveCards(state, defender, 'on_lethal');
        events.push(...lethalEvents);
        // If defender was revived by a card, don't KO
        if (def.hp > 0) continue;
        // Check deadman's switch on the dying fighter
        const deathEvents = cb.checkReactiveCards(state, defender, 'on_ko');
        events.push(...deathEvents);
      }
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

function serializeBattleState(state) {
  return {
    turn: state.turn,
    rngState: typeof state.rng?.getState === 'function' ? state.rng.getState() : 0,
    a: cloneStateSlice(state.a),
    b: cloneStateSlice(state.b),
  };
}

function applyBattleStateSnapshot(state, snapshot) {
  if (!snapshot) return state;

  state.rng = createRNG(snapshot.rngState || 0);
  state.turn = snapshot.turn || 0;
  state.a = cloneStateSlice(snapshot.a) || state.a;
  state.b = cloneStateSlice(snapshot.b) || state.b;
  return state;
}

// ─── Card mode: activate an active card (passthrough to cardbalance) ───
function activateCard(state, who, cardIdx) {
  if (!state.cardMode) return null;
  const result = cardBalance().applyActiveCard(state, who, cardIdx);
  // Check opponent's reactive triggers for on_enemy_card (e.g. Trojan Horse)
  if (result) {
    const opponent = who === 'a' ? 'b' : 'a';
    const stealEvents = cardBalance().checkReactiveCards(state, opponent, 'on_enemy_card');
    if (stealEvents.length > 0) result._reactiveEvents = stealEvents;
  }
  return result;
}

module.exports = {
  createBattleState,
  processTurn,
  isOver,
  getWinner,
  serializeBattleState,
  applyBattleStateSnapshot,
  activateCard,
};
