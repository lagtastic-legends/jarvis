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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

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

// In-memory memory bank for development mode
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

Crucial voice & conversational directives:
- Speak naturally and conversationally. Avoid robotic sci-fi clichés or canned status messages unless specifically asked for diagnostic sweeps.
- Structure responses so the first sentence directly and concisely answers the user's question or intent (optimized for ultra-low latency voice readback), followed by concise, helpful context or next steps.
- Keep responses compact, clear, and actionable without conversational filler.
- If executing an operational action (such as perimeter scan, diagnostic, shields, or power routing), confirm the action naturally in spoken prose.` +
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
    version: '2.1.0',
    uptimeSeconds: Math.floor(process.uptime()),
    zeroSecretLock: 'ACTIVE',
    aiEngine: GEMINI_API_KEY ? `GEMINI_ACTIVE (${GEMINI_MODEL})` : 'MISSING_API_KEY',
    primaryModel: GEMINI_MODEL,
    fallbackModel: GEMINI_FALLBACK_MODEL,
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
        rate: 1.10,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// 3. STREAMING CHAT (SSE - Server-Sent Events)
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

    const tryStream = async (model: string, timeoutMs: number = 3500) => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const combinedSignal = abortController.signal.aborted
        ? abortController.signal
        : (AbortSignal as any).any([abortController.signal, timeoutSignal]);

      return await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: combinedSignal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            thinkingConfig: {
              thinkingBudget: 1024,
            },
          },
        }),
      });
    };

    let geminiRes: any = null;
    try {
      geminiRes = await tryStream(GEMINI_MODEL, 3500);
      if (!geminiRes.ok && (geminiRes.status === 503 || geminiRes.status === 429 || geminiRes.status === 404)) {
        throw new Error(`Primary model returned HTTP ${geminiRes.status}`);
      }
    } catch (primaryErr: any) {
      if (abortController.signal.aborted) return;
      console.warn(`[GEMINI_STREAM] ${GEMINI_MODEL} unserviceable (${primaryErr.message}). Engaging fallback to ${GEMINI_FALLBACK_MODEL}...`);
      geminiRes = await tryStream(GEMINI_FALLBACK_MODEL, 15000);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[GEMINI_STREAM] Upstream error:', geminiRes.status, errText);
      const errorMsg = `Intelligence engine error (${geminiRes.status}). Please check network connection or API limits.`;
      res.write(`data: ${JSON.stringify({ chunk: errorMsg, done: true, fullText: errorMsg })}\n\n`);
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
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            accumulatedText += chunkText;
            res.write(
              `data: ${JSON.stringify({
                chunk: chunkText,
                done: false,
              })}\n\n`
            );
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
        const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunkText) {
          accumulatedText += chunkText;
          res.write(
            `data: ${JSON.stringify({
              chunk: chunkText,
              done: false,
            })}\n\n`
          );
        }
      } catch {
        // Ignore
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
            multimodal_metadata: { actionTriggered },
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
    res.write(
      `data: ${JSON.stringify({
        chunk: `\n[Stream anomaly: ${err.message || 'Connection lost'}]`,
        done: true,
      })}\n\n`
    );
    res.end();
  }
});

// ==============================================================================
// 4. NEURAL CHAT & DIRECTIVE EXECUTION (Non-streaming or stream forwarder)
// ==============================================================================
app.post('/api/chat', async (req: Request, res: Response) => {
  // If client requests streaming on /api/chat, delegate directly
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
    let responseText = '';

    if (!GEMINI_API_KEY) {
      responseText =
        'GEMINI_API_KEY is missing in .env. Please add your key to enable live intelligence.';
    } else {
      try {
        const memoryBlock = await getActiveMemories(userId);
        const systemInstruction = buildSystemInstruction(memoryBlock);
        const contents = buildGeminiContents(history, trimmed);

        const tryGenerate = async (model: string, timeoutMs: number = 3500) => {
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
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 500,
                  thinkingConfig: {
                    thinkingBudget: 1024,
                  },
                },
              }),
            }
          );
        };

        let geminiRes: any = null;
        try {
          geminiRes = await tryGenerate(GEMINI_MODEL, 3500);
          if (!geminiRes.ok && (geminiRes.status === 503 || geminiRes.status === 429 || geminiRes.status === 404)) {
            throw new Error(`Primary model returned HTTP ${geminiRes.status}`);
          }
        } catch (primaryErr: any) {
          console.warn(`[GEMINI_API] ${GEMINI_MODEL} unserviceable (${primaryErr.message}). Engaging fallback: ${GEMINI_FALLBACK_MODEL}`);
          geminiRes = await tryGenerate(GEMINI_FALLBACK_MODEL, 15000);
        }

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          responseText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('[GEMINI_API] Non-200 response:', geminiRes.status);
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
// 7. TASKS & OPERATIONAL DIRECTIVES (public.tasks)
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
  console.log(`  Active Gemini Model: ${GEMINI_MODEL}`);
  console.log(`========================================================`);
});
