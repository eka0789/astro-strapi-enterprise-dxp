// Procedural audio system - Web Audio API, no external assets needed.
// Music: simple arpeggio loop from pentatonic scale, tempo ramps with intensity.
// SFX: synthesized oscillators per event.

type SfxName =
  | 'move' | 'rotate' | 'drop' | 'lock' | 'clear1' | 'clear2' | 'clear3' | 'clear4'
  | 'combo' | 'tetris' | 'perfect' | 'powerup' | 'coin' | 'chest' | 'reward'
  | 'bossHit' | 'bossAttack' | 'victory' | 'defeat' | 'ui' | 'hold' | 'event';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private musicRoot = 220;
  private intensity = 0; // 0..1 raises tempo/adds octave
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private playing = false;
  private comboPitch = 0;

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.musicGain) this.musicGain.gain.value = music * 0.25;
    if (this.sfxGain) this.sfxGain.gain.value = sfx * 0.5;
  }

  // Must be called from a user gesture handler (browser autoplay policy)
  ensureContext(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.25;
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume * 0.5;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  startMusic(rootHz: number): void {
    this.ensureContext();
    if (!this.ctx) return;
    this.musicRoot = rootHz;
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    if (this.musicTimer === null) {
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 120);
    }
  }

  stopMusic(): void {
    this.playing = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.playing || !this.musicGain) return;
    const tempo = 0.28 - this.intensity * 0.08; // seconds per step
    while (this.nextNoteTime < this.ctx.currentTime + 0.3) {
      this.playMusicStep(this.nextNoteTime, tempo);
      this.nextNoteTime += tempo;
    }
  }

  private playMusicStep(t: number, tempo: number): void {
    if (!this.ctx || !this.musicGain) return;
    const scale = [0, 3, 5, 7, 10, 12, 15]; // minor pentatonic-ish
    const pattern = [0, 2, 4, 2, 5, 4, 2, 0];
    const idx = pattern[this.step % pattern.length];
    const octave = this.step % 16 < 8 ? 1 : 2;
    const freq = this.musicRoot * Math.pow(2, scale[idx] / 12) * (octave > 1 ? 1 : 0.5);
    const dur = tempo * 0.9;

    const osc = this.ctx.createOscillator();
    osc.type = this.step % 4 === 0 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12 + this.intensity * 0.06, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);

    // bass every 8 steps
    if (this.step % 8 === 0) {
      const bass = this.ctx.createOscillator();
      bass.type = 'sawtooth';
      bass.frequency.value = this.musicRoot / 2;
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + tempo * 6);
      bass.connect(bg);
      bg.connect(this.musicGain);
      bass.start(t);
      bass.stop(t + tempo * 6 + 0.05);
    }
    this.step++;
  }

  sfx(name: SfxName): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'move': this.blip(t, 200, 0.05, 'square', 0.06); break;
      case 'rotate': this.blip(t, 320, 0.06, 'square', 0.07); break;
      case 'drop': this.blip(t, 140, 0.09, 'triangle', 0.14); break;
      case 'lock': this.blip(t, 100, 0.07, 'sine', 0.12); break;
      case 'hold': this.blip(t, 440, 0.06, 'sine', 0.08); break;
      case 'ui': this.blip(t, 520, 0.05, 'sine', 0.07); break;
      case 'clear1': this.arp(t, [392, 523], 0.07); break;
      case 'clear2': this.arp(t, [392, 523, 659], 0.07); break;
      case 'clear3': this.arp(t, [440, 587, 740], 0.07); break;
      case 'clear4':
      case 'tetris': this.arp(t, [523, 659, 784, 1047, 1319], 0.09, 0.16); break;
      case 'perfect': this.arp(t, [659, 784, 988, 1319, 1568, 2093], 0.09, 0.18); break;
      case 'combo':
        this.comboPitch = Math.min(this.comboPitch + 1, 10);
        this.blip(t, 330 * Math.pow(1.06, this.comboPitch), 0.08, 'square', 0.1);
        break;
      case 'powerup': this.sweep(t, 220, 880, 0.25); break;
      case 'coin': this.arp(t, [988, 1319], 0.06, 0.1); break;
      case 'reward': this.arp(t, [523, 659, 784], 0.08, 0.12); break;
      case 'chest': this.arp(t, [523, 659, 784, 988, 1175], 0.08, 0.14); break;
      case 'bossHit': this.blip(t, 90, 0.16, 'sawtooth', 0.18); break;
      case 'bossAttack': this.sweep(t, 880, 110, 0.35); break;
      case 'event': this.arp(t, [660, 880, 660], 0.09, 0.12); break;
      case 'victory': this.arp(t, [523, 659, 784, 1047, 784, 1047, 1319], 0.12, 0.16); break;
      case 'defeat': this.arp(t, [392, 330, 262, 196], 0.16, 0.14); break;
    }
    if (name !== 'combo') this.comboPitch = 0;
  }

  private blip(t: number, freq: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private arp(t: number, freqs: number[], noteDur: number, vol = 0.12): void {
    freqs.forEach((f, i) => this.blip(t + i * noteDur, f, noteDur * 1.6, 'square', vol));
  }

  private sweep(t: number, from: number, to: number, dur: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

export const audio = new AudioSystem();
