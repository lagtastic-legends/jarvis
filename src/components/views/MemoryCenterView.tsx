import React, { useState } from 'react';
import { Brain, Plus, Filter, Tag, Check } from 'lucide-react';
import { MemoryItem } from '../../types/jarvis';

interface MemoryCenterViewProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Partial<MemoryItem>) => void;
}

export const MemoryCenterView: React.FC<MemoryCenterViewProps> = ({
  memories,
  onAddMemory,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'preference' | 'fact' | 'instruction' | 'project' | 'directive'>('preference');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const categories = ['all', 'preference', 'project', 'instruction', 'fact', 'directive'];

  const filtered = filter === 'all' 
    ? memories 
    : memories.filter(m => m.category === filter);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddMemory({
      category: newCategory,
      content: newContent.trim(),
      is_active: true,
      confidence: '100%',
    });
    setNewContent('');
    setIsAdding(false);
  };

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Brain className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Memory Center & Vector Graph
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Persistent semantic memory vectors // public.memories
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-glow-violet transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Memory</span>
        </button>
      </div>

      {/* Add Memory Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="p-4 rounded-xl border border-violet-500/40 bg-violet-950/20 space-y-3">
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="bg-jarvis-void border border-jarvis-border/50 rounded-xl px-3 py-2 text-xs font-mono text-violet-300 focus:outline-none"
            >
              <option value="preference">Preference</option>
              <option value="project">Project</option>
              <option value="instruction">Instruction</option>
              <option value="fact">Fact</option>
              <option value="directive">Directive</option>
            </select>

            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter permanent semantic memory..."
              className="flex-1 bg-jarvis-void border border-jarvis-border/50 rounded-xl px-4 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-violet-400"
            />

            <button
              type="submit"
              className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-black text-xs font-mono font-bold rounded-xl"
            >
              Commit Memory
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
              filter === c
                ? 'bg-violet-500/20 border border-violet-400/50 text-violet-300 font-bold shadow-glow-violet'
                : 'text-slate-400 hover:bg-white/5 border border-transparent'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((mem) => (
          <div
            key={mem.id}
            className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 hover:border-violet-400/40 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 uppercase font-bold">
                {mem.category}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {mem.confidence || '99.2% CONFIDENCE'}
              </span>
            </div>

            <p className="text-xs font-mono text-slate-200 leading-relaxed">
              "{mem.content}"
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-jarvis-border/20">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-cyan-400/60" />
                {mem.is_active ? 'ACTIVE SYNAPSE' : 'ARCHIVED'}
              </span>
              <span>VECTOR #{mem.id.slice(0, 6)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
