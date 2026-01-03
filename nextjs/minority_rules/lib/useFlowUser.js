"use client";
import { useState, useEffect } from 'react';
import * as fcl from "@onflow/fcl";
import { configureFlow } from './flow-config';
import { supabase } from './supabase';

// Function to create user profile if it doesn't exist
const createUserProfileIfNeeded = async (address) => {
  try {
    console.log("👤 Checking user profile for:", address);
    
    // Check if user profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('player_address', address)
      .single();
      
    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "not found" - anything else is a real error
      console.error("❌ Error checking user profile:", selectError);
      return;
    }
    
    if (!existingProfile) {
      // Create new user profile
      console.log("➕ Creating new user profile for:", address);
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          player_address: address,
          display_name: null,
          total_games: 0,
          total_wins: 0,
          total_earnings: 0
        });
        
      if (insertError) {
        console.error("❌ Error creating user profile:", insertError);
      } else {
        console.log("✅ User profile created successfully");
      }
    } else {
      console.log("✅ User profile already exists");
    }
  } catch (error) {
    console.error("❌ Unexpected error in createUserProfileIfNeeded:", error);
  }
};

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

  // Effect to create user profile when user connects wallet
  useEffect(() => {
    if (user.loggedIn && user.addr) {
      createUserProfileIfNeeded(user.addr);
    }
  }, [user.loggedIn, user.addr]);

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