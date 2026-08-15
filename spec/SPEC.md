# Game Specification: "Bricks"

## 1. Overview & Core Objective
**"Bricks"** is a pseudo-3D tactical puzzle arcade game rendered with Three.js.
The player clears bricks from a central **10×10 grid** by launching bricks inward from 4 surrounding walls (Top, Bottom, Left, Right). 

### Primary Goal
- Clear all bricks in the central playing field.
- In **Arcade / Wave Mode**: Clearing the central field completes the current wave, awards a wave clear bonus (+2,500 pts), and initiates the next wave with increased central field density.

### Loss Condition
- **Board Jam / Overflow**: If no valid moves are possible across all 4 walls while uncleared bricks remain in the field.

---

## 2. Playfield Layout & Architecture

```
                  Top Wall (10 cols × 3 rows)
              ┌─────────────────────────────────┐
              │ [2] [2] [2] [2] [2] [2] ... [2] │ (Layer 2: Outermost / Ejected / Replenished)
              │ [1] [1] [1] [1] [1] [1] ... [1] │ (Layer 1: Middle)
              │ [0] [0] [0] [0] [0] [0] ... [0] │ (Layer 0: Innermost / Clickable)
              └─────────────────────────────────┘
  Left Wall                                             Right Wall
(3 cols × 10 rows)                                  (3 cols × 10 rows)
┌──────┬──────┬──────┐ ┌──────────────────────────┐ ┌──────┬──────┬──────┐
│ [2]  │ [1]  │ [0]  │ │                          │ │ [0]  │ [1]  │ [2]  │
│ [2]  │ [1]  │ [0]  │ │   Central 10×10 Field    │ │ [0]  │ [1]  │ [2]  │
│ [2]  │ [1]  │ [0]  │ │                          │ │ [0]  │ [1]  │ [2]  │
│ ...  │ ...  │ ...  │ │   [R]  [G]  [B]          │ │ ...  │ ...  │ ...  │
│ [2]  │ [1]  │ [0]  │ │        [Y]  [R]          │ │ [0]  │ [1]  │ [2]  │
│ [2]  │ [1]  │ [0]  │ │                          │ │ [0]  │ [1]  │ [2]  │
└──────┴──────┴──────┘ └──────────────────────────┘ └──────┴──────┴──────┘
              ┌─────────────────────────────────┐
              │ [0] [0] [0] [0] [0] [0] ... [0] │ (Layer 0: Innermost / Clickable)
              │ [1] [1] [1] [1] [1] [1] ... [1] │ (Layer 1: Middle)
              │ [2] [2] [2] [2] [2] [2] ... [2] │ (Layer 2: Outermost / Ejected / Replenished)
              └─────────────────────────────────┘
                Bottom Wall (10 cols × 3 rows)
```

1. **Central Field**:
   - Size: 10 rows × 10 columns (100 cells total).
   - Coordinates: `(x, y)` where $x, y \in [0, 9]$.
   - Initial State: 5–14 random colored bricks in the central area.
   - Initial center bricks are **static** (`direction = NONE`).

2. **Surrounding Walls**:
   - 4 Walls: **Top**, **Bottom**, **Left**, **Right**.
   - Depth: 3 layers deep (indices 0, 1, 2).
   - **Layer 0**: Innermost layer directly bordering the 10×10 grid. This is the **only clickable layer** for the player.
   - **Layer 1**: Middle layer.
   - **Layer 2**: Outermost layer.

3. **High-Contrast 4-Quadrant Color Palette**:
   - 4 Unambiguously Distinct Colors separated uniformly across the color wheel (~90° apart):
     - **Vivid Fire Red**: `#e60026` (Deep vibrant scarlet, $350^\circ$)
     - **Royal Cobalt Blue**: `#2962ff` (Deep electric royal blue, $225^\circ$, completely separated from green/cyan)
     - **Radiant Emerald Green**: `#00c853` (Vibrant pure green, $140^\circ$)
     - **Bright Golden Yellow**: `#ffd600` (Warm luminous canary yellow, $50^\circ$)

---

## 3. Game Mechanics & State Machine

### 3.1 Aiming & Launching Rules
- The player can click any brick on **Layer 0** of any wall.
- **Empty Lane Launch Prevention & Trajectory Highlighting**:
  - A brick **CANNOT** be launched by the player if the lane in the 10×10 central field is completely empty (no obstacles to hit). Clicking on a wall brick in an empty lane is disabled and does nothing.
  - **Full-Path Aim Highlighting**: When hovering over a Layer 0 brick on an empty lane, the aim trajectory line is highlighted across the entire 10×10 central field, ending directly at the opposite wall's Layer 0 boundary (showing the full path the brick would traverse across the board).
  - When obstacles exist in the lane, the aim line terminates at the calculated landing cell, accompanied by a ghost landing preview box.
- **Launch Directions**:
  - **Left Wall**: Shoots East `(+1, 0)`
  - **Right Wall**: Shoots West `(-1, 0)`
  - **Top Wall**: Shoots South `(0, +1)`
  - **Bottom Wall**: Shoots North `(0, -1)`
- **Source Wall Inward Feed**:
  - When an innermost brick is fired from `(side, lane, 0)`:
  - Layer 1 moves to Layer 0.
  - Layer 2 moves to Layer 1.
  - A new random brick drops into Layer 2.

### 3.2 Obstacle Collision & Landings
- When launched, the projectile travels along its lane until it hits the first obstacle brick in the 10×10 field.
- It comes to rest at the empty cell immediately adjacent to the obstacle it hit.
- The landed brick retains its flight direction vector $D \in \{\text{East, West, South, North}\}$ and displays a high-contrast direction glyph on its top face.

### 3.3 Match-3 Elimination
- After bricks settle, the board checks for **strict straight lines** of **3 or more consecutive bricks of the same color**:
  - Horizontal runs: $\ge 3$ consecutive same-color bricks in a row.
  - Vertical runs: $\ge 3$ consecutive same-color bricks in a column.
  - Intersecting lines (T-shape, L-shape, cross) clear all participating cells simultaneously.
- Scoring:
  - Base: 100 pts per brick.
  - 4-in-a-row: $1.5\times$ bonus.
  - 5-in-a-row: $2.0\times$ bonus.

### 3.4 Continuous Momentum Recalculation & Equilibrium Loop
- Turn resolution executes a continuous **Equilibrium Loop**:
  1. **Match Phase**: Find and eliminate all 3+ line matches on the board. Award score with current combo multiplier ($1\times, 2\times, 3\times, \dots$).
  2. **Slide Phase**: Check ALL bricks on the board with active momentum ($D \ne \text{NONE}$). Any brick whose forward path is unobstructed slides forward simultaneously.
  3. **Off-Board Wall Push-Out**: Any brick that slides off the grid perimeter edge enters the opposite wall as **Layer 0**, pushing that wall queue outward (0 $\to$ 1, 1 $\to$ 2, 2 ejected).
  4. **Iterate until Static**: If any matches occurred OR any bricks slid/flew away, repeat from Step 1.
  5. The loop concludes only when **no bricks can slide and no matches exist**.
  6. **Wave Completion**: If all field bricks are eliminated or have flown away into the walls (`grid.isFieldEmpty() == true`), the wave is immediately completed!

---

## 4. Dual-Renderer Architecture & Visual Presentation

The game engine is strictly decoupled from presentation. The display layer supports two hot-swappable renderers that can be toggled at any time during gameplay without losing game state:

### 4.1 Pluggable Renderer Interface
All renderers implement a unified contract:
- `mount(container)`: Mount renderer DOM elements or canvas into host container.
- `unmount()`: Unmount or hide renderer DOM elements.
- `syncFromGrid(grid)`: Synchronize all active central field cells and 4 wall queues with the current engine state.
- `playTurnTimeline(timelineData)`: Execute smooth animated step sequences for launches, shifts, pops, matches, and cascading slides.
- `setEnabled(enabled)`: Enable or disable user input / hover interactions.
- `destroy()`: Dispose of renderer resources, listeners, geometries, textures, or timers.

### 4.2 3D Three.js Renderer (`Renderer3D`)
- **Camera & Projection**: Isometric / high-angled tilted perspective (42° FOV, 45° elevation, 45° diagonal orientation) with camera shake on combos.
- **Brick Meshes**: Beveled rounded 3D cubes with high-contrast saturated materials and clearcoat reflections.
- **Direction Glyphs**: Top face vector textures with high-contrast directional chevrons and outline contrast.
- **Aim Trajectory Preview**: Laser targeting line and translucent ghost box indicating exact landing cell (or spanning across to opposite wall on empty lanes).
- **Particles & FX**: 3D explosion particle bursts on matches and wave clear celebrations.
- **Lifecycle & Power Optimization**: When switched away (deactivated), the 3D render loop (`requestAnimationFrame`) is completely paused, stopping GPU utilization.

### 4.3 2D High-Efficiency Battery-Saver Renderer (`Renderer2D`)
- **Ultra-Low Power**: Built using lightweight semantic HTML/DOM and CSS transforms. Zero WebGL/GPU overhead, maximizing battery life on laptops and mobile devices.
- **Idle Power**: When idle (no active tweens), 0 `requestAnimationFrame` cycles are executed. Animations only run on demand during turns.
- **Unified 16×16 Grid Board & Wall Layout**:
  - The 2D board uses a unified **16×16 grid of identical square cells** (each cell is exactly 1/16th × 1/16th of the board dimension):
    - **Central 10×10 Field**: Spans rows 4..13 and columns 4..13.
    - **Top Wall (10 cols × 3 rows)**: Spans rows 1..3 and columns 4..13, aligning 1:1 with central field columns 0..9.
    - **Bottom Wall (10 cols × 3 rows)**: Spans rows 14..16 and columns 4..13, aligning 1:1 with central field columns 0..9.
    - **Left Wall (3 cols × 10 rows)**: Spans rows 4..13 and columns 1..3, aligning 1:1 with central field rows 0..9.
    - **Right Wall (3 cols × 10 rows)**: Spans rows 4..13 and columns 14..16, aligning 1:1 with central field rows 0..9.
    - **4 Corner Frames (3 cols × 3 rows)**: Top-Left, Top-Right, Bottom-Left, and Bottom-Right corner bezels.
  - Every brick in all 4 walls and central field is an identical square with identical aspect ratio and perfect lane alignment.
  - Layer 0 (innermost wall bricks) features interactive hover glow, cursor state, and instant aim trajectory line (connecting to target obstacle or across to opposite wall on empty lanes).
- **Unified Color Palette & Glyphs Parity**:
  - Uses the **exact same 4-quadrant color definitions** as 3D:
    - Vivid Fire Red: `#e60026` (`crimson`)
    - Royal Cobalt Blue: `#2962ff` (`cobalt`)
    - Radiant Emerald Green: `#00c853` (`emerald`)
    - Bright Golden Yellow: `#ffd600` (`amber`)
  - Identical color values applied across 2D/3D brick faces, hover highlights, laser aim lines, ghost landing indicators, and particle bursts.
  - In 2D mode, static bricks are rendered as clean **solid color bricks** (no center dots). Active moving/directional bricks display high-contrast directional indicators (▲ North, ▼ South, ◄ West, ► East).
- **Animations & FX**:
  - CSS/JS eased transitions for sliding projectiles, source wall inward feeds, target wall outward push/ejection, and cascading slides.
  - **Wall Push Queue Synchronization**: When a brick enters a wall (off-board slide or cross-board flight), the target wall queue is atomically updated (layer 2 ejected, layers 1 and 0 shift outward, arriving brick docks in layer 0 with `direction = NONE`) ensuring no blank slots or rendering holes.
  - Match pop animations with 2D celebratory particle bursts.

### 4.4 Seamless Mode Switching
- A dedicated mode switch button in the HUD header allows instant toggling between **"3D View"** and **"2D Mode (Battery Saver)"**.
- Switching mode pauses the current renderer, activates the target renderer, and calls `syncFromGrid(grid)` with the live game engine state.
- The player's active game, score, high score, current wave, board layout, and wall queues remain 100% intact.
- The user's preferred render mode is persisted in `localStorage` (`bricks_render_mode`).

### 4.5 Audio & Synthesized FX
- Synthesized launch whooshes, impact clacks, harmonic match chords, pitch-ascending combo chimes, and wave clear fanfares run identically across both 2D and 3D render modes.

### 4.6 HUD & Quick Restart Controls
- **Restart Button**: Positioned in the left HUD header group, immediately to the right of the brand title and Wave indicator pill.
- **Icon & Accessibility**: Renders as a clean circular arrow (`↻`) icon button with tooltip `"Restart Game"` and ARIA label.
- **Wave-Level Restart Behavior & Score Rollback**:
  - **Score Snapshot**: At the beginning of each wave, the starting score is recorded (`waveStartScore`).
  - **Restart Rollback**: Triggering a restart (via HUD Restart button `↻` or modal "Play Again ↻") resets the **current wave**:
    - Rolls back the active score to the exact score at the beginning of the current wave (`score = waveStartScore`).
    - Generates a fresh randomized central 10×10 field (scaled according to the current wave density) and freshly populated wall queues across all 4 sides.
    - Preserves all-time high score intact.
    - Automatically closes/dismisses any active modal overlays (Wave Clear or Game Over).
    - Re-enables player input and synchronizes the active renderer (3D or 2D).
- **HUD Layout & Responsiveness**:
  - **Left HUD Group**: `[BRICKS Wave N]` brand badge + `[↻]` Restart icon button.
  - **Right HUD Group**: Score card, High Score card, Mode Toggle button (3D / 2D Eco), Sound Toggle button (`🔊`/`🔇`), and Help button (`?`).



---

## 5. Standard JS Project & Single-File Compilation Architecture

1. **Standard Modern JavaScript Project**:
   - Managed via **Bun** with standard `package.json` (`type: "module"`).
   - **Three.js** is managed as a standard npm dependency (`"three": "^0.185.1"`).
   - All modules use standard package imports (`import * as THREE from 'three'`).

2. **Standard Single-File Compiler (Vite + `vite-plugin-singlefile`)**:
   - Development server with instant HMR: `bun run dev` (or `npx vite`).
   - Production single-file bundling: `bun run build`.
   - Produces 100% self-contained, standalone offline artifacts in `dist/bricks.html` and `dist/index.html` with all JS, CSS, and Three.js runtime fully inlined.

3. **Continuous Integration & Automated Deployment (GitHub Actions)**:
   - **Automated Testing Workflow (`.github/workflows/test.yml`)**:
     - Triggers on every `push` and `pull_request` targeting `main`, plus manual `workflow_dispatch`.
     - Sets up Bun, installs dependencies, and runs the entire unit test suite (`bun test`).
   - **Automated GitHub Pages Deployment Workflow (`.github/workflows/deploy.yml`)**:
     - Triggers on `push` to `main` and manual `workflow_dispatch`.
     - Sets up Bun, installs dependencies, executes `bun run build` to compile the standalone single-file bundle, and deploys `dist/` to the `gh-pages` branch.

---

## 6. Technical Implementation & Test Coverage

### Module Map:
- `.github/workflows/test.yml`: Continuous testing workflow running Vitest suite via Bun.
- `.github/workflows/deploy.yml`: Continuous deployment workflow compiling single-file bundle and deploying to GitHub Pages.
- `package.json`: Project manifest, scripts (`dev`, `build`, `test`), and dependencies (`three`, `vite`, `vite-plugin-singlefile`, `vitest`).
- `vite.config.js`: Vite & Vitest configuration bundling the single-file HTML game to `dist/bricks.html`.
- `src/core/Constants.js`: Definitions for grid size, wall depth, distinct 4-quadrant color palette, directions, and score multipliers.
- `src/core/Brick.js`: Brick data model and direction state.
- `src/core/Grid.js`: Board state management, `popAndShiftWall()`, and `pushInnermostWall()`.
- `src/core/Physics.js`: Launch feasibility, obstacle landing calculation, and cascade simultaneous slides with off-board wall push.
- `src/core/Matcher.js`: Straight line match-3 detection and run scoring.
- `src/core/GameEngine.js`: Equilibrium loop turn orchestration, cascade chains, scoring, wave lifecycle.
- `src/render/Renderer3D.js`: Three.js WebGL renderer coordinating SceneManager, BoardView, BrickMesh, ParticleSystem, and 3D InputManager.
- `src/render/Renderer2D.js`: Ultra-lightweight HTML/DOM battery-saver renderer with 2D animations, aim preview, and direct pointer events.
- `src/render/SceneManager.js`: Three.js scene, camera, lighting, shadows, start/stop render loop.
- `src/render/BoardView.js`: 3D field platform, wall trays, aim lines, landing previews.
- `src/render/BrickMesh.js`: High-contrast 3D brick mesh with direction glyph textures.
- `src/render/Animator.js`: Eased tween animations for 3D slides, pops, and wall queue shifts.
- `src/render/ParticleSystem.js`: 3D explosion particle bursts.
- `src/input/InputManager.js`: 3D Raycaster mouse/touch events and hover previews (disabled on empty lanes).
- `src/audio/SoundSystem.js`: Procedural Web Audio effects.
- `src/ui/UIManager.js`: Score, high score, wave HUD, 2D/3D render mode switcher, combo badges, and modal dialogs.
- `src/index.js`: Application coordinator managing Engine, Renderers (2D/3D), Audio, and UI.

### Test Coverage (`tests/core.test.js`):
- 100% deterministic unit test coverage for Brick, Grid, Physics, Matcher, and GameEngine Equilibrium Cascades.
- Executed via standard **Vitest** (`bun test` or `bun run test`).

