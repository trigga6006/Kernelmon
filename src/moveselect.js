// ═══════════════════════════════════════════════════════════════
// MOVE SELECTION UI — Arrow keys to cycle, Enter to confirm
// Includes BAG option for using items mid-battle
// ═══════════════════════════════════════════════════════════════

const { colors, rgb, RESET, ESC } = require('./palette');
const { getOwnedItems, useItem, ITEMS, RARITY_COLORS } = require('./items');

const CAT_COLORS = {
  physical: colors.peach,
  magic:    colors.lavender,
  speed:    colors.sky,
  special:  colors.gold,
};

const CAT_ICONS = {
  physical: '⚔',
  magic:    '◆',
  speed:    '»',
  special:  '★',
};

// Main move selection — returns { type: 'move', move } or { type: 'item', item }
function selectMove(moves, screen, logX, logY, logW, logH) {
  return new Promise((resolve) => {
    let cursor = 0;
    let mode = 'moves';   // 'moves' or 'bag'
    let bagItems = [];
    const totalSlots = moves.length + 1;  // moves + BAG option

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      for (let row = 0; row < logH; row++) {
        for (let x = logX; x < logX + logW; x++) {
          screen.set(x, logY + row, ' ');
        }
      }

      if (mode === 'moves') {
        screen.text(logX + 1, logY, '╸ SELECT YOUR MOVE ╺', colors.gold, null, true);

        for (let i = 0; i < moves.length; i++) {
          const m = moves[i];
          const y = logY + 1 + i;
          const selected = i === cursor;
          const icon = CAT_ICONS[m.cat] || '·';
          const catColor = CAT_COLORS[m.cat] || colors.dim;

          if (selected) {
            screen.text(logX + 1, y, '▸', colors.white, null, true);
            screen.text(logX + 3, y, icon, catColor, null, true);
            screen.text(logX + 5, y, m.label.padEnd(20), colors.white, null, true);
            screen.text(logX + 26, y, m.desc, catColor);
          } else {
            screen.text(logX + 3, y, icon, colors.dimmer);
            screen.text(logX + 5, y, m.label.padEnd(20), colors.dim);
            screen.text(logX + 26, y, m.desc, colors.dimmer);
          }
        }

        // BAG option
        const bagY = logY + 1 + moves.length;
        const bagSelected = cursor === moves.length;
        const ownedCount = getOwnedItems().reduce((s, i) => s + i.count, 0);
        if (bagSelected) {
          screen.text(logX + 1, bagY, '▸', colors.white, null, true);
          screen.text(logX + 3, bagY, '◰', colors.mint, null, true);
          screen.text(logX + 5, bagY, 'BAG'.padEnd(20), colors.white, null, true);
          screen.text(logX + 26, bagY, `${ownedCount} items`, colors.mint);
        } else {
          screen.text(logX + 3, bagY, '◰', colors.dimmer);
          screen.text(logX + 5, bagY, 'BAG'.padEnd(20), colors.dim);
          screen.text(logX + 26, bagY, `${ownedCount} items`, colors.dimmer);
        }

      } else if (mode === 'bag') {
        screen.text(logX + 1, logY, '╸ USE AN ITEM ╺  (Esc to go back)', colors.mint, null, true);

        if (bagItems.length === 0) {
          screen.text(logX + 3, logY + 1, 'Bag is empty! Win battles to earn items.', colors.dim);
        } else {
          for (let i = 0; i < Math.min(bagItems.length, logH - 1); i++) {
            const item = bagItems[i];
            const y = logY + 1 + i;
            const selected = i === cursor;
            const rc = RARITY_COLORS[item.rarity] || colors.dim;

            if (selected) {
              screen.text(logX + 1, y, '▸', colors.white, null, true);
              screen.text(logX + 3, y, item.icon, rc, null, true);
              screen.text(logX + 5, y, `${item.name} x${item.count}`.padEnd(22), colors.white, null, true);
              screen.text(logX + 28, y, item.desc.slice(0, logW - 32), rc);
            } else {
              screen.text(logX + 3, y, item.icon, colors.dimmer);
              screen.text(logX + 5, y, `${item.name} x${item.count}`.padEnd(22), colors.dim);
              screen.text(logX + 28, y, item.desc.slice(0, logW - 32), colors.dimmer);
            }
          }
        }
      }

      screen.render();
    }

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k') {
        const max = mode === 'moves' ? totalSlots : bagItems.length;
        cursor = (cursor - 1 + max) % max;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        const max = mode === 'moves' ? totalSlots : bagItems.length;
        cursor = (cursor + 1) % max;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        if (mode === 'moves') {
          if (cursor < moves.length) {
            // Selected a move
            cleanup();
            resolve({ type: 'move', move: moves[cursor] });
          } else {
            // Selected BAG
            bagItems = getOwnedItems();
            mode = 'bag';
            cursor = 0;
            render();
          }
        } else if (mode === 'bag') {
          if (bagItems.length > 0 && cursor < bagItems.length) {
            const item = bagItems[cursor];
            cleanup();
            resolve({ type: 'item', item });
          }
        }
      } else if (key === '\x1b' || key === 'q') {
        if (mode === 'bag') {
          // Go back to moves
          mode = 'moves';
          cursor = moves.length; // re-highlight BAG
          render();
        }
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

module.exports = { selectMove, CAT_COLORS, CAT_ICONS };
