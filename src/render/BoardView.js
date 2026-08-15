// src/render/BoardView.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
      color: 0x16243b,
      roughness: 0.85,
      metalness: 0.08,
    });
    const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
    fieldMesh.position.y = -0.16;
    fieldMesh.receiveShadow = true;
    this.group.add(fieldMesh);

    const gridHelper = new THREE.GridHelper(fieldSize, this.gridSize, 0x475569, 0x27364f);
    gridHelper.position.y = 0.005;
    this.group.add(gridHelper);

    const frameSize = (this.gridSize + this.wallDepth * 2 + 0.8) * this.cellSize;
    const frameGeometry = new THREE.BoxGeometry(frameSize, 0.4, frameSize);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x090f1a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.y = -0.22;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0e1726,
      roughness: 0.85,
      metalness: 0.08,
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
    // 1. Wide Central Laser Beam (bold, prominent line in the brick's matching color)
    const beamGeom = new THREE.PlaneGeometry(1, 1);
    beamGeom.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.aimBeam = new THREE.Mesh(beamGeom, beamMat);
    this.aimBeam.position.y = 0.020;
    this.aimBeam.visible = false;
    this.group.add(this.aimBeam);

    // 2. High-Intensity Laser Core Line
    const coreGeom = new THREE.PlaneGeometry(1, 1);
    coreGeom.rotateX(-Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.aimCore = new THREE.Mesh(coreGeom, coreMat);
    this.aimCore.position.y = 0.022;
    this.aimCore.visible = false;
    this.group.add(this.aimCore);
  }

  createGhostPreview() {
    const brickSize = this.cellSize * 0.88;
    const height = this.cellSize * 0.55;
    const geom = new RoundedBoxGeometry(brickSize, height, brickSize, 5, 0.16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this.ghostMesh = new THREE.Mesh(geom, mat);
    this.ghostMesh.position.y = height / 2 + 0.02;
    this.ghostMesh.visible = false;

    // Glowing edge wireframe (thresholdAngle: 24 prevents internal tessellation lines on fillets)
    const edges = new THREE.EdgesGeometry(geom, 24);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this.ghostWire = new THREE.LineSegments(edges, lineMat);
    this.ghostMesh.add(this.ghostWire);

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

    const midX = (startWorldPos.x + endWorldPos.x) / 2;
    const midZ = (startWorldPos.z + endWorldPos.z) / 2;
    const dx = endWorldPos.x - startWorldPos.x;
    const dz = endWorldPos.z - startWorldPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.05) {
      const isHorizontal = Math.abs(dx) >= Math.abs(dz);
      const beamWidth = this.cellSize * 0.20;
      const coreWidth = this.cellSize * 0.08;

      this.aimBeam.position.set(midX, 0.020, midZ);
      this.aimCore.position.set(midX, 0.022, midZ);

      if (isHorizontal) {
        this.aimBeam.scale.set(dist, 1, beamWidth);
        this.aimCore.scale.set(dist, 1, coreWidth);
      } else {
        this.aimBeam.scale.set(beamWidth, 1, dist);
        this.aimCore.scale.set(coreWidth, 1, dist);
      }

      this.aimBeam.material.color.set(colorHex);
      this.aimBeam.material.opacity = preview.canLaunch ? 0.85 : 0.40;
      this.aimBeam.visible = true;

      this.aimCore.material.color.set(colorHex);
      this.aimCore.material.opacity = preview.canLaunch ? 0.95 : 0.50;
      this.aimCore.visible = true;
    } else {
      this.aimBeam.visible = false;
      this.aimCore.visible = false;
    }

    if (showGhost) {
      const height = this.cellSize * 0.55;
      this.ghostMesh.position.set(endWorldPos.x, height / 2 + 0.02, endWorldPos.z);
      this.ghostMesh.material.color.set(colorHex);
      this.ghostWire.material.color.set(colorHex);
      this.ghostMesh.visible = true;
    } else {
      this.ghostMesh.visible = false;
    }
  }

  hideAimPreview() {
    if (this.aimBeam) this.aimBeam.visible = false;
    if (this.aimCore) this.aimCore.visible = false;
    if (this.ghostMesh) this.ghostMesh.visible = false;
  }
}
