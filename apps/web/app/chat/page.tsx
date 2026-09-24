'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Terminal, RefreshCw, Layers, Radio, Volume2, Activity, Server, Cpu, Database, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{ toolName: string; result: any }>;
  plan?: any;
}

export default function AllInOnePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Good evening. J.A.R.V.I.S. unified core systems online. Voice interface, memory, and model router are fully integrated. What shall we do?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dashboard State
  const [stats, setStats] = useState({ agentCount: 0, knowledgeCount: 0, activeModels: 0, uptime: 0, health: 100 });
  const [isConnected, setIsConnected] = useState(true);

  // Voice Mode State
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/paios/dashboard');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || input.trim();
    if (!query || loading) return;

    setInput('');
    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: query },
      { id: assistantMsgId, role: 'assistant', content: '' }
    ]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, stream: false })
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

  const toggleVoiceMode = () => {
    if (!voiceMode) {
      setVoiceMode(true);
      setListening(true);
      setLiveTranscript('Listening for operator audio stream (faster-whisper VAD)...');
      
      // Simulate Voice STT pipeline
      setTimeout(() => {
        setLiveTranscript('"JARVIS, summarize current memory store status."');
        setTimeout(() => {
          setListening(false);
          handleSubmit(undefined, "JARVIS, summarize current memory store status.");
        }, 1500);
      }, 3000);
    } else {
      setVoiceMode(false);
      setListening(false);
      setLiveTranscript('');
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-[#0B0F17] text-[#F1F5F9] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR: DASHBOARD & METRICS */}
      <div className="w-64 border-r border-[#1E293B] bg-[#0E1522] flex flex-col p-4 space-y-6 overflow-y-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-ping" />
          <span className="text-sm font-bold tracking-widest">HIKMAH OS</span>
        </div>
        
        <div className="space-y-4">
          <div className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-2">Live Telemetry</div>
          
          <div className="bg-[#111827] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-[#00F0FF]" />
              <span className="text-xs">Agents</span>
            </div>
            <span className="text-sm font-mono text-[#F1F5F9]">{stats.agentCount}</span>
          </div>

          <div className="bg-[#111827] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">Vault Files</span>
            </div>
            <span className="text-sm font-mono text-[#F1F5F9]">{stats.knowledgeCount}</span>
          </div>

          <div className="bg-[#111827] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span className="text-xs">Models</span>
            </div>
            <span className="text-sm font-mono text-[#F1F5F9]">{stats.activeModels}</span>
          </div>

          <div className="bg-[#111827] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs">Health</span>
            </div>
            <span className="text-sm font-mono text-[#F1F5F9]">{stats.health}%</span>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[#1E293B]">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'SYSTEM CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CHAT INTERFACE */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-14 border-b border-[#1E293B] px-6 flex items-center justify-between bg-[#0B0F17]/80 backdrop-blur z-10">
          <span className="text-xs text-[#64748B] font-mono">WORKSPACE // MAIN</span>
          <div className="flex items-center space-x-4 text-xs font-mono text-[#94A3B8]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ROUTER: ACTIVE</span>
            </span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-2 mb-1.5 text-xs text-[#64748B] font-mono">
                <span>{msg.role === 'user' ? 'OPERATOR' : 'JARVIS'}</span>
              </div>

              <div
                className={`max-w-3xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#00F0FF]/15 text-[#F1F5F9] border border-[#00F0FF]/30'
                    : 'bg-[#111827] text-[#F1F5F9] border border-[#1E293B] shadow-lg'
                }`}
              >
                {msg.content || (loading && msg.id.startsWith('asst_') ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-3 text-[#00F0FF]"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="font-mono text-xs">Computing sequence...</span>
                    <div className="flex space-x-1">
                      {[0,1,2].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null)}

                {/* Plan Steps Visibility */}
                {msg.plan && msg.plan.steps && msg.plan.steps.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-[#1E293B]/70"
                  >
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#00F0FF] mb-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>EXECUTION PLAN ({msg.plan.steps.length} STEPS)</span>
                    </div>
                    <div className="space-y-1">
                      {msg.plan.steps.map((s: any, idx: number) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center justify-between text-xs bg-[#0B0F17]/50 px-2.5 py-1 rounded border border-[#1E293B]"
                        >
                          <span className="text-[#94A3B8]">{idx + 1}. {s.description}</span>
                          <span className={`text-[10px] uppercase font-mono ${s.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {s.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Tool Execution Badges */}
                {msg.toolResults && msg.toolResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 pt-3 border-t border-[#1E293B]/70 space-y-1.5"
                  >
                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#94A3B8]">
                      <Terminal className="w-3.5 h-3.5 text-[#00F0FF]" />
                      <span>TOOL ACTIONS EXECUTED</span>
                    </div>
                    {msg.toolResults.map((tr, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.15 }}
                        className="text-xs bg-[#0B0F17] p-2 rounded border border-[#1E293B] font-mono"
                      >
                        <div className="flex justify-between items-center text-[#00F0FF]">
                          <span>&gt; {tr.toolName}</span>
                          <span className="text-[10px] text-[#64748B]">{tr.result.executionTimeMs || 0}ms</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* VOICE MODE OVERLAY */}
        <AnimatePresence>
          {voiceMode && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-[#111827]/90 backdrop-blur-xl border border-[#00F0FF]/50 p-6 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.15)] flex flex-col items-center space-y-4 w-96 z-20"
            >
              <div className="text-xs text-[#00F0FF] font-mono uppercase tracking-widest flex items-center space-x-2">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Active Voice Session</span>
              </div>
              
              <div className="relative flex items-center justify-center h-28 w-28">
                {listening && [0,1,2].map(i => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-[#00F0FF]/40"
                  />
                ))}
                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${listening ? 'bg-[#00F0FF]/10' : 'bg-transparent'}`} />
                <div className={`z-10 w-16 h-16 rounded-full flex items-center justify-center ${listening ? 'bg-[#00F0FF]/20 shadow-[0_0_20px_rgba(0,240,255,0.4)]' : 'bg-[#1E293B]'}`}>
                  <Mic className={`w-8 h-8 ${listening ? 'text-[#00F0FF]' : 'text-[#64748B]'}`} />
                </div>
              </div>

              <div className="text-sm font-mono text-[#F1F5F9] text-center min-h-[40px] flex items-center justify-center">
                {liveTranscript || 'Awaiting vocal input...'}
              </div>

              <button 
                onClick={toggleVoiceMode}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-mono rounded-lg border border-red-500/50 transition-colors flex items-center space-x-2"
              >
                <MicOff className="w-3 h-3" />
                <span>TERMINATE LINK</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0E1522] z-10">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Command JARVIS..."
              className="w-full bg-[#111827] text-[#F1F5F9] placeholder-[#64748B] text-sm pl-4 pr-24 py-3 rounded-xl border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50"
            />
            <div className="absolute right-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`p-2 rounded-lg transition ${voiceMode ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'text-[#94A3B8] hover:text-[#00F0FF]'}`}
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
    </div>
  );
}
