// ═══════════════════════════════════════════════════════════════
// LOOT BOX — Spend credits to open mystery boxes for rewards
// Animated opening with spinning reel and reveal
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, rgb, RESET } = require('./palette');
const { createRNG } = require('./rng');
const { getBalance, spendCredits, formatBalance, getCardKeys, spendCardKey } = require('./credits');
const { ITEMS, addItem } = require('./items');
const { PARTS, RARITY_COLORS, RARITY_ICONS, TYPE_LABELS, TYPE_COLORS, addPart } = require('./parts');
const { drawArt, getItemArt, getPartArt } = require('./itemart');
const { SKINS, addSkin } = require('./skins');
const { TITLES, TITLE_RARITY_COLORS, TITLE_RARITY_ICONS, addTitle } = require('./titles');
const { CARDS, CARD_RARITY_ICONS, CARD_RARITY_COLORS_RGB, CARD_TYPE_LABELS, CARD_TYPE_COLORS_RGB, addCard } = require('./cards');

// ─── Box tiers ───

const BOXES = [
  {
    key: 'standard',
    name: 'Standard Crate',
    cost: 200,
    icon: '▣',
    color: colors.cyan,
    desc: 'Common & uncommon items',
    weights: { common: 50, uncommon: 35, rare: 10, epic: 4, legendary: 1, mythic: 0, transcendent: 0 },
  },
  {
    key: 'premium',
    name: 'Premium Crate',
    cost: 1500,
    icon: '◆',
    color: colors.lavender,
    desc: 'Better odds, rare+ possible',
    weights: { common: 20, uncommon: 30, rare: 30, epic: 14, legendary: 4.8, mythic: 1, transcendent: 0.2 },
  },
  {
    key: 'elite',
    name: 'Elite Crate',
    cost: 3000,
    icon: '★',
    color: colors.gold,
    desc: 'High-tier loot guaranteed',
    weights: { common: 3, uncommon: 10, rare: 30, epic: 30, legendary: 23.5, mythic: 3, transcendent: 0.5 },
  },
  {
    key: 'transcendent',
    name: 'Transcendent Crate',
    cost: 5000,
    icon: '✧',
    color: rgb(200, 120, 255),
    desc: 'Ultra-rare Transcendent chance',
    weights: { common: 0, uncommon: 0, rare: 14, epic: 35, legendary: 45, mythic: 5, transcendent: 1 },
  },
  {
    key: 'card_crate',
    name: 'Card Crate',
    cost: 1,
    keyType: 'card_key',
    icon: '♦',
    color: rgb(255, 180, 100),
    desc: 'Cards only — divine & primordial possible',
    weights: { common: 30, uncommon: 28, rare: 20, epic: 12, legendary: 5, mythic: 3, transcendent: 1.5, divine: 0.4, primordial: 0.1 },
    cardOnly: true,
  },
];

// ─── Special crates (not listed in shop, redeem-code only) ───

const SPECIAL_BOXES = {
  skin_crate: {
    key: 'skin_crate',
    name: 'Transcendent Skin Crate',
    cost: 0,
    icon: '✧',
    color: rgb(200, 120, 255),
    desc: 'Guaranteed Transcendent Skin',
    weights: { transcendent: 100 },
    skinOnly: true, // restricts pool to skins only
  },
};

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

  // Add all skins (transcendent rarity)
  for (const [id, skin] of Object.entries(SKINS)) {
    pool.push({
      type: 'skin', id, rarity: skin.rarity, name: skin.name, icon: skin.icon,
    });
  }

  // Add titles (excluding special tags — creator/founding_player)
  for (const [id, title] of Object.entries(TITLES)) {
    if (title.special) continue;
    const icon = TITLE_RARITY_ICONS[title.rarity] || '·';
    pool.push({
      type: 'title', id, rarity: title.rarity, name: title.name, icon,
    });
  }

  // Add all cards (divine & primordial only reachable via Card Crate weights)
  for (const [id, card] of Object.entries(CARDS)) {
    const icon = CARD_RARITY_ICONS[card.rarity] || '·';
    pool.push({
      type: 'card', id, rarity: card.rarity, name: card.name, icon,
      cardType: card.type, // passive/reactive/active
    });
  }

  return pool;
}

// Type weights — controls how likely each reward type is within a rarity tier
// Items (bag) most common, RAM/storage mid, CPU/GPU rare
const TYPE_WEIGHTS = {
  item: 6,
  ram: 3,
  storage: 3,
  cpu: 1,
  gpu: 1,
  skin: 1,
  title: 2,
  card: 2,
};

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

  // Filter pool by rarity (and type restrictions if flagged)
  let candidates = pool.filter(r => r.rarity === chosenRarity);
  if (box.skinOnly) candidates = candidates.filter(r => r.type === 'skin');
  if (box.cardOnly) candidates = candidates.filter(r => r.type === 'card');
  if (candidates.length === 0) {
    const fallback = box.skinOnly
      ? pool.filter(r => r.type === 'skin')
      : box.cardOnly
        ? pool.filter(r => r.type === 'card' && r.rarity === 'common')
        : pool.filter(r => r.rarity === 'common');
    return fallback[Math.floor(rng.next() * fallback.length)];
  }

  // Weighted pick by type — items most common, CPU/GPU rarest
  const weighted = candidates.map(c => ({
    entry: c,
    w: TYPE_WEIGHTS[c.partType || c.type] || 1,
  }));
  const wTotal = weighted.reduce((s, w) => s + w.w, 0);
  let wRoll = rng.next() * wTotal;
  for (const { entry, w } of weighted) {
    wRoll -= w;
    if (wRoll <= 0) return entry;
  }
  return weighted[weighted.length - 1].entry;
}

// ─── Animated opening ───

async function openLootBoxAnimated(box, screen) {
  const rng = createRNG(Date.now() ^ (Math.random() * 0xFFFFFF | 0));
  const reward = rollReward(box, rng);

  // Apply reward
  if (reward.type === 'item') {
    addItem(reward.id);
  } else if (reward.type === 'skin') {
    addSkin(reward.id, 'lootbox_' + box.key);
  } else if (reward.type === 'title') {
    addTitle(reward.id, 'lootbox:' + box.key);
  } else if (reward.type === 'card') {
    addCard(reward.id);
  } else {
    addPart(reward.id);
  }

  const w = screen.width;
  const h = screen.height;
  const cy = Math.floor(h / 2);
  const cx = Math.floor(w / 2);
  let pool = buildRewardPool();
  if (box.cardOnly) pool = pool.filter(r => r.type === 'card');

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
      const crgb = CARD_RARITY_COLORS_RGB[entry.rarity];
      const rc = RARITY_COLORS[entry.rarity] || (crgb ? rgb(crgb[0], crgb[1], crgb[2]) : colors.dim);
      const icon = RARITY_ICONS[entry.rarity] || CARD_RARITY_ICONS[entry.rarity] || '·';

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

  const _crgb = CARD_RARITY_COLORS_RGB[reward.rarity];
  const rc = RARITY_COLORS[reward.rarity] || (_crgb ? rgb(_crgb[0], _crgb[1], _crgb[2]) : colors.dim);
  const icon = RARITY_ICONS[reward.rarity] || CARD_RARITY_ICONS[reward.rarity] || '·';

  screen.centerText(1, `${box.icon}  ${box.name}  ${box.icon}`, box.color, null, true);
  screen.hline(4, 2, w - 8, '─', colors.dimmer);

  // Big reveal box
  screen.centerText(cy - 4, '╔════════════════════════════════╗', rc);
  screen.centerText(cy - 3, '║                                ║', rc);

  // Art sprite centered above the name
  if (reward.type === 'skin') {
    // Transcendent skin: draw a shimmering icon instead of item art
    const { transcendentGlow } = require('./skinsprites');
    const shimmer = transcendentGlow || (() => rc);
    screen.centerText(cy - 3, '·  ✧  ·', typeof shimmer === 'function' ? shimmer(0, 0) : rc);
    screen.centerText(cy - 2, '✧     ✧', typeof shimmer === 'function' ? shimmer(0, 10) : rc);
  } else if (reward.type === 'title') {
    // Title: show the rarity icon as a badge
    const titleIcon = TITLE_RARITY_ICONS[reward.rarity] || '·';
    const titleColor = TITLE_RARITY_COLORS[reward.rarity] || rc;
    screen.centerText(cy - 3, `${titleIcon}  ${titleIcon}  ${titleIcon}`, titleColor);
    screen.centerText(cy - 2, `「 TITLE 」`, titleColor);
  } else if (reward.type === 'card') {
    // Card: show card type icon and rarity pattern
    const crc = CARD_RARITY_COLORS_RGB[reward.rarity] || [160, 165, 180];
    const ctc = CARD_TYPE_COLORS_RGB[reward.cardType] || [180, 180, 180];
    const cardColor = rgb(crc[0], crc[1], crc[2]);
    const typeColor = rgb(ctc[0], ctc[1], ctc[2]);
    const cardIcon = CARD_RARITY_ICONS[reward.rarity] || '·';
    screen.centerText(cy - 3, `${cardIcon}  ${cardIcon}  ${cardIcon}`, cardColor);
    screen.centerText(cy - 2, `「 ${CARD_TYPE_LABELS[reward.cardType] || 'CARD'} 」`, typeColor);
  } else {
    const rewardArt = reward.type === 'item' ? getItemArt(reward.id) : getPartArt(reward.partType);
    if (rewardArt) {
      const artX = cx - 3; // center the 7-wide art
      drawArt(screen, artX, cy - 3, rewardArt.lines, rewardArt.colors);
    }
  }

  screen.centerText(cy - 0, '║', rc);

  const rewardLine = `${icon}  ${reward.name}`;
  screen.centerText(cy, rewardLine, colors.white, null, true);

  const rarityLine = `(${reward.rarity})`;
  screen.centerText(cy + 1, '║', rc);
  screen.centerText(cy + 1, rarityLine, rc, null, true);

  if (reward.type === 'skin') {
    screen.centerText(cy + 2, '║', rc);
    screen.centerText(cy + 2, '✧ Transcendent Skin ✧', rgb(200, 120, 255));
  } else if (reward.type === 'title') {
    screen.centerText(cy + 2, '║', rc);
    screen.centerText(cy + 2, '⚡ Rig Title ⚡', rc);
  } else if (reward.type === 'card') {
    const ctc = CARD_TYPE_COLORS_RGB[reward.cardType] || [180, 180, 180];
    const typeColor = rgb(ctc[0], ctc[1], ctc[2]);
    screen.centerText(cy + 2, '║', rc);
    screen.centerText(cy + 2, `♦ ${CARD_TYPE_LABELS[reward.cardType] || 'Card'} Card ♦`, typeColor);
  } else if (reward.type === 'part') {
    const typeLine = `${TYPE_LABELS[reward.partType]} component`;
    screen.centerText(cy + 2, '║', rc);
    screen.centerText(cy + 2, typeLine, TYPE_COLORS[reward.partType]);
  } else {
    screen.centerText(cy + 2, '║', rc);
    screen.centerText(cy + 2, 'Battle item', colors.dim);
  }

  screen.centerText(cy + 3, '║                                ║', rc);
  screen.centerText(cy + 4, '╚════════════════════════════════╝', rc);

  screen.centerText(cy + 6, 'Added to your collection!', colors.mint);
  if (box.keyType) {
    screen.centerText(h - 3, `Card Keys: ${getCardKeys()}`, rgb(255, 180, 100));
  } else {
    screen.centerText(h - 3, `Balance: ${formatBalance(getBalance())} credits`, colors.dim);
  }
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

      const cardKeys = getCardKeys();
      screen.text(4, 2, `Balance: ${formatBalance(balance)} credits`, colors.white, null, true);
      screen.text(4, 3, `Card Keys: ${cardKeys}`, rgb(255, 180, 100), null, true);

      const startY = 5;

      for (let i = 0; i < BOXES.length; i++) {
        const box = BOXES[i];
        const y = startY + i * 5;
        const isCursor = i === cursor;
        const isKeyBox = !!box.keyType;
        const canAfford = isKeyBox ? cardKeys >= box.cost : balance >= box.cost;
        const costLabel = isKeyBox ? `${box.cost} Key` : `${box.cost} credits`;

        // Box frame
        if (isCursor) {
          screen.text(3, y, '▸', colors.white, null, true);
          screen.text(5, y, box.icon, box.color, null, true);
          screen.text(7, y, box.name, box.color, null, true);
          screen.text(7 + box.name.length + 2, y, costLabel, canAfford ? colors.mint : colors.rose, null, true);
        } else {
          screen.text(5, y, box.icon, colors.dim);
          screen.text(7, y, box.name, colors.dim);
          screen.text(7 + box.name.length + 2, y, costLabel, colors.dimmer);
        }

        screen.text(7, y + 1, box.desc, isCursor ? colors.dim : colors.dimmer);

        // Rarity odds preview
        const odds = Object.entries(box.weights)
          .filter(([, w]) => w > 0)
          .map(([r, w]) => {
            const crgb = CARD_RARITY_COLORS_RGB[r];
            const rc = RARITY_COLORS[r] || (crgb ? rgb(crgb[0], crgb[1], crgb[2]) : colors.dim);
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

      if (box.keyType) {
        if (getCardKeys() < box.cost) return; // no keys
        if (!spendCardKey()) return;
      } else {
        const balance = getBalance();
        if (balance < box.cost) return; // can't afford
        if (!spendCredits(box.cost)) return;
      }

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

// ─── Card Crate drop roller (shared with battle rewards) ───

const CARD_CRATE_WEIGHTS = BOXES.find(b => b.key === 'card_crate').weights;

function rollCardCrateCard(rng) {
  const totalWeight = Object.values(CARD_CRATE_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = rng.next() * totalWeight;
  let chosenRarity = 'common';
  for (const [rarity, weight] of Object.entries(CARD_CRATE_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }

  const candidates = Object.entries(CARDS).filter(([, c]) => c.rarity === chosenRarity);
  if (candidates.length === 0) {
    const commons = Object.entries(CARDS).filter(([, c]) => c.rarity === 'common');
    const pick = commons[Math.floor(rng.next() * commons.length)];
    return pick ? { id: pick[0], ...pick[1] } : null;
  }

  // Weighted by dropWeight within the rarity tier
  const totalDW = candidates.reduce((s, [, c]) => s + (c.dropWeight || 1), 0);
  let dwRoll = rng.next() * totalDW;
  for (const [id, card] of candidates) {
    dwRoll -= (card.dropWeight || 1);
    if (dwRoll <= 0) return { id, ...card };
  }
  const last = candidates[candidates.length - 1];
  return { id: last[0], ...last[1] };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { BOXES, SPECIAL_BOXES, openLootShop, openLootBoxAnimated, rollReward, rollCardCrateCard };
