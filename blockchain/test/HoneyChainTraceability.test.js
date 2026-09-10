const { expect } = require("chai");
const { ethers } = require("hardhat");

const id = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
const rec = (s) => ethers.keccak256(ethers.toUtf8Bytes("record:" + s));
const ev = (s) => ethers.keccak256(ethers.toUtf8Bytes("evidence:" + s));
const now = () => Math.floor(Date.now() / 1000);
const ZERO = ethers.ZeroHash;

// Status enum mirror
const S = { NONE: 0, HARVESTED: 1, COLLECTED: 2, LAB_PASSED: 3, LAB_FAILED: 4, PROCESSED: 5, PACKAGED: 6, EXPORTED: 7 };

describe("HoneyChainTraceability", () => {
  let c, admin, other;

  beforeEach(async () => {
    [admin, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory("HoneyChainTraceability");
    c = await F.deploy(admin.address);
    await c.waitForDeployment();
  });

  it("creates a batch (harvest) and prevents duplicates", async () => {
    const b = id("HC-2026-0001");
    await expect(c.registerBatch(b, rec("h1"), ev("img1"), "cid-img1", now()))
      .to.emit(c, "BatchCreated");
    const got = await c.getBatch(b);
    expect(got.status).to.equal(S.HARVESTED);
    expect(got.exists).to.equal(true);
    // duplicate
    await expect(c.registerBatch(b, rec("h1"), ZERO, "", now())).to.be.revertedWith("batch: exists");
  });

  it("registers events across the chain and enforces status transitions", async () => {
    const b = id("HC-2026-0002");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    // collection can't skip to export
    await expect(c.recordExport(b, rec("x"), ZERO, "", now())).to.be.revertedWith("batch: bad status");
    await c.recordCollection(b, rec("col"), ev("col-img"), "cid-col", now());
    expect((await c.getBatch(b)).status).to.equal(S.COLLECTED);
    await c.recordLabResult(b, rec("lab"), ZERO, "", true, now());
    expect((await c.getBatch(b)).status).to.equal(S.LAB_PASSED);
    await c.recordProcessing(b, rec("proc"), ZERO, "", now());
    expect((await c.getBatch(b)).status).to.equal(S.PACKAGED);
    await c.recordExport(b, rec("exp"), ZERO, "", now());
    expect((await c.getBatch(b)).status).to.equal(S.EXPORTED);
  });

  it("blocks lab result before collection", async () => {
    const b = id("HC-2026-0003");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    await expect(c.recordLabResult(b, rec("l"), ZERO, "", true, now())).to.be.revertedWith("batch: bad status");
  });

  it("handles a LAB_FAILED batch and blocks processing", async () => {
    const b = id("HC-2026-0004");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    await c.recordCollection(b, rec("col"), ZERO, "", now());
    await c.recordLabResult(b, rec("lab"), ZERO, "", false, now());
    expect((await c.getBatch(b)).status).to.equal(S.LAB_FAILED);
    await expect(c.recordProcessing(b, rec("p"), ZERO, "", now())).to.be.revertedWith("batch: bad status");
  });

  it("prevents processing/export on unknown batch", async () => {
    const b = id("HC-DOES-NOT-EXIST");
    await expect(c.recordProcessing(b, rec("p"), ZERO, "", now())).to.be.revertedWith("batch: unknown");
  });

  it("registers evidence and detects duplicates on-chain", async () => {
    const b = id("HC-2026-0005");
    const eh = ev("shared-photo");
    await c.registerBatch(b, rec("h"), eh, "cid-shared", now());
    expect(await c.evidenceSeen(eh)).to.equal(true);
    const [reg, cid] = await c.verifyEvidence(eh);
    expect(reg).to.equal(true);
    expect(cid).to.equal("cid-shared");
    // re-registering same evidence hash on a later event keeps first CID
    await c.recordCollection(b, rec("col"), eh, "cid-different", now());
    expect(await c.evidenceCid(eh)).to.equal("cid-shared");
  });

  it("rejects unauthorized actors (role enforcement)", async () => {
    const b = id("HC-2026-0006");
    await expect(c.connect(other).registerBatch(b, rec("h"), ZERO, "", now()))
      .to.be.reverted; // AccessControlUnauthorizedAccount
  });

  it("verifies a record hash is anchored", async () => {
    const b = id("HC-2026-0007");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    await c.recordCollection(b, rec("col"), ZERO, "", now());
    expect(await c.verifyRecord(b, rec("col"))).to.equal(true);
    expect(await c.verifyRecord(b, rec("nope"))).to.equal(false);
  });

  it("returns full event history", async () => {
    const b = id("HC-2026-0008");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    await c.recordCollection(b, rec("col"), ZERO, "", now());
    const evs = await c.getBatchEvents(b);
    expect(evs.length).to.equal(2);
    expect(evs[0].eventType).to.equal("HARVEST");
    expect(evs[1].eventType).to.equal("COLLECTION");
  });

  it("records a generic (environment) event without changing status", async () => {
    const b = id("HC-2026-0009");
    await c.registerBatch(b, rec("h"), ZERO, "", now());
    await c.recordGenericEvent(b, "ENVIRONMENT", rec("env"), ZERO, "", now());
    expect((await c.getBatch(b)).status).to.equal(S.HARVESTED);
    expect(await c.getBatchEventCount(b)).to.equal(2);
  });
});
