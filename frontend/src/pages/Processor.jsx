import React, { useState } from 'react';
import { Factory, ArrowRight, QrCode } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture, EvidenceUploader,
  BatchLookup, BatchSummary, ErrorState, SuccessState, HashDisplay, BlockchainInfo, WorkflowProgress,
} from '../components/ui';

export default function Processor() {
  const [batch, setBatch] = useState(null);
  const [gps, setGps] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [form, setForm] = useState({
    processorID: '', facility: '', quantityReceived: '', quantityProcessed: '',
    packagingType: 'Glass Jar', packagingSize: '500g', units: '', expiry: '', label: '', notes: '',
  });
  const [state, setState] = useState({ status: 'idle' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const blocked = batch && batch.status !== 'LAB_PASSED';
  const failed = batch && batch.status === 'LAB_FAILED';

  const submit = async (e) => {
    e.preventDefault();
    if (!batch) return;
    if (!gps) { setState({ status: 'error', title: 'Location Required', detail: 'Capture the facility GPS location before submitting.' }); return; }
    setState({ status: 'submitting' });
    try {
      const res = await api.processing(batch.batchID, {
        ...form, timestamp: new Date().toISOString(), gps,
        evidenceHash: evidence?.fileHash || null, evidenceId: evidence?.evidence?.id || null,
      });
      setState({ status: 'done', result: res });
    } catch (err) { setState({ status: 'error', title: err.title, detail: err.detail }); }
  };

  if (state.status === 'done') {
    const r = state.result;
    return (
      <div className="max-w-2xl mx-auto">
        <SuccessState title="Processing & Packaging Recorded">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Batch <span className="font-mono font-semibold">{r.batch.batchID}</span> packaged. A consumer product ID and QR were generated.</p>
            <HashDisplay label="Product ID" value={r.productID} icon={QrCode} />
            <HashDisplay label="Consumer QR" value={r.qrData} icon={QrCode} />
            <HashDisplay label="Verification URL" value={r.consumerUrl} />
            <BlockchainInfo event={r.event} />
          </div>
        </SuccessState>
        <button onClick={() => { setBatch(null); setEvidence(null); setState({ status: 'idle' }); }}
          className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">Process another batch →</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Stage 4 · Processor / Packer" title="Processing & Packaging" icon={Factory}
        subtitle="Look up a lab-passed batch to process and package it. Failed or unfinished batches are blocked. Packaging generates the consumer product ID and QR." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Find Batch" icon={Factory}>
          <BatchLookup onFound={(b) => { setBatch(b); setState({ status: 'idle' }); }} />
          {batch && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <WorkflowProgress status={batch.status} />
              <BatchSummary batch={batch} />
              {failed && <ErrorState title="Quality Verification Failed" detail="This batch failed laboratory testing and cannot proceed to processing." />}
              {blocked && !failed && <ErrorState title="Action Blocked" detail={`Batch is at "${batch.status}". A laboratory PASS is required before processing.`} />}
            </div>
          )}
        </Card>

        <Card title="Processing Details" icon={Factory}>
          {!batch ? (
            <p className="text-sm text-slate-400 py-8 text-center">Look up a batch to begin.</p>
          ) : blocked ? (
            <p className="text-sm text-slate-400 py-8 text-center">This batch is not eligible for processing.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <GPSCapture value={gps} onChange={setGps} label="Facility GPS" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Processor ID" required><input className={inputCls} value={form.processorID} onChange={set('processorID')} placeholder="e.g. PRC-KVIC-22" required /></Field>
                <Field label="Facility"><input className={inputCls} value={form.facility} onChange={set('facility')} placeholder="e.g. KVIC Unit, Pune" /></Field>
                <Field label="Qty Received (kg)"><input type="number" step="0.1" className={inputCls} value={form.quantityReceived} onChange={set('quantityReceived')} /></Field>
                <Field label="Qty Processed (kg)"><input type="number" step="0.1" className={inputCls} value={form.quantityProcessed} onChange={set('quantityProcessed')} /></Field>
                <Field label="Packaging Type">
                  <select className={inputCls} value={form.packagingType} onChange={set('packagingType')}>
                    <option>Glass Jar</option><option>PET Bottle</option><option>Squeeze Bottle</option><option>Bulk Drum</option>
                  </select>
                </Field>
                <Field label="Package Size">
                  <select className={inputCls} value={form.packagingSize} onChange={set('packagingSize')}>
                    <option>250g</option><option>500g</option><option>1kg</option><option>5kg</option>
                  </select>
                </Field>
                <Field label="Units Produced"><input type="number" className={inputCls} value={form.units} onChange={set('units')} /></Field>
                <Field label="Best Before"><input type="date" className={inputCls} value={form.expiry} onChange={set('expiry')} /></Field>
              </div>
              <Field label="Product Label / Brand"><input className={inputCls} value={form.label} onChange={set('label')} placeholder="e.g. KVIC Pure Multifloral Honey" /></Field>
              <Field label="Evidence"><EvidenceUploader batchID={batch.batchID} stage="processing" role="processor" gps={gps} onUploaded={setEvidence} /></Field>
              {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
              <button type="submit" disabled={state.status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                {state.status === 'submitting' ? 'Recording…' : <>Record & Generate QR <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
