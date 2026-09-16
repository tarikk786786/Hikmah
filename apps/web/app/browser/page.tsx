'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Camera,
  Play,
  Terminal,
  Shield,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  MousePointer,
  Cpu,
  Eye,
  Settings,
  ExternalLink,
} from 'lucide-react';
import {
  BrowserSession,
  BrowserProfile,
  DOMSnapshot,
  AccessibilityNode,
  BrowserActionResult,
  SemanticObserveSuggestion,
  BrowserAgentGoal,
} from '@/browser/core/types';

export default function BrowserDashboardPage() {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<BrowserSession | null>(null);

  // View tabs
  const [viewTab, setViewTab] = useState<'viewport' | 'dom' | 'a11y' | 'network' | 'agent'>('viewport');
  const [rightTab, setRightTab] = useState<'stagehand' | 'observe' | 'agent' | 'profile'>('stagehand');

  // Navigation state
  const [urlInput, setUrlInput] = useState('https://news.ycombinator.com');
  const [navigating, setNavigating] = useState(false);

  // Inspection states
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [domSnapshot, setDomSnapshot] = useState<DOMSnapshot | null>(null);
  const [a11yTree, setA11yTree] = useState<AccessibilityNode | null>(null);
  const [observeSuggestions, setObserveSuggestions] = useState<SemanticObserveSuggestion[]>([]);

  // Stagehand semantic action states
  const [actInstruction, setActInstruction] = useState('');
  const [actLoading, setActLoading] = useState(false);
  const [actionHistory, setActionHistory] = useState<BrowserActionResult[]>([]);

  // Autonomous Agent state
  const [agentGoal, setAgentGoal] = useState('Find the top news story and extract its title and link');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<BrowserAgentGoal | null>(null);

  // Load initial sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/browser/session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setProfiles(data.profiles || []);
        if (data.sessions?.length > 0 && !activeSessionId) {
          setActiveSessionId(data.sessions[0].id);
          setActiveSession(data.sessions[0]);
          setUrlInput(data.sessions[0].currentUrl || 'https://news.ycombinator.com');
        }
      }
    } catch {
      // Ignore initial load failure
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Update active session details when ID changes
  useEffect(() => {
    if (activeSessionId) {
      const found = sessions.find((s) => s.id === activeSessionId);
      if (found) {
        setActiveSession(found);
        if (found.currentUrl && found.currentUrl !== 'about:blank') {
          setUrlInput(found.currentUrl);
        }
      }
    }
  }, [activeSessionId, sessions]);

  // Create new session
  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchSessions();
        setActiveSessionId(data.session.id);
        setActiveSession(data.session);
      }
    } catch (e) {
      console.error('Failed to create session', e);
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (!activeSessionId) return;
    try {
      await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId: activeSessionId }),
      });
      await fetchSessions();
      setActiveSessionId('');
      setActiveSession(null);
      setDomSnapshot(null);
      setScreenshotBase64(null);
    } catch (e) {
      console.error('Failed to close session', e);
    }
  };

  // Navigate
  const handleNavigate = async (targetUrl?: string) => {
    const dest = targetUrl || urlInput;
    if (!dest) return;
    setNavigating(true);

    try {
      const res = await fetch('/api/browser/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId || undefined,
          url: dest,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSessionId(data.sessionId);
        setActiveSession(data.session);
        setUrlInput(data.session?.currentUrl || dest);
        // Refresh DOM & Screenshot automatically
        await Promise.all([loadSnapshot(data.sessionId), captureScreenshot(data.sessionId)]);
      }
    } catch (e) {
      console.error('Navigation error', e);
    } finally {
      setNavigating(false);
    }
  };

  // Capture screenshot
  const captureScreenshot = async (sessionId?: string) => {
    const sId = sessionId || activeSessionId;
    if (!sId) return;
    try {
      const res = await fetch(`/api/browser/screenshot?sessionId=${sId}&asJson=true`);
      if (res.ok) {
        const data = await res.json();
        setScreenshotBase64(data.base64);
      }
    } catch (e) {
      console.error('Screenshot error', e);
    }
  };

  // Load DOM Snapshot
  const loadSnapshot = async (sessionId?: string) => {
    const sId = sessionId || activeSessionId;
    if (!sId) return;
    try {
      const res = await fetch(`/api/browser/snapshot?sessionId=${sId}&mode=dom`);
      if (res.ok) {
        const data = await res.json();
        setDomSnapshot(data.data);
      }
    } catch (e) {
      console.error('Snapshot error', e);
    }
  };

  // Load A11y Tree
  const loadA11y = async () => {
    if (!activeSessionId) return;
    try {
      const res = await fetch(`/api/browser/snapshot?sessionId=${activeSessionId}&mode=a11y`);
      if (res.ok) {
        const data = await res.json();
        setA11yTree(data.data);
      }
    } catch (e) {
      console.error('A11y error', e);
    }
  };

  // Load Stagehand Observe Suggestions
  const loadObserve = async () => {
    if (!activeSessionId) return;
    try {
      const res = await fetch(`/api/browser/snapshot?sessionId=${activeSessionId}&mode=observe`);
      if (res.ok) {
        const data = await res.json();
        setObserveSuggestions(data.data.suggestions || []);
      }
    } catch (e) {
      console.error('Observe error', e);
    }
  };

  // Execute Stagehand semantic act
  const handleActSemantic = async (instructionToRun?: string) => {
    const text = instructionToRun || actInstruction;
    if (!text || !activeSessionId) return;
    setActLoading(true);

    try {
      const res = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          type: 'act_semantic',
          params: { instruction: text },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionHistory((prev) => [data.result, ...prev]);
        setActInstruction('');
        // Refresh page state
        await Promise.all([loadSnapshot(), captureScreenshot()]);
      }
    } catch (e) {
      console.error('Semantic act error', e);
    } finally {
      setActLoading(false);
    }
  };

  // Run Autonomous Agent Goal
  const handleRunAgent = async () => {
    if (!agentGoal) return;
    setAgentRunning(true);

    try {
      const res = await fetch('/api/browser/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: agentGoal,
          startUrl: urlInput || 'https://news.ycombinator.com',
          sessionId: activeSessionId || undefined,
          maxSteps: 8,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAgentResult(data.task);
        if (data.task?.sessionId) {
          setActiveSessionId(data.task.sessionId);
          await Promise.all([loadSnapshot(data.task.sessionId), captureScreenshot(data.task.sessionId)]);
        }
      }
    } catch (e) {
      console.error('Agent execution error', e);
    } finally {
      setAgentRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Top Header & Session Selector */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-900/70 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-neutral-100 flex items-center space-x-2">
              <span>Browser Intelligence Engine</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                PRD 12
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Playwright Driver • Stagehand Semantic AI • Autonomous Agent</p>
          </div>
        </div>

        {/* Session Switcher Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-xs text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            {sessions.length === 0 && <option value="">No Active Sessions</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session {s.id.substring(0, 8)} ({s.status}) — {s.title.slice(0, 24)}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateSession}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
          >
            + New Session
          </button>

          {activeSessionId && (
            <button
              onClick={handleCloseSession}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors"
            >
              Close Session
            </button>
          )}
        </div>
      </header>

      {/* Browser Navigation URL Bar */}
      <div className="flex items-center space-x-2 px-6 py-2.5 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center space-x-1 text-neutral-400">
          <button
            disabled={navigating}
            onClick={() => handleNavigate(urlInput)}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            disabled={navigating}
            onClick={() => handleNavigate(urlInput)}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            disabled={navigating}
            onClick={() => handleNavigate(urlInput)}
            className={`p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors ${navigating ? 'animate-spin text-emerald-400' : ''}`}
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* URL Input */}
        <div className="flex-1 relative flex items-center">
          <div className="absolute left-3 text-neutral-500">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            placeholder="Enter URL to browse (e.g. https://news.ycombinator.com)..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg pl-9 pr-24 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
          />
          <button
            onClick={() => handleNavigate()}
            disabled={navigating}
            className="absolute right-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-neutral-950 text-xs font-semibold transition-colors"
          >
            {navigating ? 'Loading...' : 'Go'}
          </button>
        </div>

        {/* Quick presets */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-neutral-400">
          <span className="text-neutral-600 text-[10px]">Presets:</span>
          <button
            onClick={() => {
              setUrlInput('https://news.ycombinator.com');
              handleNavigate('https://news.ycombinator.com');
            }}
            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
          >
            Hacker News
          </button>
          <button
            onClick={() => {
              setUrlInput('https://arxiv.org');
              handleNavigate('https://arxiv.org');
            }}
            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
          >
            arXiv
          </button>
          <button
            onClick={() => {
              setUrlInput('https://en.wikipedia.org');
              handleNavigate('https://en.wikipedia.org');
            }}
            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
          >
            Wikipedia
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => captureScreenshot()}
            title="Capture Screenshot"
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center space-x-1"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Capture</span>
          </button>
        </div>
      </div>

      {/* Main Split Cockpit */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left / Center Viewport & Inspector Panel (65%) */}
        <div className="flex-1 flex flex-col border-r border-neutral-800 overflow-hidden">
          {/* Subtabs for Left Panel */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-neutral-800 bg-neutral-900/40 text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewTab('viewport')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewTab === 'viewport' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Viewport View
              </button>
              <button
                onClick={() => {
                  setViewTab('dom');
                  loadSnapshot();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewTab === 'dom' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                DOM & Elements ({domSnapshot?.interactiveElements.length || 0})
              </button>
              <button
                onClick={() => {
                  setViewTab('a11y');
                  loadA11y();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewTab === 'a11y' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Accessibility Tree
              </button>
              <button
                onClick={() => setViewTab('agent')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewTab === 'agent' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Agent Execution
              </button>
            </div>

            {activeSession && (
              <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeSession.title.slice(0, 32)}</span>
              </div>
            )}
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-neutral-950">
            {viewTab === 'viewport' && (
              <div className="flex flex-col items-center justify-center h-full">
                {screenshotBase64 ? (
                  <div className="border border-neutral-800 rounded-xl overflow-hidden shadow-2xl max-w-full">
                    {/* Render screenshot */}
                    <img
                      src={`data:image/png;base64,${screenshotBase64}`}
                      alt="Browser Viewport"
                      className="max-h-[68vh] object-contain w-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-neutral-800 rounded-xl max-w-md">
                    <Globe className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-neutral-300">Ready to Browse</h3>
                    <p className="text-xs text-neutral-500 mt-1 mb-4">
                      Enter a URL above and click Go to load deterministic page state, capture visual rendering, and inspect interactive elements.
                    </p>
                    <button
                      onClick={() => handleNavigate('https://news.ycombinator.com')}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-semibold"
                    >
                      Browse Hacker News Demo
                    </button>
                  </div>
                )}
              </div>
            )}

            {viewTab === 'dom' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Interactive Elements Catalog
                  </h3>
                  <button
                    onClick={() => loadSnapshot()}
                    className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Refresh Elements</span>
                  </button>
                </div>

                {domSnapshot?.interactiveElements.length ? (
                  <div className="border border-neutral-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs text-neutral-300">
                      <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-mono text-[11px]">
                        <tr>
                          <th className="p-2.5">Tag</th>
                          <th className="p-2.5">Text / Content</th>
                          <th className="p-2.5">Selector</th>
                          <th className="p-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900">
                        {domSnapshot.interactiveElements.map((el, i) => (
                          <tr key={i} className="hover:bg-neutral-900/50 transition-colors font-mono">
                            <td className="p-2.5 text-emerald-400">&lt;{el.tag}&gt;</td>
                            <td className="p-2.5 text-neutral-200 font-sans max-w-xs truncate">
                              {el.text || el.ariaLabel || el.placeholder || '—'}
                            </td>
                            <td className="p-2.5 text-neutral-400 text-[11px] truncate max-w-xs">
                              {el.selector}
                            </td>
                            <td className="p-2.5">
                              <button
                                onClick={() => handleActSemantic(`click on ${el.text || el.selector}`)}
                                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-[10px] font-sans font-medium"
                              >
                                Click Element
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No interactive elements discovered yet. Navigate to a page first.</p>
                )}
              </div>
            )}

            {viewTab === 'a11y' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-300 uppercase tracking-wider font-sans">
                    Screen-Reader Accessibility Hierarchy
                  </h3>
                  <button
                    onClick={() => loadA11y()}
                    className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 font-sans"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Refresh A11y</span>
                  </button>
                </div>

                {a11yTree ? (
                  <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 overflow-x-auto text-neutral-300">
                    <div className="text-emerald-400 font-bold mb-2">Role: {a11yTree.role} ({a11yTree.name})</div>
                    {a11yTree.children?.map((child, idx) => (
                      <div key={idx} className="ml-4 border-l border-neutral-700 pl-3 py-1">
                        <span className="text-amber-400 font-semibold">{child.role}</span>: {child.name || child.selector}
                        {child.children?.map((gc, gcIdx) => (
                          <div key={gcIdx} className="ml-4 border-l border-neutral-800 pl-3 py-0.5 text-neutral-400 text-[11px]">
                            <span className="text-sky-400">{gc.role}</span>: {gc.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 font-sans">Click Refresh A11y to inspect screen reader tree.</p>
                )}
              </div>
            )}

            {viewTab === 'agent' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Autonomous Goal Execution Tracker
                  </h3>
                  {agentRunning && (
                    <span className="flex items-center space-x-1.5 text-xs text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Agent Running...</span>
                    </span>
                  )}
                </div>

                {agentResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-emerald-400">Goal: {agentResult.goal}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 uppercase">
                          {agentResult.status}
                        </span>
                      </div>
                      {agentResult.finalAnswer && (
                        <div className="mt-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200">
                          <p className="font-semibold text-emerald-400 mb-1">Final Result:</p>
                          <pre className="whitespace-pre-wrap font-mono text-[11px]">
                            {JSON.stringify(agentResult.finalAnswer, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-neutral-400">Step Trace ({agentResult.steps.length} steps)</h4>
                      {agentResult.steps.map((step) => (
                        <div key={step.stepNumber} className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs">
                          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                            <span>Step {step.stepNumber} • {step.action.type}</span>
                            <span className={step.result.success ? 'text-emerald-400' : 'text-rose-400'}>
                              {step.result.durationMs}ms
                            </span>
                          </div>
                          <p className="text-neutral-200 font-sans mb-1">{step.thought}</p>
                          {step.result.healedSelector && (
                            <div className="text-[10px] text-amber-300 font-mono mt-1">
                              ⚡ Self-Healed Selector: {step.result.healedSelector}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl">
                    <Cpu className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                    <p className="text-xs text-neutral-400">No agent run in progress. Launch a goal from the right sidebar.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Action & Intelligence Sidebar (35%) */}
        <div className="w-full md:w-96 flex flex-col bg-neutral-900/30 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="flex items-center border-b border-neutral-800 bg-neutral-900/60 p-1">
            <button
              onClick={() => setRightTab('stagehand')}
              className={`flex-1 py-1.5 rounded text-xs font-medium text-center transition-colors ${
                rightTab === 'stagehand' ? 'bg-neutral-800 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Stagehand Act
            </button>
            <button
              onClick={() => {
                setRightTab('observe');
                loadObserve();
              }}
              className={`flex-1 py-1.5 rounded text-xs font-medium text-center transition-colors ${
                rightTab === 'observe' ? 'bg-neutral-800 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Observe ({observeSuggestions.length})
            </button>
            <button
              onClick={() => setRightTab('agent')}
              className={`flex-1 py-1.5 rounded text-xs font-medium text-center transition-colors ${
                rightTab === 'agent' ? 'bg-neutral-800 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Agent Goal
            </button>
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {rightTab === 'stagehand' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Natural Language Command (Stagehand Act)
                  </label>
                  <textarea
                    rows={3}
                    value={actInstruction}
                    onChange={(e) => setActInstruction(e.target.value)}
                    placeholder="e.g. 'click on the first article link' or 'type AI in search bar'..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => handleActSemantic()}
                      disabled={actLoading || !actInstruction}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-neutral-950 text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{actLoading ? 'Executing...' : 'Execute Act'}</span>
                    </button>
                  </div>
                </div>

                {/* Action execution history */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Recent Executions
                  </h4>
                  {actionHistory.length === 0 ? (
                    <p className="text-xs text-neutral-500">No actions performed yet.</p>
                  ) : (
                    actionHistory.map((act, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={act.success ? 'text-emerald-400' : 'text-rose-400'}>
                            {act.type.toUpperCase()}
                          </span>
                          <span className="text-neutral-500">{act.durationMs}ms</span>
                        </div>
                        {act.healedSelector && (
                          <p className="text-[10px] text-amber-300">⚡ Healed: {act.healedSelector}</p>
                        )}
                        {act.error && <p className="text-[10px] text-rose-400">{act.error}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {rightTab === 'observe' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-300">Discovered Affordances</h4>
                  <button onClick={() => loadObserve()} className="text-xs text-emerald-400 hover:underline">
                    Re-scan
                  </button>
                </div>
                {observeSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleActSemantic(item.description)}
                    className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 cursor-pointer transition-all hover:border-emerald-500/50"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-200 font-medium">
                      <span>{item.description}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                    {item.selector && (
                      <p className="text-[10px] text-neutral-500 font-mono mt-1 truncate">{item.selector}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {rightTab === 'agent' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Autonomous Multi-Step Goal
                  </label>
                  <textarea
                    rows={3}
                    value={agentGoal}
                    onChange={(e) => setAgentGoal(e.target.value)}
                    placeholder="Enter high-level browser objective..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRunAgent}
                    disabled={agentRunning || !agentGoal}
                    className="w-full mt-2.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-neutral-950 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{agentRunning ? 'Agent in Progress...' : 'Launch Browser Agent'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                  <p className="font-semibold text-neutral-300">BrowserUseAgent Capabilities:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>Multi-step sequential navigation</li>
                    <li>Automatic self-healing on broken selectors</li>
                    <li>Stagehand observe-driven affordance selection</li>
                    <li>Structured data extraction & summarization</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
