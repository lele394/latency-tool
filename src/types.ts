export interface DataCenter {
  id: string;
  provider: string;
  location: string;
  coordinates: [number, number]; // [lat, lng]
  host: string;
}

export type SourceMode = 'manual' | 'ripe';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface RipeAnchor {
  id: number;
  hostname: string;
  fqdn: string;
  city: string;
  country: string;
  company: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface PingResult {
  avg: number;
  min: number;
  max: number;
  packetLoss: number;
  status: 'not-pinged' | 'success' | 'fail';
  distance?: number;
}

export const datacenters: DataCenter[] = [
  {
    id: 'ntp0-au',
    provider: 'ntp0.cs.mu.OZ.AU',
    location: 'Melbourne, Australia',
    coordinates: [-37.8027, 144.9582],
    host: 'ntp0.cs.mu.OZ.AU',
  },
  {
    id: 'ntp1-au',
    provider: 'ntp1.cs.mu.OZ.AU',
    location: 'Melbourne, Australia',
    coordinates: [-37.8027, 144.9582],
    host: 'ntp1.cs.mu.OZ.AU',
  },
  {
    id: 'ntps1-br',
    provider: 'ntps1.pads.ufrj.br',
    location: 'Rio de Janeiro, Brazil',
    coordinates: [-22.8617, -43.2284],
    host: 'ntps1.pads.ufrj.br',
  },
  {
    id: 'ntp-regina-ca',
    provider: 'clock.uregina.ca',
    location: 'Regina, Saskatchewan, Canada',
    coordinates: [50.4167, -104.5833],
    host: 'clock.uregina.ca',
  },
  {
    id: 'ntp-calgary-ca',
    provider: 'subitaneous.cpsc.ucalgary.ca',
    location: 'Calgary, Alberta, Canada',
    coordinates: [51.0801, -114.1281],
    host: 'subitaneous.cpsc.ucalgary.ca',
  },
  {
    id: 'ntp-santiago-cl',
    provider: 'ntp.dgf.uchile.cl',
    location: 'Santiago, Chile',
    coordinates: [-33.4532, -70.6617],
    host: 'ntp.dgf.uchile.cl',
  },
  {
    id: 'ntp-valparaiso-cl',
    provider: 'ntp.shoa.cl',
    location: 'Valparaíso, Chile',
    coordinates: [-33.0283, -71.6352],
    host: 'ntp.shoa.cl',
  },
  {
    id: 'ntp-prague-cz',
    provider: 'ntp.cesnet.cz',
    location: 'Prague, Czech Republic',
    coordinates: [50.1018, 14.3915],
    host: 'ntp.cesnet.cz',
  },
  {
    id: 'ntp0-erlangen-de',
    provider: 'ntp0.fau.de',
    location: 'Erlangen, Germany',
    coordinates: [49.5730, 11.0280],
    host: 'ntp0.fau.de',
  },
  {
    id: 'ntp1-erlangen-de',
    provider: 'ntp1.fau.de',
    location: 'Erlangen, Germany',
    coordinates: [49.5730, 11.0280],
    host: 'ntp1.fau.de',
  },
  {
    id: 'ntp2-erlangen-de',
    provider: 'ntp2.fau.de',
    location: 'Erlangen, Germany',
    coordinates: [49.5730, 11.0280],
    host: 'ntp2.fau.de',
  },
  {
    id: 'ntp3-erlangen-de',
    provider: 'ntp3.fau.de',
    location: 'Erlangen, Germany',
    coordinates: [49.5730, 11.0280],
    host: 'ntp3.fau.de',
  },
  {
    id: 'ntps1-0-berlin-de',
    provider: 'ntps1-0.cs.tu-berlin.de',
    location: 'Berlin, Germany',
    coordinates: [52.5180, 13.3260],
    host: 'ntps1-0.cs.tu-berlin.de',
  },
  {
    id: 'ntps1-1-berlin-de',
    provider: 'ntps1-1.cs.tu-berlin.de',
    location: 'Berlin, Germany',
    coordinates: [52.5180, 13.3260],
    host: 'ntps1-1.cs.tu-berlin.de',
  },
  {
    id: 'ntp-stuttgart-de',
    provider: 'rustime01.rus.uni-stuttgart.de',
    location: 'Stuttgart, Germany',
    coordinates: [48.7833, 9.1667],
    host: 'rustime01.rus.uni-stuttgart.de',
  },
  {
    id: 'ntp-fukuoka-jp',
    provider: 'clock.nc.fukuoka-u.ac.jp',
    location: 'Fukuoka, Japan',
    coordinates: [33.5478, 130.3635],
    host: 'clock.nc.fukuoka-u.ac.jp',
  },
  {
    id: 'ntp-queretaro-mx',
    provider: 'cronos.cenam.mx',
    location: 'Querétaro, Mexico',
    coordinates: [20.5360, -100.2717],
    host: 'cronos.cenam.mx',
  },
  {
    id: 'ntp-ljubljana-si',
    provider: 'goodtime.ijs.si',
    location: 'Ljubljana, Slovenia',
    coordinates: [46.0420, 14.4874],
    host: 'goodtime.ijs.si',
  },
];
