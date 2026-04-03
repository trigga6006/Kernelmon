// ═══════════════════════════════════════════════════════════════
// LOOT BOX — Spend credits to open mystery boxes for rewards
// Animated opening with spinning reel and reveal
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, rgb, RESET } = require('./palette');
const { createRNG } = require('./rng');
const { getBalance, spendCredits, formatBalance } = require('./credits');
const { ITEMS, addItem } = require('./items');
const { PARTS, RARITY_COLORS, RARITY_ICONS, TYPE_LABELS, TYPE_COLORS, addPart } = require('./parts');

// ─── Box tiers ───

const BOXES = [
  {
    key: 'standard',
    name: 'Standard Crate',
    cost: 100,
    icon: '▣',
    color: colors.cyan,
    desc: 'Common & uncommon items',
    weights: { common: 55, uncommon: 35, rare: 8, epic: 2, legendary: 0, mythic: 0 },
  },
  {
    key: 'premium',
    name: 'Premium Crate',
    cost: 300,
    icon: '◆',
    color: colors.lavender,
    desc: 'Better odds, rare+ possible',
    weights: { common: 25, uncommon: 35, rare: 25, epic: 12, legendary: 3, mythic: 0 },
  },
  {
    key: 'elite',
    name: 'Elite Crate',
    cost: 750,
    icon: '★',
    color: colors.gold,
    desc: 'High-tier loot guaranteed',
    weights: { common: 5, uncommon: 15, rare: 35, epic: 28, legendary: 14, mythic: 3 },
  },
];

// ─── Reward pool — mix of items and parts ───

function buildRewardPool() {
  const pool = [];

  // Add all items
  for (const [id, item] of Object.entries(ITEMS)) {
    pool.push({ type: 'item', id, rarity: item.rarity, name: item.name, icon: item.icon });
  }

  // Add all parts
  for (const [id, part] of Object.entries(PARTS)) {
    pool.push({
      type: 'part', id, rarity: part.rarity, name: part.name,
      icon: part.icon, partType: part.type,
    });
  }

  return pool;
}

function rollReward(box, rng) {
  const pool = buildRewardPool();

  // Pick rarity based on box weights
  const { weights } = box;
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = rng.next() * totalWeight;
  let chosenRarity = 'common';

  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }

  // Filter pool by rarity
  const candidates = pool.filter(r => r.rarity === chosenRarity);
  if (candidates.length === 0) {
    // Fallback to any common
    const fallback = pool.filter(r => r.rarity === 'common');
    return fallback[Math.floor(rng.next() * fallback.length)];
  }

  return candidates[Math.floor(rng.next() * candidates.length)];
}

// ─── Animated opening ───

async function openLootBoxAnimated(box, screen) {
  const rng = createRNG(Date.now() ^ (Math.random() * 0xFFFFFF | 0));
  const reward = rollReward(box, rng);

  // Apply reward
  if (reward.type === 'item') {
    addItem(reward.id);
  } else {
    addPart(reward.id);
  }

  const w = screen.width;
  const h = screen.height;
  const cy = Math.floor(h / 2);
  const cx = Math.floor(w / 2);
  const pool = buildRewardPool();

  // Phase 1: Spinning reel (1.5s)
  const SPIN_FRAMES = 30;
  const FRAME_MS = 50;

  for (let f = 0; f < SPIN_FRAMES; f++) {
    screen.clear();

    screen.centerText(1, `${box.icon}  ${box.name}  ${box.icon}`, box.color, null, true);
    screen.hline(4, 2, w - 8, '─', colors.dimmer);

    // Spinning items — slow down as we approach the end
    const speed = Math.max(1, Math.floor((SPIN_FRAMES - f) / 5));
    const visibleCount = 5;

    for (let i = 0; i < visibleCount; i++) {
      const idx = (f * speed + i) % pool.length;
      const entry = pool[idx];
      const y = cy - 2 + i;
      const isCenter = i === Math.floor(visibleCount / 2);
      const rc = RARITY_COLORS[entry.rarity] || colors.dim;
      const icon = RARITY_ICONS[entry.rarity] || '·';

      if (isCenter) {
        // Selection highlight
        screen.hline(cx - 20, y, 40, ' ', null);
        screen.text(cx - 20, y, '▸', colors.white, null, true);
        screen.text(cx - 18, y, icon, rc, null, true);
        screen.text(cx - 16, y, entry.name.padEnd(28), colors.white, null, true);
        screen.text(cx + 14, y, `(${entry.rarity})`, rc, null, true);
      } else {
        const dist = Math.abs(i - Math.floor(visibleCount / 2));
        const fade = dist > 1 ? colors.dimmer : colors.dim;
        screen.text(cx - 18, y, icon, fade);
        screen.text(cx - 16, y, entry.name.padEnd(28), fade);
      }
    }

    // Selection brackets
    screen.text(cx - 21, cy, '[', box.color, null, true);
    screen.text(cx + 20, cy, ']', box.color, null, true);

    screen.centerText(h - 3, 'Opening...', colors.dim);
    screen.render();
    await sleep(FRAME_MS + (f > SPIN_FRAMES - 10 ? f * 4 : 0)); // slow down at end
  }

  // Phase 2: Reveal flash (0.5s)
  for (let f = 0; f < 6; f++) {
    screen.clear();

    if (f % 2 === 0) {
      // Flash frame
      for (let y = cy - 3; y <= cy + 3; y++) {
        screen.hline(cx - 22, y, 44, '█', box.color);
      }
    }

    screen.render();
    await sleep(80);
  }

  // Phase 3: Reward display (hold for keypress)
  screen.clear();

  const rc = RARITY_COLORS[reward.rarity] || colors.dim;
  const icon = RARITY_ICONS[reward.rarity] || '·';

  screen.centerText(1, `${box.icon}  ${box.name}  ${box.icon}`, box.color, null, true);
  screen.hline(4, 2, w - 8, '─', colors.dimmer);

  // Big reveal
  screen.centerText(cy - 3, '╔════════════════════════════════╗', rc);
  screen.centerText(cy - 2, '║                                ║', rc);

  const rewardLine = `${icon}  ${reward.name}`;
  screen.centerText(cy - 1, '║', rc);
  screen.centerText(cy - 1, rewardLine, colors.white, null, true);

  const rarityLine = `(${reward.rarity})`;
  screen.centerText(cy, '║', rc);
  screen.centerText(cy, rarityLine, rc, null, true);

  if (reward.type === 'part') {
    const typeLine = `${TYPE_LABELS[reward.partType]} component`;
    screen.centerText(cy + 1, '║', rc);
    screen.centerText(cy + 1, typeLine, TYPE_COLORS[reward.partType]);
  } else {
    screen.centerText(cy + 1, '║', rc);
    screen.centerText(cy + 1, 'Battle item', colors.dim);
  }

  screen.centerText(cy + 2, '║                                ║', rc);
  screen.centerText(cy + 3, '╚════════════════════════════════╝', rc);

  screen.centerText(cy + 5, 'Added to your inventory!', colors.mint);
  screen.centerText(h - 3, `Balance: ${formatBalance(getBalance())} credits`, colors.dim);
  screen.centerText(h - 2, 'Press any key to continue', colors.dimmer);

  screen.render();

  return reward;
}

// ─── Loot box shop screen ───

function openLootShop(screen) {
  return new Promise((resolve) => {
    let cursor = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      const w = screen.width;
      const h = screen.height;
      const balance = getBalance();
      screen.clear();

      screen.centerText(0, '─'.repeat(w), colors.dimmer);
      screen.centerText(0, ' L O O T   B O X ', rgb(255, 215, 0), null, true);

      screen.text(4, 2, `Balance: ${formatBalance(balance)} credits`, colors.white, null, true);

      const startY = 4;

      for (let i = 0; i < BOXES.length; i++) {
        const box = BOXES[i];
        const y = startY + i * 5;
        const isCursor = i === cursor;
        const canAfford = balance >= box.cost;

        // Box frame
        if (isCursor) {
          screen.text(3, y, '▸', colors.white, null, true);
          screen.text(5, y, box.icon, box.color, null, true);
          screen.text(7, y, box.name, box.color, null, true);
          screen.text(7 + box.name.length + 2, y, `${box.cost} credits`, canAfford ? colors.mint : colors.rose, null, true);
        } else {
          screen.text(5, y, box.icon, colors.dim);
          screen.text(7, y, box.name, colors.dim);
          screen.text(7 + box.name.length + 2, y, `${box.cost} credits`, colors.dimmer);
        }

        screen.text(7, y + 1, box.desc, isCursor ? colors.dim : colors.dimmer);

        // Rarity odds preview
        const odds = Object.entries(box.weights)
          .filter(([, w]) => w > 0)
          .map(([r, w]) => {
            const rc = RARITY_COLORS[r] || colors.dim;
            return { r, w, rc };
          });
        let ox = 7;
        for (const { r, w: weight, rc } of odds) {
          const label = `${r}:${weight}%`;
          screen.text(ox, y + 2, label, isCursor ? rc : colors.dimmer);
          ox += label.length + 2;
        }
      }

      const footY = startY + BOXES.length * 5 + 1;
      screen.hline(2, footY, w - 4, '─', colors.dimmer);
      screen.text(4, footY + 1, '↑↓ select   Enter = open   Esc = exit', colors.dimmer);

      screen.render();
    }

    async function handleOpen() {
      const box = BOXES[cursor];
      const balance = getBalance();

      if (balance < box.cost) return; // can't afford

      if (!spendCredits(box.cost)) return;

      // Clean up input handler temporarily
      stdin.removeListener('data', onKey);

      // Run opening animation on this screen
      const reward = await openLootBoxAnimated(box, screen);

      // Wait for keypress after reveal
      await new Promise(res => {
        function onAnyKey(k) {
          stdin.removeListener('data', onAnyKey);
          res();
        }
        stdin.on('data', onAnyKey);
      });

      // Re-register and re-render shop
      stdin.on('data', onKey);
      render();
    }

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + BOXES.length) % BOXES.length;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % BOXES.length;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        handleOpen();
      } else if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { BOXES, openLootShop, openLootBoxAnimated, rollReward };
