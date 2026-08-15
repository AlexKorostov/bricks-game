// src/core/Physics.js
import { GRID_SIZE, WALL_SIDES, WALL_LAUNCH_DIRECTIONS, OPPOSITE_WALL_MAP, DIRECTIONS } from './Constants.js';

export class Physics {
  /**
   * Calculates launch feasibility and landing position for player clicks.
   * Player CANNOT launch into an empty lane (must have an obstacle).
   * @param {Grid} grid
   * @param {string} side - WALL_SIDES (TOP, BOTTOM, LEFT, RIGHT)
   * @param {number} lane - 0..GRID_SIZE-1
   * @returns {{
   *   canLaunch: boolean,
   *   direction: object,
   *   entryCell: {x: number, y: number},
   *   landingCell: {x: number, y: number} | null,
   *   obstaclePos: {x: number, y: number} | null,
   *   obstacleBrick: Brick | null,
   *   pathCells: Array<{x: number, y: number}>
   * }}
   */
  static evaluateLaunch(grid, side, lane) {
    const direction = WALL_LAUNCH_DIRECTIONS[side];
    if (!direction) {
      throw new Error(`Invalid wall side: ${side}`);
    }

    let startX, startY;
    switch (side) {
      case WALL_SIDES.LEFT:
        startX = 0;
        startY = lane;
        break;
      case WALL_SIDES.RIGHT:
        startX = grid.size - 1;
        startY = lane;
        break;
      case WALL_SIDES.TOP:
        startX = lane;
        startY = 0;
        break;
      case WALL_SIDES.BOTTOM:
        startX = lane;
        startY = grid.size - 1;
        break;
      default:
        throw new Error(`Unknown wall side: ${side}`);
    }

    const { dx, dy } = direction;
    const pathCells = [];
    let curX = startX;
    let curY = startY;
    let obstaclePos = null;
    let obstacleBrick = null;
    let landingCell = null;
    let hitObstacle = false;

    // Scan along the lane in the 10x10 field
    while (grid.isInside(curX, curY)) {
      pathCells.push({ x: curX, y: curY });
      const brickAtCell = grid.getCell(curX, curY);

      if (brickAtCell !== null) {
        obstaclePos = { x: curX, y: curY };
        obstacleBrick = brickAtCell;
        hitObstacle = true;

        if (curX === startX && curY === startY) {
          // Entry mouth cell is blocked by existing brick in field
          landingCell = null;
        } else {
          landingCell = { x: curX - dx, y: curY - dy };
        }
        break;
      }

      curX += dx;
      curY += dy;
    }

    // Player can ONLY launch if an obstacle was hit and entry is not blocked
    const canLaunch = hitObstacle && landingCell !== null;

    return {
      canLaunch,
      direction,
      entryCell: { x: startX, y: startY },
      landingCell,
      obstaclePos,
      obstacleBrick,
      pathCells,
    };
  }

  /**
   * Simulates simultaneous movement for all bricks on the field that have momentum.
   * Runs in tick steps until no brick can move further.
   * Bricks that slide off the edge into a wall push into that wall as Layer 0.
   * @param {Grid} grid
   * @returns {{
   *   hasMoved: boolean,
   *   movements: Array<object>
   * }}
   */
  static simulateSimultaneousSlides(grid) {
    const size = grid.size;

    const activeBricks = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const brick = grid.getCell(x, y);
        if (brick && brick.hasDirection()) {
          activeBricks.push({
            brick,
            startX: x,
            startY: y,
            curX: x,
            curY: y,
            path: [{ x, y }],
            isStopped: false,
            exitedToWall: null,
          });
        }
      }
    }

    if (activeBricks.length === 0) {
      return { hasMoved: false, movements: [] };
    }

    let anyMovedInSimulation = false;
    let movingThisRound = true;

    while (movingThisRound) {
      movingThisRound = false;

      const intendedMoves = [];

      for (const item of activeBricks) {
        if (item.isStopped) continue;

        const nextX = item.curX + item.brick.direction.dx;
        const nextY = item.curY + item.brick.direction.dy;

        intendedMoves.push({
          item,
          nextX,
          nextY,
          isOutOfBounds: !grid.isInside(nextX, nextY),
        });
      }

      // Sort in order of travel
      intendedMoves.sort((a, b) => {
        const dirA = a.item.brick.direction;
        if (dirA.dx > 0) return b.item.curX - a.item.curX; // East: rightmost first
        if (dirA.dx < 0) return a.item.curX - b.item.curX; // West: leftmost first
        if (dirA.dy > 0) return b.item.curY - a.item.curY; // South: bottom-most first
        if (dirA.dy < 0) return a.item.curY - b.item.curY; // North: top-most first
        return 0;
      });

      for (const move of intendedMoves) {
        const { item, nextX, nextY, isOutOfBounds } = move;

        if (isOutOfBounds) {
          // Brick exits field into opposite wall!
          let targetWall, targetLane;
          if (item.brick.direction.dx > 0) {
            targetWall = WALL_SIDES.RIGHT;
            targetLane = item.curY;
          } else if (item.brick.direction.dx < 0) {
            targetWall = WALL_SIDES.LEFT;
            targetLane = item.curY;
          } else if (item.brick.direction.dy > 0) {
            targetWall = WALL_SIDES.BOTTOM;
            targetLane = item.curX;
          } else {
            targetWall = WALL_SIDES.TOP;
            targetLane = item.curX;
          }

          grid.removeCell(item.curX, item.curY);
          const wallPush = grid.pushInnermostWall(targetWall, targetLane, item.brick);

          item.isStopped = true;
          item.exitedToWall = { side: targetWall, lane: targetLane, wallPush };
          movingThisRound = true;
          anyMovedInSimulation = true;
          continue;
        }

        // Inside grid: check obstacle
        const cellOccupant = grid.getCell(nextX, nextY);
        if (cellOccupant === null) {
          grid.removeCell(item.curX, item.curY);
          grid.setCell(nextX, nextY, item.brick);

          item.curX = nextX;
          item.curY = nextY;
          item.path.push({ x: nextX, y: nextY });

          movingThisRound = true;
          anyMovedInSimulation = true;
        } else {
          item.isStopped = true;
        }
      }
    }

    const movements = activeBricks
      .filter((item) => item.curX !== item.startX || item.curY !== item.startY || item.exitedToWall !== null)
      .map((item) => ({
        brick: item.brick,
        from: { x: item.startX, y: item.startY },
        to: item.exitedToWall ? null : { x: item.curX, y: item.curY },
        path: item.path,
        exitedToWall: item.exitedToWall,
      }));

    return {
      hasMoved: anyMovedInSimulation,
      movements,
    };
  }
}
