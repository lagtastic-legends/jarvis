import React, { useState } from 'react';
import { 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  MessageSquare, 
  Send, 
  AppWindow, 
  CheckSquare, 
  Sliders, 
  ArrowUpRight
} from 'lucide-react';
import { ClientAction } from '../types/jarvis';
import { actionExecutor } from '../services/actionExecutor';

interface ActionCardProps {
  action: ClientAction;
  onNavigateTab?: (tab: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, onNavigateTab }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>(action.payload?.to || '');
  const [emailSubject, setEmailSubject] = useState<string>(action.payload?.subject || '');
  const [emailBody, setEmailBody] = useState<string>(action.payload?.body || '');
  const [messageText, setMessageText] = useState<string>(action.payload?.messageText || '');

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. COMPOSE_EMAIL CARD
  if (action.type === 'COMPOSE_EMAIL') {
    const handleOpenGmail = () => {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOpenMailto = () => {
      const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailto;
    };

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3.5 space-y-3 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>EMAIL DRAFT // READY TO DISPATCH</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
            INTERACTIVE CARD
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-12 flex-shrink-0">TO:</span>
            <input
              type="text"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@domain.com"
              className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-12 flex-shrink-0">SUBJECT:</span>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject line..."
              className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400">BODY:</span>
            <textarea
              rows={3}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full bg-black/50 border border-cyan-500/30 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleOpenGmail}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-all text-[11px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Gmail</span>
          </button>

          <button
            onClick={handleOpenMailto}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 flex items-center gap-1.5 transition-all text-[11px]"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Open Mail App</span>
          </button>

          <button
            onClick={() => copyToClipboard(`Subject: ${emailSubject}\n\n${emailBody}`)}
            className="px-3 py-1.5 rounded-lg border border-jarvis-border hover:bg-white/5 text-slate-300 flex items-center gap-1.5 transition-all text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Draft'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. REPLY_TO_MESSAGE CARD
  if (action.type === 'REPLY_TO_MESSAGE') {
    const platform = (action.payload?.platform || 'whatsapp').toLowerCase();
    const cleanPhone = (action.payload?.phoneOrHandle || '').replace(/\D/g, '');

    const handleSendPlatform = () => {
      let url = '';
      if (platform === 'whatsapp') {
        url = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
      } else if (platform === 'sms') {
        url = `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`;
      } else if (platform === 'telegram') {
        url = `https://t.me/share/url?url=&text=${encodeURIComponent(messageText)}`;
      }
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const badgeColor = platform === 'whatsapp' 
      ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' 
      : platform === 'telegram'
      ? 'border-sky-500/40 bg-sky-950/60 text-sky-300'
      : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300';

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3.5 space-y-3 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>MESSAGE DISPATCH</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
              {platform}
            </span>
          </div>
          {action.payload?.recipient && (
            <span className="text-[10px] text-slate-400">
              RECIPIENT: <span className="text-cyan-300">{action.payload.recipient}</span>
            </span>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400">REPLY TEXT:</span>
          <textarea
            rows={2}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full bg-black/50 border border-cyan-500/30 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSendPlatform}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-all text-[11px]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send via {platform.toUpperCase()}</span>
          </button>

          <button
            onClick={() => copyToClipboard(messageText)}
            className="px-3 py-1.5 rounded-lg border border-jarvis-border hover:bg-white/5 text-slate-300 flex items-center gap-1.5 transition-all text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. OPEN_MULTIPLE_WINDOWS CARD
  if (action.type === 'OPEN_MULTIPLE_WINDOWS') {
    const windows: Array<{ appOrSite: string; urlOrArgs?: string; title?: string }> = 
      Array.isArray(action.payload?.windows) ? action.payload.windows : [];

    const handleLaunchAll = () => {
      actionExecutor.handleOpenMultipleWindows(action.payload);
    };

    const handleLaunchOne = (win: { appOrSite: string; urlOrArgs?: string }) => {
      actionExecutor.handleOpenApp({ appName: win.appOrSite, targetUrlOrPath: win.urlOrArgs });
    };

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3.5 space-y-3 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>MULTI-WINDOW WORKSPACE DEPLOYMENT</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {action.payload?.hostExecuted ? 'EXECUTED ON HOST OS' : 'READY TO LAUNCH'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {windows.map((win, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-cyan-500/20 bg-black/40 flex items-center justify-between gap-2"
            >
              <div className="truncate">
                <p className="font-bold text-slate-100 truncate">{win.title || win.appOrSite}</p>
                <p className="text-[10px] text-cyan-400/70 truncate">{win.urlOrArgs || win.appOrSite}</p>
              </div>
              <button
                onClick={() => handleLaunchOne(win)}
                className="p-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 flex-shrink-0 transition-colors"
                title={`Launch ${win.title || win.appOrSite}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={handleLaunchAll}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-all text-[11px] shadow-glow-cyan"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Launch All {windows.length} Windows</span>
          </button>
          <span className="text-[10px] text-slate-500">Staggered spawn (250ms)</span>
        </div>
      </div>
    );
  }

  // 4. OPEN_APP CARD
  if (action.type === 'OPEN_APP') {
    const appName = action.payload?.appName || 'App';
    const handleLaunch = () => {
      actionExecutor.handleOpenApp(action.payload);
    };

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3 space-y-2.5 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <AppWindow className="w-4 h-4 text-cyan-400" />
            <span>APPLICATION LAUNCH // {appName.toUpperCase()}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HOST OS LAUNCHED
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-cyan-500/20">
          <span className="text-slate-300 truncate">
            {action.payload?.targetUrlOrPath || `${appName} execution process dispatched`}
          </span>
          <button
            onClick={handleLaunch}
            className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] flex items-center gap-1 flex-shrink-0"
          >
            <span>Relaunch</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // 5. MANAGE_TASK CARD
  if (action.type === 'MANAGE_TASK') {
    const priority = (action.payload?.priority || 'medium').toLowerCase();
    const priorityColor = priority === 'critical'
      ? 'border-red-500/40 bg-red-950/60 text-red-300'
      : priority === 'high'
      ? 'border-amber-500/40 bg-amber-950/60 text-amber-300'
      : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300';

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3.5 space-y-2.5 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <span>OPERATIONAL DIRECTIVE RECORDED</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${priorityColor}`}>
            {priority} PRIORITY
          </span>
        </div>

        <div className="p-2 rounded bg-black/40 border border-cyan-500/20 space-y-1">
          <p className="font-bold text-slate-100">{action.payload?.title || 'Directive'}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>DUE: {action.payload?.dueDate || 'Today'}</span>
            <span className="text-emerald-400">STATUS: ACTIVE IN MATRIX</span>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('tasks')}
            className="px-3 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
          >
            <span>View Tasks & Directives Matrix</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 6. SYSTEM_CONTROL CARD
  if (action.type === 'SYSTEM_CONTROL') {
    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-jarvis-space/90 p-3 space-y-2 shadow-glow-cyan text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>HUD SYSTEM COMMAND EXECUTED</span>
        </div>
        <p className="text-slate-300 text-[11px]">
          Command: <span className="text-cyan-400 font-bold">{action.payload?.command}</span>
          {action.payload?.targetTab && ` ➔ ${action.payload.targetTab.toUpperCase()}`}
        </p>
      </div>
    );
  }

  return null;
};
