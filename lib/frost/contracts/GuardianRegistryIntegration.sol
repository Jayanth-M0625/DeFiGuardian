// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GuardianRegistry
 * @notice Main security state manager for Guardian Protocol with FROST signatures.
 * Flow:
 *   ML bot detects attack → guardian-node calls initiateVote()
 *   → Guardians vote via ZK proofs (ZKVoteVerifier)
 *   → Vote passes if 7/10 approve
 *   → Guardians create FROST signature off chain
 *   → executeProposal() called with FROST signature
 *   → Signature verified on-chain via FROSTVerifier
 *   → Security action executed
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
    function verify(
        bytes32 message,
        bytes32 R,
        bytes32 z
    ) external returns (bool);
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
    mapping(bytes32 => bool) public processedProposals;

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

    // ─── Proposal Initiation ───
    
    /**
     * @notice Initiates a new voting proposal
     * @param proposalId Unique identifier (hash of attack details)
     * @param action The security action to vote on
     * @param targetAddress Address to blacklist (if action is BLACKLIST_ADDRESS)
     * @param description Human-readable description
     */
    function initiateVote(
        bytes32 proposalId,
        SecurityAction action,
        address targetAddress,
        string calldata description
    ) external {
        require(!proposals[proposalId].executed, "Proposal already exists");

        proposals[proposalId] = ProposalData({
            action: action,
            targetAddress: targetAddress,
            description: description,
            executed: false
        });

        zkVoteVerifier.createProposal(proposalId, description);
        emit ProposalInitiated(proposalId, action, description);
    }

    // ─── Proposal Execution with FROST Signature ───
    
    /**
     * @notice Executes a proposal after guardian approval
     * @dev Called after ZK vote finalizes and FROST signature is created
     * @param proposalId The proposal to execute
     * @param R FROST signature commitment point (32 bytes)
     * @param z FROST signature scalar (32 bytes)
     */
    function executeProposal(
        bytes32 proposalId,
        bytes32 R,
        bytes32 z
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
            frostVerifier.verify(proposalId, R, z),
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
            return true;

        } else {
            return false;
        }
    }

    // ─── Emergency Functions ───
    
    /**
     * @notice Emergency pause bypass - requires FROST signature without ZK vote
     * @dev Used when immediate action needed and no time for ZK voting
     */
    function emergencyPause(
        bytes32 eventId,
        bytes32 R,
        bytes32 z
    ) external {
        require(!isPaused, "Already paused");
        bytes32 message = keccak256(abi.encodePacked("EMERGENCY_PAUSE", eventId));
        require(
            frostVerifier.verify(message, R, z),
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
        return (isPaused, currentThreshold, 0);
    }
}
