// src/audio/SoundSystem.js - Procedural Web Audio synthesizer

export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playLaunch() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playHit() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.07);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  playMatch(combo = 1) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Scale pitch based on combo multiplier
    const baseFreq = 440 * Math.pow(1.15, Math.min(combo - 1, 8));
    const chord = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Major chord

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);

      gain.gain.setValueAtTime(0.18, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.3);
    });
  }

  playSlide() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  createNoiseBuffer(duration = 1.0) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playFireworkSingle(startTime, pitchMultiplier = 1.0, isGrand = false) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Whistling rocket launch ascent (0.2s)
    const whistleOsc = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistleOsc.type = 'triangle';
    whistleOsc.frequency.setValueAtTime(300 * pitchMultiplier, startTime);
    whistleOsc.frequency.exponentialRampToValueAtTime(1100 * pitchMultiplier, startTime + 0.22);

    whistleGain.gain.setValueAtTime(0.001, startTime);
    whistleGain.gain.linearRampToValueAtTime(0.12, startTime + 0.12);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

    whistleOsc.connect(whistleGain);
    whistleGain.connect(this.masterGain);
    whistleOsc.start(startTime);
    whistleOsc.stop(startTime + 0.25);

    const burstTime = startTime + 0.22;

    // 2. Low-frequency explosion bass boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime((isGrand ? 160 : 130) * pitchMultiplier, burstTime);
    boomOsc.frequency.exponentialRampToValueAtTime(35, burstTime + (isGrand ? 0.45 : 0.35));

    boomGain.gain.setValueAtTime(isGrand ? 0.35 : 0.25, burstTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, burstTime + (isGrand ? 0.45 : 0.35));

    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(burstTime);
    boomOsc.stop(burstTime + 0.5);

    // 3. Explosive noise pop
    const noiseBuffer = this.createNoiseBuffer(0.5);
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 * pitchMultiplier, burstTime);
      filter.Q.setValueAtTime(1.5, burstTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isGrand ? 0.3 : 0.22, burstTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.35);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start(burstTime);
      noiseSource.stop(burstTime + 0.4);
    }

    // 4. Sizzling sparkles & crackles
    const crackleCount = isGrand ? 9 : 5;
    for (let c = 0; c < crackleCount; c++) {
      const crackleTime = burstTime + 0.08 + Math.random() * 0.35;
      const cOsc = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();

      cOsc.type = 'sawtooth';
      cOsc.frequency.setValueAtTime(1800 + Math.random() * 2400, crackleTime);

      cGain.gain.setValueAtTime(0.07 + Math.random() * 0.05, crackleTime);
      cGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.025);

      cOsc.connect(cGain);
      cGain.connect(this.masterGain);

      cOsc.start(crackleTime);
      cOsc.stop(crackleTime + 0.03);
    }
  }

  playWaveClear() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Triumphant Fanfare Arpeggio
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    fanfareNotes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.18, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });

    // 2. Staggered Multi-Stage Fireworks across the 2 seconds
    const fireworkSchedule = [
      { delay: 0.05, pitch: 1.0, isGrand: false },
      { delay: 0.35, pitch: 1.15, isGrand: false },
      { delay: 0.70, pitch: 0.9, isGrand: false },
      { delay: 1.05, pitch: 1.25, isGrand: false },
      { delay: 1.35, pitch: 1.05, isGrand: false },
      { delay: 1.55, pitch: 0.85, isGrand: true },
      { delay: 1.65, pitch: 1.3, isGrand: true },
    ];

    fireworkSchedule.forEach(({ delay, pitch, isGrand }) => {
      this.playFireworkSingle(t + delay, pitch, isGrand);
    });
  }

  playGameOver() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.14);

      gain.gain.setValueAtTime(0.15, t + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.45);
    });
  }
}
