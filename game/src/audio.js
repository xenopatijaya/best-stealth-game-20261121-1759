// audio.js — one job: procedural WebAudio. No audio files anywhere.
// Footsteps (player soft ticks, guards louder and stereo-panned by
// relative x so you can hear where a guard is), alert sting, pickup
// chime, pebble clink, win/lose stingers, faint ambient hum.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientNodes = null;
    this.muted = false;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  startAmbient() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ambientNodes = { osc, lfo };
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseBurst(dur, vol, pan, freq) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    src.start();
  }

  // Soft tick under the player's own feet; silent while sneaking.
  playerStep(sneaking) {
    if (sneaking) return;
    this.noiseBurst(0.05, 0.12, 0, 900);
  }

  // Guard footstep: louder, panned by the guard's x relative to the
  // player, quieter with distance — footsteps tell you where a guard is.
  guardStep(relX, distanceTiles) {
    const vol = Math.max(0, 0.5 - distanceTiles * 0.06);
    if (vol <= 0.02) return;
    this.noiseBurst(0.07, vol, relX, 500);
  }

  alertSting() {
    this.tone(220, 0.18, 'square', 0.16);
    this.tone(311, 0.28, 'square', 0.16, 0.14);
  }

  suspiciousBlip() {
    this.tone(440, 0.12, 'triangle', 0.12, 0, 330);
  }

  pickupChime() {
    this.tone(660, 0.12, 'sine', 0.2);
    this.tone(990, 0.22, 'sine', 0.18, 0.09);
  }

  pebbleClink() {
    this.tone(1800, 0.06, 'triangle', 0.14);
    this.tone(2400, 0.05, 'triangle', 0.1, 0.05);
  }

  winSting() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.18, i * 0.11));
  }

  loseSting() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, i * 0.13));
  }

  exitOpen() {
    this.tone(523, 0.15, 'sine', 0.14);
    this.tone(784, 0.3, 'sine', 0.14, 0.1);
  }
}
