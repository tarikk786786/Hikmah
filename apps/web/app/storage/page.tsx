'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  FileText,
  Upload,
  Search,
  Lock,
  Share2,
  ShieldCheck,
  Archive,
  RefreshCw,
  Server,
  Layers,
  Database,
  CheckCircle2,
  Trash2,
  Download
} from 'lucide-react';

interface StorageObjectItem {
  id: string;
  key: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  tier: 'HOT' | 'NORMAL' | 'COLD' | 'ARCHIVE';
  isEncrypted: boolean;
  isChunked: boolean;
  chunkCount: number;
  primaryProvider: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface BackupItem {
  id: string;
  name: string;
  backupType: string;
  sizeBytes: number;
  sha256: string;
  itemCount: number;
  isEncrypted: boolean;
  createdAt: string;
}

export default function StorageDashboardPage() {
  const [activeTab, setActiveTab] = useState<'files' | 'shared' | 'backups' | 'health'>('files');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [objects, setObjects] = useState<StorageObjectItem[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadKey, setUploadKey] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadEncrypt, setUploadEncrypt] = useState(false);
  const [uploadTier, setUploadTier] = useState('NORMAL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/storage/objects?q=${encodeURIComponent(searchQuery)}`
        : '/api/storage/objects';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setObjects(data.objects || []);
      }
    } catch {
      // Fallback initial demo data if offline
      setObjects([
        {
          id: 'obj_1',
          key: 'documents/architecture-v2.pdf',
          name: 'architecture-v2.pdf',
          sizeBytes: 1420500,
          mimeType: 'application/pdf',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          tier: 'NORMAL',
          isEncrypted: true,
          isChunked: false,
          chunkCount: 1,
          primaryProvider: 'supabase',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        },
        {
          id: 'obj_2',
          key: 'archives/database_dump_20260916.tar.gz',
          name: 'database_dump_20260916.tar.gz',
          sizeBytes: 28400120,
          mimeType: 'application/gzip',
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          tier: 'COLD',
          isEncrypted: true,
          isChunked: true,
          chunkCount: 2,
          primaryProvider: 'telegram',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/storage/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchObjects();
    fetchBackups();
  }, [searchQuery]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadKey || !uploadContent) return;

    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: uploadKey,
          data: uploadContent,
          encrypt: uploadEncrypt,
          tier: uploadTier
        })
      });

      if (res.ok) {
        setStatusMessage(`Successfully stored ${uploadKey}`);
        setShowUploadModal(false);
        setUploadKey('');
        setUploadContent('');
        fetchObjects();
      }
    } catch (err) {
      setStatusMessage(`Upload failed: ${(err as Error).message}`);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await fetch('/api/storage/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DATABASE', encrypt: true })
      });
      if (res.ok) {
        setStatusMessage('Snapshot backup successfully generated');
        fetchBackups();
      }
    } catch (err) {
      setStatusMessage(`Backup generation error: ${(err as Error).message}`);
    }
  };

  const filteredObjects = objects.filter(o => {
    if (tierFilter !== 'ALL' && o.tier !== tierFilter) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-mono text-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <HardDrive className="w-7 h-7 text-[#00F0FF]" />
            <span>UNIVERSAL STORAGE ENGINE</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Provider-Independent Object Orchestrator • TG-S3/MTProto Cold Archive • AES-256-GCM
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/storage/providers"
            className="px-4 py-2 rounded-lg bg-[#111827] border border-[#1E293B] text-[#94A3B8] hover:text-[#00F0FF] hover:border-[#00F0FF]/50 transition flex items-center space-x-2"
          >
            <Server className="w-4 h-4" />
            <span>Providers Telemetry</span>
          </Link>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0B0F17] font-semibold hover:bg-[#00F0FF]/90 transition flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Store Object</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] rounded-lg text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1E293B]">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2.5 font-semibold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'files'
              ? 'border-[#00F0FF] text-[#00F0FF]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>OBJECTS & FILES</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2.5 font-semibold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'backups'
              ? 'border-[#00F0FF] text-[#00F0FF]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>BACKUP SNAPSHOTS</span>
        </button>
      </div>

      {/* Main Content */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by key, name, or metadata..."
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:border-[#00F0FF] outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-xs text-[#64748B]">TIER:</span>
              {['ALL', 'HOT', 'NORMAL', 'COLD'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-3 py-1 rounded text-xs transition ${
                    tierFilter === t
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                      : 'bg-[#0B0F17] text-[#94A3B8] border border-[#1E293B] hover:text-[#F1F5F9]'
                  }`}
                >
                  {t}
                </button>
              ))}

              <button
                onClick={fetchObjects}
                className="p-2 text-[#94A3B8] hover:text-[#00F0FF] border border-[#1E293B] rounded bg-[#0B0F17]"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Objects Table */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0F17] text-[#64748B] border-b border-[#1E293B]">
                  <tr>
                    <th className="p-4">OBJECT / KEY</th>
                    <th className="p-4">TIER</th>
                    <th className="p-4">PROVIDER</th>
                    <th className="p-4">SIZE</th>
                    <th className="p-4">ENCRYPTION</th>
                    <th className="p-4">CHUNKS</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredObjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#64748B]">
                        No objects found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredObjects.map((obj) => (
                      <tr key={obj.id} className="hover:bg-[#162032] transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-2 text-[#F1F5F9]">
                            <FileText className="w-4 h-4 text-[#00F0FF]" />
                            <span className="font-semibold">{obj.name}</span>
                          </div>
                          <div className="text-[10px] text-[#64748B] mt-0.5">{obj.key}</div>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              obj.tier === 'HOT'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : obj.tier === 'NORMAL'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {obj.tier}
                          </span>
                        </td>

                        <td className="p-4 text-[#94A3B8]">
                          <span className="capitalize">{obj.primaryProvider}</span>
                        </td>

                        <td className="p-4 text-[#94A3B8]">{formatSize(obj.sizeBytes)}</td>

                        <td className="p-4">
                          {obj.isEncrypted ? (
                            <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                              <Lock className="w-3 h-3" />
                              <span>AES-256</span>
                            </span>
                          ) : (
                            <span className="text-[#64748B] text-[10px]">PLAINTEXT</span>
                          )}
                        </td>

                        <td className="p-4 text-[#94A3B8]">
                          {obj.isChunked ? (
                            <span className="px-2 py-0.5 bg-[#1E293B] rounded text-[10px]">
                              {obj.chunkCount} Parts
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#64748B]">Single</span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={`/api/storage/download/${obj.id}`}
                              className="p-1.5 hover:text-[#00F0FF] text-[#94A3B8] transition"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={async () => {
                                await fetch(`/api/storage/objects/${obj.id}?purge=true`, { method: 'DELETE' });
                                fetchObjects();
                              }}
                              className="p-1.5 hover:text-red-400 text-[#94A3B8] transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#111827] p-4 rounded-xl border border-[#1E293B]">
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">System Backups & Disaster Recovery</h2>
              <p className="text-xs text-[#64748B]">Automated cryptographic snapshots of database schemas and memories</p>
            </div>
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-[#00F0FF] text-[#0B0F17] font-semibold rounded-lg hover:bg-[#00F0FF]/90 transition flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Create New Snapshot</span>
            </button>
          </div>

          <div className="bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F17] text-[#64748B] border-b border-[#1E293B]">
                <tr>
                  <th className="p-4">SNAPSHOT NAME</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">ITEMS</th>
                  <th className="p-4">SIZE</th>
                  <th className="p-4">SHA-256 DIGEST</th>
                  <th className="p-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#64748B]">
                      No backup snapshots recorded. Click 'Create New Snapshot' to generate one.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-[#162032] transition">
                      <td className="p-4 font-semibold text-[#F1F5F9]">{b.name}</td>
                      <td className="p-4 text-[#00F0FF]">{b.backupType}</td>
                      <td className="p-4 text-[#94A3B8]">{b.itemCount} components</td>
                      <td className="p-4 text-[#94A3B8]">{formatSize(b.sizeBytes)}</td>
                      <td className="p-4 font-mono text-[10px] text-[#64748B]">{b.sha256.slice(0, 16)}...</td>
                      <td className="p-4 text-[#64748B]">{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E293B] pb-3">
              <h2 className="text-sm font-bold text-[#F1F5F9]">Store New Object</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-[#64748B] hover:text-[#F1F5F9]">✕</button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1">OBJECT KEY / PATH</label>
                <input
                  type="text"
                  value={uploadKey}
                  onChange={(e) => setUploadKey(e.target.value)}
                  placeholder="e.g. documents/report.txt"
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded p-2 text-[#F1F5F9] outline-none focus:border-[#00F0FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">CONTENT DATA</label>
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Enter file text or payload data..."
                  rows={4}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded p-2 text-[#F1F5F9] outline-none focus:border-[#00F0FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#94A3B8] mb-1">TARGET TIER</label>
                  <select
                    value={uploadTier}
                    onChange={(e) => setUploadTier(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded p-2 text-[#F1F5F9] outline-none"
                  >
                    <option value="NORMAL">NORMAL (Supabase/Local)</option>
                    <option value="COLD">COLD (Telegram TG-S3)</option>
                    <option value="HOT">HOT (Cache Accelerated)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="encryptCheck"
                    checked={uploadEncrypt}
                    onChange={(e) => setUploadEncrypt(e.target.checked)}
                    className="rounded border-[#1E293B]"
                  />
                  <label htmlFor="encryptCheck" className="text-[#F1F5F9] cursor-pointer">
                    AES-256-GCM Encrypt
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-[#1E293B] text-[#94A3B8] rounded hover:text-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00F0FF] text-[#0B0F17] font-semibold rounded hover:bg-[#00F0FF]/90"
                >
                  Confirm & Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
