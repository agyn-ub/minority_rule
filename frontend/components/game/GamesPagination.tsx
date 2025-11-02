'use client';

import React from 'react';

interface PaginationInfo {
  startId?: number;
  limit: number;
  descending: boolean;
  hasMore?: boolean; // Legacy property for backwards compatibility
  hasNext?: boolean; // New property
  hasPrevious?: boolean; // New property
  nextStartId?: number;
  previousStartId?: number;
  returnedCount: number;
  totalGames?: number;
}

interface GamesPaginationProps {
  pagination: PaginationInfo;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  loading?: boolean;
}

export function GamesPagination({ 
  pagination, 
  onPreviousPage, 
  onNextPage, 
  loading = false 
}: GamesPaginationProps) {
  const { returnedCount, limit, hasMore, hasNext, descending } = pagination;
  
  // Use new hasNext property if available, fallback to legacy hasMore
  const hasMoreGames = hasNext !== undefined ? hasNext : hasMore;

  // Don't hide pagination when there are no results - user might need to navigate back
  // Only hide if we truly have no pagination capability
  if (returnedCount === 0 && !onPreviousPage && !onNextPage) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
      <div className="flex flex-1 justify-between items-center">
        <div className="text-sm text-gray-700">
          {returnedCount > 0 ? (
            <>
              Showing <span className="font-medium">{returnedCount}</span> games
              {returnedCount === limit && " (per page)"}
            </>
          ) : (
            "No games found on this page"
          )}
        </div>
        
        <div className="flex space-x-2">
          {/* Previous Page Button */}
          <button
            onClick={onPreviousPage}
            disabled={loading || !onPreviousPage}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              loading || !onPreviousPage
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {descending ? 'Newer' : 'Previous'}
          </button>

          {/* Next Page Button */}
          <button
            onClick={onNextPage}
            disabled={loading || !hasMoreGames || !onNextPage}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              loading || !hasMoreGames || !onNextPage
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {loading ? 'Loading...' : (descending ? 'Older' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}