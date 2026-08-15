// src/core/Grid.js
import { GRID_SIZE, WALL_DEPTH, WALL_SIDES, DIRECTIONS } from './Constants.js';
import { Brick, generateUniqueBrickId } from './Brick.js';

export class Grid {
  constructor(size = GRID_SIZE, wallDepth = WALL_DEPTH) {
    this.size = size;
    this.wallDepth = wallDepth;

    // 10x10 field: field[y][x]
    this.field = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => null)
    );

    // Walls: each side has `size` lanes, each lane has `wallDepth` layers.
    // Layer 0 is innermost (active/clickable), Layer wallDepth - 1 is outermost.
    this.walls = {
      [WALL_SIDES.TOP]: Array.from({ length: this.size }, () =>
        Array.from({ length: this.wallDepth }, () => null)
      ),
      [WALL_SIDES.BOTTOM]: Array.from({ length: this.size }, () =>
        Array.from({ length: this.wallDepth }, () => null)
      ),
      [WALL_SIDES.LEFT]: Array.from({ length: this.size }, () =>
        Array.from({ length: this.wallDepth }, () => null)
      ),
      [WALL_SIDES.RIGHT]: Array.from({ length: this.size }, () =>
        Array.from({ length: this.wallDepth }, () => null)
      ),
    };
  }

  isInside(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getCell(x, y) {
    if (!this.isInside(x, y)) return null;
    return this.field[y][x];
  }

  setCell(x, y, brick) {
    if (!this.isInside(x, y)) {
      throw new Error(`Coordinates out of bounds: (${x}, ${y})`);
    }
    this.field[y][x] = brick;
  }

  removeCell(x, y) {
    if (!this.isInside(x, y)) return null;
    const brick = this.field[y][x];
    this.field[y][x] = null;
    return brick;
  }

  getWallBrick(side, lane, layer) {
    if (!this.walls[side] || lane < 0 || lane >= this.size || layer < 0 || layer >= this.wallDepth) {
      return null;
    }
    return this.walls[side][lane][layer];
  }

  setWallBrick(side, lane, layer, brick) {
    if (!this.walls[side] || lane < 0 || lane >= this.size || layer < 0 || layer >= this.wallDepth) {
      throw new Error(`Wall coordinates out of bounds: ${side} lane=${lane} layer=${layer}`);
    }
    this.walls[side][lane][layer] = brick;
  }

  /**
   * Pops the innermost brick (layer 0) for a given wall and lane.
   * Shifts layer 1 -> 0, layer 2 -> 1, and inserts newOuterBrick at layer 2.
   * @param {string} side - WALL_SIDES
   * @param {number} lane - 0..size-1
   * @param {Brick} [newOuterBrick=null] - replacement outer brick (auto-generates random if null)
   * @returns {{ poppedBrick: Brick, shiftedQueue: Brick[], newOuterBrick: Brick }}
   */
  popAndShiftWall(side, lane, newOuterBrick = null) {
    const laneQueue = this.walls[side][lane];
    const poppedBrick = laneQueue[0];
    if (!poppedBrick) {
      return null;
    }

    const replacement = newOuterBrick || Brick.createRandom(DIRECTIONS.NONE);

    // Shift layers inward
    for (let layer = 0; layer < this.wallDepth - 1; layer++) {
      laneQueue[layer] = laneQueue[layer + 1];
    }
    laneQueue[this.wallDepth - 1] = replacement;

    return {
      poppedBrick,
      shiftedQueue: [...laneQueue],
      newOuterBrick: replacement,
    };
  }

  /**
   * Pushes a brick into layer 0 of a wall lane, pushing existing layers outward.
   * Old layer 0 -> layer 1, old layer 1 -> layer 2, old layer 2 is ejected.
   * @param {string} side - WALL_SIDES
   * @param {number} lane - 0..size-1
   * @param {Brick} incomingBrick - brick entering layer 0
   * @returns {{ insertedBrick: Brick, ejectedBrick: Brick, updatedQueue: Brick[] }}
   */
  pushInnermostWall(side, lane, incomingBrick) {
    const laneQueue = this.walls[side][lane];
    const ejectedBrick = laneQueue[this.wallDepth - 1];

    // Shift outward
    for (let layer = this.wallDepth - 1; layer > 0; layer--) {
      laneQueue[layer] = laneQueue[layer - 1];
    }

    incomingBrick.setDirection(DIRECTIONS.NONE);
    laneQueue[0] = incomingBrick;

    return {
      insertedBrick: incomingBrick,
      ejectedBrick,
      updatedQueue: [...laneQueue],
    };
  }

  /**
   * Counts number of occupied cells in central field.
   */
  countFieldBricks() {
    let count = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.field[y][x] !== null) count++;
      }
    }
    return count;
  }

  isFieldEmpty() {
    return this.countFieldBricks() === 0;
  }

  /**
   * Initializes walls with random bricks.
   */
  populateWalls() {
    Object.keys(this.walls).forEach((side) => {
      for (let lane = 0; lane < this.size; lane++) {
        for (let layer = 0; layer < this.wallDepth; layer++) {
          this.walls[side][lane][layer] = Brick.createRandom(DIRECTIONS.NONE);
        }
      }
    });
  }

  /**
   * Initializes center field with initial random bricks in the central area (e.g. 5-8 bricks).
   * @param {number} count - number of center bricks to spawn
   * @param {Array<{x:number, y:number, color:string}>} [preset=null] - optional preset coordinates
   */
  populateCenter(count = 6, preset = null) {
    // Clear field
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.field[y][x] = null;
      }
    }

    if (preset && Array.isArray(preset)) {
      preset.forEach(({ x, y, color }) => {
        if (this.isInside(x, y)) {
          this.field[y][x] = new Brick(color, DIRECTIONS.NONE);
        }
      });
      return;
    }

    // Default center cluster: spawn in 4x4 central core (x: 3..6, y: 3..6)
    const centerCoords = [];
    for (let y = 3; y <= 6; y++) {
      for (let x = 3; x <= 6; x++) {
        centerCoords.push({ x, y });
      }
    }

    // Shuffle coords
    for (let i = centerCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [centerCoords[i], centerCoords[j]] = [centerCoords[j], centerCoords[i]];
    }

    const toPlace = Math.min(count, centerCoords.length);
    for (let i = 0; i < toPlace; i++) {
      const { x, y } = centerCoords[i];
      this.field[y][x] = Brick.createRandom(DIRECTIONS.NONE);
    }
  }

  toFieldArray() {
    return this.field.map((row) =>
      row.map((cell) => (cell ? { color: cell.color, dir: cell.direction.name } : null))
    );
  }

  toJSON() {
    return {
      size: this.size,
      wallDepth: this.wallDepth,
      field: this.field.map((row) => row.map((cell) => (cell ? cell.toJSON() : null))),
      walls: {
        [WALL_SIDES.TOP]: this.walls[WALL_SIDES.TOP].map((lane) => lane.map((b) => (b ? b.toJSON() : null))),
        [WALL_SIDES.BOTTOM]: this.walls[WALL_SIDES.BOTTOM].map((lane) => lane.map((b) => (b ? b.toJSON() : null))),
        [WALL_SIDES.LEFT]: this.walls[WALL_SIDES.LEFT].map((lane) => lane.map((b) => (b ? b.toJSON() : null))),
        [WALL_SIDES.RIGHT]: this.walls[WALL_SIDES.RIGHT].map((lane) => lane.map((b) => (b ? b.toJSON() : null))),
      },
    };
  }

  static fromJSON(data) {
    if (!data) return null;
    const size = typeof data.size === 'number' ? data.size : GRID_SIZE;
    const wallDepth = typeof data.wallDepth === 'number' ? data.wallDepth : WALL_DEPTH;
    const grid = new Grid(size, wallDepth);
    const seenIds = new Set();

    const sanitizeBrick = (bData) => {
      if (!bData) return null;
      const brick = Brick.fromJSON(bData);
      if (!brick) return null;
      if (seenIds.has(brick.id)) {
        // Automatically re-assign guaranteed unique UUID if collision detected from legacy saves
        brick.id = generateUniqueBrickId();
      }
      seenIds.add(brick.id);
      return brick;
    };

    if (Array.isArray(data.field)) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const cellData = data.field[y] ? data.field[y][x] : null;
          grid.field[y][x] = sanitizeBrick(cellData);
        }
      }
    }

    if (data.walls) {
      Object.keys(grid.walls).forEach((side) => {
        if (Array.isArray(data.walls[side])) {
          for (let lane = 0; lane < size; lane++) {
            for (let layer = 0; layer < wallDepth; layer++) {
              const bData = data.walls[side][lane] ? data.walls[side][lane][layer] : null;
              grid.walls[side][lane][layer] = sanitizeBrick(bData);
            }
          }
        }
      });
    }

    return grid;
  }

  clone() {
    const cloned = new Grid(this.size, this.wallDepth);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.field[y][x]) {
          cloned.field[y][x] = this.field[y][x].clone();
        }
      }
    }
    Object.keys(this.walls).forEach((side) => {
      for (let lane = 0; lane < this.size; lane++) {
        for (let layer = 0; layer < this.wallDepth; layer++) {
          const b = this.walls[side][lane][layer];
          cloned.walls[side][lane][layer] = b ? b.clone() : null;
        }
      }
    });
    return cloned;
  }
}

