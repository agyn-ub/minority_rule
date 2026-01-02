"use client";
import { useState, useEffect } from 'react';
import * as fcl from "@onflow/fcl";
import { configureFlow } from './flow-config';

export const useFlowUser = () => {
  const [user, setUser] = useState({ loggedIn: false, addr: null });
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    // Ensure FCL is configured before any operations
    try {
      configureFlow();
      setConfigReady(true);
      console.log("🔧 FCL configuration ready in useFlowUser");
    } catch (error) {
      console.error("❌ FCL configuration failed:", error);
      setLoading(false);
      return;
    }

    // Subscribe to current user changes
    const unsubscribe = fcl.currentUser.subscribe(setUser);
    
    // Initial check
    fcl.currentUser.snapshot().then((user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const login = async () => {
    if (!configReady) {
      throw new Error("FCL configuration not ready. Please try again.");
    }
    
    try {
      console.log("🚀 Attempting FCL authentication...");
      await fcl.authenticate();
      console.log("✅ FCL authentication successful");
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!configReady) {
      throw new Error("FCL configuration not ready. Please try again.");
    }
    
    try {
      console.log("🚪 Logging out...");
      await fcl.unauthenticate();
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout failed:", error);
      throw error;
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isLoggedIn: user.loggedIn,
    configReady
  };
};