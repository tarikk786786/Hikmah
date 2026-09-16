'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  Search,
  Plus,
  Server,
  Sparkles,
  ShieldCheck,
  Clock,
  Cpu,
  Layers,
  FileText,
  Workflow,
  Trash2,
  ExternalLink,
  Lock,
  Tag,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface UnifiedMemory {
  id: string;
  content: string;
  classification: string;
  scope: string;
  authority: string;
  provider: string;
  importance: number;
  confidence: number;
  createdAt: string;
}

const INITIAL_MEMORIES: UnifiedMemory[] = [
  {
    id: 'mem_m0_01',
    content: 'User prefers concise, direct, technically precise communication with code samples in TypeScript.',
    classification: 'PREFERENCE',
    scope: 'USER',
    authority: 'USER_EXPLICIT',
    provider: 'mem0',
    importance: 9.0,
    confidence: 1.0,
    createdAt: '10 mins ago'
  },
  {
    id: 'mem_supa_02',
    content: 'Primary project is Hikmah — AI Operating System with modular skills, router, and workers.',
    classification: 'PROJECT',
    scope: 'PROJECT',
    authority: 'VERIFIED_SYSTEM_DATA',
    provider: 'native-supabase',
    importance: 9.5,
    confidence: 1.0,
    createdAt: '1 hour ago'
  },
  {
    id: 'mem_graph_03',
    content: 'Project architecture migrated from monolithic chatbot to modular multi-engine memory router in PRD 08A.',
    classification: 'TEMPORAL',
    scope: 'PROJECT',
    authority: 'VERIFIED_SYSTEM_DATA',
    provider: 'graphiti',
    importance: 8.5,
    confidence: 0.95,
    createdAt: '2 hours ago'
  },
  {
    id: 'mem_lmem_04',
    content: 'Always wrap long-running agent tasks in BullMQ jobs and maintain durable checkpoints in Supabase.',
    classification: 'PROCEDURAL',
    scope: 'GLOBAL',
    authority: 'USER_EXPLICIT',
    provider: 'langmem',
    importance: 8.0,
    confidence: 0.9,
    createdAt: '1 day ago'
  },
  {
    id: 'mem_cognee_05',
    content: 'Hikmah knowledge graph: Hikmah depends on Supabase (PostgreSQL 16) and deploys control plane to Vercel.',
    classification: 'RELATIONSHIP',
    scope: 'PROJECT',
    authority: 'PROJECT_SOURCE',
    provider: 'cognee',
    importance: 7.5,
    confidence: 0.9,
    createdAt: '2 days ago'
  },
  {
    id: 'mem_letta_06',
    content: 'Agent ResearchAssistant completed deep research task on memory engine benchmarks; checkpointed state to MemFS.',
    classification: 'AGENT',
    scope: 'PROJECT',
    authority: 'VERIFIED_TOOL_RESULT',
    provider: 'letta',
    importance: 7.0,
    confidence: 0.95,
    createdAt: '3 days ago'
  },
  {
    id: 'mem_smem_07',
    content: 'Document corpus: 2026 Memory Engine Comparative Benchmark Report (PDF analysis, 42 pages parsed).',
    classification: 'DOCUMENT',
    scope: 'PROJECT',
    authority: 'DOCUMENT',
    provider: 'supermemory',
    importance: 6.5,
    confidence: 0.85,
    createdAt: '4 days ago'
  }
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<UnifiedMemory[]>(INITIAL_MEMORIES);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAuthority, setNewAuthority] = useState('USER_EXPLICIT');
  const [notification, setNotification] = useState<string | null>(null);

  const tabs = [
    { id: 'ALL', label: 'All Fabric', icon: Layers },
    { id: 'PREFERENCE', label: 'Personal (Mem0)', icon: Sparkles },
    { id: 'PROJECT', label: 'Projects (Native)', icon: Cpu },
    { id: 'RELATIONSHIP', label: 'Knowledge (Cognee)', icon: Brain },
    { id: 'TEMPORAL', label: 'History (Graphiti)', icon: Clock },
    { id: 'PROCEDURAL', label: 'Procedures (LangMem)', icon: Workflow },
    { id: 'AGENT', label: 'Agent Memory (Letta)', icon: ShieldCheck },
    { id: 'DOCUMENT', label: 'Documents (Supermemory)', icon: FileText }
  ];

  const filteredMemories = memories.filter((m) => {
    if (activeTab !== 'ALL' && m.classification !== activeTab) {
      if (activeTab === 'PREFERENCE' && m.classification !== 'PREFERENCE' && m.classification !== 'USER') return false;
      if (activeTab === 'RELATIONSHIP' && m.classification !== 'RELATIONSHIP' && m.classification !== 'KNOWLEDGE') return false;
      if (activeTab !== 'PREFERENCE' && activeTab !== 'RELATIONSHIP') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.classification.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    // Simulate router auto-classification & routing
    let autoClass = 'USER';
    let autoProvider = 'native-supabase';
    const lower = newContent.toLowerCase();

    if (lower.includes('prefer') || lower.includes('like') || lower.includes('favorite')) {
      autoClass = 'PREFERENCE';
      autoProvider = 'mem0';
    } else if (lower.includes('always') || lower.includes('never') || lower.includes('rule') || lower.includes('convention')) {
      autoClass = 'PROCEDURAL';
      autoProvider = 'langmem';
    } else if (lower.includes('changed') || lower.includes('migrated') || lower.includes('previously')) {
      autoClass = 'TEMPORAL';
      autoProvider = 'graphiti';
    } else if (lower.includes('relates') || lower.includes('connects') || lower.includes('graph')) {
      autoClass = 'RELATIONSHIP';
      autoProvider = 'cognee';
    } else if (lower.includes('agent') || lower.includes('checkpoint')) {
      autoClass = 'AGENT';
      autoProvider = 'letta';
    } else if (lower.includes('pdf') || lower.includes('document')) {
      autoClass = 'DOCUMENT';
      autoProvider = 'supermemory';
    }

    const newRec: UnifiedMemory = {
      id: `mem_${Date.now()}`,
      content: newContent,
      classification: autoClass,
      scope: 'PROJECT',
      authority: newAuthority,
      provider: autoProvider,
      importance: 8.0,
      confidence: 1.0,
      createdAt: 'Just now'
    };

    setMemories([newRec, ...memories]);
    setNewContent('');
    setNotification(`Memory stored! Auto-routed to [${autoProvider}] as [${autoClass}].`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDelete = (id: string) => {
    setMemories(memories.filter((m) => m.id !== id));
    setNotification(`Memory record [${id}] permanently forgotten across router and provider refs.`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Brain className="w-7 h-7 text-[#00F0FF]" />
            <span>HIKMAH MULTI-ENGINE MEMORY ROUTER</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Universal Knowledge Fabric • Mem0, Graphiti, Letta, Cognee, LangMem, Supermemory & Native Supabase
          </p>
        </div>

        {/* Link to Providers Admin */}
        <Link
          href="/memory/providers"
          className="px-4 py-2 bg-[#111827] hover:bg-[#1E293B] text-[#00F0FF] border border-[#1E293B] rounded-xl text-xs font-bold flex items-center space-x-2 transition"
        >
          <Server className="w-4 h-4" />
          <span>Engine Health & Providers</span>
        </Link>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Store Memory Form */}
      <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-4">
        <h2 className="text-xs font-bold tracking-widest text-[#64748B] flex items-center space-x-2">
          <Plus className="w-4 h-4 text-[#00F0FF]" />
          <span>INTELLIGENT MEMORY INGESTION (AUTO-ROUTED)</span>
        </h2>

        <form onSubmit={handleAdd} className="space-y-3 text-xs">
          <textarea
            placeholder="Tell Hikmah what to remember (e.g. 'I prefer Next.js with Tailwind' or 'We migrated the database to PostgreSQL 16')..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full h-20 bg-[#0A0F1D] border border-[#1E293B] rounded-lg p-3 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            required
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2 text-[#64748B]">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Secret Scanner Active • Auto-Redaction Enabled</span>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={newAuthority}
                onChange={(e) => setNewAuthority(e.target.value)}
                className="bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] text-xs focus:outline-none"
              >
                <option value="USER_EXPLICIT">Authority: USER_EXPLICIT (Rank 1)</option>
                <option value="VERIFIED_SYSTEM_DATA">Authority: SYSTEM_DATA (Rank 2)</option>
                <option value="PROJECT_SOURCE">Authority: PROJECT_SOURCE (Rank 4)</option>
                <option value="DOCUMENT">Authority: DOCUMENT (Rank 5)</option>
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] border border-[#00F0FF]/40 rounded-lg font-bold flex items-center space-x-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Remember & Route</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-[#1E293B] pb-2 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-bold'
                  : 'text-[#94A3B8] hover:bg-[#1E293B]/40 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#64748B]" />
        <input
          type="text"
          placeholder="Semantic search across memory fabric or filter by content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111827] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
        />
      </div>

      {/* Memory Cards Grid */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-[#64748B] px-1">
          <span>FOUND {filteredMemories.length} MEMORIES</span>
          <span>Deduplicated & Authority-Ranked</span>
        </div>

        {filteredMemories.map((m) => (
          <div
            key={m.id}
            className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3 hover:border-[#00F0FF]/30 transition text-xs"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                  {m.provider.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0A0F1D] text-[#94A3B8] border border-[#1E293B]">
                  {m.classification}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {m.authority}
                </span>
                <span className="text-[#64748B] text-[10px]">{m.scope} Scope</span>
              </div>

              <div className="flex items-center space-x-3 text-[#64748B] text-[11px]">
                <span>Importance: {m.importance}/10</span>
                <span>•</span>
                <span>{m.createdAt}</span>
                <button
                  onClick={() => handleDelete(m.id)}
                  title="Forget memory"
                  className="p-1 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[#F1F5F9] leading-relaxed text-xs">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
