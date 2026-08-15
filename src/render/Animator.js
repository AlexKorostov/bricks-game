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

    const p1 = boardView.wallToWorld(side, lane, 0);
    const p2 = boardView.wallToWorld(side, lane, 1);
    const p3 = boardView.wallToWorld(side, lane, 2);

    if (layer1Brick && brickMeshesMap.has(layer1Brick.id)) {
      const m1 = brickMeshesMap.get(layer1Brick.id);
      promises.push(this.slideMesh(m1, m1.position.clone(), p1, 0.16));
    }
    if (layer2Brick && brickMeshesMap.has(layer2Brick.id)) {
      const m2 = brickMeshesMap.get(layer2Brick.id);
      promises.push(this.slideMesh(m2, m2.position.clone(), p2, 0.16));
    }
    if (newOuterBrick) {
      const newMesh = createBrickMeshFn(newOuterBrick);
      newMesh.group.position.copy(p3);
      newMesh.group.position.y += 0.45;
      scene.add(newMesh.group);
      brickMeshesMap.set(newOuterBrick.id, newMesh.group);
      promises.push(this.slideMesh(newMesh.group, newMesh.group.position.clone(), p3, 0.2));
    }

    return promises;
  }

  /**
   * Helper to animate target wall pushing outward (0 -> 1, 1 -> 2, 2 ejected).
   */
  animateTargetWallPushOut({ side, lane, wallPush, boardView, brickMeshesMap, scene }) {
    const promises = [];
    const bLayer1 = wallPush.updatedQueue[1];
    const bLayer2 = wallPush.updatedQueue[2];
    const ejected = wallPush.ejectedBrick;

    const p1 = boardView.wallToWorld(side, lane, 1);
    const p2 = boardView.wallToWorld(side, lane, 2);

    if (bLayer1 && brickMeshesMap.has(bLayer1.id)) {
      const m1 = brickMeshesMap.get(bLayer1.id);
      promises.push(this.slideMesh(m1, m1.position.clone(), p1, 0.18));
    }
    if (bLayer2 && brickMeshesMap.has(bLayer2.id)) {
      const m2 = brickMeshesMap.get(bLayer2.id);
      promises.push(this.slideMesh(m2, m2.position.clone(), p2, 0.18));
    }
    if (ejected && brickMeshesMap.has(ejected.id)) {
      const ejectedMesh = brickMeshesMap.get(ejected.id);
      promises.push(
        this.popAndDisappear(ejectedMesh, 0.22).then(() => {
          scene.remove(ejectedMesh);
          const bInst = ejectedMesh.userData.brickMesh;
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
                  scene.remove(meshGroup);
                  const bMeshInstance = meshGroup.userData.brickMesh;
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
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const pos = new THREE.Vector3(Math.cos(angle) * 3, 0.5, Math.sin(angle) * 3);
            particleSystem.spawnBurst(pos, 'amber', 36);
            particleSystem.spawnBurst(pos, 'emerald', 36);
          }
          await new Promise((r) => setTimeout(r, 300));
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
