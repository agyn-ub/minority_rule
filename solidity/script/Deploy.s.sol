// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {MinorityRuleGame} from "../src/MinorityRuleGame.sol";

contract DeployScript is Script {
    function run() external returns (MinorityRuleGame) {
        // Get deployer's private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get platform fee recipient address (defaults to deployer if not set)
        address platformRecipient = vm.envOr("PLATFORM_RECIPIENT", vm.addr(deployerPrivateKey));

        console.log("Deploying MinorityRuleGame...");
        console.log("Platform Fee Recipient:", platformRecipient);

        vm.startBroadcast(deployerPrivateKey);

        MinorityRuleGame game = new MinorityRuleGame(platformRecipient);

        vm.stopBroadcast();

        console.log("MinorityRuleGame deployed to:", address(game));
        console.log("Platform Fee: 2%");
        console.log("Next Game ID:", game.nextGameId());

        return game;
    }
}
