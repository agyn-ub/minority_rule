"use client";

import { FlowProvider } from "@onflow/react-sdk";
import { ReactNode } from "react";
import flowJSON from "../flow.json";

interface FlowProviderWrapperProps {
  children: ReactNode;
}

export function FlowProviderWrapper({ children }: FlowProviderWrapperProps) {
  return (
    <FlowProvider
      config={{
        // Core Flow network configuration
        // "accessNode.api": process.env.NEXT_PUBLIC_ACCESS_NODE_URL || "https://rest-testnet.onflow.org",
        // "discovery.wallet": process.env.NEXT_PUBLIC_DISCOVERY_WALLET || "https://fcl-discovery.onflow.org/testnet/authn",
        // "discovery.authn.endpoint": process.env.NEXT_PUBLIC_DISCOVERY_AUTHN || "https://fcl-discovery.onflow.org/api/testnet/authn",

        // Alternative format for react-sdk compatibility
        accessNodeUrl: process.env.NEXT_PUBLIC_ACCESS_NODE_URL || "https://rest-testnet.onflow.org",
        discoveryWallet: process.env.NEXT_PUBLIC_DISCOVERY_WALLET || "https://fcl-discovery.onflow.org/testnet/authn",
        discoveryAuthnEndpoint: process.env.NEXT_PUBLIC_DISCOVERY_AUTHN || "https://fcl-discovery.onflow.org/api/testnet/authn",
        flowNetwork: (process.env.NEXT_PUBLIC_FLOW_NETWORK as "testnet" | "mainnet" | "emulator") || "testnet",

        // App metadata
        // "app.detail.title": "Minority Rule Game",
        // "app.detail.icon": "https://avatars.githubusercontent.com/u/62387156?v=4",
        // "app.detail.url": typeof window !== "undefined" ? window.location.origin : "",

        // Alternative format
        appDetailTitle: "Minority Rule Game",
        appDetailUrl: typeof window !== "undefined" ? window.location.origin : "",
        appDetailIcon: "https://avatars.githubusercontent.com/u/62387156?v=4",
        appDetailDescription: "A decentralized minority rule game on Flow blockchain",

        // Optional configuration
        computeLimit: 1000,
        walletconnectProjectId: "9b70cfa398b2355a5eb9b1cf99f4a981",
      }}
      flowJson={flowJSON}
    >
      {children}
    </FlowProvider>
  );
}
