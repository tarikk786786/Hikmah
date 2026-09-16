'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles, Terminal, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Layers } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{ toolName: string; result: any }>;
  plan?: any;
  approvalRequired?: any;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Good evening. J.A.R.V.I.S. core systems online. Memory indexed, model router operational, background queue standing by. What shall we do?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: userQuery },
      { id: assistantMsgId, role: 'assistant', content: '' }
    ]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, stream: false })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: data.content,
                toolResults: data.toolResults,
                plan: data.plan
              }
            : msg
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error processing request: ${err.message}` }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, approved: boolean) => {
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId, approved })
      });
      alert(`Action ${approved ? 'approved' : 'rejected'}`);
    } catch (err: any) {
      alert(`Failed to resolve approval: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#0B0F17]">
      {/* HUD Header */}
      <header className="h-14 border-b border-[#1E293B] px-6 flex items-center justify-between bg-[#0E1522]/80 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-ping" />
          <span className="text-sm font-semibold tracking-wider text-[#F1F5F9]">J.A.R.V.I.S. CONSOLE</span>
          <span className="text-[11px] text-[#64748B] font-mono">v0.1.0-alpha</span>
        </div>
        <div className="flex items-center space-x-4 text-xs font-mono text-[#94A3B8]">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>ROUTER: ACTIVE</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
            <span>MEMORY: INDEXED</span>
          </span>
        </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-2 mb-1.5 text-xs text-[#64748B] font-mono">
              <span>{msg.role === 'user' ? 'OPERATOR' : 'JARVIS'}</span>
            </div>

            <div
              className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#00F0FF]/15 text-[#F1F5F9] border border-[#00F0FF]/30'
                  : 'bg-[#111827] text-[#F1F5F9] border border-[#1E293B]'
              }`}
            >
              {msg.content || (loading && msg.id.startsWith('asst_') ? (
                <div className="flex items-center space-x-2 text-[#00F0FF]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-xs">Computing response...</span>
                </div>
              ) : null)}

              {/* Plan Steps Visibility */}
              {msg.plan && msg.plan.steps && msg.plan.steps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1E293B]/70">
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#00F0FF] mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>EXECUTION PLAN ({msg.plan.steps.length} STEPS)</span>
                  </div>
                  <div className="space-y-1">
                    {msg.plan.steps.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-[#0B0F17]/50 px-2.5 py-1 rounded border border-[#1E293B]">
                        <span className="text-[#94A3B8]">{idx + 1}. {s.description}</span>
                        <span className={`text-[10px] uppercase font-mono ${s.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tool Execution Badges */}
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1E293B]/70 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#94A3B8]">
                    <Terminal className="w-3.5 h-3.5 text-[#00F0FF]" />
                    <span>TOOL ACTIONS EXECUTED</span>
                  </div>
                  {msg.toolResults.map((tr, idx) => (
                    <div key={idx} className="text-xs bg-[#0B0F17] p-2 rounded border border-[#1E293B] font-mono">
                      <div className="flex justify-between items-center text-[#00F0FF]">
                        <span>⚡ {tr.toolName}</span>
                        <span className="text-[10px] text-[#64748B]">{tr.result.executionTimeMs}ms</span>
                      </div>
                      {tr.result.data && (
                        <pre className="mt-1 text-[11px] text-[#94A3B8] overflow-x-auto">
                          {JSON.stringify(tr.result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Suggestions */}
      <div className="px-6 py-2 flex items-center space-x-2 overflow-x-auto text-xs text-[#94A3B8]">
        <span className="text-[#64748B] text-[11px] font-mono">Recent:</span>
        <button
          onClick={() => setInput('Research latest advancements in AI agent architecture')}
          className="px-2.5 py-1 rounded-full bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] transition"
        >
          • Research task
        </button>
        <button
          onClick={() => setInput('Inspect system status and memory metrics')}
          className="px-2.5 py-1 rounded-full bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] transition"
        >
          • System status
        </button>
        <button
          onClick={() => setInput('Calculate 128 * 1024')}
          className="px-2.5 py-1 rounded-full bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] transition"
        >
          • Calculate formula
        </button>
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0E1522]">
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask JARVIS anything..."
            className="w-full bg-[#111827] text-[#F1F5F9] placeholder-[#64748B] text-sm pl-4 pr-24 py-3 rounded-xl border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50"
          />
          <div className="absolute right-2 flex items-center space-x-1">
            <button
              type="button"
              title="Voice Input (STT)"
              onClick={() => alert('Voice session ready — visit /voice view for complete audio visualizer.')}
              className="p-2 text-[#94A3B8] hover:text-[#00F0FF] rounded-lg transition"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[#00F0FF] hover:bg-[#00D0DF] disabled:opacity-50 text-[#0B0F17] rounded-lg transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
