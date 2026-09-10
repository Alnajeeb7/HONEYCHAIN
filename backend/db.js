import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// HoneyChain data layer — batch-centric traceability store.
// A single Batch/Box ID is the spine; every stage attaches a record and an
// append-only hash-chain event to that same batch. Blockchain-ready: each event
// carries payloadHash / evidenceHash / ipfsCid / blockchainTxHash (null until a
// real chain is connected).  Persisted as JSON so it survives restarts; an
// off-site "anchor" file stores each chain head so out-of-band edits are caught.
// ---------------------------------------------------------------------------

const dataPath = path.resolve('honeychain-data.json');
const anchorPath = path.resolve('honeychain-anchor.json');

const defaultData = {
  batches: {},        // batchID -> full batch object (all stage records nested)
  products: {},       // productID -> batchID
  evidence: {},        // evidenceId -> evidence record
  evidenceByHash: {},  // fileHash -> evidenceId (server-side duplicate detection)
  chain: {},          // batchID -> [ event links ]
  events: {},         // batchID -> [ blockchain-ready event records ]
  txids: {},          // batchID|productID -> { phase: txId }
  alerts: [],         // append-only alert log
  seq: { batch: 0, product: 0, evidence: 0 },
};

// --- Explicit supply-chain state machine ----------------------------------
export const STATUS = {
  HARVESTED: 'HARVESTED',
  COLLECTED: 'COLLECTED',
  LAB_PENDING: 'LAB_PENDING',
  LAB_PASSED: 'LAB_PASSED',
  LAB_FAILED: 'LAB_FAILED',
  PACKAGED: 'PACKAGED',
  EXPORT_APPROVED: 'EXPORT_APPROVED',
  EXPORTED: 'EXPORTED',
  VERIFIED: 'VERIFIED',
  BLOCKED: 'BLOCKED',
};

// Valid forward transitions. Anything not listed is rejected server-side.
export const TRANSITIONS = {
  HARVESTED: ['COLLECTED'],
  COLLECTED: ['LAB_PASSED', 'LAB_FAILED'],
  LAB_PASSED: ['PACKAGED'],
  LAB_FAILED: [],              // terminal — batch is blocked
  PACKAGED: ['EXPORTED'],
  EXPORTED: ['VERIFIED'],
};

// Human-readable linear stage order for progress UIs.
export const STAGE_ORDER = ['HARVESTED', 'COLLECTED', 'LAB_PASSED', 'PACKAGED', 'EXPORTED'];

// --- Configurable laboratory limits (central config, not scattered) --------
// op: 'max' value must be <= limit; 'min' value must be >= limit;
// 'range' [lo,hi]; 'equals' must equal expected; 'boolean' must be true.
export const LAB_LIMITS = {
  moisture:            { label: 'Moisture',              unit: '%',      op: 'max',   limit: 20,        critical: true },
  hmf:                 { label: 'HMF',                   unit: 'mg/kg',  op: 'max',   limit: 80,        critical: true },
  freeAcidity:         { label: 'Free Acidity',          unit: 'meq/kg', op: 'max',   limit: 50,        critical: false },
  ph:                  { label: 'pH',                    unit: '',       op: 'range', limit: [3.4, 6.1],critical: false },
  reducingSugars:      { label: 'Reducing Sugars',       unit: '%',      op: 'min',   limit: 65,        critical: true },
  sucrose:             { label: 'Sucrose',               unit: '%',      op: 'max',   limit: 5,         critical: true },
  diastase:            { label: 'Diastase Activity',     unit: 'DN',     op: 'min',   limit: 8,         critical: false },
  conductivity:        { label: 'Electrical Conductivity',unit: 'mS/cm', op: 'max',   limit: 0.8,       critical: false },
  adulteration:        { label: 'Adulteration (C4 sugar)',unit: '',      op: 'equals',limit: 'absent',  critical: true },
  pollenIdentity:      { label: 'Pollen / Identity',     unit: '',       op: 'equals',limit: 'match',   critical: false },
};

function loadJSON(p, fallback) {
  try {
    return { ...structuredClone(fallback), ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch {
    return structuredClone(fallback);
  }
}

let data = loadJSON(dataPath, defaultData);
let anchor = loadJSON(anchorPath, {});
data.seq = data.seq || { batch: 0, product: 0, evidence: 0 };

function saveData() { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }
function saveAnchor() { fs.writeFileSync(anchorPath, JSON.stringify(anchor, null, 2)); }

function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}
export function sha256(str) { return crypto.createHash('sha256').update(str).digest('hex'); }
export function hashPayload(obj) { return sha256(canonical(obj)); }

// --- Hash chain + blockchain-ready event log ------------------------------
// Appends one immutable event to a batch. Returns the event record (with
// blockchainTxHash: null, ready for future on-chain anchoring).
function appendEvent(batchID, eventType, actor, role, payload, evidenceHash = null, ipfsCid = null) {
  const chain = data.chain[batchID] || (data.chain[batchID] = []);
  const events = data.events[batchID] || (data.events[batchID] = []);
  const prevHash = chain.length ? chain[chain.length - 1].hash : 'GENESIS';
  const seq = chain.length;
  const payloadHash = hashPayload(payload);
  const hash = sha256(`${seq}|${batchID}|${eventType}|${payloadHash}|${prevHash}`);
  const timestamp = payload.timestamp || new Date().toISOString();
  // Resolve the IPFS CID from the linked evidence when the caller didn't pass one.
  // Evidence is uploaded first (its record holds the CID); the event only stored
  // the evidenceHash, which left event.ipfsCid null → "Pending Integration" in UI.
  if (!ipfsCid) {
    const evId = payload.evidenceId;
    const rawHash = String(evidenceHash || '').replace(/^sha256:/i, '');
    const byId = evId ? data.evidence[evId] : null;
    const byHash = !byId && rawHash ? data.evidence[data.evidenceByHash[rawHash]] : null;
    const ev = byId || byHash;
    if (ev) ipfsCid = ev.ipfsCid || ev.storageRef || null;
  }
  chain.push({ seq, phase: eventType, actor, role, timestamp, dataHash: payloadHash, prevHash, hash });
  const event = {
    eventId: `EVT-${batchID}-${seq}`,
    batchID, eventType, actor, role, timestamp,
    payloadHash, evidenceHash, ipfsCid,
    recordHash: hash, prevHash,
    blockchainTxHash: null,          // filled by BlockchainService later
    blockchainNetwork: null, blockNumber: null,
    status: 'PENDING_CHAIN',
  };
  events.push(event);
  anchor[batchID] = { head: hash, length: chain.length };
  saveData(); saveAnchor();
  return event;
}

export function getEvents(batchID) {
  const events = data.events[batchID] || [];
  // Backfill IPFS CID for events created before CID-linking existed: resolve
  // from the linked evidence (by id, then by hash) and persist once.
  let changed = false;
  for (const ev of events) {
    if (!ev.ipfsCid) {
      const rawHash = String(ev.evidenceHash || '').replace(/^sha256:/i, '');
      const rec = data.evidence[ev.evidenceId] ||
        (rawHash ? data.evidence[data.evidenceByHash[rawHash]] : null);
      const cid = rec?.ipfsCid || rec?.storageRef || null;
      if (cid) { ev.ipfsCid = cid; changed = true; }
    }
  }
  if (changed) saveData();
  return events;
}

// Recompute the chain from stored records and compare to the off-site anchor.
export function verifyBatchIntegrity(batchID) {
  const chain = data.chain[batchID];
  if (!chain || chain.length === 0) {
    return { batchID, ok: false, tampered: false, exists: false, issues: ['No chain recorded for this batch'] };
  }
  const issues = [];
  let running = 'GENESIS';
  let priorStored = 'GENESIS';
  chain.forEach((link) => {
    if (link.prevHash !== priorStored) issues.push(`Chain link for "${link.phase}" is out of order.`);
    running = sha256(`${link.seq}|${batchID}|${link.phase}|${link.dataHash}|${running}`);
    priorStored = link.hash;
  });
  const anchored = anchor[batchID]?.head;
  const anchorMatch = anchored === running;
  if (!anchorMatch) issues.push('Chain head does not match the independent anchor — data was forged or edited.');
  const tampered = issues.length > 0;
  return { batchID, ok: !tampered, tampered, exists: true, expectedHead: anchored, computedHead: running, anchorMatch, issues };
}

// PLACEHOLDER_CHAIN
// --- ID generation ---------------------------------------------------------
const year = () => new Date().getFullYear();
export function nextBatchID() {
  data.seq.batch += 1; saveData();
  return `HC-${year()}-${String(data.seq.batch).padStart(4, '0')}`;
}
export function nextProductID() {
  data.seq.product += 1; saveData();
  return `HC-PROD-${year()}-${String(data.seq.product).padStart(4, '0')}`;
}

// --- Evidence (server-side hash + duplicate detection) ---------------------
export function findEvidenceByHash(fileHash) {
  const id = data.evidenceByHash[fileHash];
  return id ? data.evidence[id] : null;
}
export function addEvidence({ batchID, stage, fileName, fileType, fileHash, storageRef, gps, uploaderRole }) {
  if (data.evidenceByHash[fileHash]) {
    const existing = data.evidence[data.evidenceByHash[fileHash]];
    return { duplicate: true, existing };
  }
  data.seq.evidence += 1;
  const evidenceId = `EV-${String(data.seq.evidence).padStart(4, '0')}`;
  const rec = { evidenceId, batchID: batchID || null, stage, fileName, fileType, fileHash,
    storageRef: storageRef || null, ipfsCid: storageRef || null, gps: gps || null,
    uploaderRole: uploaderRole || null, timestamp: new Date().toISOString() };
  data.evidence[evidenceId] = rec;
  data.evidenceByHash[fileHash] = evidenceId;
  saveData();
  return { duplicate: false, evidence: rec };
}
export function getEvidence(id) { return data.evidence[id] || null; }
export function getBatchEvidence(batchID) {
  return Object.values(data.evidence).filter((e) => e.batchID === batchID);
}

// --- Batch lifecycle -------------------------------------------------------
export function getBatch(id) { return data.batches[id] || null; }
export function getAllBatches() { return Object.values(data.batches); }
export function getProductBatch(productID) {
  const bid = data.products[productID];
  return bid ? data.batches[bid] : null;
}

export function canTransition(fromStatus, toStatus) {
  return (TRANSITIONS[fromStatus] || []).includes(toStatus);
}

// STAGE 1 — Harvest (creates the batch)
export function createHarvest(p) {
  const b = {
    batchID: p.batchID, boxID: p.boxID || '', status: STATUS.HARVESTED,
    variety: p.variety, createdAt: new Date().toISOString(),
    harvest: {
      beekeeperID: p.beekeeperID, harvestMethod: p.harvestMethod, quantity: Number(p.quantity),
      unit: p.unit, moisture: p.moisture != null ? Number(p.moisture) : null,
      gps: p.gps, locationName: p.locationName || '', harvestedAt: p.timestamp,
      evidenceHash: p.evidenceHash || null, evidenceId: p.evidenceId || null, notes: p.notes || '',
    },
  };
  data.batches[p.batchID] = b;
  const event = appendEvent(p.batchID, 'HARVEST', p.beekeeperID, 'beekeeper', b.harvest, p.evidenceHash);
  b.harvest.recordHash = event.recordHash;
  saveData();
  return { batch: b, event };
}

// STAGE 2 — Collection (Wild Honey Collector receives the batch)
export function addCollection(p) {
  const b = data.batches[p.batchID];
  b.collection = {
    collectorID: p.collectorID, gps: p.gps, locationName: p.locationName || '',
    quantityReceived: Number(p.quantityReceived), packageCondition: p.packageCondition || 'good',
    receivedAt: p.timestamp, evidenceHash: p.evidenceHash || null, evidenceId: p.evidenceId || null, notes: p.notes || '',
  };
  b.status = STATUS.COLLECTED;
  const event = appendEvent(p.batchID, 'COLLECTION', p.collectorID, 'wild_collector', b.collection, p.evidenceHash);
  b.collection.recordHash = event.recordHash;
  saveData();
  return { batch: b, event };
}

// --- Laboratory PASS/FAIL engine ------------------------------------------
export function evaluateLab(values) {
  const results = [];
  let overall = 'PASS';
  for (const [key, cfg] of Object.entries(LAB_LIMITS)) {
    const raw = values[key];
    if (raw === undefined || raw === null || raw === '') continue;
    let result = 'PASS';
    let refRange = '';
    if (cfg.op === 'max') { refRange = `≤ ${cfg.limit}`; if (Number(raw) > cfg.limit) result = 'FAIL'; }
    else if (cfg.op === 'min') { refRange = `≥ ${cfg.limit}`; if (Number(raw) < cfg.limit) result = 'FAIL'; }
    else if (cfg.op === 'range') { refRange = `${cfg.limit[0]} – ${cfg.limit[1]}`; if (Number(raw) < cfg.limit[0] || Number(raw) > cfg.limit[1]) result = 'FAIL'; }
    else if (cfg.op === 'equals') { refRange = String(cfg.limit); if (String(raw).toLowerCase() !== String(cfg.limit).toLowerCase()) result = 'FAIL'; }
    if (result === 'FAIL' && cfg.critical) overall = 'FAIL';
    else if (result === 'FAIL' && overall !== 'FAIL') overall = 'FAIL';
    results.push({ key, label: cfg.label, value: raw, unit: cfg.unit, refRange, result, critical: !!cfg.critical });
  }
  return { overall, results };
}

// STAGE 3 — Lab test (auto PASS/FAIL, blocks batch on failure)
export function addLabTest(p) {
  const b = data.batches[p.batchID];
  const { overall, results } = evaluateLab(p.values);
  b.lab = {
    labID: p.labID, sampleID: p.sampleID || `SMP-${p.batchID}`, gps: p.gps, locationName: p.locationName || '',
    testedAt: p.timestamp, values: p.values, results, overall, remarks: p.remarks || '',
    evidenceHash: p.evidenceHash || null, evidenceId: p.evidenceId || null,
  };
  b.status = overall === 'PASS' ? STATUS.LAB_PASSED : STATUS.LAB_FAILED;
  const event = appendEvent(p.batchID, 'LAB_TEST', p.labID, 'lab', b.lab, p.evidenceHash);
  b.lab.recordHash = event.recordHash;
  saveData();
  return { batch: b, event, overall };
}

// STAGE 4 — Processing + Packaging (produces final product ID)
export function addProcessing(p) {
  const b = data.batches[p.batchID];
  const productID = p.productID || nextProductID();
  b.processing = {
    processorID: p.processorID, facility: p.facility, gps: p.gps, locationName: p.locationName || '',
    processedAt: p.timestamp, quantityReceived: Number(p.quantityReceived) || null,
    quantityProcessed: Number(p.quantityProcessed) || null, packagingType: p.packagingType,
    packagingSize: p.packagingSize, units: Number(p.units) || null, productBatchNumber: p.productBatchNumber || '',
    packagedAt: p.packagedAt || p.timestamp, expiry: p.expiry || '', label: p.label || '',
    productID, evidenceHash: p.evidenceHash || null, evidenceId: p.evidenceId || null, notes: p.notes || '',
  };
  b.productID = productID;
  b.status = STATUS.PACKAGED;
  data.products[productID] = p.batchID;
  const event = appendEvent(p.batchID, 'PROCESSING', p.processorID, 'processor', b.processing, p.evidenceHash);
  b.processing.recordHash = event.recordHash;
  saveData();
  return { batch: b, event, productID };
}

// STAGE 5 — Export compliance
export function addExport(p) {
  const b = data.batches[p.batchID];
  b.export = {
    exporterID: p.exporterID, destinationCountry: p.destinationCountry, exportedAt: p.timestamp,
    quantityExported: Number(p.quantityExported) || null, gps: p.gps, locationName: p.locationName || '',
    docsComplete: !!p.docsComplete, complianceStatus: 'APPROVED',
    evidenceHash: p.evidenceHash || null, evidenceId: p.evidenceId || null, notes: p.notes || '',
  };
  b.status = STATUS.EXPORTED;
  const event = appendEvent(p.batchID, 'EXPORT', p.exporterID, 'exporter', b.export, p.evidenceHash);
  b.export.recordHash = event.recordHash;
  saveData();
  return { batch: b, event };
}

// Environment monitoring (batch-linked, append-only)
export function addEnvironment(p) {
  const b = data.batches[p.batchID];
  b.environment = b.environment || [];
  const rec = { monitorID: p.monitorID, gps: p.gps || b.harvest?.gps, monitoredAt: p.timestamp,
    temperature: p.temperature ?? null, humidity: p.humidity ?? null, conditions: p.conditions || '',
    risk: p.risk || 'LOW', dataSource: p.dataSource || 'Simulated Demo Data', notes: p.notes || '' };
  b.environment.push(rec);
  const event = appendEvent(p.batchID, 'ENVIRONMENT', p.monitorID, 'environment', rec);
  rec.recordHash = event.recordHash;
  saveData();
  return { batch: b, event };
}

// PLACEHOLDER_WRITERS
// --- Alerts ---------------------------------------------------------------
export function addAlert(alert) {
  const entry = { id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(), resolved: false, ...alert };
  data.alerts.unshift(entry);
  saveData();
  return entry;
}
export function getAlerts(filter = {}) {
  let list = data.alerts;
  if (filter.type) list = list.filter((a) => a.type === filter.type);
  if (filter.batchID) list = list.filter((a) => a.batchID === filter.batchID);
  return list;
}

// --- Timeline (ordered, blockchain-ready) ---------------------------------
export function buildTimeline(batchID) {
  const b = data.batches[batchID];
  if (!b) return null;
  const events = getEvents(batchID);
  const evAt = (type) => events.find((e) => e.eventType === type) || {};
  const steps = [];
  if (b.harvest) steps.push({ step: '01', status: 'HARVESTED', role: 'Beekeeper', actor: b.harvest.beekeeperID,
    location: b.harvest.locationName, gps: b.harvest.gps, timestamp: b.harvest.harvestedAt,
    recordHash: evAt('HARVEST').recordHash, evidenceHash: b.harvest.evidenceHash, evidenceId: b.harvest.evidenceId,
    detail: { variety: b.variety, quantity: b.harvest.quantity, unit: b.harvest.unit, method: b.harvest.harvestMethod } });
  if (b.collection) steps.push({ step: '02', status: 'COLLECTED', role: 'Wild Honey Collector', actor: b.collection.collectorID,
    location: b.collection.locationName, gps: b.collection.gps, timestamp: b.collection.receivedAt,
    recordHash: evAt('COLLECTION').recordHash, evidenceHash: b.collection.evidenceHash, evidenceId: b.collection.evidenceId,
    detail: { quantityReceived: b.collection.quantityReceived, condition: b.collection.packageCondition } });
  if (b.lab) steps.push({ step: '03', status: b.lab.overall === 'PASS' ? 'LAB_PASSED' : 'LAB_FAILED', role: 'Testing Laboratory', actor: b.lab.labID,
    location: b.lab.locationName, gps: b.lab.gps, timestamp: b.lab.testedAt, testResult: b.lab.overall,
    recordHash: evAt('LAB_TEST').recordHash, evidenceHash: b.lab.evidenceHash, evidenceId: b.lab.evidenceId,
    detail: { results: b.lab.results, sampleID: b.lab.sampleID } });
  if (b.processing) steps.push({ step: '04', status: 'PACKAGED', role: 'Processor / Packer', actor: b.processing.processorID,
    location: b.processing.locationName, gps: b.processing.gps, timestamp: b.processing.packagedAt,
    recordHash: evAt('PROCESSING').recordHash, evidenceHash: b.processing.evidenceHash, evidenceId: b.processing.evidenceId,
    detail: { productID: b.processing.productID, packagingType: b.processing.packagingType, units: b.processing.units } });
  if (b.export) steps.push({ step: '05', status: 'EXPORT_VERIFIED', role: 'Exporter', actor: b.export.exporterID,
    location: b.export.locationName, gps: b.export.gps, timestamp: b.export.exportedAt,
    recordHash: evAt('EXPORT').recordHash, evidenceHash: b.export.evidenceHash, evidenceId: b.export.evidenceId,
    detail: { destination: b.export.destinationCountry, compliance: b.export.complianceStatus } });
  return { batchID, status: b.status, steps };
}

// Consumer verification bundle (by productID or batchID)
export function buildVerification(id) {
  const b = data.batches[id] || getProductBatch(id);
  if (!b) return null;
  const integrity = verifyBatchIntegrity(b.batchID);
  const timeline = buildTimeline(b.batchID);
  const labPass = b.lab ? b.lab.overall === 'PASS' : null;
  const summary = {
    originVerified: !!b.harvest,
    collectorVerified: !!b.collection,
    labTested: !!b.lab,
    qualityPassed: labPass === true,
    processed: !!b.processing,
    exportVerified: !!b.export,
    evidenceAvailable: getBatchEvidence(b.batchID).length > 0,
    integrityOk: integrity.ok,
  };
  const verified = labPass !== false && integrity.ok && !!b.harvest;
  return {
    verified, labFailed: labPass === false,
    product: { productID: b.productID || null, batchID: b.batchID, boxID: b.boxID,
      variety: b.variety, status: b.status,
      packagedAt: b.processing?.packagedAt || null, productName: b.processing?.label || `${b.variety} Honey` },
    origin: b.harvest ? { beekeeperID: b.harvest.beekeeperID, gps: b.harvest.gps,
      locationName: b.harvest.locationName, harvestedAt: b.harvest.harvestedAt,
      method: b.harvest.harvestMethod, quantity: b.harvest.quantity, unit: b.harvest.unit } : null,
    lab: b.lab || null,
    summary, timeline: timeline?.steps || [],
    evidence: getBatchEvidence(b.batchID),
    events: getEvents(b.batchID),
    integrity,
  };
}

// Full audit report for KVIC/FSSAI
export function buildAudit(batchID) {
  const b = data.batches[batchID];
  if (!b) return null;
  return { batch: b, integrity: verifyBatchIntegrity(batchID),
    events: getEvents(batchID), evidence: getBatchEvidence(batchID), timeline: buildTimeline(batchID) };
}

export function stats() {
  const batches = Object.values(data.batches);
  const byStatus = {};
  batches.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
  return {
    totalBatches: batches.length, byStatus,
    products: Object.keys(data.products).length,
    labFailed: batches.filter((b) => b.status === STATUS.LAB_FAILED).length,
    exported: batches.filter((b) => b.status === STATUS.EXPORTED).length,
    openAlerts: data.alerts.filter((a) => !a.resolved).length,
  };
}

export function recordTxId(key, phase, txId) {
  data.txids[key] = data.txids[key] || {};
  data.txids[key][phase] = txId;
  saveData();
}

// --- Blockchain anchoring status (EVM integrity layer) ---------------------
// Persists the async transaction lifecycle onto a specific event WITHOUT ever
// deleting the DB record. On tx failure the event keeps its data and is marked
// FAILED so it can be retried.
export function setEventChainStatus(batchID, eventId, info = {}) {
  const events = data.events[batchID] || [];
  const ev = events.find((e) => e.eventId === eventId);
  if (!ev) return null;
  if (info.status) ev.status = info.status;               // CONFIRMED | FAILED | PENDING_CHAIN | DEMO
  if ('txHash' in info) ev.blockchainTxHash = info.txHash;
  if ('network' in info) ev.blockchainNetwork = info.network;
  if ('blockNumber' in info) ev.blockNumber = info.blockNumber;
  if ('contractAddress' in info) ev.contractAddress = info.contractAddress;
  if ('explorerUrl' in info) ev.explorerUrl = info.explorerUrl;
  if ('chainError' in info) ev.chainError = info.chainError;
  saveData();
  return ev;
}

// Return events that were saved but never confirmed on-chain (for retry).
export function getPendingChainEvents(batchID) {
  const events = data.events[batchID] || [];
  return events.filter((e) => e.status === 'PENDING_CHAIN' || e.status === 'FAILED');
}

export function getEventById(batchID, eventId) {
  return (data.events[batchID] || []).find((e) => e.eventId === eventId) || null;
}

export default {
  STATUS, TRANSITIONS, STAGE_ORDER, LAB_LIMITS,
  sha256, hashPayload, nextBatchID, nextProductID,
  findEvidenceByHash, addEvidence, getEvidence, getBatchEvidence,
  getBatch, getAllBatches, getProductBatch, canTransition,
  createHarvest, addCollection, addLabTest, evaluateLab, addProcessing, addExport, addEnvironment,
  getEvents, verifyBatchIntegrity, buildTimeline, buildVerification, buildAudit,
  addAlert, getAlerts, stats, recordTxId,
  setEventChainStatus, getPendingChainEvents, getEventById,
};

// PLACEHOLDER_READERS
