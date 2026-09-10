import React, { useState } from 'react';
import { Bug, PackageCheck, ArrowRight } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture, EvidenceUploader,
  BatchLookup, BatchSummary, ErrorState, SuccessState, HashDisplay, BlockchainInfo,
} from '../components/ui';

const ROLE = 'wild_collector';
const STAGE = 'collection';

export default function Collector() {
  const [batch, setBatch] = useState(null);
  const [gps, setGps] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [form, setForm] = useState({ collectorID: '', quantityReceived: '', packageCondition: 'Good', notes: '' });
  const [state, setState] = useState({ status: 'idle' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const alreadyCollected = batch && batch.status !== 'HARVESTED';

  const submit = async (e) => {
    e.preventDefault();
    if (!batch) return;
    if (!gps) { setState({ status: 'error', title: 'Location Required', detail: 'Capture your GPS location before submitting.' }); return; }
    setState({ status: 'submitting' });
    try {
      const res = await api.collection(batch.batchID, {
        collectorID: form.collectorID,
        quantityReceived: form.quantityReceived,
        packageCondition: form.packageCondition,
        notes: form.notes,
        gps,
        evidenceHash: evidence?.fileHash || null,
        evidenceId: evidence?.evidence?.id || null,
      });
      setState({ status: 'done', result: res });
    } catch (err) {
      setState({ status: 'error', title: err.title, detail: err.detail });
    }
  };

  if (state.status === 'done') {
    const r = state.result;
    return (
      <div className="max-w-2xl mx-auto">
        <SuccessState title="Collection Recorded">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Batch <span className="font-mono font-semibold">{r.batch.batchID}</span> received and advanced to <span className="font-semibold">Collected</span>.</p>
            <BlockchainInfo event={r.event} />
          </div>
        </SuccessState>
        <button onClick={() => { setBatch(null); setEvidence(null); setState({ status: 'idle' }); setForm({ collectorID: '', quantityReceived: '', packageCondition: 'Good', notes: '' }); }}
          className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">Record another collection →</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Stage 2 · Wild Honey Collector" title="Collection Receipt" icon={Bug}
        subtitle="Enter a Batch / Box ID to pull the beekeeper's upstream harvest record, then log your receipt with GPS and photo evidence." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Find Batch" icon={Bug}>
          <BatchLookup onFound={(b) => { setBatch(b); setState({ status: 'idle' }); }} />
          {batch && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <BatchSummary batch={batch} />
              {alreadyCollected && (
                <div className="mt-4"><ErrorState title="Action Blocked"
                  detail="This batch has already been received by a Wild Honey Collector." /></div>
              )}
            </div>
          )}
        </Card>

        <Card title="Record Receipt" icon={PackageCheck}>
          {!batch ? (
            <p className="text-sm text-slate-400 py-8 text-center">Look up a batch to begin recording your collection.</p>
          ) : alreadyCollected ? (
            <p className="text-sm text-slate-400 py-8 text-center">This batch is not available for collection.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <GPSCapture value={gps} onChange={setGps} label="Collection Point GPS" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Collector ID" required>
                  <input className={inputCls} value={form.collectorID} onChange={set('collectorID')} placeholder="e.g. WHC-KL-014" required />
                </Field>
                <Field label="Quantity Received">
                  <input className={inputCls} value={form.quantityReceived} onChange={set('quantityReceived')} placeholder="e.g. 24 kg" />
                </Field>
              </div>
              <Field label="Package / Box Condition">
                <select className={inputCls} value={form.packageCondition} onChange={set('packageCondition')}>
                  <option>Good</option><option>Acceptable</option><option>Damaged</option><option>Leaking</option>
                </select>
              </Field>
              <Field label="Notes" hint="Optional observations on transfer, seal or quality.">
                <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} />
              </Field>
              <Field label="Geotagged Photo Evidence">
                <EvidenceUploader batchID={batch.batchID} stage={STAGE} role={ROLE} gps={gps}
                  onUploaded={(res) => setEvidence(res)} />
              </Field>
              {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
              <button type="submit" disabled={state.status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                {state.status === 'submitting' ? 'Recording…' : <>Record Collection <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
