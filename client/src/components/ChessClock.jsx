import React, { useEffect, useRef, useState } from 'react';

function formatTime(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Show deciseconds when under 20 seconds
  if (ms < 20000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function ChessClock({ timeMs, isActive, playerName, isPlayer }) {
  const [displayTime, setDisplayTime] = useState(timeMs);
  const lastUpdateRef = useRef(Date.now());
  const rafRef = useRef(null);

  // Sync with server time
  useEffect(() => {
    setDisplayTime(timeMs);
    lastUpdateRef.current = Date.now();
  }, [timeMs]);

  // Client-side ticking for smooth display
  useEffect(() => {
    if (!isActive || timeMs <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      setDisplayTime(prev => Math.max(0, timeMs - elapsed));
      rafRef.current = requestAnimationFrame(tick);
    };

    lastUpdateRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, timeMs]);

  const isLowTime = displayTime > 0 && displayTime < 30000;
  const isCritical = displayTime > 0 && displayTime < 10000;

  let className = 'chess-clock';
  if (isActive) className += ' clock-active';
  if (isLowTime) className += ' clock-low';
  if (isCritical) className += ' clock-critical';
  if (isPlayer) className += ' clock-player';

  return (
    <div className={className}>
      <span className="clock-name">{playerName}</span>
      <span className="clock-time">{formatTime(displayTime)}</span>
    </div>
  );
}
