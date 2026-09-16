'use client';

import React, { useState } from 'react';
import { Settings, Save, Key, Cpu, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  const [fastModel, setFastModel] = useState('gpt-4o-mini');
  const [reasoningModel, setReasoningModel] = useState('gpt-4o');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [maxRisk, setMaxRisk] = useState('LOW');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <Settings className="w-6 h-6 text-[#00F0FF]" />
          <span>SYSTEM SETTINGS & MODEL ROUTER CONFIG</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Gateway Providers • Model Routing Roles • Security Boundaries
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Router Section */}
        <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
          <h2 className="text-sm font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
            <Cpu className="w-4 h-4" />
            <span>MODEL ROUTER ASSIGNMENTS</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-[#94A3B8]">Fast Model (General Chat / Summaries):</label>
              <input
                type="text"
                value={fastModel}
                onChange={e => setFastModel(e.target.value)}
                className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[#94A3B8]">Reasoning Model (Planning / Synthesis):</label>
              <input
                type="text"
                value={reasoningModel}
                onChange={e => setReasoningModel(e.target.value)}
                className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[#94A3B8]">Ollama Base URL (Local Fallback):</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={e => setOllamaUrl(e.target.value)}
                className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50"
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
          <h2 className="text-sm font-semibold text-[#00F0FF] font-mono flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>SECURITY THRESHOLDS</span>
          </h2>
          <div className="space-y-1.5 text-xs font-mono">
            <label className="text-[#94A3B8]">Maximum Auto-Approved Tool Risk:</label>
            <select
              value={maxRisk}
              onChange={e => setMaxRisk(e.target.value)}
              className="w-full bg-[#0B0F17] text-[#F1F5F9] px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none"
            >
              <option value="LOW">LOW (Safe operations: read memory, search, calculator)</option>
              <option value="MEDIUM">MEDIUM (Read files, network fetches)</option>
              <option value="HIGH">HIGH (File edit, state mutation)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center space-x-3">
          {saved && <span className="text-xs font-mono text-emerald-400">Settings preserved!</span>}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#00F0FF] hover:bg-[#00D0DF] text-[#0B0F17] font-semibold text-xs rounded-xl transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
