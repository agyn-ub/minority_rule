"use client";
import { useState } from 'react';
import { TX_STATES } from '@/lib/transactions';

const TransactionButton = ({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  loadingText = "Processing...",
  successText = "Success!",
  errorText = "Try Again"
}) => {
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    if (txState !== TX_STATES.IDLE && txState !== TX_STATES.ERROR) {
      return; // Prevent clicks during transaction
    }

    try {
      setError(null);
      await onClick(setTxState);
    } catch (err) {
      setError(err);
      setTxState(TX_STATES.ERROR);
    }
  };

  const getButtonText = () => {
    switch (txState) {
      case TX_STATES.SUBMITTING:
        return "Submitting...";
      case TX_STATES.SUBMITTED:
        return "Transaction Submitted...";
      case TX_STATES.SEALING:
        return "Confirming...";
      case TX_STATES.SEALED:
        return "Processing Events...";
      case TX_STATES.SUCCESS:
        return successText;
      case TX_STATES.ERROR:
        return errorText;
      default:
        return children;
    }
  };

  const getButtonClass = () => {
    let baseClass = `relative flex items-center justify-center gap-2 transition-all duration-200 ${className}`;
    
    if (txState === TX_STATES.SUCCESS) {
      baseClass += " bg-green-600 hover:bg-green-700";
    } else if (txState === TX_STATES.ERROR) {
      baseClass += " bg-red-600 hover:bg-red-700";
    }
    
    return baseClass;
  };

  const isLoading = [
    TX_STATES.SUBMITTING,
    TX_STATES.SUBMITTED, 
    TX_STATES.SEALING,
    TX_STATES.SEALED
  ].includes(txState);

  const isDisabled = disabled || isLoading || txState === TX_STATES.SUCCESS;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={getButtonClass()}
    >
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      )}
      
      {txState === TX_STATES.SUCCESS && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      
      {txState === TX_STATES.ERROR && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}

      <span>{getButtonText()}</span>
      
      {error && txState === TX_STATES.ERROR && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error.message || "Transaction failed"}
        </div>
      )}
    </button>
  );
};

export default TransactionButton;