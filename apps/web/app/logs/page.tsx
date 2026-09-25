'use client';

import React, { useState } from 'react';
import { Terminal, Search } from 'lucide-react';

export default function LogsPage() {
  const [filter, setFilter] = useState('');

  const sampleLogs = [
    { id: '1', time: new Date().toLocaleTimeString(), event: 'HIKMAH_CORE_BOOTSTRAP', risk: 'LOW', reqId: 'req_init01', details: 'All 6 subsystems initialized' },
    { id: '2', time: new Date().toLocaleTimeString(), event: 'ROUTER_PROVIDER_DISCOVERY', risk: 'LOW', reqId: 'req_init02', details: 'Registered 5 providers with fallback cascade' },
    { id: '3', time: new Date().toLocaleTimeString(), event: 'TOOL_REGISTRY_SYNC', risk: 'LOW', reqId: 'req_init03', details: '4 foundational tool adapters bound' },
    { id: '4', time: new Date().toLocaleTimeString(), event: 'MEMORY_STORE_INDEX', risk: 'LOW', reqId: 'req_init04', details: 'pgvector memory table loaded' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Terminal className="w-6 h-6 text-[#00F0FF]" />
          <span>STRUCTURED AUDIT LOGS & TRACING</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Correlation IDs (request_id, conversation_id, agent_run_id, job_id) • Full Audit Trail
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 font-mono text-xs space-y-2">
        <div className="text-[#64748B] border-b border-[#1E293B] pb-2 flex justify-between">
          <span>REAL-TIME AUDIT STREAM</span>
          <span>CORRELATION ENGINE: ACTIVE</span>
        </div>
        <div className="space-y-2 pt-2">
          {sampleLogs.map(l => (
            <div key={l.id} className="p-2.5 bg-[#0B0F17] rounded border border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-[#64748B]">{l.time}</span>
                <span className="text-[#00F0FF] font-bold">{l.event}</span>
                <span className="text-[#94A3B8]">{l.details}</span>
              </div>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                {l.reqId}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
