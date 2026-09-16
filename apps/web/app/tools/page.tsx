'use client';

import React, { useEffect, useState } from 'react';
import { Wrench, Shield, Play, Terminal } from 'lucide-react';

interface Tool {
  name: string;
  version: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  timeoutMs: number;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('calculator');
  const [testInput, setTestInput] = useState<string>('{"expression": "42 * 100"}');
  const [testResult, setTestResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch('/api/tools')
      .then(res => res.json())
      .then(data => setTools(data.tools || []))
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setRunning(true);
    setTestResult(null);
    try {
      const parsedInput = JSON.parse(testInput);
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedTool, input: parsedInput })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Wrench className="w-6 h-6 text-[#00F0FF]" />
          <span>TOOL REGISTRY & MCP ADAPTERS</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Dynamic Tool Discovery • Granular Risk Levels • Execution Playground
        </p>
      </div>

      {/* Tools Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0B0F17] text-[#64748B] border-b border-[#1E293B]">
            <tr>
              <th className="p-4">TOOL NAME</th>
              <th className="p-4">VERSION</th>
              <th className="p-4">DESCRIPTION</th>
              <th className="p-4">RISK LEVEL</th>
              <th className="p-4">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {tools.map((t) => (
              <tr key={t.name} className="hover:bg-[#162032] transition">
                <td className="p-4 text-[#00F0FF] font-semibold">{t.name}</td>
                <td className="p-4 text-[#94A3B8]">v{t.version}</td>
                <td className="p-4 text-[#F1F5F9] font-sans">{t.description}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded border text-[10px] ${getRiskBadge(t.risk)}`}>
                    {t.risk}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-emerald-400">ENABLED</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tool Tester Playground */}
      <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
          <Play className="w-4 h-4" />
          <span>TOOL EXECUTION PLAYGROUND</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-[#94A3B8] font-mono">Select Tool:</label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] text-xs font-mono"
            >
              {tools.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs text-[#94A3B8] font-mono">Input JSON Payload:</label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] text-xs font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleTest}
          disabled={running}
          className="px-5 py-2 bg-[#00F0FF] hover:bg-[#00D0DF] disabled:opacity-50 text-[#0B0F17] font-semibold text-xs rounded-lg transition"
        >
          {running ? 'Executing...' : 'Run Tool'}
        </button>

        {testResult && (
          <div className="mt-4 p-4 bg-[#0B0F17] rounded-lg border border-[#1E293B] text-xs font-mono">
            <span className="text-[#64748B]">Output:</span>
            <pre className="mt-2 text-[#00F0FF] overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
