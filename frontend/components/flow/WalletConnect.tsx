'use client';

import { useFlowUser } from '@/hooks/useFlowUser';

export function WalletConnect() {
  const { user, authenticate, unauthenticate } = useFlowUser();

  const handleConnect = async () => {
    try {
      await authenticate();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await unauthenticate();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  if (user?.addr) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user.addr.slice(0, 6)}...{user.addr.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      Connect Wallet
    </button>
  );
}