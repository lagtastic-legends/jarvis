import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';

function checkHealth(url = 'http://127.0.0.1:3001/api/health', timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const alive = await checkHealth();
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

let serverProc = null;
let viteProc = null;

function cleanup() {
  console.log('\n\x1b[33m[JARVIS]\x1b[0m Shutting down all neural engines cleanly...');
  if (serverProc && serverProc.pid) {
    try {
      if (isWin) {
        execSync(`taskkill /PID ${serverProc.pid} /F /T`, { stdio: 'ignore' });
      } else {
        serverProc.kill('SIGTERM');
      }
    } catch {}
    serverProc = null;
  }
  if (viteProc && viteProc.pid) {
    try {
      if (isWin) {
        execSync(`taskkill /PID ${viteProc.pid} /F /T`, { stdio: 'ignore' });
      } else {
        viteProc.kill('SIGTERM');
      }
    } catch {}
    viteProc = null;
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
process.on('exit', cleanup);

async function main() {
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log('\x1b[36m  JARVIS AI COMMAND CENTER — UNIFIED SYSTEM BOOT\x1b[0m');
  console.log('\x1b[36m========================================================\x1b[0m');

  // 1. Check or Launch Backend Server on 3001
  const isAlreadyRunning = await checkHealth();
  if (isAlreadyRunning) {
    console.log('\x1b[32m[BACKEND]\x1b[0m Core server is already online at http://localhost:3001');
  } else {
    console.log('\x1b[33m[BACKEND]\x1b[0m Launching Core Intelligence Server (server.ts)...');
    
    const tsxPath = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    serverProc = spawn(process.execPath, [tsxPath, 'server.ts'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: '3001' },
    });

    serverProc.on('error', (err) => {
      console.error('\x1b[31m[BACKEND ERROR]\x1b[0m', err.message);
    });

    const isReady = await waitForBackend();
    if (isReady) {
      console.log('\x1b[32m[BACKEND]\x1b[0m Core server verified ONLINE at http://localhost:3001');
    } else {
      console.warn('\x1b[33m[BACKEND WARNING]\x1b[0m Server initialization continuing in background...');
    }
  }

  // 2. Launch Vite Frontend on 5173
  console.log('\x1b[36m[FRONTEND]\x1b[0m Launching Holographic Command Center (Vite)...');
  const vitePath = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
  viteProc = spawn(process.execPath, [vitePath], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  viteProc.on('error', (err) => {
    console.error('\x1b[31m[FRONTEND ERROR]\x1b[0m', err.message);
  });
}

main().catch((err) => {
  console.error('[BOOT ERROR]', err);
  cleanup();
  process.exit(1);
});
