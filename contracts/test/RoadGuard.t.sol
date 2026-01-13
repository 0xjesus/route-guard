// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RoadGuard} from "../src/RoadGuard.sol";

contract RoadGuardTest is Test {
    RoadGuard public roadGuard;

    address public owner = address(this);
    address public reporter = makeAddr("reporter");
    address public confirmer1 = makeAddr("confirmer1");
    address public confirmer2 = makeAddr("confirmer2");
    address public confirmer3 = makeAddr("confirmer3");
    address public tipper = makeAddr("tipper");

    bytes32 public reporterSecret = keccak256("my_secret_123");
    bytes32 public reporterCommitment;

    // NYC coordinates scaled by 1e8
    int64 constant NYC_LAT = 4071280000;  // 40.7128
    int64 constant NYC_LNG = -7400600000; // -74.006

    uint256 constant MIN_STAKE = 0.001 ether;

    function setUp() public {
        roadGuard = new RoadGuard();
        reporterCommitment = keccak256(abi.encodePacked(reporterSecret));

        // Fund test accounts
        vm.deal(reporter, 10 ether);
        vm.deal(confirmer1, 1 ether);
        vm.deal(confirmer2, 1 ether);
        vm.deal(confirmer3, 1 ether);
        vm.deal(tipper, 10 ether);
    }

    // ============ Submit Report Tests ============

    function test_submitReport_success() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment,
            NYC_LAT,
            NYC_LNG,
            RoadGuard.EventType.PROTEST
        );

        assertEq(reportId, 0);
        assertEq(roadGuard.reportCount(), 1);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(report.reporterCommitment, reporterCommitment);
        assertEq(report.latitude, NYC_LAT);
        assertEq(report.longitude, NYC_LNG);
        assertEq(uint8(report.eventType), uint8(RoadGuard.EventType.PROTEST));
        assertEq(uint8(report.status), uint8(RoadGuard.ReportStatus.ACTIVE));
        assertEq(report.stakeAmount, MIN_STAKE);
    }

    function test_submitReport_insufficientStake() public {
        vm.prank(reporter);
        vm.expectRevert(RoadGuard.InsufficientStake.selector);
        roadGuard.submitReport{value: 0.0001 ether}(
            reporterCommitment,
            NYC_LAT,
            NYC_LNG,
            RoadGuard.EventType.ACCIDENT
        );
    }

    function test_submitReport_invalidLatitude() public {
        vm.prank(reporter);
        vm.expectRevert(RoadGuard.InvalidLocation.selector);
        roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment,
            91e8, // Invalid: > 90
            NYC_LNG,
            RoadGuard.EventType.ACCIDENT
        );
    }

    function test_submitReport_invalidLongitude() public {
        vm.prank(reporter);
        vm.expectRevert(RoadGuard.InvalidLocation.selector);
        roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment,
            NYC_LAT,
            181e8, // Invalid: > 180
            RoadGuard.EventType.ACCIDENT
        );
    }

    function testFuzz_submitReport_validCoordinates(int64 lat, int64 lng) public {
        // Bound to valid ranges
        lat = int64(bound(int256(lat), -90e8, 90e8));
        lng = int64(bound(int256(lng), -180e8, 180e8));

        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment,
            lat,
            lng,
            RoadGuard.EventType.TRAFFIC_JAM
        );

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(report.latitude, lat);
        assertEq(report.longitude, lng);
    }

    // ============ Confirmation Tests ============

    function test_confirmReport_success() public {
        // Create report
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        // Confirm
        vm.prank(confirmer1);
        roadGuard.confirmReport(reportId);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(report.confirmationCount, 1);
        assertTrue(roadGuard.hasUserConfirmed(reportId, confirmer1));
    }

    function test_confirmReport_autoConfirmAtThreshold() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        // Three confirmations should auto-confirm
        vm.prank(confirmer1);
        roadGuard.confirmReport(reportId);
        vm.prank(confirmer2);
        roadGuard.confirmReport(reportId);
        vm.prank(confirmer3);
        roadGuard.confirmReport(reportId);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(uint8(report.status), uint8(RoadGuard.ReportStatus.CONFIRMED));

        // Stake should be returned to pending rewards
        assertEq(roadGuard.getPendingRewards(reporterCommitment), MIN_STAKE);
    }

    function test_confirmReport_cannotConfirmTwice() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        vm.prank(confirmer1);
        roadGuard.confirmReport(reportId);

        vm.prank(confirmer1);
        vm.expectRevert(RoadGuard.AlreadyConfirmed.selector);
        roadGuard.confirmReport(reportId);
    }

    // ============ Regards (Rewards) Tests ============

    function test_sendRegards_success() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.ACCIDENT
        );

        uint256 regardsAmount = 0.01 ether;
        vm.prank(tipper);
        roadGuard.sendRegards{value: regardsAmount}(reportId);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(report.totalRegards, regardsAmount);
        assertEq(roadGuard.getPendingRewards(reporterCommitment), regardsAmount);
    }

    function test_sendRegards_multipleUsers() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.ROAD_CLOSURE
        );

        vm.prank(confirmer1);
        roadGuard.sendRegards{value: 0.01 ether}(reportId);

        vm.prank(confirmer2);
        roadGuard.sendRegards{value: 0.02 ether}(reportId);

        assertEq(roadGuard.getPendingRewards(reporterCommitment), 0.03 ether);
    }

    // ============ Claim Rewards Tests ============

    function test_claimRewards_success() public {
        // Setup: submit, confirm, and get regards
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        // Get confirmations to return stake
        vm.prank(confirmer1);
        roadGuard.confirmReport(reportId);
        vm.prank(confirmer2);
        roadGuard.confirmReport(reportId);
        vm.prank(confirmer3);
        roadGuard.confirmReport(reportId);

        // Add regards
        vm.prank(tipper);
        roadGuard.sendRegards{value: 0.05 ether}(reportId);

        uint256 expectedReward = MIN_STAKE + 0.05 ether;
        assertEq(roadGuard.getPendingRewards(reporterCommitment), expectedReward);

        // Claim to a fresh address
        address recipient = makeAddr("recipient");
        uint256 balanceBefore = recipient.balance;

        roadGuard.claimRewards(reporterSecret, recipient);

        assertEq(recipient.balance, balanceBefore + expectedReward);
        assertEq(roadGuard.getPendingRewards(reporterCommitment), 0);
    }

    function test_claimRewards_noRewards() public {
        bytes32 unusedCommitment = keccak256("unused");
        vm.expectRevert(RoadGuard.NoRewardsToClaim.selector);
        roadGuard.claimRewards(keccak256("wrong"), address(this));
    }

    // ============ Slash Tests ============

    function test_slashReport_success() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        // Add some regards first
        vm.prank(tipper);
        roadGuard.sendRegards{value: 0.02 ether}(reportId);

        uint256 contractBalanceBefore = address(roadGuard).balance;

        // Owner slashes the report
        roadGuard.slashReport(reportId);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(uint8(report.status), uint8(RoadGuard.ReportStatus.SLASHED));
        assertTrue(roadGuard.slashedCommitments(reporterCommitment));

        // Rewards should be zeroed
        assertEq(roadGuard.getPendingRewards(reporterCommitment), 0);

        // Contract should still hold the funds (revenue)
        assertEq(address(roadGuard).balance, contractBalanceBefore);
    }

    function test_slashReport_preventsNewReports() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        roadGuard.slashReport(reportId);

        // Same commitment cannot submit new reports
        vm.prank(reporter);
        vm.expectRevert(RoadGuard.CommitmentSlashed.selector);
        roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.ACCIDENT
        );
    }

    // ============ Expiration Tests ============

    function test_expireReport_withConfirmations() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        // One confirmation (not enough to auto-confirm)
        vm.prank(confirmer1);
        roadGuard.confirmReport(reportId);

        // Fast forward past expiration
        vm.warp(block.timestamp + 25 hours);

        roadGuard.expireReport(reportId);

        RoadGuard.Report memory report = roadGuard.getReport(reportId);
        assertEq(uint8(report.status), uint8(RoadGuard.ReportStatus.EXPIRED));

        // Stake should be returned (had confirmations)
        assertEq(roadGuard.getPendingRewards(reporterCommitment), MIN_STAKE);
    }

    function test_expireReport_noConfirmations() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        vm.warp(block.timestamp + 25 hours);
        roadGuard.expireReport(reportId);

        // No confirmations = stake forfeited
        assertEq(roadGuard.getPendingRewards(reporterCommitment), 0);
    }

    function test_expireReport_tooEarly() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        vm.expectRevert(RoadGuard.ReportNotExpired.selector);
        roadGuard.expireReport(reportId);
    }

    // ============ Admin Tests ============

    function test_updateParams() public {
        roadGuard.updateParams(0.002 ether, 48 hours, 5);

        assertEq(roadGuard.minStake(), 0.002 ether);
        assertEq(roadGuard.reportDuration(), 48 hours);
        assertEq(roadGuard.confirmationThreshold(), 5);
    }

    function test_withdrawRevenue() public {
        // Create and slash a report to generate revenue
        vm.prank(reporter);
        roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );
        roadGuard.slashReport(0);

        address treasury = makeAddr("treasury");
        uint256 balanceBefore = treasury.balance;

        roadGuard.withdrawRevenue(treasury, MIN_STAKE);

        assertEq(treasury.balance, balanceBefore + MIN_STAKE);
    }

    // ============ Edge Cases ============

    function test_multipleReportsFromSameCommitment() public {
        vm.startPrank(reporter);

        uint256 report1 = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        uint256 report2 = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT + 1000, NYC_LNG, RoadGuard.EventType.ACCIDENT
        );

        vm.stopPrank();

        assertEq(report1, 0);
        assertEq(report2, 1);
    }

    function test_regardsToSlashedReport_reverts() public {
        vm.prank(reporter);
        uint256 reportId = roadGuard.submitReport{value: MIN_STAKE}(
            reporterCommitment, NYC_LAT, NYC_LNG, RoadGuard.EventType.PROTEST
        );

        roadGuard.slashReport(reportId);

        vm.prank(tipper);
        vm.expectRevert(RoadGuard.ReportNotActive.selector);
        roadGuard.sendRegards{value: 0.01 ether}(reportId);
    }
}
