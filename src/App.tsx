import React, { useState, useEffect, useCallback } from 'react';
import { 
  JarvisState, 
  TabId, 
  TelemetryData, 
  ChatMessage, 
  MemoryItem, 
  TaskDirective, 
  ActionQueueItem 
} from './types/jarvis';
import { audioSynth } from './services/audioSynth';
import { speechEngine } from './services/speechEngine';
import { api } from './services/api';

import { HUDHeader } from './components/HUDHeader';
import { Sidebar } from './components/Sidebar';
import { MicrophoneModal } from './components/MicrophoneModal';
import { ActionApprovalModal } from './components/ActionApprovalModal';

import { DashboardView } from './components/views/DashboardView';
import { NeuralChatView } from './components/views/NeuralChatView';
import { VoiceEngineView } from './components/views/VoiceEngineView';
import { MemoryCenterView } from './components/views/MemoryCenterView';
import { OpticalVisionView } from './components/views/OpticalVisionView';
import { TaskDirectivesView } from './components/views/TaskDirectivesView';
import { WebResearchView } from './components/views/WebResearchView';
import { NeuralCodingView } from './components/views/NeuralCodingView';
import { SystemSettingsView } from './components/views/SystemSettingsView';

export const App: React.FC = () => {
  // AI State Machine
  const [aiState, setAiState] = useState<JarvisState>('IDLE');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio & SFX settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.8);

  // Modals & Navigation
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [micModalOpen, setMicModalOpen] = useState<boolean>(false);
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);

  // Real-time Telemetry Data
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    neuralFlux: '4.2 TFLOPS',
    thermalDispersion: '18.2%',
    powerGrid: '100% NOMINAL',
    subOrbitalRange: '2,450 km',
    activeSynapses: '142,890',
    quantumShields: 'SECURE',
    defcon: 5,
  });

  // Data Stores
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_0',
      sender: 'assistant',
      content: 'JARVIS neural core online. All quantum nodes aligned and monitoring perimeter sensors, Sir.',
      timestamp: '10:42:01',
    },
    {
      id: 'msg_1',
      sender: 'user',
      content: 'Run a thermal check on the Mark 85 carapace and verify flight dynamics.',
      timestamp: '10:42:40',
    },
    {
      id: 'msg_2',
      sender: 'assistant',
      content: 'Telemetry compiled. Under Mach 3.4 cruise velocity at 42,000 feet, thermal dispersion holds at 18.2% with energy depletion rate measured at 1.48 kW/min. Repulsor temperature is nominal.',
      timestamp: '10:43:02',
    },
  ]);

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskDirective[]>([]);
  const [actions, setActions] = useState<ActionQueueItem[]>([]);

  const [activityStream, setActivityStream] = useState<{ id: string; time: string; text: string; tag: string }[]>([
    { id: 'act_1', time: '10:44:12', text: 'Telemetry sync with Stark constellation complete', tag: 'SYNC' },
    { id: 'act_2', time: '10:43:02', text: 'Thermal sensors calibrated: 18.2% dispersion', tag: 'SENSORS' },
    { id: 'act_3', time: '10:42:01', text: 'Quantum cryptographic entropy re-seeded', tag: 'CRYPTO' },
    { id: 'act_4', time: '10:40:55', text: 'Perimeter radar sweep clean (0 intrusions)', tag: 'DEFENSE' },
  ]);

  // Toast Notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Update AI State with synthesized acoustic feedback
  const transitionAiState = useCallback((nextState: JarvisState, suppressSound = false) => {
    setAiState(nextState);
    if (!suppressSound && sfxEnabled) {
      audioSynth.playStateSound(nextState);
    }
  }, [sfxEnabled]);

  // Initial load: Telemetry WebSocket, Memories, Tasks, Action Queue
  useEffect(() => {
    const unsub = api.subscribeTelemetry((data) => {
      setTelemetry((prev) => ({ ...prev, ...data }));
    });

    api.getMemories().then(setMemories).catch(console.warn);
    api.getTasks().then(setTasks).catch(console.warn);
    api.getActions().then(setActions).catch(console.warn);

    // Register speech callbacks
    speechEngine.onStateChange((speaking, _word) => {
      setIsSpeaking(speaking);
      if (speaking) {
        setAiState('SPEAKING');
      } else {
        setAiState('IDLE');
        setLiveCaption('');
      }
    });

    return () => unsub();
  }, []);

  // Send Directive / Prompt handler
  const handleSendDirective = useCallback(async (text: string) => {
    audioSynth.playTransmit();
    transitionAiState('THINKING');

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await api.sendChatMessage(text);
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        metadata: data.actionTriggered,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLiveCaption(data.reply);

      // Add to activity stream
      setActivityStream((prev) => [
        {
          id: `act_${Date.now()}`,
          time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
          text: `Executed: "${text.slice(0, 32)}..."`,
          tag: 'DIRECTIVE',
        },
        ...prev.slice(0, 10),
      ]);

      if (speechEnabled) {
        transitionAiState('SPEAKING');
        speechEngine.speak(data.reply, () => {
          transitionAiState('IDLE');
        });
      } else {
        transitionAiState('IDLE');
      }

      showToast(data.reply.slice(0, 60) + '...');
    } catch (err: any) {
      console.error('[AI] Directive error:', err);
      transitionAiState('ERROR');
      showToast('Neural processing error occurred.');
    }
  }, [transitionAiState, speechEnabled, showToast]);

  // Audio Toggles
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    audioSynth.setMuted(next);
    if (next) speechEngine.stop();
    showToast(next ? 'All Acoustic Feedback Muted' : 'Acoustic Feedback Unmuted');
  }, [isMuted, showToast]);

  const handleToggleSfx = useCallback(() => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    audioSynth.setEnabled(next);
    showToast(next ? 'Sci-Fi Procedural SFX Enabled' : 'Procedural SFX Disabled');
  }, [sfxEnabled, showToast]);

  const handleToggleSpeech = useCallback(() => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    speechEngine.setEnabled(next);
    showToast(next ? 'Binaural Voice Synthesizer Active' : 'Voice Synthesizer Disabled');
  }, [speechEnabled, showToast]);

  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    audioSynth.setVolume(val);
  }, []);

  // Action Queue Handlers
  const handleApproveAction = useCallback(async (actionId: string) => {
    audioSynth.playChirp();
    await api.approveAction(actionId);
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: 'approved' } : a))
    );
    showToast(`Action ${actionId} Authorized.`);
  }, [showToast]);

  const handleRejectAction = useCallback(async (actionId: string) => {
    audioSynth.playAlert();
    await api.rejectAction(actionId);
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: 'rejected' } : a))
    );
    showToast(`Action ${actionId} Revoked.`);
  }, [showToast]);

  // Task Toggle Handler
  const handleToggleTask = useCallback(async (id: string, currentStatus: string) => {
    audioSynth.playChirp();
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await api.updateTask(id, { status: nextStatus as any });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t))
    );
  }, []);

  // Memory Add Handler
  const handleAddMemory = useCallback(async (mem: Partial<MemoryItem>) => {
    audioSynth.playChirp();
    const newMem = await api.addMemory(mem);
    setMemories((prev) => [newMem, ...prev]);
    showToast('New semantic vector committed.');
  }, [showToast]);

  // Keyboard Shortcuts (1-4 for quick directives, Esc to halt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        speechEngine.stop();
        transitionAiState('IDLE');
      } else if (e.key === '1') {
        handleSendDirective('Initiate perimeter scan');
      } else if (e.key === '2') {
        handleSendDirective('Daily briefing');
      } else if (e.key === '3') {
        handleSendDirective('Compile flight dynamics');
      } else if (e.key === '4') {
        handleSendDirective('Run diagnostic');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSendDirective, transitionAiState]);

  const pendingActions = actions.filter((a) => a.status === 'pending');

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-jarvis-void text-slate-100 font-sans">
      {/* Background Cybernetic Layers */}
      <div className="fixed inset-0 cyber-grid pointer-events-none z-0" />
      <div className="fixed inset-0 radial-vignette pointer-events-none z-0" />
      <div className="fixed inset-0 hologram-overlay pointer-events-none z-10 opacity-70" />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabSelect={(t) => {
          audioSynth.playChirp();
          setActiveTab(t);
        }}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        neuralFlux={telemetry.neuralFlux}
        activeSynapses={telemetry.activeSynapses}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-20">
        {/* HUD Top Bar */}
        <HUDHeader
          state={aiState}
          onStateSelect={(st) => transitionAiState(st)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          sfxEnabled={sfxEnabled}
          onToggleSfx={handleToggleSfx}
          speechEnabled={speechEnabled}
          onToggleSpeech={handleToggleSpeech}
          pendingActionsCount={pendingActions.length}
          onOpenActionQueue={() => setActionModalOpen(true)}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={aiState}
              telemetry={telemetry}
              isSpeaking={isSpeaking}
              liveCaption={liveCaption}
              onSendDirective={handleSendDirective}
              onOpenMicModal={() => setMicModalOpen(true)}
              onTestVoice={() => {
                const sample = 'Diagnostic check nominal, Sir. Power grid holding at 100%.';
                setLiveCaption(sample);
                transitionAiState('SPEAKING');
                speechEngine.speak(sample, () => transitionAiState('IDLE'));
              }}
              onOrbClick={() => {
                audioSynth.playTacticalSweep();
                transitionAiState(aiState === 'IDLE' ? 'LISTENING' : 'IDLE');
              }}
              activityStream={activityStream}
            />
          )}

          {activeTab === 'chat' && (
            <NeuralChatView
              messages={messages}
              onSendMessage={handleSendDirective}
              onClearLog={() => setMessages([])}
              isThinking={aiState === 'THINKING'}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceEngineView
              onTestPhrase={(p) => {
                setLiveCaption(p);
                transitionAiState('SPEAKING');
                speechEngine.speak(p, () => transitionAiState('IDLE'));
              }}
              onOpenMicModal={() => setMicModalOpen(true)}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryCenterView
              memories={memories}
              onAddMemory={handleAddMemory}
            />
          )}

          {activeTab === 'vision' && <OpticalVisionView />}

          {activeTab === 'tasks' && (
            <TaskDirectivesView
              tasks={tasks}
              onToggleTask={handleToggleTask}
            />
          )}

          {activeTab === 'research' && <WebResearchView />}

          {activeTab === 'coding' && <NeuralCodingView />}

          {activeTab === 'settings' && (
            <SystemSettingsView
              volume={volume}
              onVolumeChange={handleVolumeChange}
              sfxEnabled={sfxEnabled}
              onToggleSfx={handleToggleSfx}
              speechEnabled={speechEnabled}
              onToggleSpeech={handleToggleSpeech}
            />
          )}
        </main>
      </div>

      {/* Floating HUD Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border border-cyan-400/50 bg-jarvis-space/95 backdrop-blur-xl text-cyan-300 font-mono text-xs shadow-glow-cyan flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <MicrophoneModal
        isOpen={micModalOpen}
        onClose={() => setMicModalOpen(false)}
        onAccessGranted={() => {
          showToast('Acoustic sensor verified and active.');
          transitionAiState('LISTENING');
        }}
      />

      <ActionApprovalModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        actions={actions}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
      />
    </div>
  );
};
