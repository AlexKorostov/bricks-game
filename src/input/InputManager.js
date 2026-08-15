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

    // 1. Primary: Raycast against dedicated 3D lane hitboxes for instant and reliable lane detection
    if (this.boardView && this.boardView.laneHitboxes && this.boardView.laneHitboxes.length > 0) {
      const hitboxIntersects = this.raycaster.intersectObjects(this.boardView.laneHitboxes, false);
      if (hitboxIntersects.length > 0) {
        const hit = hitboxIntersects[0];
        const { side, lane } = hit.object.userData;
        const brick = this.gameEngine.grid.getWallBrick(side, lane, 0);
        const group = brick ? this.brickMeshesMap.get(brick.id) : null;
        return { side, lane, brick, group };
      }
    }

    // 2. Fallback: Raycast against all wall brick meshes across all layers
    const clickableMeshes = [];
    const metaMap = new Map();

    const sides = Object.keys(this.gameEngine.grid.walls);
    for (const side of sides) {
      for (let lane = 0; lane < this.gameEngine.gridSize; lane++) {
        for (let layer = 0; layer < this.gameEngine.wallDepth; layer++) {
          const brick = this.gameEngine.grid.getWallBrick(side, lane, layer);
          if (brick) {
            const meshGroup = this.brickMeshesMap.get(brick.id);
            if (meshGroup) {
              meshGroup.traverse((child) => {
                if (child.isMesh) {
                  clickableMeshes.push(child);
                  metaMap.set(child, { side, lane });
                }
              });
            }
          }
        }
      }
    }

    const intersects = this.raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const { side, lane } = metaMap.get(hit.object);
      const brick = this.gameEngine.grid.getWallBrick(side, lane, 0);
      const group = brick ? this.brickMeshesMap.get(brick.id) : null;
      return { side, lane, brick, group };
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

      if (this.hoveredWallBrick && (this.hoveredWallBrick.side !== side || this.hoveredWallBrick.lane !== lane)) {
        this.clearHover();
      }

      this.hoveredWallBrick = { side, lane, brick, group };
      const bMesh = group ? group.userData?.brickMesh : null;
      if (bMesh) bMesh.setHover(true);

      const colorConfig = COLOR_CONFIG[brick?.color] || COLOR_CONFIG.crimson;
      const startWorldPos = group ? group.position : this.boardView.wallToWorld(side, lane, 0);
      this.boardView.showAimPreview(startWorldPos, preview, colorConfig.hex, side, lane);

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
      const group = this.hoveredWallBrick.group;
      const bMesh = group ? group.userData?.brickMesh : null;
      if (bMesh) bMesh.setHover(false);
      this.hoveredWallBrick = null;
    }
    // Defensively ensure no brick mesh remains in elevated hover state
    if (this.brickMeshesMap) {
      this.brickMeshesMap.forEach((g) => {
        const bm = g.userData?.brickMesh;
        if (bm && bm.mesh && bm.mesh.position.y !== bm.height / 2) {
          bm.setHover(false);
        }
      });
    }
    this.boardView.hideAimPreview();
  }
}
