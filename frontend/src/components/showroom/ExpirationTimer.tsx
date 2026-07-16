import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function ExpirationTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirado');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <div className="flex justify-between pt-1.5 border-t border-rose-200">
        <span className="text-rose-600 font-bold">Expirou</span>
        <span className="text-rose-600 font-bold">--:--</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between pt-1.5 border-t border-amber-200">
      <span className="text-amber-700 font-bold flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Expira em
      </span>
      <span className="text-amber-700 font-mono font-bold">{timeLeft}</span>
    </div>
  );
}
