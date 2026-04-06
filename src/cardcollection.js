// ════════════════════════════���══════════════════════════════════
// CARD COLLECTION — Browse all owned cards with full art display
// Horizontal scroll through cards, detail panel, type/rarity filter
// ═════════════════════════════════════════���═════════════════════

const { colors, rgb } = require('./palette');
const {
  CARDS, CARD_RARITY_ORDER, CARD_RARITY_COLORS_RGB, CARD_RARITY_ICONS,
  CARD_TYPE_LABELS, CARD_TYPE_COLORS_RGB,
  getOwnedCards, getTotalCardCount, getOwnedCardCount,
} = require('./cards');
const { drawCard, CARD_W, CARD_H } = require('./cardart');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

const FILTERS = ['all', 'passive', 'reactive', 'active'];

function openCardCollection(screen) {
  return new Promise((resolve) => {
    let cursor = 0;
    let filterIdx = 0;
    let frameCount = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function getFilteredCards() {
      const owned = getOwnedCards();
      const filter = FILTERS[filterIdx];
      let cards = filter === 'all' ? owned : owned.filter(c => c.type === filter);
      // Sort: rarity desc, then type, then name
      cards.sort((a, b) => {
        const ra = CARD_RARITY_ORDER.indexOf(a.rarity);
        const rb = CARD_RARITY_ORDER.indexOf(b.rarity);
        if (ra !== rb) return rb - ra; // rarest first
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });
      return cards;
    }

    // Also build a "full catalog" view for silhouettes of unowned cards
    function getAllCardsForDisplay() {
      const owned = getOwnedCards();
      const ownedIds = new Set(owned.map(c => c.id));
      const filter = FILTERS[filterIdx];
      let all = Object.values(CARDS);
      if (filter !== 'all') all = all.filter(c => c.type === filter);
      all.sort((a, b) => {
        const ra = CARD_RARITY_ORDER.indexOf(a.rarity);
        const rb = CARD_RARITY_ORDER.indexOf(b.rarity);
        if (ra !== rb) return rb - ra;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });
      return all.map(c => ({
        ...c,
        owned: ownedIds.has(c.id),
        count: owned.find(o => o.id === c.id)?.count || 0,
      }));
    }

    function onKey(key) {
      const cards = getAllCardsForDisplay();

      if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
        return;
      }

      // Left/right: scroll cards
      if (key === '\x1b[D' || key === 'h' || key === 'a') {
        cursor = Math.max(0, cursor - 1);
      } else if (key === '\x1b[C' || key === 'l' || key === 'd') {
        cursor = Math.min(cards.length - 1, cursor + 1);
      }

      // Tab: cycle filter
      if (key === '\t') {
        filterIdx = (filterIdx + 1) % FILTERS.length;
        cursor = 0;
      }

      // Page up/down for faster scrolling
      if (key === '\x1b[5~') cursor = Math.max(0, cursor - 5);
      if (key === '\x1b[6~') cursor = Math.min(cards.length - 1, cursor + 5);
    }

    stdin.on('data', onKey);

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    const timer = setInterval(() => {
      frameCount++;
      const w = screen.width;
      const h = screen.height;
      screen.clear();

      const cards = getAllCardsForDisplay();
      const ownedCount = getOwnedCardCount();
      const totalCount = getTotalCardCount();

      // ── Header ──
      screen.text(3, 0, '╸ CARD BINDER ╺', colors.gold, null, true);
      const countStr = `${ownedCount}/${totalCount} cards`;
      screen.text(w - countStr.length - 3, 0, countStr, colors.dim);

      // ── Filter tabs ──
      let tabX = 3;
      for (let i = 0; i < FILTERS.length; i++) {
        const label = FILTERS[i].toUpperCase();
        const active = i === filterIdx;
        const tc = i === 0 ? colors.white :
          rgb(...(CARD_TYPE_COLORS_RGB[FILTERS[i]] || [180, 180, 180]));
        if (active) {
          screen.text(tabX, 1, `[${label}]`, tc, null, true);
        } else {
          screen.text(tabX, 1, ` ${label} `, colors.dim);
        }
        tabX += label.length + 3;
      }

      screen.hline(1, 2, w - 2, '─', colors.dimmer);

      if (cards.length === 0) {
        screen.centerText(Math.floor(h / 2), 'No cards found. Win Card Battles to earn cards!', colors.dim);
        screen.text(3, h - 1, 'TAB filter   ESC back', colors.dimmer);
        screen.render();
        return;
      }

      // Clamp cursor
      if (cursor >= cards.length) cursor = cards.length - 1;
      if (cursor < 0) cursor = 0;

      // ── Card display area ──
      // How many full cards fit side by side?
      const cardGap = 2;
      const maxCards = Math.max(1, Math.floor((w - 6) / (CARD_W + cardGap)));
      const cardAreaY = 3;

      // Center the selected card, show neighbors
      const halfVisible = Math.floor(maxCards / 2);
      let startIdx = cursor - halfVisible;
      if (startIdx < 0) startIdx = 0;
      if (startIdx + maxCards > cards.length) startIdx = Math.max(0, cards.length - maxCards);

      const totalCardsWidth = Math.min(maxCards, cards.length) * (CARD_W + cardGap) - cardGap;
      const cardStartX = Math.floor((w - totalCardsWidth) / 2);

      for (let vi = 0; vi < maxCards && startIdx + vi < cards.length; vi++) {
        const idx = startIdx + vi;
        const card = cards[idx];
        const cx = cardStartX + vi * (CARD_W + cardGap);
        const isSelected = idx === cursor;

        drawCard(screen, cx, cardAreaY, card, {
          dimmed: !card.owned,
          frameCounter: frameCount,
        });

        // Selection indicator below card
        if (isSelected) {
          screen.text(cx + Math.floor(CARD_W / 2), cardAreaY + CARD_H, '▲', colors.gold, null, true);
        }
      }

      // Scroll indicators
      if (startIdx > 0) {
        screen.text(1, cardAreaY + Math.floor(CARD_H / 2), '◂', colors.dim, null, true);
      }
      if (startIdx + maxCards < cards.length) {
        screen.text(w - 2, cardAreaY + Math.floor(CARD_H / 2), '▸', colors.dim, null, true);
      }

      // ── Detail panel ──
      const detailY = cardAreaY + CARD_H + 2;
      screen.hline(1, detailY - 1, w - 2, '��', colors.dimmer);

      const selected = cards[cursor];
      if (selected) {
        const rc = CARD_RARITY_COLORS_RGB[selected.rarity] || [160, 165, 180];
        const rcAnsi = rgb(rc[0], rc[1], rc[2]);
        const tc = CARD_TYPE_COLORS_RGB[selected.type] || [180, 180, 180];
        const tcAnsi = rgb(tc[0], tc[1], tc[2]);
        const icon = CARD_RARITY_ICONS[selected.rarity] || '·';
        const typeLabel = CARD_TYPE_LABELS[selected.type] || 'CARD';

        screen.text(4, detailY, `${icon} `, rcAnsi, null, true);
        screen.text(6, detailY, selected.name, colors.white, null, true);
        screen.text(6 + selected.name.length + 1, detailY, `(${selected.rarity})`, rcAnsi);

        screen.text(4, detailY + 1, `Type: `, colors.dim);
        screen.text(10, detailY + 1, typeLabel, tcAnsi, null, true);

        screen.text(4, detailY + 2, selected.desc, colors.white);

        if (selected.flavor) {
          screen.text(4, detailY + 3, `"${selected.flavor}"`, rgb(120, 120, 150));
        }

        if (selected.owned) {
          screen.text(4, detailY + 4, `Owned: x${selected.count}`, colors.mint);
        } else {
          screen.text(4, detailY + 4, 'Not owned', colors.dim);
        }
      }

      // ── Footer ──
      screen.text(3, h - 1, '◂ ▸ navigate', colors.dimmer);
      screen.text(18, h - 1, 'TAB filter', colors.dimmer);
      screen.text(31, h - 1, 'ESC back', colors.dimmer);

      // Position indicator
      const posStr = `${cursor + 1}/${cards.length}`;
      screen.text(w - posStr.length - 3, h - 1, posStr, colors.dim);

      screen.render();
    }, FRAME_MS);

    // Cleanup when resolved (timer + stdin)
    const origResolve = resolve;
    resolve = (val) => {
      clearInterval(timer);
      origResolve(val);
    };
  });
}

module.exports = { openCardCollection };
