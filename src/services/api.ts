import { MemoryItem, TaskDirective, ActionQueueItem, TelemetryData } from '../types/jarvis';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class JarvisApiClient {
  private ws: WebSocket | null = null;
  private telemetryCallbacks: Set<(data: TelemetryData) => void> = new Set();
  private isServerReachable: boolean = true;

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
      .replace(/^http/, 'ws') + '/api/ws';

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.isServerReachable = true;
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TELEMETRY_SYNC' || message.type === 'TELEMETRY_UPDATE') {
            this.telemetryCallbacks.forEach(cb => cb(message.payload));
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
      const res = await fetch(`${API_BASE}/api/health`);
      return await res.json();
    } catch {
      return { status: 'STANDALONE_AUTONOMOUS', zeroSecretLock: 'ACTIVE' };
    }
  }

  // Ephemeral WebRTC token
  public async getWebRtcToken(userId: string = 'usr_stark_01'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/webrtc/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return await res.json();
    } catch {
      return {
        success: true,
        token: `jarvis_local_token_${Date.now()}`,
        voiceProfile: { voice: 'en-GB-Neural2-B', accent: 'British Sophisticated', pitch: 0.95, rate: 1.10 },
      };
    }
  }

  // Send message with seamless local fallback
  public async sendChatMessage(message: string, conversationId?: string): Promise<{
    reply: string;
    state: string;
    actionTriggered?: any;
    suggestedDirectives?: string[];
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Server returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('[API] Server offline or unreachable. Engaging autonomous local neural processor:', err);
      return this.localDirectivesFallback(message);
    }
  }

  // Autonomous local intelligence processor
  private localDirectivesFallback(message: string): {
    reply: string;
    state: string;
    actionTriggered?: any;
    suggestedDirectives?: string[];
  } {
    const trimmed = message.trim();
    let reply = '';
    let actionTriggered: any = null;

    if (/perimeter\s+scan/i.test(trimmed)) {
      reply = 'Perimeter scan initiated, Sir. LiDAR sweep confirms all 36 sectors secure with zero unauthorized intrusions.';
      actionTriggered = { type: 'SCAN_PERIMETER', status: 'COMPLETED', risk: 'low' };
    } else if (/diagnostic|status\s+report/i.test(trimmed)) {
      reply = 'Diagnostic complete. Arc Reactor operating at 98.4% efficiency. Thermal dispersion holds at 18.2%. All neural synapses nominal.';
      actionTriggered = { type: 'RUN_DIAGNOSTIC', status: 'COMPLETED', risk: 'low' };
    } else if (/flight\s+(dynamics|path)/i.test(trimmed)) {
      reply = 'Flight dynamics updated. At Mach 3.4 cruise velocity, sub-orbital range remains 2,450 km. Repulsor thermal limits are within safe margins.';
      actionTriggered = { type: 'FLIGHT_CALIBRATION', status: 'COMPLETED', risk: 'medium' };
    } else if (/daily\s+briefing/i.test(trimmed)) {
      reply = 'Good day, Sir. Stark Industries orbital communication alignment is complete. You have a scheduled Board briefing at 16:00. Weather in Malibu is 21.5°C with clear skies.';
    } else if (/arm|deploy\s+shields|defcon/i.test(trimmed)) {
      reply = 'Quantum shields energized to 100%. DEFCON 5 standby protocols engaged. Standing by for further commands.';
      actionTriggered = { type: 'DEPLOY_SHIELDS', status: 'EXECUTING', risk: 'high' };
    } else {
      reply = `Understood, Sir. Processing your directive: "${trimmed}". Neural networks synched and telemetry recorded.`;
    }

    return {
      reply,
      state: 'SPEAKING',
      actionTriggered,
      suggestedDirectives: [
        'Check power grid',
        'Initiate perimeter scan',
        'Compile flight dynamics',
        'Review pending actions',
      ],
    };
  }

  // Fetch Memories with resilient local store
  public async getMemories(category?: string): Promise<MemoryItem[]> {
    const defaultMemories: MemoryItem[] = [
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

    try {
      const url = new URL(`${API_BASE}/api/memories`);
      if (category) url.searchParams.append('category', category);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      return data.memories && data.memories.length > 0 ? data.memories : defaultMemories;
    } catch {
      return category ? defaultMemories.filter(m => m.category === category) : defaultMemories;
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
      const res = await fetch(`${API_BASE}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory),
        signal: AbortSignal.timeout(2000),
      });
      const data = await res.json();
      return data.memory || fallback;
    } catch {
      return fallback;
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
      const res = await fetch(`${API_BASE}/api/actions`, { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      return data.actions && data.actions.length > 0 ? data.actions : defaultActions;
    } catch {
      return defaultActions;
    }
  }

  // Approve Action
  public async approveAction(actionId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/actions/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
        signal: AbortSignal.timeout(2000),
      });
      return await res.json();
    } catch {
      return { success: true, actionId, status: 'approved' };
    }
  }

  // Reject Action
  public async rejectAction(actionId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/actions/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
        signal: AbortSignal.timeout(2000),
      });
      return await res.json();
    } catch {
      return { success: true, actionId, status: 'rejected' };
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
      const res = await fetch(`${API_BASE}/api/tasks`, { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      return data.tasks && data.tasks.length > 0 ? data.tasks : defaultTasks;
    } catch {
      return defaultTasks;
    }
  }

  // Update Task
  public async updateTask(id: string, updates: Partial<TaskDirective>): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(2000),
      });
      return await res.json();
    } catch {
      return { success: true, taskId: id, updates };
    }
  }
}

export const api = new JarvisApiClient();
