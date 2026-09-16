'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Layers,
  FileText,
  Key,
  Database
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: PageProps) {
  const { id } = use(params);

  // Mock task state for inspection view
  const task = {
    id,
    title: 'Autonomous Deep Research: Advanced Quantum Error Mitigation',
    type: 'RESEARCH',
    status: 'RUNNING',
    priority: 'HIGH',
    riskLevel: 'LOW',
    progress: 65,
    currentStep: 'step_fetch',
    retryCount: 0,
    maxRetries: 3,
    assignedWorker: 'worker_research_01',
    createdAt: '2026-09-16T09:40:00.000Z',
    updatedAt: '2026-09-16T09:48:15.000Z',
    idempotencyKey: 'idemp_research_quantum_001',
    input: {
      topic: 'Quantum Error Mitigation',
      maxSources: 10,
      depth: 'comprehensive',
      citationStyle: 'IEEE'
    },
    checkpoints: [
      {
        id: 'cp_01',
        stepId: 'step_search',
        progress: 30,
        timestamp: '2026-09-16T09:42:00.000Z',
        summary: 'Collected 14 relevant candidate preprints and conference papers.'
      },
      {
        id: 'cp_02',
        stepId: 'step_fetch',
        progress: 65,
        timestamp: '2026-09-16T09:48:00.000Z',
        summary: 'Extracted text, methods, and error reduction benchmarks from 9 sources.'
      }
    ],
    artifacts: [
      { id: 'art_01', name: 'extracted_sources.json', size: '48.2 KB', url: '#' },
      { id: 'art_02', name: 'error_mitigation_notes.md', size: '12.4 KB', url: '#' }
    ]
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Back Link */}
      <Link
        href="/tasks"
        className="inline-flex items-center space-x-2 text-xs text-[#94A3B8] hover:text-[#00F0FF] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Tasks</span>
      </Link>

      {/* Task Header */}
      <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#64748B]">
              <span className="text-[#00F0FF] font-bold">{task.id}</span>
              <span>•</span>
              <span>TYPE: {task.type}</span>
              <span>•</span>
              <span>PRIORITY: {task.priority}</span>
            </div>
            <h1 className="text-xl font-bold text-[#F1F5F9] mt-1">{task.title}</h1>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9] rounded-lg transition">
              <Pause className="w-3.5 h-3.5 text-purple-400" />
              <span>Pause</span>
            </button>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9] rounded-lg transition">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Retry</span>
            </button>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 border border-rose-500/30 rounded-lg transition">
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#94A3B8]">Execution Progress ({task.currentStep})</span>
            <span className="text-[#00F0FF] font-bold">{task.progress}%</span>
          </div>
          <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00F0FF] to-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Checkpoints & Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checkpoint Timeline */}
          <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span>DURABLE CHECKPOINTS & RECOVERY TRAIL</span>
            </h2>
            <div className="space-y-3">
              {task.checkpoints.map((cp, idx) => (
                <div
                  key={cp.id}
                  className="p-4 bg-[#0F172A] border border-[#1E293B] rounded-lg space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#F1F5F9]">
                      Checkpoint {idx + 1}: <code className="text-[#00F0FF]">{cp.stepId}</code>
                    </span>
                    <span className="text-emerald-400 font-bold">{cp.progress}% complete</span>
                  </div>
                  <p className="text-[#94A3B8]">{cp.summary}</p>
                  <div className="text-[10px] text-[#64748B] flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Persisted at: {cp.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input Parameters */}
          <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>INPUT PAYLOAD</span>
            </h2>
            <pre className="p-4 bg-[#0A0F1D] border border-[#1E293B] rounded-lg text-xs text-[#94A3B8] overflow-x-auto">
              {JSON.stringify(task.input, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right Column: Execution Metadata & Artifacts */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>SYSTEM METADATA</span>
            </h2>
            <div className="space-y-2 divide-y divide-[#1E293B] text-[11px]">
              <div className="pt-1 flex justify-between">
                <span className="text-[#64748B]">Assigned Worker:</span>
                <span className="text-[#F1F5F9] font-bold">{task.assignedWorker}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-[#64748B]">Risk Level:</span>
                <span className="text-emerald-400 font-bold">{task.riskLevel}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-[#64748B]">Retry Attempts:</span>
                <span className="text-[#F1F5F9]">{task.retryCount} / {task.maxRetries}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-[#64748B]">Idempotency Key:</span>
                <code className="text-[10px] text-[#00F0FF] truncate max-w-[150px]">{task.idempotencyKey}</code>
              </div>
            </div>
          </div>

          {/* Artifacts Card */}
          <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>PRODUCED ARTIFACTS</span>
            </h2>
            <div className="space-y-2">
              {task.artifacts.map((art) => (
                <div
                  key={art.id}
                  className="p-3 bg-[#0F172A] border border-[#1E293B] rounded-lg flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="text-[#F1F5F9] font-bold">{art.name}</div>
                    <div className="text-[10px] text-[#64748B]">{art.size}</div>
                  </div>
                  <a href={art.url} className="text-[#00F0FF] hover:underline text-[11px]">
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
