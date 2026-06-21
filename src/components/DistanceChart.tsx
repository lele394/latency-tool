import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { DataCenter, PingResult } from '../types';

interface DistanceChartProps {
  datacenters: DataCenter[];
  results: Record<string, PingResult>;
  hideFailed?: boolean;
}

export default function DistanceChart({ datacenters, results, hideFailed }: DistanceChartProps) {
  const data = useMemo(() => {
    return datacenters
      .map(dc => {
        const res = results[dc.id];
        if (!res || res.status !== 'success' || !res.distance) return null;
        return {
          name: dc.provider,
          distance: Math.round(res.distance),
          latency: res.avg,
        };
      })
      .filter((d): d is { name: string; distance: number; latency: number } => d !== null);
  }, [datacenters, results]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
        Insufficient data for visualization
      </div>
    );
  }

  // Speed of light baseline (theoretical minimum round trip)
  // ~200,000 km/s in fiber. 2ms per 200km. 1ms per 100km.
  // Actually, round trip is 1ms per 100km of path.
  // Let's use a conservative 1ms per 150km.
  const maxDistance = Math.max(...data.map(d => d.distance), 1000);

  return (
    <div className="w-full h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            type="number" 
            dataKey="distance" 
            name="Distance" 
            unit="km" 
            stroke="#71717a" 
            fontSize={10}
            tickFormatter={(v) => `${v}`}
          >
            <Label value="Distance (km)" offset={-10} position="insideBottom" fill="#52525b" fontSize={10} />
          </XAxis>
          <YAxis 
            type="number" 
            dataKey="latency" 
            name="Latency" 
            unit="ms" 
            stroke="#71717a" 
            fontSize={10}
          >
            <Label value="Latency (ms)" angle={-90} position="insideLeft" fill="#52525b" fontSize={10} />
          </YAxis>
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '12px' }}
            itemStyle={{ color: '#e4e4e7' }}
          />
          {/* Reference line: Theoretical Minimum (roughly 1ms per 100km) */}
          <ReferenceLine 
            segment={[{ x: 0, y: 0 }, { x: maxDistance, y: maxDistance / 100 }]} 
            stroke="#8b5cf6" 
            strokeDasharray="5 5"
            label={{ position: 'top', value: 'Speed of Light Baseline', fill: '#8b5cf6', fontSize: 10 }}
          />
          <Scatter name="Nodes" data={data} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
