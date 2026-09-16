'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  Clock,
  ShieldCheck,
  Brain,
  Workflow,
  FileText,
  Database,
  RefreshCw,
  Power
} from 'lucide-react';

interface EngineCard {
  id: string;
  name: string;
  role: string;
  status: 'BUILT_IN' | 'CONFIGURED' | 'HEALTHY' | 'DEGRADED' | 'DISABLED';
  latencyMs: number;
  recordCount: number;
  classifications: string[];
  enabled: boolean;
  description: string;
}

const INITIAL_ENGINES: EngineCard[] = [
  {
    id: 'native-supabase',
    name: 'Native Supabase & pgvector',
    role: 'CORE / FALLBACK MEMORY ENGINE',
    status: 'BUILT_IN',
    latencyMs: 1,
    recordCount: 2,
    classifications: ['PROJECT', 'TASK', 'EPISODIC', 'GENERAL'],
    enabled: true,
    description: 'PostgreSQL 16 relational storage with pgvector cosine similarity ranking. Always available zero-dependency fallback.'
  },
  {
    id: 'mem0',
    name: 'Mem0',
    role: 'USER & PERSONALITY LAYER',
    status: 'HEALTHY',
    latencyMs: 3,
    recordCount: 1,
    classifications: ['PREFERENCE', 'USER'],
    enabled: true,
    description: 'Extracts and indexes user preferences, communication tone, and identity traits.'
  },
  {
    id: 'graphiti',
    name: 'Graphiti',
    role: 'TEMPORAL & RELATIONSHIP GRAPH',
    status: 'HEALTHY',
    latencyMs: 4,
    recordCount: 1,
    classifications: ['TEMPORAL', 'EVENT', 'RELATIONSHIP'],
    enabled: true,
    description: 'Maintains evolving facts over time with validity windows (validFrom/validTo) and change history.'
  },
  {
    id: 'letta',
    name: 'Letta',
    role: 'STATEFUL AGENT MEMORY',
    status: 'HEALTHY',
    latencyMs: 3,
    recordCount: 1,
    classifications: ['AGENT', 'WORKING', 'TASK'],
    enabled: true,
    description: 'Persistent agent state, task checkpoints, and MemFS memory filesystem blocks.'
  },
  {
    id: 'cognee',
    name: 'Cognee',
    role: 'KNOWLEDGE GRAPH & ENTITIES',
    status: 'HEALTHY',
    latencyMs: 5,
    recordCount: 1,
    classifications: ['KNOWLEDGE', 'ENTITY', 'RELATIONSHIP'],
    enabled: true,
    description: 'Multi-source document entity extraction, conceptual links, and associative graph querying.'
  },
  {
    id: 'langmem',
    name: 'LangMem',
    role: 'PROCEDURAL & LEARNED PATTERNS',
    status: 'HEALTHY',
    latencyMs: 2,
    recordCount: 1,
    classifications: ['PROCEDURAL'],
    enabled: true,
    description: 'Captures user corrections, coding conventions, and successful workflow execution patterns.'
  },
  {
    id: 'supermemory',
    name: 'Supermemory',
    role: 'LARGE-SCALE DOCUMENT / WEB CORPUS',
    status: 'HEALTHY',
    latencyMs: 6,
    recordCount: 1,
    classifications: ['DOCUMENT'],
    enabled: true,
    description: 'Optimized chunking and semantic retrieval for large research papers, PDFs, and scraped web pages.'
  }
];

export default function MemoryProvidersPage() {
  const [engines, setEngines] = useState<EngineCard[]>(INITIAL_ENGINES);
  const [notification, setNotification] = useState<string | null>(null);

  const toggleEngine = (id: string) => {
    if (id === 'native-supabase') {
      setNotification('Native Supabase is the mandatory fallback engine and cannot be disabled.');
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    setEngines((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextState = !e.enabled;
          setNotification(`Engine [${e.name}] is now ${nextState ? 'ENABLED' : 'DISABLED'}.`);
          setTimeout(() => setNotification(null), 3500);
          return {
            ...e,
            enabled: nextState,
            status: nextState ? 'HEALTHY' : 'DISABLED'
          };
        }
        return e;
      })
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#64748B] mb-2">
            <Link href="/memory" className="hover:text-[#00F0FF] flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>MEMORY CONSOLE</span>
            </Link>
            <span>/</span>
            <span className="text-[#94A3B8]">ENGINE PROVIDERS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Server className="w-7 h-7 text-[#00F0FF]" />
            <span>MEMORY ENGINE CONTROLS & TELEMETRY</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Real-time health, latency metrics, and dispatch control for all 7 memory backends.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] px-4 py-2 rounded-xl flex items-center space-x-3 text-xs">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-[#94A3B8]">Router Mode: <strong className="text-[#F1F5F9]">Multi-Engine Active</strong></span>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-[#111827] border border-[#00F0FF]/30 rounded-xl text-xs text-[#00F0FF] flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#00F0FF] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Architecture Notice Box */}
      <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-[#00F0FF] font-bold tracking-wider">
          <Layers className="w-4 h-4" />
          <span>FREE-FIRST DEPLOYMENT PHILOSOPHY</span>
        </div>
        <p className="text-[#94A3B8] leading-relaxed">
          Hikmah avoids running redundant databases simultaneously. Each engine is dedicated to a distinct
          cognitive role. If an external engine is offline or disabled, the <strong>Memory Router</strong> automatically
          cascades queries and writes to <strong>Native Supabase</strong> without disrupting the assistant.
        </p>
      </div>

      {/* Engine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {engines.map((e) => (
          <div
            key={e.id}
            className={`p-5 bg-[#111827] border rounded-xl space-y-4 transition ${
              e.enabled ? 'border-[#1E293B] hover:border-[#00F0FF]/40' : 'border-[#1E293B]/40 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-[#64748B] block">{e.role}</span>
                <h2 className="text-base font-bold text-[#F1F5F9]">{e.name}</h2>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  e.status === 'BUILT_IN'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : e.status === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                }`}
              >
                {e.status}
              </span>
            </div>

            <p className="text-[#94A3B8] text-xs leading-relaxed">{e.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#1E293B]">
              <div className="p-2 bg-[#0A0F1D] rounded border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] block">LATENCY</span>
                <span className="font-semibold text-emerald-400">{e.latencyMs}ms</span>
              </div>
              <div className="p-2 bg-[#0A0F1D] rounded border border-[#1E293B]">
                <span className="text-[10px] text-[#64748B] block">RECORDS</span>
                <span className="font-semibold text-[#F1F5F9]">{e.recordCount} indexed</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] text-[#64748B] block">PRIMARY CLASSIFICATIONS</span>
              <div className="flex flex-wrap gap-1">
                {e.classifications.map((c) => (
                  <span
                    key={c}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#0A0F1D] text-[#94A3B8] border border-[#1E293B]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-[#1E293B]">
              <span className="text-[10px] text-[#64748B]">
                {e.id === 'native-supabase' ? 'Core Permanent' : e.enabled ? 'Active In Router' : 'Bypassed'}
              </span>

              <button
                onClick={() => toggleEngine(e.id)}
                disabled={e.id === 'native-supabase'}
                className={`px-3 py-1 rounded text-xs font-bold border transition flex items-center space-x-1.5 ${
                  e.id === 'native-supabase'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 cursor-not-allowed'
                    : e.enabled
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Power className="w-3 h-3" />
                <span>{e.id === 'native-supabase' ? 'Locked' : e.enabled ? 'Disable' : 'Enable'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
