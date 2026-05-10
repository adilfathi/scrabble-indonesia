import React from 'react';

interface LetterPickerProps {
  letters: string[];
  onPick: (index: number) => void;
  onClose: () => void;
  config: any;
}

export default function LetterPicker({ letters, onPick, onClose, config }: LetterPickerProps) {
  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-card glass" onClick={e => e.stopPropagation()}>
        <p className="picker-title">Pilih huruf untuk diletakkan</p>
        <div className="picker-tiles">
          {letters.map((letter, i) => (
            <div
              key={i}
              className="picker-tile"
              onClick={() => onPick(i)}
            >
              <span className="picker-tile-letter">{letter}</span>
              <span className="picker-tile-points">
                {config?.POINTS_PER_LETTER?.[letter] ?? ''}
              </span>
            </div>
          ))}
        </div>
        <button className="picker-cancel" onClick={onClose}>Batal</button>
      </div>
    </div>
  );
}
