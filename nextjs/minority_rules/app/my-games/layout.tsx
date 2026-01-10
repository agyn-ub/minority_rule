"use client";

import { WebSocketGameProvider } from "@/contexts/WebSocketProvider";
import { useParams } from "next/navigation";

export default function MyGamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const gameId = params.gameId;

  // If we're in a specific game page, wrap with WebSocketGameProvider
  if (gameId) {
    const gameIdNum = parseInt(Array.isArray(gameId) ? gameId[0] : gameId);
    
    return (
      <WebSocketGameProvider gameId={gameIdNum}>
        {children}
      </WebSocketGameProvider>
    );
  }

  // For my-games list page, just render children
  return <>{children}</>;
}