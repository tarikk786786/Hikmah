'use client';

import React from 'react';
import { FolderKanban, Plus, Clock } from 'lucide-react';

export default function ProjectsPage() {
  const projects = [
    { id: 'p1', name: 'JARVIS AI Operating System', desc: 'Phase 1 modular foundation with Model Router, pgvector, MCP and BullMQ workers.', status: 'Active', tasks: 12 },
    { id: 'p2', name: 'OpenHands Sandbox Integration', desc: 'Step 11 coding agent worker environment for repository analysis and test automation.', status: 'Planned', tasks: 4 },
    { id: 'p3', name: 'Browser-Use Playwright Worker', desc: 'Step 10 browser agent worker for authenticated session workflows.', status: 'Planned', tasks: 6 }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <FolderKanban className="w-6 h-6 text-[#00F0FF]" />
          <span>PROJECTS & WORKSPACE SCOPES</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Scoped Project Memories • Context Sandboxing • Multi-Task Organization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <h2 className="text-sm font-bold text-[#F1F5F9]">{p.name}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">{p.desc}</p>
            </div>
            <div className="pt-3 border-t border-[#1E293B] flex justify-between items-center text-xs font-mono text-[#64748B]">
              <span>Tasks: {p.tasks}</span>
              <span className="text-[#00F0FF]">Inspect Scope →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
