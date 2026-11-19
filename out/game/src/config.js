// Vice Harbor — every tuning number and palette in one place.
//
// The game is drawn at a fixed logical resolution (1280x720) and scaled to the window,
// so no rule below depends on the screen size. World units are pixels at zoom 1:
// one road tile is 48 px, a block is eight tiles square, and the city is 88 x 64 tiles.

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step: 60 updates a second, whatever the display's rate. */
export const STEP = 1 / 60;

export const TILE = 48;
export const WORLD = { cols: 88, rows: 64 };
export const WORLD_W = WORLD.cols * TILE;
export const WORLD_H = WORLD.rows * TILE;

/** Tile columns and rows where a road starts; each road is ROAD_SPAN tiles wide. */
export const ROAD_COLS = [4, 16, 28, 40, 52, 64, 76];
export const ROAD_ROWS = [4, 16, 28, 40, 52];
export const ROAD_SPAN = 2;
/** Distance from a road's centreline to the centre of one of its two lanes. */
export const LANE_OFFSET = 24;
/** Half the width of a road, in pixels: where an intersection's mouth sits. */
export const ROAD_HALF = 48;

export const TERRAIN = {
  ASPHALT: 0,
  SIDEWALK: 1,
  LOT: 2,
  GRASS: 3,
  SAND: 4,
  WATER: 5,
  PIER: 6,
  PARKING: 7,
};

export const DISTRICTS = {
  DOWNTOWN: 0,
  DOCKS: 1,
  BEACH: 2,
  PARK: 3,
  RESIDENTIAL: 4,
};

/** One entry per district: its name and the ground colours it is painted with. */
export const DISTRICT_STYLE = [
  {
    id: 0,
    name: 'Kessler Mile',
    short: 'DOWNTOWN',
    asphalt: '#31353d',
    sidewalk: '#9b9d9c',
    lot: '#6f7278',
    curb: '#7d807f',
    accent: '#4fd1c5',
    roof: ['#3d4a5c', '#46586b', '#37414f', '#516074'],
    wall: ['#2a323d', '#333c49'],
    trim: '#7fd6cc',
    windows: '#8fe3da',
  },
  {
    id: 1,
    name: 'Anchor Docks',
    short: 'DOCKS',
    asphalt: '#33343a',
    sidewalk: '#8c8880',
    lot: '#5c5a55',
    curb: '#77736b',
    accent: '#e08b4a',
    roof: ['#7a4a35', '#8a5a3e', '#5e4436', '#6d5341'],
    wall: ['#4a382e', '#554135'],
    trim: '#d98a4e',
    windows: '#f0b46a',
  },
  {
    id: 2,
    name: 'Coral Strand',
    short: 'BEACH',
    asphalt: '#3a3a40',
    sidewalk: '#e3d3b4',
    lot: '#d9c9a6',
    curb: '#c9b894',
    accent: '#ff7f8a',
    roof: ['#e8b9a8', '#f2d6b8', '#a8d8c8', '#f0c8b0'],
    wall: ['#c99a86', '#d6ad96'],
    trim: '#ff9aa2',
    windows: '#ffe0a8',
  },
  {
    id: 3,
    name: 'Palmetto Park',
    short: 'PARK',
    asphalt: '#35393f',
    sidewalk: '#c8c2ae',
    lot: '#4c7a43',
    curb: '#9aa88a',
    accent: '#8fd66a',
    roof: ['#3f6b4a', '#4a7a52'],
    wall: ['#33543c', '#3b5f44'],
    trim: '#a8e07a',
    windows: '#d8f0a8',
  },
  {
    id: 4,
    name: 'Sunset Terraces',
    short: 'RESIDENTIAL',
    asphalt: '#35363c',
    sidewalk: '#a8a49a',
    lot: '#7d8a6a',
    curb: '#8f8b80',
    accent: '#f2a65a',
    roof: ['#a45a44', '#b06a4c', '#8c6a52', '#9c7a58'],
    wall: ['#7a5a48', '#856351'],
    trim: '#e8b07a',
    windows: '#ffd08a',
  },
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const PLAYER = {
  radius: 11,
  walkSpeed: 128,
  runSpeed: 214,
  sprintSpeed: 296,
  accel: 1500,
  friction: 1900,
  maxHealth: 100,
  maxArmour: 100,
  respawnInvuln: 2.2,
};

/**
 * The garage. Each type differs in length, mass, top speed, grip and how hard it steers;
 * grip is how fast sideways speed bleeds off, so a low value drifts.
 */
export const VEHICLE_TYPES = {
  sports: {
    id: 'sports',
    name: 'Riptide GT',
    length: 46,
    width: 22,
    maxSpeed: 545,
    accel: 430,
    brake: 980,
    reverse: 190,
    grip: 4.6,
    steer: 2.75,
    mass: 1.0,
    health: 100,
    colors: ['#e8483f', '#2f7fd6', '#f2c14e', '#e8e8e8', '#7a4fd0'],
  },
  sedan: {
    id: 'sedan',
    name: 'Meridian',
    length: 49,
    width: 24,
    maxSpeed: 400,
    accel: 300,
    brake: 780,
    reverse: 160,
    grip: 7.2,
    steer: 2.2,
    mass: 1.25,
    health: 115,
    colors: ['#c9ccd2', '#3d6b8f', '#7d2f2f', '#2f2f33', '#6b8f5a'],
  },
  van: {
    id: 'van',
    name: 'Boxer Van',
    length: 58,
    width: 26,
    maxSpeed: 330,
    accel: 240,
    brake: 620,
    reverse: 140,
    grip: 6.6,
    steer: 1.85,
    mass: 1.8,
    health: 145,
    colors: ['#e6e2d8', '#8a8f96', '#c2703f', '#4a5b6b'],
  },
  taxi: {
    id: 'taxi',
    name: 'Sunline Cab',
    length: 49,
    width: 24,
    maxSpeed: 425,
    accel: 320,
    brake: 760,
    reverse: 160,
    grip: 7.0,
    steer: 2.25,
    mass: 1.25,
    health: 110,
    colors: ['#f2c14e'],
  },
  police: {
    id: 'police',
    name: 'Harbor Patrol Cruiser',
    length: 51,
    width: 24,
    maxSpeed: 505,
    accel: 400,
    brake: 880,
    reverse: 170,
    grip: 7.8,
    steer: 2.5,
    mass: 1.5,
    health: 160,
    colors: ['#f0f0ee'],
  },
  truck: {
    id: 'truck',
    name: 'Ironhorse Hauler',
    length: 78,
    width: 30,
    maxSpeed: 290,
    accel: 200,
    brake: 540,
    reverse: 120,
    grip: 5.4,
    steer: 1.5,
    mass: 3.0,
    health: 230,
    colors: ['#b8452f', '#3f5f7a', '#c9a13f', '#e0e0dc'],
  },
};

export const WEAPONS = {
  fists: { id: 'fists', name: 'Fists', rate: 0.36, damage: 14, range: 36, melee: true, spread: 0 },
  pistol: {
    id: 'pistol',
    name: 'Service Pistol',
    rate: 0.27,
    damage: 27,
    speed: 1350,
    spread: 0.028,
    life: 0.8,
    melee: false,
    muzzle: 0.055,
  },
  smg: {
    id: 'smg',
    name: 'Compact SMG',
    rate: 0.085,
    damage: 15,
    speed: 1500,
    spread: 0.095,
    life: 0.7,
    melee: false,
    muzzle: 0.04,
  },
};

/** What each crime adds to the heat meter, and where the stars start. */
export const CRIME = {
  carjack: 18,
  gunshot: 9,
  pedHit: 26,
  pedKill: 55,
  copHit: 40,
  copKill: 110,
  explosion: 60,
};
export const WANTED_STEPS = [0, 20, 58, 108, 168, 240];
export const WANTED_DECAY = 11;

export const HUD = {
  minimap: { x: 24, y: 720 - 24 - 176, size: 176 },
  barWidth: 152,
};

export const SAVE_KEY = 'vice-harbor.save.v1';
