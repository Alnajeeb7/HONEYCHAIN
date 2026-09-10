import axios from 'axios';

// Use the Vite proxy in development so the same frontend URL also works over a tunnel.
export const API = import.meta.env.VITE_API_URL || '';
const client = axios.create({ baseURL: API });

// Normalises backend errors into Error objects carrying { title, detail }.
async function call(promise) {
  try {
    return (await promise).data;
  } catch (err) {
    const d = err.response?.data || {};
    const e = new Error(d.error || err.message || 'Request failed');
    e.title = d.error || 'Something went wrong';
    e.detail = d.detail || '';
    e.payload = d;              // e.g. duplicate-evidence info
    e.status = err.response?.status;
    throw e;
  }
}

export const api = {
  health: () => call(client.get('/api/health')),
  labLimits: () => call(client.get('/api/config/lab-limits')),
  states: () => call(client.get('/api/config/states')),
  stats: () => call(client.get('/api/stats')),
  alerts: (type) => call(client.get('/api/alerts', { params: type ? { type } : {} })),

  // Evidence — multipart upload; server hashes + dedups.
  uploadEvidence: ({ file, batchID, stage, role, gps }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (batchID) fd.append('batchID', batchID);
    if (stage) fd.append('stage', stage);
    if (role) fd.append('role', role);
    if (gps) fd.append('gps', JSON.stringify(gps));
    return call(client.post('/api/evidence', fd));
  },
  evidence: (id) => call(client.get(`/api/evidence/${id}`)),

  // Batch lifecycle
  newBatchID: () => call(client.post('/api/batches')),
  batches: (params = {}) => call(client.get('/api/batches', { params })),
  batch: (id) => call(client.get(`/api/batches/${id}`)),
  timeline: (id) => call(client.get(`/api/batches/${id}/timeline`)),
  audit: (id) => call(client.get(`/api/batches/${id}/audit`)),
  auditBatches: () => call(client.get('/api/audit/batches')),
  verifyIntegrity: (id) => call(client.get(`/api/batches/${id}/verify-integrity`)),
  verifyMultiPeer: (id) => call(client.get(`/api/verify-multi-peer/${id}`)),
  verification: (id) => call(client.get(`/api/verification/${id}`)),

  // Blockchain integrity layer
  blockchainStatus: () => call(client.get('/api/blockchain/status')),
  verifyChain: (id) => call(client.get(`/api/batches/${id}/verify-chain`)),
  retryChain: (id) => call(client.post(`/api/batches/${id}/retry-chain`)),
  verifyEvidence: (id) => call(client.get(`/api/evidence/${id}/verify`)),

  harvest: (id, body) => call(client.post(`/api/batches/${id}/harvest`, body)),
  collection: (id, body) => call(client.post(`/api/batches/${id}/collection`, body)),
  labTest: (id, body) => call(client.post(`/api/batches/${id}/lab-test`, body)),
  processing: (id, body) => call(client.post(`/api/batches/${id}/processing`, body)),
  export: (id, body) => call(client.post(`/api/batches/${id}/export`, body)),
  environment: (id, body) => call(client.post(`/api/batches/${id}/environment`, body)),
};

// Linear status progression for progress UIs.
export const STAGE_ORDER = ['HARVESTED', 'COLLECTED', 'LAB_PASSED', 'PACKAGED', 'EXPORTED'];
export const STATUS_LABEL = {
  HARVESTED: 'Harvested', COLLECTED: 'Collected', LAB_PENDING: 'Lab Pending',
  LAB_PASSED: 'Lab Passed', LAB_FAILED: 'Lab Failed', PACKAGED: 'Packaged',
  EXPORT_APPROVED: 'Export Approved', EXPORTED: 'Exported', VERIFIED: 'Verified', BLOCKED: 'Blocked',
};
export const statusIndex = (s) => STAGE_ORDER.indexOf(s === 'LAB_FAILED' ? 'LAB_PASSED' : s);
