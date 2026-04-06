// ═══════════════════════════════════════════════════════════════
// REDEEM CODES — Enter 6-digit promo codes for rewards
// Rewards: lootbox (opens animated) or credits (added to balance)
// Redeemed codes are tracked so each code works only once.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { Screen } = require('./screen');
const { colors, rgb, RESET } = require('./palette');
const { addCredits, getBalance, formatBalance } = require('./credits');
const { BOXES, openLootBoxAnimated } = require('./lootbox');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const REDEEMED_FILE = path.join(WSO_DIR, 'redeemed.json');

// ─── Code database ───
// Add new promo codes here. Keys are uppercase, no spaces.
// type: 'credits' | 'lootbox'
// For credits: amount = number of credits
// For lootbox: box = box key from BOXES array ('standard','premium','elite','transcendent')

const CODES = {
  KERN01: { type: 'credits', amount: 500,  desc: '500 Credits' },
  LAUNCH: { type: 'lootbox', box: 'standard', desc: 'Standard Crate' },
  ALPHA1: { type: 'lootbox', box: 'premium',  desc: 'Premium Crate' },
  BETA22: { type: 'credits', amount: 1000, desc: '1,000 Credits' },
  GODMOD: { type: 'lootbox', box: 'transcendent', desc: 'Transcendent Crate' },
  HACKER: { type: 'credits', amount: 250,  desc: '250 Credits' },
};

// ─── Redemption tracking ───

function loadRedeemed() {
  try {
    if (!fs.existsSync(REDEEMED_FILE)) return [];
    return JSON.parse(fs.readFileSync(REDEEMED_FILE, 'utf8'));
  } catch { return []; }
}

function saveRedeemed(list) {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
  fs.writeFileSync(REDEEMED_FILE, JSON.stringify(list, null, 2));
}

function markRedeemed(code) {
  const list = loadRedeemed();
  if (!list.includes(code)) {
    list.push(code);
    saveRedeemed(list);
  }
}

function isRedeemed(code) {
  return loadRedeemed().includes(code);
}

// ─── Redeem UI ───

async function openRedeemScreen() {
  const screen = new Screen();
  screen.enter();
  const w = screen.width;
  const h = screen.height;

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let buf = '';
  let message = null;    // { text, color }
  let phase = 'input';   // 'input' | 'result' | 'done'

  const GOLD = rgb(255, 215, 0);
  const GREEN = rgb(0, 220, 120);
  const RED = rgb(255, 80, 80);
  const DIM = colors.dimmer;
  const CYAN = rgb(130, 220, 235);

  function render() {
    screen.clear();
    const cy = Math.floor(h / 2);

    // Title bar
    screen.hline(0, 0, w, '─', DIM);
    screen.centerText(0, ' REDEEM CODE ', CYAN, null, true);

    if (phase === 'input') {
      // Code entry
      screen.centerText(cy - 3, 'Enter a 6-digit promo code', colors.dim);

      // Draw input box
      const boxW = 16;
      const boxX = Math.floor((w - boxW) / 2);
      screen.hline(boxX, cy - 1, boxW, '─', CYAN);
      screen.hline(boxX, cy + 1, boxW, '─', CYAN);
      screen.set(boxX, cy - 1, '┌', CYAN);
      screen.set(boxX + boxW - 1, cy - 1, '┐', CYAN);
      screen.set(boxX, cy + 1, '└', CYAN);
      screen.set(boxX + boxW - 1, cy + 1, '┘', CYAN);
      screen.set(boxX, cy, '│', CYAN);
      screen.set(boxX + boxW - 1, cy, '│', CYAN);

      // Code characters with individual slots
      const display = buf.padEnd(6, '_').slice(0, 6);
      const codeX = Math.floor((w - 11) / 2); // 6 chars with spaces = 11 wide
      for (let i = 0; i < 6; i++) {
        const ch = display[i];
        const col = ch === '_' ? colors.dim : rgb(255, 255, 255);
        screen.set(codeX + i * 2, cy, ch, col, null, ch !== '_');
      }

      // Error message if any
      if (message) {
        screen.centerText(cy + 3, message.text, message.color);
      }

      screen.centerText(cy + 5, 'Enter to submit  ·  Esc to go back', DIM);

      // Balance
      screen.centerText(h - 2, `Balance: ${formatBalance(getBalance())}`, colors.dim);
    } else if (phase === 'result') {
      // Success result screen
      screen.centerText(cy - 3, '╔══════════════════════╗', GOLD);
      screen.centerText(cy - 2, '║   CODE REDEEMED!     ║', GOLD);
      screen.centerText(cy - 1, '╚══════════════════════╝', GOLD);

      if (message) {
        screen.centerText(cy + 1, message.text, message.color);
      }
      screen.centerText(cy + 3, `Balance: ${formatBalance(getBalance())}`, GREEN);
      screen.centerText(cy + 5, 'Press any key to continue', DIM);
    }

    screen.hline(2, h - 1, w - 4, '─', DIM);
    screen.render();
  }

  return new Promise((resolve) => {
    function cleanup() {
      stdin.removeListener('data', onKey);
      try { stdin.setRawMode(false); } catch {}
      try { stdin.pause(); } catch {}
    }

    async function onKey(key) {
      if (key === '\x03') {
        cleanup();
        screen.exit();
        process.exit(0);
      }

      if (phase === 'result') {
        // Any key returns to input or exits
        cleanup();
        screen.exit();
        resolve(true);
        return;
      }

      // Input phase
      if (key === '\x1b') {
        cleanup();
        screen.exit();
        resolve(false);
        return;
      }

      if (key === '\x7f' || key === '\b') {
        buf = buf.slice(0, -1);
        message = null;
        render();
        return;
      }

      if (key === '\r' || key === '\n') {
        if (buf.length !== 6) {
          message = { text: 'Code must be exactly 6 characters', color: RED };
          render();
          return;
        }

        const code = buf.toUpperCase();
        const reward = CODES[code];

        if (!reward) {
          message = { text: 'Invalid code', color: RED };
          render();
          return;
        }

        if (isRedeemed(code)) {
          message = { text: 'Code already redeemed', color: RED };
          render();
          return;
        }

        // Valid code — redeem it
        markRedeemed(code);
        stdin.removeListener('data', onKey);

        if (reward.type === 'credits') {
          addCredits(reward.amount);
          phase = 'result';
          message = { text: `+ ${reward.desc}`, color: GOLD };
          render();
          stdin.on('data', onKey);
        } else if (reward.type === 'lootbox') {
          // Show brief message then open lootbox animation
          screen.clear();
          screen.centerText(Math.floor(h / 2), `Opening ${reward.desc}...`, GOLD);
          screen.render();

          // Find the box definition
          const box = BOXES.find(b => b.key === reward.box) || BOXES[0];
          // Brief pause then open animated lootbox
          await new Promise(r => setTimeout(r, 800));
          screen.exit();
          const lootScreen = new Screen();
          lootScreen.enter();
          await openLootBoxAnimated(box, lootScreen);
          lootScreen.exit();

          cleanup();
          resolve(true);
        }
        return;
      }

      // Alphanumeric input only, max 6 chars
      if (key.length === 1 && /[A-Za-z0-9]/.test(key) && buf.length < 6) {
        buf += key.toUpperCase();
        message = null;
        render();
      }
    }

    stdin.on('data', onKey);
    render();
  });
}

module.exports = { openRedeemScreen, CODES };
