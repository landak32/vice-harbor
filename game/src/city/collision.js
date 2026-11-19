// Static collision: buildings are rectangles, props are circles, water is forbidden ground.
// Everything solid is bucketed into a coarse grid once at load, so a car or a bullet only ever
// tests the handful of things standing near it. Moving bodies (cars, people) are pushed out by
// the same helpers, which keeps them from ever ending a frame inside a wall.

import { TILE, TERRAIN } from '../config.js';
import { pushCircleFromRect } from '../geometry.js';
import { TILE_INDEX } from './layout.js';

const CELL = TILE * 4;

export function buildStaticGrid(layout, buildings, props) {
  const cols = Math.ceil(layout.width / CELL);
  const rows = Math.ceil(layout.height / CELL);
  const cells = new Array(cols * rows);
  for (let index = 0; index < cells.length; index += 1) cells[index] = { buildings: [], props: [] };

  const addRect = (rect) => {
    const cx0 = Math.max(0, Math.floor(rect.x / CELL));
    const cy0 = Math.max(0, Math.floor(rect.y / CELL));
    const cx1 = Math.min(cols - 1, Math.floor((rect.x + rect.w) / CELL));
    const cy1 = Math.min(rows - 1, Math.floor((rect.y + rect.h) / CELL));
    for (let cy = cy0; cy <= cy1; cy += 1) {
      for (let cx = cx0; cx <= cx1; cx += 1) cells[cy * cols + cx].buildings.push(rect);
    }
  };

  const addCircle = (prop) => {
    const cx0 = Math.max(0, Math.floor((prop.x - prop.r) / CELL));
    const cy0 = Math.max(0, Math.floor((prop.y - prop.r) / CELL));
    const cx1 = Math.min(cols - 1, Math.floor((prop.x + prop.r) / CELL));
    const cy1 = Math.min(rows - 1, Math.floor((prop.y + prop.r) / CELL));
    for (let cy = cy0; cy <= cy1; cy += 1) {
      for (let cx = cx0; cx <= cx1; cx += 1) cells[cy * cols + cx].props.push(prop);
    }
  };

  for (const building of buildings) addRect(building);
  for (const prop of props) if (prop.solid) addCircle(prop);

  return {
    layout,
    cols,
    rows,
    cells,
    /** The buildings and props within reach of a circle. */
    near(x, y, radius) {
      const cx0 = Math.max(0, Math.floor((x - radius) / CELL));
      const cy0 = Math.max(0, Math.floor((y - radius) / CELL));
      const cx1 = Math.min(cols - 1, Math.floor((x + radius) / CELL));
      const cy1 = Math.min(rows - 1, Math.floor((y + radius) / CELL));
      const out = { buildings: [], props: [] };
      for (let cy = cy0; cy <= cy1; cy += 1) {
        for (let cx = cx0; cx <= cx1; cx += 1) {
          const cell = cells[cy * cols + cx];
          for (const b of cell.buildings) if (!out.buildings.includes(b)) out.buildings.push(b);
          for (const p of cell.props) if (!out.props.includes(p)) out.props.push(p);
        }
      }
      return out;
    },
  };
}

/** Terrain lookups that the physics needs: water is a wall, asphalt is a road. */
export function terrainFlags(layout, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return TERRAIN.WATER;
  return layout.terrain[TILE_INDEX(tx, ty)];
}

export function isWater(grid, x, y) {
  return terrainFlags(grid.layout, x, y) === TERRAIN.WATER;
}

/**
 * Push a circle out of every solid thing near it. Returns the list of things it touched, so a
 * car can work out how hard the impact was and a person can be knocked over by it.
 */
export function resolveCircleAgainstWorld(grid, body, radius) {
  const near = grid.near(body.x, body.y, radius + 8);
  const hits = [];
  for (const building of near.buildings) {
    if (pushCircleFromRect(body, building, radius)) hits.push(building);
  }
  for (const prop of near.props) {
    const dx = body.x - prop.x;
    const dy = body.y - prop.y;
    const reach = radius + prop.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) continue;
    const d = Math.sqrt(d2) || 0.001;
    body.x = prop.x + (dx / d) * reach;
    body.y = prop.y + (dy / d) * reach;
    hits.push(prop);
  }
  return hits;
}

/** Whether a point is inside a solid thing: bullets and line-of-sight tests use it. */
export function pointIsSolid(grid, x, y) {
  if (isWater(grid, x, y)) return true;
  const near = grid.near(x, y, 1);
  for (const building of near.buildings) {
    if (x >= building.x && x <= building.x + building.w && y >= building.y && y <= building.y + building.h) return true;
  }
  return false;
}

/**
 * March a ray until it hits a wall or travels `maxDistance`, and return where it stopped. Used
 * for bullets, for the police's line of sight, and for the camera's look-ahead.
 */
export function raycastWorld(grid, x, y, dx, dy, maxDistance) {
  const step = 12;
  let travelled = 0;
  while (travelled < maxDistance) {
    travelled += step;
    const px = x + dx * travelled;
    const py = y + dy * travelled;
    if (pointIsSolid(grid, px, py)) return { x: px, y: py, distance: travelled, hit: true };
  }
  return { x: x + dx * maxDistance, y: y + dy * maxDistance, distance: maxDistance, hit: false };
}
