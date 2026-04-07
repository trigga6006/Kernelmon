// ═══════════════════════════════════════════════════════════════
// CARD SYSTEM — Collectible battle cards for Card Battle mode
// Three types: Passive (always-on), Reactive (auto-trigger), Active (manual)
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const CARDS_FILE = path.join(WSO_DIR, 'cards.json');

// ─── Rarity tiers (extends base 7 + 2 beyond) ───

const CARD_RARITY_ORDER = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'transcendent',
  'divine', 'primordial',
];

const CARD_RARITY_COLORS = {
  common:       '\x1b[38;2;160;165;180m',
  uncommon:     '\x1b[38;2;140;230;180m',
  rare:         '\x1b[38;2;140;190;250m',
  epic:         '\x1b[38;2;200;170;240m',
  legendary:    '\x1b[38;2;240;220;140m',
  mythic:       '\x1b[38;2;255;100;100m',
  transcendent: '\x1b[38;2;200;120;255m',
  divine:       '\x1b[38;2;255;215;100m',
  primordial:   '\x1b[38;2;180;255;220m',
};

const CARD_RARITY_COLORS_RGB = {
  common:       [160, 165, 180],
  uncommon:     [140, 230, 180],
  rare:         [140, 190, 250],
  epic:         [200, 170, 240],
  legendary:    [240, 220, 140],
  mythic:       [255, 100, 100],
  transcendent: [200, 120, 255],
  divine:       [255, 215, 100],
  primordial:   [180, 255, 220],
};

const CARD_RARITY_ICONS = {
  common: '·', uncommon: '◇', rare: '◆', epic: '★',
  legendary: '✦', mythic: '⚡', transcendent: '✧',
  divine: '⟐', primordial: '⊛',
};

const CARD_TYPE_COLORS_RGB = {
  passive:  [140, 200, 230],   // cool blue
  reactive: [230, 180, 140],   // warm amber
  active:   [230, 140, 170],   // hot pink
};

const CARD_TYPE_LABELS = {
  passive:  'PASSIVE',
  reactive: 'REACTIVE',
  active:   'ACTIVE',
};

// ─── Card Catalog ───

const CARDS = {

  // ══════════════════════════════════════
  // PASSIVE CARDS — always-on buffs
  // ══════════════════════════════════════

  // ── Common ──
  // (no new common passives — already 4)
  efficient_cooling: {
    name: 'Efficient Cooling',
    desc: 'Reduce thermal self-damage by 30%',
    flavor: 'The silence of a well-cooled core.',
    type: 'passive',
    rarity: 'common',
    effect: { mechanic: 'thermal_resist', value: 0.30 },
    dropWeight: 30,
  },
  stable_voltage: {
    name: 'Stable Voltage',
    desc: '+5% damage consistency (tighter variance)',
    flavor: 'Clean power, clean signal.',
    type: 'passive',
    rarity: 'common',
    effect: { mechanic: 'variance_tighten', value: 0.05 },
    dropWeight: 28,
  },
  padded_heatsink: {
    name: 'Padded Heatsink',
    desc: '+8% DEF passively',
    flavor: 'Absorb the shock. Stay operational.',
    type: 'passive',
    rarity: 'common',
    effect: { stat: 'def', value: 0.08 },
    dropWeight: 32,
  },
  spaghetti_code: {
    name: 'Spaghetti Code',
    desc: '+12% STR & MAG, but wider damage variance',
    flavor: 'It works. Nobody knows why.',
    type: 'passive',
    rarity: 'common',
    effect: { stat: 'str', value: 0.12, stat2: 'mag', value2: 0.12, mechanic: 'variance_widen', mechValue: 0.15 },
    dropWeight: 27,
  },

  // ── Uncommon ──
  copper_trace: {
    name: 'Copper Trace',
    desc: '+6% STR, +6% MAG, +6% SPD',
    flavor: 'Follow the current. It knows the way.',
    type: 'passive',
    rarity: 'uncommon',
    effect: { stat: 'str', value: 0.06, stat2: 'mag', value2: 0.06, stat3: 'spd', value3: 0.06 },
    dropWeight: 15,
  },
  overclocked_bus: {
    name: 'Overclocked Bus',
    desc: '+10% SPD passively',
    flavor: 'Everything moves faster on a wider pipe.',
    type: 'passive',
    rarity: 'uncommon',
    effect: { stat: 'spd', value: 0.10 },
    dropWeight: 16,
  },
  hardened_kernel: {
    name: 'Hardened Kernel',
    desc: '+15% DEF passively',
    flavor: 'Compiled with -O3 and paranoia.',
    type: 'passive',
    rarity: 'uncommon',
    effect: { stat: 'def', value: 0.15 },
    dropWeight: 15,
  },
  turbo_cache: {
    name: 'Turbo Cache',
    desc: '+8% STR passively',
    flavor: 'Prefetch the pain.',
    type: 'passive',
    rarity: 'uncommon',
    effect: { stat: 'str', value: 0.08 },
    dropWeight: 16,
  },

  // ── Rare ──
  liquid_nitrogen_loop: {
    name: 'Liquid Nitrogen Loop',
    desc: '+12% STR and reduce overheat stall by 50%',
    flavor: 'Sub-zero execution temperature.',
    type: 'passive',
    rarity: 'rare',
    effect: { stat: 'str', value: 0.12, mechanic: 'stall_resist', mechValue: 0.50 },
    dropWeight: 7,
  },
  quantum_entangler: {
    name: 'Quantum Entangler',
    desc: '+5% dodge chance passively',
    flavor: 'Be in two places. Get hit in neither.',
    type: 'passive',
    rarity: 'rare',
    effect: { mechanic: 'dodge_bonus', value: 0.05 },
    dropWeight: 6,
  },
  neural_accelerator: {
    name: 'Neural Accelerator',
    desc: '+10% MAG passively',
    flavor: 'Tensor cores humming in harmony.',
    type: 'passive',
    rarity: 'rare',
    effect: { stat: 'mag', value: 0.10 },
    dropWeight: 7,
  },
  bit_rot: {
    name: 'Bit Rot',
    desc: 'Each turn: opponent loses 1% of all base stats',
    flavor: 'Entropy always wins.',
    type: 'passive',
    rarity: 'rare',
    effect: { mechanic: 'decay_aura', value: 0.01 },
    dropWeight: 5,
  },
  dual_boot: {
    name: 'Dual Boot',
    desc: 'Each turn: randomly gain +15% STR or +15% MAG',
    flavor: 'Two systems, one soul.',
    type: 'passive',
    rarity: 'rare',
    effect: { mechanic: 'dual_random', stat1: 'str', stat2: 'mag', value: 0.15 },
    dropWeight: 6,
  },

  // ── Epic ──
  polymorphic_shield: {
    name: 'Polymorphic Shield',
    desc: '+10% DEF; each turn randomly gain +8% STR, MAG, or SPD',
    flavor: 'It changes shape. So does your strategy.',
    type: 'passive',
    rarity: 'epic',
    effect: { stat: 'def', value: 0.10, mechanic: 'random_rotate_buff', pool: ['str', 'mag', 'spd'], value2: 0.08 },
    dropWeight: 2.5,
  },
  photonic_armor: {
    name: 'Photonic Armor',
    desc: '+20% DEF, -5% SPD',
    flavor: 'Light bends around you. So does damage.',
    type: 'passive',
    rarity: 'epic',
    effect: { stat: 'def', value: 0.20, penalty: { stat: 'spd', value: -0.05 } },
    dropWeight: 2.5,
  },
  berserker_chip: {
    name: 'Berserker Chip',
    desc: '+15% STR, +5% crit, take 5% more damage',
    flavor: 'Overclock the soul.',
    type: 'passive',
    rarity: 'epic',
    effect: { stat: 'str', value: 0.15, mechanic: 'crit_bonus', mechValue: 0.05, penalty: { mechanic: 'vuln', value: 0.05 } },
    dropWeight: 2.5,
  },

  // ── Legendary ──
  singularity_core: {
    name: 'Singularity Core',
    desc: '+12% all stats',
    flavor: 'The event horizon of performance.',
    type: 'passive',
    rarity: 'legendary',
    effect: { stat: 'all', value: 0.12 },
    dropWeight: 0.5,
  },
  quantum_tunneling: {
    name: 'Quantum Tunneling',
    desc: '+10% dodge, attacks bypass 20% of enemy DEF',
    flavor: 'Matter is a suggestion.',
    type: 'passive',
    rarity: 'legendary',
    effect: { mechanic: 'dodge_bonus', value: 0.10, mechanic2: 'armor_pen', value2: 0.20 },
    dropWeight: 0.45,
  },

  // ── Mythic ──
  void_resonance: {
    name: 'Void Resonance',
    desc: '+15% damage, +8% dodge, enemies deal -8% to you',
    flavor: 'The void listens. The void answers.',
    type: 'passive',
    rarity: 'mythic',
    effect: { mechanic: 'void_aura', damageMult: 0.15, dodgeBonus: 0.08, damageReduction: 0.08 },
    dropWeight: 0.06,
  },

  // ── Transcendent ──
  architects_will: {
    name: "Architect's Will",
    desc: '+20% all stats, +10% crit, tight variance',
    flavor: 'The blueprint of reality, rewritten.',
    type: 'passive',
    rarity: 'transcendent',
    effect: { stat: 'all', value: 0.20, mechanic: 'crit_bonus', mechValue: 0.10, varianceTighten: 0.15 },
    dropWeight: 0.008,
  },


  // ══════════════════════════════════════
  // REACTIVE CARDS — trigger on conditions
  // ══════════════════════════════════════

  // ── Common ──
  syntax_error: {
    name: 'Syntax Error',
    desc: 'On enemy crit: their next attack deals 30% less (once)',
    flavor: 'Unexpected token at line 1.',
    type: 'reactive',
    rarity: 'common',
    effect: { trigger: 'on_crit_received', action: 'enemy_debuff', stat: 'str', value: 0.30, duration: 1, once: true },
    dropWeight: 27,
  },
  fail_safe_boot: {
    name: 'Fail-Safe Boot',
    desc: 'Below 30% HP: restore 15% HP (once)',
    flavor: 'Emergency reboot sequence initiated.',
    type: 'reactive',
    rarity: 'common',
    effect: { trigger: 'hp_below', threshold: 0.30, action: 'heal', value: 0.15, once: true },
    dropWeight: 30,
  },
  error_correction: {
    name: 'Error Correction',
    desc: 'On debuff: cleanse it immediately (once)',
    flavor: 'ECC catches what others miss.',
    type: 'reactive',
    rarity: 'common',
    effect: { trigger: 'on_debuff', action: 'cleanse', once: true },
    dropWeight: 28,
  },
  backup_battery: {
    name: 'Backup Battery',
    desc: 'Below 20% HP: +20% DEF for 3 turns (once)',
    flavor: 'Low power mode: survival priority.',
    type: 'reactive',
    rarity: 'common',
    effect: { trigger: 'hp_below', threshold: 0.20, action: 'boost', stat: 'def', value: 0.20, duration: 3, once: true },
    dropWeight: 26,
  },
  rubber_duck: {
    name: 'Rubber Duck',
    desc: 'On stun: 40% chance to resist it + heal 5% HP',
    flavor: 'Have you tried talking to the duck?',
    type: 'reactive',
    rarity: 'common',
    effect: { trigger: 'on_stun', action: 'resist_heal', resistChance: 0.40, healValue: 0.05 },
    dropWeight: 25,
  },

  // ── Uncommon ──
  static_shield: {
    name: 'Static Shield',
    desc: 'On crit received: reflect 20% damage back (once)',
    flavor: 'Touch the charged fence.',
    type: 'reactive',
    rarity: 'uncommon',
    effect: { trigger: 'on_crit_received', action: 'reflect', value: 0.20, once: true },
    dropWeight: 15,
  },
  watchdog_timer: {
    name: 'Watchdog Timer',
    desc: 'On stun: auto-cleanse + STR +10% for 2 turns',
    flavor: 'The watchdog bites back.',
    type: 'reactive',
    rarity: 'uncommon',
    effect: { trigger: 'on_stun', action: 'cleanse_and_boost', stat: 'str', value: 0.10, duration: 2 },
    dropWeight: 14,
  },
  thermal_throttle_guard: {
    name: 'Thermal Throttle Guard',
    desc: 'On overheat stall: gain +25% STR next turn (once)',
    flavor: 'Channel the excess heat.',
    type: 'reactive',
    rarity: 'uncommon',
    effect: { trigger: 'on_stall', action: 'boost', stat: 'str', value: 0.25, duration: 1, once: true },
    dropWeight: 14,
  },
  garbage_collector: {
    name: 'Garbage Collector',
    desc: 'Every 4 turns: remove opponent\'s strongest buff',
    flavor: 'Sweeping up unreferenced objects.',
    type: 'reactive',
    rarity: 'uncommon',
    effect: { trigger: 'every_n_turns', interval: 4, action: 'strip_buff' },
    dropWeight: 13,
  },

  // ── Rare ──
  race_condition: {
    name: 'Race Condition',
    desc: 'When enemy heals: steal 50% of the heal amount',
    flavor: 'First thread wins. You were first.',
    type: 'reactive',
    rarity: 'rare',
    effect: { trigger: 'on_enemy_heal', action: 'steal_heal', value: 0.50 },
    dropWeight: 6,
  },
  buffer_overflow: {
    name: 'Buffer Overflow',
    desc: 'After dealing 3 crits: next attack deals +60% damage',
    flavor: 'The buffer was not big enough.',
    type: 'reactive',
    rarity: 'rare',
    effect: { trigger: 'crit_count', threshold: 3, action: 'boost_next_attack', value: 0.60, once: true },
    dropWeight: 5,
  },
  revenge_protocol: {
    name: 'Revenge Protocol',
    desc: 'When hit for >25% HP: next attack deals +40% (once)',
    flavor: 'Pain is just input.',
    type: 'reactive',
    rarity: 'rare',
    effect: { trigger: 'heavy_hit', threshold: 0.25, action: 'boost_next_attack', value: 0.40, once: true },
    dropWeight: 6,
  },
  adaptive_firmware: {
    name: 'Adaptive Firmware',
    desc: 'Every 3 turns: heal 8% HP',
    flavor: 'Self-patching code, self-healing core.',
    type: 'reactive',
    rarity: 'rare',
    effect: { trigger: 'every_n_turns', interval: 3, action: 'heal', value: 0.08 },
    dropWeight: 7,
  },
  deadman_switch: {
    name: "Deadman's Switch",
    desc: 'On KO: deal 30% of your max HP to opponent',
    flavor: 'If I go down, you come with me.',
    type: 'reactive',
    rarity: 'rare',
    effect: { trigger: 'on_ko', action: 'damage', value: 0.30, once: true },
    dropWeight: 5,
  },

  // ── Epic ──
  phoenix_protocol: {
    name: 'Phoenix Protocol',
    desc: 'On first KO: revive with 20% HP (once)',
    flavor: 'The firebird rises from silicon ash.',
    type: 'reactive',
    rarity: 'epic',
    effect: { trigger: 'on_ko', action: 'revive', value: 0.20, once: true },
    dropWeight: 2,
  },
  counterstrike_matrix: {
    name: 'Counterstrike Matrix',
    desc: 'On dodge: counterattack for 15% STR damage',
    flavor: 'Every miss is an opening.',
    type: 'reactive',
    rarity: 'epic',
    effect: { trigger: 'on_dodge', action: 'counter', value: 0.15 },
    dropWeight: 2.5,
  },
  stack_overflow: {
    name: 'Stack Overflow',
    desc: 'After 4 hits taken: deal 25% of accumulated damage back',
    flavor: 'Too deep. Way too deep.',
    type: 'reactive',
    rarity: 'epic',
    effect: { trigger: 'hit_count', threshold: 4, action: 'release_damage', value: 0.25 },
    dropWeight: 2,
  },

  // ── Legendary ──
  event_horizon: {
    name: 'Event Horizon',
    desc: 'Below 15% HP: become invulnerable for 1 turn (once)',
    flavor: 'Nothing escapes. Nothing enters.',
    type: 'reactive',
    rarity: 'legendary',
    effect: { trigger: 'hp_below', threshold: 0.15, action: 'invulnerable', duration: 1, once: true },
    dropWeight: 0.4,
  },
  trojan_horse: {
    name: 'Trojan Horse',
    desc: 'When opponent activates a card: steal its effect (once)',
    flavor: 'A gift you cannot refuse.',
    type: 'reactive',
    rarity: 'legendary',
    effect: { trigger: 'on_enemy_card', action: 'steal_effect', once: true },
    dropWeight: 0.35,
  },

  // ── Mythic ──
  cascade_failure: {
    name: 'Cascade Failure',
    desc: 'On heavy hit: enemy loses 10% of all stats for 3 turns',
    flavor: 'One crack becomes a thousand.',
    type: 'reactive',
    rarity: 'mythic',
    effect: { trigger: 'heavy_hit', threshold: 0.20, action: 'debuff_all', value: 0.10, duration: 3 },
    dropWeight: 0.05,
  },
  phantom_thread: {
    name: 'Phantom Thread',
    desc: 'On dodge: become untargetable for 1 turn (3 turn cooldown)',
    flavor: 'You swung at nothing. Nothing swung back.',
    type: 'reactive',
    rarity: 'mythic',
    effect: { trigger: 'on_dodge', action: 'phase_out', duration: 1, internalCooldown: 3 },
    dropWeight: 0.05,
  },
  deadlock_spiral: {
    name: 'Deadlock Spiral',
    desc: 'Every 3 turns: lock enemy\'s strongest stat at current value for 2 turns',
    flavor: 'Neither thread yields. Both threads starve.',
    type: 'reactive',
    rarity: 'mythic',
    effect: { trigger: 'every_n_turns', interval: 3, action: 'stat_lock', lockTarget: 'highest', duration: 2 },
    dropWeight: 0.05,
  },

  // ── Transcendent ──
  entropy_weaver: {
    name: 'Entropy Weaver',
    desc: 'Each time enemy buffs: gain the same buff at 50% strength',
    flavor: 'Order is a pattern. Patterns can be copied.',
    type: 'reactive',
    rarity: 'transcendent',
    effect: { trigger: 'on_enemy_buff', action: 'mirror_buff', value: 0.50 },
    dropWeight: 0.007,
  },
  temporal_rewind: {
    name: 'Temporal Rewind',
    desc: 'On KO: rewind to 50% HP and full cleanse (once)',
    flavor: 'Time is just another register to overwrite.',
    type: 'reactive',
    rarity: 'transcendent',
    effect: { trigger: 'on_ko', action: 'rewind', value: 0.50, once: true },
    dropWeight: 0.006,
  },


  // ══════════════════════════════════════
  // ACTIVE CARDS — manually activated
  // ══════════════════════════════════════

  // ── Common ──
  interrupt_handler: {
    name: 'Interrupt Handler',
    desc: 'Cancel enemy\'s active card cooldown reset (adds 2 turns)',
    flavor: 'IRQ fired. Your process can wait.',
    type: 'active',
    rarity: 'common',
    effect: { action: 'delay_enemy_cooldown', value: 2, cooldown: 4 },
    dropWeight: 26,
  },
  quick_patch: {
    name: 'Quick Patch',
    desc: 'Heal 15% HP immediately',
    flavor: 'A band-aid for the silicon soul.',
    type: 'active',
    rarity: 'common',
    effect: { action: 'heal', value: 0.15, cooldown: 3 },
    dropWeight: 30,
  },
  power_surge: {
    name: 'Power Surge',
    desc: '+20% STR for 2 turns',
    flavor: 'Voltage spikes are a feature, not a bug.',
    type: 'active',
    rarity: 'common',
    effect: { action: 'boost', stat: 'str', value: 0.20, duration: 2, cooldown: 3 },
    dropWeight: 28,
  },
  debug_scan: {
    name: 'Debug Scan',
    desc: 'Remove one active debuff',
    flavor: 'Step through the fault. Find the flaw.',
    type: 'active',
    rarity: 'common',
    effect: { action: 'cleanse', cooldown: 3 },
    dropWeight: 26,
  },

  // ── Uncommon ──
  overclock_burst: {
    name: 'Overclock Burst',
    desc: '+25% STR for 2 turns, then 8% HP recoil',
    flavor: 'Push past the limit. Pay the price.',
    type: 'active',
    rarity: 'uncommon',
    effect: { action: 'boost_recoil', stat: 'str', value: 0.25, duration: 2, recoil: 0.08, cooldown: 4 },
    dropWeight: 15,
  },
  defrag_cycle: {
    name: 'Defrag Cycle',
    desc: 'Remove all debuffs + heal 5% HP',
    flavor: 'Reorganize the chaos.',
    type: 'active',
    rarity: 'uncommon',
    effect: { action: 'cleanse_all', healValue: 0.05, cooldown: 4 },
    dropWeight: 14,
  },
  emp_pulse: {
    name: 'EMP Pulse',
    desc: 'Deal 10% opponent HP + 40% stun chance',
    flavor: 'Lights out.',
    type: 'active',
    rarity: 'uncommon',
    effect: { action: 'damage_stun', damage: 0.10, stunChance: 0.40, cooldown: 4 },
    dropWeight: 14,
  },
  memory_leak: {
    name: 'Memory Leak',
    desc: 'Drain 8% opponent max HP, heal self same amount',
    flavor: 'malloc() without free(). Classic.',
    type: 'active',
    rarity: 'uncommon',
    effect: { action: 'drain', damage: 0.08, cooldown: 4 },
    dropWeight: 14,
  },

  // ── Rare ──
  packet_storm: {
    name: 'Packet Storm',
    desc: 'Deal 20% opponent HP + 50% stun chance',
    flavor: 'A flood of malformed data.',
    type: 'active',
    rarity: 'rare',
    effect: { action: 'damage_stun', damage: 0.20, stunChance: 0.50, cooldown: 5 },
    dropWeight: 6,
  },
  memory_dump: {
    name: 'Memory Dump',
    desc: 'Heal 30% HP, but -15% DEF for 2 turns',
    flavor: 'Core dumped. Recovering...',
    type: 'active',
    rarity: 'rare',
    effect: { action: 'heal_debuff', healValue: 0.30, debuffStat: 'def', debuffValue: 0.15, debuffDuration: 2, cooldown: 5 },
    dropWeight: 6,
  },
  rootkit_inject: {
    name: 'Rootkit Inject',
    desc: '-20% enemy DEF for 3 turns',
    flavor: 'Privilege escalation complete.',
    type: 'active',
    rarity: 'rare',
    effect: { action: 'enemy_debuff', stat: 'def', value: 0.20, duration: 3, cooldown: 5 },
    dropWeight: 5,
  },

  // ── Epic ──
  logic_bomb: {
    name: 'Logic Bomb',
    desc: 'Plant bomb: detonates in 3 turns for 35% enemy HP + stun',
    flavor: 'if (turn === now + 3) explode();',
    type: 'active',
    rarity: 'epic',
    effect: { action: 'delayed_detonate', damage: 0.35, delay: 3, stunChance: 0.70, cooldown: 8 },
    dropWeight: 2,
  },
  kernel_panic: {
    name: 'Kernel Panic',
    desc: 'Deal 25% opponent HP + all stats -10% for 2 turns',
    flavor: 'FATAL: nothing is fine.',
    type: 'active',
    rarity: 'epic',
    effect: { action: 'damage_debuff_all', damage: 0.25, debuffValue: 0.10, debuffDuration: 2, cooldown: 6 },
    dropWeight: 2,
  },
  firewall_overdrive: {
    name: 'Firewall Overdrive',
    desc: 'Block next 2 attacks completely',
    flavor: 'All ports closed. All packets dropped.',
    type: 'active',
    rarity: 'epic',
    effect: { action: 'shield', charges: 2, cooldown: 7 },
    dropWeight: 2,
  },
  segfault_trap: {
    name: 'Segfault Trap',
    desc: 'Set trap 3 turns: attacker takes 30% self-damage + stun',
    flavor: 'Access violation at 0xDEADBEEF.',
    type: 'active',
    rarity: 'epic',
    effect: { action: 'set_trap', reflectDamage: 0.30, stunChance: 0.80, trapDuration: 3, cooldown: 6 },
    dropWeight: 2,
  },

  // ── Legendary ──
  wormhole_exploit: {
    name: 'Wormhole Exploit',
    desc: 'Swap your HP% with enemy\'s HP% (once per battle)',
    flavor: 'What was yours is mine. What was mine is yours.',
    type: 'active',
    rarity: 'legendary',
    effect: { action: 'hp_swap', cooldown: 99 },
    dropWeight: 0.35,
  },
  zero_day_cascade: {
    name: 'Zero-Day Cascade',
    desc: 'Deal 30% opponent HP + stun + -15% all stats 2 turns',
    flavor: 'The exploit that breaks the world.',
    type: 'active',
    rarity: 'legendary',
    effect: { action: 'nuke', damage: 0.30, stunChance: 1.0, debuffValue: 0.15, debuffDuration: 2, cooldown: 8 },
    dropWeight: 0.4,
  },

  // ── Mythic ──
  blackout_protocol: {
    name: 'Blackout Protocol',
    desc: 'Deal 35% opponent HP + stun + silence cards 3 turns',
    flavor: 'When the grid dies, so does hope.',
    type: 'active',
    rarity: 'mythic',
    effect: { action: 'blackout', damage: 0.35, stunChance: 1.0, silenceDuration: 3, cooldown: 10 },
    dropWeight: 0.04,
  },
  fork_bomb: {
    name: 'Fork Bomb',
    desc: 'Deal 12% opponent HP three times, each 25% stun',
    flavor: ':(){ :|:& };:',
    type: 'active',
    rarity: 'mythic',
    effect: { action: 'multi_hit', damage: 0.12, hits: 3, stunChance: 0.25, cooldown: 9 },
    dropWeight: 0.05,
  },

  // ── Transcendent ──
  null_pointer: {
    name: 'Null Pointer',
    desc: 'Disable enemy\'s equipped passive card for 4 turns',
    flavor: 'Segmentation fault: object does not exist.',
    type: 'active',
    rarity: 'transcendent',
    effect: { action: 'silence_passive', duration: 4, cooldown: 10 },
    dropWeight: 0.006,
  },
  big_bang_reboot: {
    name: 'Big Bang Reboot',
    desc: 'Reset both fighters to 50% HP + cleanse all',
    flavor: 'Let there be light. Again.',
    type: 'active',
    rarity: 'transcendent',
    effect: { action: 'reset', hpValue: 0.50, cooldown: 99 },
    dropWeight: 0.005,
  },

  // ══════════════════════════════════════
  // DIVINE TIER — beyond transcendent
  // ══════════════════════════════════════

  omniscient_core: {
    name: 'Omniscient Core',
    desc: '+25% all stats, see enemy move before choosing',
    flavor: 'To know all is to defeat all.',
    type: 'passive',
    rarity: 'divine',
    effect: { stat: 'all', value: 0.25, mechanic: 'foresight' },
    dropWeight: 0.002,
  },
  causality_anchor: {
    name: 'Causality Anchor',
    desc: 'First lethal hit each battle deals 1 HP instead',
    flavor: 'Fate rewrites itself around you.',
    type: 'reactive',
    rarity: 'divine',
    effect: { trigger: 'on_lethal', action: 'survive', value: 1, once: true },
    dropWeight: 0.002,
  },
  reality_shatter: {
    name: 'Reality Shatter',
    desc: 'Deal 40% enemy HP + strip all buffs + silence 2 turns',
    flavor: 'The rules were always optional.',
    type: 'active',
    rarity: 'divine',
    effect: { action: 'shatter', damage: 0.40, stripBuffs: true, silenceDuration: 2, cooldown: 12 },
    dropWeight: 0.002,
  },

  // ══════════════════════════════════════
  // PRIMORDIAL TIER — the rarest
  // ══════════════════════════════════════

  eternal_compiler: {
    name: 'Eternal Compiler',
    desc: '+20% all stats; each turn gain +2% all stats permanently',
    flavor: 'It compiles forever. It optimizes forever.',
    type: 'passive',
    rarity: 'primordial',
    effect: { stat: 'all', value: 0.20, mechanic: 'scaling_buff', scalePerTurn: 0.02 },
    dropWeight: 0.001,
  },
  genesis_protocol: {
    name: 'Genesis Protocol',
    desc: 'Start battle with +30% all stats for 5 turns',
    flavor: 'In the beginning, there was raw power.',
    type: 'reactive',
    rarity: 'primordial',
    effect: { trigger: 'battle_start', action: 'mega_boost', stat: 'all', value: 0.30, duration: 5 },
    dropWeight: 0.001,
  },
  heat_death: {
    name: 'Heat Death',
    desc: 'Deal 50% opponent HP + silence + -25% all stats 3 turns',
    flavor: 'The final state of all systems.',
    type: 'active',
    rarity: 'primordial',
    effect: { action: 'apocalypse', damage: 0.50, silenceDuration: 3, debuffValue: 0.25, debuffDuration: 3, cooldown: 99 },
    dropWeight: 0.001,
  },
};

// Attach IDs to each card for convenience
for (const [id, card] of Object.entries(CARDS)) {
  card.id = id;
  card.icon = CARD_RARITY_ICONS[card.rarity] || '·';
}

// ─── Card Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadCards() {
  try {
    if (!fs.existsSync(CARDS_FILE)) return {};
    return JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8'));
  } catch { return {}; }
}

function saveCards(cards) {
  ensureDir();
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
}

function addCard(cardId, count = 1) {
  const cards = loadCards();
  cards[cardId] = (cards[cardId] || 0) + count;
  saveCards(cards);
}

function removeCard(cardId, count = 1) {
  const cards = loadCards();
  if (!cards[cardId] || cards[cardId] < count) return false;
  cards[cardId] -= count;
  if (cards[cardId] <= 0) delete cards[cardId];
  saveCards(cards);
  return true;
}

function getOwnedCards() {
  const cards = loadCards();
  return Object.entries(cards)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count, ...CARDS[id] }))
    .filter(card => card.name); // skip unknown card IDs
}

function getTotalCardCount() {
  return Object.keys(CARDS).length;
}

function getOwnedCardCount() {
  const cards = loadCards();
  return Object.entries(cards).filter(([id, count]) => count > 0 && CARDS[id]).length;
}

// ─── Card Drop Rolls ───

function rollCardDrop(rng, tierMultiplier = 1.0) {
  const pool = Object.entries(CARDS);
  const totalWeight = pool.reduce((sum, [, c]) => sum + (c.dropWeight || 0) * tierMultiplier, 0);
  let roll = rng.next() * totalWeight;
  for (const [id, card] of pool) {
    roll -= (card.dropWeight || 0) * tierMultiplier;
    if (roll <= 0) return { id, ...card };
  }
  // Fallback: random common
  const commons = pool.filter(([, c]) => c.rarity === 'common');
  const pick = commons[Math.floor(rng.next() * commons.length)];
  return pick ? { id: pick[0], ...pick[1] } : null;
}

// ─── Starter Pack ───

const STARTER_CARDS = ['efficient_cooling', 'fail_safe_boot', 'overclock_burst'];

function grantStarterPack() {
  const owned = loadCards();
  const hasAny = Object.values(owned).some(c => c > 0);
  if (hasAny) return false;
  for (const id of STARTER_CARDS) addCard(id, 1);
  return true;
}

// ─── AI Card Selection ───

function selectAICards(rng, difficulty = 'mid', count = 3) {
  const tierPools = {
    easy:     ['common', 'uncommon'],
    mid:      ['common', 'uncommon', 'rare'],
    hard:     ['uncommon', 'rare', 'epic'],
    elite:    ['rare', 'epic', 'legendary'],
    boss:     ['epic', 'legendary', 'mythic'],
  };
  const allowedRarities = tierPools[difficulty] || tierPools.mid;
  const pool = Object.entries(CARDS)
    .filter(([, c]) => allowedRarities.includes(c.rarity))
    .map(([id, c]) => ({ id, ...c }));

  const selected = [];
  const used = new Set();
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    const card = pool[idx];
    if (!used.has(card.id)) {
      selected.push(card);
      used.add(card.id);
    } else {
      i--; // retry
    }
    if (used.size >= pool.length) break;
  }
  return selected;
}

function selectRandomCards(rng, count = 3) {
  const pool = Object.entries(CARDS).map(([id, card]) => ({ id, ...card }));
  if (pool.length === 0) return [];
  return rng.shuffle(pool).slice(0, Math.min(count, pool.length));
}

module.exports = {
  CARDS,
  CARD_RARITY_ORDER,
  CARD_RARITY_COLORS,
  CARD_RARITY_COLORS_RGB,
  CARD_RARITY_ICONS,
  CARD_TYPE_COLORS_RGB,
  CARD_TYPE_LABELS,
  loadCards,
  saveCards,
  addCard,
  removeCard,
  getOwnedCards,
  getTotalCardCount,
  getOwnedCardCount,
  rollCardDrop,
  grantStarterPack,
  selectAICards,
  selectRandomCards,
  STARTER_CARDS,
};
