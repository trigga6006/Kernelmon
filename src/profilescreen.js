// ═══════════════════════════════════════════════════════════════
// PROFILE SCREEN — Animated character preview with stats & lore
// Shows the sprite rendering alongside hardware stats and lore cards
// ═══════════════════════════════════════════════════════════════

const { colors, rgb } = require('./palette');
const { getSprite } = require('./sprites');
const { generateLore } = require('./lore');

const FPS = 20;
const FRAME_MS = 1000 / FPS;

// Colors
const DIM   = rgb(100, 100, 130);
const DIMMER = rgb(70, 70, 95);
const BRIGHT = rgb(230, 230, 245);
const LABEL  = rgb(130, 220, 235);
const ACCENT = rgb(180, 190, 220);

// opts.passive: { name, desc } — archetype passive ability
// opts.credits: string — formatted credits balance
function openProfile(fighter, screen, opts) {
  return new Promise((resolve) => {
    const sprite = fighter.sprite || getSprite(fighter.specs || {});
    const stats = fighter.stats;
    const specs = fighter.specs || {};
    const arch = fighter.archetype || { name: '???', tagline: '' };
    const lore = generateLore(stats, specs, arch);
    const theme = sprite.theme;
    const passive = opts?.passive || null;
    const creditsStr = opts?.credits || null;

    let frame = 0;
    const W = screen.width;
    const H = screen.height;

    // Layout constants — sprite on the left, stats on the right
    const SPRITE_OX = 3;
    const SPRITE_OY = 2;
    const STATS_X = 24;  // stats start after sprite area
    const LORE_Y_START = 15;

    function render() {
      screen.clear();

      // ─── Title bar ───
      screen.hline(1, 0, W - 2, '─', DIM);
      screen.set(0, 0, '╭', DIM);
      screen.set(W - 1, 0, '╮', DIM);
      const title = ' YOUR RIG ';
      screen.text(3, 0, title, LABEL);

      // Side borders
      for (let y = 1; y < H - 1; y++) {
        screen.set(0, y, '│', DIM);
        screen.set(W - 1, y, '│', DIM);
      }

      // Bottom border
      screen.set(0, H - 1, '╰', DIM);
      screen.hline(1, H - 1, W - 2, '─', DIM);
      screen.set(W - 1, H - 1, '╯', DIM);
      const exitHint = ' [ESC] exit ';
      screen.text(Math.floor((W - exitHint.length) / 2), H - 1, exitHint, DIMMER);

      // ─── Animated sprite (back view — larger, more detailed) ───
      sprite.back.draw(screen, SPRITE_OX, SPRITE_OY, null, frame);

      // ─── Stats panel (right of sprite) ───
      const sx = Math.min(STATS_X, W - 40);  // ensure stats fit

      // Name
      screen.text(sx, 2, fighter.name || 'Unknown', BRIGHT, null, true);

      // Class + tagline
      screen.text(sx, 3, 'Class: ', DIM);
      screen.text(sx + 7, 3, arch.name || '???', theme.accent || LABEL);
      const tagline = (arch.tagline || '').slice(0, W - sx - 10);
      if (tagline) screen.text(sx + 7 + (arch.name || '???').length + 2, 3, tagline, DIMMER);

      // Divider
      const divW = Math.min(W - sx - 3, 40);
      screen.hline(sx, 4, divW, '─', DIM);

      // CPU → STR
      const cpuBrand = (specs.cpu?.brand || 'Unknown').slice(0, 26);
      const cores = specs.cpu?.cores || '?';
      const threads = specs.cpu?.threads || '?';
      const ghz = specs.cpu?.speedMax ? `${specs.cpu.speedMax}GHz` : '';
      screen.text(sx, 5, 'CPU', DIMMER);
      screen.text(sx + 5, 5, cpuBrand, BRIGHT);
      screen.text(sx + 5, 6, `${cores}C/${threads}T ${ghz}`, DIM);
      drawStatBar(screen, sx + 24, 6, 'STR', stats.str, 100, theme);

      // GPU → MAG
      const gpuLabel = (fighter.gpu || 'Integrated').slice(0, 26);
      const vram = specs.gpu?.vramMB ? `${Math.round(specs.gpu.vramMB / 1024)}GB VRAM` : '';
      screen.text(sx, 7, 'GPU', DIMMER);
      screen.text(sx + 5, 7, gpuLabel, BRIGHT);
      screen.text(sx + 5, 8, vram, DIM);
      drawStatBar(screen, sx + 24, 8, 'MAG', stats.mag, 100, theme);

      // RAM → HP
      const ramGB = specs.ram?.totalGB || '?';
      screen.text(sx, 9, 'RAM', DIMMER);
      screen.text(sx + 5, 9, `${ramGB}GB`, BRIGHT);
      drawStatBar(screen, sx + 24, 10, 'HP', stats.hp, 2000, theme, true);

      // Storage → SPD
      const storType = specs.storage?.type || 'Unknown';
      const storName = (specs.storage?.name || '').slice(0, 18);
      screen.text(sx, 11, 'DISK', DIMMER);
      screen.text(sx + 5, 11, storType + (storName ? ' — ' + storName : ''), BRIGHT);
      drawStatBar(screen, sx + 24, 12, 'SPD', stats.spd, 100, theme);

      // DEF (derived)
      drawStatBar(screen, sx + 24, 13, 'DEF', stats.def, 100, theme);

      // Flags
      const flags = [];
      if (specs.isLaptop) flags.push('LAPTOP');
      if (sprite.hw?.brand) flags.push(sprite.hw.brand.toUpperCase().replace(/_/g, ' '));
      if (sprite.hw?.tier) flags.push(sprite.hw.tier.toUpperCase());
      if (sprite.hw?.fanCount !== undefined) flags.push(sprite.hw.fanCount + ' FAN' + (sprite.hw.fanCount !== 1 ? 'S' : ''));
      if (flags.length) {
        screen.text(sx, 14, flags.join(' · '), DIMMER);
      }

      // ─── Lore cards (below sprite & stats) ───
      const ly = Math.max(LORE_Y_START, 15);
      const loreW = Math.min(W - 6, 72);
      const loreX = 3;

      if (ly + 8 < H - 1) {
        // Origin card
        screen.text(loreX, ly, '┬ ORIGIN', LABEL);
        screen.hline(loreX + 9, ly, loreW - 9, '─', DIM);
        const originLines = wrapText(lore.origin, loreW - 4);
        for (let i = 0; i < Math.min(originLines.length, 2); i++) {
          screen.text(loreX + 2, ly + 1 + i, originLines[i], ACCENT);
        }

        // Traits
        const traitsY = ly + 1 + Math.min(originLines.length, 2) + 1;
        if (traitsY + 1 < H - 1) {
          screen.text(loreX, traitsY, '┬ TRAITS', LABEL);
          screen.text(loreX + 10, traitsY, lore.traits.join(' · '), BRIGHT);
        }

        // Battle style
        const styleY = traitsY + 1;
        if (styleY + 1 < H - 1) {
          screen.text(loreX, styleY, '┬ STYLE', LABEL);
          const styleText = lore.battleStyle.slice(0, loreW - 10);
          screen.text(loreX + 10, styleY, styleText, ACCENT);
        }

        // Passive ability (if provided)
        let nextY = styleY + 1;
        if (passive && nextY + 2 < H - 1) {
          screen.text(loreX, nextY, '┬ PASSIVE', rgb(255, 215, 0));
          screen.text(loreX + 11, nextY, passive.name, BRIGHT);
          const passiveLines = wrapText(passive.desc, loreW - 4);
          for (let i = 0; i < Math.min(passiveLines.length, 2); i++) {
            if (nextY + 1 + i >= H - 1) break;
            screen.text(loreX + 2, nextY + 1 + i, passiveLines[i], DIM);
          }
          nextY += 1 + Math.min(passiveLines.length, 2) + 1;
        }

        // Hardware facts
        const factsY = nextY;
        if (factsY + lore.facts.length < H - 1) {
          screen.text(loreX, factsY, '┬ FACTS', LABEL);
          screen.hline(loreX + 9, factsY, loreW - 9, '─', DIM);
          for (let i = 0; i < lore.facts.length; i++) {
            if (factsY + 1 + i >= H - 1) break;
            screen.text(loreX + 2, factsY + 1 + i, '· ' + lore.facts[i].slice(0, loreW - 6), DIM);
          }
        }

        // Credits balance (if provided)
        if (creditsStr && H - 3 > factsY + lore.facts.length + 1) {
          screen.text(loreX, H - 3, 'Credits: ' + creditsStr, rgb(255, 215, 0));
        }
      }

      screen.render();
    }

    // Animation loop
    const interval = setInterval(() => {
      frame++;
      render();
    }, FRAME_MS);

    // Keyboard handling
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function onKey(key) {
      if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
      } else if (key === '\x03') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      clearInterval(interval);
      stdin.removeListener('data', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onKey);
    render();  // first frame immediately
  });
}

// ─── Helpers ───

function drawStatBar(screen, x, y, label, value, max, theme, wide) {
  const barW = wide ? 10 : 10;
  screen.text(x, y, label, DIM);
  screen.bar(x + 4, y, barW, value / max, theme.accent || LABEL, DIMMER);
  const valStr = String(Math.round(value)).padStart(wide ? 4 : 3);
  screen.text(x + 4 + barW + 1, y, valStr, BRIGHT);
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

module.exports = { openProfile };
