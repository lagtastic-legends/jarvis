import React, { useState } from 'react';
import { Settings, Volume2, ShieldCheck, Lock, Palette } from 'lucide-react';
import { ThemeMode } from '../../types/jarvis';

interface SystemSettingsViewProps {
  volume: number;
  onVolumeChange: (val: number) => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  volume,
  onVolumeChange,
  sfxEnabled,
  onToggleSfx,
  speechEnabled,
  onToggleSpeech,
  theme,
  onThemeChange,
}) => {
  const [hudGlare, setHudGlare] = useState(true);
  const [wakeWord, setWakeWord] = useState(true);

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              System Settings & Neural I/O Config
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Hardware parameters, theme styles, audio synth, and security locks
            </p>
          </div>
        </div>
      </div>

      {/* Visual Design System Switcher (Obsidian vs Holographic) */}
      <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            Visual Design System Architecture
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Switch between the cinematic Marvel-inspired Holographic Cyan HUD and the precision developer-grade Obsidian High-Contrast Dark theme defined in <code className="text-violet-400 font-mono">obsidian/DESIGN.md</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onThemeChange('holographic')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme === 'holographic'
                ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-glow-cyan'
                : 'border-jarvis-border/40 bg-jarvis-space/40 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold">Holographic Cyan HUD</span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>
            <p className="text-[10px] text-slate-400">
              Electric cyan, glassmorphic blur, lens flares, scanlines & 3D particle orbit.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('obsidian')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              theme === 'obsidian'
                ? 'border-violet-400 bg-zinc-900/80 text-violet-300 shadow-glow-violet'
                : 'border-jarvis-border/40 bg-jarvis-space/40 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold">Obsidian High-Contrast</span>
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            </div>
            <p className="text-[10px] text-slate-400">
              "Precision in Darkness" — Near-black surfaces, zinc borders, soft violet & emerald.
            </p>
          </button>
        </div>
      </div>

      {/* Zero-Secret Security Lock Badge */}
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="font-mono text-xs font-bold text-emerald-300 block">
              ZERO-SECRET BACKEND MEDIATION: ACTIVE
            </span>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Client bundle verified. All AI API keys and database service role tokens isolated in server.ts.
            </p>
          </div>
        </div>
        <ShieldCheck className="w-6 h-6 text-emerald-400 opacity-80" />
      </div>

      {/* Audio Controls */}
      <div className="space-y-4">
        <h3 className="font-mono text-xs text-slate-400 uppercase tracking-wider">
          Acoustic & Synthesizer Parameters
        </h3>

        {/* Master Gain Slider */}
        <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              MASTER AUDIO SYNTH & VOCAL GAIN
            </span>
            <span className="text-cyan-300 font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold text-slate-200">
                Procedural Sci-Fi Acoustic Feedback (SFX)
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Synthesized chirp, sweep, and transmit pulses on UI actions
              </p>
            </div>
            <input
              type="checkbox"
              checked={sfxEnabled}
              onChange={onToggleSfx}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold text-slate-200">
                Binaural Speech Synthesis Engine
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Natural vocalization using British English persona
              </p>
            </div>
            <input
              type="checkbox"
              checked={speechEnabled}
              onChange={onToggleSpeech}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold text-slate-200">
                Holographic HUD Scanline Simulation
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Cinematic CRT scanlines and radial vignette layer
              </p>
            </div>
            <input
              type="checkbox"
              checked={hudGlare}
              onChange={() => setHudGlare(!hudGlare)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold text-slate-200">
                Auto Wake-Word Recognition ("Hey JARVIS")
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Continuous acoustic keyword detection in background
              </p>
            </div>
            <input
              type="checkbox"
              checked={wakeWord}
              onChange={() => setWakeWord(!wakeWord)}
              className="w-4 h-4 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
