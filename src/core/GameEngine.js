// src/core/GameEngine.js
import { GRID_SIZE, WALL_DEPTH, WALL_SIDES, GAME_STATES, SCORE_VALUES } from './Constants.js';
import { Grid } from './Grid.js';
import { Brick } from './Brick.js';
import { Physics } from './Physics.js';
import { Matcher } from './Matcher.js';

export class GameEngine {
  constructor(options = {}) {
    this.gridSize = options.gridSize || GRID_SIZE;
    this.wallDepth = options.wallDepth || WALL_DEPTH;
    this.grid = new Grid(this.gridSize, this.wallDepth);

    this.score = 0;
    this.waveStartScore = 0;
    this.highScore = 0;
    this.wave = 1;
    this.state = GAME_STATES.READY;
    this.turnCount = 0;
  }

  startNewGame(wave = 1) {
    this.wave = wave;
    if (wave === 1) {
      this.score = 0;
      this.waveStartScore = 0;
      this.turnCount = 0;
    } else {
      // Snapshot score at the beginning of the wave
      this.waveStartScore = this.score;
    }
    this.state = GAME_STATES.READY;

    // Reset grid
    this.grid = new Grid(this.gridSize, this.wallDepth);
    this.grid.populateWalls();

    // Spawn central bricks scaling slightly with wave
    const centerCount = Math.min(5 + Math.floor((this.wave - 1) * 1.5), 14);
    this.grid.populateCenter(centerCount);

    return {
      wave: this.wave,
      score: this.score,
      state: this.state,
    };
  }

  restartCurrentWave() {
    this.score = this.waveStartScore;
    this.state = GAME_STATES.READY;

    // Reset grid
    this.grid = new Grid(this.gridSize, this.wallDepth);
    this.grid.populateWalls();

    const centerCount = Math.min(5 + Math.floor((this.wave - 1) * 1.5), 14);
    this.grid.populateCenter(centerCount);

    return {
      wave: this.wave,
      score: this.score,
      state: this.state,
    };
  }

  getLaunchPreview(side, lane) {
    return Physics.evaluateLaunch(this.grid, side, lane);
  }

  hasAnyValidMoves() {
    for (const side of Object.keys(this.grid.walls)) {
      for (let lane = 0; lane < this.gridSize; lane++) {
        const preview = Physics.evaluateLaunch(this.grid, side, lane);
        if (preview.canLaunch) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Executes a turn by launching the innermost brick from the given wall and lane.
   * Runs the full Continuous Momentum Equilibrium Loop until no bricks can slide and no matches exist.
   * @param {string} side - WALL_SIDES
   * @param {number} lane - 0..gridSize-1
   */
  executeTurn(side, lane) {
    if (this.state !== GAME_STATES.READY) {
      return { success: false, reason: `Invalid state: ${this.state}` };
    }

    const preview = Physics.evaluateLaunch(this.grid, side, lane);
    if (!preview.canLaunch) {
      return { success: false, reason: 'EMPTY_LANE_OR_BLOCKED' };
    }

    this.state = GAME_STATES.ANIMATING;
    this.turnCount++;

    const steps = [];
    let turnScoreGained = 0;

    // 1. Pop and shift source wall
    const wallShift = this.grid.popAndShiftWall(side, lane);
    const launchedBrick = wallShift.poppedBrick;

    launchedBrick.setDirection(preview.direction);
    this.grid.setCell(preview.landingCell.x, preview.landingCell.y, launchedBrick);

    steps.push({
      type: 'LAUNCH_TO_FIELD',
      side,
      lane,
      brick: launchedBrick,
      landingCell: preview.landingCell,
      pathCells: preview.pathCells,
      obstaclePos: preview.obstaclePos,
      wallShift,
    });

    // 2. Continuous Equilibrium Loop: matches <-> simultaneous slides until static
    let combo = 1;
    while (true) {
      let activityOccurred = false;

      // Phase A: Match-3 line detection & elimination
      const matchResult = Matcher.findMatches(this.grid);
      if (matchResult.hasMatches) {
        matchResult.matchedCells.forEach(({ x, y }) => {
          this.grid.removeCell(x, y);
        });

        const stepScore = matchResult.baseScore * combo;
        turnScoreGained += stepScore;
        this.score += stepScore;
        if (this.score > this.highScore) {
          this.highScore = this.score;
        }

        steps.push({
          type: 'MATCH',
          combo,
          scoreGained: stepScore,
          matchedCells: matchResult.matchedCells,
          lines: matchResult.lines,
        });

        combo++;
        activityOccurred = true;
      }

      // Phase B: Momentum recalculation - slide all unobstructed bricks (in-field or into walls)
      const slideResult = Physics.simulateSimultaneousSlides(this.grid);
      if (slideResult.hasMoved) {
        steps.push({
          type: 'SLIDE',
          movements: slideResult.movements,
        });
        activityOccurred = true;
      }

      // Stop once no matches occurred and no bricks moved
      if (!activityOccurred) {
        break;
      }
    }

    // 3. Evaluate Win / Loss
    if (this.grid.isFieldEmpty()) {
      this.state = GAME_STATES.WAVE_CLEAR;
      this.score += SCORE_VALUES.WAVE_CLEAR_BONUS;
      if (this.score > this.highScore) {
        this.highScore = this.score;
      }
      steps.push({
        type: 'WAVE_CLEAR',
        bonus: SCORE_VALUES.WAVE_CLEAR_BONUS,
        wave: this.wave,
      });
    } else if (!this.hasAnyValidMoves()) {
      this.state = GAME_STATES.GAME_OVER;
      steps.push({
        type: 'GAME_OVER',
        finalScore: this.score,
        wave: this.wave,
      });
    } else {
      this.state = GAME_STATES.READY;
    }

    return {
      success: true,
      steps,
      scoreGained: turnScoreGained,
      totalScore: this.score,
      state: this.state,
    };
  }
}
