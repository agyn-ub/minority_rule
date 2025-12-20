"use client";

import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";

export default function HomePage() {
  const { user } = useFlowCurrentUser();
  const isLoggedIn = user?.loggedIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hello World
        </h1>
        
        {isLoggedIn ? (
          <div className="space-y-6">
            <p className="text-lg text-gray-600">
              Welcome to Minority Rule Game!
            </p>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">Connected as:</p>
              <p className="text-sm font-mono text-gray-900">
                {user.addr}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/create"
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Create New Game
              </Link>
              <Link
                href="/games"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Browse Games
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              Connect your Flow wallet to get started
            </p>
            <p className="text-sm text-gray-500">
              Use the Profile button in the top-right corner
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
