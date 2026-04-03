// Sleek pastel palette — muted, modern, unified
// Uses 256-color ANSI (works on virtually all modern terminals)

const ESC = '\x1b[';

// 24-bit true color support (most modern terminals)
function rgb(r, g, b) {
  return `${ESC}38;2;${r};${g};${b}m`;
}
function bgRgb(r, g, b) {
  return `${ESC}48;2;${r};${g};${b}m`;
}

const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const BLINK = `${ESC}5m`;
const INVERSE = `${ESC}7m`;
const HIDDEN = `${ESC}8m`;
const STRIKETHROUGH = `${ESC}9m`;

// ─── Pastel Palette ───
const colors = {
  // Core background
  bg:          bgRgb(18, 18, 28),        // deep navy-black
  bgLight:     bgRgb(28, 28, 42),        // slightly lighter for panels
  bgAccent:    bgRgb(38, 38, 58),        // hover/highlight bg

  // Pastel primaries
  cyan:        rgb(130, 220, 235),        // soft cyan — primary accent
  lavender:    rgb(180, 160, 240),        // lavender — player 2 / magic
  mint:        rgb(140, 230, 180),        // mint — health / healing
  peach:       rgb(245, 180, 150),        // peach — damage / attack
  rose:        rgb(240, 150, 170),        // soft rose — critical / danger
  sky:         rgb(140, 190, 250),        // sky blue — info / speed
  gold:        rgb(240, 220, 140),        // warm gold — special / victory
  lilac:       rgb(200, 170, 240),        // lilac — effects
  coral:       rgb(240, 160, 140),        // coral — secondary attack

  // Neutral / UI
  white:       rgb(230, 230, 245),        // slightly cool white
  dim:         rgb(100, 100, 130),        // muted text
  dimmer:      rgb(60, 60, 85),           // very muted (borders, rain)
  ghost:       rgb(40, 40, 60),           // barely visible (bg elements)

  // Semantic
  p1:          rgb(130, 220, 235),        // player 1 — cyan
  p2:          rgb(180, 160, 240),        // player 2 — lavender
  hp:          rgb(140, 230, 180),        // health bar — mint
  hpLow:       rgb(240, 150, 170),        // health bar low — rose
  damage:      rgb(245, 180, 150),        // damage numbers — peach
  crit:        rgb(240, 220, 140),        // critical hit — gold
  miss:        rgb(100, 100, 130),        // miss — dim
  matrix:      rgb(60, 100, 80),          // matrix rain — dark muted green
  matrixBright:rgb(100, 180, 130),        // matrix rain highlight
  glitch:      rgb(200, 170, 240),        // glitch effect — lilac
};

// Styled string helpers
function style(color, text) {
  return `${color}${text}${RESET}`;
}

function bold(color, text) {
  return `${BOLD}${color}${text}${RESET}`;
}

function dim(text) {
  return `${DIM}${colors.dim}${text}${RESET}`;
}

// Health bar color gradient (mint → peach → rose as health drops)
function hpColor(ratio) {
  if (ratio > 0.6) return colors.mint;
  if (ratio > 0.3) return colors.peach;
  return colors.rose;
}

module.exports = {
  ESC, RESET, BOLD, DIM, ITALIC, BLINK, INVERSE, HIDDEN, STRIKETHROUGH,
  rgb, bgRgb, colors, style, bold, dim: dim, hpColor,
};
