import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, ShieldAlert, Boxes, Search, Loader2, GitBranch } from 'lucide-react';
import { api } from '../api';
import {
  PageHeader, Card, StatusBadge, TestResultBadge, ErrorState,
  HashDisplay, LabTestTable, EvidenceCard, BlockchainInfo,
} from '../components/ui';

export default function Government() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const [r, s] = await Promise.all([api.auditBatches(), api.stats()]); setRows(r); setStats(s); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = async (id) => { try { setSelected(await api.audit(id)); } catch { /* ignore */ } };
  const filtered = rows.filter((b) => !q || [b.batchID, b.productID, b.variety, b.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())));

  if (selected) return <AuditDetail data={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <PageHeader eyebrow="Regulator · KVIC / FSSAI" title="Traceability Audit" icon={Landmark}
        subtitle="Every batch with a live cryptographic integrity check. Drill into any batch to inspect its full chain, evidence and blockchain records." />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[['Total Batches', stats.totalBatches, 'text-slate-900'],
            ['Exported', stats.exported, 'text-cyan-600'],
            ['Lab Failed', stats.labFailed, 'text-red-600'],
            ['Products', stats.products, 'text-indigo-600'],
            ['Open Alerts', stats.openAlerts, 'text-amber-600']].map(([k, v, c]) => (
            <div key={k} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{k}</p>
              <p className={`text-2xl font-extrabold mt-1 ${c}`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <Card title="Batch Registry" icon={Boxes}
        actions={
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batches…"
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" />
          </div>
        }>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No batches recorded yet.</p>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>{['Batch ID', 'Variety', 'Status', 'Lab', 'Integrity', ''].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => (
                    <tr key={b.batchID} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-700">{b.batchID}</td>
                      <td className="px-4 py-3 text-slate-800">{b.variety}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3">{b.labResult ? <TestResultBadge result={b.labResult} /> : <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3">
                        {b.tampered ? <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs"><ShieldAlert className="w-4 h-4" /> Tampered</span>
                          : <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs"><ShieldCheck className="w-4 h-4" /> Verified</span>}
                      </td>
                      <td className="px-4 py-3 text-right"><button onClick={() => open(b.batchID)} className="text-amber-600 font-semibold hover:text-amber-700">Inspect →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-2">
              {filtered.map((b) => (
                <button key={b.batchID} onClick={() => open(b.batchID)} className="w-full text-left rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50">
                  <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{b.batchID}</span><StatusBadge status={b.status} /></div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span>{b.variety}</span>
                    {b.tampered ? <span className="text-red-600 font-semibold">Tampered</span> : <span className="text-green-600 font-semibold">Verified</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function AuditDetail({ data, onBack }) {
  const { batch, integrity, events, evidence, timeline } = data;
  const [peer, setPeer] = useState(null);
  const [chain, setChain] = useState(null);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => { api.verifyMultiPeer(batch.batchID).then(setPeer).catch(() => setPeer(null)); }, [batch.batchID]);
  useEffect(() => { api.verifyChain(batch.batchID).then(setChain).catch(() => setChain(null)); }, [batch.batchID]);
  const retry = async () => {
    setRetrying(true);
    try { await api.retryChain(batch.batchID); setChain(await api.verifyChain(batch.batchID)); }
    catch { /* ignore */ } finally { setRetrying(false); }
  };

  return (
    <div>
      <button onClick={onBack} className="text-sm font-semibold text-amber-600 hover:text-amber-700 mb-4">← Back to registry</button>
      <PageHeader eyebrow={`Batch ${batch.batchID}`} title="Full Chain Audit" icon={GitBranch}
        right={<StatusBadge status={batch.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Chain of Custody" icon={GitBranch}>
            <ol className="space-y-4">
              {timeline?.steps?.map((s) => (
                <li key={s.step} className="relative pl-8">
                  <span className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{s.role}</span>
                    <StatusBadge status={s.status} />
                    {s.testResult && <TestResultBadge result={s.testResult} />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{s.actor} · {s.location || '—'} · {s.gps ? `${s.gps.lat}, ${s.gps.lng}` : 'no GPS'}</p>
                  {s.detail?.results && <div className="mt-2"><LabTestTable results={s.detail.results} /></div>}
                  {s.recordHash && <div className="mt-2"><HashDisplay label="Record Hash" value={s.recordHash} /></div>}
                </li>
              ))}
            </ol>
          </Card>

          {evidence?.length > 0 && (
            <Card title="Evidence Ledger" icon={Boxes}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {evidence.map((e, i) => <EvidenceCard key={e.id || i} evidence={e} index={i} />)}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Integrity" icon={integrity.ok ? ShieldCheck : ShieldAlert}>
            <div className={`rounded-xl p-4 ${integrity.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-semibold flex items-center gap-2 ${integrity.ok ? 'text-green-700' : 'text-red-700'}`}>
                {integrity.ok ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                {integrity.ok ? 'Hash chain verified' : 'Tampering detected'}
              </p>
              {integrity.issues?.length > 0 && <ul className="text-xs text-red-600 mt-2 list-disc pl-4">{integrity.issues.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
            {peer && (
              <div className={`mt-3 rounded-xl p-3 text-sm ${peer.match ? 'bg-slate-50 border border-slate-200 text-slate-600' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <p className="font-semibold flex items-center gap-2">{peer.match ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4" />} Multi-peer check</p>
                <p className="text-xs mt-1">{peer.message}</p>
              </div>
            )}
          </Card>
          <Card title="Event Records" icon={GitBranch}>
            <div className="space-y-2">
              {events?.map((e, i) => <BlockchainInfo key={i} event={e} />)}
            </div>
          </Card>

          <Card title="DB ↔ Blockchain" icon={chain?.summary?.mismatches ? ShieldAlert : ShieldCheck}>
            {!chain ? (
              <p className="text-sm text-slate-400">Checking on-chain anchors…</p>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs mb-3">
                  <span className="text-slate-500">Mode:</span>
                  <span className={`font-semibold ${chain.blockchain?.mode === 'live' ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {chain.blockchain?.mode === 'live' ? `Live · ${chain.blockchain.network}` : 'Demo'}
                  </span>
                  <span className="ml-auto text-slate-400">{chain.summary?.anchored}/{chain.summary?.events} anchored</span>
                </div>
                <div className="space-y-2">
                  {chain.checks?.map((c) => (
                    <div key={c.eventId} className="rounded-lg border border-slate-200 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{c.eventType}</span>
                        <span className={`font-semibold ${c.onChain === 'MATCH' ? 'text-green-600' : c.onChain === 'MISMATCH' ? 'text-red-600' : 'text-slate-400'}`}>
                          {c.onChain === 'MATCH' ? 'MATCH' : c.onChain === 'MISMATCH' ? 'MISMATCH' : c.blockchainStatus}
                        </span>
                      </div>
                      {c.txHash && <p className="mt-1 font-mono text-slate-400 truncate">{c.txHash}</p>}
                      {c.explorerUrl && <a href={c.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 font-semibold">View on explorer →</a>}
                    </div>
                  ))}
                </div>
                {chain.checks?.some((c) => c.blockchainStatus === 'FAILED' || c.blockchainStatus === 'PENDING_CHAIN') && (
                  <button onClick={retry} disabled={retrying}
                    className="mt-3 w-full text-sm font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-60">
                    {retrying ? 'Retrying…' : 'Retry on-chain anchoring →'}
                  </button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
