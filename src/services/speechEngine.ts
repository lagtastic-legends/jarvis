/**
 * Web Speech API Vocal Engine for JARVIS AI
 * Dynamically prioritizes British English male voices (Daniel, Oliver, George, Google UK English Male)
 * to emulate Paul Bettany's performance as Tony Stark's personal assistant.
 */
export class JarvisSpeechEngine {
  private voice: SpeechSynthesisVoice | null = null;
  private pitch: number = 0.95;
  private rate: number = 1.10;
  private enabled: boolean = true;
  private isSpeaking: boolean = false;
  private onStateChangeCallback: ((speaking: boolean, currentWord?: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Filter prioritizing sophisticated British English male profiles
    this.voice = voices.find(v => 
      (v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('George') || v.name.includes('Arthur')) &&
      (v.lang.includes('en-GB') || v.lang.includes('en_GB'))
    ) || voices.find(v => 
      v.lang === 'en-GB' || v.lang === 'en_GB'
    ) || voices.find(v => 
      v.name.includes('Google UK English Male') || v.name.includes('English (United Kingdom)')
    ) || voices.find(v => 
      v.lang.startsWith('en')
    ) || voices[0];
  }

  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public getPitch(): number {
    return this.pitch;
  }

  public getRate(): number {
    return this.rate;
  }

  public getIsEnabled(): boolean {
    return this.enabled;
  }

  public getActiveVoiceName(): string {
    return this.voice ? `${this.voice.name} (${this.voice.lang})` : 'System Default Speech';
  }

  public onStateChange(cb: (speaking: boolean, currentWord?: string) => void): void {
    this.onStateChangeCallback = cb;
  }

  public speak(text: string, onEnd?: () => void): void {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any current speech
    window.speechSynthesis.cancel();

    if (!this.voice) {
      this.initVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    };

    utterance.onboundary = (e) => {
      if (e.name === 'word' && this.onStateChangeCallback) {
        const word = text.substring(e.charIndex, e.charIndex + (e.charLength || 6));
        this.onStateChangeCallback(true, word);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.warn('[SPEECH_ENGINE] Speech error:', err);
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechEngine = new JarvisSpeechEngine();
