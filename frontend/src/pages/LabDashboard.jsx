import React, { useState, useEffect } from 'react';
import { FlaskConical, CheckCircle2, Loader2, ClipboardList, ArrowRight } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture, EvidenceUploader, StatusBadge,
  BatchSummary, LabTestTable, TestResultBadge, ErrorState, SuccessState, BlockchainInfo,
} from '../components/ui';

// Field definitions mirror backend LAB_LIMITS; loaded live from /api/config/lab-limits.
const NUMERIC_HINT = {
  moisture: '≤ 20', hmf: '≤ 80', freeAcidity: '≤ 50', ph: '3.4 – 6.1',
  reducingSugars: '≥ 65', sucrose: '≤ 5', diastase: '≥ 8', conductivity: '≤ 0.8',
};

export default function LabDashboard() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setPending(await api.batches({ status: 'COLLECTED' })); }
    catch { setPending([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openBatch = async (id) => { try { setSelected(await api.batch(id)); } catch { /* ignore */ } };

  return (
    <div>
      <PageHeader eyebrow="Stage 3 · Testing Laboratory" title="Purity & Adulteration Testing" icon={FlaskConical}
        subtitle="Batches that have been collected await lab verification. Results are auto-graded against FSSAI limits — a single critical failure blocks the batch." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
          <Card title="Awaiting Test" icon={ClipboardList}
            actions={<span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{pending.length}</span>}>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No collected batches awaiting testing.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((b) => (
                  <li key={b.batchID}>
                    <button onClick={() => openBatch(b.batchID)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors ${selected?.batchID === b.batchID ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-slate-800">{b.batchID}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{b.variety}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <TestForm batch={selected} onDone={() => { setSelected(null); load(); }} />
          ) : (
            <Card>
              <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                <FlaskConical className="w-12 h-12 mb-3 opacity-40" />
                <p>Select a batch to enter test results.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TestForm({ batch, onDone }) {
  const [limits, setLimits] = useState(null);
  const [values, setValues] = useState({ adulteration: 'absent', pollenIdentity: 'match' });
  const [labID, setLabID] = useState('');
  const [gps, setGps] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => { api.labLimits().then(setLimits).catch(() => setLimits({})); }, []);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!gps) { setState({ status: 'error', title: 'Location Required', detail: 'Capture the laboratory GPS location before submitting.' }); return; }
    setState({ status: 'submitting' });
    try {
      const numeric = {};
      Object.keys(NUMERIC_HINT).forEach((k) => { if (values[k] !== undefined && values[k] !== '') numeric[k] = parseFloat(values[k]); });
      const res = await api.labTest(batch.batchID, {
        labID, values: { ...numeric, adulteration: values.adulteration, pollenIdentity: values.pollenIdentity },
        gps, evidenceHash: evidence?.fileHash || null, evidenceId: evidence?.evidence?.id || null,
      });
      setState({ status: 'done', result: res });
    } catch (err) {
      setState({ status: 'error', title: err.title, detail: err.detail });
    }
  };

  if (state.status === 'done') {
    const r = state.result;
    const pass = r.overall === 'PASS';
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border p-6 ${pass ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <div className="flex items-center gap-3 mb-4">
            <TestResultBadge result={r.overall} />
            <div><h2 className="text-lg font-bold text-slate-900">Lab Result Recorded</h2>
              <p className="text-sm text-slate-500 font-mono">{batch.batchID}</p></div>
          </div>
          {!pass && <ErrorState title="Batch Blocked" detail="This batch failed a critical parameter and cannot proceed to processing or export." />}
          <div className="mt-4"><LabTestTable results={r.results} /></div>
          <div className="mt-4"><BlockchainInfo event={r.event} /></div>
        </div>
        <button onClick={onDone} className="text-sm font-semibold text-amber-600 hover:text-amber-700">Back to queue →</button>
      </div>
    );
  }

  return (
    <Card title={`Test — ${batch.batchID}`} icon={FlaskConical}>
      <div className="mb-5 pb-5 border-b border-slate-100"><BatchSummary batch={batch} /></div>
      <form onSubmit={submit} className="space-y-4">
        <GPSCapture value={gps} onChange={setGps} label="Laboratory GPS" />
        <Field label="Lab ID" required>
          <input className={inputCls} value={labID} onChange={(e) => setLabID(e.target.value)} placeholder="e.g. LAB-FSSAI-101" required />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.keys(NUMERIC_HINT).map((k) => (
            <Field key={k} label={`${limits?.[k]?.label || k}${limits?.[k]?.unit ? ` (${limits[k].unit})` : ''}`} hint={`Limit ${NUMERIC_HINT[k]}${limits?.[k]?.critical ? ' · critical' : ''}`}>
              <input type="number" step="0.01" className={inputCls} value={values[k] || ''} onChange={set(k)} />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Adulteration (C4 sugar)">
            <select className={inputCls} value={values.adulteration} onChange={set('adulteration')}>
              <option value="absent">Absent — Pass</option><option value="present">Present — Fail</option>
            </select>
          </Field>
          <Field label="Pollen / Floral Identity">
            <select className={inputCls} value={values.pollenIdentity} onChange={set('pollenIdentity')}>
              <option value="match">Match</option><option value="mismatch">Mismatch</option>
            </select>
          </Field>
        </div>
        <Field label="Lab Report Evidence">
          <EvidenceUploader batchID={batch.batchID} stage="lab" role="lab" gps={gps} onUploaded={setEvidence} />
        </Field>
        {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
        <button type="submit" disabled={state.status === 'submitting'}
          className="w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
          {state.status === 'submitting' ? 'Grading…' : <>Submit Results <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </Card>
  );
}
