// ═══════════════════════════════════════════════════════════════
// TITLE LOCKER — View, preview, and equip titles
// ═══════════════════════════════════════════════════════════════

const { colors, rgb, RESET, BOLD } = require('./palette');
const {
  TITLES, TITLE_RARITY_COLORS, TITLE_RARITY_ICONS,
  getOwnedTitles, getEquippedTitleId,
  equipTitle, unequipTitle, drawTitle,
} = require('./titles');
const { getActiveBuildIndex } = require('./parts');

const BRIGHT = rgb(230, 230, 245);
const DIM = rgb(100, 100, 130);
const DIMMER = rgb(70, 70, 95);
const ACCENT = rgb(180, 200, 255);

function openTitleLocker(screen) {
  return new Promise((resolve) => {
    let cursor = 0;
    let animFrame = 0;
    let animInterval = null;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      const w = screen.width;
      const h = screen.height;
      const owned = getOwnedTitles();
      const buildIdx = getActiveBuildIndex();
      const equippedId = getEquippedTitleId(buildIdx);

      screen.clear();

      // Title bar
      screen.centerText(0, '─'.repeat(w), DIMMER);
      screen.centerText(0, ' T I T L E   L O C K E R ', ACCENT, null, true);

      if (owned.length === 0) {
        screen.centerText(Math.floor(h / 2) - 1, 'No titles yet.', DIM);
        screen.centerText(Math.floor(h / 2), 'Earn titles from battles and loot boxes!', DIMMER);
        screen.centerText(h - 2, 'Press ESC to exit', DIMMER);
        screen.render();
        return;
      }

      // Title list (left panel)
      const listX = 3;
      const listY = 3;
      screen.text(listX, 2, 'Owned Titles', BRIGHT, null, true);

      const maxVisible = h - 8;
      for (let i = 0; i < owned.length && i < maxVisible; i++) {
        const title = owned[i];
        const y = listY + i;

        const isCursor = i === cursor;
        const isEquipped = title.titleId === equippedId;
        const rc = TITLE_RARITY_COLORS[title.rarity] || DIM;
        const icon = TITLE_RARITY_ICONS[title.rarity] || '·';

        if (isCursor) {
          screen.text(listX, y, '▸', BRIGHT, null, true);
          screen.text(listX + 2, y, icon, rc, null, true);
          screen.text(listX + 4, y, title.name, BRIGHT, null, true);
          if (isEquipped) {
            screen.text(listX + 4 + title.name.length + 1, y, '[EQUIPPED]', rgb(140, 230, 180));
          }
        } else {
          screen.text(listX + 2, y, icon, isEquipped ? rc : DIM);
          screen.text(listX + 4, y, title.name, isEquipped ? rc : DIM);
          if (isEquipped) {
            screen.text(listX + 4 + title.name.length + 1, y, '★', rgb(140, 230, 180));
          }
        }
      }

      // Preview panel (right side)
      const previewX = Math.max(36, Math.floor(w * 0.45));
      const selected = owned[cursor];

      if (selected) {
        const rc = TITLE_RARITY_COLORS[selected.rarity] || DIM;

        // Name and description
        screen.text(previewX, 2, selected.name, BRIGHT, null, true);
        screen.text(previewX, 3, selected.desc || '', DIM);
        screen.text(previewX, 4, 'Rarity: ', DIM);
        screen.text(previewX + 8, 4, selected.rarity.toUpperCase(), rc, null, true);

        // Source
        const sourceLabel = selected.source === 'trade' ? 'Traded' :
          selected.source === 'granted' ? 'Granted' :
          selected.source?.startsWith('lootbox') ? 'Loot Box' :
          selected.source === 'battle' ? 'Battle Reward' : 'Unknown';
        screen.text(previewX, 5, `Source: ${sourceLabel}`, DIMMER);

        // Live animated preview of the title
        const previewY = 8;
        screen.text(previewX, previewY - 1, 'Preview:', DIMMER);

        // Draw a mock rig name with the title above it
        drawTitle(screen, previewX, previewY, selected.titleId, animFrame);

        // Show a sample callsign beneath the title for context
        const sampleName = 'MAINFRAME';
        screen.text(previewX, previewY + 1, sampleName, colors.cyan, null, true);

        // Decorative box around preview
        const boxW = Math.max(sampleName.length, 20) + 4;
        screen.text(previewX - 1, previewY - 1, '┌' + '─'.repeat(boxW) + '┐', DIMMER);
        screen.text(previewX - 1, previewY + 2, '└' + '─'.repeat(boxW) + '┘', DIMMER);
        for (let row = previewY; row <= previewY + 1; row++) {
          screen.set(previewX - 1, row, '│', DIMMER);
          screen.set(previewX + boxW, row, '│', DIMMER);
        }

        // Equip status
        const equipY = h - 5;
        const isEquipped = selected.titleId === equippedId;
        if (isEquipped) {
          screen.text(previewX, equipY, '★ Equipped on current build', rgb(140, 230, 180));
        } else {
          screen.text(previewX, equipY, 'Press Enter to equip', DIMMER);
        }
      }

      // Footer
      screen.hline(2, h - 3, w - 4, '─', DIMMER);
      screen.text(4, h - 2, '↑↓ select   Enter = equip/unequip   Esc = exit', DIMMER);

      screen.render();
    }

    function startAnim() {
      if (animInterval) clearInterval(animInterval);
      animFrame = 0;
      animInterval = setInterval(() => {
        animFrame++;
        render();
      }, 80);
    }

    function stopAnim() {
      if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
      }
    }

    function onKey(key) {
      const owned = getOwnedTitles();

      if (key === '\x1b[A' || key === 'k') {
        if (owned.length > 0) cursor = (cursor - 1 + owned.length) % owned.length;
        render();
      } else if (key === '\x1b[B' || key === 'j') {
        if (owned.length > 0) cursor = (cursor + 1) % owned.length;
        render();
      } else if (key === '\r' || key === '\n') {
        // Toggle equip
        if (owned.length > 0) {
          const buildIdx = getActiveBuildIndex();
          const equippedId = getEquippedTitleId(buildIdx);
          const selected = owned[cursor];
          if (selected) {
            if (selected.titleId === equippedId) {
              unequipTitle(buildIdx);
            } else {
              equipTitle(buildIdx, selected.titleId);
            }
          }
        }
        render();
      } else if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      stopAnim();
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    startAnim();
    render();
  });
}

module.exports = { openTitleLocker };
