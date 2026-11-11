import { JarvisState } from '../types/jarvis';
import { nativeAndroid } from './nativeAndroid';

/**
 * Procedural Web Audio API Synthesizer for JARVIS Command Center
 * Generates all acoustic sci-fi feedback procedurally in real-time without external audio assets.
 */
export class JarvisAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private enabled: boolean = true;
  private volume: number = 0.8;

  constructor() {
    // Lazy initialization on first user interaction
  }

  public init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsEnabled(): boolean {
    return this.enabled;
  }

  // 1. Cyber Chirp (Button clicks, menu selection)
  public playChirp(): void {
    nativeAndroid.triggerHaptic('light');
    if (!this.enabled || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.055);
  }

  // 2. Harmonic state transition chime
  public playStateSound(state: JarvisState): void {
    if (!this.enabled || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);

    if (state === 'IDLE') {
      nativeAndroid.triggerHaptic('light');
      [523.25, 659.25].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.04, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.18);
        osc.connect(g);
        g.connect(gain);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.2);
      });
    } else if (state === 'LISTENING') {
      nativeAndroid.triggerHaptic('medium');
      [880, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.06, now + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.12);
        osc.connect(g);
        g.connect(gain);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.13);
      });
    } else if (state === 'PROCESSING' || state === 'THINKING') {
      nativeAndroid.triggerHaptic('light');
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.05, now + idx * 0.035);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.035 + 0.1);
        osc.connect(g);
        g.connect(gain);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.11);
      });
    } else if (state === 'SPEAKING') {
      nativeAndroid.triggerHaptic('success');
      [659.25, 987.77, 1318.5].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(g);
        g.connect(gain);
        osc.start(now);
        osc.stop(now + 0.36);
      });
    } else if (state === 'INTERRUPTED') {
      nativeAndroid.triggerHaptic('warning');
      [800, 400].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.06, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.08);
        osc.connect(g);
        g.connect(gain);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.09);
      });
    } else if (state === 'ERROR') {
      nativeAndroid.triggerHaptic('error');
      this.playAlert();
    }
  }

  // 3. Filtered Resonant Tactical Sweep
  public playTacticalSweep(): void {
    if (!this.enabled || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.22);
    filter.Q.setValueAtTime(6.0, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 4. Data Transmit Pulse
  public playTransmit(): void {
    if (!this.enabled || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [920, 1180, 1640];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + idx * 0.04 + 0.06);

      gain.gain.setValueAtTime(0.07, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.08);
    });
  }

  // 5. Tactical Threat Alert Tone
  public playAlert(): void {
    nativeAndroid.triggerHaptic('error');
    if (!this.enabled || this.isMuted) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    [440, 311.13].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);

      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.24);
    });
  }
}

export const audioSynth = new JarvisAudioSynth();
