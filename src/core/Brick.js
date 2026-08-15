// src/core/Brick.js
import { DIRECTIONS, COLOR_KEYS } from './Constants.js';

let nextBrickId = 1;

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
    this.id = id !== null ? String(id) : `b_${nextBrickId++}`;
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

  static resetIdCounter() {
    nextBrickId = 1;
  }

  static createRandom(direction = DIRECTIONS.NONE) {
    const randomColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    return new Brick(randomColor, direction);
  }
}
