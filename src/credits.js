// ═══════════════════════════════════════════════════════════════
// CREDITS — Point system earned from battles, spent on loot boxes
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { RESET } = require('./palette');

const WSO_DIR = path.join(__dirname, '..', '.rigemon');
const CREDITS_FILE = path.join(WSO_DIR, 'credits.json');

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadCredits() {
  try {
    if (!fs.existsSync(CREDITS_FILE)) return { balance: 0, lifetime: 0 };
    return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
  } catch { return { balance: 0, lifetime: 0 }; }
}

function saveCredits(data) {
  ensureDir();
  fs.writeFileSync(CREDITS_FILE, JSON.stringify(data, null, 2));
}

function getBalance() {
  return loadCredits().balance;
}

function getLifetimeEarned() {
  return loadCredits().lifetime;
}

function addCredits(amount) {
  const data = loadCredits();
  data.balance += amount;
  data.lifetime += amount;
  saveCredits(data);
  return data.balance;
}

function spendCredits(amount) {
  const data = loadCredits();
  if (data.balance < amount) return false;
  data.balance -= amount;
  saveCredits(data);
  return true;
}

// ─── Battle reward calculation ───
// Points earned depend on: win/loss, mode, opponent strength, margin

function calculateBattleCredits(winner, myFighter, opponent, mode) {
  const won = winner === 'a';
  let base = 0;

  // Base award by mode
  if (mode === 'turns') {
    base = won ? 150 : 40;
  } else {
    // Auto/deterministic
    base = won ? 100 : 25;
  }

  // Opponent strength bonus (stronger opponent = more credits)
  const oppAvg = (opponent.stats.str + opponent.stats.mag + opponent.stats.spd + opponent.stats.def) / 4;
  const myAvg = (myFighter.stats.str + myFighter.stats.mag + myFighter.stats.spd + myFighter.stats.def) / 4;

  // Underdog bonus: up to +50% if opponent is significantly stronger
  if (oppAvg > myAvg && won) {
    const ratio = Math.min(oppAvg / myAvg, 2.0);
    base = Math.round(base * (0.5 + ratio * 0.5));
  }

  // Close fight bonus: if winner had low HP remaining
  if (won && myFighter.stats.hp > 0) {
    const hpRatio = myFighter.stats.hp / myFighter.stats.maxHp;
    if (hpRatio < 0.25) base = Math.round(base * 1.3);  // clutch bonus
  }

  return Math.max(base, 10); // minimum 10 credits
}

// ─── Display ───

function printCreditEarned(amount, newBalance) {
  const gold = '\x1b[38;2;255;215;0m';
  const bright = '\x1b[38;2;230;230;245m';
  const dim = '\x1b[38;2;100;100;130m';
  console.log(`${gold}  ◆ +${amount} credits${bright} (balance: ${newBalance})${RESET}`);
}

function formatBalance(bal) {
  return bal.toLocaleString();
}

module.exports = {
  getBalance, getLifetimeEarned,
  addCredits, spendCredits,
  calculateBattleCredits, printCreditEarned, formatBalance,
};
