// ═══════════════════════════════════════════════════════════════
// MATCH HISTORY — Local W/L tracking per opponent
// Stored in {project-root}/.wso/history.json
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.wso');
const HISTORY_FILE = path.join(WSO_DIR, 'history.json');

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(records) {
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2));
}

// Save a match result
function saveMatch(myFighter, opponent, winner, mode = 'auto') {
  // winner is 'a' or 'b' — 'a' is always the local player in the CLI
  const iWon = winner === 'a';
  const record = {
    timestamp: new Date().toISOString(),
    myId: myFighter.id,
    myName: myFighter.name,
    opponentId: opponent.id,
    opponentName: opponent.name,
    opponentGpu: opponent.gpu || '',
    mode,
    iWon,
  };
  const history = loadHistory();
  history.push(record);
  saveHistory(history);
}

// Get aggregated W/L per opponent
function getRecords() {
  const history = loadHistory();
  const byOpponent = {};

  for (const match of history) {
    const key = match.opponentId;
    if (!byOpponent[key]) {
      byOpponent[key] = {
        name: match.opponentName,
        gpu: match.opponentGpu || '',
        wins: 0,
        losses: 0,
        lastPlayed: match.timestamp,
      };
    }
    if (match.iWon) byOpponent[key].wins++;
    else byOpponent[key].losses++;
    // Update name/gpu to latest (in case detection improved)
    byOpponent[key].name = match.opponentName;
    if (match.opponentGpu) byOpponent[key].gpu = match.opponentGpu;
    if (match.timestamp > byOpponent[key].lastPlayed) {
      byOpponent[key].lastPlayed = match.timestamp;
    }
  }

  return byOpponent;
}

// Format relative time
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Print formatted history to terminal
function printHistory() {
  const records = getRecords();
  const opponents = Object.values(records);

  if (opponents.length === 0) {
    console.log('\x1b[38;2;100;100;130m  No match history yet. Go battle someone!\x1b[0m');
    return;
  }

  // Sort by most recent
  opponents.sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed));

  const cyan = '\x1b[38;2;130;220;235m';
  const bright = '\x1b[38;2;230;230;245m';
  const dim = '\x1b[38;2;100;100;130m';
  const mint = '\x1b[38;2;140;230;180m';
  const rose = '\x1b[38;2;240;150;170m';
  const gold = '\x1b[38;2;240;220;140m';

  const totalW = opponents.reduce((s, o) => s + o.wins, 0);
  const totalL = opponents.reduce((s, o) => s + o.losses, 0);
  const totalPct = totalW + totalL > 0 ? Math.round((totalW / (totalW + totalL)) * 100) : 0;

  console.log(`${cyan}  ╭──────────────────────────────────────────────────╮${RESET}`);
  console.log(`${cyan}  │  ${bright}MATCH HISTORY${dim}                   ${bright}${totalW}W ${totalL}L (${totalPct}%)${cyan}  │${RESET}`);
  console.log(`${cyan}  ├──────────────────────────────────────────────────┤${RESET}`);

  for (const opp of opponents) {
    const total = opp.wins + opp.losses;
    const pct = Math.round((opp.wins / total) * 100);
    const winColor = opp.wins >= opp.losses ? mint : rose;
    const last = timeAgo(opp.lastPlayed);

    console.log(`${cyan}  │  ${bright}vs ${opp.name.slice(0, 30).padEnd(30)}${dim}        │${RESET}`);
    if (opp.gpu) {
      console.log(`${cyan}  │  ${dim}   ${opp.gpu.slice(0, 30).padEnd(30)}${dim}        │${RESET}`);
    }
    console.log(`${cyan}  │  ${dim}   ${winColor}${opp.wins}W${dim} - ${rose}${opp.losses}L${dim}  (${pct}%)   Last: ${last.padEnd(12)}${cyan} │${RESET}`);
    console.log(`${cyan}  │                                                  │${RESET}`);
  }

  console.log(`${cyan}  ╰──────────────────────────────────────────────────╯${RESET}`);
}

module.exports = { saveMatch, loadHistory, getRecords, printHistory };
