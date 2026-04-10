// ═══════════════════════════════════════════════════════════════
// CARD BALANCE — Isolated balance layer for Card Battle mode
// Wraps balance.js getCombatModifiers, does NOT modify it.
// All other modes are completely unaffected.
// ═══════════════════════════════════════════════════════════════

const { getCombatModifiers, effectiveStat } = require('./balance');

// ─── Card Mode Global Scaling ───
// Cards add so much power that base combat needs dampening
const CARD_BALANCE = {
  globalDamageMult: 0.85,      // -15% base damage (cards restore and exceed this)
  globalDefMult: 1.10,         // +10% defense (longer fights = more card decisions)
  critCap: 0.40,               // hard cap crit chance
  dodgeCap: 0.25,              // hard cap dodge chance
  activeCardCooldown: 2,       // minimum turns between active card uses
};

// ─── Apply passive card effects to combat modifiers ───

function applyPassiveCards(mods, cards) {
  for (const card of cards) {
    if (card.type !== 'passive' || card.used) continue;
    const eff = card.effect;
    if (!eff) continue;

    // Flat stat boosts: +X% to a stat (applied as damage/def modifier)
    if (eff.stat === 'str') mods.damageMult *= (1 + eff.value);
    if (eff.stat === 'mag') mods.damageMult *= (1 + eff.value * 0.8); // MAG cards slightly weaker for physical
    if (eff.stat === 'spd') mods.initiativeBonus = (mods.initiativeBonus || 0) + Math.round(eff.value * 50);
    if (eff.stat === 'def') mods.defMult *= (1 + eff.value);
    if (eff.stat === 'all') {
      mods.damageMult *= (1 + eff.value);
      mods.defMult *= (1 + eff.value * 0.8);
      mods.initiativeBonus = (mods.initiativeBonus || 0) + Math.round(eff.value * 30);
    }

    // Mechanic-based effects
    if (eff.mechanic === 'thermal_resist') {
      mods._thermalResist = (mods._thermalResist || 0) + eff.value;
    }
    if (eff.mechanic === 'variance_tighten') {
      mods._varianceTighten = (mods._varianceTighten || 0) + eff.value;
    }
    if (eff.mechanic === 'dodge_bonus') {
      mods.dodgeBonus = (mods.dodgeBonus || 0) + eff.value;
    }
    if (eff.mechanic === 'crit_bonus') {
      mods.critBonus = (mods.critBonus || 0) + (eff.mechValue || eff.value || 0);
    }
    if (eff.mechanic === 'stall_resist') {
      mods.skipChance *= (1 - (eff.mechValue || 0));
    }
    if (eff.mechanic === 'void_aura') {
      mods.damageMult *= (1 + (eff.damageMult || 0));
      mods.dodgeBonus += (eff.dodgeBonus || 0);
      mods._damageReduction = (mods._damageReduction || 0) + (eff.damageReduction || 0);
    }
    if (eff.mechanic === 'foresight') {
      mods._foresight = true;
    }

    // Variance tightening from card effect
    if (eff.varianceTighten) {
      mods._varianceTighten = (mods._varianceTighten || 0) + eff.varianceTighten;
    }

    // Penalties
    if (eff.penalty) {
      if (eff.penalty.stat === 'spd') mods.spdPenalty = (mods.spdPenalty || 0) + Math.round(eff.penalty.value * -50);
      if (eff.penalty.mechanic === 'vuln') mods._vulnerability = (mods._vulnerability || 0) + eff.penalty.value;
    }
  }

  // Apply variance tightening
  if (mods._varianceTighten) {
    const current = mods.varianceOverride || [0.7, 1.3];
    const tighten = mods._varianceTighten;
    mods.varianceOverride = [
      Math.min(current[0] + tighten, 0.95),
      Math.max(current[1] - tighten, 1.05),
    ];
  }

  return mods;
}

// ─── Main card-aware combat modifier function ───

function getCardCombatModifiers(ctx, myCards, oppCards) {
  // Start with base balance.js modifiers
  const mods = getCombatModifiers(ctx);

  // Apply card-mode global scaling
  mods.damageMult *= CARD_BALANCE.globalDamageMult;
  mods.defMult *= CARD_BALANCE.globalDefMult;

  // Apply passive card effects
  applyPassiveCards(mods, myCards || []);

  // Apply opponent passive damage reduction
  for (const card of (oppCards || [])) {
    if (card.type === 'passive' && card.effect?.mechanic === 'void_aura') {
      mods.damageMult *= (1 - (card.effect.damageReduction || 0));
    }
    if (card.type === 'passive' && card.effect?.penalty?.mechanic === 'vuln') {
      // Opponent vulnerability increases our damage
      mods.damageMult *= (1 + (card.effect.penalty.value || 0));
    }
  }

  // Enforce caps
  mods.critBonus = Math.min(mods.critBonus || 0, CARD_BALANCE.critCap);
  mods.dodgeBonus = Math.min(mods.dodgeBonus || 0, CARD_BALANCE.dodgeCap);

  return mods;
}

// ─── Check reactive card triggers ───
// Called after each attack, KO, stun, etc. Returns events to emit.

function checkReactiveCards(state, who, triggerType, triggerCtx = {}) {
  const fighter = state[who];
  const opponent = state[who === 'a' ? 'b' : 'a'];
  const cards = fighter.cards || [];
  const events = [];

  for (const card of cards) {
    if (card.type !== 'reactive') continue;
    if (card.used && card.effect.once) continue;
    const eff = card.effect;

    let triggered = false;

    switch (eff.trigger) {
      case 'hp_below':
        if (triggerType === 'after_damage' && fighter.hp / fighter.maxHp <= eff.threshold) {
          triggered = true;
        }
        break;
      case 'on_debuff':
        if (triggerType === 'on_debuff') triggered = true;
        break;
      case 'on_crit_received':
        if (triggerType === 'on_crit_received') triggered = true;
        break;
      case 'on_stun':
        if (triggerType === 'on_stun') triggered = true;
        break;
      case 'on_stall':
        if (triggerType === 'on_stall') triggered = true;
        break;
      case 'heavy_hit':
        if (triggerType === 'after_damage' && triggerCtx.damageRatio >= eff.threshold) {
          triggered = true;
        }
        break;
      case 'on_dodge':
        if (triggerType === 'on_dodge') triggered = true;
        break;
      case 'on_ko':
        if (triggerType === 'on_ko') triggered = true;
        break;
      case 'on_lethal':
        if (triggerType === 'on_lethal') triggered = true;
        break;
      case 'every_n_turns':
        if (triggerType === 'turn_start' && state.turn % eff.interval === 0) {
          triggered = true;
        }
        break;
      case 'battle_start':
        if (triggerType === 'battle_start') triggered = true;
        break;
      case 'hit_count':
        if (triggerType === 'after_damage') triggered = true;
        break;
      case 'on_enemy_card':
        if (triggerType === 'on_enemy_card') triggered = true;
        break;
    }

    if (!triggered) continue;

    // Apply the reactive effect
    const event = applyReactiveEffect(eff, fighter, opponent, card, who, state);
    if (event) {
      events.push(event);
      if (eff.once) card.used = true;
    }
  }

  return events;
}

function applyReactiveEffect(eff, fighter, opponent, card, who, state) {
  const event = { type: 'card_trigger', who, card: card.name, cardType: 'reactive' };

  switch (eff.action) {
    case 'heal': {
      const amt = Math.round(fighter.maxHp * eff.value);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + amt);
      event.subtype = 'heal';
      event.amount = amt;
      break;
    }
    case 'boost': {
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: eff.stat, value: eff.value, turns: eff.duration || 2 });
      event.subtype = 'boost';
      event.stat = eff.stat;
      event.value = eff.value;
      break;
    }
    case 'cleanse': {
      fighter.stunned = false;
      fighter.debuffed = false;
      event.subtype = 'cleanse';
      break;
    }
    case 'cleanse_and_boost': {
      fighter.stunned = false;
      fighter.debuffed = false;
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: eff.stat, value: eff.value, turns: eff.duration || 2 });
      event.subtype = 'cleanse_boost';
      event.stat = eff.stat;
      event.value = eff.value;
      break;
    }
    case 'reflect': {
      const reflectDmg = Math.round((opponent.hp || 0) * eff.value * 0.5);
      opponent.hp = Math.max(1, opponent.hp - reflectDmg);
      event.subtype = 'reflect';
      event.damage = reflectDmg;
      break;
    }
    case 'boost_next_attack': {
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: 'str', value: eff.value, turns: 1, nextAttackOnly: true });
      event.subtype = 'boost_next';
      event.value = eff.value;
      break;
    }
    case 'damage': {
      const dmg = Math.round(fighter.maxHp * eff.value);
      opponent.hp = Math.max(0, opponent.hp - dmg);
      event.subtype = 'damage';
      event.damage = dmg;
      break;
    }
    case 'revive': {
      fighter.hp = Math.round(fighter.maxHp * eff.value);
      fighter.stunned = false;
      fighter.debuffed = false;
      event.subtype = 'revive';
      event.hp = fighter.hp;
      break;
    }
    case 'rewind': {
      fighter.hp = Math.round(fighter.maxHp * eff.value);
      fighter.stunned = false;
      fighter.debuffed = false;
      fighter.dot = null;
      fighter.hardened = 0;
      if (fighter._cardBoosts) fighter._cardBoosts = [];
      event.subtype = 'rewind';
      event.hp = fighter.hp;
      break;
    }
    case 'invulnerable': {
      fighter._invulnerable = eff.duration || 1;
      event.subtype = 'invulnerable';
      break;
    }
    case 'survive': {
      fighter.hp = eff.value;
      event.subtype = 'survive';
      break;
    }
    case 'counter': {
      const counterDmg = Math.round(effectiveStat(fighter.str || 50) * eff.value);
      opponent.hp = Math.max(1, opponent.hp - counterDmg);
      event.subtype = 'counter';
      event.damage = counterDmg;
      break;
    }
    case 'debuff_all': {
      if (!opponent._cardDebuffs) opponent._cardDebuffs = [];
      opponent._cardDebuffs.push({ stat: 'all', value: eff.value, turns: eff.duration || 2 });
      event.subtype = 'debuff_all';
      event.value = eff.value;
      break;
    }
    case 'mega_boost': {
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: 'all', value: eff.value, turns: eff.duration || 5 });
      event.subtype = 'mega_boost';
      event.value = eff.value;
      break;
    }
    case 'resist_heal': {
      // Resist the stun + heal a bit
      if (Math.random() < (eff.resistChance || 0.4)) {
        fighter.stunned = false;
        const amt = Math.round(fighter.maxHp * (eff.healValue || 0.05));
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + amt);
        event.subtype = 'heal';
        event.amount = amt;
      } else {
        return null; // didn't resist
      }
      break;
    }
    case 'strip_buff': {
      // Remove opponent's strongest buff
      if (opponent._cardBoosts && opponent._cardBoosts.length > 0) {
        let bestIdx = 0;
        for (let i = 1; i < opponent._cardBoosts.length; i++) {
          if (opponent._cardBoosts[i].value > opponent._cardBoosts[bestIdx].value) bestIdx = i;
        }
        opponent._cardBoosts.splice(bestIdx, 1);
        event.subtype = 'cleanse';
      } else {
        return null; // nothing to strip
      }
      break;
    }
    case 'release_damage': {
      // Track accumulated damage taken, release it after N hits
      if (!fighter._accumulatedHits) fighter._accumulatedHits = 0;
      if (!fighter._accumulatedDmg) fighter._accumulatedDmg = 0;
      fighter._accumulatedHits++;
      fighter._accumulatedDmg += (state._lastDamage || 0);
      if (fighter._accumulatedHits >= (eff.hitThreshold || 4)) {
        const releaseDmg = Math.round(fighter._accumulatedDmg * (eff.releaseRatio || 0.25));
        opponent.hp = Math.max(1, opponent.hp - releaseDmg);
        fighter._accumulatedHits = 0;
        fighter._accumulatedDmg = 0;
        event.subtype = 'counter';
        event.damage = releaseDmg;
      } else {
        return null; // still accumulating
      }
      break;
    }
    case 'steal_effect': {
      // Steal opponent's most recent buff
      if (opponent._cardBoosts && opponent._cardBoosts.length > 0) {
        const stolen = opponent._cardBoosts.pop();
        if (!fighter._cardBoosts) fighter._cardBoosts = [];
        fighter._cardBoosts.push({ ...stolen });
        event.subtype = 'boost';
        event.stat = stolen.stat;
        event.value = stolen.value;
      } else {
        return null; // nothing to steal
      }
      break;
    }
    default:
      return null;
  }

  event.hpA = state.a.hp;
  event.hpB = state.b.hp;
  return event;
}

// ─── Apply active card effect ───
// Called when player manually activates a card during their turn.

function applyActiveCard(state, who, cardIdx) {
  const fighter = state[who];
  const opponent = state[who === 'a' ? 'b' : 'a'];
  const card = fighter.cards[cardIdx];
  if (!card || card.type !== 'active') return null;
  if (card.cooldown > 0) return null;

  const eff = card.effect;
  const event = { type: 'card_activate', who, card: card.name, cardType: 'active' };

  switch (eff.action) {
    case 'heal': {
      const amt = Math.round(fighter.maxHp * eff.value);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + amt);
      event.subtype = 'heal';
      event.amount = amt;
      break;
    }
    case 'boost': {
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: eff.stat, value: eff.value, turns: eff.duration || 2 });
      event.subtype = 'boost';
      event.stat = eff.stat;
      event.value = eff.value;
      break;
    }
    case 'boost_recoil': {
      if (!fighter._cardBoosts) fighter._cardBoosts = [];
      fighter._cardBoosts.push({ stat: eff.stat, value: eff.value, turns: eff.duration || 2, recoil: eff.recoil });
      event.subtype = 'boost_recoil';
      event.stat = eff.stat;
      event.value = eff.value;
      break;
    }
    case 'cleanse': {
      fighter.debuffed = false;
      event.subtype = 'cleanse';
      break;
    }
    case 'cleanse_all': {
      fighter.stunned = false;
      fighter.debuffed = false;
      fighter.dot = null;
      if (eff.healValue) {
        const amt = Math.round(fighter.maxHp * eff.healValue);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + amt);
        event.amount = amt;
      }
      event.subtype = 'cleanse_all';
      break;
    }
    case 'damage_stun': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      if (Math.random() < eff.stunChance) opponent.stunned = true;
      event.subtype = 'damage_stun';
      event.damage = dmg;
      break;
    }
    case 'heal_debuff': {
      const heal = Math.round(fighter.maxHp * eff.healValue);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + heal);
      if (!fighter._cardDebuffs) fighter._cardDebuffs = [];
      fighter._cardDebuffs.push({ stat: eff.debuffStat, value: eff.debuffValue, turns: eff.debuffDuration || 2 });
      event.subtype = 'heal_debuff';
      event.amount = heal;
      break;
    }
    case 'enemy_debuff': {
      if (!opponent._cardDebuffs) opponent._cardDebuffs = [];
      opponent._cardDebuffs.push({ stat: eff.stat, value: eff.value, turns: eff.duration || 3 });
      event.subtype = 'enemy_debuff';
      event.stat = eff.stat;
      event.value = eff.value;
      break;
    }
    case 'damage_debuff_all': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      if (!opponent._cardDebuffs) opponent._cardDebuffs = [];
      opponent._cardDebuffs.push({ stat: 'all', value: eff.debuffValue, turns: eff.debuffDuration || 2 });
      event.subtype = 'nuke';
      event.damage = dmg;
      break;
    }
    case 'shield': {
      fighter._shield = (fighter._shield || 0) + (eff.charges || 1);
      event.subtype = 'shield';
      event.charges = eff.charges;
      break;
    }
    case 'nuke': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      if (Math.random() < (eff.stunChance || 0)) opponent.stunned = true;
      if (!opponent._cardDebuffs) opponent._cardDebuffs = [];
      opponent._cardDebuffs.push({ stat: 'all', value: eff.debuffValue, turns: eff.debuffDuration || 2 });
      event.subtype = 'nuke';
      event.damage = dmg;
      break;
    }
    case 'blackout': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      if (Math.random() < (eff.stunChance || 0)) opponent.stunned = true;
      opponent._silenced = (eff.silenceDuration || 3);
      event.subtype = 'blackout';
      event.damage = dmg;
      break;
    }
    case 'apocalypse': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      opponent._silenced = (eff.silenceDuration || 3);
      if (!opponent._cardDebuffs) opponent._cardDebuffs = [];
      opponent._cardDebuffs.push({ stat: 'all', value: eff.debuffValue, turns: eff.debuffDuration || 3 });
      event.subtype = 'apocalypse';
      event.damage = dmg;
      break;
    }
    case 'drain': {
      const dmg = Math.round(opponent.maxHp * eff.damage);
      opponent.hp = Math.max(1, opponent.hp - dmg);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + dmg);
      event.subtype = 'drain';
      event.damage = dmg;
      event.amount = dmg;
      break;
    }
    case 'set_trap': {
      fighter._trap = {
        reflectDamage: eff.reflectDamage || 0.3,
        stunChance: eff.stunChance || 0.5,
        turns: eff.trapDuration || 3,
      };
      event.subtype = 'set_trap';
      break;
    }
    case 'multi_hit': {
      let totalDmg = 0;
      const hits = eff.hits || 3;
      for (let i = 0; i < hits; i++) {
        const dmg = Math.round(opponent.maxHp * eff.damage);
        opponent.hp = Math.max(1, opponent.hp - dmg);
        totalDmg += dmg;
        if (Math.random() < (eff.stunChance || 0)) opponent.stunned = true;
      }
      event.subtype = 'multi_hit';
      event.damage = totalDmg;
      event.hits = hits;
      break;
    }
    case 'hp_swap': {
      const myPct = fighter.hp / fighter.maxHp;
      const oppPct = opponent.hp / opponent.maxHp;
      fighter.hp = Math.max(1, Math.round(fighter.maxHp * oppPct));
      opponent.hp = Math.max(1, Math.round(opponent.maxHp * myPct));
      event.subtype = 'hp_swap';
      break;
    }
    case 'reset': {
      const hpVal = Math.round(fighter.maxHp * eff.hpValue);
      fighter.hp = hpVal;
      opponent.hp = Math.round(opponent.maxHp * eff.hpValue);
      fighter.stunned = false; fighter.debuffed = false; fighter.dot = null;
      opponent.stunned = false; opponent.debuffed = false; opponent.dot = null;
      fighter._cardBoosts = []; fighter._cardDebuffs = [];
      opponent._cardBoosts = []; opponent._cardDebuffs = [];
      event.subtype = 'reset';
      break;
    }
    default:
      return null;
  }

  // Set cooldown
  card.cooldown = eff.cooldown || CARD_BALANCE.activeCardCooldown;

  event.hpA = state.a.hp;
  event.hpB = state.b.hp;
  return event;
}

// ─── Tick card boosts/debuffs each turn ───

function tickCardEffects(fighter) {
  // Tick boosts
  if (fighter._cardBoosts) {
    for (const b of fighter._cardBoosts) b.turns--;
    // Apply recoil when boost expires
    for (const b of fighter._cardBoosts) {
      if (b.turns <= 0 && b.recoil) {
        const recoilDmg = Math.round(fighter.maxHp * b.recoil);
        fighter.hp = Math.max(1, fighter.hp - recoilDmg);
      }
    }
    fighter._cardBoosts = fighter._cardBoosts.filter(b => b.turns > 0);
  }
  // Tick debuffs
  if (fighter._cardDebuffs) {
    for (const d of fighter._cardDebuffs) d.turns--;
    fighter._cardDebuffs = fighter._cardDebuffs.filter(d => d.turns > 0);
  }
  // Tick invulnerability
  if (fighter._invulnerable > 0) fighter._invulnerable--;
  // Tick silence
  if (fighter._silenced > 0) fighter._silenced--;
  // Tick trap
  if (fighter._trap) {
    fighter._trap.turns--;
    if (fighter._trap.turns <= 0) fighter._trap = null;
  }
  // Tick card cooldowns
  if (fighter.cards) {
    for (const c of fighter.cards) {
      if (c.cooldown > 0) c.cooldown--;
    }
  }
}

// ─── Get effective stat boost from cards ───

function getCardStatBoost(fighter, statName) {
  let bonus = 0;
  if (fighter._cardBoosts) {
    for (const b of fighter._cardBoosts) {
      if (b.stat === statName || b.stat === 'all') bonus += b.value;
    }
  }
  if (fighter._cardDebuffs) {
    for (const d of fighter._cardDebuffs) {
      if (d.stat === statName || d.stat === 'all') bonus -= d.value;
    }
  }
  return bonus;
}

module.exports = {
  CARD_BALANCE,
  getCardCombatModifiers,
  checkReactiveCards,
  applyActiveCard,
  tickCardEffects,
  getCardStatBoost,
};
