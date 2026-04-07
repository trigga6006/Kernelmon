// ═══════════════════════════════════════════════════════════════
// CARD ART — Full card frames (19x11), collapsed hand (5x5),
// inner art per card, rarity-based border styles, draw helpers
// ═══════════════════════════════════════════════════════════════

const { rgb } = require('./palette');
const { CARD_RARITY_COLORS_RGB, CARD_RARITY_ICONS, CARD_TYPE_COLORS_RGB, CARD_TYPE_LABELS } = require('./cards');

const CARD_W = 19;   // full card width
const CARD_H = 12;   // full card height
const COLLAPSED_W = 5;
const COLLAPSED_H = 5;

// ─── Border Styles by Rarity ───

const BORDER_STYLES = {
  round:  { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', divH: '─' },
  square: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', divH: '─' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', divH: '═' },
};

function getBorderStyle(rarity) {
  if (['divine', 'primordial', 'transcendent', 'mythic', 'legendary'].includes(rarity)) return BORDER_STYLES.double;
  if (['rare', 'epic'].includes(rarity)) return BORDER_STYLES.square;
  return BORDER_STYLES.round;
}

// ─── Inner Art per Card (3 lines x 11 chars) ───

const CARD_INNER_ART = {
  // Passive
  efficient_cooling: ['  ░░▓▓▓░░  ', '  ▓▒~~~~▒▓  ', '  ░░▓▓▓░░  '],
  stable_voltage:    ['  ──┬──┬──  ', '  ~~╪~~╪~~  ', '  ──┴──┴──  '],
  padded_heatsink:   ['  ╔══════╗  ', '  ║▓▓▓▓▓▓║  ', '  ╚══════╝  '],
  spaghetti_code:    ['  ~╲~╱~╲~  ', '  ╱~╲◈╱~╲  ', '  ~╱~╲~╱~  '],
  overclocked_bus:   ['  »»»»»»»  ', '  »» >> »»  ', '  »»»»»»»  '],
  hardened_kernel:   ['  ┌──██──┐  ', '  │▓████▓│  ', '  └──██──┘  '],
  turbo_cache:       ['  ╔═╦═╦═╗  ', '  ║█║█║█║  ', '  ╚═╩═╩═╝  '],
  liquid_nitrogen_loop:['  ░▒▓██▓░  ', '  ▓~~◆~~▓  ', '  ░▒▓██▓░  '],
  quantum_entangler: ['  ·~·~·~·  ', '  ~◈~~◈~~  ', '  ·~·~·~·  '],
  bit_rot:           ['  █▓▒░···  ', '  █▓▒░·◈·  ', '  █▓▒░···  '],
  dual_boot:         ['  ╔═╤═╗    ', '  ║◆│◇║    ', '  ╚═╧═╝    '],
  neural_accelerator:['  ┌┬┬┬┬┬┐  ', '  ◆▒▒▒▒▒◆  ', '  └┴┴┴┴┴┘  '],
  photonic_armor:    ['  ╔▓▓▓▓▓╗  ', '  ║██████║  ', '  ╚▓▓▓▓▓╝  '],
  berserker_chip:    ['  ╳╳╳╳╳╳╳  ', '  ╳▓★▓★▓╳  ', '  ╳╳╳╳╳╳╳  '],
  singularity_core:  ['  ···◈···  ', '  ·◈◈◈◈◈·  ', '  ···◈···  '],
  void_resonance:    ['  ░░████░░  ', '  ██    ██  ', '  ░░████░░  '],
  architects_will:   ['  ✧──────✧  ', '  │✧◈◈◈✧│  ', '  ✧──────✧  '],

  // Reactive
  fail_safe_boot:    ['  ┌──▲──┐  ', '  │ ▲▲▲ │  ', '  └──▲──┘  '],
  error_correction:  ['  ECC ECC  ', '  ▓▒░▒▓▒░  ', '  ECC ECC  '],
  rubber_duck:       ['    ╭▬╮    ', '   (·▿·)   ', '    └─┘    '],
  backup_battery:    ['  ┌█████┐  ', '  │▓▓▓▓▓│  ', '  └█████┘  '],
  static_shield:     ['  ╱⚡⚡⚡╲  ', '  ⚡ ▣ ⚡  ', '  ╲⚡⚡⚡╱  '],
  watchdog_timer:    ['  ◎──◎──◎  ', '  │  ◈  │  ', '  ◎──◎──◎  '],
  garbage_collector: ['  ┌┐ ╳ ┌┐  ', '  ││→◈←││  ', '  └┘ ╳ └┘  '],
  thermal_throttle_guard:['  ▒▓█▓▒  ', '  ▓█◆█▓  ', '  ▒▓█▓▒    '],
  revenge_protocol:  ['  ╲     ╱  ', '   ╲ ★ ╱   ', '    ╳╳╳    '],
  adaptive_firmware: ['  ┌─◆─◆─┐  ', '  │↻↻↻↻↻│  ', '  └─◆─◆─┘  '],
  deadman_switch:    ['  ╔═╗ ╔═╗  ', '  ║●║═║●║  ', '  ╚═╝ ╚═╝  '],
  phoenix_protocol:  ['   ╱▲╲    ', '  ╱▲▲▲╲   ', '  ◆◆◆◆◆   '],
  stack_overflow:    ['  ┌┬┬┬┬┬┐  ', '  ││↑│↑││  ', '  └┴┴┴┴┴┘  '],
  counterstrike_matrix:['  ╳─╳─╳  ', '  ─◆─◆─  ', '  ╳─╳─╳    '],
  trojan_horse:      ['  ┌──◈──┐  ', '  │▓███▓│  ', '  └──◆──┘  '],
  event_horizon:     ['  ░░████░░  ', '  ██ ◈ ██  ', '  ░░████░░  '],
  cascade_failure:   ['  ▓▓▓▓▓▓▓  ', '  ╳╳╳╳╳╳╳  ', '  ░░░░░░░  '],
  temporal_rewind:   ['  ←←←◈→→→  ', '  ←←◈◈◈→→  ', '  ←←←◈→→→  '],

  // Active
  quick_patch:       ['  ┌─+─+─┐  ', '  │ +++ │  ', '  └─+─+─┘  '],
  power_surge:       ['  ⚡⚡⚡⚡⚡  ', '  ⚡▓█▓⚡  ', '  ⚡⚡⚡⚡⚡  '],
  debug_scan:        ['  >_scan  ', '   ▓▒░▒▓   ', '  >_done    '],
  overclock_burst:   ['  ╔═⚡═╗  ', '  ║█⚡█║  ', '  ╚═⚡═╝    '],
  defrag_cycle:      ['  ░▒▓█▓▒░  ', '  █▓▒░▒▓█  ', '  ░▒▓█▓▒░  '],
  memory_leak:       ['  ░▒▓▓▓▒░  ', '  ▓↓↓◈↓↓▓  ', '  ░▒▓▓▓▒░  '],
  emp_pulse:         ['  ─╳──╳─  ', '  ╳ ⚡⚡ ╳  ', '  ─╳──╳─    '],
  packet_storm:      ['  ◎◎◎◎◎◎◎  ', '  ◎▓███▓◎  ', '  ◎◎◎◎◎◎◎  '],
  memory_dump:       ['  █░█░█░█  ', '  ░█░◆░█░  ', '  █░█░█░█  '],
  rootkit_inject:    ['  >_sudo  ', '   ▒▓█▓▒   ', '  #_root    '],
  kernel_panic:      ['  ╳╳╳╳╳╳╳  ', '  ╳PANIC╳  ', '  ╳╳╳╳╳╳╳  '],
  segfault_trap:     ['  ╳·───·╳  ', '  · ╳▣╳ ·  ', '  ╳·───·╳  '],
  firewall_overdrive:['  ▣▣▣▣▣▣▣  ', '  ▣█████▣  ', '  ▣▣▣▣▣▣▣  '],
  zero_day_cascade:  ['  ╔★═★═╗  ', '  ║★◈★◈║  ', '  ╚★═★═╝  '],
  fork_bomb:         ['  :(){:|:  ', '   &};: :  ', '  (){ :|:  '],
  blackout_protocol: ['  ████████  ', '  █  ◈  █  ', '  ████████  '],
  big_bang_reboot:   ['  ···✧···  ', '  ·✧✧✧✧✧·  ', '  ···✧···  '],

  // New cards
  copper_trace:      ['  ─┬─┬─┬─  ', '  ╰┤◆├╯╰┤  ', '  ─┴─┴─┴─  '],
  syntax_error:      ['  !? ERR !? ', '  ▒▓╳╳╳▓▒  ', '  ?! 404 ?! '],
  interrupt_handler: ['  ╔►──◄╗  ', '  ║ !! ║    ', '  ╚►──◄╝  '],
  race_condition:    ['  →→ ←← →  ', '  ◆►  ◄◇  ', '  →→ ←← →  '],
  buffer_overflow:   ['  ████████  ', '  █▒▒▒▒▒▒█  ', '  ▒▒▒▒▒▒▒▒  '],
  polymorphic_shield:['  ╱◇╲╱◆╲  ', '  ◆ ═══ ◇  ', '  ╲◇╱╲◆╱  '],
  logic_bomb:        ['  ╭─●─╮    ', '  │ ◈ │    ', '  ╰─▼─╯    '],
  quantum_tunneling: ['  ┊ · ┊ · ┊', '  ─◈┈┈◈─  ', '  ┊ · ┊ · ┊'],
  wormhole_exploit:  ['  ○═════○  ', '  ║~~~~~║  ', '  ○═════○  '],
  phantom_thread:    ['  ┊┊┊┊┊┊┊  ', '  ┊·◈·◈·┊  ', '  ·········'],
  deadlock_spiral:   ['  ╭→↓←╮    ', '  ↑ ◈ ↓    ', '  ╰←↑→╯    '],
  entropy_weaver:    ['  ≈≈≈≈≈≈≈  ', '  ≈✧≈✧≈✧≈  ', '  ≈≈≈≈≈≈≈  '],
  null_pointer:      ['  →→→ NULL ', '  ◈─── ∅   ', '  →→→ VOID '],

  // Divine — base frames (animated versions generated dynamically)
  omniscient_core:   ['  ⟐⟐⟐⟐⟐⟐⟐  ', '  ⟐◈◈◈◈◈⟐  ', '  ⟐⟐⟐⟐⟐⟐⟐  '],
  causality_anchor:  ['  ─═─═─═─  ', '  ═⟐◈⟐═  ', '  ─═─═─═─  '],
  reality_shatter:   ['  ╳╳╳╳╳╳╳  ', '  ╳⟐◈⟐╳  ', '  ╳╳╳╳╳╳╳  '],

  // Primordial — base frames (animated versions generated dynamically)
  eternal_compiler:  ['  ⊛═══════⊛', '  ║✧◈◈◈✧║  ', '  ⊛═══════⊛'],
  genesis_protocol:  ['  ⊛⊛⊛⊛⊛⊛⊛  ', '  ⊛✧◈✧◈✧⊛  ', '  ⊛⊛⊛⊛⊛⊛⊛  '],
  heat_death:        ['  ▓▓▓▓▓▓▓  ', '  ▓▓◈✧◈▓▓  ', '  ░░░░░░░  '],
};

// ─── Divine Animated Inner Art ───
// Gentle, elegant cycling — symbols breathe between states in a wave pattern

const DIVINE_CYCLE_CHARS = ['⟐', '◇', '◈', '◇']; // smooth diamond morph
const DIVINE_ACCENT_CHARS = ['◈', '✦', '★', '✦'];  // center gems pulse

function getDivineAnimatedArt(cardId, frame) {
  const t = frame / 20; // slow, elegant pace
  const pick = (chars, offset) => chars[Math.floor((t + offset) % chars.length)];

  if (cardId === 'omniscient_core') {
    // Radiating diamond wave — each column phase-shifted
    const row = (rowIdx) => {
      let line = '  ';
      for (let col = 0; col < 7; col++) {
        const phase = col * 0.4 + rowIdx * 0.7;
        if (rowIdx === 1 && col >= 1 && col <= 5) {
          line += pick(DIVINE_ACCENT_CHARS, phase);
        } else {
          line += pick(DIVINE_CYCLE_CHARS, phase);
        }
      }
      return line + '  ';
    };
    return [row(0), row(1), row(2)];
  }

  // causality_anchor — rippling fate-lines
  if (cardId === 'causality_anchor') {
    const barChars = ['─', '═', '─', '~'];
    const row0 = '  ' + Array.from({ length: 7 }, (_, i) => pick(barChars, i * 0.5)).join('') + '  ';
    const anchor = pick(DIVINE_CYCLE_CHARS, 0);
    const gem = pick(DIVINE_ACCENT_CHARS, 1.5);
    const row1 = `  ═${anchor}${anchor}${gem}${anchor}${anchor}═  `;
    const row2 = '  ' + Array.from({ length: 7 }, (_, i) => pick(barChars, i * 0.5 + 2)).join('') + '  ';
    return [row0, row1, row2];
  }

  // reality_shatter — fracture lines radiate outward from center, rotating
  const SHATTER_CHARS = ['╳', '╱', '╲', '│', '─', '·'];
  const SHATTER_CENTER = ['◈', '⟐', '★', '✦'];
  const crackAngle = (t * 1.5) % 1;
  const shatterRow = (rowIdx) => {
    let line = '  ';
    for (let col = 0; col < 7; col++) {
      if (rowIdx === 1 && col === 3) {
        // center gem pulses
        line += pick(SHATTER_CENTER, col * 0.3);
      } else {
        const dx = col - 3;
        const dy = rowIdx - 1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) / Math.PI + 1 + crackAngle) % 1;
        const idx = Math.floor((angle * 3 + dist * 1.5) % SHATTER_CHARS.length);
        line += SHATTER_CHARS[idx];
      }
    }
    return line + '  ';
  };
  return [shatterRow(0), shatterRow(1), shatterRow(2)];
}

// ─── Primordial Animated Inner Art ───
// Slow-spinning vortex with the card's key symbols anchored at center

const GLITCH_CHARS = ['░', '▒', '▓', '╳', '⊛', '█'];

// Vortex gradient — maps spiral intensity to characters
const VORTEX_CHARS = [' ', ' ', '░', '░', '▒', '▓', '█', '▓', '▒', '░'];

// Center symbols that show through the vortex
const PRIMORDIAL_CENTER = {
  eternal_compiler: { '7,0': '⊛', '9,0': '⊛', '6,1': '◈', '8,1': '✧', '10,1': '◈', '7,2': '⊛', '9,2': '⊛' },
  genesis_protocol: { '7,0': '⊛', '9,0': '⊛', '6,1': '✧', '8,1': '◈', '10,1': '✧', '7,2': '⊛', '9,2': '⊛' },
  heat_death:       { '7,0': '▓', '9,0': '▓', '7,1': '◈', '8,1': '✧', '9,1': '◈', '7,2': '░', '9,2': '░' },
};

// Compilation cascade characters — scrolling code pattern for eternal_compiler
const CASCADE_CHARS = ['0', '1', '·', '░', '▒', ':', ';', '='];

function getPrimordialAnimatedArt(cardId, frame) {
  const center = PRIMORDIAL_CENTER[cardId];
  if (!center) return null;

  const W = 17;  // full inner width
  const H = 3;
  const cx = (W - 1) / 2;  // 8
  const cy = (H - 1) / 2;  // 1

  // eternal_compiler: horizontal scrolling binary cascade (unique from vortex)
  if (cardId === 'eternal_compiler') {
    const scroll = frame * 0.3; // smooth horizontal scroll
    const lines = [];
    for (let row = 0; row < H; row++) {
      let line = '';
      for (let col = 0; col < W; col++) {
        const key = `${col},${row}`;
        if (center[key]) {
          line += center[key];
          continue;
        }
        // Cascading columns at different speeds per row
        const speed = 1 + row * 0.5;
        const phase = (col * 1.7 + scroll * speed + row * 4.3) % CASCADE_CHARS.length;
        const wave = Math.sin((col + frame * 0.05 * speed) * 0.8 + row * 2);
        const bright = wave > 0.3;
        const idx = Math.floor(Math.abs(phase)) % CASCADE_CHARS.length;
        line += bright ? CASCADE_CHARS[idx] : ' ';
      }
      lines.push(line);
    }
    return lines;
  }

  // All other primordials: vortex spiral
  const rotation = (frame / 100) * Math.PI * 2;

  const lines = [];
  for (let row = 0; row < H; row++) {
    let line = '';
    for (let col = 0; col < W; col++) {
      // Check for anchored center symbols
      const key = `${col},${row}`;
      if (center[key]) {
        line += center[key];
        continue;
      }

      const dx = col - cx;
      const dy = (row - cy) * 3.0;  // vertical stretch for terminal aspect ratio
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Two-arm spiral pattern
      const spiral = Math.sin(angle * 2 - dist * 0.5 + rotation);
      // Fade intensity with distance from center (stronger arms further out)
      const fade = Math.min(1, dist / 3);
      const intensity = (spiral + 1) / 2 * fade;

      const idx = Math.floor(intensity * (VORTEX_CHARS.length - 1));
      line += VORTEX_CHARS[idx];
    }
    lines.push(line);
  }
  return lines;
}

// ─── Inner Art Color Schemes ───

function getCardArtColors(card) {
  const rc = CARD_RARITY_COLORS_RGB[card.rarity] || [160, 165, 180];
  const tc = CARD_TYPE_COLORS_RGB[card.type] || [180, 180, 180];
  // Blend rarity + type color for a unique look per card
  const blend = [
    Math.round((rc[0] + tc[0]) / 2),
    Math.round((rc[1] + tc[1]) / 2),
    Math.round((rc[2] + tc[2]) / 2),
  ];
  const bright = rgb(Math.min(255, blend[0] + 40), Math.min(255, blend[1] + 40), Math.min(255, blend[2] + 40));
  const mid = rgb(blend[0], blend[1], blend[2]);
  const dark = rgb(Math.max(0, blend[0] - 30), Math.max(0, blend[1] - 30), Math.max(0, blend[2] - 30));
  return [dark, bright, mid];
}

// ─── Draw Full Card (19w x 12h) ───

function drawCard(screen, x, y, card, options = {}) {
  const { dimmed = false, frameCounter = 0 } = options;
  const border = getBorderStyle(card.rarity);
  const rc = CARD_RARITY_COLORS_RGB[card.rarity] || [160, 165, 180];
  const tc = CARD_TYPE_COLORS_RGB[card.type] || [180, 180, 180];
  const icon = CARD_RARITY_ICONS[card.rarity] || '·';
  const typeLabel = CARD_TYPE_LABELS[card.type] || 'CARD';

  const innerW = CARD_W - 2; // 17 inner chars

  // ─── Divine rendering: smooth golden pulse with per-column color wave ───
  if (card.rarity === 'divine' && !dimmed) {
    const phase = frameCounter / 20;

    // Per-column color wave — warm gold breathing to white
    const divineColorAt = (col, rowOff) => {
      const wave = Math.sin((phase + col * 0.3 + rowOff * 0.5) * Math.PI * 2);
      const t = wave * 0.5 + 0.5; // 0-1
      // Gold [255,215,100] ↔ White [255,250,220]
      return rgb(255, Math.round(215 + t * 35), Math.round(100 + t * 120));
    };

    // Animated border — each character gets its own phase-shifted glow
    const drawDivineBorderH = (bx, by, char, len) => {
      for (let i = 0; i < len; i++) {
        screen.text(bx + i, by, char, divineColorAt(i, 0));
      }
    };

    // Row 0: top border
    screen.text(x, y, border.tl, divineColorAt(0, 0));
    drawDivineBorderH(x + 1, y, border.h, innerW);
    screen.text(x + CARD_W - 1, y, border.tr, divineColorAt(innerW, 0));

    // Row 1: icon + name with divine glow
    screen.text(x, y + 1, border.v, divineColorAt(0, 1));
    screen.text(x + 1, y + 1, ' ', null);
    screen.text(x + 2, y + 1, icon, divineColorAt(2, 1), null, true);
    const nameTrunc = card.name.slice(0, innerW - 3);
    // Name color: warm white with subtle pulse
    const nameGlow = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
    const nColor = rgb(255, Math.round(240 + nameGlow * 15), Math.round(220 + nameGlow * 25));
    screen.text(x + 4, y + 1, nameTrunc.padEnd(innerW - 3), nColor, null, true);
    screen.text(x + CARD_W - 1, y + 1, border.v, divineColorAt(innerW, 1));

    // Row 2: divider
    screen.text(x, y + 2, border.v, divineColorAt(0, 2));
    drawDivineBorderH(x + 1, y + 2, border.divH, innerW);
    screen.text(x + CARD_W - 1, y + 2, border.v, divineColorAt(innerW, 2));

    // Rows 3-5: animated inner art — per-character colored
    const animArt = getDivineAnimatedArt(card.id, frameCounter);
    for (let i = 0; i < 3; i++) {
      screen.text(x, y + 3 + i, border.v, divineColorAt(0, 3 + i));
      const artLine = (animArt[i] || '').slice(0, innerW).padEnd(innerW);
      for (let c = 0; c < innerW; c++) {
        const ch = artLine[c];
        if (ch && ch !== ' ') {
          screen.text(x + 1 + c, y + 3 + i, ch, divineColorAt(c, 3 + i + 0.3));
        }
      }
      screen.text(x + CARD_W - 1, y + 3 + i, border.v, divineColorAt(innerW, 3 + i));
    }

    // Row 6: divider
    screen.text(x, y + 6, border.v, divineColorAt(0, 6));
    drawDivineBorderH(x + 1, y + 6, border.divH, innerW);
    screen.text(x + CARD_W - 1, y + 6, border.v, divineColorAt(innerW, 6));

    // Row 7: type label
    screen.text(x, y + 7, border.v, divineColorAt(0, 7));
    const typeLabel7 = CARD_TYPE_LABELS[card.type] || 'CARD';
    screen.text(x + 1, y + 7, (' ' + typeLabel7).padEnd(innerW), rgb(tc[0], tc[1], tc[2]), null, true);
    screen.text(x + CARD_W - 1, y + 7, border.v, divineColorAt(innerW, 7));

    // Rows 8-9: desc
    const descLines = wrapText(card.desc, innerW - 2);
    for (let i = 0; i < 2; i++) {
      screen.text(x, y + 8 + i, border.v, divineColorAt(0, 8 + i));
      const dl = (descLines[i] || '').slice(0, innerW - 2);
      screen.text(x + 1, y + 8 + i, (' ' + dl).padEnd(innerW), rgb(210, 200, 180));
      screen.text(x + CARD_W - 1, y + 8 + i, border.v, divineColorAt(innerW, 8 + i));
    }

    // Row 10: flavor
    const flavorTrunc = (card.flavor || '').slice(0, innerW - 2);
    screen.text(x, y + 10, border.v, divineColorAt(0, 10));
    screen.text(x + 1, y + 10, (' ' + flavorTrunc).padEnd(innerW), rgb(170, 155, 110));
    screen.text(x + CARD_W - 1, y + 10, border.v, divineColorAt(innerW, 10));

    // Row 11: bottom border
    screen.text(x, y + 11, border.bl, divineColorAt(0, 11));
    drawDivineBorderH(x + 1, y + 11, border.h, innerW);
    screen.text(x + CARD_W - 1, y + 11, border.br, divineColorAt(innerW, 11));
    return;
  }

  // ─── Primordial rendering: slow vortex, smooth color wave, rare glitches ───
  if (card.rarity === 'primordial' && !dimmed) {
    // Slow frame — color updates every 3 render frames for smooth movement
    const sf = Math.floor(frameCounter / 3);

    // Smooth color wave across the card: deep teal → bright emerald → pale cyan
    const primColorAt = (col, row) => {
      const wave = Math.sin((sf * 0.06 + col * 0.12 + row * 0.15) * Math.PI * 2);
      const t = wave * 0.5 + 0.5; // 0-1
      const r = Math.round(40 + t * 140);   // 40-180
      const g = Math.round(180 + t * 75);   // 180-255
      const b = Math.round(140 + t * 80);   // 140-220
      return rgb(r, g, b);
    };

    // Vortex-colored art characters — slightly different hue for depth
    const vortexColorAt = (col, row, intensity) => {
      const wave = Math.sin((sf * 0.06 + col * 0.1 + row * 0.2) * Math.PI * 2);
      const t = wave * 0.5 + 0.5;
      // Brighter for denser vortex chars, dimmer for sparse
      const bright = 0.4 + intensity * 0.6;
      const r = Math.round((60 + t * 120) * bright);
      const g = Math.round((200 + t * 55) * bright);
      const b = Math.round((160 + t * 60) * bright);
      return rgb(r, g, b);
    };

    // Stable border with per-column color wave
    const drawPrimBorderH = (bx, by, char, len, row) => {
      for (let i = 0; i < len; i++) {
        screen.text(bx + i, by, char, primColorAt(i, row));
      }
    };

    // Row 0: top border
    screen.text(x, y, border.tl, primColorAt(0, 0));
    drawPrimBorderH(x + 1, y, border.h, innerW, 0);
    screen.text(x + CARD_W - 1, y, border.tr, primColorAt(innerW, 0));

    // Row 1: icon + name (clean, no corruption)
    screen.text(x, y + 1, border.v, primColorAt(0, 1));
    screen.text(x + 1, y + 1, ' ', null);
    screen.text(x + 2, y + 1, icon, primColorAt(2, 1), null, true);
    const nameTruncP = card.name.slice(0, innerW - 3);
    // Name: bright with gentle pulse
    const namePulse = Math.sin(sf * 0.08 * Math.PI * 2) * 0.5 + 0.5;
    const nCol = rgb(Math.round(180 + namePulse * 50), 255, Math.round(220 + namePulse * 30));
    screen.text(x + 4, y + 1, nameTruncP.padEnd(innerW - 3), nCol, null, true);
    screen.text(x + CARD_W - 1, y + 1, border.v, primColorAt(innerW, 1));

    // Row 2: divider
    screen.text(x, y + 2, border.v, primColorAt(0, 2));
    drawPrimBorderH(x + 1, y + 2, border.divH, innerW, 2);
    screen.text(x + CARD_W - 1, y + 2, border.v, primColorAt(innerW, 2));

    // Rows 3-5: vortex art — per-character colored by intensity
    const animArt = getPrimordialAnimatedArt(card.id, frameCounter) || CARD_INNER_ART[card.id] || ['                 ', '                 ', '                 '];
    for (let i = 0; i < 3; i++) {
      screen.text(x, y + 3 + i, border.v, primColorAt(0, 3 + i));
      const artLine = (animArt[i] || '').slice(0, innerW).padEnd(innerW);
      for (let c = 0; c < innerW; c++) {
        const ch = artLine[c];
        if (ch && ch !== ' ') {
          // Special symbols (⊛✧◈▓░) get rarity color, vortex chars get depth color
          const isSpecial = '⊛✧◈'.includes(ch);
          const intensity = '░▒▓█'.indexOf(ch);
          const color = isSpecial
            ? primColorAt(c, 3 + i)
            : vortexColorAt(c, 3 + i, intensity >= 0 ? (intensity + 1) / 4 : 0.5);
          screen.text(x + 1 + c, y + 3 + i, ch, color);
        }
      }
      screen.text(x + CARD_W - 1, y + 3 + i, border.v, primColorAt(innerW, 3 + i));
    }

    // Row 6: divider
    screen.text(x, y + 6, border.v, primColorAt(0, 6));
    drawPrimBorderH(x + 1, y + 6, border.divH, innerW, 6);
    screen.text(x + CARD_W - 1, y + 6, border.v, primColorAt(innerW, 6));

    // Row 7: type label (clean)
    screen.text(x, y + 7, border.v, primColorAt(0, 7));
    const typeLabel7 = CARD_TYPE_LABELS[card.type] || 'CARD';
    screen.text(x + 1, y + 7, (' ' + typeLabel7).padEnd(innerW), rgb(tc[0], tc[1], tc[2]), null, true);
    screen.text(x + CARD_W - 1, y + 7, border.v, primColorAt(innerW, 7));

    // Rows 8-9: desc (clean text, colored border)
    const descLines = wrapText(card.desc, innerW - 2);
    for (let i = 0; i < 2; i++) {
      screen.text(x, y + 8 + i, border.v, primColorAt(0, 8 + i));
      const dl = (descLines[i] || '').slice(0, innerW - 2);
      screen.text(x + 1, y + 8 + i, (' ' + dl).padEnd(innerW), rgb(180, 220, 200));
      screen.text(x + CARD_W - 1, y + 8 + i, border.v, primColorAt(innerW, 8 + i));
    }

    // Row 10: flavor
    const flavorTruncP = (card.flavor || '').slice(0, innerW - 2);
    screen.text(x, y + 10, border.v, primColorAt(0, 10));
    screen.text(x + 1, y + 10, (' ' + flavorTruncP).padEnd(innerW), rgb(120, 160, 140));
    screen.text(x + CARD_W - 1, y + 10, border.v, primColorAt(innerW, 10));

    // Row 11: bottom border
    screen.text(x, y + 11, border.bl, primColorAt(0, 11));
    drawPrimBorderH(x + 1, y + 11, border.h, innerW, 11);
    screen.text(x + CARD_W - 1, y + 11, border.br, primColorAt(innerW, 11));
    return;
  }

  // ─── Standard rendering (all other rarities + dimmed divine/primordial) ───

  // Shimmer for divine/primordial when dimmed still applies subtly
  let borderRGB = rc;
  if (['divine', 'primordial'].includes(card.rarity)) {
    const phase = (frameCounter % 30) / 30;
    const shimmer = Math.sin(phase * Math.PI * 2) * 40;
    borderRGB = [
      Math.min(255, Math.max(0, rc[0] + shimmer)),
      Math.min(255, Math.max(0, rc[1] + shimmer)),
      Math.min(255, Math.max(0, rc[2] + shimmer)),
    ];
  }

  const borderColor = dimmed ? rgb(60, 60, 85) : rgb(borderRGB[0], borderRGB[1], borderRGB[2]);
  const nameColor = dimmed ? rgb(80, 80, 100) : rgb(230, 230, 245);
  const typeColor = dimmed ? rgb(60, 60, 85) : rgb(tc[0], tc[1], tc[2]);
  const descColor = dimmed ? rgb(60, 60, 85) : rgb(180, 180, 200);
  const iconColor = dimmed ? rgb(60, 60, 85) : rgb(rc[0], rc[1], rc[2]);

  // Row 0: top border
  screen.text(x, y, border.tl + border.h.repeat(innerW) + border.tr, borderColor);

  // Row 1: rarity icon + card name
  const nameTrunc = card.name.slice(0, innerW - 3);
  screen.text(x, y + 1, border.v, borderColor);
  screen.text(x + 1, y + 1, ' ', null);
  screen.text(x + 2, y + 1, icon, iconColor, null, true);
  screen.text(x + 4, y + 1, nameTrunc.padEnd(innerW - 3), nameColor, null, true);
  screen.text(x + CARD_W - 1, y + 1, border.v, borderColor);

  // Row 2: divider
  screen.text(x, y + 2, border.v + border.divH.repeat(innerW) + border.v, borderColor);

  // Rows 3-5: inner art (3 lines)
  const artLines = CARD_INNER_ART[card.id] || ['           ', '           ', '           '];
  const artColors = dimmed ? null : getCardArtColors(card);
  for (let i = 0; i < 3; i++) {
    screen.text(x, y + 3 + i, border.v, borderColor);
    const artLine = (artLines[i] || '').slice(0, innerW).padEnd(innerW);
    screen.text(x + 1, y + 3 + i, artLine, artColors ? artColors[i] : rgb(60, 60, 85));
    screen.text(x + CARD_W - 1, y + 3 + i, border.v, borderColor);
  }

  // Row 6: divider
  screen.text(x, y + 6, border.v + border.divH.repeat(innerW) + border.v, borderColor);

  // Row 7: type label
  screen.text(x, y + 7, border.v, borderColor);
  screen.text(x + 1, y + 7, (' ' + typeLabel).padEnd(innerW), typeColor, null, true);
  screen.text(x + CARD_W - 1, y + 7, border.v, borderColor);

  // Rows 8-9: description (2 lines, word-wrapped)
  const descLines = wrapText(card.desc, innerW - 2);
  for (let i = 0; i < 2; i++) {
    screen.text(x, y + 8 + i, border.v, borderColor);
    const dl = (descLines[i] || '').slice(0, innerW - 2);
    screen.text(x + 1, y + 8 + i, (' ' + dl).padEnd(innerW), descColor);
    screen.text(x + CARD_W - 1, y + 8 + i, border.v, borderColor);
  }

  // Row 10: flavor text (italic-ish, dimmer)
  const flavorColor = dimmed ? rgb(45, 45, 60) : rgb(120, 120, 150);
  const flavorTrunc = (card.flavor || '').slice(0, innerW - 2);
  screen.text(x, y + 10, border.v, borderColor);
  screen.text(x + 1, y + 10, (' ' + flavorTrunc).padEnd(innerW), flavorColor);
  screen.text(x + CARD_W - 1, y + 10, border.v, borderColor);

  // Row 11: bottom border
  screen.text(x, y + 11, border.bl + border.h.repeat(innerW) + border.br, borderColor);
}

// ─── Draw Collapsed Card (5w x 5h) — for battle hand ───

function drawCollapsedCard(screen, x, y, card, options = {}) {
  const { selected = false, dimmed = false, frameCounter = 0 } = options;
  const border = getBorderStyle(card.rarity);
  const rc = CARD_RARITY_COLORS_RGB[card.rarity] || [160, 165, 180];
  const icon = CARD_RARITY_ICONS[card.rarity] || '·';

  const tc = CARD_TYPE_COLORS_RGB[card.type] || [180, 180, 180];
  const typeChar = card.type === 'passive' ? 'P' : card.type === 'reactive' ? 'R' : 'A';
  const typeColor = dimmed ? rgb(50, 50, 70) : rgb(tc[0], tc[1], tc[2]);

  // Offset: selected card slides up by 1
  const dy = selected ? -1 : 0;

  // Divine collapsed: per-row golden color wave
  if (card.rarity === 'divine' && !dimmed && !selected) {
    const phase = frameCounter / 20;
    for (let row = 0; row < 5; row++) {
      const wave = Math.sin((phase + row * 0.6) * Math.PI * 2);
      const t = wave * 0.5 + 0.5;
      const bCol = rgb(255, Math.round(215 + t * 35), Math.round(100 + t * 120));
      if (row === 0) screen.text(x, y + dy, border.tl + border.h.repeat(3) + border.tr, bCol);
      else if (row === 1) {
        screen.text(x, y + dy + 1, border.v + ' ' + icon + ' ' + border.v, bCol);
        screen.text(x + 2, y + dy + 1, icon, bCol, null, false);
      } else if (row === 2) {
        screen.text(x, y + dy + 2, border.v + ' ' + typeChar + ' ' + border.v, bCol);
        screen.text(x + 2, y + dy + 2, typeChar, typeColor);
      } else if (row === 3) screen.text(x, y + dy + 3, border.v + '   ' + border.v, bCol);
      else screen.text(x, y + dy + 4, border.bl + border.h.repeat(3) + border.br, bCol);
    }
    return;
  }

  // Primordial collapsed: smooth teal-emerald color wave
  if (card.rarity === 'primordial' && !dimmed && !selected) {
    const sf = Math.floor(frameCounter / 3);
    const primCol = (row) => {
      const wave = Math.sin((sf * 0.06 + row * 0.4) * Math.PI * 2);
      const t = wave * 0.5 + 0.5;
      return rgb(Math.round(40 + t * 140), Math.round(180 + t * 75), Math.round(140 + t * 80));
    };
    screen.text(x, y + dy, border.tl + border.h.repeat(3) + border.tr, primCol(0));
    screen.text(x, y + dy + 1, border.v + ' ' + icon + ' ' + border.v, primCol(1));
    screen.text(x + 2, y + dy + 1, icon, primCol(1), null, false);
    screen.text(x, y + dy + 2, border.v + ' ' + typeChar + ' ' + border.v, primCol(2));
    screen.text(x + 2, y + dy + 2, typeChar, typeColor);
    screen.text(x, y + dy + 3, border.v + '   ' + border.v, primCol(3));
    screen.text(x, y + dy + 4, border.bl + border.h.repeat(3) + border.br, primCol(4));
    return;
  }

  // Standard collapsed rendering
  let borderRGB = rc;
  if (selected) {
    borderRGB = [230, 230, 245];
  }

  const borderColor = dimmed ? rgb(60, 60, 85) : rgb(borderRGB[0], borderRGB[1], borderRGB[2]);
  const iconColor = dimmed ? rgb(60, 60, 85) : (selected ? rgb(255, 255, 255) : rgb(rc[0], rc[1], rc[2]));

  screen.text(x, y + dy, border.tl + border.h.repeat(3) + border.tr, borderColor);
  screen.text(x, y + dy + 1, border.v + ' ' + icon + ' ' + border.v, borderColor);
  screen.text(x + 2, y + dy + 1, icon, iconColor, null, selected);
  screen.text(x, y + dy + 2, border.v + ' ' + typeChar + ' ' + border.v, borderColor);
  screen.text(x + 2, y + dy + 2, typeChar, typeColor);
  screen.text(x, y + dy + 3, border.v + '   ' + border.v, borderColor);
  screen.text(x, y + dy + 4, border.bl + border.h.repeat(3) + border.br, borderColor);
}

// ─── Draw Card Hand (2-3 collapsed cards side by side) ───

function drawCardHand(screen, x, y, cards, selectedIdx, options = {}) {
  const { frameCounter = 0 } = options;
  for (let i = 0; i < cards.length; i++) {
    const cardX = x + (i * (COLLAPSED_W + 1)); // 1 char gap between cards
    drawCollapsedCard(screen, cardX, y, cards[i], {
      selected: i === selectedIdx,
      frameCounter,
    });
  }
}

// ─── Word Wrap Helper ───

function wrapText(text, maxWidth) {
  if (!text) return ['', ''];
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  while (lines.length < 2) lines.push('');
  return lines;
}

module.exports = {
  CARD_W,
  CARD_H,
  COLLAPSED_W,
  COLLAPSED_H,
  CARD_INNER_ART,
  drawCard,
  drawCollapsedCard,
  drawCardHand,
  getCardArtColors,
  getBorderStyle,
  wrapText,
};
