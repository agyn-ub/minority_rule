'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RoundTimerProps {
  deadline: string;
}

export function RoundTimer({ deadline }: RoundTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const deadlineDate = new Date(parseFloat(deadline) * 1000);
      const now = new Date();

      if (deadlineDate <= now) {
        setIsExpired(true);
        setTimeRemaining('Round ended');
      } else {
        setIsExpired(false);
        setTimeRemaining(formatDistanceToNow(deadlineDate, { addSuffix: true }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

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
}