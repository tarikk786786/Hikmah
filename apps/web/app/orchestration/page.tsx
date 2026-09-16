'use client';

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  Layers,
  Lock,
  FileText,
  DollarSign,
  Activity,
  Users,
  ChevronRight,
  Eye,
  Sliders,
  CheckSquare
} from 'lucide-react';
import {
  WorkflowRun,
  WorkflowTask,
  AgentDefinition,
  AgentLease,
  AgentArtifact,
  CriticReviewResult,
  AgentHandoff
} from '@/orchestration/core/types';

export default function MultiAgentOrchestrationCockpit() {
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [activeTab, setActiveTab] = useState<'dag' | 'agents' | 'approvals' | 'leases' | 'artifacts' | 'critic'>('dag');
  
  // Creation modal & form
  const [newGoal, setNewGoal] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [tokenBudget, setTokenBudget] = useState(100000);
  const [budgetLimit, setBudgetLimit] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Additional detail data
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [leases, setLeases] = useState<AgentLease[]>([]);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  // Fetch workflows list
  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/orchestration/workflows');
      if (res.ok) {
        const data = await res.json();
        const runs: WorkflowRun[] = data.workflows || [];
        setWorkflows(runs);
        if (runs.length > 0 && !selectedRunId) {
          setSelectedRunId(runs[0].id);
          setSelectedRun(runs[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch workflows', e);
    }
  };

  // Fetch details for selected run
  const fetchRunDetails = async (runId: string) => {
    if (!runId) return;
    try {
      const [wRes, aRes, lRes, artRes, appRes] = await Promise.all([
        fetch(`/api/orchestration/workflows?runId=${runId}`),
        fetch('/api/orchestration/tasks?type=agents'),
        fetch(`/api/orchestration/tasks?type=leases&runId=${runId}`),
        fetch(`/api/orchestration/tasks?type=artifacts&runId=${runId}`),
        fetch(`/api/orchestration/tasks?type=approvals&runId=${runId}`),
      ]);

      if (wRes.ok) {
        const d = await wRes.json();
        setSelectedRun(d.workflow);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAgents(d.agents || []);
      }
      if (lRes.ok) {
        const d = await lRes.json();
        setLeases(d.leases || []);
      }
      if (artRes.ok) {
        const d = await artRes.json();
        setArtifacts(d.artifacts || []);
      }
      if (appRes.ok) {
        const d = await appRes.json();
        setApprovals(d.approvals || []);
      }
    } catch (e) {
      console.error('Failed to load run details', e);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId);
    }
  }, [selectedRunId]);

  // Actions
  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/orchestration/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: newGoal,
          priority,
          budgetLimit,
          tokenBudget,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewGoal('');
        await fetchWorkflows();
        if (data.workflow?.id) {
          setSelectedRunId(data.workflow.id);
          // auto start workflow
          await fetch('/api/orchestration/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', runId: data.workflow.id }),
          });
          await fetchRunDetails(data.workflow.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleStartRun = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    try {
      await fetch('/api/orchestration/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', runId: selectedRunId }),
      });
      await fetchRunDetails(selectedRunId);
      await fetchWorkflows();
    } finally {
      setLoading(false);
    }
  };

  const handlePauseRun = async () => {
    if (!selectedRunId) return;
    await fetch('/api/orchestration/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', runId: selectedRunId }),
    });
    await fetchRunDetails(selectedRunId);
    await fetchWorkflows();
  };

  const handleResumeRun = async () => {
    if (!selectedRunId) return;
    await fetch('/api/orchestration/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', runId: selectedRunId }),
    });
    await fetchRunDetails(selectedRunId);
    await fetchWorkflows();
  };

  const handleCancelRun = async () => {
    if (!selectedRunId) return;
    await fetch('/api/orchestration/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', runId: selectedRunId, reason: 'Cancelled via Cockpit UI' }),
    });
    await fetchRunDetails(selectedRunId);
    await fetchWorkflows();
  };

  const handleApproval = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    await fetch('/api/orchestration/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approval_response',
        approvalId,
        decision,
        reviewerId: 'usr_cockpit_admin',
        comment: `Decision submitted via Cockpit UI: ${decision}`,
      }),
    });
    if (selectedRunId) {
      await fetchRunDetails(selectedRunId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-xs font-mono rounded bg-green-500/10 text-green-400 border border-green-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> COMPLETED</span>;
      case 'RUNNING':
        return <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 animate-pulse"><Activity className="w-3 h-3" /> RUNNING</span>;
      case 'PAUSED':
        return <span className="px-2 py-0.5 text-xs font-mono rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> PAUSED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 text-xs font-mono rounded bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> FAILED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-500/10 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-[#070B14] text-slate-200 overflow-hidden">
      {/* Left Column: Workflows List & Dispatch Form */}
      <div className="w-96 border-r border-[#1E293B] flex flex-col h-full bg-[#0A0F1D]">
        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#00F0FF]" />
            <h1 className="font-bold tracking-wide text-[#00F0FF] text-sm">ORCHESTRATION COCKPIT</h1>
          </div>
          <button
            onClick={() => fetchWorkflows()}
            className="p-1.5 rounded hover:bg-[#1E293B] text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Create Workflow Panel */}
        <div className="p-4 border-b border-[#1E293B] bg-[#0E1526]/60">
          <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" /> Launch Multi-Agent Goal
          </h2>
          <form onSubmit={handleCreateWorkflow} className="space-y-3">
            <textarea
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="e.g. Conduct deep research on Post-Quantum Cryptography, write secure Rust primitives, and verify with Critic..."
              rows={3}
              className="w-full bg-[#050811] border border-[#1E293B] focus:border-[#00F0FF] rounded p-2 text-xs text-slate-200 placeholder-slate-500 outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono">PRIORITY</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#050811] border border-[#1E293B] rounded p-1.5 text-xs text-slate-200 outline-none"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="LOW">LOW</option>
                  <option value="BACKGROUND">BACKGROUND</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono">BUDGET ($)</label>
                <input
                  type="number"
                  step="0.1"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(parseFloat(e.target.value))}
                  className="w-full bg-[#050811] border border-[#1E293B] rounded p-1.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating || !newGoal.trim()}
              className="w-full py-2 px-3 rounded bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/50 text-[#00F0FF] font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {creating ? 'Planning DAG & Starting...' : 'Decompose & Execute Goal'}
            </button>
          </form>
        </div>

        {/* Workflows List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
          {workflows.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No orchestration runs recorded yet.</div>
          ) : (
            workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setSelectedRunId(wf.id)}
                className={`w-full text-left p-3 transition flex flex-col gap-1.5 ${
                  selectedRunId === wf.id ? 'bg-[#00F0FF]/10 border-l-2 border-[#00F0FF]' : 'hover:bg-[#1E293B]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">{wf.id.substring(0, 16)}...</span>
                  {getStatusBadge(wf.status)}
                </div>
                <div className="text-xs text-slate-200 line-clamp-2 font-medium">{wf.goal}</div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>{wf.tasks?.length || 0} tasks</span>
                  <span>${wf.costUSD.toFixed(3)}</span>
                  <span>{wf.tokensUsed} toks</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center & Right Area: Active Workflow Inspection */}
      <div className="flex-1 flex flex-col h-full bg-[#070B14]">
        {selectedRun ? (
          <>
            {/* Top Command Bar */}
            <div className="p-4 border-b border-[#1E293B] bg-[#0A0F1D] flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{selectedRun.id}</span>
                  {getStatusBadge(selectedRun.status)}
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    PRIORITY: {selectedRun.priority}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-slate-100">{selectedRun.goal}</h2>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2">
                {selectedRun.status === 'PENDING' && (
                  <button
                    onClick={handleStartRun}
                    disabled={loading}
                    className="px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-mono text-xs flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                )}
                {selectedRun.status === 'RUNNING' && (
                  <button
                    onClick={handlePauseRun}
                    className="px-3 py-1.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-mono text-xs flex items-center gap-1.5 transition"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {selectedRun.status === 'PAUSED' && (
                  <button
                    onClick={handleResumeRun}
                    className="px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-mono text-xs flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                {(selectedRun.status === 'RUNNING' || selectedRun.status === 'PAUSED' || selectedRun.status === 'PENDING') && (
                  <button
                    onClick={handleCancelRun}
                    className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-mono text-xs flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Metrics HUD Row */}
            <div className="grid grid-cols-4 border-b border-[#1E293B] bg-[#0C1222] divide-x divide-[#1E293B] text-xs font-mono">
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Cost / Limit</span>
                <span className="text-slate-200">${selectedRun.costUSD.toFixed(3)} / ${selectedRun.budgetLimitUSD.toFixed(2)}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-cyan-400" /> Tokens Used</span>
                <span className="text-slate-200">{selectedRun.tokensUsed.toLocaleString()} / {selectedRun.tokenBudget.toLocaleString()}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-purple-400" /> Tasks</span>
                <span className="text-slate-200">{selectedRun.tasks?.filter(t => t.status === 'COMPLETED').length || 0} / {selectedRun.tasks?.length || 0}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-amber-400" /> Active Leases</span>
                <span className="text-slate-200">{leases.length} Held</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#1E293B] bg-[#090E1B] text-xs font-mono">
              <button
                onClick={() => setActiveTab('dag')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'dag' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <GitBranch className="w-4 h-4" /> Task Graph DAG ({selectedRun.tasks?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'agents' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> Agents Registry ({agents.length})
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'approvals' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" /> Approvals ({approvals.length})
              </button>
              <button
                onClick={() => setActiveTab('leases')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'leases' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4" /> Leases ({leases.length})
              </button>
              <button
                onClick={() => setActiveTab('artifacts')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'artifacts' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" /> Artifact Bus ({artifacts.length})
              </button>
              <button
                onClick={() => setActiveTab('critic')}
                className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'critic' ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" /> Critic & Synthesis
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: DAG Task Graph */}
              {activeTab === 'dag' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-mono text-slate-400 tracking-wider">Topological Task Execution Nodes</h3>
                    <span className="text-xs font-mono text-slate-500">Cycle-Free Directed Acyclic Graph</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedRun.tasks?.map((task, idx) => (
                      <div
                        key={task.id}
                        className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-4 flex flex-col gap-2 hover:border-[#00F0FF]/40 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#1E293B] text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm text-slate-100">{task.title}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
                              {task.assignedAgent}
                            </span>
                          </div>
                          {getStatusBadge(task.status)}
                        </div>
                        <p className="text-xs text-slate-400 pl-8">{task.description}</p>
                        
                        {/* Dependencies & outputs */}
                        <div className="pl-8 pt-2 flex items-center gap-4 text-[10px] font-mono text-slate-500 border-t border-[#1E293B]/60 mt-1">
                          <span>Dependencies: {task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None (Root Node)'}</span>
                          <span>Tokens: {task.tokensUsed || 0}</span>
                          <span>Cost: ${(task.costUSD || 0).toFixed(3)}</span>
                        </div>

                        {task.output && (
                          <div className="ml-8 mt-2 p-2.5 rounded bg-[#070B14] border border-[#1E293B] font-mono text-xs text-emerald-300 overflow-x-auto max-h-36">
                            <pre>{JSON.stringify(task.output, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Agents Registry */}
              {activeTab === 'agents' && (
                <div className="grid grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#00F0FF]">{agent.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          {agent.modelTier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{agent.description}</p>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-slate-400">ALLOWED TOOLS:</span>
                        <div className="flex flex-wrap gap-1">
                          {(agent.allowedTools || []).map((t) => (
                            <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Approvals */}
              {activeTab === 'approvals' && (
                <div className="space-y-3">
                  {approvals.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No pending human-in-the-loop approvals.</div>
                  ) : (
                    approvals.map((app) => (
                      <div key={app.id} className="bg-[#0D1424] border border-amber-500/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span className="font-semibold text-sm text-slate-100">{app.actionName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              RISK: {app.riskLevel}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">Status: {app.status}</span>
                        </div>
                        <p className="text-xs text-slate-300">{app.description}</p>
                        <div className="p-2 rounded bg-[#070B14] border border-[#1E293B] font-mono text-xs text-slate-400">
                          <pre>{JSON.stringify(app.proposedPayload, null, 2)}</pre>
                        </div>
                        {app.status === 'PENDING' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleApproval(app.id, 'REJECTED')}
                              className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-mono text-xs"
                            >
                              Reject Action
                            </button>
                            <button
                              onClick={() => handleApproval(app.id, 'APPROVED')}
                              className="px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-mono text-xs"
                            >
                              Approve & Continue
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: Leases */}
              {activeTab === 'leases' && (
                <div className="space-y-3">
                  {leases.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No active distributed resource locks held.</div>
                  ) : (
                    leases.map((lease) => (
                      <div key={lease.leaseId} className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-3 flex items-center justify-between font-mono text-xs">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="text-slate-200 font-semibold">{lease.resourceId}</div>
                            <div className="text-[10px] text-slate-400">{lease.resourceType} • Held by {lease.holderAgentId || lease.agentId}</div>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          <div>Expires: {new Date(lease.expiresAt).toLocaleTimeString()}</div>
                          <span className="text-cyan-400">{lease.leaseType}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: Artifacts */}
              {activeTab === 'artifacts' && (
                <div className="grid grid-cols-2 gap-4">
                  {artifacts.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-slate-500">No artifacts published yet for this workflow.</div>
                  ) : (
                    artifacts.map((art) => (
                      <div key={art.artifactId || art.id} className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-4 space-y-2 font-mono">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-100 font-semibold">{art.name}</span>
                          <span className="text-[10px] text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                            {art.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Produced by: {art.producerAgent} • Size: {art.sizeBytes} bytes
                        </div>
                        {art.storageKey && (
                          <div className="text-[10px] text-cyan-400 truncate">
                            Key: {art.storageKey}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 6: Critic Review & Final Synthesis */}
              {activeTab === 'critic' && (
                <div className="space-y-6">
                  {/* Synthesis Result */}
                  <div className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-5 space-y-3">
                    <h3 className="text-xs uppercase font-mono text-[#00F0FF] flex items-center gap-1.5 tracking-wider font-semibold">
                      <Sparkles className="w-4 h-4" /> Synthesized Response
                    </h3>
                    {selectedRun.finalResult ? (
                      <div className="p-4 rounded bg-[#070B14] border border-[#1E293B] text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                        {typeof selectedRun.finalResult === 'string'
                          ? selectedRun.finalResult
                          : JSON.stringify(selectedRun.finalResult, null, 2)}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Synthesis pending completion of verified tasks.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <GitBranch className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-300">Select or Launch an Orchestration Workflow</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Enter a high-level goal in the left panel to decompose tasks into a topological DAG, assign specialized agents, and execute with deterministic verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
