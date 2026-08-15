// src/ui/UIManager.js

export class UIManager {
  constructor({ onRestartGame, onResetToWave1, onNextWave, onToggleSound, onToggleRenderMode }) {
    this.onRestartGame = onRestartGame;
    this.onResetToWave1 = onResetToWave1;
    this.onNextWave = onNextWave;
    this.onToggleSound = onToggleSound;
    this.onToggleRenderMode = onToggleRenderMode;

    this.scoreEl = document.getElementById('score-value');
    this.highScoreEl = document.getElementById('high-score-value');
    this.waveEl = document.getElementById('wave-value');
    this.comboContainer = document.getElementById('combo-container');

    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalSubtitle = document.getElementById('modal-subtitle');
    this.modalStats = document.getElementById('modal-stats');
    this.modalBtn = document.getElementById('modal-btn');
    this.modalBtnSecondary = document.getElementById('modal-btn-secondary');

    this.modeToggleBtn = document.getElementById('mode-toggle-btn');
    this.modeIcon = document.getElementById('mode-icon');
    this.modeText = document.getElementById('mode-text');

    this.soundBtn = document.getElementById('sound-toggle-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.resetW1Btn = document.getElementById('reset-w1-btn');
    this.helpBtn = document.getElementById('help-btn');
    this.helpModal = document.getElementById('help-modal');
    this.closeHelpBtn = document.getElementById('close-help-btn');

    this.displayedScore = 0;
    this.targetScore = 0;
    this.scoreAnimId = null;

    this.initEvents();
  }

  initEvents() {
    this.restartBtn?.addEventListener('click', () => {
      this.hideModal();
      if (this.onRestartGame) {
        this.onRestartGame();
      }
    });

    this.resetW1Btn?.addEventListener('click', () => {
      this.hideModal();
      if (this.onResetToWave1) {
        this.onResetToWave1();
      }
    });

    this.modeToggleBtn?.addEventListener('click', () => {
      if (this.onToggleRenderMode) {
        const newMode = this.onToggleRenderMode();
        this.updateRenderModeUI(newMode);
      }
    });

    this.soundBtn?.addEventListener('click', () => {
      const isSoundOn = this.onToggleSound();
      this.soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
      this.soundBtn.setAttribute('title', isSoundOn ? 'Mute Audio' : 'Unmute Audio');
    });

    this.helpBtn?.addEventListener('click', () => {
      this.helpModal.classList.remove('hidden');
    });

    this.closeHelpBtn?.addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

    this.modalBtn?.addEventListener('click', () => {
      const action = this.modalBtn.dataset.action;
      this.hideModal();
      if (action === 'nextWave' && this.onNextWave) {
        this.onNextWave();
      } else if (action === 'restart' && this.onRestartGame) {
        this.onRestartGame();
      } else if (action === 'resetWave1' && this.onResetToWave1) {
        this.onResetToWave1();
      }
    });

    this.modalBtnSecondary?.addEventListener('click', () => {
      const action = this.modalBtnSecondary.dataset.action;
      this.hideModal();
      if (action === 'resetWave1' && this.onResetToWave1) {
        this.onResetToWave1();
      }
    });
  }

  updateRenderModeUI(mode) {
    if (!this.modeToggleBtn) return;
    if (mode === '2d') {
      if (this.modeIcon) this.modeIcon.textContent = '🧊';
      if (this.modeText) this.modeText.innerHTML = '3D View';
      this.modeToggleBtn.setAttribute('title', 'Switch to 3D View');
    } else {
      if (this.modeIcon) this.modeIcon.textContent = '⚡';
      if (this.modeText) this.modeText.innerHTML = '2D Mode <span class="mode-badge">Eco</span>';
      this.modeToggleBtn.setAttribute('title', 'Switch to 2D Mode (Battery Saver)');
    }
  }

  updateHUD(score, highScore, wave) {
    this.targetScore = score;
    this.animateScore();
    if (this.highScoreEl) this.highScoreEl.textContent = highScore.toLocaleString();
    if (this.waveEl) this.waveEl.textContent = `Wave ${wave}`;
  }

  animateScore() {
    if (this.scoreAnimId) cancelAnimationFrame(this.scoreAnimId);

    const step = () => {
      if (this.displayedScore < this.targetScore) {
        const diff = this.targetScore - this.displayedScore;
        const incr = Math.max(1, Math.ceil(diff * 0.15));
        this.displayedScore += incr;
        if (this.displayedScore > this.targetScore) this.displayedScore = this.targetScore;
        if (this.scoreEl) this.scoreEl.textContent = this.displayedScore.toLocaleString();
        this.scoreAnimId = requestAnimationFrame(step);
      } else {
        this.displayedScore = this.targetScore;
        if (this.scoreEl) this.scoreEl.textContent = this.displayedScore.toLocaleString();
      }
    };
    step();
  }

  showComboBadge(combo, pointsGained) {
    if (!this.comboContainer) return;

    const badge = document.createElement('div');
    badge.className = 'combo-badge';

    let text = `${combo}x COMBO!`;
    if (combo >= 4) text = `${combo}x MEGA CASCADE!`;
    else if (combo === 3) text = `3x CASCADE!`;

    badge.innerHTML = `
      <div class="combo-title">${text}</div>
      <div class="combo-points">+${pointsGained.toLocaleString()} pts</div>
    `;

    this.comboContainer.appendChild(badge);

    setTimeout(() => {
      badge.classList.add('fade-out');
      setTimeout(() => badge.remove(), 400);
    }, 1100);
  }

  showWaveClearModal(wave, bonusScore, totalScore) {
    this.modalTitle.textContent = `🎉 WAVE ${wave} CLEARED!`;
    this.modalSubtitle.textContent = 'All center bricks eliminated!';
    this.modalStats.innerHTML = `
      <div class="modal-stat-row">
        <span>Wave Clear Bonus:</span>
        <span class="highlight">+${bonusScore.toLocaleString()} pts</span>
      </div>
      <div class="modal-stat-row">
        <span>Total Score:</span>
        <span class="highlight">${totalScore.toLocaleString()} pts</span>
      </div>
    `;
    this.modalBtn.textContent = 'Start Next Wave →';
    this.modalBtn.dataset.action = 'nextWave';
    if (this.modalBtnSecondary) {
      this.modalBtnSecondary.classList.add('hidden');
    }
    this.modalOverlay.classList.remove('hidden');
  }

  showGameOverModal(finalScore, wave, highScore) {
    const isNewHigh = finalScore >= highScore && finalScore > 0;
    this.modalTitle.textContent = 'GAME OVER';
    this.modalSubtitle.textContent = isNewHigh ? '🏆 New High Score!' : 'No valid moves remaining!';
    this.modalStats.innerHTML = `
      <div class="modal-stat-row">
        <span>Final Score:</span>
        <span class="highlight">${finalScore.toLocaleString()} pts</span>
      </div>
      <div class="modal-stat-row">
        <span>Wave Reached:</span>
        <span class="highlight">Wave ${wave}</span>
      </div>
      <div class="modal-stat-row">
        <span>All-Time Best:</span>
        <span class="highlight">${highScore.toLocaleString()} pts</span>
      </div>
    `;
    this.modalBtn.textContent = `Restart Wave ${wave} ↻`;
    this.modalBtn.dataset.action = 'restart';
    if (this.modalBtnSecondary) {
      this.modalBtnSecondary.textContent = 'New Game (Wave 1) ⏮';
      this.modalBtnSecondary.dataset.action = 'resetWave1';
      this.modalBtnSecondary.classList.remove('hidden');
    }
    this.modalOverlay.classList.remove('hidden');
  }

  hideModal() {
    this.modalOverlay.classList.add('hidden');
  }
}
