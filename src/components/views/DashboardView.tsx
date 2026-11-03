import React, { useState } from 'react';
import { 
  Cpu, 
  Brain, 
  ShieldCheck, 
  Activity, 
  Send, 
  Mic, 
  Volume2, 
  Radar, 
  FileText, 
  Compass, 
  RefreshCw 
} from 'lucide-react';
import { JarvisState, TelemetryData } from '../../types/jarvis';
import { HolographicOrb } from '../HolographicOrb';
import { AudioWaveform } from '../AudioWaveform';

interface DashboardViewProps {
  state: JarvisState;
  telemetry: TelemetryData;
  isSpeaking: boolean;
  liveCaption?: string;
  onSendDirective: (text: string) => void;
  onOpenMicModal: () => void;
  onTestVoice: () => void;
  onOrbClick: () => void;
  activityStream: { id: string; time: string; text: string; tag: string }[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  telemetry,
  isSpeaking,
  liveCaption,
  onSendDirective,
  onOpenMicModal,
  onTestVoice,
  onOrbClick,
  activityStream,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendDirective(inputText.trim());
    setInputText('');
  };

  const quickActions = [
    { label: 'Perimeter Scan', sub: 'Run LiDAR sweep', icon: Radar, cmd: 'Initiate perimeter scan' },
    { label: 'Daily Briefing', sub: 'News, weather & schedule', icon: FileText, cmd: 'Daily briefing' },
    { label: 'Flight Dynamics', sub: 'Mach 3.4 cruise range', icon: Compass, cmd: 'Compile flight dynamics' },
    { label: 'System Diagnostic', sub: 'Arc Reactor telemetry', icon: RefreshCw, cmd: 'Run diagnostic' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Row: System Status Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Neural Core */}
        <div className="glass-hud p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
              <Cpu className="w-3.5 h-3.5 text-cyan-300" />
              NEURAL CORE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">
              98.4%
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tracking-tight">
            {telemetry.neuralFlux}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>SYNAPSES</span>
            <span className="text-cyan-300">{telemetry.activeSynapses}</span>
          </div>
        </div>

        {/* Card 2: Memory Synapses */}
        <div className="glass-hud p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-violet-400 flex items-center gap-1.5 font-bold">
              <Brain className="w-3.5 h-3.5 text-violet-300" />
              VECTOR MEMORY
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-400/30">
              SYNCHED
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tracking-tight">
            128k CONTEXT
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>EMBEDDINGS</span>
            <span className="text-violet-300">Semantic Graph Active</span>
          </div>
        </div>

        {/* Card 3: Security & Shields */}
        <div className="glass-hud p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              SHIELDS & DEFCON
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
              DEFCON {telemetry.defcon}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tracking-tight">
            {telemetry.quantumShields}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>INTRUSION LEVEL</span>
            <span className="text-emerald-300">0 Vectors Detected</span>
          </div>
        </div>

        {/* Card 4: Environmental Telemetry */}
        <div className="glass-hud p-3.5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 font-bold">
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              ARC REACTOR
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
              NOMINAL
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tracking-tight">
            {telemetry.powerGrid}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>THERMAL DISPERSION</span>
            <span className="text-amber-300">{telemetry.thermalDispersion}</span>
          </div>
        </div>
      </div>

      {/* Main Hero Arena: Holographic Orb + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left & Center Hero: Holographic Orb & Command Bar (8 cols) */}
        <div className="lg:col-span-8 glass-hud p-5 rounded-2xl relative flex flex-col items-center justify-between min-h-[460px]">
          {/* Corner HUD Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/50 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50 pointer-events-none" />

          {/* Top Meta Badge */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-cyan-500/15">
            <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
              HOLOGRAPHIC QUANTUM PROJECTION // 3D FIBONACCI CORE
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              FRAME REFRESH: 60 FPS
            </span>
          </div>

          {/* Central 3D Particle Orb */}
          <HolographicOrb 
            state={state} 
            liveCaption={liveCaption} 
            onOrbClick={onOrbClick} 
          />

          {/* 32-Bar Dynamic Audio Waveform Equalizer */}
          <div className="w-full max-w-md my-2">
            <AudioWaveform state={state} isSpeaking={isSpeaking} barCount={32} />
          </div>

          {/* Interactive Command Input Bar */}
          <form 
            onSubmit={handleSubmit}
            className="w-full flex items-center gap-2 pt-3 border-t border-cyan-500/15"
          >
            <button
              type="button"
              onClick={onTestVoice}
              title="Test Voice Synthesizer"
              className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 transition-all"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenMicModal}
              title="Activate Acoustic Sensor (Microphone)"
              className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 transition-all"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak or type directive (e.g. 'Initiate perimeter scan', 'Run diagnostic')..."
              className="flex-1 bg-jarvis-void/80 border border-jarvis-border/60 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
            />

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold shadow-glow-cyan transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ENGAGE</span>
            </button>
          </form>
        </div>

        {/* Right Column: Quick Action HUD & Recent Activity Stream (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Action Grid */}
          <div className="glass-hud p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-jarvis-border/40">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Quick Directives
              </span>
              <span className="text-[9px] font-mono text-slate-500">HOTKEYS 1-4</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onSendDirective(qa.cmd)}
                    className="p-3 rounded-xl border border-jarvis-border/50 bg-jarvis-void/50 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all text-left group"
                  >
                    <Icon className="w-4 h-4 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-mono font-bold text-slate-200">{qa.label}</p>
                    <p className="text-[10px] font-mono text-slate-400 line-clamp-1">{qa.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Activity Stream */}
          <div className="glass-hud p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-jarvis-border/40">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Live Activity Stream
              </span>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activityStream.map((item) => (
                <div 
                  key={item.id}
                  className="p-2.5 rounded-lg border border-jarvis-border/30 bg-jarvis-void/40 flex items-start justify-between gap-2 text-xs font-mono"
                >
                  <div>
                    <span className="text-[10px] text-cyan-400/70 mr-1.5">[{item.time}]</span>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 flex-shrink-0">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
