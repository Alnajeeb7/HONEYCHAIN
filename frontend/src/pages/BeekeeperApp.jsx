import React, { useState } from 'react';
import { Hexagon, Droplets, ArrowRight } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture, EvidenceUploader,
  ErrorState, SuccessState, BlockchainInfo,
} from '../components/ui';

const HONEY_VARIETIES = [
  'Multifloral (Mixed)', 'Litchi', 'Mustard', 'Sunflower', 'Jamun (Black Plum)',
  'Ajwain (Carom)', 'Eucalyptus', 'Coriander', 'Karanj', 'Forest / Jungle Honey',
];

export default function BeekeeperApp({ role = 'beekeeper' }) {
  const [form, setForm] = useState({
    boxID: '', beekeeperID: '', variety: 'Multifloral (Mixed)', harvestMethod: 'hive',
    quantity: '', unit: 'kg', moisture: '', locationName: '', notes: '',
  });
  const [gps, setGps] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [batchID, setBatchID] = useState(null);
  const [state, setState] = useState({ status: 'idle' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Allocate a batch ID lazily so evidence can be tagged before submit.
  const ensureBatchID = async () => {
    if (batchID) return batchID;
    const { batchID: id } = await api.newBatchID();
    setBatchID(id);
    return id;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!gps) { setState({ status: 'error', title: 'Location Required', detail: 'Capture the current GPS location before submitting.' }); return; }
    setState({ status: 'submitting' });
    try {
      const id = await ensureBatchID();
      const res = await api.harvest(id, {
        boxID: form.boxID, variety: form.variety, beekeeperID: form.beekeeperID,
        harvestMethod: form.harvestMethod, quantity: form.quantity, unit: form.unit,
        moisture: form.moisture ? parseFloat(form.moisture) : null,
        gps, locationName: form.locationName, timestamp: new Date().toISOString(),
        evidenceHash: evidence?.fileHash || null, evidenceId: evidence?.evidence?.id || null,
        notes: form.notes,
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
        <SuccessState title="Harvest Recorded">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Batch <span className="font-mono font-semibold">{r.batch.batchID}</span> created. Share this Batch ID with the Wild Honey Collector to continue the chain.</p>
            {r.warnings?.length > 0 && r.warnings.map((w, i) => (
              <ErrorState key={i} title="Warning" detail={w} />
            ))}
            <BlockchainInfo event={r.event} />
          </div>
        </SuccessState>
        <button onClick={() => { setBatchID(null); setEvidence(null); setState({ status: 'idle' });
          setForm({ boxID: '', beekeeperID: '', variety: 'Multifloral (Mixed)', harvestMethod: 'hive', quantity: '', unit: 'kg', moisture: '', locationName: '', notes: '' }); }}
          className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">Record another harvest →</button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Stage 1 · Beekeeper" title="Hive Harvest Entry" icon={Hexagon}
        subtitle="Log a new honey batch from a KVIC-registered bee box. This creates the batch that every downstream stage will reference." />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Harvest Details" icon={Hexagon}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Box / Hive ID" required>
                <input className={inputCls} value={form.boxID} onChange={set('boxID')} placeholder="e.g. KVIC-HIVE-1234" required />
              </Field>
              <Field label="Beekeeper ID" required>
                <input className={inputCls} value={form.beekeeperID} onChange={set('beekeeperID')} placeholder="e.g. BK-KVIC-8492" required />
              </Field>
            </div>
            <Field label="Honey Variety / Floral Source">
              <select className={inputCls} value={form.variety} onChange={set('variety')}>
                {HONEY_VARIETIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Harvest Method">
              <div className="grid grid-cols-2 gap-3">
                {[['hive', '🐝 Hive / Box'], ['wild', '🌲 Wild / Forest']].map(([m, lbl]) => (
                  <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, harvestMethod: m }))}
                    className={`py-2.5 rounded-xl border font-medium transition-all text-sm ${form.harvestMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Quantity" required>
                  <input type="number" min="0.1" step="0.1" className={inputCls} value={form.quantity} onChange={set('quantity')} placeholder="e.g. 25.5" required />
                </Field>
              </div>
              <Field label="Unit">
                <select className={inputCls} value={form.unit} onChange={set('unit')}>
                  <option value="kg">kg</option><option value="g">g</option><option value="L">L</option>
                </select>
              </Field>
            </div>
            <Field label="Moisture at Harvest (%)" hint="Optional. Ideal ≤ 20% — the lab will flag high moisture.">
              <input type="number" min="10" max="30" step="0.1" className={inputCls} value={form.moisture} onChange={set('moisture')} placeholder="e.g. 18.5" />
              {form.moisture && parseFloat(form.moisture) > 20 && (
                <span className="flex items-center gap-1 text-xs text-red-500 mt-1"><Droplets className="w-3 h-3" /> High moisture — risk of fermentation.</span>
              )}
            </Field>
          </div>
        </Card>

        <Card title="Location & Evidence" icon={Hexagon}>
          <div className="space-y-4">
            <GPSCapture value={gps} onChange={setGps} label="Harvest Origin GPS" />
            <Field label="Location Name" hint="Village / apiary name for human reference.">
              <input className={inputCls} value={form.locationName} onChange={set('locationName')} placeholder="e.g. Wayanad Apiary Cluster" />
            </Field>
            <Field label="Photo Evidence" hint="Hashed & duplicate-checked server-side.">
              <EvidenceUploaderGate ensureBatchID={ensureBatchID} gps={gps} onUploaded={setEvidence} />
            </Field>
            <Field label="Notes">
              <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} />
            </Field>
            {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
            <button type="submit" disabled={state.status === 'submitting'}
              className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
              {state.status === 'submitting' ? 'Recording…' : <>Record Harvest <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

// Allocates a batch ID on first interaction, then delegates to EvidenceUploader.
function EvidenceUploaderGate({ ensureBatchID, gps, onUploaded }) {
  const [id, setId] = useState(null);
  React.useEffect(() => { ensureBatchID().then(setId); /* eslint-disable-next-line */ }, []);
  if (!id) return <p className="text-xs text-slate-400">Preparing batch…</p>;
  return <EvidenceUploader batchID={id} stage="harvest" role="beekeeper" gps={gps} onUploaded={onUploaded} />;
}
