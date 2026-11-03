import { MemoryItem, TaskDirective, ActionQueueItem, TelemetryData } from '../types/jarvis';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class JarvisApiClient {
  private ws: WebSocket | null = null;
  private telemetryCallbacks: Set<(data: TelemetryData) => void> = new Set();

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
      .replace(/^http/, 'ws') + '/api/ws';

    try {
      this.ws = new WebSocket(wsUrl);
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
        // Reconnect backoff
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    } catch (err) {
      console.warn('[WS] Connection failed:', err);
    }
  }

  public subscribeTelemetry(callback: (data: TelemetryData) => void): () => void {
    this.telemetryCallbacks.add(callback);
    return () => this.telemetryCallbacks.delete(callback);
  }

  // Health Check
  public async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  }

  // Ephemeral WebRTC token
  public async getWebRtcToken(userId: string = 'usr_stark_01'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/webrtc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  }

  // Send message
  public async sendChatMessage(message: string, conversationId?: string): Promise<{
    reply: string;
    state: string;
    actionTriggered?: any;
    suggestedDirectives?: string[];
  }> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId }),
    });
    return res.json();
  }

  // Fetch Memories
  public async getMemories(category?: string): Promise<MemoryItem[]> {
    const url = new URL(`${API_BASE}/api/memories`);
    if (category) url.searchParams.append('category', category);
    const res = await fetch(url.toString());
    const data = await res.json();
    return data.memories || [];
  }

  // Add Memory
  public async addMemory(memory: Partial<MemoryItem>): Promise<MemoryItem> {
    const res = await fetch(`${API_BASE}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    const data = await res.json();
    return data.memory;
  }

  // Fetch Action Queue
  public async getActions(): Promise<ActionQueueItem[]> {
    const res = await fetch(`${API_BASE}/api/actions`);
    const data = await res.json();
    return data.actions || [];
  }

  // Approve Action
  public async approveAction(actionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/actions/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId }),
    });
    return res.json();
  }

  // Reject Action
  public async rejectAction(actionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/actions/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId }),
    });
    return res.json();
  }

  // Fetch Tasks
  public async getTasks(): Promise<TaskDirective[]> {
    const res = await fetch(`${API_BASE}/api/tasks`);
    const data = await res.json();
    return data.tasks || [];
  }

  // Update Task
  public async updateTask(id: string, updates: Partial<TaskDirective>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  }
}

export const api = new JarvisApiClient();
