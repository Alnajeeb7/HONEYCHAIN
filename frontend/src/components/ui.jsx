import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Camera, CheckCircle2, XCircle, Loader2, Copy, Search, AlertTriangle,
  ShieldCheck, Fingerprint, Boxes, ExternalLink, Hash,
} from 'lucide-react';
import { api, STAGE_ORDER, STATUS_LABEL, statusIndex } from '../api';

// ---------------------------------------------------------------------------
// HoneyChain shared UI kit — one consistent design language across all modules.
// Premium, minimal, responsive. Amber = honey/brand; slate = surfaces.
// ---------------------------------------------------------------------------

export function Card({ title, icon: Icon, actions, className = '', children }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-[15px]">
            {Icon && <Icon className="w-[18px] h-[18px] text-amber-500" />} {title}
          </h3>
          {actions}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, icon: Icon, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5 tracking-tight">
          {Icon && <Icon className="w-7 h-7 text-amber-500" />} {title}
        </h1>
        {subtitle && <p className="text-slate-500 mt-1.5 text-sm sm:text-base max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const STATUS_STYLE = {
  HARVESTED: 'bg-amber-50 text-amber-700 ring-amber-200',
  COLLECTED: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  LAB_PASSED: 'bg-green-50 text-green-700 ring-green-200',
  LAB_FAILED: 'bg-red-50 text-red-700 ring-red-200',
  PACKAGED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  EXPORTED: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  BLOCKED: 'bg-red-50 text-red-700 ring-red-200',
};
export function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] || 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function TestResultBadge({ result }) {
  const pass = result === 'PASS';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {result}
    </span>
  );
}

export function HashDisplay({ label, value, mono = true, icon: Icon = Hash }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <div className="min-w-0">
        {label && <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>}
        <p className={`text-xs text-slate-700 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button onClick={copy} className="shrink-0 text-slate-400 hover:text-amber-600 transition-colors" title="Copy">
        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-amber-500"> *</span>}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}
export const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition text-sm';

export function ErrorState({ title, detail, onClose }) {
  if (!title) return null;
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-red-800">{title}</p>
        {detail && <p className="text-sm text-red-600 mt-0.5">{detail}</p>}
      </div>
      {onClose && <button onClick={onClose} className="text-red-400 hover:text-red-600"><XCircle className="w-5 h-5" /></button>}
    </div>
  );
}

export function SuccessState({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">Recorded on HoneyChain · Blockchain registration pending integration</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// GPS auto-capture with graceful fallback. Reports {lat,lng} up via onChange.
export function GPSCapture({ value, onChange, label = 'GPS Location' }) {
  const [status, setStatus] = useState('idle');
  const capture = () => {
    if (!('geolocation' in navigator)) { setStatus('error'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }); setStatus('ok'); },
      () => { onChange({ lat: 20.5937, lng: 78.9629 }); setStatus('fallback'); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  useEffect(() => { capture(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
      <div className={`p-2.5 rounded-lg ${value ? 'bg-amber-100 text-amber-600' : 'bg-orange-100 text-orange-600 animate-pulse'}`}>
        <MapPin className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs font-mono text-slate-500 truncate">
          {value ? `${value.lat}, ${value.lng}` : status === 'locating' ? 'Acquiring GPS…' : 'Not captured'}
          {status === 'fallback' && ' (approx)'}
        </p>
      </div>
      <button type="button" onClick={capture} className="text-xs font-semibold text-amber-600 hover:text-amber-700 shrink-0">Recapture</button>
    </div>
  );
}

// Evidence uploader: uploads, shows the server checklist, surfaces duplicate errors.
export function EvidenceUploader({ batchID, stage, role, gps, onUploaded }) {
  const [state, setState] = useState({ status: 'idle' });
  const inputRef = useRef();
  const handle = async (file) => {
    if (!file) return;
    setState({ status: 'uploading', fileName: file.name });
    try {
      const res = await api.uploadEvidence({ file, batchID, stage, role, gps });
      setState({ status: 'done', evidence: res.evidence, fileHash: res.fileHash });
      onUploaded?.(res);
    } catch (e) {
      setState({ status: 'error', title: e.title, detail: e.detail, existingHash: e.payload?.existingEvidenceHash });
    }
  };
  const done = state.status === 'done';
  return (
    <div>
      <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors relative cursor-pointer
        ${done ? 'border-green-300 bg-green-50/50' : state.status === 'error' ? 'border-red-300 bg-red-50/50' : 'border-slate-300 hover:bg-slate-50'}`}>
        <input ref={inputRef} type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handle(e.target.files[0])} />
        {state.status === 'uploading' ? (
          <div className="text-amber-600 flex items-center justify-center gap-2 py-2"><Loader2 className="w-5 h-5 animate-spin" /> Hashing & storing…</div>
        ) : done ? (
          <div className="text-left text-sm space-y-1 py-1">
            <p className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle2 className="w-4 h-4" /> Image uploaded</p>
            <p className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> Hash generated</p>
            <p className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> {gps ? 'Location captured' : 'Stored'}</p>
            <p className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> Ready for ledger registration</p>
          </div>
        ) : (
          <div className="text-slate-500 flex flex-col items-center py-2">
            <Camera className="w-7 h-7 mb-1.5 text-slate-400" />
            <span className="text-sm font-medium">Tap to add photo evidence</span>
            <span className="text-xs mt-0.5">Hashed server-side · duplicate-checked</span>
          </div>
        )}
      </div>
      {done && <div className="mt-2"><HashDisplay label="Evidence Hash" value={state.fileHash} icon={Fingerprint} /></div>}
      {state.status === 'error' && (
        <div className="mt-2"><ErrorState title={state.title} detail={state.detail} onClose={() => setState({ status: 'idle' })} />
          {state.existingHash && <p className="text-xs font-mono text-red-500 mt-1 break-all">Existing: {state.existingHash}</p>}
        </div>
      )}
    </div>
  );
}

// Batch lookup: enter a Batch/Box/Product ID -> fetches the batch and calls
// onFound(batch). Shows meaningful not-found / error states.
export function BatchLookup({ onFound, placeholder = 'Enter Batch / Box ID (e.g. HC-2026-0001)', label = 'Batch Lookup' }) {
  const [id, setId] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const search = async (e) => {
    e?.preventDefault();
    if (!id.trim()) return;
    setState({ status: 'loading' });
    try {
      const batch = await api.batch(id.trim());
      setState({ status: 'ok' });
      onFound?.(batch);
    } catch (err) {
      setState({ status: 'error', title: err.title || 'Batch Not Found', detail: err.detail || 'Enter a valid HoneyChain Batch / Box ID.' });
      onFound?.(null);
    }
  };
  return (
    <form onSubmit={search} className="space-y-3">
      <Field label={label}>
        <div className="flex gap-2">
          <input className={inputCls} value={id} onChange={(e) => setId(e.target.value)} placeholder={placeholder} />
          <button type="submit" disabled={state.status === 'loading'}
            className="shrink-0 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 rounded-xl transition-colors disabled:opacity-60">
            {state.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Look up</span>
          </button>
        </div>
      </Field>
      {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
    </form>
  );
}

// Read-only summary of a batch's upstream data.
export function BatchSummary({ batch }) {
  if (!batch) return null;
  const rows = [
    ['Batch ID', batch.batchID], ['Box / Hive ID', batch.boxID || '—'],
    ['Honey Variety', batch.variety], ['Product ID', batch.productID || '—'],
  ];
  const h = batch.harvest, c = batch.collection, l = batch.lab;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-500" /> Batch Identity</p>
        <StatusBadge status={batch.status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{k}</dt>
            <dd className="text-sm text-slate-800 font-medium truncate">{v}</dd></div>
        ))}
      </dl>
      {h && (
        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Info k="Harvested" v={`${h.quantity}${h.unit} · ${h.harvestMethod}`} />
          <Info k="Origin GPS" v={h.gps ? `${h.gps.lat}, ${h.gps.lng}` : '—'} mono />
          <Info k="Harvest Date" v={h.harvestedAt ? new Date(h.harvestedAt).toLocaleDateString() : '—'} />
          <Info k="Moisture" v={h.moisture != null ? `${h.moisture}%` : '—'} />
        </div>
      )}
      {c && (
        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Info k="Collector" v={c.collectorID} />
          <Info k="Received" v={`${c.quantityReceived ?? '—'} · ${c.packageCondition || ''}`} />
        </div>
      )}
      {l && (
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <Info k="Lab Result" v={l.labID} />
          <TestResultBadge result={l.overall} />
        </div>
      )}
    </div>
  );
}
function Info({ k, v, mono }) {
  return <div><dt className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{k}</dt>
    <dd className={`text-sm text-slate-800 font-medium truncate ${mono ? 'font-mono' : ''}`}>{v}</dd></div>;
}

// Horizontal (desktop) / vertical (mobile) workflow progress.
export function WorkflowProgress({ status }) {
  const failed = status === 'LAB_FAILED';
  const cur = statusIndex(status);
  const labels = { HARVESTED: 'Harvested', COLLECTED: 'Collected', LAB_PASSED: failed ? 'Lab Failed' : 'Lab Tested', PACKAGED: 'Packed', EXPORTED: 'Exported' };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
      {STAGE_ORDER.map((s, i) => {
        const done = i <= cur;
        const isFailStep = failed && s === 'LAB_PASSED';
        return (
          <React.Fragment key={s}>
            <div className="flex sm:flex-col items-center gap-2 sm:gap-1.5 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4
                ${isFailStep ? 'bg-red-500 text-white ring-red-100'
                  : done ? 'bg-amber-500 text-white ring-amber-100' : 'bg-white text-slate-400 ring-slate-100 border border-slate-300'}`}>
                {isFailStep ? <XCircle className="w-4 h-4" /> : done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium ${isFailStep ? 'text-red-600' : done ? 'text-amber-700' : 'text-slate-400'}`}>{labels[s]}</span>
            </div>
            {i < STAGE_ORDER.length - 1 && <div className={`hidden sm:block flex-1 h-0.5 mb-5 mx-1 rounded ${i < cur && !failed ? 'bg-amber-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Lab test results table (cards on mobile).
export function LabTestTable({ results }) {
  if (!results?.length) return null;
  return (
    <div>
      <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr><th className="text-left px-4 py-2.5 font-semibold">Parameter</th><th className="text-left px-4 py-2.5 font-semibold">Value</th>
              <th className="text-left px-4 py-2.5 font-semibold">Reference</th><th className="text-right px-4 py-2.5 font-semibold">Result</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.key} className={r.result === 'FAIL' ? 'bg-red-50/40' : ''}>
                <td className="px-4 py-2.5 font-medium text-slate-700">{r.label}{r.critical && <span className="text-amber-500" title="Critical parameter"> ●</span>}</td>
                <td className="px-4 py-2.5 text-slate-800 font-mono">{r.value}{r.unit}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.refRange}{r.unit}</td>
                <td className="px-4 py-2.5 text-right"><TestResultBadge result={r.result} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-2">
        {results.map((r) => (
          <div key={r.key} className={`rounded-xl border p-3 ${r.result === 'FAIL' ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-700 text-sm">{r.label}</span><TestResultBadge result={r.result} /></div>
            <div className="text-xs text-slate-500 mt-1 font-mono">{r.value}{r.unit} · limit {r.refRange}{r.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Evidence card with SHA-256 / IPFS + view action.
export function EvidenceCard({ evidence, index }) {
  if (!evidence) return null;
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-slate-700">Evidence {index != null ? `#${String(index + 1).padStart(2, '0')}` : ''}</span>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-400">{evidence.stage}</span>
      </div>
      <div className="space-y-1.5">
        <HashDisplay label="SHA-256" value={evidence.fileHash} icon={Fingerprint} />
        <HashDisplay label="IPFS CID" value={evidence.ipfsCid || evidence.storageRef || 'Pending Integration'} />
      </div>
      {evidence.ipfsGatewayUrl && !String(evidence.ipfsCid || evidence.storageRef || '').startsWith('demo-') ? (
        <a href={evidence.ipfsGatewayUrl} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700">
          <ExternalLink className="w-3.5 h-3.5" /> View Evidence on IPFS
        </a>
      ) : (
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Evidence stored (demo CID — live IPFS gateway when configured)</div>
      )}
    </div>
  );
}

// Consumer/audit blockchain integrity panel — network, contract, tx + explorer.
export function BlockchainVerificationPanel({ blockchain, recordHash }) {
  if (!blockchain) return null;
  const live = blockchain.mode === 'live';
  const tx = blockchain.txHash;
  return (
    <div className={`rounded-2xl border p-5 ${live ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className={`w-5 h-5 ${live ? 'text-indigo-600' : 'text-slate-400'}`} />
        <h3 className="font-bold text-slate-800">Blockchain Integrity</h3>
        <span className={`ml-auto text-[11px] uppercase tracking-wide font-semibold ${live ? 'text-indigo-600' : 'text-slate-400'}`}>
          {live ? 'On-chain' : 'Demo mode'}
        </span>
      </div>
      <div className="space-y-1.5">
        {blockchain.network && <HashDisplay label="Network" value={`${blockchain.network}${blockchain.chainId ? ` (chain ${blockchain.chainId})` : ''}`} />}
        {blockchain.contractAddress && <HashDisplay label="Contract" value={blockchain.contractAddress} />}
        {recordHash && <HashDisplay label="Record Hash" value={recordHash} />}
        {tx && <HashDisplay label="Tx Hash" value={tx} />}
        {blockchain.blockNumber != null && <HashDisplay label="Block #" value={String(blockchain.blockNumber)} />}
      </div>
      {tx && blockchain.explorerUrl ? (
        <a href={blockchain.explorerUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <ExternalLink className="w-4 h-4" /> View on Block Explorer
        </a>
      ) : (
        <p className="mt-3 text-xs text-slate-500">This record is anchored locally. A live transaction link appears here once the blockchain layer is enabled and the transaction is confirmed.</p>
      )}
    </div>
  );
}


// Blockchain integrity panel for a single event.
export function BlockchainInfo({ event }) {
  if (!event) return null;
  const status = event.status || (event.blockchainTxHash ? 'CONFIRMED' : 'PENDING_CHAIN');
  const confirmed = status === 'CONFIRMED' && !!event.blockchainTxHash;
  const failed = status === 'FAILED';
  const demo = status === 'DEMO';
  const explorerUrl = event.explorerUrl || null;

  const badge = confirmed
    ? { cls: 'text-green-600', dot: 'text-green-500', label: `Confirmed · ${event.blockchainTxHash.slice(0, 14)}…` }
    : failed
      ? { cls: 'text-red-600', dot: 'text-red-500', label: 'Transaction failed — retry available' }
      : demo
        ? { cls: 'text-slate-500', dot: 'text-slate-400', label: 'Demo mode (no live chain)' }
        : { cls: 'text-amber-600', dot: 'text-amber-500', label: 'Pending confirmation…' };

  return (
    <div className="space-y-1.5">
      <HashDisplay label="Record Hash" value={event.recordHash} />
      {event.evidenceHash && <HashDisplay label="Evidence Hash" value={event.evidenceHash} icon={Fingerprint} />}
      <HashDisplay label="IPFS CID" value={event.ipfsCid || 'Pending Integration'} />
      {event.blockchainNetwork && <HashDisplay label="Network" value={event.blockchainNetwork} />}
      {event.contractAddress && <HashDisplay label="Contract" value={event.contractAddress} />}
      {event.blockNumber != null && <HashDisplay label="Block #" value={String(event.blockNumber)} />}
      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
        <ShieldCheck className={`w-4 h-4 ${badge.dot}`} />
        <span className="text-slate-500">Blockchain:</span>
        <span className={`font-semibold ${badge.cls}`}>{badge.label}</span>
      </div>
      {confirmed && explorerUrl && (
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700">
          <ExternalLink className="w-3.5 h-3.5" /> View on Block Explorer
        </a>
      )}
    </div>
  );
}


