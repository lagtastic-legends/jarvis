import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { ClientAction } from '../types/jarvis';
import { actionExecutor } from '../services/actionExecutor';
import { api } from '../services/api';
import { speechEngine } from '../services/speechEngine';
import { audioSynth } from '../services/audioSynth';

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

  // Direct Backend Email Status & Execution States
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [cardStatus, setCardStatus] = useState<'PENDING' | 'TRANSMITTING' | 'TRANSMITTED' | 'ERROR' | 'REJECTED'>(
    (action.status === 'executed' && action.payload?.messageId) ? 'TRANSMITTED' : 'PENDING'
  );
  const [txMessageId, setTxMessageId] = useState<string>(action.payload?.messageId || '');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (action.type === 'COMPOSE_EMAIL') {
      api.getEmailStatus().then((st) => {
        setEmailConfigured(st.configured);
        if (st.senderEmail) setSenderEmail(st.senderEmail);
      }).catch(() => setEmailConfigured(false));
    }
  }, [action.type]);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. COMPOSE_EMAIL CARD (Direct Backend Gmail Dispatch with Human-In-The-Loop Approval)
  if (action.type === 'COMPOSE_EMAIL') {
    const handleOpenGmail = () => {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOpenMailto = () => {
      const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailto;
    };

    const handleApproveAndSendDirect = async () => {
      if (!emailTo.trim()) {
        setErrorMessage('Recipient email address is required.');
        setCardStatus('ERROR');
        return;
      }
      setCardStatus('TRANSMITTING');
      setErrorMessage('');
      audioSynth.playTransmit();

      const res = await api.sendApprovedEmail({
        actionId: action.payload?.actionId || action.id,
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
      });

      if (res.success && res.messageId) {
        setCardStatus('TRANSMITTED');
        setTxMessageId(res.messageId);
        audioSynth.playChirp();
        speechEngine.speak(`Email dispatched to ${emailTo}.`);
      } else {
        setCardStatus('ERROR');
        setErrorMessage(res.error || 'Failed to dispatch email via backend SMTP.');
        audioSynth.playStateSound('ERROR');
      }
    };

    const handleReject = async () => {
      setCardStatus('REJECTED');
      await api.rejectAction(action.payload?.actionId || action.id);
      audioSynth.playChirp();
    };

    return (
      <div className={`mt-2.5 rounded-xl border p-4 space-y-3.5 shadow-hud-panel text-xs font-mono transition-all duration-300 ${
        cardStatus === 'TRANSMITTED'
          ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          : cardStatus === 'ERROR'
          ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          : cardStatus === 'REJECTED'
          ? 'border-slate-700/50 bg-slate-900/40 opacity-70'
          : 'border-cyan-500/40 bg-jarvis-space/95 shadow-glow-cyan'
      }`}>
        {/* Header with Title and Dynamic Real-Time Status Pill */}
        <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 font-bold">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-100 uppercase tracking-wide">
              EMAIL DISPATCH DIRECTIVE
            </span>
          </div>

          <div>
            {cardStatus === 'PENDING' && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold flex items-center gap-1.5 shadow-glow-cyan">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                PENDING APPROVAL
              </span>
            )}
            {cardStatus === 'TRANSMITTING' && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 font-bold flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                TRANSMITTING...
              </span>
            )}
            {cardStatus === 'TRANSMITTED' && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                TRANSMITTED ✔
              </span>
            )}
            {cardStatus === 'ERROR' && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-400/50 text-red-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                ACTION REQUIRED
              </span>
            )}
            {cardStatus === 'REJECTED' && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-600 text-slate-400 font-bold flex items-center gap-1.5">
                <XCircle className="w-3 h-3" />
                REJECTED
              </span>
            )}
          </div>
        </div>

        {/* Backend Configuration Banner */}
        {cardStatus !== 'TRANSMITTED' && cardStatus !== 'REJECTED' && (
          <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded bg-black/40 border border-cyan-500/15">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${emailConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {emailConfigured
                ? `Gmail Engine: Connected (${senderEmail || 'Default Account'})`
                : 'Direct Gmail dispatch: Add GMAIL_USER & GMAIL_APP_PASSWORD to .env'}
            </span>
            <span className="text-cyan-400/80 font-bold">SMTP NODE</span>
          </div>
        )}

        {/* Transmitted Success View */}
        {cardStatus === 'TRANSMITTED' ? (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 space-y-2 text-emerald-100">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Dispatched via JARVIS Backend Node
              </span>
              <span className="text-[10px] text-emerald-400/80 font-mono">STATUS 200 OK</span>
            </div>
            <div className="text-[11px] space-y-1 text-slate-300">
              <p><strong className="text-slate-400">Recipient:</strong> {emailTo}</p>
              <p><strong className="text-slate-400">Subject:</strong> {emailSubject}</p>
              {txMessageId && (
                <p className="truncate text-[10px] text-emerald-400/80 font-mono">
                  <strong className="text-slate-400">SMTP Message ID:</strong> {txMessageId}
                </p>
              )}
            </div>
          </div>
        ) : cardStatus === 'REJECTED' ? (
          <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400 text-xs">
            <p>Directive cancelled by user. Email draft was revoked from the action matrix.</p>
          </div>
        ) : (
          /* Editable Form Fields */
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-cyan-400 w-16 flex-shrink-0">TO:</span>
              <input
                type="text"
                disabled={cardStatus === 'TRANSMITTING'}
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@domain.com"
                className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-cyan-400 w-16 flex-shrink-0">SUBJECT:</span>
              <input
                type="text"
                disabled={cardStatus === 'TRANSMITTING'}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line..."
                className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-cyan-400">MESSAGE BODY:</span>
              <textarea
                rows={4}
                disabled={cardStatus === 'TRANSMITTING'}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/30 rounded p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none disabled:opacity-50 leading-relaxed font-sans"
              />
            </div>

            {/* Error Diagnostics Banner */}
            {cardStatus === 'ERROR' && (
              <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/30 text-red-200 text-[11px] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span>Direct Dispatch Diagnostic:</span>
                </div>
                <p className="leading-relaxed text-red-300">{errorMessage}</p>
                <p className="text-[10px] text-slate-400">
                  You can still send this draft immediately using the "Open in Gmail" button below.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Buttons / Controls */}
        {cardStatus !== 'TRANSMITTED' && cardStatus !== 'REJECTED' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-500/15">
            <div className="flex flex-wrap items-center gap-2">
              {/* PRIMARY ACTION: Approve & Send Direct */}
              <button
                type="button"
                disabled={cardStatus === 'TRANSMITTING'}
                onClick={handleApproveAndSendDirect}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-glow-cyan transition-all transform active:scale-95"
              >
                {cardStatus === 'TRANSMITTING' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>TRANSMITTING VIA SMTP...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Approve & Send Direct</span>
                  </>
                )}
              </button>

              {/* SECONDARY FALLBACK: Open in Gmail */}
              <button
                type="button"
                onClick={handleOpenGmail}
                className="px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-all"
                title="Open pre-filled draft in Gmail web app"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Gmail</span>
              </button>

              {/* NATIVE MAIL APP */}
              <button
                type="button"
                onClick={handleOpenMailto}
                className="px-2.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-500/15 text-cyan-400 font-mono text-xs flex items-center gap-1.5 transition-all hidden sm:flex"
                title="Open in native desktop mail client"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Mail App</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy Draft */}
              <button
                type="button"
                onClick={() => copyToClipboard(`Subject: ${emailSubject}\n\n${emailBody}`)}
                className="p-2 rounded-xl border border-jarvis-border/60 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all text-xs"
                title="Copy email text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Reject / Cancel */}
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-2 rounded-xl border border-red-500/30 hover:border-red-400/60 hover:bg-red-500/10 text-red-400 font-mono text-xs flex items-center gap-1 transition-all"
                title="Cancel and revoke this email directive"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}
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
