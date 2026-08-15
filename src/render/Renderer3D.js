// src/render/Renderer3D.js - Three.js WebGL 3D Game Renderer
import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { BoardView } from './BoardView.js';
import { BrickMesh } from './BrickMesh.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Animator } from './Animator.js';
import { InputManager } from '../input/InputManager.js';

export class Renderer3D {
  /**
   * @param {Object} params
   * @param {HTMLElement} params.container - Host DOM container
   * @param {GameEngine} params.gameEngine
   * @param {Function} params.onLaunchCallback - (side, lane) => void
   * @param {Function} params.onStepCallback - (step) => void
   */
  constructor({ container, gameEngine, onLaunchCallback, onStepCallback }) {
    this.container = container;
    this.gameEngine = gameEngine;
    this.onLaunchCallback = onLaunchCallback;
    this.onStepCallback = onStepCallback;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'renderer-3d-wrapper';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';
    this.wrapper.style.position = 'relative';

    this.sceneManager = new SceneManager(this.wrapper);
    this.boardView = new BoardView(1.0);
    this.sceneManager.scene.add(this.boardView.group);

    this.animator = new Animator();
    this.particleSystem = new ParticleSystem(this.sceneManager.scene);
    this.brickMeshesMap = new Map();

    this.sceneManager.addUpdateCallback((dt) => {
      this.animator.update(dt);
      this.particleSystem.update(dt);
    });

    this.input = new InputManager({
      domElement: this.sceneManager.renderer.domElement,
      camera: this.sceneManager.camera,
      gameEngine: this.gameEngine,
      boardView: this.boardView,
      brickMeshesMap: this.brickMeshesMap,
      onLaunchCallback: (side, lane) => {
        if (this.onLaunchCallback) this.onLaunchCallback(side, lane);
      },
    });

    this.isMounted = false;
  }

  createBrickMesh(brick) {
    return new BrickMesh(brick, 1.0);
  }

  clearAllBrickMeshes() {
    this.brickMeshesMap.forEach((meshGroup) => {
      this.sceneManager.scene.remove(meshGroup);
      const bMesh = meshGroup.userData.brickMesh;
      if (bMesh) bMesh.dispose();
    });
    this.brickMeshesMap.clear();
    this.particleSystem.clear();
  }

  syncFromGrid(grid) {
    this.clearAllBrickMeshes();

    // 1. Central Field Bricks
    for (let y = 0; y < grid.size; y++) {
      for (let x = 0; x < grid.size; x++) {
        const brick = grid.getCell(x, y);
        if (brick) {
          const bMesh = this.createBrickMesh(brick);
          const worldPos = this.boardView.gridToWorld(x, y);
          bMesh.group.position.copy(worldPos);
          this.sceneManager.scene.add(bMesh.group);
          this.brickMeshesMap.set(brick.id, bMesh.group);
        }
      }
    }

    // 2. Wall Bricks (4 sides, 10 lanes, 3 layers)
    const sides = Object.keys(grid.walls);
    for (const side of sides) {
      for (let lane = 0; lane < grid.size; lane++) {
        for (let layer = 0; layer < grid.wallDepth; layer++) {
          const brick = grid.getWallBrick(side, lane, layer);
          if (brick) {
            const bMesh = this.createBrickMesh(brick);
            const worldPos = this.boardView.wallToWorld(side, lane, layer);
            bMesh.group.position.copy(worldPos);
            this.sceneManager.scene.add(bMesh.group);
            this.brickMeshesMap.set(brick.id, bMesh.group);
          }
        }
      }
    }
  }

  mount(parentContainer = this.container) {
    if (!this.wrapper.parentElement) {
      parentContainer.appendChild(this.wrapper);
    }
    this.wrapper.style.display = 'block';
    this.isMounted = true;
    this.sceneManager.onResize();
    this.sceneManager.startRenderLoop();
  }

  unmount() {
    this.isMounted = false;
    this.wrapper.style.display = 'none';
    this.sceneManager.stopRenderLoop();
    this.input.setEnabled(false);
  }

  setEnabled(enabled) {
    this.input.setEnabled(enabled);
  }

  triggerCameraShake(intensity) {
    this.sceneManager.triggerCameraShake(intensity);
  }

  async playTurnTimeline({ steps, soundSystem }) {
    return this.animator.playTurnTimeline({
      steps,
      boardView: this.boardView,
      brickMeshesMap: this.brickMeshesMap,
      scene: this.sceneManager.scene,
      createBrickMeshFn: (brick) => this.createBrickMesh(brick),
      soundSystem,
      particleSystem: this.particleSystem,
      onStepCallback: (step) => {
        if (this.onStepCallback) this.onStepCallback(step);
      },
    });
  }

  destroy() {
    this.unmount();
    this.clearAllBrickMeshes();
    if (this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }
  }
}
