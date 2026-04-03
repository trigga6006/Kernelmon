// Flicker-free terminal screen buffer
// Uses explicit cursor positioning per row to avoid scroll issues

const { ESC, RESET } = require('./palette');

const ALT_SCREEN_ON = `${ESC}?1049h`;
const ALT_SCREEN_OFF = `${ESC}?1049l`;
const CURSOR_HIDE = `${ESC}?25l`;
const CURSOR_SHOW = `${ESC}?25h`;
const CLEAR_SCREEN = `${ESC}2J`;

class Cell {
  constructor() {
    this.char = ' ';
    this.fg = null;
    this.bg = null;
    this.bold = false;
  }

  set(char, fg = null, bg = null, bold = false) {
    this.char = char;
    this.fg = fg;
    this.bg = bg;
    this.bold = bold;
  }

  clear() {
    this.char = ' ';
    this.fg = null;
    this.bg = null;
    this.bold = false;
  }
}

class Screen {
  constructor() {
    // Cap dimensions to reasonable bounds for layout
    this.width = Math.min(process.stdout.columns || 120, 200);
    this.height = Math.min(process.stdout.rows || 30, 50);
    // Enforce minimum so layout doesn't break
    if (this.width < 60) this.width = 60;
    if (this.height < 20) this.height = 20;
    this.buffer = this._createBuffer();
    this.active = false;
  }

  _createBuffer() {
    const buf = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(new Cell());
      }
      buf.push(row);
    }
    return buf;
  }

  enter() {
    this.active = true;
    // Switch to alt screen, hide cursor, clear everything
    process.stdout.write(ALT_SCREEN_ON + CURSOR_HIDE + CLEAR_SCREEN);
    // Handle clean exit
    const cleanup = () => this.exit();
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    this._cleanup = cleanup;
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF + RESET);
    if (this._cleanup) {
      process.removeListener('SIGINT', this._cleanup);
      process.removeListener('SIGTERM', this._cleanup);
    }
  }

  clear() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x].clear();
      }
    }
  }

  set(x, y, char, fg = null, bg = null, bold = false) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.buffer[y][x].set(char, fg, bg, bold);
  }

  text(x, y, str, fg = null, bg = null, bold = false) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], fg, bg, bold);
    }
  }

  centerText(y, str, fg = null, bg = null, bold = false) {
    const x = Math.floor((this.width - str.length) / 2);
    this.text(x, y, str, fg, bg, bold);
  }

  box(x, y, w, h, fg = null, bg = null) {
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

  hline(x, y, length, char = '─', fg = null) {
    for (let i = 0; i < length; i++) {
      this.set(x + i, y, char, fg);
    }
  }

  bar(x, y, width, ratio, fgFull, fgEmpty = null) {
    const filled = Math.round(width * Math.max(0, Math.min(1, ratio)));
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        this.set(x + i, y, '█', fgFull);
      } else {
        this.set(x + i, y, '░', fgEmpty || fgFull);
      }
    }
  }

  // Render using explicit cursor positioning per row — no scroll issues
  render() {
    let out = '';
    for (let y = 0; y < this.height; y++) {
      // Move cursor to start of this row (1-indexed)
      out += `${ESC}${y + 1};1H`;
      let lastFg = null;
      let lastBg = null;
      let lastBold = false;
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        const needFg = cell.fg !== lastFg;
        const needBg = cell.bg !== lastBg;
        const needBold = cell.bold !== lastBold;

        if (needFg || needBg || needBold) {
          out += RESET;
          if (cell.bg) out += cell.bg;
          if (cell.fg) out += cell.fg;
          if (cell.bold) out += `${ESC}1m`;
          lastFg = cell.fg;
          lastBg = cell.bg;
          lastBold = cell.bold;
        }
        out += cell.char;
      }
      out += RESET;
    }
    process.stdout.write(out);
  }
}

module.exports = { Screen };
