import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Wifi, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Smartphone,
  Laptop
} from 'lucide-react';
import { nativeAndroid } from '../services/nativeAndroid';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onServerUpdated,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'auto' | 'lan' | 'tunnel' | 'custom'>('auto');
  const [customInput, setCustomInput] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('jarvis_custom_api_url') || '';
      setCurrentUrl(stored);
      setCustomInput(stored);
      if (!stored) {
        setSelectedMode('auto');
      } else if (stored.includes('trycloudflare.com') || stored.includes('https://')) {
        setSelectedMode('tunnel');
      } else if (stored.includes(':3001') || stored.includes('192.168.')) {
        setSelectedMode('lan');
      } else {
        setSelectedMode('custom');
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testConnection = async (targetUrl: string) => {
    setIsTesting(true);
    setTestResult(null);
    nativeAndroid.triggerHaptic('light');

    const clean = targetUrl.trim().replace(/\/+$/, '');
    const probeUrl = clean ? `${clean}/api/health` : '/api/health';
    const start = performance.now();

    try {
      const res = await fetch(probeUrl, { signal: AbortSignal.timeout(4000) });
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connected to ${data.service || 'JARVIS Core'} (${data.status})`,
          latencyMs: latency,
        });
        nativeAndroid.triggerHaptic('success');
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP ${res.status}`,
        });
        nativeAndroid.triggerHaptic('warning');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.name === 'TimeoutError' ? 'Connection timed out (4s)' : (err.message || 'Unreachable host'),
      });
      nativeAndroid.triggerHaptic('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    let finalUrl = '';
    if (selectedMode === 'auto') {
      finalUrl = '';
    } else {
      finalUrl = customInput.trim().replace(/\/+$/, '');
    }

    if (finalUrl) {
      localStorage.setItem('jarvis_custom_api_url', finalUrl);
    } else {
      localStorage.removeItem('jarvis_custom_api_url');
    }

    nativeAndroid.triggerHaptic('success');
    onServerUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-6 shadow-glow-cyan-lg space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Gateway Link Config</span>
              {nativeAndroid.isNative() && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                  ANDROID NATIVE
                </span>
              )}
            </h3>
            <p className="text-xs font-mono text-cyan-400/70 truncate max-w-[280px]">
              Active: {currentUrl || 'Relative Proxy (Auto)'}
            </p>
          </div>
        </div>

        {/* Connection Mode Selection */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setSelectedMode('auto');
              setCustomInput('');
              nativeAndroid.triggerHaptic('light');
            }}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              selectedMode === 'auto'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span className="font-bold">Auto</span>
            <span className="text-[9px] opacity-70">Same Host</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('lan');
              if (!customInput || customInput.includes('localhost')) {
                setCustomInput('http://192.168.1.100:3001');
              }
              nativeAndroid.triggerHaptic('light');
            }}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              selectedMode === 'lan'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span className="font-bold">Local LAN</span>
            <span className="text-[9px] opacity-70">Wi-Fi Mirror</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('tunnel');
              if (!customInput || !customInput.startsWith('https://')) {
                setCustomInput('https://your-tunnel.trycloudflare.com');
              }
              nativeAndroid.triggerHaptic('light');
            }}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              selectedMode === 'tunnel'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="font-bold">Remote</span>
            <span className="text-[9px] opacity-70">Cloudflare</span>
          </button>
        </div>

        {/* Target URL Input */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Server Target Gateway URL:</span>
            <span className="text-cyan-400">
              {selectedMode === 'auto' ? 'Default / Relative Proxy' : 'Explicit Address'}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled={selectedMode === 'auto'}
              value={selectedMode === 'auto' ? '(Auto-detecting local/relative gateway)' : customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. http://192.168.1.50:3001"
              className="flex-1 bg-slate-900/80 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isTesting}
              onClick={() => testConnection(selectedMode === 'auto' ? '' : customInput)}
              className="px-3 py-2 rounded-xl text-xs font-mono border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Test</span>
            </button>
          </div>
        </div>

        {/* Live Test Feedback Banner */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
              testResult.success
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-red-500/40 bg-red-950/40 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold">{testResult.message}</p>
              {testResult.latencyMs !== undefined && (
                <p className="text-[10px] opacity-80">Response Latency: {testResult.latencyMs}ms</p>
              )}
            </div>
          </div>
        )}

        {/* Informational Android Helper Tip */}
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-900/40 text-[11px] font-mono text-slate-400 space-y-1">
          <p className="flex items-center gap-1 text-cyan-300 font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Connecting from an Android Phone:</span>
          </p>
          <p>
            • On home Wi-Fi: Run <code className="text-cyan-200">ipconfig</code> on your PC, find IPv4 (e.g. 192.168.1.15), and set URL to <code className="text-cyan-200">http://192.168.1.15:3001</code>.
          </p>
          <p>
            • Anywhere on 5G: Run <code className="text-cyan-200">npx cloudflared tunnel --url http://localhost:3001</code> on your PC and paste the HTTPS link.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-all"
          >
            Apply & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
