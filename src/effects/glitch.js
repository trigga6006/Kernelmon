// Glitch / code-burst visual effects
const { colors } = require('../palette');

// Code snippets that flash during attacks — the "hacker" flavor
const CODE_FRAGMENTS = [
  'if(err!=nil){panic()}', 'rm -rf /*', 'sudo chmod 777', '0xDEADBEEF',
  'SEGFAULT@0x00', 'stack.overflow()', 'null_ptr_deref', 'heap.corrupt()',
  'kernel.oops()', 'bus_error:11', 'fork(){fork()}', 'while(1){malloc}',
  'chmod 000 /boot', 'dd if=/dev/zero', 'kill -9 $$', '>>/dev/null',
  'mov eax,0xFF', 'jmp 0x0000', 'int 0x80', 'syscall(SYS_exit)',
  'DROP TABLE *;', 'SELECT * FROM', 'eval(atob())', 'require("child")',
  'Buffer.alloc(∞)', 'process.exit(1)', 'throw new Error', 'fs.unlinkSync',
  'net.Socket()', 'crypto.random()', 'assert(false)', 'undefined',
];

const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬╣╠╩╦┃━┏┓┗┛┣┫┻┳╋▀▄▌▐■□▢▣▤▥▦▧▨▩';

class GlitchEffect {
  constructor(rng) {
    this.rng = rng;
    this.active = [];
  }

  // Trigger a code-burst at a position
  burst(cx, cy, radius, duration = 8) {
    const fragments = [];
    const count = this.rng.int(4, 8);
    for (let i = 0; i < count; i++) {
      const angle = this.rng.float(0, Math.PI * 2);
      const dist = this.rng.float(1, radius);
      const code = this.rng.pick(CODE_FRAGMENTS);
      fragments.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist * 0.5, // squish vertically (terminal chars are taller than wide)
        text: code.slice(0, this.rng.int(6, 16)),
        color: this.rng.pick([colors.glitch, colors.cyan, colors.peach, colors.rose, colors.gold]),
        life: duration,
        maxLife: duration,
      });
    }
    this.active.push(...fragments);
  }

  // Trigger a horizontal glitch band (screen tear)
  screenTear(screenWidth, duration = 4) {
    const y = this.rng.int(2, 25);
    const width = this.rng.int(10, screenWidth - 5);
    const x = this.rng.int(0, screenWidth - width);
    const chars = [];
    for (let i = 0; i < width; i++) {
      chars.push(GLITCH_CHARS[Math.floor(this.rng.next() * GLITCH_CHARS.length)]);
    }
    this.active.push({
      x, y, text: chars.join(''),
      color: this.rng.pick([colors.glitch, colors.rose, colors.coral]),
      life: duration,
      maxLife: duration,
      isTear: true,
    });
  }

  // Scatter random glitch characters in an area
  scatter(cx, cy, w, h, count = 12, duration = 5) {
    for (let i = 0; i < count; i++) {
      const x = cx + this.rng.int(-w / 2, w / 2);
      const y = cy + this.rng.int(-h / 2, h / 2);
      const char = GLITCH_CHARS[Math.floor(this.rng.next() * GLITCH_CHARS.length)];
      this.active.push({
        x, y, text: char,
        color: this.rng.pick([colors.glitch, colors.lilac, colors.dimmer]),
        life: this.rng.int(2, duration),
        maxLife: duration,
      });
    }
  }

  update() {
    this.active = this.active.filter(f => {
      f.life--;
      return f.life > 0;
    });
  }

  draw(screen) {
    for (const frag of this.active) {
      const alpha = frag.life / frag.maxLife;
      // Fade out: use dimmer color as life decreases
      const fg = alpha > 0.5 ? frag.color : colors.dimmer;
      const x = Math.round(frag.x);
      const y = Math.round(frag.y);
      screen.text(x, y, frag.text, fg, null, alpha > 0.7);
    }
  }
}

// Damage number that floats upward
class FloatingText {
  constructor() {
    this.items = [];
  }

  add(x, y, text, color, duration = 15) {
    this.items.push({ x, y: y, startY: y, text, color, life: duration, maxLife: duration });
  }

  update() {
    this.items = this.items.filter(item => {
      item.life--;
      // Float upward
      item.y = item.startY - ((1 - item.life / item.maxLife) * 3);
      return item.life > 0;
    });
  }

  draw(screen) {
    for (const item of this.items) {
      const y = Math.round(item.y);
      const alpha = item.life / item.maxLife;
      const fg = alpha > 0.3 ? item.color : colors.dimmer;
      screen.text(Math.round(item.x), y, item.text, fg, null, alpha > 0.6);
    }
  }
}

module.exports = { GlitchEffect, FloatingText, CODE_FRAGMENTS, GLITCH_CHARS };
