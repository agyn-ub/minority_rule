import flowJSON from '../../flow.json';

// Type for the flow.json structure
interface FlowContract {
  source: string;
  aliases: {
    testing?: string;
    testnet?: string;
    mainnet?: string;
    emulator?: string;
  };
}

interface FlowJSON {
  contracts: {
    [key: string]: FlowContract;
  };
  dependencies?: {
    [key: string]: {
      source: string;
      hash: string;
      aliases: {
        [network: string]: string;
      };
    };
  };
}

// Get contract address for a specific network
export function getContractAddress(contractName: string, network: 'testnet' | 'mainnet' | 'emulator' = 'testnet'): string {
  const typedFlowJSON = flowJSON as FlowJSON;
  const contract = typedFlowJSON.contracts[contractName];
  
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in flow.json`);
  }
  
  const address = contract.aliases[network];
  if (!address) {
    throw new Error(`No ${network} address found for contract ${contractName}`);
  }
  
  return `0x${address}`;
}

// Get MinorityRuleGame contract address for current network
export function getMinorityRuleGameAddress(network: 'testnet' | 'mainnet' | 'emulator' = 'testnet'): string {
  return getContractAddress('MinorityRuleGame', network);
}

// Replace contract addresses in cadence code
export function replaceContractAddresses(cadence: string, network: 'testnet' | 'mainnet' | 'emulator' = 'testnet'): string {
  const typedFlowJSON = flowJSON as FlowJSON;
  let updatedCadence = cadence;
  
  // Replace all contract addresses from contracts section
  Object.keys(typedFlowJSON.contracts).forEach(contractName => {
    const address = getContractAddress(contractName, network);
    updatedCadence = updatedCadence.replace(new RegExp(`0x${contractName}`, 'g'), address);
  });
  
  // Replace dependencies (like FungibleToken, FlowToken, etc.)
  if (typedFlowJSON.dependencies) {
    Object.keys(typedFlowJSON.dependencies).forEach(contractName => {
      const contract = typedFlowJSON.dependencies![contractName];
      const address = contract.aliases[network];
      if (address) {
        updatedCadence = updatedCadence.replace(new RegExp(`0x${contractName}`, 'g'), `0x${address}`);
      }
    });
  }
  
  return updatedCadence;
}