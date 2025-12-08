'use client';

import { useState } from 'react';
import { useFlowMutate, useFlowConfig } from '@onflow/react-sdk';
import { CREATE_GAME } from '../transactions/createGame';

const CONTRACT_ADDRESSES: Record<string, Record<string, string>> = {
  testnet: {
    MinorityRuleGame: "0x206a0f93916f5d8f",
    FungibleToken: "0x9a0766d93b6608b7",
    FlowToken: "0x7e60df042a9c0868",
  },
  mainnet: {
    MinorityRuleGame: "0x1654653399040a61", // You'll need to update this when deployed to mainnet
    FungibleToken: "0xf233dcee88fe0abe",
    FlowToken: "0x1654653399040a61",
  },
  emulator: {
    MinorityRuleGame: "0xf8d6e0586b0a20c7", // You'll need to update this for emulator
    FungibleToken: "0xee82856bf20e2aa6",
    FlowToken: "0x0ae53cb6e3f42a79",
  },
};

export default function CreateGame() {
  const [questionText, setQuestionText] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { flowNetwork } = useFlowConfig();
  const network = flowNetwork || "testnet";

  // Process the transaction with contract addresses
  const transaction = CREATE_GAME
    .replace(/0xMinorityRuleGame/g, CONTRACT_ADDRESSES[network].MinorityRuleGame)
    .replace(/0xFungibleToken/g, CONTRACT_ADDRESSES[network].FungibleToken)
    .replace(/0xFlowToken/g, CONTRACT_ADDRESSES[network].FlowToken);

  const { mutate, isPending, error, data: txId } = useFlowMutate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim() && entryFee && parseFloat(entryFee) > 0) {
      const formattedEntryFee = parseFloat(entryFee).toFixed(8);
      const contractAddress = CONTRACT_ADDRESSES[network].MinorityRuleGame;
      
      mutate({
        cadence: transaction,
        args: (arg, t) => [
          arg(questionText, t.String),
          arg(formattedEntryFee, t.UFix64),
          arg(contractAddress, t.Address)
        ],
      });
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setEntryFee('');
    setShowForm(false);
  };

  // Show success message if transaction completed
  if (txId) {
    return (
      <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white text-lg">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
            Game Created Successfully!
          </h3>
        </div>
        <p className="text-green-700 dark:text-green-300 mb-3">
          Your minority rule game has been created on the Flow blockchain.
        </p>
        <div className="bg-green-100 dark:bg-green-800/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            <span className="font-medium">Transaction ID:</span> {txId}
          </p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Create Another Game
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="text-center">
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          Create New Game
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Create Minority Rule Game
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Game Question
          </label>
          <input
            id="question"
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="e.g., Will Bitcoin reach $100k by 2025?"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
        </div>

        <div>
          <label htmlFor="entryFee" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Entry Fee (FLOW)
          </label>
          <input
            id="entryFee"
            type="number"
            step="0.1"
            min="0.1"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            placeholder="e.g., 10.0"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error creating game: {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending || !questionText.trim() || !entryFee || parseFloat(entryFee) <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creating Game...' : 'Create Game'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}