// src/render/Animator.js
import * as THREE from 'three';
import { DIRECTIONS } from '../core/Constants.js';

// Easing functions
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Animator {
  constructor() {
    this.activeTweens = [];
  }

  tween(duration, onUpdate, onComplete = null, easing = easeOutCubic) {
    return new Promise((resolve) => {
      this.activeTweens.push({
        duration,
        elapsed: 0,
        onUpdate,
        onComplete: () => {
          if (onComplete) onComplete();
          resolve();
        },
        easing,
      });
    });
  }

  update(dt) {
    for (let i = this.activeTweens.length - 1; i >= 0; i--) {
      const tween = this.activeTweens[i];
      tween.elapsed += dt;
      const progress = Math.min(1.0, tween.elapsed / tween.duration);
      const eased = tween.easing(progress);

      tween.onUpdate(eased, progress);

      if (progress >= 1.0) {
        this.activeTweens.splice(i, 1);
        if (tween.onComplete) {
          tween.onComplete();
        }
      }
    }
  }

  slideMesh(mesh, startPos, endPos, duration = 0.2) {
    return this.tween(
      duration,
      (t) => {
        mesh.position.lerpVectors(startPos, endPos, t);
      },
      () => {
        mesh.position.copy(endPos);
      },
      easeInOutQuad
    );
  }

  popAndDisappear(mesh, duration = 0.25) {
    const initialScale = mesh.scale.clone();
    return this.tween(
      duration,
      (t) => {
        const s = t < 0.3 ? 1.0 + t * 0.4 : (1.0 - (t - 0.3) / 0.7) * 1.12;
        mesh.scale.set(initialScale.x * s, initialScale.y * s, initialScale.z * s);
      },
      () => {
        mesh.visible = false;
      }
    );
  }

  impactBounce(mesh, direction, duration = 0.12) {
    return this.tween(
      duration,
      (t) => {
        const squash = Math.sin(t * Math.PI) * 0.18;
        mesh.scale.y = 1.0 - squash;
        if (direction && direction.dx !== 0) {
          mesh.scale.x = 1.0 + squash;
        } else if (direction && direction.dy !== 0) {
          mesh.scale.z = 1.0 + squash;
        }
      },
      () => {
        mesh.scale.set(1, 1, 1);
      }
    );
  }

  /**
   * Helper to animate source wall shifting inward (1 -> 0, 2 -> 1, new -> 2).
   */
  animateSourceWallShift({ side, lane, wallShift, boardView, brickMeshesMap, createBrickMeshFn, scene }) {
    const promises = [];
    const layer1Brick = wallShift.shiftedQueue[0];
    const layer2Brick = wallShift.shiftedQueue[1];
    const newOuterBrick = wallShift.shiftedQueue[2];

    const p0 = boardView.wallToWorld(side, lane, 0);
    const p1 = boardView.wallToWorld(side, lane, 1);
    const p2 = boardView.wallToWorld(side, lane, 2);

    if (layer1Brick) {
      let m1 = brickMeshesMap.get(layer1Brick.id);
      if (!m1 && createBrickMeshFn) {
        const newMesh = createBrickMeshFn(layer1Brick);
        newMesh.group.position.copy(p1);
        scene.add(newMesh.group);
        brickMeshesMap.set(layer1Brick.id, newMesh.group);
        m1 = newMesh.group;
      }
      if (m1) {
        promises.push(this.slideMesh(m1, m1.position.clone(), p0, 0.16));
      }
    }
    if (layer2Brick) {
      let m2 = brickMeshesMap.get(layer2Brick.id);
      if (!m2 && createBrickMeshFn) {
        const newMesh = createBrickMeshFn(layer2Brick);
        newMesh.group.position.copy(p2);
        scene.add(newMesh.group);
        brickMeshesMap.set(layer2Brick.id, newMesh.group);
        m2 = newMesh.group;
      }
      if (m2) {
        promises.push(this.slideMesh(m2, m2.position.clone(), p1, 0.16));
      }
    }
    if (newOuterBrick && createBrickMeshFn) {
      const newMesh = createBrickMeshFn(newOuterBrick);
      newMesh.group.position.copy(p2);
      newMesh.group.position.y += 0.45;
      scene.add(newMesh.group);
      brickMeshesMap.set(newOuterBrick.id, newMesh.group);
      promises.push(this.slideMesh(newMesh.group, newMesh.group.position.clone(), p2, 0.2));
    }

    return promises;
  }

  /**
   * Helper to animate target wall pushing outward (0 -> 1, 1 -> 2, 2 ejected).
   */
  animateTargetWallPushOut({ side, lane, wallPush, boardView, brickMeshesMap, createBrickMeshFn, scene }) {
    const promises = [];
    const bLayer1 = wallPush.updatedQueue[1];
    const bLayer2 = wallPush.updatedQueue[2];
    const ejected = wallPush.ejectedBrick;

    const p0 = boardView.wallToWorld(side, lane, 0);
    const p1 = boardView.wallToWorld(side, lane, 1);
    const p2 = boardView.wallToWorld(side, lane, 2);

    if (bLayer1) {
      let m1 = brickMeshesMap.get(bLayer1.id);
      if (!m1 && createBrickMeshFn) {
        const newMesh = createBrickMeshFn(bLayer1);
        newMesh.group.position.copy(p0);
        scene.add(newMesh.group);
        brickMeshesMap.set(bLayer1.id, newMesh.group);
        m1 = newMesh.group;
      }
      if (m1) {
        promises.push(this.slideMesh(m1, m1.position.clone(), p1, 0.18));
      }
    }
    if (bLayer2) {
      let m2 = brickMeshesMap.get(bLayer2.id);
      if (!m2 && createBrickMeshFn) {
        const newMesh = createBrickMeshFn(bLayer2);
        newMesh.group.position.copy(p1);
        scene.add(newMesh.group);
        brickMeshesMap.set(bLayer2.id, newMesh.group);
        m2 = newMesh.group;
      }
      if (m2) {
        promises.push(this.slideMesh(m2, m2.position.clone(), p2, 0.18));
      }
    }
    if (ejected && brickMeshesMap.has(ejected.id)) {
      const ejectedMesh = brickMeshesMap.get(ejected.id);
      promises.push(
        this.popAndDisappear(ejectedMesh, 0.22).then(() => {
          if (ejectedMesh.parent) {
            ejectedMesh.parent.remove(ejectedMesh);
          } else {
            scene.remove(ejectedMesh);
          }
          const bInst = ejectedMesh.userData?.brickMesh;
          if (bInst) bInst.dispose();
          brickMeshesMap.delete(ejected.id);
        })
      );
    }

    return promises;
  }

  async playTurnTimeline({
    steps,
    boardView,
    brickMeshesMap,
    scene,
    createBrickMeshFn,
    soundSystem,
    particleSystem,
    triggerCameraShakeFn,
    onStepCallback,
  }) {
    for (const step of steps) {
      if (onStepCallback) onStepCallback(step);

      switch (step.type) {
        case 'LAUNCH_TO_FIELD': {
          soundSystem.playLaunch();

          const { side, lane, brick, landingCell, wallShift } = step;
          const startWorldPos = boardView.wallToWorld(side, lane, 0);
          const endWorldPos = boardView.gridToWorld(landingCell.x, landingCell.y);

          const launchedMeshGroup = brickMeshesMap.get(brick.id);

          const shiftPromises = this.animateSourceWallShift({
            side,
            lane,
            wallShift,
            boardView,
            brickMeshesMap,
            createBrickMeshFn,
            scene,
          });

          const launchDistance = startWorldPos.distanceTo(endWorldPos);
          const duration = Math.min(0.35, Math.max(0.14, launchDistance * 0.035));

          if (launchedMeshGroup) {
            const bMeshInstance = launchedMeshGroup.userData.brickMesh;
            if (bMeshInstance) {
              bMeshInstance.updateDirection(brick.direction);
            }

            await Promise.all([
              this.slideMesh(launchedMeshGroup, startWorldPos, endWorldPos, duration),
              ...shiftPromises,
            ]);

            soundSystem.playHit();
            await this.impactBounce(launchedMeshGroup, brick.direction, 0.1);
          } else {
            await Promise.all(shiftPromises);
          }

          await new Promise((r) => setTimeout(r, 60));
          break;
        }

        case 'LAUNCH_TO_WALL': {
          soundSystem.playLaunch();

          const { side, lane, oppositeSide, oppositeLane, brick, wallPush, wallShift } = step;
          const startWorldPos = boardView.wallToWorld(side, lane, 0);
          const endWorldPos = boardView.wallToWorld(oppositeSide, oppositeLane, 0);

          const launchedMeshGroup = brickMeshesMap.get(brick.id);

          // 1. Shift source wall inward
          const sourceShiftPromises = this.animateSourceWallShift({
            side,
            lane,
            wallShift,
            boardView,
            brickMeshesMap,
            createBrickMeshFn,
            scene,
          });

          // 2. Slide projectile across entire board to opposite wall slot 0
          const launchDistance = startWorldPos.distanceTo(endWorldPos);
          const duration = Math.min(0.4, Math.max(0.2, launchDistance * 0.035));

          if (launchedMeshGroup) {
            await Promise.all([
              this.slideMesh(launchedMeshGroup, startWorldPos, endWorldPos, duration),
              ...sourceShiftPromises,
            ]);

            // 3. Target wall pushes outward
            const targetPushPromises = this.animateTargetWallPushOut({
              side: oppositeSide,
              lane: oppositeLane,
              wallPush,
              boardView,
              brickMeshesMap,
              createBrickMeshFn,
              scene,
            });

            // Update direction of newly docked brick to NONE
            const bMeshInstance = launchedMeshGroup.userData.brickMesh;
            if (bMeshInstance) {
              bMeshInstance.updateDirection(DIRECTIONS.NONE);
            }

            soundSystem.playHit();
            await Promise.all(targetPushPromises);
          } else {
            await Promise.all(sourceShiftPromises);
          }

          await new Promise((r) => setTimeout(r, 60));
          break;
        }

        case 'MATCH': {
          soundSystem.playMatch(step.combo);

          const disappearPromises = [];
          for (const { x, y, brick } of step.matchedCells) {
            const meshGroup = brickMeshesMap.get(brick.id);
            const worldPos = boardView.gridToWorld(x, y);

            particleSystem.spawnBurst(worldPos, brick.color, 24);

            if (meshGroup) {
              disappearPromises.push(
                this.popAndDisappear(meshGroup, 0.22).then(() => {
                  if (meshGroup.parent) {
                    meshGroup.parent.remove(meshGroup);
                  } else {
                    scene.remove(meshGroup);
                  }
                  const bMeshInstance = meshGroup.userData?.brickMesh;
                  if (bMeshInstance) bMeshInstance.dispose();
                  brickMeshesMap.delete(brick.id);
                })
              );
            }
          }

          await Promise.all(disappearPromises);
          await new Promise((r) => setTimeout(r, 90));
          break;
        }

        case 'SLIDE': {
          soundSystem.playSlide();

          const slidePromises = [];
          for (const move of step.movements) {
            const meshGroup = brickMeshesMap.get(move.brick.id);
            if (meshGroup) {
              const startPos = boardView.gridToWorld(move.from.x, move.from.y);

              if (move.exitedToWall) {
                // Slid off-board into opposite wall!
                const { side, lane, wallPush } = move.exitedToWall;
                const endPos = boardView.wallToWorld(side, lane, 0);
                const dist = startPos.distanceTo(endPos);
                const dur = Math.min(0.35, Math.max(0.14, dist * 0.035));

                slidePromises.push(
                  this.slideMesh(meshGroup, startPos, endPos, dur).then(async () => {
                    const bMeshInstance = meshGroup.userData.brickMesh;
                    if (bMeshInstance) bMeshInstance.updateDirection(DIRECTIONS.NONE);

                    await Promise.all(
                      this.animateTargetWallPushOut({
                        side,
                        lane,
                        wallPush,
                        boardView,
                        brickMeshesMap,
                        createBrickMeshFn,
                        scene,
                      })
                    );
                  })
                );
              } else {
                // Slid to new field position
                const endPos = boardView.gridToWorld(move.to.x, move.to.y);
                const dist = startPos.distanceTo(endPos);
                const dur = Math.min(0.28, Math.max(0.12, dist * 0.035));
                slidePromises.push(this.slideMesh(meshGroup, startPos, endPos, dur));
              }
            }
          }

          await Promise.all(slidePromises);
          soundSystem.playHit();
          await new Promise((r) => setTimeout(r, 80));
          break;
        }

        case 'WAVE_CLEAR': {
          soundSystem.playWaveClear();

          // 1. Trigger camera shake & central grid explosion shockwaves
          if (triggerCameraShakeFn) {
            triggerCameraShakeFn(0.55);
          }

          if (particleSystem.spawnShockwave) {
            particleSystem.spawnShockwave(new THREE.Vector3(0, 0.12, 0), 16.0, 0.7);
            particleSystem.spawnShockwave(new THREE.Vector3(0, 0.14, 0), 10.0, 0.5);
          }
          if (particleSystem.spawnFirework) {
            particleSystem.spawnFirework(new THREE.Vector3(0, 0.5, 0), 'amber', 90);
            particleSystem.spawnFirework(new THREE.Vector3(0, 0.7, 0), 'crimson', 70);
          }

          // 2. True 3D Spherical Brick Explosion: multi-directional trajectories, forward camera flight, fixed-axis tumbling (30% slower)
          const explosionDuration = 3.0;
          const flyingBricks = [];
          const deltaQuat = new THREE.Quaternion();

          brickMeshesMap.forEach((meshGroup) => {
            const startPos = meshGroup.position.clone();
            const startQuat = meshGroup.quaternion.clone();

            const dx = startPos.x;
            const dz = startPos.z;
            const distFromCenter = Math.sqrt(dx * dx + dz * dz) || 1.0;

            // Micro-stagger delay based on distance from center for a propagating blast wave
            const delay = Math.min(0.18, (distFromCenter / 10.0) * 0.13);

            // Azimuth angle in XZ plane with wide lateral dispersion
            const baseAzimuth = Math.atan2(dz, dx);
            const azimuthSpread = (Math.random() - 0.5) * 0.75;
            const azimuth = baseAzimuth + azimuthSpread;

            // Elevation angle above board plane (from 18° to 72° for spherical hemisphere dispersion)
            const elevation = 0.32 + Math.random() * 0.95;

            // Variable 3D flight speed (units/s) - 30% slower for calm, majestic arcs
            let speed = 6.3 + Math.random() * 6.0;

            let vx = speed * Math.cos(elevation) * Math.cos(azimuth);
            let vy = speed * Math.sin(elevation) + (1.8 + Math.random() * 2.5);
            let vz = speed * Math.cos(elevation) * Math.sin(azimuth);

            // Some bricks explicitly pushed forward towards the camera (+Z / +Y)
            if (Math.random() < 0.30) {
              vz += 2.5 + Math.random() * 3.5;
              vy += 1.4 + Math.random() * 2.1;
            }

            // Gentle gravity scaled with slower speed for extended soaring hang-time
            const gravity = -5.8;

            // Fixed, unchanging 3D rotation axis (random unit vector in 3D sphere)
            const rx = (Math.random() - 0.5) || 0.1;
            const ry = (Math.random() - 0.5) || 0.1;
            const rz = (Math.random() - 0.5) || 0.1;
            const rotAxis = new THREE.Vector3(rx, ry, rz).normalize();

            // Constant, unchanging angular rotation speed (rad/s) scaled with slower speed
            const rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (3.2 + Math.random() * 4.5);

            flyingBricks.push({
              meshGroup,
              startPos,
              startQuat,
              rotAxis,
              rotSpeed,
              delay,
              vx,
              vy,
              vz,
              gravity,
            });
          });

          // Run physics ballistic flight tween
          if (flyingBricks.length > 0) {
            this.tween(
              explosionDuration,
              (eased, rawProgress) => {
                const totalElapsed = rawProgress * explosionDuration;
                for (let i = 0; i < flyingBricks.length; i++) {
                  const b = flyingBricks[i];
                  if (totalElapsed < b.delay) continue;

                  const t = totalElapsed - b.delay;
                  b.meshGroup.position.x = b.startPos.x + b.vx * t;
                  b.meshGroup.position.y = Math.max(-12, b.startPos.y + b.vy * t + 0.5 * b.gravity * t * t);
                  b.meshGroup.position.z = b.startPos.z + b.vz * t;

                  // Strict constant rotation axis and constant angular speed: R(t) = Rot(axis, speed * t) * Q0
                  deltaQuat.setFromAxisAngle(b.rotAxis, b.rotSpeed * t);
                  b.meshGroup.quaternion.multiplyQuaternions(deltaQuat, b.startQuat);
                }
              },
              () => {
                for (let i = 0; i < flyingBricks.length; i++) {
                  const meshGroup = flyingBricks[i].meshGroup;
                  if (meshGroup.parent) {
                    meshGroup.parent.remove(meshGroup);
                  } else if (scene) {
                    scene.remove(meshGroup);
                  }
                  const bInst = meshGroup.userData?.brickMesh;
                  if (bInst) bInst.dispose();
                }
                brickMeshesMap.clear();
              },
              (t) => t
            );
          }

          // 3. Launch initial dense full-board canopy of fluttering multicolored confetti
          particleSystem.spawnConfettiShower(240, 3.0);

          // Helper to trigger timed firework bursts matching the audio bursts
          const triggerTimedFirework = (delayMs, pos, color) => {
            setTimeout(() => {
              if (particleSystem.spawnFirework) {
                particleSystem.spawnFirework(pos, color, 85);
              }
            }, delayMs);
          };

          // 4. Staggered 3D Fireworks synchronized with audio rockets & explosions
          triggerTimedFirework(300, new THREE.Vector3(0, 3.2, 0), 'amber');
          triggerTimedFirework(750, new THREE.Vector3(-3.2, 3.5, -2.5), 'crimson');

          // Secondary confetti burst at 0.9s for rich continuous falling effect
          setTimeout(() => {
            if (particleSystem.spawnConfettiShower) {
              particleSystem.spawnConfettiShower(180, 2.6);
            }
          }, 900);

          triggerTimedFirework(1300, new THREE.Vector3(3.0, 3.6, 2.5), 'cobalt');
          triggerTimedFirework(1800, new THREE.Vector3(3.2, 3.8, -2.5), 'emerald');
          triggerTimedFirework(2250, new THREE.Vector3(-2.8, 3.6, 3.2), 'amber');

          // Grand Finale twin bursts
          triggerTimedFirework(2600, new THREE.Vector3(-1.8, 4.2, 0.5), 'crimson');
          triggerTimedFirework(2640, new THREE.Vector3(1.8, 4.2, 1.5), 'emerald');

          // Full 3.0s dramatic celebration before modal popup
          await new Promise((r) => setTimeout(r, 3000));
          break;
        }

        case 'GAME_OVER': {
          soundSystem.playGameOver();
          await new Promise((r) => setTimeout(r, 200));
          break;
        }
      }
    }
  }
}
