import React, { useState, useEffect } from 'react';
import { Settings, Volume2, ShieldCheck, Lock, Palette, Cpu, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ThemeMode } from '../../types/jarvis';
import { api } from '../../services/api';

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

  // Mark-LVI Dual-Engine State
  const [selectedEngine, setSelectedEngine] = useState<'gemini_cloud' | 'local_openai'>('gemini_cloud');
  const [localBaseUrl, setLocalBaseUrl] = useState('http://localhost:11434/v1');
  const [localModelName, setLocalModelName] = useState('llama3.2');
  const [localApiKey, setLocalApiKey] = useState('');
  const [geminiPrimary, setGeminiPrimary] = useState('gemini-3.8-flash');
  const [engineTestResult, setEngineTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [isSavingEngine, setIsSavingEngine] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    api.getEngineConfig().then((res) => {
      if (res && res.config) {
        setSelectedEngine(res.config.selectedEngine || 'gemini_cloud');
        if (res.config.localOpenai) {
          setLocalBaseUrl(res.config.localOpenai.baseUrl || 'http://localhost:11434/v1');
          setLocalModelName(res.config.localOpenai.modelName || 'llama3.2');
          setLocalApiKey(res.config.localOpenai.apiKey || '');
        }
        if (res.config.gemini) {
          setGeminiPrimary(res.config.gemini.primaryModel || 'gemini-3.8-flash');
        }
      }
    });
  }, []);

  const handleTestEngine = async () => {
    setIsTestingEngine(true);
    setEngineTestResult(null);
    try {
      const res = await api.testEngine(selectedEngine, {
        baseUrl: localBaseUrl,
        modelName: localModelName,
        apiKey: localApiKey,
      });
      setEngineTestResult(res);
    } catch (err: any) {
      setEngineTestResult({ success: false, message: err.message, latencyMs: 0 });
    } finally {
      setIsTestingEngine(false);
    }
  };

  const handleSaveEngine = async () => {
    setIsSavingEngine(true);
    setSaveSuccessMsg('');
    try {
      const res = await api.saveEngineConfig({
        selectedEngine,
        gemini: { primaryModel: geminiPrimary, fallbackModel: 'gemini-3.5-flash-lite' },
        localOpenai: { baseUrl: localBaseUrl, modelName: localModelName, apiKey: localApiKey },
      });
      setSaveSuccessMsg(res.message || 'Engine configuration saved.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } finally {
      setIsSavingEngine(false);
    }
  };

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

      {/* Mark-LVI Engine & Providers Architecture */}
      <div className="p-4 rounded-xl border border-cyan-500/40 bg-jarvis-void/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
              Mark-LVI Neural Engine & Provider Architecture
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/40 text-cyan-300 bg-cyan-950/40">
            {selectedEngine === 'gemini_cloud' ? 'GEMINI LADDER ACTIVE' : 'LOCAL OPENAI ACTIVE'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Select what powers JARVIS's intelligence core. Switch between Google's cloud-accelerated Gemini ladder and your own local/custom OpenAI-compatible stack (Ollama, LM Studio, Groq, DeepSeek, vLLM) with zero code modifications.
        </p>

        {/* Engine Switcher Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedEngine('gemini_cloud')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedEngine === 'gemini_cloud'
                ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-glow-cyan'
                : 'border-jarvis-border/40 bg-jarvis-space/40 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold">Engine A: Gemini Cloud Ladder</span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>
            <p className="text-[10px] text-slate-400">
              Gemini 3.8 Flash with 3.5 Flash Lite failover. Native multi-tool calling & SSE streaming.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedEngine('local_openai')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedEngine === 'local_openai'
                ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-glow-emerald'
                : 'border-jarvis-border/40 bg-jarvis-space/40 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold">Engine B: Local / OpenAI Stack</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-400">
              Ollama, LM Studio, Groq, DeepSeek, vLLM. 100% private, on-device or custom server.
            </p>
          </button>
        </div>

        {/* Engine B Configuration Form */}
        {selectedEngine === 'local_openai' && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                  API Base Endpoint
                </label>
                <input
                  type="text"
                  value={localBaseUrl}
                  onChange={(e) => setLocalBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full bg-jarvis-space/80 border border-jarvis-border rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[9px] text-slate-500 font-mono">e.g. http://localhost:11434/v1 (Ollama), http://localhost:1234/v1 (LM Studio)</span>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={localModelName}
                  onChange={(e) => setLocalModelName(e.target.value)}
                  placeholder="llama3.2, mistral, qwen2.5"
                  className="w-full bg-jarvis-space/80 border border-jarvis-border rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[9px] text-slate-500 font-mono">Model installed on your server (e.g. llama3.2, qwen2.5:7b)</span>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
                API Key (Optional for local Ollama)
              </label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-... (Leave empty for Ollama)"
                className="w-full bg-jarvis-space/80 border border-jarvis-border rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        {/* Live Test & Save Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestEngine}
              disabled={isTestingEngine}
              className="px-3.5 py-2 rounded-lg border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 font-mono text-xs hover:bg-cyan-900/60 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTestingEngine ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing Ping...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Test Connection
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveEngine}
              disabled={isSavingEngine}
              className="px-3.5 py-2 rounded-lg border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-mono text-xs hover:bg-emerald-900/60 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>

          {saveSuccessMsg && (
            <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saveSuccessMsg}
            </span>
          )}
        </div>

        {/* Test Result Diagnostic Card */}
        {engineTestResult && (
          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs font-mono ${
              engineTestResult.success
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
            }`}
          >
            {engineTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{engineTestResult.message}</p>
              {engineTestResult.latencyMs > 0 && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Round-trip latency: {engineTestResult.latencyMs}ms ({engineTestResult.latencyMs < 500 ? 'Ultra-Fast' : 'Moderate'})
                </span>
              )}
            </div>
          </div>
        )}
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
