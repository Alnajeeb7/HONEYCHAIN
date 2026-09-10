// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title HoneyChainTraceability
 * @notice Integrity anchor for the HoneyChain farm-to-jar supply chain.
 *
 * DESIGN PRINCIPLES
 *  - The blockchain stores ONLY proofs of authenticity: batch identity, event
 *    type, a canonical recordHash, an optional evidenceHash + IPFS CID, actor,
 *    timestamp and status. It NEVER stores images, PII, lab measurements or
 *    full form data — those live off-chain in the application database / IPFS.
 *  - A backend service wallet submits all transactions. Consumers and operators
 *    are NOT required to hold wallets; app identity stays separate from
 *    blockchain identity.
 *  - Status transitions are enforced on-chain so an out-of-order or illegal
 *    step is rejected by the contract, not just the UI.
 */
contract HoneyChainTraceability is AccessControl {
    // --- Roles ------------------------------------------------------------
    bytes32 public constant BEEKEEPER_ROLE = keccak256("BEEKEEPER_ROLE");
    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
    bytes32 public constant LAB_ROLE = keccak256("LAB_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant EXPORTER_ROLE = keccak256("EXPORTER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // --- Status lifecycle -------------------------------------------------
    // Kept in lock-step with the application's STAGE_ORDER.
    enum Status {
        NONE,        // 0 - batch does not exist
        HARVESTED,   // 1 - beekeeper created the batch
        COLLECTED,   // 2 - wild-honey collector received it
        LAB_PASSED,  // 3 - laboratory PASS
        LAB_FAILED,  // 4 - laboratory FAIL (terminal)
        PROCESSED,   // 5 - processed (intermediate, optional)
        PACKAGED,    // 6 - packaged, consumer product/QR generated
        EXPORTED     // 7 - export compliance certified (terminal)
    }

    struct Batch {
        bytes32 batchIdHash;   // keccak256 of the human-readable batch ID
        bytes32 recordHash;    // canonical SHA-256 of the creating (harvest) record
        Status status;
        address creator;
        uint64 createdAt;
        uint32 eventCount;
        bool exists;
    }

    struct SupplyChainEvent {
        bytes32 recordHash;    // canonical SHA-256 of the off-chain record
        bytes32 evidenceHash;  // SHA-256 of evidence file (0x0 if none)
        string eventType;      // "HARVEST" | "COLLECTION" | "LAB" | ...
        string ipfsCid;        // evidence CID (empty if none)
        address actor;         // service wallet that submitted the tx
        uint64 timestamp;      // off-chain event timestamp (unix seconds)
        Status statusAfter;    // batch status after this event
    }

    // batchIdHash => batch
    mapping(bytes32 => Batch) private batches;
    // batchIdHash => events
    mapping(bytes32 => SupplyChainEvent[]) private batchEvents;
    // evidenceHash => already registered (duplicate detection on-chain)
    mapping(bytes32 => bool) public evidenceSeen;
    // evidenceHash => ipfs cid (first registration wins)
    mapping(bytes32 => string) public evidenceCid;

    // --- Events -----------------------------------------------------------
    event BatchCreated(bytes32 indexed batchIdHash, bytes32 recordHash, address indexed actor, uint64 timestamp);
    event HarvestRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, uint64 timestamp);
    event CollectionRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, uint64 timestamp);
    event LabResultRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, bool passed, uint64 timestamp);
    event ProcessingRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, uint64 timestamp);
    event PackagingRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, uint64 timestamp);
    event ExportRecorded(bytes32 indexed batchIdHash, bytes32 recordHash, uint64 timestamp);
    event EvidenceRegistered(bytes32 indexed batchIdHash, bytes32 indexed evidenceHash, string ipfsCid, uint64 timestamp);
    event GenericEventRecorded(bytes32 indexed batchIdHash, string eventType, bytes32 recordHash, uint64 timestamp);

    constructor(address admin) {
        address root = admin == address(0) ? msg.sender : admin;
        _grantRole(DEFAULT_ADMIN_ROLE, root);
        // The deployer/service wallet gets every operational role so a single
        // backend wallet can drive the whole chain in dev/testnet. In
        // production these can be split across distinct wallets.
        _grantRole(BEEKEEPER_ROLE, root);
        _grantRole(COLLECTOR_ROLE, root);
        _grantRole(LAB_ROLE, root);
        _grantRole(PROCESSOR_ROLE, root);
        _grantRole(EXPORTER_ROLE, root);
        _grantRole(AUDITOR_ROLE, root);
    }

    // --- Internal helpers -------------------------------------------------
    function _push(
        bytes32 idHash,
        string memory eventType,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string memory ipfsCid,
        uint64 timestamp,
        Status statusAfter
    ) internal {
        batchEvents[idHash].push(SupplyChainEvent({
            recordHash: recordHash,
            evidenceHash: evidenceHash,
            eventType: eventType,
            ipfsCid: ipfsCid,
            actor: msg.sender,
            timestamp: timestamp,
            statusAfter: statusAfter
        }));
        Batch storage b = batches[idHash];
        b.status = statusAfter;
        b.eventCount += 1;
        if (evidenceHash != bytes32(0) && !evidenceSeen[evidenceHash]) {
            evidenceSeen[evidenceHash] = true;
            evidenceCid[evidenceHash] = ipfsCid;
            emit EvidenceRegistered(idHash, evidenceHash, ipfsCid, timestamp);
        }
        emit GenericEventRecorded(idHash, eventType, recordHash, timestamp);
    }

    function _require(bytes32 idHash, Status expected) internal view {
        require(batches[idHash].exists, "batch: unknown");
        require(batches[idHash].status == expected, "batch: bad status");
    }

    // --- Batch creation (Harvest) ----------------------------------------
    function registerBatch(
        bytes32 batchIdHash,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        uint64 timestamp
    ) external onlyRole(BEEKEEPER_ROLE) {
        require(!batches[batchIdHash].exists, "batch: exists"); // duplicate prevention
        batches[batchIdHash] = Batch({
            batchIdHash: batchIdHash,
            recordHash: recordHash,
            status: Status.HARVESTED,
            creator: msg.sender,
            createdAt: timestamp,
            eventCount: 0,
            exists: true
        });
        _push(batchIdHash, "HARVEST", recordHash, evidenceHash, ipfsCid, timestamp, Status.HARVESTED);
        emit BatchCreated(batchIdHash, recordHash, msg.sender, timestamp);
        emit HarvestRecorded(batchIdHash, recordHash, timestamp);
    }

    // --- Collection -------------------------------------------------------
    function recordCollection(
        bytes32 batchIdHash,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        uint64 timestamp
    ) external onlyRole(COLLECTOR_ROLE) {
        _require(batchIdHash, Status.HARVESTED);
        _push(batchIdHash, "COLLECTION", recordHash, evidenceHash, ipfsCid, timestamp, Status.COLLECTED);
        emit CollectionRecorded(batchIdHash, recordHash, timestamp);
    }

    // --- Laboratory result (PASS / FAIL) ---------------------------------
    function recordLabResult(
        bytes32 batchIdHash,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        bool passed,
        uint64 timestamp
    ) external onlyRole(LAB_ROLE) {
        _require(batchIdHash, Status.COLLECTED);
        Status next = passed ? Status.LAB_PASSED : Status.LAB_FAILED;
        _push(batchIdHash, passed ? "LAB_PASSED" : "LAB_FAILED", recordHash, evidenceHash, ipfsCid, timestamp, next);
        emit LabResultRecorded(batchIdHash, recordHash, passed, timestamp);
    }

    // --- Processing & packaging ------------------------------------------
    // Mirrors the app: a lab-passed batch is processed + packaged in one step,
    // landing in PACKAGED. recordHash covers the whole processing record.
    function recordProcessing(
        bytes32 batchIdHash,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        uint64 timestamp
    ) external onlyRole(PROCESSOR_ROLE) {
        _require(batchIdHash, Status.LAB_PASSED);
        _push(batchIdHash, "PROCESSED", recordHash, evidenceHash, ipfsCid, timestamp, Status.PROCESSED);
        emit ProcessingRecorded(batchIdHash, recordHash, timestamp);
        _push(batchIdHash, "PACKAGED", recordHash, bytes32(0), "", timestamp, Status.PACKAGED);
        emit PackagingRecorded(batchIdHash, recordHash, timestamp);
    }

    // --- Export compliance ------------------------------------------------
    function recordExport(
        bytes32 batchIdHash,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        uint64 timestamp
    ) external onlyRole(EXPORTER_ROLE) {
        _require(batchIdHash, Status.PACKAGED);
        _push(batchIdHash, "EXPORTED", recordHash, evidenceHash, ipfsCid, timestamp, Status.EXPORTED);
        emit ExportRecorded(batchIdHash, recordHash, timestamp);
    }

    // --- Generic / auxiliary event (e.g. environment reading) ------------
    // Does not change batch status; requires the batch to exist.
    function recordGenericEvent(
        bytes32 batchIdHash,
        string calldata eventType,
        bytes32 recordHash,
        bytes32 evidenceHash,
        string calldata ipfsCid,
        uint64 timestamp
    ) external onlyRole(AUDITOR_ROLE) {
        require(batches[batchIdHash].exists, "batch: unknown");
        Status current = batches[batchIdHash].status;
        _push(batchIdHash, eventType, recordHash, evidenceHash, ipfsCid, timestamp, current);
    }

    // --- Views ------------------------------------------------------------
    function getBatch(bytes32 batchIdHash)
        external
        view
        returns (bytes32 recordHash, Status status, address creator, uint64 createdAt, uint32 eventCount, bool exists)
    {
        Batch storage b = batches[batchIdHash];
        return (b.recordHash, b.status, b.creator, b.createdAt, b.eventCount, b.exists);
    }

    function getBatchEventCount(bytes32 batchIdHash) external view returns (uint256) {
        return batchEvents[batchIdHash].length;
    }

    function getBatchEvent(bytes32 batchIdHash, uint256 index)
        external
        view
        returns (SupplyChainEvent memory)
    {
        require(index < batchEvents[batchIdHash].length, "event: oob");
        return batchEvents[batchIdHash][index];
    }

    function getBatchEvents(bytes32 batchIdHash) external view returns (SupplyChainEvent[] memory) {
        return batchEvents[batchIdHash];
    }

    // --- Verification -----------------------------------------------------
    // Recompute-and-compare is done off-chain; these helpers let the backend
    // (or anyone) confirm a hash is anchored on-chain.

    /// @notice True if the given recordHash matches ANY event on the batch.
    function verifyRecord(bytes32 batchIdHash, bytes32 recordHash) external view returns (bool) {
        SupplyChainEvent[] storage evs = batchEvents[batchIdHash];
        for (uint256 i = 0; i < evs.length; i++) {
            if (evs[i].recordHash == recordHash) return true;
        }
        return false;
    }

    /// @notice True if the evidence hash was registered; also returns its CID.
    function verifyEvidence(bytes32 evidenceHash) external view returns (bool registered, string memory cid) {
        return (evidenceSeen[evidenceHash], evidenceCid[evidenceHash]);
    }
}
