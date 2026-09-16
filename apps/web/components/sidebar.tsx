'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Brain,
  Bot,
  Wrench,
  Sparkles,
  ListTodo,
  Zap,
  FolderKanban,
  FileText,
  ShieldAlert,
  Terminal,
  Settings,
  Layers,
  Network,
  Cpu,
  Server,
  GitBranch,
  ShieldCheck,
  HardDrive,
  Globe
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Capabilities', href: '/capabilities', icon: Layers },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Tools', href: '/tools', icon: Wrench },
  { name: 'MCP Matrix', href: '/mcp', icon: Network },
  { name: 'Providers', href: '/providers', icon: Cpu },
  { name: 'Workers', href: '/workers', icon: Server },
  { name: 'Task Graphs', href: '/jobs', icon: GitBranch },
  { name: 'Orchestration', href: '/orchestration', icon: GitBranch },
  { name: 'Research', href: '/research', icon: Globe },
  { name: 'Browser', href: '/browser', icon: Globe },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Voice', href: '/voice', icon: Mic },
  { name: 'Skills', href: '/skills', icon: Sparkles },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Automations', href: '/automations', icon: Zap },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Storage', href: '/storage', icon: HardDrive },

  { name: 'Files', href: '/files', icon: FileText },
  { name: 'Security', href: '/security', icon: ShieldAlert },
  { name: 'Security Audit', href: '/audit', icon: ShieldCheck },
  { name: 'Logs', href: '/logs', icon: Terminal },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#0E1522] border-r border-[#1E293B] flex flex-col flex-shrink-0">
      {/* HUD Header */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
          <span className="font-bold tracking-widest text-[#00F0FF] text-sm">HIKMAH OS</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30">
          ONLINE
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#162032]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[#1E293B] text-[11px] font-mono text-[#64748B]">
        <div className="flex justify-between">
          <span>CAPABILITIES</span>
          <span className="text-emerald-400">DYNAMIC MATRIX</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>ROUTER</span>
          <span className="text-[#00F0FF]">AUTO-CASCADE</span>
        </div>
      </div>
    </aside>
  );
}
