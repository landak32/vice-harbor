// The five neighbourhoods of Vice Harbor, and the rule that says which one a point belongs to.
// The rule is a handful of rectangles over the tile grid: downtown in the north-east, the
// docks on the south-west water, the beach on the east shore, the park in the middle, and
// low houses filling everything else.

import { DISTRICTS, DISTRICT_STYLE } from '../config.js';

/** The district a tile belongs to. */
export function districtForTile(tx, ty) {
  if (tx >= 78) return DISTRICTS.BEACH;
  if (ty >= 44 && tx <= 30) return DISTRICTS.DOCKS;
  if (tx <= 20 && ty >= 28) return DISTRICTS.DOCKS;
  if (ty <= 28 && tx >= 30) return DISTRICTS.DOWNTOWN;
  if (tx >= 28 && tx <= 54 && ty >= 28 && ty <= 54) return DISTRICTS.PARK;
  return DISTRICTS.RESIDENTIAL;
}

/** The palette and display name of a district. */
export function styleOf(districtId) {
  return DISTRICT_STYLE[districtId] ?? DISTRICT_STYLE[DISTRICTS.RESIDENTIAL];
}

/** How many floors a block's buildings pretend to have, by district: it sets the wall depth. */
export function depthForDistrict(districtId) {
  switch (districtId) {
    case DISTRICTS.DOWNTOWN:
      return 18;
    case DISTRICTS.DOCKS:
      return 10;
    case DISTRICTS.BEACH:
      return 7;
    case DISTRICTS.PARK:
      return 8;
    default:
      return 9;
  }
}

/** A short list of shop and tower names, so the roofs read as a real city from above. */
export const ROOF_NAMES = {
  [DISTRICTS.DOWNTOWN]: ['KESSLER', 'MERIDIAN', 'VICE TOWER', 'HARBOR ONE', 'ATLAS', 'BLUE HERON'],
  [DISTRICTS.DOCKS]: ['ANCHOR CO', 'QUAY 9', 'TIDEWATER', 'CRANE & SONS', 'PELICAN FREIGHT'],
  [DISTRICTS.BEACH]: ['CORAL MOTEL', 'SUNLINE', 'PALMS', 'SURF SHACK', 'MARIGOLD', 'TIKI'],
  [DISTRICTS.PARK]: ['PALMETTO', 'GAZEBO', 'BOATHOUSE'],
  [DISTRICTS.RESIDENTIAL]: ['SANDLOT', 'MERCER', 'DOLPHIN', 'TERRACE', 'LOMBARD'],
};
