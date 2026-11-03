/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          void: '#030712',
          space: '#060d1d',
          glass: 'rgba(8, 20, 42, 0.65)',
          border: 'rgba(56, 189, 248, 0.22)',
          borderActive: 'rgba(56, 189, 248, 0.6)',
          cyan: '#00f2fe',
          blue: '#3b82f6',
          glow: '#38bdf8',
          amber: '#f59e0b',
          emerald: '#10b981',
          violet: '#8b5cf6',
          crimson: '#ef4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.4), 0 0 10px -2px rgba(56, 189, 248, 0.3)',
        'glow-cyan-lg': '0 0 50px -10px rgba(0, 242, 254, 0.5), 0 0 20px -3px rgba(56, 189, 248, 0.4)',
        'glow-violet': '0 0 30px -5px rgba(139, 92, 246, 0.5)',
        'glow-emerald': '0 0 30px -5px rgba(16, 185, 129, 0.4)',
        'glow-crimson': '0 0 30px -5px rgba(239, 68, 68, 0.5)',
        'hud-panel': '0 8px 32px 0 rgba(0, 3, 15, 0.7), inset 0 1px 0 rgba(56, 189, 248, 0.2)'
      },
      animation: {
        'spin-slow': 'spin 24s linear infinite',
        'spin-reverse': 'spin-reverse 18s linear infinite',
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.04)' }
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        }
      }
    },
  },
  plugins: [],
}
