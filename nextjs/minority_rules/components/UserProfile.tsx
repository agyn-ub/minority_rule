"use client";

import { useState, useRef, useEffect } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import * as fcl from "@onflow/fcl";

export default function UserProfile() {
  const { user, unauthenticate } = useFlowCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch user's FLOW balance
  const fetchBalance = async () => {
    if (!user?.addr) return;
    
    setIsLoadingBalance(true);
    try {
      const balanceScript = `
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868

        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultRef = account.capabilities
            .borrow<&FlowToken.Vault>(/public/flowTokenBalance)
            ?? panic("Could not borrow Balance reference to the Vault")
          return vaultRef.balance
        }
      `;
      
      const balance = await fcl.query({
        cadence: balanceScript,
        args: (arg: any, t: any) => [arg(user.addr, t.Address)],
      });
      
      setBalance(parseFloat(balance).toFixed(4));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('--');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch balance when dropdown opens
  useEffect(() => {
    if (isOpen && user?.addr && !balance) {
      fetchBalance();
    }
  }, [isOpen, user?.addr]);

  // Generate avatar style based on address (neutral colors only)
  const generateAvatarColor = (address: string) => {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use neutral colors only
    const colors = [
      'bg-muted-foreground',
      'bg-foreground',
      'bg-muted-foreground/80',
      'bg-foreground/80'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Get initials from address
  const getInitials = (address: string) => {
    if (!address) return '?';
    return address.slice(2, 4).toUpperCase(); // Take first 2 chars after '0x'
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address || address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!user?.addr) return;
    
    try {
      await navigator.clipboard.writeText(user.addr);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Handle disconnect with confirmation
  const handleDisconnect = () => {
    const confirmed = window.confirm('Are you sure you want to disconnect your wallet?');
    if (confirmed) {
      unauthenticate();
      setIsOpen(false);
    }
  };

  if (!user?.loggedIn || !user?.addr) {
    return null;
  }

  const avatarColor = generateAvatarColor(user.addr);
  const initials = getInitials(user.addr);
  const formattedAddress = formatAddress(user.addr);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-background border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
      >
        {/* Avatar */}
        <div className={`w-8 h-8 ${avatarColor} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
          {initials}
        </div>
        
        {/* User Info */}
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-foreground">
            {formattedAddress}
          </div>
          <div className="text-xs text-gray-500">
            Connected
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-80 w-screen max-w-sm bg-background rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground mb-1">
                  Flow Wallet Connected
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600 flex-1 truncate">
                    {user.addr}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    title="Copy address"
                  >
                    {showCopySuccess ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Balance Section */}
            <div className="py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">FLOW Balance</div>
                  <div className="text-xs text-gray-500">Flow Token</div>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {isLoadingBalance ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      ) : (
                        `${balance || '--'} FLOW`
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Testnet</div>
                  </div>
                  {!isLoadingBalance && (
                    <button
                      onClick={fetchBalance}
                      className="text-xs text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title="Refresh balance"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="py-3 space-y-1">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Quick Actions
              </h4>
              <Link
                href="/my-games"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-foreground rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>My Games</span>
              </Link>
              <Link
                href="/create"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-foreground rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Game</span>
              </Link>
              <Link
                href="/games"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-foreground rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Browse Games</span>
              </Link>
            </div>

            {/* Disconnect */}
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}