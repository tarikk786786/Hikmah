'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldAlert
} from 'lucide-react';

export default function UsagePage() {
  const [dailyBudget] = useState(10.0);
  const [monthlyBudget] = useState(100.0);

  // Mocked active ledger summary for initial view
  const currentDailySpend = 1.42;
  const currentMonthlySpend = 18.75;
  const totalTokensUsed = 1428500;

  const providerBreakdown = [
    { provider: 'OpenAI Gateway', tokens: '850,200', cost: '$11.20', percentage: '59.7%' },
    { provider: 'Anthropic Gateway', tokens: '310,000', cost: '$5.80', percentage: '30.9%' },
    { provider: 'Google Gemini', tokens: '180,300', cost: '$1.75', percentage: '9.3%' },
    { provider: 'Ollama Local Runtime', tokens: '88,000', cost: '$0.00', percentage: '0.0%' },
    { provider: 'Mock Resilient Engine', tokens: '0', cost: '$0.00', percentage: '0.0%' }
  ];

  const recentTransactions = [
    {
      id: 'tx_01',
      model: 'claude-3-7-sonnet',
      provider: 'Anthropic',
      tokens: 4250,
      cost: '$0.0382',
      latency: '620ms',
      status: 'SUCCESS',
      time: '2 mins ago'
    },
    {
      id: 'tx_02',
      model: 'gemini-2.5-flash',
      provider: 'Google Gemini',
      tokens: 1840,
      cost: '$0.0008',
      latency: '290ms',
      status: 'SUCCESS',
      time: '14 mins ago'
    },
    {
      id: 'tx_03',
      model: 'gpt-4o-mini',
      provider: 'OpenAI',
      tokens: 890,
      cost: '$0.0004',
      latency: '340ms',
      status: 'SUCCESS',
      time: '1 hour ago'
    },
    {
      id: 'tx_04',
      model: 'llama3.3:8b',
      provider: 'Ollama',
      tokens: 1200,
      cost: '$0.0000',
      latency: '85ms',
      status: 'SUCCESS',
      time: '3 hours ago'
    }
  ];

  const dailyPercent = Math.min(100, Math.round((currentDailySpend / dailyBudget) * 100));
  const monthlyPercent = Math.min(100, Math.round((currentMonthlySpend / monthlyBudget) * 100));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6">
        <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
          <DollarSign className="w-7 h-7 text-[#00F0FF]" />
          <span>COST & TOKEN USAGE LEDGER</span>
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Real-Time Spend Tracking • Multi-Tenant Budget Enforcement • Cost Attribution
        </p>
      </div>

      {/* Budget Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Cap */}
        <div className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#00F0FF]" /> DAILY SPEND CAP</span>
            <span className="text-emerald-400 font-bold">{dailyPercent}% USED</span>
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            ${currentDailySpend.toFixed(2)} <span className="text-xs text-[#64748B]">/ ${dailyBudget.toFixed(2)}</span>
          </div>
          <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00F0FF] to-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
        </div>

        {/* Monthly Cap */}
        <div className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-purple-400" /> MONTHLY SPEND CAP</span>
            <span className="text-purple-400 font-bold">{monthlyPercent}% USED</span>
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            ${currentMonthlySpend.toFixed(2)} <span className="text-xs text-[#64748B]">/ ${monthlyBudget.toFixed(2)}</span>
          </div>
          <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-[#00F0FF] h-full rounded-full transition-all"
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>
        </div>

        {/* Total Tokens */}
        <div className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-xs text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-amber-400" /> TOTAL TOKENS CONSUMED</span>
            <span className="text-amber-400 font-bold">ALL PROVIDERS</span>
          </div>
          <div className="text-2xl font-bold text-[#F1F5F9]">
            {totalTokensUsed.toLocaleString()}
          </div>
          <div className="text-xs text-[#64748B]">
            Estimated savings via local routing: <span className="text-emerald-400 font-bold">$3.20</span>
          </div>
        </div>
      </div>

      {/* Provider Cost Distribution */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" />
          <span>PROVIDER COST ATTRIBUTION</span>
        </h2>
        <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F172A] border-b border-[#1E293B] text-[#94A3B8]">
              <tr>
                <th className="p-3.5">PROVIDER</th>
                <th className="p-3.5">TOKENS CONSUMED</th>
                <th className="p-3.5">TOTAL ESTIMATED COST</th>
                <th className="p-3.5">SHARE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-[#F1F5F9]">
              {providerBreakdown.map((p) => (
                <tr key={p.provider} className="hover:bg-[#1E293B]/40 transition">
                  <td className="p-3.5 font-bold">{p.provider}</td>
                  <td className="p-3.5 text-[#94A3B8]">{p.tokens}</td>
                  <td className="p-3.5 text-emerald-400 font-bold">{p.cost}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#00F0FF] h-full" style={{ width: p.percentage }} />
                      </div>
                      <span className="text-[10px] text-[#64748B]">{p.percentage}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Usage Ledger */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
          <Activity className="w-4 h-4" />
          <span>RECENT INFERENCE TRANSACTIONS</span>
        </h2>
        <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F172A] border-b border-[#1E293B] text-[#94A3B8]">
              <tr>
                <th className="p-3.5">TX ID</th>
                <th className="p-3.5">MODEL</th>
                <th className="p-3.5">PROVIDER</th>
                <th className="p-3.5">TOKENS</th>
                <th className="p-3.5">COST</th>
                <th className="p-3.5">LATENCY</th>
                <th className="p-3.5">STATUS</th>
                <th className="p-3.5">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-[#F1F5F9]">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#1E293B]/40 transition">
                  <td className="p-3.5 text-[#64748B]">{tx.id}</td>
                  <td className="p-3.5 text-[#00F0FF] font-bold">{tx.model}</td>
                  <td className="p-3.5 text-[#94A3B8]">{tx.provider}</td>
                  <td className="p-3.5">{tx.tokens.toLocaleString()}</td>
                  <td className="p-3.5 text-emerald-400">{tx.cost}</td>
                  <td className="p-3.5 text-[#94A3B8]">{tx.latency}</td>
                  <td className="p-3.5">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#64748B]">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
