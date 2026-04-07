// ═══════════════════════════════════════════════════════════════
// RANKED — Competitive rating system for wager matches
// Tracks Rating Points (RP) earned from wagered online PvP.
// Non-wager games do not affect rank.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { rgb, BOLD, RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const RANKED_FILE = path.join(WSO_DIR, 'ranked.json');

// ─── Rank Definitions ───
// Progression follows an intrusion chain: reconnaissance → exploitation → persistence → dominion

const RANKS = [
  // Low tier — muted grays and greens
  { id: 'plaintext',     name: 'PLAINTEXT',     rp: 0,     icon: '·', color: rgb(100, 100, 130), desc: 'Unencrypted. Exposed.' },
  { id: 'ping',          name: 'PING',          rp: 100,   icon: '·', color: rgb(120, 125, 140), desc: 'Basic network presence.' },
  { id: 'handshake',     name: 'HANDSHAKE',     rp: 250,   icon: '◇', color: rgb(130, 180, 150), desc: 'Connection established.' },
  { id: 'spoof',         name: 'SPOOF',         rp: 450,   icon: '◇', color: rgb(140, 200, 160), desc: 'Faking identity.' },

  // Mid tier — teals and cyans
  { id: 'inject',        name: 'INJECT',        rp: 700,   icon: '◆', color: rgb(100, 210, 190), desc: 'Code where it shouldn\'t be.' },
  { id: 'tunnel',        name: 'TUNNEL',        rp: 1000,  icon: '◆', color: rgb(110, 220, 210), desc: 'Deep inside the network.' },
  { id: 'overflow',      name: 'OVERFLOW',      rp: 1400,  icon: '★', color: rgb(130, 210, 235), desc: 'Breaking memory boundaries.' },
  { id: 'escalate',      name: 'ESCALATE',      rp: 1900,  icon: '★', color: rgb(140, 190, 250), desc: 'Climbing permissions.' },

  // High tier — purples and magentas
  { id: 'persist',       name: 'PERSIST',       rp: 2500,  icon: '✦', color: rgb(180, 160, 240), desc: 'Can\'t be removed.' },
  { id: 'exfiltrate',    name: 'EXFILTRATE',    rp: 3500,  icon: '✦', color: rgb(200, 150, 240), desc: 'Taking what you want.' },
  { id: 'zero_click',    name: 'ZERO_CLICK',    rp: 5000,  icon: '⚡', color: rgb(220, 140, 240), desc: 'No interaction needed.' },
  { id: 'rootkit',       name: 'ROOTKIT',       rp: 7000,  icon: '⚡', color: rgb(240, 130, 200), desc: 'Invisible. Embedded in the kernel.' },

  // Elite tier — super special (animated in renderer)
  { id: 'black_ice',     name: 'BLACK_ICE',     rp: 10000, icon: '✧', color: rgb(160, 230, 255), desc: 'Lethal counter-intrusion.', elite: true },
  { id: 'kernel_panic',  name: 'KERNEL_PANIC',  rp: 15000, icon: '✧', color: rgb(255, 80, 80),   desc: 'Your presence crashes systems.', elite: true },
  { id: 'root_origin',   name: '//ROOT',        rp: 25000, icon: '⟐', color: rgb(255, 255, 255), desc: 'The origin. Absolute access.', elite: true },
];

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function emptyData() {
  return { rp: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, peakRp: 0 };
}

function loadRanked() {
  try {
    if (!fs.existsSync(RANKED_FILE)) return emptyData();
    const raw = JSON.parse(fs.readFileSync(RANKED_FILE, 'utf8'));
    return { ...emptyData(), ...raw };
  } catch {
    return emptyData();
  }
}

function saveRanked(data) {
  ensureDir();
  fs.writeFileSync(RANKED_FILE, JSON.stringify(data, null, 2));
}

// ─── Rank Lookup ───

function getRankForRp(rp) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (rp >= r.rp) rank = r;
    else break;
  }
  return rank;
}

function getRankIndex(rp) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (rp >= RANKS[i].rp) idx = i;
    else break;
  }
  return idx;
}

function getNextRank(rp) {
  const idx = getRankIndex(rp);
  if (idx >= RANKS.length - 1) return null; // already max rank
  return RANKS[idx + 1];
}

// ─── Current state accessors ───

function getRankedData() {
  return loadRanked();
}

function getCurrentRank() {
  const data = loadRanked();
  return getRankForRp(data.rp);
}

function getRp() {
  return loadRanked().rp;
}

// ─── RP Calculation ───
// RP gain/loss scales with wager size. Higher stakes = more RP at risk.
// Win streaks grant bonus RP to reward consistency.

function calculateRpChange(won, wagerAmount, currentStreak) {
  if (won) {
    const base = 20;
    const wagerBonus = Math.floor(wagerAmount * 0.05);
    const streakBonus = Math.min(currentStreak * 3, 20);
    let gain = base + wagerBonus + streakBonus;
    // System Core: RP multiplier (wins only)
    try { gain = Math.round(gain * require('./systemcore').getRpMultiplier()); } catch {}
    return gain;
  } else {
    const base = 12;
    const wagerPenalty = Math.floor(wagerAmount * 0.025);
    return -(base + wagerPenalty);
  }
}

// ─── Update rank after a wager match ───
// Returns { rpChange, newRp, oldRank, newRank, promoted, demoted, data }

function updateRank(won, wagerAmount) {
  const data = loadRanked();
  const oldRp = data.rp;
  const oldRank = getRankForRp(oldRp);

  const rpChange = calculateRpChange(won, wagerAmount, data.streak);

  // Update streak
  if (won) {
    data.streak++;
    data.wins++;
    if (data.streak > data.bestStreak) data.bestStreak = data.streak;
  } else {
    data.streak = 0;
    data.losses++;
  }

  // Apply RP (floor at 0)
  data.rp = Math.max(0, data.rp + rpChange);
  if (data.rp > data.peakRp) data.peakRp = data.rp;

  const newRank = getRankForRp(data.rp);
  const promoted = getRankIndex(data.rp) > getRankIndex(oldRp);
  const demoted = getRankIndex(data.rp) < getRankIndex(oldRp);

  saveRanked(data);

  return {
    rpChange,
    newRp: data.rp,
    oldRank,
    newRank,
    promoted,
    demoted,
    nextRank: getNextRank(data.rp),
    data,
  };
}

// ─── Display Helpers ───

// Static colored rank text (for terminal output, profile, etc.)
function getColoredRank(rp) {
  if (rp === undefined) rp = loadRanked().rp;
  const rank = getRankForRp(rp);
  return `${BOLD}${rank.color}${rank.icon} ${rank.name} ${rank.icon}${RESET}`;
}

// Progress bar toward next rank
function getRankProgressBar(rp, width = 20) {
  if (rp === undefined) rp = loadRanked().rp;
  const rank = getRankForRp(rp);
  const next = getNextRank(rp);
  if (!next) {
    // Max rank — full bar
    const filled = '█'.repeat(width);
    return `${rank.color}${filled}${RESET}`;
  }

  const rangeStart = rank.rp;
  const rangeEnd = next.rp;
  const progress = (rp - rangeStart) / (rangeEnd - rangeStart);
  const filled = Math.round(progress * width);
  const empty = width - filled;

  const dim = rgb(40, 40, 60);
  return `${rank.color}${'█'.repeat(filled)}${dim}${'░'.repeat(empty)}${RESET}`;
}

// One-line rank summary for menus/profile
function getRankSummary() {
  const data = loadRanked();
  const rank = getRankForRp(data.rp);
  const next = getNextRank(data.rp);
  const dim = rgb(100, 100, 130);
  const bright = rgb(230, 230, 245);

  let line = `${BOLD}${rank.color}${rank.icon} ${rank.name}${RESET}`;
  line += `${dim}  RP: ${bright}${data.rp}${RESET}`;
  if (next) {
    line += `${dim}  (${next.rp - data.rp} to ${next.name})${RESET}`;
  } else {
    line += `${dim}  (MAX RANK)${RESET}`;
  }
  return line;
}

// ─── Screen Rendering (for turn renderer / battle screens) ───
// Animated drawing for elite ranks, static for others

const GLITCH_CHARS = '▓▒░█▌▐╪╫╬┼╳※¤∎⌧⍟⌬◊◈';

function eliteHash(i, frame) {
  let h = (i * 2654435761 + frame * 340573321) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  return (h & 0xFFFF) / 0xFFFF;
}

function drawRankBadge(screen, x, y, rp, frameCount) {
  if (rp === undefined) rp = loadRanked().rp;
  const rank = getRankForRp(rp);
  const text = `${rank.icon} ${rank.name} ${rank.icon}`;

  if (rank.id === 'root_origin') {
    // //ROOT — reality-break void effect
    // Characters phase between blinding white and deep void purple
    const t = frameCount * 0.1;
    for (let i = 0; i < text.length; i++) {
      const h = eliteHash(i, frameCount);
      let ch = text[i];
      let color;

      // Phase between void and overexposure
      const pulse = Math.sin(t + i * 0.4) * 0.5 + 0.5;
      const spike = Math.sin(t * 6.7) > 0.9 ? 1 : 0;

      if (spike) {
        color = rgb(255, 255, 255);
      } else if (h < 0.10 && ch !== ' ') {
        ch = GLITCH_CHARS[Math.floor(eliteHash(i + 77, frameCount) * GLITCH_CHARS.length)];
        color = h < 0.05 ? rgb(15, 0, 30) : rgb(255, 240, 255);
      } else {
        const r = Math.round(120 + pulse * 135);
        const g = Math.round(80 + pulse * 140);
        const b = Math.round(200 + pulse * 55);
        color = rgb(r, g, b);
      }

      screen.set(x + i, y, ch, color, null, true);
    }
    return text.length;
  }

  if (rank.id === 'kernel_panic') {
    // KERNEL_PANIC — red static / glitch corruption
    const t = frameCount * 0.15;
    for (let i = 0; i < text.length; i++) {
      const h = eliteHash(i, frameCount);
      let ch = text[i];
      let color;

      const flicker = Math.sin(t * 3 + i) > 0.7;

      if (h < 0.15 && ch !== ' ') {
        ch = GLITCH_CHARS[Math.floor(eliteHash(i + 33, frameCount) * GLITCH_CHARS.length)];
        color = flicker ? rgb(255, 40, 40) : rgb(80, 0, 0);
      } else {
        const pulse = Math.sin(t + i * 0.3) * 0.5 + 0.5;
        const r = Math.round(180 + pulse * 75);
        const g = Math.round(30 + pulse * 30);
        const b = Math.round(30 + pulse * 30);
        color = rgb(r, g, b);
      }

      screen.set(x + i, y, ch, color, null, true);
    }
    return text.length;
  }

  if (rank.id === 'black_ice') {
    // BLACK_ICE — ice blue shimmer with frost sparkle
    const t = frameCount * 0.08;
    for (let i = 0; i < text.length; i++) {
      const h = eliteHash(i, frameCount);
      let ch = text[i];

      // Frost sparkle: occasional bright white flash on a character
      const sparkle = h < 0.08 && ch !== ' ';

      const wave = Math.sin(t + i * 0.5) * 0.5 + 0.5;
      let color;
      if (sparkle) {
        color = rgb(240, 250, 255);
        ch = '✦';
      } else {
        const r = Math.round(100 + wave * 60);
        const g = Math.round(200 + wave * 30);
        const b = Math.round(240 + wave * 15);
        color = rgb(r, g, b);
      }

      screen.set(x + i, y, ch, color, null, true);
    }
    return text.length;
  }

  // Standard ranks — static color
  for (let i = 0; i < text.length; i++) {
    screen.set(x + i, y, text[i], rank.color, null, true);
  }
  return text.length;
}

// ─── Rank change display for wager results screen ───
// Returns array of { text, color } lines to render after wager results

function formatRankChange(result) {
  const dim = rgb(100, 100, 130);
  const bright = rgb(230, 230, 245);
  const lines = [];

  // RP change line
  const rpSign = result.rpChange >= 0 ? '+' : '';
  const rpColor = result.rpChange >= 0 ? rgb(140, 230, 180) : rgb(240, 150, 170);
  lines.push({
    text: `${rpSign}${result.rpChange} RP`,
    color: rpColor,
  });

  // Current RP
  lines.push({
    text: `Rating: ${result.newRp} RP`,
    color: dim,
  });

  // Promotion / demotion
  if (result.promoted) {
    lines.push({
      text: `RANK UP >>> ${result.newRank.icon} ${result.newRank.name}`,
      color: result.newRank.color,
      bold: true,
    });
  } else if (result.demoted) {
    lines.push({
      text: `Rank down... ${result.newRank.icon} ${result.newRank.name}`,
      color: rgb(240, 150, 170),
    });
  } else {
    // Show current rank + progress
    const next = result.nextRank;
    if (next) {
      lines.push({
        text: `${result.newRank.icon} ${result.newRank.name}  (${next.rp - result.newRp} RP to ${next.name})`,
        color: result.newRank.color,
      });
    } else {
      lines.push({
        text: `${result.newRank.icon} ${result.newRank.name}  (MAX RANK)`,
        color: result.newRank.color,
      });
    }
  }

  // Streak
  if (result.data.streak >= 3) {
    lines.push({
      text: `${result.data.streak} win streak!`,
      color: rgb(255, 200, 50),
    });
  }

  return lines;
}

module.exports = {
  RANKS,
  loadRanked,
  saveRanked,
  getRankedData,
  getCurrentRank,
  getRp,
  getRankForRp,
  getRankIndex,
  getNextRank,
  updateRank,
  calculateRpChange,
  getColoredRank,
  getRankProgressBar,
  getRankSummary,
  drawRankBadge,
  formatRankChange,
};
