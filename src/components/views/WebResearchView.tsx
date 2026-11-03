import React, { useState } from 'react';
import { Globe, Search, ExternalLink, BookOpen, Clock } from 'lucide-react';

export const WebResearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([
    {
      title: 'Quantum Entanglement Synchronization in Distributed Low-Earth Satellites',
      source: 'MIT Technology Review / arXiv:2610.0489',
      summary: 'Analysis of coherent phase locking in space-borne quantum communication nodes with sub-picosecond jitter.',
      timestamp: '2 hours ago',
    },
    {
      title: 'High-Temperature Superconducting Composite Structures in Aerospace Propulsion',
      source: 'Stark Industries Defense Journal',
      summary: 'Thermal dispersion behavior of titanium-niobium metamaterials under hypersonic atmospheric re-entry conditions.',
      timestamp: '5 hours ago',
    },
    {
      title: 'Real-Time Sparse Attention Indexing in 100k+ Context Neural Assistants',
      source: 'DeepMind Research Archives',
      summary: 'Flash-attention optimization for multimodal speech boundary detection and live neural acoustic synthesis.',
      timestamp: 'Yesterday',
    },
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setResults(prev => [
        {
          title: `Autonomous Neural Synthesis: "${query}"`,
          source: 'JARVIS Deep Web Intelligence Crawler',
          summary: `Compiled 14 peer-reviewed technical papers and real-time news wire data regarding ${query}. Parameters verified.`,
          timestamp: 'Just now',
        },
        ...prev,
      ]);
      setQuery('');
    }, 1000);
  };

  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Autonomous Web Research Module
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Deep search across academic papers, global news wire, and technical documentation
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter research topic (e.g. 'Quantum lattice encryption', 'Hypersonic thermal shielding')..."
            className="w-full bg-jarvis-void/80 border border-jarvis-border/60 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold shadow-glow-cyan transition-all disabled:opacity-50"
        >
          {isSearching ? 'Indexing...' : 'Search'}
        </button>
      </form>

      {/* Results Feed */}
      <div className="space-y-3.5">
        <h3 className="font-mono text-xs text-slate-400 uppercase tracking-wider">
          Compiled Intelligence Briefs
        </h3>

        {results.map((res, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-jarvis-border/40 bg-jarvis-void/60 hover:border-cyan-400/40 transition-all space-y-2 group"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-mono text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                {res.title}
              </h4>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {res.summary}
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-jarvis-border/20">
              <span className="text-cyan-400/80">{res.source}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {res.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
