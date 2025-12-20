"use client";

import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";

export default function HomePage() {
  const { user } = useFlowCurrentUser();
  const isLoggedIn = user?.loggedIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-6">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Hello World
        </h1>
        
        {isLoggedIn ? (
          <div className="space-y-6">
            <p className="text-lg text-muted-foreground">
              Welcome to Minority Rule Game!
            </p>
            <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
              <p className="text-sm text-muted-foreground mb-1">Connected as:</p>
              <p className="text-sm font-mono text-card-foreground">
                {user.addr}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/create"
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-center"
              >
                Create New Game
              </Link>
              <Link
                href="/games"
                className="px-6 py-3 border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors text-center"
              >
                Browse Games
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Connect your Flow wallet to get started
            </p>
            <p className="text-sm text-muted-foreground">
              Use the Profile button in the top-right corner
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
