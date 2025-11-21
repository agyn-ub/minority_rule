import { FlowConfig } from '@onflow/react-sdk';

// Get current network from environment
const NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet';

// Network-specific contract addresses
const getContractAddress = (network: string): string => {
  switch (network) {
    case 'mainnet':
      return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET || '';
    case 'emulator':
      return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_EMULATOR || '0xf8d6e0586b0a20c7';
    case 'testnet':
    default:
      return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET || 
             process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 
             '0xf63159eb10f911cd';
  }
};

// Network-specific core contract addresses
const getCoreAddresses = (network: string) => {
  switch (network) {
    case 'mainnet':
      return {
        FungibleToken: process.env.NEXT_PUBLIC_FUNGIBLE_TOKEN_MAINNET || '0xf233dcee88fe0abe',
        FlowToken: process.env.NEXT_PUBLIC_FLOW_TOKEN_MAINNET || '0x1654653399040a61',
        accessNode: process.env.NEXT_PUBLIC_ACCESS_NODE_MAINNET || 'https://rest-mainnet.onflow.org',
        discovery: process.env.NEXT_PUBLIC_DISCOVERY_MAINNET || 'https://fcl-discovery.onflow.org/authn'
      };
    case 'emulator':
      return {
        FungibleToken: process.env.NEXT_PUBLIC_FUNGIBLE_TOKEN_EMULATOR || '0xee82856bf20e2aa6',
        FlowToken: process.env.NEXT_PUBLIC_FLOW_TOKEN_EMULATOR || '0x0ae53cb6e3f42a79',
        accessNode: process.env.NEXT_PUBLIC_ACCESS_NODE_EMULATOR || 'http://localhost:8888',
        discovery: process.env.NEXT_PUBLIC_DISCOVERY_EMULATOR || 'http://localhost:8701/fcl/authn'
      };
    case 'testnet':
    default:
      return {
        FungibleToken: process.env.NEXT_PUBLIC_FUNGIBLE_TOKEN_TESTNET || '0x9a0766d93b6608b7',
        FlowToken: process.env.NEXT_PUBLIC_FLOW_TOKEN_TESTNET || '0x7e60df042a9c0868',
        accessNode: process.env.NEXT_PUBLIC_ACCESS_NODE_TESTNET || 'https://rest-testnet.onflow.org',
        discovery: process.env.NEXT_PUBLIC_DISCOVERY_TESTNET || 'https://fcl-discovery.onflow.org/testnet/authn'
      };
  }
};

// Get addresses for current network
const CONTRACT_ADDRESS = getContractAddress(NETWORK);
const CORE_ADDRESSES = getCoreAddresses(NETWORK);

// Validate that we have a contract address
if (!CONTRACT_ADDRESS) {
  throw new Error(`Contract address not configured for network: ${NETWORK}`);
}

export const flowConfig: FlowConfig = {
  'app.detail.title': 'Minority Rule Game',
  'app.detail.icon': '/logo.png',
  'accessNode.api': CORE_ADDRESSES.accessNode,
  'discovery.wallet': CORE_ADDRESSES.discovery,
  'flow.network': NETWORK,
  '0xMinorityRuleGame': CONTRACT_ADDRESS,
  '0xScheduledRoundHandler': CONTRACT_ADDRESS,
  '0xFungibleToken': CORE_ADDRESSES.FungibleToken,
  '0xFlowToken': CORE_ADDRESSES.FlowToken,
};

// Export utilities
export const getMinorityRuleGameAddress = (): string => CONTRACT_ADDRESS;
export const getCurrentNetwork = (): string => NETWORK;
export const getFlowConfig = () => flowConfig;