// src/core/Constants.js

export const GRID_SIZE = 10;
export const WALL_DEPTH = 3;

export const COLOR_KEYS = ['crimson', 'cobalt', 'emerald', 'amber'];

export const COLOR_CONFIG = {
  crimson: {
    id: 'crimson',
    name: 'Vivid Fire Red',
    hex: '#e60026',
    threeColor: 0xe60026,
    emissive: 0x5a0010,
    accentHex: '#ff667e',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Royal Cobalt Blue',
    hex: '#2962ff',
    threeColor: 0x2962ff,
    emissive: 0x0d2873,
    accentHex: '#80a3ff',
  },
  emerald: {
    id: 'emerald',
    name: 'Radiant Emerald Green',
    hex: '#00c853',
    threeColor: 0x00c853,
    emissive: 0x00471d,
    accentHex: '#69f0ae',
  },
  amber: {
    id: 'amber',
    name: 'Bright Canary Yellow',
    hex: '#ffd600',
    threeColor: 0xffd600,
    emissive: 0x5e4f00,
    accentHex: '#ffe57f',
  },
};

export const WALL_SIDES = {
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
};

export const OPPOSITE_WALL_MAP = {
  [WALL_SIDES.LEFT]: WALL_SIDES.RIGHT,
  [WALL_SIDES.RIGHT]: WALL_SIDES.LEFT,
  [WALL_SIDES.TOP]: WALL_SIDES.BOTTOM,
  [WALL_SIDES.BOTTOM]: WALL_SIDES.TOP,
};

export const DIRECTIONS = {
  NORTH: { name: 'NORTH', dx: 0, dy: -1, symbol: '▲', angle: Math.PI },
  SOUTH: { name: 'SOUTH', dx: 0, dy: 1, symbol: '▼', angle: 0 },
  EAST: { name: 'EAST', dx: 1, dy: 0, symbol: '►', angle: -Math.PI / 2 },
  WEST: { name: 'WEST', dx: -1, dy: 0, symbol: '◄', angle: Math.PI / 2 },
  NONE: { name: 'NONE', dx: 0, dy: 0, symbol: '●', angle: 0 },
};

// Launch direction per wall side
export const WALL_LAUNCH_DIRECTIONS = {
  [WALL_SIDES.LEFT]: DIRECTIONS.EAST,    // Shoots right (+x)
  [WALL_SIDES.RIGHT]: DIRECTIONS.WEST,   // Shoots left (-x)
  [WALL_SIDES.TOP]: DIRECTIONS.SOUTH,    // Shoots down (+y)
  [WALL_SIDES.BOTTOM]: DIRECTIONS.NORTH, // Shoots up (-y)
};

export const GAME_STATES = {
  READY: 'READY',
  ANIMATING: 'ANIMATING',
  WAVE_CLEAR: 'WAVE_CLEAR',
  GAME_OVER: 'GAME_OVER',
};

export const SCORE_VALUES = {
  BASE_PER_BRICK: 100,
  LINE_4_MULTIPLIER: 1.5,
  LINE_5_MULTIPLIER: 2.0,
  WAVE_CLEAR_BONUS: 2500,
};
