'use client';

import React from 'react';
import { ShieldAlert, CheckCircle, XCircle, Search, Key } from 'lucide-react';

export default function AuditPage() {
  const securityLogs = [
    { id: 'sec_01', time: new Date().toLocaleTimeString(), target: 'localhost:8080', action: 'NMAP_PORT_SCAN', authorized: true, proof: 'LOCAL_LOOPBACK_SELF_OWNED', operator: 'usr_admin' },
    { id: 'sec_02', time: new Date().toLocaleTimeString(), target: 'api.internal.local', action: 'SEMGREP_STATIC_ANALYSIS', authorized: true, proof: 'WORKSPACE_SANDBOX', operator: 'usr_default' },
    { id: 'sec_03', time: new Date().toLocaleTimeString(), target: 'example-external.com', action: 'NUCLEI_VULN_SCAN', authorized: false, proof: 'REJECTED: Missing signed AuthorizationRecord ticket', operator: 'usr_default' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <ShieldAlert className="w-6 h-6 text-[#00F0FF]" />
          <span>SECURITY AUDIT & AUTHORIZED TARGET TRACE</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Zero-Trust Scope Verification • ScopeValidator Provenance • Immutable Security Event Stream
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden font-mono text-xs">
        <table className="w-full text-left">
          <thead className="bg-[#0B0F17] text-[#64748B] border-b border-[#1E293B]">
            <tr>
              <th className="p-4">TIMESTAMP</th>
              <th className="p-4">TARGET</th>
              <th className="p-4">ACTION</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">PROOF / RATIONALE</th>
              <th className="p-4">OPERATOR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {securityLogs.map(l => (
              <tr key={l.id} className="hover:bg-[#162032] transition">
                <td className="p-4 text-[#64748B]">{l.time}</td>
                <td className="p-4 text-[#00F0FF]">{l.target}</td>
                <td className="p-4 text-[#F1F5F9] font-bold">{l.action}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center space-x-1 w-fit ${
                    l.authorized
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {l.authorized ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                    <span>{l.authorized ? 'AUTHORIZED' : 'DENIED'}</span>
                  </span>
                </td>
                <td className="p-4 text-[#94A3B8] max-w-xs truncate">{l.proof}</td>
                <td className="p-4 text-[#64748B]">{l.operator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
