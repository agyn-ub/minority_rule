'use client';

import { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';

export function useFlowUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = fcl.currentUser.subscribe(setUser);
    setLoading(false);
    return unsubscribe;
  }, []);

  const authenticate = async () => {
    try {
      await fcl.authenticate();
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  };

  const unauthenticate = async () => {
    try {
      await fcl.unauthenticate();
    } catch (error) {
      console.error('Unauthentication failed:', error);
      throw error;
    }
  };

  return {
    user: user?.addr ? user : null,
    loading,
    authenticate,
    unauthenticate,
    isAuthenticated: !!user?.addr
  };
}