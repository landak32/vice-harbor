// Buildings, one block at a time. Each district gets a different silhouette: towers with
// parapets, water tanks and rooftop plant on Kessler Mile; long corrugated warehouses at the
// docks; pastel shops with awnings on the beach; small houses with yards in the terraces; and
// only a pavilion and a boathouse in the park.
//
// A building is a footprint plus the depth of wall the renderer draws below it, which is what
// gives the flat map its slight sense of height.

import { DISTRICT_STYLE, DISTRICTS, TILE, TERRAIN } from '../config.js';
import { depthForDistrict, ROOF_NAMES } from './districts.js';
import { TILE_INDEX } from './layout.js';

function footprintIsDry(layout, x, y, w, h) {
  const tx0 = Math.floor(x / TILE);
  const ty0 = Math.floor(y / TILE);
  const tx1 = Math.floor((x + w - 1) / TILE);
  const ty1 = Math.floor((y + h - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty += 1) {
    for (let tx = tx0; tx <= tx1; tx += 1) {
      if (tx < 0 || ty < 0 || tx >= layout.cols || ty >= layout.rows) return false;
      const t = layout.terrain[TILE_INDEX(tx, ty)];
      if (t === TERRAIN.WATER || t === TERRAIN.SAND) return false;
    }
  }
  return true;
}

function decorate(building, rng, style, tall) {
  const acCount = tall ? rng.int(3, 6) : rng.int(1, 3);
  building.acs = [];
  for (let index = 0; index < acCount; index += 1) {
    building.acs.push({
      x: building.x + rng.range(16, Math.max(20, building.w - 34)),
      y: building.y + rng.range(14, Math.max(18, building.h - 30)),
      r: rng.range(6, 10),
      rot: rng.range(0, Math.PI),
    });
  }
  building.vents = [];
  for (let index = 0; index < rng.int(1, 3); index += 1) {
    building.vents.push({
      x: building.x + rng.range(14, Math.max(18, building.w - 26)),
      y: building.y + rng.range(12, Math.max(16, building.h - 24)),
      w: rng.range(10, 22),
      h: rng.range(6, 12),
    });
  }
  building.tanks = [];
  if (tall && rng.chance(0.55)) {
    building.tanks.push({
      x: building.x + rng.range(24, Math.max(28, building.w - 30)),
      y: building.y + rng.range(20, Math.max(24, building.h - 30)),
      r: rng.range(11, 17),
    });
  }
  building.awning = null;
  if (!tall && (style.id === DISTRICTS.BEACH || style.id === DISTRICTS.RESIDENTIAL) && rng.chance(0.6)) {
    building.awning = { side: 's', color: rng.pick(['#e8574f', '#3fa9a0', '#e8a13f', '#e8e2d0']) };
  }
  building.lit = rng.range(0.25, 1);
  building.glass = tall && rng.chance(0.7);
  building.helipad = false;
  building.windowRows = tall ? rng.int(3, 6) : rng.int(1, 2);
  return building;
}

function makeBuilding(x, y, w, h, districtId, rng, name) {
  const style = DISTRICT_STYLE[districtId];
  const tall = districtId === DISTRICTS.DOWNTOWN;
  const building = {
    x,
    y,
    w,
    h,
    depth: depthForDistrict(districtId) + rng.range(-2, 3) + (tall ? rng.range(0, 10) : 0),
    roof: rng.pick(style.roof),
    wall: rng.pick(style.wall),
    trim: style.trim,
    district: districtId,
    name: name ?? (rng.chance(0.55) ? rng.pick(ROOF_NAMES[districtId]) : null),
  };
  return decorate(building, rng, style, tall);
}

/** Every building that stands on one block. */
export function buildBlockBuildings(block, rng, layout) {
  const out = [];
  const style = DISTRICT_STYLE[block.district];
  const { x, y, w, h } = block;
  const districtId = block.district;

  if (block.parking) return out;

  if (districtId === DISTRICTS.PARK) {
    const pav = { x: x + w * 0.16, y: y + h * 0.2, w: w * 0.3, h: h * 0.26 };
    if (footprintIsDry(layout, pav.x, pav.y, pav.w, pav.h)) {
      out.push(makeBuilding(pav.x, pav.y, pav.w, pav.h, districtId, rng, 'PALMETTO'));
    }
    const boat = { x: x + w * 0.62, y: y + h * 0.62, w: w * 0.26, h: h * 0.24 };
    if (footprintIsDry(layout, boat.x, boat.y, boat.w, boat.h)) {
      out.push(makeBuilding(boat.x, boat.y, boat.w, boat.h, districtId, rng, 'BOATHOUSE'));
    }
    return out;
  }

  if (districtId === DISTRICTS.DOCKS) {
    const ware = { x: x + 8, y: y + 8, w: w - 16, h: h * 0.56 };
    if (footprintIsDry(layout, ware.x, ware.y, ware.w, ware.h)) {
      out.push(makeBuilding(ware.x, ware.y, ware.w, ware.h, districtId, rng, rng.pick(ROOF_NAMES[districtId])));
    }
    const office = { x: x + w * 0.58, y: y + h * 0.68, w: w * 0.34, h: h * 0.24 };
    if (footprintIsDry(layout, office.x, office.y, office.w, office.h)) {
      out.push(makeBuilding(office.x, office.y, office.w, office.h, districtId, rng, null));
    }
    return out;
  }

  if (districtId === DISTRICTS.DOWNTOWN) {
    const split = rng.next();
    const lots = [];
    if (split < 0.4) {
      lots.push({ x: x + 6, y: y + 6, w: w - 12, h: h - 12 });
    } else if (split < 0.72) {
      const gap = rng.range(10, 18);
      lots.push({ x: x + 6, y: y + 6, w: w * 0.52 - gap * 0.5, h: h - 12 });
      lots.push({ x: x + w * 0.52 + gap * 0.5, y: y + 6, w: w * 0.48 - gap * 0.5 - 6, h: h - 12 });
    } else {
      const gap = rng.range(10, 18);
      lots.push({ x: x + 6, y: y + 6, w: w - 12, h: h * 0.54 - gap * 0.5 });
      lots.push({ x: x + 6, y: y + h * 0.54 + gap * 0.5, w: w - 12, h: h * 0.46 - gap * 0.5 - 6 });
    }
    for (const lot of lots) {
      if (lot.w < 70 || lot.h < 70) continue;
      if (!footprintIsDry(layout, lot.x, lot.y, lot.w, lot.h)) continue;
      out.push(makeBuilding(lot.x, lot.y, lot.w, lot.h, districtId, rng, rng.chance(0.8) ? rng.pick(ROOF_NAMES[districtId]) : null));
    }
    if (out.length > 0 && out[0].w * out[0].h > 60000) out[0].helipad = true;
    return out;
  }

  if (districtId === DISTRICTS.BEACH) {
    const count = rng.int(2, 3);
    const shopW = (w - 20) / count;
    for (let index = 0; index < count; index += 1) {
      const bw = shopW - 8;
      const bh = h * rng.range(0.34, 0.48);
      const bx = x + 10 + index * shopW;
      const by = y + (index % 2 === 0 ? 12 : h - bh - 14);
      if (!footprintIsDry(layout, bx, by, bw, bh)) continue;
      out.push(makeBuilding(bx, by, bw, bh, districtId, rng, rng.chance(0.7) ? rng.pick(ROOF_NAMES[districtId]) : null));
    }
    return out;
  }

  // Residential: four small houses around a shared yard, each with a little random jitter.
  const cellW = w / 2;
  const cellH = h / 2;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      if (rng.chance(0.12)) continue;
      const bw = cellW * rng.range(0.62, 0.78);
      const bh = cellH * rng.range(0.56, 0.72);
      const bx = x + col * cellW + rng.range(10, cellW - bw - 10);
      const by = y + row * cellH + rng.range(10, cellH - bh - 10);
      if (!footprintIsDry(layout, bx, by, bw, bh)) continue;
      out.push(makeBuilding(bx, by, bw, bh, districtId, rng, rng.chance(0.35) ? rng.pick(ROOF_NAMES[districtId]) : null));
    }
  }
  return out;
}

/** The whole city's buildings, block by block. */
export function buildCityBuildings(layout, rng) {
  const buildings = [];
  for (const block of layout.blocks) {
    buildings.push(...buildBlockBuildings(block, rng, layout));
  }
  return buildings;
}
