# AGENTS.md - Development & Contribution Guide for "Bricks"

Welcome to the **Bricks** project! This repository contains a pseudo-3D single-page puzzle game built with modern JavaScript and Three.js, developed strictly using **Spec-Driven Development (SDD)**.

---

## ⚠️ MANDATORY RULES FOR AGENTS

### 1. ALWAYS UPDATE THE SPEC FIRST!
> **CRITICAL DIRECTIVE**: 
> **NEVER** write or modify game logic, physics, board mechanics, collision handling, scoring, rendering behaviors, or player interactions without **first reviewing and updating the specification** in [`spec/SPEC.md`](file:///Users/dev/projects/battle/spec/SPEC.md).
>
> Any user request that adds, modifies, or clarifies rules, mechanics, edge cases, or features MUST be written into `spec/SPEC.md` **before** any code in `src/` or `tests/` is modified.

### 2. ALWAYS RECOMPILE THE STANDALONE BUNDLE!
> **CRITICAL DIRECTIVE**: 
> Whenever ANY change is made to source files in `src/`, `style.css`, or `index.html`, **ALWAYS run `bun run build`** to recompile `dist/bricks.html` (and `dist/index.html`).
>
> This guarantees that the user can simply refresh their browser on `dist/bricks.html` (or `file:///.../dist/bricks.html`) and immediately see the latest changes without manual build steps.

---

## 1. Core Principles

1. **Spec-First, Spec-Always**:
   - `spec/SPEC.md` is the single source of truth for the entire system.
   - When a requirement changes, update `spec/SPEC.md` first.
   - Code changes that are not documented in `spec/SPEC.md` violate project policy.

2. **Always Fresh Standalone Build**:
   - `dist/bricks.html` is the primary artifact for playing the game offline.
   - Any code modifications must be followed by `bun run build`.

3. **Decoupled Architecture**:
   - **Game Engine / Core Logic (`src/core/`)**: Pure, deterministic JavaScript with **zero DOM or Three.js dependencies**. Handles Grid data, Physics, Match-3 detection, momentum vectors, and turn lifecycle. 100% unit-testable in any JS runtime.
   - **Renderer / View Layer (`src/render/`)**: Three.js scene, camera, meshes, dynamic canvas textures, lighting, shadows, and animations.
   - **Input / Controller (`src/input/`)**: Translates mouse/touch pointer events and raycasting into Game Engine actions.
   - **Audio / FX Layer (`src/audio/`)**: Web Audio API sound synthesis.
   - **UI / HUD Layer (`src/ui/`)**: Score counter, combo badges, wave banner, and dialog modals.

4. **High Code Quality & Test Coverage**:
   - Game logic must be 100% covered by deterministic unit tests in [`tests/`](file:///Users/dev/projects/battle/tests).
   - Tests run in CLI via Vitest (`bun test` or `bun run test`).

---

## 2. Directory Structure

```
├── AGENTS.md                  # Mandatory agent workflow and project guidelines
├── package.json               # Modern ES module manifest, scripts, and dependencies (three, vitest)
├── vite.config.js             # Vite & Vitest configuration with single-file HTML plugin
├── spec/
│   └── SPEC.md                # LIVING SPECIFICATION (Must be updated on every change!)
├── src/
│   ├── core/                  # Pure game logic (Grid, Brick, Physics, Matcher, GameEngine, Constants)
│   ├── render/                # Three.js scene, camera, meshes, animations, particles
│   ├── input/                 # Raycaster, mouse/touch handlers, aiming previews
│   ├── audio/                 # Web Audio synthesized sound effects
│   ├── ui/                    # HUD, menus, game over screens, combo badges
│   └── index.js               # Entry point wiring Core, Render, Input, Audio, and UI
├── dist/
│   ├── bricks.html            # Compiled 100% standalone offline single-file game
│   └── index.html             # Standalone index copy
├── tests/
│   └── core.test.js           # Vitest unit test suite covering all mechanics
├── index.html                 # Development single-page game HTML host
└── style.css                  # Modern, responsive Vanilla CSS styling
```

---

## 3. Spec-Driven Workflow for Agents

When handling ANY task or feature request:
1. **Read & Check Spec**: Review [`spec/SPEC.md`](file:///Users/dev/projects/battle/spec/SPEC.md) to understand current state and rules.
2. **Update Spec First**: Write the new rules, mechanics, or modifications into [`spec/SPEC.md`](file:///Users/dev/projects/battle/spec/SPEC.md).
3. **Implement / Update Pure Core Logic**: Write or adjust logic in `src/core/`.
4. **Write / Update Tests**: Add or update unit tests in `tests/core.test.js` to verify the new mechanics. Run tests (`bun test`) and ensure 100% pass rate.
5. **Implement Presentation Layer**: Hook up Three.js rendering, animations, HUD, and input in `src/render/`, `src/input/`, `src/audio/`, and `src/ui/`.
6. **Recompile Standalone Single-File**: Run `bun run build` to ensure `dist/bricks.html` is up to date.
7. **Verify End-to-End**: Ensure all tests pass and browser interactions are responsive and visually polished.

---

## 4. Coding Standards

- **Standard Modern JS / ES Modules** with clean modular separation and npm package imports (`import * as THREE from 'three'`).
- **CSS**: Pure Vanilla CSS, responsive, elegant, modern typography and clean palette.
- **Three.js**: Optimized geometry, smooth tweens (LERP / easing), crisp shadows/lighting, isometric perspective.

