'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ListTodo,
  Activity,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  type: string;
  status: 'CREATED' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'WAITING_APPROVAL' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  priority: string;
  progress: number;
  retryCount: number;
  assignedWorker?: string;
  createdAt: string;
}

export default function TasksPage() {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 'task_a9f182',
      title: 'Deep Research: Advanced Quantum Error Mitigation',
      type: 'RESEARCH',
      status: 'RUNNING',
      priority: 'HIGH',
      progress: 65,
      retryCount: 0,
      assignedWorker: 'worker_research_01',
      createdAt: '10 mins ago'
    },
    {
      id: 'task_b2c410',
      title: 'Automated Security Assessment: Authorized Lab Subnet',
      type: 'SECURITY',
      status: 'WAITING_APPROVAL',
      priority: 'CRITICAL',
      progress: 0,
      retryCount: 0,
      createdAt: '25 mins ago'
    },
    {
      id: 'task_c7e934',
      title: 'Code Refactoring: Model Router Interface Standardization',
      type: 'CODING',
      status: 'SUCCEEDED',
      priority: 'NORMAL',
      progress: 100,
      retryCount: 0,
      assignedWorker: 'worker_coding_02',
      createdAt: '1 hour ago'
    },
    {
      id: 'task_d4a511',
      title: 'Document PDF Ingestion & Pgvector Embedding Chunking',
      type: 'DOCUMENT',
      status: 'PAUSED',
      priority: 'NORMAL',
      progress: 40,
      retryCount: 1,
      assignedWorker: 'worker_doc_01',
      createdAt: '2 hours ago'
    },
    {
      id: 'task_e8f290',
      title: 'Browser Playwright Session: Dynamic UI State Verification',
      type: 'BROWSER',
      status: 'FAILED',
      priority: 'HIGH',
      progress: 80,
      retryCount: 3,
      assignedWorker: 'worker_browser_01',
      createdAt: '3 hours ago'
    }
  ]);

  const handleAction = (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        if (action === 'pause') return { ...t, status: 'PAUSED' };
        if (action === 'resume') return { ...t, status: 'RUNNING' };
        if (action === 'cancel') return { ...t, status: 'CANCELLED' };
        if (action === 'retry') return { ...t, status: 'QUEUED', retryCount: 0 };
        return t;
      })
    );
  };

  const filtered = tasks.filter((t) => {
    const matchQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = selectedFilter === 'ALL' || t.status === selectedFilter;
    return matchQuery && matchFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'text-[#00F0FF] bg-[#00F0FF]/10 border-[#00F0FF]/30 animate-pulse';
      case 'SUCCEEDED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'FAILED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'WAITING_APPROVAL':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'PAUSED':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-[#94A3B8] bg-[#1E293B] border-[#334155]';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6">
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <ListTodo className="w-7 h-7 text-[#00F0FF]" />
          <span>DURABLE TASK & WORKER ENGINE</span>
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Checkpoint-Resilient Execution • Worker Leases • State Machine Governance
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl">
          <span className="text-xs text-[#64748B]">TOTAL TASKS</span>
          <div className="text-2xl font-bold text-[#F1F5F9]">{tasks.length}</div>
        </div>
        <div className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl">
          <span className="text-xs text-[#00F0FF]">ACTIVE RUNNING</span>
          <div className="text-2xl font-bold text-[#00F0FF]">
            {tasks.filter((t) => t.status === 'RUNNING').length}
          </div>
        </div>
        <div className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl">
          <span className="text-xs text-amber-400">PENDING APPROVAL</span>
          <div className="text-2xl font-bold text-amber-400">
            {tasks.filter((t) => t.status === 'WAITING_APPROVAL').length}
          </div>
        </div>
        <div className="p-4 bg-[#111827] border border-[#1E293B] rounded-xl">
          <span className="text-xs text-emerald-400">SUCCEEDED</span>
          <div className="text-2xl font-bold text-emerald-400">
            {tasks.filter((t) => t.status === 'SUCCEEDED').length}
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#64748B]" />
          {['ALL', 'RUNNING', 'WAITING_APPROVAL', 'PAUSED', 'SUCCEEDED', 'FAILED'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-2.5 py-1 rounded text-[11px] border ${
                selectedFilter === f
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                  : 'bg-[#111827] text-[#94A3B8] border-[#1E293B] hover:text-[#F1F5F9]'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] border-b border-[#1E293B] text-[#64748B]">
            <tr>
              <th className="p-3.5">TASK</th>
              <th className="p-3.5">TYPE</th>
              <th className="p-3.5">STATUS</th>
              <th className="p-3.5">PROGRESS</th>
              <th className="p-3.5">WORKER</th>
              <th className="p-3.5">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] text-[#F1F5F9]">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-[#1E293B]/40 transition">
                <td className="p-3.5">
                  <div className="font-bold text-[#F1F5F9]">{t.title}</div>
                  <div className="text-[#64748B] text-[11px]">{t.id} • {t.createdAt}</div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8] text-[10px]">
                    {t.type}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${getStatusBadge(t.status)}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#00F0FF] to-emerald-400 h-full"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#94A3B8]">{t.progress}%</span>
                  </div>
                </td>
                <td className="p-3.5 text-[#94A3B8] text-[11px]">
                  {t.assignedWorker || 'Unassigned'}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center space-x-2">
                    {t.status === 'RUNNING' && (
                      <button
                        onClick={() => handleAction(t.id, 'pause')}
                        className="p-1 rounded bg-[#1E293B] hover:text-[#00F0FF]"
                        title="Pause Task"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.status === 'PAUSED' && (
                      <button
                        onClick={() => handleAction(t.id, 'resume')}
                        className="p-1 rounded bg-[#1E293B] hover:text-emerald-400"
                        title="Resume Task"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(t.status === 'FAILED' || t.status === 'CANCELLED') && (
                      <button
                        onClick={() => handleAction(t.id, 'retry')}
                        className="p-1 rounded bg-[#1E293B] hover:text-amber-400"
                        title="Retry Task"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/tasks/${t.id}`}
                      className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#00F0FF] flex items-center gap-1 px-2"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
