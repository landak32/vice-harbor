// The drivable graph. Every road is a straight line through the tile grid, so the network is
// just the intersections joined by the streets between them. Traffic and police follow it by
// lane: a car holds a list of waypoints and a cursor, and asks for the next edge when it nears
// the end. Nothing here draws anything.

import { LANE_OFFSET, ROAD_COLS, ROAD_HALF, ROAD_ROWS, ROAD_SPAN, TERRAIN, TILE } from '../config.js';
import { TILE_INDEX } from './layout.js';

const DIRECTIONS = [
  { dx: 1, dy: 0, name: 'east' },
  { dx: -1, dy: 0, name: 'west' },
  { dx: 0, dy: 1, name: 'south' },
  { dx: 0, dy: -1, name: 'north' },
];

/** The perpendicular pointing to a driver's right, in screen space (y grows downward). */
export function rightOf(dx, dy) {
  return { x: -dy, y: dx };
}

function roadIsDry(layout, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return false;
  const t = layout.terrain[TILE_INDEX(tx, ty)];
  return t === TERRAIN.ASPHALT || t === TERRAIN.SIDEWALK || t === TERRAIN.PARKING;
}

/**
 * Build the intersection graph: nodes at every crossing of a road column and a road row, each
 * with the neighbours it can reach without leaving dry asphalt.
 */
export function buildRoadNetwork(layout) {
  const xs = ROAD_COLS.map((col) => (col + 1) * TILE);
  const ys = ROAD_ROWS.map((row) => (row + 1) * TILE);
  const nodes = [];
  const at = (i, j) => (i < 0 || j < 0 || i >= xs.length || j >= ys.length ? null : nodes[j * xs.length + i]);

  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length; i += 1) {
      nodes.push({ i, j, x: xs[i], y: ys[j], phase: (i * 3.7 + j * 5.3) % 1, links: [] });
    }
  }

  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length; i += 1) {
      const node = at(i, j);
      const east = at(i + 1, j);
      if (east && roadIsDry(layout, (node.x + east.x) / 2, node.y) && roadIsDry(layout, node.x, node.y)) {
        node.links.push({ node: east, dx: 1, dy: 0 });
        east.links.push({ node, dx: -1, dy: 0 });
      }
      const south = at(i, j + 1);
      if (south && roadIsDry(layout, node.x, (node.y + south.y) / 2) && roadIsDry(layout, node.x, node.y)) {
        node.links.push({ node: south, dx: 0, dy: 1 });
        south.links.push({ node, dx: 0, dy: -1 });
      }
    }
  }

  return { nodes, xs, ys, at, width: xs.length, height: ys.length };
}

/** The point a car drives through when it takes the edge from `from` to `to`. */
export function lanePoint(from, to) {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const right = rightOf(dx, dy);
  return { x: to.x + right.x * LANE_OFFSET, y: to.y + right.y * LANE_OFFSET };
}

/** A waypoint list for one edge of the graph, starting just inside the first junction. */
export function edgeWaypoints(from, to) {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const right = rightOf(dx, dy);
  const start = { x: from.x + dx * (ROAD_HALF + 10) + right.x * LANE_OFFSET, y: from.y + dy * (ROAD_HALF + 10) + right.y * LANE_OFFSET };
  const end = lanePoint(from, to);
  return [start, end];
}

/** A node near a world point, for spawning traffic on the nearest street. */
export function nearestNode(network, x, y) {
  let best = network.nodes[0];
  let bestD = Infinity;
  for (const node of network.nodes) {
    const d = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

/** Picks the next direction at a junction: straight on when it can, otherwise any turn. */
export function chooseNextLink(node, rng, cameFrom) {
  const options = node.links.filter((link) => link.node !== cameFrom);
  if (options.length === 0) return node.links[0] ?? null;
  const straight = options.filter((link) => {
    if (!cameFrom) return false;
    const vx = Math.sign(node.x - cameFrom.x);
    const vy = Math.sign(node.y - cameFrom.y);
    return link.dx === vx && link.dy === vy;
  });
  if (straight.length > 0 && rng.chance(0.62)) return straight[0];
  return rng.pick(options);
}

/** The traffic light for one junction and one axis of travel. */
export function lightState(node, dx, dy, time) {
  const phase = (time * 0.11 + node.phase) % 1;
  const northSouth = dy !== 0;
  if (northSouth) {
    if (phase < 0.42) return 'green';
    if (phase < 0.5) return 'amber';
    return 'red';
  }
  if (phase < 0.5) return 'red';
  if (phase < 0.92) return 'green';
  return 'amber';
}

/**
 * A point on the pavement nearest to a world position: where crowds and the player are put
 * when they must stand on a sidewalk.
 */
export function nearestSidewalkPoint(layout, x, y, radius = 6) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  for (let ring = 0; ring < radius; ring += 1) {
    for (let oy = -ring; oy <= ring; oy += 1) {
      for (let ox = -ring; ox <= ring; ox += 1) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
        const nx = tx + ox;
        const ny = ty + oy;
        if (nx < 0 || ny < 0 || nx >= layout.cols || ny >= layout.rows) continue;
        if (layout.terrain[TILE_INDEX(nx, ny)] === TERRAIN.SIDEWALK) {
          return { x: (nx + 0.5) * TILE, y: (ny + 0.5) * TILE };
        }
      }
    }
  }
  return { x, y };
}

/** Every sidewalk tile that touches a crosswalk, used to place pedestrians near junctions. */
export function sidewalkTiles(layout) {
  const tiles = [];
  for (let ty = 0; ty < layout.rows; ty += 1) {
    for (let tx = 0; tx < layout.cols; tx += 1) {
      if (layout.terrain[TILE_INDEX(tx, ty)] !== TERRAIN.SIDEWALK) continue;
      tiles.push({ tx, ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    }
  }
  return tiles;
}

/** True when a tile is part of a crossing: road next to a sidewalk on two sides. */
export function isCrosswalkTile(layout, tx, ty) {
  const road = (x, y) => {
    if (x < 0 || y < 0 || x >= layout.cols || y >= layout.rows) return false;
    return layout.terrain[TILE_INDEX(x, y)] === TERRAIN.ASPHALT;
  };
  if (layout.terrain[TILE_INDEX(tx, ty)] !== TERRAIN.ASPHALT) return false;
  const horizontal = road(tx - 1, ty) && road(tx + 1, ty) && !road(tx, ty - 1) && !road(tx, ty + 1);
  return horizontal;
}

/** The direction names used by the traffic HUD and by police radio chatter. */
export const COMPASS = DIRECTIONS.map((d) => d.name);

/** How wide a road's painted surface is, for renderers that need the curb line. */
export const ROAD_WIDTH = ROAD_SPAN * TILE;
