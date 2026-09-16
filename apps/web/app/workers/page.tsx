'use client';

import React from 'react';
import { Server, Cpu, Activity, Globe, Shield } from 'lucide-react';

export default function WorkersPage() {
  const workers = [
    { name: 'GeneralWorker', runtime: 'RENDER', load: 'IDLE', capabilities: 'Task planning, goal coordination' },
    { name: 'ResearchWorker', runtime: 'RENDER', load: 'IDLE', capabilities: 'Deep web search, multi-source synthesis, crawling' },
    { name: 'BrowserWorker', runtime: 'RENDER / DOCKER', load: 'IDLE', capabilities: 'Playwright headless browser execution, DOM interaction' },
    { name: 'DocumentWorker', runtime: 'RENDER', load: 'IDLE', capabilities: 'Document parsing, OCR, vector chunking' },
    { name: 'CodingWorker', runtime: 'DOCKER', load: 'STANDBY', capabilities: 'OpenHands coding sandbox, git operations' },
    { name: 'SecurityWorker', runtime: 'DOCKER', load: 'STANDBY', capabilities: 'Authorized scope reconnaissance, vulnerability scanning' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Server className="w-6 h-6 text-[#00F0FF]" />
          <span>WORKER HARNESS & RUNTIME ROUTING</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Durable Render & Docker Workers • Serverless Timeout Prevention • Task Isolation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workers.map(w => (
          <div key={w.name} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#F1F5F9]">{w.name}</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                {w.load}
              </span>
            </div>
            <div className="text-[#64748B]">Assigned Runtime: <span className="text-amber-400">{w.runtime}</span></div>
            <p className="text-[#94A3B8] text-[11px] font-sans">{w.capabilities}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
