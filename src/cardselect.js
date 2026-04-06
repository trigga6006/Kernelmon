// ═══════════════════════════════════════════════════════════════
// CARD SELECT — Pre-battle card draft (pick up to 3 cards)
// Horizontal scroll through collection, toggle into battle hand
// ═══════════════════════════════════════════════════════════════

const { colors, rgb } = require('./palette');
const {
  CARD_RARITY_COLORS_RGB, CARD_RARITY_ICONS,
  CARD_TYPE_LABELS, CARD_TYPE_COLORS_RGB,
  getOwnedCards,
} = require('./cards');
const { drawCard, drawCollapsedCard, CARD_W, CARD_H, COLLAPSED_W, COLLAPSED_H } = require('./cardart');

const FPS = 20;
const FRAME_MS = 1000 / FPS;
const MAX_HAND_SIZE = 3;

function selectCards(screen) {
  return new Promise((resolve) => {
    const owned = getOwnedCards();
    // De-duplicate: show each unique card once, track count
    const uniqueCards = [];
    const seen = new Set();
    for (const card of owned) {
      if (!seen.has(card.id)) {
        uniqueCards.push(card);
        seen.add(card.id);
      }
    }

    let cursor = 0;        // index in uniqueCards
    let hand = [];          // selected card IDs (up to 3)
    let frameCount = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function isInHand(cardId) {
      return hand.includes(cardId);
    }

    function onKey(key) {
      // Escape: cancel (go back)
      if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve(null);
        return;
      }

      // Left/right: scroll collection
      if (key === '\x1b[D' || key === 'h' || key === 'a') {
        cursor = Math.max(0, cursor - 1);
      } else if (key === '\x1b[C' || key === 'l' || key === 'd') {
        cursor = Math.min(uniqueCards.length - 1, cursor + 1);
      }

      // Enter: toggle card in/out of hand
      if (key === '\r' || key === '\n') {
        if (uniqueCards.length === 0) return;
        const card = uniqueCards[cursor];
        if (isInHand(card.id)) {
          hand = hand.filter(id => id !== card.id);
        } else if (hand.length < MAX_HAND_SIZE) {
          hand.push(card.id);
        }
      }

      // Space: confirm selection (at least 1 card)
      if (key === ' ') {
        if (hand.length > 0) {
          cleanup();
          const selectedCards = hand.map(id => uniqueCards.find(c => c.id === id)).filter(Boolean);
          resolve(selectedCards);
          return;
        }
      }
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

      // ── Header ──
      screen.text(3, 0, '╸ SELECT YOUR CARDS ╺', colors.gold, null, true);
      screen.text(w - 18, 0, `(pick up to ${MAX_HAND_SIZE})`, colors.dim);

      screen.hline(1, 1, w - 2, '─', colors.dimmer);

      if (uniqueCards.length === 0) {
        screen.centerText(Math.floor(h / 2), 'No cards available!', colors.dim);
        screen.text(3, h - 1, 'ESC back', colors.dimmer);
        screen.render();
        return;
      }

      // Clamp cursor
      if (cursor >= uniqueCards.length) cursor = uniqueCards.length - 1;

      // ── Collection Row (full cards, scrollable) ──
      const collY = 2;
      const cardGap = 2;
      const maxVisible = Math.max(1, Math.floor((w - 6) / (CARD_W + cardGap)));
      const halfVis = Math.floor(maxVisible / 2);
      let startIdx = cursor - halfVis;
      if (startIdx < 0) startIdx = 0;
      if (startIdx + maxVisible > uniqueCards.length) startIdx = Math.max(0, uniqueCards.length - maxVisible);

      const totalWidth = Math.min(maxVisible, uniqueCards.length) * (CARD_W + cardGap) - cardGap;
      const startX = Math.floor((w - totalWidth) / 2);

      for (let vi = 0; vi < maxVisible && startIdx + vi < uniqueCards.length; vi++) {
        const idx = startIdx + vi;
        const card = uniqueCards[idx];
        const cx = startX + vi * (CARD_W + cardGap);
        const isSelected = idx === cursor;
        const inHand = isInHand(card.id);

        drawCard(screen, cx, collY, card, { frameCounter: frameCount });

        // Selection cursor
        if (isSelected) {
          screen.text(cx + Math.floor(CARD_W / 2), collY + CARD_H, '▲', colors.gold, null, true);
        }
        // In-hand indicator
        if (inHand) {
          const handNum = hand.indexOf(card.id) + 1;
          screen.text(cx + CARD_W - 3, collY, `[${handNum}]`, colors.mint, null, true);
        }
      }

      // Scroll indicators
      if (startIdx > 0) screen.text(1, collY + Math.floor(CARD_H / 2), '◂', colors.dim, null, true);
      if (startIdx + maxVisible < uniqueCards.length) {
        screen.text(w - 2, collY + Math.floor(CARD_H / 2), '▸', colors.dim, null, true);
      }

      // ── Divider ──
      const divY = collY + CARD_H + 2;
      screen.hline(1, divY, w - 2, '─', colors.dimmer);
      screen.text(3, divY, ' BATTLE HAND ', colors.gold, null, true);

      // ── Hand Slots (collapsed cards) ──
      const handY = divY + 1;
      const slotGap = 3;
      const totalSlotsW = MAX_HAND_SIZE * (COLLAPSED_W + slotGap) - slotGap;
      const handStartX = Math.floor((w - totalSlotsW) / 2);

      for (let i = 0; i < MAX_HAND_SIZE; i++) {
        const sx = handStartX + i * (COLLAPSED_W + slotGap);
        if (i < hand.length) {
          const card = uniqueCards.find(c => c.id === hand[i]);
          if (card) {
            drawCollapsedCard(screen, sx, handY, card, { frameCounter: frameCount });
            // Card name below
            const shortName = card.name.slice(0, COLLAPSED_W + slotGap - 1);
            screen.text(sx, handY + COLLAPSED_H + 1, shortName, colors.dim);
          }
        } else {
          // Empty slot
          screen.text(sx, handY, '╭───╮', colors.dimmer);
          screen.text(sx, handY + 1, '│   │', colors.dimmer);
          screen.text(sx, handY + 2, '│ ? │', colors.dimmer);
          screen.text(sx, handY + 3, '│   │', colors.dimmer);
          screen.text(sx, handY + 4, '╰───╯', colors.dimmer);
        }
      }

      // ── Footer ──
      screen.text(3, h - 1, '◂ ▸ browse', colors.dimmer);
      screen.text(16, h - 1, 'ENTER add/remove', colors.dimmer);
      screen.text(35, h - 1, 'SPACE confirm', hand.length > 0 ? colors.mint : colors.dimmer);
      screen.text(51, h - 1, 'ESC cancel', colors.dimmer);

      screen.render();
    }, FRAME_MS);

    const origResolve = resolve;
    resolve = (val) => {
      clearInterval(timer);
      origResolve(val);
    };
  });
}

module.exports = { selectCards };
