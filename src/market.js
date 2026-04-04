// ═══════════════════════════════════════════════════════════════
// MARKET — Skin Locker (view/equip) + Trade (export/import)
// ═══════════════════════════════════════════════════════════════

const { colors, rgb, RESET } = require('./palette');
const { RARITY_COLORS, RARITY_ICONS } = require('./parts');
const {
  SKINS, getOwnedSkins, getSkinByUUID,
  getEquippedSkinId, getEquippedSkinUUID,
  equipSkin, unequipSkin,
  exportSkin, importSkin,
} = require('./skins');
const { getActiveBuildIndex } = require('./parts');

const TRANSCENDENT = rgb(200, 120, 255);
const BRIGHT = rgb(230, 230, 245);
const DIM = rgb(100, 100, 130);
const DIMMER = rgb(70, 70, 95);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Skin Locker — View, preview, equip ───

function openSkinLocker(screen) {
  return new Promise((resolve) => {
    let cursor = 0;
    let previewFrame = 0;
    let previewInterval = null;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      const w = screen.width;
      const h = screen.height;
      const owned = getOwnedSkins();
      const buildIdx = getActiveBuildIndex();
      const equippedUUID = getEquippedSkinUUID(buildIdx);

      screen.clear();

      // Title
      screen.centerText(0, '─'.repeat(w), DIMMER);
      screen.centerText(0, ' S K I N   L O C K E R ', TRANSCENDENT, null, true);

      if (owned.length === 0) {
        screen.centerText(Math.floor(h / 2) - 1, 'No skins yet.', DIM);
        screen.centerText(Math.floor(h / 2), 'Open Transcendent Crates in the Loot Box!', DIMMER);
        screen.centerText(h - 2, 'Press ESC to exit', DIMMER);
        screen.render();
        return;
      }

      // Skin list (left panel)
      const listX = 3;
      const listY = 3;
      screen.text(listX, 2, 'Owned Skins', BRIGHT, null, true);

      for (let i = 0; i < owned.length; i++) {
        const skin = owned[i];
        const y = listY + i;
        if (y >= h - 4) break; // overflow protection

        const isCursor = i === cursor;
        const isEquipped = skin.uuid === equippedUUID;
        const rc = RARITY_COLORS[skin.rarity] || DIM;
        const icon = RARITY_ICONS[skin.rarity] || '·';

        if (isCursor) {
          screen.text(listX, y, '▸', BRIGHT, null, true);
          screen.text(listX + 2, y, icon, rc, null, true);
          screen.text(listX + 4, y, skin.name, BRIGHT, null, true);
          if (isEquipped) {
            screen.text(listX + 4 + skin.name.length + 1, y, '[EQUIPPED]', rgb(140, 230, 180));
          }
        } else {
          screen.text(listX + 2, y, icon, isEquipped ? rc : DIM);
          screen.text(listX + 4, y, skin.name, isEquipped ? rc : DIM);
          if (isEquipped) {
            screen.text(listX + 4 + skin.name.length + 1, y, '★', rgb(140, 230, 180));
          }
        }
      }

      // Preview panel (right side)
      const previewX = Math.max(38, Math.floor(w * 0.5));
      const selected = owned[cursor];

      if (selected) {
        const rc = RARITY_COLORS[selected.rarity] || DIM;
        screen.text(previewX, 2, selected.name, BRIGHT, null, true);
        screen.text(previewX, 3, selected.desc || '', DIM);
        screen.text(previewX, 4, `Rarity: `, DIM);
        screen.text(previewX + 8, 4, selected.rarity, rc, null, true);

        const sourceLabel = selected.source === 'trade' ? 'Traded' :
          selected.source?.startsWith('lootbox_') ? 'Loot Box' : 'Unknown';
        screen.text(previewX, 5, `Source: ${sourceLabel}`, DIMMER);

        // Draw skin sprite preview
        try {
          const { SKIN_SPRITES } = require('./skinsprites');
          const skinDef = SKIN_SPRITES[selected.skinId];
          if (skinDef && skinDef.drawFront) {
            skinDef.drawFront(screen, previewX + 2, 8, null, previewFrame);
          }
        } catch {}

        // Equip status
        const isEquipped = selected.uuid === equippedUUID;
        const equipY = h - 5;
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

    function startPreview() {
      if (previewInterval) clearInterval(previewInterval);
      previewFrame = 0;
      previewInterval = setInterval(() => {
        previewFrame++;
        render();
      }, 100);
    }

    function stopPreview() {
      if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
      }
    }

    function onKey(key) {
      const owned = getOwnedSkins();

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
          const equippedUUID = getEquippedSkinUUID(buildIdx);
          const selected = owned[cursor];
          if (selected) {
            if (selected.uuid === equippedUUID) {
              unequipSkin(buildIdx);
            } else {
              equipSkin(buildIdx, selected.uuid);
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
      stopPreview();
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    startPreview();
    render();
  });
}

// ─── Market — Export / Import skins ───

function openMarket(screen) {
  return new Promise((resolve) => {
    let tab = 'export'; // 'export' | 'import'
    let cursor = 0;
    let importBuffer = '';
    let importResult = null;
    let exportResult = null;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      const w = screen.width;
      const h = screen.height;
      screen.clear();

      // Title
      screen.centerText(0, '─'.repeat(w), DIMMER);
      screen.centerText(0, ' M A R K E T ', rgb(180, 220, 140), null, true);

      // Tabs
      const tabY = 2;
      const exportColor = tab === 'export' ? BRIGHT : DIM;
      const importColor = tab === 'import' ? BRIGHT : DIM;
      screen.text(4, tabY, '[ EXPORT ]', exportColor, null, tab === 'export');
      screen.text(16, tabY, '[ IMPORT ]', importColor, null, tab === 'import');
      screen.hline(2, tabY + 1, w - 4, '─', DIMMER);

      if (tab === 'export') {
        renderExportTab(screen, w, h);
      } else {
        renderImportTab(screen, w, h);
      }

      // Footer
      screen.hline(2, h - 3, w - 4, '─', DIMMER);
      if (tab === 'export') {
        screen.text(4, h - 2, 'Tab = switch   ↑↓ select   Enter = export   Esc = exit', DIMMER);
      } else {
        screen.text(4, h - 2, 'Tab = switch   Type/paste token + Enter   Esc = exit', DIMMER);
      }

      screen.render();
    }

    function renderExportTab(screen, w, h) {
      const owned = getOwnedSkins();
      const buildIdx = getActiveBuildIndex();
      const equippedUUID = getEquippedSkinUUID(buildIdx);
      const tradeable = owned.filter(s => s.uuid !== equippedUUID);

      if (tradeable.length === 0) {
        screen.text(6, 6, 'No tradeable skins.', DIM);
        screen.text(6, 7, 'Equipped skins must be unequipped first.', DIMMER);
        return;
      }

      screen.text(4, 5, 'Select a skin to export as a trade token:', DIM);

      for (let i = 0; i < tradeable.length; i++) {
        const skin = tradeable[i];
        const y = 7 + i;
        if (y >= h - 6) break;

        const isCursor = i === cursor;
        const rc = RARITY_COLORS[skin.rarity] || DIM;
        const icon = RARITY_ICONS[skin.rarity] || '·';

        if (isCursor) {
          screen.text(4, y, '▸', BRIGHT, null, true);
          screen.text(6, y, icon, rc, null, true);
          screen.text(8, y, skin.name, BRIGHT, null, true);
        } else {
          screen.text(6, y, icon, DIM);
          screen.text(8, y, skin.name, DIM);
        }
      }

      if (exportResult) {
        const resultY = h - 6;
        if (exportResult.success) {
          screen.text(4, resultY, '✓ Skin exported! Trade token:', rgb(140, 230, 180));
          // Show truncated token
          const truncated = exportResult.token.slice(0, Math.min(w - 8, 60)) + '...';
          screen.text(4, resultY + 1, truncated, TRANSCENDENT);
          screen.text(4, resultY + 2, 'Token copied to clipboard (if available)', DIMMER);
        } else {
          screen.text(4, resultY, `✗ Export failed: ${exportResult.error}`, rgb(255, 100, 100));
        }
      }
    }

    function renderImportTab(screen, w, h) {
      screen.text(4, 5, 'Paste a trade token to import a skin:', DIM);

      // Input field
      const fieldY = 7;
      const fieldW = Math.min(w - 10, 70);
      screen.hline(4, fieldY, fieldW, '─', DIMMER);
      const display = importBuffer.length > 0
        ? importBuffer.slice(-(fieldW - 2))
        : 'paste or type token here...';
      screen.text(5, fieldY + 1, display, importBuffer.length > 0 ? BRIGHT : DIMMER);
      screen.hline(4, fieldY + 2, fieldW, '─', DIMMER);

      screen.text(4, fieldY + 3, `${importBuffer.length} characters`, DIMMER);

      if (importResult) {
        const resultY = fieldY + 5;
        if (importResult.success) {
          const skinName = SKINS[importResult.skinId]?.name || importResult.skinId;
          screen.text(4, resultY, `✓ Imported: ${skinName}`, rgb(140, 230, 180));
          screen.text(4, resultY + 1, 'Added to your Skin Locker!', DIM);
        } else {
          screen.text(4, resultY, `✗ ${importResult.error}`, rgb(255, 100, 100));
        }
      }
    }

    function tryExport() {
      const owned = getOwnedSkins();
      const buildIdx = getActiveBuildIndex();
      const equippedUUID = getEquippedSkinUUID(buildIdx);
      const tradeable = owned.filter(s => s.uuid !== equippedUUID);

      if (cursor >= tradeable.length) return;
      const skin = tradeable[cursor];

      const token = exportSkin(skin.uuid);
      if (token) {
        exportResult = { success: true, token };
        // Try to copy to clipboard
        try {
          const { execSync } = require('child_process');
          if (process.platform === 'win32') {
            execSync(`echo ${token}| clip`, { stdio: 'pipe' });
          } else if (process.platform === 'darwin') {
            execSync(`echo '${token}' | pbcopy`, { stdio: 'pipe' });
          } else {
            execSync(`echo '${token}' | xclip -selection clipboard`, { stdio: 'pipe' });
          }
        } catch {}

        // Re-adjust cursor if list shrunk
        const newTradeable = getOwnedSkins().filter(s => s.uuid !== equippedUUID);
        if (cursor >= newTradeable.length) cursor = Math.max(0, newTradeable.length - 1);
      } else {
        exportResult = { success: false, error: 'Skin not found' };
      }
    }

    function tryImport() {
      if (importBuffer.trim().length === 0) return;
      importResult = importSkin(importBuffer.trim());
      if (importResult.success) {
        importBuffer = '';
      }
    }

    function onKey(key) {
      if (key === '\x09') { // Tab
        tab = tab === 'export' ? 'import' : 'export';
        cursor = 0;
        importResult = null;
        exportResult = null;
        render();
        return;
      }

      if (key === '\x1b' || key === 'q') {
        // In import mode with buffer, clear buffer first
        if (tab === 'import' && importBuffer.length > 0) {
          importBuffer = '';
          importResult = null;
          render();
          return;
        }
        cleanup();
        resolve();
        return;
      }

      if (key === '\x03') {
        cleanup();
        process.exit(0);
      }

      if (tab === 'export') {
        if (key === '\x1b[A' || key === 'k') {
          const tradeable = getTradeableSkins();
          if (tradeable.length > 0) cursor = (cursor - 1 + tradeable.length) % tradeable.length;
          exportResult = null;
        } else if (key === '\x1b[B' || key === 'j') {
          const tradeable = getTradeableSkins();
          if (tradeable.length > 0) cursor = (cursor + 1) % tradeable.length;
          exportResult = null;
        } else if (key === '\r' || key === '\n') {
          tryExport();
        }
      } else {
        // Import mode — accept typed/pasted input
        if (key === '\r' || key === '\n') {
          tryImport();
        } else if (key === '\x7f' || key === '\b') {
          importBuffer = importBuffer.slice(0, -1);
          importResult = null;
        } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
          importBuffer += key;
          importResult = null;
        } else if (key.length > 1 && !key.startsWith('\x1b')) {
          // Pasted multi-char string
          importBuffer += key;
          importResult = null;
        }
      }

      render();
    }

    function getTradeableSkins() {
      const owned = getOwnedSkins();
      const buildIdx = getActiveBuildIndex();
      const equippedUUID = getEquippedSkinUUID(buildIdx);
      return owned.filter(s => s.uuid !== equippedUUID);
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

module.exports = { openSkinLocker, openMarket };
