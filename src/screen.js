// Flicker-free terminal screen buffer with segment-level diff rendering
// Only outputs the specific cells that changed — not entire rows

const { ESC, RESET } = require('./palette');

const ALT_SCREEN_ON = `${ESC}?1049h`;
const ALT_SCREEN_OFF = `${ESC}?1049l`;
const CURSOR_HIDE = `${ESC}?25l`;
const CURSOR_SHOW = `${ESC}?25h`;
const CLEAR_SCREEN = `${ESC}2J`;

// Safety net: always restore terminal on exit, no matter how the process dies
process.on('exit', () => {
  try { process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF + RESET); } catch {}
});

class Screen {
  constructor() {
    this._bufW = Math.min(process.stdout.columns || 120, 200);
    this._bufH = Math.min(process.stdout.rows || 30, 50);
    if (this._bufW < 60) this._bufW = 60;
    if (this._bufH < 20) this._bufH = 20;

    // Logical content area — equals buffer size by default
    this._ox = 0;
    this._oy = 0;
    this.width = this._bufW;
    this.height = this._bufH;
    this._isPadded = false;

    this.buffer = this._createBuffer();
    this.prev = this._createBuffer();
    this.active = false;
    this._firstRender = true;
    this._writePending = false;
    this._onResize = null;
  }

  // Opt-in fullscreen padding — shrinks the logical content area and offsets
  // all drawing inward so content doesn't hug the terminal edges.
  // Screens designed for small terminals automatically gain breathing room
  // in fullscreen without changing any of their layout code.
  padded() {
    this._isPadded = true;
    this._ox = this._bufW > 90 ? Math.min(Math.floor((this._bufW - 80) / 6), 6) : 0;
    this._oy = this._bufH > 35 ? Math.min(Math.floor((this._bufH - 28) / 4), 4) : 0;
    this.width = this._bufW - this._ox * 2;
    this.height = this._bufH - this._oy * 2;
  }

  _createBuffer() {
    const buf = [];
    for (let y = 0; y < this._bufH; y++) {
      const row = [];
      for (let x = 0; x < this._bufW; x++) {
        row.push({ char: ' ', fg: null, bg: null, bold: false });
      }
      buf.push(row);
    }
    return buf;
  }

  enter() {
    this.active = true;
    this._firstRender = true;
    process.stdout.write(ALT_SCREEN_ON + CURSOR_HIDE + CLEAR_SCREEN);
    const cleanup = () => this.exit();
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    this._cleanup = cleanup;

    // Listen for terminal resize
    this._onResize = () => this.handleResize();
    process.stdout.on('resize', this._onResize);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF + RESET);
    if (this._cleanup) {
      process.removeListener('SIGINT', this._cleanup);
      process.removeListener('SIGTERM', this._cleanup);
    }
    if (this._onResize) {
      process.stdout.removeListener('resize', this._onResize);
      this._onResize = null;
    }
  }

  // Clean up handlers but STAY in alt screen — for seamless handoff to another Screen
  handoff() {
    if (!this.active) return;
    this.active = false;
    // Clear screen for the next Screen to take over cleanly
    process.stdout.write(CLEAR_SCREEN);
    if (this._cleanup) {
      process.removeListener('SIGINT', this._cleanup);
      process.removeListener('SIGTERM', this._cleanup);
    }
    if (this._onResize) {
      process.stdout.removeListener('resize', this._onResize);
      this._onResize = null;
    }
  }

  clear() {
    for (let y = 0; y < this._bufH; y++) {
      const row = this.buffer[y];
      for (let x = 0; x < this._bufW; x++) {
        const c = row[x];
        c.char = ' '; c.fg = null; c.bg = null; c.bold = false;
      }
    }
  }

  handleResize() {
    const newW = Math.min(process.stdout.columns || 120, 200);
    const newH = Math.min(process.stdout.rows || 30, 50);
    const bw = Math.max(60, newW);
    const bh = Math.max(20, newH);
    if (bw === this._bufW && bh === this._bufH) return;

    this._bufW = bw;
    this._bufH = bh;
    if (this._isPadded) {
      this.padded();
    } else {
      this.width = bw;
      this.height = bh;
    }
    this.buffer = this._createBuffer();
    this.prev = this._createBuffer();
    this._firstRender = true;
    process.stdout.write(CLEAR_SCREEN);
  }

  // Force next render() to redraw every cell (clears diff state)
  resetDiff() {
    this._firstRender = true;
    for (let y = 0; y < this._bufH; y++) {
      const prow = this.prev[y];
      for (let x = 0; x < this._bufW; x++) {
        const p = prow[x];
        p.char = '\x00'; p.fg = '\x00'; p.bg = null; p.bold = false;
      }
    }
  }

  set(x, y, char, fg, bg, bold) {
    x = Math.floor(x) + this._ox;
    y = Math.floor(y) + this._oy;
    if (x < 0 || x >= this._bufW || y < 0 || y >= this._bufH) return;
    const c = this.buffer[y][x];
    c.char = char;
    c.fg = fg || null;
    c.bg = bg || null;
    c.bold = bold || false;
  }

  text(x, y, str, fg, bg, bold) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], fg, bg, bold);
    }
  }

  centerText(y, str, fg, bg, bold) {
    const x = Math.floor((this.width - str.length) / 2);
    this.text(x, y, str, fg, bg, bold);
  }

  box(x, y, w, h, fg, bg) {
    this.set(x, y, '╭', fg, bg);
    this.set(x + w - 1, y, '╮', fg, bg);
    this.set(x, y + h - 1, '╰', fg, bg);
    this.set(x + w - 1, y + h - 1, '╯', fg, bg);
    for (let i = 1; i < w - 1; i++) {
      this.set(x + i, y, '─', fg, bg);
      this.set(x + i, y + h - 1, '─', fg, bg);
    }
    for (let i = 1; i < h - 1; i++) {
      this.set(x, y + i, '│', fg, bg);
      this.set(x + w - 1, y + i, '│', fg, bg);
    }
  }

  hline(x, y, length, char, fg) {
    for (let i = 0; i < length; i++) {
      this.set(x + i, y, char || '─', fg);
    }
  }

  vline(x, y, length, char, fg) {
    for (let i = 0; i < length; i++) {
      this.set(x, y + i, char || '│', fg);
    }
  }

  bar(x, y, width, ratio, fgFull, fgEmpty) {
    const filled = Math.round(width * Math.max(0, Math.min(1, ratio)));
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        this.set(x + i, y, '█', fgFull);
      } else {
        this.set(x + i, y, '░', fgEmpty || fgFull);
      }
    }
  }

  // Segment-level diff render: only output the specific cells that changed.
  // Unchanged cells are skipped entirely — no cursor move, no output.
  // Nearby changed cells are merged into segments to avoid excessive cursor jumps.
  render() {
    if (this._writePending) return;

    const parts = [];
    const full = this._firstRender;
    const MERGE_GAP = 4; // merge changed segments separated by ≤4 unchanged cells

    for (let y = 0; y < this._bufH; y++) {
      const row = this.buffer[y];
      const prow = this.prev[y];

      let segStart = -1; // start of current changed segment
      let segEnd = -1;   // end of current changed segment

      for (let x = 0; x <= this._bufW; x++) {
        let changed = false;
        if (x < this._bufW) {
          const c = row[x]; const p = prow[x];
          changed = full || c.char !== p.char || c.fg !== p.fg || c.bg !== p.bg || c.bold !== p.bold;
        }

        if (changed) {
          if (segStart === -1) {
            segStart = x;
            segEnd = x;
          } else if (x - segEnd <= MERGE_GAP) {
            segEnd = x; // close enough — merge into current segment
          } else {
            // Gap too large — flush current segment, start new one
            this._emitSegment(parts, y, row, prow, segStart, segEnd);
            segStart = x;
            segEnd = x;
          }
        }
      }

      // Flush final segment for this row
      if (segStart !== -1) {
        this._emitSegment(parts, y, row, prow, segStart, segEnd);
      }
    }

    if (parts.length > 0) {
      const ok = process.stdout.write(parts.join(''));
      if (!ok) {
        this._writePending = true;
        process.stdout.once('drain', () => { this._writePending = false; });
      }
    }

    this._firstRender = false;
  }

  // Output a segment of cells from startX to endX (inclusive) on row y
  // Each cell is positioned absolutely to prevent character-width drift
  // (some terminals render box-drawing/unicode chars as double-width)
  _emitSegment(parts, y, row, prow, startX, endX) {
    let lastFg = null;
    let lastBg = null;
    let lastBold = false;

    for (let x = startX; x <= endX; x++) {
      const c = row[x];

      // Never write the bottom-right cell — the cursor advance after
      // writing there triggers a terminal scroll, causing progressive drift
      if (x === this._bufW - 1 && y === this._bufH - 1) {
        const p = prow[x];
        p.char = c.char; p.fg = c.fg; p.bg = c.bg; p.bold = c.bold;
        continue;
      }

      parts.push(`${ESC}${y + 1};${x + 1}H`);
      const needFg = c.fg !== lastFg;
      const needBg = c.bg !== lastBg;
      const needBold = c.bold !== lastBold;

      if (needFg || needBg || needBold) {
        parts.push(RESET);
        if (c.bg) parts.push(c.bg);
        if (c.fg) parts.push(c.fg);
        if (c.bold) parts.push(`${ESC}1m`);
        lastFg = c.fg;
        lastBg = c.bg;
        lastBold = c.bold;
      }
      parts.push(c.char);

      // Snapshot this cell
      const p = prow[x];
      p.char = c.char; p.fg = c.fg; p.bg = c.bg; p.bold = c.bold;
    }
    parts.push(RESET);
  }
}

module.exports = { Screen };
