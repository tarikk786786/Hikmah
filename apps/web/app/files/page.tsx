'use client';

import React from 'react';
import { FileText, Folder, HardDrive } from 'lucide-react';

export default function FilesPage() {
  const files = [
    { name: 'package.json', size: '1.2 KB', type: 'Config', updated: 'Today' },
    { name: 'tsconfig.json', size: '820 B', type: 'TypeScript', updated: 'Today' },
    { name: 'supabase/migrations/20260915000000_initial_schema.sql', size: '8.4 KB', type: 'SQL Schema', updated: 'Today' },
    { name: '.env.example', size: '1.8 KB', type: 'Config Template', updated: 'Today' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <HardDrive className="w-6 h-6 text-[#00F0FF]" />
          <span>FILES & STORAGE SUBSYSTEM</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Supabase Storage Bucket Integration • Sandboxed Workspace Inspector
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden font-mono text-xs">
        <table className="w-full text-left">
          <thead className="bg-[#0B0F17] text-[#64748B] border-b border-[#1E293B]">
            <tr>
              <th className="p-4">FILE NAME</th>
              <th className="p-4">TYPE</th>
              <th className="p-4">SIZE</th>
              <th className="p-4">LAST MODIFIED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {files.map(f => (
              <tr key={f.name} className="hover:bg-[#162032] transition">
                <td className="p-4 flex items-center space-x-2 text-[#00F0FF]">
                  <FileText className="w-4 h-4 text-[#64748B]" />
                  <span>{f.name}</span>
                </td>
                <td className="p-4 text-[#94A3B8]">{f.type}</td>
                <td className="p-4 text-[#94A3B8]">{f.size}</td>
                <td className="p-4 text-[#64748B]">{f.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
