// The ground: asphalt, pavement, grass, sand, water and piers, then the paint on top of them —
// lane dashes, crosswalks, stop lines and parking stalls. Everything is drawn from the tile grid
// and culled to the camera, so the cost is what is on screen, not the size of the city.

import { DISTRICT_STYLE, ROAD_COLS, ROAD_HALF, ROAD_ROWS, TERRAIN, TILE } from '../config.js';
import { hash2 } from '../rng.js';

const SHADE_STEPS = [-0.055, 0, 0.05];

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((value >> 16) & 255) + amount * 255));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount * 255));
  const b = Math.max(0, Math.min(255, (value & 255) + amount * 255));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

const cache = new Map();

function tilePalette(terrain, districtId) {
  const key = `${terrain}:${districtId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const style = DISTRICT_STYLE[districtId] ?? DISTRICT_STYLE[0];
  let base = style.asphalt;
  if (terrain === TERRAIN.SIDEWALK) base = style.sidewalk;
  else if (terrain === TERRAIN.LOT) base = style.lot;
  else if (terrain === TERRAIN.GRASS) base = style.id === 3 ? '#4e7f46' : '#5b7f4a';
  else if (terrain === TERRAIN.SAND) base = '#e0cd9c';
  else if (terrain === TERRAIN.WATER) base = '#173852';
  else if (terrain === TERRAIN.PIER) base = '#8a6c4c';
  else if (terrain === TERRAIN.PARKING) base = style.asphalt;
  const shades = SHADE_STEPS.map((step) => shade(base, step));
  cache.set(key, shades);
  return shades;
}

function drawTile(ctx, world, tx, ty, terrain, districtId, x, y) {
  const shades = tilePalette(terrain, districtId);
  const pick = shades[(hash2(tx, ty) * 3) | 0] ?? shades[1];
  ctx.fillStyle = pick;
  ctx.fillRect(x, y, TILE, TILE);
  const roll = hash2(tx * 7 + 3, ty * 13 + 5);

  if (terrain === TERRAIN.SIDEWALK) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(x, y, TILE, 1);
    ctx.fillRect(x, y, 1, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 1, y + 1, TILE - 2, 1);
    if (roll > 0.86) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x + 8 + roll * 20, y + 10 + roll * 16, 5, 3);
    }
  } else if (terrain === TERRAIN.ASPHALT || terrain === TERRAIN.PARKING) {
    if (roll > 0.55) {
      ctx.fillStyle = 'rgba(255,255,255,0.022)';
      ctx.fillRect(x + roll * 30, y + (roll * 47) % TILE, 10, 6);
    }
    if (roll < 0.05) {
      ctx.fillStyle = 'rgba(15,18,22,0.55)';
      ctx.beginPath();
      ctx.arc(x + 24, y + 24, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,128,136,0.5)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  } else if (terrain === TERRAIN.GRASS) {
    ctx.fillStyle = 'rgba(20,50,20,0.18)';
    for (let blade = 0; blade < 3; blade += 1) {
      const bx = x + ((hash2(tx + blade * 11, ty) * TILE) | 0);
      const by = y + ((hash2(tx, ty + blade * 17) * TILE) | 0);
      ctx.fillRect(bx, by, 2, 4);
    }
  } else if (terrain === TERRAIN.SAND) {
    // Wind-blown ripples, and the odd footprint.
    ctx.strokeStyle = 'rgba(150,120,74,0.20)';
    ctx.lineWidth = 1.4;
    for (let ripple = 0; ripple < 2; ripple += 1) {
      const ry = y + 12 + ripple * 22 + hash2(tx, ty + ripple) * 8;
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.quadraticCurveTo(x + TILE * 0.5, ry + 3.5, x + TILE, ry - 1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,96,60,0.2)';
    for (let grain = 0; grain < 4; grain += 1) {
      const gx = x + ((hash2(tx * 3 + grain, ty * 5) * TILE) | 0);
      const gy = y + ((hash2(tx * 5, ty * 3 + grain) * TILE) | 0);
      ctx.fillRect(gx, gy, 2, 2);
    }
    if (roll > 0.93) {
      ctx.fillStyle = 'rgba(140,116,80,0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 18, y + 20, 3, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (roll > 0.72) {
      // A towel left on the sand.
      ctx.fillStyle = ['#e2674f', '#4f86c6', '#e0b64f'][(roll * 30) % 3 | 0];
      ctx.fillRect(x + 12 + roll * 8, y + 14, 13, 8);
    }
  } else if (terrain === TERRAIN.PIER) {
    ctx.fillStyle = 'rgba(50,32,18,0.35)';
    for (let plank = 0; plank < 4; plank += 1) ctx.fillRect(x, y + plank * 12, TILE, 1.5);
    ctx.fillStyle = 'rgba(255,230,190,0.06)';
    ctx.fillRect(x, y + 1, TILE, 1);
  }
}

function drawWater(ctx, world, view) {
  const { layout } = world;
  const t = layout.tile;
  ctx.fillStyle = '#16334c';
  ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  const tx0 = Math.max(0, Math.floor(view.x0 / t));
  const tx1 = Math.min(layout.cols - 1, Math.floor(view.x1 / t));
  const ty0 = Math.max(0, Math.floor(view.y0 / t));
  const ty1 = Math.min(layout.rows - 1, Math.floor(view.y1 / t));
  const time = world.clock;
  for (let ty = ty0; ty <= ty1; ty += 1) {
    for (let tx = tx0; tx <= tx1; tx += 1) {
      if (layout.terrain[ty * layout.cols + tx] !== TERRAIN.WATER) continue;
      const x = tx * t;
      const y = ty * t;
      const depth = Math.min(1, (tx - 78) / 8 + 0.25);
      ctx.fillStyle = depth > 0.5 ? '#123049' : '#1a3f5c';
      ctx.fillRect(x, y, t, t);
      const wave = Math.sin(time * 0.7 + tx * 0.5 + ty * 0.42);
      if (wave > 0.25) {
        ctx.fillStyle = `rgba(158,212,240,${0.08 + wave * 0.14})`;
        ctx.fillRect(x + 4, y + 12 + wave * 8, 34, 2);
      }
      if (wave > 0.72) {
        ctx.fillStyle = 'rgba(205,238,252,0.22)';
        ctx.fillRect(x + 12, y + 30, 24, 1.8);
      }
      if (wave < -0.75) {
        ctx.fillStyle = 'rgba(200,235,250,0.12)';
        ctx.fillRect(x + 18, y + 30, 18, 1.4);
      }
    }
  }
  // Surf: a soft white line where the water meets land.
  for (const cell of layout.water) {
    if (cell.tx * t < view.x0 - t || cell.tx * t > view.x1 || cell.ty * t < view.y0 - t || cell.ty * t > view.y1) continue;
    const x = cell.tx * t;
    const y = cell.ty * t;
    const pulse = 0.45 + 0.35 * Math.sin(time * 1.6 + cell.tx * 0.8 + cell.ty * 0.5);
    ctx.fillStyle = `rgba(232,246,252,${pulse * 0.8})`;
    const dryLeft = layout.terrain[cell.ty * layout.cols + cell.tx - 1] !== TERRAIN.WATER && cell.tx > 0;
    const dryRight = layout.terrain[cell.ty * layout.cols + cell.tx + 1] !== TERRAIN.WATER && cell.tx < layout.cols - 1;
    const dryUp = layout.terrain[(cell.ty - 1) * layout.cols + cell.tx] !== TERRAIN.WATER && cell.ty > 0;
    const dryDown = layout.terrain[(cell.ty + 1) * layout.cols + cell.tx] !== TERRAIN.WATER && cell.ty < layout.rows - 1;
    if (dryLeft) ctx.fillRect(x, y, 9, t);
    if (dryRight) ctx.fillRect(x + t - 9, y, 9, t);
    if (dryUp) ctx.fillRect(x, y, t, 9);
    if (dryDown) ctx.fillRect(x, y + t - 9, t, 9);
  }
}

function drawLaneMarkings(ctx, world, view) {
  const { layout } = world;
  const t = layout.tile;
  ctx.save();
  ctx.strokeStyle = 'rgba(238,236,224,0.62)';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 24]);
  for (const col of ROAD_COLS) {
    const x = (col + 1) * t;
    if (x < view.x0 - 40 || x > view.x1 + 40) continue;
    ctx.beginPath();
    for (const row of ROAD_ROWS) {
      const cy = (row + 1) * t;
      const from = Math.max(view.y0, cy + ROAD_HALF + 16);
      const to = Math.min(view.y1, cy - ROAD_HALF - 16);
      if (to > from) {
        ctx.moveTo(x, from);
        ctx.lineTo(x, to);
      }
    }
    const lastRow = (ROAD_ROWS[ROAD_ROWS.length - 1] + 1) * t;
    if (view.y1 > lastRow) {
      ctx.moveTo(x, Math.max(view.y0, lastRow + ROAD_HALF + 16));
      ctx.lineTo(x, view.y1);
    }
    const firstRow = (ROAD_ROWS[0] + 1) * t;
    if (view.y0 < firstRow) {
      ctx.moveTo(x, view.y0);
      ctx.lineTo(x, Math.min(view.y1, firstRow - ROAD_HALF - 16));
    }
    ctx.stroke();
  }
  for (const row of ROAD_ROWS) {
    const y = (row + 1) * t;
    if (y < view.y0 - 40 || y > view.y1 + 40) continue;
    ctx.beginPath();
    for (const col of ROAD_COLS) {
      const cx = (col + 1) * t;
      const from = Math.max(view.x0, cx + ROAD_HALF + 16);
      const to = Math.min(view.x1, cx - ROAD_HALF - 16);
      if (to > from) {
        ctx.moveTo(from, y);
        ctx.lineTo(to, y);
      }
    }
    const lastCol = (ROAD_COLS[ROAD_COLS.length - 1] + 1) * t;
    if (view.x1 > lastCol) {
      ctx.moveTo(Math.max(view.x0, lastCol + ROAD_HALF + 16), y);
      ctx.lineTo(view.x1, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // A double line down the middle of the biggest boulevards.
  ctx.fillStyle = 'rgba(230,196,96,0.42)';
  for (const col of ROAD_COLS) {
    const x = (col + 1) * t;
    if (x < view.x0 - 40 || x > view.x1 + 40) continue;
    for (let y = view.y0; y < view.y1; y += 6) {
      let blocked = false;
      for (const row of ROAD_ROWS) if (Math.abs(y - (row + 1) * t) < ROAD_HALF + 18) blocked = true;
      if (!blocked) ctx.fillRect(x - 7, y, 2, 4);
    }
  }
}

function drawCrosswalk(ctx, cx, cy) {
  const mouth = ROAD_HALF + 12;
  ctx.fillStyle = 'rgba(240,238,226,0.7)';
  for (let index = -2; index <= 2; index += 1) {
    const offset = index * 18;
    // North and south approaches.
    ctx.fillRect(cx + offset - 5, cy - mouth - 2, 10, 24);
    ctx.fillRect(cx + offset - 5, cy + mouth - 22, 10, 24);
    // East and west approaches.
    ctx.fillRect(cx - mouth - 2, cy + offset - 5, 24, 10);
    ctx.fillRect(cx + mouth - 22, cy + offset - 5, 24, 10);
  }
  ctx.fillStyle = 'rgba(240,238,226,0.5)';
  ctx.fillRect(cx - mouth - 2, cy - mouth - 2, 24, 3);
  ctx.fillRect(cx + mouth - 22, cy + mouth - 1, 24, 3);
}

function drawIntersections(ctx, world, view) {
  for (const crossing of world.layout.intersections) {
    if (crossing.cx < view.x0 - 90 || crossing.cx > view.x1 + 90) continue;
    if (crossing.cy < view.y0 - 90 || crossing.cy > view.y1 + 90) continue;
    drawCrosswalk(ctx, crossing.cx, crossing.cy);
  }
}

function drawParkingStalls(ctx, world, view) {
  ctx.strokeStyle = 'rgba(235,232,220,0.32)';
  ctx.lineWidth = 2;
  for (const block of world.layout.blocks) {
    if (!block.parking) continue;
    if (block.x > view.x1 || block.x + block.w < view.x0 || block.y > view.y1 || block.y + block.h < view.y0) continue;
    ctx.beginPath();
    for (let x = block.x + 14; x < block.x + block.w - 10; x += 30) {
      ctx.moveTo(x, block.y + 10);
      ctx.lineTo(x, block.y + 52);
      ctx.moveTo(x, block.y + block.h - 52);
      ctx.lineTo(x, block.y + block.h - 10);
    }
    ctx.moveTo(block.x + 8, block.y + 30);
    ctx.lineTo(block.x + block.w - 8, block.y + 30);
    ctx.moveTo(block.x + 8, block.y + block.h - 30);
    ctx.lineTo(block.x + block.w - 8, block.y + block.h - 30);
    ctx.stroke();
  }
}

/** Pavement kerbs: a thin light line where a pavement tile meets a road tile. */
function drawKerbs(ctx, world, view) {
  const { layout } = world;
  const t = layout.tile;
  const tx0 = Math.max(1, Math.floor(view.x0 / t));
  const tx1 = Math.min(layout.cols - 2, Math.floor(view.x1 / t));
  const ty0 = Math.max(1, Math.floor(view.y0 / t));
  const ty1 = Math.min(layout.rows - 2, Math.floor(view.y1 / t));
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let ty = ty0; ty <= ty1; ty += 1) {
    for (let tx = tx0; tx <= tx1; tx += 1) {
      if (layout.terrain[ty * layout.cols + tx] !== TERRAIN.SIDEWALK) continue;
      const x = tx * t;
      const y = ty * t;
      if (layout.terrain[ty * layout.cols + tx - 1] === TERRAIN.ASPHALT) ctx.fillRect(x, y, 3, t);
      if (layout.terrain[ty * layout.cols + tx + 1] === TERRAIN.ASPHALT) ctx.fillRect(x + t - 3, y, 3, t);
      if (layout.terrain[(ty - 1) * layout.cols + tx] === TERRAIN.ASPHALT) ctx.fillRect(x, y, t, 3);
      if (layout.terrain[(ty + 1) * layout.cols + tx] === TERRAIN.ASPHALT) ctx.fillRect(x, y + t - 3, t, 3);
    }
  }
}

export function drawGround(ctx, world, view) {
  const { layout } = world;
  const t = layout.tile;
  drawWater(ctx, world, view);
  const tx0 = Math.max(0, Math.floor(view.x0 / t) - 1);
  const tx1 = Math.min(layout.cols - 1, Math.floor(view.x1 / t) + 1);
  const ty0 = Math.max(0, Math.floor(view.y0 / t) - 1);
  const ty1 = Math.min(layout.rows - 1, Math.floor(view.y1 / t) + 1);
  for (let ty = ty0; ty <= ty1; ty += 1) {
    for (let tx = tx0; tx <= tx1; tx += 1) {
      const index = ty * layout.cols + tx;
      const terrain = layout.terrain[index];
      if (terrain === TERRAIN.WATER) continue;
      drawTile(ctx, world, tx, ty, terrain, layout.district[index], tx * t, ty * t);
    }
  }
  drawKerbs(ctx, world, view);
  drawParkingStalls(ctx, world, view);
  drawLaneMarkings(ctx, world, view);
  drawIntersections(ctx, world, view);
}