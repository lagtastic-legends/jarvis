import React from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  Mic, 
  Brain, 
  Eye, 
  CheckSquare, 
  Globe, 
  Code2, 
  Settings, 
  X,
  Activity,
  Layers,
  Workflow
} from 'lucide-react';
import { TabId } from '../types/jarvis';

interface SidebarProps {
  activeTab: TabId;
  onTabSelect: (tab: TabId) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  neuralFlux?: string;
  activeSynapses?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabSelect,
  mobileOpen,
  onMobileClose,
  neuralFlux = '4.2 TFLOPS',
  activeSynapses = '142k',
}) => {
  const navItems: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Neural Terminal', icon: Terminal },
    { id: 'voice', label: 'Voice & Speech', icon: Mic },
    { id: 'memory', label: 'Vector Memory', icon: Brain },
    { id: 'vision', label: 'Optical Vision', icon: Eye },
    { id: 'tasks', label: 'Task Directives', icon: CheckSquare },
    { id: 'routines', label: 'Routines & Macros', icon: Workflow },
    { id: 'research', label: 'Web Research', icon: Globe },
    { id: 'coding', label: 'Neural Coding', icon: Code2 },
    { id: 'settings', label: 'System Config', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 flex flex-col border-r border-jarvis-border/60 bg-jarvis-space/95 backdrop-blur-2xl transition-transform duration-300 z-50 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-jarvis-border/40">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span className="font-mono text-sm font-bold tracking-wider text-slate-100">
              JARVIS // OS
            </span>
          </div>

          <button 
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono tracking-wider text-cyan-400/60 uppercase">
            Platform Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabSelect(item.id);
                  onMobileClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 text-left ${
                  isActive
                    ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-glow-cyan font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Diagnostic Mini-Badge in Sidebar Footer */}
        <div className="p-4 border-t border-jarvis-border/40 bg-jarvis-void/40">
          <div className="p-3 rounded-xl border border-jarvis-border/40 bg-jarvis-space/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                NEURAL FLUX
              </span>
              <span className="text-[11px] font-mono text-cyan-300 font-bold">{neuralFlux}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[88%]" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>SYNAPSES</span>
              <span className="text-slate-200">{activeSynapses}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
