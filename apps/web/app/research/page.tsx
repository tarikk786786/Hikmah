'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Play,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { ResearchMode, ResearchTask, ResearchReport, Claim, SearchResultItem, ResearchMonitorJob, ResearchMonitorDiff } from '@/research/core/types';

export default function ResearchDashboardPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'claims' | 'monitor' | 'quicksearch'>('tasks');
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(false);

  // New research form state
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('STANDARD');
  const [persistToStorage, setPersistToStorage] = useState(true);

  // Claim verification state
  const [claimInput, setClaimInput] = useState('');
  const [verifiedClaim, setVerifiedClaim] = useState<Claim | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  // Quick search state
  const [quickQuery, setQuickQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Monitor state
  const [monitors, setMonitors] = useState<ResearchMonitorJob[]>([]);
  const [monitorDiffs, setMonitorDiffs] = useState<Record<string, ResearchMonitorDiff[]>>({});
  const [newMonitorTitle, setNewMonitorTitle] = useState('');
  const [newMonitorUrls, setNewMonitorUrls] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/research');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // Ignore initial load failure
    }
  };

  const fetchMonitors = async () => {
    try {
      const res = await fetch('/api/research/monitor');
      if (res.ok) {
        const data = await res.json();
        setMonitors(data.jobs || []);
      }
    } catch {
      // Ignore initial load failure
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMonitors();
  }, []);

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          mode: selectedMode,
          persistToStorage,
          runImmediately: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => [data.task, ...prev]);
          setSelectedTask(data.task);
          if (data.report) setSelectedReport(data.report);
        }
        setNewQuestion('');
      }
    } catch (err) {
      console.error('Failed to start research:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTask = async (task: ResearchTask) => {
    setSelectedTask(task);
    if (task.report) {
      setSelectedReport(task.report);
    } else {
      try {
        const res = await fetch(`/api/research/${task.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.report) setSelectedReport(data.report);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      }
    }
  };

  const handleVerifyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim()) return;
    setClaimLoading(true);

    try {
      const res = await fetch('/api/research/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifiedClaim(data.claim);
      }
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    setSearchLoading(true);

    try {
      const res = await fetch(`/api/research/search?q=${encodeURIComponent(quickQuery)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonitorTitle.trim() || !newMonitorUrls.trim()) return;

    try {
      const urls = newMonitorUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch('/api/research/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMonitorTitle,
          targetUrls: urls,
          frequencyMinutes: 60,
          checkImmediately: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.job) {
          setMonitors((prev) => [data.job, ...prev]);
          if (data.diffs) {
            setMonitorDiffs((prev) => ({ ...prev, [data.job.id]: data.diffs }));
          }
        }
        setNewMonitorTitle('');
        setNewMonitorUrls('');
      }
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  const handleCheckMonitor = async (id: string) => {
    try {
      const res = await fetch('/api/research/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitorId: id, checkImmediately: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setMonitorDiffs((prev) => ({ ...prev, [id]: data.diffs }));
      }
    } catch (err) {
      console.error('Failed to check monitor:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            Universal Web Research Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous 11-stage research pipeline, Trafilatura extraction, anti-hallucination verification & change monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchTasks(); fetchMonitors(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Deep Research ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Claim Verification
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'monitor'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Change Monitoring ({monitors.length})
        </button>
        <button
          onClick={() => setActiveTab('quicksearch')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'quicksearch'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          Multi-Engine Search
        </button>
      </div>

      {/* Tab 1: Deep Research Tasks */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Start Form & List */}
          <div className="space-y-6 lg:col-span-1">
            {/* Start Research Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400" />
                Launch Deep Research
              </h2>
              <form onSubmit={handleStartResearch} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Research Question or Investigation Topic
                  </label>
                  <textarea
                    rows={3}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g., What are the security implications of WebAssembly in modern browsers?"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Pipeline Mode</label>
                    <select
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value as ResearchMode)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="QUICK">QUICK (Fast sweep)</option>
                      <option value="STANDARD">STANDARD (Comprehensive)</option>
                      <option value="DEEP">DEEP (Multi-hop crawl)</option>
                      <option value="INVESTIGATION">INVESTIGATION (Exhaustive)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={persistToStorage}
                        onChange={(e) => setPersistToStorage(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                      />
                      Archive in Storage
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !newQuestion.trim()}
                  className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing Pipeline...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Start Investigation
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Task History List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Recent Investigations</h2>
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500">No research tasks launched yet.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleViewTask(task)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedTask?.id === task.id
                          ? 'border-cyan-500/50 bg-cyan-950/20'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {task.mode}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : task.status === 'FAILED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2">{task.question}</p>
                      <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
                        <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                        <span>{task.progressPercent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Detailed Report View */}
          <div className="lg:col-span-2 space-y-4">
            {selectedReport ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Report: {selectedReport.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      Mode: <strong className="text-slate-200">{selectedReport.mode}</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">{selectedReport.question}</h2>
                </div>

                {/* Executive Summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Executive Summary</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedReport.summary}</p>
                </div>

                {/* Key Corroborated Claims */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Verified & Corroborated Claims ({selectedReport.claims.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.claims.map((claim) => (
                      <div key={claim.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                        <span
                          className={`mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded ${
                            claim.status === 'CORROBORATED'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-cyan-950 text-cyan-400'
                          }`}
                        >
                          {claim.status}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-slate-200">{claim.claim}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                            <span>Confidence: {(claim.confidence * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>{claim.sourceIds.length} source(s)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sources & Citations */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Canonical Sources & References ({selectedReport.sources.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedReport.sources.map((src) => (
                      <a
                        key={src.id}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg block transition text-xs group"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="truncate max-w-[150px]">{src.publisher || 'Web'}</span>
                          <span className="font-mono text-cyan-400">Auth: {src.authority}/10</span>
                        </div>
                        <div className="font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                          {src.title}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Timeline if present */}
                {selectedReport.timeline.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Chronological Timeline
                    </h3>
                    <div className="space-y-2 border-l-2 border-purple-500/30 pl-4">
                      {selectedReport.timeline.map((evt) => (
                        <div key={evt.id} className="text-xs space-y-0.5">
                          <div className="font-mono text-[10px] text-purple-400">{evt.eventDate}</div>
                          <div className="font-medium text-slate-200">{evt.title}</div>
                          <div className="text-slate-400 text-[11px]">{evt.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]">
                <Globe className="w-12 h-12 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-300">No Investigation Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Launch a new deep research inquiry or select an existing investigation from the history panel to inspect verified claims and citations.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Claim Verification */}
      {activeTab === 'claims' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Instant Claim Verification Terminal
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Subject an assertion to web-grounded corroboration check against live sources.
              </p>
            </div>

            <form onSubmit={handleVerifyClaim} className="space-y-3">
              <textarea
                rows={3}
                value={claimInput}
                onChange={(e) => setClaimInput(e.target.value)}
                placeholder="Enter claim to verify (e.g. SQLite supports concurrent multi-process writes in WAL mode)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={claimLoading || !claimInput.trim()}
                className="py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 transition"
              >
                {claimLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Cross-checking Web Sources...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Verify Claim
                  </>
                )}
              </button>
            </form>

            {verifiedClaim && (
              <div className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Verdict</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      verifiedClaim.status === 'CORROBORATED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : verifiedClaim.status === 'SUPPORTED'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {verifiedClaim.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-200">{verifiedClaim.claim}</p>
                <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span>Confidence Score:</span>
                    <strong className="text-slate-200">{(verifiedClaim.confidence * 100).toFixed(0)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Supporting Sources:</span>
                    <strong className="text-slate-200">{verifiedClaim.sourceIds.length} evaluated</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Change Monitoring */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-1">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Add URL Change Monitor
            </h2>
            <form onSubmit={handleCreateMonitor} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Monitor Name</label>
                <input
                  type="text"
                  value={newMonitorTitle}
                  onChange={(e) => setNewMonitorTitle(e.target.value)}
                  placeholder="e.g. PostgreSQL Release Notes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target URLs (one per line)</label>
                <textarea
                  rows={4}
                  value={newMonitorUrls}
                  onChange={(e) => setNewMonitorUrls(e.target.value)}
                  placeholder="https://news.ycombinator.com&#10;https://github.com/nodejs/node/releases"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition"
              >
                Create & Run Initial Snapshot
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-white">Active Watchers ({monitors.length})</h2>
            {monitors.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                No web monitors registered. Add a monitor on the left to track page diffs automatically.
              </div>
            ) : (
              <div className="space-y-4">
                {monitors.map((mon) => (
                  <div key={mon.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">{mon.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{mon.targetUrls.length} URL(s) tracked</p>
                      </div>
                      <button
                        onClick={() => handleCheckMonitor(mon.id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Check Now
                      </button>
                    </div>

                    {monitorDiffs[mon.id] && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400">Latest Diffs:</span>
                        {monitorDiffs[mon.id].map((diff) => (
                          <div key={diff.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-cyan-400 text-[10px] truncate max-w-[200px]">{diff.url}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                  diff.changeType === 'NEW'
                                    ? 'bg-blue-950 text-blue-400'
                                    : diff.changeType === 'CHANGED'
                                    ? 'bg-amber-950 text-amber-400'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {diff.changeType}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{diff.diffSummary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Multi-Engine Search */}
      {activeTab === 'quicksearch' && (
        <div className="space-y-6">
          <form onSubmit={handleQuickSearch} className="flex gap-2 max-w-2xl">
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search across SearXNG, Academic papers, GitHub repos, and Archive.org..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={searchLoading || !quickQuery.trim()}
              className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 transition"
            >
              {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-400">Results ({searchResults.length})</h2>
              <div className="space-y-2">
                {searchResults.map((res, i) => (
                  <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-cyan-400">{res.domain}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{res.sourceType}</span>
                    </div>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-semibold text-white hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      {res.title}
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                    <p className="text-xs text-slate-400 leading-relaxed">{res.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
