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
  overclocked_bus:   ['  »»»»»»»  ', '  »» >> »»  ', '  »»»»»»»  '],
  hardened_kernel:   ['  ┌──██──┐  ', '  │▓████▓│  ', '  └──██──┘  '],
  turbo_cache:       ['  ╔═╦═╦═╗  ', '  ║█║█║█║  ', '  ╚═╩═╩═╝  '],
  liquid_nitrogen_loop:['  ░▒▓██▓░  ', '  ▓~~◆~~▓  ', '  ░▒▓██▓░  '],
  quantum_entangler: ['  ·~·~·~·  ', '  ~◈~~◈~~  ', '  ·~·~·~·  '],
  neural_accelerator:['  ┌┬┬┬┬┬┐  ', '  ◆▒▒▒▒▒◆  ', '  └┴┴┴┴┴┘  '],
  photonic_armor:    ['  ╔▓▓▓▓▓╗  ', '  ║██████║  ', '  ╚▓▓▓▓▓╝  '],
  berserker_chip:    ['  ╳╳╳╳╳╳╳  ', '  ╳▓★▓★▓╳  ', '  ╳╳╳╳╳╳╳  '],
  singularity_core:  ['  ···◈···  ', '  ·◈◈◈◈◈·  ', '  ···◈···  '],
  void_resonance:    ['  ░░████░░  ', '  ██    ██  ', '  ░░████░░  '],
  architects_will:   ['  ✧──────✧  ', '  │✧◈◈◈✧│  ', '  ✧──────✧  '],

  // Reactive
  fail_safe_boot:    ['  ┌──▲──┐  ', '  │ ▲▲▲ │  ', '  └──▲──┘  '],
  error_correction:  ['  ECC ECC  ', '  ▓▒░▒▓▒░  ', '  ECC ECC  '],
  backup_battery:    ['  ┌█████┐  ', '  │▓▓▓▓▓│  ', '  └█████┘  '],
  static_shield:     ['  ╱⚡⚡⚡╲  ', '  ⚡ ▣ ⚡  ', '  ╲⚡⚡⚡╱  '],
  watchdog_timer:    ['  ◎──◎──◎  ', '  │  ◈  │  ', '  ◎──◎──◎  '],
  thermal_throttle_guard:['  ▒▓█▓▒  ', '  ▓█◆█▓  ', '  ▒▓█▓▒    '],
  revenge_protocol:  ['  ╲     ╱  ', '   ╲ ★ ╱   ', '    ╳╳╳    '],
  adaptive_firmware: ['  ┌─◆─◆─┐  ', '  │↻↻↻↻↻│  ', '  └─◆─◆─┘  '],
  deadman_switch:    ['  ╔═╗ ╔═╗  ', '  ║●║═║●║  ', '  ╚═╝ ╚═╝  '],
  phoenix_protocol:  ['   ╱▲╲    ', '  ╱▲▲▲╲   ', '  ◆◆◆◆◆   '],
  counterstrike_matrix:['  ╳─╳─╳  ', '  ─◆─◆─  ', '  ╳─╳─╳    '],
  event_horizon:     ['  ░░████░░  ', '  ██ ◈ ██  ', '  ░░████░░  '],
  cascade_failure:   ['  ▓▓▓▓▓▓▓  ', '  ╳╳╳╳╳╳╳  ', '  ░░░░░░░  '],
  temporal_rewind:   ['  ←←←◈→→→  ', '  ←←◈◈◈→→  ', '  ←←←◈→→→  '],

  // Active
  quick_patch:       ['  ┌─+─+─┐  ', '  │ +++ │  ', '  └─+─+─┘  '],
  power_surge:       ['  ⚡⚡⚡⚡⚡  ', '  ⚡▓█▓⚡  ', '  ⚡⚡⚡⚡⚡  '],
  debug_scan:        ['  >_scan  ', '   ▓▒░▒▓   ', '  >_done    '],
  overclock_burst:   ['  ╔═⚡═╗  ', '  ║█⚡█║  ', '  ╚═⚡═╝    '],
  defrag_cycle:      ['  ░▒▓█▓▒░  ', '  █▓▒░▒▓█  ', '  ░▒▓█▓▒░  '],
  emp_pulse:         ['  ─╳──╳─  ', '  ╳ ⚡⚡ ╳  ', '  ─╳──╳─    '],
  packet_storm:      ['  ◎◎◎◎◎◎◎  ', '  ◎▓███▓◎  ', '  ◎◎◎◎◎◎◎  '],
  memory_dump:       ['  █░█░█░█  ', '  ░█░◆░█░  ', '  █░█░█░█  '],
  rootkit_inject:    ['  >_sudo  ', '   ▒▓█▓▒   ', '  #_root    '],
  kernel_panic:      ['  ╳╳╳╳╳╳╳  ', '  ╳PANIC╳  ', '  ╳╳╳╳╳╳╳  '],
  firewall_overdrive:['  ▣▣▣▣▣▣▣  ', '  ▣█████▣  ', '  ▣▣▣▣▣▣▣  '],
  zero_day_cascade:  ['  ╔★═★═╗  ', '  ║★◈★◈║  ', '  ╚★═★═╝  '],
  blackout_protocol: ['  ████████  ', '  █  ◈  █  ', '  ████████  '],
  big_bang_reboot:   ['  ···✧···  ', '  ·✧✧✧✧✧·  ', '  ···✧···  '],

  // Divine
  omniscient_core:   ['  ⟐⟐⟐⟐⟐⟐⟐  ', '  ⟐◈◈◈◈◈⟐  ', '  ⟐⟐⟐⟐⟐⟐⟐  '],
  causality_anchor:  ['  ─═─═─═─  ', '  ═⟐◈⟐═  ', '  ─═─═─═─  '],

  // Primordial
  genesis_protocol:  ['  ⊛⊛⊛⊛⊛⊛⊛  ', '  ⊛✧◈✧◈✧⊛  ', '  ⊛⊛⊛⊛⊛⊛⊛  '],
  heat_death:        ['  ▓▓▓▓▓▓▓  ', '  ▓▓◈✧◈▓▓  ', '  ░░░░░░░  '],
};

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

  // Shimmer for divine/primordial — cycle brightness
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

  const innerW = CARD_W - 2; // 17 inner chars

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

  let borderRGB = rc;
  if (selected) {
    borderRGB = [230, 230, 245]; // bright white when selected
  } else if (['divine', 'primordial'].includes(card.rarity)) {
    const phase = (frameCounter % 30) / 30;
    const shimmer = Math.sin(phase * Math.PI * 2) * 40;
    borderRGB = [
      Math.min(255, Math.max(0, rc[0] + shimmer)),
      Math.min(255, Math.max(0, rc[1] + shimmer)),
      Math.min(255, Math.max(0, rc[2] + shimmer)),
    ];
  }

  const borderColor = dimmed ? rgb(60, 60, 85) : rgb(borderRGB[0], borderRGB[1], borderRGB[2]);
  const iconColor = dimmed ? rgb(60, 60, 85) : (selected ? rgb(255, 255, 255) : rgb(rc[0], rc[1], rc[2]));
  const tc = CARD_TYPE_COLORS_RGB[card.type] || [180, 180, 180];
  const typeChar = card.type === 'passive' ? 'P' : card.type === 'reactive' ? 'R' : 'A';
  const typeColor = dimmed ? rgb(50, 50, 70) : rgb(tc[0], tc[1], tc[2]);

  // Offset: selected card slides up by 1
  const dy = selected ? -1 : 0;

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
