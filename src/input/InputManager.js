// src/input/InputManager.js
import * as THREE from 'three';
import { COLOR_CONFIG } from '../core/Constants.js';

export class InputManager {
  /**
   * @param {HTMLElement} domElement - Canvas container
   * @param {THREE.Camera} camera
   * @param {GameEngine} gameEngine
   * @param {BoardView} boardView
   * @param {Map<string, THREE.Group>} brickMeshesMap
   * @param {Function} onLaunchCallback - (side, lane) => void
   */
  constructor({ domElement, camera, gameEngine, boardView, brickMeshesMap, onLaunchCallback }) {
    this.domElement = domElement;
    this.camera = camera;
    this.gameEngine = gameEngine;
    this.boardView = boardView;
    this.brickMeshesMap = brickMeshesMap;
    this.onLaunchCallback = onLaunchCallback;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredWallBrick = null;
    this.enabled = true;

    this.initEvents();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.clearHover();
      this.domElement.style.cursor = 'default';
    }
  }

  initEvents() {
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointerleave', this.clearHover.bind(this));
  }

  updateMouseCoords(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  findIntersectedWallBrick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickableMeshes = [];
    const metaMap = new Map();

    const sides = Object.keys(this.gameEngine.grid.walls);
    for (const side of sides) {
      for (let lane = 0; lane < this.gameEngine.gridSize; lane++) {
        const brick = this.gameEngine.grid.getWallBrick(side, lane, 0);
        if (brick) {
          const meshGroup = this.brickMeshesMap.get(brick.id);
          if (meshGroup) {
            meshGroup.traverse((child) => {
              if (child.isMesh) {
                clickableMeshes.push(child);
                metaMap.set(child, { side, lane, brick, group: meshGroup });
              }
            });
          }
        }
      }
    }

    const intersects = this.raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const meta = metaMap.get(hit.object);
      return meta || null;
    }
    return null;
  }

  onPointerMove(event) {
    if (!this.enabled || this.gameEngine.state !== 'READY') {
      this.clearHover();
      return;
    }

    this.updateMouseCoords(event);
    const hit = this.findIntersectedWallBrick();

    if (hit) {
      const { side, lane, brick, group } = hit;
      const preview = this.gameEngine.getLaunchPreview(side, lane);

      if (this.hoveredWallBrick && this.hoveredWallBrick.brick.id !== brick.id) {
        this.clearHover();
      }

      this.hoveredWallBrick = hit;
      const bMesh = group.userData.brickMesh;
      if (bMesh) bMesh.setHover(true);

      const config = COLOR_CONFIG[brick.color] || COLOR_CONFIG.crimson;
      this.boardView.showAimPreview(group.position, preview, config.hex, side, lane);

      if (preview.canLaunch) {
        this.domElement.style.cursor = 'pointer';
      } else {
        this.domElement.style.cursor = 'not-allowed';
      }
    } else {
      this.clearHover();
      this.domElement.style.cursor = 'default';
    }
  }

  onPointerDown(event) {
    if (!this.enabled || this.gameEngine.state !== 'READY') return;

    this.updateMouseCoords(event);
    const hit = this.findIntersectedWallBrick();

    if (hit) {
      const { side, lane } = hit;
      const preview = this.gameEngine.getLaunchPreview(side, lane);
      if (preview.canLaunch) {
        this.clearHover();
        if (this.onLaunchCallback) {
          this.onLaunchCallback(side, lane);
        }
      }
    }
  }

  clearHover() {
    if (this.hoveredWallBrick) {
      const bMesh = this.hoveredWallBrick.group.userData.brickMesh;
      if (bMesh) bMesh.setHover(false);
      this.hoveredWallBrick = null;
    }
    this.boardView.hideAimPreview();
  }
}
