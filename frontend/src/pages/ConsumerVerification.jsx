import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, MapPin, ScanLine, Search, X,
} from 'lucide-react';
import { api } from '../api';
import {
  Card, Field, inputCls, StatusBadge, TestResultBadge, LabTestTable,
  EvidenceCard, HashDisplay, ErrorState, WorkflowProgress, BlockchainVerificationPanel,
} from '../components/ui';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ConsumerVerification() {
  const { id: routeId } = useParams();
  const [id, setId] = useState(routeId || '');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [data, setData] = useState(null);
  const [state, setState] = useState({ status: 'idle' });
  const scannerRef = useRef(null);

  const load = async (lookupId) => {
    if (!lookupId) return;
    setState({ status: 'loading' });
    try {
      const v = await api.verification(lookupId);
      setData(v); setScanned(true); setState({ status: 'ok' });
    } catch (err) {
      setState({ status: 'error', title: err.title || 'Product Not Found', detail: err.detail || 'No product or batch matches this ID.' });
    }
  };

  // Pull a Product/Batch ID out of scanned QR text.
  // Handles: "HoneyChain-HC-PROD-2026-0001", a full URL like ".../verify/HC-PROD-2026-0001", or a raw ID.
  const extractId = (text) => {
    if (!text) return '';
    let t = String(text).trim();
    const hc = t.match(/HoneyChain-(.+)$/i);
    if (hc) return hc[1].trim();
    const url = t.match(/\/verify\/([^/?#]+)/i);
    if (url) return decodeURIComponent(url[1]).trim();
    try { const u = new URL(t); const seg = u.pathname.split('/').filter(Boolean).pop(); if (seg) return seg; } catch { /* not a URL */ }
    return t;
  };

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) { try { await s.stop(); } catch { /* already stopped */ } try { await s.clear(); } catch {} }
  };

  const startScan = async () => {
    setScanError('');
    setScanning(true);
  };

  // Boot the camera once the reader element is mounted.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    const el = document.getElementById('qr-reader');
    if (!el) return;
    const scanner = new Html5Qrcode('qr-reader', { verbose: false });
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        if (cancelled) return;
        const found = extractId(decodedText);
        await stopScanner();
        if (cancelled) return;
        setScanning(false);
        setId(found);
        load(found);
      },
      () => { /* per-frame decode misses — ignore */ }
    ).catch((err) => {
      if (cancelled) return;
      setScanError(err?.message?.includes('NotAllowed') || err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access, or enter the ID below.'
        : 'Could not start the camera. Use a device with a camera, or enter the ID below.');
      setScanning(false);
    });
    return () => { cancelled = true; stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => () => { stopScanner(); }, []);

  useEffect(() => { if (routeId) load(routeId); /* eslint-disable-next-line */ }, [routeId]);

  // --- Scan / entry gate ---
  if (!scanned || !data) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 text-amber-600 font-semibold text-xs uppercase tracking-widest mb-6">
            <ShieldCheck className="w-4 h-4" /> HoneyChain Verify
          </div>
          <div className="relative mx-auto w-52 h-52 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            {scanning ? (
              <div id="qr-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <span className="absolute left-4 top-4 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <span className="absolute right-4 top-4 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <span className="absolute left-4 bottom-4 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <span className="absolute right-4 bottom-4 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                <ScanLine className="w-16 h-16 text-amber-500" strokeWidth={1.5} />
              </div>
            )}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-6">Verify your honey</h1>
          <p className="text-slate-500 text-sm mt-2">Scan the QR printed on your jar, or enter the Product / Batch ID to reveal the full tamper-proof farm-to-jar record.</p>
          {scanning ? (
            <button onClick={async () => { await stopScanner(); setScanning(false); }}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors">
              <X className="w-4 h-4" /> Stop camera
            </button>
          ) : (
            <button onClick={startScan}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors">
              <ScanLine className="w-4 h-4" /> Scan to verify
            </button>
          )}
          {scanError && <p className="mt-3 text-xs text-red-600">{scanError}</p>}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <Field label="Or enter Product / Batch ID">
              <div className="flex gap-2">
                <input className={inputCls} value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. HC-PROD-2026-0001" onKeyDown={(e) => e.key === 'Enter' && load(id)} />
                <button onClick={() => load(id)} disabled={state.status === 'loading'}
                  className="shrink-0 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 rounded-xl disabled:opacity-60">
                  {state.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            {state.status === 'error' && <div className="mt-3"><ErrorState title={state.title} detail={state.detail} /></div>}
          </div>
        </div>
      </div>
    );
  }

  const { verified, labFailed, product, origin, lab, summary, timeline, evidence, events, integrity, blockchain } = data;
  const gps = origin?.gps;
  const trustItems = [
    ['Origin verified', summary.originVerified], ['Collector logged', summary.collectorVerified],
    ['Lab tested', summary.labTested], ['Quality passed', summary.qualityPassed],
    ['Processed & packed', summary.processed], ['Export verified', summary.exportVerified],
    ['Evidence on file', summary.evidenceAvailable], ['Chain integrity', summary.integrityOk],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Trust banner */}
      <div className={`rounded-2xl border p-6 ${verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${verified ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {verified ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>
          <div>
            <h1 className={`text-2xl font-extrabold ${verified ? 'text-green-800' : 'text-red-800'}`}>
              {verified ? 'Verified Authentic' : labFailed ? 'Failed Quality Verification' : 'Verification Warning'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {verified ? 'This product passed every stage of the HoneyChain traceability process.'
                : labFailed ? 'This batch did not pass laboratory testing and should not be on sale.'
                : 'Some verification checks did not pass. Review the details below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Product identity */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{product.productName}</h2>
            <p className="text-slate-500 text-sm mt-1">Variety: {product.variety}</p>
            <div className="mt-3 space-y-1.5 w-full sm:w-72">
              <HashDisplay label="Product ID" value={product.productID || '—'} mono />
              <HashDisplay label="Batch ID" value={product.batchID} mono />
              <HashDisplay label="Box / Hive ID" value={product.boxID || '—'} mono />
            </div>
          </div>
          <div className="text-center">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=HoneyChain-${product.productID || product.batchID}`} alt="QR" className="rounded-lg" />
            <div className="mt-2"><StatusBadge status={product.status} /></div>
          </div>
        </div>
      </Card>

      {/* Trust summary */}
      <Card title="Trust Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trustItems.map(([label, ok]) => (
            <div key={label} className={`rounded-xl border p-3 flex items-center gap-2 ${ok ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'}`}>
              {ok ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={`text-xs font-medium ${ok ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Progress */}
      <Card title="Farm-to-Jar Journey">
        <WorkflowProgress status={product.status} />
      </Card>

      {/* Map */}
      {gps && (
        <Card title="Origin Location" icon={MapPin}>
          <div className="h-[280px] w-full rounded-xl overflow-hidden">
            <MapContainer center={[gps.lat, gps.lng]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[gps.lat, gps.lng]}><Popup>🍯 {product.variety} — Harvest Origin</Popup></Marker>
            </MapContainer>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono">{origin.locationName || 'Origin'} · {gps.lat}, {gps.lng}</p>
        </Card>
      )}

      {/* Lab results */}
      {lab?.results && (
        <Card title="Laboratory Results" icon={ShieldCheck} actions={<TestResultBadge result={lab.overall} />}>
          <LabTestTable results={lab.results} />
        </Card>
      )}

      {/* Timeline */}
      <Card title="Chain of Custody">
        <ol className="space-y-4">
          {timeline.map((s) => (
            <li key={s.step} className="relative pl-9">
              <span className={`absolute left-0 top-0.5 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${s.status === 'LAB_FAILED' ? 'bg-red-500' : 'bg-amber-500'}`}>{s.step}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">{s.role}</span>
                <StatusBadge status={s.status} />
                {s.testResult && <TestResultBadge result={s.testResult} />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {s.actor || '—'} · {s.location || 'no location'} {s.timestamp ? `· ${new Date(s.timestamp).toLocaleDateString()}` : ''}
              </p>
              {s.recordHash && <div className="mt-2"><HashDisplay label="Record Hash" value={s.recordHash} /></div>}
            </li>
          ))}
        </ol>
      </Card>

      {/* Evidence */}
      {evidence?.length > 0 && (
        <Card title="Evidence">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {evidence.map((e, i) => <EvidenceCard key={e.id || i} evidence={e} index={i} />)}
          </div>
        </Card>
      )}

      {/* Blockchain integrity */}
      <BlockchainVerificationPanel blockchain={blockchain} recordHash={timeline?.[0]?.recordHash} />

      {/* Integrity */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${integrity.ok ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
        {integrity.ok ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
        <p className="text-sm text-slate-600">
          {integrity.ok ? 'Cryptographic hash chain verified — this record has not been tampered with.' : `Integrity check failed: ${integrity.issues?.join(' ')}`}
        </p>
      </div>
    </div>
  );
}
