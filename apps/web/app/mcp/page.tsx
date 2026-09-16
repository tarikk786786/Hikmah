'use client';

import React, { useState } from 'react';
import { Network, CheckCircle, RefreshCw, Radio, Server, Shield } from 'lucide-react';

export default function MCPPage() {
  const [servers, setServers] = useState([
    { id: 'mcp_fs', name: 'Filesystem MCP Server', transport: 'stdio', toolsCount: 8, status: 'CONNECTED', health: 'HEALTHY' },
    { id: 'mcp_github', name: 'GitHub MCP Server', transport: 'stdio', toolsCount: 14, status: 'CONNECTED', health: 'HEALTHY' },
    { id: 'mcp_browser', name: 'Playwright Browser MCP', transport: 'sse', toolsCount: 12, status: 'STANDBY', health: 'HEALTHY' },
    { id: 'mcp_dev', name: 'Chrome DevTools MCP', transport: 'sse', toolsCount: 18, status: 'CONNECTED', health: 'HEALTHY' }
  ]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Network className="w-6 h-6 text-[#00F0FF]" />
          <span>MODEL CONTEXT PROTOCOL (MCP) MATRIX</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Standardized Tool Transport • Zero-Trust Permission Check • Universal Registry Bridge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map(s => (
          <div key={s.id} className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#00F0FF]/10 text-[#00F0FF] rounded-lg border border-[#00F0FF]/30">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#F1F5F9]">{s.name}</h2>
                  <span className="text-[11px] text-[#64748B] font-mono">Transport: {s.transport}</span>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {s.status}
              </span>
            </div>

            <div className="pt-3 border-t border-[#1E293B] flex justify-between items-center text-xs font-mono">
              <span className="text-[#64748B]">Bridged Tools: <span className="text-[#00F0FF]">{s.toolsCount} exposed</span></span>
              <span className="text-[#64748B]">Health: <span className="text-emerald-400">{s.health}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
