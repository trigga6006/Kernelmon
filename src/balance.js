// ═══════════════════════════════════════════════════════════════
// BALANCE — Asymmetric archetype passives + underdog mechanics
// Better hardware = different advantages, not universal dominance
// ═══════════════════════════════════════════════════════════════

// ─── Archetype passives ───
// Each returns modifiers applied during battle. Called per-attack.
//
// ctx = { atk, def, rng, turn, consecutiveAttacks, hpRatio, move }
// Returns: { damageMult, critBonus, dodgeBonus, selfDamage, skipChance, defMult, healBonus }

const { getBenchmarkCombatModifiers } = require('./benchmark');

const PASSIVES = {
  // APEX — Omniscience: consistent godlike output with passive regen
  // No weakness, no variance — pure overwhelming superiority
  KERNEL_GOD: {
    name: 'Omniscience',
    desc: 'Operates beyond mortal limits — steady damage, passive regen, unshakeable',
    apply(ctx) {
      return {
        damageMult: 1.18,
        critBonus: 0.05,
        defMult: 1.10,
        healPerTurn: Math.round(ctx.atk.maxHp * 0.015), // 1.5% maxHP regen per turn
        varianceOverride: [0.9, 1.1], // very consistent output
      };
    },
  },

  // TITAN — Overheat: raw power but consecutive attacks risk stalling
  // Burst damage is massive, but sustained fighting gets unreliable
  ROOT_GOD: {
    name: 'Overheat',
    desc: 'Massive burst power, but consecutive attacks risk thermal stall',
    apply(ctx) {
      const mods = { damageMult: 1.15 }; // baseline damage bonus
      // Each consecutive attack increases stall chance (CPU can't sustain max turbo)
      if (ctx.consecutiveAttacks > 2) {
        mods.skipChance = Math.min(0.25, (ctx.consecutiveAttacks - 2) * 0.08);
      }
      return mods;
    },
  },

  // HIVEMIND — Thread Saturation: multi-threaded power but sluggish
  // Raw damage bonus but always acts second (speed penalty)
  FORK_BOMB: {
    name: 'Thread Saturation',
    desc: 'Parallel processing power, but thread overhead slows response',
    apply(ctx) {
      return {
        damageMult: 1.12,
        spdPenalty: 12, // flat SPD reduction for turn order
      };
    },
  },

  // ARCMAGE — Shader Burnout: GPU magic is devastating but inconsistent
  // High ceiling, low floor. Massive crits but chance to fizzle
  SHADER_WITCH: {
    name: 'Shader Burnout',
    desc: 'Devastating magic but unstable — big crits or total fizzle',
    apply(ctx) {
      const mods = { critBonus: 0.08 }; // higher crit chance
      // 12% chance the shader pipeline stalls — attack does half damage
      if (ctx.rng.chance(0.12)) {
        mods.damageMult = 0.5;
        mods.fizzle = true;
      } else {
        mods.critMult = 2.2; // crits hit HARDER than normal (1.8 → 2.2)
      }
      return mods;
    },
  },

  // BLITZ — First Strike: dominant early, fading over time
  // Turn 1 is devastating, but advantage erodes each round
  ZERO_DAY: {
    name: 'Zero-Day Exploit',
    desc: 'Devastating first strike, but the exploit gets patched over time',
    apply(ctx) {
      // Turn 1: +50%, Turn 2: +30%, Turn 3: +15%, Turn 4+: normal
      const bonus = Math.max(0, 0.5 - (ctx.turn - 1) * 0.15);
      return { damageMult: 1 + bonus };
    },
  },

  // FORTRESS — Memory Wall: takes and deals reduced damage. Outlasts.
  // Pure tank. Wins by attrition.
  MALLOC_WALL: {
    name: 'Memory Wall',
    desc: 'Absorbs punishment at the cost of offensive output',
    apply(ctx) {
      return {
        damageMult: 0.85,  // deals less
        defMult: 1.35,     // takes much less
      };
    },
  },

  // BERSERKER — Overclock Instability: high risk high reward
  // Huge damage but crits can backfire with self-damage
  STACK_SMASHER: {
    name: 'Overclock Instability',
    desc: 'Overvolted for massive damage, but crits risk self-harm',
    apply(ctx) {
      const mods = {
        damageMult: 1.2,
        critBonus: 0.05,
      };
      // If this attack crits, 30% chance of self-damage (buffer overflow)
      mods.selfDamageOnCrit = 0.30;
      mods.selfDamageAmount = 0.08; // 8% of own max HP
      return mods;
    },
  },

  // PHANTOM — Low Profile: evasion tank, dodge-based survival
  // Hard to hit but fragile when hit
  GHOST_PROC: {
    name: 'Low Profile',
    desc: 'Nearly invisible — high evasion but vulnerable when caught',
    apply(ctx) {
      return {
        dodgeBonus: 0.12,    // big flat dodge bonus
        damageMult: 0.92,    // slightly less damage
      };
    },
  },

  // NOMAD — Adaptive Throttle: starts weak, gets stronger each turn
  // The classic comeback mechanic for laptops
  SSH_DRIFTER: {
    name: 'Adaptive Throttle',
    desc: 'Thermal adaptation — gets stronger the longer the fight goes',
    apply(ctx) {
      // Ramp: turn 1-2 slightly weak, then scales up steadily
      const ramp = Math.min(0.20, Math.max(-0.05, (ctx.turn - 3) * 0.04));
      return {
        damageMult: 1 + ramp,
        dodgeBonus: 0.04,    // mobile platform evasion (was 0.06)
        critBonus: Math.min(0.05, ctx.turn * 0.006), // slow crit build
      };
    },
  },

  // SCRAPPER — Survival Instinct: fights harder when low HP
  // Noticeable comeback, but not enough to overcome a massive stat gap alone
  SEG_FAULT: {
    name: 'Survival Instinct',
    desc: 'Shouldn\'t be running, but fights hardest when near death',
    apply(ctx) {
      const mods = {};
      if (ctx.hpRatio < 0.25) {
        // Below 25%: desperate — strong but not invincible
        mods.damageMult = 1.35;
        mods.critBonus = 0.10;
        mods.dodgeBonus = 0.06;
        mods.critMult = 2.0;
      } else if (ctx.hpRatio < 0.50) {
        // Below 50%: warming up
        mods.damageMult = 1.15;
        mods.critBonus = 0.05;
        mods.dodgeBonus = 0.03;
      } else {
        // Above 50%: slight baseline toughness
        mods.dodgeBonus = 0.02;
      }
      return mods;
    },
  },

  // SENTINEL — Watchdog: consistency. Reduced variance = reliability.
  // No big crits, no big misses. Predictable and steady.
  DAEMON: {
    name: 'Watchdog Process',
    desc: 'Consistent and reliable — no peaks, no valleys, just steady output',
    apply(ctx) {
      return {
        varianceOverride: [0.9, 1.1], // tighter damage range (default 0.7-1.3)
        critBonus: -0.02,              // slightly less crit chance
        dodgeBonus: 0.03,              // slight dodge from reliability
      };
    },
  },
};

// ─── Underdog scaling ───
// When one fighter's stat average is significantly lower, they get compensating bonuses.
// This prevents dominant hardware from being a guaranteed win.

function calcUnderdogBonus(atkStats, defStats) {
  const atkAvg = (atkStats.str + atkStats.mag + atkStats.spd + (atkStats.def || 0)) / 4;
  const defAvg = (defStats.str + defStats.mag + defStats.spd + (defStats.def || 0)) / 4;

  const gap = defAvg - atkAvg; // positive = attacker is weaker
  if (gap <= 15) return null;  // no bonus unless meaningfully weaker

  // Moderate scaling — underdog should be competitive, not favored.
  // Cap at 50 stat gap.
  const scale = Math.min(gap, 50) / 50;

  return {
    damageMult: 1 + scale * 0.22,     // up to +22% damage (was +40%)
    flatDamage: Math.round(scale * 10),// up to +10 flat damage (was +25)
    critBonus: scale * 0.06,           // up to +6% crit chance (was +15%)
    dodgeBonus: scale * 0.04,          // up to +4% dodge (was +10%)
    defMult: 1 + scale * 0.18,        // up to +18% damage reduction (was +35%)
  };
}

// ─── Diminishing returns on raw stat power ───
// Prevents ultra-high stats from being proportionally dominant.
// Stats 0-60: linear. 60-80: reduced. 80-100: heavily reduced.

function effectiveStat(raw) {
  if (raw <= 50) return raw;
  if (raw <= 70) return 50 + (raw - 50) * 0.65;  // 65% efficiency
  return 50 + 20 * 0.65 + (raw - 70) * 0.35;     // 35% efficiency above 70
}

// ─── Main combat modifier function ───
// Called once per attack. Returns combined modifiers from passive + underdog.

function getCombatModifiers(ctx) {
  const { atkArchetype, defArchetype, atk, def, rng, turn, consecutiveAttacks, move } = ctx;
  const hpRatio = atk.hp / atk.maxHp;

  // Get archetype passive
  const passive = PASSIVES[atkArchetype];
  const passiveMods = passive
    ? passive.apply({ atk, def, rng, turn, consecutiveAttacks, hpRatio, move })
    : {};

  // Get underdog bonus + live benchmark layer
  const underdogMods = calcUnderdogBonus(atk, def) || {};
  const benchmarkMods = getBenchmarkCombatModifiers(atk.benchmark, turn, move) || {};

  // Combine multiplicatively for damage/def, additively for crit/dodge
  return {
    damageMult: (passiveMods.damageMult || 1) * (underdogMods.damageMult || 1) * (benchmarkMods.damageMult || 1),
    flatDamage: (passiveMods.flatDamage || 0) + (underdogMods.flatDamage || 0),
    defMult: (passiveMods.defMult || 1) * (underdogMods.defMult || 1),
    critBonus: (passiveMods.critBonus || 0) + (underdogMods.critBonus || 0) + (benchmarkMods.critBonus || 0),
    critMult: passiveMods.critMult || null,  // override crit multiplier if set
    dodgeBonus: (passiveMods.dodgeBonus || 0) + (underdogMods.dodgeBonus || 0) + (benchmarkMods.dodgeBonus || 0),
    skipChance: Math.max(0, (passiveMods.skipChance || 0) * (benchmarkMods.skipChanceMult || 1)),
    spdPenalty: passiveMods.spdPenalty || 0,
    initiativeBonus: benchmarkMods.initiativeBonus || 0,
    statusResist: benchmarkMods.statusResist || 0,
    selfDamageOnCrit: passiveMods.selfDamageOnCrit || 0,
    selfDamageAmount: passiveMods.selfDamageAmount || 0,
    varianceOverride: passiveMods.varianceOverride || null,
    fizzle: passiveMods.fizzle || false,
    healBonus: passiveMods.healBonus || 0,
    healPerTurn: passiveMods.healPerTurn || 0,
  };
}

// Get passive info for display (profile, pre-battle)
function getPassiveInfo(archetypeName) {
  const p = PASSIVES[archetypeName];
  if (!p) return null;
  return { name: p.name, desc: p.desc };
}

module.exports = { getCombatModifiers, effectiveStat, calcUnderdogBonus, getPassiveInfo, PASSIVES };
