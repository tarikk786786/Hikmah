'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Cpu,
  Terminal,
  FolderGit2,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Smartphone,
  Laptop,
  Radio,
  Sliders,
  AlertTriangle,
  Play,
  ArrowRight,
  Layers,
  Sparkles,
  Inbox
} from 'lucide-react';

interface SubsystemResult {
  id: string;
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
}

interface KernelStatus {
  isBooted: boolean;
  version: string;
  uptimeSeconds: number;
  activeProfile: string;
  currentDevice: string;
  privacyMode: 'normal' | 'private' | 'offline' | 'air-gapped';
  health: {
    overallStatus: string;
    healthyCount: number;
    totalCount: number;
    subsystems: Record<string, SubsystemResult>;
  };
}

export default function PAIOSDesktopPage() {
  const [status, setStatus] = useState<KernelStatus | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'tasks' | 'subsystems' | 'notifications'>('cockpit');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/paios/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching PAIOS status:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/paios/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
        setActiveProject(data.activeProject || null);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/paios/tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/paios/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchProjects();
    fetchTasks();
    fetchNotifications();
  }, []);

  const handleExecute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim() || isExecuting) return;

    const cmd = commandInput.trim();
    setIsExecuting(true);

    try {
      const res = await fetch('/api/paios/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          projectId: activeProject?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionLog(prev => [data.result, ...prev]);
        setCommandInput('');
        fetchTasks();
        fetchNotifications();
      } else {
        alert(data.error || 'Execution failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Execution error');
    } finally {
      setIsExecuting(false);
    }
  };

  const setPrivacyMode = async (mode: 'normal' | 'private' | 'offline' | 'air-gapped') => {
    try {
      const res = await fetch('/api/paios/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, reason: 'Updated from desktop cockpit HUD' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to change privacy mode:', err);
    }
  };

  const getPrivacyBadge = (mode?: string) => {
    switch (mode) {
      case 'air-gapped':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-950/80 border border-red-500/40 text-red-300 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Air-Gapped (Strict Zero Egress)</span>;
      case 'offline':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-300 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Offline (No Cloud Egress)</span>;
      case 'private':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Private (Local AI Only)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Normal (Hybrid Cloud/Local)</span>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6">
      {/* Top OS Header Bar */}
      <header className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Hikmah PAIOS</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">Kernel v1.0</span>
            </div>
            <p className="text-xs text-neutral-400">Personal AI Operating System • Step 25 Unified Architecture</p>
          </div>
        </div>

        {/* System State HUD */}
        <div className="flex items-center gap-3 flex-wrap">
          {getPrivacyBadge(status?.privacyMode)}
          <div className="text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {status?.health.healthyCount ?? 28}/{status?.health.totalCount ?? 28} Subsystems Active
          </div>
          <button
            onClick={() => { fetchStatus(); fetchTasks(); fetchNotifications(); }}
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
            title="Refresh System"
          >
            <RefreshCw className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-2 mb-6 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'cockpit' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" /> Universal Cockpit
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'tasks' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Personal Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('subsystems')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'subsystems' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> 24 Subsystems Health
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'notifications' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Inbox className="w-4 h-4" /> Unified Inbox ({notifications.length})
        </button>
      </nav>

      {/* Main Cockpit Tab */}
      {activeTab === 'cockpit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Universal Command Bar & Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Universal Command Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-xs text-neutral-400 font-medium uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Universal AI Command Bar
              </div>
              <form onSubmit={handleExecute} className="relative flex items-center">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Ask anything or command PAIOS (e.g. 'Deploy staging cluster', 'Review security CVEs', 'Summarize notes')..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 pr-12 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isExecuting || !commandInput.trim()}
                  className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Prompt Presets */}
              <div className="flex items-center gap-2 mt-3 flex-wrap text-xs text-neutral-400">
                <span className="text-neutral-500">Quick:</span>
                <button
                  type="button"
                  onClick={() => setCommandInput('Audit security posture and run passive recon')}
                  className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
                >
                  Security Recon
                </button>
                <button
                  type="button"
                  onClick={() => setCommandInput('Review and test all Step 25 PAIOS kernel subsystems')}
                  className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
                >
                  Subsystem Test
                </button>
                <button
                  type="button"
                  onClick={() => setCommandInput('Continue my current project objectives')}
                  className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
                >
                  Continue Project
                </button>
              </div>
            </div>

            {/* Execution Stream / Decision Records */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-sm font-semibold mb-4 flex items-center justify-between text-neutral-300">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Live Command Stream & Explainability
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {executionLog.length} Executed
                </span>
              </h2>

              {executionLog.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm border border-dashed border-neutral-800 rounded-xl">
                  No commands executed yet in this session. Try typing a command above.
                </div>
              ) : (
                <div className="space-y-4">
                  {executionLog.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-200">
                          {log.intent.primaryObjective}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono ${
                            log.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : log.status === 'blocked'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-neutral-400 text-xs">{log.output}</p>

                      {/* Structured Decision Rationale */}
                      {log.decision?.rationale && (
                        <div className="mt-2 p-2.5 bg-neutral-900/60 border border-neutral-800/80 rounded-lg text-xs font-mono text-neutral-400 space-y-1">
                          <div className="text-neutral-300 font-semibold text-[11px] uppercase tracking-wider">
                            Explainability Decision Record
                          </div>
                          <div>Rule: {log.decision.rationale.ruleSummary}</div>
                          <div>Privacy Mode: {log.decision.rationale.privacyPolicyMatched}</div>
                          <div>Assigned Agents: {log.intent.suggestedAgents.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Active Project & Privacy Switch */}
          <div className="space-y-6">
            {/* Active Project Workspace */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-neutral-300">
                  <FolderGit2 className="w-4 h-4 text-indigo-400" />
                  Active Project
                </h3>
                <span className="text-xs text-neutral-500">
                  {projects.length} Workspace{projects.length !== 1 ? 's' : ''}
                </span>
              </div>

              {activeProject ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-neutral-100">{activeProject.name}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">{activeProject.description}</p>
                  </div>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs space-y-1.5">
                    <div className="text-neutral-300 font-medium">Current Objective:</div>
                    <div className="text-neutral-400">{activeProject.currentGoal || 'None set'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500">No project selected.</div>
              )}
            </div>

            {/* Privacy Mode Switcher */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-neutral-300">
                <Shield className="w-4 h-4 text-indigo-400" />
                Privacy & Egress Controls
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Control model routing and network access across the entire PAIOS environment.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrivacyMode('normal')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    status?.privacyMode === 'normal'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Normal</div>
                  <div className="text-[10px] text-neutral-400">Cloud / Local hybrid</div>
                </button>

                <button
                  onClick={() => setPrivacyMode('private')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    status?.privacyMode === 'private'
                      ? 'bg-yellow-950/60 border-yellow-500/40 text-yellow-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Private</div>
                  <div className="text-[10px] text-neutral-400">Local AI only</div>
                </button>

                <button
                  onClick={() => setPrivacyMode('offline')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    status?.privacyMode === 'offline'
                      ? 'bg-orange-950/60 border-orange-500/40 text-orange-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Offline</div>
                  <div className="text-[10px] text-neutral-400">No network egress</div>
                </button>

                <button
                  onClick={() => setPrivacyMode('air-gapped')}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                    status?.privacyMode === 'air-gapped'
                      ? 'bg-red-950/60 border-red-500/40 text-red-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold">Air-Gapped</div>
                  <div className="text-[10px] text-neutral-400">Zero network strict</div>
                </button>
              </div>
            </div>

            {/* Connected Devices */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-neutral-300">
                <Laptop className="w-4 h-4 text-indigo-400" />
                Connected Identity & Devices
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-neutral-200">Workstation Studio</div>
                      <div className="text-[10px] text-neutral-400">Windows • Active Primary</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">CURRENT</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-neutral-400" />
                    <div>
                      <div className="font-semibold text-neutral-200">Personal iPhone 16 Pro</div>
                      <div className="text-[10px] text-neutral-400">iOS • Ready for Handoff</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subsystems Tab */}
      {activeTab === 'subsystems' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            All 24 Unified Canonical Subsystems
          </h2>
          <p className="text-xs text-neutral-400 mb-6">
            Hikmah PAIOS coordinates all 24 layers of the AI Operating System as one seamless runtime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status?.health?.subsystems &&
              Object.values(status.health.subsystems).map((sub: SubsystemResult) => (
                <div
                  key={sub.id}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-neutral-200">{sub.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono capitalize">{sub.category} • {sub.latencyMs}ms</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                    OPERATIONAL
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            AI-Native Personal Tasks
          </h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-neutral-200 text-sm">{task.title}</div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase">
                    {task.status}
                  </span>
                </div>
                <p className="text-neutral-400">{task.description}</p>
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-1 pl-2 border-l-2 border-neutral-800 pt-1">
                    {task.subtasks.map((st: any) => (
                      <div key={st.id} className="flex items-center gap-2 text-neutral-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.completed ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                        <span className={st.completed ? 'line-through text-neutral-500' : ''}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-400" />
            Unified Notification Inbox
          </h2>
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-neutral-200">
                  <span>{n.title}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-neutral-400">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
