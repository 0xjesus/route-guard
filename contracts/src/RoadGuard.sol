// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoadGuard
 * @notice Privacy-preserving road incident reporting with economic incentives
 * @dev Built for Mantle Global Hackathon 2025 - ZK & Privacy + GameFi & Social tracks
 *
 * Key Features:
 * - Anonymous reporting via stealth addresses
 * - Anti-spam stake requirement
 * - Community reward system ("Regards")
 * - Slashing mechanism for malicious reports
 */
contract RoadGuard is ReentrancyGuard, Ownable {

    // ============ Types ============

    enum EventType {
        ACCIDENT,
        ROAD_CLOSURE,
        PROTEST,
        POLICE_ACTIVITY,
        HAZARD,
        TRAFFIC_JAM
    }

    enum ReportStatus {
        ACTIVE,
        CONFIRMED,
        EXPIRED,
        SLASHED
    }

    struct Report {
        bytes32 reporterCommitment;  // Hash of reporter's secret (for anonymous reward claims)
        int64 latitude;              // Scaled by 1e8 (e.g., 40.7128 -> 4071280000)
        int64 longitude;             // Scaled by 1e8
        EventType eventType;
        ReportStatus status;
        uint64 timestamp;
        uint64 expiresAt;
        uint128 stakeAmount;
        uint128 totalRegards;
        uint32 confirmationCount;
    }

    // ============ State Variables ============

    /// @notice Minimum stake required to submit a report
    uint256 public minStake = 0.001 ether;

    /// @notice Duration before a report expires (default: 24 hours)
    uint256 public reportDuration = 24 hours;

    /// @notice Threshold for auto-confirming a report
    uint32 public confirmationThreshold = 3;

    /// @notice All reports indexed by ID
    mapping(uint256 => Report) public reports;

    /// @notice Total reports count (also serves as next ID)
    uint256 public reportCount;

    /// @notice Accumulated rewards per commitment hash
    mapping(bytes32 => uint256) public pendingRewards;

    /// @notice Track who has confirmed which reports
    mapping(uint256 => mapping(address => bool)) public hasConfirmed;

    /// @notice Track slashed commitments to prevent re-registration
    mapping(bytes32 => bool) public slashedCommitments;

    // ============ Events ============

    event ReportSubmitted(
        uint256 indexed reportId,
        bytes32 indexed reporterCommitment,
        int64 latitude,
        int64 longitude,
        EventType eventType,
        uint256 stake,
        uint64 expiresAt
    );

    event ReportConfirmed(
        uint256 indexed reportId,
        address indexed confirmer,
        uint32 newConfirmationCount
    );

    event RegardsSent(
        uint256 indexed reportId,
        address indexed sender,
        uint256 amount
    );

    event RewardsClaimed(
        bytes32 indexed commitment,
        address indexed recipient,
        uint256 amount
    );

    event ReportSlashed(
        uint256 indexed reportId,
        bytes32 indexed commitment,
        uint256 slashedAmount
    );

    event ReportExpired(uint256 indexed reportId);

    // ============ Errors ============

    error InsufficientStake();
    error InvalidLocation();
    error ReportNotFound();
    error ReportNotActive();
    error AlreadyConfirmed();
    error CannotConfirmOwnReport();
    error InvalidProof();
    error NoRewardsToClaim();
    error CommitmentSlashed();
    error ReportNotExpired();

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Core Functions ============

    /**
     * @notice Submit a new road incident report
     * @param _commitment Hash of reporter's secret (keccak256(secret))
     * @param _latitude Location latitude scaled by 1e8
     * @param _longitude Location longitude scaled by 1e8
     * @param _eventType Type of road event
     * @return reportId The ID of the created report
     */
    function submitReport(
        bytes32 _commitment,
        int64 _latitude,
        int64 _longitude,
        EventType _eventType
    ) external payable nonReentrant returns (uint256 reportId) {
        if (msg.value < minStake) revert InsufficientStake();
        if (_latitude < -90e8 || _latitude > 90e8) revert InvalidLocation();
        if (_longitude < -180e8 || _longitude > 180e8) revert InvalidLocation();
        if (slashedCommitments[_commitment]) revert CommitmentSlashed();

        reportId = reportCount++;
        uint64 expiresAt = uint64(block.timestamp + reportDuration);

        reports[reportId] = Report({
            reporterCommitment: _commitment,
            latitude: _latitude,
            longitude: _longitude,
            eventType: _eventType,
            status: ReportStatus.ACTIVE,
            timestamp: uint64(block.timestamp),
            expiresAt: expiresAt,
            stakeAmount: uint128(msg.value),
            totalRegards: 0,
            confirmationCount: 0
        });

        emit ReportSubmitted(
            reportId,
            _commitment,
            _latitude,
            _longitude,
            _eventType,
            msg.value,
            expiresAt
        );
    }

    /**
     * @notice Confirm a report is accurate (community validation)
     * @param _reportId The report to confirm
     */
    function confirmReport(uint256 _reportId) external nonReentrant {
        Report storage report = reports[_reportId];
        if (report.timestamp == 0) revert ReportNotFound();
        if (report.status != ReportStatus.ACTIVE) revert ReportNotActive();
        if (hasConfirmed[_reportId][msg.sender]) revert AlreadyConfirmed();

        hasConfirmed[_reportId][msg.sender] = true;
        report.confirmationCount++;

        // Auto-confirm if threshold reached
        if (report.confirmationCount >= confirmationThreshold) {
            report.status = ReportStatus.CONFIRMED;
            // Return stake + bonus to reporter's pending rewards
            uint256 stakeReturn = report.stakeAmount;
            pendingRewards[report.reporterCommitment] += stakeReturn;
        }

        emit ReportConfirmed(_reportId, msg.sender, report.confirmationCount);
    }

    /**
     * @notice Send a "regards" reward to a helpful report
     * @param _reportId The report to reward
     */
    function sendRegards(uint256 _reportId) external payable nonReentrant {
        if (msg.value == 0) revert InsufficientStake();

        Report storage report = reports[_reportId];
        if (report.timestamp == 0) revert ReportNotFound();
        if (report.status == ReportStatus.SLASHED) revert ReportNotActive();

        report.totalRegards += uint128(msg.value);
        pendingRewards[report.reporterCommitment] += msg.value;

        emit RegardsSent(_reportId, msg.sender, msg.value);
    }

    /**
     * @notice Claim accumulated rewards by revealing the commitment secret
     * @param _secret The secret whose hash was used as commitment
     * @param _recipient Address to receive the rewards
     */
    function claimRewards(bytes32 _secret, address _recipient) external nonReentrant {
        bytes32 commitment = keccak256(abi.encodePacked(_secret));

        if (slashedCommitments[commitment]) revert CommitmentSlashed();

        uint256 amount = pendingRewards[commitment];
        if (amount == 0) revert NoRewardsToClaim();

        pendingRewards[commitment] = 0;

        (bool success, ) = _recipient.call{value: amount}("");
        require(success, "Transfer failed");

        emit RewardsClaimed(commitment, _recipient, amount);
    }

    /**
     * @notice Mark a report as expired and return stake if confirmed
     * @param _reportId The report to expire
     */
    function expireReport(uint256 _reportId) external nonReentrant {
        Report storage report = reports[_reportId];
        if (report.timestamp == 0) revert ReportNotFound();
        if (report.status != ReportStatus.ACTIVE) revert ReportNotActive();
        if (block.timestamp < report.expiresAt) revert ReportNotExpired();

        report.status = ReportStatus.EXPIRED;

        // If report had some confirmations but didn't reach threshold,
        // still return the stake (benefit of the doubt)
        if (report.confirmationCount > 0) {
            pendingRewards[report.reporterCommitment] += report.stakeAmount;
        }
        // If zero confirmations, stake is forfeited (lazy spam protection)

        emit ReportExpired(_reportId);
    }

    // ============ Admin Functions ============

    /**
     * @notice Slash a malicious report (governance action)
     * @param _reportId The report to slash
     */
    function slashReport(uint256 _reportId) external onlyOwner {
        Report storage report = reports[_reportId];
        if (report.timestamp == 0) revert ReportNotFound();
        if (report.status == ReportStatus.SLASHED) revert ReportNotActive();

        report.status = ReportStatus.SLASHED;
        slashedCommitments[report.reporterCommitment] = true;

        // Stake is forfeited (remains in contract as protocol revenue)
        uint256 slashedAmount = report.stakeAmount;

        // Also forfeit any pending rewards for this commitment
        uint256 forfeitedRewards = pendingRewards[report.reporterCommitment];
        pendingRewards[report.reporterCommitment] = 0;

        emit ReportSlashed(_reportId, report.reporterCommitment, slashedAmount + forfeitedRewards);
    }

    /**
     * @notice Update protocol parameters
     */
    function updateParams(
        uint256 _minStake,
        uint256 _reportDuration,
        uint32 _confirmationThreshold
    ) external onlyOwner {
        minStake = _minStake;
        reportDuration = _reportDuration;
        confirmationThreshold = _confirmationThreshold;
    }

    /**
     * @notice Withdraw protocol revenue (slashed stakes)
     */
    function withdrawRevenue(address _to, uint256 _amount) external onlyOwner {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");
    }

    // ============ View Functions ============

    /**
     * @notice Get report details
     */
    function getReport(uint256 _reportId) external view returns (Report memory) {
        return reports[_reportId];
    }

    /**
     * @notice Check pending rewards for a commitment
     */
    function getPendingRewards(bytes32 _commitment) external view returns (uint256) {
        return pendingRewards[_commitment];
    }

    /**
     * @notice Check if an address has confirmed a report
     */
    function hasUserConfirmed(uint256 _reportId, address _user) external view returns (bool) {
        return hasConfirmed[_reportId][_user];
    }
}
