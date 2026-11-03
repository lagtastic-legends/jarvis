import React, { useState } from 'react';
import { Eye, Camera, Crosshair, Scan } from 'lucide-react';

export const OpticalVisionView: React.FC = () => {
  const [activeSpectrum, setActiveSpectrum] = useState<'rgb' | 'infrared' | 'lidar'>('lidar');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([
    { id: 1, label: 'Arc Reactor Core', confidence: '99.8%', bbox: 'Sector 01 [x:120, y:80]', status: 'NOMINAL' },
    { id: 2, label: 'Mark 85 Carapace', confidence: '98.5%', bbox: 'Sector 04 [x:310, y:150]', status: 'ONLINE' },
    { id: 3, label: 'Perimeter Boundary A', confidence: '100%', bbox: 'Sector 12 [x:500, y:400]', status: 'SECURE' },
  ]);

  const handleRunDetection = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setDetectedObjects((prev) => [
        ...prev,
        {
          id: Date.now(),
          label: 'Thermal Surge Anomaly',
          confidence: '94.2%',
          bbox: `Sector ${Math.floor(Math.random() * 20) + 1} [x:${Math.floor(Math.random() * 400)}, y:${Math.floor(Math.random() * 300)}]`,
          status: 'FLAGGED',
        },
      ]);
    }, 1200);
  };

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Holographic Vision & Optical Feed
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Multi-spectrum optical feed: Infrared, LiDAR, Object Tagging
            </p>
          </div>
        </div>

        {/* Spectrum Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-jarvis-void/60 border border-jarvis-border/40">
          {(['rgb', 'infrared', 'lidar'] as const).map((spec) => (
            <button
              key={spec}
              onClick={() => setActiveSpectrum(spec)}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                activeSpectrum === spec
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold shadow-glow-cyan'
                  : 'text-slate-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Main Optical Canvas Arena */}
      <div className="relative w-full h-80 rounded-2xl border border-cyan-500/30 bg-black/80 overflow-hidden flex items-center justify-center group">
        {/* Reticle grid overlay */}
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute inset-0 hologram-overlay pointer-events-none" />

        {/* Tactical Crosshairs */}
        <Crosshair className="absolute w-12 h-12 text-cyan-400/30 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-cyan-400/20 pointer-events-none" />
        <div className="absolute w-72 h-72 rounded-full border border-dashed border-cyan-400/15 pointer-events-none animate-spin-slow" />

        {/* Scanning Sweep Laser */}
        {isScanning && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-glow-cyan-lg animate-scanline" />
        )}

        {/* Simulated Object Bounding Boxes */}
        <div className="absolute top-12 left-16 border border-cyan-400/60 bg-cyan-500/10 p-2 rounded text-[10px] font-mono text-cyan-300">
          <span>TARGET 01 // ARC REACTOR</span>
          <span className="block text-[8px] text-cyan-400/60">CONFIDENCE: 99.8%</span>
        </div>

        <div className="absolute bottom-16 right-20 border border-emerald-400/60 bg-emerald-500/10 p-2 rounded text-[10px] font-mono text-emerald-300">
          <span>TARGET 02 // CARAPACE V7</span>
          <span className="block text-[8px] text-emerald-400/60">INTEGRITY: 100%</span>
        </div>

        {/* Central Standby Text */}
        <div className="z-10 text-center space-y-2 pointer-events-none">
          <Scan className="w-10 h-10 text-cyan-400 mx-auto opacity-70 animate-pulse" />
          <p className="font-mono text-xs text-slate-300">
            OPTICAL FEED ONLINE // {activeSpectrum.toUpperCase()} SENSOR ACTIVE
          </p>
          <p className="font-mono text-[10px] text-slate-500">
            Neural Vision Pipeline processing 60 FPS multi-spectrum imagery
          </p>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] font-mono text-cyan-400/70">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>FPS: 59.8 // LATENCY: 14ms</span>
        </div>

        <div className="absolute bottom-3 right-3">
          <button
            onClick={handleRunDetection}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold shadow-glow-cyan flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isScanning ? 'Scanning...' : 'Run Object Detection'}</span>
          </button>
        </div>
      </div>

      {/* Detected Entities Telemetry Table */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs text-slate-400 uppercase tracking-wider">
          Detected Environmental Entities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {detectedObjects.map((obj) => (
            <div
              key={obj.id}
              className="p-3 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 text-xs font-mono space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">{obj.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  obj.status === 'FLAGGED' ? 'bg-red-950/60 text-red-400 border border-red-500/30' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {obj.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{obj.bbox}</p>
              <p className="text-[10px] text-cyan-400/80">Match: {obj.confidence}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
