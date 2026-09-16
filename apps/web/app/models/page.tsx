'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  Clock,
  Eye,
  Wrench,
  Brain,
  FileCode,
  Radio
} from 'lucide-react';

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  type: string;
  role: string;
  contextWindow: string;
  latencyClass: string;
  inputCost: string;
  outputCost: string;
  priority: number;
  capabilities: {
    tools: boolean;
    vision: boolean;
    reasoning: boolean;
    json: boolean;
    streaming: boolean;
  };
  enabled: boolean;
}

export default function ModelsPage() {
  const [activePolicy, setActivePolicy] = useState<string>('BALANCED');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const models: ModelItem[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o Omnimodel',
      provider: 'OpenAI',
      type: 'CHAT',
      role: 'reasoning',
      contextWindow: '128K',
      latencyClass: 'LOW',
      inputCost: '$2.50',
      outputCost: '$10.00',
      priority: 90,
      capabilities: { tools: true, vision: true, reasoning: true, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      type: 'FAST',
      role: 'fast',
      contextWindow: '128K',
      latencyClass: 'ULTRA_LOW',
      inputCost: '$0.15',
      outputCost: '$0.60',
      priority: 85,
      capabilities: { tools: true, vision: true, reasoning: false, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'o3-mini',
      name: 'o3-mini Reasoning',
      provider: 'OpenAI',
      type: 'REASONING',
      role: 'reasoning',
      contextWindow: '200K',
      latencyClass: 'MEDIUM',
      inputCost: '$1.10',
      outputCost: '$4.40',
      priority: 95,
      capabilities: { tools: true, vision: false, reasoning: true, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      provider: 'Anthropic',
      type: 'REASONING',
      role: 'reasoning',
      contextWindow: '200K',
      latencyClass: 'LOW',
      inputCost: '$3.00',
      outputCost: '$15.00',
      priority: 98,
      capabilities: { tools: true, vision: true, reasoning: true, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'claude-3-5-haiku',
      name: 'Claude 3.5 Haiku',
      provider: 'Anthropic',
      type: 'FAST',
      role: 'fast',
      contextWindow: '200K',
      latencyClass: 'ULTRA_LOW',
      inputCost: '$0.80',
      outputCost: '$4.00',
      priority: 88,
      capabilities: { tools: true, vision: false, reasoning: false, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'Google Gemini',
      type: 'FAST',
      role: 'fast',
      contextWindow: '1.0M',
      latencyClass: 'ULTRA_LOW',
      inputCost: '$0.15',
      outputCost: '$0.60',
      priority: 92,
      capabilities: { tools: true, vision: true, reasoning: true, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google Gemini',
      type: 'REASONING',
      role: 'reasoning',
      contextWindow: '2.0M',
      latencyClass: 'LOW',
      inputCost: '$1.25',
      outputCost: '$5.00',
      priority: 94,
      capabilities: { tools: true, vision: true, reasoning: true, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'llama3.3:8b',
      name: 'Llama 3.3 8B (Local)',
      provider: 'Ollama',
      type: 'LOCAL',
      role: 'local',
      contextWindow: '128K',
      latencyClass: 'LOW',
      inputCost: '$0.00',
      outputCost: '$0.00',
      priority: 80,
      capabilities: { tools: true, vision: false, reasoning: false, json: true, streaming: true },
      enabled: true
    },
    {
      id: 'mock-chat-v1',
      name: 'Mock Resilient Fallback',
      provider: 'Mock Engine',
      type: 'FALLBACK',
      role: 'fallback',
      contextWindow: '32K',
      latencyClass: 'ULTRA_LOW',
      inputCost: '$0.00',
      outputCost: '$0.00',
      priority: 10,
      capabilities: { tools: true, vision: true, reasoning: true, json: true, streaming: true },
      enabled: true
    }
  ];

  const circuitStatus = [
    { provider: 'OpenAI Gateway', state: 'HEALTHY', failures: 0, latency: '420ms' },
    { provider: 'Anthropic Gateway', state: 'HEALTHY', failures: 0, latency: '680ms' },
    { provider: 'Google Gemini Gateway', state: 'HEALTHY', failures: 0, latency: '310ms' },
    { provider: 'Ollama Local Runtime', state: 'HEALTHY', failures: 0, latency: '95ms' },
    { provider: 'Mock Fallback Engine', state: 'HEALTHY', failures: 0, latency: '<1ms' }
  ];

  const filtered = models.filter((m) => {
    const matchQuery = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'ALL' || m.role.toLowerCase() === roleFilter.toLowerCase();
    return matchQuery && matchRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E293B] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3 font-mono">
            <Cpu className="w-7 h-7 text-[#00F0FF]" />
            <span>AI MODEL REGISTRY & ROUTER</span>
          </h1>
          <p className="text-sm text-[#94A3B8] font-mono mt-1">
            Capability-Matching Engine • 5-State Circuit Breakers • Dynamic Fallback Cascade
          </p>
        </div>

        {/* Active Policy Selector */}
        <div className="flex items-center space-x-2 bg-[#0F172A] border border-[#1E293B] rounded-lg p-1.5 font-mono text-xs">
          <span className="text-[#64748B] px-2 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-[#00F0FF]" /> POLICY:
          </span>
          {['BALANCED', 'QUALITY_FIRST', 'SPEED_FIRST', 'COST_FIRST', 'LOCAL_FIRST'].map((policy) => (
            <button
              key={policy}
              onClick={() => setActivePolicy(policy)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                activePolicy === policy
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {policy.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Circuit Breaker Status Bar */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4" />
          <span>CIRCUIT BREAKER HEALTH STATUS</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {circuitStatus.map((c) => (
            <div key={c.provider} className="p-3 bg-[#111827] border border-[#1E293B] rounded-lg font-mono text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[#F1F5F9] text-[11px] font-bold truncate">{c.provider}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/30">
                  {c.state}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>Failures: {c.failures}</span>
                <span className="text-[#00F0FF]">{c.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center font-mono text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          {['ALL', 'FAST', 'REASONING', 'LOCAL', 'FALLBACK'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded text-[11px] border ${
                roleFilter === role
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                  : 'bg-[#111827] text-[#94A3B8] border-[#1E293B] hover:text-[#F1F5F9]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="p-5 bg-[#111827] border border-[#1E293B] hover:border-[#00F0FF]/40 transition rounded-xl font-mono space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider">{m.provider}</span>
                <h3 className="text-sm font-bold text-[#F1F5F9]">{m.name}</h3>
                <code className="text-[11px] text-[#00F0FF]">{m.id}</code>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/30">
                {m.type}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#1E293B] text-[10px]">
              <div>
                <div className="text-[#64748B]">Context</div>
                <div className="text-[#F1F5F9] font-bold">{m.contextWindow}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Latency</div>
                <div className="text-emerald-400 font-bold">{m.latencyClass}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Cost / 1M</div>
                <div className="text-[#F1F5F9] font-bold">{m.inputCost}</div>
              </div>
            </div>

            {/* Capability Badges */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {m.capabilities.tools && (
                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-emerald-400 flex items-center gap-1">
                  <Wrench className="w-2.5 h-2.5" /> Tools
                </span>
              )}
              {m.capabilities.vision && (
                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-purple-400 flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5" /> Vision
                </span>
              )}
              {m.capabilities.reasoning && (
                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-amber-400 flex items-center gap-1">
                  <Brain className="w-2.5 h-2.5" /> Reasoning
                </span>
              )}
              {m.capabilities.json && (
                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-sky-400 flex items-center gap-1">
                  <FileCode className="w-2.5 h-2.5" /> JSON
                </span>
              )}
              {m.capabilities.streaming && (
                <span className="px-1.5 py-0.5 rounded bg-[#1E293B] text-cyan-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Stream
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
