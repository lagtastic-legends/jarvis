import React, { useState } from 'react';
import { Mic, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface MicrophoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccessGranted: () => void;
}

export const MicrophoneModal: React.FC<MicrophoneModalProps> = ({
  isOpen,
  onClose,
  onAccessGranted,
}) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleRequestMic = async () => {
    setStatus('requesting');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately after permission check
      stream.getTracks().forEach((track) => track.stop());
      setStatus('granted');
      setTimeout(() => {
        onAccessGranted();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.warn('[MIC] Access error:', err);
      setStatus('denied');
      setErrorMessage(err.message || 'Permission denied by user or system.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/40 bg-jarvis-space/95 p-6 shadow-glow-cyan-lg space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono text-base font-bold text-slate-100">
              Vocal Interface Calibration
            </h3>
            <p className="text-xs font-mono text-cyan-400/70">
              Acoustic Sensor Authorization
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          JARVIS requires real-time microphone stream ingestion to perform continuous vocal comprehension, natural conversation, and wake-word detection.
        </p>

        {status === 'granted' && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Acoustic sensor calibrated & verified. Connecting...</span>
          </div>
        )}

        {status === 'denied' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Access Blocked</p>
              <p className="text-[11px] opacity-80">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleRequestMic}
            disabled={status === 'requesting' || status === 'granted'}
            className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-all disabled:opacity-50"
          >
            {status === 'requesting' ? 'Calibrating...' : 'Authorize Microphone'}
          </button>
        </div>
      </div>
    </div>
  );
};
