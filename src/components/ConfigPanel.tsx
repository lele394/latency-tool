import React, { useState } from 'react';
import { DataCenter, UserLocation, SourceMode } from '../types';
import { X, Plus, Trash2, Download, Upload, Pencil, Settings, RotateCcw, MapPin, Filter, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  servers: DataCenter[];
  onUpdateServers: (servers: DataCenter[]) => void;
  onResetDefaults: () => void;
  ripePageSize: number;
  onUpdateRipePageSize: (size: number) => void;
  hideFailedResults: boolean;
  onUpdateHideFailed: (hide: boolean) => void;
  userLocation: UserLocation | null;
  onUpdateUserLocation: (loc: UserLocation | null) => void;
  mode: SourceMode;
}

export default function ConfigPanel({ 
  isOpen, 
  onClose, 
  servers, 
  onUpdateServers, 
  onResetDefaults,
  ripePageSize,
  onUpdateRipePageSize,
  hideFailedResults,
  onUpdateHideFailed,
  userLocation,
  onUpdateUserLocation,
  mode
}: ConfigPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newServer, setNewServer] = useState<Partial<DataCenter>>({
    provider: '',
    location: '',
    host: '',
    coordinates: [0, 0]
  });

  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const handleSave = () => {
    if (!newServer.provider || !newServer.host) return;
    
    if (editingId) {
      onUpdateServers(servers.map(s => s.id === editingId ? { ...s, ...newServer } as DataCenter : s));
      setEditingId(null);
    } else {
      const dc: DataCenter = {
        id: `custom-${Date.now()}`,
        provider: newServer.provider!,
        location: newServer.location || 'Unknown',
        host: newServer.host!,
        coordinates: newServer.coordinates || [0, 0]
      };
      onUpdateServers([...servers, dc]);
    }
    setNewServer({ provider: '', location: '', host: '', coordinates: [0, 0] });
  };

  const handleReset = () => {
    if (isResetConfirming) {
      onResetDefaults();
      setIsResetConfirming(false);
    } else {
      setIsResetConfirming(true);
      setTimeout(() => setIsResetConfirming(false), 3000); // Reset confirmation state after 3s
    }
  };

  const startEdit = (s: DataCenter) => {
    setEditingId(s.id);
    setNewServer(s);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewServer({ provider: '', location: '', host: '', coordinates: [0, 0] });
  };

  const handleRemove = (id: string) => {
    onUpdateServers(servers.filter(s => s.id !== id));
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(servers, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "nebuleo-config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        onUpdateUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onUpdateServers(json);
        }
      } catch (err) {
        alert("Invalid config file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[400px] bg-zinc-950 border-l border-zinc-800 z-50 p-6 flex flex-col shadow-2xl overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Settings className="text-zinc-400" size={20} />
                <h2 className="text-xl font-bold uppercase tracking-tight">Manage Servers</h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Global Settings Section */}
            <div className="mb-8 space-y-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-b border-zinc-900 pb-2 flex items-center gap-2">
                <Layers size={12} /> App Settings
              </p>
              
              <div className="space-y-4 bg-zinc-900/30 p-3 rounded-sm border border-zinc-900">
                {mode === 'ripe' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-medium">RIPE Nodes Count</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="1000"
                      value={ripePageSize}
                      onChange={(e) => onUpdateRipePageSize(parseInt(e.target.value) || 100)}
                      className="bg-zinc-950 border border-zinc-800 p-2 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Filter size={14} className="text-zinc-500" />
                    <span className="text-xs">Drop Failed Pings</span>
                  </div>
                  <button 
                    onClick={() => onUpdateHideFailed(!hideFailedResults)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${hideFailedResults ? 'bg-blue-600' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideFailedResults ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <MapPin size={14} className="text-purple-500" />
                      <span className="text-xs">My Location</span>
                    </div>
                    <button 
                      onClick={handleGetLocation}
                      className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-sm"
                    >
                      <MapPin size={10} /> Locate Me
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" 
                      placeholder="Lat"
                      step="any"
                      value={userLocation?.lat || ''}
                      onChange={(e) => onUpdateUserLocation(e.target.value ? { lat: parseFloat(e.target.value), lng: userLocation?.lng || 0 } : null)}
                      className="bg-zinc-950 border border-zinc-800 p-2 text-xs focus:border-purple-500 outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Lng"
                      step="any"
                      value={userLocation?.lng || ''}
                      onChange={(e) => onUpdateUserLocation(e.target.value ? { lat: userLocation?.lat || 0, lng: parseFloat(e.target.value) } : null)}
                      className="bg-zinc-950 border border-zinc-800 p-2 text-xs focus:border-purple-500 outline-none"
                    />
                  </div>
                  {userLocation && (
                    <button 
                      onClick={() => onUpdateUserLocation(null)}
                      className="w-full text-[9px] text-zinc-600 hover:text-zinc-400 uppercase py-1"
                    >
                      Clear Location Marker
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions at Top */}
            <div className="mb-8 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 py-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Upload size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-tight">Load JSON</span>
                  <input type="file" className="hidden" accept=".json" onChange={importConfig} />
                </label>
                <button 
                  onClick={exportConfig}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-tight">Export</span>
                </button>
              </div>
              <button 
                onClick={handleReset}
                className={`w-full py-3 transition-all flex items-center justify-center gap-2 border ${
                  isResetConfirming 
                    ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-red-950/30 hover:text-red-500'
                }`}
              >
                <RotateCcw size={14} className={isResetConfirming ? 'animate-spin' : ''} />
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {isResetConfirming ? 'Click again to confirm reset' : 'Reset to Defaults'}
                </span>
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* Add New */}
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm space-y-3">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {editingId ? 'Edit Performance Node' : 'Register New Node'}
                </p>
                <input 
                  placeholder="Provider (e.g. AWS)"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm focus:border-blue-500 outline-none transition-colors"
                  value={newServer.provider}
                  onChange={e => setNewServer({...newServer, provider: e.target.value})}
                />
                <input 
                  placeholder="Location (e.g. London, UK)"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm focus:border-blue-500 outline-none transition-colors"
                  value={newServer.location}
                  onChange={e => setNewServer({...newServer, location: e.target.value})}
                />
                <input 
                  placeholder="Host (IP or Hostname)"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm focus:border-blue-500 outline-none transition-colors"
                  value={newServer.host}
                  onChange={e => setNewServer({...newServer, host: e.target.value})}
                />
                <div className="space-y-1">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-1">GPS Coordinates</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Lat"
                      type="number"
                      step="any"
                      className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm focus:border-blue-500 outline-none transition-colors"
                      value={newServer.coordinates?.[0]}
                      onChange={e => setNewServer({...newServer, coordinates: [parseFloat(e.target.value), newServer.coordinates![1]]})}
                    />
                    <input 
                      placeholder="Lng"
                      type="number"
                      step="any"
                      className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm focus:border-blue-500 outline-none transition-colors"
                      value={newServer.coordinates?.[1]}
                      onChange={e => setNewServer({...newServer, coordinates: [newServer.coordinates![0], parseFloat(e.target.value)]})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingId && (
                    <button 
                      onClick={cancelEdit}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 font-bold text-xs uppercase transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={handleSave}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-2 font-bold text-xs uppercase transition-colors"
                  >
                    {editingId ? <Settings size={14} className="inline mr-1" /> : <Plus size={14} className="inline mr-1" />}
                    {editingId ? 'Update Node' : 'Add Node'}
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2 overflow-y-auto">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Active Registry ({servers.length})</p>
                {servers.map(s => (
                  <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-sm group flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{s.provider}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{s.host}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEdit(s)}
                        className="text-zinc-500 hover:text-blue-500 transition-colors"
                        title="Edit Node"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleRemove(s.id)}
                        className="text-zinc-600 hover:text-red-500 transition-colors"
                        title="Remove Node"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
