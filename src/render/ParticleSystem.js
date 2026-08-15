// src/render/ParticleSystem.js
import * as THREE from 'three';
import { COLOR_CONFIG } from '../core/Constants.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeEmitters = [];
  }

  /**
   * Spawns a 3D explosion burst at world position.
   * @param {THREE.Vector3} position
   * @param {string} colorKey
   * @param {number} [count=24]
   */
  spawnBurst(position, colorKey, count = 24) {
    const config = COLOR_CONFIG[colorKey] || COLOR_CONFIG.crimson;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x;
      positions[i * 3 + 1] = position.y + 0.2;
      positions[i * 3 + 2] = position.z;

      // Random spherical velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      const upSpeed = 1.0 + Math.random() * 2.0;

      velocities.push({
        vx: Math.cos(angle) * speed,
        vy: upSpeed,
        vz: Math.sin(angle) * speed,
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: config.threeColor,
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const pSystem = new THREE.Points(geom, mat);
    this.scene.add(pSystem);

    this.activeEmitters.push({
      mesh: pSystem,
      velocities,
      count,
      age: 0,
      maxAge: 0.45,
    });
  }

  update(dt) {
    for (let i = this.activeEmitters.length - 1; i >= 0; i--) {
      const emitter = this.activeEmitters[i];
      emitter.age += dt;

      const progress = emitter.age / emitter.maxAge;
      if (progress >= 1.0) {
        this.scene.remove(emitter.mesh);
        emitter.mesh.geometry.dispose();
        emitter.mesh.material.dispose();
        this.activeEmitters.splice(i, 1);
        continue;
      }

      // Update particle positions
      const posAttr = emitter.mesh.geometry.attributes.position;
      const positions = posAttr.array;

      for (let j = 0; j < emitter.count; j++) {
        const vel = emitter.velocities[j];
        vel.vy -= 9.8 * dt * 0.5; // gravity

        positions[j * 3 + 0] += vel.vx * dt;
        positions[j * 3 + 1] += vel.vy * dt;
        positions[j * 3 + 2] += vel.vz * dt;
      }

      posAttr.needsUpdate = true;
      emitter.mesh.material.opacity = Math.max(0, 1.0 - progress);
    }
  }

  clear() {
    this.activeEmitters.forEach((emitter) => {
      this.scene.remove(emitter.mesh);
      emitter.mesh.geometry.dispose();
      emitter.mesh.material.dispose();
    });
    this.activeEmitters = [];
  }
}
