'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  Layers,
  Cpu,
  Lock,
  ExternalLink,
  Zap,
  Info,
  AlertTriangle,
  FileCode,
  Terminal,
} from 'lucide-react';

interface SkillItem {
  id: string;
  name: string;
  version: string;
  description: string;
  categories: string[];
  capabilities: string[];
  tools: string[];
  certification: string;
  risk: { level: string; reasons: string[] };
  permissions: {
    network: { enabled: boolean; allowedDomains: string[] };
    filesystem: { read: string[]; write: string[] };
    shell: { enabled: boolean };
  };
  publisher: { name: string; verified: boolean; type: string };
  isInstalled: boolean;
  enabled: boolean;
  sha256?: string;
  stats?: {
    totalExecutions: number;
    successRate: number;
    averageDurationMs: number;
    securityViolationsCount: number;
  };
}

export default function SkillsMarketplacePage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterInstalledOnly, setFilterInstalledOnly] = useState(false);
  const [canDoPrompt, setCanDoPrompt] = useState('');
  const [canDoResult, setCanDoResult] = useState<any>(null);
  const [evaluatingCanDo, setEvaluatingCanDo] = useState(false);
  const [inspectSkill, setInspectSkill] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.success) {
        setSkills(data.skills);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (skillId: string) => {
    setActionLoading(skillId);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', skillId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSkills();
      } else {
        alert(`Installation failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Install error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (skillId: string) => {
    setActionLoading(skillId);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall', skillId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSkills();
      }
    } catch (err: any) {
      alert(`Uninstall error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuarantine = async (skillId: string) => {
    if (!confirm(`Are you sure you want to trigger emergency quarantine for '${skillId}'?`)) return;
    setActionLoading(skillId);
    try {
      const res = await fetch(`/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quarantine', reason: 'Manual operator quarantine' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Skill ${skillId} has been quarantined and isolated.`);
        await fetchSkills();
      }
    } catch (err: any) {
      alert(`Quarantine error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCanDoQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDoPrompt.trim()) return;
    setEvaluatingCanDo(true);
    setCanDoResult(null);

    try {
      const res = await fetch('/api/skills/can-do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: canDoPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        setCanDoResult(data.assessment);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluatingCanDo(false);
    }
  };

  const categories = ['ALL', 'AI / LLM', 'SEO', 'PDF', 'Documents', 'Coding', 'Cybersecurity', 'OSINT', 'Translation', 'Research', 'Video'];

  const filteredSkills = skills.filter(s => {
    if (filterInstalledOnly && !s.isInstalled) return false;
    if (selectedCategory !== 'ALL' && !s.categories.includes(selectedCategory)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${s.name} ${s.description} ${s.capabilities.join(' ')} ${s.tools.join(' ')}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const installedCount = skills.filter(s => s.isInstalled).length;
  const certifiedCount = skills.filter(s => s.certification === 'CERTIFIED').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Sparkles className="w-7 h-7 text-[#00F0FF]" />
            <span>SKILL MARKETPLACE & INTELLIGENCE ENGINE</span>
          </h1>
          <p className="text-sm text-[#94A3B8] font-mono mt-1">
            Capability Discovery • Sandboxed Runtimes • Security Audits • Composition • Lockfile
          </p>
        </div>

        {/* HUD Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg">
            <span className="text-[#64748B] block text-[10px] uppercase">Marketplace</span>
            <span className="text-[#00F0FF] font-bold text-sm">{skills.length} Skills</span>
          </div>
          <div className="px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg">
            <span className="text-[#64748B] block text-[10px] uppercase">Installed</span>
            <span className="text-emerald-400 font-bold text-sm">{installedCount} Active</span>
          </div>
          <div className="px-3 py-2 bg-[#111827] border border-[#1E293B] rounded-lg">
            <span className="text-[#64748B] block text-[10px] uppercase">Certified</span>
            <span className="text-amber-400 font-bold text-sm">{certifiedCount} Verified</span>
          </div>
        </div>
      </div>

      {/* "Can Hikmah Do This?" Feasibility HUD */}
      <div className="p-5 bg-gradient-to-r from-[#111827] via-[#0E1522] to-[#111827] border border-[#00F0FF]/30 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.05)]">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="w-4 h-4 text-[#00F0FF]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#00F0FF] font-mono">
            Smart &quot;Can Hikmah Do This?&quot; Engine
          </span>
        </div>
        <form onSubmit={handleCanDoQuery} className="flex gap-2">
          <input
            type="text"
            value={canDoPrompt}
            onChange={e => setCanDoPrompt(e.target.value)}
            placeholder="Ask anything (e.g. 'Extract invoice items from scanned PDF and translate to Hindi', 'Audit Shopify SEO')..."
            className="flex-1 bg-[#162032] border border-[#1E293B] rounded-lg px-4 py-2.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF]"
          />
          <button
            type="submit"
            disabled={evaluatingCanDo}
            className="px-5 py-2.5 bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/50 text-[#00F0FF] font-mono text-xs font-bold rounded-lg transition"
          >
            {evaluatingCanDo ? 'Evaluating...' : 'Assess Capability'}
          </button>
        </form>

        {canDoResult && (
          <div className="mt-4 p-4 bg-[#162032]/80 border border-[#1E293B] rounded-lg text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Assessment Verdict:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                canDoResult.canDo === 'YES_EXISTING' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                canDoResult.canDo === 'YES_COMPOSITION' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40' :
                canDoResult.canDo === 'YES_CAN_GENERATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {canDoResult.canDo} ({(canDoResult.confidence * 100).toFixed(0)}% Confidence)
              </span>
            </div>
            <p className="text-[#F1F5F9] font-sans text-sm">{canDoResult.explanation}</p>
            {canDoResult.compositionPlan && (
              <div className="mt-2 pt-2 border-t border-[#1E293B] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase">Execution Sequence:</span>
                {canDoResult.compositionPlan.steps.map((s: any) => (
                  <div key={s.order} className="flex items-center space-x-2 text-[#94A3B8]">
                    <span className="text-[#00F0FF]">{s.order}.</span>
                    <span>{s.capability}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#111827] text-emerald-400 border border-[#1E293B]">{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by skill name, tools, capabilities, or tags..."
              className="w-full pl-9 pr-4 py-2 bg-[#111827] border border-[#1E293B] rounded-lg text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => setFilterInstalledOnly(!filterInstalledOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition border ${
                filterInstalledOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#111827] text-[#94A3B8] border-[#1E293B] hover:text-[#F1F5F9]'
              }`}
            >
              Installed Only ({installedCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-[11px] font-mono transition ${
                selectedCategory === cat
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                  : 'bg-[#111827] text-[#64748B] border border-[#1E293B] hover:text-[#F1F5F9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="py-12 text-center text-[#64748B] font-mono text-xs">
          Loading Skill Marketplace catalog...
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="py-12 text-center text-[#64748B] font-mono text-xs">
          No skills matched the query &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map(skill => {
            const isCertified = skill.certification === 'CERTIFIED';
            const isLowRisk = skill.risk.level === 'LOW';

            return (
              <div
                key={skill.id}
                className="p-5 bg-[#111827] border border-[#1E293B] hover:border-[#00F0FF]/40 rounded-xl flex flex-col justify-between space-y-4 transition shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center space-x-1 ${
                        isCertified
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isCertified ? <ShieldCheck className="w-3 h-3 inline mr-1" /> : <Shield className="w-3 h-3 inline mr-1" />}
                        {skill.certification}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        isLowRisk ? 'bg-slate-500/10 text-slate-400' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {skill.risk.level} RISK
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">v{skill.version}</span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F5F9] font-sans flex items-center justify-between">
                      <span>{skill.name}</span>
                      {skill.isInstalled && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap gap-1">
                    {skill.capabilities.slice(0, 3).map(cap => (
                      <span
                        key={cap}
                        className="px-2 py-0.5 bg-[#162032] border border-[#1E293B] text-[10px] font-mono text-[#00F0FF] rounded"
                      >
                        {cap}
                      </span>
                    ))}
                    {skill.capabilities.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono text-[#64748B]">
                        +{skill.capabilities.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Permissions HUD */}
                  <div className="pt-2 border-t border-[#1E293B] text-[11px] font-mono text-[#64748B] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span title="Network Access">
                        Net: <span className={skill.permissions.network.enabled ? 'text-amber-400' : 'text-emerald-400'}>{skill.permissions.network.enabled ? 'YES' : 'NONE'}</span>
                      </span>
                      <span title="Shell Access">
                        Shell: <span className={skill.permissions.shell.enabled ? 'text-rose-400' : 'text-emerald-400'}>{skill.permissions.shell.enabled ? 'YES' : 'NONE'}</span>
                      </span>
                    </div>
                    <span className="text-[#00F0FF]/80">Sandbox ✓</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectSkill(skill)}
                    className="px-3 py-1.5 bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] text-[#F1F5F9] rounded-lg text-xs font-mono transition"
                  >
                    Inspect
                  </button>

                  <div className="flex items-center space-x-2">
                    {skill.isInstalled ? (
                      <>
                        <button
                          onClick={() => handleQuarantine(skill.id)}
                          title="Emergency Quarantine Kill Switch"
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg transition"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUninstall(skill.id)}
                          disabled={actionLoading === skill.id}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-mono transition flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Uninstall</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleInstall(skill.id)}
                        disabled={actionLoading === skill.id}
                        className="px-4 py-1.5 bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{actionLoading === skill.id ? 'Installing...' : 'Install'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Inspection Modal */}
      {inspectSkill && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9]">{inspectSkill.name}</h2>
                <span className="text-xs font-mono text-[#00F0FF]">ID: {inspectSkill.id} • v{inspectSkill.version}</span>
              </div>
              <button
                onClick={() => setInspectSkill(null)}
                className="text-[#64748B] hover:text-[#F1F5F9] text-sm font-mono"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-sm text-[#94A3B8]">{inspectSkill.description}</p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#0E1522] p-4 rounded-xl border border-[#1E293B]">
              <div>
                <span className="text-[#64748B] block">Publisher:</span>
                <span className="text-[#F1F5F9] font-bold">{inspectSkill.publisher.name} {inspectSkill.publisher.verified ? '✓ (Verified)' : ''}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Certification:</span>
                <span className="text-emerald-400 font-bold">{inspectSkill.certification}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Risk Rating:</span>
                <span className="text-amber-400 font-bold">{inspectSkill.risk.level}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">SHA-256 Checksum:</span>
                <span className="text-[#00F0FF] truncate block">{inspectSkill.sha256 || 'Verified in lockfile'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <h4 className="text-xs font-bold uppercase text-[#94A3B8]">Declared Permissions</h4>
              <div className="p-3 bg-[#0E1522] rounded-lg border border-[#1E293B] space-y-1">
                <div>Network: <span className="text-[#F1F5F9]">{inspectSkill.permissions.network.enabled ? `Enabled (${inspectSkill.permissions.network.allowedDomains.join(', ') || 'all'})` : 'Disabled'}</span></div>
                <div>Filesystem Read: <span className="text-[#F1F5F9]">{inspectSkill.permissions.filesystem.read.join(', ') || 'None'}</span></div>
                <div>Filesystem Write: <span className="text-[#F1F5F9]">{inspectSkill.permissions.filesystem.write.join(', ') || 'None'}</span></div>
                <div>Shell Execution: <span className="text-[#F1F5F9]">{inspectSkill.permissions.shell.enabled ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <h4 className="text-xs font-bold uppercase text-[#94A3B8]">Exposed MCP Tools</h4>
              <div className="flex flex-wrap gap-1.5">
                {inspectSkill.tools.map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-[#162032] border border-[#1E293B] rounded text-[#00F0FF]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#1E293B]">
              <button
                onClick={() => setInspectSkill(null)}
                className="px-4 py-2 bg-[#162032] text-[#F1F5F9] rounded-lg text-xs font-mono"
              >
                Close
              </button>
              {inspectSkill.isInstalled ? (
                <button
                  onClick={() => { handleUninstall(inspectSkill.id); setInspectSkill(null); }}
                  className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-mono"
                >
                  Uninstall Skill
                </button>
              ) : (
                <button
                  onClick={() => { handleInstall(inspectSkill.id); setInspectSkill(null); }}
                  className="px-4 py-2 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 rounded-lg text-xs font-mono font-bold"
                >
                  Install to Hikmah
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
