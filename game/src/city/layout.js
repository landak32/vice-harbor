// The city's skeleton: which tile is road, pavement, sand or water, where the blocks and
// intersections are, and where the named places of the story sit. Everything is a pure
// function of the seed, so the same seed always builds the same Vice Harbor.
//
// Layout rules, in order: water first (the east shore and the harbour basin), then the park's
// grass and pond, then the road grid carved over everything dry, then one tile of pavement
// around every road, then blocks and intersections.

import { ROAD_COLS, ROAD_ROWS, ROAD_SPAN, TILE, TERRAIN, WORLD } from '../config.js';
import { makeRandom } from '../rng.js';
import { districtForTile } from './districts.js';

export const TILE_INDEX = (tx, ty) => ty * WORLD.cols + tx;

/** The terrain at a tile, with anything outside the map read as water. */
export function terrainAtTile(layout, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return TERRAIN.WATER;
  return layout.terrain[TILE_INDEX(tx, ty)];
}

export function terrainAtPoint(layout, x, y) {
  return terrainAtTile(layout, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function isWaterAt(layout, x, y) {
  return terrainAtPoint(layout, x, y) === TERRAIN.WATER;
}

export function isRoadAt(layout, x, y) {
  return terrainAtPoint(layout, x, y) === TERRAIN.ASPHALT;
}

export function districtAtPoint(layout, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return 0;
  return layout.district[TILE_INDEX(tx, ty)];
}

export function buildLayout(seed) {
  const rng = makeRandom(seed ^ 0x51ed270b);
  const cols = WORLD.cols;
  const rows = WORLD.rows;
  const terrain = new Uint8Array(cols * rows).fill(TERRAIN.LOT);
  const district = new Uint8Array(cols * rows);

  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      district[TILE_INDEX(tx, ty)] = districtForTile(tx, ty);
    }
  }

  function paint(tx, ty, value) {
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return;
    terrain[TILE_INDEX(tx, ty)] = value;
  }

  function fill(tx0, ty0, tx1, ty1, value) {
    for (let ty = ty0; ty <= ty1; ty += 1) {
      for (let tx = tx0; tx <= tx1; tx += 1) paint(tx, ty, value);
    }
  }

  // The east shore: a strip of sand, then open water past the last coastal road.
  fill(78, 0, 83, rows - 1, TERRAIN.SAND);
  fill(84, 0, cols - 1, rows - 1, TERRAIN.WATER);

  // The harbour basin in the south-west, with two finger piers over the water.
  fill(0, 54, 14, rows - 1, TERRAIN.WATER);
  fill(1, 56, 5, 58, TERRAIN.PIER);
  fill(8, 59, 12, 61, TERRAIN.PIER);

  // The park: grass blocks with a pond and a couple of footpaths.
  for (let ty = 30; ty <= 51; ty += 1) {
    for (let tx = 30; tx <= 51; tx += 1) {
      if (district[TILE_INDEX(tx, ty)] === 3) paint(tx, ty, TERRAIN.GRASS);
    }
  }
  for (let ty = 32; ty <= 38; ty += 1) {
    for (let tx = 43; tx <= 49; tx += 1) {
      const dx = (tx - 46) / 3.1;
      const dy = (ty - 35) / 2.5;
      if (dx * dx + dy * dy < 1) paint(tx, ty, TERRAIN.WATER);
    }
  }

  // Roads, laid only where the ground is dry: the streets dead-end at the harbour.
  for (const roadCol of ROAD_COLS) {
    for (let ty = 0; ty < rows; ty += 1) {
      for (let span = 0; span < ROAD_SPAN; span += 1) {
        if (terrain[TILE_INDEX(roadCol + span, ty)] !== TERRAIN.WATER) paint(roadCol + span, ty, TERRAIN.ASPHALT);
      }
    }
  }
  for (const roadRow of ROAD_ROWS) {
    for (let tx = 0; tx < cols; tx += 1) {
      for (let span = 0; span < ROAD_SPAN; span += 1) {
        if (terrain[TILE_INDEX(tx, roadRow + span)] !== TERRAIN.WATER) paint(tx, roadRow + span, TERRAIN.ASPHALT);
      }
    }
  }

  // One tile of pavement along every dry road, which is also where the crowds walk.
  const dry = (tx, ty) => tx >= 0 && ty >= 0 && tx < cols && ty < rows && terrain[TILE_INDEX(tx, ty)] !== TERRAIN.WATER;
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      if (terrain[TILE_INDEX(tx, ty)] !== TERRAIN.LOT) continue;
      const touchesRoad =
        (dry(tx - 1, ty) && terrain[TILE_INDEX(tx - 1, ty)] === TERRAIN.ASPHALT) ||
        (dry(tx + 1, ty) && terrain[TILE_INDEX(tx + 1, ty)] === TERRAIN.ASPHALT) ||
        (dry(tx, ty - 1) && terrain[TILE_INDEX(tx, ty - 1)] === TERRAIN.ASPHALT) ||
        (dry(tx, ty + 1) && terrain[TILE_INDEX(tx, ty + 1)] === TERRAIN.ASPHALT);
      if (touchesRoad) paint(tx, ty, TERRAIN.SIDEWALK);
    }
  }

  // A few blocks are car parks, with painted stalls drawn by the ground renderer.
  const parkingBlocks = [];
  for (let i = 1; i < ROAD_COLS.length - 1; i += 1) {
    for (let j = 1; j < ROAD_ROWS.length - 1; j += 1) {
      if (!rng.chance(0.16)) continue;
      const tx0 = ROAD_COLS[i] + ROAD_SPAN + 1;
      const ty0 = ROAD_ROWS[j] + ROAD_SPAN + 1;
      const tx1 = ROAD_COLS[i + 1] - 2;
      const ty1 = ROAD_ROWS[j + 1] - 2;
      let dryBlock = true;
      for (let ty = ty0; ty <= ty1 && dryBlock; ty += 1) {
        for (let tx = tx0; tx <= tx1; tx += 1) {
          if (terrain[TILE_INDEX(tx, ty)] === TERRAIN.WATER) dryBlock = false;
        }
      }
      if (!dryBlock) continue;
      fill(tx0 + 1, ty0 + 1, tx1 - 1, ty1 - 1, TERRAIN.PARKING);
      parkingBlocks.push({ tx0, ty0, tx1, ty1 });
    }
  }

  // Blocks: the ground between two roads, with the pavement ring already cut out.
  const blocks = [];
  for (let i = 0; i < ROAD_COLS.length - 1; i += 1) {
    for (let j = 0; j < ROAD_ROWS.length - 1; j += 1) {
      const tx0 = ROAD_COLS[i] + ROAD_SPAN + 1;
      const ty0 = ROAD_ROWS[j] + ROAD_SPAN + 1;
      const tx1 = ROAD_COLS[i + 1] - 2;
      const ty1 = ROAD_ROWS[j + 1] - 2;
      let wet = false;
      for (let ty = ty0; ty <= ty1 && !wet; ty += 1) {
        for (let tx = tx0; tx <= tx1; tx += 1) {
          if (terrain[TILE_INDEX(tx, ty)] === TERRAIN.WATER) {
            wet = true;
            break;
          }
        }
      }
      if (wet) continue;
      const districtId = districtForTile(Math.floor((tx0 + tx1) / 2), Math.floor((ty0 + ty1) / 2));
      blocks.push({
        i,
        j,
        tx0,
        ty0,
        tx1,
        ty1,
        district: districtId,
        x: tx0 * TILE,
        y: ty0 * TILE,
        w: (tx1 - tx0 + 1) * TILE,
        h: (ty1 - ty0 + 1) * TILE,
        cx: ((tx0 + tx1 + 1) / 2) * TILE,
        cy: ((ty0 + ty1 + 1) / 2) * TILE,
        parking: parkingBlocks.some((p) => p.tx0 === tx0 && p.ty0 === ty0),
      });
    }
  }

  // Intersections, with a traffic-light phase each so the city does not blink in unison.
  const intersections = [];
  for (let j = 0; j < ROAD_ROWS.length; j += 1) {
    for (let i = 0; i < ROAD_COLS.length; i += 1) {
      const cx = (ROAD_COLS[i] + 1) * TILE;
      const cy = (ROAD_ROWS[j] + 1) * TILE;
      if (terrain[TILE_INDEX(ROAD_COLS[i], ROAD_ROWS[j])] === TERRAIN.WATER) continue;
      intersections.push({
        i,
        j,
        cx,
        cy,
        phase: (i * 3.1 + j * 5.7 + rng.range(0, 2)) % 13,
      });
    }
  }

  const blockAt = (i, j) => blocks.find((block) => block.i === i && block.j === j) ?? blocks[0];

  // Named places the story and the activities point at, each on a block the player can reach.
  const landmarks = {
    hospital: point(blockAt(0, 0), 0.5, 0.55),
    police: point(blockAt(5, 2), 0.5, 0.5),
    tower: point(blockAt(3, 0), 0.5, 0.62),
    docks: point(blockAt(1, 3), 0.5, 0.5),
    pier: { x: 3.2 * TILE, y: 58.4 * TILE },
    marina: point(blockAt(5, 4), 0.7, 0.6),
    park: point(blockAt(3, 2), 0.28, 0.72),
    cabstand: point(blockAt(2, 1), 0.5, 0.8),
    depot: point(blockAt(0, 2), 0.5, 0.5),
    beach: { x: 81.5 * TILE, y: 30 * TILE },
    strip: { x: 77 * TILE, y: 22 * TILE },
    home: point(blockAt(1, 1), 0.3, 0.4),
  };

  return {
    seed,
    cols,
    rows,
    tile: TILE,
    width: cols * TILE,
    height: rows * TILE,
    terrain,
    district,
    blocks,
    intersections,
    landmarks,
    roadCols: ROAD_COLS,
    roadRows: ROAD_ROWS,
    water: collectShore(terrain, cols, rows),
  };
}

function point(block, fx, fy) {
  return { x: block.x + block.w * fx, y: block.y + block.h * fy };
}

/** Water tiles that touch dry land: the renderer draws surf along these. */
function collectShore(terrain, cols, rows) {
  const shore = [];
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      if (terrain[ty * cols + tx] !== TERRAIN.WATER) continue;
      const open =
        (tx > 0 && terrain[ty * cols + tx - 1] !== TERRAIN.WATER) ||
        (tx < cols - 1 && terrain[ty * cols + tx + 1] !== TERRAIN.WATER) ||
        (ty > 0 && terrain[(ty - 1) * cols + tx] !== TERRAIN.WATER) ||
        (ty < rows - 1 && terrain[(ty + 1) * cols + tx] !== TERRAIN.WATER);
      if (open) shore.push({ tx, ty });
    }
  }
  return shore;
}
