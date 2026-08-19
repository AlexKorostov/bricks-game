// src/render/ParticleSystem.js
import * as THREE from 'three';
import { COLOR_CONFIG } from '../core/Constants.js';

const CONFETTI_PALETTE = [
  new THREE.Color(0xe60026), // Fire Red
  new THREE.Color(0x2962ff), // Cobalt Blue
  new THREE.Color(0x00c853), // Emerald Green
  new THREE.Color(0xffd600), // Bright Gold
  new THREE.Color(0xffffff), // Glitter White
  new THREE.Color(0xff9100), // Radiant Orange
  new THREE.Color(0x00e5ff), // Electric Cyan
];

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeEmitters = [];
  }

  /**
   * Spawns a standard 3D explosion burst at world position (for match pops).
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
      type: 'burst',
      mesh: pSystem,
      velocities,
      count,
      age: 0,
      maxAge: 0.45,
    });
  }

  /**
   * Spawns a high-energy 3D firework burst with radial sparks and shimmering trails.
   * @param {THREE.Vector3} position
   * @param {string} colorKey
   * @param {number} [count=75]
   */
  spawnFirework(position, colorKey, count = 75) {
    const config = COLOR_CONFIG[colorKey] || COLOR_CONFIG.amber;
    const baseColor = new THREE.Color(config.threeColor);
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Golden or white spark accents mixed with the main firework color
      const isGlitter = Math.random() < 0.25;
      const col = isGlitter ? new THREE.Color(0xfffae0) : baseColor;
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Uniform spherical radial velocity with variable burst radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 2.8 + Math.random() * 4.2;

      velocities.push({
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.cos(phi) * speed * 0.9 + 0.8,
        vz: Math.sin(phi) * Math.sin(theta) * speed,
        drag: 0.94 + Math.random() * 0.03,
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.26,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pSystem = new THREE.Points(geom, mat);
    this.scene.add(pSystem);

    this.activeEmitters.push({
      type: 'firework',
      mesh: pSystem,
      velocities,
      count,
      age: 0,
      maxAge: 0.95,
    });
  }

  /**
   * Spawns an expanding 3D ground shockwave ring.
   * @param {THREE.Vector3} position
   * @param {number} [maxRadius=15.0]
   * @param {number} [duration=0.65]
   */
  spawnShockwave(position, maxRadius = 15.0, duration = 0.65) {
    const geom = new THREE.RingGeometry(0.15, 0.75, 64);
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.activeEmitters.push({
      type: 'shockwave',
      mesh,
      maxRadius,
      age: 0,
      maxAge: duration,
    });
  }

  /**
   * Spawns dense fluttering multicolored 3D confetti ribbons (1x4 aspect ratio with vertical tumbling and angled drift).
   * @param {number} [count=180]
   * @param {number} [duration=2.4]
   */
  spawnConfettiShower(count = 240, duration = 2.5) {
    // 1 width * 4 height rectangular ribbon geometry
    const ribbonWidth = 0.16;
    const ribbonHeight = 0.64;
    const geom = new THREE.PlaneGeometry(ribbonWidth, ribbonHeight);
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const instancedMesh = new THREE.InstancedMesh(geom, mat, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const particles = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      // Wide canopy spanning the full 10x10 field, all 4 walls, and full positive Z (bottom of grid/screen)
      const startX = (Math.random() - 0.5) * 16.5;
      const startY = 4.5 + Math.random() * 4.0;
      const startZ = -8.0 + Math.random() * 18.0; // Spans Z from -8.0 (top wall) to +10.0 (bottom wall & bottom screen)

      const col = CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)];
      instancedMesh.setColorAt(i, col);

      // Angled trajectory & aerodynamic glide velocity
      const driftAngle = Math.random() * Math.PI * 2;
      const driftSpeed = 0.4 + Math.random() * 1.0;
      const driftVx = Math.cos(driftAngle) * driftSpeed;
      const driftVz = Math.sin(driftAngle) * driftSpeed;

      particles.push({
        baseX: startX,
        baseY: startY,
        baseZ: startZ,
        driftVx,
        driftVz,
        fallSpeed: 1.6 + Math.random() * 1.5,
        // Vertical end-over-end tumbling (pitch), roll, and yaw
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: 4.5 + Math.random() * 7.5, // Rapid vertical end-over-end tumble
        rotSpeedY: 2.0 + Math.random() * 4.0, // Horizontal yaw
        rotSpeedZ: 3.0 + Math.random() * 5.5, // Flutter roll
        swaySpeed: 3.2 + Math.random() * 2.8,
        swayAmp: 0.25 + Math.random() * 0.40,
        swayPhase: Math.random() * Math.PI * 2,
      });

      dummy.position.set(startX, startY, startZ);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(instancedMesh);

    this.activeEmitters.push({
      type: 'confetti-ribbon',
      mesh: instancedMesh,
      particles,
      dummy,
      count,
      age: 0,
      maxAge: duration,
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

      if (emitter.type === 'confetti-ribbon') {
        const dummy = emitter.dummy;
        for (let j = 0; j < emitter.count; j++) {
          const p = emitter.particles[j];
          // Angled drift + aerodynamic fall + horizontal sway
          const curY = p.baseY - p.fallSpeed * emitter.age;
          const curX = p.baseX + p.driftVx * emitter.age + Math.sin(emitter.age * p.swaySpeed + p.swayPhase) * p.swayAmp;
          const curZ = p.baseZ + p.driftVz * emitter.age + Math.cos(emitter.age * p.swaySpeed + p.swayPhase) * p.swayAmp;

          dummy.position.set(curX, Math.max(-0.15, curY), curZ);

          // Realistic 3D vertical tumbling rotation & flutter
          dummy.rotation.x = p.rotX + emitter.age * p.rotSpeedX;
          dummy.rotation.y = p.rotY + emitter.age * p.rotSpeedY;
          dummy.rotation.z = p.rotZ + emitter.age * p.rotSpeedZ;

          dummy.updateMatrix();
          emitter.mesh.setMatrixAt(j, dummy.matrix);
        }
        emitter.mesh.instanceMatrix.needsUpdate = true;

        // Smooth fade out in the final 20% of duration
        if (progress > 0.8) {
          emitter.mesh.material.opacity = (1.0 - progress) / 0.2;
        }
      } else if (emitter.type === 'firework') {
        const posAttr = emitter.mesh.geometry.attributes.position;
        const positions = posAttr.array;
        for (let j = 0; j < emitter.count; j++) {
          const vel = emitter.velocities[j];
          vel.vx *= emitter.velocities[j].drag;
          vel.vz *= emitter.velocities[j].drag;
          vel.vy = (vel.vy - 3.8 * dt) * emitter.velocities[j].drag;

          positions[j * 3 + 0] += vel.vx * dt;
          positions[j * 3 + 1] += vel.vy * dt;
          positions[j * 3 + 2] += vel.vz * dt;
        }
        // Twinkling sparkle fade
        const twinkle = 0.8 + Math.sin(emitter.age * 28) * 0.2;
        emitter.mesh.material.opacity = Math.max(0, (1.0 - progress) * twinkle);
        posAttr.needsUpdate = true;
      } else if (emitter.type === 'shockwave') {
        const s = 1.0 + progress * (emitter.maxRadius - 1.0);
        emitter.mesh.scale.set(s, 1, s);
        emitter.mesh.material.opacity = Math.max(0, (1.0 - Math.pow(progress, 1.5)) * 0.95);
      } else {
        // Standard burst
        const posAttr = emitter.mesh.geometry.attributes.position;
        const positions = posAttr.array;
        for (let j = 0; j < emitter.count; j++) {
          const vel = emitter.velocities[j];
          vel.vy -= 9.8 * dt * 0.5;

          positions[j * 3 + 0] += vel.vx * dt;
          positions[j * 3 + 1] += vel.vy * dt;
          positions[j * 3 + 2] += vel.vz * dt;
        }
        emitter.mesh.material.opacity = Math.max(0, 1.0 - progress);
        posAttr.needsUpdate = true;
      }
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
