'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  MapPin,
  ArrowLeft,
  Radio,
  Eye,
  EyeOff,
  Navigation,
  Crosshair,
  Info,
  Smartphone,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface MapMarker {
  id: string;
  type: 'tower' | 'observation' | 'estimate';
  name: string;
  lat: number;
  lon: number;
  radius?: number;
  details: string;
  radio?: string;
  color: string;
}

const DEFAULT_MARKERS: MapMarker[] = [
  {
    id: 'm1',
    type: 'tower',
    name: 'AT&T LTE Tower 28419',
    lat: 37.7749,
    lon: -122.4194,
    radius: 1200,
    details: 'LTE • MCC:310 MNC:410 LAC:1402',
    radio: 'LTE',
    color: '#00F0FF'
  },
  {
    id: 'm2',
    type: 'tower',
    name: 'AT&T NR Tower 49201',
    lat: 37.7833,
    lon: -122.4167,
    radius: 650,
    details: 'NR 5G • MCC:310 MNC:410 LAC:1402',
    radio: 'NR',
    color: '#A855F7'
  },
  {
    id: 'm3',
    type: 'observation',
    name: 'Pixel 7a Telemetry',
    lat: 37.7785,
    lon: -122.4180,
    radius: 350,
    details: 'RSRP: -78 dBm • Connected to 28419',
    color: '#10B981'
  },
  {
    id: 'm4',
    type: 'estimate',
    name: 'Multi-Source Centroid Estimate',
    lat: 37.7770,
    lon: -122.4178,
    radius: 280,
    details: 'Ensemble confidence: 92% • Method: Ichnaea RF Triangulation',
    color: '#F59E0B'
  }
];

function MapViewerContent() {
  const searchParams = useSearchParams();
  const qLat = searchParams.get('lat');
  const qLon = searchParams.get('lon');

  const [centerLat, setCenterLat] = useState<number>(qLat ? parseFloat(qLat) : 37.777);
  const [centerLon, setCenterLon] = useState<number>(qLon ? parseFloat(qLon) : -122.418);
  const [zoom, setZoom] = useState<number>(14);

  const [showTowers, setShowTowers] = useState<boolean>(true);
  const [showObservations, setShowObservations] = useState<boolean>(true);
  const [showEstimates, setShowEstimates] = useState<boolean>(true);
  const [showRadiusRings, setShowRadiusRings] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(DEFAULT_MARKERS[3]);

  useEffect(() => {
    if (qLat && qLon) {
      setCenterLat(parseFloat(qLat));
      setCenterLon(parseFloat(qLon));
    }
  }, [qLat, qLon]);

  const visibleMarkers = DEFAULT_MARKERS.filter((m) => {
    if (m.type === 'tower' && !showTowers) return false;
    if (m.type === 'observation' && !showObservations) return false;
    if (m.type === 'estimate' && !showEstimates) return false;
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
            <span className="text-[#94A3B8]">INTERACTIVE MAP</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F1F5F9] flex items-center space-x-3">
            <Layers className="w-7 h-7 text-[#00F0FF]" />
            <span>OPENSTREETMAP GEOLOCATION VIEWER</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Visual RF triangulation, public tower footprints, and authorized device telemetry.
          </p>
        </div>

        {/* Viewport Coordinates Display */}
        <div className="bg-[#111827] border border-[#1E293B] p-3 rounded-xl flex items-center space-x-4 text-xs">
          <Crosshair className="w-5 h-5 text-[#00F0FF]" />
          <div>
            <span className="text-[#64748B] block text-[10px]">CURRENT VIEWPORT</span>
            <span className="text-[#F1F5F9] font-bold">
              {centerLat.toFixed(4)}°N, {centerLon.toFixed(4)}°W • Zoom {zoom}x
            </span>
          </div>
        </div>
      </div>

      {/* Main Map + Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Layer Controls & Marker Directory */}
        <div className="space-y-6">
          {/* Layer Toggles Card */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-[#64748B] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#00F0FF]" />
              <span>MAP LAYERS</span>
            </h2>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => setShowTowers(!showTowers)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  showTowers
                    ? 'bg-[#0A0F1D] border-[#00F0FF]/40 text-[#00F0FF]'
                    : 'bg-[#0A0F1D]/50 border-[#1E293B] text-[#64748B]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Radio className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>Public Cell Towers</span>
                </div>
                {showTowers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setShowObservations(!showObservations)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  showObservations
                    ? 'bg-[#0A0F1D] border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0A0F1D]/50 border-[#1E293B] text-[#64748B]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Consenting Telemetry</span>
                </div>
                {showObservations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setShowEstimates(!showEstimates)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  showEstimates
                    ? 'bg-[#0A0F1D] border-amber-500/40 text-amber-400'
                    : 'bg-[#0A0F1D]/50 border-[#1E293B] text-[#64748B]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>Position Estimates</span>
                </div>
                {showEstimates ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setShowRadiusRings(!showRadiusRings)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                  showRadiusRings
                    ? 'bg-[#0A0F1D] border-purple-500/40 text-purple-400'
                    : 'bg-[#0A0F1D]/50 border-[#1E293B] text-[#64748B]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>Uncertainty Radii</span>
                </div>
                {showRadiusRings ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Active Features List */}
          <div className="bg-[#111827] border border-[#1E293B] p-5 rounded-xl space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-[#64748B] flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#38BDF8]" />
              <span>ACTIVE FEATURES ({visibleMarkers.length})</span>
            </h2>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {visibleMarkers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMarker(m);
                    setCenterLat(m.lat);
                    setCenterLon(m.lon);
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    selectedMarker?.id === m.id
                      ? 'bg-[#0A0F1D] border-[#00F0FF] text-[#00F0FF]'
                      : 'bg-[#0A0F1D] border-[#1E293B] text-[#94A3B8] hover:border-[#38BDF8]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[170px]">{m.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-1">{m.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Canvas / Visualizer */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative bg-[#0A0F1D] border border-[#1E293B] rounded-xl overflow-hidden h-[540px] flex flex-col">
            {/* Map Top Bar */}
            <div className="absolute top-4 left-4 z-10 bg-[#111827]/90 backdrop-blur border border-[#1E293B] px-3 py-1.5 rounded-lg text-xs flex items-center space-x-3 text-[#94A3B8]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[#F1F5F9]">OSM Carto Tiles</span>
              </span>
              <span>•</span>
              <span>EPSG:3857 Web Mercator</span>
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col space-y-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 1, 18))}
                className="p-2 bg-[#111827]/90 backdrop-blur border border-[#1E293B] rounded-lg text-[#F1F5F9] hover:text-[#00F0FF] transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 1, 3))}
                className="p-2 bg-[#111827]/90 backdrop-blur border border-[#1E293B] rounded-lg text-[#F1F5F9] hover:text-[#00F0FF] transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Vector / Interactive OSM Canvas */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#060913] via-[#0b1329] to-[#080d1a]">
              {/* Grid Background Pattern */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, #38BDF8 1px, transparent 0)',
                  backgroundSize: '32px 32px'
                }}
              />

              {/* Geographic Coordinates Overlay Grid Lines */}
              <div className="absolute inset-0 pointer-events-none border border-[#1E293B]/40" />

              {/* Render Visible Markers and Uncertainty Rings */}
              {visibleMarkers.map((m, idx) => {
                const isSelected = selectedMarker?.id === m.id;
                // Compute relative offsets for visual representation
                const offsetX = (m.lon - centerLon) * 14000;
                const offsetY = (centerLat - m.lat) * 14000;

                return (
                  <div
                    key={m.id}
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px)`
                    }}
                    className="absolute flex flex-col items-center justify-center cursor-pointer group"
                    onClick={() => setSelectedMarker(m)}
                  >
                    {/* Uncertainty Radius Ring */}
                    {showRadiusRings && m.radius && (
                      <div
                        className="absolute rounded-full border border-dashed transition-all"
                        style={{
                          width: `${Math.min(Math.max(m.radius / 3.5, 40), 280)}px`,
                          height: `${Math.min(Math.max(m.radius / 3.5, 40), 280)}px`,
                          borderColor: m.color,
                          backgroundColor: `${m.color}15`
                        }}
                      />
                    )}

                    {/* Marker Icon Pin */}
                    <div
                      className={`relative z-10 p-2 rounded-full border shadow-lg transition-transform ${
                        isSelected
                          ? 'scale-125 ring-2 ring-white/50'
                          : 'group-hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: '#0A0F1D',
                        borderColor: m.color
                      }}
                    >
                      {m.type === 'tower' ? (
                        <Radio className="w-4 h-4" style={{ color: m.color }} />
                      ) : m.type === 'observation' ? (
                        <Smartphone className="w-4 h-4" style={{ color: m.color }} />
                      ) : (
                        <Crosshair className="w-4 h-4" style={{ color: m.color }} />
                      )}
                    </div>

                    {/* Tooltip / Label */}
                    <div
                      className={`mt-1.5 px-2 py-0.5 rounded text-[10px] whitespace-nowrap border bg-[#0A0F1D]/90 transition ${
                        isSelected ? 'border-white text-white font-bold' : 'border-[#1E293B] text-[#94A3B8]'
                      }`}
                    >
                      {m.name}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Attribution Bar on Map */}
              <div className="absolute bottom-3 left-4 right-4 z-10 bg-[#111827]/90 backdrop-blur border border-[#1E293B] px-3 py-2 rounded-lg flex justify-between items-center text-[11px] text-[#64748B]">
                <div>
                  Map data ©{' '}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38BDF8] underline"
                  >
                    OpenStreetMap
                  </a>{' '}
                  contributors • Cell positions ©{' '}
                  <a
                    href="https://opencellid.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00F0FF] underline"
                  >
                    OpenCelliD
                  </a>{' '}
                  (CC-BY-SA 4.0)
                </div>
                <div className="text-[10px] text-emerald-400">Tile Server: Active</div>
              </div>
            </div>
          </div>

          {/* Selected Feature Inspector Card */}
          {selectedMarker && (
            <div className="bg-[#111827] border border-[#1E293B] p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedMarker.color }}
                  />
                  <span className="font-bold text-[#F1F5F9] text-sm">{selectedMarker.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#0A0F1D] text-[#94A3B8] border border-[#1E293B]">
                    {selectedMarker.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-[#64748B]">{selectedMarker.details}</p>
              </div>

              <div className="flex items-center space-x-4 text-right">
                <div>
                  <span className="text-[10px] text-[#64748B] block">COORDINATES</span>
                  <span className="text-[#00F0FF] font-semibold">
                    {`${selectedMarker.lat.toFixed(6)}, ${selectedMarker.lon.toFixed(6)}`}
                  </span>
                </div>
                {selectedMarker.radius && (
                  <div>
                    <span className="text-[10px] text-[#64748B] block">UNCERTAINTY</span>
                    <span className="text-amber-400 font-semibold">±{selectedMarker.radius}m</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeointelMapsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#64748B] font-mono">
          Loading OpenStreetMap Geolocation Viewer...
        </div>
      }
    >
      <MapViewerContent />
    </Suspense>
  );
}
