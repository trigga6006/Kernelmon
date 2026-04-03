// Mulberry32 - fast, high-quality seeded PRNG
// Same seed = same sequence, always. This is what makes both terminals show identical battles.

function createRNG(seed) {
  let s = seed | 0;

  function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Random float in [min, max)
  function float(min = 0, max = 1) {
    return min + next() * (max - min);
  }

  // Random int in [min, max] inclusive
  function int(min, max) {
    return Math.floor(float(min, max + 1));
  }

  // Random boolean with given probability of true
  function chance(probability = 0.5) {
    return next() < probability;
  }

  // Pick random element from array
  function pick(arr) {
    return arr[Math.floor(next() * arr.length)];
  }

  // Shuffle array (Fisher-Yates)
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { next, float, int, chance, pick, shuffle };
}

// Generate a seed from two machine IDs (XOR hash)
function combinedSeed(idA, idB) {
  const str = idA + ':' + idB;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

module.exports = { createRNG, combinedSeed };
