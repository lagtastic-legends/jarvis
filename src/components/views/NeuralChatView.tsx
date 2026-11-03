import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, Sparkles, User, Bot } from 'lucide-react';
import { ChatMessage } from '../../types/jarvis';
import { ActionCard } from '../ActionCard';

interface NeuralChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onClearLog: () => void;
  isThinking: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const NeuralChatView: React.FC<NeuralChatViewProps> = ({
  messages,
  onSendMessage,
  onClearLog,
  isThinking,
  onNavigateTab,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const samplePrompts = [
    'Open 3 windows: YouTube, GitHub, and Gmail',
    'Write an email to alex@stark.com about Mark 85 test flight',
    'Open Notepad and Calculator',
    'Add task: Calibrate arc reactor core by Friday',
  ];

  return (
    <div className="glass-hud p-5 rounded-2xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
            JARVIS Neural Terminal // Active Deployment
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-cyan-400/80 hidden sm:inline">
            Context: 128k Tokens // Streaming Enabled
          </span>
          <button
            onClick={onClearLog}
            className="p-1.5 rounded-lg border border-jarvis-border/40 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-mono flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Log</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
                isUser 
                  ? 'bg-blue-600/30 border border-blue-400/50 text-blue-300' 
                  : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-glow-cyan'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-3.5 rounded-2xl text-xs font-mono leading-relaxed space-y-1 ${
                isUser
                  ? 'bg-blue-950/40 border border-blue-500/30 text-slate-100 rounded-tr-none'
                  : 'bg-jarvis-void/80 border border-cyan-500/30 text-cyan-100/90 rounded-tl-none shadow-hud-panel'
              }`}>
                <div className="flex items-center justify-between gap-4 text-[9px] text-slate-400 mb-1">
                  <span className="font-bold text-cyan-400">{isUser ? 'TONY STARK' : 'JARVIS CORE'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">
                  {msg.content || (
                    <span className="inline-flex items-center gap-1.5 text-cyan-400/80 animate-pulse text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      Streaming neural response...
                    </span>
                  )}
                </p>

                {msg.actions && msg.actions.length > 0 && (
                  <div className="pt-2 space-y-2.5 mt-2 border-t border-cyan-500/20">
                    {msg.actions.map((act) => (
                      <ActionCard key={act.id} action={act} onNavigateTab={onNavigateTab} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-jarvis-void/80 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing neural reply & correlating telemetry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">DIRECTIVES:</span>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(p)}
            className="px-2.5 py-1 rounded-lg border border-jarvis-border/40 bg-jarvis-void/60 text-[10px] font-mono text-cyan-300/80 hover:border-cyan-400/50 hover:bg-cyan-500/10 flex-shrink-0 transition-all"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-jarvis-border/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message JARVIS AI... (e.g. 'Initiate perimeter scan', 'Calculate cruise range')"
          className="flex-1 bg-jarvis-void/80 border border-jarvis-border/60 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold shadow-glow-cyan transition-all flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>TRANSMIT</span>
        </button>
      </form>
    </div>
  );
};
