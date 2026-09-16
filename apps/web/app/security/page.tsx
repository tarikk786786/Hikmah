'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function SecurityPage() {
  const [killSwitch, setKillSwitch] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  const loadApprovals = () => {
    fetch('/api/approvals')
      .then(res => res.json())
      .then(data => setPendingApprovals(data.pending || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadApprovals();
    const interval = setInterval(loadApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string, approved: boolean) => {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved })
    });
    loadApprovals();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <ShieldAlert className="w-6 h-6 text-[#00F0FF]" />
          <span>SECURITY, RISK POLICY & APPROVALS</span>
        </h1>
        <p className="text-sm text-[#94A3B8] font-mono mt-1">
          Zero-Trust Execution Policy • Granular Tool Risk Levels • Emergency Kill-Switch
        </p>
      </div>

      {/* Kill Switch Card */}
      <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#F1F5F9] flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${killSwitch ? 'text-red-500' : 'text-amber-400'}`} />
            <span>JARVIS MASTER KILL-SWITCH</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            When active, all autonomous agent tool executions and background jobs are immediately suspended.
          </p>
        </div>

        <button
          onClick={() => setKillSwitch(!killSwitch)}
          className={`px-5 py-2.5 font-mono text-xs font-bold rounded-lg transition ${
            killSwitch
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-[#162032] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8]'
          }`}
        >
          {killSwitch ? 'KILL-SWITCH ENGAGED' : 'SYSTEM ARMED (NORMAL)'}
        </button>
      </div>

      {/* Pending Approvals */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] font-mono">
          HUMAN-IN-THE-LOOP PENDING APPROVALS ({pendingApprovals.length})
        </h2>

        {pendingApprovals.length === 0 ? (
          <div className="p-6 bg-[#111827] border border-[#1E293B] rounded-xl text-center text-xs text-[#64748B] font-mono">
            No actions awaiting authorization. All executed tools are within auto-approval threshold.
          </div>
        ) : (
          pendingApprovals.map(req => (
            <div key={req.id} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold">TICKET: {req.id}</span>
                <span className="text-red-400 uppercase font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">
                  {req.riskLevel} RISK
                </span>
              </div>
              <div>Action: <span className="text-[#00F0FF]">{req.actionName}</span></div>
              <pre className="p-3 bg-[#0B0F17] rounded border border-[#1E293B] text-[#94A3B8] overflow-x-auto">
                {JSON.stringify(req.payload, null, 2)}
              </pre>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => handleResolve(req.id, true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0B0F17] font-bold rounded-lg transition flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Authorize Execution</span>
                </button>
                <button
                  onClick={() => handleResolve(req.id, false)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold rounded-lg transition flex items-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
