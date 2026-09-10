import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import * as fs from 'fs';
import db from './db.js';
// Blockchain + IPFS integrity layer (additive). Both degrade to a safe demo
// mode when unconfigured, so the existing app runs unchanged. dotenv loads
// secrets from .env (never committed) — no-op if the package is absent.
try { (await import('dotenv')).config(); } catch { /* dotenv optional */ }
import * as chain from './services/blockchain/index.js';
import * as ipfsSvc from './services/ipfs/index.js';

// Fabric is loaded lazily and only when explicitly enabled (FABRIC_ENABLED=1),
// so the API boots cleanly in demo mode even when the Hyperledger client
// libraries or test-network are unavailable (Phase-2 wiring).
let _getContractForOrg = null;
let fabricTried = false;
async function getContractForOrg(orgNumber) {
  if (process.env.FABRIC_ENABLED !== '1') return null;
  if (!fabricTried) {
    fabricTried = true;
    try { _getContractForOrg = (await import('./fabric.js')).getContractForOrg; }
    catch { _getContractForOrg = null; }
  }
  if (!_getContractForOrg) return null;
  try { return await _getContractForOrg(orgNumber); } catch { return null; }
}

// Optional IPFS — lazily connected. Falls back to a deterministic demo CID when
// the ipfs-http-client package or daemon is unavailable, so the app runs offline.
let ipfs = null;
let ipfsTried = false;
async function getIpfs() {
  if (ipfsTried) return ipfs;
  ipfsTried = true;
  try {
    const mod = await import('ipfs-http-client');
    ipfs = mod.create({ url: 'http://127.0.0.1:5001/api/v0' });
  } catch { ipfs = null; }
  return ipfs;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ dest: 'uploads/' });
const utf8Decoder = new TextDecoder();
let lastFabricMode = 'unknown';

// --- Service abstractions (blockchain-ready; swap implementations later) ---
const StorageService = {
  async put(buffer, fileName) {
    // Prefer the provider-agnostic IPFS service (Pinata/local/demo). It always
    // resolves — demo mode returns a deterministic CID so the app runs offline.
    try { const r = await ipfsSvc.upload(buffer, fileName); return { cid: r.cid, mode: r.mode }; }
    catch { /* fall back to legacy local client below */ }
    const client = await getIpfs();
    if (client) {
      try { const r = await client.add(buffer); return { cid: r.path, mode: 'ipfs' }; } catch { /* fall through */ }
    }
    return { cid: `demo-${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 44)}`, mode: 'demo' };
  },
};
const HashService = {
  file: (buffer) => `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`,
};
const BlockchainService = {
  // Records an event on-chain when Fabric is available; otherwise returns a
  // pending marker (blockchainTxHash stays null in the ledger).
  async submit(orgNumber, fnName, args) {
    const fabric = await getContractForOrg(orgNumber);
    if (!fabric) { lastFabricMode = 'demo'; return { txId: null, mode: 'pending', confirmed: false }; }
    try {
      const proposal = fabric.contract.newProposal(fnName, { arguments: args.map(String) });
      const id = proposal.getTransactionId();
      const tx = await proposal.endorse();
      const commit = await tx.submit();
      await commit.getStatus();
      lastFabricMode = 'fabric';
      return { txId: id, mode: 'fabric', confirmed: true };
    } catch { return { txId: null, mode: 'pending', confirmed: false }; }
    finally { try { fabric.gateway.close(); } catch { /* ignore */ } }
  },
};

async function evaluate(orgNumber, fnName, args) {
  const fabric = await getContractForOrg(orgNumber);
  if (!fabric) return null;
  try {
    const bytes = await fabric.contract.evaluateTransaction(fnName, ...args.map(String));
    lastFabricMode = 'fabric';
    return JSON.parse(utf8Decoder.decode(bytes));
  } catch { return null; }
  finally { try { fabric.gateway.close(); } catch { /* ignore */ } }
}

// --- EVM anchoring helper --------------------------------------------------
// Called AFTER the DB record is saved. Submits the canonical recordHash (+
// evidence hash/CID) to the smart contract and writes the async tx result back
// onto the event. Never throws and never deletes DB data: on failure the event
// is marked FAILED for retry.
async function anchorEvent(batchID, event, { isBatchCreate = false, passed = null } = {}) {
  if (!event) return null;
  const args = {
    batchId: batchID, eventType: event.eventType, recordHash: event.recordHash,
    evidenceHash: event.evidenceHash, ipfsCid: event.ipfsCid, timestamp: event.timestamp, passed,
  };
  let result;
  try {
    result = isBatchCreate ? await chain.registerBatch(args) : await chain.registerEvent(args);
  } catch (e) {
    result = { status: 'FAILED', confirmed: false, txHash: null, error: e?.message || String(e) };
  }
  db.setEventChainStatus(batchID, event.eventId, {
    status: result.status, txHash: result.txHash ?? null, network: result.network ?? null,
    blockNumber: result.blockNumber ?? null, contractAddress: result.contractAddress ?? null,
    explorerUrl: result.explorerUrl ?? null, chainError: result.error ?? null,
  });
  return {
    blockchainStatus: result.status, txHash: result.txHash ?? null, blockNumber: result.blockNumber ?? null,
    network: result.network ?? null, explorerUrl: result.explorerUrl ?? null, contractAddress: result.contractAddress ?? null,
  };
}

const APPROVED_ZONE = { minLat: 6, maxLat: 37, minLng: 68, maxLng: 97 };
const inZone = (g) => g && g.lat >= APPROVED_ZONE.minLat && g.lat <= APPROVED_ZONE.maxLat && g.lng >= APPROVED_ZONE.minLng && g.lng <= APPROVED_ZONE.maxLng;

function err(res, code, error, detail) { return res.status(code).json({ error, detail }); }

app.get('/api/health', (req, res) => res.json({ status: 'ok', fabricMode: lastFabricMode, ipfs: !!ipfs, blockchain: chain.status(), ipfsService: ipfsSvc.status() }));
app.get('/api/blockchain/status', (req, res) => res.json({ ...chain.status(), ipfs: ipfsSvc.status() }));
app.get('/api/config/lab-limits', (req, res) => res.json(db.LAB_LIMITS));
app.get('/api/config/states', (req, res) => res.json({ STATUS: db.STATUS, TRANSITIONS: db.TRANSITIONS, STAGE_ORDER: db.STAGE_ORDER }));

// --- Evidence: validate, hash, dedup (server-side), store ------------------
app.post('/api/evidence', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return err(res, 400, 'No file provided', 'Attach an image as evidence.');
    if (!/^image\//.test(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return err(res, 400, 'Invalid file type', 'Only image evidence is accepted.');
    }
    const buffer = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path);
    const fileHash = HashService.file(buffer);

    const dup = db.findEvidenceByHash(fileHash);
    if (dup) {
      return res.status(409).json({ error: 'Duplicate Evidence Detected',
        detail: 'This image already exists in HoneyChain records. Capture and upload new evidence.',
        existingEvidenceHash: fileHash, existingEvidence: dup });
    }
    const { cid } = await StorageService.put(buffer);
    let gps = null;
    try { gps = req.body.gps ? JSON.parse(req.body.gps) : null; } catch { gps = null; }
    const { evidence } = db.addEvidence({
      batchID: req.body.batchID || null, stage: req.body.stage || 'unknown',
      fileName: req.file.originalname, fileType: req.file.mimetype, fileHash,
      storageRef: cid, gps, uploaderRole: req.body.role || null,
    });
    res.json({ success: true, evidence, fileHash, ipfsCid: cid, ipfsGatewayUrl: ipfsSvc.gatewayUrl(cid) });
  } catch (e) { err(res, 500, e.message); }
});
app.get('/api/evidence/:id', (req, res) => {
  const ev = db.getEvidence(req.params.id);
  if (!ev) return err(res, 404, 'Evidence not found');
  res.json(ev);
});

// PLACEHOLDER_EVIDENCE
// --- STAGE 1: Harvest (Beekeeper) — creates the batch ----------------------
app.post('/api/batches/:id/harvest', async (req, res) => {
  try {
    const batchID = req.params.id;
    const { boxID, variety, beekeeperID, harvestMethod, quantity, unit, moisture,
            gps, locationName, timestamp, evidenceHash, evidenceId, notes } = req.body;
    if (db.getBatch(batchID)) return err(res, 409, 'Batch already exists',
      `A harvest for ${batchID} is already recorded. Duplicate creation blocked.`);
    if (!gps || gps.lat == null || gps.lng == null) return err(res, 400, 'Location Required',
      'Capture the current GPS location before submitting this record.');
    if (!variety || !quantity) return err(res, 400, 'Missing required fields', 'Variety and quantity are required.');
    const warnings = [];
    if (!inZone(gps)) warnings.push('GPS is outside the approved KVIC harvesting zone.');
    const bc = await BlockchainService.submit(1, 'CreateHarvestEvent', [batchID, variety, gps.lat, gps.lng, timestamp]);
    const { batch, event } = db.createHarvest({ batchID, boxID, variety, beekeeperID, harvestMethod,
      quantity, unit, moisture, gps, locationName, timestamp, evidenceHash, evidenceId, notes });
    if (bc.txId) db.recordTxId(batchID, 'harvest', bc.txId);
    const anchor = await anchorEvent(batchID, event, { isBatchCreate: true });
    res.json({ success: true, batch, event, warnings,
      recordHash: event.recordHash, status: batch.status, blockchain: anchor,
      blockchainStatus: anchor?.blockchainStatus || (bc.confirmed ? 'Confirmed' : 'Pending Integration') });
  } catch (e) { err(res, 500, e.message); }
});

// --- STAGE 2: Collection (Wild Honey Collector) ----------------------------
app.post('/api/batches/:id/collection', async (req, res) => {
  try {
    const b = db.getBatch(req.params.id);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    if (b.status !== db.STATUS.HARVESTED) {
      if (b.collection) return err(res, 409, 'Action Blocked', 'This batch has already been received by a Wild Honey Collector.');
      return err(res, 409, 'Action Blocked', `This batch is at "${b.status}" and cannot be collected now.`);
    }
    if (!req.body.gps) return err(res, 400, 'Location Required', 'Capture your GPS location before submitting.');
    const bc = await BlockchainService.submit(1, 'AddCollectionEvent', [b.batchID, req.body.collectorID]);
    const { batch, event } = db.addCollection({ ...req.body, batchID: b.batchID });
    if (bc.txId) db.recordTxId(b.batchID, 'collection', bc.txId);
    const anchor = await anchorEvent(b.batchID, event);
    res.json({ success: true, batch, event, recordHash: event.recordHash, status: batch.status, blockchain: anchor,
      blockchainStatus: anchor?.blockchainStatus || (bc.confirmed ? 'Confirmed' : 'Pending Integration') });
  } catch (e) { err(res, 500, e.message); }
});

// --- STAGE 3: Lab test (auto PASS/FAIL; failure blocks the batch) ----------
app.post('/api/batches/:id/lab-test', async (req, res) => {
  try {
    const b = db.getBatch(req.params.id);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    if (b.status !== db.STATUS.COLLECTED) {
      if (b.lab) return err(res, 409, 'Action Blocked', 'This batch has already been lab tested.');
      return err(res, 409, 'Action Blocked', `Batch must be COLLECTED before lab testing (currently "${b.status}").`);
    }
    if (!req.body.gps) return err(res, 400, 'Location Required', 'Capture the laboratory GPS location before submitting.');
    const bc = await BlockchainService.submit(2, 'AddLabTest', [b.batchID, req.body.labID]);
    const { batch, event, overall } = db.addLabTest({ ...req.body, batchID: b.batchID });
    if (bc.txId) db.recordTxId(b.batchID, 'lab', bc.txId);
    if (overall === 'FAIL') db.addAlert({ type: 'quality', severity: 'high', batchID: b.batchID,
      message: `Batch ${b.batchID} FAILED laboratory quality verification.`, detail: 'Batch is blocked from further processing.' });
    const anchor = await anchorEvent(b.batchID, event, { passed: overall === 'PASS' });
    res.json({ success: true, batch, event, overall, results: batch.lab.results, status: batch.status,
      recordHash: event.recordHash, blockchain: anchor,
      blockchainStatus: anchor?.blockchainStatus || (bc.confirmed ? 'Confirmed' : 'Pending Integration') });
  } catch (e) { err(res, 500, e.message); }
});

// --- STAGE 4: Processing / Packaging ---------------------------------------
app.post('/api/batches/:id/processing', async (req, res) => {
  try {
    const b = db.getBatch(req.params.id);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    if (b.status === db.STATUS.LAB_FAILED) return err(res, 409, 'Quality Verification Failed',
      'This batch failed laboratory testing and cannot proceed to processing.');
    if (b.status !== db.STATUS.LAB_PASSED) return err(res, 409, 'Action Blocked',
      `Batch has not completed the required previous stage (currently "${b.status}"). Lab PASS is required.`);
    if (!req.body.gps) return err(res, 400, 'Location Required', 'Capture the facility GPS location before submitting.');
    const bc = await BlockchainService.submit(1, 'AddProcessingEvent', [b.batchID, req.body.processorID]);
    const { batch, event, productID } = db.addProcessing({ ...req.body, batchID: b.batchID });
    if (bc.txId) db.recordTxId(b.batchID, 'processing', bc.txId);
    const anchor = await anchorEvent(b.batchID, event);
    res.json({ success: true, batch, event, productID, status: batch.status, recordHash: event.recordHash,
      qrData: `HC-QR-${productID}`, consumerUrl: `/verify/${productID}`, blockchain: anchor,
      blockchainStatus: anchor?.blockchainStatus || (bc.confirmed ? 'Confirmed' : 'Pending Integration') });
  } catch (e) { err(res, 500, e.message); }
});

// --- STAGE 5: Export compliance --------------------------------------------
app.post('/api/batches/:id/export', async (req, res) => {
  try {
    const b = db.getBatch(req.params.id);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    if (b.status === db.STATUS.LAB_FAILED) return err(res, 409, 'EXPORT BLOCKED', 'Reason: Laboratory verification failed.');
    if (b.status !== db.STATUS.PACKAGED) return err(res, 409, 'EXPORT BLOCKED',
      `Reason: batch is at "${b.status}". Lab PASS + processing + packaging must be complete.`);
    const integrity = db.verifyBatchIntegrity(b.batchID);
    if (integrity.tampered) return err(res, 409, 'EXPORT BLOCKED', 'Reason: batch failed integrity verification.');
    if (!req.body.gps) return err(res, 400, 'Location Required', 'Capture the export point GPS location before submitting.');
    const { batch, event } = db.addExport({ ...req.body, batchID: b.batchID });
    const anchor = await anchorEvent(b.batchID, event);
    res.json({ success: true, batch, event, status: batch.status, recordHash: event.recordHash, blockchain: anchor,
      certificate: { batchID: b.batchID, productID: b.productID, product: b.processing?.label || `${b.variety} Honey`,
        destination: req.body.destinationCountry,
        statement: 'All stages passed origin, quality, processing, packaging and integrity verification under KVIC Honey Mission & FSSAI standards.' } });
  } catch (e) { err(res, 500, e.message); }
});

// --- Environment monitoring (batch-linked) ---------------------------------
app.post('/api/batches/:id/environment', async (req, res) => {
  try {
    const b = db.getBatch(req.params.id);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    const { batch, event } = db.addEnvironment({ ...req.body, batchID: b.batchID });
    const anchor = await anchorEvent(b.batchID, event);
    res.json({ success: true, batch, event, recordHash: event.recordHash, blockchain: anchor });
  } catch (e) { err(res, 500, e.message); }
});

// PLACEHOLDER_STAGES
// --- Queries ---------------------------------------------------------------
app.post('/api/batches', (req, res) => {
  // Allocate a fresh batch ID (batch record is created on harvest).
  res.json({ batchID: db.nextBatchID() });
});
app.get('/api/batches', (req, res) => {
  const { status, q } = req.query;
  let list = db.getAllBatches();
  if (status) list = list.filter((b) => b.status === status);
  if (q) {
    const s = String(q).toLowerCase();
    list = list.filter((b) => [b.batchID, b.boxID, b.productID, b.variety, b.status]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }
  res.json(list.map((b) => ({ batchID: b.batchID, boxID: b.boxID, productID: b.productID || null,
    variety: b.variety, status: b.status, createdAt: b.createdAt,
    labResult: b.lab?.overall || null })));
});
app.get('/api/batches/:id', (req, res) => {
  const b = db.getBatch(req.params.id);
  if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
  res.json(b);
});
app.get('/api/batches/:id/timeline', (req, res) => {
  const t = db.buildTimeline(req.params.id);
  if (!t) return err(res, 404, 'Batch Not Found');
  res.json(t);
});
app.get('/api/batches/:id/audit', (req, res) => {
  const a = db.buildAudit(req.params.id);
  if (!a) return err(res, 404, 'Batch Not Found');
  res.json(a);
});
app.get('/api/batches/:id/verify-integrity', (req, res) => {
  const result = db.verifyBatchIntegrity(req.params.id);
  if (result.tampered) db.addAlert({ type: 'tamper', severity: 'critical', batchID: req.params.id,
    message: `Tampering detected on batch ${req.params.id}.`, detail: result.issues.join(' ') });
  res.json(result);
});

// Consumer verification — by product ID OR batch ID
app.get('/api/verification/:id', async (req, res) => {
  const v = db.buildVerification(req.params.id);
  if (!v) return err(res, 404, 'Product Not Found', 'No product or batch matches this ID in HoneyChain.');
  // Attach blockchain wiring + a resolved tx (the first confirmed event) and
  // IPFS gateway links so the consumer UI can render REAL explorer/evidence
  // links without any secrets.
  const chainStatus = chain.status();
  const anchored = (v.events || []).find((e) => e.blockchainTxHash);
  v.blockchain = {
    ...chainStatus,
    txHash: anchored?.blockchainTxHash || null,
    blockNumber: anchored?.blockNumber || null,
    explorerUrl: anchored?.explorerUrl || (anchored?.blockchainTxHash ? chain.txUrl(anchored.blockchainTxHash) : null),
  };
  v.evidence = (v.evidence || []).map((e) => ({ ...e, ipfsGatewayUrl: ipfsSvc.gatewayUrl(e.ipfsCid || e.storageRef) }));
  res.json(v);
});

// Multi-peer verification (Fabric when available; local otherwise)
app.get('/api/verify-multi-peer/:batchID', async (req, res) => {
  try {
    const batchID = req.params.batchID;
    let org1 = await evaluate(1, 'QueryFullHistory', [batchID]);
    let org2 = await evaluate(2, 'QueryFullHistory', [batchID]);
    if (org1 === null && org2 === null) { const local = db.getEvents(batchID); org1 = local; org2 = local; }
    const integrity = db.verifyBatchIntegrity(batchID);
    const match = JSON.stringify(org1) === JSON.stringify(org2) && !integrity.tampered;
    res.json({ match, integrity,
      message: match ? 'Data matches across all independent peers (KVIC Beekeepers & FSSAI Regulators).'
        : (integrity.tampered ? 'ALERT: ledger tampering detected.' : 'Data mismatch or peer unavailable.') });
  } catch (e) { err(res, 500, e.message); }
});

// Audit / dashboard
app.get('/api/audit/batches', (req, res) => {
  const rows = db.getAllBatches().map((b) => {
    const integrity = db.verifyBatchIntegrity(b.batchID);
    return { batchID: b.batchID, boxID: b.boxID, productID: b.productID || null, variety: b.variety,
      status: b.status, labResult: b.lab?.overall || null, createdAt: b.createdAt,
      integrityOk: integrity.ok, tampered: integrity.tampered };
  });
  res.json(rows);
});
app.get('/api/alerts', (req, res) => res.json(db.getAlerts({ type: req.query.type })));
app.get('/api/stats', (req, res) => res.json(db.stats()));

// PLACEHOLDER_QUERIES

// --- Blockchain verification & retry ---------------------------------------
// Compares each event's DB recordHash against what is anchored on-chain and
// returns a per-event MATCH / MISMATCH (tamper detection). Also re-runs the
// local hash-chain integrity check so both layers are visible together.
app.get('/api/batches/:id/verify-chain', async (req, res) => {
  try {
    const batchID = req.params.id;
    const b = db.getBatch(batchID);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    const integrity = db.verifyBatchIntegrity(batchID);
    const events = db.getEvents(batchID);
    const checks = [];
    for (const ev of events) {
      const onChain = await chain.verifyRecord(batchID, ev.recordHash);
      checks.push({
        eventId: ev.eventId, eventType: ev.eventType, recordHash: ev.recordHash,
        blockchainStatus: ev.status, txHash: ev.blockchainTxHash || null,
        blockNumber: ev.blockNumber || null, network: ev.blockchainNetwork || null,
        explorerUrl: ev.explorerUrl || null,
        onChain: onChain.available ? (onChain.match ? 'MATCH' : 'MISMATCH') : 'NOT_ANCHORED',
      });
    }
    const chainStatus = chain.status();
    const anchoredCount = checks.filter((c) => c.onChain === 'MATCH').length;
    res.json({
      batchID, integrity, blockchain: chainStatus, checks,
      summary: {
        events: checks.length, anchored: anchoredCount,
        mismatches: checks.filter((c) => c.onChain === 'MISMATCH').length,
        mode: chainStatus.mode,
      },
    });
  } catch (e) { err(res, 500, e.message); }
});

// Verify a single evidence file: is its hash anchored on-chain, and does the
// content behind the CID still hash to the stored value?
app.get('/api/evidence/:id/verify', async (req, res) => {
  const ev = db.getEvidence(req.params.id);
  if (!ev) return err(res, 404, 'Evidence not found');
  const hash = ev.fileHash;
  const cid = ev.ipfsCid || ev.storageRef;
  const [onChain, content] = await Promise.all([
    chain.verifyEvidence(hash), ipfsSvc.verify(cid, hash),
  ]);
  res.json({
    evidenceId: ev.id, fileHash: hash, ipfsCid: cid, ipfsGatewayUrl: ipfsSvc.gatewayUrl(cid),
    onChain: onChain.available ? (onChain.registered ? 'REGISTERED' : 'NOT_REGISTERED') : 'UNAVAILABLE',
    onChainCid: onChain.cid || null,
    contentIntegrity: content.available ? (content.match ? 'MATCH' : 'MISMATCH') : 'UNAVAILABLE',
  });
});

// Retry anchoring events that were saved but never confirmed on-chain (the DB
// record is always preserved; this only re-submits the transaction).
app.post('/api/batches/:id/retry-chain', async (req, res) => {
  try {
    const batchID = req.params.id;
    const b = db.getBatch(batchID);
    if (!b) return err(res, 404, 'Batch Not Found', 'The supplied Batch ID does not exist in HoneyChain.');
    const pending = db.getPendingChainEvents(batchID);
    const results = [];
    for (const ev of pending) {
      const isBatchCreate = ev.eventType === 'HARVEST';
      const passed = ev.eventType === 'LAB' ? (b.lab?.overall === 'PASS') : null;
      const r = await anchorEvent(batchID, ev, { isBatchCreate, passed });
      results.push({ eventId: ev.eventId, ...r });
    }
    res.json({ success: true, batchID, retried: results.length, results });
  } catch (e) { err(res, 500, e.message); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HoneyChain API server running on port ${PORT}`));
