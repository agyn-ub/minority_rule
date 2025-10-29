import { FlowConfig } from '@onflow/react-sdk';

export const TESTNET_CONTRACT_ADDRESS = '0x73c003cd6de60fd4';

export const flowConfig: FlowConfig = {
  'app.detail.title': 'Minority Rule Game',
  'app.detail.icon': '/logo.png',
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
  'flow.network': 'testnet',
  '0xMinorityRuleGame': TESTNET_CONTRACT_ADDRESS,
  '0xScheduledRoundHandler': TESTNET_CONTRACT_ADDRESS,
  '0xFungibleToken': '0x9a0766d93b6608b7',
  '0xFlowToken': '0x7e60df042a9c0868',
};

export const getContractAddress = (name: string): string => {
  const address = flowConfig[`0x${name}`];
  if (!address || typeof address !== 'string') {
    throw new Error(`Contract address for ${name} not found`);
  }
  return address;
};