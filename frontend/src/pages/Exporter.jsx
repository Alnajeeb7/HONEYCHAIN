import React, { useState } from 'react';
import { Ship, ArrowRight, ShieldCheck, FileCheck2 } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture, EvidenceUploader,
  BatchLookup, BatchSummary, ErrorState, SuccessState, HashDisplay, BlockchainInfo, WorkflowProgress,
} from '../components/ui';

export default function Exporter() {
  const [batch, setBatch] = useState(null);
  const [gps, setGps] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [form, setForm] = useState({ exporterID: '', destinationCountry: '', quantityExported: '', docsComplete: false, notes: '' });
  const [state, setState] = useState({ status: 'idle' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const failed = batch && batch.status === 'LAB_FAILED';
  const blocked = batch && batch.status !== 'PACKAGED';

  const submit = async (e) => {
    e.preventDefault();
    if (!batch) return;
    if (!form.docsComplete) { setState({ status: 'error', title: 'Documentation Incomplete', detail: 'Confirm all compliance documents are complete before issuing the certificate.' }); return; }
    if (!gps) { setState({ status: 'error', title: 'Location Required', detail: 'Capture the export point GPS location before submitting.' }); return; }
    setState({ status: 'submitting' });
    try {
      const res = await api.export(batch.batchID, {
        ...form, timestamp: new Date().toISOString(), gps,
        evidenceHash: evidence?.fileHash || null, evidenceId: evidence?.evidence?.id || null,
      });
      setState({ status: 'done', result: res });
    } catch (err) { setState({ status: 'error', title: err.title, detail: err.detail }); }
  };

  if (state.status === 'done') {
    const r = state.result;
    const c = r.certificate;
    return (
      <div className="max-w-2xl mx-auto">
        <SuccessState title="Export Approved">
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
              <p className="flex items-center gap-2 font-semibold text-cyan-800"><FileCheck2 className="w-4 h-4" /> Export Compliance Certificate</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                <div><dt className="text-slate-400 text-xs uppercase">Batch</dt><dd className="font-mono">{c.batchID}</dd></div>
                <div><dt className="text-slate-400 text-xs uppercase">Product</dt><dd>{c.product}</dd></div>
                <div><dt className="text-slate-400 text-xs uppercase">Product ID</dt><dd className="font-mono">{c.productID || '—'}</dd></div>
                <div><dt className="text-slate-400 text-xs uppercase">Destination</dt><dd>{c.destination || '—'}</dd></div>
              </dl>
              <p className="text-xs text-cyan-700 mt-3 flex items-start gap-1.5"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />{c.statement}</p>
            </div>
            <BlockchainInfo event={r.event} />
          </div>
        </SuccessState>
        <button onClick={() => { setBatch(null); setEvidence(null); setState({ status: 'idle' }); }}
          className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">Process another export →</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Stage 5 · Export Compliance" title="Export Verification & Certification" icon={Ship}
        subtitle="Only packaged batches that pass origin, quality, packaging and integrity checks can be exported. Failed or tampered batches are blocked automatically." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Find Batch" icon={Ship}>
          <BatchLookup onFound={(b) => { setBatch(b); setState({ status: 'idle' }); }} />
          {batch && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <WorkflowProgress status={batch.status} />
              <BatchSummary batch={batch} />
              {failed && <ErrorState title="EXPORT BLOCKED" detail="Reason: Laboratory verification failed." />}
              {blocked && !failed && <ErrorState title="EXPORT BLOCKED" detail={`Reason: batch is at "${batch.status}". Lab PASS + processing + packaging must be complete.`} />}
            </div>
          )}
        </Card>

        <Card title="Export Compliance" icon={Ship}>
          {!batch ? (
            <p className="text-sm text-slate-400 py-8 text-center">Look up a batch to begin.</p>
          ) : blocked ? (
            <p className="text-sm text-slate-400 py-8 text-center">This batch is not eligible for export.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <GPSCapture value={gps} onChange={setGps} label="Export Point GPS" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Exporter ID" required><input className={inputCls} value={form.exporterID} onChange={set('exporterID')} placeholder="e.g. EXP-KVIC-07" required /></Field>
                <Field label="Destination Country" required><input className={inputCls} value={form.destinationCountry} onChange={set('destinationCountry')} placeholder="e.g. Germany" required /></Field>
                <Field label="Quantity Exported (kg)"><input type="number" step="0.1" className={inputCls} value={form.quantityExported} onChange={set('quantityExported')} /></Field>
              </div>
              <label className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 cursor-pointer">
                <input type="checkbox" checked={form.docsComplete} onChange={(e) => setForm((f) => ({ ...f, docsComplete: e.target.checked }))} className="w-4 h-4 accent-cyan-600" />
                <span className="text-sm text-slate-700">All FSSAI / customs / phytosanitary documents complete</span>
              </label>
              <Field label="Notes"><textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} /></Field>
              <Field label="Evidence"><EvidenceUploader batchID={batch.batchID} stage="export" role="exporter" gps={gps} onUploaded={setEvidence} /></Field>
              {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
              <button type="submit" disabled={state.status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                {state.status === 'submitting' ? 'Verifying…' : <>Verify & Issue Certificate <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
