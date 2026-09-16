'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Filter, Shield, Cpu, Activity, CheckCircle, XCircle } from 'lucide-react';

interface Capability {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  provider: string;
  type: string;
  permissions: string[];
  risk_level: string;
  runtime: string;
  enabled: boolean;
  health_status: string;
  tags: string[];
}

export default function CapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const loadCapabilities = () => {
    fetch('/api/capabilities')
      .then(res => res.json())
      .then(data => setCapabilities(data.capabilities || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCapabilities();
  }, []);

  const toggleEnabled = async (id: string, current: boolean) => {
    await fetch('/api/capabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !current })
    });
    loadCapabilities();
  };

  const types = ['ALL', 'TOOL', 'AGENT', 'SKILL', 'STORAGE_PROVIDER', 'BROWSER_PROVIDER'];

  const filtered = capabilities.filter(c => {
    if (selectedType !== 'ALL' && c.type !== selectedType) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-[#00F0FF]" />
          <span>HIKMAH UNIVERSAL CAPABILITY MATRIX</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Decoupled Capability Registry • All 9 Types • Dynamic Scoring & Contextual Discovery
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex space-x-2 overflow-x-auto text-xs font-mono">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                selectedType === t
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                  : 'bg-[#111827] text-[#94A3B8] border-[#1E293B] hover:text-[#F1F5F9]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search capabilities or tags..."
            className="w-full bg-[#111827] text-[#F1F5F9] pl-9 pr-4 py-2 rounded-lg border border-[#1E293B] text-xs focus:outline-none focus:border-[#00F0FF]/50"
          />
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
                    {c.type}
                  </span>
                  <h2 className="text-sm font-bold text-[#F1F5F9] mt-2">{c.name}</h2>
                </div>
                <button
                  onClick={() => toggleEnabled(c.id, c.enabled)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                    c.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {c.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">{c.description}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#1E293B] text-[11px] font-mono">
              <div className="flex justify-between text-[#64748B]">
                <span>Category:</span>
                <span className="text-[#F1F5F9]">{c.category}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Runtime:</span>
                <span className="text-amber-400">{c.runtime}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Risk Level:</span>
                <span className={c.risk_level === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}>{c.risk_level}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Health:</span>
                <span className="text-emerald-400">{c.health_status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
