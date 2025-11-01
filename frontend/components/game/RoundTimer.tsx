'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RoundTimerProps {
  deadline: string;
}

// Format time remaining with optimized update intervals
const formatTimeRemaining = (deadlineDate: Date, now: Date): { text: string; isExpired: boolean; nextUpdateInterval: number } => {
  const diffMs = deadlineDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { text: 'Round ended', isExpired: true, nextUpdateInterval: 0 };
  }
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  // Optimize update intervals based on remaining time
  let nextUpdateInterval: number;
  
  if (diffSeconds < 60) {
    // Less than 1 minute: update every second
    nextUpdateInterval = 1000;
  } else if (diffMinutes < 10) {
    // Less than 10 minutes: update every 30 seconds
    nextUpdateInterval = 30000;
  } else if (diffHours < 1) {
    // Less than 1 hour: update every minute
    nextUpdateInterval = 60000;
  } else {
    // More than 1 hour: update every 5 minutes
    nextUpdateInterval = 300000;
  }
  
  try {
    return {
      text: formatDistanceToNow(deadlineDate, { addSuffix: true }),
      isExpired: false,
      nextUpdateInterval
    };
  } catch (error) {
    console.error('Error formatting distance to now:', error);
    return {
      text: 'Time remaining',
      isExpired: false,
      nextUpdateInterval: 60000
    };
  }
};

const RoundTimer = React.memo(function RoundTimer({ deadline }: RoundTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const updateTimer = useCallback(() => {
    if (!deadline || deadline === '0.0') {
      setTimeRemaining('No deadline set');
      setIsExpired(false);
      return;
    }
    
    const deadlineDate = new Date(parseFloat(deadline) * 1000);
    const now = new Date();
    
    const { text, isExpired: expired, nextUpdateInterval } = formatTimeRemaining(deadlineDate, now);
    
    // Only update state if values actually changed
    setTimeRemaining(prev => prev === text ? prev : text);
    setIsExpired(prev => prev === expired ? prev : expired);
    
    lastUpdateRef.current = Date.now();
    
    // Schedule next update with optimized interval
    if (nextUpdateInterval > 0) {
      timeoutRef.current = setTimeout(updateTimer, nextUpdateInterval);
    }
  }, [deadline]);

  const scheduleNextUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Prevent too frequent updates (minimum 500ms between updates)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    if (timeSinceLastUpdate < 500) {
      timeoutRef.current = setTimeout(updateTimer, 500 - timeSinceLastUpdate);
    } else {
      updateTimer();
    }
  }, [updateTimer]);

  useEffect(() => {
    scheduleNextUpdate();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [deadline, scheduleNextUpdate]);

  return (
    <div className={`p-4 rounded-lg ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${isExpired ? 'text-red-800' : 'text-blue-800'}`}>
          Round Deadline:
        </span>
        <span className={`text-lg font-bold ${isExpired ? 'text-red-900' : 'text-blue-900'}`}>
          {timeRemaining}
        </span>
      </div>
    </div>
  );
});

export { RoundTimer };