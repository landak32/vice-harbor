// Street furniture and greenery: palms, lamp posts, benches, bins, crates, containers,
// hydrants, picnic tables and mooring bollards. Each prop is a small record with a position,
// a radius and whether it stops a car; the renderer decides how it looks.

import { DISTRICTS, ROAD_HALF, TILE } from '../config.js';

function prop(kind, x, y, radius, solid, extra) {
  return { kind, x, y, r: radius, solid: Boolean(solid), rot: 0, ...extra };
}

/** Palms and trees, scattered but never on a road or in the water. */
function scatterGreen(layout, rng, props) {
  const dry = (x, y) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return false;
    const t = layout.terrain[ty * layout.cols + tx];
    return t === 3 || t === 2 || t === 1 || t === 7;
  };
  // The beach strip: a line of leaning palms just behind the sand.
  for (let y = 40; y < layout.height - 40; y += rng.range(58, 92)) {
    const x = rng.range(78.4, 79.6) * TILE;
    if (dry(x, y)) props.push(prop('palm', x, y, 9, true, { rot: rng.range(-0.25, 0.25), lean: rng.range(-0.3, 0.3) }));
  }
  for (let y = 60; y < layout.height - 60; y += rng.range(120, 200)) {
    const x = rng.range(81, 83.4) * TILE;
    if (dry(x, y)) props.push(prop('palm', x, y, 8, true, { rot: rng.range(-0.4, 0.4), lean: rng.range(-0.5, 0.5) }));
  }
  // The park: trees in loose clumps, palms on the corners.
  for (const block of layout.blocks) {
    if (block.district !== DISTRICTS.PARK) continue;
    for (let index = 0; index < 22; index += 1) {
      const x = block.x + rng.range(14, block.w - 14);
      const y = block.y + rng.range(14, block.h - 14);
      if (!dry(x, y)) continue;
      if (rng.chance(0.28)) props.push(prop('palm', x, y, 9, true, { rot: rng.range(0, 6.28), lean: rng.range(-0.4, 0.4) }));
      else props.push(prop('tree', x, y, rng.range(12, 18), true, { rot: rng.range(0, 6.28), tone: rng.range(0, 1) }));
    }
  }
  // A few trees in the residential yards, for shade over the pavements.
  for (const block of layout.blocks) {
    if (block.district !== DISTRICTS.RESIDENTIAL) continue;
    for (let index = 0; index < 4; index += 1) {
      const x = block.x + rng.range(10, block.w - 10);
      const y = block.y + rng.range(10, block.h - 10);
      if (!dry(x, y)) continue;
      props.push(prop('tree', x, y, rng.range(10, 15), true, { rot: rng.range(0, 6.28), tone: rng.range(0, 1) }));
    }
  }
}

/** Lamps at every intersection corner, which is also what lights the streets at night. */
function placeLamps(layout, props) {
  for (const crossing of layout.intersections) {
    const offsets = [
      [-ROAD_HALF - 9, -ROAD_HALF - 9],
      [ROAD_HALF + 9, -ROAD_HALF - 9],
      [-ROAD_HALF - 9, ROAD_HALF + 9],
      [ROAD_HALF + 9, ROAD_HALF + 9],
    ];
    for (const [dx, dy] of offsets) {
      const x = crossing.cx + dx;
      const y = crossing.cy + dy;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) continue;
      const t = layout.terrain[ty * layout.cols + tx];
      if (t === 5) continue;
      props.push(prop('lamp', x, y, 5, true, { phase: (tx * 7 + ty * 3) % 10 }));
    }
  }
}

/** Bins, hydrants, benches, crates and the rest, block by block. */
function placeFurniture(layout, rng, props) {
  for (const block of layout.blocks) {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (block.district === DISTRICTS.PARK) {
      for (let index = 0; index < 5; index += 1) {
        const x = block.x + rng.range(30, block.w - 30);
        const y = block.y + rng.range(30, block.h - 30);
        props.push(prop(rng.chance(0.5) ? 'bench' : 'picnic', x, y, 11, false, { rot: rng.range(0, 6.28) }));
      }
      props.push(prop('bench', block.x + 22, block.y + block.h * 0.5, 10, false, { rot: Math.PI / 2 }));
      continue;
    }
    if (block.district === DISTRICTS.DOCKS) {
      for (let index = 0; index < 7; index += 1) {
        const x = block.x + rng.range(14, block.w - 14);
        const y = block.y + rng.range(14, block.h - 14);
        props.push(prop(rng.chance(0.4) ? 'container' : 'crate', x, y, rng.chance(0.4) ? 20 : 10, rng.chance(0.4), {
          rot: rng.range(-0.12, 0.12),
          hue: rng.range(0, 1),
        }));
      }
      continue;
    }
    // Every other block: a bin and a hydrant near one corner, a bench by the pavement.
    props.push(prop('bin', block.x + rng.range(10, 26), block.y + rng.range(10, 26), 7, false, {}));
    if (rng.chance(0.6)) props.push(prop('hydrant', block.x + rng.range(10, 30), block.y + block.h - rng.range(10, 26), 6, true, {}));
    if (rng.chance(0.5)) props.push(prop('bench', block.x + block.w - rng.range(14, 30), block.y + rng.range(20, block.h - 20), 10, false, { rot: rng.range(0, 6.28) }));
    if (block.district === DISTRICTS.BEACH) {
      for (let index = 0; index < 3; index += 1) {
        props.push(prop('umbrella', block.x + rng.range(8, block.w - 8), block.y + rng.range(8, block.h - 8), 9, false, {
          hue: rng.range(0, 1),
        }));
      }
    }
    if (block.district === DISTRICTS.RESIDENTIAL && rng.chance(0.5)) {
      props.push(prop('bin', cx + rng.range(-40, 40), cy + rng.range(-40, 40), 7, false, {}));
    }
  }
}

/** Bollards along the quay, and a crane on the harbour's edge. */
function placeHarbour(layout, rng, props) {
  for (let x = 1.2 * TILE; x < 15 * TILE; x += 34) {
    props.push(prop('bollard', x, 54.2 * TILE, 6, true, {}));
  }
  props.push(prop('crane', 6.4 * TILE, 52.4 * TILE, 24, true, { rot: 0 }));
  props.push(prop('crane', 12.2 * TILE, 52.4 * TILE, 24, true, { rot: 0.4 }));
  for (let index = 0; index < 6; index += 1) {
    props.push(prop('container', rng.range(0.8, 14) * TILE, rng.range(54.6, 56) * TILE, 20, true, { rot: 0, hue: rng.range(0, 1) }));
  }
}

/** Every prop in the city, in one flat list the renderer culls per frame. */
export function buildCityProps(layout, rng) {
  const props = [];
  placeLamps(layout, props);
  scatterGreen(layout, rng, props);
  placeFurniture(layout, rng, props);
  placeHarbour(layout, rng, props);
  return props;
}
