import React, { useState } from 'react';
import { Mic, Sliders, Play, Square, CheckCircle2 } from 'lucide-react';
import { speechEngine } from '../../services/speechEngine';
import { audioSynth } from '../../services/audioSynth';

interface VoiceEngineViewProps {
  onTestPhrase: (phrase: string) => void;
  onOpenMicModal: () => void;
}

export const VoiceEngineView: React.FC<VoiceEngineViewProps> = ({
  onTestPhrase,
  onOpenMicModal,
}) => {
  const [pitch, setPitch] = useState<number>(speechEngine.getPitch());
  const [rate, setRate] = useState<number>(speechEngine.getRate());
  const [phrase, setPhrase] = useState<string>(
    'Good day, Sir. All automated defenses and orbital relays are fully operational.'
  );

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPitch(val);
    speechEngine.setPitch(val);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRate(val);
    speechEngine.setRate(val);
  };

  const testPhrases = [
    'Always a pleasure assisting you, Sir.',
    'Thermal dispersion holds at 18.2%. Arc Reactor stable.',
    'Perimeter scan complete. 0 intrusion vectors detected.',
    'Quantum encryption salt refreshed on all nodes.',
  ];

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Mic className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Binaural Voice Synthesizer & Speech Engine
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Low-latency neural acoustic synthesis & Web Speech API
            </p>
          </div>
        </div>

        <button
          onClick={onOpenMicModal}
          className="px-4 py-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 text-xs font-mono font-bold flex items-center gap-1.5 shadow-glow-cyan"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Calibrate Mic</span>
        </button>
      </div>

      {/* Voice Profile Card */}
      <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-400 block mb-1">
            ACTIVE VOCAL PROFILE
          </span>
          <p className="font-mono text-sm font-bold text-cyan-300">
            {speechEngine.getActiveVoiceName()}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-prioritizes British English / Daniel / Oliver for Stark personal assistant timbre.
          </p>
        </div>
        <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-80" />
      </div>

      {/* Acoustic Controls: Pitch & Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pitch */}
        <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-slate-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              VOCAL PITCH
            </span>
            <span className="text-cyan-300 font-bold">{pitch.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.05"
            value={pitch}
            onChange={handlePitchChange}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[10px] font-mono text-slate-400">
            0.95 = Sophisticated British AI baritone profile
          </p>
        </div>

        {/* Rate / Speed */}
        <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-slate-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              CADENCE & RATE
            </span>
            <span className="text-cyan-300 font-bold">{rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={rate}
            onChange={handleRateChange}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[10px] font-mono text-slate-400">
            1.10x = Crisp, concise executive cadence
          </p>
        </div>
      </div>

      {/* Vocalize Phrase Tester */}
      <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 space-y-3">
        <span className="text-[10px] font-mono text-slate-400 block">
          SYNTHESIS TEST WORKBENCH
        </span>
        <textarea
          rows={2}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="w-full bg-jarvis-space/80 border border-jarvis-border/50 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audioSynth.playChirp();
                onTestPhrase(phrase);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold shadow-glow-cyan flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Vocalize Phrase</span>
            </button>
            <button
              onClick={() => speechEngine.stop()}
              className="px-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-mono flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Halt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Phrases */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Quick Preset Vocalizations:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {testPhrases.map((tp, i) => (
            <button
              key={i}
              onClick={() => {
                setPhrase(tp);
                onTestPhrase(tp);
              }}
              className="p-2.5 rounded-xl border border-jarvis-border/30 bg-jarvis-void/40 hover:border-cyan-400/40 text-left text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all"
            >
              "{tp}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
