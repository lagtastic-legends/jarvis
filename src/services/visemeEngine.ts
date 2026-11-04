/**
 * 13-Class Universal Unicode Viseme Engine for JARVIS AI (Mark-LVI Port)
 * 
 * Maps spoken text and phoneme syllables to physical viseme deformation weights
 * { jawOpen, mouthWide, lipClosure } using canonical Unicode decomposition.
 * Drives real-time 3D particle deformation in HolographicOrb.
 */

export type VisemeClass =
  | 'REST'
  | 'AA'
  | 'E'
  | 'I'
  | 'O'
  | 'U'
  | 'MBP'
  | 'FV'
  | 'L'
  | 'R'
  | 'S'
  | 'TH'
  | 'WQ';

export interface VisemeWeights {
  jawOpen: number;    // 0.0 - 1.0 (vertical expansion / open vowel)
  mouthWide: number;  // 0.0 - 1.0 (horizontal flare)
  lipClosure: number; // 0.0 - 1.0 (compression / plosive ring pinch)
}

export interface VisemeFrame {
  viseme: VisemeClass;
  weights: VisemeWeights;
  timestamp: number;
  sourceChar?: string;
}

export const VISEME_WEIGHTS: Record<VisemeClass, VisemeWeights> = {
  REST: { jawOpen: 0.0, mouthWide: 0.0, lipClosure: 0.0 },
  AA:   { jawOpen: 0.95, mouthWide: 0.50, lipClosure: 0.0 },
  E:    { jawOpen: 0.55, mouthWide: 0.70, lipClosure: 0.0 },
  I:    { jawOpen: 0.35, mouthWide: 0.85, lipClosure: 0.0 },
  O:    { jawOpen: 0.75, mouthWide: 0.25, lipClosure: 0.35 },
  U:    { jawOpen: 0.45, mouthWide: 0.15, lipClosure: 0.70 },
  MBP:  { jawOpen: 0.05, mouthWide: 0.10, lipClosure: 1.0 },
  FV:   { jawOpen: 0.20, mouthWide: 0.40, lipClosure: 0.60 },
  L:    { jawOpen: 0.40, mouthWide: 0.40, lipClosure: 0.10 },
  R:    { jawOpen: 0.35, mouthWide: 0.30, lipClosure: 0.40 },
  S:    { jawOpen: 0.15, mouthWide: 0.65, lipClosure: 0.20 },
  TH:   { jawOpen: 0.25, mouthWide: 0.45, lipClosure: 0.15 },
  WQ:   { jawOpen: 0.30, mouthWide: 0.15, lipClosure: 0.85 },
};

export class VisemeEngine {
  private currentFrame: VisemeFrame = {
    viseme: 'REST',
    weights: { ...VISEME_WEIGHTS.REST },
    timestamp: Date.now(),
  };

  private listeners: Set<(frame: VisemeFrame) => void> = new Set();
  private activeTimers: any[] = [];
  private restTimeout: any = null;

  /**
   * Universal Unicode decomposition (strips combining marks, accents, emojis)
   */
  public normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /**
   * Maps a normalized character to its 13-class canonical viseme
   */
  public charToViseme(ch: string): VisemeClass {
    switch (ch) {
      case 'm':
      case 'b':
      case 'p':
        return 'MBP';
      case 'f':
      case 'v':
        return 'FV';
      case 'w':
      case 'q':
        return 'WQ';
      case 'l':
        return 'L';
      case 'r':
        return 'R';
      case 's':
      case 'z':
      case 'c':
      case 'x':
        return 'S';
      case 't':
      case 'd':
      case 'n':
      case 'g':
      case 'k':
        return 'TH';
      case 'a':
      case 'h':
        return 'AA';
      case 'e':
        return 'E';
      case 'i':
      case 'y':
      case 'j':
        return 'I';
      case 'o':
        return 'O';
      case 'u':
        return 'U';
      default:
        return 'REST';
    }
  }

  /**
   * Ingests a spoken word boundary event from SpeechSynthesis
   * and schedules a rapid sequence of visemes matching natural articulation
   */
  public processSpokenWord(word: string, speechRate: number = 1.1): void {
    this.clearScheduledTimers();

    const normalized = this.normalizeText(word).replace(/[^a-z]/g, '');
    if (!normalized) {
      this.emitViseme('REST');
      return;
    }

    // Allocate 40-75ms per phoneme based on speech rate
    const phonemeDuration = Math.max(35, Math.min(80, Math.round(55 / speechRate)));
    const chars = normalized.split('');

    chars.forEach((ch, idx) => {
      const delay = idx * phonemeDuration;
      const timer = setTimeout(() => {
        const viseme = this.charToViseme(ch);
        this.emitViseme(viseme, ch);
      }, delay);
      this.activeTimers.push(timer);
    });

    // Reset to REST shortly after word completes
    const totalDuration = chars.length * phonemeDuration + 60;
    this.restTimeout = setTimeout(() => {
      this.emitViseme('REST');
    }, totalDuration);
  }

  /**
   * Instantly emits a specific viseme frame to all registered subscribers
   */
  public emitViseme(viseme: VisemeClass, sourceChar?: string): void {
    const weights = VISEME_WEIGHTS[viseme] || VISEME_WEIGHTS.REST;
    this.currentFrame = {
      viseme,
      weights,
      timestamp: Date.now(),
      sourceChar,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(this.currentFrame);
      } catch (err) {
        console.warn('[VISEME_ENGINE] Listener error:', err);
      }
    });
  }

  /**
   * Subscribes to viseme weight changes. Returns an unsubscription function.
   */
  public onViseme(listener: (frame: VisemeFrame) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentFrame);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentFrame(): VisemeFrame {
    return this.currentFrame;
  }

  public clearScheduledTimers(): void {
    this.activeTimers.forEach((t) => clearTimeout(t));
    this.activeTimers = [];
    if (this.restTimeout) {
      clearTimeout(this.restTimeout);
      this.restTimeout = null;
    }
  }

  public reset(): void {
    this.clearScheduledTimers();
    this.emitViseme('REST');
  }
}

export const visemeEngine = new VisemeEngine();
