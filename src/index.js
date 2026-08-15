// src/index.js - Main Application Coordinator with Dual-Renderer Support (3D & 2D)
import { GameEngine } from './core/GameEngine.js';
import { Renderer3D } from './render/Renderer3D.js';
import { Renderer2D } from './render/Renderer2D.js';
import { SoundSystem } from './audio/SoundSystem.js';
import { UIManager } from './ui/UIManager.js';

class BricksApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.highScoreStorageKey = 'bricks_puzzle_high_score';
    this.renderModeStorageKey = 'bricks_render_mode';
    this.gameStateStorageKey = 'bricks_puzzle_game_state';

    this.engine = new GameEngine();
    this.engine.highScore = parseInt(localStorage.getItem(this.highScoreStorageKey) || '0', 10);

    this.sound = new SoundSystem();

    // 1. Initialize both renderers
    this.renderer3D = new Renderer3D({
      container: this.container,
      gameEngine: this.engine,
      onLaunchCallback: (side, lane) => this.handleLaunch(side, lane),
      onStepCallback: (step) => this.handleStep(step),
    });

    this.renderer2D = new Renderer2D({
      container: this.container,
      gameEngine: this.engine,
      onLaunchCallback: (side, lane) => this.handleLaunch(side, lane),
      onStepCallback: (step) => this.handleStep(step),
    });

    this.renderMode = localStorage.getItem(this.renderModeStorageKey) || '3d';
    this.activeRenderer = null;

    // 2. Initialize UI Manager
    this.ui = new UIManager({
      onRestartGame: () => this.restartCurrentWave(),
      onResetToWave1: () => this.resetToFirstWave(),
      onNextWave: () => this.startNextWave(),
      onToggleSound: () => this.sound.toggleSound(),
      onToggleRenderMode: () => this.toggleRenderMode(),
    });

    // 3. Mount active renderer and restore or initialize game
    this.setRenderMode(this.renderMode);

    if (!this.loadGameState()) {
      this.resetToFirstWave();
    }
  }

  saveGameState() {
    try {
      const stateData = this.engine.toJSON();
      localStorage.setItem(this.gameStateStorageKey, JSON.stringify(stateData));
      if (this.engine.highScore > 0) {
        localStorage.setItem(this.highScoreStorageKey, String(this.engine.highScore));
      }
    } catch (e) {
      console.warn('Failed to save game state to localStorage', e);
    }
  }

  loadGameState() {
    try {
      const saved = localStorage.getItem(this.gameStateStorageKey);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.grid && Array.isArray(parsed.grid.field)) {
        const ok = this.engine.loadState(parsed);
        if (ok) {
          this.activeRenderer.syncFromGrid(this.engine.grid);
          this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);

          if (this.engine.state === 'WAVE_CLEAR') {
            this.ui.showWaveClearModal(this.engine.wave, 2500, this.engine.score);
            this.activeRenderer.setEnabled(false);
          } else if (this.engine.state === 'GAME_OVER') {
            this.ui.showGameOverModal(this.engine.score, this.engine.wave, this.engine.highScore);
            this.activeRenderer.setEnabled(false);
          } else {
            this.activeRenderer.setEnabled(true);
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to restore game state from localStorage', e);
    }
    return false;
  }

  toggleRenderMode() {
    const newMode = this.renderMode === '3d' ? '2d' : '3d';
    this.setRenderMode(newMode);
    return newMode;
  }

  setRenderMode(mode) {
    if (this.activeRenderer) {
      this.activeRenderer.unmount();
    }

    this.renderMode = mode;
    localStorage.setItem(this.renderModeStorageKey, mode);

    this.activeRenderer = mode === '2d' ? this.renderer2D : this.renderer3D;
    this.activeRenderer.mount(this.container);

    // Synchronize current grid state into newly activated renderer without state loss
    this.activeRenderer.syncFromGrid(this.engine.grid);
    this.activeRenderer.setEnabled(this.engine.state === 'READY');

    this.ui.updateRenderModeUI(mode);
  }

  handleStep(step) {
    if (step.type === 'MATCH') {
      this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);
      if (step.combo >= 2) {
        this.ui.showComboBadge(step.combo, step.scoreGained);
        if (this.renderMode === '3d' && this.renderer3D.triggerCameraShake) {
          this.renderer3D.triggerCameraShake(0.18 + step.combo * 0.05);
        }
      }
    }
  }

  restartCurrentWave() {
    this.engine.restartCurrentWave();
    this.activeRenderer.syncFromGrid(this.engine.grid);
    this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);
    this.activeRenderer.setEnabled(true);
    this.saveGameState();
  }

  resetToFirstWave() {
    this.engine.resetToFirstWave();
    this.activeRenderer.syncFromGrid(this.engine.grid);
    this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);
    this.activeRenderer.setEnabled(true);
    this.saveGameState();
  }

  startNewGame(wave = 1) {
    this.engine.startNewGame(wave);
    this.activeRenderer.syncFromGrid(this.engine.grid);
    this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);
    this.activeRenderer.setEnabled(true);
    this.saveGameState();
  }

  startNextWave() {
    this.engine.wave++;
    this.engine.startNewGame(this.engine.wave);
    this.activeRenderer.syncFromGrid(this.engine.grid);
    this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);
    this.activeRenderer.setEnabled(true);
    this.saveGameState();
  }

  async handleLaunch(side, lane) {
    this.sound.ensureContext();
    this.activeRenderer.setEnabled(false);

    const turnResult = this.engine.executeTurn(side, lane);
    if (!turnResult.success) {
      this.activeRenderer.setEnabled(true);
      return;
    }

    // Save persistent high score
    if (this.engine.score >= this.engine.highScore) {
      localStorage.setItem(this.highScoreStorageKey, String(this.engine.score));
    }

    // Play animation sequence in active renderer
    await this.activeRenderer.playTurnTimeline({
      steps: turnResult.steps,
      soundSystem: this.sound,
    });

    this.ui.updateHUD(this.engine.score, this.engine.highScore, this.engine.wave);

    if (turnResult.state === 'WAVE_CLEAR') {
      this.ui.showWaveClearModal(this.engine.wave, 2500, this.engine.score);
    } else if (turnResult.state === 'GAME_OVER') {
      this.ui.showGameOverModal(this.engine.score, this.engine.wave, this.engine.highScore);
    } else {
      this.activeRenderer.setEnabled(true);
    }

    this.saveGameState();
  }
}

// Bootstrap once DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new BricksApp();
});
