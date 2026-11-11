import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldAlert, 
  Menu, 
  Radio,
  QrCode,
  EyeOff,
  Server
} from 'lucide-react';
import { JarvisState } from '../types/jarvis';
import { visionCapture } from '../services/visionCapture';

interface HUDHeaderProps {
  state: JarvisState;
  onStateSelect: (state: JarvisState) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  pendingActionsCount: number;
  onOpenActionQueue: () => void;
  onOpenMobilePairing?: () => void;
  onOpenServerConfig?: () => void;
  onMobileMenuToggle: () => void;
  callsign?: string;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  state,
  onStateSelect,
  isMuted,
  onToggleMute,
  sfxEnabled,
  onToggleSfx,
  speechEnabled,
  onToggleSpeech,
  pendingActionsCount,
  onOpenActionQueue,
  onOpenMobilePairing,
  onOpenServerConfig,
  onMobileMenuToggle,
  callsign = 'Sir',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [dndActive, setDndActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jarvis_dnd_active') === 'true';
    } catch {
      return false;
    }
  });
  const [visionActive, setVisionActive] = useState<{ isScreenSharing: boolean; isCameraStreaming: boolean }>({
    isScreenSharing: false,
    isCameraStreaming: false,
  });

  useEffect(() => {
    const unsubVision = visionCapture.onVisionStateChange((st) => {
      setVisionActive({
        isScreenSharing: st.isScreenSharing,
        isCameraStreaming: st.isCameraStreaming,
      });
    });
    return unsubVision;
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleDndChange = (e: any) => {
      setDndActive(Boolean(e.detail));
    };
    window.addEventListener('jarvis-dnd-change', handleDndChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('jarvis-dnd-change', handleDndChange);
    };
  }, []);

  const states: JarvisState[] = ['IDLE', 'LISTENING', 'THINKING', 'SPEAKING'];

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-jarvis-border/40 bg-jarvis-space/80 backdrop-blur-xl z-30 flex-shrink-0">
      {/* Left side: Mobile Trigger & DEFCON badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-mono font-bold text-sm shadow-glow-cyan">
            J
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold font-mono tracking-wider text-slate-100 flex items-center gap-1.5">
              JARVIS AI <span className="text-[10px] text-cyan-400 font-normal px-1 rounded bg-cyan-950/60 border border-cyan-500/30">MK.VII</span>
            </h1>
            <p className="text-[10px] font-mono text-cyan-500/70 hidden sm:block">SYSTEM PROTOCOL 4.2</p>
          </div>
        </div>

        {/* DEFCON / Shields status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>DEFCON 5 // SECURE</span>
        </div>

        {/* Live Visual Awareness Privacy Pill & Kill Switch */}
        {(visionActive.isScreenSharing || visionActive.isCameraStreaming) && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/60 bg-amber-950/50 text-amber-300 text-[11px] font-mono shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold">
              {visionActive.isScreenSharing ? 'SCREEN SENSOR ACTIVE' : 'CAMERA SENSOR ACTIVE'}
            </span>
            <button
              onClick={() => visionCapture.stopAllVision()}
              title="Stop Sharing Visual Feed (Kill Switch)"
              className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bixby Routine DND Pill */}
        {dndActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-500/50 bg-purple-950/40 text-purple-300 text-[11px] font-mono shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>DND ACTIVE</span>
          </div>
        )}
      </div>

      {/* Center: Dynamic AI State Machine Pills */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 backdrop-blur-md">
        {states.map((st) => {
          const isActive = state === st;
          return (
            <button
              key={st}
              onClick={() => onStateSelect(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all duration-200 ${
                isActive
                  ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-glow-cyan font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* Right side: Clock, Toggles, Action Queue, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time HUD Clock */}
        <div className="hidden sm:flex flex-col items-end font-mono">
          <span className="text-xs font-bold text-slate-200 tracking-wider">{timeStr}</span>
          <span className="text-[9px] text-cyan-400/70">{dateStr}</span>
        </div>

        <div className="h-6 w-px bg-jarvis-border/40 hidden sm:block" />

        {/* Mobile QR Pairing Trigger */}
        {onOpenMobilePairing && (
          <button
            onClick={onOpenMobilePairing}
            title="Scan QR Code to Pair Mobile Phone / Android App"
            className="p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10 transition-all"
          >
            <QrCode className="w-4 h-4" />
          </button>
        )}

        {/* Gateway Server / Android Remote Link Config */}
        {onOpenServerConfig && (
          <button
            onClick={onOpenServerConfig}
            title="Configure JARVIS Gateway Server (LAN / Android / Cloudflare Tunnel)"
            className="p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10 transition-all"
          >
            <Server className="w-4 h-4" />
          </button>
        )}

        {/* Action Queue Trigger (Human-in-the-Loop) */}
        <button
          onClick={onOpenActionQueue}
          title="Human-in-the-Loop Action Approval Queue"
          className={`relative p-2 rounded-lg border transition-all ${
            pendingActionsCount > 0
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 animate-pulse'
              : 'border-jarvis-border/40 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          {pendingActionsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
              {pendingActionsCount}
            </span>
          )}
        </button>

        {/* Speech Output Toggle */}
        <button
          onClick={onToggleSpeech}
          title={speechEnabled ? 'Disable JARVIS Vocal Output' : 'Enable JARVIS Vocal Output'}
          className={`p-2 rounded-lg border transition-all ${
            speechEnabled
              ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
              : 'border-jarvis-border/40 text-slate-500 hover:bg-white/5'
          }`}
        >
          <Radio className="w-4 h-4" />
        </button>

        {/* SFX Synthesizer Toggle */}
        <button
          onClick={onToggleSfx}
          title={sfxEnabled ? 'Disable Sci-Fi Sound Effects' : 'Enable Sci-Fi Sound Effects'}
          className={`p-2 rounded-lg border transition-all ${
            sfxEnabled
              ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
              : 'border-jarvis-border/40 text-slate-500 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Master Mute Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
          className={`p-2 rounded-lg border transition-all ${
            isMuted
              ? 'border-red-500/50 bg-red-500/15 text-red-400'
              : 'border-jarvis-border/40 text-slate-300 hover:text-cyan-300'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* User Profile Avatar / Callsign */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <div className="w-8 h-8 rounded-full border border-cyan-400/50 bg-gradient-to-tr from-cyan-950 to-blue-900 flex items-center justify-center text-xs font-mono font-bold text-cyan-200">
            TS
          </div>
          <span className="text-xs font-mono text-slate-300 hidden xl:inline">
            {callsign}
          </span>
        </div>
      </div>
    </header>
  );
};
