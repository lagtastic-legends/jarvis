import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Radio, 
  ArrowRight, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

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
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'unsupported' | 'denied'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Stable cleanup helper
  const stopAllAudio = useCallback(() => {
    isListeningRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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

  // Submit recognized directive
  const handleCommitDirective = useCallback((textToCommit: string) => {
    const cleaned = textToCommit.trim();
    if (!cleaned) return;
    setStatus('processing');
    stopAllAudio();
    setTimeout(() => {
      onDirectiveCaptured(cleaned);
      onClose();
    }, 200);
  }, [stopAllAudio, onDirectiveCaptured, onClose]);

  // Start real speech recognition and audio analysis
  const startListening = useCallback(async () => {
    stopAllAudio();
    isListeningRef.current = true;
    setStatus('listening');
    setTranscript('');
    setInterimText('');
    setManualInput('');
    setErrorMessage('');
    finalTranscriptRef.current = '';

    // Notify parent to stop any outgoing speech (barge-in)
    if (onBargeIn) {
      try {
        onBargeIn();
      } catch {
        // Ignore
      }
    }

    try {
      // 1. Microphone Audio Stream & Volume Analyser
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

      // Verify we are still supposed to be listening (not closed during await)
      if (!isListeningRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      // 2. AudioContext & Spectrum Analyser
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        // Modern browsers require explicit resume
        if (audioCtx.state === 'suspended') {
          try {
            await audioCtx.resume();
          } catch (ctxErr) {
            console.warn('[MIC] AudioContext resume failed:', ctxErr);
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
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      // 3. Web Speech API Recognition
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setStatus('unsupported');
        return;
      }

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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

        const totalActiveText = (currentFinal + ' ' + interim).trim();

        // Reset silence detection timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (totalActiveText.length > 2) {
          // If 1.8s of silence follows speech, auto-commit
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              const final = (finalTranscriptRef.current || interim).trim();
              if (final) {
                handleCommitDirective(final);
              }
            }
          }, 1800);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('[SPEECH_REC] Recognition event:', err.error);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setStatus('denied');
          setErrorMessage('Microphone access was denied by browser or system permissions.');
        } else if (err.error === 'network') {
          setErrorMessage('Web Speech cloud service network anomaly. You can also type or use quick directives.');
        }
        // 'no-speech' is normal during pauses; onend will automatically restart if still active
      };

      recognition.onend = () => {
        // Reliably inspect ref instead of stale closure
        if (isListeningRef.current && mediaStreamRef.current) {
          try {
            recognition.start();
          } catch {
            // Already active or restarting
          }
        }
      };

      try {
        recognition.start();
      } catch (recStartErr) {
        console.warn('[SPEECH_REC] Start warning:', recStartErr);
      }
    } catch (err: any) {
      console.warn('[MIC] Initialization error:', err);
      setStatus('denied');
      setErrorMessage(err.message || 'Unable to access microphone stream.');
    }
  }, [stopAllAudio, onBargeIn, handleCommitDirective]);

  // Handle modal open/close cleanly without dependency feedback loops
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopAllAudio();
      setStatus('idle');
      setTranscript('');
      setInterimText('');
      setManualInput('');
    }
    return () => {
      stopAllAudio();
    };
  }, [isOpen, startListening, stopAllAudio]);

  if (!isOpen) return null;

  const currentDisplay = manualInput || (transcript + ' ' + interimText).trim();

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
            onClose();
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
            <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Acoustic Sensor Stream</span>
              {status === 'listening' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                  LIVE LISTENING
                </span>
              )}
            </h3>
            <p className="text-xs font-mono text-cyan-400/70">
              Continuous Real-Time Voice Comprehension
            </p>
          </div>
        </div>

        {/* Live Audio Amplitude Visualizer */}
        {status === 'listening' && (
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>MIC INPUT LEVEL</span>
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
            {currentDisplay ? (
              <p className="font-mono text-sm text-cyan-200 leading-relaxed font-semibold">
                "{currentDisplay}"
              </p>
            ) : status === 'listening' ? (
              <p className="font-mono text-xs text-slate-500 italic text-center">
                Speak now... JARVIS is listening for your command.
              </p>
            ) : status === 'unsupported' ? (
              <div className="space-y-2 text-center">
                <p className="font-mono text-xs text-amber-300">
                  Web Speech API is not supported in this browser environment.
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
                if (e.key === 'Enter' && currentDisplay) {
                  handleCommitDirective(currentDisplay);
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
                onClick={() => handleCommitDirective(cmd)}
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
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {status === 'denied' && (
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
              onClick={() => {
                const toCommit = currentDisplay;
                if (toCommit) {
                  handleCommitDirective(toCommit);
                }
              }}
              disabled={!currentDisplay}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>Engage Directive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
