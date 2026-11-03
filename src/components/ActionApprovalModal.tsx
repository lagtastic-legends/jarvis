import React from 'react';
import { ShieldAlert, Check, X, Terminal } from 'lucide-react';
import { ActionQueueItem } from '../types/jarvis';

interface ActionApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ActionQueueItem[];
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = ({
  isOpen,
  onClose,
  actions,
  onApprove,
  onReject,
}) => {
  if (!isOpen) return null;

  const pending = actions.filter(a => a.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/40 bg-jarvis-space/95 p-6 shadow-glow-cyan-lg space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
              Human-In-The-Loop Action Directives
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                {pending.length} Pending Approval
              </span>
            </h3>
            <p className="text-xs font-mono text-cyan-400/70">
              Autonomous Operation Safeguard // public.action_queue
            </p>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
          {pending.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-jarvis-border/40 rounded-xl">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="font-mono text-xs text-slate-300">
                No high-risk operations awaiting authorization.
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                All platform protocols operating autonomously under safe thresholds.
              </p>
            </div>
          ) : (
            pending.map((act) => {
              const riskColor = 
                act.risk_level === 'extreme' ? 'text-red-400 border-red-500/50 bg-red-950/30' :
                act.risk_level === 'high' ? 'text-amber-400 border-amber-500/50 bg-amber-950/30' :
                act.risk_level === 'medium' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20' :
                'text-cyan-400 border-cyan-500/40 bg-cyan-950/20';

              return (
                <div
                  key={act.id}
                  className="p-4 rounded-xl border border-jarvis-border/50 bg-jarvis-void/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {act.action_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${riskColor}`}>
                          {act.risk_level} RISK
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-cyan-400/80 mt-1">
                        Target: <span className="text-slate-300">{act.target_resource}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onReject(act.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-mono flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                      <button
                        onClick={() => onApprove(act.id)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1 shadow-glow-emerald"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Authorize
                      </button>
                    </div>
                  </div>

                  {/* Payload inspect */}
                  <div className="p-2.5 rounded-lg bg-black/60 border border-jarvis-border/30 font-mono text-[11px] text-slate-300">
                    <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      PAYLOAD EXECUTION PARAMETERS:
                    </div>
                    <pre className="overflow-x-auto text-[10px] text-cyan-300/80">
                      {JSON.stringify(act.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-jarvis-border/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5"
          >
            Close Safeguard Window
          </button>
        </div>
      </div>
    </div>
  );
};
