// Matrix rain background effect — subtle, dimmed, pastel-tinted
const { colors } = require('../palette');

// Katakana + digits + symbols for that authentic matrix feel
const MATRIX_CHARS = 'ァアィイゥウェエォオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFabcdef{}[]<>|/\\~!@#$%^&*';

class MatrixRain {
  constructor(width, height, rng) {
    this.width = width;
    this.height = height;
    this.rng = rng;
    this.columns = [];

    for (let x = 0; x < width; x++) {
      this.columns.push({
        y: rng.int(-height, 0),         // start position (negative = delayed)
        speed: rng.float(0.3, 1.2),      // cells per frame
        length: rng.int(4, 14),           // trail length
        accumulator: 0,                   // sub-frame accumulation
        active: rng.chance(0.35),         // not every column is active
        chars: [],                        // pre-generated characters
      });

      // Pre-fill character buffer
      for (let i = 0; i < height + 20; i++) {
        this.columns[x].chars.push(MATRIX_CHARS[Math.floor(rng.next() * MATRIX_CHARS.length)]);
      }
    }
  }

  update() {
    for (const col of this.columns) {
      if (!col.active) continue;
      col.accumulator += col.speed;
      while (col.accumulator >= 1) {
        col.y++;
        col.accumulator -= 1;
      }
      // Reset column when it falls off screen
      if (col.y - col.length > this.height) {
        col.y = this.rng.int(-8, -1);
        col.speed = this.rng.float(0.3, 1.2);
        col.length = this.rng.int(4, 14);
        col.active = this.rng.chance(0.35);
      }
    }
  }

  // Render to screen buffer — draws BEHIND everything else
  draw(screen) {
    for (let x = 0; x < this.width && x < screen.width; x++) {
      const col = this.columns[x];
      if (!col.active) continue;

      for (let i = 0; i < col.length; i++) {
        const y = Math.floor(col.y) - i;
        if (y < 0 || y >= screen.height) continue;

        const charIdx = (y + 100) % col.chars.length;
        const brightness = i === 0 ? 1.0 : 1.0 - (i / col.length);

        let fg;
        if (brightness > 0.9) {
          fg = colors.matrixBright;   // leading character is bright
        } else if (brightness > 0.4) {
          fg = colors.matrix;          // mid-trail
        } else {
          fg = colors.ghost;           // tail fades out
        }

        // Only draw in "empty" cells — don't overwrite UI elements
        const cell = screen.buffer[y]?.[x];
        if (cell && cell.char === ' ' && !cell.fg) {
          screen.set(x, y, col.chars[charIdx], fg);
        }
      }
    }
  }
}

module.exports = { MatrixRain };
