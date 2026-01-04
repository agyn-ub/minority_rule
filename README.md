flow project deploy --network testnet --update
flow project deploy --network testnet

flow scripts execute cadence/scripts/GetGameInfo.cdc 55 0x206a0f93916f5d8f --network testnet

flow accounts remove-contract MinorityRuleGame --host access.devnet.nodes.onflow.org:9000 --signer nine-account 

flow accounts update-contract ./MinorityRuleGame.cdc --signer nine-account --network testnet
