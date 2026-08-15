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

    this.bricksRootGroup = new THREE.Group();
    this.sceneManager.scene.add(this.bricksRootGroup);

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
    // 1. Cancel running tweens
    this.animator.activeTweens = [];

    // 2. Reset input hover & aim line & ghost preview mesh
    if (this.input) this.input.clearHover();
    if (this.boardView) this.boardView.hideAimPreview();
    if (this.particleSystem) this.particleSystem.clear();

    // 3. Clean up brickMeshesMap
    this.brickMeshesMap.forEach((meshGroup) => {
      if (meshGroup.parent) meshGroup.parent.remove(meshGroup);
      const bMesh = meshGroup.userData?.brickMesh;
      if (bMesh) bMesh.dispose();
    });
    this.brickMeshesMap.clear();

    // 4. Clean up bricksRootGroup children
    if (this.bricksRootGroup) {
      while (this.bricksRootGroup.children.length > 0) {
        const child = this.bricksRootGroup.children[0];
        this.bricksRootGroup.remove(child);
        child.userData?.brickMesh?.dispose();
      }
    }

    // 5. Deep-clean any stray brick meshes that might have been attached directly to scene
    const strays = [];
    this.sceneManager.scene.traverse((obj) => {
      if (
        obj !== this.sceneManager.scene &&
        obj !== this.boardView.group &&
        obj !== this.bricksRootGroup &&
        obj.userData &&
        (obj.userData.brickId || obj.userData.brickMesh)
      ) {
        strays.push(obj);
      }
    });
    for (const stray of strays) {
      if (stray.parent) stray.parent.remove(stray);
      stray.userData?.brickMesh?.dispose();
    }
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
          this.bricksRootGroup.add(bMesh.group);
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
            this.bricksRootGroup.add(bMesh.group);
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
    this.input.clearHover();
    this.boardView.hideAimPreview();
    this.sceneManager.onResize();
    this.sceneManager.startRenderLoop();
  }

  unmount() {
    this.isMounted = false;
    this.input.clearHover();
    this.input.setEnabled(false);
    this.boardView.hideAimPreview();
    this.clearAllBrickMeshes();
    this.wrapper.style.display = 'none';
    this.sceneManager.stopRenderLoop();
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
      scene: this.bricksRootGroup,
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
