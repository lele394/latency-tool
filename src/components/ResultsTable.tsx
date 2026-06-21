import { useState, useMemo } from 'react';
import { DataCenter, PingResult } from '../types';
import { ArrowUpDown, Activity, Wifi, WifiOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResultsTableProps {
  datacenters: DataCenter[];
  results: Record<string, PingResult>;
  hideFailed?: boolean;
}

type SortField = 'provider' | 'location' | 'avg' | 'packetLoss' | 'distance';

export default function ResultsTable({ datacenters, results, hideFailed }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('provider');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredDatacenters = useMemo(() => {
    if (!hideFailed) return datacenters;
    return datacenters.filter(dc => {
      const res = results[dc.id];
      return res?.status !== 'fail';
    });
  }, [datacenters, results, hideFailed]);

  const sortedData = useMemo(() => {
    return [...filteredDatacenters].sort((a, b) => {
      let valA: any, valB: any;
      
      const resA = results[a.id];
      const resB = results[b.id];

      if (sortField === 'provider') {
        valA = a.provider;
        valB = b.provider;
      } else if (sortField === 'location') {
        valA = a.location;
        valB = b.location;
      } else if (sortField === 'avg') {
        valA = resA?.avg ?? (sortOrder === 'asc' ? 9999 : -1);
        valB = resB?.avg ?? (sortOrder === 'asc' ? 9999 : -1);
      } else if (sortField === 'packetLoss') {
        valA = resA?.packetLoss ?? (sortOrder === 'asc' ? 100 : -1);
        valB = resB?.packetLoss ?? (sortOrder === 'asc' ? 100 : -1);
      } else if (sortField === 'distance') {
        valA = resA?.distance ?? (sortOrder === 'asc' ? 999999 : -1);
        valB = resB?.distance ?? (sortOrder === 'asc' ? 999999 : -1);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [datacenters, results, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getLatencyColor = (value: number) => {
    if (value === 0 || value === 9999) return "text-zinc-500";
    if (value < 15) return "text-green-500";
    if (value < 25) return "text-green-300";
    if (value < 50) return "text-yellow-500";
    return "text-orange-400";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bento-card">
      <div className="grid grid-cols-12 bg-zinc-900/50 border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter font-mono">
        <div className="col-span-3 p-3 flex items-center gap-2 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('provider')}>
          Provider / Host <ArrowUpDown size={10} />
        </div>
        <div className="col-span-2 p-3 flex items-center gap-2 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('location')}>
          Location <ArrowUpDown size={10} />
        </div>
        <div className="col-span-1 p-3 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('distance')}>
          Dist <ArrowUpDown size={10} />
        </div>
        <div className="col-span-1 p-3 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('avg')}>
          Avg <ArrowUpDown size={10} />
        </div>
        <div className="col-span-1 p-3 text-right">Min</div>
        <div className="col-span-1 p-3 text-right">Max</div>
        <div className="col-span-1 p-3 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('packetLoss')}>
          Loss <ArrowUpDown size={10} />
        </div>
        <div className="col-span-2 p-3 text-center">Status</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedData.map((dc) => {
          const res = results[dc.id];
          
          return (
            <div key={dc.id} className="grid grid-cols-12 border-b border-zinc-800/50 text-xs items-center hover:bg-zinc-800/30 transition-colors">
              <div className="col-span-3 p-3 font-mono text-zinc-300 truncate">
                {dc.provider}
                <div className="text-[10px] text-zinc-500 font-normal">{dc.host}</div>
              </div>
              <div className="col-span-2 p-3 text-zinc-400 truncate">{dc.location}</div>
              <div className="col-span-1 p-3 text-right text-zinc-500 font-mono">
                {res?.distance ? `${Math.round(res.distance)}km` : '-'}
              </div>
              <div className={cn("col-span-1 p-3 text-right font-bold font-mono text-sm", getLatencyColor(res?.avg ?? 0))}>
                {res?.avg > 0 ? `${res.avg}ms` : '-'}
              </div>
              <div className="col-span-1 p-3 text-right text-zinc-500 font-mono">{res?.min > 0 ? `${res.min}ms` : '-'}</div>
              <div className="col-span-1 p-3 text-right text-zinc-500 font-mono">{res?.max > 0 ? `${res.max}ms` : '-'}</div>
              <div className={cn("col-span-1 p-3 text-right font-mono", (res?.packetLoss ?? 0) > 0 ? "text-red-500" : "text-zinc-500")}>
                {res?.packetLoss}%
              </div>
              <div className="col-span-2 p-3 flex justify-center">
                {res?.status === 'success' ? (
                  <span className="px-2 py-0.5 bg-green-900/30 text-green-500 text-[9px] font-bold border border-green-500/30 rounded-full uppercase">
                    Success
                  </span>
                ) : res?.status === 'fail' ? (
                  <span className="px-2 py-0.5 bg-red-900/20 text-red-500 text-[9px] font-bold border border-red-500/30 rounded-full uppercase">
                    Fail
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[9px] font-bold border border-zinc-700/50 rounded-full uppercase">
                    Not Pinged
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
