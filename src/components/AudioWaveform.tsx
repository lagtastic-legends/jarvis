import React, { useEffect, useState } from 'react';
import { JarvisState } from '../types/jarvis';

interface AudioWaveformProps {
  state: JarvisState;
  isSpeaking: boolean;
  barCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  state,
  isSpeaking,
  barCount = 32,
}) => {
  const [heights, setHeights] = useState<number[]>(() => 
    Array.from({ length: barCount }, () => 4)
  );

  useEffect(() => {
    let animId: number;

    const updateBars = () => {
      const active = isSpeaking || state === 'SPEAKING' || state === 'LISTENING';
      const maxH = isSpeaking || state === 'SPEAKING' ? 32 : state === 'LISTENING' ? 22 : 8;

      setHeights(() => {
        return Array.from({ length: barCount }, (_, i) => {
          if (!active) {
            // Gentle ambient undulating wave
            const offset = (Math.sin(Date.now() * 0.003 + i * 0.25) + 1) * 0.5;
            return 3 + offset * 5;
          }
          // Symmetrical bell-curve with organic randomization
          const center = barCount / 2;
          const dist = Math.abs(i - center) / center;
          const bell = Math.max(0.1, 1 - dist * dist);
          const noise = 0.4 + Math.random() * 0.6;
          return Math.max(4, bell * maxH * noise);
        });
      });

      animId = requestAnimationFrame(updateBars);
    };

    animId = requestAnimationFrame(updateBars);
    return () => cancelAnimationFrame(animId);
  }, [state, isSpeaking, barCount]);

  return (
    <div className="flex items-end justify-center gap-1 h-10 w-full px-4 py-1">
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px` }}
          className={`w-1 rounded-full transition-all duration-75 ${
            state === 'SPEAKING' ? 'bg-gradient-to-t from-emerald-600 to-cyan-300' :
            state === 'LISTENING' ? 'bg-gradient-to-t from-cyan-600 to-white' :
            state === 'THINKING' ? 'bg-gradient-to-t from-amber-600 to-violet-400' :
            state === 'ERROR' ? 'bg-gradient-to-t from-red-600 to-amber-400' :
            'bg-gradient-to-t from-blue-900 to-cyan-400/50'
          }`}
        />
      ))}
    </div>
  );
};
