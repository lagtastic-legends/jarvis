/**
 * Web Speech API Vocal Engine for JARVIS AI
 * Dynamically prioritizes British English male voices (Daniel, Oliver, George, Google UK English Male)
 * to emulate Paul Bettany's performance as Tony Stark's personal assistant.
 * 
 * Includes sentence-level streaming TTS queue with instant markdown stripping,
 * punctuation-boundary detection, and zero-latency user barge-in cancellation.
 */
export class JarvisSpeechEngine {
  private voice: SpeechSynthesisVoice | null = null;
  private pitch: number = 0.95;
  private rate: number = 1.10;
  private enabled: boolean = true;
  private isSpeaking: boolean = false;
  private onStateChangeCallback: ((speaking: boolean, currentWord?: string) => void) | null = null;

  // Streaming sentence queue state
  private streamBuffer: string = '';
  private ttsQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private onQueueCompleteCallback: (() => void) | null = null;

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
    this.voice =
      voices.find(
        (v) =>
          (v.name.includes('Daniel') ||
            v.name.includes('Oliver') ||
            v.name.includes('George') ||
            v.name.includes('Arthur')) &&
          (v.lang.includes('en-GB') || v.lang.includes('en_GB'))
      ) ||
      voices.find((v) => v.lang === 'en-GB' || v.lang === 'en_GB') ||
      voices.find(
        (v) =>
          v.name.includes('Google UK English Male') ||
          v.name.includes('English (United Kingdom)')
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];
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

  /**
   * Cleans raw LLM markdown formatting before passing to SpeechSynthesis
   */
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/[*#_`~>]/g, '') // Strip markdown characters
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Replace links with link text
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Detects sentence boundary index (. ! ? \n) ignoring numbers like 3.4
   */
  private findSentenceBoundary(text: string): number {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        const isNumber =
          i > 0 && i < text.length - 1 && /\d/.test(text[i - 1]) && /\d/.test(text[i + 1]);
        if (!isNumber && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
          return i + 1;
        }
      }
    }
    return -1;
  }

  /**
   * Ingests streaming token chunks and pushes finished sentences to the TTS queue
   */
  public speakStreamChunk(chunk: string): void {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.streamBuffer += chunk;

    let boundaryIndex: number;
    while ((boundaryIndex = this.findSentenceBoundary(this.streamBuffer)) !== -1) {
      const sentence = this.streamBuffer.slice(0, boundaryIndex).trim();
      this.streamBuffer = this.streamBuffer.slice(boundaryIndex).trimStart();
      if (sentence) {
        this.enqueueSentence(sentence);
      }
    }
  }

  /**
   * Finalizes streaming speech, flushing any lingering sentence fragment
   */
  public finishStream(onComplete?: () => void): void {
    if (onComplete) {
      this.onQueueCompleteCallback = onComplete;
    }
    const remaining = this.cleanTextForSpeech(this.streamBuffer);
    this.streamBuffer = '';
    if (remaining) {
      this.enqueueSentence(remaining);
    } else if (!this.isProcessingQueue && onComplete) {
      this.onQueueCompleteCallback = null;
      onComplete();
    }
  }

  private enqueueSentence(rawSentence: string): void {
    const cleaned = this.cleanTextForSpeech(rawSentence);
    if (!cleaned) return;
    this.ttsQueue.push(cleaned);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.ttsQueue = [];
      this.isProcessingQueue = false;
      return;
    }

    if (this.ttsQueue.length === 0) {
      this.isProcessingQueue = false;
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (this.onQueueCompleteCallback) {
        const cb = this.onQueueCompleteCallback;
        this.onQueueCompleteCallback = null;
        cb();
      }
      return;
    }

    this.isProcessingQueue = true;
    this.isSpeaking = true;
    if (this.onStateChangeCallback) this.onStateChangeCallback(true);

    const sentence = this.ttsQueue.shift()!;
    const utterance = new SpeechSynthesisUtterance(sentence);
    if (!this.voice) this.initVoices();
    if (this.voice) utterance.voice = this.voice;
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    utterance.onboundary = (e) => {
      if (e.name === 'word' && this.onStateChangeCallback) {
        const word = sentence.substring(e.charIndex, e.charIndex + (e.charLength || 6));
        this.onStateChangeCallback(true, word);
      }
    };

    utterance.onend = () => {
      this.processQueue();
    };

    utterance.onerror = (err) => {
      console.warn('[SPEECH_ENGINE] Utterance error:', err);
      this.processQueue();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * One-shot speech execution for canned phrases or user tests
   */
  public speak(text: string, onEnd?: () => void): void {
    this.stop();
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }
    this.onQueueCompleteCallback = onEnd || null;
    this.enqueueSentence(text);
  }

  /**
   * Instant barge-in cancellation: purges all buffers and halts speech synthesis
   */
  public stop(): void {
    this.streamBuffer = '';
    this.ttsQueue = [];
    this.isProcessingQueue = false;
    this.onQueueCompleteCallback = null;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    if (this.onStateChangeCallback) this.onStateChangeCallback(false);
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechEngine = new JarvisSpeechEngine();
