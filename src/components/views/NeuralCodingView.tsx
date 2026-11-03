import React from 'react';
import { Code2, Copy, Check, Terminal } from 'lucide-react';

export const NeuralCodingView: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const sampleCode = `// JARVIS Neural Flight Dynamics Controller
// Protocol: Mark-85 Orbital Sync
import { Telemetry, QuantumMesh, Status } from '@stark/quantum-core';

export async function syncOrbitalNodes(clusterId: string): Promise<Status> {
  const cluster = await Telemetry.connect(clusterId);
  const calibration = await cluster.calibrate({
    frequency: 44.1,
    damping: 0.98,
    quantumSalt: '0x9F4B3C',
  });

  if (calibration.thermalSurge > 0.18) {
    await QuantumMesh.divertPower({ route: 'AuxiliaryCryoGrid' });
  }

  return {
    synchronized: true,
    nodesActive: 36,
    dispersionIndex: 0.012,
  };
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Neural Coding Assistant
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Autonomous syntax refactoring, AST parsing, and script generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-jarvis-border/40 text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs font-mono flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy AST'}</span>
          </button>
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="rounded-2xl border border-cyan-500/30 bg-black/90 overflow-hidden font-mono text-xs">
        {/* Editor Tab Bar */}
        <div className="px-4 py-2 border-b border-jarvis-border/40 bg-jarvis-void/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] text-cyan-300 font-bold ml-2">jarvis-quantum-mesh.ts</span>
          </div>
          <span className="text-[10px] text-slate-500">TYPESCRIPT 5.7 // STRICT MODE</span>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-x-auto text-slate-300 leading-relaxed">
          <pre className="text-cyan-200/90 font-mono">
            <code>{sampleCode}</code>
          </pre>
        </div>

        {/* Execution Terminal Footer */}
        <div className="p-3 border-t border-jarvis-border/30 bg-jarvis-space/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
            AST Analysis: 0 Type Errors // 100% Code Coverage
          </span>
          <span className="text-slate-500">Execution time: 1.2ms</span>
        </div>
      </div>
    </div>
  );
};
