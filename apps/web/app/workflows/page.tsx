'use client';

import React, { useState } from 'react';
import {
  Workflow as WorkflowIcon,
  Play,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  GitCommit,
  Sparkles,
  ShieldCheck,
  Search
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stepsCount: number;
  steps: string[];
}

interface WorkflowRunItem {
  id: string;
  workflowName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  progress: number;
  currentStep: string;
  startedAt: string;
}

export default function WorkflowsPage() {
  const [workflows] = useState<WorkflowTemplate[]>([
    {
      id: 'wf_research_deep',
      name: 'Autonomous Deep Research Pipeline',
      description: 'Multi-source search, document ingestion, cognitive synthesis, and verified report generation',
      stepsCount: 4,
      steps: ['Broad Search', 'Parse Sources', 'Synthesize', 'Generate Report']
    },
    {
      id: 'wf_code_audit',
      name: 'Automated Codebase Refactor & Audit',
      description: 'Syntax parsing, security taint analysis, test suite generation, and git patch preparation',
      stepsCount: 4,
      steps: ['Static Analysis', 'Security Scan', 'Run Tests', 'Generate Patch']
    },
    {
      id: 'wf_security_recon',
      name: 'Authorized Vulnerability Reconnaissance',
      description: 'Scope validation, network surface discovery, CVE matching, and executive audit logging',
      stepsCount: 4,
      steps: ['Verify Scope', 'Surface Recon', 'CVE Check', 'Audit Report']
    }
  ]);

  const [runs] = useState<WorkflowRunItem[]>([
    {
      id: 'run_92a10f',
      workflowName: 'Autonomous Deep Research Pipeline',
      status: 'RUNNING',
      progress: 65,
      currentStep: 'Parse Sources',
      startedAt: '12 mins ago'
    },
    {
      id: 'run_43b811',
      workflowName: 'Automated Codebase Refactor & Audit',
      status: 'COMPLETED',
      progress: 100,
      currentStep: 'Generate Patch',
      startedAt: '2 hours ago'
    }
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6">
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <WorkflowIcon className="w-7 h-7 text-[#00F0FF]" />
          <span>MULTI-STEP WORKFLOW ENGINE</span>
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          DAG Dependency Resolution • Durable Step Checkpointing • Native & Temporal-Ready
        </p>
      </div>

      {/* Available Workflow Templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
          <Layers className="w-4 h-4" />
          <span>STANDARDIZED WORKFLOW TEMPLATES</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 bg-[#111827] border border-[#1E293B] hover:border-[#00F0FF]/40 rounded-xl space-y-4 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#00F0FF] font-bold">{wf.stepsCount} STEPS</span>
                  <span className="text-[#64748B] text-[10px]">{wf.id}</span>
                </div>
                <h3 className="text-sm font-bold text-[#F1F5F9]">{wf.name}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">{wf.description}</p>
              </div>

              {/* Steps Visual Chain */}
              <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                <div className="text-[10px] text-[#64748B]">EXECUTION PIPELINE:</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {wf.steps.map((step, idx) => (
                    <React.Fragment key={step}>
                      <span className="px-2 py-0.5 rounded bg-[#0F172A] text-[#F1F5F9] border border-[#1E293B]">
                        {step}
                      </span>
                      {idx < wf.steps.length - 1 && <ArrowRight className="w-3 h-3 text-[#64748B]" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <button className="w-full flex items-center justify-center space-x-2 py-2 bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg text-xs font-bold transition">
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Workflow</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Run History */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>ACTIVE & HISTORICAL WORKFLOW RUNS</span>
        </h2>
        <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0F172A] border-b border-[#1E293B] text-[#64748B]">
              <tr>
                <th className="p-3.5">RUN ID</th>
                <th className="p-3.5">WORKFLOW</th>
                <th className="p-3.5">STATUS</th>
                <th className="p-3.5">CURRENT STEP</th>
                <th className="p-3.5">PROGRESS</th>
                <th className="p-3.5">STARTED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-[#F1F5F9]">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-[#1E293B]/40 transition">
                  <td className="p-3.5 text-[#00F0FF] font-bold">{r.id}</td>
                  <td className="p-3.5 font-bold">{r.workflowName}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        r.status === 'RUNNING'
                          ? 'text-[#00F0FF] bg-[#00F0FF]/10 border-[#00F0FF]/30 animate-pulse'
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#94A3B8]">{r.currentStep}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#00F0FF] to-emerald-400 h-full"
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">{r.progress}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-[#64748B]">{r.startedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
