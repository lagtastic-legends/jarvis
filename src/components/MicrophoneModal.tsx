import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Radio, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface MicrophoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectiveCaptured: (transcript: string) => void;
  onBargeIn?: () => void;
}

export const MicrophoneModal: React.FC<MicrophoneModalProps> = ({
  isOpen,
  onClose,
  onDirectiveCaptured,
  onBargeIn,
}) => {
  const [status, setStatus] = useState<
    'idle' | 'listening' | 'transcribing' | 'processing' | 'unsupported' | 'denied' | 'insecure'
  >('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>('');
  const [hasDetectedVoice, setHasDetectedVoice] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<'webspeech' | 'gemini_fallback'>('webspeech');

  // Callback refs to decouple from parent re-render ticks (LOOP 1)
  const onCloseRef = useRef(onClose);
  const onDirectiveCapturedRef = useRef(onDirectiveCaptured);
  const onBargeInRef = useRef(onBargeIn);

  useEffect(() => {
    onCloseRef.current = onClose;
    onDirectiveCapturedRef.current = onDirectiveCaptured;
    onBargeInRef.current = onBargeIn;
  });

  // Audio & Hardware Refs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const restartDebounceRef = useRef<any>(null);

  // State Tracking Refs
  const finalTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const isRecognitionRunningRef = useRef<boolean>(false);
  const hasDetectedVoiceRef = useRef<boolean>(false);
  const lastVoiceTimestampRef = useRef<number>(0);

  // Stable Full Cleanup Helper
  const stopAllAudio = useCallback(() => {
    isListeningRef.current = false;
    isRecognitionRunningRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartDebounceRef.current) {
      clearTimeout(restartDebounceRef.current);
      restartDebounceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore
      }
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Commit Directive to Parent (Using pinned callback ref)
  const commitText = useCallback((textToCommit: string) => {
    const cleaned = textToCommit.trim();
    if (!cleaned) return;
    setStatus('processing');
    stopAllAudio();
    setTimeout(() => {
      onDirectiveCapturedRef.current(cleaned);
      onCloseRef.current();
    }, 150);
  }, [stopAllAudio]);

  // Transcribe recorded audio chunks with Gemini Multimodal Audio (LOOP 2 & 3)
  const transcribeWithGemini = useCallback(async (): Promise<string> => {
    if (!audioChunksRef.current || audioChunksRef.current.length === 0) return '';
    setStatus('transcribing');
    setActiveEngine('gemini_fallback');

    try {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] || '';
            if (!base64) {
              resolve('');
              return;
            }
            const serverText = await api.transcribeAudio(base64, mimeType);
            resolve(serverText.trim());
          } catch {
            resolve('');
          }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(audioBlob);
      });
    } catch {
      return '';
    }
  }, []);

  // Primary Directive Commit Handler (Web Speech or Gemini Fallback)
  const handleCommit = useCallback(async (forcedText?: string) => {
    const explicitText = (forcedText || manualInput || finalTranscriptRef.current || interimText).trim();

    if (explicitText) {
      commitText(explicitText);
      return;
    }

    // If no text was recognized yet but acoustic voice was detected, invoke Gemini audio transcription
    if (hasDetectedVoiceRef.current && audioChunksRef.current.length > 0) {
      setStatus('transcribing');
      const geminiText = await transcribeWithGemini();
      if (geminiText) {
        setTranscript(geminiText);
        commitText(geminiText);
        return;
      }
    }

    setStatus('listening');
  }, [manualInput, interimText, commitText, transcribeWithGemini]);

  // Start real speech recognition and audio analysis
  const startListening = useCallback(async () => {
    stopAllAudio();
    isListeningRef.current = true;
    hasDetectedVoiceRef.current = false;
    setHasDetectedVoice(false);
    setStatus('listening');
    setTranscript('');
    setInterimText('');
    setManualInput('');
    setErrorMessage('');
    setActiveEngine('webspeech');
    finalTranscriptRef.current = '';
    audioChunksRef.current = [];

    // Trigger parent barge-in if active (safe without state thrashing)
    if (onBargeInRef.current) {
      try {
        onBargeInRef.current();
      } catch {
        // Ignore
      }
    }

    // LOOP 4: Check window.isSecureContext for LAN / Mobile IP security requirements
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || isLocalhost);

    if (!isSecure) {
      setStatus('insecure');
      setErrorMessage(
        `Insecure Origin (${window.location.origin}). Browsers block mic access over plain HTTP on LAN IPs.`
      );
      return;
    }

    try {
      // 1. Microphone Audio Stream
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices microphone API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Verify we are still supposed to be listening (not closed during async prompt)
      if (!isListeningRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      // 2. Parallel MediaRecorder for Gemini Multimodal Audio Fallback (LOOP 3)
      let recorderMime = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) recorderMime = 'audio/webm';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) recorderMime = 'audio/mp4';
          else recorderMime = '';
        }

        try {
          const recorder = recorderMime
            ? new MediaRecorder(stream, { mimeType: recorderMime })
            : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          recorder.start(250); // Collect 250ms audio timeslices
        } catch (recErr) {
          console.warn('[MEDIA_RECORDER] Parallel recording unavailable:', recErr);
        }
      }

      // 3. AudioContext & Spectrum Analyser (VAD & Holographic Visualizer)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          try {
            await audioCtx.resume();
          } catch (ctxErr) {
            console.warn('[MIC] AudioContext resume note:', ctxErr);
          }
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current || !isListeningRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let maxVal = 0;
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            sum += val;
            if (val > maxVal) maxVal = val;
          }
          const avg = sum / dataArray.length;

          // Responsive volume normalization with speech sensitivity boost
          const norm = Math.min(1, Math.max(avg / 35, maxVal / 140));
          setAudioLevel(norm);

          // Acoustic Voice Activity Detection (VAD)
          if (norm > 0.12) {
            hasDetectedVoiceRef.current = true;
            setHasDetectedVoice(true);
            lastVoiceTimestampRef.current = Date.now();
          }

          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      // 4. Web Speech API Recognition with Full Lifecycle Handling (LOOP 3)
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          isRecognitionRunningRef.current = true;
        };

        recognition.onaudiostart = () => {
          isRecognitionRunningRef.current = true;
        };

        recognition.onspeechstart = () => {
          hasDetectedVoiceRef.current = true;
          setHasDetectedVoice(true);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let currentFinal = finalTranscriptRef.current;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const trans = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal = (currentFinal ? currentFinal + ' ' : '') + trans.trim();
              finalTranscriptRef.current = currentFinal;
            } else {
              interim += trans;
            }
          }

          setTranscript(currentFinal);
          setInterimText(interim);
          hasDetectedVoiceRef.current = true;
          setHasDetectedVoice(true);

          const totalActiveText = (currentFinal + ' ' + interim).trim();

          // Reset silence detection timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          if (totalActiveText.length > 2) {
            // Auto-commit on 1.8s of silence following speech
            silenceTimerRef.current = setTimeout(() => {
              if (isListeningRef.current) {
                const final = (finalTranscriptRef.current || interim).trim();
                if (final) {
                  commitText(final);
                }
              }
            }, 1800);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('[SPEECH_REC] Event warning:', err.error);
          if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
            setStatus('denied');
            setErrorMessage('Microphone access was denied by browser or system permissions.');
          } else if (err.error === 'network' || err.error === 'audio-capture') {
            // Fallback gracefully to Gemini audio transcription instead of failing
            setActiveEngine('gemini_fallback');
            setErrorMessage(
              `Web Speech error (${err.error}). Hybrid Gemini Audio Transcription active.`
            );
          }
        };

        recognition.onend = () => {
          isRecognitionRunningRef.current = false;
          // Safe restart debounce check to eliminate InvalidStateError
          if (isListeningRef.current && mediaStreamRef.current) {
            if (restartDebounceRef.current) clearTimeout(restartDebounceRef.current);
            restartDebounceRef.current = setTimeout(() => {
              if (isListeningRef.current && !isRecognitionRunningRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {
                  // Ignore if already active
                }
              }
            }, 250);
          }
        };

        try {
          recognition.start();
        } catch (recStartErr) {
          console.warn('[SPEECH_REC] Initial start warning:', recStartErr);
        }
      } else {
        // Browser does not support Web Speech API natively (e.g. Firefox)
        setActiveEngine('gemini_fallback');
      }
    } catch (err: any) {
      console.warn('[MIC] Initialization error:', err);
      setStatus('denied');
      setErrorMessage(err.message || 'Unable to access microphone stream.');
    }
  }, [stopAllAudio, commitText]);

  // Main lifecycle: depends STRICTLY on isOpen to eliminate 5-second telemetry teardown loop (LOOP 1)
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopAllAudio();
      setStatus('idle');
      setTranscript('');
      setInterimText('');
      setManualInput('');
      setHasDetectedVoice(false);
    }
    return () => {
      stopAllAudio();
    };
  }, [isOpen, startListening, stopAllAudio]);

  if (!isOpen) return null;

  const currentDisplay = manualInput || (transcript + ' ' + interimText).trim();
  const isTranscribing = status === 'transcribing';

  const quickDirectives = [
    'Initiate perimeter scan',
    'Run system diagnostic',
    'Activate coding mode',
    'Daily briefing',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-6 shadow-glow-cyan-lg space-y-5">
        <button
          onClick={() => {
            stopAllAudio();
            onCloseRef.current();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Mic className="w-5 h-5" />
            {status === 'listening' && (
              <span
                className="absolute inset-0 rounded-xl border border-cyan-400 animate-ping opacity-60 pointer-events-none"
                style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-bold text-slate-100">
                Acoustic Sensor Stream
              </h3>
              {status === 'listening' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                  LIVE LISTENING
                </span>
              )}
              {isTranscribing && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  <Cpu className="w-3 h-3 animate-spin text-purple-400" />
                  GEMINI STT
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-cyan-400/70">
              {activeEngine === 'gemini_fallback'
                ? 'Hybrid Gemini Neural Audio Transcription Pipeline'
                : 'Continuous Dual-Engine Voice Comprehension (Web Speech + Gemini Audio)'}
            </p>
          </div>
        </div>

        {/* Live Audio Amplitude Visualizer */}
        {(status === 'listening' || isTranscribing) && (
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span>MIC INPUT LEVEL</span>
                {hasDetectedVoice && (
                  <span className="text-emerald-400 font-bold tracking-wider">[VOICE DETECTED]</span>
                )}
              </span>
              <span className="text-cyan-300 font-bold">
                {Math.round(audioLevel * 100)}% AMPLITUDE
              </span>
            </div>
            {/* Visualizer Bars */}
            <div className="h-6 flex items-center justify-center gap-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const centerDist = Math.abs(i - 12) / 12;
                const dynamicHeight = Math.max(
                  4,
                  Math.sin((i / 24) * Math.PI) * (audioLevel * 24) + 2
                );
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      opacity: 0.3 + (1 - centerDist) * 0.7,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Real-time Transcription & Directive Input Box */}
        <div className="space-y-2">
          <div className="min-h-[100px] max-h-48 overflow-y-auto p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 flex flex-col justify-center">
            {isTranscribing ? (
              <div className="flex flex-col items-center justify-center gap-2 py-3 text-cyan-300">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="font-mono text-xs tracking-wider uppercase">
                  Processing Audio via Gemini Multimodal STT...
                </span>
              </div>
            ) : currentDisplay ? (
              <p className="font-mono text-sm text-cyan-200 leading-relaxed font-semibold">
                "{currentDisplay}"
              </p>
            ) : status === 'listening' ? (
              <p className="font-mono text-xs text-slate-500 italic text-center">
                Speak now... JARVIS is listening for your command.
              </p>
            ) : status === 'insecure' ? (
              <div className="space-y-2 text-center p-2">
                <ShieldAlert className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="font-mono text-xs text-amber-300 font-bold">
                  Insecure Context Detected (Plain HTTP)
                </p>
                <p className="text-[11px] font-mono text-slate-300">
                  Chromium blocks microphone access on non-localhost HTTP addresses. You can type directly below, or enable:
                </p>
                <code className="block text-[10px] font-mono text-cyan-300 bg-slate-950 px-2 py-1 rounded border border-cyan-500/30 select-all">
                  chrome://flags/#unsafely-treat-insecure-origin-as-secure
                </code>
              </div>
            ) : status === 'unsupported' ? (
              <div className="space-y-2 text-center">
                <p className="font-mono text-xs text-amber-300">
                  Web Speech API is not supported in this browser. Fallback typing active.
                </p>
              </div>
            ) : null}
          </div>

          {/* Quick Manual Override Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommit();
                }
              }}
              placeholder="Or type/edit directive directly..."
              className="flex-1 bg-slate-900/80 border border-cyan-500/25 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {manualInput && (
              <button
                type="button"
                onClick={() => setManualInput('')}
                className="p-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Suggested Vocal Directives
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickDirectives.map((cmd) => (
              <button
                type="button"
                key={cmd}
                onClick={() => handleCommit(cmd)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/25 bg-slate-900/60 hover:bg-cyan-950/60 hover:border-cyan-400/50 text-[11px] font-mono text-cyan-300 transition-all"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{cmd}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Banners */}
        {status === 'processing' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Engaging directive into neural processing loop...</span>
          </div>
        )}

        {status === 'denied' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Microphone Sensor Calibration Anomaly</p>
              <p className="text-[11px] opacity-80">{errorMessage}</p>
              <p className="text-[10px] text-cyan-300">
                Tip: Click "Allow" in your browser's address bar mic permission popup.
              </p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              stopAllAudio();
              onCloseRef.current();
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {(status === 'denied' || status === 'insecure') && (
              <button
                type="button"
                onClick={startListening}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-cyan-400/50 text-cyan-300 hover:bg-cyan-950/40 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Mic</span>
              </button>
            )}

            <button
              onClick={() => handleCommit()}
              disabled={!currentDisplay && !hasDetectedVoice && !isTranscribing}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : (
                <>
                  <span>{hasDetectedVoice && !currentDisplay ? 'Transcribe Audio' : 'Engage Directive'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
