'use client';

import React from 'react';
import { GitBranch, Layers, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function JobsPage() {
  const sampleGraph = {
    id: 'graph_sample_01',
    goal: 'Research quantum computing algorithms and persist findings',
    state: 'COMPLETED',
    nodes: [
      { id: 'n1', name: 'Decompose search query', capability: 'cap_agent_general', state: 'SUCCESS', runtime: 'VERCEL' },
      { id: 'n2', name: 'Execute multi-source web search', capability: 'cap_tool_web_search', state: 'SUCCESS', runtime: 'RENDER' },
      { id: 'n3', name: 'Deduplicate & synthesize citations', capability: 'cap_agent_general', state: 'SUCCESS', runtime: 'RENDER' },
      { id: 'n4', name: 'Persist findings to pgvector', capability: 'cap_memory_pgvector', state: 'SUCCESS', runtime: 'SUPABASE_EDGE' }
    ]
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <GitBranch className="w-6 h-6 text-[#00F0FF]" />
          <span>DAG TASK GRAPH & JOB ORCHESTRATION</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Persistent Task Dependency Graph • Restart-Resilient State Machine • Ready Node Dispatch
        </p>
      </div>

      <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4 font-mono text-xs">
        <div className="flex justify-between items-center border-b border-[#1E293B] pb-3">
          <div>
            <span className="text-[#00F0FF] font-bold">TASK GRAPH: {sampleGraph.id}</span>
            <div className="text-[#F1F5F9] text-sm font-sans font-semibold mt-1">{sampleGraph.goal}</div>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold">
            {sampleGraph.state}
          </span>
        </div>

        {/* Visual Graph Pipeline */}
        <div className="space-y-3 pt-2">
          {sampleGraph.nodes.map((n, idx) => (
            <div key={n.id} className="p-4 bg-[#0B0F17] border border-[#1E293B] rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#162032] border border-[#1E293B] flex items-center justify-center text-[#00F0FF] font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-sans font-bold text-[#F1F5F9]">{n.name}</div>
                  <div className="text-[11px] text-[#64748B]">Capability: {n.capability} • Runtime: {n.runtime}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-[10px] uppercase font-bold">{n.state}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
