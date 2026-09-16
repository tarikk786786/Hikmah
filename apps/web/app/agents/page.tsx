'use client';

import React, { useState } from 'react';
import { Bot, Play, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AgentsPage() {
  const [activeAgent, setActiveAgent] = useState('general');
  const [goal, setGoal] = useState('');
  const [runs, setRuns] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || running) return;

    setRunning(true);
    const runId = `run_${Date.now()}`;
    const newRun = {
      id: runId,
      agentType: activeAgent,
      goal,
      status: 'running',
      startedAt: new Date().toLocaleTimeString()
    };
    setRuns(prev => [newRun, ...prev]);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeAgent === 'research' ? 'research_task' : 'agent_task',
          payload: { goal, topic: goal }
        })
      });
      const data = await res.json();
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'completed', result: data.result || 'Executed successfully' } : r));
    } catch (err: any) {
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'failed', error: err.message } : r));
    } finally {
      setRunning(false);
      setGoal('');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Bot className="w-6 h-6 text-[#00F0FF]" />
          <span>AUTONOMOUS AGENTS & DISPATCHER</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Multi-Step Agent Workflows • Plan & Validate Lifecycle • Render Worker Execution
        </p>
      </div>

      {/* Agents Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'general', title: 'General Reasoning Agent', desc: 'Step planner, tool caller, and cognitive task synthesizer.' },
          { id: 'research', title: 'Deep Research Agent', desc: 'Decomposes queries, gathers sources, and stores verified knowledge.' },
          { id: 'document', title: 'Document Agent', desc: 'Workspace file reader, content chunker, and summarizer.' }
        ].map(ag => (
          <div
            key={ag.id}
            onClick={() => setActiveAgent(ag.id)}
            className={`p-5 rounded-xl border cursor-pointer transition ${
              activeAgent === ag.id
                ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                : 'bg-[#111827] border-[#1E293B] hover:border-[#64748B]'
            }`}
          >
            <h3 className="text-sm font-bold text-[#F1F5F9]">{ag.title}</h3>
            <p className="text-xs text-[#94A3B8] mt-1.5">{ag.desc}</p>
          </div>
        ))}
      </div>

      {/* Agent Dispatch Form */}
      <form onSubmit={handleRun} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3">
        <span className="text-xs font-mono text-[#00F0FF]">DISPATCH {activeAgent.toUpperCase()} AGENT</span>
        <div className="flex gap-3">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={`Enter goal for ${activeAgent} agent...`}
            className="flex-1 bg-[#0B0F17] text-[#F1F5F9] px-4 py-2.5 rounded-lg border border-[#1E293B] text-xs focus:outline-none focus:border-[#00F0FF]/50"
          />
          <button
            type="submit"
            disabled={running || !goal.trim()}
            className="px-5 py-2.5 bg-[#00F0FF] hover:bg-[#00D0DF] disabled:opacity-50 text-[#0B0F17] font-semibold text-xs rounded-lg transition flex items-center space-x-2"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Launch Run</span>
          </button>
        </div>
      </form>

      {/* Runs History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#64748B] font-mono">AGENT EXECUTION RUNS</h2>
        {runs.map(run => (
          <div key={run.id} className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-[#00F0FF] font-bold">RUN: {run.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {run.status}
              </span>
            </div>
            <p className="text-[#F1F5F9] font-sans text-sm">{run.goal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
