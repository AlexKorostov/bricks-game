// src/render/Renderer2D.js - Lightweight, Ultra-Battery-Saver HTML/DOM 2D Game Renderer
import { COLOR_CONFIG, DIRECTIONS, WALL_SIDES } from '../core/Constants.js';

export class Renderer2D {
  /**
   * @param {Object} params
   * @param {HTMLElement} params.container - Host DOM container
   * @param {GameEngine} params.gameEngine
   * @param {Function} params.onLaunchCallback - (side, lane) => void
   * @param {Function} params.onStepCallback - (step) => void
   */
  constructor({ container, gameEngine, onLaunchCallback, onStepCallback }) {
    this.container = container;
    this.gameEngine = gameEngine;
    this.onLaunchCallback = onLaunchCallback;
    this.onStepCallback = onStepCallback;

    this.enabled = true;
    this.isMounted = false;
    this.hoveredSide = null;
    this.hoveredLane = null;

    // Build DOM hierarchy
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'renderer-2d-wrapper';

    this.boardContainer = document.createElement('div');
    this.boardContainer.className = 'board-2d-container';

    this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgOverlay.setAttribute('class', 'aim-overlay-2d');

    this.aimLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.aimLine.setAttribute('class', 'aim-line-2d');
    this.aimLine.style.display = 'none';
    this.svgOverlay.appendChild(this.aimLine);

    this.ghostCell = document.createElement('div');
    this.ghostCell.className = 'ghost-cell-2d';
    this.ghostCell.style.display = 'none';

    this.particlesContainer = document.createElement('div');
    this.particlesContainer.className = 'particles-2d-container';

    this.flyContainer = document.createElement('div');
    this.flyContainer.className = 'fly-container-2d';

    this.slotMap = new Map(); // key -> slot DOM element
    this.buildBoardDOM();

    this.boardContainer.appendChild(this.svgOverlay);
    this.boardContainer.appendChild(this.ghostCell);
    this.boardContainer.appendChild(this.flyContainer);
    this.boardContainer.appendChild(this.particlesContainer);
    this.wrapper.appendChild(this.boardContainer);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  getDirectionGlyph(dir) {
    if (!dir) return '';
    if (dir.dx === 1 && dir.dy === 0) return '▶';
    if (dir.dx === -1 && dir.dy === 0) return '◀';
    if (dir.dx === 0 && dir.dy === 1) return '▼';
    if (dir.dx === 0 && dir.dy === -1) return '▲';
    return '';
  }

  buildBoardDOM() {
    const size = this.gameEngine.gridSize;
    const depth = this.gameEngine.wallDepth;

    this.boardContainer.innerHTML = '';

    // 1. Top Section (Corner TL + Top Wall [10 cols x 3 rows] + Corner TR)
    const topSection = document.createElement('div');
    topSection.className = 'section-row-2d top-section-2d';

    const cornerTL = document.createElement('div');
    cornerTL.className = 'corner-2d corner-top-left-2d';

    const topWall = document.createElement('div');
    topWall.className = 'wall-2d wall-top-2d';
    for (let layer = depth - 1; layer >= 0; layer--) {
      const rowEl = document.createElement('div');
      rowEl.className = `wall-row-2d wall-row-layer-${layer}`;
      for (let lane = 0; lane < size; lane++) {
        const slot = document.createElement('div');
        slot.className = `cell-slot-2d wall-slot-2d wall-slot-top ${layer === 0 ? 'layer-0-interactive' : ''}`;
        slot.dataset.side = WALL_SIDES.TOP;
        slot.dataset.lane = String(lane);
        slot.dataset.layer = String(layer);
        this.slotMap.set(`wall-TOP-${lane}-${layer}`, slot);
        this.attachSlotEvents(slot, WALL_SIDES.TOP, lane, layer);
        rowEl.appendChild(slot);
      }
      topWall.appendChild(rowEl);
    }

    const cornerTR = document.createElement('div');
    cornerTR.className = 'corner-2d corner-top-right-2d';

    topSection.appendChild(cornerTL);
    topSection.appendChild(topWall);
    topSection.appendChild(cornerTR);

    // 2. Middle Section (Left Wall [3 cols x 10 rows] + Field [10x10] + Right Wall [3 cols x 10 rows])
    const middleSection = document.createElement('div');
    middleSection.className = 'section-row-2d middle-section-2d';

    // Left Wall (3 cols x 10 rows)
    const leftWall = document.createElement('div');
    leftWall.className = 'wall-2d wall-left-2d';
    for (let lane = 0; lane < size; lane++) {
      const laneEl = document.createElement('div');
      laneEl.className = 'wall-lane-horizontal-2d';
      for (let layer = depth - 1; layer >= 0; layer--) {
        const slot = document.createElement('div');
        slot.className = `cell-slot-2d wall-slot-2d wall-slot-left ${layer === 0 ? 'layer-0-interactive' : ''}`;
        slot.dataset.side = WALL_SIDES.LEFT;
        slot.dataset.lane = String(lane);
        slot.dataset.layer = String(layer);
        this.slotMap.set(`wall-LEFT-${lane}-${layer}`, slot);
        this.attachSlotEvents(slot, WALL_SIDES.LEFT, lane, layer);
        laneEl.appendChild(slot);
      }
      leftWall.appendChild(laneEl);
    }

    // Central 10x10 Field
    const fieldGrid = document.createElement('div');
    fieldGrid.className = 'field-grid-2d';
    for (let y = 0; y < size; y++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'field-row-2d';
      for (let x = 0; x < size; x++) {
        const slot = document.createElement('div');
        slot.className = 'cell-slot-2d field-slot-2d';
        slot.dataset.x = String(x);
        slot.dataset.y = String(y);
        this.slotMap.set(`field-${x}-${y}`, slot);
        rowEl.appendChild(slot);
      }
      fieldGrid.appendChild(rowEl);
    }

    // Right Wall (3 cols x 10 rows)
    const rightWall = document.createElement('div');
    rightWall.className = 'wall-2d wall-right-2d';
    for (let lane = 0; lane < size; lane++) {
      const laneEl = document.createElement('div');
      laneEl.className = 'wall-lane-horizontal-2d';
      for (let layer = 0; layer < depth; layer++) {
        const slot = document.createElement('div');
        slot.className = `cell-slot-2d wall-slot-2d wall-slot-right ${layer === 0 ? 'layer-0-interactive' : ''}`;
        slot.dataset.side = WALL_SIDES.RIGHT;
        slot.dataset.lane = String(lane);
        slot.dataset.layer = String(layer);
        this.slotMap.set(`wall-RIGHT-${lane}-${layer}`, slot);
        this.attachSlotEvents(slot, WALL_SIDES.RIGHT, lane, layer);
        laneEl.appendChild(slot);
      }
      rightWall.appendChild(laneEl);
    }

    middleSection.appendChild(leftWall);
    middleSection.appendChild(fieldGrid);
    middleSection.appendChild(rightWall);

    // 3. Bottom Section (Corner BL + Bottom Wall [10 cols x 3 rows] + Corner BR)
    const bottomSection = document.createElement('div');
    bottomSection.className = 'section-row-2d bottom-section-2d';

    const cornerBL = document.createElement('div');
    cornerBL.className = 'corner-2d corner-bottom-left-2d';

    const bottomWall = document.createElement('div');
    bottomWall.className = 'wall-2d wall-bottom-2d';
    for (let layer = 0; layer < depth; layer++) {
      const rowEl = document.createElement('div');
      rowEl.className = `wall-row-2d wall-row-layer-${layer}`;
      for (let lane = 0; lane < size; lane++) {
        const slot = document.createElement('div');
        slot.className = `cell-slot-2d wall-slot-2d wall-slot-bottom ${layer === 0 ? 'layer-0-interactive' : ''}`;
        slot.dataset.side = WALL_SIDES.BOTTOM;
        slot.dataset.lane = String(lane);
        slot.dataset.layer = String(layer);
        this.slotMap.set(`wall-BOTTOM-${lane}-${layer}`, slot);
        this.attachSlotEvents(slot, WALL_SIDES.BOTTOM, lane, layer);
        rowEl.appendChild(slot);
      }
      bottomWall.appendChild(rowEl);
    }

    const cornerBR = document.createElement('div');
    cornerBR.className = 'corner-2d corner-bottom-right-2d';

    bottomSection.appendChild(cornerBL);
    bottomSection.appendChild(bottomWall);
    bottomSection.appendChild(cornerBR);

    this.boardContainer.appendChild(topSection);
    this.boardContainer.appendChild(middleSection);
    this.boardContainer.appendChild(bottomSection);
  }

  attachSlotEvents(slot, side, lane, layer) {
    slot.addEventListener('pointerenter', () => {
      if (!this.enabled || this.gameEngine.state !== 'READY') return;
      this.handleHover(side, lane);
    });

    slot.addEventListener('pointerleave', () => {
      this.clearHover();
    });

    slot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.enabled || this.gameEngine.state !== 'READY') return;
      const preview = this.gameEngine.getLaunchPreview(side, lane);
      if (preview.canLaunch) {
        this.clearHover();
        if (this.onLaunchCallback) {
          this.onLaunchCallback(side, lane);
        }
      }
    });
  }

  handleHover(side, lane) {
    if (this.hoveredSide === side && this.hoveredLane === lane) return;
    this.clearHover();

    this.hoveredSide = side;
    this.hoveredLane = lane;

    const preview = this.gameEngine.getLaunchPreview(side, lane);
    const brick = this.gameEngine.grid.getWallBrick(side, lane, 0);
    const colorConfig = COLOR_CONFIG[brick?.color] || COLOR_CONFIG.crimson;

    for (let layer = 0; layer < this.gameEngine.wallDepth; layer++) {
      const slot = this.slotMap.get(`wall-${side}-${lane}-${layer}`);
      if (slot) {
        if (preview.canLaunch) {
          slot.classList.add('hover-valid');
        } else {
          slot.classList.add('hover-disabled');
        }
      }
    }

    this.showAimPreview(side, lane, preview, colorConfig.hex);
  }

  clearHover() {
    if (this.hoveredSide !== null && this.hoveredLane !== null) {
      for (let layer = 0; layer < this.gameEngine.wallDepth; layer++) {
        const slot = this.slotMap.get(`wall-${this.hoveredSide}-${this.hoveredLane}-${layer}`);
        if (slot) {
          slot.classList.remove('hover-valid', 'hover-disabled');
        }
      }
      this.hoveredSide = null;
      this.hoveredLane = null;
    }
    this.hideAimPreview();
  }

  getSlotCenter(slotEl) {
    const boardRect = this.boardContainer.getBoundingClientRect();
    const slotRect = slotEl.getBoundingClientRect();
    return {
      x: slotRect.left - boardRect.left + slotRect.width / 2,
      y: slotRect.top - boardRect.top + slotRect.height / 2,
      width: slotRect.width,
      height: slotRect.height,
      left: slotRect.left - boardRect.left,
      top: slotRect.top - boardRect.top,
    };
  }

  showAimPreview(side, lane, preview, colorHex = '#38bdf8') {
    if (!preview) {
      this.hideAimPreview();
      return;
    }

    const startSlot = this.slotMap.get(`wall-${side}-${lane}-0`);
    if (!startSlot) return;

    const pStart = this.getSlotCenter(startSlot);

    if (preview.canLaunch && preview.landingCell) {
      const endSlot = this.slotMap.get(`field-${preview.landingCell.x}-${preview.landingCell.y}`);
      if (!endSlot) return;
      const pEnd = this.getSlotCenter(endSlot);

      this.aimLine.setAttribute('x1', String(pStart.x));
      this.aimLine.setAttribute('y1', String(pStart.y));
      this.aimLine.setAttribute('x2', String(pEnd.x));
      this.aimLine.setAttribute('y2', String(pEnd.y));
      this.aimLine.setAttribute('stroke', colorHex);
      this.aimLine.setAttribute('stroke-dasharray', '8 6');
      this.aimLine.setAttribute('stroke-opacity', '0.9');
      this.aimLine.style.display = 'block';

      this.ghostCell.style.left = `${pEnd.left}px`;
      this.ghostCell.style.top = `${pEnd.top}px`;
      this.ghostCell.style.width = `${pEnd.width}px`;
      this.ghostCell.style.height = `${pEnd.height}px`;
      this.ghostCell.style.borderColor = colorHex;
      this.ghostCell.style.boxShadow = `0 0 12px ${colorHex}`;
      this.ghostCell.style.display = 'block';
    } else {
      // Empty lane / unlaunchable: highlight entire line across to opposite wall
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
      if (!oppSide) return;

      const oppSlot = this.slotMap.get(`wall-${oppSide}-${lane}-0`);
      if (!oppSlot) return;
      const pEnd = this.getSlotCenter(oppSlot);

      this.aimLine.setAttribute('x1', String(pStart.x));
      this.aimLine.setAttribute('y1', String(pStart.y));
      this.aimLine.setAttribute('x2', String(pEnd.x));
      this.aimLine.setAttribute('y2', String(pEnd.y));
      this.aimLine.setAttribute('stroke', colorHex);
      this.aimLine.setAttribute('stroke-dasharray', '6 6');
      this.aimLine.setAttribute('stroke-opacity', '0.45');
      this.aimLine.style.display = 'block';

      this.ghostCell.style.display = 'none';
    }
  }

  hideAimPreview() {
    this.aimLine.style.display = 'none';
    this.ghostCell.style.display = 'none';
  }

  createBrickElement(brick) {
    const el = document.createElement('div');
    el.className = `brick-2d brick-color-${brick.color}`;
    el.dataset.brickId = brick.id;

    const glyph = this.getDirectionGlyph(brick.direction);
    if (glyph) {
      const arrow = document.createElement('span');
      arrow.className = 'brick-arrow-2d';
      arrow.textContent = glyph;
      el.appendChild(arrow);
    }
    return el;
  }

  updateBrickElement(el, brick) {
    el.className = `brick-2d brick-color-${brick.color}`;
    el.dataset.brickId = brick.id;
    let arrow = el.querySelector('.brick-arrow-2d');
    const glyph = this.getDirectionGlyph(brick.direction);
    if (glyph) {
      if (!arrow) {
        arrow = document.createElement('span');
        arrow.className = 'brick-arrow-2d';
        el.appendChild(arrow);
      }
      arrow.textContent = glyph;
    } else if (arrow) {
      arrow.remove();
    }
  }

  syncFromGrid(grid) {
    this.clearHover();
    this.flyContainer.innerHTML = '';
    this.particlesContainer.innerHTML = '';

    // 1. Sync Field
    for (let y = 0; y < grid.size; y++) {
      for (let x = 0; x < grid.size; x++) {
        const slot = this.slotMap.get(`field-${x}-${y}`);
        if (!slot) continue;
        slot.innerHTML = '';
        const brick = grid.getCell(x, y);
        if (brick) {
          slot.appendChild(this.createBrickElement(brick));
        }
      }
    }

    // 2. Sync Walls
    const sides = Object.keys(grid.walls);
    for (const side of sides) {
      for (let lane = 0; lane < grid.size; lane++) {
        for (let layer = 0; layer < grid.wallDepth; layer++) {
          const slot = this.slotMap.get(`wall-${side}-${lane}-${layer}`);
          if (!slot) continue;
          slot.innerHTML = '';
          const brick = grid.getWallBrick(side, lane, layer);
          if (brick) {
            slot.appendChild(this.createBrickElement(brick));
          }
        }
      }
    }
  }

  mount(parentContainer = this.container) {
    if (!this.wrapper.parentElement) {
      parentContainer.appendChild(this.wrapper);
    }
    this.wrapper.style.display = 'flex';
    this.isMounted = true;
    this.onResize();
  }

  unmount() {
    this.isMounted = false;
    this.clearHover();
    this.hideAimPreview();
    if (this.flyContainer) this.flyContainer.innerHTML = '';
    if (this.particlesContainer) this.particlesContainer.innerHTML = '';
    this.wrapper.style.display = 'none';
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.clearHover();
    }
  }

  onResize() {
    if (!this.isMounted) return;
    this.hideAimPreview();
  }

  spawnParticleBurst(centerX, centerY, colorName, count = 18) {
    const config = COLOR_CONFIG[colorName] || COLOR_CONFIG.crimson;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle-2d';
      p.style.backgroundColor = config.hex;
      p.style.boxShadow = `0 0 6px ${config.hex}`;
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;

      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 55;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.particlesContainer.appendChild(p);

      p.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 },
        ],
        {
          duration: 350 + Math.random() * 150,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        }
      ).onfinish = () => p.remove();
    }
  }

  spawnFirework2D(centerX, centerY, colorName, count = 45) {
    const config = COLOR_CONFIG[colorName] || COLOR_CONFIG.amber;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle-2d';
      const isGlitter = Math.random() < 0.25;
      const col = isGlitter ? '#ffffff' : config.hex;
      p.style.backgroundColor = col;
      p.style.boxShadow = `0 0 10px ${config.hex}, 0 0 4px #ffffff`;
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;
      p.style.width = isGlitter ? '6px' : '9px';
      p.style.height = isGlitter ? '6px' : '9px';

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 95;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * 0.9 - 15;

      this.particlesContainer.appendChild(p);

      p.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0.2)`, opacity: 0 },
        ],
        {
          duration: 600 + Math.random() * 250,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      ).onfinish = () => p.remove();
    }
  }

  spawnConfettiShower2D(count = 130, streamDurationMs = 1000) {
    const boardRect = this.boardContainer.getBoundingClientRect();
    const colors = [
      '#e60026', '#2962ff', '#00c853', '#ffd600',
      '#ffffff', '#ff9100', '#00e5ff', '#e040fb', '#ffea00'
    ];

    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti-2d';
      const col = colors[Math.floor(Math.random() * colors.length)];
      c.style.backgroundColor = col;
      c.style.width = `${6 + Math.random() * 7}px`;
      c.style.height = `${9 + Math.random() * 9}px`;
      c.style.borderRadius = '2px';
      c.style.position = 'absolute';
      c.style.pointerEvents = 'none';
      c.style.zIndex = '35';
      c.style.opacity = '0'; // Hidden until individual emission delay starts
      c.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.35)';

      // Full wide coverage across the entire board width
      const startX = Math.random() * boardRect.width;
      const startY = -8 + Math.random() * 15;
      c.style.left = `${startX}px`;
      c.style.top = `${startY}px`;

      this.particlesContainer.appendChild(c);

      const delay = (i / count) * streamDurationMs + (Math.random() - 0.5) * 40;
      const swayX = (Math.random() - 0.5) * 120;
      const fallDist = boardRect.height + 30;
      const rot = (Math.random() - 0.5) * 720;
      const duration = 1300 + Math.random() * 500;

      c.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(0.6)', opacity: 0, offset: 0 },
          { transform: `translate(${swayX * 0.1}px, 12px) rotate(${rot * 0.1}deg) scale(1)`, opacity: 1, offset: 0.08 },
          { transform: `translate(${swayX * 0.55}px, ${fallDist * 0.55}px) rotate(${rot * 0.55}deg) scale(0.95)`, opacity: 0.95, offset: 0.6 },
          { transform: `translate(${swayX}px, ${fallDist}px) rotate(${rot}deg) scale(0.85)`, opacity: 0.1, offset: 1.0 },
        ],
        {
          delay: Math.max(0, delay),
          duration,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          fill: 'forwards',
        }
      ).onfinish = () => c.remove();
    }
  }

  async animateSlideBrick(brick, fromSlot, toSlot, duration = 180) {
    const pStart = this.getSlotCenter(fromSlot);
    const pEnd = this.getSlotCenter(toSlot);

    const flyingEl = this.createBrickElement(brick);
    flyingEl.classList.add('brick-flying-2d');
    flyingEl.style.position = 'absolute';
    flyingEl.style.left = `${pStart.left}px`;
    flyingEl.style.top = `${pStart.top}px`;
    flyingEl.style.width = `${pStart.width}px`;
    flyingEl.style.height = `${pStart.height}px`;

    this.flyContainer.appendChild(flyingEl);

    // Clear origin slot visually during flight
    fromSlot.innerHTML = '';

    const anim = flyingEl.animate(
      [
        { transform: 'translate3d(0, 0, 0)' },
        { transform: `translate3d(${pEnd.left - pStart.left}px, ${pEnd.top - pStart.top}px, 0)` },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );

    return new Promise((resolve) => {
      anim.onfinish = () => {
        flyingEl.remove();
        toSlot.innerHTML = '';
        toSlot.appendChild(this.createBrickElement(brick));
        resolve();
      };
    });
  }

  async animateSourceWallShift(side, lane, wallShift) {
    const slot0 = this.slotMap.get(`wall-${side}-${lane}-0`);
    const slot1 = this.slotMap.get(`wall-${side}-${lane}-1`);
    const slot2 = this.slotMap.get(`wall-${side}-${lane}-2`);

    const layer1Brick = wallShift.shiftedQueue[0];
    const layer2Brick = wallShift.shiftedQueue[1];
    const newOuterBrick = wallShift.shiftedQueue[2];

    const promises = [];

    if (layer1Brick && slot1) {
      promises.push(this.animateSlideBrick(layer1Brick, slot1, slot0, 160));
    }
    if (layer2Brick && slot2) {
      promises.push(this.animateSlideBrick(layer2Brick, slot2, slot1, 160));
    }
    if (newOuterBrick && slot2) {
      slot2.innerHTML = '';
      const newEl = this.createBrickElement(newOuterBrick);
      newEl.style.opacity = '0';
      newEl.style.transform = 'scale(0.5)';
      slot2.appendChild(newEl);

      promises.push(
        newEl.animate(
          [
            { opacity: 0, transform: 'scale(0.5)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 180, easing: 'ease-out', fill: 'forwards' }
        ).finished
      );
    }

    await Promise.all(promises);

    // Guaranteed state sync for all 3 source wall slots
    if (slot0 && layer1Brick) {
      slot0.innerHTML = '';
      slot0.appendChild(this.createBrickElement(layer1Brick));
    }
    if (slot1 && layer2Brick) {
      slot1.innerHTML = '';
      slot1.appendChild(this.createBrickElement(layer2Brick));
    }
    if (slot2 && newOuterBrick) {
      slot2.innerHTML = '';
      slot2.appendChild(this.createBrickElement(newOuterBrick));
    }
  }

  async animateTargetWallPushOut(side, lane, wallPush, incomingBrick = null) {
    const slot0 = this.slotMap.get(`wall-${side}-${lane}-0`);
    const slot1 = this.slotMap.get(`wall-${side}-${lane}-1`);
    const slot2 = this.slotMap.get(`wall-${side}-${lane}-2`);

    const bLayer0 = incomingBrick || wallPush.updatedQueue[0];
    const bLayer1 = wallPush.updatedQueue[1];
    const bLayer2 = wallPush.updatedQueue[2];
    const ejected = wallPush.ejectedBrick;

    const promises = [];

    // 1. Old layer 2 ejected
    if (ejected && slot2 && slot2.firstElementChild) {
      const ejectedEl = slot2.firstElementChild;
      promises.push(
        ejectedEl.animate(
          [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(1.35)', opacity: 0 },
          ],
          { duration: 170, easing: 'ease-out', fill: 'forwards' }
        ).finished.then(() => {
          slot2.innerHTML = '';
        })
      );
    }

    // 2. Old layer 1 slides to layer 2
    if (bLayer2 && slot1) {
      promises.push(this.animateSlideBrick(bLayer2, slot1, slot2, 160));
    }

    // 3. Old layer 0 slides to layer 1
    if (bLayer1 && slot0) {
      promises.push(this.animateSlideBrick(bLayer1, slot0, slot1, 160));
    }

    await Promise.all(promises);

    // 4. Guaranteed state sync for all 3 target wall slots (layer 0 = docked brick)
    if (slot0 && bLayer0) {
      slot0.innerHTML = '';
      const b0 = Object.assign(Object.create(Object.getPrototypeOf(bLayer0)), bLayer0);
      b0.direction = DIRECTIONS.NONE;
      slot0.appendChild(this.createBrickElement(b0));
    }
    if (slot1 && bLayer1) {
      slot1.innerHTML = '';
      const b1 = Object.assign(Object.create(Object.getPrototypeOf(bLayer1)), bLayer1);
      b1.direction = DIRECTIONS.NONE;
      slot1.appendChild(this.createBrickElement(b1));
    }
    if (slot2 && bLayer2) {
      slot2.innerHTML = '';
      const b2 = Object.assign(Object.create(Object.getPrototypeOf(bLayer2)), bLayer2);
      b2.direction = DIRECTIONS.NONE;
      slot2.appendChild(this.createBrickElement(b2));
    }
  }

  async playTurnTimeline({ steps, soundSystem }) {
    for (const step of steps) {
      if (this.onStepCallback) this.onStepCallback(step);

      switch (step.type) {
        case 'LAUNCH_TO_FIELD': {
          soundSystem.playLaunch();
          const { side, lane, brick, landingCell, wallShift } = step;
          const fromSlot = this.slotMap.get(`wall-${side}-${lane}-0`);
          const toSlot = this.slotMap.get(`field-${landingCell.x}-${landingCell.y}`);

          const shiftPromise = this.animateSourceWallShift(side, lane, wallShift);
          const launchPromise = this.animateSlideBrick(brick, fromSlot, toSlot, 200);

          await Promise.all([launchPromise, shiftPromise]);
          soundSystem.playHit();

          // Impact squash
          const landedBrickEl = toSlot.firstElementChild;
          if (landedBrickEl) {
            landedBrickEl.animate(
              [
                { transform: 'scale(1.18, 0.85)' },
                { transform: 'scale(0.95, 1.05)' },
                { transform: 'scale(1, 1)' },
              ],
              { duration: 120, easing: 'ease-out' }
            );
          }

          await new Promise((r) => setTimeout(r, 60));
          break;
        }

        case 'LAUNCH_TO_WALL': {
          soundSystem.playLaunch();
          const { side, lane, oppositeSide, oppositeLane, brick, wallPush, wallShift } = step;
          const fromSlot = this.slotMap.get(`wall-${side}-${lane}-0`);
          const toSlot = this.slotMap.get(`wall-${oppositeSide}-${oppositeLane}-0`);

          const dockedBrick = Object.assign(Object.create(Object.getPrototypeOf(brick)), brick);
          dockedBrick.direction = DIRECTIONS.NONE;

          const sourceShiftPromise = this.animateSourceWallShift(side, lane, wallShift);
          const launchPromise = this.animateSlideBrick(dockedBrick, fromSlot, toSlot, 230);

          await Promise.all([launchPromise, sourceShiftPromise]);
          await this.animateTargetWallPushOut(oppositeSide, oppositeLane, wallPush, dockedBrick);

          soundSystem.playHit();
          await new Promise((r) => setTimeout(r, 60));
          break;
        }

        case 'MATCH': {
          soundSystem.playMatch(step.combo);
          const popPromises = [];

          for (const { x, y, brick } of step.matchedCells) {
            const slot = this.slotMap.get(`field-${x}-${y}`);
            if (slot && slot.firstElementChild) {
              const el = slot.firstElementChild;
              const p = this.getSlotCenter(slot);
              this.spawnParticleBurst(p.x, p.y, brick.color, 18);

              popPromises.push(
                el.animate(
                  [
                    { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' },
                    { transform: 'scale(1.35)', opacity: 0, filter: 'brightness(1.8)' },
                  ],
                  { duration: 200, easing: 'ease-out', fill: 'forwards' }
                ).finished.then(() => {
                  slot.innerHTML = '';
                })
              );
            }
          }

          await Promise.all(popPromises);
          await new Promise((r) => setTimeout(r, 80));
          break;
        }

        case 'SLIDE': {
          soundSystem.playSlide();
          const slidePromises = [];

          for (const move of step.movements) {
            const fromSlot = this.slotMap.get(`field-${move.from.x}-${move.from.y}`);
            if (move.exitedToWall) {
              const { side, lane, wallPush } = move.exitedToWall;
              const toSlot = this.slotMap.get(`wall-${side}-${lane}-0`);
              const dockedBrick = Object.assign(Object.create(Object.getPrototypeOf(move.brick)), move.brick);
              dockedBrick.direction = DIRECTIONS.NONE;

              slidePromises.push(
                this.animateSlideBrick(dockedBrick, fromSlot, toSlot, 190).then(async () => {
                  await this.animateTargetWallPushOut(side, lane, wallPush, dockedBrick);
                })
              );
            } else {
              const toSlot = this.slotMap.get(`field-${move.to.x}-${move.to.y}`);
              slidePromises.push(this.animateSlideBrick(move.brick, fromSlot, toSlot, 180));
            }
          }

          await Promise.all(slidePromises);
          soundSystem.playHit();
          await new Promise((r) => setTimeout(r, 70));
          break;
        }

        case 'WAVE_CLEAR': {
          soundSystem.playWaveClear();
          const boardRect = this.boardContainer.getBoundingClientRect();

          // 1. Launch continuous 1-second wide confetti shower across the full board
          this.spawnConfettiShower2D(140, 1000);

          const triggerBurst = (delayMs, relX, relY, color) => {
            setTimeout(() => {
              const cx = boardRect.width * relX;
              const cy = boardRect.height * relY;
              this.spawnFirework2D(cx, cy, color, 45);
            }, delayMs);
          };

          // 2. Staggered 2D Fireworks synchronized with audio
          triggerBurst(250, 0.5, 0.35, 'amber');
          triggerBurst(550, 0.25, 0.25, 'crimson');
          triggerBurst(900, 0.75, 0.7, 'cobalt');
          triggerBurst(1250, 0.8, 0.25, 'emerald');
          triggerBurst(1550, 0.2, 0.75, 'amber');

          triggerBurst(1750, 0.4, 0.3, 'crimson');
          triggerBurst(1780, 0.6, 0.3, 'emerald');

          // Full 2.0s celebration
          await new Promise((r) => setTimeout(r, 2000));
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

  destroy() {
    this.unmount();
    this.wrapper.remove();
  }
}
