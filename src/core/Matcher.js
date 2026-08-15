// src/core/Matcher.js
import { SCORE_VALUES } from './Constants.js';

export class Matcher {
  /**
   * Scans the central grid field for all horizontal and vertical runs of 3+ matching colors.
   * @param {Grid} grid
   * @returns {{
   *   hasMatches: boolean,
   *   matchedCells: Array<{x: number, y: number, brick: Brick}>,
   *   lines: Array<{type: string, color: string, length: number, cells: Array<{x: number, y: number, brick: Brick}>}>,
   *   baseScore: number
   * }}
   */
  static findMatches(grid) {
    const size = grid.size;
    const lines = [];
    const matchedCoordsSet = new Set();
    const matchedCells = [];

    // Helper to add a cell safely
    const markCell = (x, y, brick) => {
      const key = `${x},${y}`;
      if (!matchedCoordsSet.has(key)) {
        matchedCoordsSet.add(key);
        matchedCells.push({ x, y, brick });
      }
    };

    // 1. Horizontal scans (row by row)
    for (let y = 0; y < size; y++) {
      let currentRun = [];
      let currentColor = null;

      for (let x = 0; x < size; x++) {
        const brick = grid.getCell(x, y);
        if (brick !== null) {
          if (brick.color === currentColor) {
            currentRun.push({ x, y, brick });
          } else {
            if (currentRun.length >= 3) {
              lines.push({
                type: 'HORIZONTAL',
                color: currentColor,
                length: currentRun.length,
                cells: [...currentRun],
              });
              currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
            }
            currentColor = brick.color;
            currentRun = [{ x, y, brick }];
          }
        } else {
          if (currentRun.length >= 3) {
            lines.push({
              type: 'HORIZONTAL',
              color: currentColor,
              length: currentRun.length,
              cells: [...currentRun],
            });
            currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
          }
          currentColor = null;
          currentRun = [];
        }
      }

      // Check trailing run at end of row
      if (currentRun.length >= 3) {
        lines.push({
          type: 'HORIZONTAL',
          color: currentColor,
          length: currentRun.length,
          cells: [...currentRun],
        });
        currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
      }
    }

    // 2. Vertical scans (column by column)
    for (let x = 0; x < size; x++) {
      let currentRun = [];
      let currentColor = null;

      for (let y = 0; y < size; y++) {
        const brick = grid.getCell(x, y);
        if (brick !== null) {
          if (brick.color === currentColor) {
            currentRun.push({ x, y, brick });
          } else {
            if (currentRun.length >= 3) {
              lines.push({
                type: 'VERTICAL',
                color: currentColor,
                length: currentRun.length,
                cells: [...currentRun],
              });
              currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
            }
            currentColor = brick.color;
            currentRun = [{ x, y, brick }];
          }
        } else {
          if (currentRun.length >= 3) {
            lines.push({
              type: 'VERTICAL',
              color: currentColor,
              length: currentRun.length,
              cells: [...currentRun],
            });
            currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
          }
          currentColor = null;
          currentRun = [];
        }
      }

      // Check trailing run at end of column
      if (currentRun.length >= 3) {
        lines.push({
          type: 'VERTICAL',
          color: currentColor,
          length: currentRun.length,
          cells: [...currentRun],
        });
        currentRun.forEach((c) => markCell(c.x, c.y, c.brick));
      }
    }

    // Calculate base score for this match step
    let baseScore = 0;
    lines.forEach((line) => {
      let linePoints = line.length * SCORE_VALUES.BASE_PER_BRICK;
      if (line.length === 4) {
        linePoints = Math.round(linePoints * SCORE_VALUES.LINE_4_MULTIPLIER);
      } else if (line.length >= 5) {
        linePoints = Math.round(linePoints * SCORE_VALUES.LINE_5_MULTIPLIER);
      }
      baseScore += linePoints;
    });

    return {
      hasMatches: matchedCells.length > 0,
      matchedCells,
      lines,
      baseScore,
    };
  }
}
