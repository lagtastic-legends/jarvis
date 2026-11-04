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
  | 'routines'
  | 'research' 
  | 'coding' 
  | 'settings';

export type ThemeMode = 'holographic' | 'obsidian';

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

export type ClientActionType = 
  | 'OPEN_APP'
  | 'OPEN_MULTIPLE_WINDOWS'
  | 'COMPOSE_EMAIL'
  | 'REPLY_TO_MESSAGE'
  | 'MANAGE_TASK'
  | 'SYSTEM_CONTROL'
  | 'MANAGE_APP_NOTIFICATIONS'
  | 'FIND_LOCAL_FILE'
  | 'EXECUTE_DEVICE_ROUTINE'
  | 'DIAGNOSE_AND_OPEN_SETTING'
  | 'UNDO_ACTION';

export interface ActionOutcome {
  status: 'done' | 'unverified' | 'failed';
  pid?: number;
  processName?: string;
  facts: Record<string, string | number | boolean>;
  undoable: boolean;
  undoId?: string;
  message?: string;
}

export interface ClientAction {
  id: string;
  type: ClientActionType;
  title: string;
  payload: Record<string, any>;
  status: 'pending' | 'executed' | 'failed' | 'done' | 'unverified';
  outcome?: ActionOutcome;
  executedAt?: string;
  result?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
  actions?: ClientAction[];
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

export type RoutineStepType = 
  | 'OPEN_APP'
  | 'OPEN_URL'
  | 'OPEN_MULTIPLE_WINDOWS'
  | 'SYSTEM_CONTROL'
  | 'CREATE_TASK'
  | 'DEVICE_SETTING';

export interface RoutineStep {
  id: string;
  type: RoutineStepType;
  label: string;
  payload: Record<string, any>;
  order: number;
}

export interface CustomRoutine {
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

