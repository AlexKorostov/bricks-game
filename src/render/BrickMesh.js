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
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  // High-contrast beveled outer border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 232, 232);

  // Subtle inner beveled shadow rim
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 216, 216);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 128;
  const cy = 128;

  if (directionName === 'NORTH') {
    ctx.beginPath();
    ctx.moveTo(cx, 52);
    ctx.lineTo(cx - 54, 136);
    ctx.lineTo(cx - 24, 136);
    ctx.lineTo(cx - 24, 200);
    ctx.lineTo(cx + 24, 200);
    ctx.lineTo(cx + 24, 136);
    ctx.lineTo(cx + 54, 136);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'SOUTH') {
    ctx.beginPath();
    ctx.moveTo(cx, 204);
    ctx.lineTo(cx - 54, 120);
    ctx.lineTo(cx - 24, 120);
    ctx.lineTo(cx - 24, 56);
    ctx.lineTo(cx + 24, 56);
    ctx.lineTo(cx + 24, 120);
    ctx.lineTo(cx + 54, 120);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'EAST') {
    ctx.beginPath();
    ctx.moveTo(204, cy);
    ctx.lineTo(120, cy - 54);
    ctx.lineTo(120, cy - 24);
    ctx.lineTo(56, cy - 24);
    ctx.lineTo(56, cy + 24);
    ctx.lineTo(120, cy + 24);
    ctx.lineTo(120, cy + 54);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else if (directionName === 'WEST') {
    ctx.beginPath();
    ctx.moveTo(52, cy);
    ctx.lineTo(136, cy - 54);
    ctx.lineTo(136, cy - 24);
    ctx.lineTo(200, cy - 24);
    ctx.lineTo(200, cy + 24);
    ctx.lineTo(136, cy + 24);
    ctx.lineTo(136, cy + 54);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  } else {
    // Static center brick: high-contrast center jewel pip with specular glint
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

    // Glossy Acrylic Arcade Jewel physical material
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: config.threeColor,
      emissive: config.threeColor,
      emissiveIntensity: 0.05,
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.75,
    });

    const topTexture = createDirectionTexture(this.brick.direction.name);
    const topMat = new THREE.MeshPhysicalMaterial({
      color: config.threeColor,
      map: topTexture,
      emissive: config.threeColor,
      emissiveIntensity: 0.05,
      roughness: 0.10,
      metalness: 0.04,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.75,
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
    this.materials[2].emissive.setHex(config.threeColor);
    this.materials[2].emissiveIntensity = 0.05;
    this.materials[2].needsUpdate = true;
  }

  setHover(isHovered) {
    const config = COLOR_CONFIG[this.brick.color] || COLOR_CONFIG.crimson;
    if (isHovered) {
      this.mesh.position.y = this.height / 2 + 0.18;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(config.threeColor);
        mat.emissiveIntensity = 0.65;
        mat.clearcoat = 1.0;
        mat.roughness = 0.06;
      });
    } else {
      this.mesh.position.y = this.height / 2;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(config.threeColor);
        mat.emissiveIntensity = 0.05;
        mat.clearcoat = 0.95;
        mat.roughness = 0.12;
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
