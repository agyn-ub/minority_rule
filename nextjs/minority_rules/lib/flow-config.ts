import { config } from "@onflow/fcl";

// TypeScript interfaces
interface NetworkConfig {
  accessNode: string;
  discoveryWallet: string;
  discoveryAuthnInclude?: string[];
  contractAddress?: string;
}

interface Networks {
  [key: string]: NetworkConfig;
}

interface ContractAddresses {
  [contractName: string]: string | undefined;
}

interface EnvironmentAddresses {
  [environment: string]: ContractAddresses;
}

type FlowEnvironment = 'emulator' | 'testnet' | 'mainnet';

// Flow network configuration
const FLOW_ENV: FlowEnvironment = (process.env.NEXT_PUBLIC_FLOW_NETWORK as FlowEnvironment) || 'emulator';

// Network configurations
const networks: Networks = {
  emulator: {
    accessNode: "http://127.0.0.1:8888",
    discoveryWallet: "http://127.0.0.1:8701/fcl/authn",
    discoveryAuthnInclude: [],
    contractAddress: process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS || "0xf8d6e0586b0a20c7"
  },
  testnet: {
    accessNode: "https://rest-testnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/testnet/authn",
    discoveryAuthnInclude: [
      "0x82ec283f88a62e65", // Dapper Wallet
      "0x9d2e44203cb13051", // Blocto
      "0x5b250a8a85b44a67"  // Lilico
    ],
    contractAddress: process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS
  },
  mainnet: {
    accessNode: "https://rest-mainnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/authn",
    discoveryAuthnInclude: [
      "0x82ec283f88a62e65", // Dapper Wallet
      "0x9d2e44203cb13051", // Blocto
      "0x5b250a8a85b44a67"  // Lilico
    ],
    contractAddress: process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS
  }
};

const currentNetwork: NetworkConfig = networks[FLOW_ENV];

// Configure FCL
export const configureFlow = (): void => {
  console.log("🔧 Configuring FCL...");
  console.log("Environment:", FLOW_ENV);
  console.log("Network config:", currentNetwork);

  // Validate required configuration
  if (!currentNetwork.accessNode) {
    throw new Error("Access node URL is required for FCL configuration");
  }

  if (!currentNetwork.discoveryWallet) {
    throw new Error("Discovery wallet URL is required for FCL configuration");
  }

  // Network-specific contract addresses
  const getContractAddress = (contractName: string): string | undefined => {
    const addresses: EnvironmentAddresses = {
      emulator: {
        MinorityRuleGame: "0xf8d6e0586b0a20c7",
        FungibleToken: "0xee82856bf20e2aa6",
        FlowToken: "0x0ae53cb6e3f42a79"
      },
      testnet: {
        MinorityRuleGame: currentNetwork.contractAddress,
        FungibleToken: "0x9a0766d93b6608b7",
        FlowToken: "0x7e60df042a9c0868"
      },
      mainnet: {
        MinorityRuleGame: currentNetwork.contractAddress,
        FungibleToken: "0xf233dcee88fe0abe",
        FlowToken: "0x1654653399040a61"
      }
    };

    return addresses[FLOW_ENV]?.[contractName];
  };

  const fclConfig = {
    "accessNode.api": currentNetwork.accessNode,
    "discovery.wallet": currentNetwork.discoveryWallet,
    "discovery.authn.include": currentNetwork.discoveryAuthnInclude || [],
    "app.detail.title": "Minority Rule Game",
    "app.detail.icon": "https://fcl-discovery.onflow.org/images/blocto.png",
    "flow.network": FLOW_ENV,
    "fcl.limit": 999,
    // Contract address mappings
    "0xMinorityRuleGame": getContractAddress("MinorityRuleGame"),
    "0xFungibleToken": getContractAddress("FungibleToken"),
    "0xFlowToken": getContractAddress("FlowToken")
  };

  console.log("📡 FCL Configuration:", fclConfig);

  config(fclConfig);

  console.log("✅ FCL configured successfully");
};

// Export contract address for easy access
export const CONTRACT_ADDRESS: string | undefined = currentNetwork.contractAddress;

// Export network info
export const NETWORK: FlowEnvironment = FLOW_ENV;

// Transaction options
export const DEFAULT_TX_LIMIT: number = 999;
export const DEFAULT_TX_PAYER: undefined = undefined; // Let wallet handle