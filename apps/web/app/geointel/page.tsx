'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  MapPin,
  Smartphone,
  Layers,
  Database,
  ShieldCheck,
  Activity,
  ArrowRight,
  Search,
  ExternalLink
} from 'lucide-react';

export default function GeointelOverviewPage() {
  const [quotaRemaining] = useState(842);
  const quotaTotal = 1000;
  const quotaPercent = Math.round(((quotaTotal - quotaRemaining) / quotaTotal) * 100);

  const stats = [
    { label: 'PUBLIC CELLS CACHED', value: '14,820', icon: Radio, color: 'text-[#00F0FF]' },
    { label: 'AUTHORIZED DEVICES', value: '2 Active', icon: Smartphone, color: 'text-emerald-400' },
    { label: 'TELEMETRY OBSERVATIONS', value: '1,492', icon: Activity, color: 'text-purple-400' },
    { label: 'OPENCELLID QUOTA', value: `${quotaRemaining} left`, icon: Database, color: 'text-amber-400' }
  ];

  const recentObservations = [
    {
      id: 'obs_981a',
      device: 'dev_pixel_7a (Pixel 7a)',
      cell: 'LTE 310-410 (CID: 28419)',
      signal: '-78 dBm',
      location: 'San Francisco, CA (approx 350m radius)',
      time: '4 mins ago'
    },
    {
      id: 'obs_762b',
      device: 'dev_pixel_7a (Pixel 7a)',
      cell: 'NR 310-410 (CID: 49201)',
      signal: '-65 dBm',
      location: 'San Francisco, CA (approx 280m radius)',
      time: '18 mins ago'
    },
    {
      id: 'obs_412c',
      device: 'dev_s23 (Galaxy S23)',
      cell: 'LTE 310-260 (CID: 19824)',
      signal: '-92 dBm',
      location: 'Oakland, CA (approx 800m radius)',
      time: '1 hour ago'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Radio className="w-7 h-7 text-[#00F0FF]" />
            <span>CELLULAR & GEOLOCATION INTELLIGENCE</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Public RF Infrastructure • Multi-Source Geolocation • Authorized Device Telemetry
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center space-x-2 text-xs">
          <Link
            href="/geointel/cells"
            className="px-3 py-1.5 bg-[#111827] hover:bg-[#1E293B] text-[#00F0FF] border border-[#1E293B] rounded-lg transition"
          >
            Cell Explorer
          </Link>
          <Link
            href="/geointel/maps"
            className="px-3 py-1.5 bg-[#111827] hover:bg-[#1E293B] text-[#38BDF8] border border-[#1E293B] rounded-lg transition"
          >
            Interactive Map
          </Link>
          <Link
            href="/geointel/devices"
            className="px-3 py-1.5 bg-[#111827] hover:bg-[#1E293B] text-emerald-400 border border-[#1E293B] rounded-lg transition"
          >
            Consent & Devices
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs text-[#64748B]">
                <span>{s.label}</span>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9]">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quota Utilization Bar */}
      <div className="p-5 bg-[#111827] border border-[#1E293B] rounded-xl space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#94A3B8] flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span>OpenCelliD Daily API Quota Status (1,000 requests/day per user)</span>
          </span>
          <span className="text-amber-400 font-bold">{quotaPercent}% Used</span>
        </div>
        <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-400 to-rose-400 h-full rounded-full transition-all"
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
        <div className="text-[11px] text-[#64748B] flex justify-between items-center">
          <span>{quotaTotal - quotaRemaining} requests made today • {quotaRemaining} remaining</span>
          <span className="text-[10px]">Attribution: Data from OpenCelliD community (CC-BY-SA 4.0)</span>
        </div>
      </div>

      {/* Recent Observations Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#00F0FF] flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>RECENT AUTHORIZED DEVICE OBSERVATIONS</span>
          </h2>
          <Link href="/geointel/maps" className="text-xs text-[#00F0FF] flex items-center gap-1 hover:underline">
            <span>View on Map</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0F172A] border-b border-[#1E293B] text-[#64748B]">
              <tr>
                <th className="p-3.5">DEVICE</th>
                <th className="p-3.5">CELL IDENTIFIER</th>
                <th className="p-3.5">SIGNAL</th>
                <th className="p-3.5">ESTIMATED LOCATION</th>
                <th className="p-3.5">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-[#F1F5F9]">
              {recentObservations.map((obs) => (
                <tr key={obs.id} className="hover:bg-[#1E293B]/40 transition">
                  <td className="p-3.5 text-emerald-400 font-bold">{obs.device}</td>
                  <td className="p-3.5 text-[#38BDF8]">{obs.cell}</td>
                  <td className="p-3.5 text-[#94A3B8]">{obs.signal}</td>
                  <td className="p-3.5">{obs.location}</td>
                  <td className="p-3.5 text-[#64748B]">{obs.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 bg-[#0A0F1D] border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-xs text-[#94A3B8]">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#F1F5F9]">Privacy & Non-Subscriber Intelligence Guarantee:</span>
          <p className="mt-0.5 leading-relaxed">
            Hikmah Cellular Intelligence processes only public cell tower infrastructure or telemetry from consenting devices explicitly registered by the user. The platform expressly prohibits and refuses queries intended to locate arbitrary private mobile subscribers, search carrier subscriber databases, or scan IMSIs/IMEIs.
          </p>
        </div>
      </div>
    </div>
  );
}
