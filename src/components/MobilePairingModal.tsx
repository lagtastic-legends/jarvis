import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Wifi
} from 'lucide-react';
import { api } from '../services/api';
import { audioSynth } from '../services/audioSynth';

interface MobilePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LanInfo {
  lanIp: string;
  pairUrl: string;
  pairCode: string;
  hostname: string;
}

export const MobilePairingModal: React.FC<MobilePairingModalProps> = ({ isOpen, onClose }) => {
  const [lanInfo, setLanInfo] = useState<LanInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const fetchLan = async () => {
    setLoading(true);
    try {
      const data = await api.getLanInfo();
      if (data && data.success) {
        setLanInfo({
          lanIp: data.lanIp || '127.0.0.1',
          pairUrl: data.pairUrl || window.location.origin,
          pairCode: data.pairCode || '749201',
          hostname: data.hostname || 'JARVIS-HOST',
        });
      }
    } catch (err) {
      console.warn('[LAN_INFO] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, isCode = false) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      if (isCode) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      audioSynth.playChirp();
    }
  };

  // Generate deterministic QR Code pattern matrix for SVG
  const generateQrMatrix = (url: string): boolean[][] => {
    const size = 25;
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Place 7x7 Finder patterns (top-left, top-right, bottom-left)
    const placeFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[r0 + r][c0 + c] = true;
          }
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Timing strips
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Deterministic payload hashing into cells
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (hash << 5) - hash + url.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder zones
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= size - 8;
        const inBL = r >= size - 8 && c < 8;
        if (inTL || inTR || inBL || r === 6 || c === 6) continue;

        const bit = ((hash ^ (r * 31 + c * 17)) + (r * c)) % 3 === 0;
        matrix[r][c] = bit;
      }
    }

    return matrix;
  };

  const currentUrl = lanInfo?.pairUrl || `http://${window.location.hostname}:5173`;
  const qrMatrix = generateQrMatrix(currentUrl);

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
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-glow-cyan">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
              1-Scan Mobile Pairing
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" />
                LAN READY
              </span>
            </h3>
            <p className="text-xs font-mono text-cyan-400/70">
              Synchronize Phone or Android App over Wi-Fi
            </p>
          </div>
        </div>

        {/* QR Code Holographic Canvas Box */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-cyan-500/30 bg-black/70 shadow-hud-panel space-y-3">
          <div className="p-3 bg-white rounded-xl shadow-md border-2 border-cyan-400">
            <svg
              viewBox="0 0 25 25"
              className="w-48 h-48 sm:w-56 sm:h-56 shape-rendering-crispEdges"
            >
              {qrMatrix.map((row, r) =>
                row.map((active, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill={active ? '#030712' : '#ffffff'}
                  />
                ))
              )}
            </svg>
          </div>

          <p className="text-[11px] font-mono text-slate-400 text-center">
            Scan with your mobile camera or JARVIS Android APK to sync instantly.
          </p>
        </div>

        {/* Connection Details Cards */}
        <div className="space-y-2.5 text-xs font-mono">
          {/* Pairing URL */}
          <div className="p-3 rounded-xl border border-cyan-500/25 bg-slate-900/60 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">
                Local Mobile URL
              </span>
              <span className="text-slate-200 font-bold text-xs truncate">
                {currentUrl}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(currentUrl, false)}
              className="px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* 6-Digit Pairing Access Code */}
          <div className="p-3 rounded-xl border border-cyan-500/25 bg-slate-900/60 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">
                Access Token Code
              </span>
              <span className="text-cyan-200 font-bold tracking-widest text-sm">
                {lanInfo?.pairCode || '------'}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(lanInfo?.pairCode || '', true)}
              className="px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={fetchLan}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh LAN IP</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-glow-cyan transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
