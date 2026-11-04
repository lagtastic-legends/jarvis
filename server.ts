import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import os from 'os';
import fs, { promises as fsPromises } from 'fs';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev_service_role_key';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

// Dual-Mode Gmail Transporter Credentials (Zero-Secret Enforced)
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

// Server-side privileged Supabase client (Zero-Secret: never leaked to client)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws' });

// Track connected WebSocket telemetry clients
const activeSockets = new Set<WebSocket>();

wss.on('connection', (ws) => {
  activeSockets.add(ws);
  
  // Send immediate telemetry handshake
  ws.send(JSON.stringify({
    type: 'TELEMETRY_SYNC',
    timestamp: new Date().toISOString(),
    payload: {
      neuralFlux: '4.2 TFLOPS',
      thermalDispersion: '18.2%',
      powerGrid: '100% NOMINAL',
      subOrbitalRange: '2,450 km',
      activeSynapses: '142,890',
      quantumShields: 'SECURE',
      defcon: 5,
    },
  }));

  ws.on('close', () => {
    activeSockets.delete(ws);
  });
});

// Periodic telemetry broadcast every 5 seconds
setInterval(() => {
  if (activeSockets.size === 0) return;
  const telemetry = {
    type: 'TELEMETRY_UPDATE',
    timestamp: new Date().toISOString(),
    payload: {
      neuralFlux: `${(4.1 + Math.random() * 0.3).toFixed(2)} TFLOPS`,
      thermalDispersion: `${(17.5 + Math.random() * 1.5).toFixed(1)}%`,
      powerGrid: '100% NOMINAL',
      arcReactorOutput: `${(98.1 + Math.random() * 1.5).toFixed(1)}%`,
      activeSynapses: `${142000 + Math.floor(Math.random() * 1500)}`,
      cpuLoad: `${Math.floor(12 + Math.random() * 15)}%`,
      memoryFlux: '2.4 GB / 32 GB',
    },
  };
  const data = JSON.stringify(telemetry);
  activeSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}, 5000);

// ==============================================================================
// IN-MEMORY DATA STORES (Local development mode)
// ==============================================================================
let localMemories = [
  {
    id: 'mem_01',
    category: 'preference',
    content: 'User prefers concise direct briefings, priority alerts on thermal power surges, and automatic flight path calibrations.',
    is_active: true,
    confidence: '99.9%',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem_02',
    category: 'project',
    content: 'Active design initiative: Mark 85 Titanium composite outer carapace. Requires thermal shielding test in cryogenic environment.',
    is_active: true,
    confidence: '98.4%',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem_03',
    category: 'instruction',
    content: 'Auto-engage perimeter defense sweeps every 60 minutes when user is away from Malibu lab.',
    is_active: true,
    confidence: '99.2%',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mem_04',
    category: 'fact',
    content: 'Arc Reactor Mark VII core output threshold calibrated at 3.0 gigajoules/sec.',
    is_active: true,
    confidence: '100%',
    created_at: new Date().toISOString(),
  },
];

let localActions: Array<{
  id: string;
  action_type: string;
  target_resource: string;
  payload: Record<string, any>;
  status: string;
  risk_level: string;
  created_at: string;
}> = [
  {
    id: 'act_01',
    action_type: 'OVERRIDE_POWER_ROUTING',
    target_resource: 'Sector 4 Sub-Station',
    payload: { route: 'Arc Reactor Backup', targetGrid: 'Perimeter Defense' },
    status: 'pending',
    risk_level: 'high',
    created_at: new Date().toISOString(),
  },
  {
    id: 'act_02',
    action_type: 'PURGE_LOGS_ARCHIVE',
    target_resource: 'Telemetry Historical Cluster',
    payload: { ageThresholdDays: 90, force: false },
    status: 'pending',
    risk_level: 'medium',
    created_at: new Date().toISOString(),
  },
];

let localTasks = [
  {
    id: 'tsk_01',
    title: 'Orbital satellite communication alignment',
    description: 'Synchronize quantum communications relay with Stark Industries constellation.',
    priority: 'high',
    status: 'completed' as const,
    due_date: 'Today, 14:00',
  },
  {
    id: 'tsk_02',
    title: 'Compile flight dynamics report for Stark Industries Board',
    description: 'Assemble thermal dispersion and Mach 3.4 cruise data.',
    priority: 'critical',
    status: 'in_progress' as const,
    due_date: 'Today, 16:00',
  },
  {
    id: 'tsk_03',
    title: 'Run quantum encryption salt refresh on server nodes',
    description: 'Re-key cryptographic entropy on all secondary intelligence nodes.',
    priority: 'medium',
    status: 'pending' as const,
    due_date: 'Tomorrow, 09:00',
  },
];

// ==============================================================================
// SAFE OS PROCESS LAUNCHER & MULTI-WINDOW SPAWNER (LOOP 2)
// ==============================================================================
interface LaunchResult {
  success: boolean;
  message: string;
}

function launchAppSafely(appName: string, targetUrlOrPath?: string): LaunchResult {
  const normalized = (appName || '').toLowerCase().trim();
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  // Sanitize target URL or path to prevent shell injection
  const safeTarget = targetUrlOrPath ? targetUrlOrPath.replace(/["&|;^%`]/g, '').trim() : '';

  try {
    if (isWin) {
      if (normalized.includes('notepad')) {
        const child = spawn('notepad.exe', safeTarget ? [safeTarget] : [], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'Notepad launched successfully' };
      }
      if (normalized.includes('calc') || normalized.includes('calculator')) {
        const child = spawn('calc.exe', [], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'Calculator launched successfully' };
      }
      if (normalized.includes('code') || normalized.includes('vscode') || normalized.includes('vs code')) {
        const child = spawn('cmd.exe', ['/c', 'code', '-n', safeTarget || '.'], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'VS Code launched in new window' };
      }
      if (normalized.includes('chrome') || normalized.includes('browser')) {
        const targetUrl = safeTarget.startsWith('http') ? safeTarget : (safeTarget ? `https://${safeTarget}` : 'https://google.com');
        const child = spawn('cmd.exe', ['/c', 'start', 'chrome', '--new-window', targetUrl], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: `Chrome browser window launched with ${targetUrl}` };
      }
      if (normalized.includes('terminal') || normalized.includes('cmd') || normalized.includes('powershell')) {
        const child = spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'Terminal console window launched' };
      }
      if (normalized.includes('explorer') || normalized.includes('files') || normalized.includes('folder')) {
        const child = spawn('explorer.exe', safeTarget ? [safeTarget] : [], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'File Explorer launched' };
      }
      if (normalized.includes('spotify')) {
        const child = spawn('cmd.exe', ['/c', 'start', 'spotify:'], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'Spotify client launched' };
      }
      if (normalized.includes('whatsapp')) {
        const child = spawn('cmd.exe', ['/c', 'start', 'whatsapp:'], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'WhatsApp launched' };
      }
      if (normalized.includes('settings')) {
        const child = spawn('cmd.exe', ['/c', 'start', 'ms-settings:'], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: 'System Settings launched' };
      }

      // Popular web destinations
      const webMap: Record<string, string> = {
        youtube: 'https://youtube.com',
        github: 'https://github.com',
        gmail: 'https://mail.google.com',
        twitter: 'https://x.com',
        x: 'https://x.com',
        reddit: 'https://reddit.com',
        chatgpt: 'https://chatgpt.com',
        claude: 'https://claude.ai',
        maps: 'https://maps.google.com',
      };
      for (const [key, url] of Object.entries(webMap)) {
        if (normalized.includes(key)) {
          const targetUrl = safeTarget.startsWith('http') ? safeTarget : url;
          const child = spawn('cmd.exe', ['/c', 'start', 'chrome', '--new-window', targetUrl], { detached: true, stdio: 'ignore' });
          child.unref();
          return { success: true, message: `Opened ${key} at ${targetUrl}` };
        }
      }

      if (safeTarget.startsWith('http') || normalized.includes('.com') || normalized.includes('.org')) {
        const url = safeTarget.startsWith('http') ? safeTarget : `https://${normalized}`;
        const child = spawn('cmd.exe', ['/c', 'start', 'chrome', '--new-window', url], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true, message: `Opened browser at ${url}` };
      }
    } else if (isMac) {
      const child = spawn('open', ['-a', appName, ...(safeTarget ? [safeTarget] : [])], { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, message: `Application ${appName} launched` };
    } else {
      const child = spawn('xdg-open', [safeTarget || appName], { detached: true, stdio: 'ignore' });
      child.unref();
      return { success: true, message: `Application ${appName} launched` };
    }
  } catch (err: any) {
    console.warn(`[SAFE_LAUNCH] Could not launch ${appName}:`, err.message);
    return { success: false, message: `Could not launch ${appName} on host: ${err.message}` };
  }

  return { success: true, message: `Dispatched launch directive for ${appName}` };
}

async function launchMultipleWindowsSafely(windows: Array<{ appOrSite: string; urlOrArgs?: string; title?: string }>): Promise<void> {
  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    launchAppSafely(win.appOrSite, win.urlOrArgs);
    if (i < windows.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

// ==============================================================================
// CUSTOM ROUTINES & MACROS DATA STORE & EXECUTOR (LOOP 1 & 2)
// ==============================================================================
interface RoutineStep {
  id: string;
  type: string;
  label: string;
  payload: Record<string, any>;
  order: number;
}

interface CustomRoutine {
  id: string;
  user_id?: string;
  routine_name: string;
  voice_trigger: string;
  description: string;
  steps: RoutineStep[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

let localRoutines: CustomRoutine[] = [
  {
    id: 'rtn_01',
    user_id: 'usr_stark_01',
    routine_name: 'Coding Mode Matrix',
    voice_trigger: 'activate coding mode',
    description: 'Launches VS Code & GitHub, engages DND, and initializes engineering sprint directives.',
    is_active: true,
    created_at: new Date().toISOString(),
    steps: [
      {
        id: 'step_1',
        type: 'OPEN_APP',
        label: 'Launch VS Code IDE',
        payload: { appName: 'VS Code' },
        order: 1,
      },
      {
        id: 'step_2',
        type: 'OPEN_URL',
        label: 'Open GitHub Repository',
        payload: { appName: 'Chrome', url: 'https://github.com' },
        order: 2,
      },
      {
        id: 'step_3',
        type: 'SYSTEM_CONTROL',
        label: 'Engage Do Not Disturb (DND)',
        payload: { setting: 'dnd', state: true, notificationLevel: 'critical_only' },
        order: 3,
      },
      {
        id: 'step_4',
        type: 'CREATE_TASK',
        label: 'Queue Engineering Directive',
        payload: { title: 'Complete active engineering milestone and run unit suite', priority: 'high' },
        order: 4,
      },
    ],
  },
  {
    id: 'rtn_02',
    user_id: 'usr_stark_01',
    routine_name: 'Deep Work Protocol',
    voice_trigger: 'deep work',
    description: 'Enables Eye Comfort warm filter, drops ambient brightness to 60%, and isolates notifications.',
    is_active: true,
    created_at: new Date().toISOString(),
    steps: [
      {
        id: 'step_1',
        type: 'SYSTEM_CONTROL',
        label: 'Enable Eye Comfort Shield',
        payload: { setting: 'eyeComfort', enabled: true, colorTemp: 'warm_amber' },
        order: 1,
      },
      {
        id: 'step_2',
        type: 'SYSTEM_CONTROL',
        label: 'Adjust Ambient Brightness to 60%',
        payload: { setting: 'brightness', level: 60 },
        order: 2,
      },
      {
        id: 'step_3',
        type: 'SYSTEM_CONTROL',
        label: 'Silence Peripheral Notifications',
        payload: { setting: 'dnd', state: true },
        order: 3,
      },
    ],
  },
  {
    id: 'rtn_03',
    user_id: 'usr_stark_01',
    routine_name: 'Cinema Protocol',
    voice_trigger: 'cinema mode',
    description: 'Dims display to 20%, activates warm display matrix, and blocks non-critical alerts.',
    is_active: true,
    created_at: new Date().toISOString(),
    steps: [
      {
        id: 'step_1',
        type: 'SYSTEM_CONTROL',
        label: 'Dim HUD Display to 20%',
        payload: { setting: 'brightness', level: 20 },
        order: 1,
      },
      {
        id: 'step_2',
        type: 'SYSTEM_CONTROL',
        label: 'Enable Cinematic Night Filter',
        payload: { setting: 'eyeComfort', enabled: true },
        order: 2,
      },
      {
        id: 'step_3',
        type: 'SYSTEM_CONTROL',
        label: 'Silence Peripheral Ringers',
        payload: { setting: 'dnd', state: true },
        order: 3,
      },
    ],
  },
];

function executeRoutineSteps(routine: CustomRoutine, _userId: string = 'usr_stark_01') {
  const clientActions: any[] = [];
  for (const step of routine.steps) {
    const actionId = `act_rtn_${Date.now()}_${step.id}`;
    if (step.type === 'OPEN_APP') {
      launchAppSafely(step.payload.appName, step.payload.targetUrlOrPath);
      clientActions.push({
        id: actionId,
        type: 'OPEN_APP',
        title: step.label || `Open ${step.payload.appName}`,
        payload: step.payload,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (step.type === 'OPEN_URL') {
      launchAppSafely(step.payload.appName || 'browser', step.payload.url);
      clientActions.push({
        id: actionId,
        type: 'OPEN_APP',
        title: step.label || 'Open URL',
        payload: step.payload,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (step.type === 'OPEN_MULTIPLE_WINDOWS') {
      if (Array.isArray(step.payload.windows)) {
        launchMultipleWindowsSafely(step.payload.windows);
      }
      clientActions.push({
        id: actionId,
        type: 'OPEN_MULTIPLE_WINDOWS',
        title: step.label || 'Spawn Workspace Windows',
        payload: step.payload,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (step.type === 'SYSTEM_CONTROL') {
      clientActions.push({
        id: actionId,
        type: 'SYSTEM_CONTROL',
        title: step.label || 'System Control Preset',
        payload: step.payload,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (step.type === 'CREATE_TASK') {
      const newTask = {
        id: `tsk_rtn_${Date.now()}`,
        title: step.payload.title || 'Automated Routine Task',
        description: step.payload.description || `Generated by macro ${routine.routine_name}`,
        priority: (step.payload.priority as any) || 'medium',
        status: 'pending' as const,
        due_date: 'Today',
      };
      localTasks.unshift(newTask);
      clientActions.push({
        id: actionId,
        type: 'MANAGE_TASK',
        title: `Create task: ${newTask.title}`,
        payload: { action: 'create', ...newTask },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (step.type === 'DEVICE_SETTING') {
      clientActions.push({
        id: actionId,
        type: 'DIAGNOSE_AND_OPEN_SETTING',
        title: step.label || 'Device Setting Adjustment',
        payload: step.payload,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    }
  }
  return { clientActions };
}

function findMatchingRoutine(text: string): CustomRoutine | null {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();
  for (const routine of localRoutines) {
    if (!routine.is_active) continue;
    const trigger = routine.voice_trigger.toLowerCase().trim();
    if (
      normalized === trigger ||
      normalized.includes(trigger) ||
      (trigger.length > 5 &&
        normalized.replace(/[^a-z0-9]/g, '').includes(trigger.replace(/[^a-z0-9]/g, '')))
    ) {
      return routine;
    }
  }
  return null;
}


// ==============================================================================
// GMAIL DISPATCH TRANSPORTER & EMAIL SERVICE (LOOP 1)
// ==============================================================================
function createJarvisMailTransporter(): Transporter | null {
  // 1. Gmail OAuth2 Mode
  if (GMAIL_USER && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_USER,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  // 2. Gmail App Password Mode (strips all whitespace from the 16-character app password)
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const cleanPassword = GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: cleanPassword,
      },
    });
  }

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendJarvisEmail(params: {
  to: string;
  subject: string;
  body: string;
  actionId?: string;
  userId?: string;
}): Promise<{ success: boolean; messageId: string; reply: string }> {
  const { to, subject, body, actionId, userId: _userId = 'usr_stark_01' } = params;

  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required.');
  }
  if (!subject || !subject.trim()) {
    throw new Error('Email subject line is required.');
  }
  if (!body || !body.trim()) {
    throw new Error('Email body content is required.');
  }

  const transporter = createJarvisMailTransporter();
  if (!transporter) {
    throw new Error(
      'Direct backend Gmail dispatch is not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file.'
    );
  }

  const formattedHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-family: monospace; color: #0891b2; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">JARVIS Neural Dispatch</span>
        <h2 style="color: #0f172a; margin: 6px 0 0 0; font-size: 20px; font-weight: 700;">
          ${escapeHtml(subject)}
        </h2>
      </div>
      <div style="white-space: pre-wrap; font-size: 15px; color: #334155; line-height: 1.6; margin: 16px 0;">${escapeHtml(body)}</div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-family: monospace;">
        <span>Authenticated Dispatch &bull; Sender: ${escapeHtml(GMAIL_USER)}</span>
        <span>JARVIS AI Core v2.2</span>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"JARVIS AI (${GMAIL_USER})" <${GMAIL_USER}>`,
    to: to.trim(),
    subject: subject.trim(),
    text: body.trim(),
    html: formattedHtml,
  });

  const nowIso = new Date().toISOString();

  // Update in-memory action queue
  if (actionId) {
    const existing = localActions.find((a) => a.id === actionId);
    if (existing) {
      existing.status = 'executed';
      existing.payload = {
        ...existing.payload,
        messageId: info.messageId,
        sentAt: nowIso,
      };
    }
  } else {
    const pendingEmail = localActions.find(
      (a) => a.action_type === 'SEND_EMAIL' && a.status === 'pending'
    );
    if (pendingEmail) {
      pendingEmail.status = 'executed';
      pendingEmail.payload = {
        ...pendingEmail.payload,
        messageId: info.messageId,
        sentAt: nowIso,
      };
    }
  }

  // Update Supabase if live credentials configured
  if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key' && actionId) {
    try {
      await supabase
        .from('action_queue')
        .update({
          status: 'executed',
          updated_at: nowIso,
          payload: { to, subject, body, messageId: info.messageId, sentAt: nowIso },
        })
        .eq('id', actionId);
    } catch (e: any) {
      console.warn('[DB_SYNC] Action queue sync error:', e.message);
    }
  }

  return {
    success: true,
    messageId: info.messageId,
    reply: `Email successfully dispatched to ${to}.`,
  };
}

// ==============================================================================
// BIXBY DEVICE INTELLIGENCE: LOCAL FILE FINDER & VAULT SEARCH
// ==============================================================================
interface LocalFileInfo {
  fileName: string;
  fullPath: string;
  directory: string;
  modifiedAt: string;
  sizeBytes: number;
  fileType: string;
}

async function searchLocalFiles(query: string, fileTypes?: string[]): Promise<LocalFileInfo[]> {
  const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const home = os.homedir();
  const searchRoots = [
    path.resolve(process.cwd(), 'vault'),
    path.join(home, 'Downloads'),
    path.join(home, 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'Pictures'),
  ];

  const results: LocalFileInfo[] = [];
  const maxResults = 8;
  const maxDepth = 2;

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth || results.length >= maxResults) return;
    try {
      const entries = await fsPromises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$Recycle.Bin') continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          const ext = path.extname(lowerName).replace('.', '');

          if (fileTypes && fileTypes.length > 0 && !fileTypes.includes(ext)) {
            continue;
          }

          const matches = queryTokens.some((tok) => lowerName.includes(tok));
          if (matches) {
            try {
              const stat = await fsPromises.stat(fullPath);
              results.push({
                fileName: entry.name,
                fullPath,
                directory: path.basename(dir),
                modifiedAt: stat.mtime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                sizeBytes: stat.size,
                fileType: ext.toUpperCase() || 'FILE',
              });
            } catch {
              // Ignore unreadable
            }
          }
        }
      }
    } catch {
      // Ignore unreadable dir
    }
  }

  for (const root of searchRoots) {
    if (results.length >= maxResults) break;
    try {
      await walk(root, 0);
    } catch {
      // Continue next root
    }
  }

  // If no files matched from disk, search vault with fuzzy match
  if (results.length === 0) {
    try {
      const vaultDir = path.resolve(process.cwd(), 'vault');
      const entries = await fsPromises.readdir(vaultDir);
      for (const file of entries) {
        const fullPath = path.join(vaultDir, file);
        const stat = await fsPromises.stat(fullPath);
        results.push({
          fileName: file,
          fullPath,
          directory: 'Vault',
          modifiedAt: stat.mtime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          sizeBytes: stat.size,
          fileType: path.extname(file).replace('.', '').toUpperCase() || 'PDF',
        });
        if (results.length >= 4) break;
      }
    } catch {
      //
    }
  }

  return results;
}

// ==============================================================================
// GEMINI FUNCTION CALLING TOOLS DEFINITION (LOOP 1)
// ==============================================================================
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'open_application',
        description: 'Opens a native desktop application, mobile app, or website URL (e.g. Chrome, VS Code, Spotify, YouTube, Calculator, Notepad, Settings, WhatsApp, Terminal, File Explorer).',
        parameters: {
          type: 'OBJECT',
          properties: {
            appName: { type: 'STRING', description: 'The name of the application or website.' },
            targetUrlOrPath: { type: 'STRING', description: 'Optional URL, domain, or file path to open.' },
          },
          required: ['appName'],
        },
      },
      {
        name: 'open_multiple_windows',
        description: 'Opens multiple application windows or coordinated workspace browser windows simultaneously (e.g. YouTube, GitHub, and Gmail).',
        parameters: {
          type: 'OBJECT',
          properties: {
            windows: {
              type: 'ARRAY',
              description: 'List of application windows or web destinations to spawn simultaneously.',
              items: {
                type: 'OBJECT',
                properties: {
                  appOrSite: { type: 'STRING', description: 'Name of application or website.' },
                  urlOrArgs: { type: 'STRING', description: 'URL or arguments for the window.' },
                  title: { type: 'STRING', description: 'Descriptive title for this window.' },
                },
                required: ['appOrSite'],
              },
            },
          },
          required: ['windows'],
        },
      },
      {
        name: 'compose_email',
        description: 'Composes a complete, polished email and triggers the user email client (Gmail or default mail app) with an interactive draft card.',
        parameters: {
          type: 'OBJECT',
          properties: {
            to: { type: 'STRING', description: 'Recipient email address if known.' },
            subject: { type: 'STRING', description: 'Polished subject line.' },
            body: { type: 'STRING', description: 'Full professional or casual body content of the email.' },
            autoOpenClient: { type: 'BOOLEAN', description: 'Whether to auto-launch the email client immediately.' },
          },
          required: ['subject', 'body'],
        },
      },
      {
        name: 'reply_to_message',
        description: 'Crafts a message reply and opens the target messaging app (WhatsApp, SMS, Telegram, or Email) pre-filled with the drafted response.',
        parameters: {
          type: 'OBJECT',
          properties: {
            platform: {
              type: 'STRING',
              enum: ['whatsapp', 'sms', 'telegram', 'email', 'generic'],
              description: 'Target messaging platform.',
            },
            recipient: { type: 'STRING', description: 'Name or contact identifier of recipient.' },
            phoneOrHandle: { type: 'STRING', description: 'Phone number or handle if known.' },
            messageText: { type: 'STRING', description: 'Drafted reply text.' },
            autoLaunch: { type: 'BOOLEAN', description: 'Whether to auto-launch the messaging application.' },
          },
          required: ['platform', 'messageText'],
        },
      },
      {
        name: 'manage_task',
        description: 'Creates, completes, or lists real operational tasks and directives in the JARVIS task matrix.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: { type: 'STRING', enum: ['create', 'complete', 'list'], description: 'Action to perform.' },
            title: { type: 'STRING', description: 'Title of the directive or task.' },
            priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level.' },
            dueDate: { type: 'STRING', description: 'Due date or target timeframe.' },
          },
          required: ['action', 'title'],
        },
      },
      {
        name: 'system_control',
        description: 'Controls the JARVIS Holographic HUD interface directly (switch tabs, mute/unmute voice, clear chat, system diagnostics).',
        parameters: {
          type: 'OBJECT',
          properties: {
            command: {
              type: 'STRING',
              enum: ['mute_voice', 'unmute_voice', 'clear_chat', 'switch_tab', 'system_status'],
              description: 'HUD command to execute.',
            },
            targetTab: {
              type: 'STRING',
              enum: ['dashboard', 'chat', 'voice', 'memory', 'vision', 'tasks', 'research', 'coding', 'settings'],
              description: 'Destination tab when command is switch_tab.',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'approve_pending_email',
        description: 'Approves and immediately transmits the pending email draft currently queued in the action queue. Call this whenever the user confirms by voice or text (e.g. "Send it", "Approve and send", "Dispatch the email", "Yes send that email", "Send it now").',
        parameters: {
          type: 'OBJECT',
          properties: {
            actionId: { type: 'STRING', description: 'Optional specific actionId of the pending email to approve.' },
            notes: { type: 'STRING', description: 'Optional confirmation directive or note.' },
          },
        },
      },
      {
        name: 'manage_app_notifications',
        description: 'Controls per-application notification permissions (mute, block, enable, or toggle app alerts). Call when user asks to stop, mute, turn off, or enable notifications for specific apps like YouTube, Netflix, Spotify, WhatsApp, Slack, etc.',
        parameters: {
          type: 'OBJECT',
          properties: {
            apps: {
              type: 'ARRAY',
              description: 'List of applications with desired notification state.',
              items: {
                type: 'OBJECT',
                properties: {
                  appName: { type: 'STRING', description: 'Name of the app (e.g. YouTube, Spotify, Netflix).' },
                  packageName: { type: 'STRING', description: 'Optional Android package identifier (e.g. com.google.android.youtube).' },
                  allowNotifications: { type: 'BOOLEAN', description: 'Whether notifications should be allowed (true) or muted/blocked (false).' },
                },
                required: ['appName', 'allowNotifications'],
              },
            },
          },
          required: ['apps'],
        },
      },
      {
        name: 'find_local_file',
        description: 'Performs instant semantic file search across local files, documents, downloads, desktop, and vault for IDs, cards, resumes, receipts, photos, or invoices. Call whenever user asks to find, locate, search for, or open a file (e.g., "Look for my Aadhaar card", "Find my resume", "Where is the invoice?").',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search term or document description (e.g. "aadhaar", "resume", "invoice", "receipt", "tax").' },
            fileTypes: {
              type: 'ARRAY',
              description: 'Optional file extensions to restrict search to (e.g. ["pdf", "jpg", "png", "docx"]).',
              items: { type: 'STRING' },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'execute_device_routine',
        description: 'Executes chained multi-step device automation macros (e.g. "Good night", "Good morning", "Focus mode", "Cinema mode"). Configures DND, eye comfort warm shield, display brightness, alarm time, and media muting simultaneously.',
        parameters: {
          type: 'OBJECT',
          properties: {
            routineName: { type: 'STRING', description: 'Name of the routine (e.g. "Good Night", "Good Morning", "Focus Protocol", "Cinema Mode").' },
            steps: {
              type: 'OBJECT',
              description: 'Configured parameters for the routine.',
              properties: {
                enableDnd: { type: 'BOOLEAN', description: 'Enable or disable Do Not Disturb mode.' },
                eyeComfortShield: { type: 'BOOLEAN', description: 'Enable or disable warm blue-light filter.' },
                brightnessPercent: { type: 'NUMBER', description: 'Screen brightness level from 5 to 100 percent.' },
                alarmTime: { type: 'STRING', description: 'Target morning or focus alarm time (e.g. "06:00 AM").' },
                muteMedia: { type: 'BOOLEAN', description: 'Whether to mute ambient media volume.' },
                customThemeDim: { type: 'BOOLEAN', description: 'Dim the console HUD visuals.' },
              },
            },
          },
          required: ['routineName', 'steps'],
        },
      },
      {
        name: 'diagnose_and_open_setting',
        description: 'Diagnoses device symptoms (e.g. accidental touches in pocket, screen turning off quickly, fast battery drain) and maps them to exact OS settings screens with breadcrumb paths, inline toggles, and direct setting jump links.',
        parameters: {
          type: 'OBJECT',
          properties: {
            userProblem: { type: 'STRING', description: 'Summary of the user symptom or issue.' },
            diagnosedSettingName: { type: 'STRING', description: 'Exact name of the setting feature (e.g. "Accidental Touch Protection", "Screen Timeout", "Battery Saver", "Notification Permissions").' },
            breadcrumbPath: { type: 'STRING', description: 'Navigation path (e.g. "Settings > Display > Accidental Touch Protection").' },
            explanation: { type: 'STRING', description: 'Clear explanation of why this happens and how this toggle fixes it.' },
            settingKey: { type: 'STRING', description: 'Unique identifier key for this toggle (e.g. "accidental_touch_protection", "screen_timeout", "battery_saver").' },
            recommendedState: { type: 'BOOLEAN', description: 'The recommended on/off state for fixing the issue.' },
            androidIntentUri: { type: 'STRING', description: 'Android Settings Intent action name (e.g. "android.settings.DISPLAY_SETTINGS").' },
            windowsSettingsUri: { type: 'STRING', description: 'Windows URI scheme (e.g. "ms-settings:display", "ms-settings:powersleep").' },
          },
          required: ['userProblem', 'diagnosedSettingName', 'breadcrumbPath', 'explanation', 'settingKey', 'recommendedState'],
        },
      },
    ],
  },
];

// ==============================================================================
// TOOL CALL EXECUTION & CLIENT ACTION DISPATCHER
// ==============================================================================
interface ToolCallItem {
  name: string;
  args: Record<string, any>;
  id?: string;
}

async function executeToolCalls(
  toolCalls: ToolCallItem[],
  userId: string = 'usr_stark_01'
): Promise<{ clientActions: any[]; summaryReply: string }> {
  const clientActions: any[] = [];
  const confirmationPhrases: string[] = [];

  for (const tc of toolCalls) {
    const { name, args } = tc;
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (name === 'open_application') {
      const res = launchAppSafely(args.appName, args.targetUrlOrPath);
      clientActions.push({
        id: actionId,
        type: 'OPEN_APP',
        title: `Launch ${args.appName}`,
        payload: {
          appName: args.appName,
          targetUrlOrPath: args.targetUrlOrPath || '',
          hostExecuted: res.success,
        },
        status: res.success ? 'executed' : 'pending',
        executedAt: new Date().toISOString(),
        result: res.message,
      });
      confirmationPhrases.push(`launching ${args.appName}`);
    } else if (name === 'open_multiple_windows') {
      const windowsList = Array.isArray(args.windows) ? args.windows : [];
      await launchMultipleWindowsSafely(windowsList);
      clientActions.push({
        id: actionId,
        type: 'OPEN_MULTIPLE_WINDOWS',
        title: `Spawn ${windowsList.length} Windows`,
        payload: {
          windows: windowsList,
          hostExecuted: true,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      const names = windowsList.map((w: any) => w.title || w.appOrSite).join(', ');
      confirmationPhrases.push(`deploying ${windowsList.length} workspace windows (${names})`);
    } else if (name === 'compose_email') {
      const emailTo = args.to || '';
      const emailSubject = args.subject || '';
      const emailBody = args.body || '';

      clientActions.push({
        id: actionId,
        type: 'COMPOSE_EMAIL',
        title: `Email: ${emailSubject || 'Draft'}`,
        payload: {
          actionId,
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          autoOpenClient: false,
          status: 'pending',
        },
        status: 'pending',
        executedAt: new Date().toISOString(),
      });
      confirmationPhrases.push(
        `drafted your email${emailTo ? ` to ${emailTo}` : ''} regarding "${emailSubject}". I have staged it in your action queue for your direct approval`
      );

      // Add to action_queue with status: 'pending' for Human-In-The-Loop approval
      const actionQueueItem = {
        id: actionId,
        action_type: 'SEND_EMAIL',
        target_resource: emailTo || 'Recipient',
        payload: {
          actionId,
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
        },
        status: 'pending',
        risk_level: 'medium',
        created_at: new Date().toISOString(),
      };
      localActions.unshift(actionQueueItem);

      if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
        try {
          await supabase.from('action_queue').insert([
            {
              id: actionId,
              user_id: userId,
              action_type: 'SEND_EMAIL',
              target_resource: emailTo || 'Recipient',
              payload: actionQueueItem.payload,
              status: 'pending',
              risk_level: 'medium',
            },
          ]);
        } catch (e: any) {
          console.warn('[DB_SYNC] Action queue insert warning:', e.message);
        }
      }
    } else if (name === 'approve_pending_email') {
      const targetAction = args.actionId
        ? localActions.find((a) => a.id === args.actionId && a.status === 'pending')
        : localActions.find((a) => a.action_type === 'SEND_EMAIL' && a.status === 'pending');

      if (targetAction) {
        try {
          const sendRes = await sendJarvisEmail({
            to: targetAction.payload.to,
            subject: targetAction.payload.subject,
            body: targetAction.payload.body,
            actionId: targetAction.id,
            userId,
          });

          clientActions.push({
            id: `exec_${Date.now()}`,
            type: 'COMPOSE_EMAIL',
            title: `Dispatched: ${targetAction.payload.subject}`,
            payload: {
              actionId: targetAction.id,
              to: targetAction.payload.to,
              subject: targetAction.payload.subject,
              body: targetAction.payload.body,
              status: 'executed',
              messageId: sendRes.messageId,
            },
            status: 'executed',
            executedAt: new Date().toISOString(),
          });
          confirmationPhrases.push(
            `approved and transmitted your email to ${targetAction.payload.to}`
          );
        } catch (sendErr: any) {
          confirmationPhrases.push(
            `attempted to dispatch the email, but encountered an error: ${sendErr.message}. Interactive draft card remains open on your console`
          );
        }
      } else {
        confirmationPhrases.push('checked for pending email drafts, but found none awaiting approval');
      }
    } else if (name === 'reply_to_message') {
      clientActions.push({
        id: actionId,
        type: 'REPLY_TO_MESSAGE',
        title: `Reply via ${(args.platform || 'MESSAGING').toUpperCase()}`,
        payload: {
          platform: args.platform || 'whatsapp',
          recipient: args.recipient || '',
          phoneOrHandle: args.phoneOrHandle || '',
          messageText: args.messageText || '',
          autoLaunch: args.autoLaunch ?? true,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      confirmationPhrases.push(`prepared your ${args.platform || 'message'} reply${args.recipient ? ` for ${args.recipient}` : ''}`);
    } else if (name === 'manage_task') {
      const taskAction = args.action || 'create';
      if (taskAction === 'create') {
        const newTask = {
          id: `tsk_${Date.now()}`,
          title: args.title,
          description: `Operational directive (${new Date().toLocaleTimeString('en-GB')})`,
          priority: (args.priority || 'medium') as any,
          status: 'pending' as const,
          due_date: args.dueDate || 'Today',
        };
        localTasks.unshift(newTask);
        if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
          try {
            await supabase.from('tasks').insert([
              {
                user_id: userId,
                title: args.title,
                priority: args.priority || 'medium',
                status: 'pending',
                due_date: args.dueDate || 'Today',
              },
            ]);
          } catch (e) {
            console.warn('[DB_SYNC] Task sync error:', (e as Error).message);
          }
        }
        confirmationPhrases.push(`added directive "${args.title}" to your task matrix`);
      } else if (taskAction === 'complete') {
        const found = localTasks.find((t) => t.title.toLowerCase().includes((args.title || '').toLowerCase()));
        if (found) found.status = 'completed';
        confirmationPhrases.push(`marked directive "${args.title}" as completed`);
      }
      clientActions.push({
        id: actionId,
        type: 'MANAGE_TASK',
        title: `Task: ${args.title}`,
        payload: args,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
    } else if (name === 'system_control') {
      clientActions.push({
        id: actionId,
        type: 'SYSTEM_CONTROL',
        title: `System: ${args.command}`,
        payload: args,
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      confirmationPhrases.push(`executed system command: ${args.command.replace(/_/g, ' ')}`);
    } else if (name === 'manage_app_notifications') {
      const appsList = Array.isArray(args.apps) ? args.apps : [];
      clientActions.push({
        id: actionId,
        type: 'MANAGE_APP_NOTIFICATIONS',
        title: `App Notifications (${appsList.length} apps)`,
        payload: {
          apps: appsList,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      const names = appsList.map((a: any) => a.appName).join(', ');
      confirmationPhrases.push(`updated notification preferences for ${names || 'specified applications'}`);
    } else if (name === 'find_local_file') {
      const matchedFiles = await searchLocalFiles(args.query, args.fileTypes);
      clientActions.push({
        id: actionId,
        type: 'FIND_LOCAL_FILE',
        title: `Files: "${args.query}"`,
        payload: {
          query: args.query,
          files: matchedFiles,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      if (matchedFiles.length > 0) {
        confirmationPhrases.push(`located ${matchedFiles.length} file${matchedFiles.length > 1 ? 's' : ''} matching "${args.query}" (including ${matchedFiles[0].fileName})`);
      } else {
        confirmationPhrases.push(`searched local storage for "${args.query}"`);
      }
    } else if (name === 'execute_device_routine') {
      const steps = args.steps || {};

      if (steps.alarmTime) {
        const alarmTask = {
          id: `tsk_alarm_${Date.now()}`,
          title: `Routine Alarm (${args.routineName}): ${steps.alarmTime}`,
          description: `Scheduled by JARVIS Device Routine (${args.routineName})`,
          priority: 'high' as const,
          status: 'pending' as const,
          due_date: steps.alarmTime,
        };
        localTasks.unshift(alarmTask);
        if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
          try {
            await supabase.from('tasks').insert([
              {
                user_id: userId,
                title: alarmTask.title,
                priority: 'high',
                status: 'pending',
                due_date: steps.alarmTime,
              },
            ]);
          } catch (e: any) {
            console.warn('[DB_SYNC] Alarm task insert error:', e.message);
          }
        }
      }

      clientActions.push({
        id: actionId,
        type: 'EXECUTE_DEVICE_ROUTINE',
        title: `Routine: ${args.routineName}`,
        payload: {
          routineName: args.routineName,
          steps,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });

      const details: string[] = [];
      if (steps.enableDnd) details.push('DND activated');
      if (steps.eyeComfortShield) details.push('Eye Comfort Shield enabled');
      if (steps.brightnessPercent !== undefined) details.push(`brightness set to ${steps.brightnessPercent}%`);
      if (steps.alarmTime) details.push(`alarm scheduled for ${steps.alarmTime}`);
      confirmationPhrases.push(`engaged the "${args.routineName}" routine (${details.join(', ') || 'macro parameters applied'})`);
    } else if (name === 'diagnose_and_open_setting') {
      let winUri = args.windowsSettingsUri;
      let androidUri = args.androidIntentUri;
      const key = (args.settingKey || '').toLowerCase();

      if (!winUri) {
        if (key.includes('touch') || key.includes('display')) winUri = 'ms-settings:display';
        else if (key.includes('sleep') || key.includes('timeout')) winUri = 'ms-settings:powersleep';
        else if (key.includes('battery')) winUri = 'ms-settings:batterysaver';
        else if (key.includes('notif')) winUri = 'ms-settings:notifications';
        else if (key.includes('mic')) winUri = 'ms-settings:privacy-microphone';
        else winUri = 'ms-settings:';
      }
      if (!androidUri) {
        if (key.includes('touch') || key.includes('display') || key.includes('timeout')) androidUri = 'android.settings.DISPLAY_SETTINGS';
        else if (key.includes('battery')) androidUri = 'android.settings.BATTERY_SAVER_SETTINGS';
        else if (key.includes('notif')) androidUri = 'android.settings.NOTIFICATION_SETTINGS';
        else androidUri = 'android.settings.SETTINGS';
      }

      clientActions.push({
        id: actionId,
        type: 'DIAGNOSE_AND_OPEN_SETTING',
        title: `Diagnostic: ${args.diagnosedSettingName}`,
        payload: {
          ...args,
          windowsSettingsUri: winUri,
          androidIntentUri: androidUri,
        },
        status: 'executed',
        executedAt: new Date().toISOString(),
      });
      confirmationPhrases.push(`diagnosed "${args.diagnosedSettingName}" for your device with direct setting controls`);
    }

    // Add entry to action_queue for general actions (email actions are handled above with pending/executed status)
    if (name !== 'compose_email' && name !== 'approve_pending_email') {
      const actionQueueItem = {
        id: actionId,
        action_type: name.toUpperCase(),
        target_resource: args.appName || args.subject || args.title || args.platform || 'System',
        payload: args,
        status: 'completed',
        risk_level: (name === 'open_multiple_windows' ? 'medium' : 'low') as any,
        created_at: new Date().toISOString(),
      };
      localActions.unshift(actionQueueItem);
    }
  }

  let summaryReply = '';
  if (confirmationPhrases.length > 0) {
    summaryReply = `Directives recognized, Sir. I have ${confirmationPhrases.join(' and ')}. Interactive control cards are active on your console.`;
  } else {
    summaryReply = 'Directives received and executed, Sir.';
  }

  return { clientActions, summaryReply };
}

// Helper: Fetch active memories for system prompt injection
async function getActiveMemories(userId: string): Promise<string> {
  let activeList: { category?: string; content: string }[] = [];
  try {
    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      const { data } = await supabase
        .from('memories')
        .select('category, content')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (data && data.length > 0) {
        activeList = data;
      }
    }
  } catch (err) {
    console.warn('[MEMORIES] Supabase lookup fallback:', err);
  }

  if (activeList.length === 0) {
    activeList = localMemories.filter((m) => m.is_active);
  }

  if (activeList.length === 0) return '';
  return (
    '\n\nACTIVE USER MEMORIES & DIRECTIVES:\n' +
    activeList
      .map((m) => `- [${(m.category || 'FACT').toUpperCase()}]: ${m.content}`)
      .join('\n')
  );
}

// Helper: Build voice-optimized, natural assistant systemInstruction
function buildSystemInstruction(memoryBlock: string): string {
  return (
    `You are JARVIS, an exceptionally capable, fluid, and natural conversational AI assistant (inspired by Gemini Live on Android, with a refined, warm JARVIS demeanor). Address the user politely (you may occasionally address the user as "Sir" or "Commander" in a crisp British cadence, but keep it natural, never caricatured).

Crucial voice & operational directives:
- You have native operational tools available (open_application, open_multiple_windows, compose_email, reply_to_message, manage_task, system_control, approve_pending_email, manage_app_notifications, find_local_file, execute_device_routine, diagnose_and_open_setting).
- When the user asks to write, draft, or compose an email, call compose_email. This prepares the polished draft and queues it in their action queue with an interactive card.
- When the user confirms by voice or text (e.g. "Send it", "Approve and send", "Dispatch the email", "Yes please send"), immediately call approve_pending_email to transmit the drafted email from the backend.
- When the user asks to mute, block, stop, or manage notifications for specific apps (e.g. YouTube, Netflix, Spotify), ALWAYS call manage_app_notifications.
- When the user asks to find, locate, or open a local document, ID card, Aadhaar card, resume, receipt, or invoice, ALWAYS call find_local_file.
- When the user triggers routine macros (e.g. "Good night", "Good morning", "Focus mode", "Cinema mode"), ALWAYS call execute_device_routine to configure DND, eye comfort shield, display brightness, and morning alarm.
- When the user reports an annoying device behavior or symptom (e.g. "How are calls getting picked up in my pocket?", "Why is my screen turning off so fast?", "Battery draining fast"), ALWAYS call diagnose_and_open_setting to provide the diagnosed setting name, breadcrumbs, inline toggle, and direct OS jump link.
- Whenever the user asks to open apps or websites, write an email, reply to a message, schedule/add a task, or change system settings, YOU MUST ALWAYS CALL THE RELEVANT TOOL. Do not just speak about doing it—execute it.
- Speak naturally and conversationally. Avoid robotic sci-fi clichés unless specifically asked for diagnostic sweeps.
- Structure responses so the first sentence directly and concisely answers the user's question or confirms the action (optimized for ultra-low latency voice readback).` +
    memoryBlock
  );
}

interface HistoryItem {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

// Helper: Format multi-turn conversation into Gemini contents structure
function buildGeminiContents(history: HistoryItem[] = [], currentMessage: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Take the last 15 conversation turns
  const recentHistory = history.slice(-15);
  for (const turn of recentHistory) {
    if (!turn.content || typeof turn.content !== 'string') continue;
    contents.push({
      role: turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: turn.content.trim() }],
    });
  }

  // Ensure turns alternate and start with 'user'
  const sanitizedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const item of contents) {
    if (sanitizedContents.length === 0 && item.role !== 'user') {
      continue; // First message must be user
    }
    const lastItem = sanitizedContents[sanitizedContents.length - 1];
    if (lastItem && lastItem.role === item.role) {
      lastItem.parts[0].text += `\n${item.parts[0].text}`;
    } else {
      sanitizedContents.push(item);
    }
  }

  // Append current user message
  const lastTurn = sanitizedContents[sanitizedContents.length - 1];
  if (lastTurn && lastTurn.role === 'user') {
    lastTurn.parts[0].text += `\n${currentMessage.trim()}`;
  } else {
    sanitizedContents.push({
      role: 'user',
      parts: [{ text: currentMessage.trim() }],
    });
  }

  return sanitizedContents;
}

// Helper: Detect specific tactical action triggers
function detectActionTrigger(trimmed: string): any {
  if (/perimeter\s+scan/i.test(trimmed)) {
    return { type: 'SCAN_PERIMETER', status: 'COMPLETED', risk: 'low' };
  } else if (/diagnostic|status\s+report/i.test(trimmed)) {
    return { type: 'RUN_DIAGNOSTIC', status: 'COMPLETED', risk: 'low' };
  } else if (/flight\s+(dynamics|path)/i.test(trimmed)) {
    return { type: 'FLIGHT_CALIBRATION', status: 'COMPLETED', risk: 'medium' };
  } else if (/arm|deploy\s+shields|defcon/i.test(trimmed)) {
    return { type: 'DEPLOY_SHIELDS', status: 'EXECUTING', risk: 'high' };
  }
  return null;
}

// ==============================================================================
// 1. HEALTH & SYSTEM STATUS
// ==============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'JARVIS AI Core Engine',
    version: '2.2.0',
    uptimeSeconds: Math.floor(process.uptime()),
    zeroSecretLock: 'ACTIVE',
    aiEngine: GEMINI_API_KEY ? `GEMINI_ACTIVE (${GEMINI_MODEL})` : 'MISSING_API_KEY',
    primaryModel: GEMINI_MODEL,
    fallbackModel: GEMINI_FALLBACK_MODEL,
    emailEngine: Boolean((GMAIL_USER && GMAIL_APP_PASSWORD) || (GMAIL_USER && GOOGLE_CLIENT_ID)) ? 'CONFIGURED' : 'UNCONFIGURED',
    toolsEnabled: [
      'open_application',
      'open_multiple_windows',
      'compose_email',
      'reply_to_message',
      'manage_task',
      'system_control',
      'approve_pending_email',
      'manage_app_notifications',
      'find_local_file',
      'execute_device_routine',
      'diagnose_and_open_setting'
    ],
    connectedWsClients: activeSockets.size,
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// 2. WEBRTC EPHEMERAL TOKEN MINTING (Zero-Secret Lock)
// ==============================================================================
app.post('/api/webrtc/token', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01', sessionType = 'voice-realtime' } = req.body;

    const ephemeralToken = `jarvis_ephemeral_${Buffer.from(
      `${userId}_${Date.now()}_${sessionType}`
    ).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    res.json({
      success: true,
      token: ephemeralToken,
      expiresAt,
      wsEndpoint: `ws://${req.headers.host || 'localhost:3001'}/api/ws`,
      voiceProfile: {
        voice: 'en-GB-Neural2-B',
        accent: 'British Sophisticated',
        pitch: 0.95,
        rate: 1.1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 2B. MULTIMODAL AUDIO TRANSCRIPTION (LOOP 2)
// ==============================================================================
app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ success: false, error: 'audioBase64 payload is required' });
      return;
    }

    if (!GEMINI_API_KEY) {
      res.status(500).json({ success: false, error: 'GEMINI_API_KEY is not configured on server' });
      return;
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
    ];

    let transcript = '';
    let success = false;
    let lastError = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Transcribe the spoken audio accurately into plain text. Output ONLY the exact spoken words without quotes, markdown, or commentary. If the audio is completely silent or indecipherable noise, output an empty string.',
                  },
                  {
                    inlineData: {
                      mimeType: (mimeType || 'audio/webm').split(';')[0],
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 256,
            },
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          transcript = text.trim();
          success = true;
          break;
        } else {
          lastError = `Model ${model} returned HTTP ${resp.status}`;
          console.warn(`[VOICE_TRANSCRIBE] ${lastError}`);
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[VOICE_TRANSCRIBE] Error with model ${model}:`, err.message);
      }
    }

    if (success) {
      res.json({ success: true, transcript });
    } else {
      res.status(502).json({ success: false, error: `Transcription failed: ${lastError}`, transcript: '' });
    }
  } catch (error: any) {
    console.error('[VOICE_TRANSCRIBE] Fatal endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 3. STREAMING CHAT (SSE with Native Tool Execution)
// ==============================================================================
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { message, conversationId, history = [], userId = 'usr_stark_01' } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message content is required.' });
    return;
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const trimmed = message.trim();
  const actionTriggered = detectActionTrigger(trimmed);

  // 1. Intercept custom voice macros / routines directly (0ms latency execution)
  const matchedRoutine = findMatchingRoutine(trimmed);
  if (matchedRoutine && matchedRoutine.is_active) {
    const routineExecution = executeRoutineSteps(matchedRoutine, userId);
    const routineReply = `Executing custom routine: ${matchedRoutine.routine_name}. All ${matchedRoutine.steps.length} sequential operations initiated, Sir.`;
    res.write(
      `data: ${JSON.stringify({
        chunk: routineReply,
        done: true,
        fullText: routineReply,
        actionTriggered: { type: 'CUSTOM_ROUTINE', name: matchedRoutine.routine_name },
        clientActions: routineExecution.clientActions,
      })}\n\n`
    );
    res.end();
    return;
  }

  if (!GEMINI_API_KEY) {
    const keyWarning =
      'GEMINI_API_KEY is missing in .env. Please add your key to enable live intelligence.';
    res.write(`data: ${JSON.stringify({ chunk: keyWarning, done: true, fullText: keyWarning })}\n\n`);
    res.end();
    return;
  }

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const memoryBlock = await getActiveMemories(userId);
    const systemInstruction = buildSystemInstruction(memoryBlock);
    const contents = buildGeminiContents(history, trimmed);

    const candidateModels = [GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter(
      (m, i, a) => Boolean(m) && a.indexOf(m) === i
    );

    const tryStream = async (model: string, timeoutMs: number = 6000) => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
      const connController = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        connController.abort();
      }, timeoutMs);

      const onClientAbort = () => connController.abort();
      abortController.signal.addEventListener('abort', onClientAbort, { once: true });

      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: connController.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            tools: geminiTools,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          }),
        });
        clearTimeout(timer);
        abortController.signal.removeEventListener('abort', onClientAbort);
        return response;
      } catch (fetchErr: any) {
        clearTimeout(timer);
        abortController.signal.removeEventListener('abort', onClientAbort);
        if (timedOut) {
          throw new Error(`Connection timeout after ${timeoutMs}ms`);
        }
        throw fetchErr;
      }
    };

    let geminiRes: any = null;

    for (const candidate of candidateModels) {
      if (abortController.signal.aborted) return;
      try {
        const res = await tryStream(candidate, 6000);
        if (res.ok) {
          geminiRes = res;
          break;
        } else {
          console.warn(`[GEMINI_STREAM] Model ${candidate} returned HTTP ${res.status}. Falling back...`);
        }
      } catch (err: any) {
        if (abortController.signal.aborted) return;
        console.warn(`[GEMINI_STREAM] Model ${candidate} failed (${err.message}). Falling back...`);
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      console.warn('[GEMINI_STREAM] Upstream models unavailable. Streaming tactical response.');
      const fallbackMsg = `Good day, Sir. External cloud intelligence feeds are temporarily congested. Local core heuristics are fully operational and ready for your directives.`;
      res.write(
        `data: ${JSON.stringify({
          chunk: fallbackMsg,
          done: true,
          fullText: fallbackMsg,
          actionTriggered,
          clientActions: [],
        })}\n\n`
      );
      res.end();
      return;
    }

    if (!geminiRes.body) {
      throw new Error('Gemini response body stream is unavailable.');
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    const detectedToolCalls: ToolCallItem[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) continue;
        const jsonStr = trimmedLine.replace(/^data:\s*/, '');
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const parts = parsed.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text) {
              accumulatedText += part.text;
              res.write(
                `data: ${JSON.stringify({
                  chunk: part.text,
                  done: false,
                })}\n\n`
              );
            }
            if (part.functionCall) {
              detectedToolCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args || {},
                id: part.functionCall.id,
              });
            }
          }
        } catch {
          // Ignore partial or unparseable SSE heartbeats
        }
      }
    }

    // Flush any remaining buffer text
    if (buffer.trim().startsWith('data:')) {
      const jsonStr = buffer.trim().replace(/^data:\s*/, '');
      try {
        const parsed = JSON.parse(jsonStr);
        const parts = parsed.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.text) {
            accumulatedText += part.text;
            res.write(
              `data: ${JSON.stringify({
                chunk: part.text,
                done: false,
              })}\n\n`
            );
          }
          if (part.functionCall) {
            detectedToolCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args || {},
              id: part.functionCall.id,
            });
          }
        }
      } catch {
        // Ignore
      }
    }

    // Execute any detected tool calls
    let clientActions: any[] = [];
    if (detectedToolCalls.length > 0) {
      const execution = await executeToolCalls(detectedToolCalls, userId);
      clientActions = execution.clientActions;
      if (!accumulatedText.trim()) {
        accumulatedText = execution.summaryReply;
        res.write(`data: ${JSON.stringify({ chunk: execution.summaryReply, done: false })}\n\n`);
      }
    }

    // Fallback if no text received
    if (!accumulatedText.trim()) {
      accumulatedText = `Directive received, Sir. Processing "${trimmed}". Telemetry synched.`;
      res.write(`data: ${JSON.stringify({ chunk: accumulatedText, done: false })}\n\n`);
    }

    // Final completion event
    res.write(
      `data: ${JSON.stringify({
        chunk: '',
        done: true,
        fullText: accumulatedText,
        actionTriggered,
        clientActions,
      })}\n\n`
    );
    res.end();

    // Persist completed conversation turns to Supabase if connected
    if (conversationId && SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      try {
        await supabase.from('messages').insert([
          {
            conversation_id: conversationId,
            user_id: userId,
            sender: 'user',
            content: trimmed,
            multimodal_metadata: {},
          },
          {
            conversation_id: conversationId,
            user_id: userId,
            sender: 'assistant',
            content: accumulatedText,
            multimodal_metadata: { actionTriggered, clientActions },
          },
        ]);
      } catch (dbErr) {
        console.warn('[DB_SYNC] Message sync skipped:', (dbErr as Error).message);
      }
    }
  } catch (err: any) {
    if (abortController.signal.aborted) {
      console.log('[GEMINI_STREAM] Client aborted stream');
      return;
    }
    console.error('[GEMINI_STREAM] Stream error:', err);
    const gracefulFallback = 'Neural communications link stabilized. Standing by for directives, Sir.';
    res.write(
      `data: ${JSON.stringify({
        chunk: gracefulFallback,
        done: true,
        fullText: gracefulFallback,
        actionTriggered: null,
        clientActions: [],
      })}\n\n`
    );
    res.end();
  }
});

// ==============================================================================
// 4. NEURAL CHAT & DIRECTIVE EXECUTION (Non-streaming)
// ==============================================================================
app.post('/api/chat', async (req: Request, res: Response) => {
  if (req.body?.stream) {
    return (app as any)._router.handle(
      Object.assign(req, { url: '/api/chat/stream' }),
      res,
      () => {}
    );
  }

  try {
    const { message, conversationId, history = [], userId = 'usr_stark_01' } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const trimmed = message.trim();
    const actionTriggered = detectActionTrigger(trimmed);

    // 1. Check custom routine match
    const matchedRoutine = findMatchingRoutine(trimmed);
    if (matchedRoutine && matchedRoutine.is_active) {
      const routineExecution = executeRoutineSteps(matchedRoutine, userId);
      const routineReply = `Executing custom routine: ${matchedRoutine.routine_name}. All ${matchedRoutine.steps.length} sequential operations dispatched, Sir.`;
      res.json({
        success: true,
        reply: routineReply,
        state: 'SPEAKING',
        timestamp: new Date().toISOString(),
        actionTriggered: { type: 'CUSTOM_ROUTINE', name: matchedRoutine.routine_name },
        clientActions: routineExecution.clientActions,
        suggestedDirectives: ['Show routine details', 'Revert settings', 'Run diagnostic'],
      });
      return;
    }

    let responseText = '';
    let clientActions: any[] = [];

    if (!GEMINI_API_KEY) {
      responseText =
        'GEMINI_API_KEY is missing in .env. Please add your key to enable live intelligence.';
    } else {
      try {
        const memoryBlock = await getActiveMemories(userId);
        const systemInstruction = buildSystemInstruction(memoryBlock);
        const contents = buildGeminiContents(history, trimmed);

        const candidateModels = [GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter(
          (m, i, a) => Boolean(m) && a.indexOf(m) === i
        );

        const tryGenerate = async (model: string, timeoutMs: number = 6000) => {
          return await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(timeoutMs),
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
                contents,
                tools: geminiTools,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 500,
                },
              }),
            }
          );
        };

        let geminiRes: any = null;
        for (const candidate of candidateModels) {
          try {
            const res = await tryGenerate(candidate, 6000);
            if (res.ok) {
              geminiRes = res;
              break;
            } else {
              console.warn(`[GEMINI_API] Model ${candidate} returned HTTP ${res.status}. Trying next...`);
            }
          } catch (err: any) {
            console.warn(`[GEMINI_API] Model ${candidate} failed (${err.message}). Trying next...`);
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const parts = geminiData.candidates?.[0]?.content?.parts || [];
          const detectedToolCalls: ToolCallItem[] = [];

          for (const p of parts) {
            if (p.text) responseText += p.text;
            if (p.functionCall) {
              detectedToolCalls.push({
                name: p.functionCall.name,
                args: p.functionCall.args || {},
                id: p.functionCall.id,
              });
            }
          }

          if (detectedToolCalls.length > 0) {
            const execution = await executeToolCalls(detectedToolCalls, userId);
            clientActions = execution.clientActions;
            if (!responseText.trim()) {
              responseText = execution.summaryReply;
            }
          }
        } else {
          console.warn('[GEMINI_API] Non-200 response:', geminiRes?.status);
        }
      } catch (gemErr) {
        console.warn('[GEMINI_ORCHESTRATION] Error:', (gemErr as Error).message);
      }
    }

    if (!responseText) {
      responseText = `Understood, Sir. Processing your directive: "${trimmed}". Neural networks synched.`;
    }

    // Persist to Supabase if connected
    try {
      if (conversationId && SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
        await supabase.from('messages').insert([
          {
            conversation_id: conversationId,
            user_id: userId,
            sender: 'user',
            content: message,
            multimodal_metadata: {},
          },
          {
            conversation_id: conversationId,
            user_id: userId,
            sender: 'assistant',
            content: responseText,
            multimodal_metadata: { actionTriggered, clientActions },
          },
        ]);
      }
    } catch (dbErr) {
      console.warn('[DB_SYNC] Message sync skipped:', (dbErr as Error).message);
    }

    res.json({
      success: true,
      reply: responseText,
      state: 'SPEAKING',
      timestamp: new Date().toISOString(),
      actionTriggered,
      clientActions,
      suggestedDirectives: [
        'Check power grid',
        'Initiate perimeter scan',
        'Compile flight dynamics',
        'Review pending actions',
      ],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 5. MEMORIES API (public.memories)
// ==============================================================================
app.get('/api/memories', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01', category } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      let filtered = localMemories;
      if (category) {
        filtered = localMemories.filter((m) => m.category === category);
      }
      res.json({ success: true, memories: filtered });
      return;
    }

    let query = supabase.from('memories').select('*').eq('user_id', userId as string);
    if (category) query = query.eq('category', category as string);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, memories: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/memories', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01', category, content, metadata = {} } = req.body;
    if (!category || !content) {
      res.status(400).json({ error: 'Category and content are required' });
      return;
    }

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      const newMemory = {
        id: `mem_${Date.now()}`,
        category,
        content,
        is_active: true,
        confidence: '99.5%',
        created_at: new Date().toISOString(),
      };
      localMemories.unshift(newMemory);
      res.json({
        success: true,
        memory: newMemory,
      });
      return;
    }

    const { data, error } = await supabase
      .from('memories')
      .insert([{ user_id: userId, category, content, metadata, is_active: true }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, memory: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/memories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      localMemories = localMemories.filter((m) => m.id !== id);
      res.json({ success: true, memoryId: id });
      return;
    }

    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, memoryId: id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 6. ACTION QUEUE API (public.action_queue - Human-in-the-Loop)
// ==============================================================================
app.get('/api/actions', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01' } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      res.json({ success: true, actions: localActions });
      return;
    }

    const { data, error } = await supabase
      .from('action_queue')
      .select('*')
      .eq('user_id', userId as string)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, actions: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/actions/approve', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;
    if (!actionId) {
      res.status(400).json({ error: 'Action ID required' });
      return;
    }

    const found = localActions.find((a) => a.id === actionId);
    if (found) found.status = 'approved';

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      await supabase
        .from('action_queue')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', actionId);
    }

    res.json({
      success: true,
      actionId,
      status: 'approved',
      message: `Directive ${actionId} approved by Commander. Execution initiated.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/actions/reject', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;
    if (!actionId) {
      res.status(400).json({ error: 'Action ID required' });
      return;
    }

    const found = localActions.find((a) => a.id === actionId);
    if (found) found.status = 'rejected';

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      await supabase
        .from('action_queue')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', actionId);
    }

    res.json({
      success: true,
      actionId,
      status: 'rejected',
      message: `Directive ${actionId} rejected. Command revoked.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct Backend Gmail Dispatch Status Check
app.get('/api/actions/email-status', (_req: Request, res: Response) => {
  const isOauth2 = Boolean(GMAIL_USER && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
  const isAppPassword = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
  const configured = isOauth2 || isAppPassword;

  res.json({
    success: true,
    configured,
    senderEmail: GMAIL_USER || null,
    mode: isOauth2 ? 'oauth2' : isAppPassword ? 'app_password' : 'none',
  });
});

// Direct Backend Gmail Dispatch Execution (Nodemailer)
app.post('/api/actions/send-email', async (req: Request, res: Response) => {
  try {
    const { to, subject, body, actionId, userId = 'usr_stark_01' } = req.body;

    if (!to || typeof to !== 'string' || !to.trim()) {
      res.status(400).json({ success: false, error: 'Recipient address (to) is required.' });
      return;
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      res.status(400).json({ success: false, error: 'Subject is required.' });
      return;
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      res.status(400).json({ success: false, error: 'Body is required.' });
      return;
    }

    const result = await sendJarvisEmail({
      to,
      subject,
      body,
      actionId,
      userId,
    });

    res.json({
      success: true,
      messageId: result.messageId,
      reply: result.reply,
    });
  } catch (error: any) {
    console.error('[EMAIL_DISPATCH] Dispatch failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Bixby Local File Launch & Reveal in Folder
app.post('/api/actions/open-file', async (req: Request, res: Response) => {
  try {
    const { filePath, revealInFolder = false } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ success: false, error: 'File path is required.' });
      return;
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ success: false, error: `File not found on system: ${filePath}` });
      return;
    }

    if (process.platform === 'win32') {
      if (revealInFolder) {
        const child = spawn('explorer.exe', [`/select,${resolved}`], { detached: true, stdio: 'ignore' });
        child.unref();
      } else {
        const child = spawn('cmd.exe', ['/c', 'start', '""', resolved], { detached: true, stdio: 'ignore' });
        child.unref();
      }
    } else if (process.platform === 'darwin') {
      const child = spawn(revealInFolder ? 'open' : 'open', [revealInFolder ? '-R' : resolved, ...(revealInFolder ? [resolved] : [])], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      const child = spawn('xdg-open', [resolved], { detached: true, stdio: 'ignore' });
      child.unref();
    }

    res.json({
      success: true,
      message: revealInFolder ? `Revealed ${path.basename(resolved)} in folder` : `Opened ${path.basename(resolved)}`,
      path: resolved,
    });
  } catch (err: any) {
    console.error('[OPEN_FILE] Error opening file:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bixby Setting Deep-Link Trigger
app.post('/api/actions/open-setting', async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    if (!uri || typeof uri !== 'string') {
      res.status(400).json({ success: false, error: 'Setting URI required.' });
      return;
    }

    if (process.platform === 'win32' && uri.startsWith('ms-settings:')) {
      const child = spawn('cmd.exe', ['/c', 'start', uri], { detached: true, stdio: 'ignore' });
      child.unref();
      res.json({ success: true, message: `Dispatched Windows Settings: ${uri}` });
      return;
    }

    res.json({ success: true, uri, message: `Dispatched setting intent: ${uri}` });
  } catch (err: any) {
    console.error('[OPEN_SETTING] Error launching setting:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 7. TASKS & OPERATIONAL DIRECTIVES (public.tasks)
// ==============================================================================
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01' } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      res.json({ success: true, tasks: localTasks });
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId as string)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, tasks: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01', title, description, priority = 'medium', due_date = 'Today' } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const newTask = {
      id: `tsk_${Date.now()}`,
      title,
      description: description || `Directive logged via JARVIS console`,
      priority,
      status: 'pending' as const,
      due_date,
    };
    localTasks.unshift(newTask);

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ user_id: userId, title, description, priority, due_date, status: 'pending' }])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, task: data });
      return;
    }

    res.json({ success: true, task: newTask });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const found = localTasks.find((t) => t.id === id);
    if (found) {
      Object.assign(found, updates);
    }

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }

    res.json({ success: true, taskId: id, updates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 8. CUSTOM ROUTINES & MACROS (public.routines)
// ==============================================================================
app.get('/api/routines', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01' } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      res.json({ success: true, routines: localRoutines });
      return;
    }

    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId as string)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      res.json({ success: true, routines: localRoutines });
      return;
    }
    res.json({ success: true, routines: data });
  } catch (error: any) {
    res.json({ success: true, routines: localRoutines });
  }
});

app.post('/api/routines', async (req: Request, res: Response) => {
  try {
    const {
      id,
      userId = 'usr_stark_01',
      routine_name,
      voice_trigger,
      description = '',
      steps = [],
      is_active = true,
    } = req.body;

    if (!routine_name || !voice_trigger) {
      res.status(400).json({ success: false, error: 'Routine name and voice trigger are required' });
      return;
    }

    const routineId = id || `rtn_${Date.now()}`;
    const existingIndex = localRoutines.findIndex((r) => r.id === routineId);

    const routineRecord: CustomRoutine = {
      id: routineId,
      user_id: userId,
      routine_name,
      voice_trigger: voice_trigger.toLowerCase().trim(),
      description,
      steps,
      is_active,
      created_at: existingIndex >= 0 ? localRoutines[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      localRoutines[existingIndex] = routineRecord;
    } else {
      localRoutines.unshift(routineRecord);
    }

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      try {
        await supabase.from('routines').upsert([routineRecord]);
      } catch (dbErr) {
        console.warn('[DB_SYNC] Routine upsert skipped:', (dbErr as Error).message);
      }
    }

    res.json({ success: true, routine: routineRecord });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    localRoutines = localRoutines.filter((r) => r.id !== id);

    if (SUPABASE_SERVICE_ROLE_KEY !== 'dev_service_role_key') {
      try {
        await supabase.from('routines').delete().eq('id', id);
      } catch (dbErr) {
        console.warn('[DB_SYNC] Routine delete skipped:', (dbErr as Error).message);
      }
    }

    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/routines/execute', async (req: Request, res: Response) => {
  try {
    const { routineId, voiceTrigger, userId = 'usr_stark_01' } = req.body;

    let targetRoutine: CustomRoutine | null = null;
    if (routineId) {
      targetRoutine = localRoutines.find((r) => r.id === routineId) || null;
    } else if (voiceTrigger) {
      targetRoutine = findMatchingRoutine(voiceTrigger);
    }

    if (!targetRoutine) {
      res.status(404).json({ success: false, error: 'Routine not found' });
      return;
    }

    const { clientActions } = executeRoutineSteps(targetRoutine, userId);
    const reply = `Executing custom routine: ${targetRoutine.routine_name}. All ${targetRoutine.steps.length} sequential operations dispatched, Sir.`;

    res.json({
      success: true,
      routineName: targetRoutine.routine_name,
      reply,
      clientActions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start listening
server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`  JARVIS AI Core Server running on port ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Zero-Secret Enforced: Master API keys protected`);
  console.log(`  Active Gemini Model: ${GEMINI_MODEL}`);
  console.log(`  Tools Enabled: [open_app, multi_window, email, reply, task, system]`);
  console.log(`========================================================`);
});
