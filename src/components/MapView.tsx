import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker, 
  ZoomableGroup 
} from "react-simple-maps";
import { DataCenter, PingResult, UserLocation } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useMemo, useTransition } from "react";
import { scaleLinear } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapPin } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MapViewProps {
  datacenters: DataCenter[];
  results: Record<string, PingResult>;
  userLocation?: UserLocation | null;
}

const colorScale = scaleLinear<string>()
  .domain([0, 15, 25, 50, 100, 300])
  .range(["#22c55e", "#22c55e", "#86efac", "#eab308", "#f97316", "#ef4444"])
  .interpolate(interpolateRgb);

export default function MapView({ datacenters, results, userLocation }: MapViewProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [, startTransition] = useTransition();
  
  const projectionConfig = useMemo(() => ({
    scale: 160,
    center: [0, 0] as [number, number]
  }), []);
  
  // Use a ref to track the "real-time" center during gestures to avoid the "jump and stop" 
  // that happens when feeding back coordinates to the controlled state too frequently.
  const lastMoveCenter = useRef<[number, number]>([0, 10]);

  const getMarkerColor = (id: string) => {
    const result = results[id];
    if (!result || result.status === 'not-pinged') return "#3f3f46"; // zinc-600
    if (result.status === 'fail') return "#ef4444"; // red-500
    
    const latency = result.avg;
    if (latency === 0) return "#ef4444";
    return colorScale(latency);
  };

  return (
    <div className="w-full h-full bg-bento-card relative overflow-hidden group">
      {/* Tooltip Overlay */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-6 right-6 z-30 bg-zinc-950/90 border border-zinc-800 p-4 w-72 shadow-2xl backdrop-blur-xl pointer-events-none"
          >
            {(() => {
              const dc = datacenters.find(d => d.id === hoveredNode);
              if (!dc) return null;
              const res = results[dc.id];
              const color = getMarkerColor(dc.id);
              
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Telemetry Source</p>
                    <h3 className="text-zinc-100 font-bold text-lg leading-tight mt-1">{dc.provider}</h3>
                    <p className="text-xs text-zinc-400 font-medium">{dc.location}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase">Avg Latency</p>
                      <p className={cn("text-base font-bold font-mono", res?.avg > 0 ? "" : "text-zinc-600")} style={{ color: res?.avg > 0 ? color : undefined }}>
                        {res?.avg > 0 ? `${res.avg}ms` : '---'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase">Packet Loss</p>
                      <p className={cn("text-base font-bold font-mono", (res?.packetLoss ?? 0) > 0 ? "text-red-500" : "text-green-500")}>
                        {res?.packetLoss ?? '0'}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase">Min / Max</p>
                      <p className="text-xs font-mono text-zinc-300">
                        {res?.min || '-'}/{res?.max || '-'}ms
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-zinc-500 font-mono uppercase">Geo Coords</p>
                      <p className="text-[10px] font-mono text-zinc-500 tracking-tighter">
                        {dc.coordinates[0].toFixed(3)}, {dc.coordinates[1].toFixed(3)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/50">
                    <p className="text-[9px] text-zinc-600 font-mono italic truncate">
                      ENDPOINT: {dc.host}
                    </p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-black/40 backdrop-blur-sm p-3 border border-zinc-800 text-[9px] uppercase font-mono tracking-tighter z-10 transition-opacity group-hover:opacity-20 pointer-events-none">
        <p className="text-zinc-500 font-bold mb-1">Color Gradient</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div> <span>&lt;15ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#86efac] rounded-full"></div> <span>25ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div> <span>50ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div> <span>100ms</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div> <span>300ms+</span>
          </div>
        </div>
      </div>

      <ComposableMap
        projectionConfig={projectionConfig}
        className="w-full h-full"
      >
        <ZoomableGroup 
          maxZoom={10} 
          minZoom={0.5}
          onMove={({ zoom: newZoom, coordinates }) => {
            lastMoveCenter.current = coordinates;
            if (Math.abs(newZoom - zoom) > 0.001) {
              startTransition(() => {
                setZoom(newZoom);
              });
            }
          }}
          onMoveEnd={({ zoom: newZoom, coordinates }) => {
            setZoom(newZoom);
            lastMoveCenter.current = coordinates;
          }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1c1c21"
                  stroke="#333"
                  strokeWidth={0.5 / zoom}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#27272a", outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {datacenters.map((dc) => {
            const result = results[dc.id];
            const color = getMarkerColor(dc.id);
            
            return (
              <Marker 
                key={dc.id} 
                coordinates={[dc.coordinates[1], dc.coordinates[0]]}
                onMouseEnter={() => setHoveredNode(dc.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <circle 
                    r={5 / zoom} 
                    fill={color} 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth={1 / zoom} 
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer transition-transform hover:scale-150"
                    style={{ filter: `drop-shadow(0 0 ${4/zoom}px ${color}80)` }}
                  />
                </motion.g>
              </Marker>
            );
          })}

          {/* User Location Marker - Rendered last to be on top */}
          {userLocation && (
            <Marker coordinates={[userLocation.lng, userLocation.lat]}>
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <circle 
                  r={8 / zoom} 
                  fill="#a855f7" 
                  stroke="#fff" 
                  strokeWidth={2 / zoom} 
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: `drop-shadow(0 0 ${8/zoom}px #a855f7)` }}
                />
                <g transform={`translate(${-6/zoom}, ${-24/zoom}) scale(${1/zoom})`}>
                   <MapPin size={12} className="text-purple-300" fill="#a855f7" />
                </g>
              </motion.g>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
