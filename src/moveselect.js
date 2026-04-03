// ═══════════════════════════════════════════════════════════════
// MOVE SELECTION UI — Arrow keys to cycle, Enter to confirm
// Renders inline in the battle screen's log area
// ═══════════════════════════════════════════════════════════════

const { colors, rgb, RESET, ESC } = require('./palette');

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

// Prompt the user to pick a move — renders in the terminal, blocks until choice is made
function selectMove(moves, screen, logX, logY, logW, logH) {
  return new Promise((resolve) => {
    let cursor = 0;
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      // Clear the selection area
      for (let row = 0; row < logH; row++) {
        for (let x = logX; x < logX + logW; x++) {
          screen.set(x, logY + row, ' ');
        }
      }

      // Header
      screen.text(logX + 1, logY, '╸ SELECT YOUR MOVE ╺', colors.gold, null, true);

      // Draw each move option
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const y = logY + 1 + i;
        const selected = i === cursor;
        const icon = CAT_ICONS[m.cat] || '·';
        const catColor = CAT_COLORS[m.cat] || colors.dim;

        if (selected) {
          // Highlighted — bright with arrow indicator
          screen.text(logX + 1, y, '▸', colors.white, null, true);
          screen.text(logX + 3, y, icon, catColor, null, true);
          screen.text(logX + 5, y, m.label.padEnd(20), colors.white, null, true);
          screen.text(logX + 26, y, m.desc, catColor);
        } else {
          // Dim
          screen.text(logX + 1, y, ' ');
          screen.text(logX + 3, y, icon, colors.dimmer);
          screen.text(logX + 5, y, m.label.padEnd(20), colors.dim);
          screen.text(logX + 26, y, m.desc, colors.dimmer);
        }
      }

      screen.render();
    }

    function onKey(key) {
      if (key === '\x1b[A' || key === 'k') {
        // Up arrow or k
        cursor = (cursor - 1 + moves.length) % moves.length;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        // Down arrow or j
        cursor = (cursor + 1) % moves.length;
        render();
      } else if (key === '\r' || key === '\n' || key === ' ') {
        // Enter or space — confirm
        cleanup();
        resolve(moves[cursor]);
      } else if (key === '\x03') {
        // Ctrl+C
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
