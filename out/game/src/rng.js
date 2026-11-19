// Seeded randomness. Two streams are used: one for the city's generation and one for the
// live simulation, so a seed always builds the same streets and then plays out the same way.
// mulberry32 is small, fast and good enough for a game; every draw is a pure function of the seed.

export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The raw generator plus the little helpers every spawner wants. */
export function makeRandom(seed) {
  const next = createRandom(seed);
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    /** A shuffled copy: Fisher-Yates on the seeded stream. */
    shuffle(list) {
      const copy = list.slice();
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        const held = copy[index];
        copy[index] = copy[swap];
        copy[swap] = held;
      }
      return copy;
    },
  };
}

/** A stable hash of a tile position, used for the small colour and texture variations. */
export function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
