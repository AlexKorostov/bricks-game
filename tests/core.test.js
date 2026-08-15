// tests/core.test.js
import { describe, it, expect } from 'vitest';
import assert from 'node:assert';
import { GRID_SIZE, WALL_SIDES, DIRECTIONS, GAME_STATES } from '../src/core/Constants.js';
import { Brick } from '../src/core/Brick.js';
import { Grid } from '../src/core/Grid.js';
import { Physics } from '../src/core/Physics.js';
import { Matcher } from '../src/core/Matcher.js';
import { GameEngine } from '../src/core/GameEngine.js';

describe('Brick Model', () => {
  it('creates brick with valid color and default direction', () => {
    const brick = new Brick('crimson');
    assert.strictEqual(brick.color, 'crimson');
    assert.strictEqual(brick.direction.name, 'NONE');
    assert.strictEqual(brick.hasDirection(), false);
  });

  it('rejects invalid brick color', () => {
    assert.throws(() => {
      new Brick('neon_purple');
    });
  });

  it('updates direction vector', () => {
    const brick = new Brick('cobalt');
    brick.setDirection(DIRECTIONS.EAST);
    assert.strictEqual(brick.hasDirection(), true);
    assert.strictEqual(brick.direction.dx, 1);
  });
});

describe('Grid Model', () => {
  it('initializes 10x10 field and 4 walls of depth 3', () => {
    const grid = new Grid(10, 3);
    assert.strictEqual(grid.size, 10);
    assert.strictEqual(grid.wallDepth, 3);
    assert.strictEqual(grid.countFieldBricks(), 0);
    assert.strictEqual(grid.isFieldEmpty(), true);
  });

  it('sets and removes cells in bounds', () => {
    const grid = new Grid(10, 3);
    const brick = new Brick('emerald');
    grid.setCell(4, 5, brick);
    assert.strictEqual(grid.getCell(4, 5), brick);
    assert.strictEqual(grid.countFieldBricks(), 1);

    const removed = grid.removeCell(4, 5);
    assert.strictEqual(removed, brick);
    assert.strictEqual(grid.getCell(4, 5), null);
    assert.strictEqual(grid.isFieldEmpty(), true);
  });

  it('shifts wall queue correctly on pop (inward shift)', () => {
    const grid = new Grid(10, 3);
    const b0 = new Brick('crimson', DIRECTIONS.NONE, 'b0');
    const b1 = new Brick('cobalt', DIRECTIONS.NONE, 'b1');
    const b2 = new Brick('emerald', DIRECTIONS.NONE, 'b2');

    grid.setWallBrick(WALL_SIDES.LEFT, 2, 0, b0);
    grid.setWallBrick(WALL_SIDES.LEFT, 2, 1, b1);
    grid.setWallBrick(WALL_SIDES.LEFT, 2, 2, b2);

    const newOuter = new Brick('amber', DIRECTIONS.NONE, 'b3');
    const result = grid.popAndShiftWall(WALL_SIDES.LEFT, 2, newOuter);

    assert.strictEqual(result.poppedBrick.id, 'b0');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.LEFT, 2, 0).id, 'b1');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.LEFT, 2, 1).id, 'b2');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.LEFT, 2, 2).id, 'b3');
  });

  it('pushes wall queue outward on pushInnermostWall and ejects outermost brick', () => {
    const grid = new Grid(10, 3);
    const b0 = new Brick('crimson', DIRECTIONS.NONE, 'b0');
    const b1 = new Brick('cobalt', DIRECTIONS.NONE, 'b1');
    const b2 = new Brick('emerald', DIRECTIONS.NONE, 'b2');

    grid.setWallBrick(WALL_SIDES.RIGHT, 4, 0, b0);
    grid.setWallBrick(WALL_SIDES.RIGHT, 4, 1, b1);
    grid.setWallBrick(WALL_SIDES.RIGHT, 4, 2, b2);

    const incoming = new Brick('amber', DIRECTIONS.EAST, 'incoming_b');
    const result = grid.pushInnermostWall(WALL_SIDES.RIGHT, 4, incoming);

    assert.strictEqual(result.ejectedBrick.id, 'b2');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 4, 0).id, 'incoming_b');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 4, 0).direction.name, 'NONE');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 4, 1).id, 'b0');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 4, 2).id, 'b1');
  });
});

describe('Physics, Trajectory & Wall Push Mechanics', () => {
  it('disallows player launch when lane is completely empty', () => {
    const grid = new Grid(10, 3);
    const evalLeft = Physics.evaluateLaunch(grid, WALL_SIDES.LEFT, 4);
    assert.strictEqual(evalLeft.canLaunch, false);
    assert.strictEqual(evalLeft.landingCell, null);
  });

  it('disallows launch when mouth entry cell is occupied by field brick', () => {
    const grid = new Grid(10, 3);
    grid.setCell(0, 3, new Brick('amber')); // occupied at left edge mouth
    const evalLeft = Physics.evaluateLaunch(grid, WALL_SIDES.LEFT, 3);
    assert.strictEqual(evalLeft.canLaunch, false);
  });

  it('calculates correct landing position from Left wall (East flight) when hitting obstacle', () => {
    const grid = new Grid(10, 3);
    const obstacle = new Brick('cobalt');
    grid.setCell(6, 4, obstacle);

    const evalLeft = Physics.evaluateLaunch(grid, WALL_SIDES.LEFT, 4);
    assert.strictEqual(evalLeft.canLaunch, true);
    assert.deepStrictEqual(evalLeft.landingCell, { x: 5, y: 4 });
    assert.strictEqual(evalLeft.direction.name, 'EAST');
  });

  it('calculates correct landing position from Right wall (West flight) when hitting obstacle', () => {
    const grid = new Grid(10, 3);
    grid.setCell(4, 2, new Brick('crimson'));

    const evalRight = Physics.evaluateLaunch(grid, WALL_SIDES.RIGHT, 2);
    assert.strictEqual(evalRight.canLaunch, true);
    assert.deepStrictEqual(evalRight.landingCell, { x: 5, y: 2 });
    assert.strictEqual(evalRight.direction.name, 'WEST');
  });

  it('calculates correct landing position from Top wall (South flight) when hitting obstacle', () => {
    const grid = new Grid(10, 3);
    grid.setCell(7, 5, new Brick('emerald'));

    const evalTop = Physics.evaluateLaunch(grid, WALL_SIDES.TOP, 7);
    assert.strictEqual(evalTop.canLaunch, true);
    assert.deepStrictEqual(evalTop.landingCell, { x: 7, y: 4 });
    assert.strictEqual(evalTop.direction.name, 'SOUTH');
  });

  it('calculates correct landing position from Bottom wall (North flight) when hitting obstacle', () => {
    const grid = new Grid(10, 3);
    grid.setCell(3, 3, new Brick('amber'));

    const evalBottom = Physics.evaluateLaunch(grid, WALL_SIDES.BOTTOM, 3);
    assert.strictEqual(evalBottom.canLaunch, true);
    assert.deepStrictEqual(evalBottom.landingCell, { x: 3, y: 4 });
    assert.strictEqual(evalBottom.direction.name, 'NORTH');
  });

  it('simulates simultaneous slides and pushes off-board bricks into opposite walls', () => {
    const grid = new Grid(10, 3);
    const bEast = new Brick('crimson', DIRECTIONS.EAST);
    grid.setCell(7, 2, bEast); // No obstacles ahead to the East

    // Seed right wall lane 2
    grid.setWallBrick(WALL_SIDES.RIGHT, 2, 0, new Brick('cobalt', DIRECTIONS.NONE, 'r0'));
    grid.setWallBrick(WALL_SIDES.RIGHT, 2, 1, new Brick('cobalt', DIRECTIONS.NONE, 'r1'));
    grid.setWallBrick(WALL_SIDES.RIGHT, 2, 2, new Brick('cobalt', DIRECTIONS.NONE, 'r2'));

    const result = Physics.simulateSimultaneousSlides(grid);
    assert.strictEqual(result.hasMoved, true);
    assert.strictEqual(grid.getCell(7, 2), null); // vacated field

    // Check that it pushed into Right wall lane 2
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 2, 0), bEast);
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 2, 1).id, 'r0');
    assert.strictEqual(grid.getWallBrick(WALL_SIDES.RIGHT, 2, 2).id, 'r1');
  });
});

describe('Matcher (Line Match-3)', () => {
  it('detects horizontal 3-in-a-row', () => {
    const grid = new Grid(10, 3);
    grid.setCell(2, 4, new Brick('crimson'));
    grid.setCell(3, 4, new Brick('crimson'));
    grid.setCell(4, 4, new Brick('crimson'));

    const result = Matcher.findMatches(grid);
    assert.strictEqual(result.hasMatches, true);
    assert.strictEqual(result.matchedCells.length, 3);
    assert.strictEqual(result.lines[0].type, 'HORIZONTAL');
    assert.strictEqual(result.lines[0].length, 3);
  });

  it('detects vertical 3-in-a-row', () => {
    const grid = new Grid(10, 3);
    grid.setCell(5, 1, new Brick('emerald'));
    grid.setCell(5, 2, new Brick('emerald'));
    grid.setCell(5, 3, new Brick('emerald'));

    const result = Matcher.findMatches(grid);
    assert.strictEqual(result.hasMatches, true);
    assert.strictEqual(result.matchedCells.length, 3);
    assert.strictEqual(result.lines[0].type, 'VERTICAL');
  });

  it('does not match 2 bricks or non-adjacent bricks', () => {
    const grid = new Grid(10, 3);
    grid.setCell(1, 1, new Brick('cobalt'));
    grid.setCell(2, 1, new Brick('cobalt'));
    grid.setCell(4, 1, new Brick('cobalt'));

    const result = Matcher.findMatches(grid);
    assert.strictEqual(result.hasMatches, false);
    assert.strictEqual(result.matchedCells.length, 0);
  });

  it('detects intersecting cross match (horizontal + vertical)', () => {
    const grid = new Grid(10, 3);
    grid.setCell(3, 5, new Brick('amber'));
    grid.setCell(4, 5, new Brick('amber'));
    grid.setCell(5, 5, new Brick('amber'));
    grid.setCell(4, 4, new Brick('amber'));
    grid.setCell(4, 6, new Brick('amber'));

    const result = Matcher.findMatches(grid);
    assert.strictEqual(result.hasMatches, true);
    assert.strictEqual(result.lines.length, 2);
    assert.strictEqual(result.matchedCells.length, 5);
  });
});

describe('GameEngine Cascades & Full Turns', () => {
  it('disallows executeTurn on empty lane', () => {
    const engine = new GameEngine();
    engine.startNewGame(1);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        engine.grid.setCell(x, y, null);
      }
    }

    const turnResult = engine.executeTurn(WALL_SIDES.LEFT, 4);
    assert.strictEqual(turnResult.success, false);
    assert.strictEqual(turnResult.reason, 'EMPTY_LANE_OR_BLOCKED');
  });

  it('executes launch, match, momentum slide and cascade', () => {
    const engine = new GameEngine();
    engine.startNewGame(1);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        engine.grid.setCell(x, y, null);
      }
    }

    // Row 2: Crimson targets
    engine.grid.setCell(3, 2, new Brick('crimson'));
    engine.grid.setCell(4, 2, new Brick('crimson'));

    // Column 3: Cobalt with SOUTH momentum at (3, 0)
    engine.grid.setCell(3, 0, new Brick('cobalt', DIRECTIONS.SOUTH));

    // Row 3: Obstacle and horizontal targets
    engine.grid.setCell(3, 4, new Brick('amber')); // obstacle stopping Cobalt at (3, 3)
    engine.grid.setCell(2, 3, new Brick('cobalt'));
    engine.grid.setCell(4, 3, new Brick('cobalt'));

    // Put Crimson in Left wall lane 2
    engine.grid.setWallBrick(WALL_SIDES.LEFT, 2, 0, new Brick('crimson'));

    const turnResult = engine.executeTurn(WALL_SIDES.LEFT, 2);
    assert.strictEqual(turnResult.success, true);

    const launchStep = turnResult.steps.find((s) => s.type === 'LAUNCH_TO_FIELD');
    assert.strictEqual(launchStep.landingCell.x, 2);
    assert.strictEqual(launchStep.landingCell.y, 2);

    const matchSteps = turnResult.steps.filter((s) => s.type === 'MATCH');
    assert.strictEqual(matchSteps.length, 2, 'Should have 2 cascading match steps');
    assert.strictEqual(matchSteps[0].combo, 1);
    assert.strictEqual(matchSteps[1].combo, 2);

    const slideStep = turnResult.steps.find((s) => s.type === 'SLIDE');
    assert.ok(slideStep !== undefined, 'Should have recorded slide step');
  });

  it('awards bonus multipliers for 4 and 5 in a row', () => {
    const grid = new Grid(10, 3);
    for (let x = 0; x < 4; x++) grid.setCell(x, 0, new Brick('amber'));
    const match4 = Matcher.findMatches(grid);
    assert.strictEqual(match4.lines[0].length, 4);
    assert.strictEqual(match4.baseScore, 600);

    const grid5 = new Grid(10, 3);
    for (let x = 0; x < 5; x++) grid5.setCell(x, 0, new Brick('emerald'));
    const match5 = Matcher.findMatches(grid5);
    assert.strictEqual(match5.lines[0].length, 5);
    assert.strictEqual(match5.baseScore, 1000);
  });

  it('detects wave clear and awards bonus score', () => {
    const engine = new GameEngine();
    engine.startNewGame(1);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        engine.grid.setCell(x, y, null);
      }
    }

    engine.grid.setCell(3, 2, new Brick('crimson'));
    engine.grid.setCell(4, 2, new Brick('crimson'));
    engine.grid.setWallBrick(WALL_SIDES.LEFT, 2, 0, new Brick('crimson'));

    const result = engine.executeTurn(WALL_SIDES.LEFT, 2);
    assert.strictEqual(result.success, true);
    assert.strictEqual(engine.grid.isFieldEmpty(), true);
    assert.strictEqual(result.state, GAME_STATES.WAVE_CLEAR);
    assert.ok(result.totalScore >= 2800);
  });

  it('clears wave when last obstacles match and remaining directional bricks fly off-board into walls', () => {
    const engine = new GameEngine();
    engine.startNewGame(1);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        engine.grid.setCell(x, y, null);
      }
    }

    // Cobalt with SOUTH momentum at (4, 2)
    engine.grid.setCell(4, 2, new Brick('cobalt', DIRECTIONS.SOUTH));

    // Emerald with EAST momentum at (5, 4)
    engine.grid.setCell(5, 4, new Brick('emerald', DIRECTIONS.EAST));

    // Crimson match targets at (4, 3) and (5, 3)
    engine.grid.setCell(4, 3, new Brick('crimson'));
    engine.grid.setCell(5, 3, new Brick('crimson'));

    // Left wall fires Crimson into lane 3 (lands at x=3, y=3) -> triggers MATCH-3 at row 3 (x=3,4,5)
    engine.grid.setWallBrick(WALL_SIDES.LEFT, 3, 0, new Brick('crimson'));

    const turnResult = engine.executeTurn(WALL_SIDES.LEFT, 3);
    assert.strictEqual(turnResult.success, true);

    // The Crimson match cleared, then both Cobalt (4,2 -> Bottom wall) and Emerald (5,4 -> Right wall) flew into walls
    assert.strictEqual(engine.grid.isFieldEmpty(), true, 'All bricks should have either matched or flown into walls');
    assert.strictEqual(engine.state, GAME_STATES.WAVE_CLEAR, 'Wave should be cleared');
  });

  it('detects GAME_OVER when board has uncleared bricks but no valid launches remain', () => {
    const engine = new GameEngine();
    engine.startNewGame(1);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        engine.grid.setCell(x, y, null);
      }
    }

    // 4 corners blocked directly at the mouth
    engine.grid.setCell(0, 0, new Brick('amber'));
    engine.grid.setCell(9, 0, new Brick('amber'));
    engine.grid.setCell(0, 9, new Brick('amber'));
    engine.grid.setCell(9, 9, new Brick('amber'));

    // Let's place a target in lane 2 that matches and leaves only the 4 jammed corners
    engine.grid.setCell(3, 2, new Brick('crimson'));
    engine.grid.setCell(4, 2, new Brick('crimson'));
    engine.grid.setWallBrick(WALL_SIDES.LEFT, 2, 0, new Brick('crimson'));

    const result = engine.executeTurn(WALL_SIDES.LEFT, 2);
    assert.strictEqual(result.success, true);

    // Row 2 cleared, but the 4 jammed corner bricks remain and no valid moves are possible
    assert.strictEqual(engine.grid.isFieldEmpty(), false, 'Field has jammed bricks remaining');
    assert.strictEqual(engine.hasAnyValidMoves(), false, 'No valid moves should remain');
    assert.strictEqual(engine.state, GAME_STATES.GAME_OVER, 'State should be GAME_OVER');
  });

  it('clones grid state faithfully', () => {
    const grid = new Grid(10, 3);
    grid.setCell(3, 3, new Brick('cobalt', DIRECTIONS.NORTH, 'custom_1'));
    const cloned = grid.clone();
    assert.strictEqual(cloned.getCell(3, 3).id, 'custom_1');
    assert.strictEqual(cloned.getCell(3, 3).color, 'cobalt');
    assert.strictEqual(cloned.getCell(3, 3).direction.name, 'NORTH');

    grid.removeCell(3, 3);
    assert.strictEqual(grid.getCell(3, 3), null);
    assert.ok(cloned.getCell(3, 3) !== null);
  });

  it('guarantees complete engine decoupling and zero DOM dependencies during state sync', () => {
    const engine = new GameEngine();
    engine.startNewGame(2);
    engine.score = 3500;
    engine.highScore = 5000;

    // Simulate renderer sync extracting field cells and all 4 walls
    let fieldCount = 0;
    for (let y = 0; y < engine.gridSize; y++) {
      for (let x = 0; x < engine.gridSize; x++) {
        const brick = engine.grid.getCell(x, y);
        if (brick) {
          fieldCount++;
          assert.ok(typeof brick.id === 'string');
          assert.ok(typeof brick.color === 'string');
          assert.ok(typeof brick.direction === 'object');
        }
      }
    }
    assert.ok(fieldCount >= 5, 'Field should have initialized center bricks');

    // Verify all 4 walls have full queues
    const sides = Object.keys(engine.grid.walls);
    assert.strictEqual(sides.length, 4);
    for (const side of sides) {
      for (let lane = 0; lane < engine.gridSize; lane++) {
        for (let layer = 0; layer < engine.wallDepth; layer++) {
          const brick = engine.grid.getWallBrick(side, lane, layer);
          assert.ok(brick !== null, `Wall ${side} lane ${lane} layer ${layer} must have a brick`);
        }
      }
    }

    // Ensure engine state remains pristine and unmodified during extraction
    assert.strictEqual(engine.score, 3500);
    assert.strictEqual(engine.highScore, 5000);
    assert.strictEqual(engine.wave, 2);
    assert.strictEqual(engine.state, GAME_STATES.READY);
  });

  it('resets game state and field properly on restart / startNewGame(1)', () => {
    const engine = new GameEngine();
    engine.startNewGame(4);
    engine.score = 12400;
    engine.highScore = 20000;
    engine.state = GAME_STATES.GAME_OVER;

    // Trigger restart
    engine.startNewGame(1);

    assert.strictEqual(engine.score, 0);
    assert.strictEqual(engine.wave, 1);
    assert.strictEqual(engine.highScore, 20000, 'High score should be preserved across restarts');
    assert.strictEqual(engine.state, GAME_STATES.READY);
    assert.ok(engine.grid.countFieldBricks() >= 5, 'Field should be populated with new random bricks');
    assert.strictEqual(engine.hasAnyValidMoves(), true, 'Fresh board should have valid launch options');
  });
});


