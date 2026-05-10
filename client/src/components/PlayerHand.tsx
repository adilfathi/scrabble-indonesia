import React from 'react';

interface PlayerHandProps {
  letters: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  config: any;
  disabled: boolean;
}

export default function PlayerHand({
  letters,
  selectedIndex,
  onSelect,
  config,
  disabled,
}: PlayerHandProps) {
  return (
    <div className="hand-container">
      {letters.map((letter, i) => (
        <div
          key={i}
          className={`hand-tile ${selectedIndex === i ? 'hand-tile-selected' : ''} ${disabled ? 'hand-tile-disabled' : ''}`}
          onClick={() => !disabled && onSelect(i)}
        >
          <span className="hand-tile-letter">{letter}</span>
          <span className="hand-tile-points">
            {config?.POINTS_PER_LETTER?.[letter] ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}
