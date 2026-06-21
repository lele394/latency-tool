import { useState, useCallback, useMemo, useEffect } from 'react';
import { datacenters as defaultDatacenters, PingResult, DataCenter, SourceMode, RipeAnchor, UserLocation } from './types';
import MapView from './components/MapView';
import ResultsTable from './components/ResultsTable';
import ConfigPanel from './components/ConfigPanel';
import DistanceChart from './components/DistanceChart';
import { Play, RotateCcw, Activity, LayoutGrid, Settings, Anchor, Database, BarChart2, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDistance } from './lib/distance';

const STORAGE_KEY = 'nebuleo_servers_registry';
const MODE_KEY = 'nebuleo_source_mode';
const SETTINGS_KEY = 'nebuleo_app_settings';

export default function App() {
  const [mode, setMode] = useState<SourceMode>(() => {
    const saved = localStorage.getItem(MODE_KEY);
    return (saved as SourceMode) || 'manual';
  });

  const [ripePageSize, setRipePageSize] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return 100;
    try {
      return JSON.parse(saved).ripePageSize || 100;
    } catch { return 100; }
  });

  const [hideFailed, setHideFailed] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return false;
    try {
      return !!JSON.parse(saved).hideFailed;
    } catch { return false; }
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved).userLocation || null;
    } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      ripePageSize,
      hideFailed,
      userLocation
    }));
  }, [ripePageSize, hideFailed, userLocation]);

  const [manualServers, setManualServers] = useState<DataCenter[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : [...defaultDatacenters];
    } catch {
      return [...defaultDatacenters];
    }
  });

  const [ripeServers, setRipeServers] = useState<DataCenter[]>([]);
  const [isRefreshingRipe, setIsRefreshingRipe] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const servers = useMemo(() => {
    return mode === 'manual' ? manualServers : ripeServers;
  }, [mode, manualServers, ripeServers]);

  const [results, setResults] = useState<Record<string, PingResult>>({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const fetchRipeAnchors = useCallback(async () => {
    setIsRefreshingRipe(true);
    try {
      const response = await fetch(`/api/anchors?page_size=${ripePageSize}`);
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      const mapped: DataCenter[] = data.results.map((anchor: RipeAnchor) => ({
        id: `ripe-${anchor.id}`,
        provider: anchor.company || 'RIPE Anchor',
        location: `${anchor.city}, ${anchor.country}`,
        coordinates: [anchor.geometry.coordinates[1], anchor.geometry.coordinates[0]],
        host: anchor.fqdn || anchor.hostname
      }));

      setRipeServers(mapped);
    } catch (err) {
      console.error('Error fetching RIPE anchors:', err);
    } finally {
      setIsRefreshingRipe(false);
    }
  }, [ripePageSize]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
    if (mode === 'ripe' && ripeServers.length === 0) {
      fetchRipeAnchors();
    }
  }, [mode, ripeServers.length, fetchRipeAnchors]);

  // Sync manual servers to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualServers));
  }, [manualServers]);

  // Initialize results structure whenever servers change
  useEffect(() => {
    setResults(prev => {
      const next: Record<string, PingResult> = {};
      servers.forEach(s => {
        const distance = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, s.coordinates[0], s.coordinates[1])
          : undefined;
        next[s.id] = prev[s.id] || { avg: 0, min: 0, max: 0, packetLoss: 0, status: 'not-pinged', distance };
      });
      return next;
    });
  }, [servers, userLocation]);

  const handleResetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setManualServers([...defaultDatacenters]);
    setResults({});
  }, []);

  const stats = useMemo(() => {
    const resValues = Object.values(results) as PingResult[];
    const completed = resValues.filter(r => r.status === 'success');
    if (completed.length === 0) return { avg: '-', loss: '0.00', slowest: null };
    
    const avg = completed.reduce((acc, curr) => acc + curr.avg, 0) / completed.length;
    const loss = completed.reduce((acc, curr) => acc + curr.packetLoss, 0) / completed.length;
    
    let slowestId = null;
    let maxLatency = -1;
    for (const [id, res] of Object.entries(results) as [string, PingResult][]) {
      if (res.status === 'success' && res.avg > maxLatency) {
        maxLatency = res.avg;
        slowestId = id;
      }
    }
    const slowestDC = servers.find(dc => dc.id === slowestId);

    return {
      avg: avg.toFixed(1),
      loss: loss.toFixed(2),
      slowest: slowestDC ? `${slowestDC.provider} - ${slowestDC.location}` : 'N/A',
      slowestLatency: maxLatency.toFixed(1)
    };
  }, [results, servers]);

  const progress = useMemo(() => {
    const total = servers.length;
    if (total === 0) return 0;
    const completed = (Object.values(results) as PingResult[]).filter(r => r.status !== 'not-pinged').length;
    return Math.round((completed / total) * 100);
  }, [results, servers.length]);

  const completedCount = useMemo(() => {
    return (Object.values(results) as PingResult[]).filter(r => r.status !== 'not-pinged').length;
  }, [results]);

  const pingDatacenter = async (dcId: string, host: string) => {
    try {
      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, count: 5 }), // Reduced count for faster results with 100+ anchors
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      setResults(prev => {
        const dc = servers.find(s => s.id === dcId);
        const distance = (userLocation && dc) 
          ? getDistance(userLocation.lat, userLocation.lng, dc.coordinates[0], dc.coordinates[1])
          : prev[dcId]?.distance;

        return {
          ...prev,
          [dcId]: {
            avg: data.avg,
            min: data.min,
            max: data.max,
            packetLoss: data.packetLoss,
            status: data.alive ? 'success' : 'fail',
            distance
          }
        };
      });
    } catch (err) {
      console.error(`Error pinging ${host}:`, err);
      setResults(prev => ({
        ...prev,
        [dcId]: { ...prev[dcId], status: 'fail' }
      }));
    }
  };

  const startTest = useCallback(async () => {
    if (isTestRunning) return;
    setIsTestRunning(true);

    setResults(prev => Object.fromEntries(
      Object.entries(prev).map(([id, res]) => [id, { ...(res as PingResult), status: 'not-pinged' }])
    ));

    // Concurrency control: 10 at a time
    const chunks = [];
    const chunkSize = 10;
    for (let i = 0; i < servers.length; i += chunkSize) {
      chunks.push(servers.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(dc => pingDatacenter(dc.id, dc.host)));
    }
    
    setIsTestRunning(false);
  }, [isTestRunning, servers]);

  const resetTest = () => {
    setResults(prev => Object.fromEntries(
      servers.map(dc => {
        const distance = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, dc.coordinates[0], dc.coordinates[1])
          : prev[dc.id]?.distance;
        return [dc.id, { avg: 0, min: 0, max: 0, packetLoss: 0, status: 'not-pinged', distance }];
      })
    ));
    setIsTestRunning(false);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-bento-bg text-bento-text p-6 overflow-hidden">
      <ConfigPanel 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        servers={manualServers}
        onUpdateServers={setManualServers}
        onResetDefaults={handleResetToDefaults}
        ripePageSize={ripePageSize}
        onUpdateRipePageSize={setRipePageSize}
        hideFailedResults={hideFailed}
        onUpdateHideFailed={setHideFailed}
        userLocation={userLocation}
        onUpdateUserLocation={setUserLocation}
        mode={mode}
      />

      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isTestRunning || isRefreshingRipe ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight uppercase">
              Nebuleo <span className="text-blue-500">Latency Tool</span>
            </h1>
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="text-zinc-600 hover:text-zinc-400 p-1"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex gap-6 items-center">
          {isTestRunning && (
            <div className="hidden md:flex flex-col items-end gap-1.5 w-48">
              <div className="flex justify-between w-full text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">
                <span>Diagnostic Progress</span>
                <span className="text-blue-400">{completedCount} / {servers.length}</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-zinc-900 p-1 rounded-sm border border-zinc-800">
            <button 
              onClick={() => setMode('manual')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-tighter transition-all ${mode === 'manual' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Database size={12} />
              Registry
            </button>
            <button 
              onClick={() => setMode('ripe')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-tighter transition-all ${mode === 'ripe' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Anchor size={12} />
              RIPE Anchors
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="bg-zinc-900 text-zinc-300 p-2 rounded-sm hover:bg-zinc-800 transition-colors border border-zinc-800"
              title="Global Settings & Registry"
            >
              <Settings size={18} />
            </button>
            {mode === 'ripe' && (
              <button
                onClick={fetchRipeAnchors}
                disabled={isRefreshingRipe}
                className="bg-zinc-900 text-zinc-300 p-2 rounded-sm hover:bg-zinc-800 transition-colors border border-zinc-800 disabled:opacity-50"
                title="Refresh RIPE Anchors"
              >
                <RotateCcw size={18} className={isRefreshingRipe ? 'animate-spin' : ''} />
              </button>
            )}
             <button
              onClick={resetTest}
              disabled={isTestRunning}
              className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-tighter hover:bg-zinc-700 transition-colors disabled:opacity-50 border border-zinc-700/50"
            >
              Reset
            </button>
            <button
              onClick={startTest}
              disabled={isTestRunning || isRefreshingRipe}
              className="bg-white text-black px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-tighter hover:bg-zinc-200 transition-colors disabled:bg-zinc-500 disabled:cursor-not-allowed"
            >
              {isTestRunning ? 'Diagnosing...' : 'Run Diagnostics'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0 overflow-hidden">
        <div className="col-span-12 lg:col-span-3 row-span-4 bg-bento-card border border-bento-border p-5 flex flex-col justify-between overflow-hidden">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase font-bold tracking-widest mb-4 font-mono">Global Health</p>
            <div className="space-y-6">
              <div className="border-l-2 border-green-500 pl-4 transition-all">
                <p className="text-xs text-zinc-400">Network Latency (Avg)</p>
                <p className="text-3xl font-mono font-bold">
                  {stats.avg}<span className="text-sm font-normal text-zinc-500 ml-1">ms</span>
                </p>
              </div>
              <div className="border-l-2 border-zinc-700 pl-4 transition-all">
                <p className="text-xs text-zinc-400">Packet Loss Rate</p>
                <p className="text-3xl font-mono font-bold">
                  {stats.loss}<span className="text-sm font-normal text-zinc-500 ml-1">%</span>
                </p>
              </div>
              <div className="border-l-2 border-orange-500 pl-4 transition-all">
                <p className="text-xs text-zinc-400">Slowest Endpoint</p>
                <p className="text-sm font-bold mt-1 text-zinc-200 truncate">{stats.slowest}</p>
                <p className="text-xl font-mono">
                  {stats.slowestLatency ? `${stats.slowestLatency}ms` : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9 row-span-4 bg-bento-card border border-bento-border relative overflow-hidden">
          <MapView datacenters={servers} results={results} userLocation={userLocation} />
        </div>

        <div className="col-span-12 lg:col-span-4 row-span-2 bg-bento-card border border-bento-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/30">
            <BarChart2 size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Latency vs Distance</span>
          </div>
          <div className="flex-1 min-h-0">
            <DistanceChart datacenters={servers} results={results} hideFailed={hideFailed} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 row-span-2 bg-bento-card border border-bento-border flex flex-col overflow-hidden">
          <ResultsTable datacenters={servers} results={results} hideFailed={hideFailed} />
        </div>
      </div>

      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 p-8 max-w-lg w-full relative"
            >
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">About <span className="text-blue-500">Nebuleo Latency</span></h2>
              
              <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  Nebuleo Latency Tool is a high-performance diagnostic dashboard designed to measure network round-trip times to various global endpoints.
                </p>
                <p>
                  It supports both a persistent **manual server registry** and real-time integration with **RIPE Atlas Anchors** for comprehensive global coverage.
                </p>
                <p className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-sm text-blue-100 italic">
                  "This tool was vibe coded in AI Studio with Gemini 1.5 Flash because the creator needed something working quite fast."
                </p>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">Core Features</p>
                  <ul className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] uppercase">
                    <li>● Global Map Viz</li>
                    <li>● RIPE Integration</li>
                    <li>● Geo-Distance Calculation</li>
                    <li>● Latency Distribution</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
