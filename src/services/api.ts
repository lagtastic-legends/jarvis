import { MemoryItem, TaskDirective, ActionQueueItem, TelemetryData, CustomRoutine, VisualPayload } from '../types/jarvis';

// Dynamic API Base URL resolution:
// 1. User configured custom URL (localStorage: 'jarvis_custom_api_url')
// 2. Vite environment override (VITE_API_URL)
// 3. Native Capacitor Android detection (emulator 10.0.2.2 fallback)
// 4. Relative '' for browser proxy routing
export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('jarvis_custom_api_url');
    if (custom) return custom.replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If running inside Capacitor native Android container without custom URL
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    return 'http://10.0.2.2:3001';
  }
  // In browser runtime, return relative base '' so all /api requests are routed
  // through the Vite proxy in development or Express in production without cross-origin,
  // SSL mismatch (https vs http), or firewall blocks.
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:3001';
};

export const getDisplayBase = (): string => {
  const base = getApiBase();
  if (base) return base;
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3001';
};

export interface HistoryTurn {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export class JarvisApiClient {
  private ws: WebSocket | null = null;
  private telemetryCallbacks: Set<(data: TelemetryData) => void> = new Set();
  private isServerReachable: boolean = true;

  constructor() {
    this.connectWebSocket();
  }

  public reconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    let wsUrl: string;
    const base = getApiBase();
    if (base && base.startsWith('http')) {
      wsUrl = base.replace(/^http/, 'ws') + '/api/ws';
    } else {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001';
      wsUrl = `${wsProto}//${host}/api/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.isServerReachable = true;
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TELEMETRY_SYNC' || message.type === 'TELEMETRY_UPDATE') {
            this.telemetryCallbacks.forEach((cb) => cb(message.payload));
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isServerReachable = false;
        // Reconnect backoff
        setTimeout(() => this.connectWebSocket(), 4000);
      };
      this.ws.onerror = () => {
        this.isServerReachable = false;
      };
    } catch (err) {
      this.isServerReachable = false;
      console.warn('[WS] Offline mode active');
    }
  }

  public isOnline(): boolean {
    return this.isServerReachable;
  }

  public subscribeTelemetry(callback: (data: TelemetryData) => void): () => void {
    this.telemetryCallbacks.add(callback);
    return () => this.telemetryCallbacks.delete(callback);
  }

  // Health Check
  public async getHealth(): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch {
      return { status: 'OFFLINE', zeroSecretLock: 'ACTIVE' };
    }
  }

  // Ephemeral WebRTC token
  public async getWebRtcToken(userId: string = 'usr_stark_01'): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/webrtc/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch {
      return {
        success: true,
        token: `jarvis_local_token_${Date.now()}`,
        voiceProfile: {
          voice: 'en-GB-Neural2-B',
          accent: 'British Sophisticated',
          pitch: 0.95,
          rate: 1.1,
        },
      };
    }
  }

  // Server-Side Gemini Multimodal Audio Transcription (LOOP 2)
  public async transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
    try {
      const res = await fetch(`${getApiBase()}/api/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (data.success && typeof data.transcript === 'string') {
        return data.transcript.trim();
      }
      return '';
    } catch (err) {
      console.warn('[API] Audio transcription failed:', err);
      return '';
    }
  }

  /**
   * Real-Time SSE Streaming Chat
   * Connects to /api/chat/stream, streams token chunks, and reports final text
   */
  public async streamChatMessage(
    message: string,
    conversationId?: string,
    history: HistoryTurn[] = [],
    onChunk?: (chunk: string) => void,
    onComplete?: (fullText: string, metadata?: any, clientActions?: any[]) => void,
    signal?: AbortSignal,
    visualPayload?: VisualPayload
  ): Promise<string> {
    const fetchPayload = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId,
        history,
        imageBase64: visualPayload?.imageBase64,
        imageMimeType: visualPayload?.imageMimeType,
        visualSource: visualPayload?.visualSource,
      }),
      signal,
    };

    try {
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/api/chat/stream`, fetchPayload);
      } catch (fetchErr: any) {
        if (signal?.aborted) throw fetchErr;
        // Automatic 1.5s retry loop in case the auto-spawned backend was warming up
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch(`${getApiBase()}/api/chat/stream`, fetchPayload);
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Response body stream is not available');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';
      let actionTriggered: any = null;
      let clientActions: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.chunk && onChunk) {
              onChunk(data.chunk);
            }
            if (data.done) {
              fullText = data.fullText || fullText;
              actionTriggered = data.actionTriggered;
              clientActions = data.clientActions || [];
            }
          } catch {
            // Ignore partial SSE lines
          }
        }
      }

      if (onComplete) {
        onComplete(fullText, actionTriggered, clientActions);
      }
      return fullText;
    } catch (err: any) {
      if (signal?.aborted) {
        throw err;
      }
      console.warn('[API] Streaming failure:', err);
      const fallbackMsg = `Intelligence server unreachable at ${getDisplayBase()}. Please verify server is online.`;
      if (onChunk) onChunk(fallbackMsg);
      if (onComplete) onComplete(fallbackMsg);
      return fallbackMsg;
    }
  }

  /**
   * Non-Streaming Chat Directive
   */
  public async sendChatMessage(
    message: string,
    conversationId?: string,
    history: HistoryTurn[] = [],
    visualPayload?: VisualPayload
  ): Promise<{
    reply: string;
    state: string;
    actionTriggered?: any;
    clientActions?: any[];
    suggestedDirectives?: string[];
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const fetchPayload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          history,
          imageBase64: visualPayload?.imageBase64,
          imageMimeType: visualPayload?.imageMimeType,
          visualSource: visualPayload?.visualSource,
        }),
        signal: controller.signal,
      };

      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/api/chat`, fetchPayload);
      } catch (fetchErr) {
        // Automatic 1.5s retry loop
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch(`${getApiBase()}/api/chat`, fetchPayload);
      }

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Server returned HTTP ${res.status}`);
    } catch (err: any) {
      console.warn('[API] Server error or timeout:', err);
      return {
        reply: `Network connection to JARVIS core server (${getDisplayBase()}) could not be established. Please ensure server.ts is active.`,
        state: 'IDLE',
      };
    }
  }

  /**
   * Multimodal Vision & Screen Analysis (Mark-LVI Screen Processor)
   */
  public async analyzeVision(
    imageBase64: string,
    imageMimeType: string = 'image/jpeg',
    visualSource: 'screen' | 'camera' | 'upload' = 'screen',
    focusQuestion?: string
  ): Promise<{
    success: boolean;
    analysis: string;
    visualSource?: string;
    modelUsed?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${getApiBase()}/api/vision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          visualSource,
          focusQuestion,
        }),
        signal: AbortSignal.timeout(20000),
      });
      return await res.json();
    } catch (err: any) {
      console.warn('[API] Vision analysis error:', err);
      return {
        success: false,
        analysis: '',
        error: err.message || 'Vision analysis failed',
      };
    }
  }

  // Fetch Memories
  public async getMemories(category?: string): Promise<MemoryItem[]> {
    const defaultMemories: MemoryItem[] = [
      {
        id: 'mem_01',
        category: 'preference',
        content:
          'User prefers concise direct briefings, priority alerts on thermal power surges, and automatic flight path calibrations.',
        is_active: true,
        confidence: '99.9%',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem_02',
        category: 'project',
        content:
          'Active design initiative: Mark 85 Titanium composite outer carapace. Requires thermal shielding test in cryogenic environment.',
        is_active: true,
        confidence: '98.4%',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem_03',
        category: 'instruction',
        content:
          'Auto-engage perimeter defense sweeps every 60 minutes when user is away from Malibu lab.',
        is_active: true,
        confidence: '99.2%',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mem_04',
        category: 'fact',
        content:
          'Arc Reactor Mark VII core output threshold calibrated at 3.0 gigajoules/sec.',
        is_active: true,
        confidence: '100%',
        created_at: new Date().toISOString(),
      },
    ];

    try {
      const base = getApiBase();
      const url = base
        ? new URL(`${base}/api/memories`)
        : new URL('/api/memories', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
      if (category) url.searchParams.set('category', category);

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data.memories && data.memories.length > 0 ? data.memories : defaultMemories;
    } catch {
      return category ? defaultMemories.filter((m) => m.category === category) : defaultMemories;
    }
  }

  // Add Memory
  public async addMemory(memory: Partial<MemoryItem>): Promise<MemoryItem> {
    const fallback: MemoryItem = {
      id: `mem_${Date.now()}`,
      category: memory.category || 'preference',
      content: memory.content || '',
      is_active: true,
      confidence: '100%',
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${getApiBase()}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data.memory || fallback;
    } catch {
      return fallback;
    }
  }

  // Delete Memory
  public async deleteMemory(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${getApiBase()}/api/memories/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Fetch Action Queue
  public async getActions(): Promise<ActionQueueItem[]> {
    const defaultActions: ActionQueueItem[] = [
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

    try {
      const res = await fetch(`${getApiBase()}/api/actions`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data.actions && data.actions.length > 0 ? data.actions : defaultActions;
    } catch {
      return defaultActions;
    }
  }

  // Approve Action
  public async approveAction(actionId: string): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
        signal: AbortSignal.timeout(3000),
      });
      return await res.json();
    } catch {
      return { success: true, actionId, status: 'approved' };
    }
  }

  // Reject Action
  public async rejectAction(actionId: string): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
        signal: AbortSignal.timeout(3000),
      });
      return await res.json();
    } catch {
      return { success: true, actionId, status: 'rejected' };
    }
  }

  // Direct Backend Email Status Check
  public async getEmailStatus(): Promise<{ success: boolean; configured: boolean; senderEmail?: string; mode?: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/email-status`, {
        signal: AbortSignal.timeout(3000),
      });
      return await res.json();
    } catch {
      return { success: false, configured: false, mode: 'none' };
    }
  }

  // Direct Backend Email Send with Approval
  public async sendApprovedEmail(payload: {
    actionId?: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; reply?: string; error?: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: Failed to dispatch email`,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network anomaly during email dispatch',
      };
    }
  }

  // Bixby File Open / Reveal in Folder
  public async openLocalFile(filePath: string, revealInFolder: boolean = false): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/open-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, revealInFolder }),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Bixby OS Settings Intent Trigger
  public async openSettingUri(uri: string): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/open-setting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
        signal: AbortSignal.timeout(4000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Fetch Tasks
  public async getTasks(): Promise<TaskDirective[]> {
    const defaultTasks: TaskDirective[] = [
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

    try {
      const res = await fetch(`${getApiBase()}/api/tasks`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data.tasks && data.tasks.length > 0 ? data.tasks : defaultTasks;
    } catch {
      return defaultTasks;
    }
  }

  // Update Task
  public async updateTask(id: string, updates: Partial<TaskDirective>): Promise<any> {
    try {
      const res = await fetch(`${getApiBase()}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(3000),
      });
      return await res.json();
    } catch {
      return { success: true, taskId: id, updates };
    }
  }

  // Fetch Custom Routines & Macros
  public async getRoutines(): Promise<CustomRoutine[]> {
    try {
      const res = await fetch(`${getApiBase()}/api/routines`, {
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      return Array.isArray(data.routines) ? data.routines : [];
    } catch (err) {
      console.warn('[ROUTINES] Failed to fetch routines:', err);
      return [];
    }
  }

  // Save or Update Custom Routine
  public async saveRoutine(routine: Partial<CustomRoutine>): Promise<{ success: boolean; routine?: CustomRoutine; error?: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routine),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save routine' };
    }
  }

  // Delete Custom Routine
  public async deleteRoutine(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/routines/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete routine' };
    }
  }

  // Execute Routine Macro Directly
  public async executeRoutine(
    routineId?: string,
    voiceTrigger?: string
  ): Promise<{ success: boolean; clientActions?: any[]; reply?: string; routineName?: string; error?: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/routines/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId, voiceTrigger }),
        signal: AbortSignal.timeout(8000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to execute routine' };
    }
  }

  // Mark-LVI: Reversible Action Undo (Undo Stack)
  public async undoLastAction(): Promise<{ success: boolean; undoneAction?: string; message: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: `Failed to trigger undo: ${err.message}` };
    }
  }

  // Mark-LVI: Model-Proof Physical Confirmation
  public async confirmAction(confirmToken: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken }),
        signal: AbortSignal.timeout(8000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: `Confirmation failed: ${err.message}` };
    }
  }

  public async cancelAction(confirmToken: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/actions/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken }),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: `Cancel failed: ${err.message}` };
    }
  }

  // Mark-LVI: Engine & Providers Configuration
  public async getEngineConfig(): Promise<{ success: boolean; config: any }> {
    try {
      const res = await fetch(`${getApiBase()}/api/engine/config`, {
        signal: AbortSignal.timeout(4000),
      });
      return await res.json();
    } catch {
      return {
        success: false,
        config: {
          selectedEngine: 'gemini_cloud',
          gemini: { primaryModel: 'gemini-3.8-flash', fallbackModel: 'gemini-3.5-flash-lite' },
          localOpenai: { baseUrl: 'http://localhost:11434/v1', modelName: 'llama3.2', apiKey: '' },
        },
      };
    }
  }

  public async saveEngineConfig(config: any): Promise<{ success: boolean; message: string; config?: any }> {
    try {
      const res = await fetch(`${getApiBase()}/api/engine/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(5000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async testEngine(engine: string, localOpenai?: any): Promise<{ success: boolean; latencyMs: number; message: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/engine/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, localOpenai }),
        signal: AbortSignal.timeout(7000),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: `Test request failed: ${err.message}` };
    }
  }

  // Mark-LVI: Host Wi-Fi LAN & Mobile Pairing
  public async getLanInfo(): Promise<{ success: boolean; lanIp: string; pairCode: string; pairUrl: string; hostname: string }> {
    try {
      const res = await fetch(`${getApiBase()}/api/system/lan-info`, {
        signal: AbortSignal.timeout(4000),
      });
      return await res.json();
    } catch {
      return {
        success: false,
        lanIp: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
        pairCode: '000000',
        pairUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
        hostname: 'JARVIS-HOST',
      };
    }
  }
}

export const api = new JarvisApiClient();
