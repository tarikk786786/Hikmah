'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  Brain,
  Bot,
  Wrench,
  Sparkles,
  ShieldCheck,
  Server,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    status: 'ONLINE',
    uptime: 0,
    toolsCount: 4,
    skillsCount: 5,
    memoriesCount: 0,
    queueLength: 0
  });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.stats) {
          setStats(prev => ({
            ...prev,
            uptime: data.uptimeSeconds || 120,
            memoriesCount: data.stats.memoriesCount,
            skillsCount: data.stats.skillsCount,
            toolsCount: data.stats.toolsCount,
            queueLength: data.stats.queueLength
          }));
        }
      })
      .catch(() => {});
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 50, rotateX: -30, z: -100 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      z: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.8,
        type: "spring",
        bounce: 0.4
      }
    }),
    hover: {
      scale: 1.05,
      rotateX: 10,
      rotateY: -10,
      z: 50,
      boxShadow: "0px 20px 40px rgba(0, 240, 255, 0.2)",
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12" style={{ perspective: "1000px" }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex justify-between items-center border-b border-[#1E293B] pb-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <span>HIKMAH COCKPIT</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
              PAIOS KERNEL LIVE
            </span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 font-mono">
            Autonomous OS • Obsidian Vault • BullMQ Workers
          </p>
        </div>

        <div className="flex space-x-3">
          <Link
            href="/chat"
            className="px-5 py-2.5 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] hover:from-[#00D0DF] hover:to-[#0070DF] text-[#0B0F17] font-semibold text-xs rounded-lg transition-all flex items-center space-x-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            <span>Open HIKMAH Chat</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ transformStyle: "preserve-3d" }}>
        {[
          { title: 'CORE SYSTEM', icon: Server, val: 'NOMINAL', sub: `Uptime: ${stats.uptime}s` },
          { title: 'OBSIDIAN VAULT', icon: Brain, val: `${stats.memoriesCount} Nodes`, sub: 'Markdown & Canvas' },
          { title: 'TOOL REGISTRY', icon: Wrench, val: `${stats.toolsCount} Active`, sub: 'Native & MCP' },
          { title: 'WORKER QUEUE', icon: Activity, val: `${stats.queueLength} Jobs`, sub: 'BullMQ Harness' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            variants={cardVariants}
            className="p-6 rounded-2xl bg-[#111827]/80 backdrop-blur-md border border-[#1E293B] flex flex-col justify-between transform-gpu"
          >
            <div className="flex justify-between text-[#94A3B8]">
              <span className="text-xs font-mono">{stat.title}</span>
              <stat.icon className="w-5 h-5 text-[#00F0FF]" />
            </div>
            <div className="mt-6">
              <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F1F5F9] to-[#94A3B8]">{stat.val}</span>
              <p className="text-xs text-[#00F0FF] font-mono mt-2 opacity-80">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Architecture 3D Display */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ delay: 0.6, duration: 1, type: "spring" }}
        className="p-8 rounded-2xl bg-gradient-to-br from-[#0B0F17] to-[#111827] border border-[#1E293B] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#00F0FF] rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        
        <h2 className="text-lg font-bold text-[#F1F5F9] font-mono flex items-center space-x-3 mb-6 relative z-10">
          <ShieldCheck className="w-5 h-5 text-[#00F0FF]" />
          <span>CANONICAL ARCHITECTURE MAPPING</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono relative z-10" style={{ perspective: "800px" }}>
          
          <motion.div whileHover={{ scale: 1.05, rotateY: 15, z: 30 }} className="p-5 rounded-xl bg-[#0B0F17]/90 border border-[#1E293B] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300">
            <div className="flex items-center space-x-2 text-[#00F0FF] font-bold mb-3 border-b border-[#1E293B] pb-2">
              <Bot className="w-4 h-4" />
              <span>Next.js UI & WebRTC</span>
            </div>
            <ul className="text-[#94A3B8] space-y-2">
              <li>• Chat & Voice UI</li>
              <li>• Workflow Visualizer</li>
              <li>• Server-Sent Events</li>
              <li>• React Framer Motion</li>
            </ul>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, rotateY: 0, z: 50 }} className="p-5 rounded-xl bg-[#0B0F17]/90 border border-[#00F0FF]/40 shadow-[0_0_40px_rgba(0,240,255,0.1)] transition-transform duration-300 relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F0FF] to-emerald-400 rounded-xl blur opacity-30 animate-pulse"></div>
            <div className="relative">
              <div className="flex items-center space-x-2 text-[#F1F5F9] font-bold mb-3 border-b border-[#1E293B] pb-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>PAIOS Kernel & Workers</span>
              </div>
              <ul className="text-[#94A3B8] space-y-2">
                <li>• Intent & Policy Engines</li>
                <li>• LangGraph Stateful Native</li>
                <li>• BullMQ Job Harness</li>
                <li>• A2A Delegation Broker</li>
              </ul>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, rotateY: -15, z: 30 }} className="p-5 rounded-xl bg-[#0B0F17]/90 border border-[#1E293B] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300">
            <div className="flex items-center space-x-2 text-[#00F0FF] font-bold mb-3 border-b border-[#1E293B] pb-2">
              <Brain className="w-4 h-4" />
              <span>VaultEngine (Obsidian)</span>
            </div>
            <ul className="text-[#94A3B8] space-y-2">
              <li>• Local Markdown `.md`</li>
              <li>• `.canvas` Graph Storage</li>
              <li>• YAML Frontmatter Index</li>
              <li>• Bi-directional Linking</li>
            </ul>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
