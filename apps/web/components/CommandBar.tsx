'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle'|'typing'|'understanding'|'planning'|'executing'|'done'>('idle');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus('understanding');
    
    // Simulate progression for visual feedback if actual streaming isn't fully implemented yet
    setTimeout(() => setStatus('planning'), 800);
    setTimeout(() => setStatus('executing'), 1500);

    try {
      const res = await fetch('/api/paios/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input })
      });
      await res.json();
      setStatus('done');
      setTimeout(() => {
        setStatus('idle');
        setInput('');
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-2xl bg-[#111827] border border-[#374151] rounded-2xl shadow-2xl overflow-hidden relative z-10"
          >
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                autoFocus
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (status === 'idle') setStatus('typing');
                  if (!e.target.value) setStatus('idle');
                }}
                disabled={status !== 'idle' && status !== 'typing'}
                placeholder="Ask Hikmah..."
                className="w-full bg-transparent text-white placeholder-gray-500 px-6 py-5 outline-none text-xl font-light"
              />
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                {status !== 'idle' && status !== 'typing' && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium uppercase tracking-wider"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                    <span>{status}</span>
                  </motion.div>
                )}
              </div>
            </form>
            
            {status === 'idle' && !input && (
              <div className="px-6 py-4 bg-[#1F2937]/50 border-t border-[#374151] text-xs text-gray-400 flex items-center justify-between">
                <span>Try asking it to run a research task or audit a file.</span>
                <span className="font-mono bg-[#374151] px-1.5 py-0.5 rounded text-gray-300">esc</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
