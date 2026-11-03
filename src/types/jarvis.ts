export type JarvisState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'PROCESSING' 
  | 'THINKING' 
  | 'SPEAKING' 
  | 'INTERRUPTED' 
  | 'ERROR';

export type TabId = 
  | 'dashboard' 
  | 'chat' 
  | 'voice' 
  | 'memory' 
  | 'vision' 
  | 'tasks' 
  | 'research' 
  | 'coding' 
  | 'settings';

export interface TelemetryData {
  neuralFlux: string;
  thermalDispersion: string;
  powerGrid: string;
  subOrbitalRange: string;
  activeSynapses: string;
  quantumShields: string;
  defcon: number;
  arcReactorOutput?: string;
  cpuLoad?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'instruction' | 'project' | 'directive';
  content: string;
  is_active: boolean;
  confidence?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface TaskDirective {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
}

export interface ActionQueueItem {
  id: string;
  action_type: string;
  target_resource: string;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  created_at: string;
}

export interface UserProfile {
  id: string;
  callsign: string;
  specialist_mode: string;
  voice_enabled: boolean;
  telemetry_enabled: boolean;
}
