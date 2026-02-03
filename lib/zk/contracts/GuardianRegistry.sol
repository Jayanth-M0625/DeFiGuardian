// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GuardianRegistry
 * @notice Main security state manager for Guardian Protocol.
 *
 * Responsibilities:
 *   1. Manages security state (paused, active, monitoring)
 *   2. Creates voting proposals when ML bot flags attacks
 *   3. Listens for ZKVoteVerifier.ProposalFinalized events
 *   4. Emits FROSTSigningRequired event when vote passes
 *   5. Executes security actions after FROST signature verified
 *   6. Receives cross-chain security messages via LayerZero
 *
 * Integration Flow:
 *   ML bot detects attack → guardian-node calls initiateVote()
 *   → createProposal() in ZKVoteVerifier
 *   → Guardians vote via ZK proofs
 *   → ZKVoteVerifier emits ProposalFinalized
 *   → executeProposal() called with FROST signature
 *   → Security action executed (pause, blacklist, etc.)
 */

interface IZKVoteVerifier {
    function createProposal(bytes32 proposalId, string calldata description) external;
    function getProposalState(bytes32 proposalId) external view returns (
        uint8 commitCount,
        uint8 revealCount,
        uint8 approvals,
        uint8 rejections,
        uint8 abstentions,
        bool finalized
    );
}

interface IFROSTVerifier {
    function verify(bytes32 message, bytes calldata signature) external view returns (bool);
}

contract GuardianRegistry {

    // ─── Events ───
    event ProposalInitiated(bytes32 indexed proposalId, SecurityAction action, string description);
    event FROSTSigningRequired(bytes32 indexed proposalId, SecurityAction action);
    event SecurityActionExecuted(bytes32 indexed proposalId, SecurityAction action, bool success);
    event Paused(bytes32 indexed eventId, string reason);
    event Unpaused(bytes32 indexed eventId);
    event AddressBlacklisted(address indexed target, bytes32 indexed eventId);
    event ThresholdIncreased(uint8 oldThreshold, uint8 newThreshold, bytes32 indexed eventId);

    // ─── Enums ───
    enum SecurityAction {
        EMERGENCY_PAUSE,
        BLACKLIST_ADDRESS,
        THRESHOLD_INCREASE,
        MONITOR_ONLY,
        UNPAUSE
    }

    // ─── State ───
    IZKVoteVerifier public zkVoteVerifier;
    IFROSTVerifier public frostVerifier;
    
    bool public isPaused;
    uint8 public currentThreshold;                     // starts at 7, can increase to 8, 9
    mapping(address => bool) public blacklistedAddresses;
    mapping(bytes32 => bool) public processedProposals; // prevent duplicate execution

    // Proposal details
    struct ProposalData {
        SecurityAction action;
        address targetAddress;                         // for BLACKLIST_ADDRESS
        string description;
        bool executed;
    }
    mapping(bytes32 => ProposalData) public proposals;

    // ─── Modifiers ───
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(isPaused, "Contract is not paused");
        _;
    }

    // ─── Constructor ───
    constructor(
        address _zkVoteVerifier,
        address _frostVerifier,
        uint8 _initialThreshold
    ) {
        zkVoteVerifier = IZKVoteVerifier(_zkVoteVerifier);
        frostVerifier = IFROSTVerifier(_frostVerifier);
        currentThreshold = _initialThreshold;
    }

    // ─── Proposal Initiation (called by guardian-node when ML bot flags attack) ───
    /**
     * @notice Initiates a new voting proposal.
     * @dev Called by guardian-node off-chain after ML detection or manual guardian decision.
     *      Anyone can call this (permissionless) but requires guardian vote to execute.
     * @param proposalId Unique identifier (typically hash of attack details).
     * @param action The security action to vote on.
     * @param targetAddress Address to blacklist (if action is BLACKLIST_ADDRESS).
     * @param description Human-readable description for guardians.
     */
    function initiateVote(
        bytes32 proposalId,
        SecurityAction action,
        address targetAddress,
        string calldata description
    ) external {
        require(!proposals[proposalId].executed, "Proposal already exists");

        // Store proposal details
        proposals[proposalId] = ProposalData({
            action: action,
            targetAddress: targetAddress,
            description: description,
            executed: false
        });

        // Create ZK voting proposal
        zkVoteVerifier.createProposal(proposalId, description);

        emit ProposalInitiated(proposalId, action, description);
    }

    // ─── Proposal Execution (after ZK vote finalized + FROST signature) ───
    /**
     * @notice Executes a proposal after guardian approval.
     * @dev Called by any guardian after ZK vote finalizes and FROST signature is created.
     * @param proposalId The proposal to execute.
     * @param frostSignature Aggregated FROST signature from 7+ guardians.
     */
    function executeProposal(
        bytes32 proposalId,
        bytes calldata frostSignature
    ) external {
        ProposalData storage p = proposals[proposalId];
        require(!p.executed, "Proposal already executed");
        require(!processedProposals[proposalId], "Proposal already processed");

        // ─── Verify ZK vote passed ───
        (,, uint8 approvals,,, bool finalized) = zkVoteVerifier.getProposalState(proposalId);
        require(finalized, "Proposal not finalized");
        require(approvals >= currentThreshold, "Threshold not reached");

        // ─── Verify FROST signature ───
        require(
            frostVerifier.verify(proposalId, frostSignature),
            "Invalid FROST signature"
        );

        // ─── Mark as processed ───
        p.executed = true;
        processedProposals[proposalId] = true;

        // ─── Execute action ───
        bool success = _executeAction(proposalId, p.action, p.targetAddress);

        emit SecurityActionExecuted(proposalId, p.action, success);
    }

    // ─── Internal Action Execution ───
    function _executeAction(
        bytes32 proposalId,
        SecurityAction action,
        address targetAddress
    ) internal returns (bool) {
        if (action == SecurityAction.EMERGENCY_PAUSE) {
            require(!isPaused, "Already paused");
            isPaused = true;
            emit Paused(proposalId, proposals[proposalId].description);
            return true;

        } else if (action == SecurityAction.UNPAUSE) {
            require(isPaused, "Not paused");
            isPaused = false;
            emit Unpaused(proposalId);
            return true;

        } else if (action == SecurityAction.BLACKLIST_ADDRESS) {
            require(targetAddress != address(0), "Invalid address");
            require(!blacklistedAddresses[targetAddress], "Already blacklisted");
            blacklistedAddresses[targetAddress] = true;
            emit AddressBlacklisted(targetAddress, proposalId);
            return true;

        } else if (action == SecurityAction.THRESHOLD_INCREASE) {
            require(currentThreshold < 10, "Already at max threshold");
            uint8 oldThreshold = currentThreshold;
            currentThreshold++;
            emit ThresholdIncreased(oldThreshold, currentThreshold, proposalId);
            return true;

        } else if (action == SecurityAction.MONITOR_ONLY) {
            // No on-chain action — guardian-nodes increase monitoring sensitivity off-chain
            return true;

        } else {
            return false;
        }
    }

    // ─── Emergency Functions (for use when threshold increased to 9 or 10) ───
    /**
     * @notice Emergency pause bypass — requires threshold signature without ZK vote.
     * @dev Used when immediate action needed and no time for ZK voting ceremony.
     */
    function emergencyPause(
        bytes32 eventId,
        bytes calldata frostSignature
    ) external {
        require(!isPaused, "Already paused");
        require(
            frostVerifier.verify(keccak256(abi.encodePacked("EMERGENCY_PAUSE", eventId)), frostSignature),
            "Invalid FROST signature"
        );

        isPaused = true;
        emit Paused(eventId, "Emergency pause");
    }

    // ─── Views ───
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }

    function getProposalDetails(bytes32 proposalId) external view returns (
        SecurityAction action,
        address targetAddress,
        string memory description,
        bool executed
    ) {
        ProposalData storage p = proposals[proposalId];
        return (p.action, p.targetAddress, p.description, p.executed);
    }

    function getSecurityState() external view returns (
        bool paused,
        uint8 threshold,
        uint256 proposalCount
    ) {
        // proposalCount would need a counter if we want to track it
        // For now, return 0 as placeholder
        return (isPaused, currentThreshold, 0);
    }
}
