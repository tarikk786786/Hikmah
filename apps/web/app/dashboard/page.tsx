'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Brain,
  Bot,
  Wrench,
  Sparkles,
  ShieldCheck,
  Server,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    status: 'ONLINE',
    uptime: 0,
    toolsCount: 4,
    skillsCount: 5,
    memoriesCount: 2,
    queueLength: 0
  });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          uptime: data.uptimeSeconds || 120
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1E293B] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <span>JARVIS SYSTEM COCKPIT</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
              PHASE 1 OPERATIONAL
            </span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 font-mono">
            AI Operating System Foundation • Core, Memory, Router, MCP & Workers
          </p>
        </div>

        <div className="flex space-x-3">
          <Link
            href="/chat"
            className="px-4 py-2 bg-[#00F0FF] hover:bg-[#00D0DF] text-[#0B0F17] font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
          >
            <span>Open JARVIS Chat</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-xs font-mono">CORE SYSTEM</span>
            <Server className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-[#F1F5F9]">NOMINAL</span>
            <p className="text-xs text-emerald-400 font-mono mt-1">Uptime: {stats.uptime}s</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-xs font-mono">ACTIVE MEMORIES</span>
            <Brain className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-[#F1F5F9]">{stats.memoriesCount} Indexed</span>
            <p className="text-xs text-[#94A3B8] font-mono mt-1">pgvector ready</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-xs font-mono">TOOL REGISTRY</span>
            <Wrench className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-[#F1F5F9]">{stats.toolsCount} Loaded</span>
            <p className="text-xs text-[#94A3B8] font-mono mt-1">MCP compatible</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#111827] border border-[#1E293B] flex flex-col justify-between">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-xs font-mono">BACKGROUND QUEUE</span>
            <Activity className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-[#F1F5F9]">STANDBY</span>
            <p className="text-xs text-emerald-400 font-mono mt-1">BullMQ / In-Memory</p>
          </div>
        </div>
      </div>

      {/* Architecture Layout Card */}
      <div className="p-6 rounded-xl bg-[#111827] border border-[#1E293B] space-y-4">
        <h2 className="text-base font-semibold text-[#F1F5F9] font-mono flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />
          <span>DEPLOYMENT & WORKLOAD ARCHITECTURE</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
            <div className="text-[#00F0FF] font-bold mb-2">VERCEL (Control Plane)</div>
            <ul className="text-[#94A3B8] space-y-1">
              <li>• Next.js 15 UI & Dashboard</li>
              <li>• Streaming SSE Endpoints</li>
              <li>• Memory & Tool API Gateways</li>
              <li>• Job Enqueueing</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
            <div className="text-[#00F0FF] font-bold mb-2">SUPABASE (Source of Truth)</div>
            <ul className="text-[#94A3B8] space-y-1">
              <li>• PostgreSQL 16 Tables</li>
              <li>• pgvector Cosine Memory Index</li>
              <li>• Auth, Storage & RLS</li>
              <li>• Audit Logs & Approvals</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
            <div className="text-[#00F0FF] font-bold mb-2">RENDER (Worker Harness)</div>
            <ul className="text-[#94A3B8] space-y-1">
              <li>• BullMQ Asynchronous Workers</li>
              <li>• Long-running Agent Execution</li>
              <li>• Playwright Browser Automation</li>
              <li>• Idempotent State Resume</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
