'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveSystem } from './LiveSystemContext';
import { Activity, Server, Cpu, Database, Network } from 'lucide-react';

export function LiveActivityCenter() {
  const { events, isConnected, activeWorkflows } = useLiveSystem();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4 pointer-events-none">
      {/* System Status Bar */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[#111827]/80 backdrop-blur-md border border-[#1F2937] rounded-full px-4 py-2 flex items-center space-x-4 shadow-xl pointer-events-auto"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-gray-300">
            {isConnected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>
        
        <div className="h-4 w-px bg-gray-700" />
        
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="flex items-center space-x-1" title="Active Workflows">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{activeWorkflows}</span>
          </div>
        </div>
      </motion.div>

      {/* Live Event Stream (Recent 3) */}
      <div className="flex flex-col items-end space-y-2 pointer-events-auto max-w-sm">
        <AnimatePresence>
          {events.slice(0, 3).map((evt) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-[#1F2937]/90 backdrop-blur-sm border border-[#374151] rounded-lg p-3 shadow-lg w-full"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">{evt.source}</span>
                <span className="text-[10px] text-gray-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs text-gray-200 font-medium truncate">
                {evt.type}
              </div>
              {evt.data?.summary && (
                <div className="text-xs text-gray-400 mt-1 truncate">
                  {evt.data.summary}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
