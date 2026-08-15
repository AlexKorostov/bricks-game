// src/render/BoardView.js
import * as THREE from 'three';
import { GRID_SIZE, WALL_DEPTH, WALL_SIDES } from '../core/Constants.js';

export class BoardView {
  constructor(cellSize = 1.0) {
    this.cellSize = cellSize;
    this.gridSize = GRID_SIZE;
    this.wallDepth = WALL_DEPTH;

    this.group = new THREE.Group();

    this.createBoardBase();
    this.createAimIndicator();
    this.createGhostPreview();
    this.createLaneHitboxes();
  }

  createLaneHitboxes() {
    this.laneHitboxes = [];
    const hitboxMaterial = new THREE.MeshBasicMaterial({
      visible: false, // Invisible to rendering, fully active for Raycaster
    });

    const sides = [WALL_SIDES.TOP, WALL_SIDES.BOTTOM, WALL_SIDES.LEFT, WALL_SIDES.RIGHT];
    const boxHeight = this.cellSize * 0.58;
    const posY = boxHeight / 2;

    for (const side of sides) {
      for (let lane = 0; lane < this.gridSize; lane++) {
        let width, depth, posX, posZ;
        const p0 = this.wallToWorld(side, lane, 0);
        const pLast = this.wallToWorld(side, lane, this.wallDepth - 1);

        if (side === WALL_SIDES.TOP || side === WALL_SIDES.BOTTOM) {
          width = this.cellSize * 0.98;
          depth = this.wallDepth * this.cellSize;
          posX = p0.x;
          posZ = (p0.z + pLast.z) / 2;
        } else {
          width = this.wallDepth * this.cellSize;
          depth = this.cellSize * 0.98;
          posX = (p0.x + pLast.x) / 2;
          posZ = p0.z;
        }

        const geom = new THREE.BoxGeometry(width, boxHeight, depth);
        const mesh = new THREE.Mesh(geom, hitboxMaterial);
        mesh.position.set(posX, posY, posZ);
        mesh.userData = { side, lane, isLaneHitbox: true };
        this.group.add(mesh);
        this.laneHitboxes.push(mesh);
      }
    }
  }

  gridToWorld(gx, gy) {
    const half = (this.gridSize - 1) / 2;
    const wx = (gx - half) * this.cellSize;
    const wz = (gy - half) * this.cellSize;
    return new THREE.Vector3(wx, 0, wz);
  }

  wallToWorld(side, lane, layer) {
    let gx, gy;
    switch (side) {
      case WALL_SIDES.TOP:
        gx = lane;
        gy = -1 - layer;
        break;
      case WALL_SIDES.BOTTOM:
        gx = lane;
        gy = this.gridSize + layer;
        break;
      case WALL_SIDES.LEFT:
        gx = -1 - layer;
        gy = lane;
        break;
      case WALL_SIDES.RIGHT:
        gx = this.gridSize + layer;
        gy = lane;
        break;
      default:
        gx = 0;
        gy = 0;
    }
    return this.gridToWorld(gx, gy);
  }

  createBoardBase() {
    const fieldSize = this.gridSize * this.cellSize;
    const fieldGeometry = new THREE.BoxGeometry(fieldSize + 0.1, 0.3, fieldSize + 0.1);
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      roughness: 0.88,
      metalness: 0.12,
    });
    const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
    fieldMesh.position.y = -0.16;
    fieldMesh.receiveShadow = true;
    this.group.add(fieldMesh);

    const gridHelper = new THREE.GridHelper(fieldSize, this.gridSize, 0x334155, 0x1e293b);
    gridHelper.position.y = 0.005;
    this.group.add(gridHelper);

    const frameSize = (this.gridSize + this.wallDepth * 2 + 0.8) * this.cellSize;
    const frameGeometry = new THREE.BoxGeometry(frameSize, 0.4, frameSize);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.95,
      metalness: 0.05,
    });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.y = -0.22;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.85,
      metalness: 0.1,
    });

    const createTray = (width, depth, posX, posZ) => {
      const geom = new THREE.BoxGeometry(width, 0.25, depth);
      const mesh = new THREE.Mesh(geom, wallMat);
      mesh.position.set(posX, -0.14, posZ);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };

    const wallThickness = this.wallDepth * this.cellSize;
    const halfSpan = (this.gridSize / 2) * this.cellSize;
    const wallOffset = halfSpan + wallThickness / 2 + 0.1;

    createTray(fieldSize, wallThickness, 0, -wallOffset);
    createTray(fieldSize, wallThickness, 0, wallOffset);
    createTray(wallThickness, fieldSize, -wallOffset, 0);
    createTray(wallThickness, fieldSize, wallOffset, 0);
  }

  createAimIndicator() {
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(0, 0.2, 1),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.35,
      gapSize: 0.15,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    this.aimLine = new THREE.Line(lineGeom, lineMat);
    this.aimLine.computeLineDistances();
    this.aimLine.visible = false;
    this.group.add(this.aimLine);
  }

  createGhostPreview() {
    const brickSize = this.cellSize * 0.88;
    const geom = new THREE.BoxGeometry(brickSize, this.cellSize * 0.55, brickSize);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.ghostMesh = new THREE.Mesh(geom, mat);
    this.ghostMesh.position.y = (this.cellSize * 0.55) / 2 + 0.02;
    this.ghostMesh.visible = false;
    this.group.add(this.ghostMesh);
  }

  showAimPreview(startWorldPos, preview, colorHex = '#38bdf8', side = null, lane = null) {
    if (!preview) {
      this.hideAimPreview();
      return;
    }

    let endWorldPos = null;
    let showGhost = false;

    if (preview.canLaunch && preview.landingCell) {
      endWorldPos = this.gridToWorld(preview.landingCell.x, preview.landingCell.y);
      showGhost = true;
    } else if (side !== null && lane !== null) {
      let oppSide = null;
      switch (side) {
        case WALL_SIDES.TOP:
          oppSide = WALL_SIDES.BOTTOM;
          break;
        case WALL_SIDES.BOTTOM:
          oppSide = WALL_SIDES.TOP;
          break;
        case WALL_SIDES.LEFT:
          oppSide = WALL_SIDES.RIGHT;
          break;
        case WALL_SIDES.RIGHT:
          oppSide = WALL_SIDES.LEFT;
          break;
      }
      if (oppSide) {
        endWorldPos = this.wallToWorld(oppSide, lane, 0);
        showGhost = false;
      }
    }

    if (!endWorldPos) {
      this.hideAimPreview();
      return;
    }

    const points = [
      new THREE.Vector3(startWorldPos.x, 0.25, startWorldPos.z),
      new THREE.Vector3(endWorldPos.x, 0.25, endWorldPos.z),
    ];
    this.aimLine.geometry.setFromPoints(points);
    this.aimLine.computeLineDistances();
    this.aimLine.material.color.set(colorHex);
    this.aimLine.material.opacity = preview.canLaunch ? 0.85 : 0.45;
    this.aimLine.visible = true;

    if (showGhost) {
      this.ghostMesh.position.set(endWorldPos.x, (this.cellSize * 0.55) / 2 + 0.02, endWorldPos.z);
      this.ghostMesh.material.color.set(colorHex);
      this.ghostMesh.visible = true;
    } else {
      this.ghostMesh.visible = false;
    }
  }

  hideAimPreview() {
    this.aimLine.visible = false;
    this.ghostMesh.visible = false;
  }
}
