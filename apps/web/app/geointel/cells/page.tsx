'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Search,
  ArrowLeft,
  Database,
  ExternalLink,
  Filter,
  MapPin,
  Signal,
  Layers,
  Info
} from 'lucide-react';

interface MockCell {
  id: string;
  radio: 'GSM' | 'UMTS' | 'LTE' | 'NR';
  mcc: number;
  mnc: number;
  lac: number;
  cellId: number;
  lat: number;
  lon: number;
  range: number;
  samples: number;
  operator: string;
  country: string;
}

const INITIAL_CELLS: MockCell[] = [
  {
    id: 'cell_310_410_28419',
    radio: 'LTE',
    mcc: 310,
    mnc: 410,
    lac: 1402,
    cellId: 28419,
    lat: 37.7749,
    lon: -122.4194,
    range: 1200,
    samples: 148,
    operator: 'AT&T Mobility',
    country: 'United States'
  },
  {
    id: 'cell_310_410_49201',
    radio: 'NR',
    mcc: 310,
    mnc: 410,
    lac: 1402,
    cellId: 49201,
    lat: 37.7833,
    lon: -122.4167,
    range: 650,
    samples: 92,
    operator: 'AT&T Mobility',
    country: 'United States'
  },
  {
    id: 'cell_310_260_19824',
    radio: 'LTE',
    mcc: 310,
    mnc: 260,
    lac: 8301,
    cellId: 19824,
    lat: 37.8044,
    lon: -122.2712,
    range: 1500,
    samples: 215,
    operator: 'T-Mobile US',
    country: 'United States'
  },
  {
    id: 'cell_311_480_58102',
    radio: 'LTE',
    mcc: 311,
    mnc: 480,
    lac: 3410,
    cellId: 58102,
    lat: 37.7690,
    lon: -122.4467,
    range: 980,
    samples: 64,
    operator: 'Verizon Wireless',
    country: 'United States'
  },
  {
    id: 'cell_208_01_10492',
    radio: 'UMTS',
    mcc: 208,
    mnc: 1,
    lac: 501,
    cellId: 10492,
    lat: 48.8566,
    lon: 2.3522,
    range: 2000,
    samples: 310,
    operator: 'Orange France',
    country: 'France'
  }
];

export default function CellExplorerPage() {
  const [cells, setCells] = useState<MockCell[]>(INITIAL_CELLS);
  const [selectedCell, setSelectedCell] = useState<MockCell | null>(INITIAL_CELLS[0]);
  const [radioFilter, setRadioFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mccInput, setMccInput] = useState<string>('');
  const [mncInput, setMncInput] = useState<string>('');
  const [lacInput, setLacInput] = useState<string>('');
  const [cellIdInput, setCellIdInput] = useState<string>('');

  const filteredCells = cells.filter((c) => {
    if (radioFilter !== 'ALL' && c.radio !== radioFilter) return false;
    if (mccInput && c.mcc.toString() !== mccInput.trim()) return false;
    if (mncInput && c.mnc.toString() !== mncInput.trim()) return false;
    if (lacInput && c.lac.toString() !== lacInput.trim()) return false;
    if (cellIdInput && c.cellId.toString() !== cellIdInput.trim()) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchOp = c.operator.toLowerCase().includes(term);
      const matchCountry = c.country.toLowerCase().includes(term);
      const matchCid = c.cellId.toString().includes(term);
      if (!matchOp && !matchCountry && !matchCid) return false;
    }
    return true;
  });

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
            <span className="text-[#94A3B8]">CELL EXPLORER</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Database className="w-7 h-7 text-[#00F0FF]" />
            <span>PUBLIC CELL TOWER EXPLORER</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Query and inspect public cellular towers across GSM, UMTS, LTE, and NR networks.
          </p>
        </div>

        {/* Attribution Notice Badge */}
        <div className="bg-[#111827] border border-[#1E293B] p-3 rounded-xl flex items-center space-x-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs text-[#94A3B8]">
            <p className="font-semibold text-[#F1F5F9]">OpenCelliD Community Data</p>
            <p>Licensed under CC-BY-SA 4.0 • 1,000 req/day quota</p>
          </div>
        </div>
      </div>

      {/* Query Filters */}
      <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-[#64748B] flex items-center space-x-2">
            <Filter className="w-4 h-4 text-[#00F0FF]" />
            <span>CELLULAR QUERY FILTERS</span>
          </h2>
          <button
            onClick={() => {
              setRadioFilter('ALL');
              setSearchTerm('');
              setMccInput('');
              setMncInput('');
              setLacInput('');
              setCellIdInput('');
            }}
            className="text-xs text-[#64748B] hover:text-[#00F0FF] transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="text-[#64748B] block mb-1">RADIO TYPE</label>
            <select
              value={radioFilter}
              onChange={(e) => setRadioFilter(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            >
              <option value="ALL">ALL (GSM/UMTS/LTE/NR)</option>
              <option value="LTE">LTE (4G)</option>
              <option value="NR">NR (5G)</option>
              <option value="UMTS">UMTS (3G)</option>
              <option value="GSM">GSM (2G)</option>
            </select>
          </div>

          <div>
            <label className="text-[#64748B] block mb-1">MCC (Mobile Country)</label>
            <input
              type="text"
              placeholder="e.g. 310"
              value={mccInput}
              onChange={(e) => setMccInput(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div>
            <label className="text-[#64748B] block mb-1">MNC (Mobile Network)</label>
            <input
              type="text"
              placeholder="e.g. 410"
              value={mncInput}
              onChange={(e) => setMncInput(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div>
            <label className="text-[#64748B] block mb-1">LAC / TAC (Area)</label>
            <input
              type="text"
              placeholder="e.g. 1402"
              value={lacInput}
              onChange={(e) => setLacInput(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div>
            <label className="text-[#64748B] block mb-1">CELL ID (CID)</label>
            <input
              type="text"
              placeholder="e.g. 28419"
              value={cellIdInput}
              onChange={(e) => setCellIdInput(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div>
            <label className="text-[#64748B] block mb-1">OPERATOR / SEARCH</label>
            <input
              type="text"
              placeholder="AT&T, Verizon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0A0F1D] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>
        </div>
      </div>

      {/* Main Results Grid & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cell List Table */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1E293B] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center text-xs">
            <span className="font-bold text-[#94A3B8]">FOUND {filteredCells.length} CELL TOWERS</span>
            <span className="text-[#64748B]">Click tower row to inspect details</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0F1D] text-[#64748B] border-b border-[#1E293B]">
                <tr>
                  <th className="p-3">RADIO</th>
                  <th className="p-3">MCC-MNC</th>
                  <th className="p-3">LAC/TAC</th>
                  <th className="p-3">CELL ID</th>
                  <th className="p-3">COORDINATES</th>
                  <th className="p-3">RANGE</th>
                  <th className="p-3">OPERATOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {filteredCells.map((c) => {
                  const isSelected = selectedCell?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCell(c)}
                      className={`cursor-pointer transition hover:bg-[#1E293B]/50 ${
                        isSelected ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'text-[#F1F5F9]'
                      }`}
                    >
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.radio === 'NR'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : c.radio === 'LTE'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-700/30 text-slate-300'
                          }`}
                        >
                          {c.radio}
                        </span>
                      </td>
                      <td className="p-3 text-[#94A3B8]">{`${c.mcc}-${c.mnc}`}</td>
                      <td className="p-3">{c.lac}</td>
                      <td className="p-3 font-semibold">{c.cellId}</td>
                      <td className="p-3 text-[#94A3B8]">{`${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`}</td>
                      <td className="p-3 text-[#94A3B8]">{c.range}m</td>
                      <td className="p-3 truncate max-w-[130px]">{c.operator}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Cell Detail Card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-bold tracking-widest text-[#64748B] flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[#00F0FF]" />
            <span>TOWER TELEMETRY PROFILE</span>
          </h2>

          {selectedCell ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#0A0F1D] border border-[#1E293B] rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-[#F1F5F9]">{selectedCell.operator}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                    {selectedCell.radio}
                  </span>
                </div>
                <div className="text-[#64748B] text-[11px]">{selectedCell.country}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg">
                  <span className="text-[#64748B] block text-[10px]">CELL ID</span>
                  <span className="text-sm font-semibold text-[#F1F5F9]">{selectedCell.cellId}</span>
                </div>
                <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg">
                  <span className="text-[#64748B] block text-[10px]">LAC / TAC</span>
                  <span className="text-sm font-semibold text-[#F1F5F9]">{selectedCell.lac}</span>
                </div>
                <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg">
                  <span className="text-[#64748B] block text-[10px]">MCC / MNC</span>
                  <span className="text-sm font-semibold text-[#F1F5F9]">{`${selectedCell.mcc} / ${selectedCell.mnc}`}</span>
                </div>
                <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg">
                  <span className="text-[#64748B] block text-[10px]">SAMPLES</span>
                  <span className="text-sm font-semibold text-[#F1F5F9]">{selectedCell.samples} hits</span>
                </div>
              </div>

              <div className="p-3 bg-[#0A0F1D] border border-[#1E293B] rounded-lg space-y-1">
                <span className="text-[#64748B] block text-[10px]">ESTIMATED COORDINATES</span>
                <div className="flex items-center justify-between text-sm text-[#00F0FF]">
                  <span>{`${selectedCell.lat.toFixed(6)}, ${selectedCell.lon.toFixed(6)}`}</span>
                  <Link
                    href={`/geointel/maps?lat=${selectedCell.lat}&lon=${selectedCell.lon}`}
                    className="p-1 hover:bg-[#1E293B] rounded text-xs flex items-center space-x-1 text-[#38BDF8]"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <span className="text-[10px] text-[#64748B]">Coverage Radius: ±{selectedCell.range} meters</span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/geointel/maps?lat=${selectedCell.lat}&lon=${selectedCell.lon}`}
                  className="w-full py-2 bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/40 text-[#00F0FF] rounded-lg flex items-center justify-center space-x-2 transition"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Inspect on Interactive Map</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#64748B]">
              Select a cell tower from the table to view RF telemetry details.
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Attribution Footer */}
      <div className="bg-[#111827] border border-[#1E293B] p-4 rounded-xl flex flex-col md:flex-row justify-between items-center text-xs text-[#64748B] gap-2">
        <div>
          <span>Data provided by </span>
          <a
            href="https://opencellid.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00F0FF] underline hover:text-[#38BDF8]"
          >
            OpenCelliD community
          </a>
          <span> under </span>
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00F0FF] underline hover:text-[#38BDF8]"
          >
            CC-BY-SA 4.0
          </a>
          <span>. Hikmah uses this data in compliance with OpenCelliD attribution terms.</span>
        </div>
        <span className="text-[10px] bg-[#0A0F1D] px-2.5 py-1 rounded border border-[#1E293B]">
          Attribution Verified
        </span>
      </div>
    </div>
  );
}
