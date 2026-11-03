import React, { useState, useEffect, useCallback } from 'react';
import { 
  Workflow, 
  Plus, 
  Play, 
  Trash2, 
  Edit3, 
  Mic, 
  Check, 
  Sparkles, 
  X, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw
} from 'lucide-react';
import { CustomRoutine, RoutineStep, RoutineStepType, ClientAction } from '../../types/jarvis';
import { api } from '../../services/api';
import { actionExecutor } from '../../services/actionExecutor';
import { audioSynth } from '../../services/audioSynth';
import { speechEngine } from '../../services/speechEngine';

interface RoutineBuilderViewProps {
  onShowToast: (message: string) => void;
  onExecuteClientActions?: (actions: ClientAction[]) => Promise<void>;
}

export const RoutineBuilderView: React.FC<RoutineBuilderViewProps> = ({
  onShowToast,
  onExecuteClientActions,
}) => {
  const [routines, setRoutines] = useState<CustomRoutine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExecutingId, setIsExecutingId] = useState<string | null>(null);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formTrigger, setFormTrigger] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formSteps, setFormSteps] = useState<RoutineStep[]>([]);
  const [formActive, setFormActive] = useState<boolean>(true);

  // Add Step Sub-modal
  const [isStepModalOpen, setIsStepModalOpen] = useState<boolean>(false);
  const [newStepType, setNewStepType] = useState<RoutineStepType>('OPEN_APP');
  const [newStepLabel, setNewStepLabel] = useState<string>('');
  const [stepPayload, setStepPayload] = useState<Record<string, any>>({ appName: 'VS Code' });

  // Load routines from API
  const loadRoutines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getRoutines();
      setRoutines(data);
    } catch {
      onShowToast('Failed to load tactical routines');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  // Execute Routine Directly
  const handleRunRoutine = async (routine: CustomRoutine) => {
    setIsExecutingId(routine.id);
    audioSynth.playStateSound('THINKING');
    onShowToast(`Triggering macro: "${routine.routine_name}"...`);

    try {
      const res = await api.executeRoutine(routine.id);
      if (res.success && res.clientActions) {
        if (onExecuteClientActions) {
          await onExecuteClientActions(res.clientActions as ClientAction[]);
        } else {
          await actionExecutor.executeAll(res.clientActions as ClientAction[]);
        }
        audioSynth.playStateSound('SPEAKING');
        if (res.reply) {
          speechEngine.speak(res.reply);
        }
        onShowToast(`Macro executed: ${routine.steps.length} sequential operations initiated`);
      } else {
        onShowToast(res.error || 'Execution anomaly detected');
      }
    } catch (err: any) {
      onShowToast(`Execution failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExecutingId(null);
    }
  };

  // Toggle Routine Active Status
  const handleToggleActive = async (routine: CustomRoutine) => {
    const nextState = !routine.is_active;
    const updated = { ...routine, is_active: nextState };
    setRoutines((prev) => prev.map((r) => (r.id === routine.id ? updated : r)));
    try {
      await api.saveRoutine(updated);
      onShowToast(`Macro "${routine.routine_name}" ${nextState ? 'activated' : 'deactivated'}`);
    } catch {
      onShowToast('Failed to sync macro status');
    }
  };

  // Delete Routine
  const handleDeleteRoutine = async (id: string, name: string) => {
    if (!window.confirm(`Delete tactical macro "${name}"?`)) return;
    try {
      await api.deleteRoutine(id);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      onShowToast(`Macro "${name}" deleted`);
    } catch {
      onShowToast('Failed to delete routine');
    }
  };

  // Open Editor for New Routine
  const handleOpenCreateModal = () => {
    setEditingRoutineId(null);
    setFormName('');
    setFormTrigger('');
    setFormDesc('');
    setFormActive(true);
    setFormSteps([
      {
        id: `stp_${Date.now()}_1`,
        type: 'OPEN_APP',
        label: 'Launch Target Application',
        payload: { appName: 'VS Code' },
        order: 1,
      },
    ]);
    setIsEditorOpen(true);
  };

  // Open Editor for Existing Routine
  const handleOpenEditModal = (routine: CustomRoutine) => {
    setEditingRoutineId(routine.id);
    setFormName(routine.routine_name);
    setFormTrigger(routine.voice_trigger);
    setFormDesc(routine.description || '');
    setFormActive(routine.is_active);
    setFormSteps(routine.steps || []);
    setIsEditorOpen(true);
  };

  // Save Routine
  const handleSaveRoutine = async () => {
    if (!formName.trim() || !formTrigger.trim()) {
      onShowToast('Routine name and voice trigger are mandatory.');
      return;
    }

    if (formSteps.length === 0) {
      onShowToast('Add at least one sequential action step.');
      return;
    }

    const payload: Partial<CustomRoutine> = {
      id: editingRoutineId || undefined,
      routine_name: formName.trim(),
      voice_trigger: formTrigger.toLowerCase().trim(),
      description: formDesc.trim(),
      is_active: formActive,
      steps: formSteps.map((s, idx) => ({ ...s, order: idx + 1 })),
    };

    try {
      const res = await api.saveRoutine(payload);
      if (res.success && res.routine) {
        onShowToast(`Macro "${res.routine.routine_name}" saved successfully`);
        setIsEditorOpen(false);
        loadRoutines();
      } else {
        onShowToast(res.error || 'Failed to save macro');
      }
    } catch (err: any) {
      onShowToast(`Error saving macro: ${err.message}`);
    }
  };

  // Step Reordering
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formSteps.length) return;
    const reordered = [...formSteps];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setFormSteps(reordered.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleDeleteStep = (index: number) => {
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Step Modal Confirm
  const handleAddStepConfirm = () => {
    const step: RoutineStep = {
      id: `stp_${Date.now()}`,
      type: newStepType,
      label: newStepLabel.trim() || getDefaultStepLabel(newStepType, stepPayload),
      payload: { ...stepPayload },
      order: formSteps.length + 1,
    };
    setFormSteps((prev) => [...prev, step]);
    setIsStepModalOpen(false);
    setNewStepLabel('');
    setStepPayload({ appName: 'Chrome' });
  };

  const getDefaultStepLabel = (type: RoutineStepType, payload: Record<string, any>): string => {
    switch (type) {
      case 'OPEN_APP':
        return `Launch ${payload.appName || 'Application'}`;
      case 'OPEN_URL':
        return `Navigate to ${payload.url || 'Web Resource'}`;
      case 'SYSTEM_CONTROL':
        return `Adjust ${payload.setting || 'System Parameter'}`;
      case 'CREATE_TASK':
        return `Queue Task: ${payload.title || 'Directive'}`;
      case 'DEVICE_SETTING':
        return `Open Setting: ${payload.uri || 'OS Parameter'}`;
      default:
        return 'Execute Action';
    }
  };

  const totalStepsCount = routines.reduce((acc, r) => acc + (r.steps?.length || 0), 0);
  const activeCount = routines.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-hud p-6 rounded-2xl relative">
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Workflow className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg font-bold text-slate-100 tracking-wider uppercase">
                  Custom Routines & Tactical Macros
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                  BIXBY // MACRO MATRIX
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-400/70">
                Define custom voice triggers to chain native OS apps, multi-window spawns, and device settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRoutines}
              disabled={isLoading}
              className="p-2 rounded-xl border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/20 text-cyan-400 hover:text-cyan-200 transition-colors"
              title="Refresh Routines"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Build New Macro
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl border border-cyan-500/20 bg-slate-900/40">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Macros</span>
            <span className="font-mono text-lg font-bold text-cyan-300">{routines.length}</span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-slate-900/40">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Triggers</span>
            <span className="font-mono text-lg font-bold text-emerald-400">{activeCount}</span>
          </div>
          <div className="p-3 rounded-xl border border-blue-500/20 bg-slate-900/40">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Chained Operations</span>
            <span className="font-mono text-lg font-bold text-blue-400">{totalStepsCount}</span>
          </div>
          <div className="p-3 rounded-xl border border-purple-500/20 bg-slate-900/40">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Voice Interceptor</span>
            <span className="font-mono text-xs font-bold text-purple-300 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              0ms Latency Hook
            </span>
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      {isLoading ? (
        <div className="glass-hud p-12 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase">
            Synchronizing Macro Telemetry...
          </span>
        </div>
      ) : routines.length === 0 ? (
        <div className="glass-hud p-12 rounded-2xl text-center space-y-4">
          <Workflow className="w-12 h-12 text-cyan-500/40 mx-auto" />
          <div>
            <h3 className="font-mono text-sm font-bold text-slate-200 uppercase tracking-wider">
              No Custom Macros Configured
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-md mx-auto">
              Create your first voice-triggered routine to automate chained apps, multi-window layouts, and system presets.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl border border-cyan-400/40 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 font-mono text-xs uppercase"
          >
            Create Routine Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {routines.map((routine) => {
            const isExecuting = isExecutingId === routine.id;

            return (
              <div
                key={routine.id}
                className={`glass-hud p-5 rounded-2xl border transition-all ${
                  routine.is_active
                    ? 'border-cyan-500/25 bg-slate-950/40 hover:border-cyan-400/40'
                    : 'border-slate-800/40 bg-slate-950/20 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cyan-500/10">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-mono text-sm font-bold text-slate-100 tracking-wide">
                        {routine.routine_name}
                      </h3>
                      <button
                        onClick={() => handleToggleActive(routine)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                          routine.is_active
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                            : 'border-slate-700 bg-slate-900 text-slate-500'
                        }`}
                      >
                        {routine.is_active ? 'ACTIVE' : 'MUTED'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-mono text-[11px]">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>"{routine.voice_trigger}"</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {routine.description}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleRunRoutine(routine)}
                      disabled={isExecuting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-400/50 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                      title="Test run macro immediately"
                    >
                      <Play className={`w-3.5 h-3.5 text-cyan-400 ${isExecuting ? 'animate-spin' : ''}`} />
                      <span>{isExecuting ? 'Dispatching...' : 'Test Run'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(routine)}
                      className="p-2 rounded-xl border border-slate-700/60 hover:border-cyan-400/40 bg-slate-900/40 text-slate-300 hover:text-cyan-300 transition-colors"
                      title="Edit Macro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRoutine(routine.id, routine.routine_name)}
                      className="p-2 rounded-xl border border-slate-700/60 hover:border-red-500/40 bg-slate-900/40 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Macro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stepper Chain Preview */}
                <div className="pt-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                    Sequential Operation Pipeline ({routine.steps?.length || 0} Steps)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {routine.steps && routine.steps.length > 0 ? (
                      routine.steps.map((step, idx) => (
                        <div key={step.id || idx} className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/20 bg-slate-900/60 text-slate-300 font-mono text-[11px]">
                            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-cyan-400 font-medium">
                              {step.type.replace('_', ' ')}:
                            </span>
                            <span className="text-slate-200">
                              {step.label || JSON.stringify(step.payload).slice(0, 20)}
                            </span>
                          </div>
                          {idx < routine.steps.length - 1 && (
                            <span className="text-cyan-500/50 text-xs font-mono">→</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-slate-500 italic">No action steps configured</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-hud max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 p-6 relative shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2.5">
                <Workflow className="w-5 h-5 text-cyan-400" />
                <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                  {editingRoutineId ? 'Modify Tactical Macro' : 'Author New Macro Protocol'}
                </h2>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 my-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
                    Macro Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Coding Mode Matrix"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
                    Spoken Voice Trigger Phrase
                  </label>
                  <div className="relative">
                    <Mic className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={formTrigger}
                      onChange={(e) => setFormTrigger(e.target.value)}
                      placeholder="e.g. activate coding mode"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
                  Macro Description / Operational Objective
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Boots IDE, GitHub workspace, silences notifications, sets task priority"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-cyan-500/30 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="formActiveCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-cyan-500/30 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <label htmlFor="formActiveCheck" className="text-xs font-mono text-slate-300 cursor-pointer">
                  Macro active and listening for voice trigger hook
                </label>
              </div>

              {/* Action Stepper Pipeline */}
              <div className="pt-2 border-t border-cyan-500/15">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    Sequential Action Pipeline ({formSteps.length} Steps)
                  </span>
                  <button
                    onClick={() => setIsStepModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-cyan-400/40 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-200 font-mono text-[11px] uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {formSteps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-3 rounded-xl border border-cyan-500/20 bg-slate-900/70 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                              {step.type}
                            </span>
                            <span className="text-xs font-mono text-slate-200 font-medium">
                              {step.label}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {JSON.stringify(step.payload)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 disabled:opacity-20"
                          title="Move step up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === formSteps.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 disabled:opacity-20"
                          title="Move step down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(idx)}
                          className="p-1 rounded text-slate-400 hover:text-red-400"
                          title="Delete step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-500/20">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoutine}
                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-100 font-mono text-xs font-bold uppercase tracking-wider shadow-glow-cyan hover:from-cyan-500/40 hover:to-blue-500/40"
              >
                <Check className="w-4 h-4 text-cyan-400" />
                Save Macro Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Step Sub-modal */}
      {isStepModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-hud max-w-md w-full rounded-2xl border border-cyan-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Configure Action Step
                </h3>
              </div>
              <button
                onClick={() => setIsStepModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                  Action Type
                </label>
                <select
                  value={newStepType}
                  onChange={(e) => {
                    const t = e.target.value as RoutineStepType;
                    setNewStepType(t);
                    if (t === 'OPEN_APP') setStepPayload({ appName: 'VS Code' });
                    else if (t === 'OPEN_URL') setStepPayload({ url: 'https://github.com', appName: 'Chrome' });
                    else if (t === 'SYSTEM_CONTROL') setStepPayload({ setting: 'dnd', state: true });
                    else if (t === 'CREATE_TASK') setStepPayload({ title: 'New mission directive', priority: 'high' });
                    else if (t === 'DEVICE_SETTING') setStepPayload({ uri: 'ms-settings:network-wifi', name: 'Wi-Fi' });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs focus:outline-none"
                >
                  <option value="OPEN_APP">OPEN_APP (Launch Native OS Application)</option>
                  <option value="OPEN_URL">OPEN_URL (Browse Web Resource)</option>
                  <option value="SYSTEM_CONTROL">SYSTEM_CONTROL (DND, Brightness, Eye Comfort)</option>
                  <option value="CREATE_TASK">CREATE_TASK (Queue Task Directive)</option>
                  <option value="DEVICE_SETTING">DEVICE_SETTING (OS Deep Link)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                  Step Description Label (Optional)
                </label>
                <input
                  type="text"
                  value={newStepLabel}
                  onChange={(e) => setNewStepLabel(e.target.value)}
                  placeholder="e.g. Open primary IDE"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Dynamic Payload Inputs */}
              {newStepType === 'OPEN_APP' && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                    Application Name
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {['VS Code', 'Chrome', 'Terminal', 'Spotify', 'Notepad', 'Calculator'].map((app) => (
                      <button
                        type="button"
                        key={app}
                        onClick={() => setStepPayload({ ...stepPayload, appName: app })}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                          stepPayload.appName === app
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={stepPayload.appName || ''}
                    onChange={(e) => setStepPayload({ ...stepPayload, appName: e.target.value })}
                    placeholder="or enter app name..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}

              {newStepType === 'OPEN_URL' && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                    Destination URL
                  </label>
                  <input
                    type="text"
                    value={stepPayload.url || ''}
                    onChange={(e) => setStepPayload({ ...stepPayload, url: e.target.value })}
                    placeholder="https://github.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}

              {newStepType === 'SYSTEM_CONTROL' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                    System Override Setting
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['dnd', 'eyeComfort', 'brightness'].map((setting) => (
                      <button
                        type="button"
                        key={setting}
                        onClick={() => setStepPayload({ setting, state: true, level: 50 })}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                          stepPayload.setting === setting
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400'
                        }`}
                      >
                        {setting.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {stepPayload.setting === 'brightness' && (
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Level: {stepPayload.level || 50}%</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={stepPayload.level || 50}
                        onChange={(e) => setStepPayload({ ...stepPayload, level: Number(e.target.value) })}
                        className="w-full mt-1 accent-cyan-400"
                      />
                    </div>
                  )}
                </div>
              )}

              {newStepType === 'CREATE_TASK' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={stepPayload.title || ''}
                      onChange={(e) => setStepPayload({ ...stepPayload, title: e.target.value })}
                      placeholder="e.g. Execute code review"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                      Priority
                    </label>
                    <select
                      value={stepPayload.priority || 'high'}
                      onChange={(e) => setStepPayload({ ...stepPayload, priority: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              )}

              {newStepType === 'DEVICE_SETTING' && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-300 block mb-1">
                    Setting Target / Intent URI
                  </label>
                  <input
                    type="text"
                    value={stepPayload.uri || ''}
                    onChange={(e) => setStepPayload({ ...stepPayload, uri: e.target.value })}
                    placeholder="ms-settings:network-wifi or notifications"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-cyan-500/20">
              <button
                type="button"
                onClick={() => setIsStepModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStepConfirm}
                className="px-4 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/80 text-cyan-200 font-mono text-xs font-bold uppercase"
              >
                Add Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
