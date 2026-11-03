import React from 'react';
import { CheckSquare, Clock, CheckCircle2 } from 'lucide-react';
import { TaskDirective } from '../../types/jarvis';

interface TaskDirectivesViewProps {
  tasks: TaskDirective[];
  onToggleTask: (id: string, currentStatus: string) => void;
}

export const TaskDirectivesView: React.FC<TaskDirectivesViewProps> = ({
  tasks,
  onToggleTask,
}) => {
  return (
    <div className="glass-hud p-6 rounded-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-jarvis-border/40">
        <div className="flex items-center gap-2.5">
          <CheckSquare className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
              Missions & Task Directives
            </h2>
            <p className="text-[11px] font-mono text-cyan-400/70">
              Operational mission tasks // public.tasks
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40">
          {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Completed
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isDone = task.status === 'completed';
          const priorityColor =
            task.priority === 'critical' ? 'text-red-400 border-red-500/40 bg-red-950/20' :
            task.priority === 'high' ? 'text-amber-400 border-amber-500/40 bg-amber-950/20' :
            task.priority === 'medium' ? 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20' :
            'text-cyan-400 border-cyan-500/40 bg-cyan-950/20';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-950/10 opacity-70'
                  : 'border-jarvis-border/40 bg-jarvis-void/60 hover:border-cyan-400/40'
              }`}
            >
              <button
                onClick={() => onToggleTask(task.id, task.status)}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  isDone
                    ? 'border-emerald-400 bg-emerald-500 text-black shadow-glow-emerald'
                    : 'border-jarvis-border/60 hover:border-cyan-400 bg-jarvis-space/40'
                }`}
              >
                {isDone && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-mono text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                    {task.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${priorityColor}`}>
                    {task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-400 font-sans">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400/60" />
                    {task.due_date || 'Ongoing Protocol'}
                  </span>
                  <span className="uppercase text-cyan-400/80">STATUS: {task.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
