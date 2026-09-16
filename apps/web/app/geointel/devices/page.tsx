'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  Plus,
  Key,
  AlertTriangle,
  RefreshCw,
  Lock
} from 'lucide-react';

interface DeviceItem {
  id: string;
  label: string;
  deviceHash: string;
  status: 'GRANTED' | 'REVOKED' | 'PENDING' | 'EXPIRED';
  scope: 'CELL_ONLY' | 'CELL_AND_WIFI' | 'FULL_TELEMETRY';
  grantedAt: string;
  expiresAt: string;
  retentionDays: number;
  lastObservation: string;
  obsCount: number;
}

const INITIAL_DEVICES: DeviceItem[] = [
  {
    id: 'dev_1',
    label: 'Primary Phone (Pixel 7a)',
    deviceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'GRANTED',
    scope: 'FULL_TELEMETRY',
    grantedAt: '2026-09-01T10:00:00Z',
    expiresAt: '2027-09-01T10:00:00Z',
    retentionDays: 30,
    lastObservation: '4 mins ago',
    obsCount: 1140
  },
  {
    id: 'dev_2',
    label: 'Secondary Phone (Galaxy S23)',
    deviceHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    status: 'GRANTED',
    scope: 'CELL_ONLY',
    grantedAt: '2026-09-10T14:30:00Z',
    expiresAt: '2027-09-10T14:30:00Z',
    retentionDays: 14,
    lastObservation: '1 hour ago',
    obsCount: 352
  },
  {
    id: 'dev_3',
    label: 'Test Field Unit (OnePlus 11)',
    deviceHash: 'd7a8fbb307d7809469ca933b02dd32a76f1b4cbe66b53ae73ee4e10fdf8e4e49',
    status: 'REVOKED',
    scope: 'CELL_ONLY',
    grantedAt: '2026-08-15T09:00:00Z',
    expiresAt: '2026-09-14T09:00:00Z',
    retentionDays: 7,
    lastObservation: '3 days ago',
    obsCount: 0
  }
];

export default function GeointelDevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>(INITIAL_DEVICES);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newDeviceId, setNewDeviceId] = useState<string>('');
  const [newScope, setNewScope] = useState<'CELL_ONLY' | 'CELL_AND_WIFI' | 'FULL_TELEMETRY'>('CELL_ONLY');
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleConsent = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextStatus = d.status === 'GRANTED' ? 'REVOKED' : 'GRANTED';
          triggerNotification(
            nextStatus === 'REVOKED'
              ? `Consent revoked for ${d.label}. Ingestion pipeline will reject future packets.`
              : `Consent granted for ${d.label}. Authorized telemetry active.`
          );
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  const handlePurgeTelemetry = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          triggerNotification(`All historical telemetry observations purged for ${d.label}.`);
          return { ...d, obsCount: 0, lastObservation: 'Never' };
        }
        return d;
      })
    );
  };

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newDeviceId) return;

    // Simulate SHA-256 client hash
    const fakeHash = Array.from(newDeviceId)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
      .padEnd(64, 'a')
      .slice(0, 64);

    const newDev: DeviceItem = {
      id: `dev_${Date.now()}`,
      label: newLabel,
      deviceHash: fakeHash,
      status: 'GRANTED',
      scope: newScope,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      retentionDays: 30,
      lastObservation: 'Pending first sync',
      obsCount: 0
    };

    setDevices([newDev, ...devices]);
    setShowRegisterModal(false);
    setNewLabel('');
    setNewDeviceId('');
    triggerNotification(`Device registered: ${newDev.label} with SHA-256 pseudonym.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <div className="border-b border-[#1E293B] pb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#64748B] mb-2">
            <Link href="/geointel" className="hover:text-[#00F0FF] flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>GEOINTEL CONTROL CENTER</span>
            </Link>
            <span>/</span>
            <span className="text-[#94A3B8]">DEVICE CONSENT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <span>AUTHORIZED DEVICE CONSENT MANAGER</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Explicit opt-in management, privacy boundaries, and telemetry retention policies.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Authorize New Device</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Strict Privacy Boundary Box */}
      <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold tracking-wider">
          <Lock className="w-4 h-4" />
          <span>ZERO RAW IDENTIFIER POLICY</span>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Hikmah enforces strict privacy boundaries. Hardware serials, IMEIs, IMSIs, and MAC addresses are
          <strong> never stored</strong> in cleartext or transmitted to external servers. All device IDs are
          hashed using <strong>salted SHA-256</strong> upon entry. Telemetry sent from devices without an active
          <code className="text-emerald-400 mx-1">GRANTED</code> consent record is discarded instantly by the
          ingestion pipeline.
        </p>
      </div>

      {/* Device List Table */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1E293B] flex justify-between items-center text-xs">
          <span className="font-bold text-[#94A3B8]">REGISTERED DEVICES ({devices.length})</span>
          <span className="text-[#64748B]">Revocation takes effect immediately</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0F1D] text-[#64748B] border-b border-[#1E293B]">
              <tr>
                <th className="p-4">DEVICE LABEL</th>
                <th className="p-4">DEVICE HASH (SHA-256)</th>
                <th className="p-4">CONSENT STATUS</th>
                <th className="p-4">TELEMETRY SCOPE</th>
                <th className="p-4">RETENTION</th>
                <th className="p-4">OBSERVATIONS</th>
                <th className="p-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-[#1E293B]/40 text-[#F1F5F9] transition">
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-[#00F0FF]" />
                      <span className="font-bold">{d.label}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-[#64748B]">
                    <span title={d.deviceHash}>
                      {d.deviceHash.slice(0, 12)}...{d.deviceHash.slice(-8)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === 'GRANTED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : d.status === 'REVOKED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {d.status === 'GRANTED' ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      <span>{d.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-[#94A3B8]">
                    <span className="text-[11px] bg-[#0A0F1D] px-2 py-1 rounded border border-[#1E293B]">
                      {d.scope}
                    </span>
                  </td>
                  <td className="p-4 text-[#64748B]">{d.retentionDays} days</td>
                  <td className="p-4">
                    <span className="text-[#F1F5F9] font-semibold">{d.obsCount}</span>
                    <span className="text-[10px] text-[#64748B] block">{d.lastObservation}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggleConsent(d.id)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition ${
                          d.status === 'GRANTED'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {d.status === 'GRANTED' ? 'Revoke' : 'Grant'}
                      </button>
                      <button
                        onClick={() => handlePurgeTelemetry(d.id)}
                        title="Purge all telemetry observations"
                        className="p-1.5 bg-[#0A0F1D] hover:bg-rose-500/20 text-[#64748B] hover:text-rose-400 border border-[#1E293B] rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-[#F1F5F9] flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>AUTHORIZE NEW CLIENT DEVICE</span>
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-[#64748B] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4 text-xs">
              <div>
                <label className="text-[#64748B] block mb-1">DEVICE FRIENDLY NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Field Laptop or Personal Phone"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
                  required
                />
              </div>

              <div>
                <label className="text-[#64748B] block mb-1">
                  CLIENT IDENTIFIER SEED (Will be hashed)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NeoStumbler client ID token"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
                  required
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Only SHA-256 hash is persisted. Raw ID is discarded immediately.
                </span>
              </div>

              <div>
                <label className="text-[#64748B] block mb-1">PERMITTED TELEMETRY SCOPE</label>
                <select
                  value={newScope}
                  onChange={(e) =>
                    setNewScope(e.target.value as 'CELL_ONLY' | 'CELL_AND_WIFI' | 'FULL_TELEMETRY')
                  }
                  className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-3 py-2 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
                >
                  <option value="CELL_ONLY">CELL_ONLY (Towers & signal strength)</option>
                  <option value="CELL_AND_WIFI">CELL_AND_WIFI (Include BSSID observations)</option>
                  <option value="FULL_TELEMETRY">FULL_TELEMETRY (Cell, Wi-Fi, BLE beacon)</option>
                </select>
              </div>

              <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg space-y-1 text-[11px] text-[#94A3B8]">
                <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Privacy Notice</span>
                </div>
                <p>
                  By confirming, you certify that you own or have explicit consent from the user of this
                  device to ingest cellular RF telemetry.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-[#0A0F1D] hover:bg-[#1E293B] text-[#94A3B8] border border-[#1E293B] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold transition"
                >
                  Authorize Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
