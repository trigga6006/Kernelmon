// ═══════════════════════════════════════════════════════════════
// WORKSHOP — Multi-character builder with part swapping
// Tab between characters, create new ones, equip parts per slot
// ═══════════════════════════════════════════════════════════════

const { colors, RESET, rgb } = require('./palette');
const { buildStats } = require('./profiler');
const {
  PARTS, RARITY_COLORS, RARITY_ICONS, TYPE_LABELS, TYPE_COLORS,
  getOwnedParts, getOwnedPartsByType,
  loadBuilds, saveBuilds, getAllBuilds, getBuild,
  getActiveBuildIndex, setActiveBuild,
  createBuild, deleteBuild,
  equipPartOnBuild, unequipPartOnBuild,
  isBuildComplete, applyBuildOverrides, buildSpecsFromParts,
  removePart, getSellPrice,
} = require('./parts');
const { addCredits, getBalance } = require('./credits');
const { drawArt, getPartArt } = require('./itemart');

const SLOT_ORDER = ['cpu', 'gpu', 'ram', 'storage'];
const STAT_NAMES = ['str', 'mag', 'spd', 'vit', 'def', 'hp'];
const STAT_LABELS = { str: 'STR', mag: 'MAG', spd: 'SPD', vit: 'VIT', def: 'DEF', hp: 'HP' };
const STAT_COLORS = {
  str: colors.peach, mag: colors.lavender, spd: colors.sky,
  vit: colors.mint, def: colors.cyan, hp: colors.mint,
};

const GOLD = rgb(255, 215, 0);
const AMBER = rgb(255, 170, 50);

function openWorkshop(realSpecs, screen) {
  // Seed inventory from real hardware on first visit
  const { seedPartsFromHardware } = require('./parts');
  seedPartsFromHardware(realSpecs);

  return new Promise((resolve) => {
    let tabIndex = getActiveBuildIndex();
    let mode = 'slots';     // 'slots' | 'parts' | 'naming'
    let slotCursor = 0;
    let partCursor = 0;
    let partsList = [];
    let nameBuffer = '';
    let confirmSell = false; // true when awaiting Y/N sell confirmation
    let sellFeedback = null; // { text, color, expiry } for brief sale feedback

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function getStatsForBuild(buildIdx) {
      const build = getBuild(buildIdx);
      if (!build) return null;
      if (build.main) {
        // Main: real hardware + part overrides
        const specs = JSON.parse(JSON.stringify(realSpecs));
        const parts = build.parts || {};
        for (const type of SLOT_ORDER) {
          const pid = parts[type];
          if (pid && PARTS[pid]) {
            const p = PARTS[pid];
            if (p.cpu) specs.cpu = { ...specs.cpu, ...p.cpu };
            if (p.gpu) specs.gpu = { ...specs.gpu, ...p.gpu };
            if (p.ram) specs.ram = { ...specs.ram, ...p.ram };
            if (p.storage) specs.storage = { ...specs.storage, ...p.storage };
          }
        }
        if (Object.keys(parts).length > 0) specs.isLaptop = false;
        return buildStats(specs);
      } else {
        // Custom: built entirely from parts
        const specs = buildSpecsFromParts(build.parts, realSpecs.id);
        return buildStats(specs);
      }
    }

    function getPreviewStats(buildIdx, partId) {
      const build = getBuild(buildIdx);
      if (!build) return null;
      const part = PARTS[partId];
      if (!part) return null;
      const previewParts = { ...build.parts, [part.type]: partId };

      if (build.main) {
        const specs = JSON.parse(JSON.stringify(realSpecs));
        for (const type of SLOT_ORDER) {
          const pid = previewParts[type];
          if (pid && PARTS[pid]) {
            const p = PARTS[pid];
            if (p.cpu) specs.cpu = { ...specs.cpu, ...p.cpu };
            if (p.gpu) specs.gpu = { ...specs.gpu, ...p.gpu };
            if (p.ram) specs.ram = { ...specs.ram, ...p.ram };
            if (p.storage) specs.storage = { ...specs.storage, ...p.storage };
          }
        }
        if (Object.keys(previewParts).length > 0) specs.isLaptop = false;
        return buildStats(specs);
      } else {
        const specs = buildSpecsFromParts(previewParts, realSpecs.id);
        return buildStats(specs);
      }
    }

    function render() {
      const w = screen.width;
      const h = screen.height;
      screen.clear();

      const builds = getAllBuilds();
      const build = builds[tabIndex];
      const activeIdx = getActiveBuildIndex();
      const currentStats = getStatsForBuild(tabIndex);

      // ── Tab bar ──
      screen.text(2, 0, '─'.repeat(w - 4), colors.dimmer);
      let tabX = 3;
      for (let i = 0; i < builds.length; i++) {
        const b = builds[i];
        const isActive = i === tabIndex;
        const isBattleActive = i === activeIdx;
        const label = ` ${b.name} `;
        const ready = b.main || isBuildComplete(i);

        if (isActive) {
          screen.text(tabX, 0, '╸', GOLD, null, true);
          screen.text(tabX + 1, 0, label, colors.white, null, true);
          if (isBattleActive) screen.text(tabX + label.length + 1, 0, '★', GOLD, null, true);
          tabX += label.length + (isBattleActive ? 3 : 2);
        } else {
          screen.text(tabX, 0, label, ready ? colors.dim : colors.dimmer);
          if (isBattleActive) screen.text(tabX + label.length, 0, '★', GOLD);
          tabX += label.length + (isBattleActive ? 2 : 1);
        }
      }
      // "+ NEW" tab
      screen.text(tabX + 1, 0, '[ + ]', colors.dimmer);

      // Title area
      const titleY = 1;
      if (build.main) {
        screen.text(3, titleY, 'MAIN RIG', colors.cyan, null, true);
        screen.text(14, titleY, '(hardware scan + part upgrades)', colors.dimmer);
      } else {
        const ready = isBuildComplete(tabIndex);
        screen.text(3, titleY, build.name, GOLD, null, true);
        if (ready) {
          screen.text(3 + build.name.length + 2, titleY, 'READY', colors.mint, null, true);
        } else {
          screen.text(3 + build.name.length + 2, titleY, 'INCOMPLETE — needs all 4 parts', colors.rose);
        }
      }

      // ── Left panel: Slots ──
      const leftX = 3;
      const slotY = 3;

      for (let i = 0; i < SLOT_ORDER.length; i++) {
        const type = SLOT_ORDER[i];
        const y = slotY + i * 3;
        const isCursor = mode === 'slots' && i === slotCursor;
        const partId = build.parts[type];
        const part = partId ? PARTS[partId] : null;
        const tc = TYPE_COLORS[type];

        // Type art on the left
        const partArt = getPartArt(type);
        if (partArt) {
          const artColors = isCursor ? partArt.colors : [colors.dimmer, colors.dimmer, colors.dimmer];
          drawArt(screen, leftX + 2, y, partArt.lines, artColors);
        }

        if (isCursor) {
          screen.text(leftX, y, '▸', colors.white, null, true);
        }

        const infoX = leftX + 10;
        screen.text(infoX, y, TYPE_LABELS[type], isCursor ? tc : colors.dim, null, isCursor);

        if (part) {
          const rc = RARITY_COLORS[part.rarity] || colors.dim;
          screen.text(infoX, y + 1, part.name, isCursor ? colors.white : rc);
          screen.text(infoX, y + 2, `(${part.rarity})`, colors.dimmer);
        } else if (build.main) {
          screen.text(infoX, y + 1, 'Stock hardware', isCursor ? colors.dim : colors.dimmer);
          screen.text(infoX, y + 2, '(from scan)', colors.dimmer);
        } else {
          screen.text(infoX, y + 1, '— empty —', isCursor ? colors.rose : colors.dimmer);
        }
      }

      // ── Right panel: Stats ──
      const rightX = Math.floor(w / 2) + 2;
      screen.text(rightX, slotY - 1, 'STATS', colors.white, null, true);

      const previewStats = (mode === 'parts' && partsList.length > 0 && partCursor < partsList.length)
        ? getPreviewStats(tabIndex, partsList[partCursor].id)
        : null;

      for (let i = 0; i < STAT_NAMES.length; i++) {
        const stat = STAT_NAMES[i];
        const y = slotY + i;
        const val = currentStats ? currentStats[stat] : 0;
        const label = STAT_LABELS[stat];
        const sc = STAT_COLORS[stat] || colors.dim;

        screen.text(rightX, y, `${label}:`, colors.dim);
        screen.text(rightX + 5, y, String(val).padStart(5), sc);

        if (previewStats) {
          const newVal = previewStats[stat];
          const diff = newVal - val;
          if (diff > 0) {
            screen.text(rightX + 11, y, `→ ${newVal}`, colors.mint, null, true);
            screen.text(rightX + 20, y, `+${diff}`, colors.mint);
          } else if (diff < 0) {
            screen.text(rightX + 11, y, `→ ${newVal}`, colors.rose, null, true);
            screen.text(rightX + 20, y, `${diff}`, colors.rose);
          } else {
            screen.text(rightX + 11, y, '  ─', colors.dimmer);
          }
        }
      }

      // ── Divider ──
      const slotsBottom = slotY + (SLOT_ORDER.length - 1) * 3 + 2; // 3 lines per slot (art height)
      const statsBottom = slotY + STAT_NAMES.length;
      const divY = Math.max(slotsBottom, statsBottom) + 1;
      screen.hline(2, divY, w - 4, '─', colors.dimmer);

      // ── Bottom panel ──
      if (mode === 'naming') {
        screen.text(leftX, divY + 1, 'NAME YOUR CHARACTER:', GOLD, null, true);
        screen.text(leftX, divY + 2, `> ${nameBuffer}_`, colors.white, null, true);
        screen.text(leftX, divY + 3, 'Type a name + Enter (Esc = cancel)', colors.dimmer);
      } else if (mode === 'slots') {
        // Controls — split into two compact rows so they fit standard terminals
        const row1 = '↑↓ slot  Enter swap  U unequip  ←→ character';
        let row2 = 'N new';
        if (!build.main) row2 += '  D delete';
        if (isBuildComplete(tabIndex)) row2 += '  A set active';
        row2 += '  Esc quit';
        screen.text(leftX, divY + 1, row1, colors.dimmer);
        screen.text(leftX, divY + 2, row2, colors.dimmer);

        // Inventory summary
        const owned = getOwnedParts();
        screen.text(rightX, divY + 1, `${owned.length} parts in inventory`, colors.dim);
        const byCat = {};
        for (const p of owned) byCat[p.type] = (byCat[p.type] || 0) + p.count;
        let summY = divY + 2;
        for (const type of SLOT_ORDER) {
          if (byCat[type]) {
            screen.text(rightX, summY, `${TYPE_LABELS[type]}: ${byCat[type]}`, TYPE_COLORS[type]);
            summY++;
          }
        }
      } else if (mode === 'parts') {
        const type = SLOT_ORDER[slotCursor];
        screen.text(leftX, divY + 1, `SELECT ${TYPE_LABELS[type]}`, TYPE_COLORS[type], null, true);

        if (confirmSell && partsList.length > 0 && partCursor < partsList.length) {
          const sp = partsList[partCursor];
          const price = getSellPrice(sp.id);
          screen.text(leftX + 18, divY + 1, `Sell ${sp.name} for ${price}◆? Y/N`, AMBER);
        } else {
          screen.text(leftX + 18, divY + 1, 'Enter equip  S sell  Esc back', colors.dimmer);
        }

        // Show balance in top-right of parts section
        const bal = getBalance();
        const balStr = `◆ ${bal.toLocaleString()}`;
        screen.text(w - balStr.length - 3, divY + 1, balStr, GOLD);

        // Sale feedback flash
        if (sellFeedback && Date.now() < sellFeedback.expiry) {
          screen.text(leftX + 18, divY + 2, sellFeedback.text, sellFeedback.color);
        }

        const listY = divY + (sellFeedback && Date.now() < sellFeedback.expiry ? 3 : 2);
        const maxVisible = Math.max(1, Math.floor((h - listY - 1) / 3)); // 3 lines per item (art + info, no gap)
        const startIdx = Math.max(0, partCursor - maxVisible + 1);
        const endIdx = Math.min(partsList.length, startIdx + maxVisible);

        if (partsList.length === 0) {
          screen.text(leftX + 2, listY, `No ${TYPE_LABELS[type]} parts in inventory`, colors.dim);
          screen.text(leftX + 2, listY + 1, 'Win battles for a chance to earn parts!', colors.dimmer);
        }

        for (let i = startIdx; i < endIdx; i++) {
          const p = partsList[i];
          const y = listY + (i - startIdx) * 3; // 3 lines per item (no gap row)
          const isCur = i === partCursor;
          const rc = RARITY_COLORS[p.rarity] || colors.dim;
          const price = getSellPrice(p.id);

          // Art sprite
          const partArt = getPartArt(p.type);
          if (partArt) {
            const artColors = isCur ? partArt.colors : [colors.dimmer, colors.dimmer, colors.dimmer];
            drawArt(screen, leftX + 2, y, partArt.lines, artColors);
          }

          const infoX = leftX + 10;
          if (isCur) {
            screen.text(leftX, y, '▸', colors.white, null, true);
            screen.text(infoX, y, p.name, colors.white, null, true);
            screen.text(infoX, y + 1, `x${p.count}  (${p.rarity})`, rc);
            screen.text(infoX, y + 2, `Sell: ${price}◆`, GOLD);
          } else {
            screen.text(infoX, y, p.name, colors.dim);
            screen.text(infoX, y + 1, `x${p.count}  (${p.rarity})`, colors.dimmer);
          }
        }
      }

      screen.render();
    }

    // Track recent escape to avoid split escape sequences (arrow keys) triggering letter handlers
    let lastEscTime = 0;
    function isRecentEsc() { return Date.now() - lastEscTime < 80; }

    function onKey(key) {
      if (key === '\x1b') { lastEscTime = Date.now(); }
      if (key === '[' && isRecentEsc()) return; // swallow bracket from split arrow sequence
      const builds = getAllBuilds();

      if (mode === 'naming') {
        if (key === '\x1b') {
          // Cancel naming
          mode = 'slots';
          nameBuffer = '';
          render();
        } else if (key === '\r' || key === '\n') {
          // Confirm name
          const name = nameBuffer.trim();
          if (name.length > 0) {
            const newIdx = createBuild(name);
            tabIndex = newIdx;
            slotCursor = 0;
          }
          nameBuffer = '';
          mode = 'slots';
          render();
        } else if (key === '\x7f' || key === '\b') {
          // Backspace
          nameBuffer = nameBuffer.slice(0, -1);
          render();
        } else if (key === '\x03') {
          cleanup();
          process.exit(0);
        } else if (key.length === 1 && key >= ' ' && nameBuffer.length < 20) {
          nameBuffer += key;
          render();
        }
        return;
      }

      if (mode === 'slots') {
        if (key === '\x1b[A' || key === 'k') {
          slotCursor = (slotCursor - 1 + SLOT_ORDER.length) % SLOT_ORDER.length;
          render();
        } else if (key === '\x1b[B' || key === 'j') {
          slotCursor = (slotCursor + 1) % SLOT_ORDER.length;
          render();
        } else if (key === '\x1b[D' || key === 'h') {
          // Previous character tab
          if (tabIndex > 0) { tabIndex--; slotCursor = 0; }
          render();
        } else if (key === '\x1b[C' || key === 'l') {
          // Next character tab
          if (tabIndex < builds.length - 1) { tabIndex++; slotCursor = 0; }
          render();
        } else if (key === '\r' || key === '\n' || key === ' ') {
          // Open parts list for this slot
          const type = SLOT_ORDER[slotCursor];
          partsList = getOwnedPartsByType(type);
          partCursor = 0;
          mode = 'parts';
          render();
        } else if ((key === 'u' || key === 'U') && !isRecentEsc()) {
          const type = SLOT_ORDER[slotCursor];
          unequipPartOnBuild(tabIndex, type);
          render();
        } else if ((key === 'n' || key === 'N') && !isRecentEsc()) {
          // New character
          mode = 'naming';
          nameBuffer = '';
          render();
        } else if ((key === 'd' || key === 'D') && tabIndex > 0 && !isRecentEsc()) {
          // Delete custom character
          deleteBuild(tabIndex);
          if (tabIndex >= getAllBuilds().length) tabIndex = getAllBuilds().length - 1;
          slotCursor = 0;
          render();
        } else if ((key === 'a' || key === 'A') && !isRecentEsc()) {
          // Set this build as active for battle
          if (isBuildComplete(tabIndex)) {
            setActiveBuild(tabIndex);
          }
          render();
        } else if (key === '\x1b' || key === 'q') {
          cleanup();
          resolve();
        } else if (key === '\x03') {
          cleanup();
          process.exit(0);
        }
      } else if (mode === 'parts') {
        // Sell confirmation takes priority
        if (confirmSell) {
          if (key === 'y' || key === 'Y') {
            const part = partsList[partCursor];
            if (part) {
              const price = getSellPrice(part.id);
              if (removePart(part.id)) {
                const newBal = addCredits(price);
                sellFeedback = {
                  text: `Sold ${part.name} for ${price}◆  (balance: ${newBal.toLocaleString()})`,
                  color: colors.mint,
                  expiry: Date.now() + 2000,
                };
                // Refresh parts list
                const type = SLOT_ORDER[slotCursor];
                partsList = getOwnedPartsByType(type);
                if (partCursor >= partsList.length) partCursor = Math.max(0, partsList.length - 1);
              }
            }
            confirmSell = false;
            render();
          } else if (key === 'n' || key === 'N' || key === '\x1b') {
            confirmSell = false;
            render();
          }
          return;
        }

        if (key === '\x1b[A' || key === 'k') {
          if (partsList.length > 0) partCursor = (partCursor - 1 + partsList.length) % partsList.length;
          render();
        } else if (key === '\x1b[B' || key === 'j') {
          if (partsList.length > 0) partCursor = (partCursor + 1) % partsList.length;
          render();
        } else if (key === '\r' || key === '\n' || key === ' ') {
          if (partsList.length > 0 && partCursor < partsList.length) {
            const part = partsList[partCursor];
            equipPartOnBuild(tabIndex, part.id);
            const type = SLOT_ORDER[slotCursor];
            partsList = getOwnedPartsByType(type);
            if (partCursor >= partsList.length) partCursor = Math.max(0, partsList.length - 1);
            mode = 'slots';
          }
          render();
        } else if ((key === 's' || key === 'S') && !isRecentEsc() && partsList.length > 0 && partCursor < partsList.length) {
          confirmSell = true;
          render();
        } else if (key === '\x1b' || key === 'q') {
          mode = 'slots';
          render();
        } else if (key === '\x03') {
          cleanup();
          process.exit(0);
        }
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

module.exports = { openWorkshop };
