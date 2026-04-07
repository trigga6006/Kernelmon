// ═══════════════════════════════════════════════════════════════
// ARTIFACTS — Fictional equipment: Core, Module, Relic
// Buy/unlock only. Passive battle modifiers with floating visuals.
// Core = build-defining passive, Module = tactical utility,
// Relic = rule-bending chaos.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const ARTIFACTS_FILE = path.join(WSO_DIR, 'artifacts.json');
const BUILD_FILE = path.join(WSO_DIR, 'build.json');

// ─── Slot definitions ───

const ARTIFACT_SLOTS = ['core', 'module', 'relic'];

const ARTIFACT_SLOT_LABELS = {
  core:   'CORE',
  module: 'MODULE',
  relic:  'RELIC',
};

const ARTIFACT_SLOT_ICONS = {
  core:   '⬡',
  module: '◎',
  relic:  '☍',
};

const ARTIFACT_SLOT_COLORS = {
  core:   '\x1b[38;2;240;200;80m',    // warm gold
  module: '\x1b[38;2;80;200;220m',    // cool cyan
  relic:  '\x1b[38;2;160;60;220m',    // deep violet
};

const ARTIFACT_SLOT_COLORS_RGB = {
  core:   [240, 200, 80],
  module: [80, 200, 220],
  relic:  [160, 60, 220],
};

// ─── Rarity (reuse parts system tiers) ───

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'transcendent'];

const RARITY_COLORS = {
  common:        '\x1b[38;2;160;165;180m',
  uncommon:      '\x1b[38;2;140;230;180m',
  rare:          '\x1b[38;2;140;190;250m',
  epic:          '\x1b[38;2;200;170;240m',
  legendary:     '\x1b[38;2;240;220;140m',
  mythic:        '\x1b[38;2;255;100;100m',
  transcendent:  '\x1b[38;2;200;120;255m',
};

const RARITY_ICONS = {
  common: '·', uncommon: '◇', rare: '◆', epic: '★', legendary: '✦', mythic: '⚡', transcendent: '✧',
};

// ─── Sell prices ───

const SELL_PRICES = {
  common:       20,
  uncommon:     45,
  rare:        100,
  epic:        220,
  legendary:   550,
  mythic:     1500,
  transcendent: 3500,
};

// ═══════════════════════════════════════════════════════════════
// ARTIFACT CATALOG — 18 artifacts (6 per slot)
// ═══════════════════════════════════════════════════════════════

const ARTIFACTS = {

  // ──────────────────────────────────────
  // CORES — Build-defining passives
  // ──────────────────────────────────────

  iron_lattice: {
    slot: 'core',
    rarity: 'common',
    name: 'Iron Lattice',
    icon: '⬡',
    desc: 'Rigid crystalline frame. Brute force, nothing fancy.',
    flavor: 'struct { uint64_t power; } __attribute__((packed));',
    dropWeight: 25,
    effect: {
      type: 'passive',
      damageMult: 1.08,   // +8% STR-based damage (applied when move.base === 'str')
      defMult: 1.05,      // +5% DEF
      strOnly: true,       // damage bonus only applies to STR moves
    },
  },

  flux_capacitor: {
    slot: 'core',
    rarity: 'common',
    name: 'Flux Capacitor',
    icon: '⬡',
    desc: 'Stabilizes energy flow for consistent, reliable output.',
    flavor: 'signal(SIGBUS, SIG_IGN); // variance? what variance?',
    dropWeight: 25,
    effect: {
      type: 'passive',
      damageMult: 1.03,           // +3% all damage
      varianceOverride: [0.85, 1.15],  // tighter variance
    },
  },

  thermal_heart: {
    slot: 'core',
    rarity: 'uncommon',
    name: 'Thermal Heart',
    icon: '⬡',
    desc: 'Pulsing reactor that heats up over time. Resets on stun.',
    flavor: 'while(temp++ < THERMAL_MAX) boost(dmg);',
    dropWeight: 16,
    effect: {
      type: 'scaling',
      damagePerTurn: 0.04,  // +4% per turn
      maxStacks: 5,         // caps at +20%
      resetOnStun: true,
    },
  },

  null_chassis: {
    slot: 'core',
    rarity: 'rare',
    name: 'Null Chassis',
    icon: '⬡',
    desc: 'Emptiness is armor. Strips excess to harden what remains.',
    flavor: 'memset(attack_surface, 0x00, sizeof(ego));',
    dropWeight: 7,
    effect: {
      type: 'passive',
      defMult: 1.18,       // +18% DEF
      hpBonus: 0.08,       // +8% max HP at battle start
      damageMult: 0.95,    // -5% damage dealt
    },
  },

  silicon_furnace: {
    slot: 'core',
    rarity: 'epic',
    name: 'Silicon Furnace',
    icon: '⬡',
    desc: 'Superheated silicon. Burns brighter, burns hotter.',
    flavor: 'if (crit) target.hp -= target.maxHp * 0.05; // lol',
    dropWeight: 3,
    effect: {
      type: 'passive',
      damageMult: 1.15,    // +15% damage
      critBonus: 0.04,     // +4% crit chance
      critBonusDamage: 0.05, // on crit: 5% of target maxHP as bonus
    },
  },

  eigenstate_matrix: {
    slot: 'core',
    rarity: 'legendary',
    name: 'Eigenstate Matrix',
    icon: '⬡',
    desc: 'Exists in multiple configurations simultaneously.',
    flavor: 'quantum_state = observe(superposition); // collapses on battle start',
    dropWeight: 0.8,
    effect: {
      type: 'eigenstate',
      profiles: [
        { damageMult: 1.22 },                                    // A: +22% damage
        { defMult: 1.25, dodgeBonus: 0.06 },                     // B: +25% DEF, +6% dodge
        { damageMult: 1.12, healPerTurn: 0.02 },                 // C: +12% dmg, 2% maxHP regen
      ],
    },
  },

  // ──────────────────────────────────────
  // MODULES — Tactical utility / counterplay
  // ──────────────────────────────────────

  failsafe_switch: {
    slot: 'module',
    rarity: 'uncommon',
    name: 'Failsafe Switch',
    icon: '◎',
    desc: 'Auto-recovers from hard lockups. One chance per battle.',
    flavor: 'catch(StunException &e) { recover(); }',
    dropWeight: 16,
    effect: {
      type: 'reactive',
      trigger: 'on_stun',
      cleanseChance: 0.60,
      maxUses: 1,
    },
  },

  echo_buffer: {
    slot: 'module',
    rarity: 'uncommon',
    name: 'Echo Buffer',
    icon: '◎',
    desc: 'Stores residual energy from blocked attacks for the counter.',
    flavor: 'buf[dodge_count++ % 2] = atk * 0.10;',
    dropWeight: 16,
    effect: {
      type: 'reactive',
      trigger: 'on_dodge',
      damageBoostPerStack: 0.10,
      maxStacks: 2,
    },
  },

  static_discharge: {
    slot: 'module',
    rarity: 'rare',
    name: 'Static Discharge',
    icon: '◎',
    desc: 'Builds charge when struck, then arcs back as a debuff.',
    flavor: 'if (++hits_taken >= 3) { discharge(); hits_taken = 0; }',
    dropWeight: 7,
    effect: {
      type: 'reactive',
      trigger: 'on_hit_received',
      hitsRequired: 3,
      appliesDebuff: true,    // opponent gets 0.6x damage for 1 turn
    },
  },

  thermal_siphon: {
    slot: 'module',
    rarity: 'rare',
    name: 'Thermal Siphon',
    icon: '◎',
    desc: 'Drains speed from the opponent through heat transfer.',
    flavor: 'opponent.spd -= 2; self.spd += 2; // every. single. turn.',
    dropWeight: 7,
    effect: {
      type: 'per_turn',
      spdStealPerTurn: 2,
      maxSteal: 10,
    },
  },

  deadlock_mirror: {
    slot: 'module',
    rarity: 'epic',
    name: 'Deadlock Mirror',
    icon: '◎',
    desc: 'Reflects damage when systems are critically stressed.',
    flavor: 'if (hp_ratio < 0.30) reflect(incoming * 0.20);',
    dropWeight: 3,
    effect: {
      type: 'reactive',
      trigger: 'on_hit_received',
      hpThreshold: 0.30,    // below 30% HP
      reflectRatio: 0.20,   // reflect 20% of damage
    },
  },

  interrupt_handler: {
    slot: 'module',
    rarity: 'mythic',
    name: 'Interrupt Handler',
    icon: '◎',
    desc: 'Preemptive counterattack system. Punishes critical strikes.',
    flavor: 'signal(SIGCRIT, counter_handler); // 40% STR retaliation',
    dropWeight: 0.08,
    effect: {
      type: 'reactive',
      trigger: 'on_crit_received',
      counterDamageRatio: 0.40,  // 40% of own STR as counter damage
      internalCooldown: 3,       // can only fire every 3 turns
    },
  },

  // ──────────────────────────────────────
  // RELICS — Rule-bending chaos
  // ──────────────────────────────────────

  entropy_dice: {
    slot: 'relic',
    rarity: 'epic',
    name: 'Entropy Dice',
    icon: '☍',
    desc: 'Chaos reigns. Every attack is a gamble.',
    flavor: 'srand(time(NULL) ^ getpid()); // true entropy',
    dropWeight: 3,
    effect: {
      type: 'passive',
      varianceOverride: [0.3, 2.0],  // extreme range
      critBonus: 0.05,               // +5% crit
    },
  },

  parity_bomb: {
    slot: 'relic',
    rarity: 'epic',
    name: 'Parity Bomb',
    icon: '☍',
    desc: 'Equalizes the battlefield at a critical moment.',
    flavor: 'avg = (a.hp + b.hp) / 2; a.hp = b.hp = avg; // fair.',
    dropWeight: 3,
    effect: {
      type: 'reactive',
      trigger: 'on_low_hp',
      hpThreshold: 0.25,   // triggers when either < 25%
      maxUses: 1,
      equalizesHp: true,   // both HPs snap to average
    },
  },

  kernel_panic: {
    slot: 'relic',
    rarity: 'legendary',
    name: 'Kernel Panic',
    icon: '☍',
    desc: 'Destabilizes reality. Some turns ignore all defense.',
    flavor: 'if (turn % 3 == 1) bypass(DEF); else self_damage(0.05);',
    dropWeight: 0.8,
    effect: {
      type: 'rule_bend',
      activeTurns: [1, 4, 7],     // defense-ignoring turns
      selfDamageRatio: 0.05,      // 5% maxHP on non-active turns
    },
  },

  bit_flip: {
    slot: 'relic',
    rarity: 'legendary',
    name: 'Bit Flip',
    icon: '☍',
    desc: 'Corrupts the fundamental data of combat.',
    flavor: 'stats ^= 0xFF; effectiveness = ~effectiveness;',
    dropWeight: 0.8,
    effect: {
      type: 'rule_bend',
      statSwapChance: 0.25,        // 25% chance swap STR↔MAG per turn
      invertEffectivenessChance: 0.15,  // 15% chance invert weakness/resist
    },
  },

  null_pointer: {
    slot: 'relic',
    rarity: 'mythic',
    name: 'Null Pointer',
    icon: '☍',
    desc: 'Points to nothing. And nothing points back.',
    flavor: 'if (hp <= 0 && !dereferenced) { hp = 1; immune = true; }',
    dropWeight: 0.08,
    effect: {
      type: 'reactive',
      trigger: 'on_lethal',
      maxUses: 1,
      survivesAt: 1,          // survive at 1 HP
      immuneTurns: 1,         // immune for 1 turn after
      damagePenalty: 0.50,    // next attack deals 50% reduced damage
    },
  },

  root_overflow: {
    slot: 'relic',
    rarity: 'transcendent',
    name: 'Root Overflow',
    icon: '☍',
    desc: 'Breaches the boundaries of the battle system itself.',
    flavor: '*(uint64_t*)opponent += self.steal(opponent.max_stat * 0.25);',
    dropWeight: 0.006,
    effect: {
      type: 'rule_bend',
      copyStatRatio: 0.25,         // copy 25% of opponent's highest stat
      cooldownResetChance: 0.10,   // 10% chance to reset opponent move cooldown
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadArtifacts() {
  try {
    if (!fs.existsSync(ARTIFACTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(ARTIFACTS_FILE, 'utf8'));
  } catch { return {}; }
}

function saveArtifacts(inv) {
  ensureDir();
  fs.writeFileSync(ARTIFACTS_FILE, JSON.stringify(inv, null, 2));
}

function addArtifact(id, count = 1) {
  const inv = loadArtifacts();
  inv[id] = (inv[id] || 0) + count;
  saveArtifacts(inv);
}

function removeArtifact(id) {
  const inv = loadArtifacts();
  if (!inv[id] || inv[id] <= 0) return false;
  inv[id]--;
  if (inv[id] <= 0) delete inv[id];
  saveArtifacts(inv);
  return true;
}

function getOwnedArtifacts() {
  const inv = loadArtifacts();
  return Object.entries(inv)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, ...ARTIFACTS[id] }))
    .filter(a => a.name)
    .sort((a, b) => {
      if (a.slot !== b.slot) return ARTIFACT_SLOTS.indexOf(a.slot) - ARTIFACT_SLOTS.indexOf(b.slot);
      return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    });
}

function getOwnedArtifactsBySlot(slot) {
  return getOwnedArtifacts().filter(a => a.slot === slot);
}

// ─── Build-scoped equip/unequip ───

function loadBuilds() {
  try {
    if (!fs.existsSync(BUILD_FILE)) return { active: 0, builds: [{ name: 'My Rig', main: true, parts: {}, artifacts: {} }] };
    const data = JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'));
    // Ensure artifacts field exists on all builds
    if (data.builds) {
      for (const build of data.builds) {
        if (!build.artifacts) build.artifacts = {};
      }
    }
    return data;
  } catch { return { active: 0, builds: [{ name: 'My Rig', main: true, parts: {}, artifacts: {} }] }; }
}

function saveBuilds(data) {
  ensureDir();
  fs.writeFileSync(BUILD_FILE, JSON.stringify(data, null, 2));
}

function equipArtifactOnBuild(buildIndex, artifactId) {
  const artifact = ARTIFACTS[artifactId];
  if (!artifact) return false;
  const data = loadBuilds();
  const build = data.builds[buildIndex];
  if (!build) return false;
  if (!build.artifacts) build.artifacts = {};

  const prevId = build.artifacts[artifact.slot];

  // Unequip old artifact (return to inventory)
  if (prevId && prevId !== artifactId) {
    addArtifact(prevId);
  }

  // Remove new artifact from inventory and equip
  removeArtifact(artifactId);
  build.artifacts[artifact.slot] = artifactId;
  saveBuilds(data);
  return true;
}

function unequipArtifactOnBuild(buildIndex, slot) {
  const data = loadBuilds();
  const build = data.builds[buildIndex];
  if (!build) return false;
  if (!build.artifacts) build.artifacts = {};
  const artifactId = build.artifacts[slot];
  if (!artifactId) return false;

  addArtifact(artifactId);
  delete build.artifacts[slot];
  saveBuilds(data);
  return true;
}

function getEquippedArtifacts(buildIndex) {
  const data = loadBuilds();
  const build = data.builds[buildIndex];
  if (!build) return {};
  return build.artifacts || {};
}

function getSellPrice(artifactId) {
  const artifact = ARTIFACTS[artifactId];
  if (!artifact) return 0;
  return SELL_PRICES[artifact.rarity] || 0;
}

// ═══════════════════════════════════════════════════════════════
// BATTLE INTEGRATION — Combat modifiers & reactive triggers
// ═══════════════════════════════════════════════════════════════

// Returns initial per-fighter state for artifact tracking
function getArtifactBattleState(artifacts, rng) {
  const state = {};
  if (!artifacts || Object.keys(artifacts).length === 0) return state;

  // Core: Eigenstate Matrix — pick profile at battle start
  if (artifacts.core === 'eigenstate_matrix') {
    const profiles = ARTIFACTS.eigenstate_matrix.effect.profiles;
    state.eigenProfile = profiles[Math.floor(rng.next() * profiles.length)];
  }

  // Core: Null Chassis — HP bonus (caller must apply)
  if (artifacts.core === 'null_chassis') {
    state.hpBonusRatio = ARTIFACTS.null_chassis.effect.hpBonus;
  }

  // Core: Thermal Heart — stacking tracker
  if (artifacts.core === 'thermal_heart') {
    state.thermalHeartStacks = 0;
  }

  // Module: Failsafe Switch — usage tracker
  if (artifacts.module === 'failsafe_switch') {
    state.failsafeUsed = false;
  }

  // Module: Echo Buffer — dodge stack tracker
  if (artifacts.module === 'echo_buffer') {
    state.echoStacks = 0;
  }

  // Module: Static Discharge — hit counter
  if (artifacts.module === 'static_discharge') {
    state.staticHits = 0;
    state.staticReady = false;
  }

  // Module: Thermal Siphon — total stolen
  if (artifacts.module === 'thermal_siphon') {
    state.siphonStolen = 0;
  }

  // Module: Interrupt Handler — cooldown tracker
  if (artifacts.module === 'interrupt_handler') {
    state.interruptCooldown = 0;
  }

  // Relic: Parity Bomb — usage tracker
  if (artifacts.relic === 'parity_bomb') {
    state.parityUsed = false;
  }

  // Relic: Null Pointer — usage tracker
  if (artifacts.relic === 'null_pointer') {
    state.nullPointerUsed = false;
    state.nullPointerImmune = 0;
    state.nullPointerPenalty = false;
  }

  // Relic: Root Overflow — stat copy (needs opponent, done separately)
  if (artifacts.relic === 'root_overflow') {
    state.overflowApplied = false;
  }

  return state;
}

// Apply Root Overflow stat copy (called after both fighters are initialized)
function applyRootOverflow(state, who) {
  const fighter = state[who];
  const opponent = state[who === 'a' ? 'b' : 'a'];
  if (!fighter._artifacts || fighter._artifacts.relic !== 'root_overflow') return;
  if (fighter._artifactState?.overflowApplied) return;

  const stats = ['str', 'mag', 'spd', 'vit', 'def'];
  let maxStat = 'str';
  let maxVal = 0;
  for (const s of stats) {
    if (opponent[s] > maxVal) { maxVal = opponent[s]; maxStat = s; }
  }

  const bonus = Math.round(maxVal * 0.25);
  fighter[maxStat] += bonus;
  fighter._artifactState.overflowApplied = true;
  fighter._artifactState.overflowStat = maxStat;
  fighter._artifactState.overflowAmount = bonus;
}

// Returns passive combat modifiers for artifact effects
// Merged into getCombatModifiers in balance.js
function getArtifactCombatModifiers(artifacts, artifactState, ctx) {
  const mods = {};
  if (!artifacts || Object.keys(artifacts).length === 0) return mods;

  const coreId = artifacts.core;
  const moduleId = artifacts.module;
  const relicId = artifacts.relic;

  // ── CORE passives ──

  if (coreId && ARTIFACTS[coreId]) {
    const eff = ARTIFACTS[coreId].effect;

    if (coreId === 'iron_lattice') {
      // +8% damage on STR moves only, +5% DEF always
      if (ctx.move && ctx.move.base === 'str') {
        mods.damageMult = (mods.damageMult || 1) * eff.damageMult;
      }
      mods.defMult = (mods.defMult || 1) * eff.defMult;
    }
    else if (coreId === 'flux_capacitor') {
      mods.damageMult = (mods.damageMult || 1) * eff.damageMult;
      mods.varianceOverride = eff.varianceOverride;
    }
    else if (coreId === 'thermal_heart') {
      const stacks = artifactState?.thermalHeartStacks || 0;
      const bonus = 1 + (stacks * eff.damagePerTurn);
      mods.damageMult = (mods.damageMult || 1) * Math.min(bonus, 1 + (eff.maxStacks * eff.damagePerTurn));
    }
    else if (coreId === 'null_chassis') {
      mods.defMult = (mods.defMult || 1) * eff.defMult;
      mods.damageMult = (mods.damageMult || 1) * eff.damageMult;
    }
    else if (coreId === 'silicon_furnace') {
      mods.damageMult = (mods.damageMult || 1) * eff.damageMult;
      mods.critBonus = (mods.critBonus || 0) + eff.critBonus;
      mods._siliconFurnaceCritBonus = eff.critBonusDamage;
    }
    else if (coreId === 'eigenstate_matrix') {
      const profile = artifactState?.eigenProfile || {};
      if (profile.damageMult) mods.damageMult = (mods.damageMult || 1) * profile.damageMult;
      if (profile.defMult) mods.defMult = (mods.defMult || 1) * profile.defMult;
      if (profile.dodgeBonus) mods.dodgeBonus = (mods.dodgeBonus || 0) + profile.dodgeBonus;
      if (profile.healPerTurn) mods.healPerTurn = (mods.healPerTurn || 0) + Math.round(ctx.atk.maxHp * profile.healPerTurn);
    }
  }

  // ── MODULE passives (mostly reactive, but some have passive components) ──

  if (moduleId === 'echo_buffer' && artifactState?.echoStacks > 0) {
    // Consume stacks on attack for damage bonus
    const bonus = 1 + (artifactState.echoStacks * ARTIFACTS.echo_buffer.effect.damageBoostPerStack);
    mods.damageMult = (mods.damageMult || 1) * bonus;
    mods._consumeEchoBuffer = true;
  }

  if (moduleId === 'deadlock_mirror') {
    const hpRatio = ctx.atk.hp / ctx.atk.maxHp;
    if (hpRatio < ARTIFACTS.deadlock_mirror.effect.hpThreshold) {
      mods._deadlockMirrorActive = true;
    }
  }

  // ── RELIC passives ──

  if (relicId === 'entropy_dice') {
    const eff = ARTIFACTS.entropy_dice.effect;
    mods.varianceOverride = eff.varianceOverride;
    mods.critBonus = (mods.critBonus || 0) + eff.critBonus;
  }

  if (relicId === 'kernel_panic') {
    const eff = ARTIFACTS.kernel_panic.effect;
    if (eff.activeTurns.includes(ctx.turn)) {
      mods._ignoreDefense = true;
    }
  }

  if (relicId === 'bit_flip' && ctx.rng) {
    const eff = ARTIFACTS.bit_flip.effect;
    if (ctx.rng.chance(eff.statSwapChance)) {
      mods._bitFlipSwap = true;
    }
    if (ctx.rng.chance(eff.invertEffectivenessChance)) {
      mods._invertEffectiveness = true;
    }
  }

  // Null Pointer damage penalty after surviving
  if (relicId === 'null_pointer' && artifactState?.nullPointerPenalty) {
    mods.damageMult = (mods.damageMult || 1) * 0.50;
  }

  return mods;
}

// Check artifact reactive triggers — returns events array
// Called at specific points in processTurn
function checkArtifactReactive(state, who, trigger, ctx = {}) {
  const fighter = state[who];
  const opponent = state[who === 'a' ? 'b' : 'a'];
  const events = [];
  if (!fighter._artifacts) return events;
  const arts = fighter._artifacts;
  const as = fighter._artifactState || {};

  switch (trigger) {
    case 'turn_start': {
      // Thermal Heart: increment stacks
      if (arts.core === 'thermal_heart' && as.thermalHeartStacks !== undefined) {
        as.thermalHeartStacks = Math.min(
          as.thermalHeartStacks + 1,
          ARTIFACTS.thermal_heart.effect.maxStacks
        );
      }

      // Thermal Siphon: steal SPD
      if (arts.module === 'thermal_siphon' && as.siphonStolen !== undefined) {
        const eff = ARTIFACTS.thermal_siphon.effect;
        if (as.siphonStolen < eff.maxSteal) {
          const steal = Math.min(eff.spdStealPerTurn, eff.maxSteal - as.siphonStolen);
          opponent.spd = Math.max(1, opponent.spd - steal);
          fighter.spd += steal;
          as.siphonStolen += steal;
          events.push({
            type: 'artifact_trigger', who, artifact: 'Thermal Siphon',
            effect: 'spd_steal', amount: steal,
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }

      // Kernel Panic: self-damage on non-active turns
      if (arts.relic === 'kernel_panic') {
        const eff = ARTIFACTS.kernel_panic.effect;
        if (!eff.activeTurns.includes(state.turn)) {
          const selfDmg = Math.round(fighter.maxHp * eff.selfDamageRatio);
          fighter.hp = Math.max(1, fighter.hp - selfDmg);
          events.push({
            type: 'artifact_trigger', who, artifact: 'Kernel Panic',
            effect: 'self_damage', damage: selfDmg,
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }

      // Interrupt Handler: tick cooldown
      if (arts.module === 'interrupt_handler' && as.interruptCooldown > 0) {
        as.interruptCooldown--;
      }

      // Null Pointer: tick immunity
      if (arts.relic === 'null_pointer' && as.nullPointerImmune > 0) {
        as.nullPointerImmune--;
        if (as.nullPointerImmune <= 0) {
          as.nullPointerPenalty = true; // damage penalty kicks in
        }
      }

      break;
    }

    case 'on_stun': {
      // Failsafe Switch: auto-cleanse stun
      if (arts.module === 'failsafe_switch' && !as.failsafeUsed) {
        if (state.rng.chance(ARTIFACTS.failsafe_switch.effect.cleanseChance)) {
          fighter.stunned = false;
          as.failsafeUsed = true;
          events.push({
            type: 'artifact_trigger', who, artifact: 'Failsafe Switch',
            effect: 'cleanse_stun',
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }

      // Thermal Heart: reset stacks on stun
      if (arts.core === 'thermal_heart' && as.thermalHeartStacks !== undefined) {
        as.thermalHeartStacks = 0;
      }
      break;
    }

    case 'on_dodge': {
      // Echo Buffer: gain stack when YOU dodge
      if (arts.module === 'echo_buffer' && as.echoStacks !== undefined) {
        const eff = ARTIFACTS.echo_buffer.effect;
        if (as.echoStacks < eff.maxStacks) {
          as.echoStacks++;
          events.push({
            type: 'artifact_trigger', who, artifact: 'Echo Buffer',
            effect: 'stack_gained', stacks: as.echoStacks,
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }
      break;
    }

    case 'after_attack': {
      // Echo Buffer: consume stacks after dealing damage
      if (arts.module === 'echo_buffer' && as.echoStacks > 0) {
        as.echoStacks = 0;
      }
      break;
    }

    case 'on_hit_received': {
      const { damage } = ctx;

      // Static Discharge: count hits
      if (arts.module === 'static_discharge' && as.staticHits !== undefined) {
        as.staticHits++;
        if (as.staticHits >= ARTIFACTS.static_discharge.effect.hitsRequired) {
          as.staticReady = true;
          as.staticHits = 0;
          events.push({
            type: 'artifact_trigger', who, artifact: 'Static Discharge',
            effect: 'charged',
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }

      // Deadlock Mirror: reflect damage when low HP
      if (arts.module === 'deadlock_mirror') {
        const eff = ARTIFACTS.deadlock_mirror.effect;
        const hpRatio = fighter.hp / fighter.maxHp;
        if (hpRatio < eff.hpThreshold && damage > 0) {
          const reflectDmg = Math.round(damage * eff.reflectRatio);
          opponent.hp = Math.max(0, opponent.hp - reflectDmg);
          events.push({
            type: 'artifact_trigger', who, artifact: 'Deadlock Mirror',
            effect: 'reflect', damage: reflectDmg,
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }

      // Null Pointer immunity: negate damage
      if (arts.relic === 'null_pointer' && as.nullPointerImmune > 0 && damage > 0) {
        // Restore the damage that was already applied (caller should check _nullPointerImmune)
        // This is handled in processTurn directly via the flag
      }

      break;
    }

    case 'on_crit_received': {
      const { damage } = ctx;

      // Interrupt Handler: counter-attack on crit
      if (arts.module === 'interrupt_handler' && as.interruptCooldown <= 0) {
        const eff = ARTIFACTS.interrupt_handler.effect;
        const counterDmg = Math.round(fighter.str * eff.counterDamageRatio);
        opponent.hp = Math.max(0, opponent.hp - counterDmg);
        as.interruptCooldown = eff.internalCooldown;
        events.push({
          type: 'artifact_trigger', who, artifact: 'Interrupt Handler',
          effect: 'counter', damage: counterDmg,
          hpA: state.a.hp, hpB: state.b.hp,
        });
      }
      break;
    }

    case 'on_crit_dealt': {
      // Silicon Furnace: bonus damage on crit
      if (arts.core === 'silicon_furnace') {
        const eff = ARTIFACTS.silicon_furnace.effect;
        const bonus = Math.round(opponent.maxHp * eff.critBonusDamage);
        opponent.hp = Math.max(0, opponent.hp - bonus);
        events.push({
          type: 'artifact_trigger', who, artifact: 'Silicon Furnace',
          effect: 'crit_burn', damage: bonus,
          hpA: state.a.hp, hpB: state.b.hp,
        });
      }
      break;
    }

    case 'on_lethal': {
      // Null Pointer: survive lethal damage
      if (arts.relic === 'null_pointer' && !as.nullPointerUsed) {
        fighter.hp = ARTIFACTS.null_pointer.effect.survivesAt;
        as.nullPointerUsed = true;
        as.nullPointerImmune = ARTIFACTS.null_pointer.effect.immuneTurns;
        events.push({
          type: 'artifact_trigger', who, artifact: 'Null Pointer',
          effect: 'survive_lethal',
          hpA: state.a.hp, hpB: state.b.hp,
        });
      }
      break;
    }

    case 'on_low_hp': {
      // Parity Bomb: equalize HP when either < 25%
      if (arts.relic === 'parity_bomb' && !as.parityUsed) {
        const aRatio = state.a.hp / state.a.maxHp;
        const bRatio = state.b.hp / state.b.maxHp;
        const threshold = ARTIFACTS.parity_bomb.effect.hpThreshold;
        if (aRatio < threshold || bRatio < threshold) {
          const avg = Math.round((state.a.hp + state.b.hp) / 2);
          state.a.hp = Math.min(state.a.maxHp, Math.max(1, avg));
          state.b.hp = Math.min(state.b.maxHp, Math.max(1, avg));
          as.parityUsed = true;
          events.push({
            type: 'artifact_trigger', who, artifact: 'Parity Bomb',
            effect: 'equalize', newHp: avg,
            hpA: state.a.hp, hpB: state.b.hp,
          });
        }
      }
      break;
    }

    case 'after_damage_dealt': {
      // Root Overflow: chance to reset opponent cooldown
      if (arts.relic === 'root_overflow' && state.rng) {
        const eff = ARTIFACTS.root_overflow.effect;
        if (state.rng.chance(eff.cooldownResetChance)) {
          const cds = Object.keys(opponent.cooldowns);
          if (cds.length > 0) {
            const resetMove = cds[Math.floor(state.rng.next() * cds.length)];
            // Reset by adding turns back (making opponent wait longer)
            opponent.cooldowns[resetMove] = (opponent.cooldowns[resetMove] || 0) + 2;
            events.push({
              type: 'artifact_trigger', who, artifact: 'Root Overflow',
              effect: 'cooldown_reset', move: resetMove,
              hpA: state.a.hp, hpB: state.b.hp,
            });
          }
        }
      }

      // Static Discharge: apply debuff on next attack after charging
      if (arts.module === 'static_discharge' && as.staticReady) {
        opponent.debuffed = true;
        as.staticReady = false;
        events.push({
          type: 'artifact_trigger', who, artifact: 'Static Discharge',
          effect: 'discharge',
          hpA: state.a.hp, hpB: state.b.hp,
        });
      }
      break;
    }
  }

  return events;
}

// ─── Display helpers ───

function printOwnedArtifacts() {
  const owned = getOwnedArtifacts();
  if (owned.length === 0) {
    console.log(`  ${RARITY_COLORS.common}No artifacts collected yet.${RESET}`);
    return;
  }
  for (const a of owned) {
    const rc = RARITY_COLORS[a.rarity] || '';
    const sc = ARTIFACT_SLOT_COLORS[a.slot] || '';
    const ri = RARITY_ICONS[a.rarity] || '';
    const si = ARTIFACT_SLOT_ICONS[a.slot] || '';
    console.log(`  ${rc}${ri} ${a.name}${RESET}  ${sc}${si} ${ARTIFACT_SLOT_LABELS[a.slot]}${RESET}  x${a.count}`);
    console.log(`    ${RARITY_COLORS.common}${a.desc}${RESET}`);
  }
}

module.exports = {
  ARTIFACTS, ARTIFACT_SLOTS,
  ARTIFACT_SLOT_LABELS, ARTIFACT_SLOT_ICONS, ARTIFACT_SLOT_COLORS, ARTIFACT_SLOT_COLORS_RGB,
  RARITY_ORDER, RARITY_COLORS, RARITY_ICONS,
  SELL_PRICES,
  loadArtifacts, saveArtifacts, addArtifact, removeArtifact,
  getOwnedArtifacts, getOwnedArtifactsBySlot,
  equipArtifactOnBuild, unequipArtifactOnBuild, getEquippedArtifacts,
  getSellPrice,
  getArtifactBattleState, applyRootOverflow,
  getArtifactCombatModifiers, checkArtifactReactive,
  printOwnedArtifacts,
};
