'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Tag,
  History,
  Copy,
  Check,
  Code2,
  Layers,
  Sparkles,
  Terminal
} from 'lucide-react';

interface PromptItem {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  variables: string[];
  template: string;
}

export default function PromptsPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const prompts: PromptItem[] = [
    {
      id: 'system.core',
      name: 'Hikmah OS Core Identity',
      description: 'System prompt establishing the persona, security rules, and execution posture of Hikmah',
      category: 'SYSTEM',
      version: '1.0.0',
      variables: ['user_name', 'current_date', 'system_context'],
      template: `You are Hikmah, an advanced autonomous AI operating system and intelligent assistant.
Your current user is {{user_name}}.
Today's date is {{current_date}}.
System Context: {{system_context}}

Core Directives:
1. Deliver precise, high-rigor, verified answers and code.
2. When executing actions or running tools, follow strict scope authorization and safety classifications.
3. Protect system integrity and never execute destructive or out-of-scope commands without explicit authorization.
4. Adapt seamlessly across providers, falling back gracefully if cloud services degrade.`
    },
    {
      id: 'planner.task_decomposition',
      name: 'DAG Task Graph Decomposer',
      description: 'Breaks down complex user objectives into structured, dependency-resolved task nodes',
      category: 'PLANNER',
      version: '1.0.0',
      variables: ['user_goal', 'available_capabilities', 'constraints'],
      template: `You are the Hikmah Task Planner.
Decompose the following user objective into an executable Directed Acyclic Graph (DAG) of task nodes.

User Goal: {{user_goal}}
Available Capabilities: {{available_capabilities}}
Constraints: {{constraints}}

Output a valid JSON array of tasks with:
- id: unique string
- name: clear task title
- capabilityId: exact capability ID from available list
- dependencies: array of node IDs that must succeed before this task runs
- input: parameters for the capability`
    },
    {
      id: 'security.classifier',
      name: 'Action Risk Classifier',
      description: 'Evaluates commands, targets, and tool calls to assign risk level and approval requirement',
      category: 'SECURITY',
      version: '1.0.0',
      variables: ['action_details', 'target_scope'],
      template: `Evaluate the proposed action and target for security risk.

Action Details: {{action_details}}
Target: {{target_scope}}

Respond with valid JSON:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "requires_approval": boolean,
  "rationale": "Explanation of safety assessment"
}`
    },
    {
      id: 'summarizer.context',
      name: 'Context Compactor',
      description: 'Distills long conversations into token-efficient summaries while preserving key entities',
      category: 'SUMMARY',
      version: '1.0.0',
      variables: ['conversation_text'],
      template: `Summarize the following conversation history for long-term memory retention.
Retain: key user preferences, architectural decisions, code paths modified, open items, and entity references.

Conversation:
{{conversation_text}}`
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = prompts.filter(
    (p) => selectedCategory === 'ALL' || p.category === selectedCategory
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6">
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <FileCode className="w-7 h-7 text-[#00F0FF]" />
          <span>PROMPT VERSION REPOSITORY</span>
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Audited System Prompts • Semantic Variable Interpolation • Rollback Governance
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2">
        {['ALL', 'SYSTEM', 'PLANNER', 'SECURITY', 'SUMMARY'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              selectedCategory === cat
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                : 'bg-[#111827] text-[#94A3B8] border-[#1E293B] hover:text-[#F1F5F9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts List */}
      <div className="space-y-6">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl space-y-4 hover:border-[#00F0FF]/30 transition"
          >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#00F0FF] font-bold">{p.name}</span>
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[10px] text-emerald-400 border border-emerald-500/30">
                    v{p.version}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[10px] text-[#38BDF8]">
                    {p.category}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">{p.description}</p>
              </div>

              <button
                onClick={() => handleCopy(p.id, p.template)}
                className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-xs text-[#F1F5F9] rounded-lg transition"
              >
                {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === p.id ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>

            {/* Variable Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#64748B] text-[11px]">Interpolation Variables:</span>
              {p.variables.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 rounded bg-[#0F172A] text-amber-300 border border-amber-500/20 text-[10px]"
                >
                  &#123;&#123;{v}&#125;&#125;
                </span>
              ))}
            </div>

            {/* Template Box */}
            <div className="p-4 bg-[#0A0F1D] border border-[#1E293B] rounded-lg text-xs text-[#94A3B8] whitespace-pre-wrap font-mono leading-relaxed">
              {p.template}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
