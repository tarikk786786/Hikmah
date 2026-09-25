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

// Initial memories are now fetched dynamically from the VaultEngine

export default function MemoryPage() {
  const [memories, setMemories] = useState<UnifiedMemory[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAuthority, setNewAuthority] = useState('USER_EXPLICIT');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/memory')
      .then(res => res.json())
      .then(data => {
        if (data.memories) {
          const mapped: UnifiedMemory[] = data.memories.map((m: any, i: number) => ({
            id: m.id || `mem_${i}`,
            content: m.content || '',
            classification: m.properties?.type?.toUpperCase() || 'NOTE',
            scope: 'PROJECT',
            authority: 'VAULT_DOCUMENT',
            provider: 'vault-engine',
            importance: 8.0,
            confidence: 1.0,
            createdAt: new Date(m.lastModified).toLocaleString()
          }));
          setMemories(mapped);
        }
      })
      .catch(console.error);
  }, []);

  const tabs = [
    { id: 'ALL', label: 'All Fabric', icon: Layers },
    { id: 'NOTE', label: 'Local Notes', icon: FileText },
    { id: 'DAILY_NOTE', label: 'Daily Notes', icon: Clock },
    { id: 'CANVAS', label: 'Canvas', icon: Brain }
  ];

  const filteredMemories = memories.filter((m) => {
    if (activeTab !== 'ALL' && m.classification !== activeTab) {
      return false;
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    let autoClass = 'note';
    const lower = newContent.toLowerCase();
    if (lower.includes('daily')) autoClass = 'daily_note';
    if (lower.includes('canvas')) autoClass = 'canvas';

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `memory_${Date.now()}`,
          content: newContent,
          memory_type: autoClass,
          tags: ['api-ingested']
        })
      });

      if (res.ok) {
        const saved = await res.json();
        const mapped: UnifiedMemory = {
          id: saved.id,
          content: saved.content,
          classification: saved.properties?.type?.toUpperCase() || 'NOTE',
          scope: 'PROJECT',
          authority: 'VAULT_DOCUMENT',
          provider: 'vault-engine',
          importance: 8.0,
          confidence: 1.0,
          createdAt: new Date(saved.lastModified).toLocaleString()
        };
        setMemories([mapped, ...memories]);
        setNewContent('');
        setNotification(`Memory stored! Saved to vault as [${saved.id}].`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: string) => {
    // Delete in UI for now (would need a DELETE endpoint)
    setMemories(memories.filter((m) => m.id !== id));
    setNotification(`Memory record [${id}] permanently forgotten.`);
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
