import React from 'react';
import { getBonusType, getBonusLabel, BONUS } from '../utils/boardConfig';
import { BOARD_SIZE } from '../utils/constants';

interface GameBoardProps {
  boardLetters: string[];
  placedIndexes: number[];
  aiPlacedIndexes: number[];
  onCellClick: (idx: number) => void;
  disabled: boolean;
}

const BONUS_CLASS_MAP: Record<BONUS, string> = {
  [BONUS.NONE]: '',
  [BONUS.TW]: 'cell-tw',
  [BONUS.DW]: 'cell-dw',
  [BONUS.TL]: 'cell-tl',
  [BONUS.DL]: 'cell-dl',
  [BONUS.START]: 'cell-start',
};

export default function GameBoard({
  boardLetters,
  placedIndexes,
  aiPlacedIndexes,
  onCellClick,
  disabled,
}: GameBoardProps) {
  const rows = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const cells = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const idx = r * BOARD_SIZE + c;
      const letter = boardLetters[idx];
      const bonus = getBonusType(idx);
      const isPlaced = placedIndexes.includes(idx);
      const isAiPlaced = aiPlacedIndexes.includes(idx);
      const hasLetter = letter !== '';

      let cls = 'board-cell';
      if (!hasLetter && bonus !== BONUS.NONE) cls += ' ' + BONUS_CLASS_MAP[bonus];
      if (isPlaced) cls += ' cell-player';
      if (isAiPlaced) cls += ' cell-ai';
      if (hasLetter) cls += ' cell-filled';
      if (!hasLetter && !disabled) cls += ' cell-empty';

      cells.push(
        <div
          key={idx}
          className={cls}
          onClick={() => !disabled && onCellClick(idx)}
          role="button"
          tabIndex={0}
        >
          {hasLetter ? (
            <span className="cell-letter">{letter}</span>
          ) : (
            <span className="cell-bonus-label">{getBonusLabel(bonus)}</span>
          )}
        </div>
      );
    }
    rows.push(<div key={r} className="board-row">{cells}</div>);
  }

  return (
    <div className="board-wrapper">
      <div className="board-grid">{rows}</div>
    </div>
  );
}
