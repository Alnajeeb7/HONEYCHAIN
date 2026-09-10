import { Hexagon, Bug, FlaskConical, Factory, Ship, Landmark, ShieldCheck, Globe2 } from 'lucide-react';

// 8 HoneyChain personas mapped to routes + pages.
export const ROLES = [
  { key: 'beekeeper',      path: '/beekeeper',    label: 'Beekeeper',           icon: Hexagon,       color: 'amber',
    tagline: 'Record hive harvests with GPS proof', reason: 'Log honey batches from KVIC-registered bee boxes.' },
  { key: 'wild_collector', path: '/wild',          label: 'Wild Honey Collector', icon: Bug,          color: 'yellow',
    tagline: 'Log legitimate forest honey collection', reason: 'Register wild honey inside approved forest zones.' },
  { key: 'lab',            path: '/lab',           label: 'Testing Lab',          icon: FlaskConical, color: 'sky',
    tagline: 'Attach purity & adulteration test results', reason: 'HMF, moisture, adulterant & floral DNA results.' },
  { key: 'processor',      path: '/processor',     label: 'Processor / Packer',   icon: Factory,      color: 'indigo',
    tagline: 'Know exactly which hive each jar came from', reason: 'Process, filter and pack honey batches.' },
  { key: 'exporter',       path: '/exporter',      label: 'Exporter',             icon: Ship,         color: 'cyan',
    tagline: 'Provide provenance & compliance evidence', reason: 'Issue export certificates for compliant honey.' },
  { key: 'government',     path: '/government',    label: 'KVIC / FSSAI Audit',   icon: Landmark,     color: 'orange',
    tagline: 'Regulation, auditing & authenticity', reason: 'Audit every batch with live integrity checks.' },
  { key: 'environment',    path: '/environment',   label: 'Environment Monitor',  icon: Globe2,       color: 'teal',
    tagline: 'Monitor over-harvesting & hive health', reason: 'Track geo-fence violations & colony collapse alerts.' },
  { key: 'consumer',       path: '/verify', label: 'Consumer QR Verify', icon: ShieldCheck, color: 'violet',
    tagline: 'Scan QR to verify authenticity', reason: 'See your honey\'s full farm-to-jar journey.' },
];

export const COLOR = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200',  dot: 'bg-amber-500' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', dot: 'bg-yellow-500' },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-700',    ring: 'ring-sky-200',    dot: 'bg-sky-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   ring: 'ring-cyan-200',   dot: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-200',   dot: 'bg-teal-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', dot: 'bg-violet-500' },
};
