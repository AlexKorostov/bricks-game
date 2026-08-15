// src/core/Brick.js
import { DIRECTIONS, COLOR_KEYS } from './Constants.js';

export function generateUniqueBrickId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class Brick {
  /**
   * @param {string} color - Key from COLOR_KEYS ('crimson', 'cobalt', 'emerald', 'amber')
   * @param {object} [direction=DIRECTIONS.NONE] - Direction object { name, dx, dy, ... }
   * @param {string|number} [id=null] - Unique brick ID
   */
  constructor(color, direction = DIRECTIONS.NONE, id = null) {
    if (!COLOR_KEYS.includes(color)) {
      throw new Error(`Invalid brick color: ${color}`);
    }
    this.id = (id !== null && id !== undefined && id !== '') ? String(id) : generateUniqueBrickId();
    this.color = color;
    this.direction = direction || DIRECTIONS.NONE;
  }

  setDirection(direction) {
    this.direction = direction || DIRECTIONS.NONE;
  }

  hasDirection() {
    return this.direction && this.direction.name !== 'NONE';
  }

  clone() {
    const copy = new Brick(this.color, this.direction, this.id);
    return copy;
  }

  toJSON() {
    return {
      id: this.id,
      color: this.color,
      direction: this.direction ? this.direction.name : 'NONE',
    };
  }

  static fromJSON(data) {
    if (!data || !data.color) return null;
    const dir = (data.direction && DIRECTIONS[data.direction]) ? DIRECTIONS[data.direction] : DIRECTIONS.NONE;
    return new Brick(data.color, dir, data.id || null);
  }

  static resetIdCounter() {
    // No-op retained for backwards-compatible test fixtures with UUID generation
  }

  static createRandom(direction = DIRECTIONS.NONE) {
    const randomColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    return new Brick(randomColor, direction);
  }
}

