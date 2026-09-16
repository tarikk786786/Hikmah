'use client';

import React from 'react';
import { Cpu, HardDrive, ShieldCheck, CheckCircle } from 'lucide-react';

export default function ProvidersPage() {
  const modelProviders = [
    { name: 'OpenAI-Compatible Gateway', role: 'FAST / CODING', status: 'READY', models: 'gpt-4o-mini, gpt-4o, deepseek' },
    { name: 'Anthropic Gateway', role: 'REASONING / CODING', status: 'READY', models: 'claude-3-5-sonnet' },
    { name: 'Google Gemini Gateway', role: 'VISION / MULTIMODAL', status: 'READY', models: 'gemini-1.5-flash, text-embedding-004' },
    { name: 'Ollama Local Model Runtime', role: 'LOCAL / AIR-GAPPED', status: 'CONNECTED', models: 'llama3:8b, nomic-embed-text' },
    { name: 'Mock Resilient Offline Provider', role: 'FALLBACK', status: 'READY', models: 'mock-engine-v1' }
  ];

  const storageProviders = [
    { name: 'Local Sandboxed Storage', role: 'Development / Default', status: 'ACTIVE' },
    { name: 'Supabase Storage Bucket', role: 'Cloud Source of Truth', status: 'CONFIGURED' },
    { name: 'Telegram Storage Adapter', role: 'Decentralized Encrypted Store', status: 'READY' },
    { name: 'Cloudflare R2 / S3 Adapter', role: 'Blob Storage', status: 'READY' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Cpu className="w-6 h-6 text-[#00F0FF]" />
          <span>MODEL & STORAGE PROVIDER MATRIX</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Decoupled Multi-Vendor Adapters • Automatic Failure Cascading • Provider Independence
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
          <Cpu className="w-4 h-4" />
          <span>ACTIVE AI MODEL PROVIDERS</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelProviders.map(p => (
            <div key={p.name} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#F1F5F9]">{p.name}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                  {p.status}
                </span>
              </div>
              <div className="text-[#64748B]">Assigned Role: <span className="text-[#00F0FF]">{p.role}</span></div>
              <div className="text-[#94A3B8] text-[11px]">Models: {p.models}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-[#1E293B]">
        <h2 className="text-sm font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
          <HardDrive className="w-4 h-4" />
          <span>STORAGE PROVIDERS (StorageManager)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storageProviders.map(s => (
            <div key={s.name} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#F1F5F9]">{s.name}</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                  {s.status}
                </span>
              </div>
              <div className="text-[#64748B]">Target Role: <span className="text-amber-400">{s.role}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
