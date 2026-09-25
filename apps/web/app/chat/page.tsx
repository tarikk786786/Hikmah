'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Terminal, RefreshCw, Layers, Radio, Activity, Cpu, Database, Network } from 'lucide-react';
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

  // Advanced Animation Configurations
  const springConfig = { type: "spring", stiffness: 400, damping: 28, mass: 0.8 };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.96, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: springConfig }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="flex h-screen max-h-screen bg-[#0B0F17] text-[#F1F5F9] font-sans overflow-hidden selection:bg-[#00F0FF]/30"
    >
      
      {/* LEFT SIDEBAR: DASHBOARD & METRICS */}
      <div className="w-64 border-r border-[#1E293B] bg-[#0E1522] flex flex-col p-5 space-y-6 overflow-y-auto">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.2 }}
          className="flex items-center space-x-3 mb-4"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_12px_#00F0FF] animate-pulse" />
          <span className="text-sm font-bold tracking-[0.2em] text-[#F1F5F9] shadow-[#00F0FF]/20 drop-shadow-md">HIKMAH OS</span>
        </motion.div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.div variants={itemVariants} className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-2">Live Telemetry</motion.div>
          
          {[
            { label: 'Agents', value: stats.agentCount, icon: Network, color: 'text-[#00F0FF]' },
            { label: 'Vault Files', value: stats.knowledgeCount, icon: Database, color: 'text-emerald-400' },
            { label: 'Models', value: stats.activeModels, icon: Cpu, color: 'text-amber-400' },
            { label: 'Health', value: `${stats.health}%`, icon: Activity, color: 'text-purple-400' }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(0, 240, 255, 0.3)' }}
              className="bg-[#111827] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between cursor-default transition-colors duration-200"
            >
              <div className="flex items-center space-x-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-[#94A3B8]">{stat.label}</span>
              </div>
              <motion.span 
                key={stat.value} // Animate on value change
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-mono text-[#F1F5F9]"
              >
                {stat.value}
              </motion.span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-auto pt-4 border-t border-[#1E293B]"
        >
          <div className="flex items-center space-x-2 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-red-500 shadow-[0_0_8px_#EF4444]'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'SYSTEM CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* MAIN CHAT INTERFACE */}
      <div className="flex-1 flex flex-col relative bg-[#0B0F17] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,240,255,0.03),rgba(255,255,255,0))]">
        <header className="h-14 border-b border-[#1E293B] px-6 flex items-center justify-between bg-[#0B0F17]/60 backdrop-blur-xl z-10 sticky top-0">
          <span className="text-xs text-[#64748B] font-mono tracking-widest">WORKSPACE // MAIN</span>
          <div className="flex items-center space-x-4 text-xs font-mono text-[#94A3B8]">
            <motion.span 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={springConfig}
              className="flex items-center space-x-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
              <span>ROUTER: ACTIVE</span>
            </motion.span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                layout
                key={msg.id}
                initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(5px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={springConfig}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <motion.div layout className="flex items-center space-x-2 mb-2 text-[11px] tracking-wider text-[#64748B] font-mono">
                  <span>{msg.role === 'user' ? 'OPERATOR' : 'JARVIS'}</span>
                </motion.div>

                <motion.div
                  layout
                  className={`max-w-3xl px-5 py-4 rounded-2xl text-[14px] leading-relaxed shadow-xl ${
                    msg.role === 'user'
                      ? 'bg-[#00F0FF]/10 text-[#E2E8F0] border border-[#00F0FF]/30 backdrop-blur-md'
                      : 'bg-[#111827]/90 text-[#F1F5F9] border border-[#1E293B] backdrop-blur-md'
                  }`}
                >
                  {msg.content}
                  
                  {/* Computing Sequence Loader */}
                  <AnimatePresence>
                    {loading && msg.id.startsWith('asst_') && !msg.content && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center space-x-3 text-[#00F0FF] overflow-hidden"
                      >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-xs tracking-wider">Computing sequence...</span>
                        <div className="flex space-x-1">
                          {[0, 1, 2].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "easeInOut" }}
                              className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]"
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Plan Steps Visibility */}
                  {msg.plan && msg.plan.steps && msg.plan.steps.length > 0 && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-4 pt-4 border-t border-[#1E293B]/70"
                    >
                      <div className="flex items-center space-x-2 text-[11px] tracking-widest font-mono text-[#00F0FF] mb-3">
                        <Layers className="w-3.5 h-3.5" />
                        <span>EXECUTION PLAN ({msg.plan.steps.length} STEPS)</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.plan.steps.map((s: any, idx: number) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...springConfig, delay: idx * 0.1 }}
                            className="flex items-center justify-between text-xs bg-[#0B0F17]/60 px-3 py-2 rounded-lg border border-[#1E293B]/80 hover:border-[#00F0FF]/30 transition-colors"
                          >
                            <span className="text-[#94A3B8] flex-1">{idx + 1}. {s.description}</span>
                            <span className={`text-[10px] tracking-widest font-mono ml-4 ${s.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              [{s.status.toUpperCase()}]
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Tool Execution Badges */}
                  {msg.toolResults && msg.toolResults.length > 0 && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-4 pt-4 border-t border-[#1E293B]/70 space-y-2"
                    >
                      <div className="flex items-center space-x-2 text-[11px] tracking-widest font-mono text-[#94A3B8] mb-1">
                        <Terminal className="w-3.5 h-3.5 text-[#00F0FF]" />
                        <span>SYSTEM ACTIONS EXECUTED</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.toolResults.map((tr, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ ...springConfig, delay: idx * 0.08 }}
                            whileHover={{ scale: 1.05 }}
                            className="text-[11px] bg-[#0B0F17] px-2.5 py-1.5 rounded-md border border-[#1E293B] hover:border-[#00F0FF]/40 font-mono flex items-center space-x-3 cursor-default"
                          >
                            <span className="text-[#00F0FF]">&gt; {tr.toolName}</span>
                            <span className="text-[#64748B]">{tr.result.executionTimeMs || 0}ms</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* VOICE MODE OVERLAY */}
        <AnimatePresence>
          {voiceMode && (
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ y: 100, opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={springConfig}
              className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-[#0B0F17]/95 backdrop-blur-2xl border border-[#00F0FF]/40 p-8 rounded-[2rem] shadow-[0_0_60px_rgba(0,240,255,0.15)] flex flex-col items-center space-y-6 w-[420px] z-20"
            >
              <div className="text-[10px] text-[#00F0FF] font-mono uppercase tracking-[0.3em] flex items-center space-x-2">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Active Voice Session</span>
              </div>
              
              {/* Complex Sonar Animation */}
              <div className="relative flex items-center justify-center h-36 w-36">
                {listening && [0,1,2,3].map(i => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-[#00F0FF]/30"
                  />
                ))}
                
                <motion.div 
                  animate={{ scale: listening ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`absolute inset-0 rounded-full transition-colors duration-500 ${listening ? 'bg-[#00F0FF]/10 blur-sm' : 'bg-transparent'}`} 
                />
                
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`z-10 w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${listening ? 'bg-[#00F0FF]/20 shadow-[0_0_30px_rgba(0,240,255,0.5)] border border-[#00F0FF]/50' : 'bg-[#1E293B] border border-[#334155]'}`}
                >
                  <Mic className={`w-8 h-8 ${listening ? 'text-[#00F0FF]' : 'text-[#64748B]'}`} />
                </motion.div>
              </div>

              <motion.div 
                layout
                className="text-[13px] font-mono text-[#F1F5F9] text-center min-h-[48px] flex items-center justify-center px-4"
              >
                {liveTranscript || 'Awaiting vocal input sequence...'}
              </motion.div>

              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(239,68,68,0.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVoiceMode}
                className="px-5 py-2.5 bg-[#0B0F17] text-red-400 text-[11px] font-mono tracking-widest rounded-full border border-red-500/30 transition-colors flex items-center space-x-2 hover:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>TERMINATE LINK</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="p-5 border-t border-[#1E293B] bg-[#0B0F17]/80 backdrop-blur-xl z-10 relative">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Command JARVIS..."
              className="w-full bg-[#111827] text-[#F1F5F9] placeholder-[#64748B] text-sm pl-5 pr-28 py-3.5 rounded-2xl border border-[#1E293B] focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all shadow-inner"
            />
            <div className="absolute right-2.5 flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={toggleVoiceMode}
                className={`p-2.5 rounded-xl transition-colors ${voiceMode ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'text-[#64748B] hover:text-[#00F0FF] hover:bg-[#1E293B]'}`}
              >
                <Mic className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={input.trim() ? { scale: 1.05 } : {}}
                whileTap={input.trim() ? { scale: 0.95 } : {}}
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-[#00F0FF] hover:bg-[#00D0DF] disabled:opacity-40 disabled:hover:bg-[#00F0FF] text-[#0B0F17] rounded-xl transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </form>
        </div>

      </div>
    </motion.div>
  );
}
