import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Send, 
  Trash2, 
  Sparkles, 
  User, 
  Bot, 
  Mic, 
  Monitor, 
  Camera, 
  X, 
  Maximize2, 
  Loader2 
} from 'lucide-react';
import { ChatMessage, VisualPayload } from '../../types/jarvis';
import { ActionCard } from '../ActionCard';
import { visionCapture } from '../../services/visionCapture';

interface NeuralChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string, visualPayload?: VisualPayload) => void;
  onClearLog: () => void;
  isThinking: boolean;
  onNavigateTab?: (tab: string) => void;
  onOpenMicModal?: () => void;
}

export const NeuralChatView: React.FC<NeuralChatViewProps> = ({
  messages,
  onSendMessage,
  onClearLog,
  isThinking,
  onNavigateTab,
  onOpenMicModal,
}) => {
  const [input, setInput] = useState('');
  const [attachedVisual, setAttachedVisual] = useState<VisualPayload | null>(null);
  const [capturingVisual, setCapturingVisual] = useState<'screen' | 'camera' | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleCaptureScreen = async () => {
    setCapturingVisual('screen');
    try {
      const frame = await visionCapture.captureScreenFrame();
      setAttachedVisual(frame);
    } catch (err: any) {
      console.warn('[VISION] Screen capture note:', err.message);
    } finally {
      setCapturingVisual(null);
    }
  };

  const handleCaptureCamera = async () => {
    setCapturingVisual('camera');
    try {
      const frame = await visionCapture.captureCameraFrame();
      setAttachedVisual(frame);
    } catch (err: any) {
      console.warn('[VISION] Camera capture note:', err.message);
    } finally {
      setCapturingVisual(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedVisual) return;
    onSendMessage(input.trim(), attachedVisual || undefined);
    setInput('');
    setAttachedVisual(null);
  };

  const samplePrompts = [
    'Explain this error on my screen',
    'Look at my screen and summarize this page',
    'What am I holding in front of the camera?',
    'Good night JARVIS, set alarm for 6 AM and turn on eye comfort',
    'Look for my Aadhaar card',
    'Stop annoying me with notifications from YouTube and Spotify',
  ];

  return (
    <div className="glass-hud p-5 rounded-2xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
            JARVIS Neural Terminal // Visual Awareness Engine
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-cyan-400/80 hidden sm:inline">
            Mark-LVI Screen Processor // Multimodal Vision Active
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
          const visual = msg.metadata?.visualAttachment as VisualPayload | undefined;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
                  isUser
                    ? 'bg-blue-600/30 border border-blue-400/50 text-blue-300'
                    : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-glow-cyan'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs font-mono leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-blue-950/40 border border-blue-500/30 text-slate-100 rounded-tr-none'
                    : 'bg-jarvis-void/80 border border-cyan-500/30 text-cyan-100/90 rounded-tl-none shadow-hud-panel'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[9px] text-slate-400 mb-1">
                  <span className="font-bold text-cyan-400">{isUser ? 'TONY STARK' : 'JARVIS CORE'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Multimodal Visual Thumbnail in Chat Bubble */}
                {visual && (
                  <div className="p-2 rounded-xl bg-black/60 border border-cyan-500/30 flex items-center gap-3">
                    <div
                      onClick={() =>
                        setLightboxImage({
                          url:
                            visual.dataUrl ||
                            `data:${visual.imageMimeType || 'image/jpeg'};base64,${visual.imageBase64}`,
                          title: `${visual.visualSource?.toUpperCase() || 'VISUAL'} SENSOR FRAME`,
                        })
                      }
                      className="relative cursor-pointer group rounded-lg overflow-hidden border border-cyan-400/50 w-28 h-18 bg-slate-900 flex-shrink-0"
                    >
                      <img
                        src={
                          visual.dataUrl ||
                          `data:${visual.imageMimeType || 'image/jpeg'};base64,${visual.imageBase64}`
                        }
                        alt="Captured Visual"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                    </div>
                    <div className="text-[10px] font-mono space-y-1 truncate">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-bold uppercase inline-block">
                        [{visual.visualSource === 'camera' ? 'CAMERA SENSOR' : 'SCREEN CAPTURE'}
                        {visual.width ? ` • ${visual.width}x${visual.height}` : ''}]
                      </span>
                      <p className="text-[10px] text-slate-400 truncate">
                        {visual.capturedAt ? new Date(visual.capturedAt).toLocaleTimeString() : 'Active Visual Frame'}
                      </p>
                    </div>
                  </div>
                )}

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
              <span>Analyzing visual inputs & synthesizing neural reply...</span>
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

      {/* Input Form with Visual Attachments */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-jarvis-border/40 space-y-2">
        {/* Active Visual Attachment Preview Pill */}
        {attachedVisual && (
          <div className="flex items-center justify-between p-2 rounded-xl border border-cyan-500/40 bg-slate-900/90 shadow-glow-cyan text-xs font-mono">
            <div className="flex items-center gap-2.5 truncate">
              <img
                src={
                  attachedVisual.dataUrl ||
                  `data:${attachedVisual.imageMimeType || 'image/jpeg'};base64,${attachedVisual.imageBase64}`
                }
                alt="Visual Frame"
                className="w-12 h-8 rounded border border-cyan-400/50 object-cover flex-shrink-0"
              />
              <div className="truncate">
                <span className="text-cyan-300 font-bold text-[11px] block truncate">
                  {attachedVisual.visualSource === 'camera' ? 'CAMERA FRAME ATTACHED' : 'SCREEN FRAME ATTACHED'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {attachedVisual.width}x{attachedVisual.height} • Ready to transmit with directive
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedVisual(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar Controls */}
        <div className="flex gap-2">
          {onOpenMicModal && (
            <button
              type="button"
              onClick={onOpenMicModal}
              title="Speak Vocal Directive"
              className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 transition-all"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {/* Share Screen Frame Quick Button */}
          <button
            type="button"
            disabled={capturingVisual !== null}
            onClick={handleCaptureScreen}
            title="Snap Screen / Window Frame"
            className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 transition-all disabled:opacity-50"
          >
            {capturingVisual === 'screen' ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
          </button>

          {/* Camera Sensor Snap Button */}
          <button
            type="button"
            disabled={capturingVisual !== null}
            onClick={handleCaptureCamera}
            title="Snap Camera Sensor Frame"
            className="p-2.5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/15 transition-all disabled:opacity-50"
          >
            {capturingVisual === 'camera' ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              attachedVisual
                ? 'Ask JARVIS about this visual frame... (e.g. "What error is this?", "Summarize this page")'
                : "Message JARVIS AI... (e.g. 'Explain this error on my screen', 'Initiate perimeter scan')"
            }
            className="flex-1 bg-jarvis-void/80 border border-jarvis-border/60 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold shadow-glow-cyan transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>TRANSMIT</span>
          </button>
        </div>
      </form>

      {/* Lightbox Zoom Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] rounded-2xl border border-cyan-500/40 bg-slate-950 p-4 shadow-glow-cyan-lg flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span className="font-mono text-xs font-bold text-cyan-300">{lightboxImage.title}</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxImage.url}
                alt="Expanded Visual"
                className="max-w-full max-h-full object-contain rounded-lg border border-cyan-500/30"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
