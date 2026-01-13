// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RoadGuard} from "../src/RoadGuard.sol";

/**
 * @title DeployScript
 * @notice Deployment script for RoadGuard on Mantle Mainnet
 *
 * Usage:
 *   cd contracts
 *   forge script script/Deploy.s.sol --rpc-url mantle --broadcast --verify -vvv
 */
contract DeployScript is Script {
    function run() public {
        // Load private key from environment (reads from root .env)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("");
        console2.log("==============================================");
        console2.log("   ROADGUARD - MANTLE MAINNET DEPLOYMENT");
        console2.log("==============================================");
        console2.log("");
        console2.log("Network:  Mantle Mainnet (Chain ID: 5000)");
        console2.log("Deployer:", deployer);
        console2.log("Balance: ", deployer.balance / 1e18, "MNT");
        console2.log("");
        console2.log("----------------------------------------------");

        require(deployer.balance > 0, "Deployer has no MNT!");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy RoadGuard
        RoadGuard roadGuard = new RoadGuard();

        vm.stopBroadcast();

        // Log deployment info
        console2.log("");
        console2.log("==============================================");
        console2.log("   DEPLOYMENT SUCCESSFUL!");
        console2.log("==============================================");
        console2.log("");
        console2.log("Contract Address:", address(roadGuard));
        console2.log("Owner:           ", roadGuard.owner());
        console2.log("Min Stake:       ", roadGuard.minStake() / 1e15, "finney");
        console2.log("");
        console2.log("----------------------------------------------");
        console2.log("");
        console2.log("NEXT STEPS:");
        console2.log("1. Update .env: NEXT_PUBLIC_ROADGUARD_ADDRESS=", address(roadGuard));
        console2.log("2. Verify on Mantlescan");
        console2.log("3. Test with a small report");
        console2.log("");
        console2.log("==============================================");
    }
}
