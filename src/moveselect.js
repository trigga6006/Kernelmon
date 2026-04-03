// ═══════════════════════════════════════════════════════════════
// MOVE SELECTION UI — Arrow keys to cycle, Enter to confirm
// Includes BAG option for using items mid-battle
// Supports background animation via onTick callback
// ═══════════════════════════════════════════════════════════════

const { colors, rgb, RESET, ESC } = require('./palette');
const { getOwnedItems, useItem, ITEMS, RARITY_COLORS } = require('./items');
const { SIGNATURE_COLOR, SIGNATURE_ACCENT, SIGNATURE_ICON } = require('./signature');

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
// onTick: optional callback called at ~20fps to animate background scene.
//   If provided, selectMove will NOT call screen.render() itself —
//   it writes its UI to the buffer and onTick's caller handles rendering.
function selectMove(moves, screen, logX, logY, logW, logH, onTick) {
  return new Promise((resolve) => {
    let cursor = 0;
    let mode = 'moves';   // 'moves' or 'bag'
    let bagItems = [];
    const totalSlots = moves.length + 1;  // moves + BAG option
    let done = false;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    // Draw the move selection UI into the log area of the screen buffer
    function drawMoveUI() {
      // Clear the log area
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

          if (m.signature) {
            // Signature moves get gold/amber treatment
            if (selected) {
              screen.text(logX + 1, y, '▸', SIGNATURE_COLOR, null, true);
              screen.text(logX + 3, y, SIGNATURE_ICON, SIGNATURE_COLOR, null, true);
              screen.text(logX + 5, y, m.label.padEnd(20), SIGNATURE_COLOR, null, true);
              screen.text(logX + 26, y, m.desc, SIGNATURE_ACCENT);
            } else {
              screen.text(logX + 3, y, SIGNATURE_ICON, SIGNATURE_ACCENT);
              screen.text(logX + 5, y, m.label.padEnd(20), SIGNATURE_ACCENT);
              screen.text(logX + 26, y, m.desc, rgb(180, 140, 50));
            }
          } else {
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
    }

    // Background animation loop — runs at ~20fps if onTick provided
    let animTimer = null;
    function startAnim() {
      if (!onTick) return;
      const TICK = 50; // 20fps
      function tick() {
        if (done) return;
        const tickStart = Date.now();
        onTick();        // draw background scene (matrix rain, sprites, etc.)
        drawMoveUI();    // overlay move selection UI
        screen.render();
        const elapsed = Date.now() - tickStart;
        animTimer = setTimeout(tick, Math.max(0, TICK - elapsed));
      }
      animTimer = setTimeout(tick, TICK);
    }

    function stopAnim() {
      if (animTimer) { clearTimeout(animTimer); animTimer = null; }
    }

    function onKey(key) {
      if (done) return;
      if (key === '\x1b[A' || key === 'k') {
        const max = mode === 'moves' ? totalSlots : bagItems.length;
        if (max > 0) cursor = (cursor - 1 + max) % max;
      } else if (key === '\x1b[B' || key === 'j') {
        const max = mode === 'moves' ? totalSlots : bagItems.length;
        if (max > 0) cursor = (cursor + 1) % max;
      } else if (key === '\r' || key === '\n' || key === ' ') {
        if (mode === 'moves') {
          if (cursor < moves.length) {
            done = true;
            stopAnim();
            cleanup();
            resolve({ type: 'move', move: moves[cursor] });
            return;
          } else {
            bagItems = getOwnedItems();
            mode = 'bag';
            cursor = 0;
          }
        } else if (mode === 'bag') {
          if (bagItems.length > 0 && cursor < bagItems.length) {
            done = true;
            stopAnim();
            cleanup();
            resolve({ type: 'item', item: bagItems[cursor] });
            return;
          }
        }
      } else if (key === '\x1b' || key === 'q') {
        if (mode === 'bag') {
          mode = 'moves';
          cursor = moves.length;
        }
      } else if (key === '\x03') {
        done = true;
        stopAnim();
        cleanup();
        process.exit(0);
      }

      // If no onTick, render immediately on key press (fallback)
      if (!onTick) {
        drawMoveUI();
        screen.render();
      }
      // With onTick, the animation loop handles rendering on next tick
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);

    // Initial render
    if (onTick) {
      onTick();
      drawMoveUI();
      screen.render();
      startAnim();
    } else {
      drawMoveUI();
      screen.render();
    }
  });
}

module.exports = { selectMove, CAT_COLORS, CAT_ICONS };
