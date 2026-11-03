import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev_service_role_key';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Server-side privileged Supabase client (Zero-Secret: never leaked to client)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
// 1. HEALTH & SYSTEM STATUS
// ==============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'JARVIS AI Core Engine',
    version: '2.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    zeroSecretLock: 'ACTIVE',
    aiEngine: GEMINI_API_KEY ? 'GEMINI_ACTIVE' : 'LOCAL_HEURISTIC_SYNAPSE',
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

    // Ephemeral session token generation
    // In production, exchange master GEMINI_API_KEY or OpenAI Realtime key for short-lived session token
    const ephemeralToken = `jarvis_ephemeral_${Buffer.from(`${userId}_${Date.now()}_${sessionType}`).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute validity

    res.json({
      success: true,
      token: ephemeralToken,
      expiresAt,
      wsEndpoint: `ws://${req.headers.host || 'localhost:3001'}/api/ws`,
      voiceProfile: {
        voice: 'en-GB-Neural2-B',
        accent: 'British Sophisticated',
        pitch: 0.95,
        rate: 1.10,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 3. NEURAL CHAT & DIRECTIVE EXECUTION
// ==============================================================================
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, conversationId, userId = 'usr_stark_01' } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    // Determine intent or execute specialized command
    const trimmed = message.trim();
    let responseText = '';
    let actionTriggered: any = null;

    if (/perimeter\s+scan/i.test(trimmed)) {
      responseText = 'Perimeter scan initiated, Sir. LiDAR sweep confirms all 36 sectors secure with zero unauthorized intrusions.';
      actionTriggered = { type: 'SCAN_PERIMETER', status: 'COMPLETED', risk: 'low' };
    } else if (/diagnostic|status\s+report/i.test(trimmed)) {
      responseText = 'Diagnostic complete. Arc Reactor operating at 98.4% efficiency. Thermal dispersion holds at 18.2%. All neural synapses nominal.';
      actionTriggered = { type: 'RUN_DIAGNOSTIC', status: 'COMPLETED', risk: 'low' };
    } else if (/flight\s+(dynamics|path)/i.test(trimmed)) {
      responseText = 'Flight dynamics updated. At Mach 3.4 cruise velocity, sub-orbital range remains 2,450 km. Repulsor thermal limits are within safe margins.';
      actionTriggered = { type: 'FLIGHT_CALIBRATION', status: 'COMPLETED', risk: 'medium' };
    } else if (/daily\s+briefing/i.test(trimmed)) {
      responseText = 'Good day, Sir. Stark Industries orbital communication alignment is complete. You have a scheduled Board briefing at 16:00. Weather in Malibu is 21.5°C with clear skies.';
    } else if (/arm|deploy\s+shields|defcon/i.test(trimmed)) {
      responseText = 'Quantum shields energized to 100%. DEFCON 5 standby protocols engaged. Standing by for further commands.';
      actionTriggered = { type: 'DEPLOY_SHIELDS', status: 'EXECUTING', risk: 'high' };
    } else if (GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: 'You are JARVIS, Tony Stark\'s sophisticated AI personal assistant. Speak in a crisp, polite British cadence. Address the user as "Sir". Keep responses concise, direct, and technically rigorous. Never break character.'
                }]
              },
              contents: [{
                parts: [{ text: trimmed }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 350
              }
            })
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (gemErr) {
        console.warn('[GEMINI_ORCHESTRATION] Fallback to heuristic:', (gemErr as Error).message);
      }
      if (!responseText) {
        responseText = `Understood, Sir. Processing your directive: "${trimmed}". Neural networks synched and telemetry recorded.`;
      }
    } else {
      responseText = `Understood, Sir. Processing your directive: "${trimmed}". Neural networks synched and telemetry recorded.`;
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
            multimodal_metadata: { actionTriggered },
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
      suggestedDirectives: [
        'Check power grid',
        'Initiate perimeter scan',
        'Compile flight dynamics',
        'Review pending actions'
      ],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 4. MEMORIES API (public.memories)
// ==============================================================================
app.get('/api/memories', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01', category } = req.query;
    
    // In dev mode with placeholder credentials, return default initial memory bank
    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      const defaultMemories = [
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
      res.json({ success: true, memories: defaultMemories });
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
      res.json({
        success: true,
        memory: {
          id: `mem_${Date.now()}`,
          category,
          content,
          is_active: true,
          metadata,
          created_at: new Date().toISOString(),
        },
      });
      return;
    }

    const { data, error } = await supabase.from('memories').insert([
      { user_id: userId, category, content, metadata, is_active: true },
    ]).select().single();
    if (error) throw error;
    res.json({ success: true, memory: data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 5. ACTION QUEUE API (public.action_queue - Human-in-the-Loop)
// ==============================================================================
app.get('/api/actions', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01' } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      const defaultActions = [
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
      res.json({ success: true, actions: defaultActions });
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

// ==============================================================================
// 6. TASKS & OPERATIONAL DIRECTIVES (public.tasks)
// ==============================================================================
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_stark_01' } = req.query;

    if (SUPABASE_SERVICE_ROLE_KEY === 'dev_service_role_key') {
      const defaultTasks = [
        {
          id: 'tsk_01',
          title: 'Orbital satellite communication alignment',
          description: 'Synchronize quantum communications relay with Stark Industries constellation.',
          priority: 'high',
          status: 'completed',
          due_date: 'Today, 14:00',
        },
        {
          id: 'tsk_02',
          title: 'Compile flight dynamics report for Stark Industries Board',
          description: 'Assemble thermal dispersion and Mach 3.4 cruise data.',
          priority: 'critical',
          status: 'in_progress',
          due_date: 'Today, 16:00',
        },
        {
          id: 'tsk_03',
          title: 'Run quantum encryption salt refresh on server nodes',
          description: 'Re-key cryptographic entropy on all secondary intelligence nodes.',
          priority: 'medium',
          status: 'pending',
          due_date: 'Tomorrow, 09:00',
        },
      ];
      res.json({ success: true, tasks: defaultTasks });
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

app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

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

// Start listening
server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`  JARVIS AI Core Server running on port ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Zero-Secret Enforced: Master API keys protected`);
  console.log(`========================================================`);
});
