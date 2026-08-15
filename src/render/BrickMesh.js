// src/render/BrickMesh.js
import * as THREE from 'three';
import { COLOR_CONFIG } from '../core/Constants.js';

// Cache generated direction textures to avoid recreating canvas
const textureCache = new Map();

function createDirectionTexture(directionName) {
  if (textureCache.has(directionName)) {
    return textureCache.get(directionName);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 128);

  // High-contrast beveled border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 116);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 64;
  const cy = 64;

  if (directionName === 'NORTH') {
    ctx.beginPath();
    ctx.moveTo(cx, 28);
    ctx.lineTo(cx - 26, 68);
    ctx.lineTo(cx - 11, 68);
    ctx.lineTo(cx - 11, 98);
    ctx.lineTo(cx + 11, 98);
    ctx.lineTo(cx + 11, 68);
    ctx.lineTo(cx + 26, 68);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'SOUTH') {
    ctx.beginPath();
    ctx.moveTo(cx, 100);
    ctx.lineTo(cx - 26, 60);
    ctx.lineTo(cx - 11, 60);
    ctx.lineTo(cx - 11, 30);
    ctx.lineTo(cx + 11, 30);
    ctx.lineTo(cx + 11, 60);
    ctx.lineTo(cx + 26, 60);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'EAST') {
    ctx.beginPath();
    ctx.moveTo(100, cy);
    ctx.lineTo(60, cy - 26);
    ctx.lineTo(60, cy - 11);
    ctx.lineTo(30, cy - 11);
    ctx.lineTo(30, cy + 11);
    ctx.lineTo(60, cy + 11);
    ctx.lineTo(60, cy + 26);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'WEST') {
    ctx.beginPath();
    ctx.moveTo(28, cy);
    ctx.lineTo(68, cy - 26);
    ctx.lineTo(68, cy - 11);
    ctx.lineTo(98, cy - 11);
    ctx.lineTo(98, cy + 11);
    ctx.lineTo(68, cy + 11);
    ctx.lineTo(68, cy + 26);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else {
    // Static center brick: high-contrast center jewel pip
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(directionName, texture);
  return texture;
}

export class BrickMesh {
  /**
   * @param {Brick} brick
   * @param {number} [cellSize=1.0]
   */
  constructor(brick, cellSize = 1.0) {
    this.brick = brick;
    this.cellSize = cellSize;
    this.brickSize = cellSize * 0.88;
    this.height = cellSize * 0.55;

    this.group = new THREE.Group();
    this.group.userData = { brickId: brick.id, brickMesh: this };

    this.createMesh();
  }

  createMesh() {
    const config = COLOR_CONFIG[this.brick.color] || COLOR_CONFIG.crimson;
    const geometry = new THREE.BoxGeometry(this.brickSize, this.height, this.brickSize);

    // High-contrast physical material with rich clearcoat
    const baseMat = new THREE.MeshStandardMaterial({
      color: config.threeColor,
      roughness: 0.2,
      metalness: 0.1,
    });

    const topTexture = createDirectionTexture(this.brick.direction.name);
    const topMat = new THREE.MeshStandardMaterial({
      color: config.threeColor,
      map: topTexture,
      roughness: 0.15,
      metalness: 0.08,
    });

    this.materials = [
      baseMat.clone(),
      baseMat.clone(),
      topMat,
      baseMat.clone(),
      baseMat.clone(),
      baseMat.clone(),
    ];

    this.mesh = new THREE.Mesh(geometry, this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.y = this.height / 2;

    this.group.add(this.mesh);
  }

  updateDirection(direction) {
    this.brick.setDirection(direction);
    const config = COLOR_CONFIG[this.brick.color] || COLOR_CONFIG.crimson;
    const topTexture = createDirectionTexture(direction.name);

    this.materials[2].map = topTexture;
    this.materials[2].color.setHex(config.threeColor);
    this.materials[2].needsUpdate = true;
  }

  setHover(isHovered) {
    const config = COLOR_CONFIG[this.brick.color] || COLOR_CONFIG.crimson;
    if (isHovered) {
      this.mesh.position.y = this.height / 2 + 0.18;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(config.threeColor);
        mat.emissiveIntensity = 0.55;
      });
    } else {
      this.mesh.position.y = this.height / 2;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      });
    }
  }

  setDimmed(isDimmed) {
    this.materials.forEach((mat) => {
      mat.opacity = isDimmed ? 0.35 : 1.0;
      mat.transparent = isDimmed;
    });
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.materials.forEach((mat) => mat.dispose());
  }
}
