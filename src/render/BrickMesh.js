// src/render/BrickMesh.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLOR_CONFIG } from '../core/Constants.js';

// Cache generated direction textures to avoid recreating canvas
const textureCache = new Map();

const EXACT_3D_PALETTE = {
  crimson: {
    hex: '#e60026',
    threeColor: 0xe60026,
    cavity: '#2b0007',
    cavityGrad: '#45000c',
    shadow: 'rgba(0, 0, 0, 0.85)',
    highlight: 'rgba(255, 255, 255, 0.45)',
  },
  cobalt: {
    hex: '#2962ff',
    threeColor: 0x2962ff,
    cavity: '#040b2b',
    cavityGrad: '#091b5c',
    shadow: 'rgba(0, 0, 0, 0.85)',
    highlight: 'rgba(255, 255, 255, 0.45)',
  },
  emerald: {
    hex: '#00c853',
    threeColor: 0x00c853,
    cavity: '#001c09',
    cavityGrad: '#003d15',
    shadow: 'rgba(0, 0, 0, 0.85)',
    highlight: 'rgba(255, 255, 255, 0.45)',
  },
  amber: {
    hex: '#ffd600',
    threeColor: 0xffd600,
    cavity: '#2b2400',
    cavityGrad: '#4d4000',
    shadow: 'rgba(0, 0, 0, 0.85)',
    highlight: 'rgba(255, 255, 255, 0.65)',
  },
};

function buildArrowPath(ctx, directionName, cx, cy) {
  ctx.beginPath();
  if (directionName === 'NORTH') {
    ctx.moveTo(cx, cy - 64);
    ctx.lineTo(cx - 52, cy + 16);
    ctx.lineTo(cx - 22, cy + 16);
    ctx.lineTo(cx - 22, cy + 68);
    ctx.lineTo(cx + 22, cy + 68);
    ctx.lineTo(cx + 22, cy + 16);
    ctx.lineTo(cx + 52, cy + 16);
  } else if (directionName === 'SOUTH') {
    ctx.moveTo(cx, cy + 64);
    ctx.lineTo(cx - 52, cy - 16);
    ctx.lineTo(cx - 22, cy - 16);
    ctx.lineTo(cx - 22, cy - 68);
    ctx.lineTo(cx + 22, cy - 68);
    ctx.lineTo(cx + 22, cy - 16);
    ctx.lineTo(cx + 52, cy - 16);
  } else if (directionName === 'EAST') {
    ctx.moveTo(cx + 64, cy);
    ctx.lineTo(cx - 16, cy - 52);
    ctx.lineTo(cx - 16, cy - 22);
    ctx.lineTo(cx - 68, cy - 22);
    ctx.lineTo(cx - 68, cy + 22);
    ctx.lineTo(cx - 16, cy + 22);
    ctx.lineTo(cx - 16, cy + 52);
  } else if (directionName === 'WEST') {
    ctx.moveTo(cx - 64, cy);
    ctx.lineTo(cx + 16, cy - 52);
    ctx.lineTo(cx + 16, cy - 22);
    ctx.lineTo(cx + 68, cy - 22);
    ctx.lineTo(cx + 68, cy + 22);
    ctx.lineTo(cx + 16, cy + 22);
    ctx.lineTo(cx + 16, cy + 52);
  }
  ctx.closePath();
}

function createDirectionTexture(directionName, colorKey = 'crimson') {
  const cacheKey = `${directionName}_${colorKey}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const style = EXACT_3D_PALETTE[colorKey] || EXACT_3D_PALETTE.crimson;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 1. Uniform solid color face matching 2D mode
  ctx.fillStyle = style.hex;
  ctx.fillRect(0, 0, 256, 256);

  // 2. High-contrast rounded beveled outer border highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(10, 10, 236, 236, 48);
  } else {
    ctx.rect(10, 10, 236, 236);
  }
  ctx.stroke();

  // Subtle dark inner bevel line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(18, 18, 220, 220, 40);
  } else {
    ctx.rect(18, 18, 220, 220);
  }
  ctx.stroke();

  // 3. If directional brick: render arrow as a deep carved/sunken indent
  const cx = 128;
  const cy = 128;

  if (directionName === 'NORTH' || directionName === 'SOUTH' || directionName === 'EAST' || directionName === 'WEST') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Step A: Bottom-Right Specular Lip (Highlight edge catching light)
    buildArrowPath(ctx, directionName, cx + 2, cy + 3.5);
    ctx.strokeStyle = style.highlight;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Step B: Top-Left Dark Cast Shadow (Sunken edge drop shadow)
    buildArrowPath(ctx, directionName, cx - 1.5, cy - 2.5);
    ctx.fillStyle = style.shadow;
    ctx.fill();

    // Step C: Carved Recessed Cavity (Deep dark version of the brick's color)
    buildArrowPath(ctx, directionName, cx, cy);
    const grad = ctx.createLinearGradient(cx, cy - 70, cx, cy + 70);
    grad.addColorStop(0, style.cavity);
    grad.addColorStop(1, style.cavityGrad);
    ctx.fillStyle = grad;
    ctx.fill();

    // Step D: Deep inner shadow stroke
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // Static bricks have a clean, solid jewel face with zero markings (matching 2D mode)

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
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
    const style = EXACT_3D_PALETTE[this.brick.color] || EXACT_3D_PALETTE.crimson;
    // Pronounced rounded box geometry for smooth, rounded tile feel
    const geometry = new RoundedBoxGeometry(this.brickSize, this.height, this.brickSize, 5, 0.16);

    // Refined, calm satiny physical material
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: style.threeColor,
      emissive: style.threeColor,
      emissiveIntensity: 0.0,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      reflectivity: 0.50,
    });

    const topTexture = createDirectionTexture(this.brick.direction.name, this.brick.color);
    const topMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: topTexture,
      emissive: style.threeColor,
      emissiveIntensity: 0.0,
      roughness: 0.25,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      reflectivity: 0.50,
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
    const style = EXACT_3D_PALETTE[this.brick.color] || EXACT_3D_PALETTE.crimson;
    const topTexture = createDirectionTexture(direction.name, this.brick.color);

    this.materials[2].map = topTexture;
    this.materials[2].color.setHex(0xffffff);
    this.materials[2].emissive.setHex(style.threeColor);
    this.materials[2].emissiveIntensity = 0.0;
    this.materials[2].needsUpdate = true;
  }

  setHover(isHovered) {
    const style = EXACT_3D_PALETTE[this.brick.color] || EXACT_3D_PALETTE.crimson;
    if (isHovered) {
      this.mesh.position.y = this.height / 2 + 0.18;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(style.threeColor);
        mat.emissiveIntensity = 0.55;
        mat.clearcoat = 1.0;
        mat.roughness = 0.10;
      });
    } else {
      this.mesh.position.y = this.height / 2;
      this.materials.forEach((mat) => {
        mat.emissive.setHex(style.threeColor);
        mat.emissiveIntensity = 0.0;
        mat.clearcoat = 0.65;
        mat.roughness = 0.28;
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
