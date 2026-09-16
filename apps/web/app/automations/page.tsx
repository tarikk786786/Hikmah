'use client';

import React from 'react';
import { Zap, Clock, Plus, Play } from 'lucide-react';

export default function AutomationsPage() {
  const automations = [
    { id: 'auto_01', name: 'Morning Research Briefing', trigger: 'Cron (0 8 * * *)', action: 'ResearchAgent -> memory_store', enabled: true },
    { id: 'auto_02', name: 'Repository Health Audit', trigger: 'Event (git:push)', action: 'CodingAgent -> file_read', enabled: true },
    { id: 'auto_03', name: 'Vector Memory Cleanup', trigger: 'Cron (0 0 * * 0)', action: 'MemoryStore -> prune', enabled: false }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Zap className="w-6 h-6 text-[#00F0FF]" />
            <span>AUTOMATION & SCHEDULED WORKFLOWS</span>
          </h1>
          <p className="text-sm text-[#94A3B8] font-mono mt-1">
            Cron Schedules • Event-Driven Triggers • Autonomous Workflows
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {automations.map(a => (
          <div key={a.id} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl flex items-center justify-between font-mono text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-[#F1F5F9] font-sans">{a.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${a.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400'}`}>
                  {a.enabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div className="text-[#64748B] flex items-center space-x-4">
                <span>Trigger: <span className="text-[#00F0FF]">{a.trigger}</span></span>
                <span>Action: <span className="text-amber-400">{a.action}</span></span>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] text-[#F1F5F9] rounded-lg transition flex items-center space-x-1.5">
              <Play className="w-3.5 h-3.5" />
              <span>Trigger Now</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
