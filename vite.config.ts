import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { spawn, execSync, type ChildProcess } from 'child_process';

function checkBackendHealth(url = 'http://127.0.0.1:3001/api/health'): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * JARVIS Auto-Backend Vite Plugin
 * Automatically probes port 3001 when the frontend dev server starts.
 * If the backend is not running, it automatically spawns server.ts in the background.
 */
function jarvisAutoBackend(): Plugin {
  let backendProc: ChildProcess | null = null;

  return {
    name: 'jarvis-auto-backend',
    async configureServer(server) {
      const isAlive = await checkBackendHealth();
      if (isAlive) {
        console.log('\x1b[36m[JARVIS AUTO-ENGINE]\x1b[0m Core Backend already running on http://localhost:3001');
        return;
      }

      console.log('\x1b[33m[JARVIS AUTO-ENGINE]\x1b[0m Core Backend offline. Automatically launching server.ts on port 3001...');
      
      const isWin = process.platform === 'win32';
      backendProc = spawn(
        isWin ? 'cmd.exe' : 'npx',
        isWin ? ['/c', 'npx', 'tsx', 'server.ts'] : ['tsx', 'server.ts'],
        {
          cwd: __dirname,
          stdio: 'inherit',
          shell: false,
          env: { ...process.env, PORT: '3001' },
        }
      );

      backendProc.on('error', (err) => {
        console.warn('\x1b[31m[JARVIS AUTO-ENGINE ERROR]\x1b[0m Could not auto-spawn server:', err.message);
      });

      const killBackend = () => {
        if (backendProc && backendProc.pid) {
          try {
            if (isWin) {
              execSync(`taskkill /PID ${backendProc.pid} /F /T`, { stdio: 'ignore' });
            } else {
              backendProc.kill('SIGTERM');
            }
          } catch {}
          backendProc = null;
        }
      };

      process.on('SIGINT', () => { killBackend(); process.exit(0); });
      process.on('SIGTERM', () => { killBackend(); process.exit(0); });
      process.on('exit', killBackend);
      server.httpServer?.on('close', killBackend);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), jarvisAutoBackend()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-db': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
