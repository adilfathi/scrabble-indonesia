import React from 'react';
import { TURN_TIMER_SECONDS } from '../utils/constants';

export default function Timer({ seconds }: { seconds: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / TURN_TIMER_SECONDS;
  const offset = circumference * (1 - progress);

  const getColor = () => {
    if (seconds > 30) return 'var(--green)';
    if (seconds > 10) return 'var(--yellow)';
    return 'var(--red)';
  };

  const color = getColor();
  const isUrgent = seconds <= 10 && seconds > 0;

  return (
    <div className={`timer-container ${isUrgent ? 'timer-pulse' : ''}`}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(128,128,128,0.2)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div className="timer-text" style={{ color }}>
        {seconds}
      </div>
    </div>
  );
}
