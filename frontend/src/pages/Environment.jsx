import React, { useState } from 'react';
import { Globe2, Thermometer, Droplets, ArrowRight, Activity } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, Field, inputCls, GPSCapture,
  BatchLookup, BatchSummary, ErrorState, SuccessState, BlockchainInfo,
} from '../components/ui';

export default function Environment() {
  const [batch, setBatch] = useState(null);
  const [gps, setGps] = useState(null);
  const [form, setForm] = useState({ monitorID: '', temperature: '', humidity: '', conditions: '', risk: 'LOW', dataSource: 'IoT Sensor', notes: '' });
  const [state, setState] = useState({ status: 'idle' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!batch) return;
    setState({ status: 'submitting' });
    try {
      const res = await api.environment(batch.batchID, {
        ...form, timestamp: new Date().toISOString(), gps: gps || batch.harvest?.gps,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        humidity: form.humidity ? parseFloat(form.humidity) : null,
      });
      setState({ status: 'done', result: res });
      setBatch(await api.batch(batch.batchID));
    } catch (err) { setState({ status: 'error', title: err.title, detail: err.detail }); }
  };

  const history = batch?.environment || [];

  return (
    <div>
      <PageHeader eyebrow="Monitoring · Environment" title="Hive & Habitat Monitoring" icon={Globe2}
        subtitle="Attach environmental readings to a specific batch — temperature, humidity, habitat risk. Every reading is hashed into the batch's ledger." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Find Batch" icon={Globe2}>
          <BatchLookup onFound={(b) => { setBatch(b); setState({ status: 'idle' }); }} />
          {batch && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <BatchSummary batch={batch} />
              {history.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" /> Reading History ({history.length})</p>
                  <div className="space-y-2">
                    {history.map((r, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3 text-sm flex items-center justify-between">
                        <span className="text-slate-600">{r.monitoredAt ? new Date(r.monitoredAt).toLocaleString() : '—'}</span>
                        <span className="flex items-center gap-3 text-slate-700">
                          <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-orange-500" />{r.temperature ?? '—'}°C</span>
                          <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-sky-500" />{r.humidity ?? '—'}%</span>
                          <span className={`text-xs font-semibold ${r.risk === 'HIGH' ? 'text-red-600' : r.risk === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`}>{r.risk}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Record Reading" icon={Activity}>
          {!batch ? (
            <p className="text-sm text-slate-400 py-8 text-center">Look up a batch to attach environmental data.</p>
          ) : state.status === 'done' ? (
            <SuccessState title="Reading Recorded">
              <BlockchainInfo event={state.result.event} />
              <button onClick={() => setState({ status: 'idle' })} className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700">Add another reading →</button>
            </SuccessState>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <GPSCapture value={gps} onChange={setGps} label="Monitoring Location GPS" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Monitor / Sensor ID" required><input className={inputCls} value={form.monitorID} onChange={set('monitorID')} placeholder="e.g. ENV-IOT-19" required /></Field>
                <Field label="Data Source">
                  <select className={inputCls} value={form.dataSource} onChange={set('dataSource')}>
                    <option>IoT Sensor</option><option>Manual Reading</option><option>Simulated Demo Data</option>
                  </select>
                </Field>
                <Field label="Temperature (°C)"><input type="number" step="0.1" className={inputCls} value={form.temperature} onChange={set('temperature')} /></Field>
                <Field label="Humidity (%)"><input type="number" step="0.1" className={inputCls} value={form.humidity} onChange={set('humidity')} /></Field>
              </div>
              <Field label="Habitat Risk">
                <div className="grid grid-cols-3 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map((r) => (
                    <button key={r} type="button" onClick={() => setForm((f) => ({ ...f, risk: r }))}
                      className={`py-2 rounded-xl border text-sm font-semibold transition-all ${form.risk === r
                        ? r === 'HIGH' ? 'bg-red-500 text-white border-red-500' : r === 'MEDIUM' ? 'bg-amber-400 text-white border-amber-400' : 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                </div>
              </Field>
              <Field label="Conditions / Notes"><textarea className={inputCls} rows={2} value={form.conditions} onChange={set('conditions')} placeholder="e.g. Nectar flow strong; no pesticide spraying nearby." /></Field>
              {state.status === 'error' && <ErrorState title={state.title} detail={state.detail} />}
              <button type="submit" disabled={state.status === 'submitting'}
                className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                {state.status === 'submitting' ? 'Recording…' : <>Record Reading <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
